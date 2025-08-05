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
        document.body.innerHTML = '<input type="checkbox" id="casual-mode-checkbox">';
        const casualModeCheckbox = document.getElementById('casual-mode-checkbox');

        // Instantiate WorldState
        worldState = new WorldState(mockScene, mockUiState, mockNarrativeManager, true);

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
        expect(agent.movement.isActive).toBe(false);
        expect(agent.movement.path.length).toBe(0);
        expect(agent.status).toBe('IDLE');

        agent.moveTo(endPos);

        expect(agent.movement.isActive).toBe(true);
        expect(agent.movement.path.length).toBeGreaterThan(1);
        expect(agent.status).toBe('MOVING');
        // The first point in the path should be the start position
        expect(agent.movement.path[0].distanceTo(startPos)).toBeCloseTo(0);
    });

    it('should move the agent closer to the target after one second', () => {
        agent.moveTo(endPos);
        const initialDistance = agent.mesh.position.distanceTo(endPos);

        // Simulate one second of game time
        worldState.update(1.0);

        const newDistance = agent.mesh.position.distanceTo(endPos);

        expect(agent.mesh.position.equals(startPos)).toBe(false);
        expect(newDistance).toBeLessThan(initialDistance);
    });

    it('should complete the path and stop moving', () => {
        agent.moveTo(endPos);

        // Agent's speed is 2.0 units/sec. The path is ~10 units long.
        // So it should take about 5 seconds. We'll simulate for 10 to be safe.
        for (let i = 0; i < 10; i++) {
            worldState.update(1.0);
        }

        expect(agent.movement.isActive).toBe(false);
        expect(agent.status).toBe('IDLE');
        // The agent should be very close to the end position
        expect(agent.mesh.position.distanceTo(endPos)).toBeLessThan(0.1);
    });
});
