/**
 * @class Satellite
 * Represents a satellite asset in orbit around the planet.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class Satellite {
    /**
     * @param {object} options - Configuration for the satellite.
     * @param {string} options.id - The unique ID of the satellite.
     * @param {string} options.factionId - The ID of the faction that owns the satellite.
     * @param {THREE.Vector3} options.position - The initial position vector.
     * @param {THREE.Vector3} options.velocity - The initial velocity vector to achieve orbit.
     */
    constructor({ id, factionId, position, velocity }) {
        this.id = id;
        this.factionId = factionId;
        this.type = 'SATELLITE'; // For selection and identification

        // The 3D mesh for visualization
        const geometry = new THREE.OctahedronGeometry(0.15, 0);
        const material = new THREE.MeshPhongMaterial({ color: 0xcccccc, emissive: 0xaaaaaa });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.userData.satellite = this; // Link back to this object for raycasting

        // Physics properties for the UnifiedPhysicsEngine
        this.physics = {
            mass: 0.1, // Satellites are light
            velocity: velocity,
            acceleration: new THREE.Vector3(),
            movementType: 'orbital',
            applyForce: function(force) {
                const accelerationDelta = force.clone().divideScalar(this.mass);
                this.acceleration.add(accelerationDelta);
            }
        };

        // Orbital parameters (can be calculated and updated by the physics engine)
        this.orbit = {
            semiMajorAxis: this.mesh.position.length(),
            eccentricity: 0, // Assuming circular for now
            inclination: 0,
            period: 0
        };
    }

    // Satellites don't have a complex update loop of their own;
    // their state is managed entirely by the UnifiedPhysicsEngine.
    update(dt) {
        // The physics engine handles all movement.
        // We could update other things here in the future, like energy consumption.
    }
}
