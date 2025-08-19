import React, { useEffect, useRef } from 'react';
import { scale } from '../components/math/utils.js';

export default function MiniMap({ world, cars, bestCar, viewPoint, size = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !world || !world.graph) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Set up scaling and translation
    const scaler = 0.1;
    const scaledViewPoint = scale(viewPoint, -scaler);
    
    ctx.save();
    ctx.translate(
      scaledViewPoint.x + size / 2, 
      scaledViewPoint.y + size / 2
    );
    ctx.scale(scaler, scaler);

    // Draw road segments
    if (world.graph.segments) {
      for (const seg of world.graph.segments) {
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3 / scaler;
        ctx.moveTo(seg.p1.x, seg.p1.y);
        ctx.lineTo(seg.p2.x, seg.p2.y);
        ctx.stroke();
      }
    }

    // Draw buildings if available
    if (world.buildings) {
      ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
      for (const building of world.buildings) {
        if (building.base && building.base.points) {
          ctx.beginPath();
          const points = building.base.points;
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Draw markings
    if (world.markings) {
      for (const marking of world.markings) {
        ctx.fillStyle = marking.constructor.name === 'Start' ? 'green' : 
                       marking.constructor.name === 'Target' ? 'red' : 'yellow';
        ctx.beginPath();
        ctx.arc(marking.center.x, marking.center.y, 8 / scaler, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw cars
    if (cars && cars.length > 0) {
      for (const car of cars) {
        if (car.damaged) continue;
        
        ctx.beginPath();
        ctx.fillStyle = car === bestCar ? "blue" : "gray";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2 / scaler;
        ctx.arc(car.x, car.y, 5 / scaler, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // Draw center point (viewport center)
    ctx.beginPath();
    ctx.fillStyle = "blue";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

  }, [world, cars, bestCar, viewPoint, size]);

  return (
    <div className="minimap-container">
      <canvas 
        ref={canvasRef} 
        width={size} 
        height={size}
        className="border border-gray-300 rounded bg-black"
        style={{ width: size, height: size }}
      />
      <div className="text-xs text-center mt-1 text-gray-600">
        Mini Map
      </div>
    </div>
  );
}
