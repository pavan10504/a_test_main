import { useEffect, useRef, useState } from "react";
import { Link } from 'react-router-dom';
import {Viewport} from "../components/viewport";
import {World} from "../components/world";
import {GraphEditor} from "../components/editors/grapheditor";
import {StartEditor} from "../components/editors/startEditor";
import {TargetEditor} from "../components/editors/targetEditor";
import {LightEditor} from "../components/editors/lightEditor";
import {StopEditor} from "../components/editors/stopEditor";
import {YieldEditor} from "../components/editors/yieldEditor";
import {CrossingEditor} from "../components/editors/crossingEditor";
import {ParkingEditor} from "../components/editors/parkingEditor";
import {ObstacleEditor} from "../components/editors/obstacleEditorFixed";
import {scale} from "../components/math/utils.js";
import { debugWorld } from '../utils/debugWorld.js';
import OSMImporter from '../components/OSMImporter.jsx';

export default function WorldBuilder() {
  const canvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState('road');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showObstacleMenu, setShowObstacleMenu] = useState(false);
  const [showOSMDialog, setShowOSMDialog] = useState(false);
  const [selectedObstacleType, setSelectedObstacleType] = useState('pothole');
  
  // Obstacle types with their display info
  const obstacleTypes = [
    { id: 'pothole', name: 'Pothole', emoji: '🕳️', description: 'Road damage' },
    { id: 'speedbump', name: 'Speed Bump', emoji: '🏔️', description: 'Traffic calming' },
    { id: 'construction', name: 'Construction', emoji: '🚧', description: 'Work zone' },
    { id: 'cow', name: 'Cow', emoji: '🐄', description: 'Livestock' },
    { id: 'autorickshaw', name: 'Auto-rickshaw', emoji: '🛺', description: 'Three-wheeler' },
    { id: 'vendor', name: 'Street Vendor', emoji: '🛒', description: 'Food cart' },
    { id: 'debris', name: 'Road Debris', emoji: '🪨', description: 'Scattered rocks' }
  ];
  
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

  // Initialize world and editors
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Set canvas size to match its display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    viewportRef.current = new Viewport(canvas, 1.5);
    
    // Load existing world or create new one
    const savedWorld = localStorage.getItem('virtualWorld');
    if (savedWorld) {
      try {
        const worldData = JSON.parse(savedWorld);
        if (worldData && typeof worldData === 'object') {
          worldRef.current = World.load(worldData);
        } else {
          worldRef.current = new World();
        }
      } catch (error) {
        console.error("Failed to load existing world:", error);
        worldRef.current = new World();
        localStorage.removeItem('virtualWorld');
      }
    } else {
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
    
    // Set initial obstacle type
    if (obstacleEditorRef.current) {
      obstacleEditorRef.current.obstacleType = selectedObstacleType;
    }

    let animationFrame;
    const loop = () => {
      viewport.reset();
      
      // Trigger world generation only when graph changes or world is empty
      if (world.graph.segments.length > 0 && 
          (world.envelopes.length === 0 || world.lastSegmentCount !== world.graph.segments.length)) {
        world.generate();
      }

      // Draw world
      const viewPoint = scale(viewport.getOffset(), -1);
      world.draw(ctx, viewPoint);
      
      // Display all editor intents with transparency
      ctx.globalAlpha = 0.3;
      
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
      animationFrame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [canvasRef]);

  // Handle tool switching
  useEffect(() => {
    if (!graphEditorRef.current) return;

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

    // Enable only the active editor
    const activeEditor = editors[activeTool];
    if (activeEditor?.enable) {
      activeEditor.enable();
    }
  }, [activeTool]);

  // Update obstacle type when selection changes
  useEffect(() => {
    if (obstacleEditorRef.current) {
      obstacleEditorRef.current.obstacleType = selectedObstacleType;
    }
  }, [selectedObstacleType]);

  // Close obstacle menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showObstacleMenu && !event.target.closest('.obstacle-menu-container')) {
        setShowObstacleMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showObstacleMenu]);

  const handleObstacleClick = () => {
    if (activeTool === 'obstacle') {
      // If already active, toggle menu
      setShowObstacleMenu(!showObstacleMenu);
    } else {
      // If not active, activate tool and show menu
      setActiveTool('obstacle');
      setShowObstacleMenu(true);
    }
  };

  const handleObstacleTypeSelect = (type) => {
    setSelectedObstacleType(type);
    setShowObstacleMenu(false);
  };

  const handleSaveWorld = () => {
    if (worldRef.current) {
      try {
        const worldData = {
          graph: worldRef.current.graph,
          markings: worldRef.current.markings,
          obstacles: worldRef.current.obstacles || [], // Add obstacles to save data
          roadWidth: worldRef.current.roadWidth,
          roadRoundness: worldRef.current.roadRoundness,
          buildingWidth: worldRef.current.buildingWidth,
          buildingMinLength: worldRef.current.buildingMinLength,
          spacing: worldRef.current.spacing,
          treeSize: worldRef.current.treeSize,
          envelopes: worldRef.current.envelopes,
          roadBorders: worldRef.current.roadBorders,
          buildings: worldRef.current.buildings,
          trees: worldRef.current.trees,
          laneGuides: worldRef.current.laneGuides,
          timestamp: Date.now()
        };
        
        // Calculate data size estimate
        const dataString = JSON.stringify(worldData);
        const dataSizeKB = Math.round(dataString.length / 1024);
        console.log(`💾 World data size: ${dataSizeKB} KB`);
        
        // Handle large datasets that exceed localStorage limits
        if (dataSizeKB > 8000) { // 8MB limit
          console.warn(`⚠️ Large world data (${dataSizeKB} KB) - using optimized saving`);
          
          // Create optimized version for large datasets
          const optimizedData = {
            graph: worldRef.current.graph,
            markings: worldRef.current.markings,
            obstacles: worldRef.current.obstacles || [],
            roadWidth: worldRef.current.roadWidth,
            roadRoundness: worldRef.current.roadRoundness,
            buildingWidth: worldRef.current.buildingWidth,
            buildingMinLength: worldRef.current.buildingMinLength,
            spacing: worldRef.current.spacing,
            treeSize: worldRef.current.treeSize,
            // Skip heavy generated data - will regenerate on load
            envelopes: [], // Will regenerate
            roadBorders: [], // Will regenerate
            buildings: [], // Will regenerate
            trees: [], // Will regenerate
            laneGuides: [], // Will regenerate
            timestamp: Date.now(),
            isOptimized: true // Flag to indicate this needs regeneration
          };
          
          localStorage.setItem('virtualWorld', JSON.stringify(optimizedData));
          console.log(`✅ Saved optimized world data (${Math.round(JSON.stringify(optimizedData).length / 1024)} KB)`);
          alert(`✅ Delhi imported successfully!\n\n📊 World Stats:\n• ${worldRef.current.graph.points.length} road points\n• ${worldRef.current.graph.segments.length} road segments\n• ${worldRef.current.buildings.length} buildings\n• ${worldRef.current.trees.length} trees\n\n💾 Saved in optimized format due to large size.`);
        } else {
          localStorage.setItem('virtualWorld', JSON.stringify(worldData));
          console.log(`✅ Saved full world data (${dataSizeKB} KB)`);
        }
        
        setShowSaveDialog(true);
        setTimeout(() => setShowSaveDialog(false), 2000);
      } catch (error) {
        console.error("Failed to save world:", error);
        alert("Failed to save world. Please try again.");
      }
    }
  };

  const handleImportOSM = () => {
    setShowOSMDialog(true);
  };

  const handleOSMImport = (roadData) => {
    try {
      console.log(`🌍 Importing road data: ${roadData.segments.length} segments...`);
      
      // Clear existing world and create new one with OSM data
      if (worldRef.current && graphEditorRef.current) {
        // Process road data
        worldRef.current.graph.points = roadData.points;
        worldRef.current.graph.segments = roadData.segments;
        worldRef.current.markings = [];
        worldRef.current.obstacles = [];
        
        // Force regeneration to display immediately
        worldRef.current.lastSegmentCount = -1; // Force regeneration
        worldRef.current.generate();
        
        console.log(`✅ Successfully imported ${roadData.points.length} points and ${roadData.segments.length} road segments`);
        console.log(`🏗️ Generated ${worldRef.current.buildings.length} buildings and ${worldRef.current.trees.length} trees`);
        
        // Save as normal (not optimized) since this is user-selected small area
        handleSaveWorldNormal();
      }
    } catch (error) {
      console.error('Failed to process OSM data:', error);
      alert('Failed to process city data. Please try again.');
    }
  };

  const handleSaveWorldNormal = () => {
    if (worldRef.current) {
      try {
        const worldData = {
          graph: worldRef.current.graph,
          markings: worldRef.current.markings,
          obstacles: worldRef.current.obstacles || [],
          roadWidth: worldRef.current.roadWidth,
          roadRoundness: worldRef.current.roadRoundness,
          buildingWidth: worldRef.current.buildingWidth,
          buildingMinLength: worldRef.current.buildingMinLength,
          spacing: worldRef.current.spacing,
          treeSize: worldRef.current.treeSize,
          envelopes: worldRef.current.envelopes,
          roadBorders: worldRef.current.roadBorders,
          buildings: worldRef.current.buildings,
          trees: worldRef.current.trees,
          laneGuides: worldRef.current.laneGuides,
          timestamp: Date.now()
          // NO isOptimized flag - save everything normally
        };
        
        localStorage.setItem('virtualWorld', JSON.stringify(worldData));
        const dataSizeKB = Math.round(JSON.stringify(worldData).length / 1024);
        console.log(`✅ Saved complete world data (${dataSizeKB} KB) - no regeneration needed`);
        
        setShowSaveDialog(true);
        setTimeout(() => setShowSaveDialog(false), 2000);
      } catch (error) {
        console.error("Failed to save world:", error);
        // If saving fails due to size, fallback to regular save
        console.log("Falling back to optimized save...");
        handleSaveWorld();
      }
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <Link 
          to="/" 
          className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-colors flex items-center gap-2"
        >
          <span>←</span> Home
        </Link>
        
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <h1 className="text-lg font-semibold">World Builder</h1>
          {worldRef.current && (
            <div className="text-xs text-gray-600 mt-1">
              Roads: {worldRef.current.graph?.segments.length || 0} | 
              Markings: {worldRef.current.markings?.length || 0}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleImportOSM}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors flex items-center gap-2"
            title="Import real city roads from OpenStreetMap"
          >
            <span>🗺️</span> Import City
          </button>
          
          <button
            onClick={handleSaveWorld}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            Save World
          </button>
          
          <button
            onClick={() => worldRef.current && debugWorld(worldRef.current)}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            Debug
          </button>
        </div>
      </div>

      {/* Save Success Dialog */}
      {showSaveDialog && (
        <div className="absolute top-20 right-4 z-20 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          World saved successfully!
        </div>
      )}

      {/* OSM Import Dialog */}
      {showOSMDialog && (
        <OSMImporter 
          onImport={handleOSMImport}
          onClose={() => setShowOSMDialog(false)}
        />
      )}

      {/* Tool Dashboard */}
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

            {/* Obstacle Tool with Dropdown */}
            <div className="relative obstacle-menu-container">
              <button
                onClick={handleObstacleClick}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                  activeTool === 'obstacle' 
                    ? 'bg-orange-500 text-white shadow-lg scale-105' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Indian Road Obstacles"
              >
                <div className="text-lg">
                  {obstacleTypes.find(t => t.id === selectedObstacleType)?.emoji || '🚧'}
                </div>
                <div className="text-xs font-medium">Obstacles</div>
                {activeTool === 'obstacle' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 rounded-full flex items-center justify-center">
                    <div className="text-[8px] text-white">▼</div>
                  </div>
                )}
              </button>

              {/* Obstacle Type Dropdown Menu */}
              {showObstacleMenu && (
                <div className="absolute bottom-20 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-48 z-30">
                  <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Select Obstacle Type:</div>
                  <div className="grid grid-cols-1 gap-1">
                    {obstacleTypes.map((obstacle) => (
                      <button
                        key={obstacle.id}
                        onClick={() => handleObstacleTypeSelect(obstacle.id)}
                        className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
                          selectedObstacleType === obstacle.id
                            ? 'bg-orange-100 text-orange-800'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg">{obstacle.emoji}</span>
                        <div>
                          <div className="text-sm font-medium">{obstacle.name}</div>
                          <div className="text-xs text-gray-500">{obstacle.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-xs">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <div className="space-y-2 text-sm">
            <div className="text-xs text-gray-600">
              {activeTool === 'obstacle' ? (
                <>
                  🚧 <strong>Obstacle Mode:</strong><br/>
                  Click on roads to place {obstacleTypes.find(t => t.id === selectedObstacleType)?.name || 'obstacles'}.<br/>
                  Click the obstacle button to change type.
                </>
              ) : (
                <>
                  🗺️ <strong>Quick Start:</strong> Import real city roads<br/>
                  <strong>Or build manually:</strong><br/>
                  1. Build roads first using Road tool<br/>
                  2. Add Start & Target points using markers<br/>
                  3. Then try AI Training or Manual Driving
                </>
              )}
            </div>
            <Link to="/car/auto" className="block bg-red-100 hover:bg-red-200 px-3 py-2 rounded transition-colors">
              🤖 Train AI Cars
            </Link>
            <Link to="/car/manual" className="block bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded transition-colors">
              🎮 Drive Manually
            </Link>
          </div>
        </div>
      </div>
      
      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full" />
    </div>
  );
}
