import { useEffect, useRef, useState } from "react";
import {Viewport} from "../../components/viewport";
import {World} from "../../components/world";
import {Car} from "../../car.js";
import {Start} from "../../components/markings/start.js";
import {scale} from "../../components/math/utils.js";

export default function Manual() {
  const canvasRef = useRef(null);
  
  const [car, setCar] = useState(null);
  const [isDriving, setIsDriving] = useState(false);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [stats, setStats] = useState({ speed: 0, distance: 0 });
  const [resetMessage, setResetMessage] = useState(''); // Message when car goes off-road
  const [showCrashDialog, setShowCrashDialog] = useState(false); // Control crash dialog display
  const [cameraMode, setCameraMode] = useState(0); // 0: follow, 1: behind, 2: cockpit, 3: top-down, 4: static
  
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const startTimeRef = useRef(0);
  const totalDistanceRef = useRef(0);
  const startPositionRef = useRef({ x: 0, y: 0, angle: 0 }); // Store start position for reset
  
  const cameraNames = ["Follow Car", "Behind Car", "Driver View", "Aerial View", "Bird's Eye"];

  // Camera switching function
  const switchCamera = () => {
    const newMode = (cameraMode + 1) % cameraNames.length;
    setCameraMode(newMode);
    console.log(`Camera switched to: ${cameraNames[newMode]} (mode ${newMode})`);
    
    // Force immediate viewport update if we have car and viewport
    if (car && viewportRef.current) {
      // Temporarily set the mode for updateCamera call
      const tempMode = newMode;
      const viewport = viewportRef.current;
      
      // Apply camera change immediately
      switch (tempMode) {
        case 0: // Follow Car (centered on car)
          viewport.offset.x = -car.x;
          viewport.offset.y = -car.y;
          viewport.zoom = 1.5;
          break;
        case 1: // Behind Car (positioned behind car)
          const behindDistance = 200;
          const behindX = car.x - Math.sin(car.angle) * behindDistance;
          const behindY = car.y - Math.cos(car.angle) * behindDistance;
          viewport.offset.x = -behindX;
          viewport.offset.y = -behindY;
          viewport.zoom = 1.0;
          break;
        case 2: // Driver View (very close, inside car)
          const driverDistance = 10;
          const driverX = car.x + Math.sin(car.angle) * driverDistance;
          const driverY = car.y + Math.cos(car.angle) * driverDistance;
          viewport.offset.x = -driverX;
          viewport.offset.y = -driverY;
          viewport.zoom = 2.5;
          break;
        case 3: // Aerial View (angled from above-left)
          const aerialDistance = 300;
          const aerialAngle = car.angle + Math.PI/4; // 45 degrees offset
          const aerialX = car.x - Math.sin(aerialAngle) * aerialDistance;
          const aerialY = car.y - Math.cos(aerialAngle) * aerialDistance;
          viewport.offset.x = -aerialX;
          viewport.offset.y = -aerialY;
          viewport.zoom = 0.7;
          break;
        case 4: // Bird's Eye (high above, static)
          viewport.offset.x = -car.x;
          viewport.offset.y = -car.y;
          viewport.zoom = 0.3;
          break;
      }
    }
  };

  // Keyboard event listener for camera switching
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        switchCamera();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update camera position based on mode
  const updateCamera = (viewport, car) => {
    if (!car) return;

    const smoothFactor = 0.15; // Increased for more responsive camera
    
    switch (cameraMode) {
      case 0: // Follow Car (original behavior)
        viewport.offset.x = -car.x;
        viewport.offset.y = -car.y;
        viewport.zoom = 1.5;
        break;
        
      case 1: // Behind Car
        const behindDistance = 150;
        const behindX = car.x - Math.sin(car.angle) * behindDistance;
        const behindY = car.y - Math.cos(car.angle) * behindDistance;
        
        // More immediate positioning for behind car
        viewport.offset.x = -behindX;
        viewport.offset.y = -behindY;
        viewport.zoom = 1.8;
        break;
        
      case 2: // Driver View (close follow with slight offset)
        const driverDistance = 25;
        const driverX = car.x - Math.sin(car.angle) * driverDistance;
        const driverY = car.y - Math.cos(car.angle) * driverDistance;
        
        viewport.offset.x = -driverX;
        viewport.offset.y = -driverY;
        viewport.zoom = 2.5; // Much more zoomed in for driver perspective
        break;
        
      case 3: // Aerial View (zoomed out, following)
        viewport.offset.x = -car.x;
        viewport.offset.y = -car.y;
        viewport.zoom = 0.6; // More zoomed out for aerial view
        break;
        
      case 4: // Bird's Eye (high altitude, slow follow)
        // Much slower following for bird's eye view
        const targetX = -car.x;
        const targetY = -car.y;
        viewport.offset.x = viewport.offset.x * 0.95 + targetX * 0.05;
        viewport.offset.y = viewport.offset.y * 0.95 + targetY * 0.05;
        viewport.zoom = 0.3; // Very zoomed out
        break;
    }
  };

  // Reset car to start position
  const resetCarToStart = () => {
    if (car && startPositionRef.current) {
      car.x = startPositionRef.current.x;
      car.y = startPositionRef.current.y;
      car.angle = startPositionRef.current.angle;
      car.speed = 0;
      car.damaged = false;
      totalDistanceRef.current = 0;
      setStats({ speed: 0, distance: 0 });
      setResetMessage('Car went off-road! Resetting to start position...');
      setShowCrashDialog(false); // Don't show crash dialog for off-road reset
      console.log("Car reset to start position");
      
      // Clear message after 2 seconds
      setTimeout(() => {
        setResetMessage('');
      }, 2000);
    }
  };

  const initializeDriving = () => {
    if (!worldRef.current) return;
    
    try {
      const world = worldRef.current;
      
      // First try to find a Start marking
      const startMarking = world.markings.find(m => m instanceof Start);
      
      let startX, startY, startAngle = 0;
      
      if (startMarking) {
        console.log("Using Start marking:", startMarking);
        // Use Start marking if available
        startX = startMarking.center.x;
        startY = startMarking.center.y;
        
        if (startMarking.directionVector) {
          const dir = startMarking.directionVector;
          const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
          const normalizedDir = { x: dir.x / length, y: dir.y / length };
          startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
        }
      } else if (world.graph && world.graph.points.length > 0) {
        console.log("Using fallback to first graph point");
        // Fall back to first point of the graph
        const firstPoint = world.graph.points[0];
        startX = firstPoint.x;
        startY = firstPoint.y;
        
        // Find the first segment connected to this point to determine direction
        const firstSegment = world.graph.segments.find(seg => 
          seg.p1.equals(firstPoint) || seg.p2.equals(firstPoint)
        );
        
        if (firstSegment) {
          const dir = firstSegment.p1.equals(firstPoint) ? 
            { x: firstSegment.p2.x - firstSegment.p1.x, y: firstSegment.p2.y - firstSegment.p1.y } :
            { x: firstSegment.p1.x - firstSegment.p2.x, y: firstSegment.p1.y - firstSegment.p2.y };
          const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
          const normalizedDir = { x: dir.x / length, y: dir.y / length };
          startAngle = -Math.atan2(normalizedDir.y, normalizedDir.x) + Math.PI / 2;
        }
      } else {
        alert('Please create some roads first, then add a start point using the Start tool (🏁) in World Builder!');
        return;
      }
      
      console.log("Creating car at:", startX, startY, "angle:", startAngle);
      
      // Store start position for reset functionality
      startPositionRef.current = { x: startX, y: startY, angle: startAngle };
      
      const newCar = new Car(startX, startY, 30, 50, "KEYS", startAngle);
      setCar(newCar);
      setIsDriving(true);
      startTimeRef.current = Date.now();
      totalDistanceRef.current = 0;
    } catch (error) {
      console.error("Error initializing driving:", error);
      alert("Error starting manual drive: " + error.message);
    }
  };

  // Load world and initialize (run once)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Set canvas size to match its display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    viewportRef.current = new Viewport(canvas, 1.5);
    
    // Load world from localStorage
    const savedWorld = localStorage.getItem('virtualWorld');
    if (savedWorld) {
      try {
        const worldData = JSON.parse(savedWorld);
        // Validate world data before loading
        if (worldData && typeof worldData === 'object') {
          worldRef.current = World.load(worldData);
          setWorldLoaded(true);
        } else {
          console.warn("Invalid world data structure");
          worldRef.current = new World();
          setWorldLoaded(false);
        }
      } catch (error) {
        console.error("Failed to load world:", error);
        worldRef.current = new World();
        setWorldLoaded(false);
        // Clear corrupted data
        localStorage.removeItem('virtualWorld');
      }
    } else {
      worldRef.current = new World();
      setWorldLoaded(false);
    }
  }, [canvasRef]);

  // Animation loop (separate effect)
  useEffect(() => {
    if (!worldRef.current || !viewportRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const world = worldRef.current;
    const viewport = viewportRef.current;

    // Update camera position based on current mode (inside useEffect for fresh closure)
    const updateCameraInLoop = (viewport, car) => {
      if (!car) return;

      switch (cameraMode) {
        case 0: // Follow Car (original behavior - centered on car)
          viewport.offset.x = -car.x;
          viewport.offset.y = -car.y;
          viewport.zoom = 1.5; // Normal zoom
          break;
          
        case 1: // Behind Car (positioned behind, following car's movement)
          const behindDistance = 200;
          const behindX = car.x - Math.sin(car.angle) * behindDistance;
          const behindY = car.y - Math.cos(car.angle) * behindDistance;
          
          viewport.offset.x = -behindX;
          viewport.offset.y = -behindY;
          viewport.zoom = 1.0; // Slightly zoomed out to see more road ahead
          break;
          
        case 2: // Driver View (very close, like you're inside the car)
          const driverDistance = 10; // Much closer to the car
          const driverX = car.x + Math.sin(car.angle) * driverDistance; // IN FRONT of car
          const driverY = car.y + Math.cos(car.angle) * driverDistance;
          
          viewport.offset.x = -driverX;
          viewport.offset.y = -driverY;
          viewport.zoom = 2.5; // ZOOMED IN - closest view (higher value = closer)
          break;
          
        case 3: // Aerial View (angled perspective from above-left)
          const aerialDistance = 300;
          const aerialAngle = car.angle + Math.PI/4; // 45 degrees offset from car's direction
          const aerialX = car.x - Math.sin(aerialAngle) * aerialDistance;
          const aerialY = car.y - Math.cos(aerialAngle) * aerialDistance;
          
          viewport.offset.x = -aerialX;
          viewport.offset.y = -aerialY;
          viewport.zoom = 0.7; // Moderately zoomed out (lower value = farther)
          break;
          
        case 4: // Bird's Eye (very high, strategic overview)
          viewport.offset.x = -car.x;
          viewport.offset.y = -car.y;
          viewport.zoom = 0.3; // VERY ZOOMED OUT - farthest view (lowest value = farthest)
          break;
      }
    };

    let animationFrame;
    const loop = () => {
      // Always clear and reset viewport
      viewport.reset();
      
      if (isDriving && car) {
        const collisionObjects = world.getCollisionObjects();
        
        if (!car.damaged) {
          // Store previous position for distance calculation
          const prevX = car.x;
          const prevY = car.y;
          
          car.update(collisionObjects, [], world); // Pass world for boundary checking
          
          // Calculate distance traveled
          const distanceMoved = Math.sqrt(
            Math.pow(car.x - prevX, 2) + Math.pow(car.y - prevY, 2)
          );
          totalDistanceRef.current += distanceMoved;
          
          // Update stats
          setStats({
            speed: Math.abs(car.speed * 10).toFixed(1), // Convert to more readable speed
            distance: totalDistanceRef.current.toFixed(1)
          });
          
          // Update camera position based on current mode
          updateCameraInLoop(viewport, car);
        } else {
          // Car is damaged - handle based on damage type
          if (car.damageType === 'off-road') {
            // Auto-reset for off-road (boundary violation)
            setTimeout(() => {
              resetCarToStart();
            }, 1000); // 1 second delay before reset
          } else {
            // Show crash dialog for collisions
            setShowCrashDialog(true);
          }
        }
      }

      if (world.graph.segments.length > 0) {
        world.generate();
      }

      const viewPoint = scale(viewport.getOffset(), -1);
      world.draw(ctx, viewPoint);
      
      if (isDriving && car) {
        const showSensors = cameraMode === 0 || cameraMode === 1; // Only show sensors in follow and behind modes
        car.draw(ctx, showSensors);
      }

      animationFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDriving, car, cameraMode]); // Add cameraMode to dependencies

  const handleStop = () => {
    setIsDriving(false);
    setCar(null);
    setStats({ speed: 0, distance: 0 });
    setShowCrashDialog(false);
    setResetMessage('');
    setCameraMode(0); // Reset camera to follow mode
    totalDistanceRef.current = 0;
    if (viewportRef.current) {
      viewportRef.current.offset.x = 0;
      viewportRef.current.offset.y = 0;
      viewportRef.current.zoom = 1.5; // Reset zoom
      // Force a clear of the canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleRestart = () => {
    setShowCrashDialog(false);
    handleStop();
    setTimeout(() => initializeDriving(), 100);
  };

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
          <h1 className="text-lg font-semibold text-blue-600">Manual Drive Mode</h1>
        </div>

        <button
          onClick={() => window.location.href = '/world-builder'}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Edit World
        </button>
      </div>

      {/* No World Dialog */}
      {!worldLoaded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold mb-4">No World Found</h2>
            <p className="text-gray-600 mb-6">
              You need to create a world first before you can drive.
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

      {/* Driving Status */}
      {isDriving && (
        <div className="absolute top-20 left-4 z-10 space-y-2">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-600">Manual Driving</span>
              <div className="flex gap-2">
                <button
                  onClick={handleRestart}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Restart
                </button>
                <button
                  onClick={handleStop}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div>Speed: {stats.speed} km/h</div>
              <div>Distance: {stats.distance}m</div>
              <div>Status: {car?.damaged ? 'Resetting...' : 'Driving'}</div>
              <div>Camera: {cameraNames[cameraMode]}</div>
              {viewportRef.current && (
                <div>Zoom: {viewportRef.current.zoom.toFixed(1)}x</div>
              )}
              {resetMessage && (
                <div className="text-orange-600 font-semibold mt-2">
                  {resetMessage}
                </div>
              )}
            </div>
          </div>
          
          {/* Camera Control */}
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-600">Camera View</span>
              <button
                onClick={switchCamera}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Switch
              </button>
            </div>
            <div className="text-sm">
              <div>{cameraNames[cameraMode]}</div>
              <div className="text-gray-600 mt-1">Press <kbd className="bg-gray-200 px-1 rounded">C</kbd> to switch</div>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
            <div className="font-semibold mb-1">Controls:</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">↑</kbd> or <kbd className="bg-gray-200 px-1 rounded">W</kbd> - Accelerate</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">↓</kbd> or <kbd className="bg-gray-200 px-1 rounded">S</kbd> - Brake/Reverse</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">←</kbd> or <kbd className="bg-gray-200 px-1 rounded">A</kbd> - Turn Left</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">→</kbd> or <kbd className="bg-gray-200 px-1 rounded">D</kbd> - Turn Right</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">C</kbd> - Switch Camera</div>
          </div>
        </div>
      )}

      {/* Start Driving Button */}
      {worldLoaded && !isDriving && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold mb-4">Ready to Drive</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Take control of the car and navigate through your custom world. Use keyboard controls to steer and avoid obstacles.
            </p>
            <button
              onClick={initializeDriving}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              Start Driving
            </button>
          </div>
        </div>
      )}

      {/* Crash Dialog */}
      {isDriving && showCrashDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Crashed!</h2>
            <p className="text-gray-600 mb-6">
              Your car hit an obstacle. Distance traveled: {stats.distance}m
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleStop}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
