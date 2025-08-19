// Debug utility to check world state
export function debugWorld(world) {
  console.log("=== WORLD DEBUG INFO ===");
  console.log("Graph points:", world.graph.points.length);
  console.log("Graph segments:", world.graph.segments.length);
  console.log("Lane guides:", world.laneGuides.length);
  console.log("Markings:", world.markings.length);
  
  console.log("Marking types:");
  world.markings.forEach((marking, i) => {
    console.log(`  ${i}: ${marking.type || marking.constructor.name} at (${marking.center.x.toFixed(1)}, ${marking.center.y.toFixed(1)})`);
  });
  
  console.log("=======================");
}
