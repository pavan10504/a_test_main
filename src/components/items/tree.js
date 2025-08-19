import { Polygon } from "../primitives/polygon.js";
import { translate, getFake3dPoint, lerp2D, lerp } from "../math/utils.js";

export class Tree {
   constructor(center, size, height = 200) {
      this.center = center;
      this.size = size; // size of the base
      this.height = height;
      this.base = this.#generateLevel(center, size);
      
      this.levelCount = 0;
      this.levels = [];
      for (let level = 0; level < this.levelCount; level++) {
         const t = level / (this.levelCount - 1);
         const levelSize = lerp(this.size, 40, t);
         this.levels.push({
            t: t,
            size: levelSize,
            color: "rgb(30," + lerp(50, 200, t) + ",70)",
            basePolygon: this.#generateLevel(center, levelSize)
         });
      }
   }

   #generateLevel(point, size) {
      const points = [];
      const rad = size / 2;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
         const kindOfRandom = Math.cos(((a + this.center.x) * size) % 17) ** 2;
         const noisyRadius = rad * lerp(0.5, 1, kindOfRandom);
         points.push(translate(point, a, noisyRadius));
      }
      return new Polygon(points);
   }

   draw(ctx, viewPoint) {
      const top = getFake3dPoint(this.center, viewPoint, this.height);

      for (let level = 0; level < this.levelCount; level++) {
         const levelData = this.levels[level];
         const point3D = lerp2D(this.center, top, levelData.t);
         
         const offsetX = point3D.x - this.center.x;
         const offsetY = point3D.y - this.center.y;
         
         ctx.save();
         ctx.translate(offsetX, offsetY);
         levelData.basePolygon.draw(ctx, { fill: levelData.color, stroke: "rgba(0,0,0,0)" });
         ctx.restore();
      }
   }
}