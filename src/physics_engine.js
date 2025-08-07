/**
 * @class UnifiedPhysicsEngine
 * A centralized engine to handle all physics-based simulations in the game,
 * from Newtonian movement of units to orbital mechanics of satellites and
 * exotic cross-domain effects.
 */
import { GAME_GRAVITY_CONSTANT } from './constants.js';

export class UnifiedPhysicsEngine {
    constructor() {
        // Constants can be defined here, e.g., G for gravity
        this.G = 6.6743e-11; // Gravitational constant
        this.EARTH_MASS = 5.972e24; // kg
    }

    /**
     * The main update loop for the physics engine.
     * @param {number} dt - Delta time in seconds.
     * @param {WorldState} worldState - The entire state of the game world.
     */
    update(dt, worldState) {
        // Update all standard units
        worldState.units.forEach((unit) => {
            if (
                unit.physics.movementType === 'ground' ||
                unit.physics.movementType === 'air'
            ) {
                this.applyUnitPhysics(unit, dt, worldState);
            }
        });

        // Update all satellites
        worldState.satellites.forEach((satellite) => {
            this.applySatellitePhysics(satellite, dt);
        });
    }

    /**
     * Applies Newtonian physics to a single unit for one frame.
     * @param {Unit} unit The unit to update.
     * @param {number} dt Delta time.
     * @param {WorldState} worldState The state of the world for context (e.g., terrain).
     */
    applyUnitPhysics(unit, dt) {
        const physics = unit.physics;

        // Apply central gravity
        const distanceSq = unit.position.lengthSq();
        if (distanceSq > 0) {
            const gravityMagnitude = (GAME_GRAVITY_CONSTANT * physics.mass) / distanceSq;
            const gravityForce = unit.position.clone().normalize().multiplyScalar(-gravityMagnitude);
            physics.applyForce(gravityForce);
        }

        // Apply friction
        if (physics.velocity.lengthSq() > 0) {
            const friction = physics.velocity
                .clone()
                .multiplyScalar(-1)
                .normalize();
            friction.multiplyScalar(physics.frictionCoefficient);
            physics.applyForce(friction);
        }

        // TODO: Add terrain resistance based on voxel material under the unit

        // Update velocity from acceleration
        physics.velocity.add(physics.acceleration.clone().multiplyScalar(dt));

        // Clamp speed
        if (physics.velocity.lengthSq() > physics.maxSpeed * physics.maxSpeed) {
            physics.velocity.normalize().multiplyScalar(physics.maxSpeed);
        }

        // Update position
        unit.position.add(physics.velocity.clone().multiplyScalar(dt));

        // Reset acceleration for the next frame
        physics.acceleration.set(0, 0, 0);
    }

    /**
     * Applies orbital mechanics to a satellite.
     * @param {Unit} satellite The satellite unit to update.
     * @param {number} dt Delta time.
     */
    applySatellitePhysics(satellite, dt) {
        const physics = satellite.physics;

        // Apply gravitational force towards the center of the world (0, 0, 0)
        const distanceSq = satellite.position.lengthSq();
        if (distanceSq > 0) {
            const gravityMagnitude =
                (GAME_GRAVITY_CONSTANT * physics.mass) / distanceSq;
            const gravityForce = satellite.position
                .clone()
                .normalize()
                .multiplyScalar(-gravityMagnitude);
            physics.applyForce(gravityForce);
        }

        // Update velocity from acceleration
        physics.velocity.add(physics.acceleration.clone().multiplyScalar(dt));

        // Update position
        satellite.position.add(
            physics.velocity.clone().multiplyScalar(dt)
        );

        // Reset acceleration for the next frame
        physics.acceleration.set(0, 0, 0);
    }
}
