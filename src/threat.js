import { DomainLogic } from './domain_logic.js';
import { PlayerActions } from './actions.js';

export class Threat {
    constructor({
        id,
        domain,
        subType = null,
        type,
        position,
        severity = 0.5,
        detectionRisk = 0.1,
        investigationProgress = 0,
        visibility = 0.1,
        spreadRate = 0.1,
        effects = [],
        crossDomainImpacts = [],
        economicImpact = null,
        biologicalProperties = null,
        cyberProperties = null,
        environmentalProperties = null,
        quantumProperties = null,
        radiologicalProperties = null,
        roboticProperties = null,
        neurologicalProperties = null,
        temporalProperties = null,
        informationProperties = null,
        economicProperties = null,
        spaceProperties = null,
    }) {
        this.id = id;
        this.domain = domain;
        this.subType = subType;
        this.type = type;
        this.position = position;

        // Core simulation properties
        this.detectionRisk = detectionRisk;
        this.investigationProgress = investigationProgress;
        this.effects = effects || [];
        this.crossDomainImpacts = crossDomainImpacts || [];
        this.isSpreading = false;
        this.spreadTimer = 0;
        this.spreadInterval = 10; // 10 seconds to spread
        this.wasMitigatedByPlayer = false;
        this.dirty = true; // Start as dirty to ensure it's sent on the first update

        // Properties with setters
        this._severity = severity;
        this._visibility = visibility;
        this._spreadRate = spreadRate;
        this._investigationCompleted = false;
        this._isMitigated = false;

        // Domain-specific properties
        this.economicImpact = economicImpact; // This is a specific property from the design
        this._biologicalProperties = biologicalProperties || {};
        this._cyberProperties = cyberProperties || {};
        this._environmentalProperties = environmentalProperties || {};
        this._quantumProperties = quantumProperties || {};
        this._radiologicalProperties = radiologicalProperties || {};
        this._roboticProperties = roboticProperties || {};
        this._neurologicalProperties = neurologicalProperties || {};
        this._temporalProperties = temporalProperties || {};
        this._informationProperties = informationProperties || {};
        this._economicProperties = economicProperties || {};
        this._spaceProperties = spaceProperties || {};

        // --- Deep Initialization for Specific Domains ---
        if (this.domain === 'ROBOT') {
            const defaults = {
                learningAlgorithms: ['SWARM'],
                failureModes: ['HACKABLE'],
                emergentBehaviors: [],
                autonomyDegrees: {
                    decisionLevel: 0.1,
                    selfReplication: false,
                    selfModification: false,
                },
                humanInterfaceRisks: {
                    manipulationPotential: 0.1,
                    physicalHarmProbability: 0.1,
                },
                adaptationRate: this._roboticProperties.adaptationRate || 0.1,
                collectiveIntelligence: this._roboticProperties.collectiveIntelligence || 0,
            };
            this._roboticProperties = { ...defaults, ...this._roboticProperties };
        }

        if (this.domain === 'QUANTUM') {
            const defaults = {
                quantumEffects: [],
                entanglementLevel: 0,
                coherenceTime: 10.0,
            };
            this._quantumProperties = { ...defaults, ...this._quantumProperties };
        }

        // (other domains omitted for brevity, but would follow the same pattern)
    }

    // --- Getters and Setters for Dirty Flagging ---

    get severity() { return this._severity; }
    set severity(value) { if (this._severity !== value) { this._severity = value; this.dirty = true; } }
    get visibility() { return this._visibility; }
    set visibility(value) { if (this._visibility !== value) { this._visibility = value; this.dirty = true; } }
    get spreadRate() { return this._spreadRate; }
    set spreadRate(value) { if (this._spreadRate !== value) { this._spreadRate = value; this.dirty = true; } }
    get investigationCompleted() { return this._investigationCompleted; }
    set investigationCompleted(value) { if (this._investigationCompleted !== value) { this._investigationCompleted = value; this.dirty = true; } }
    get isMitigated() { return this._isMitigated; }
    set isMitigated(value) { if (this._isMitigated !== value) { this._isMitigated = value; this.dirty = true; } }

    get quantumProperties() { return this._quantumProperties; }
    set quantumProperties(value) {
        if (JSON.stringify(this._quantumProperties) !== JSON.stringify(value)) {
            this._quantumProperties = JSON.parse(JSON.stringify(value));
            this.dirty = true;
        }
    }

    get roboticProperties() { return this._roboticProperties; }
    set roboticProperties(value) {
        if (JSON.stringify(this._roboticProperties) !== JSON.stringify(value)) {
            this._roboticProperties = JSON.parse(JSON.stringify(value));
            this.dirty = true;
        }
    }

    // (getters/setters for other domain properties would go here)

    // --- Core Methods ---

    update(dt, worldState) {
        if (this.severity < 1.0) {
            this.severity += 0.01 * dt;
            this.severity = Math.min(this.severity, 1.0);
        }
        const domainUpdateLogic = DomainLogic[this.domain];
        if (domainUpdateLogic) {
            domainUpdateLogic(this, dt, worldState);
        }
    }

    investigate(faction, cheat = false) {
        const cost = { intel: 100 };
        if (this.investigationProgress >= 1.0) return false;

        if (cheat || faction.canAfford(cost)) {
            if (!cheat) faction.spend(cost);
            this.investigationProgress = Math.min(1.0, this.investigationProgress + (cheat ? 1.0 : 0.2));
            this.visibility = this.investigationProgress;
            if (this.investigationProgress >= 1.0) {
                this.investigationCompleted = true;
            }
            return true;
        }
        return false;
    }

    quantumEntangle(faction) {
        const cost = PlayerActions.quantum_entangle.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const qProps = { ...this.quantumProperties };
            qProps.entanglementLevel = Math.min(1, qProps.entanglementLevel + 0.2);
            this.quantumProperties = qProps;
            return true;
        }
        return false;
    }

    mitigate(faction, worldState, cheat = false) {
        const cost = { funds: 500, tech: 200 };
        if (this.investigationProgress < 1.0 || this.type !== 'REAL') return false;

        if (cheat || faction.canAfford(cost)) {
            if (!cheat) faction.spend(cost);
            this.severity = 0;
            this.isMitigated = true;
            this.wasMitigatedByPlayer = true;
            worldState.narrativeManager.logEvent('THREAT_MITIGATED', {
                threatId: this.id,
                threat: this,
                factionId: faction.id,
            });
            return true;
        }
        return false;
    }

    // --- Action Methods ---

    deployCounterIntel(faction) {
        const cost = { intel: 250, funds: 100 };
        if (this.domain !== 'INFO' || this.investigationProgress < 1.0) return false;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.spreadRate = Math.max(0, this.spreadRate - 0.2);
            return true;
        }
        return false;
    }

    stabilizeMarkets(faction) {
        const cost = { funds: 1000 };
        if (this.domain !== 'ECON' || this.investigationProgress < 1.0) return false;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.severity = Math.max(0, this.severity - 0.15);
            return true;
        }
        return false;
    }

    sabotageRobotics(faction) {
        const cost = PlayerActions.robotic_sabotage.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const rProps = { ...this.roboticProperties };
            rProps.collectiveIntelligence = Math.max(0, rProps.collectiveIntelligence - 0.25);
            this.roboticProperties = rProps;
            return true;
        }
        return false;
    }

    swarmCommand(faction) {
        const cost = PlayerActions.swarm_command.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const rProps = { ...this.roboticProperties };
            rProps.collectiveIntelligence = Math.min(1, rProps.collectiveIntelligence + 0.1);
            this.roboticProperties = rProps;
            return true;
        }
        return false;
    }

    autonomyOverride(faction) {
        const cost = PlayerActions.autonomy_override.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const rProps = { ...this.roboticProperties };
            if (rProps.autonomyDegrees) {
                rProps.autonomyDegrees.decisionLevel = Math.max(0, rProps.autonomyDegrees.decisionLevel - 0.2);
                this.roboticProperties = rProps;
            }
            return true;
        }
        return false;
    }

    induceDecoherence(faction) {
        const cost = PlayerActions.induce_decoherence.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const qProps = { ...this.quantumProperties };
            if (qProps.coherenceTime > 0) {
                qProps.coherenceTime = Math.max(0, qProps.coherenceTime - 5.0);
                this.quantumProperties = qProps;
            }
            return true;
        }
        return false;
    }

    radiologicalCleanup(faction) {
        const cost = PlayerActions.radiological_cleanup.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.severity = Math.max(0, this.severity - 0.3);
            return true;
        }
        return false;
    }

    radContain(faction) {
        const cost = PlayerActions.rad_contain.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.spreadRate = Math.max(0, this.spreadRate - 0.5);
            return true;
        }
        return false;
    }
}
