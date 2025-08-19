import { getFake3dPoint, average } from "../math/utils.js";
import { Polygon } from "../primitives/polygon.js";

export class Building {
    constructor(poly, height = 200) {
        this.base = poly;
        this.height = height;
    }

    static load(info) {
        return new Building(Polygon.load(info.base), info.height);
    }

    draw(ctx, viewPoint) {
        const roofColor = "#1E2E4F"; // dark blue roof
        const wallColor = "#F9F7F4"; // light walls
        const trimColor = "#E0DAD1";
        const windowColor = "#5DA9E9";

       

        // Calculate roof top
        const topPoints = this.base.points.map(p =>
            getFake3dPoint(p, viewPoint, this.height * 0.6)
        );
        const ceiling = new Polygon(topPoints);

        // Draw walls
        const sides = [];
        for (let i = 0; i < this.base.points.length; i++) {
            const nextI = (i + 1) % this.base.points.length;
            sides.push(new Polygon([
                this.base.points[i], this.base.points[nextI],
                topPoints[nextI], topPoints[i]
            ]));
        }
        sides.sort((a, b) =>
            b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint)
        );

        for (const side of sides) {
            side.draw(ctx, { fill: "grey", stroke: trimColor, lineWidth: 4 });
        }

        // Draw main roof
        ceiling.draw(ctx, { fill: roofColor, stroke: roofColor, lineWidth: 4 });

        // Draw dormer
        const centerFront = average(this.base.points[0], this.base.points[1]);
        const centerBack = average(this.base.points[3], this.base.points[2]);
        const dormerBaseFront = getFake3dPoint(centerFront, viewPoint, this.height * 0.75);
        const dormerBaseBack = getFake3dPoint(centerBack, viewPoint, this.height * 0.75);
        const dormerHeight = this.height * 0.1;

        const dormerTopFront = { x: dormerBaseFront.x, y: dormerBaseFront.y - dormerHeight };
        const dormerTopBack = { x: dormerBaseBack.x, y: dormerBaseBack.y - dormerHeight };

        const dormer = new Polygon([
            dormerBaseFront, dormerBaseBack, dormerTopBack, dormerTopFront
        ]);
        dormer.draw(ctx, { fill: wallColor, stroke: trimColor, lineWidth: 2 });

        // Dormer roof
        ctx.beginPath();
        ctx.moveTo(dormerTopFront.x, dormerTopFront.y);
        ctx.lineTo(dormerTopBack.x, dormerTopBack.y);
        ctx.lineTo(dormerBaseBack.x, dormerBaseBack.y);
        ctx.lineTo(dormerBaseFront.x, dormerBaseFront.y);
        ctx.closePath();
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.stroke();

       

        // Draw windows on dormer
        ctx.fillStyle = windowColor;
        ctx.fillRect(dormerTopFront.x - 10, dormerTopFront.y + 5, 20, 20);
    }
}