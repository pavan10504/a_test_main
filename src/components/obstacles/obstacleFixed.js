import { Point } from "../primitives/point.js";
import { Polygon } from "../primitives/polygon.js";

export class Obstacle {
    constructor(center, width = 40, height = 40, type = "pothole") {
        this.center = center;
        this.width = width;
        this.height = height;
        this.type = type;
        this.polygon = this.#createPolygon();
    }

    #createPolygon() {
        const points = [
            new Point(this.center.x - this.width / 2, this.center.y - this.height / 2),
            new Point(this.center.x + this.width / 2, this.center.y - this.height / 2),
            new Point(this.center.x + this.width / 2, this.center.y + this.height / 2),
            new Point(this.center.x - this.width / 2, this.center.y + this.height / 2)
        ];
        return new Polygon(points);
    }

    draw(ctx, viewPoint, zoom = 1) {
        ctx.save();
        ctx.translate(-viewPoint.x, -viewPoint.y);
        ctx.scale(zoom, zoom);
        
        // Draw obstacle based on type
        switch (this.type) {
            case "pothole":
                this.#drawPothole(ctx);
                break;
            case "speedbump":
                this.#drawSpeedBump(ctx);
                break;
            case "construction":
                this.#drawConstruction(ctx);
                break;
            case "cow":
                this.#drawCow(ctx);
                break;
            case "autorickshaw":
                this.#drawAutoRickshaw(ctx);
                break;
            case "vendor":
                this.#drawVendor(ctx);
                break;
            case "debris":
                this.#drawDebris(ctx);
                break;
            default:
                this.#drawGeneric(ctx);
        }
        
        ctx.restore();
    }

    #drawPothole(ctx) {
        // Create a realistic pothole with irregular edges and depth
        ctx.save();
        
        // Main pothole - irregular circular shape
        ctx.beginPath();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const radius = this.width / 2;
        
        // Create irregular edge using multiple arcs
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const irregularity = 0.7 + Math.sin(i * 1.7) * 0.3; // Random variation
            const currentRadius = radius * irregularity;
            const x = centerX + Math.cos(angle) * currentRadius;
            const y = centerY + Math.sin(angle) * currentRadius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        // Dark asphalt color with gradient effect
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, "#1a1a1a"); // Very dark center
        gradient.addColorStop(0.6, "#2c2c2c"); // Medium dark
        gradient.addColorStop(1, "#404040"); // Lighter edge
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add rough texture with small dark spots
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius * 0.6;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fillStyle = "#0f0f0f";
            ctx.fill();
        }
        
        // Add water/reflection effect
        ctx.beginPath();
        ctx.ellipse(centerX - radius * 0.2, centerY - radius * 0.3, radius * 0.3, radius * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100, 150, 200, 0.3)";
        ctx.fill();
        
        ctx.restore();
    }

    #drawSpeedBump(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        const height = this.height;
        
        // Create a road-integrated speed bump (low profile, wide)
        const bumpWidth = width * 1.2; // Wider than other obstacles
        const bumpHeight = height * 0.3; // Much lower profile
        
        // Main speed bump shape - elongated and low
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, bumpWidth / 2, bumpHeight / 2, 0, 0, Math.PI * 2);
        
        // Yellow base with subtle gradient for road integration
        const gradient = ctx.createLinearGradient(centerX, centerY - bumpHeight/2, centerX, centerY + bumpHeight/2);
        gradient.addColorStop(0, "#FFE135"); // Bright yellow top
        gradient.addColorStop(0.3, "#FFD700"); // Standard yellow
        gradient.addColorStop(0.7, "#E6C200"); // Slightly darker
        gradient.addColorStop(1, "#B8860B"); // Dark yellow blending with road
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Black diagonal warning stripes - properly sized for road bump
        ctx.save();
        ctx.clip(); // Clip to speed bump shape
        
        const stripeWidth = 4;
        const stripeSpacing = 8;
        
        // Create diagonal stripes across the entire bump
        for (let x = centerX - bumpWidth; x < centerX + bumpWidth; x += stripeSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, centerY - bumpHeight/2);
            ctx.lineTo(x + stripeWidth, centerY - bumpHeight/2);
            ctx.lineTo(x + stripeWidth + 6, centerY + bumpHeight/2);
            ctx.lineTo(x + 6, centerY + bumpHeight/2);
            ctx.closePath();
            ctx.fillStyle = "#000000";
            ctx.fill();
        }
        
        ctx.restore();
        
        // Add road integration edges - blend with asphalt
        ctx.strokeStyle = "#4A4A4A"; // Dark gray like road
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, bumpWidth / 2, bumpHeight / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add reflective cat-eyes/studs on edges
        const studPositions = [
            {x: centerX - bumpWidth * 0.4, y: centerY},
            {x: centerX + bumpWidth * 0.4, y: centerY},
            {x: centerX - bumpWidth * 0.2, y: centerY - bumpHeight * 0.3},
            {x: centerX + bumpWidth * 0.2, y: centerY - bumpHeight * 0.3}
        ];
        
        studPositions.forEach(stud => {
            ctx.beginPath();
            ctx.arc(stud.x, stud.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            ctx.strokeStyle = "#CCCCCC";
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });
        
        ctx.restore();
    }

    #drawConstruction(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        const height = this.height;
        
        // Construction barrier/cone with realistic proportions
        ctx.beginPath();
        // Cone shape with slightly curved sides
        ctx.moveTo(centerX, centerY - height * 0.4); // Top point
        ctx.quadraticCurveTo(centerX - width * 0.15, centerY, centerX - width * 0.4, centerY + height * 0.4); // Left side
        ctx.lineTo(centerX + width * 0.4, centerY + height * 0.4); // Bottom
        ctx.quadraticCurveTo(centerX + width * 0.15, centerY, centerX, centerY - height * 0.4); // Right side
        ctx.closePath();
        
        // Orange gradient for 3D effect
        const gradient = ctx.createLinearGradient(centerX - width/2, centerY, centerX + width/2, centerY);
        gradient.addColorStop(0, "#CC4400"); // Dark orange shadow
        gradient.addColorStop(0.3, "#FF6B35"); // Main orange
        gradient.addColorStop(0.7, "#FF8C5A"); // Highlight
        gradient.addColorStop(1, "#CC4400"); // Dark orange shadow
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // White reflective stripes
        const stripeCount = 3;
        for (let i = 0; i < stripeCount; i++) {
            const stripeY = centerY - height * 0.2 + (i * height * 0.2);
            const stripeWidth = width * (0.6 - i * 0.1); // Narrower towards top
            
            ctx.beginPath();
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(centerX - stripeWidth/2, stripeY, stripeWidth, 4);
            
            // Add slight glow effect
            ctx.shadowColor = "#FFFFFF";
            ctx.shadowBlur = 2;
            ctx.fillRect(centerX - stripeWidth/2, stripeY, stripeWidth, 4);
            ctx.shadowBlur = 0;
        }
        
        // Black base
        ctx.beginPath();
        ctx.fillStyle = "#333333";
        ctx.fillRect(centerX - width * 0.5, centerY + height * 0.3, width, height * 0.15);
        
        // Add warning sign on top
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height * 0.5);
        ctx.lineTo(centerX - 8, centerY - height * 0.3);
        ctx.lineTo(centerX + 8, centerY - height * 0.3);
        ctx.closePath();
        ctx.fillStyle = "#FFD700";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Exclamation mark
        ctx.fillStyle = "#000000";
        ctx.fillRect(centerX - 1, centerY - height * 0.45, 2, 8);
        ctx.fillRect(centerX - 1, centerY - height * 0.35, 2, 2);
        
        ctx.restore();
    }

    #drawCow(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        const height = this.height;
        
        // Cow body - more realistic proportions
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, width * 0.4, height * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#8B4513"; // Brown body
        ctx.fill();
        
        // Add white spots for Holstein pattern
        const spots = [
            {x: centerX - width * 0.2, y: centerY - height * 0.1, size: width * 0.08},
            {x: centerX + width * 0.15, y: centerY + height * 0.05, size: width * 0.06},
            {x: centerX - width * 0.05, y: centerY + height * 0.1, size: width * 0.05},
            {x: centerX + width * 0.25, y: centerY - height * 0.15, size: width * 0.04}
        ];
        
        ctx.fillStyle = "#FFFFFF";
        spots.forEach(spot => {
            ctx.beginPath();
            ctx.ellipse(spot.x, spot.y, spot.size, spot.size * 0.8, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Head - more detailed
        ctx.beginPath();
        ctx.ellipse(centerX - width * 0.3, centerY - height * 0.2, width * 0.15, height * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#8B4513";
        ctx.fill();
        
        // Add white patch on face
        ctx.beginPath();
        ctx.ellipse(centerX - width * 0.32, centerY - height * 0.22, width * 0.08, height * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(centerX - width * 0.35, centerY - height * 0.25, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - width * 0.28, centerY - height * 0.25, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Horns
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - width * 0.32, centerY - height * 0.3);
        ctx.lineTo(centerX - width * 0.35, centerY - height * 0.4);
        ctx.moveTo(centerX - width * 0.28, centerY - height * 0.3);
        ctx.lineTo(centerX - width * 0.25, centerY - height * 0.4);
        ctx.stroke();
        
        // Legs - more realistic
        ctx.fillStyle = "#654321";
        const legPositions = [
            {x: centerX - width * 0.25, y: centerY + height * 0.2},
            {x: centerX - width * 0.1, y: centerY + height * 0.2},
            {x: centerX + width * 0.05, y: centerY + height * 0.2},
            {x: centerX + width * 0.2, y: centerY + height * 0.2}
        ];
        
        legPositions.forEach(leg => {
            ctx.fillRect(leg.x - 3, leg.y, 6, height * 0.2);
            // Hooves
            ctx.fillStyle = "#333333";
            ctx.fillRect(leg.x - 4, leg.y + height * 0.18, 8, 4);
            ctx.fillStyle = "#654321";
        });
        
        // Tail
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX + width * 0.35, centerY);
        ctx.quadraticCurveTo(centerX + width * 0.5, centerY + height * 0.1, centerX + width * 0.45, centerY + height * 0.25);
        ctx.stroke();
        
        // Tail tuft
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(centerX + width * 0.45, centerY + height * 0.25, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    #drawAutoRickshaw(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        const height = this.height;
        
        // Main body - more realistic auto-rickshaw shape
        ctx.beginPath();
        ctx.roundRect(centerX - width * 0.35, centerY - height * 0.15, width * 0.7, height * 0.3, 5);
        const bodyGradient = ctx.createLinearGradient(centerX, centerY - height * 0.15, centerX, centerY + height * 0.15);
        bodyGradient.addColorStop(0, "#FFED4A"); // Bright yellow top
        bodyGradient.addColorStop(1, "#F39C12"); // Darker yellow bottom
        ctx.fillStyle = bodyGradient;
        ctx.fill();
        
        // Black roof/canopy
        ctx.beginPath();
        ctx.roundRect(centerX - width * 0.3, centerY - height * 0.3, width * 0.6, height * 0.18, 8);
        ctx.fillStyle = "#1a1a1a";
        ctx.fill();
        
        // Windshield
        ctx.beginPath();
        ctx.roundRect(centerX - width * 0.25, centerY - height * 0.25, width * 0.5, height * 0.1, 3);
        ctx.fillStyle = "rgba(173, 216, 230, 0.7)"; // Light blue tint
        ctx.fill();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Side panels
        ctx.fillStyle = "#2C3E50";
        ctx.fillRect(centerX - width * 0.35, centerY - height * 0.1, 4, height * 0.2);
        ctx.fillRect(centerX + width * 0.31, centerY - height * 0.1, 4, height * 0.2);
        
        // Three wheels - characteristic of auto-rickshaw
        const wheelRadius = 6;
        const wheelPositions = [
            {x: centerX - width * 0.25, y: centerY + height * 0.25}, // Front left
            {x: centerX + width * 0.25, y: centerY + height * 0.25}, // Front right
            {x: centerX, y: centerY + height * 0.35} // Single rear wheel
        ];
        
        wheelPositions.forEach(wheel => {
            // Tire
            ctx.beginPath();
            ctx.arc(wheel.x, wheel.y, wheelRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#2C3E50";
            ctx.fill();
            
            // Rim
            ctx.beginPath();
            ctx.arc(wheel.x, wheel.y, wheelRadius - 2, 0, Math.PI * 2);
            ctx.fillStyle = "#BDC3C7";
            ctx.fill();
            
            // Spokes
            ctx.strokeStyle = "#7F8C8D";
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                ctx.beginPath();
                ctx.moveTo(wheel.x, wheel.y);
                ctx.lineTo(wheel.x + Math.cos(angle) * (wheelRadius - 2), wheel.y + Math.sin(angle) * (wheelRadius - 2));
                ctx.stroke();
            }
        });
        
        // Indian flag colors stripe
        ctx.fillStyle = "#FF9933"; // Saffron
        ctx.fillRect(centerX - width * 0.3, centerY - height * 0.05, width * 0.6, 3);
        ctx.fillStyle = "#FFFFFF"; // White
        ctx.fillRect(centerX - width * 0.3, centerY - height * 0.02, width * 0.6, 3);
        ctx.fillStyle = "#138808"; // Green
        ctx.fillRect(centerX - width * 0.3, centerY + height * 0.01, width * 0.6, 3);
        
        // License plate
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(centerX - width * 0.15, centerY + height * 0.1, width * 0.3, height * 0.08);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - width * 0.15, centerY + height * 0.1, width * 0.3, height * 0.08);
        
        // License text
        ctx.fillStyle = "#000000";
        ctx.font = "6px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MH 01", centerX, centerY + height * 0.15);
        
        // Headlight
        ctx.beginPath();
        ctx.arc(centerX - width * 0.32, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#F8F9FA";
        ctx.fill();
        ctx.strokeStyle = "#6C757D";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }

    #drawVendor(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        const height = this.height;
        
        // Cart base - wooden appearance
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(centerX - width * 0.4, centerY + height * 0.1, width * 0.8, height * 0.2);
        
        // Wood grain effect
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX - width * 0.35, centerY + height * 0.12 + i * 4);
            ctx.lineTo(centerX + width * 0.35, centerY + height * 0.12 + i * 4);
            ctx.stroke();
        }
        
        // Colorful umbrella/canopy
        const umbrellaRadius = width * 0.35;
        const umbrellaSegments = 8;
        const colors = ["#E74C3C", "#F39C12", "#F1C40F", "#27AE60", "#3498DB", "#9B59B6", "#E67E22", "#E91E63"];
        
        for (let i = 0; i < umbrellaSegments; i++) {
            ctx.beginPath();
            const startAngle = (i * Math.PI * 2) / umbrellaSegments;
            const endAngle = ((i + 1) * Math.PI * 2) / umbrellaSegments;
            ctx.moveTo(centerX, centerY - height * 0.2);
            ctx.arc(centerX, centerY - height * 0.2, umbrellaRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
        }
        
        // Umbrella rim
        ctx.beginPath();
        ctx.arc(centerX, centerY - height * 0.2, umbrellaRadius, 0, Math.PI * 2);
        ctx.strokeStyle = "#2C3E50";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Umbrella pole
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height * 0.2);
        ctx.lineTo(centerX, centerY + height * 0.3);
        ctx.stroke();
        
        // Food items/goods display
        // Fruits
        ctx.fillStyle = "#E74C3C"; // Red apples
        ctx.beginPath();
        ctx.arc(centerX - width * 0.2, centerY - height * 0.05, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - width * 0.1, centerY - height * 0.08, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#F39C12"; // Oranges
        ctx.beginPath();
        ctx.arc(centerX + width * 0.1, centerY - height * 0.05, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + width * 0.2, centerY - height * 0.08, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#F1C40F"; // Bananas
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - height * 0.1, 8, 3, Math.PI * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Vendor (simple figure)
        ctx.fillStyle = "#D4AFAC"; // Skin tone
        ctx.beginPath();
        ctx.arc(centerX + width * 0.3, centerY - height * 0.15, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Vendor body
        ctx.fillStyle = "#3498DB"; // Blue shirt
        ctx.fillRect(centerX + width * 0.25, centerY - height * 0.05, 10, 15);
        
        // Arms
        ctx.fillStyle = "#D4AFAC";
        ctx.fillRect(centerX + width * 0.2, centerY - height * 0.02, 5, 8);
        ctx.fillRect(centerX + width * 0.35, centerY - height * 0.02, 5, 8);
        
        // Cart wheels
        const wheelRadius = 5;
        const wheelPositions = [
            {x: centerX - width * 0.25, y: centerY + height * 0.35},
            {x: centerX + width * 0.25, y: centerY + height * 0.35}
        ];
        
        wheelPositions.forEach(wheel => {
            ctx.beginPath();
            ctx.arc(wheel.x, wheel.y, wheelRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#2C3E50";
            ctx.fill();
            
            // Spokes
            ctx.strokeStyle = "#7F8C8D";
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                ctx.beginPath();
                ctx.moveTo(wheel.x, wheel.y);
                ctx.lineTo(wheel.x + Math.cos(angle) * 3, wheel.y + Math.sin(angle) * 3);
                ctx.stroke();
            }
        });
        
        // Price sign
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(centerX - width * 0.35, centerY - height * 0.35, 20, 8);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - width * 0.35, centerY - height * 0.35, 20, 8);
        ctx.fillStyle = "#000000";
        ctx.font = "5px Arial";
        ctx.textAlign = "center";
        ctx.fillText("₹10", centerX - width * 0.25, centerY - height * 0.3);
        
        ctx.restore();
    }

    #drawDebris(ctx) {
        ctx.save();
        const centerX = this.center.x;
        const centerY = this.center.y;
        const width = this.width;
        
        // Main debris pile - irregular rocks and scattered materials
        const debrisItems = [
            // Large rocks
            {x: centerX - 8, y: centerY - 5, size: 8, color: "#696969", type: "rock"},
            {x: centerX + 5, y: centerY + 3, size: 6, color: "#808080", type: "rock"},
            {x: centerX - 2, y: centerY + 8, size: 7, color: "#555555", type: "rock"},
            
            // Smaller stones
            {x: centerX + 10, y: centerY - 8, size: 4, color: "#778899", type: "stone"},
            {x: centerX - 12, y: centerY + 6, size: 3, color: "#A9A9A9", type: "stone"},
            {x: centerX + 8, y: centerY + 10, size: 4, color: "#696969", type: "stone"},
            
            // Construction debris
            {x: centerX + 2, y: centerY - 10, size: 5, color: "#CD853F", type: "brick"},
            {x: centerX - 6, y: centerY - 12, size: 4, color: "#D2691E", type: "brick"},
            
            // Scattered dirt/sand
            {x: centerX + 6, y: centerY - 2, size: 3, color: "#DEB887", type: "dirt"},
            {x: centerX - 10, y: centerY - 2, size: 4, color: "#BC987E", type: "dirt"},
            {x: centerX + 3, y: centerY + 5, size: 2, color: "#D2B48C", type: "dirt"}
        ];
        
        // Draw each debris item with realistic shapes
        debrisItems.forEach(item => {
            ctx.fillStyle = item.color;
            
            if (item.type === "rock" || item.type === "stone") {
                // Irregular rock shape
                ctx.beginPath();
                const sides = 6 + Math.floor(Math.random() * 3);
                for (let i = 0; i < sides; i++) {
                    const angle = (i * Math.PI * 2) / sides;
                    const radius = item.size * (0.7 + Math.random() * 0.6);
                    const x = item.x + Math.cos(angle) * radius;
                    const y = item.y + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
                
                // Add shadow for depth
                ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                ctx.beginPath();
                ctx.ellipse(item.x + 1, item.y + item.size * 0.8, item.size * 0.8, item.size * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
            } else if (item.type === "brick") {
                // Rectangular brick shape
                ctx.fillRect(item.x - item.size/2, item.y - item.size/3, item.size, item.size * 0.6);
                
                // Brick texture lines
                ctx.strokeStyle = "#8B4513";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(item.x - item.size/2, item.y - item.size/3, item.size, item.size * 0.6);
                
            } else if (item.type === "dirt") {
                // Scattered dirt/sand particles
                for (let j = 0; j < 5; j++) {
                    const offsetX = (Math.random() - 0.5) * item.size;
                    const offsetY = (Math.random() - 0.5) * item.size;
                    ctx.beginPath();
                    ctx.arc(item.x + offsetX, item.y + offsetY, 1 + Math.random(), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
        
        // Add some dust/dirt cloud effect
        ctx.fillStyle = "rgba(139, 69, 19, 0.1)";
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, width * 0.6, width * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a few small particles in the air
        ctx.fillStyle = "rgba(160, 160, 160, 0.4)";
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (Math.random() * width * 0.7) + width * 0.3;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 0.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    #drawGeneric(ctx) {
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
    }

    static load(info) {
        return new Obstacle(info.center, info.width, info.height, info.type);
    }
}
