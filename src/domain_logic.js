// src/domain_logic.js

/**
 * This module contains the specific update logic for each threat domain.
 * The main Threat.update() method will call the relevant function from this
 * module based on the threat's domain.
 */

import { NarrativeManager } from './narrative.js';

export const DomainLogic = {
    QUANTUM: (threat, dt, worldState) => {
        const props = threat.quantumProperties;
        if (!props || props.coherenceTime === undefined) {
            return;
        }

        // Decoherence increases with time and threat severity
        const decoherenceRate = 0.01 * threat.severity;
        props.coherenceTime -= dt * decoherenceRate;

        // When coherence drops too low, quantum effects diminish and a special effect can occur
        if (props.coherenceTime < 1 && props.coherenceTime > 0) {
            // Check > 0 to prevent this from running repeatedly
            threat.severity *= 0.5;
            threat.visibility *= 0.8;
            props.coherenceTime = -1; // Mark as collapsed

            // On collapse, add a random quantum effect
            const possibleEffects = [
                'ENTANGLEMENT_DISRUPTION',
                'SUPERPOSITION_EXPLOIT',
                'QUANTUM_TUNNELING',
                'DECOHERENCE_CASCADE',
            ];
            const randomEffect =
                possibleEffects[
                    Math.floor(Math.random() * possibleEffects.length)
                ];
            props.quantumEffects.push(randomEffect);

            NarrativeManager.logEvent('QUANTUM_DECOHERENCE', {
                threatId: threat.id,
                severity: threat.severity.toFixed(2),
                effect: randomEffect,
            });
        }
    },

    ROBOT: (threat, dt, worldState) => {
        const props = threat.roboticProperties;
        if (!props || !props.adaptationRate) {
            return;
        }

        // --- Intelligence Gain ---
        let intelligenceGain = props.adaptationRate * threat.severity * 0.01;
        // Bonus for certain learning algorithms
        if (props.learningAlgorithms.includes('DEEP_LEARNING')) {
            intelligenceGain *= 1.5;
        }
        props.collectiveIntelligence = Math.min(
            1,
            (props.collectiveIntelligence || 0) + intelligenceGain * dt
        );

        // --- Autonomy Growth ---
        if (props.collectiveIntelligence > 0.5) {
            const oldDecisionLevel = props.autonomyDegrees.decisionLevel;
            props.autonomyDegrees.decisionLevel = Math.min(
                1,
                oldDecisionLevel + 0.005 * dt
            );

            // Check for emergent failure modes as autonomy grows
            if (
                oldDecisionLevel < 0.7 &&
                props.autonomyDegrees.decisionLevel >= 0.7
            ) {
                const possibleFailures = ['GOAL_DRIFT', 'ETHICS_OVERRIDE'];
                const newFailure =
                    possibleFailures[
                        Math.floor(Math.random() * possibleFailures.length)
                    ];
                if (!props.failureModes.includes(newFailure)) {
                    props.failureModes.push(newFailure);
                    NarrativeManager.logEvent('ROBOTIC_FAILURE_MODE', {
                        threatId: threat.id,
                        failure: newFailure,
                    });
                }
            }
        }

        // --- Emergent Behaviors ---
        if (
            props.collectiveIntelligence > 0.7 &&
            !props.emergentBehaviors.includes('CoordinatedAssault')
        ) {
            props.emergentBehaviors.push('CoordinatedAssault');
            NarrativeManager.logEvent('ROBOTIC_EMERGENCE', {
                threatId: threat.id,
                behavior: 'CoordinatedAssault',
            });
        }
    },

    SPACE: (threat, dt, worldState) => {
        if (!threat.spaceProperties) {
            return;
        }
        const props = threat.spaceProperties;
        if (props.altitude === undefined) {
            props.altitude = 400; // Start at a nominal 400km LEO
        }

        const debrisDensity = (props.orbitalDedebrisPotential || 0.1) * 0.01;
        const decayRate = debrisDensity * dt;
        props.altitude -= decayRate;

        if (props.altitude < 100) {
            // 100km is Karman line, re-entry
            threat.isMitigated = true; // Mark for removal
            NarrativeManager.logEvent('SPACE_DEORBIT', { threatId: threat.id });
        }
    },

    BIO: (threat, dt, worldState) => {
        const props = threat.biologicalProperties;
        if (!props) return;

        // Lethality increases slowly over time (mutation)
        props.lethality = Math.min(1, props.lethality + 0.005 * dt);

        const region = worldState.getRegionForThreat(threat);
        if (region) {
            if (region.activeBuffs.some((b) => b.type === 'QUARANTINE')) {
                // Quarantine reduces infectivity
                props.infectivity = Math.max(0, props.infectivity - 0.05 * dt);
            } else {
                // Infectivity is influenced by the region's population density
                const densityFactor = region.population.density || 0.5;
                props.infectivity = Math.min(
                    1,
                    props.infectivity + 0.01 * densityFactor * dt
                );
            }
        }
    },

    CYBER: (threat, dt, worldState) => {
        const props = threat.cyberProperties;
        if (!props) return;

        // As a cyber threat remains active, it gets easier to detect
        props.stealth = Math.max(0, props.stealth - 0.01 * dt);

        const region = worldState.getRegionForThreat(threat);
        if (
            region &&
            region.activeBuffs.some((b) => b.type === 'NETWORK_SCRUB')
        ) {
            // Network scrub reduces severity
            threat.severity = Math.max(0, threat.severity - 0.05 * dt);
        } else {
            // Its severity grows as it infects more systems
            threat.severity = Math.min(1, threat.severity + 0.02 * dt);
        }

        // Ransomware subtype logic
        if (threat.subType === 'RANSOMWARE' && region) {
            const owner = worldState.factions.find(
                (f) => f.id === region.owner
            );
            if (owner) {
                const fundsDrained = threat.severity * 100 * dt;
                owner.resources.funds = Math.max(
                    0,
                    owner.resources.funds - fundsDrained
                );
            }
        }
    },

    INFO: (threat, dt, worldState) => {
        const props = threat.informationProperties;
        if (!props) return;

        const region = worldState.getRegionForThreat(threat);
        if (
            region &&
            region.activeBuffs.some((b) => b.type === 'COUNTER_PROPAGANDA')
        ) {
            // Counter-propaganda reduces spread rate
            threat.spreadRate = Math.max(0, threat.spreadRate - 0.05 * dt);
        } else {
            // Divisive information spreads faster
            const spreadBonus = props.polarizationFactor * 0.1;
            threat.spreadRate = Math.min(
                1,
                threat.spreadRate + spreadBonus * dt
            );
        }
    },

    ECON: (threat, dt, worldState) => {
        const props = threat.economicProperties;
        if (!props) return;

        // Economic threats are more contagious in unstable regions
        const region = worldState.getRegionForThreat(threat);
        if (region) {
            const instabilityFactor = 1 - region.economy;
            props.contagionRisk = Math.min(
                1,
                props.contagionRisk + 0.05 * instabilityFactor * dt
            );
        }
    },

    GEO: (threat, dt, worldState) => {
        // Geological events are typically instantaneous.
        // This logic will apply a one-time effect and then the threat should be removed.
        const region = worldState.getRegionForThreat(threat);
        if (region && !threat.hasHadInitialImpact) {
            const props = threat.geologicalProperties;
            const impact = (props.magnitude / 10) * 0.5; // Scale magnitude to 0-0.5 impact
            region.stability = Math.max(0, region.stability - impact);
            region.economy = Math.max(0, region.economy - impact * 0.5);
            threat.hasHadInitialImpact = true;
            threat.severity = 0; // The event is over
            threat.isMitigated = true; // Mark for removal
            NarrativeManager.logEvent('GEO_EVENT', {
                threatId: threat.id,
                region: region.name,
                type: props.eventType,
                magnitude: props.magnitude,
            });
        }
    },

    ENV: (threat, dt) => {
        const props = threat.environmentalProperties;
        if (!props) return;

        // The area of effect of an environmental threat grows over time
        props.areaOfEffect += 0.5 * threat.severity * dt;
    },

    WMD: (threat, dt, worldState) => {
        // WMDs are instantaneous events.
        const region = worldState.getRegionForThreat(threat);
        if (region && !threat.hasHadInitialImpact) {
            const props = threat.wmdProperties;
            const impact = (props.yield / 100) * 0.8; // Scale yield to a massive impact
            region.stability = Math.max(0, region.stability - impact);
            region.economy = Math.max(0, region.economy - impact);

            // High fallout can create a new radiological threat
            if (props.falloutPotential > 0.5) {
                worldState.generateThreat({
                    domain: 'RAD',
                    type: 'REAL',
                    severity: props.falloutPotential * threat.severity,
                    lat: threat.lat,
                    lon: threat.lon,
                });
            }

            threat.hasHadInitialImpact = true;
            threat.severity = 0;
            threat.isMitigated = true;
            NarrativeManager.logEvent('WMD_DETONATION', {
                threatId: threat.id,
                region: region.name,
                yield: props.yield,
            });
        }
    },

    RAD: (threat, dt) => {
        const props = threat.radiologicalProperties;
        if (!props) return;

        // Contamination level decays based on half-life.
        // A simpler game-friendly decay model.
        const decayPerTick =
            (props.contaminationLevel * 0.001) / props.halfLife;
        props.contaminationLevel = Math.max(
            0,
            props.contaminationLevel - decayPerTick * dt
        );
        threat.severity = props.contaminationLevel; // Severity is directly tied to contamination
    },
};

const GlobalGoals = [
    {
        id: 'global_internet_access',
        title: 'Global Internet Access',
        description: 'Achieve 100% internet access across all regions.',
        isCompleted: false,
        progress: (worldState) => {
            const totalRegions = worldState.regions.length;
            const connectedRegions = worldState.regions.filter(
                (r) => r.attributes.internetAccess >= 1.0
            ).length;
            return connectedRegions / totalRegions;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.tech += 5000;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'Global Internet Access',
                description: 'The world is now fully connected.',
            });
        },
    },
    {
        id: 'eradicate_disease_x',
        title: 'Eradicate Disease X',
        description:
            'Completely eradicate a specific persistent disease from the world.',
        isCompleted: false,
        progress: (worldState) => {
            const diseaseThreats = worldState.threats.filter(
                (t) => t.domain === 'BIO' && t.subType === 'DISEASE_X'
            );
            return diseaseThreats.length === 0 ? 1.0 : 0.0;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.funds += 10000;
            worldState.globalMetrics.stability += 0.2;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'Disease X Eradicated',
                description: 'The world is healthier and more stable.',
            });
        },
    },
    {
        id: 'moon_base',
        title: 'Establish Moon Base',
        description: 'Build a permanent, self-sustaining base on the moon.',
        isCompleted: false,
        progress: (worldState) => {
            if (worldState.research.moon_program_complete) {
                return 1.0;
            }
            if (
                worldState.research.isProjectActive &&
                worldState.research.activeProject === 'moon_program'
            ) {
                return worldState.research.projectProgress;
            }
            return 0.0;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.tech += 10000;
            worldState.globalMetrics.trust += 0.2;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'Moon Base Established',
                description: 'Humanity has taken a giant leap.',
            });
        },
    },
    {
        id: 'global_stability',
        title: 'Achieve Global Stability',
        description: 'Achieve a global stability rating of 90% or higher.',
        isCompleted: false,
        progress: (worldState) => {
            return worldState.globalMetrics.stability / 0.9; // Progress is relative to the 90% target
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.funds += 20000;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'An Era of Peace',
                description: 'The world has achieved unprecedented stability.',
            });
        },
    },
    {
        id: 'tech_singularity',
        title: 'Technological Singularity',
        description:
            'Usher in a new era of existence by completing the singularity project.',
        isCompleted: false,
        progress: (worldState) => {
            // This requires a sequence of research projects.
            if (worldState.research.singularity_3_complete) return 1.0;
            if (worldState.research.singularity_2_complete) return 0.66;
            if (worldState.research.singularity_1_complete) return 0.33;
            return 0.0;
        },
        reward: (worldState) => {
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'Singularity',
                description:
                    'Human consciousness has ascended. The simulation has been won.',
            });
            // This could be a true "win" condition that ends the game.
        },
    },
    {
        id: 'achieve_global_education',
        title: 'Achieve Global Education',
        description:
            'Achieve an average education level of 95% across all regions.',
        isCompleted: false,
        progress: (worldState) => {
            const totalEducation = worldState.regions.reduce(
                (sum, r) => sum + r.education,
                0
            );
            const avgEducation = totalEducation / worldState.regions.length;
            return avgEducation / 0.95;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.tech += 10000;
            worldState.globalMetrics.trust += 0.2;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', {
                title: 'An Enlightened World',
                description:
                    'The world has achieved a new level of enlightenment and understanding.',
            });
        },
    },
];

export class GoalManager {
    constructor(voxelWorld) {
        this.worldState = voxelWorld;
        this.goals = GlobalGoals;
    }

    update(dt) {
        // this.goals.forEach(goal => {
        //     if (!goal.isCompleted) {
        //         const progress = goal.progress(this.worldState);
        //         if (progress >= 1.0) {
        //             goal.isCompleted = true;
        //             goal.reward(this.worldState);
        //         }
        //     }
        // });
    }

    getGoalsState() {
        return this.goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            isCompleted: goal.isCompleted,
            progress: 0, // goal.isCompleted ? 1.0 : goal.progress(this.worldState)
        }));
    }
}
