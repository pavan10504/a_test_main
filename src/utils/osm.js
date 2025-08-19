import { Point } from '../components/primitives/point.js';
import { Segment } from '../components/primitives/segment.js';

const OSM = {
  parseRoads: async (data) => {
    console.log('🗺️ Parsing OSM data...');
    
    const nodes = data.elements.filter((n) => n.type === "node");
    const ways = data.elements.filter((w) => w.type === "way");
    
    console.log(`📊 Found ${nodes.length} nodes and ${ways.length} ways`);
    
    if (nodes.length === 0) {
      console.warn('No nodes found in OSM data');
      return { points: [], segments: [] };
    }

    // Handle very large datasets by limiting size
    if (nodes.length > 60000) {
      console.log('⚡ Large dataset detected - sampling for performance');
      return await OSM.parseRoadsOptimized(data);
    }

    // Process coordinates safely without spread operator
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (let i = 0; i < nodes.length; i++) {
      const lat = nodes[i].lat;
      const lon = nodes[i].lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    const deltaLat = maxLat - minLat;
    const deltaLon = maxLon - minLon;
    const ar = deltaLon / deltaLat;
    
    // Scale factor - adjust as needed
    const height = deltaLat * 111000 * 5; // Reduced from 10 for better viewport
    const width = height * ar * Math.cos(degToRad(maxLat));

    console.log(`🌍 OSM area: ${width.toFixed(0)}m x ${height.toFixed(0)}m`);

    const points = [];
    const nodeMap = new Map();
    
    // Convert nodes to points
    for (const node of nodes) {
      const y = invLerp(maxLat, minLat, node.lat) * height;
      const x = invLerp(minLon, maxLon, node.lon) * width;
      const point = new Point(x, y);
      point.id = node.id;
      points.push(point);
      nodeMap.set(node.id, point);
    }

    // Process ways with chunked processing
    return await OSM.processWaysInChunks(ways, nodeMap, points);
  },

  // Optimized parsing for very large datasets
  parseRoadsOptimized: async (data) => {
    console.log('⚡ Using optimized parsing for large dataset...');
    
    const nodes = data.elements.filter((n) => n.type === "node");
    const ways = data.elements.filter((w) => w.type === "way");
    
    // Sample down the data to prevent overwhelming the browser
    const maxNodes = 40000; // Limit to 40k nodes for performance
    const maxWays = 15000;  // Limit to 15k ways for performance
    
    let sampledNodes = nodes;
    let sampledWays = ways;
    
    if (nodes.length > maxNodes) {
      console.log(`📉 Sampling nodes from ${nodes.length} to ${maxNodes} for performance`);
      // Take every nth node to get a representative sample
      const step = Math.ceil(nodes.length / maxNodes);
      sampledNodes = [];
      for (let i = 0; i < nodes.length; i += step) {
        sampledNodes.push(nodes[i]);
      }
    }
    
    if (ways.length > maxWays) {
      console.log(`📉 Sampling ways from ${ways.length} to ${maxWays} for performance`);
      // Prioritize major roads
      const majorWays = [];
      const minorWays = [];
      
      for (const way of ways) {
        const highway = way.tags?.highway;
        if (highway && ['motorway', 'trunk', 'primary', 'secondary'].includes(highway)) {
          majorWays.push(way);
        } else if (highway) {
          minorWays.push(way);
        }
      }
      
      // Take all major roads + sample of minor roads
      const minorLimit = Math.max(0, maxWays - majorWays.length);
      const minorStep = Math.ceil(minorWays.length / minorLimit);
      const sampledMinorWays = [];
      for (let i = 0; i < minorWays.length && sampledMinorWays.length < minorLimit; i += minorStep) {
        sampledMinorWays.push(minorWays[i]);
      }
      
      sampledWays = [...majorWays, ...sampledMinorWays];
    }
    
    console.log(`🎯 Processing ${sampledNodes.length} nodes and ${sampledWays.length} ways`);
    
    // Use the sampled data with regular parsing logic
    const sampledData = {
      elements: [...sampledNodes, ...sampledWays]
    };
    
    // Call the main parsing logic with reduced dataset
    return await OSM.parseRoadsRegular(sampledData);
  },

  // Regular parsing without the optimization check
  parseRoadsRegular: (data) => {
    const nodes = data.elements.filter((n) => n.type === "node");
    const ways = data.elements.filter((w) => w.type === "way");
    
    if (nodes.length === 0) {
      return { points: [], segments: [] };
    }

    // Process coordinates safely
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    for (let i = 0; i < nodes.length; i++) {
      const lat = nodes[i].lat;
      const lon = nodes[i].lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    const deltaLat = maxLat - minLat;
    const deltaLon = maxLon - minLon;
    const ar = deltaLon / deltaLat;
    
    const height = deltaLat * 111000 * 5;
    const width = height * ar * Math.cos(degToRad(maxLat));

    console.log(`🌍 OSM area: ${width.toFixed(0)}m x ${height.toFixed(0)}m`);

    const points = [];
    const nodeMap = new Map();
    
    // Convert nodes to points
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const y = invLerp(maxLat, minLat, node.lat) * height;
      const x = invLerp(minLon, maxLon, node.lon) * width;
      const point = new Point(x, y);
      point.id = node.id;
      points.push(point);
      nodeMap.set(node.id, point);
    }

    // Process ways in chunks to prevent UI blocking
    return OSM.processWaysInChunks(ways, nodeMap, points);
  },

  // Process ways in chunks to keep UI responsive
  processWaysInChunks: async (ways, nodeMap, points) => {
    const segments = [];
    const chunkSize = 100; // Process 100 ways at a time
    
    for (let startIdx = 0; startIdx < ways.length; startIdx += chunkSize) {
      const chunk = ways.slice(startIdx, startIdx + chunkSize);
      
      // Process this chunk
      for (const way of chunk) {
        if (!way.nodes || way.nodes.length < 2) continue;
        
        const tags = way.tags || {};
        const highway = tags.highway;
        
        if (!highway) continue;
        
        const isRoad = !['footway', 'cycleway', 'path', 'steps', 'bridleway', 'corridor'].includes(highway) &&
                      !highway.includes('footway') && 
                      !highway.includes('cycleway') &&
                      !highway.includes('path');
        
        if (!isRoad) continue;

        for (let i = 0; i < way.nodes.length - 1; i++) {
          const startNode = nodeMap.get(way.nodes[i]);
          const endNode = nodeMap.get(way.nodes[i + 1]);
          
          if (startNode && endNode) {
            segments.push(new Segment(startNode, endNode));
          }
        }
      }
      
      // Log progress and yield control back to browser
      if (startIdx % (chunkSize * 10) === 0) {
        console.log(`🛣️ Processed ${startIdx}/${ways.length} ways (${segments.length} segments so far...)`);
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    console.log(`✅ Created ${points.length} points and ${segments.length} segments`);
    return { points, segments };
  },

  // Fetch OSM data for a city
  fetchCityData: async (cityName, countryCode = '') => {
    const query = countryCode ? `${cityName}, ${countryCode}` : cityName;
    
    console.log(`🔍 Fetching OSM data for: ${query}`);
    
    // More flexible query that searches for the city area and gets roads within it
    const overpassQuery = `
      [out:json][timeout:30];
      (
        // Try to find city boundary (relation or node)
        relation["name"~"${cityName}",i]["place"~"city|town"];
        node["name"~"${cityName}",i]["place"~"city|town"];
      )->.city;
      
      (
        // Get roads within the city area
        way(area.city)["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"];
        // Also get roads around the city center (backup approach)
        way(around.city:5000)["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"];
      );
      (._;>;);
      out geom;
    `;

    // Fallback query if the first one doesn't work
    const fallbackQuery = `
      [out:json][timeout:30];
      [bbox];
      (
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"]["name"~"${cityName}",i];
        way(around:2000)["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"];
      );
      (._;>;);
      out geom;
    `;

    try {
      console.log('🔄 Trying primary query...');
      let response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data = await response.json();
      console.log(`📊 Primary query received ${data.elements.length} OSM elements`);
      
      // If no data, try fallback approach with geocoding
      if (data.elements.length === 0) {
        console.log('🔄 Trying fallback with geocoding...');
        const geocoded = await OSM.geocodeCity(cityName, countryCode);
        if (geocoded) {
          data = await OSM.fetchAreaData(geocoded.lat, geocoded.lon, geocoded.name);
        }
      }
      
      if (data.elements.length === 0) {
        throw new Error(`No road data found for ${cityName}. Try a different city name or add a country code.`);
      }
      
      return await OSM.parseRoads(data);
    } catch (error) {
      console.error('❌ Failed to fetch OSM data:', error);
      throw error;
    }
  },

  // Geocode city name to get coordinates
  geocodeCity: async (cityName, countryCode = '') => {
    const query = countryCode ? `${cityName}, ${countryCode}` : cityName;
    
    try {
      console.log(`🌐 Geocoding ${query}...`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const results = await response.json();
      if (results.length === 0) {
        throw new Error(`City not found: ${query}`);
      }
      
      const result = results[0];
      console.log(`📍 Found ${result.display_name} at ${result.lat}, ${result.lon}`);
      
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        name: result.display_name
      };
    } catch (error) {
      console.error('❌ Geocoding failed:', error);
      return null;
    }
  },

  // Fetch road data around specific coordinates
  fetchAreaData: async (lat, lon, cityName) => {
    console.log(`🗺️ Fetching roads around ${lat}, ${lon}...`);
    
    const overpassQuery = `
      [out:json][timeout:30];
      (
        way(around:8000,${lat},${lon})["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service)$"];
      );
      (._;>;);
      out geom;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Area query received ${data.elements.length} OSM elements`);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch area data:', error);
      throw error;
    }
  }
};

// Helper functions
function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function invLerp(a, b, t) {
  return (t - a) / (b - a);
}

export default OSM;
