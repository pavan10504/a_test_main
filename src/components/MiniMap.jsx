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

    // Set up scaling and translation to center around viewPoint (best car position)
    const scaler = 0.05; // Smaller scaler for better overview
    
    ctx.save();
    ctx.translate(size / 2, size / 2); // Center the minimap
    ctx.scale(scaler, scaler);
    
    // Translate to center around the viewPoint (best car position)
    ctx.translate(-viewPoint.x, -viewPoint.y);

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
        if (car === bestCar) {
          ctx.fillStyle = "red"; // Best car in red
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3 / scaler;
          ctx.arc(car.x, car.y, 8 / scaler, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = "blue"; // Other cars in blue
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1 / scaler;
          ctx.arc(car.x, car.y, 4 / scaler, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();



  }, [world, cars, bestCar, viewPoint, size]);

  return (
    <div className="minimap-container">
      <canvas 
        ref={canvasRef} 
        
        className="border border-gray-300 rounded bg-black w-max"
      />
      <div className="text-xs text-center mt-1 text-gray-600">
        Following Best Car
      </div>
    </div>
  );
}
