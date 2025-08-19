import { Point } from "../primitives/point.js";
import { Polygon } from "../primitives/polygon.js";

export class Obstacle {
    constructor(center, width, height, type = "generic") {
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
        // Dark circular pothole
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#2c2c2c";
        ctx.fill();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner shadow effect
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.width / 3, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1a1a";
        ctx.fill();
    }

    #drawSpeedBump(ctx) {
        // Yellow and black striped speed bump
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height);
        
        // Black stripes
        ctx.fillStyle = "#000000";
        const stripeWidth = this.width / 8;
        for (let i = 1; i < 8; i += 2) {
            ctx.fillRect(
                this.center.x - this.width / 2 + i * stripeWidth,
                this.center.y - this.height / 2,
                stripeWidth,
                this.height
            );
        }
    }

    #drawConstruction(ctx) {
        // Orange construction cone
        ctx.fillStyle = "#FF6B35";
        ctx.beginPath();
        ctx.moveTo(this.center.x, this.center.y - this.height / 2);
        ctx.lineTo(this.center.x - this.width / 2, this.center.y + this.height / 2);
        ctx.lineTo(this.center.x + this.width / 2, this.center.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // White stripes
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const y = this.center.y - this.height / 4 + (i * this.height / 6);
            ctx.beginPath();
            ctx.moveTo(this.center.x - this.width / 4, y);
            ctx.lineTo(this.center.x + this.width / 4, y);
            ctx.stroke();
        }
    }

    #drawCow(ctx) {
        // Brown cow body
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 3, this.width, this.height * 2/3);
        
        // Head
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y - this.height / 3, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.fillStyle = "#654321";
        for (let i = 0; i < 4; i++) {
            const x = this.center.x - this.width / 3 + (i * this.width / 5);
            ctx.fillRect(x, this.center.y + this.height / 6, 8, this.height / 4);
        }
        
        // White spots
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(this.center.x - 10, this.center.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.center.x + 8, this.center.y + 5, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawAutoRickshaw(ctx) {
        // Yellow auto-rickshaw body
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 3, this.width, this.height * 2/3);
        
        // Black roof
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 2, this.width, this.height / 6);
        
        // Wheels
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.arc(this.center.x - this.width / 3, this.center.y + this.height / 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.center.x + this.width / 3, this.center.y + this.height / 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y + this.height / 3, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Green and saffron stripes
        ctx.fillStyle = "#FF9933";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y - this.height / 6, this.width, 4);
        ctx.fillStyle = "#138808";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y, this.width, 4);
    }

    #drawVendor(ctx) {
        // Street vendor cart - brown base
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(this.center.x - this.width / 2, this.center.y, this.width, this.height / 3);
        
        // Colorful goods/umbrella
        ctx.fillStyle = "#FF6B6B";
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y - this.height / 4, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Cart details
        ctx.fillStyle = "#654321";
        ctx.fillRect(this.center.x - 5, this.center.y + this.height / 6, 10, this.height / 6);
        
        // Wheels
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.arc(this.center.x - this.width / 3, this.center.y + this.height / 3, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.center.x + this.width / 3, this.center.y + this.height / 3, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    #drawDebris(ctx) {
        // Random debris/rocks
        ctx.fillStyle = "#696969";
        
        // Main debris pile
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.width / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Smaller debris pieces
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const radius = this.width / 4;
            const x = this.center.x + Math.cos(angle) * radius;
            const y = this.center.y + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 4 + Math.random() * 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    #drawGeneric(ctx) {
        // Generic rectangular obstacle
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
