import { useEffect, useRef, useState, useCallback } from "react";
import {Viewport} from "./components/viewport";
import {World} from "./components/world";
import {GraphEditor} from "./components/editors/grapheditor";
import {StartEditor} from "./components/editors/startEditor";
import {TargetEditor} from "./components/editors/targetEditor";
import {LightEditor} from "./components/editors/lightEditor";
import {StopEditor} from "./components/editors/stopEditor";
import {YieldEditor} from "./components/editors/yieldEditor";
import {CrossingEditor} from "./components/editors/crossingEditor";
import {ParkingEditor} from "./components/editors/parkingEditor";
import {ObstacleEditor} from "./components/editors/obstacleEditorFixed";
import {Car} from "./car.js";
import {NeuralNetwork} from "./network.js";
import {Visualizer} from "./visualizer.js";
import {Start} from "./components/markings/start.js";
import {scale} from "./components/math/utils.js";
import {Target} from "./components/markings/target.js";

export default function CanvasEditor() {
  const canvasRef = useRef(null);
  const networkCanvasRef = useRef(null);
  
  const [dialogOpen, setDialogOpen] = useState(true);
  const [showTrainingControls, setShowTrainingControls] = useState(false);
  const [trainingMode, setTrainingMode] = useState(null);
  const [activeTool, setActiveTool] = useState('road'); // 'road', 'start', 'target', 'light', 'stop', 'yield', 'crossing', 'parking', 'obstacle'
  const [cars, setCars] = useState([]);
  const [bestCar, setBestCar] = useState(null);
  const [generation, setGeneration] = useState(1);
  const generationTimerRef = useRef(0);
  
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const graphEditorRef = useRef(null);
  const startEditorRef = useRef(null);
  const targetEditorRef = useRef(null);
  const lightEditorRef = useRef(null);
  const stopEditorRef = useRef(null);
  const yieldEditorRef = useRef(null);
  const crossingEditorRef = useRef(null);
  const parkingEditorRef = useRef(null);
  const obstacleEditorRef = useRef(null);


  const restartTraining = useCallback(() => {
    const sortedCars = [...cars].sort((a, b) => b.fitness - a.fitness);

    // Keep top 10% as parents for genetic diversity
    const topK = Math.max(5, Math.floor(sortedCars.length * 0.1));
    const parents = sortedCars.slice(0, topK);

    const N = 100;
    const newCars = [];
    const world = worldRef.current;
  const startPoint = world.markings.find(m => m instanceof Start);
  let startX = startPoint ? startPoint.center.x : 0;
  let startY = startPoint ? startPoint.center.y : 0;

    // Calculate proper starting angle based on start marking direction
    let startAngle = 0;
    if (startPoint && startPoint.directionVector) {
      const dir = startPoint.directionVector;
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const normalizedDir = { x: dir.x / length, y: dir.y / length };
      startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
      // LHS spawn shift
      const leftNormal = { x: -normalizedDir.y, y: normalizedDir.x };
      const sideSign = (world.drivingSide || 'left') === 'left' ? 1 : -1;
      startX += leftNormal.x * sideSign * 15;
      startY += leftNormal.y * sideSign * 15;
    }

    // Check if we have valid parent brains with correct architecture
    const validParents = parents.filter(p =>
      p.brain &&
      p.brain.levels &&
      p.brain.levels.length > 0 &&
      p.brain.levels[0].inputs.length === 5
    );

    // Introduce a small portion of completely new random brains each generation
    const newcomers = Math.max(5, Math.floor(N * 0.1));

    for (let i = 0; i < N; i++) {
      const jitter = (Math.random()-0.5)*10;
      const car = new Car(startX + jitter, startY + jitter, 30, 50, "AI", startAngle);

      if (validParents.length === 0) {
        // No parents yet - use fresh random brain
        car.brain = new NeuralNetwork([5, 6, 4]);
      } else if (i < topK) {
        // Elite: deep-clone parent brain (no mutation) to avoid shared references
        const parent = validParents[i % validParents.length];
        car.brain = JSON.parse(JSON.stringify(parent.brain));
      } else if (i < topK + newcomers) {
        // Newcomers for exploration
        car.brain = new NeuralNetwork([5, 6, 4]);
      } else {
        // Children: deep-clone then mutate with varied rate
        const parent = validParents[i % validParents.length];
        const clone = JSON.parse(JSON.stringify(parent.brain));
        const rate = 0.02 + Math.random() * 0.18; // 2% - 20%
        NeuralNetwork.mutate(clone, rate);
        car.brain = clone;
      }

  car.fitness = 0;
      newCars.push(car);
    }

    setCars(newCars);
    setBestCar(newCars[0]);
    setGeneration(prev => prev + 1);
  }, [cars]);

  const checkTrainingProgress = useCallback(() => {
    if (cars.length === 0) return;

    const world = worldRef.current;
    const targetPoint = world.markings.find(m => m instanceof Target);
    const targetX = targetPoint ? targetPoint.center.x : 500;
    const targetY = targetPoint ? targetPoint.center.y : 500;
  const cps = [];

    // Per-car progress & penalties
    cars.forEach(car => {
      // Compute Euclidean distance to target
      const d = Math.hypot(car.x - targetX, car.y - targetY);

      // Incremental progress reward (difference from last frame)
      if (car._lastD === undefined) car._lastD = d;
      const delta = car._lastD - d; // positive if getting closer
      car._lastD = d;

  // Base fitness components (author-style)
  let fitness = Math.max(0, 1000 - d);
  fitness += Math.abs(car.speed) * 5;
  if (car.damageType === 'off-road') fitness -= 100;
  if (car.damageType === 'collision') fitness -= 50;

      car.fitness = fitness;
    });

    // Training analytics
    const sortedCars = [...cars].sort((a, b) => b.fitness - a.fitness);
    const bestFitness = sortedCars[0].fitness;
    const avgFitness = cars.reduce((sum, car) => sum + (car.fitness || 0), 0) / cars.length;
    const closeToGoal = cars.filter(car => Math.hypot(car.x - targetX, car.y - targetY) < 50).length;

  console.log(`🧠 Gen ${generation}: Best=${bestFitness.toFixed(1)}, Avg=${avgFitness.toFixed(1)}, Close=${closeToGoal}/100`);

    restartTraining();
  }, [cars, restartTraining, generation]);

  // Initialize world and editors
  useEffect(() => {
    if (!canvasRef.current || dialogOpen) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    viewportRef.current = new Viewport(canvas, 1.5);
    
    // Only create new world if it doesn't exist - preserve built world
    if (!worldRef.current) {
      worldRef.current = new World();
    }
    
    const world = worldRef.current;
    const viewport = viewportRef.current;

    // Initialize all editors
    graphEditorRef.current = new GraphEditor(viewport, world.graph, world);
    startEditorRef.current = new StartEditor(viewport, world);
    targetEditorRef.current = new TargetEditor(viewport, world);
    lightEditorRef.current = new LightEditor(viewport, world);
    stopEditorRef.current = new StopEditor(viewport, world);
    yieldEditorRef.current = new YieldEditor(viewport, world);
    crossingEditorRef.current = new CrossingEditor(viewport, world);
    parkingEditorRef.current = new ParkingEditor(viewport, world);
    obstacleEditorRef.current = new ObstacleEditor(viewport, world);

    // Enable the initially active tool (road)
    if (activeTool === 'road' && graphEditorRef.current) {
      console.log('Enabling initial road tool');
      graphEditorRef.current.enable();
    }

    let animationFrame;
    const loop = () => {
      // Reset viewport (clears canvas and sets up transformations)
      viewport.reset();
      
      // Only draw grid in editing mode, not during training
      if (!trainingMode) {
        viewport.drawGrid();
      }
      
      if (trainingMode === 'ai') {
        // Update cars during AI training
        const roadBorders = world.roadBorders || [];
        cars.forEach(car => {
          if (!car.damaged) {
            car._noProgressFrames = car._noProgressFrames || 0;
            const before = car._lastD ?? Infinity;

            car.update(roadBorders, [], world);

            // No checkpoint progress in author-style

            // Stagnation detection: if not getting closer for many frames, kill
            const after = car._lastD ?? Infinity;
            if (after >= before - 0.5) {
              car._noProgressFrames++;
            } else {
              car._noProgressFrames = 0;
            }
            if (car._noProgressFrames > 240) { // ~4s at 60fps
              car.damaged = true;
              car.damageType = 'stagnation';
            }
          }
        });
        
        // Increment generation timer
        generationTimerRef.current += 1;
        
        // Find best car
        const aliveCars = cars.filter(car => !car.damaged);
        if (aliveCars.length > 0) {
          const newBestCar = aliveCars.reduce((best, car) => 
            car.fitness > best.fitness ? car : best
          );
          setBestCar(newBestCar);
          
          // Update fitness for real-time visualization
          const world = worldRef.current;
          const targetPoint = world.markings.find(m => m instanceof Target);
          const targetX = targetPoint ? targetPoint.center.x : 500;
          const targetY = targetPoint ? targetPoint.center.y : 500;
          
          const distanceToTarget = Math.sqrt(
            Math.pow(newBestCar.x - targetX, 2) + Math.pow(newBestCar.y - targetY, 2)
          );
          if (distanceToTarget < 50) {
            newBestCar.fitness = 2000 + (50 - distanceToTarget) * 20;
          } else {
            newBestCar.fitness = Math.max(0, 1000 - distanceToTarget);
          }
          
          viewport.offset.x = -newBestCar.x;
          viewport.offset.y = -newBestCar.y;
        }
        
        // Check if generation is complete (all cars dead or timeout)
        if (aliveCars.length === 0 || generationTimerRef.current > 2400) { // ~40 seconds timeout
          checkTrainingProgress();
          generationTimerRef.current = 0;
        }
      } else if (trainingMode === 'manual' && cars.length > 0) {
        // Update manual car
        const manualCar = cars[0];
        if (!manualCar.damaged) {
          const roadBorders = world.roadBorders || [];
          manualCar.update(roadBorders, [], world);
          viewport.offset.x = -manualCar.x;
          viewport.offset.y = -manualCar.y;
        }
      }

      // Trigger world generation when graph changes
      if (world.graph.segments.length > 0) {
        world.generate();
      }

      // Draw world
      const viewPoint = scale(viewport.getOffset(), -1);
      world.draw(ctx, viewPoint);
  // No checkpoint overlay in author-style training
      
      // Draw cars
      if (trainingMode === 'ai') {
        // Draw cars without sensor rays to avoid visual clutter during AI training
        cars.forEach(car => {
          car.draw(ctx, false); // Don't draw sensors
        });
      } else if (trainingMode === 'manual' && cars.length > 0) {
        // Draw manual car with sensors visible
        cars.forEach(car => {
          car.draw(ctx, true); // Show sensors for manual driving
        });
      }

      if (!trainingMode) {
        // Display all editor intents with transparency (like the original)
        ctx.globalAlpha = 0.3;
        
        // Display all editors - but only the active one will have interactivity
        const editors = [
          graphEditorRef.current,
          startEditorRef.current,
          targetEditorRef.current,
          lightEditorRef.current,
          stopEditorRef.current,
          yieldEditorRef.current,
          crossingEditorRef.current,
          parkingEditorRef.current,
          obstacleEditorRef.current
        ];

        editors.forEach(editor => {
          if (editor && editor.display) {
            editor.display();
          }
        });
        
        ctx.globalAlpha = 1.0;
      }

      animationFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      // Cleanup animation frame
      cancelAnimationFrame(animationFrame);
    };
  }, [canvasRef, worldRef, dialogOpen, trainingMode, cars, bestCar, checkTrainingProgress, activeTool]);

  // Handle tool switching by enabling/disabling editors
  useEffect(() => {
    // Make sure all editors are initialized
    if (!graphEditorRef.current || !startEditorRef.current || !targetEditorRef.current || 
        !lightEditorRef.current || !stopEditorRef.current || !yieldEditorRef.current || 
        !crossingEditorRef.current || !parkingEditorRef.current || !obstacleEditorRef.current) {
      return;
    }

    // Create editors object
    const editors = {
      road: graphEditorRef.current,
      start: startEditorRef.current,
      target: targetEditorRef.current,
      light: lightEditorRef.current,
      stop: stopEditorRef.current,
      yield: yieldEditorRef.current,
      crossing: crossingEditorRef.current,
      parking: parkingEditorRef.current,
      obstacle: obstacleEditorRef.current
    };

    // Disable all editors first
    Object.entries(editors).forEach(([key, editor]) => {
      if (editor?.disable) {
        editor.disable();
      }
    });

    // Only enable editors when not in training mode
    if (!trainingMode) {
      const activeEditor = editors[activeTool];
      if (activeEditor?.enable) {
        activeEditor.enable();
      }
    }
  }, [activeTool, trainingMode, graphEditorRef.current, startEditorRef.current]);

  // Neural network visualization - with comprehensive debugging
  useEffect(() => {
    console.log('🔍 Neural Network Visualization Effect Triggered');
    console.log('  - trainingMode:', trainingMode);
    console.log('  - bestCar exists:', !!bestCar);
    console.log('  - bestCar.brain exists:', !!(bestCar?.brain));
    console.log('  - networkCanvasRef.current exists:', !!networkCanvasRef.current);
    
    if (trainingMode === 'ai' && bestCar && bestCar.brain && networkCanvasRef.current) {
      console.log('✅ All conditions met for neural network visualization');
      
      const networkCtx = networkCanvasRef.current.getContext('2d');
      networkCtx.clearRect(0, 0, networkCanvasRef.current.width, networkCanvasRef.current.height);
      
      // Check brain structure
      console.log('🧠 Brain Structure Analysis:');
      console.log('  - bestCar.brain:', bestCar.brain);
      console.log('  - levels exist:', !!(bestCar.brain.levels));
      console.log('  - levels length:', bestCar.brain.levels?.length);
      
      if (bestCar.brain.levels && bestCar.brain.levels[0]) {
        console.log('  - Level 0 inputs:', bestCar.brain.levels[0].inputs?.length);
        console.log('  - Level 0 outputs:', bestCar.brain.levels[0].outputs?.length);
        console.log('  - Level 1 outputs:', bestCar.brain.levels[1]?.outputs?.length);
        
        console.log(`🧠 Network Architecture: Input=${bestCar.brain.levels[0].inputs.length}, Hidden=${bestCar.brain.levels[0].outputs.length}, Output=${bestCar.brain.levels[1]?.outputs.length || 'N/A'}`);
      }
      
      // Always draw the network
      if (Visualizer && Visualizer.drawNetwork) {
        console.log('🎨 Drawing neural network...');
        try {
          Visualizer.drawNetwork(networkCtx, bestCar.brain);
          console.log('✅ Neural network drawn successfully');
        } catch (error) {
          console.error('❌ Neural network visualization error:', error);
          Visualizer.drawNetwork(networkCtx, bestCar.brain);
        }
      } else {
        console.log('❌ Visualizer or drawNetwork method not available');
      }
    } else {
      console.log('❌ Conditions not met for neural network visualization');
    }
  }, [trainingMode, bestCar]); // Removed cars dependency to avoid excessive re-renders

  const handleDialogChoice = (choice) => {
    if (choice === 'new') {
      setDialogOpen(false);
      setShowTrainingControls(false);
    } else if (choice === 'existing') {
      setDialogOpen(false);
      setShowTrainingControls(false);
    }
  };

  const handleSaveWorld = () => {
    setShowTrainingControls(true);
  };

  const handleTrainingMode = (mode) => {
    // Clear any existing cars first and reset everything
    setCars([]);
    setBestCar(null);
    setGeneration(1);
    generationTimerRef.current = 0;
    
    setTrainingMode(mode);
    
    // Small delay to ensure state updates, then initialize
    setTimeout(() => {
      if (mode === 'ai') {
        initializeAITraining();
      } else if (mode === 'manual') {
        initializeManualDriving();
      }
    }, 100);
  };

  const initializeAITraining = () => {
    console.log('🚀 Initializing AI Training...');
    if (!worldRef.current) {
      console.log('❌ No world reference available');
      return;
    }
    
    const world = worldRef.current;
    const N = 100;
    const newCars = [];
    
  const startPoint = world.markings.find(m => m instanceof Start);
  let startX = startPoint ? startPoint.center.x : 0;
  let startY = startPoint ? startPoint.center.y : 0;
    console.log('📍 Start position:', { startX, startY });
    
    // Calculate proper starting angle based on start marking direction
    let startAngle = 0;
    if (startPoint && startPoint.directionVector) {
      const dir = startPoint.directionVector;
      // Normalize the direction vector
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const normalizedDir = { x: dir.x / length, y: dir.y / length };
      // Convert from direction vector to car angle (car's forward direction)
      startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
      // LHS spawn shift
      const leftNormal = { x: -normalizedDir.y, y: normalizedDir.x };
      const sideSign = (world.drivingSide || 'left') === 'left' ? 1 : -1;
      startX += leftNormal.x * sideSign * 15;
      startY += leftNormal.y * sideSign * 15;
    }
    console.log('📐 Start angle:', startAngle);
    
    for (let i = 0; i < N; i++) {
      const jitter = (Math.random()-0.5)*10;
      const car = new Car(startX + jitter, startY + jitter, 30, 50, "AI", startAngle);
      // Use independent random brains for the first generation
  car.brain = new NeuralNetwork([5, 6, 4]);
      car.fitness = 0;
      newCars.push(car);
    }
    
    console.log(`✅ Created ${newCars.length} cars for AI training`);
    setCars(newCars);
    setBestCar(newCars[0]);
    console.log('🏆 Best car set:', newCars[0]);
  };

  const initializeManualDriving = () => {
    if (!worldRef.current) return;
    
    const world = worldRef.current;
    
    // Ensure world is generated before creating the car
    if (world.graph.segments.length > 0) {
      world.generate();
    }
    
    const startPoint = world.markings.find(m => m instanceof Start);
    const startX = startPoint ? startPoint.center.x : 0;
    const startY = startPoint ? startPoint.center.y : 0;
    
    // Calculate proper starting angle based on start marking direction
    let startAngle = 0;
    if (startPoint && startPoint.directionVector) {
      const dir = startPoint.directionVector;
      // Normalize the direction vector
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      const normalizedDir = { x: dir.x / length, y: dir.y / length };
      // Convert from direction vector to car angle (car's forward direction)
      startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
    }
    
    const car = new Car(startX, startY, 30, 50, "KEYS", startAngle);
    setCars([car]);
    setBestCar(car);
  };

  return (
    <div className="w-full h-full relative">
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Choose World Option</h2>
            <div className="space-y-4">
              <button
                onClick={() => handleDialogChoice('existing')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Use Existing World
              </button>
              <button
                onClick={() => handleDialogChoice('new')}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Create New World
              </button>
            </div>
          </div>
        </div>
      )}

      {!dialogOpen && !showTrainingControls && !trainingMode && (
        <>
          {/* Top-right Save Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleSaveWorld}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors"
            >
              Save World
            </button>
          </div>

          {/* Floating Dashboard at Bottom */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="text-sm font-semibold text-gray-700">World Builder Tools</div>
                <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                <div className="text-xs text-gray-500 capitalize">{activeTool} Mode</div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Road Tool */}
                <button
                  onClick={() => setActiveTool('road')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'road' 
                      ? 'bg-blue-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Road Builder"
                >
                  <div className="text-lg">🛣️</div>
                  <div className="text-xs font-medium">Road</div>
                </button>

                <div className="w-px h-12 bg-gray-300"></div>

                {/* Start Point Tool */}
                <button
                  onClick={() => setActiveTool('start')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'start' 
                      ? 'bg-green-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Start Point"
                >
                  <div className="text-lg">🏁</div>
                  <div className="text-xs font-medium">Start</div>
                </button>

                {/* Target Point Tool */}
                <button
                  onClick={() => setActiveTool('target')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'target' 
                      ? 'bg-red-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Target Point"
                >
                  <div className="text-lg">🎯</div>
                  <div className="text-xs font-medium">Target</div>
                </button>

                <div className="w-px h-12 bg-gray-300"></div>

                {/* Traffic Light Tool */}
                <button
                  onClick={() => setActiveTool('light')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'light' 
                      ? 'bg-yellow-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Traffic Light"
                >
                  <div className="text-lg">🚦</div>
                  <div className="text-xs font-medium">Light</div>
                </button>

                {/* Stop Sign Tool */}
                <button
                  onClick={() => setActiveTool('stop')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'stop' 
                      ? 'bg-red-600 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Stop Sign"
                >
                  <div className="text-lg">🛑</div>
                  <div className="text-xs font-medium">Stop</div>
                </button>

                {/* Yield Sign Tool */}
                <button
                  onClick={() => setActiveTool('yield')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'yield' 
                      ? 'bg-yellow-600 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Yield Sign"
                >
                  <div className="text-lg">⚠️</div>
                  <div className="text-xs font-medium">Yield</div>
                </button>

                {/* Crossing Tool */}
                <button
                  onClick={() => setActiveTool('crossing')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'crossing' 
                      ? 'bg-indigo-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Pedestrian Crossing"
                >
                  <div className="text-lg">🚶</div>
                  <div className="text-xs font-medium">Cross</div>
                </button>

                {/* Parking Tool */}
                <button
                  onClick={() => setActiveTool('parking')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'parking' 
                      ? 'bg-purple-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Parking Area"
                >
                  <div className="text-lg">🅿️</div>
                  <div className="text-xs font-medium">Park</div>
                </button>

                {/* Obstacle Tool */}
                <button
                  onClick={() => setActiveTool('obstacle')}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                    activeTool === 'obstacle' 
                      ? 'bg-orange-500 text-white shadow-lg scale-105' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Indian Road Obstacles"
                >
                  <div className="text-lg">🚧</div>
                  <div className="text-xs font-medium">Obstacles</div>
                </button>
              </div>

              {/* Tool Instructions */}
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600">
                  {activeTool === 'road' && (
                    <>
                      <span className="font-medium">Road Mode:</span> Click to add points and draw roads. Right-click to delete points.
                    </>
                  )}
                  {activeTool === 'start' && (
                    <>
                      <span className="font-medium">Start Point:</span> Click on a road segment to place the starting position for cars.
                    </>
                  )}
                  {activeTool === 'target' && (
                    <>
                      <span className="font-medium">Target Point:</span> Click on a road segment to set the goal destination.
                    </>
                  )}
                  {activeTool === 'light' && (
                    <>
                      <span className="font-medium">Traffic Light:</span> Click on a road segment to place a traffic light.
                    </>
                  )}
                  {activeTool === 'stop' && (
                    <>
                      <span className="font-medium">Stop Sign:</span> Click on a road segment to place a stop sign.
                    </>
                  )}
                  {activeTool === 'yield' && (
                    <>
                      <span className="font-medium">Yield Sign:</span> Click on a road segment to place a yield sign.
                    </>
                  )}
                  {activeTool === 'crossing' && (
                    <>
                      <span className="font-medium">Pedestrian Crossing:</span> Click on a road to place a crosswalk.
                    </>
                  )}
                  {activeTool === 'parking' && (
                    <>
                      <span className="font-medium">Parking Area:</span> Click on a road segment to designate parking spots.
                    </>
                  )}
                  {activeTool === 'obstacle' && (
                    <>
                      <span className="font-medium">Indian Road Obstacles:</span> Click to place obstacles like potholes, speed bumps, cows, auto-rickshaws, etc. Right-click to change obstacle type.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showTrainingControls && !trainingMode && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Training Mode</h2>
            <div className="space-y-4">
              <button
                onClick={() => handleTrainingMode('manual')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Manual Drive
              </button>
              <button
                onClick={() => handleTrainingMode('ai')}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                AI Auto Train
              </button>
            </div>
          </div>
        </div>
      )}

      {trainingMode && (
        <div className="absolute top-4 left-4 z-10 space-y-2">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Mode: {trainingMode === 'ai' ? 'AI Training' : 'Manual Drive'}</span>
              <button
                onClick={() => {
                  setTrainingMode(null);
                  setCars([]);
                  setBestCar(null);
                  setGeneration(1);
                  generationTimerRef.current = 0;
                  setShowTrainingControls(true);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
              >
                Stop
              </button>
            </div>
            {trainingMode === 'ai' && (
              <div className="text-sm space-y-1">
                <div>Generation: {generation}</div>
                <div>Cars: {cars.filter(car => !car.damaged).length}/{cars.length}</div>
                <div>Timer: {Math.floor(generationTimerRef.current / 60)}s</div>
                {bestCar && (
                  <div>Best Fitness: {bestCar.fitness.toFixed(2)}</div>
                )}
                <div>Driving Side: <span className="font-semibold">{(worldRef.current?.drivingSide || 'left').toUpperCase()}</span></div>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      if (!worldRef.current) return;
                      worldRef.current.drivingSide = worldRef.current.drivingSide === 'left' ? 'right' : 'left';
                      try {
                        const saved = localStorage.getItem('virtualWorld');
                        if (saved) {
                          const obj = JSON.parse(saved);
                          obj.drivingSide = worldRef.current.drivingSide;
                          localStorage.setItem('virtualWorld', JSON.stringify(obj));
                        }
                      } catch {}
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Toggle Driving Side
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white p-2 rounded-lg shadow-lg text-xs">
            <div className="font-semibold mb-1">{trainingMode === 'manual' ? 'Controls:' : 'Training Info:'}</div>
            {trainingMode === 'manual' ? (
              <>
                <div>• Arrow Keys / WASD to drive</div>  
                <div>• Collect training data by driving</div>
              </>
            ) : (
              <>
                <div>• Cars start at GREEN point</div>
                <div>• Goal is to reach RED point</div>
                <div>• Fitness = Progress + Speed</div>
                <div>• Best cars evolve over generations</div>
              </>
            )}
          </div>
        </div>
      )}

      {trainingMode === 'ai' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <div className="text-xs font-semibold mb-2">Neural Network</div>
            <canvas 
              ref={networkCanvasRef} 
              width={300} 
              height={200}
              className="border border-gray-300"
            />
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full" />
    </div>
  );
}
