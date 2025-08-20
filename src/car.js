import { Sensor } from "./sensor.js";
import { Controls } from "./controls.js";
import { NeuralNetwork } from "./network.js";
import { polysIntersect } from "./utils.js";
import { Target } from "./components/markings/target.js";
import carImage from "./car.png";

export class Car{
    constructor(x,y,width,height,controlType,angle=0,maxSpeed=3,color="blue"){
        this.x=x;
        this.y=y;
        this.width=width;
        this.height=height;

        this.speed=0;
        this.acceleration=0.2;
        this.maxSpeed=maxSpeed;
        this.friction=0.05;
        this.angle=angle;
        this.damaged=false;

        this.useBrain=controlType=="AI";
        this.fitness=0;

        if(controlType!="DUMMY"){
            this.sensor=new Sensor(this);
            // Don't create brain here - let it be set externally for AI cars
            // this.brain=new NeuralNetwork([this.sensor.rayCount,6,4]); // Removed
        }
        this.controls=new Controls(controlType);

        this.img=new Image();
        this.img.src=carImage;

        this.mask=document.createElement("canvas");
        this.mask.width=width;
        this.mask.height=height;

        const maskCtx=this.mask.getContext("2d");
        this.img.onload=()=>{
            maskCtx.fillStyle=color;
            maskCtx.rect(0,0,this.width,this.height);
            maskCtx.fill();

            maskCtx.globalCompositeOperation="destination-atop";
            maskCtx.drawImage(this.img,0,0,this.width,this.height);
        }
    }

    update(roadBorders,traffic,world){
        if(!this.damaged){
            this.#move();
            
            // Following gniziemazity's approach: fitness += speed for movement reward
            if (!this.fittness) this.fittness = 0;
            this.fittness += Math.abs(this.speed);
            
            this.polygon=this.#createPolygon();
            this.damaged=this.#assessDamage(roadBorders,traffic,world);
        }
        if(this.sensor){
            this.sensor.update(roadBorders,traffic);
            
            // Following the author's approach: normalize sensor readings
            const offsets=this.sensor.readings.map(
                s=>s==null?0:1-s.offset
            );
            
            if(this.useBrain && this.brain){
                // Author's approach: simple sensor inputs to neural network
                const outputs=NeuralNetwork.feedForward(offsets,this.brain);
                
                // Map outputs to controls (author's standard approach)
                this.controls.forward=outputs[0];
                this.controls.left=outputs[1];
                this.controls.right=outputs[2];
                this.controls.reverse=outputs[3];
            }
        }
    }

    #assessDamage(roadBorders,traffic,world){
        // Check if car went off the road
        if(world && !world.isCarOnRoad(this)){
            this.damageType = 'off-road'; // Store damage type
            return true; // Car is off the road - this is damage/death
        }
        
        // Check collision with road borders
        for(let i=0;i<roadBorders.length;i++){
            if(polysIntersect(this.polygon,roadBorders[i])){
                this.damageType = 'collision';
                return true;
            }
        }
        
        // Check collision with other traffic
        for(let i=0;i<traffic.length;i++){
            if(polysIntersect(this.polygon,traffic[i].polygon)){
                this.damageType = 'collision';
                return true;
            }
        }
        
        this.damageType = null;
        return false;
    }

    #getAngleToTarget(world) {
        if (!world || !world.markings) return 0;
        
        // Find target marking
        const targetPoint = world.markings.find(m => m instanceof Target);
        if (!targetPoint) return 0;
        
        // Calculate angle from car to target
        const dx = targetPoint.center.x - this.x;
        const dy = targetPoint.center.y - this.y;
        const angleToTarget = Math.atan2(dy, dx);
        
        // Get car's current heading
        const carHeading = this.angle - Math.PI / 2; // Convert car angle to heading
        
        // Calculate relative angle difference
        let angleDiff = angleToTarget - carHeading;
        
        // Normalize to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Normalize to [-1, 1]
        return angleDiff / Math.PI;
    }

    // Public method to fetch current 5 sensor inputs (for visualization)
    getInputs() {
        if (!this.sensor || !this.sensor.readings) return [];
        return this.sensor.readings.map(
            s => s == null ? 1.0 : (1.0 - s.offset / this.sensor.rayLength)
        );
    }

    #createPolygon(){
        const points=[];
        const rad=Math.hypot(this.width,this.height)/2;
        const alpha=Math.atan2(this.width,this.height);
        points.push({
            x:this.x-Math.sin(this.angle-alpha)*rad,
            y:this.y-Math.cos(this.angle-alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(this.angle+alpha)*rad,
            y:this.y-Math.cos(this.angle+alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(Math.PI+this.angle-alpha)*rad,
            y:this.y-Math.cos(Math.PI+this.angle-alpha)*rad
        });
        points.push({
            x:this.x-Math.sin(Math.PI+this.angle+alpha)*rad,
            y:this.y-Math.cos(this.angle+alpha)*rad
        });
        return points;
    }

    #move(){
        if(this.controls.forward){
            this.speed+=this.acceleration;
        }
        if(this.controls.reverse){
            this.speed-=this.acceleration;
        }

        if(this.speed>this.maxSpeed){
            this.speed=this.maxSpeed;
        }
        if(this.speed<-this.maxSpeed/2){
            this.speed=-this.maxSpeed/2;
        }

        if(this.speed>0){
            this.speed-=this.friction;
        }
        if(this.speed<0){
            this.speed+=this.friction;
        }
        if(Math.abs(this.speed)<this.friction){
            this.speed=0;
        }

        if(this.speed!=0){
            const flip=this.speed>0?1:-1;
            if(this.controls.left){
                this.angle+=0.03*flip;
            }
            if(this.controls.right){
                this.angle-=0.03*flip;
            }
        }

        this.x-=Math.sin(this.angle)*this.speed;
        this.y-=Math.cos(this.angle)*this.speed;
    }

    draw(ctx,drawSensor=false){

        if(this.sensor && drawSensor){
            this.sensor.draw(ctx);
        }

        ctx.save();
        ctx.translate(this.x,this.y);
        ctx.rotate(-this.angle);
        if(!this.damaged){
            ctx.drawImage(this.mask,
                -this.width/2,
                -this.height/2,
                this.width,
                this.height);
            ctx.globalCompositeOperation="multiply";
        }
        ctx.drawImage(this.img,
            -this.width/2,
            -this.height/2,
            this.width,
            this.height);
        ctx.restore();
    }
}
