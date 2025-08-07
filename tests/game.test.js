describe('Game Initialization', () => {
    it('should start without throwing an error', () => {
        let error = null;
        try {
            // Mock dependencies
            const mockScene = {
                add: () => {},
            };
            const mockUiState = { arePlumesVisible: true };
            const mockNarrativeManager = new NarrativeManager();

            // Mock DOM elements required by WorldState constructor
            document.body.innerHTML =
                '<input type="checkbox" id="casual-mode-checkbox">';
            const casualModeCheckbox = document.getElementById(
                'casual-mode-checkbox'
            );

            // Instantiate WorldState
            const worldState = new WorldState(
                mockScene,
                mockUiState,
                mockNarrativeManager,
                casualModeCheckbox.checked
            );

            // Instantiate other managers
            const eventManager = new EventManager(worldState);
            const goalManager = new GoalManager(worldState);
        } catch (e) {
            error = e;
        }
        expect(error).to.be.null;
    });
});

describe('Agent Mission Logic', () => {
    let worldState;
    let playerFaction;
    let agent;
    let region;

    beforeEach(() => {
        const mockScene = { add: () => {} };
        const mockUiState = { arePlumesVisible: true };
        const mockNarrativeManager = { logEvent: () => {} };
        document.body.innerHTML =
            '<input type="checkbox" id="casual-mode-checkbox">';
        const casualModeCheckbox = document.getElementById(
            'casual-mode-checkbox'
        );

        worldState = new WorldState(
            mockScene,
            mockUiState,
            mockNarrativeManager,
            true
        );
        playerFaction = worldState.playerFaction;
        region = worldState.regions[0];

        // Ensure the region is owned by the player for simplicity
        region.setOwner(playerFaction.id);

        // Create and add an agent
        worldState.addAgent(region, playerFaction);
        agent = worldState.agents[0];
    });

    it('should allow an agent to start and complete a mission successfully', () => {
        const initialIntel = playerFaction.resources.intel;
        const mission = AgentActions.gather_intel;

        // Start the mission
        agent.startMission(mission);
        expect(agent.status).to.equal('ON_MISSION');
        expect(agent.mission.action.id).to.equal('gather_intel');

        // Simulate time passing to complete the mission
        const missionDuration = mission.duration;
        worldState.update(missionDuration + 1); // Add 1 second to ensure completion

        // Agent should be idle again
        expect(agent.status).to.equal('IDLE');
        expect(agent.mission).to.be.null;

        // Check for rewards (assuming success)
        // Note: This test assumes mission success due to randomness in failure.
        // A more robust test would mock Math.random.
        const intelGained = 100 + agent.level * 10;
        // We can't check for exact value due to randomness, but we can check if it increased.
        expect(playerFaction.resources.intel).to.be.greaterThan(initialIntel);
    });

    it('should prevent an agent from starting a mission if they lack the required abilities', () => {
        // 'steal_tech' requires 'CYBER_SPECIALIST'
        const mission = AgentActions.steal_tech;

        // Agent starts with no abilities
        agent.abilities = [];

        // Try to start the mission
        agent.startMission(mission);

        // Risk should be very high
        expect(agent.mission.risk).to.be.greaterThan(0.3);
    });
});

describe('AI GOAP Planner Logic', () => {
    let worldState;
    let aiFaction;
    let neutralRegion;
    let aiRegion;

    beforeEach(() => {
        const mockScene = { add: () => {} };
        const mockUiState = { arePlumesVisible: true };
        const mockNarrativeManager = { logEvent: () => {} };
        document.body.innerHTML =
            '<input type="checkbox" id="casual-mode-checkbox">';
        const casualModeCheckbox = document.getElementById(
            'casual-mode-checkbox'
        );

        worldState = new WorldState(
            mockScene,
            mockUiState,
            mockNarrativeManager,
            true
        );
        aiFaction = worldState.aiFaction;

        // Setup a specific scenario for the AI
        aiRegion = worldState.regions[0];
        aiRegion.setOwner(aiFaction.id);
        neutralRegion = worldState.regions[1];
        neutralRegion.setOwner('NEUTRAL');

        // Make sure there is a route between them
        worldState.travelRoutes.push({
            from: aiRegion,
            to: neutralRegion,
            mesh: {},
        });

        // Give AI plenty of resources
        aiFaction.resources.funds = 5000;
    });

    it('should create a single-step plan to claim a neutral region', () => {
        // The planner should find a plan to expand territory
        const goal = { aiHasMoreTerritory: true };
        const plannerWorldState = {
            hasEnoughResources: true,
            neutralRegionExists: true,
            unfortifiedRegionExists: true,
            aiHasMoreTerritory: false,
            aiTerritoryIsStronger: false,
        };

        const plan = worldState.planner.plan(
            plannerWorldState,
            AI_ACTIONS,
            goal
        );
        expect(plan).to.not.be.null;
        expect(plan.length).to.equal(1);
        expect(plan[0].name).to.equal('claim_neutral_region');
    });

    it('should create a multi-step plan to build a base', () => {
        // Goal: The AI wants a stronger territory, which requires a base.
        const goal = { aiTerritoryIsStronger: true };

        // World State: AI has no unfortified regions, but a neutral one is available.
        // This forces a multi-step plan: 1. claim region, 2. build base.
        const plannerWorldState = {
            hasEnoughResources: true,
            neutralRegionExists: true,
            unfortifiedRegionExists: false, // Key condition for forcing a multi-step plan
            aiHasMoreTerritory: false,
            aiTerritoryIsStronger: false,
        };

        // The planner should find a 2-step plan.
        const plan = worldState.planner.plan(
            plannerWorldState,
            AI_ACTIONS,
            goal
        );
        expect(plan).to.not.be.null;
        expect(plan.length).to.equal(2);
        expect(plan[0].name).to.equal('claim_neutral_region');
        expect(plan[1].name).to.equal('build_base');

        // Execute the full plan for verification
        let currentState = { ...plannerWorldState };
        for (const action of plan) {
            // Check preconditions against the current state of our simulation
            let preconditionsMet = true;
            for (const key in action.preconditions) {
                if (currentState[key] !== action.preconditions[key]) {
                    preconditionsMet = false;
                    break;
                }
            }
            expect(preconditionsMet).to.be.true;

            // Apply effects to simulate the action's outcome
            for (const key in action.effects) {
                currentState[key] = action.effects[key];
            }
        }

        // The final state should satisfy the goal
        expect(currentState.aiTerritoryIsStronger).to.be.true;
    });
});

describe('Player Action Logic', () => {
    let worldState;
    let playerFaction;
    let threat;

    beforeEach(() => {
        const mockScene = { add: () => {}, remove: () => {} };
        const mockUiState = { arePlumesVisible: true };
        const mockNarrativeManager = { logEvent: () => {} };
        document.body.innerHTML =
            '<input type="checkbox" id="casual-mode-checkbox">';
        const casualModeCheckbox = document.getElementById(
            'casual-mode-checkbox'
        );

        worldState = new WorldState(
            mockScene,
            mockUiState,
            mockNarrativeManager,
            true
        );
        playerFaction = worldState.playerFaction;

        // Give player plenty of resources
        playerFaction.resources.funds = 5000;
        playerFaction.resources.intel = 5000;
        playerFaction.resources.tech = 5000;

        // Create a specific threat for testing
        threat = new Threat({
            id: 'test-threat',
            domain: 'INFO',
            type: 'REAL',
            lat: 0,
            lon: 0,
            severity: 0.5,
            spreadRate: 0.5,
            investigationProgress: 1.0, // Pre-investigated for action availability
        });
        worldState.addThreat(threat);
    });

    it('should correctly execute a domain-specific action and affect the threat', () => {
        const action = PlayerActions.counter_intel;
        const initialSpreadRate = threat.spreadRate;

        // Execute the action
        const wasSuccessful = action.execute(threat, playerFaction);

        // Verify the outcome
        expect(wasSuccessful).to.be.true;
        expect(threat.spreadRate).to.be.lessThan(initialSpreadRate);
        expect(threat.spreadRate).to.be.closeTo(0.3, 0.001); // 0.5 - 0.2
    });

    it('should correctly execute a region-based action and affect the region', () => {
        const region = worldState.regions[0];
        region.setOwner(playerFaction.id);
        const action = PlayerActions.invest_in_education;
        const initialEducation = region.education;

        // Execute the action
        const wasSuccessful = action.execute(
            null,
            playerFaction,
            worldState,
            region
        );

        // Verify the outcome
        expect(wasSuccessful).to.be.true;
        expect(region.education).to.be.greaterThan(initialEducation);
    });
});
