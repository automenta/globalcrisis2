import { Faction } from '../faction.js';

export class FactionManager {
    constructor(casualMode) {
        this.factions = [];
        this.playerFaction = null;
        this.aiFaction = null;
        this.initializeFactions(casualMode);
    }

    initializeFactions(casualMode) {
        // Player Faction
        const playerResources = {
            funds: casualMode ? 20000 : 10000,
            intel: casualMode ? 10000 : 5000,
            tech: casualMode ? 4000 : 2000,
        };
        this.playerFaction = new Faction({
            id: 'mitigators',
            name: 'Hero Mitigators',
            resources: playerResources,
            capabilities: {
                investigation: true,
                radiologicalContainment: true,
                quantumOperations: true,
                whistleblowerNetworks: true,
            },
        });
        this.factions.push(this.playerFaction);

        // AI Faction
        this.aiFaction = new Faction({
            id: 'technocrats',
            name: 'Evil Technocrats',
            resources: {
                funds: 20000,
                intel: 10000,
                tech: 10000,
            },
            capabilities: {
                threatDeployment: true,
                roboticCommand: true,
                cyberOperations: true,
                aiAssistedDesign: true,
            },
        });
        if (casualMode) {
            this.aiFaction.counterIntel = 0.05; // Lower base counter-intel
        }
        this.factions.push(this.aiFaction);
    }

    update(dt, worldState) {
        // Resource trickle for all factions
        this.factions.forEach((f) => {
            let resourceMultiplier = 1;
            // If the AI is getting more aggressive due to Singularity research, boost its income
            if (
                f.id === 'technocrats' &&
                worldState.research.singularity_1_complete
            ) {
                if (worldState.research.singularity_3_complete) {
                    resourceMultiplier = 5; // Massive boost during endgame
                } else if (worldState.research.singularity_2_complete) {
                    resourceMultiplier = 3;
                } else {
                    resourceMultiplier = 1.5;
                }
            }

            f.resources.funds += 10 * resourceMultiplier;
            f.resources.intel += 5 * resourceMultiplier;
            f.resources.tech += 2 * resourceMultiplier;

            // Satellite intel bonus
            const isDisrupted =
                f.id === 'technocrats' &&
                worldState.activeBuffs.some(
                    (b) => b.type === 'AI_SATELLITE_DISRUPTION'
                );
            if (!isDisrupted) {
                const satelliteCount = worldState.satellites.filter(
                    (s) => s.owner === f.id
                ).length;
                f.resources.intel += satelliteCount * 10; // 10 extra intel per satellite
            }
        });

        // Income from player-owned regions and buffs
        worldState.regions.forEach((region) => {
            if (region.owner === 'PLAYER') {
                let incomeMultiplier = 1;
                let techMultiplier = 1;
                if (
                    worldState.buildings.some(
                        (b) => b.region === region && b.type === 'BASE'
                    )
                ) {
                    incomeMultiplier = 1.5;
                }
                if (
                    worldState.buildings.some(
                        (b) =>
                            b.region === region && b.type === 'RESEARCH_OUTPOST'
                    )
                ) {
                    techMultiplier = 3.0; // Research outposts triple tech income
                }
                this.playerFaction.resources.funds +=
                    region.economy * 10 * incomeMultiplier * dt;
                this.playerFaction.resources.intel +=
                    region.economy * 2 * incomeMultiplier * dt;
                this.playerFaction.resources.tech +=
                    region.economy * 1 * incomeMultiplier * techMultiplier * dt;
            }

            // Handle region buffs
            region.activeBuffs.forEach((buff) => {
                if (buff.type === 'INFORMANT_NETWORK') {
                    const faction = this.factions.find(
                        (f) => f.id === buff.factionId
                    );
                    if (faction) {
                        faction.resources.intel += 5 * dt; // Passive intel gain
                    }
                }
            });
        });
    }
}
