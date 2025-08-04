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

    // --- GLOBAL/PROACTIVE ACTIONS ---
    'fund_research': {
        id: 'fund_research',
        name: 'Fund Research',
        description: 'Invest in a long-term research project to gain a technological advantage.',
        resourceCost: { tech: 2000 },
        isAvailable: (threat, worldState) => !worldState.research.isProjectActive, // Example condition
        execute: (threat, faction, worldState) => worldState.startResearchProject('advanced_materials')
    },
    'diplomatic_mission': {
        id: 'diplomatic_mission',
        name: 'Launch Diplomatic Mission',
        description: 'Send a diplomatic mission to a region to improve stability and trust.',
        resourceCost: { funds: 1500 },
        isAvailable: (threat) => true, // Available for any region
        execute: (threat, faction, worldState, region) => region.startDiplomaticMission()
    },
    'awareness_campaign': {
        id: 'awareness_campaign',
        name: 'Public Awareness Campaign',
        description: 'Launch a campaign to counter misinformation in a region.',
        resourceCost: { funds: 500, intel: 200 },
        isAvailable: (threat) => true, // Available for any region
        execute: (threat, faction, worldState, region) => region.startAwarenessCampaign()
    },
    'deploy_network_infrastructure': {
        id: 'deploy_network_infrastructure',
        name: 'Deploy Network Infrastructure',
        description: 'Invest in a region to improve its internet access, boosting tech generation and goal progress.',
        resourceCost: { funds: 800, tech: 400 },
        isAvailable: (threat, worldState, region) => {
            // This is a region action, so it doesn't depend on a threat.
            // Let's assume it's available from a region's own menu, not the threat panel.
            // For now, we'll just check if the region's internet access is not yet maxed out.
            return region && region.attributes.internetAccess < 1.0;
        },
        execute: (threat, faction, worldState, region) => region.deployNetworkInfrastructure(faction)
    },
    'launch_satellite': {
        id: 'launch_satellite',
        name: 'Launch Recon Satellite',
        description: 'Launch a satellite to provide a permanent global boost to Intel generation.',
        resourceCost: { funds: 2500, tech: 5000 },
        isAvailable: (threat, worldState) => {
            // A global action, not tied to a threat or region.
            // Let's say we can have a max of 5 satellites.
            return worldState.satellites.length < 5;
        },
        execute: (threat, faction, worldState) => worldState.launchSatellite(faction)
    },
    'initiate_quarantine': {
        id: 'initiate_quarantine',
        name: 'Initiate Quarantine',
        description: 'Enforce a regional quarantine to slow the spread of biological threats.',
        resourceCost: { funds: 700 },
        isAvailable: (threat, worldState, region) => {
            return threat.domain === 'BIO' && region.owner === 'PLAYER' && !region.activeBuffs.includes('QUARANTINE');
        },
        execute: (threat, faction, worldState, region) => region.initiateQuarantine(faction)
    },
    'scrub_network': {
        id: 'scrub_network',
        name: 'Scrub Network',
        description: 'Deploy a deep-clean of the regional network to reduce the severity of cyber threats.',
        resourceCost: { tech: 600 },
        isAvailable: (threat, worldState, region) => {
            return threat.domain === 'CYBER' && region.owner === 'PLAYER' && !region.activeBuffs.includes('NETWORK_SCRUB');
        },
        execute: (threat, faction, worldState, region) => region.scrubNetwork(faction)
    },
    'counter_propaganda': {
        id: 'counter_propaganda',
        name: 'Launch Counter-Propaganda',
        description: 'Launch a targeted campaign to counter specific disinformation threats.',
        resourceCost: { intel: 500 },
        isAvailable: (threat, worldState, region) => {
            return threat.domain === 'INFO' && region.owner === 'PLAYER' && !region.activeBuffs.includes('COUNTER_PROPAGANDA');
        },
        execute: (threat, faction, worldState, region) => region.launchCounterPropaganda(faction)
    }
};

// In a real ES6 module system, we would use `export default PlayerActions;`
// For now, this file establishes the structure.
