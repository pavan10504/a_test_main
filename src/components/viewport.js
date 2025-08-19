import { Point } from "./primitives/point.js";
import { scale, add, subtract } from "./math/utils.js";

export class Viewport {
   constructor(canvas, zoom = 1, offset = null) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.zoom = zoom;
      this.center = new Point(canvas.width / 2, canvas.height / 2);
      this.offset = offset ? offset : scale(this.center, -1);

      this.drag = {
         start: new Point(0, 0),
         end: new Point(0, 0),
         offset: new Point(0, 0),
         active: false
      };

      // Initialize canvas state
      this.ctx.save();
      this.#addEventListeners();
   }

   reset() {
      this.ctx.restore();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();
      this.ctx.translate(this.center.x, this.center.y);
      this.ctx.scale(1 / this.zoom, 1 / this.zoom);
      const offset = this.getOffset();
      this.ctx.translate(offset.x, offset.y);
   }

   getMouse(evt, subtractDragOffset = false) {
      const p = new Point(
         (evt.offsetX - this.center.x) * this.zoom - this.offset.x,
         (evt.offsetY - this.center.y) * this.zoom - this.offset.y
      );
      return subtractDragOffset ? subtract(p, this.drag.offset) : p;
   }

   getOffset() {
      return add(this.offset, this.drag.offset);
   }

   drawGrid() {
      this.ctx.save();
      this.ctx.strokeStyle = "#f0f0f0";
      this.ctx.lineWidth = 3;
      
      // Better grid scaling for city-scale views
      const baseGridSpacing = 100;
      let gridSpacing = baseGridSpacing;
      
      // Improved grid density logic for wider zoom range
      if (this.zoom > 5) {
         gridSpacing = baseGridSpacing / 4;
      } else if (this.zoom > 2) {
         gridSpacing = baseGridSpacing / 2;
      } else if (this.zoom < 0.1) {
         gridSpacing = baseGridSpacing * 20; // For city-scale view
      } else if (this.zoom < 0.25) {
         gridSpacing = baseGridSpacing * 10;
      } else if (this.zoom < 0.5) {
         gridSpacing = baseGridSpacing * 4;
      } else if (this.zoom < 1) {
         gridSpacing = baseGridSpacing * 2;
      }
      
      // Only draw grid if spacing is reasonable for current zoom
      if (gridSpacing / this.zoom > 5) { // Don't draw if grid would be too dense
         const bounds = this.getBounds();
         
         const startX = Math.floor(bounds.left / gridSpacing) * gridSpacing;
         const endX = Math.ceil(bounds.right / gridSpacing) * gridSpacing;
         const startY = Math.floor(bounds.top / gridSpacing) * gridSpacing;
         const endY = Math.ceil(bounds.bottom / gridSpacing) * gridSpacing;
         
         // Draw vertical lines
         for (let x = startX; x <= endX; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, bounds.top);
            this.ctx.lineTo(x, bounds.bottom);
            this.ctx.stroke();
         }
         
         // Draw horizontal lines
         for (let y = startY; y <= endY; y += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(bounds.left, y);
            this.ctx.lineTo(bounds.right, y);
            this.ctx.stroke();
         }
      }
      
      this.ctx.restore();
   }

   getBounds() {
      const offset = this.getOffset();
      return {
         left: -this.center.x * this.zoom + offset.x,
         right: (this.canvas.width - this.center.x) * this.zoom + offset.x,
         top: -this.center.y * this.zoom + offset.y,
         bottom: (this.canvas.height - this.center.y) * this.zoom + offset.y
      };
   }

   #addEventListeners() {
      this.canvas.addEventListener("mousewheel", this.#handleMouseWheel.bind(this));
      this.canvas.addEventListener("mousedown", this.#handleMouseDown.bind(this));
      this.canvas.addEventListener("mousemove", this.#handleMouseMove.bind(this));
      this.canvas.addEventListener("mouseup", this.#handleMouseUp.bind(this));
   }

   #handleMouseDown(evt) {
      if (evt.button == 1) { // middle button
         this.drag.start = this.getMouse(evt);
         this.drag.active = true;
      }
   }

   #handleMouseMove(evt) {
      if (this.drag.active) {
         this.drag.end = this.getMouse(evt);
         this.drag.offset = subtract(this.drag.end, this.drag.start);
      }
   }

   #handleMouseUp() {
      if (this.drag.active) {
         this.offset = add(this.offset, this.drag.offset);
         this.drag = {
            start: new Point(0, 0),
            end: new Point(0, 0),
            offset: new Point(0, 0),
            active: false
         };
      }
   }

   #handleMouseWheel(evt) {
      evt.preventDefault();
      const dir = Math.sign(evt.deltaY);
      const step = 0.1;
      this.zoom += dir * step;
      // Increased range: 0.01x to 20x for city-scale viewing
      this.zoom = Math.max(0.01, Math.min(20, this.zoom));
   }
}