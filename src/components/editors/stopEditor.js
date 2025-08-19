import { MarkingEditor } from "./markingEditor.js";
import { Stop } from "../markings/stop.js";

export class StopEditor extends MarkingEditor {
   constructor(viewport, world) {
      super(viewport, world, world.laneGuides);
   }

   createMarking(center, directionVector) {
      return new Stop(
         center,
         directionVector,
         this.world.roadWidth / 2,
         this.world.roadWidth / 2
      );
   }
}