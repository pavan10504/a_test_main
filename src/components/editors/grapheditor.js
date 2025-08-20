import { getNearestPoint } from "../math/utils.js";
import { distance } from "../math/utils.js";
import { Segment } from "../primitives/segment.js";
import { Start } from "../markings/start.js";
import { Target } from "../markings/target.js";

export class GraphEditor {
   constructor(viewport, graph, world) {
      this.viewport = viewport;
      this.canvas = viewport.canvas;
      this.graph = graph;
      this.world = world;

      this.ctx = this.canvas.getContext("2d");

      this.selected = null;
      this.hovered = null;
      this.dragging = false;
      this.mouse = null;
   }

   enable() {
      this.#addEventListeners();
   }

   disable() {
      this.#removeEventListeners();
      this.selected = null;
      this.hovered = null;
   }

   #addEventListeners() {
      this.boundMouseDown = this.#handleMouseDown.bind(this);
      this.boundMouseMove = this.#handleMouseMove.bind(this);
      this.boundMouseUp = () => this.dragging = false;
      this.boundContextMenu = (evt) => evt.preventDefault();
      this.boundKeyDown = this.#handleKeyDown.bind(this);
      
      this.canvas.addEventListener("mousedown", this.boundMouseDown);
      this.canvas.addEventListener("mousemove", this.boundMouseMove);
      this.canvas.addEventListener("mouseup", this.boundMouseUp);
      this.canvas.addEventListener("contextmenu", this.boundContextMenu);
      document.addEventListener("keydown", this.boundKeyDown);
   }

   #removeEventListeners() {
      this.canvas.removeEventListener("mousedown", this.boundMouseDown);
      this.canvas.removeEventListener("mousemove", this.boundMouseMove);
      this.canvas.removeEventListener("mouseup", this.boundMouseUp);
      this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
      document.removeEventListener("keydown", this.boundKeyDown);
   }

   #handleMouseMove(evt) {
      this.mouse = this.viewport.getMouse(evt, true);
      this.hovered = getNearestPoint(this.mouse, this.graph.points, 10 * this.viewport.zoom);
      if (this.dragging == true) {
         this.selected.x = this.mouse.x;
         this.selected.y = this.mouse.y;
      }
   }

   #handleMouseDown(evt) {
      if (evt.button == 2) { // right click
         // Only handle right click if not actively dragging the viewport
         if (!this.viewport.drag.active) {
            if (this.selected) {
               this.selected = null;
            } else if (this.hovered) {
               this.#removePoint(this.hovered);
            }
         }
      }
      if (evt.button == 0) { // left click
         if (this.hovered) {
            this.#select(this.hovered);
            this.dragging = true;
            return;
         }
         this.graph.addPoint(this.mouse);
         this.#select(this.mouse);
         this.hovered = this.mouse;
      }
   }

   #select(point) {
      if (this.selected) {
         this.graph.tryAddSegment(new Segment(this.selected, point));
      }
      this.selected = point;
   }

   #removePoint(point) {
      this.graph.removePoint(point);
      this.hovered = null;
      if (this.selected == point) {
         this.selected = null;
      }
   }

   #handleKeyDown(evt) {
      if (this.hovered) {
         const point = this.hovered;
         const directionVector = { x: 0, y: -1 }; // Default direction
         
         if (evt.key === 's' || evt.key === 'S') {
            // Place start marking
            this.world.markings = this.world.markings.filter(m => !(m instanceof Start));
            this.world.markings.push(new Start(point, directionVector, 20, 20));
         } else if (evt.key === 't' || evt.key === 'T') {
            // Place target marking  
            this.world.markings = this.world.markings.filter(m => !(m instanceof Target));
            this.world.markings.push(new Target(point, directionVector, 20, 20));
         }
      }
   }

   // Helper function to format distance
   #formatDistance(dist) {
      if (dist < 10) {
         return `${dist.toFixed(1)}m`;
      } else if (dist < 1000) {
         return `${Math.round(dist)}m`;
      } else {
         return `${(dist / 1000).toFixed(2)}km`;
      }
   }

   // Helper function to draw distance label
   #drawDistanceLabel(ctx, start, end, dist) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
      // Calculate angle of the line to orient the text properly
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const isFlipped = Math.abs(angle) > Math.PI / 2;
      
      ctx.save();
      
      // Move to the midpoint
      ctx.translate(midX, midY);
      
      // Rotate for better readability
      if (isFlipped) {
         ctx.rotate(angle + Math.PI);
      } else {
         ctx.rotate(angle);
      }
      
      // Style the text with proper zoom scaling
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      
      // Scale stroke width with zoom for better visibility
      ctx.lineWidth = 3 / this.viewport.zoom;
      
      // Calculate font size that stays readable at all zoom levels
      // Since we're drawing in world coordinates, we need to scale inversely with zoom
      const baseFontSize = 12;
      const fontSize = baseFontSize * this.viewport.zoom;
      ctx.font = `bold ${fontSize}px Arial`;
      
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      
      const text = this.#formatDistance(dist);
      
      // Scale the text offset with zoom
      const textOffset = -8 / this.viewport.zoom;
      
      // Draw background stroke for better visibility
      ctx.strokeText(text, 0, textOffset);
      ctx.fillText(text, 0, textOffset);
      
      ctx.restore();
   }

   dispose() {
      this.graph.dispose();
      this.selected = null;
      this.hovered = null;
   }

   display() {
      this.graph.draw(this.ctx);
      if (this.hovered) {
         this.hovered.draw(this.ctx, { fill: true });
      }
      if (this.selected) {
         const intent = this.hovered ? this.hovered : this.mouse;
         const segment = new Segment(this.selected, intent);
         segment.draw(this.ctx, { dash: [3, 3] });
         
         // Calculate and display distance while drawing
         const dist = distance(this.selected, intent);
         this.#drawDistanceLabel(this.ctx, this.selected, intent, dist);
         
         this.selected.draw(this.ctx, { outline: true });
      }
   }
}
