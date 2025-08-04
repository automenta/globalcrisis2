// src/actions.js

/**
 * This module defines all possible player actions in a data-driven format.
 * The UI (in main.js) will use this data to dynamically generate action buttons
 * for a selected threat, based on the threat's domain, type, and investigation status.
 *
 * This approach is inspired by the Action interface in world.md and makes adding
 * or modifying actions much easier than hardcoding them in the UI logic.
 */

const PlayerActions = {
    // --- GENERIC ACTIONS ---
    'investigate': {
        id: 'investigate',
        name: 'Investigate',
        description: 'Spend Intel to learn more about an unknown threat.',
        resourceCost: { intel: 100 },
        // This condition function will be called with the threat as an argument
        // to determine if the action button should be displayed.
        isAvailable: (threat) => threat.investigationProgress < 1.0,
        // The effect function is what gets executed when the action is taken.
        // It's passed the threat and the faction performing the action.
        execute: (threat, faction) => threat.investigate(faction)
    },
    'mitigate': {
        id: 'mitigate',
        name: 'Mitigate',
        description: 'Spend Funds and Tech to reduce the severity of a REAL threat.',
        resourceCost: { funds: 500, tech: 200 },
        isAvailable: (threat) => threat.investigationProgress >= 1.0 && threat.type === 'REAL',
        execute: (threat, faction) => threat.mitigate(faction)
    },

    // --- DOMAIN-SPECIFIC ACTIONS ---
    // These will be expanded in later steps.
    'counter_intel': {
        id: 'counter_intel',
        domain: 'INFO', // This action is specific to the INFO domain
        name: 'Deploy Counter-Intel',
        description: 'Reduce the spread rate of an information-based threat.',
        resourceCost: { intel: 250, funds: 100 },
        isAvailable: (threat) => threat.domain === 'INFO' && threat.investigationProgress >= 1.0,
        execute: (threat, faction) => threat.deployCounterIntel(faction)
    },
    'stabilize_markets': {
        id: 'stabilize_markets',
        domain: 'ECON', // This action is specific to the ECON domain
        name: 'Stabilize Markets',
        description: 'Use funds to reduce the severity of an economic threat.',
        resourceCost: { funds: 1000 },
        isAvailable: (threat) => threat.domain === 'ECON' && threat.investigationProgress >= 1.0,
        execute: (threat, faction) => threat.stabilizeMarkets(faction)
    },

    // --- NEW ACTIONS for ROBOTICS/QUANTUM will be added here ---
    'robotic_sabotage': {
        id: 'robotic_sabotage',
        domain: 'ROBOT',
        name: 'Robotic Sabotage',
        description: 'Attempt to sabotage a robotic threat, reducing its collective intelligence.',
        resourceCost: { tech: 400, intel: 200 },
        isAvailable: (threat) => threat.domain === 'ROBOT' && threat.investigationProgress >= 1.0,
        // The actual logic will be implemented in threat.js in the next step.
        execute: (threat, faction) => threat.sabotageRobotics(faction)
    },
    'induce_decoherence': {
        id: 'induce_decoherence',
        domain: 'QUANTUM',
        name: 'Induce Decoherence',
        description: 'Use targeted energy to accelerate the collapse of a quantum threat\'s coherence.',
        resourceCost: { tech: 500, funds: 300 },
        isAvailable: (threat) => {
            return threat.domain === 'QUANTUM' &&
                   threat.investigationProgress >= 1.0 &&
                   threat.quantumProperties.coherenceTime > 0;
        },
        // The actual logic will be implemented in threat.js in the next step.
        execute: (threat, faction) => threat.induceDecoherence(faction)
    }
};

// In a real ES6 module system, we would use `export default PlayerActions;`
// For now, this file establishes the structure.
