import { GOAPPlanner } from '../goap.js';
import { AI_ACTIONS } from '../ai_actions.js';

export class AIManager {
    constructor(aiFaction, casualMode) {
        this.aiFaction = aiFaction;
        this.casualMode = casualMode;
        this.planner = new GOAPPlanner();
        this.aiGoal = null;
        this.aiAlertLevel = 0;
        this.threatGenerationTimer = 0;
        this.threatGenerationInterval = 3;
    }

    update(dt, worldState) {
        this.updateAIAlertLevel(worldState);
        this.updateAIFaction(dt, worldState);
    }

    updateAIAlertLevel(worldState) {
        const mitigatedThreats = worldState.threatManager.threats.filter(
            (t) => t.wasMitigatedByPlayer
        ).length;
        const playerRegions = worldState.regionManager.regions.filter(
            (r) => r.owner === 'PLAYER'
        ).length;
        const alertScore = mitigatedThreats + playerRegions * 2;

        if (alertScore > 10) {
            this.aiAlertLevel = 2; // High
            this.threatGenerationInterval = this.casualMode ? 2 : 1;
        } else if (alertScore > 5) {
            this.aiAlertLevel = 1; // Medium
            this.threatGenerationInterval = this.casualMode ? 4 : 2;
        } else {
            this.aiAlertLevel = 0; // Low
            this.threatGenerationInterval = this.casualMode ? 6 : 3;
        }
    }

    updateAIFaction(dt, worldState) {
        const ai = this.aiFaction;
        if (!ai) return;

        ai.decisionTimer = (ai.decisionTimer || 0) + dt;
        if (ai.decisionTimer < 5) {
            // Make a decision every 5 seconds
            return;
        }
        ai.decisionTimer = 0;

        // 1. Define Goals
        const goals = [
            {
                id: 'weaken_player',
                goal: { playerIsWeaker: true },
                priority: this.aiAlertLevel * 2,
            },
            {
                id: 'expand_territory',
                goal: { aiHasMoreTerritory: true },
                priority: 1,
            },
            {
                id: 'strengthen_territory',
                goal: { aiTerritoryIsStronger: true },
                priority: 1,
            },
            {
                id: 'distract_player',
                goal: { playerIsDistracted: true },
                priority: 0.5,
            },
        ];

        // 2. Build World State for Planner
        const plannerWorldState = {
            hasEnoughResources: ai.resources.funds > 2000,
            neutralRegionExists: worldState.regionManager.regions.some(
                (r) => r.owner === 'NEUTRAL'
            ),
            unfortifiedRegionExists: worldState.regionManager.regions.some(
                (r) =>
                    r.owner === ai.id &&
                    !worldState.buildingManager.buildings.some(
                        (b) => b.region === r && b.type === 'BASE'
                    )
            ),
            aiHasMoreTerritory:
                worldState.regionManager.regions.filter(
                    (r) => r.owner === ai.id
                ).length >
                worldState.regionManager.regions.filter(
                    (r) =>
                        r.owner === worldState.factionManager.playerFaction.id
                ).length,
            aiTerritoryIsStronger: !worldState.regionManager.regions.some(
                (r) =>
                    r.owner === ai.id &&
                    !worldState.buildingManager.buildings.some(
                        (b) => b.region === r && b.type === 'BASE'
                    )
            ),
        };

        // 3. Select Goal and Plan
        goals.sort((a, b) => b.priority - a.priority);

        for (const g of goals) {
            const plan = this.planner.plan(
                plannerWorldState,
                AI_ACTIONS,
                g.goal
            );

            if (plan && plan.length > 0) {
                const actionToExecute = plan[0];
                actionToExecute.run(worldState);
                return;
            }
        }
    }
}
