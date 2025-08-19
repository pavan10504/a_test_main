import { World } from './src/components/world.js';

console.log("Testing World creation...");
try {
  const world = new World();
  console.log("✅ World created successfully:", world);
} catch (error) {
  console.error("❌ Error creating World:", error);
}
