import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@25.0.0/dist/tween.esm.js';

export class MovementComponent {
    constructor(options = {}) {
        // The speed property is now effectively replaced by the PhysicsComponent's maxSpeed and maxForce.
        // We might keep a 'desiredSpeed' factor here in the future.
        this.movementType = options.movementType || 'GROUND'; // e.g., GROUND, AIR, NAVAL
        this.path = []; // An array of THREE.Vector3 points
        this.currentTargetIndex = 0;
        this.isActive = false;
        this.arrivalThreshold = 0.5; // How close we need to be to a waypoint
    }

    setPath(path) {
        this.path = path;
        this.currentTargetIndex = 0; // Start moving towards the first point in the path
        this.isActive = this.path && this.path.length > 0;
    }

    stop() {
        this.isActive = false;
        this.path = [];
        this.currentTargetIndex = 0;
    }

    /**
     * The main update loop for movement. This now calculates forces instead of directly moving the entity.
     * @param {Unit} unit - The unit being moved. It MUST have a .physics property.
     * @param {number} dt - Delta time.
     */
    update(unit, dt) {
        if (!this.isActive || !unit.physics) {
            this.stop();
            return;
        }

        const targetPosition = this.path[this.currentTargetIndex];
        if (!targetPosition) {
            this.stop();
            return;
        }

        const distanceToTarget = unit.mesh.position.distanceTo(targetPosition);

        if (distanceToTarget < this.arrivalThreshold) {
            this.currentTargetIndex++;
            if (this.currentTargetIndex >= this.path.length) {
                this.stop();
                // Optionally apply a braking force
                const brakingForce = unit.physics.velocity.clone().multiplyScalar(-unit.physics.maxForce);
                unit.physics.applyForce(brakingForce);
                return;
            }
        }

        // Calculate the steering force to seek the target
        const steeringForce = this.seek(unit, targetPosition);
        unit.physics.applyForce(steeringForce);

        // Optional: Make the entity look where it's going (in the direction of velocity)
        if (unit.physics.velocity.lengthSq() > 0.01) {
            const lookAtTarget = unit.mesh.position.clone().add(unit.physics.velocity);
            unit.mesh.lookAt(lookAtTarget);
        }
    }

    /**
     * Calculates the steering force required to seek a target position.
     * @param {Unit} unit The unit seeking the target.
     * @param {THREE.Vector3} target The position to seek.
     * @returns {THREE.Vector3} The calculated steering force.
     */
    seek(unit, target) {
        const physics = unit.physics;

        // 1. Calculate desired velocity: a vector pointing from us to the target, with a magnitude of maxSpeed.
        const desiredVelocity = new THREE.Vector3().subVectors(target, unit.mesh.position);
        desiredVelocity.normalize().multiplyScalar(physics.maxSpeed);

        // 2. Calculate steering force: desired velocity - current velocity.
        const steeringForce = new THREE.Vector3().subVectors(desiredVelocity, physics.velocity);

        // 3. Clamp the steering force to the maximum force the unit can apply.
        if (steeringForce.lengthSq() > physics.maxForce * physics.maxForce) {
            steeringForce.normalize().multiplyScalar(physics.maxForce);
        }

        return steeringForce;
    }
}
