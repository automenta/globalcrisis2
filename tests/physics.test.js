import { WorldState } from '../src/world.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

describe('Unified Physics Engine', () => {
    let worldState;
    let physicsEngine;

    beforeEach(() => {
        // Mock dependencies
        const mockScene = { add: jest.fn(), remove: jest.fn() };
        const mockUiState = { arePlumesVisible: true };
        const mockNarrativeManager = { logEvent: jest.fn() };
        document.body.innerHTML = '<input type="checkbox" id="casual-mode-checkbox">';

        worldState = new WorldState(mockScene, mockUiState, mockNarrativeManager, true);
        physicsEngine = worldState.physicsEngine;
    });

    describe('Unit Physics', () => {
        it('should accelerate a unit when a force is applied', () => {
            const region = worldState.regions[0];
            worldState.addUnit(region, 'GROUND_VEHICLE');
            const unit = worldState.units[0];

            expect(unit.physics.velocity.length()).to.equal(0);

            // Apply a constant force for 1 second
            const force = new THREE.Vector3(1, 0, 0).multiplyScalar(unit.physics.maxForce);
            unit.physics.applyForce(force);

            // Update the engine
            physicsEngine.update(1.0, worldState);

            // The velocity should now be greater than zero
            expect(unit.physics.velocity.length()).to.be.greaterThan(0);
        });

        it('should not exceed maxSpeed', () => {
            const region = worldState.regions[0];
            worldState.addUnit(region, 'GROUND_VEHICLE');
            const unit = worldState.units[0];
            const force = new THREE.Vector3(1, 0, 0).multiplyScalar(unit.physics.maxForce);

            // Apply force for several seconds to ensure max speed is reached
            for (let i = 0; i < 5; i++) {
                unit.physics.applyForce(force.clone());
                physicsEngine.update(1.0, worldState);
            }

            // The velocity should be very close to, but not over, the maxSpeed
            expect(unit.physics.velocity.length()).to.be.lessThanOrEqual(unit.physics.maxSpeed + 0.001);
        });
    });

    describe('Satellite Physics', () => {
        it('should maintain a relatively stable orbital distance', () => {
            // Launch a satellite
            worldState.launchSatellite(worldState.playerFaction);
            const satellite = worldState.satellites[0];
            const initialDistance = satellite.mesh.position.length();

            // Simulate for a few orbits
            // A full orbit might take a while, let's simulate for 50 seconds
            for (let i = 0; i < 50; i++) {
                physicsEngine.update(1.0, worldState);
            }

            const finalDistance = satellite.mesh.position.length();

            // For a stable circular orbit, the distance from the center should not change much.
            // We'll allow for a small tolerance due to numerical integration.
            expect(finalDistance).to.be.closeTo(initialDistance, 0.5); // Use a tolerance of 0 decimal places, so +/- 0.5
        });

        it('should have a different position after one second', () => {
            worldState.launchSatellite(worldState.playerFaction);
            const satellite = worldState.satellites[0];
            const initialPosition = satellite.mesh.position.clone();

            physicsEngine.update(1.0, worldState);

            const finalPosition = satellite.mesh.position;

            expect(finalPosition.equals(initialPosition)).to.be.false;
        });
    });
});
