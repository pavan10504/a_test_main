import { Point } from "../primitives/point.js";
import { Segment } from "../primitives/segment.js";
import { Envelope } from "../primitives/envelop.js";
import { translate, angle } from "../math/utils.js";

export class Marking  {
   constructor(center, directionVector, width, height) {
      this.center = center;
      this.directionVector = directionVector;
      this.width = width;
      this.height = height;

      this.support = new Segment(
         translate(center, angle(directionVector), height / 2),
         translate(center, angle(directionVector), -height / 2)
      );
      this.poly = new Envelope(this.support, width, 0).poly;

      this.type = "marking";
   }

   static load(info) {
      const point = new Point(info.center.x, info.center.y);
      const dir = new Point(info.directionVector.x, info.directionVector.y);
      
      // For now, just create a basic marking for all types
      // The specific types will be handled by the world loading process
      return new Marking(point, dir, info.width, info.height);
   }

   draw(ctx) {
      this.poly.draw(ctx);
   }
}