const GAME_GRAVITY_CONSTANT = 1000; // Adjusted for game scale, not real-world physics

class PhysicsComponent {
    /**
     * @param {object} options - Configuration for the physics properties.
     * @param {number} options.mass - Mass of the unit.
     * @param {number} options.maxForce - Maximum force the unit's engine can apply.
     * @param {number} options.maxSpeed - Maximum speed the unit can travel at.
     * @param {number} options.frictionCoefficient - Friction for ground units.
     * @param {string} options.movementType - The type of physics to apply ('ground', 'air', 'orbital').
     */
    constructor(options = {}) {
        this.mass = options.mass || 1;
        this.maxForce = options.maxForce || 100;
        this.maxSpeed = options.maxSpeed || 5;
        this.frictionCoefficient = options.frictionCoefficient || 0.2;
        this.movementType = options.movementType || 'ground';

        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
    }

    /**
     * Applies a force to the object, affecting its acceleration.
     * @param {THREE.Vector3} force - The force vector to apply.
     */
    applyForce(force) {
        // F = ma -> a = F/m
        const accelerationDelta = force.clone().divideScalar(this.mass);
        this.acceleration.add(accelerationDelta);
    }

    /**
     * The main physics update loop.
     * @param {Unit} unit - The unit this component is attached to.
     * @param {number} dt - Delta time.
     */
    update(unit, dt) {
        switch (this.movementType) {
            case 'ground':
                this.updateGround(unit, dt);
                break;
            case 'orbital':
                this.updateOrbital(unit, dt);
                break;
            case 'air':
                // TODO: Implement air physics with drag, lift, etc.
                this.updateGround(unit, dt); // Fallback to ground for now
                break;
        }

        // Common physics update
        this.velocity.add(this.acceleration.clone().multiplyScalar(dt));

        // Clamp speed for non-orbital units
        if (this.movementType !== 'orbital') {
            if (this.velocity.lengthSq() > this.maxSpeed * this.maxSpeed) {
                this.velocity.normalize().multiplyScalar(this.maxSpeed);
            }
        }

        unit.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

        // Reset acceleration for the next frame
        this.acceleration.set(0, 0, 0);
    }

    updateGround(unit, dt) {
        // Apply friction
        if (this.velocity.lengthSq() > 0) {
            const friction = this.velocity.clone().multiplyScalar(-1).normalize();
            friction.multiplyScalar(this.frictionCoefficient);
            this.applyForce(friction);
        }
    }

    updateOrbital(unit, dt) {
        // Apply gravitational force towards the center of the world (0, 0, 0)
        const distanceSq = unit.mesh.position.lengthSq();
        if (distanceSq > 0) {
            const gravityMagnitude = GAME_GRAVITY_CONSTANT * this.mass / distanceSq;
            const gravityForce = unit.mesh.position.clone().normalize().multiplyScalar(-gravityMagnitude);
            this.applyForce(gravityForce);
        }
    }
}
