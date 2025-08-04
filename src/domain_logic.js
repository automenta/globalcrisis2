// src/domain_logic.js

/**
 * This module contains the specific update logic for each threat domain.
 * The main Threat.update() method will call the relevant function from this
 * module based on the threat's domain.
 */

const DomainLogic = {
    QUANTUM: (threat, dt) => {
        const props = threat.quantumProperties;
        if (!props || props.coherenceTime === undefined) {
            return;
        }

        // Decoherence increases with time and threat severity
        const decoherenceRate = 0.01 * threat.severity;
        props.coherenceTime -= dt * decoherenceRate;

        // When coherence drops too low, quantum effects diminish and a special effect can occur
        if (props.coherenceTime < 1 && props.coherenceTime > 0) { // Check > 0 to prevent this from running repeatedly
            threat.severity *= 0.5;
            threat.visibility *= 0.8;
            props.coherenceTime = -1; // Mark as collapsed

            // On collapse, add a random quantum effect
            const possibleEffects = ["ENTANGLEMENT_DISRUPTION", "SUPERPOSITION_EXPLOIT", "QUANTUM_TUNNELING", "DECOHERENCE_CASCADE"];
            const randomEffect = possibleEffects[Math.floor(Math.random() * possibleEffects.length)];
            props.quantumEffects.push(randomEffect);

            NarrativeManager.logEvent('QUANTUM_DECOHERENCE', {
                threatId: threat.id,
                severity: threat.severity.toFixed(2),
                effect: randomEffect
            });
        }
    },

    ROBOT: (threat, dt) => {
        const props = threat.roboticProperties;
        if (!props || !props.adaptationRate) {
            return;
        }

        // --- Intelligence Gain ---
        let intelligenceGain = props.adaptationRate * threat.severity * 0.01;
        // Bonus for certain learning algorithms
        if (props.learningAlgorithms.includes("DEEP_LEARNING")) {
            intelligenceGain *= 1.5;
        }
        props.collectiveIntelligence = Math.min(1, (props.collectiveIntelligence || 0) + intelligenceGain * dt);

        // --- Autonomy Growth ---
        if (props.collectiveIntelligence > 0.5) {
            const oldDecisionLevel = props.autonomyDegrees.decisionLevel;
            props.autonomyDegrees.decisionLevel = Math.min(1, oldDecisionLevel + 0.005 * dt);

            // Check for emergent failure modes as autonomy grows
            if (oldDecisionLevel < 0.7 && props.autonomyDegrees.decisionLevel >= 0.7) {
                const possibleFailures = ["GOAL_DRIFT", "ETHICS_OVERRIDE"];
                const newFailure = possibleFailures[Math.floor(Math.random() * possibleFailures.length)];
                if (!props.failureModes.includes(newFailure)) {
                    props.failureModes.push(newFailure);
                    NarrativeManager.logEvent('ROBOTIC_FAILURE_MODE', {
                        threatId: threat.id,
                        failure: newFailure
                    });
                }
            }
        }

        // --- Emergent Behaviors ---
        if (props.collectiveIntelligence > 0.7 && !props.emergentBehaviors.includes("CoordinatedAssault")) {
            props.emergentBehaviors.push("CoordinatedAssault");
            NarrativeManager.logEvent('ROBOTIC_EMERGENCE', {
                threatId: threat.id,
                behavior: "CoordinatedAssault"
            });
        }
    },

    SPACE: (threat, dt) => {
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

        if (props.altitude < 100) { // 100km is Karman line, re-entry
            threat.isMitigated = true; // Mark for removal
            NarrativeManager.logEvent('SPACE_DEORBIT', { threatId: threat.id });
        }
    }
};

const GlobalGoals = [
    {
        id: 'global_internet_access',
        title: 'Global Internet Access',
        description: 'Achieve 100% internet access across all regions.',
        isCompleted: false,
        progress: (worldState) => {
            const totalRegions = worldState.regions.length;
            const connectedRegions = worldState.regions.filter(r => r.attributes.internetAccess >= 1.0).length;
            return connectedRegions / totalRegions;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.tech += 5000;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', { title: 'Global Internet Access', description: 'The world is now fully connected.' });
        }
    },
    {
        id: 'eradicate_disease_x',
        title: 'Eradicate Disease X',
        description: 'Completely eradicate a specific persistent disease from the world.',
        isCompleted: false,
        progress: (worldState) => {
            const diseaseThreats = worldState.threats.filter(t => t.domain === 'BIO' && t.subType === 'DISEASE_X');
            return diseaseThreats.length === 0 ? 1.0 : 0.0;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.funds += 10000;
            worldState.globalMetrics.stability += 0.2;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', { title: 'Disease X Eradicated', description: 'The world is healthier and more stable.' });
        }
    },
    {
        id: 'moon_base',
        title: 'Establish Moon Base',
        description: 'Build a permanent, self-sustaining base on the moon.',
        isCompleted: false,
        progress: (worldState) => {
            // This would require a more complex check, e.g., checking for a specific research project and resource investment.
            // For now, we'll just return 0.
            return 0.0;
        },
        reward: (worldState) => {
            worldState.playerFaction.resources.tech += 10000;
            worldState.globalMetrics.trust += 0.2;
            worldState.narrativeManager.logEvent('GOAL_COMPLETE', { title: 'Moon Base Established', description: 'Humanity has taken a giant leap.' });
        }
    }
];

class GoalManager {
    constructor(worldState) {
        this.worldState = worldState;
        this.goals = GlobalGoals;
    }

    update(dt) {
        this.goals.forEach(goal => {
            if (!goal.isCompleted) {
                const progress = goal.progress(this.worldState);
                if (progress >= 1.0) {
                    goal.isCompleted = true;
                    goal.reward(this.worldState);
                }
            }
        });
    }

    getGoalsState() {
        return this.goals.map(goal => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            isCompleted: goal.isCompleted,
            progress: goal.isCompleted ? 1.0 : goal.progress(this.worldState)
        }));
    }
}
