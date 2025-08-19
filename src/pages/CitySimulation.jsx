import { useEffect, useRef, useState } from "react";
import { Viewport } from "../components/viewport";
import { World } from "../components/world";
import { Car } from "../car.js";
import { NeuralNetwork } from "../network.js";
import { Start } from "../components/markings/start.js";
import { Target } from "../components/markings/target.js";
import { scale } from "../components/math/utils.js";

export default function CitySimulation() {
  const canvasRef = useRef(null);
  
  const [cars, setCars] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [carCount, setCarCount] = useState(20);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [stats, setStats] = useState({
    activeCars: 0,
    completedTrips: 0,
    totalDistance: 0,
    averageSpeed: 0
  });

  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const simulationTimerRef = useRef(0);
  const completedTripsRef = useRef(0);
  const totalDistanceRef = useRef(0);

  // Load trained AI brain from localStorage
  const loadTrainedBrain = () => {
    try {
      const savedBrain = localStorage.getItem('bestBrain.ai');
      if (savedBrain) {
        const brainData = JSON.parse(savedBrain);
        console.log(`🧠 Loaded trained brain from generation ${brainData.generation} with fitness ${brainData.fitness.toFixed(2)}`);
        return brainData.brain;
      } else {
        console.warn('No trained brain found! Please train AI cars first.');
        return null;
      }
    } catch (error) {
      console.error("Failed to load trained brain:", error);
      return null;
    }
  };

  // Calculate car statistics
  const calculateStats = (carList) => {
    const activeCars = carList.filter(car => !car.damaged && !car.reachedTarget).length;
    const totalSpeed = carList.reduce((sum, car) => sum + Math.abs(car.speed), 0);
    const averageSpeed = carList.length > 0 ? (totalSpeed / carList.length * 10).toFixed(1) : 0;
    
    return {
      activeCars,
      completedTrips: completedTripsRef.current,
      totalDistance: totalDistanceRef.current.toFixed(0),
      averageSpeed
    };
  };

  // Spawn a new car at a random start point
  const spawnNewCar = (trainedBrain) => {
    if (!worldRef.current) return null;
    
    const world = worldRef.current;
    const startMarkings = world.markings.filter(m => m instanceof Start);
    
    if (startMarkings.length === 0) {
      console.warn('No start points found in world');
      return null;
    }
    
    // Pick a random start point
    const startMarking = startMarkings[Math.floor(Math.random() * startMarkings.length)];
    let startX = startMarking.center.x;
    let startY = startMarking.center.y;
    let startAngle = 0;
    
    if (startMarking.directionVector) {
      const dir = startMarking.directionVector;
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const normalizedDir = { x: dir.x / length, y: dir.y / length };
      startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
    }
    
    const car = new Car(startX, startY, 30, 50, "AI", startAngle, 2 + Math.random()); // Varied max speed
    
    if (trainedBrain) {
      // Use trained brain with slight variations for diversity
      car.brain = JSON.parse(JSON.stringify(trainedBrain));
      // Add small mutations for variety (2-8% variation)
      NeuralNetwork.mutate(car.brain, 0.02 + Math.random() * 0.06);
    } else {
      // Fallback to random brain if no trained brain available
  car.brain = new NeuralNetwork([5, 6, 4]);
    }
    
    car.fitness = 0;
    car.spawnTime = Date.now();
    car.distanceTraveled = 0;
    car.lastPosition = { x: startX, y: startY };
    
    // Random color for variety
    const colors = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'cyan'];
    car.color = colors[Math.floor(Math.random() * colors.length)];
    
    return car;
  };

  // Check if car reached any target
  const checkCarProgress = (car) => {
    const world = worldRef.current;
    const targetMarkings = world.markings.filter(m => m instanceof Target);
    
    // Update distance traveled
    const currentPos = { x: car.x, y: car.y };
    if (car.lastPosition) {
      const distance = Math.sqrt(
        Math.pow(currentPos.x - car.lastPosition.x, 2) + 
        Math.pow(currentPos.y - car.lastPosition.y, 2)
      );
      car.distanceTraveled += distance;
      totalDistanceRef.current += distance;
    }
    car.lastPosition = currentPos;
    
    // Check if reached any target
    for (const target of targetMarkings) {
      const distanceToTarget = Math.sqrt(
        Math.pow(car.x - target.center.x, 2) + 
        Math.pow(car.y - target.center.y, 2)
      );
      
      if (distanceToTarget < 20) {
        car.reachedTarget = true;
        completedTripsRef.current++;
        console.log(`🎯 Car completed trip! Distance: ${car.distanceTraveled.toFixed(0)}m, Time: ${((Date.now() - car.spawnTime) / 1000).toFixed(1)}s`);
        return true;
      }
    }
    
    return false;
  };

  // Initialize city simulation
  const startSimulation = () => {
    if (!worldRef.current) {
      alert('Please load a world first by visiting the World Builder!');
      return;
    }
    
    const trainedBrain = loadTrainedBrain();
    if (!trainedBrain) {
      alert('No trained AI brain found! Please train AI cars first in the Auto Train mode.');
      return;
    }
    
    const newCars = [];
    
    // Spawn initial cars
    for (let i = 0; i < carCount; i++) {
      const car = spawnNewCar(trainedBrain);
      if (car) {
        newCars.push(car);
      }
    }
    
    if (newCars.length === 0) {
      alert('Failed to spawn cars. Make sure your world has Start points (🏁)!');
      return;
    }
    
    setCars(newCars);
    setIsSimulating(true);
    simulationTimerRef.current = 0;
    completedTripsRef.current = 0;
    totalDistanceRef.current = 0;
    
    console.log(`🏙️ City simulation started with ${newCars.length} AI cars!`);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setCars([]);
    setStats({
      activeCars: 0,
      completedTrips: 0,
      totalDistance: 0,
      averageSpeed: 0
    });
    simulationTimerRef.current = 0;
    completedTripsRef.current = 0;
    totalDistanceRef.current = 0;
  };

  // Load world on component mount
  useEffect(() => {
    if (!canvasRef.current || worldRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    viewportRef.current = new Viewport(canvas, 2);
    
    // Load world from localStorage
    const savedWorld = localStorage.getItem('virtualWorld');
    if (savedWorld) {
      try {
        const worldData = JSON.parse(savedWorld);
        if (worldData && typeof worldData === 'object') {
          worldRef.current = World.load(worldData);
          worldRef.current.generate();
          setWorldLoaded(true);
          
          // Center camera on world
          const world = worldRef.current;
          if (world.graph.points.length > 0) {
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
            
            viewportRef.current.offset.x = -centerX;
            viewportRef.current.offset.y = -centerY;
          }
          
          console.log('🗺️ World loaded for city simulation');
        }
      } catch (error) {
        console.error('Failed to load world:', error);
      }
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !worldRef.current || !isSimulating) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const world = worldRef.current;
    const viewport = viewportRef.current;
    const trainedBrain = loadTrainedBrain();
    let animationFrame;

    const loop = () => {
      if (!isSimulating) return;

      viewport.reset();

      // Update cars
      const updatedCars = cars.map((car, index) => {
        if (!car.damaged && !car.reachedTarget) {
          car.update(world.roadBorders, [], world);
          // Check progress and targets
          checkCarProgress(car);

          // Remove cars that have been running too long (2 minutes max)
          const runTime = (Date.now() - car.spawnTime) / 1000;
          if (runTime > 120) {
            console.log(`⏰ Car ${index} despawned after 2 minutes`);
            car.damaged = true;
          }
        }

        return car;
      });
      
      // Remove completed/damaged cars and spawn new ones
      const activeCars = updatedCars.filter(car => !car.damaged && !car.reachedTarget);
      const carsToAdd = carCount - activeCars.length;
      
      for (let i = 0; i < carsToAdd; i++) {
        const newCar = spawnNewCar(trainedBrain);
        if (newCar) {
          activeCars.push(newCar);
        }
      }
      
      setCars(activeCars);
      
      // Update stats
      setStats(calculateStats(activeCars));
      
      simulationTimerRef.current += simulationSpeed;
      
      // Draw world
      const viewPoint = scale(viewport.getOffset(), -1);
      world.draw(ctx, viewPoint);
      
      // Draw cars with different colors
      activeCars.forEach(car => {
        car.draw(ctx, false);
      });
      
      animationFrame = requestAnimationFrame(loop);
    };
    
    loop();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isSimulating, cars, carCount, simulationSpeed]);

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
        
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <h1 className="text-lg font-semibold text-green-600">🏙️ City AI Simulation</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.location.href = '/world-builder'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Edit World
          </button>
          <button
            onClick={() => window.location.href = '/car/auto'}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Train AI
          </button>
        </div>
      </div>

      {/* No World Loaded */}
      {!worldLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold mb-4">No World Found</h2>
            <p className="text-gray-600 mb-6">
              You need to create a world first before running the city simulation.
            </p>
            <button
              onClick={() => window.location.href = '/world-builder'}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Create World
            </button>
          </div>
        </div>
      )}

      {/* Simulation Controls */}
      {worldLoaded && !isSimulating && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl text-center max-w-lg">
            <div className="text-6xl mb-4">🏙️</div>
            <h2 className="text-2xl font-bold mb-4">AI City Simulation</h2>
            <p className="text-gray-600 mb-6">
              Watch trained AI cars navigate through your city! Cars will spawn at start points and drive to targets using their trained neural networks.
            </p>
            
            {/* Settings */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Cars
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={carCount}
                  onChange={(e) => setCarCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  More cars = busier city but may affect performance
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Simulation Speed
                </label>
                <select
                  value={simulationSpeed}
                  onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={0.5}>0.5x (Slow)</option>
                  <option value={1}>1x (Normal)</option>
                  <option value={1.5}>1.5x (Fast)</option>
                  <option value={2}>2x (Very Fast)</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={startSimulation}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              Start City Simulation
            </button>
          </div>
        </div>
      )}

      {/* Simulation Stats */}
      {isSimulating && (
        <div className="absolute top-20 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-green-600">City Simulation Active</span>
              <button
                onClick={stopSimulation}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Stop
              </button>
            </div>
            <div className="text-sm space-y-1">
              <div>Active Cars: {stats.activeCars}</div>
              <div>Completed Trips: {stats.completedTrips}</div>
              <div>Total Distance: {stats.totalDistance}m</div>
              <div>Avg Speed: {stats.averageSpeed} km/h</div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg mt-2 text-sm">
            <div className="font-semibold mb-1">Features:</div>
            <div>• Cars respawn automatically</div>
            <div>• AI uses trained neural networks</div>
            <div>• Multiple start/target points supported</div>
            <div>• Realistic city traffic simulation</div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
