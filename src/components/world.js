import { Graph } from "./math/graph.js";
import { Point } from "./primitives/point.js";
import { Segment } from "./primitives/segment.js";
import { Envelope } from "./primitives/envelop.js";
import { Polygon } from "./primitives/polygon.js";
import { Building } from "./items/building.js";
import { Tree } from "./items/tree.js";
import { Obstacle } from "./obstacles/obstacleFixed.js";
import { Marking } from "./markings/marking.js";
import { Light } from "./markings/light.js";
import { Start } from "./markings/start.js";
import { Target } from "./markings/target.js";
import { Crossing } from "./markings/crossing.js";
import { Parking } from "./markings/parking.js";
import { Stop } from "./markings/stop.js";
import { Yield } from "./markings/yield.js";
import { add, scale, getNearestPoint, lerp, distance } from "./math/utils.js";

export class World {
   constructor(
      graph = new Graph(),
      roadWidth = 100,
      roadRoundness = 10,
      buildingWidth = 150,
      buildingMinLength = 150,
      spacing = 50,
      treeSize = 160
   ) {
      this.graph = graph;
      this.roadWidth = roadWidth;
      this.roadRoundness = roadRoundness;
      this.buildingWidth = buildingWidth;
      this.buildingMinLength = buildingMinLength;
      this.spacing = spacing;
      this.treeSize = treeSize;
   // Driving side configuration: 'left' (India/UK) or 'right' (US)
   this.drivingSide = 'left';

      this.envelopes = [];
      this.roadBorders = [];
      this.buildings = [];
      this.trees = [];
      this.laneGuides = [];

      this.markings = [];
      this.obstacles = []; // Add obstacles array

      this.cars = [];
      this.bestCar = null;

      this.frameCount = 0;
      this.lastSegmentCount = 0; // Track when graph changes

      if (this.graph.segments.length > 0) {
         this.generate();
      }
   }

   static loadMarking(info) {
      const point = new Point(info.center.x, info.center.y);
      const dir = new Point(info.directionVector.x, info.directionVector.y);
      
      switch (info.type) {
         case "crossing":
            return new Crossing(point, dir, info.width, info.height);
         case "light":
            return new Light(point, dir, info.width, info.height);
         case "marking":
            return new Marking(point, dir, info.width, info.height);
         case "parking":
            return new Parking(point, dir, info.width, info.height);
         case "start":
            return new Start(point, dir, info.width, info.height);
         case "stop":
            return new Stop(point, dir, info.width, info.height);
         case "target":
            return new Target(point, dir, info.width, info.height);
         case "yield":
            return new Yield(point, dir, info.width, info.height);
         default:
            return new Marking(point, dir, info.width, info.height);
      }
   }

   static load(info){
      const world = new World(new Graph());
      
      // Load graph with fallback
      world.graph = info.graph ? Graph.load(info.graph) : new Graph();
      
      // Load world properties with defaults
      world.roadWidth = info.roadWidth || 100;
      world.roadRoundness = info.roadRoundness || 10;
      world.buildingWidth = info.buildingWidth || 150;
      world.buildingMinLength = info.buildingMinLength || 150;
      world.spacing = info.spacing || 50;
      world.treeSize = info.treeSize || 160;
   // Load driving side preference (default to left-hand traffic)
   world.drivingSide = info.drivingSide || 'left';
      
      // Check if this is an optimized save that needs regeneration
      if (info.isOptimized) {
         console.log(`🔄 Loading optimized world - will regenerate buildings, trees, etc.`);
         // Load only basic data, let generate() rebuild the rest
         world.envelopes = [];
         world.roadBorders = [];
         world.buildings = [];
         world.trees = [];
         world.laneGuides = [];
      } else {
         // Load arrays with null checks and defaults
         world.envelopes = info.envelopes ? info.envelopes.map((e) => Envelope.load(e)) : [];
         world.roadBorders = info.roadBorders ? info.roadBorders.map((b) => new Segment(b.p1, b.p2)) : [];
         world.buildings = info.buildings ? info.buildings.map((e) => Building.load(e)) : [];
         world.trees = info.trees ? info.trees.map((t) => new Tree(t.center, info.treeSize || 160)) : [];
         world.laneGuides = info.laneGuides ? info.laneGuides.map((g) => new Segment(g.p1, g.p2)) : [];
      }
      
      world.markings = info.markings ? info.markings.map((m) => World.loadMarking(m)) : [];
      world.obstacles = info.obstacles ? info.obstacles.map((o) => Obstacle.load(o)) : []; // Add obstacles loading
      
      // Load optional properties
      world.zoom = info.zoom || 1;
      world.offset = info.offset || null;
      
      // Force regeneration if optimized
      if (info.isOptimized && world.graph.segments.length > 0) {
         console.log(`🔄 Regenerating world elements for optimized save...`);
         world.generate();
      }
      
      return world;
   }

   generate() {
      // Only regenerate if the graph has changed
      const currentSegmentCount = this.graph.segments.length;
      if (currentSegmentCount === this.lastSegmentCount && this.envelopes.length > 0) {
         return;
      }
      this.lastSegmentCount = currentSegmentCount;

      // Envelopes
      this.envelopes.length = 0;
      const segs = this.graph.segments;
      for (let i = 0; i < segs.length; i++) {
         this.envelopes.push(
            new Envelope(segs[i], this.roadWidth, this.roadRoundness)
         );
         if (i % 500 === 0 && segs.length > 1000) {
            console.log(`Progress: Envelopes ${i}/${segs.length}`);
         }
      }
      console.log(`✅ Envelopes generated: ${this.envelopes.length}`);

      // Road borders - chunked processing for large datasets
      console.log(`🔄 Generating road borders from ${this.envelopes.length} envelopes...`);
      if (this.envelopes.length > 2000) {
         // For large datasets, process in chunks to prevent blocking
         console.log(`⚡ Large envelope count detected - using chunked road border generation`);
         const chunkSize = 500;
         const allPolygons = [];
         
         for (let i = 0; i < this.envelopes.length; i += chunkSize) {
            const chunk = this.envelopes.slice(i, i + chunkSize);
            const chunkPolygons = chunk.map((e) => e.poly);
            allPolygons.push(...chunkPolygons);
            console.log(`Progress: Road border chunks ${Math.min(i + chunkSize, this.envelopes.length)}/${this.envelopes.length}`);
         }
         
         // Simplified union - just use the polygons directly for very large datasets
         console.log(`🔄 Simplifying road borders for performance...`);
         this.roadBorders = [];
         for (let i = 0; i < allPolygons.length; i++) {
            const poly = allPolygons[i];
            if (poly && poly.segments) {
               this.roadBorders.push(...poly.segments);
            }
            if (i % 1000 === 0) {
               console.log(`Progress: Road border segments ${i}/${allPolygons.length}`);
            }
         }
      } else {
         this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));
      }
      console.log(`✅ Road borders generated: ${this.roadBorders.length}`);

      // Buildings
      console.log(`🔄 Generating buildings...`);
      this.buildings = this.#generateBuildings();
      console.log(`✅ Buildings generated: ${this.buildings.length}`);

      // Trees
      this.trees = this.#generateTrees();
      if (this.trees.length > 1000) {
         for (let i = 0; i < this.trees.length; i += 500) {
            console.log(`Progress: Trees ${i}/${this.trees.length}`);
         }
      }
      console.log(`✅ Trees generated: ${this.trees.length}`);

      // Lane guides
      console.log(`🔄 Generating lane guides...`);
      this.laneGuides.length = 0;
      
      if (this.graph.segments.length > 2000) {
         console.log(`⚡ Large segment count - using simplified lane guides`);
         // For very large datasets, skip lane guides to prevent performance issues
         console.log(`✅ Lane guides skipped for performance: 0`);
         return;
      }
      
      const guides = this.#generateLaneGuides();
      for (let i = 0; i < guides.length; i++) {
         this.laneGuides.push(guides[i]);
         if (i % 500 === 0 && guides.length > 1000) {
            console.log(`Progress: Lane guides ${i}/${guides.length}`);
         }
      }
      console.log(`✅ Lane guides generated: ${this.laneGuides.length}`);
   }

   #generateLaneGuides() {
      const tmpEnvelopes = [];
      for (const seg of this.graph.segments) {
         tmpEnvelopes.push(
            new Envelope(seg, this.roadWidth / 2, this.roadRoundness)
         );
      }
      const segments = Polygon.union(tmpEnvelopes.map((e) => e.poly));
      return segments;
   }

   #generateTrees() {
      console.log(`🔄 Generating trees...`);
      // Ensure buildings is always an array
      const buildings = this.buildings || [];
      
      // For very large datasets, limit tree generation to prevent performance issues
      if (buildings.length > 2000) {
         console.log(`⚡ Large building count (${buildings.length}) - using simplified tree generation`);
         return this.#generateTreesSimplified(buildings);
      }
      
      const points = [
         ...this.roadBorders.map((s) => [s.p1, s.p2]).flat(),
         ...buildings.map((b) => b.base.points).flat()
      ];
      
      // Handle case where there are no points yet
      if (points.length === 0) {
         return [];
      }
      
      // Safe min/max finding without spread operator
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const p of points) {
         if (p.x < left) left = p.x;
         if (p.x > right) right = p.x;
         if (p.y < top) top = p.y;
         if (p.y > bottom) bottom = p.y;
      }

      const illegalPolys = [
         ...buildings.map((b) => b.base),
         ...this.envelopes.map((e) => e.poly)
      ];

      const trees = [];
      let tryCount = 0;
      let consecutiveFailures = 0;
      
      // Significantly increased attempts for better coverage
      while (tryCount < 2000 && consecutiveFailures < 300) {
         const p = new Point(
            lerp(left, right, Math.random()),
            lerp(top, bottom, Math.random())
         );

         // More lenient tree placement rules
         let keep = true;
         for (const poly of illegalPolys) {
            if (
               poly.containsPoint(p) ||
               poly.distanceToPoint(p) < this.treeSize / 3 // Much closer to roads/buildings
            ) {
               keep = false;
               break;
            }
         }

         // Much closer tree spacing allowed
         if (keep) {
            for (const tree of trees) {
               if (distance(tree.center, p) < this.treeSize * 0.6) { // Closer tree spacing
                  keep = false;
                  break;
               }
            }
         }

         // Very lenient "close to something" check
         if (keep) {
            let closeToSomething = false;
            for (const poly of illegalPolys) {
               if (poly.distanceToPoint(p) < this.treeSize * 2) { // Larger search radius
                  closeToSomething = true;
                  break;
               }
            }
            
            if (closeToSomething || trees.length < 10) { // Always allow first 10 trees
               trees.push(new Tree(p, this.treeSize));
               consecutiveFailures = 0;
            } else {
               consecutiveFailures++;
            }
         } else {
            consecutiveFailures++;
         }

         tryCount++;
      }

      return trees;
   }

   #generateTreesSimplified(buildings) {
      console.log(`🔄 Using simplified tree generation for ${buildings.length} buildings...`);
      
      // Use a much simpler approach for large datasets
      const trees = [];
      const maxTrees = Math.min(500, Math.floor(buildings.length / 10)); // Limit trees
      
      // Get bounds from road borders only (much smaller dataset)
      if (this.roadBorders.length === 0) {
         console.log(`⚠️ No road borders for tree bounds, skipping trees`);
         return [];
      }
      
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const seg of this.roadBorders.slice(0, 100)) { // Only check first 100 segments
         const points = [seg.p1, seg.p2];
         for (const p of points) {
            if (p.x < left) left = p.x;
            if (p.x > right) right = p.x;
            if (p.y < top) top = p.y;
            if (p.y > bottom) bottom = p.y;
         }
      }
      
      // Limit area size to prevent massive grids
      const maxArea = 50000; // Maximum area dimension
      const width = Math.min(right - left, maxArea);
      const height = Math.min(bottom - top, maxArea);
      
      // Adjust bounds to limited area
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      left = centerX - width / 2;
      right = centerX + width / 2;
      top = centerY - height / 2;
      bottom = centerY + height / 2;
      
      // Simple grid-based tree placement with reasonable grid size
      const gridSize = this.treeSize * 4; // Larger spacing
      const cols = Math.min(50, Math.ceil(width / gridSize)); // Max 50 columns
      const rows = Math.min(50, Math.ceil(height / gridSize)); // Max 50 rows
      
      console.log(`🔄 Placing trees in ${cols}x${rows} grid (area: ${width.toFixed(0)}x${height.toFixed(0)})...`);
      
      for (let i = 0; i < cols && trees.length < maxTrees; i++) {
         for (let j = 0; j < rows && trees.length < maxTrees; j++) {
            if (Math.random() > 0.3) continue; // Only 30% chance per grid cell
            
            const x = left + (i + Math.random()) * gridSize;
            const y = top + (j + Math.random()) * gridSize;
            const p = new Point(x, y);
            
            // Very basic collision check with sample of buildings
            let tooClose = false;
            const sampleSize = Math.min(50, buildings.length); // Check only 50 buildings
            for (let k = 0; k < sampleSize; k++) {
               const building = buildings[Math.floor(Math.random() * buildings.length)];
               if (building.base.distanceToPoint(p) < this.treeSize) {
                  tooClose = true;
                  break;
               }
            }
            
            if (!tooClose) {
               trees.push(new Tree(p, this.treeSize));
            }
         }
         
         if (i % 10 === 0) {
            console.log(`Progress: Tree grid ${i}/${cols} (${trees.length} trees)`);
         }
      }
      
      console.log(`🔄 Simplified tree generation complete: ${trees.length} trees`);
      return trees;
   }

   #generateBuildings() {
      console.log(`🔄 Creating building envelopes...`);
      const tmpEnvelopes = [];
      for (const seg of this.graph.segments) {
         tmpEnvelopes.push(
            new Envelope(
               seg,
               this.roadWidth + this.buildingWidth + this.spacing * 4,
               this.roadRoundness
            )
         );
      }
      console.log(`🔄 Creating building guides from ${tmpEnvelopes.length} envelopes...`);

      let guides;
      if (tmpEnvelopes.length > 2000) {
         console.log(`⚡ Large building envelope count - skipping expensive union operation`);
         // For very large datasets, skip the union and use segments directly
         guides = [];
         for (let i = 0; i < tmpEnvelopes.length; i++) {
            if (tmpEnvelopes[i].poly && tmpEnvelopes[i].poly.segments) {
               guides.push(...tmpEnvelopes[i].poly.segments);
            }
            if (i % 500 === 0) {
               console.log(`Progress: Processing building envelopes ${i}/${tmpEnvelopes.length}`);
            }
         }
         console.log(`🔄 Created ${guides.length} building guide segments directly`);
      } else {
         guides = Polygon.union(tmpEnvelopes.map((e) => e.poly));
      }
      console.log(`🔄 Processing ${guides.length} building guides...`);

      // Remove segments that are too short
      console.log(`🔄 Filtering short building segments...`);
      for (let i = 0; i < guides.length; i++) {
         const seg = guides[i];
         if (seg.length() < this.buildingMinLength) {
            guides.splice(i, 1);
            i--;
         }
         if (i % 500 === 0 && guides.length > 1000) {
            console.log(`Progress: Filtering segments ${i}/${guides.length}`);
         }
      }
      console.log(`🔄 ${guides.length} building segments after filtering...`);

      console.log(`🔄 Creating building supports...`);
      const supports = [];
      for (let segIndex = 0; segIndex < guides.length; segIndex++) {
         let seg = guides[segIndex];
         const len = seg.length();
         
         // Progress logging for large datasets
         if (segIndex % 200 === 0 && guides.length > 500) {
            console.log(`Progress: Building supports ${segIndex}/${guides.length}`);
         }
         
         // More lenient check - allow buildings if segment can fit at least one building
         if (len < this.buildingMinLength) {
            continue;
         }
         
         const buildingCount = Math.max(1, Math.floor(
            len / (this.buildingMinLength + this.spacing)
         ));
         
         const totalSpacing = (buildingCount - 1) * this.spacing;
         const availableLength = len - totalSpacing;
         const buildingLength = availableLength / buildingCount;
         
         // Only require minimum length if we can fit it reasonably
         if (buildingLength < this.buildingMinLength * 0.8) {
            // Try with fewer buildings
            const reducedCount = Math.max(1, buildingCount - 1);
            const reducedTotalSpacing = (reducedCount - 1) * this.spacing;
            const reducedAvailableLength = len - reducedTotalSpacing;
            const reducedBuildingLength = reducedAvailableLength / reducedCount;
            
            if (reducedBuildingLength < this.buildingMinLength * 0.8) {
               continue;
            }
            
            // Use reduced values
            const finalBuildingCount = reducedCount;
            const finalBuildingLength = reducedBuildingLength;
            
            const dir = seg.directionVector();
            let q1 = seg.p1;
            let q2 = add(q1, scale(dir, finalBuildingLength));
            supports.push(new Segment(q1, q2));

            for (let i = 2; i <= finalBuildingCount; i++) {
               q1 = add(q2, scale(dir, this.spacing));
               q2 = add(q1, scale(dir, finalBuildingLength));
               supports.push(new Segment(q1, q2));
            }
         } else {
            // Use original values
            const dir = seg.directionVector();
            let q1 = seg.p1;
            let q2 = add(q1, scale(dir, buildingLength));
            supports.push(new Segment(q1, q2));

            for (let i = 2; i <= buildingCount; i++) {
               q1 = add(q2, scale(dir, this.spacing));
               q2 = add(q1, scale(dir, buildingLength));
               supports.push(new Segment(q1, q2));
            }
         }
      }
      console.log(`🔄 Created ${supports.length} building supports...`);

      console.log(`🔄 Creating building bases...`);
      const bases = [];
      for (let i = 0; i < supports.length; i++) {
         bases.push(new Envelope(supports[i], this.buildingWidth).poly);
         if (i % 200 === 0 && supports.length > 500) {
            console.log(`Progress: Building bases ${i}/${supports.length}`);
         }
      }
      console.log(`🔄 Removing intersecting buildings...`);

      const eps = 0.001;
      for (let i = 0; i < bases.length - 1; i++) {
         if (i % 100 === 0 && bases.length > 500) {
            console.log(`Progress: Intersection check ${i}/${bases.length}`);
         }
         for (let j = i + 1; j < bases.length; j++) {
            if (
               bases[i].intersectsPoly(bases[j]) ||
               bases[i].distanceToPoly(bases[j]) < this.spacing - eps
            ) {
               bases.splice(j, 1);
               j--;
            }
         }
      }

      console.log(`🔄 Converting ${bases.length} bases to buildings...`);
      return bases.map((b) => new Building(b));
   }

   #getIntersections() {
      const subset = [];
      for (const point of this.graph.points) {
         let degree = 0;
         for (const seg of this.graph.segments) {
            if (seg.includes(point)) {
               degree++;
            }
         }

         if (degree > 2) {
            subset.push(point);
         }
      }
      return subset;
   }

   #updateLights() {
      const lights = this.markings.filter((m) => m instanceof Light);
      const controlCenters = [];
      for (const light of lights) {
         const point = getNearestPoint(light.center, this.#getIntersections());
         let controlCenter = controlCenters.find((c) => c.equals(point));
         if (!controlCenter) {
            controlCenter = new Point(point.x, point.y);
            controlCenter.lights = [light];
            controlCenters.push(controlCenter);
         } else {
            controlCenter.lights.push(light);
         }
      }
      const greenDuration = 2,
         yellowDuration = 1;
      for (const center of controlCenters) {
         center.ticks = center.lights.length * (greenDuration + yellowDuration);
      }
      const tick = Math.floor(this.frameCount / 60);
      for (const center of controlCenters) {
         const cTick = tick % center.ticks;
         const greenYellowIndex = Math.floor(
            cTick / (greenDuration + yellowDuration)
         );
         const greenYellowState =
            cTick % (greenDuration + yellowDuration) < greenDuration
               ? "green"
               : "yellow";
         for (let i = 0; i < center.lights.length; i++) {
            if (i == greenYellowIndex) {
               center.lights[i].state = greenYellowState;
            } else {
               center.lights[i].state = "red";
            }
         }
      }
      this.frameCount++;
   }

   draw(ctx, viewPoint, showStartMarkings = true, renderRadius = 1000) {
      this.#updateLights();

      for (const env of this.envelopes) {
         env.draw(ctx, { fill: "#BBB", stroke: "#BBB", lineWidth: 15 });
      }
      for (const marking of this.markings) {
         if (!(marking instanceof Start) || showStartMarkings) {
            marking.draw(ctx);
         }
      }
      for (const seg of this.graph.segments) {
         seg.draw(ctx, { color: "white", width: 4, dash: [10, 10] });
      }
      for (const seg of this.roadBorders) {
         seg.draw(ctx, { color: "white", width: 4 });
      }

      // Draw start and end points for training
      if (this.graph.points.length > 0) {
         // Start point (first point added)
         const startPoint = this.graph.points[0];
         ctx.save();
         ctx.fillStyle = "green";
         ctx.beginPath();
         ctx.arc(startPoint.x, startPoint.y, 15, 0, 2 * Math.PI);
         ctx.fill();
         ctx.fillStyle = "white";
         ctx.font = "12px Arial";
         ctx.textAlign = "center";
         ctx.fillText("START", startPoint.x, startPoint.y + 4);
         ctx.restore();

         // End point (last point added)
         if (this.graph.points.length > 1) {
            const endPoint = this.graph.points[this.graph.points.length - 1];
            ctx.save();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(endPoint.x, endPoint.y, 15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("END", endPoint.x, endPoint.y + 4);
            ctx.restore();
         }
      }

      ctx.globalAlpha = 0.2;
      for (const car of this.cars) {
         car.draw(ctx);
      }
      ctx.globalAlpha = 1;
      if(this.bestCar) {
         this.bestCar.draw(ctx, true);
      }

      const items = [...this.buildings, ...this.trees].filter(
         (i) => i.base.distanceToPoint(viewPoint) < renderRadius
      );
      items.sort(
         (a, b) =>
            b.base.distanceToPoint(viewPoint) -
            a.base.distanceToPoint(viewPoint)
      );
      for (const item of items) {
         item.draw(ctx, viewPoint);
      }

      // Draw obstacles
      for (const obstacle of this.obstacles) {
         obstacle.draw(ctx, viewPoint);
      }
   }

   static loadFromLocalStorage() {
      const saved = localStorage.getItem("virtualWorld");
      if (saved) {
         try {
            const info = JSON.parse(saved);
            // Validate that we have at least basic structure
            if (info && typeof info === 'object') {
               return World.load(info);
            } else {
               console.warn("Invalid world data structure in localStorage");
               return new World();
            }
         } catch (error) {
            console.warn("Failed to load world from localStorage:", error);
            // Clear corrupted data
            localStorage.removeItem("virtualWorld");
            return new World();
         }
      }
      return new World();
   }

   // Check if a point or car is on the road surface
   isOnRoad(point) {
      for (const envelope of this.envelopes) {
         if (envelope.poly && this.#pointInPolygon(point, envelope.poly.points)) {
            return true;
         }
      }
      return false;
   }

   // Check if car is within road boundaries (used for damage assessment)
   isCarOnRoad(car) {
      // Check if car center is on road
      const carCenter = { x: car.x, y: car.y };
      return this.isOnRoad(carCenter);
   }

   // Helper method to check if a point is inside a polygon
   #pointInPolygon(point, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
         if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
             (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
            inside = !inside;
         }
      }
      return inside;
   }

   // Get all collision objects for cars (road borders + buildings + trees)
   getCollisionObjects() {
      const obstacles = [...this.roadBorders];
      
      // Add building bases as collision objects (add individual segments)
      this.buildings.forEach(building => {
         if (building.base && building.base.segments) {
            obstacles.push(...building.base.segments);
         }
      });
      
      // Add tree bases as collision objects (add individual segments)
      this.trees.forEach(tree => {
         if (tree.base && tree.base.segments) {
            obstacles.push(...tree.base.segments);
         }
      });
      
      return obstacles;
   }

   save() {
      localStorage.setItem("world", JSON.stringify(this));
   }

   dispose() {
      this.cars.length = 0;
      this.bestCar = null;
   }
}