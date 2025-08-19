import { getIntersection, lerp } from "./utils.js";

export class Sensor{
    constructor(car, opts = {}){
        this.car = car;

    // Defaults following the author's original setup
    this.rayCount = opts.rayCount ?? 5;
    this.rayLength = opts.rayLength ?? 150;
    this.raySpread = opts.raySpread ?? (Math.PI / 2);

    // Optional dynamic tuning (disabled by default to match original)
    this.dynamicSpread = opts.dynamicSpread ?? false;
    this.centerBoost = opts.centerBoost ?? [1.0, 1.0];

        this.rays = [];
        this.readings = [];
    }

    setConfig(opts = {}) {
        if (opts.rayCount != null) this.rayCount = opts.rayCount;
        if (opts.rayLength != null) this.rayLength = opts.rayLength;
        if (opts.raySpread != null) this.raySpread = opts.raySpread;
        if (opts.dynamicSpread != null) this.dynamicSpread = opts.dynamicSpread;
        if (opts.centerBoost != null) this.centerBoost = opts.centerBoost;
    }

    update(roadBorders, traffic){
        this.#castRays();
        this.readings = [];
        for (let i = 0; i < this.rays.length; i++) {
            this.readings.push(
                this.#getReading(this.rays[i], roadBorders, traffic)
            );
        }
    }

    #getReading(ray, roadBorders, traffic){
        let touches = [];

        for (let i = 0; i < roadBorders.length; i++) {
            const segment = roadBorders[i];
            if (!segment) continue;

            const startPoint = segment.p1 || segment[0];
            const endPoint   = segment.p2 || segment[1];
            if (!startPoint || !endPoint) continue;

            const touch = getIntersection(ray[0], ray[1], startPoint, endPoint);
            if (touch) touches.push(touch);
        }

        for (let i = 0; i < traffic.length; i++) {
            const poly = traffic[i].polygon;
            for (let j = 0; j < poly.length; j++) {
                const value = getIntersection(
                    ray[0], ray[1], poly[j], poly[(j + 1) % poly.length]
                );
                if (value) touches.push(value);
            }
        }

        if (touches.length === 0) {
            return null;
        } else {
            const offsets = touches.map(e => e.offset);
            const minOffset = Math.min(...offsets);
            return touches.find(e => e.offset === minOffset);
        }
    }

    #castRays(){
        this.rays = [];

        // Dynamic spread: slower = wider FOV, faster = narrower, to stabilize high-speed steering
        let spread = this.raySpread;
        if (this.dynamicSpread) {
            const speedNorm = Math.min(1, Math.abs(this.car.speed) / (this.car.maxSpeed || 1));
            // widen up to +15% at very low speed, back to base at high speed
            spread = lerp(this.raySpread * 1.15, this.raySpread, speedNorm);
        }

        for (let i = 0; i < this.rayCount; i++) {
            const t = this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1);
            const rayAngle = lerp(spread / 2, -spread / 2, t) + this.car.angle;

            const start = { x: this.car.x, y: this.car.y };

            // Length scaling: center and near-center rays extend farther
            let length = this.rayLength;
            if (this.rayCount >= 3) {
                const midIndex = (this.rayCount - 1) / 2;
                const distFromCenter = Math.abs(i - midIndex);

                if (distFromCenter < 0.5 && this.centerBoost[0]) {
                    // center ray
                    length *= this.centerBoost[0];
                } else if (distFromCenter < 1.5 && this.centerBoost[1]) {
                    // near-center rays
                    length *= this.centerBoost[1];
                }
            }

            const end = {
                x: this.car.x - Math.sin(rayAngle) * length,
                y: this.car.y - Math.cos(rayAngle) * length
            };
            this.rays.push([start, end]);
        }
    }

    draw(ctx){
        for (let i = 0; i < this.rayCount; i++) {
            let end = this.rays[i][1];
            if (this.readings[i]) {
                end = this.readings[i];
            }

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "yellow";
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.moveTo(this.rays[i][1].x, this.rays[i][1].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    }        
}