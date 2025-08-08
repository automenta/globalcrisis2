let ALL_ABILITIES = [];
fetch('data/abilities.json')
    .then((response) => response.json())
    .then((data) => {
        ALL_ABILITIES = data;
    });

import { Unit } from './unit.js';

export class Agent extends Unit {
    constructor({
        id,
        factionId,
        region,
        name = 'Rook',
        level = 1,
        experience = 0,
        abilities = [],
        status = 'IDLE',
        position,
        id,
        factionId,
        region, // The region the agent is currently in
        name = 'Rook', // Default name
        level = 1,
        experience = 0,
        abilities = [],
        status = 'IDLE', // IDLE, ON_MISSION, CAPTURED, KIA
        position,
        name = 'Rook', // Default name
        level = 1,
        experience = 0,
        abilities = [],
        status = 'IDLE', // IDLE, ON_MISSION, CAPTURED, KIA
    }) {
        // Call the parent Unit constructor
        super({ region, type: 'AGENT', position });

        // Agent-specific properties
        this.id = id;
        this.factionId = factionId;
        // this.region and this.position are already set by super()
        this.name = name;
        this.level = level;
        this.experience = experience;
        this.abilities = abilities;
        // this.status is handled by the Unit class, but we can override it
        this.status = status;
        this.mission = null; // Will hold the full mission object from AgentActions
    }

    startMission(missionAction, worldState) {
        if (this.status !== 'IDLE') {
            console.error(
                `Agent ${this.id} is not IDLE and cannot start a new mission.`
            );
            return false;
        }

        this.mission = {
            action: missionAction,
            progress: 0,
            risk: this.calculateMissionRisk(missionAction, worldState),
            startTime: worldState.currentTurn,
        };
        this.status = 'ON_MISSION';
        console.log(
            `Agent ${this.id} starting mission ${missionAction.name} in ${this.region.name}`
        );
        return true;
    }

    calculateMissionRisk(missionAction, worldState) {
        let risk = missionAction.baseRisk || 0.1;

        // Modify risk based on agent level and abilities
        risk -= this.level * 0.05; // Each level reduces risk by 5%
        missionAction.requiredAbilities?.forEach((ability) => {
            if (!this.abilities.includes(ability)) {
                risk += 0.2; // 20% penalty for each missing required ability
            }
        });

        // Modify risk based on region properties
        if (this.region) {
            risk += (1 - this.region.stability) * 0.1; // Unstable regions are riskier
        }

        // Factor in target faction's counter-intel
        const targetFaction = worldState.factionManager.factions.find(
            (f) => f.id === this.region.owner
        );
        if (targetFaction) {
            let counterIntelFactor = targetFaction.counterIntel || 0.1;
            if (targetFaction.id === 'technocrats') {
                counterIntelFactor += worldState.aiManager.aiAlertLevel * 0.1; // Each AI alert level adds 10% risk
            }
            risk += counterIntelFactor;
        }

        return Math.max(0.01, Math.min(0.95, risk));
    }

    addExperience(xp, worldState) {
        this.experience += xp;
        const xpForNextLevel = 100 * this.level;
        if (this.experience >= xpForNextLevel) {
            this.level++;
            this.experience = 0; // Reset for next level

            // Grant a new ability on level up, if available
            const unlearnedAbilities = ALL_ABILITIES.filter(
                (a) => !this.abilities.includes(a)
            );
            if (unlearnedAbilities.length > 0) {
                const newAbility =
                    unlearnedAbilities[
                        Math.floor(Math.random() * unlearnedAbilities.length)
                    ];
                this.abilities.push(newAbility);
                console.log(`Agent ${this.name} has learned ${newAbility}!`);
                worldState.narrativeManager.logEvent('AGENT_ABILITY_GAIN', {
                    agentId: this.id,
                    agentName: this.name,
                    ability: newAbility,
                });
            }

            console.log(`Agent ${this.name} has reached level ${this.level}!`);
            worldState.narrativeManager.logEvent('AGENT_LEVEL_UP', {
                agentId: this.id,
                agentName: this.name,
                newLevel: this.level,
            });
        }
    }

    // moveTo is now inherited from Unit

    update(dt, worldState) {
        // Call the parent update method to handle physics and movement
        super.update(dt, worldState);

        // Handle agent-specific logic (missions)
        if (this.status === 'ON_MISSION' && this.mission) {
            const missionDuration = this.mission.action.duration || 30; // default 30s
            this.mission.progress += dt / missionDuration;

            if (this.mission.progress >= 1) {
                worldState.resolveAgentMission(this);
            }
        }
    }
}
