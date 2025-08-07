import { WorldState } from '../src/world.js';

describe('Movement System', () => {
    let worldState;
    let agent;
    let startPos;
    let endPos;

    beforeEach(() => {
        // Mock dependencies
        const mockScene = { add: jest.fn(), remove: jest.fn() };
        const mockUiState = { arePlumesVisible: true };
        const mockNarrativeManager = { logEvent: jest.fn() };
        document.body.innerHTML =
            '<input type="checkbox" id="casual-mode-checkbox">';
        const casualModeCheckbox = document.getElementById(
            'casual-mode-checkbox'
        );

        // Instantiate WorldState
        worldState = new WorldState(
            mockScene,
            mockUiState,
            mockNarrativeManager,
            true
        );

        // Add an agent to the world
        const region = worldState.regions[0];
        worldState.addAgent(region);
        agent = worldState.agents[0];

        // Define start and end positions for the test
        startPos = agent.mesh.position.clone();
        // Target a point on the opposite side of the globe
        endPos = startPos.clone().multiplyScalar(-1);
    });

    it('should calculate a path and activate the movement component when moveTo is called', () => {
        expect(agent.movement.isActive).to.be.false;
        expect(agent.movement.path.length).to.equal(0);
        expect(agent.status).to.equal('IDLE');

        agent.moveTo(endPos);

        expect(agent.movement.isActive).to.be.true;
        expect(agent.movement.path.length).to.be.greaterThan(1);
        expect(agent.status).to.equal('MOVING');
        // The first point in the path should be the start position
        expect(agent.movement.path[0].distanceTo(startPos)).to.be.closeTo(
            0,
            0.001
        );
    });

    it('should move the agent closer to the target after one second', () => {
        agent.moveTo(endPos);
        const initialDistance = agent.mesh.position.distanceTo(endPos);

        // Simulate one second of game time
        worldState.update(1.0);

        const newDistance = agent.mesh.position.distanceTo(endPos);

        expect(agent.mesh.position.equals(startPos)).to.be.false;
        expect(newDistance).to.be.lessThan(initialDistance);
    });

    it('should complete the path and stop moving', () => {
        agent.moveTo(endPos);

        // With the new physics engine, speed is not constant.
        // We need to simulate for long enough for the agent to accelerate and reach the target.
        // 30 seconds should be more than enough time.
        for (let i = 0; i < 30; i++) {
            // Only update if the agent is still moving
            if (agent.movement.isActive) {
                worldState.update(1.0);
            } else {
                break;
            }
        }

        expect(agent.movement.isActive).to.be.false;
        expect(agent.status).to.equal('IDLE');
        // The agent should be very close to the end position.
        // The arrival threshold in the movement component is 0.5.
        expect(agent.mesh.position.distanceTo(endPos)).to.be.lessThan(
            agent.movement.arrivalThreshold + 0.1
        );
    });
});
