/**
 * @file This file defines the actions available to the GOAP AI.
 * Each action has a name, a cost, preconditions, and effects.
 */

export const AI_ACTIONS = [
    {
        name: 'generate_real_threat',
        cost: 1, // A* cost, can be more sophisticated
        preconditions: {
            hasEnoughResources: true,
        },
        effects: {
            playerIsWeaker: true,
        },
        /**
         * The run method is what the AI executes.
         * @param {WorldState} worldState - The current world state.
         * @returns {boolean} - True if the action was successful.
         */
        run: (worldState) => {
            const cost = { funds: 1000, tech: 500 };
            if (worldState.aiFaction.canAfford(cost)) {
                worldState.aiFaction.spend(cost);
                worldState.generateThreat({ isFromAI: true, type: 'REAL' });
                return true;
            }
            return false;
        },
    },
    {
        name: 'generate_fake_threat',
        cost: 1,
        preconditions: {
            hasEnoughResources: true,
        },
        effects: {
            playerIsDistracted: true,
        },
        run: (worldState) => {
            const cost = { funds: 500, intel: 200 }; // Fake threats are cheaper
            if (worldState.aiFaction.canAfford(cost)) {
                worldState.aiFaction.spend(cost);
                worldState.generateThreat({ isFromAI: true, type: 'FAKE' });
                return true;
            }
            return false;
        },
    },
    {
        name: 'claim_neutral_region',
        cost: 1,
        preconditions: {
            hasEnoughResources: true,
            neutralRegionExists: true,
        },
        effects: {
            aiHasMoreTerritory: true,
        },
        run: (worldState) => {
            const cost = { funds: 1500 };
            if (!worldState.aiFaction.canAfford(cost)) {
                return false;
            }

            const claimableRegions = worldState.regions.filter((r) => {
                if (r.owner !== 'NEUTRAL') return false;
                return worldState.travelRoutes.some(
                    (route) =>
                        (route.from.owner === worldState.aiFaction.id &&
                            route.to === r) ||
                        (route.to.owner === worldState.aiFaction.id &&
                            route.from === r)
                );
            });

            if (claimableRegions.length > 0) {
                worldState.aiFaction.spend(cost);
                const targetRegion = claimableRegions[0];
                targetRegion.setOwner(worldState.aiFaction.id);
                worldState.narrativeManager.logEvent('REGION_CLAIMED', {
                    faction: worldState.aiFaction.name,
                    region: targetRegion.name,
                });
                return true;
            }
            return false;
        },
    },
    {
        name: 'build_base',
        cost: 1,
        preconditions: {
            hasEnoughResources: true,
            unfortifiedRegionExists: true,
        },
        effects: {
            aiTerritoryIsStronger: true,
        },
        run: (worldState) => {
            const cost = { funds: 1000 };
            if (!worldState.aiFaction.canAfford(cost)) {
                return false;
            }

            const unfortifiedRegions = worldState.regions.filter(
                (r) =>
                    r.owner === worldState.aiFaction.id &&
                    !worldState.buildings.some(
                        (b) => b.region === r && b.type === 'BASE'
                    )
            );

            if (unfortifiedRegions.length > 0) {
                worldState.aiFaction.spend(cost);
                worldState.addBuilding(
                    unfortifiedRegions[0],
                    'BASE',
                    worldState.aiFaction
                );
                return true;
            }
            return false;
        },
    },
    {
        name: 'generate_ransomware_threat',
        cost: 1,
        preconditions: {
            hasEnoughResources: true,
        },
        effects: {
            playerIsWeaker: true,
        },
        run: (worldState) => {
            const cost = { funds: 1200, tech: 800 }; // More expensive
            if (worldState.aiFaction.canAfford(cost)) {
                worldState.aiFaction.spend(cost);
                worldState.generateThreat({
                    isFromAI: true,
                    domain: 'CYBER',
                    subType: 'RANSOMWARE',
                    type: 'REAL',
                });
                return true;
            }
            return false;
        },
    },
];
