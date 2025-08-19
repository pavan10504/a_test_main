import React, { useState, useEffect, useRef } from 'react';
import { Osm } from './math/osm.js';

export default function OSMImporter({ onImport, onClose }) {
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapMode, setMapMode] = useState('search'); // 'search' or 'select'
  const [selectedBounds, setSelectedBounds] = useState(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [drawingBounds, setDrawingBounds] = useState(false);
  const [boundingBox, setBoundingBox] = useState(null);
  const [pendingCenter, setPendingCenter] = useState(null);

  // Initialize Leaflet map when in select mode
  useEffect(() => {
    if (mapMode === 'select' && mapRef.current && !map) {
      // Dynamically import Leaflet to avoid SSR issues
      import('leaflet').then((L) => {
        // Import Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Ensure the container is properly sized before creating map
        const container = mapRef.current;
        if (!container || container._leaflet_id) {
          console.log('Container already has a map or is invalid');
          return;
        }

        try {
          const mapInstance = L.map(container, {
            zoomControl: true,
            attributionControl: true
          }).setView([40.7128, -74.0060], 10);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(mapInstance);

          setMap(mapInstance);
          
          // Check if there are pending coordinates to center on
          if (pendingCenter) {
            const { lat, lon, name } = pendingCenter;
            mapInstance.setView([lat, lon], 14);
            console.log(`🗺️ Map centered on ${name} at ${lat}, ${lon}`);
            setPendingCenter(null); // Clear pending coordinates
          }
        } catch (error) {
          console.error('Failed to create map:', error);
        }
      });
    }

    return () => {
      if (map) {
        try {
          // Clean up event listeners first
          map.off();
          // Remove the map instance
          map.remove();
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
        setMap(null);
      }
    };
  }, [mapMode]);

  // Handle pending center coordinates when map is ready
  useEffect(() => {
    if (map && pendingCenter) {
      const { lat, lon, name } = pendingCenter;
      try {
        map.setView([lat, lon], 14);
        console.log(`🗺️ Map centered on ${name} at ${lat}, ${lon}`);
        setPendingCenter(null); // Clear pending coordinates
      } catch (error) {
        console.error('Error setting map view:', error);
      }
    }
  }, [map, pendingCenter]);

  // Search for city and center map
  const handleCitySearch = async () => {
    if (!cityName.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use Nominatim to geocode the city
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search for city');
      }
      
      const results = await response.json();
      if (results.length === 0) {
        setError('City not found. Please try a different name.');
        return;
      }

      const result = results[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      // Store coordinates for when map is ready
      setPendingCenter({ lat, lon, name: result.display_name });
      
      // Set map mode to create the map
      setMapMode('select');

      console.log(`📍 Found ${result.display_name} at ${lat}, ${lon}`);
    } catch (err) {
      console.error('City search failed:', err);
      setError('Failed to search for city. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle bounding box drawing
  const startBoundingBox = () => {
    if (!map) return;
    
    setDrawingBounds(true);
    setError('Click and drag to select an area, then double-click to finish.');
    
    // Clear any existing bounding box
    if (boundingBox) {
      try {
        map.removeLayer(boundingBox);
      } catch (error) {
        console.error('Error removing existing bounding box:', error);
      }
      setBoundingBox(null);
      setSelectedBounds(null);
    }

    let isDrawing = false;
    let startLatLng = null;
    let currentRect = null;

    const startDraw = (e) => {
      if (isDrawing) return; // Prevent multiple rectangles
      
      isDrawing = true;
      startLatLng = e.latlng;
      
      // Create initial rectangle
      import('leaflet').then((L) => {
        try {
          currentRect = L.rectangle([startLatLng, startLatLng], {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
          }).addTo(map);
        } catch (error) {
          console.error('Error creating rectangle:', error);
        }
      });
    };

    const updateDraw = (e) => {
      if (!isDrawing || !currentRect) return;
      
      try {
        const bounds = [startLatLng, e.latlng];
        currentRect.setBounds(bounds);
      } catch (error) {
        console.error('Error updating rectangle:', error);
      }
    };

    const endDraw = (e) => {
      if (!isDrawing || !currentRect) return;
      
      isDrawing = false;
      setDrawingBounds(false);
      
      try {
        const bounds = currentRect.getBounds();
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();
        
        // Calculate area size
        const width = Math.abs(east - west) * 111000 * Math.cos((north + south) / 2 * Math.PI / 180); // meters
        const height = Math.abs(north - south) * 111000; // meters
        const areaSqKm = (width * height) / 1000000;
        
        if (areaSqKm > 25) { // 25 km² limit
          setError(`Selected area too large (${areaSqKm.toFixed(1)} km²). Please select a smaller area (max 25 km²).`);
          map.removeLayer(currentRect);
          cleanupEvents();
          return;
        }
        
        if (areaSqKm < 0.01) { // Too small (100m x 100m minimum)
          setError(`Selected area too small (${areaSqKm.toFixed(3)} km²). Please select a larger area (min 0.01 km²).`);
          map.removeLayer(currentRect);
          cleanupEvents();
          return;
        }
        
        setSelectedBounds({ north, south, east, west, areaSqKm });
        setBoundingBox(currentRect);
        setError('');
        
        cleanupEvents();
        
        console.log(`📦 Selected area: ${areaSqKm.toFixed(3)} km² (${width.toFixed(0)}m x ${height.toFixed(0)}m)`);
      } catch (error) {
        console.error('Error processing rectangle bounds:', error);
        cleanupEvents();
      }
    };

    const cleanupEvents = () => {
      try {
        map.off('click', startDraw);
        map.off('mousemove', updateDraw);
        map.off('dblclick', endDraw);
      } catch (error) {
        console.error('Error cleaning up map events:', error);
      }
    };

    // Add event listeners
    try {
      map.on('click', startDraw);
      map.on('mousemove', updateDraw);
      map.on('dblclick', endDraw);
    } catch (error) {
      console.error('Error adding map event listeners:', error);
    }
  };

  // Import selected area
  const handleImportSelected = async () => {
    if (!selectedBounds) {
      setError('Please select an area first');
      return;
    }

    if (selectedBounds.areaSqKm <= 0) {
      setError('Invalid area selected. Please draw a proper bounding box.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { north, south, east, west, areaSqKm } = selectedBounds;
      
      console.log(`🗺️ Importing selected area: ${areaSqKm.toFixed(3)} km²`);
      console.log(`📍 Bounds: N:${north.toFixed(6)}, S:${south.toFixed(6)}, E:${east.toFixed(6)}, W:${west.toFixed(6)}`);
      
      // Validate bounds
      if (north <= south || east <= west) {
        setError('Invalid bounding box coordinates. Please try selecting the area again.');
        return;
      }
      
      // Create Overpass query for bounding box (simplified format)
      const bbox = `${south.toFixed(6)},${west.toFixed(6)},${north.toFixed(6)},${east.toFixed(6)}`;
      const overpassQuery = `[out:json][timeout:30][bbox:${bbox}];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"];
);
(._;>;);
out geom;`;

      console.log('🔍 Overpass query:', overpassQuery);
      console.log('📍 Bbox:', bbox);

      // Try both methods - form data first, then plain text if that fails
      let response;
      try {
        response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`
        });
      } catch (formError) {
        console.log('Form data failed, trying plain text...');
        response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: overpassQuery
        });
      }

      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          console.error('Overpass API error response:', errorText);
          errorMessage += ` - ${errorText}`;
        } catch (e) {
          console.error('Could not read error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`📊 Received ${data.elements.length} OSM elements for selected area`);
      
      if (data.elements.length === 0) {
        setError('No road data found in selected area. Try selecting a different area with more roads.');
        return;
      }

      const roadData = Osm.parseRoads(data);
      
      if (roadData.segments.length === 0) {
        setError('No valid road segments found in selected area. Try selecting an area with main roads.');
        return;
      }

      console.log(`🏙️ Successfully imported ${roadData.segments.length} road segments from ${areaSqKm.toFixed(3)} km² area`);
      onImport(roadData);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setError(`Failed to import selected area: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] mx-4 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">
            {mapMode === 'search' ? 'Import Real City - Search Location' : 'Import Real City - Select Area'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex">
          {mapMode === 'search' ? (
            // Search Mode
            <div className="w-full p-6 flex flex-col justify-center">
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter City or Location
                  </label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Manhattan, London, Paris"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && handleCitySearch()}
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCitySearch}
                  disabled={loading || !cityName.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  {loading ? 'Searching...' : 'Find Location'}
                </button>

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  <strong>How it works:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Search for your desired city or location</li>
                    <li>Select a specific area by drawing a bounding box</li>
                    <li>Import only that area for better performance</li>
                  </ol>
                </div>

                <div className="text-xs text-gray-500">
                  💡 This new approach imports only the area you select, making it much faster and more responsive!
                </div>
              </div>
            </div>
          ) : (
            // Map Selection Mode
            <div className="w-full flex">
              {/* Map Container */}
              <div className="flex-1 relative">
                <div 
                  ref={mapRef} 
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                />
                
                {/* Map Controls Overlay */}
                <div className="absolute top-4 left-4 bg-white p-3 rounded shadow-lg z-10">
                  <div className="space-y-2">
                    <button
                      onClick={startBoundingBox}
                      disabled={drawingBounds || loading}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-semibold py-2 px-3 rounded transition-colors"
                    >
                      {drawingBounds ? 'Drawing...' : 'Draw Selection Box'}
                    </button>
                    
                    {selectedBounds && (
                      <div className="text-xs text-gray-600">
                        Selected: {selectedBounds.areaSqKm.toFixed(3)} km²
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Panel */}
              <div className="w-80 border-l p-6 bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Selection Tools</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Use the map to select a specific area to import. This keeps the data manageable and performance smooth.
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => setMapMode('search')}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-3 rounded transition-colors"
                    >
                      ← Back to Search
                    </button>

                    <button
                      onClick={startBoundingBox}
                      disabled={drawingBounds || loading}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 px-3 rounded transition-colors"
                    >
                      {drawingBounds ? 'Click & Drag on Map...' : 'Select Area'}
                    </button>

                    {selectedBounds && (
                      <button
                        onClick={handleImportSelected}
                        disabled={loading}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-3 rounded transition-colors"
                      >
                        {loading ? 'Importing...' : `Import Selected Area`}
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
                    <strong>Instructions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Click "Select Area" button</li>
                      <li>Click and drag on the map to draw a box</li>
                      <li>Double-click to finish selection</li>
                      <li>Maximum area: 25 km² (5km × 5km)</li>
                    </ul>
                  </div>

                  {selectedBounds && (
                    <div className="text-sm bg-green-50 p-3 rounded">
                      <strong>Selected Area:</strong>
                      <div className="mt-1 text-xs text-gray-600">
                        Size: {selectedBounds.areaSqKm.toFixed(3)} km²<br/>
                        North: {selectedBounds.north.toFixed(6)}°<br/>
                        South: {selectedBounds.south.toFixed(6)}°<br/>
                        East: {selectedBounds.east.toFixed(6)}°<br/>
                        West: {selectedBounds.west.toFixed(6)}°
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              📍 Powered by OpenStreetMap & Leaflet
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
