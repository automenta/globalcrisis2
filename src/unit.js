import * as THREE from 'three';
import { MovementComponent } from './movement_component.js';
import { GAME_GRAVITY_CONSTANT } from './constants.js';

export class Unit {
    constructor({ region, type }) {
        this.region = region;
        this.type = type;
        this.mesh = this.createMesh(); // Create mesh first to get position
        this.mesh.userData.unit = this;

        // Sensor Range
        this.baseSensorRange =
            this.type === 'AIRCRAFT' || this.type === 'SATELLITE' ? 150 : 50;
        this.sensorRange = this.baseSensorRange;

        // --- NEW: Physics and Movement Component Setup ---
        let physicsOptions;
        switch (this.type) {
            case 'QUANTUM_NODE':
                physicsOptions = {
                    mass: 10,
                    movementType: 'static', // Quantum nodes are stationary
                };
                break;
            case 'RAD_DISPERSAL':
                physicsOptions = {
                    mass: 2,
                    maxSpeed: 1.0,
                    maxForce: 8,
                    frictionCoefficient: 0.3,
                    movementType: 'ground',
                };
                break;
            case 'DRONE':
                physicsOptions = {
                    mass: 0.2,
                    maxSpeed: 8,
                    maxForce: 15,
                    frictionCoefficient: 0.1,
                    movementType: 'air',
                };
                break;
            case 'AUTONOMOUS_GROUND':
                physicsOptions = {
                    mass: 4,
                    maxSpeed: 2.0,
                    maxForce: 12,
                    frictionCoefficient: 0.4,
                    movementType: 'ground',
                };
                break;
            case 'ROBOTIC_SWARM':
                physicsOptions = {
                    mass: 10, // The mass of the whole swarm
                    maxSpeed: 5,
                    maxForce: 25,
                    frictionCoefficient: 0.2,
                    movementType: 'air',
                };
                break;
            case 'GROUND_VEHICLE':
                physicsOptions = {
                    mass: 5,
                    maxSpeed: 1.5,
                    maxForce: 10,
                    frictionCoefficient: 0.5,
                    movementType: 'ground',
                };
                break;
            case 'AIRCRAFT':
                physicsOptions = {
                    mass: 0.5,
                    maxSpeed: 10,
                    maxForce: 20,
                    frictionCoefficient: 0.1, // Represents air drag
                    movementType: 'air',
                };
                break;
            case 'SATELLITE':
                physicsOptions = {
                    mass: 0.1,
                    movementType: 'orbital',
                };
                break;
            case 'AGENT':
            default:
                physicsOptions = {
                    mass: 1,
                    maxSpeed: 2,
                    maxForce: 5,
                    frictionCoefficient: 0.3,
                    movementType: 'ground',
                };
                break;
        }

        this.physics = {
            ...physicsOptions,
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            applyForce: function (force) {
                const accelerationDelta = force.clone().divideScalar(this.mass);
                this.acceleration.add(accelerationDelta);
            },
        };
        this.movement = new MovementComponent();
        this.status = 'IDLE';

        // Special case for satellite initial velocity to achieve orbit
        if (this.type === 'SATELLITE') {
            const spawnRadius = this.mesh.position.length();
            // v = sqrt(GM/r) -> simplified to sqrt(GAME_GRAVITY_CONSTANT / r)
            const orbitalSpeed = Math.sqrt(GAME_GRAVITY_CONSTANT / spawnRadius);
            // Give it a velocity perpendicular to its position vector
            const initialVelocity = new THREE.Vector3(
                -this.mesh.position.z,
                0,
                this.mesh.position.x
            ).normalize();
            initialVelocity.multiplyScalar(orbitalSpeed);
            this.physics.velocity.copy(initialVelocity);
        }
    }

    createMesh() {
        let geometry;
        let spawnRadius;

        switch (this.type) {
            case 'QUANTUM_NODE':
                geometry = new THREE.TorusKnotGeometry(0.2, 0.05, 100, 16);
                spawnRadius = 63.5;
                break;
            case 'RAD_DISPERSAL':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
                spawnRadius = 63.5;
                break;
            case 'DRONE':
                geometry = new THREE.SphereGeometry(0.1, 8, 8);
                spawnRadius = 70;
                break;
            case 'AUTONOMOUS_GROUND':
                geometry = new THREE.BoxGeometry(0.4, 0.2, 0.3);
                spawnRadius = 63.5;
                break;
            case 'ROBOTIC_SWARM':
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                spawnRadius = 70;
                break;
            case 'GROUND_VEHICLE':
                geometry = new THREE.BoxGeometry(0.3, 0.1, 0.2);
                spawnRadius = 63.5;
                break;
            case 'AIRCRAFT':
                geometry = new THREE.TetrahedronGeometry(0.2, 0);
                spawnRadius = 70; // Spawn higher up
                break;
            case 'SATELLITE':
                geometry = new THREE.OctahedronGeometry(0.15, 0);
                spawnRadius = 80; // Spawn in "orbit"
                break;
            case 'AGENT':
            default:
                geometry = new THREE.ConeGeometry(0.1, 0.4, 8);
                spawnRadius = 63.5; // Spawn on the ground
                break;
        }

        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);

        const [lat, lon] = this.region.centroid;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(spawnRadius * Math.sin(phi) * Math.cos(theta));
        const z = spawnRadius * Math.sin(phi) * Math.sin(theta);
        const y = spawnRadius * Math.cos(phi);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);

        return mesh;
    }

    moveTo(targetPoint, worldState) {
        if (this.physics.movementType === 'orbital') {
            console.log('Satellites cannot be moved directly.');
            return;
        }
        const path = worldState.pathfindingService.calculatePath(
            this.mesh.position,
            targetPoint,
            this.physics.movementType
        );
        this.movement.setPath(path);
        this.status = 'MOVING';
    }

    update(dt, worldState) {
        // --- Weather Effects ---
        const { chunkCoord } = worldState.voxelWorld.worldToVoxel(
            this.mesh.position.x,
            this.mesh.position.y,
            this.mesh.position.z
        );
        const chunk = worldState.voxelWorld.getChunk(
            chunkCoord.x,
            chunkCoord.y,
            chunkCoord.z
        );

        if (chunk && chunk.weather) {
            const weather = chunk.weather;

            // Apply movement penalty as drag
            if (weather.movementPenalty > 0) {
                const dragForce = this.physics.velocity
                    .clone()
                    .multiplyScalar(-weather.movementPenalty);
                this.physics.applyForce(dragForce);
            }

            // Apply visibility modifier
            this.sensorRange =
                this.baseSensorRange * (1 - weather.visibilityModifier);
        } else {
            // Reset sensor range if no weather
            this.sensorRange = this.baseSensorRange;
        }

        // For non-orbital units, allow steering
        if (this.physics.movementType !== 'orbital' && this.movement.isActive) {
            this.movement.update(this, dt, worldState);
        }

        // The UnifiedPhysicsEngine now handles the physics update.
        // this.physics.update(this, dt);

        // Update status if movement is complete
        if (this.status === 'MOVING' && !this.movement.isActive) {
            this.status = 'IDLE';
            // TODO: Update unit's current region based on its new position
        }

        // Keep ground units on the surface of the sphere
        if (this.physics.movementType === 'ground') {
            const surfaceRadius = 63;
            if (this.mesh.position.length() < surfaceRadius) {
                this.mesh.position.normalize().multiplyScalar(surfaceRadius);
                const surfaceNormal = this.mesh.position.clone().normalize();
                const downwardVelocity =
                    this.physics.velocity.dot(surfaceNormal);
                if (downwardVelocity < 0) {
                    this.physics.velocity.sub(
                        surfaceNormal.multiplyScalar(downwardVelocity)
                    );
                }
            }
        }
    }
}
