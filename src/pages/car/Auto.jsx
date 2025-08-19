import { useEffect, useRef, useState, useCallback } from "react";
import { Viewport } from "../../components/viewport";
import { World } from "../../components/world";
import { Car } from "../../car.js";
import { NeuralNetwork } from "../../network.js";
import { Visualizer } from "../../visualizer.js";
import { Start } from "../../components/markings/start.js";
import { Target } from "../../components/markings/target.js";
import { scale } from "../../components/math/utils.js";
import MiniMap from "../../components/MiniMap.jsx";

export default function AutoTrain() {
  const canvasRef = useRef(null);
  const networkCanvasRef = useRef(null);
  
  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Cars and generation
  const [cars, setCars] = useState([]);
  const [bestCar, setBestCar] = useState(null);
  const [generation, setGeneration] = useState(1);
  const [aliveCars, setAliveCars] = useState(0);
  const [brainSaved, setBrainSaved] = useState(false);
  
  // User configurable settings
  const [carSpawnLimit, setCarSpawnLimit] = useState(100);
  const [sleepTimer, setSleepTimer] = useState(5);
  
  // Refs for world and animation
  const worldRef = useRef(null);
  const viewportRef = useRef(null);
  const animationIdRef = useRef(null);
  
  // Tracking for stuck cars
  const carStuckTimersRef = useRef(new Map());
  const generationStartTimeRef = useRef(0);

  // Function to render world as static background
  const renderWorldBackground = () => {
    if (!worldRef.current || !viewportRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const world = worldRef.current;
    const viewport = viewportRef.current;
    
    viewport.reset();
    if (world.graph && world.graph.segments.length > 0) {
      world.generate();
    }
    const viewPoint = scale(viewport.getOffset(), -1);
    world.draw(ctx, viewPoint);
  };

  // Load world from localStorage on mount
  useEffect(() => {
    if (!canvasRef.current || worldRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    viewportRef.current = new Viewport(canvas, 1);
    
    // Load world from localStorage
    const savedWorld = localStorage.getItem('virtualWorld');
    if (savedWorld) {
      try {
        const worldData = JSON.parse(savedWorld);
        if (worldData && typeof worldData === 'object') {
          worldRef.current = World.load(worldData);
          worldRef.current.generate();
          setWorldLoaded(true);
          centerCameraOnMap();
          
          // Check for existing best brain
          const savedBrain = localStorage.getItem("bestBrain");
          setBrainSaved(!!savedBrain);
          
          // Render the world once as background
          setTimeout(() => renderWorldBackground(), 100);
        } else {
          worldRef.current = new World();
          setWorldLoaded(false);
        }
      } catch (error) {
        console.error("Failed to load world:", error);
        worldRef.current = new World();
        setWorldLoaded(false);
      }
    } else {
      worldRef.current = new World();
      setWorldLoaded(false);
    }
  }, []);

  // Center camera on the map
  const centerCameraOnMap = () => {
    const world = worldRef.current;
    const viewport = viewportRef.current;
    
    if (!world || !viewport || !world.graph.points.length) return;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    world.graph.points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    viewport.offset.x = -centerX;
    viewport.offset.y = -centerY;
  };

  // Find start position from markings
  const getStartPosition = () => {
    const world = worldRef.current;
    const startMarking = world.markings.find(m => m instanceof Start);
    
    let startX = 0, startY = 0, startAngle = 0;
    
    if (startMarking) {
      startX = startMarking.center.x;
      startY = startMarking.center.y;
      
      if (startMarking.directionVector) {
        const dir = startMarking.directionVector;
        const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        const normalizedDir = { x: dir.x / length, y: dir.y / length };
        startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
        
        // Spawn slightly to the left of the lane direction
        const leftNormal = { x: -normalizedDir.y, y: normalizedDir.x };
        const sideSign = (world.drivingSide || 'left') === 'left' ? 1 : -1;
        startX += leftNormal.x * sideSign * 15;
        startY += leftNormal.y * sideSign * 15;
      }
    } else if (world.graph && world.graph.points.length > 0) {
      // Fallback to first graph point
      const firstPoint = world.graph.points[0];
      startX = firstPoint.x;
      startY = firstPoint.y;
    }
    
    return { startX, startY, startAngle };
  };

  // Generate cars at start position
  const generateCars = (count) => {
    const { startX, startY, startAngle } = getStartPosition();
    const newCars = [];
    
    for (let i = 0; i < count; i++) {
      const lateralJitter = (Math.random() - 0.5) * 10;
      const car = new Car(
        startX + lateralJitter, 
        startY + lateralJitter, 
        30, 
        50, 
        "AI", 
        startAngle
      );
      
      // Initialize with random brain or load saved brain for first car
      if (i === 0) {
        const savedBrain = localStorage.getItem("bestBrain");
        if (savedBrain) {
          try {
            car.brain = JSON.parse(savedBrain);
          } catch (error) {
            car.brain = new NeuralNetwork([car.sensor.rayCount, 6, 4]);
          }
        } else {
          car.brain = new NeuralNetwork([car.sensor.rayCount, 6, 4]);
        }
      } else {
        // Copy brain from first car and mutate
        car.brain = JSON.parse(JSON.stringify(newCars[0].brain));
        NeuralNetwork.mutate(car.brain, 0.1);
      }
      
      newCars.push(car);
    }
    
    return newCars;
  };

  // Calculate fitness based on distance to target
  const calculateFitness = (car) => {
    const world = worldRef.current;
    const targetMarking = world.markings.find(m => m instanceof Target);
    
    if (!targetMarking) return 0;
    
    const dx = car.x - targetMarking.center.x;
    const dy = car.y - targetMarking.center.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    
    // Simple fitness: closer to target = higher fitness
    const baseFitness = Math.max(0, 1000 - distanceToTarget);
    
    // Bonus for reaching target
    if (distanceToTarget < 20) {
      return baseFitness + 5000;
    }
    
    // Penalty for damaged cars
    if (car.damaged) {
      return baseFitness * 0.1;
    }
    
    return baseFitness;
  };

  // Start training with user settings
  const startTraining = () => {
    if (!worldLoaded) return;
    
    const newCars = generateCars(carSpawnLimit);
    setCars(newCars);
    setBestCar(newCars[0]);
    setIsTraining(true);
    setShowWelcome(false);
    setShowSettings(false);
    setAliveCars(carSpawnLimit);
    setGeneration(1);
    
    // Reset timers
    generationStartTimeRef.current = Date.now();
    carStuckTimersRef.current.clear();
    
    // Start animation
    animate();
  };

  // Stop training
  const stopTraining = () => {
    setIsTraining(false);
    setCars([]);
    setBestCar(null);
    setAliveCars(0);
    setGeneration(1);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    centerCameraOnMap();
  };

  // End current generation
  const endGeneration = () => {
    if (cars.length === 0) return;
    nextGeneration();
  };

  // Finish training completely
  const finishTraining = () => {
    stopTraining();
    setShowWelcome(true);
    alert(`Training completed! Final generation: ${generation}`);
  };

  // Delete saved brains
  const deleteBrains = () => {
    if (confirm("Are you sure you want to delete all saved AI brains? This cannot be undone.")) {
      localStorage.removeItem("bestBrain");
      setBrainSaved(false);
      alert("All saved AI brains have been deleted.");
    }
  };

  // Generate next generation
  const nextGeneration = () => {
    if (cars.length === 0) return;
    
    // Calculate fitness for all cars
    cars.forEach(car => {
      car.fitness = calculateFitness(car);
    });
    
    // Sort by fitness and get best car
    const sortedCars = [...cars].sort((a, b) => b.fitness - a.fitness);
    const bestCarBrain = sortedCars[0].brain;
    
    console.log(`Generation ${generation} complete. Best fitness: ${sortedCars[0].fitness.toFixed(2)}`);
    
    // Save best brain
    localStorage.setItem("bestBrain", JSON.stringify(bestCarBrain));
    setBrainSaved(true);
    
    // Generate new generation
    const newCars = generateCars(carSpawnLimit);
    
    // Apply genetic algorithm
    for (let i = 0; i < newCars.length; i++) {
      if (i === 0) {
        // Keep best car
        newCars[i].brain = JSON.parse(JSON.stringify(bestCarBrain));
      } else if (i < 5) {
        // Top 5 with light mutation
        newCars[i].brain = JSON.parse(JSON.stringify(bestCarBrain));
        NeuralNetwork.mutate(newCars[i].brain, 0.05);
      } else if (i < carSpawnLimit * 0.5) {
        // First half with moderate mutation
        newCars[i].brain = JSON.parse(JSON.stringify(bestCarBrain));
        NeuralNetwork.mutate(newCars[i].brain, 0.2);
      } else {
        // Second half with high mutation or random
        if (Math.random() < 0.8) {
          newCars[i].brain = JSON.parse(JSON.stringify(bestCarBrain));
          NeuralNetwork.mutate(newCars[i].brain, 0.5);
        } else {
          // Completely random brain
          newCars[i].brain = new NeuralNetwork([newCars[i].sensor.rayCount, 6, 4]);
        }
      }
    }
    
    setCars(newCars);
    setBestCar(newCars[0]);
    setGeneration(prev => prev + 1);
    setAliveCars(carSpawnLimit);
    
    // Reset timers
    generationStartTimeRef.current = Date.now();
    carStuckTimersRef.current.clear();
  };

  // Animation loop
  const animate = useCallback(() => {
    if (!isTraining || !worldRef.current || !viewportRef.current) return;
    
    const world = worldRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    
    // Update cars
    cars.forEach((car, index) => {
      if (!car.damaged) {
        // Update car with proper collision objects
        const roadBorders = world.borders || [];
        car.update(roadBorders, [], world);
        
        // Check if car is stuck (not moving for sleepTimer seconds)
        const carId = `car_${index}`;
        const currentTime = Date.now();
        
        if (Math.abs(car.speed) < 0.1) {
          // Car is not moving
          if (!carStuckTimersRef.current.has(carId)) {
            carStuckTimersRef.current.set(carId, currentTime);
          } else {
            const stuckDuration = (currentTime - carStuckTimersRef.current.get(carId)) / 1000;
            if (stuckDuration > sleepTimer) {
              // Remove stuck car
              car.damaged = true;
              car.damageType = 'stuck';
              carStuckTimersRef.current.delete(carId);
            }
          }
        } else {
          // Car is moving, remove from stuck timer
          carStuckTimersRef.current.delete(carId);
        }
      }
    });
    
    // Count alive cars
    const aliveCarsList = cars.filter(car => !car.damaged);
    setAliveCars(aliveCarsList.length);
    
    // Find current best car (alive car with highest fitness)
    if (aliveCarsList.length > 0) {
      const currentBest = aliveCarsList.reduce((best, car) => {
        const bestFitness = calculateFitness(best);
        const carFitness = calculateFitness(car);
        return carFitness > bestFitness ? car : best;
      });
      setBestCar(currentBest);
      
      // Make minimap follow best car
      viewport.offset.x = -currentBest.x;
      viewport.offset.y = -currentBest.y;
    }
    
    // Auto-advance generation when all cars are dead
    if (aliveCarsList.length === 0) {
      setTimeout(() => nextGeneration(), 1000);
      return;
    }
    
    // Draw world
    viewport.reset();
    const viewPoint = scale(viewport.getOffset(), -1);
    world.draw(ctx, viewPoint);
    
    // Draw cars
    ctx.globalAlpha = 0.3;
    cars.forEach(car => {
      if (car !== bestCar && !car.damaged) {
        car.draw(ctx, "blue");
      }
    });
    
    // Draw damaged cars in gray
    ctx.globalAlpha = 0.1;
    cars.forEach(car => {
      if (car.damaged) {
        car.draw(ctx, "gray");
      }
    });
    
    // Draw best car prominently with sensors
    if (bestCar && !bestCar.damaged) {
      ctx.globalAlpha = 1;
      bestCar.draw(ctx, "red", true); // Red color for best car, show sensors
    }
    
    ctx.globalAlpha = 1;
    
    animationIdRef.current = requestAnimationFrame(animate);
  }, [isTraining, cars, bestCar, sleepTimer]);

  // Background rendering when not training
  useEffect(() => {
    if (!isTraining && worldLoaded && worldRef.current && viewportRef.current && canvasRef.current) {
      renderWorldBackground();
    }
  }, [isTraining, worldLoaded]);

  // Update animation loop when training state changes
  useEffect(() => {
    if (isTraining) {
      animate();
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [isTraining, animate]);

  // Neural network visualization
  useEffect(() => {
    if (isTraining && bestCar && bestCar.brain && networkCanvasRef.current) {
      const networkCtx = networkCanvasRef.current.getContext('2d');
      networkCtx.clearRect(0, 0, networkCanvasRef.current.width, networkCanvasRef.current.height);
      
      if (Visualizer && Visualizer.drawNetwork) {
        try {
          Visualizer.drawNetwork(networkCtx, bestCar.brain);
        } catch (error) {
          console.error('Neural network visualization error:', error);
        }
      }
    }
  }, [isTraining, bestCar]);

  return (
    <div className="w-full h-full relative">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <button
          onClick={() => window.location.href = '/'}
          className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors flex items-center gap-2"
        >
          <span>←</span> Home
        </button>
        
        <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-lg shadow-lg">
          <h1 className="text-lg font-semibold text-gray-800">AI Training Mode</h1>
        </div>

        <button
          onClick={() => window.location.href = '/world-builder'}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Edit World
        </button>
      </div>

      {/* No World Warning */}
      {!worldLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">No World Found</h2>
            <p className="text-gray-600 mb-6">
              You need to create a world first with Start and Target markings before training AI cars.
            </p>
            <button
              onClick={() => window.location.href = '/world-builder'}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to World Builder
            </button>
          </div>
        </div>
      )}

      {/* Welcome Dialog (shown when not training) */}
      {worldLoaded && !isTraining && showWelcome && (
        <div className="absolute inset-0  bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-xl shadow-xl text-center max-w-lg border border-gray-200">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">AI Car Training</h2>
            <p className="text-gray-600 mb-6">
              Welcome to the AI Car Training page! Here you can train neural networks to learn autonomous driving through genetic algorithms and machine learning.
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowWelcome(false);
                  setShowSettings(true);
                }}
                className="bg-neutral-300 hover:cursor-pointer hover:bg-neutral-500 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Change Settings
              </button>
              <button
                onClick={startTraining}
                className="bg-neutral-400 hover:cursor-pointer hover:bg-neutral-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {worldLoaded && !isTraining && showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-xl shadow-xl text-center max-w-lg border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Training Settings</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Car Spawn Rate
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={carSpawnLimit}
                  onChange={(e) => setCarSpawnLimit(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>50</span>
                  <span className="font-semibold text-gray-700">{carSpawnLimit} cars</span>
                  <span>500</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sleep Timer (Stuck Car Removal)
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={sleepTimer}
                  onChange={(e) => setSleepTimer(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>3s</span>
                  <span className="font-semibold text-gray-700">{sleepTimer} seconds</span>
                  <span>15s</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowWelcome(true);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={startTraining}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start Training
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Status Panel - Left Side */}
      {isTraining && (
        <div className="absolute top-20 left-4 z-10 space-y-4">
          {/* Essential Stats */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700">AI Training Status</span>
              <div className="flex gap-2">
                <button
                  onClick={endGeneration}
                  className="bg-red-900 hover:cursor-pointer hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  End Gen
                </button>
                <button
                  onClick={finishTraining}
                  className="bg-green-700 hover:cursor-pointer hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Finish
                </button>
              </div>
            </div>
            
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Generation:</span>
                <span className="font-semibold text-gray-800">#{generation}</span>
              </div>
              <div className="flex justify-between">
                <span>Cars Left:</span>
                <span className="font-semibold text-gray-800">{aliveCars}/{carSpawnLimit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Best Brain:</span>
                <div className="flex items-center gap-2 hover:text-red-500">
                  <span className={`text-xs ${brainSaved ? 'text-gray-700' : 'text-gray-500'}`}>
                    {brainSaved ? "Saved" : "Not Saved"}
                  </span>
                  {brainSaved && (
                    <button
                      onClick={deleteBrains}
                      className="text-gray-500 hover:text-red-500 transition-colors hover:cursor-pointer"
                      title="Delete saved brain"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Sleep Timer:</span>
                <span className="font-semibold text-gray-700">{sleepTimer}s</span>
              </div>
            </div>
          </div>

          {/* Description Box */}
          <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-gray-200 max-w-xs">
            <h3 className="font-semibold text-gray-800 mb-2">About AI Training</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              AI cars use neural networks to learn driving. Each generation evolves based on performance. 
              The best performing cars pass their "genes" to the next generation with mutations for improvement. 
              Cars that reach the target or travel furthest get higher fitness scores.
            </p>
          </div>
        </div>
      )}

      {/* Neural Network and MiniMap - Right Side */}
      {isTraining && (
        <div className="absolute top-20 right-4 z-10 space-y-4">
          {/* Neural Network Visualizer */}
          <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-200">
            <div className="text-sm font-semibold mb-2 text-center text-gray-700">
              Neural Network (Best Car)
            </div>
            <canvas 
              ref={networkCanvasRef} 
              width={300} 
              height={200}
              className="border border-gray-300 rounded bg-gray-100"
            />
          </div>
          
          {/* MiniMap */}
          <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-200">
            <div className="text-sm font-semibold mb-2 text-center text-gray-700">
              MiniMap
            </div>
            <MiniMap 
              world={worldRef.current}
              cars={cars}
              bestCar={bestCar}
              viewPoint={viewportRef.current ? viewportRef.current.getOffset() : { x: 0, y: 0 }}
              size={200}
            />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="w-full h-full bg-white" />
    </div>
  );
}
