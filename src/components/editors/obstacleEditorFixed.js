import { Obstacle } from "../obstacles/obstacleFixed.js";
import { getNearestPoint } from "../math/utils.js";
import { scale } from "../math/utils.js";

export class ObstacleEditor {
    constructor(viewport, world) {
        this.viewport = viewport;
        this.world = world;
        this.canvas = viewport.canvas;
        this.ctx = this.canvas.getContext("2d");
        
        this.mouse = null;
        this.intent = null; // Preview obstacle
        this.enabled = false;
        this.obstacleType = "pothole";
        this.obstacleTypes = ["pothole", "speedbump", "construction", "cow", "autorickshaw", "vendor", "debris"];
    }

    enable() {
        this.#addEventListeners();
    }

    disable() {
        this.#removeEventListeners();
        this.mouse = null;
        this.intent = null;
    }

    #addEventListeners() {
        this.boundMouseDown = this.#handleMouseDown.bind(this);
        this.boundMouseMove = this.#handleMouseMove.bind(this);
        this.boundContextMenu = this.#handleContextMenu.bind(this);
        this.canvas.addEventListener("mousedown", this.boundMouseDown);
        this.canvas.addEventListener("mousemove", this.boundMouseMove);
        this.canvas.addEventListener("contextmenu", this.boundContextMenu);
    }

    #removeEventListeners() {
        this.canvas.removeEventListener("mousedown", this.boundMouseDown);
        this.canvas.removeEventListener("mousemove", this.boundMouseMove);
        this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
    }

    #handleMouseMove(evt) {
        this.mouse = this.viewport.getMouse(evt, true);
        
        // Create preview obstacle (intent)
        const placementPoint = this.#getPlacementPoint(this.mouse);
        const size = this.#getObstacleSize();
        this.intent = new Obstacle(placementPoint, size.width, size.height, this.obstacleType);
    }

    #handleMouseDown(evt) {
        if (evt.button === 0) { // Left click
            if (this.intent) {
                // Initialize obstacles array if it doesn't exist
                if (!this.world.obstacles) {
                    this.world.obstacles = [];
                }
                
                this.world.obstacles.push(this.intent);
                console.log(`Added ${this.obstacleType} obstacle`);
                this.intent = null;
            }
        }
        
        if (evt.button === 2) { // Right click - remove obstacle
            const clickedObstacle = this.#getObstacleAtPoint(this.mouse);
            if (clickedObstacle) {
                this.#removeObstacle(clickedObstacle);
            }
        }
    }

    #handleContextMenu(evt) {
        evt.preventDefault();
        
        const currentIndex = this.obstacleTypes.indexOf(this.obstacleType);
        this.obstacleType = this.obstacleTypes[(currentIndex + 1) % this.obstacleTypes.length];
        console.log("Changed obstacle type to:", this.obstacleType);
        
        // Update intent with new obstacle type
        if (this.mouse) {
            const placementPoint = this.#getPlacementPoint(this.mouse);
            const size = this.#getObstacleSize();
            this.intent = new Obstacle(placementPoint, size.width, size.height, this.obstacleType);
        }
    }

    #getObstacleAtPoint(point) {
        if (!this.world.obstacles) return null;
        
        const threshold = 20; // Click tolerance
        return this.world.obstacles.find(obstacle => {
            const dx = obstacle.center.x - point.x;
            const dy = obstacle.center.y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < threshold;
        });
    }

    #removeObstacle(obstacle) {
        if (!this.world.obstacles) return;
        
        const index = this.world.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.world.obstacles.splice(index, 1);
            console.log("Removed obstacle");
        }
    }

    #getPlacementPoint(point) {
        // Road-snapping obstacles: speedbump (should be on road)
        const roadSnapObstacles = ["speedbump"];
        
        if (roadSnapObstacles.includes(this.obstacleType)) {
            // Find nearest road segment
            const segments = this.world.graph.segments;
            if (segments.length === 0) return point;
            
            let nearestPoint = point;
            let minDistance = Infinity;
            
            segments.forEach(segment => {
                // Get the closest point on this segment
                const segmentPoint = this.#getClosestPointOnSegment(point, segment);
                const distance = this.#getDistance(point, segmentPoint);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPoint = segmentPoint;
                }
            });
            
            // Only snap if within reasonable distance
            return minDistance < 50 ? nearestPoint : point;
        }
        
        // For other obstacles, place at cursor position
        return point;
    }

    #getClosestPointOnSegment(point, segment) {
        const A = segment.p1;
        const B = segment.p2;
        const AP = { x: point.x - A.x, y: point.y - A.y };
        const AB = { x: B.x - A.x, y: B.y - A.y };
        
        const ab2 = AB.x * AB.x + AB.y * AB.y;
        const ap_ab = AP.x * AB.x + AP.y * AB.y;
        
        if (ab2 === 0) return A; // A and B are the same point
        
        let t = ap_ab / ab2;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment
        
        return {
            x: A.x + AB.x * t,
            y: A.y + AB.y * t
        };
    }

    #getDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    #getObstacleSize() {
        // Different sizes for different obstacle types
        const sizes = {
            pothole: { width: 25, height: 25 },
            speedbump: { width: 60, height: 20 }, // Wide and low for road integration
            construction: { width: 30, height: 35 },
            cow: { width: 45, height: 35 },
            autorickshaw: { width: 40, height: 30 },
            vendor: { width: 50, height: 40 },
            debris: { width: 35, height: 35 }
        };
        
        return sizes[this.obstacleType] || { width: 40, height: 40 };
    }

    display() {
        if (this.intent) {
            const viewPoint = scale(this.viewport.getOffset(), -1);
            this.intent.draw(this.ctx, viewPoint);
        }
    }
}
