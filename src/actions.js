// src/actions.js - Refactored for a declarative system

export const PlayerActions = {
    // --- GENERIC ACTIONS (Target: THREAT) ---
    investigate: {
        id: 'investigate',
        name: 'Investigate',
        description: 'Spend Intel to learn more about an unknown threat.',
        targetType: 'THREAT',
        resourceCost: { intel: 100 },
        availability: [
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'lt',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'investigate',
                params: ['playerFaction'],
            },
        ],
    },
    mitigate: {
        id: 'mitigate',
        name: 'Mitigate',
        description:
            'Spend Funds and Tech to reduce the severity of a REAL threat.',
        targetType: 'THREAT',
        resourceCost: { funds: 500, tech: 200 },
        availability: [
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
            {
                type: 'threat_property',
                property: 'type',
                comparison: 'eq',
                value: 'REAL',
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'mitigate',
                params: ['playerFaction'],
            },
        ],
    },

    // --- DOMAIN-SPECIFIC ACTIONS (Target: THREAT) ---
    counter_intel: {
        id: 'counter_intel',
        name: 'Deploy Counter-Intel',
        description: 'Reduce the spread rate of an information-based threat.',
        targetType: 'THREAT',
        resourceCost: { intel: 250, funds: 100 },
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'INFO',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'deployCounterIntel',
                params: ['playerFaction'],
            },
        ],
    },
    stabilize_markets: {
        id: 'stabilize_markets',
        name: 'Stabilize Markets',
        description: 'Use funds to reduce the severity of an economic threat.',
        targetType: 'THREAT',
        resourceCost: { funds: 1000 },
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'ECON',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'stabilizeMarkets',
                params: ['playerFaction'],
            },
        ],
    },
    robotic_sabotage: {
        id: 'robotic_sabotage',
        name: 'Robotic Sabotage',
        description:
            'Attempt to sabotage a robotic threat, reducing its collective intelligence.',
        targetType: 'THREAT',
        resourceCost: { tech: 400, intel: 200 },
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'ROBOT',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'sabotageRobotics',
                params: ['playerFaction'],
            },
        ],
    },
    induce_decoherence: {
        id: 'induce_decoherence',
        name: 'Induce Decoherence',
        description:
            "Use targeted energy to accelerate the collapse of a quantum threat's coherence.",
        targetType: 'THREAT',
        resourceCost: { tech: 500, funds: 300 },
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'QUANTUM',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
            {
                type: 'threat_property',
                property: 'quantumProperties.coherenceTime',
                comparison: 'gt',
                value: 0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'induceDecoherence',
                params: ['playerFaction'],
            },
        ],
    },

    // --- REGIONAL ACTIONS (Target: REGION) ---
    deploy_network_infrastructure: {
        id: 'deploy_network_infrastructure',
        name: 'Deploy Network Infrastructure',
        description:
            'Invest in a region to improve its internet access, boosting tech generation and goal progress.',
        targetType: 'REGION',
        resourceCost: { funds: 800, tech: 400 },
        availability: [
            {
                type: 'region_property',
                property: 'attributes.internetAccess',
                comparison: 'lt',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method_on_target',
                method: 'deployNetworkInfrastructure',
                params: ['playerFaction'],
            },
        ],
    },
    initiate_quarantine: {
        id: 'initiate_quarantine',
        name: 'Initiate Quarantine',
        description:
            'Enforce a regional quarantine to slow the spread of biological threats.',
        targetType: 'REGION',
        resourceCost: { funds: 700 },
        availability: [
            {
                type: 'selected_threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'BIO',
            },
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
            {
                type: 'region_has_buff',
                buffType: 'QUARANTINE',
                comparison: 'eq',
                value: false,
            },
        ],
        effects: [
            {
                type: 'call_method_on_target',
                method: 'initiateQuarantine',
                params: ['playerFaction'],
            },
        ],
    },
    scrub_network: {
        id: 'scrub_network',
        name: 'Scrub Network',
        description:
            'Deploy a deep-clean of the regional network to reduce the severity of cyber threats.',
        targetType: 'REGION',
        resourceCost: { tech: 600 },
        availability: [
            {
                type: 'selected_threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'CYBER',
            },
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
            {
                type: 'region_has_buff',
                buffType: 'NETWORK_SCRUB',
                comparison: 'eq',
                value: false,
            },
        ],
        effects: [
            {
                type: 'call_method_on_target',
                method: 'scrubNetwork',
                params: ['playerFaction'],
            },
        ],
    },
    counter_propaganda: {
        id: 'counter_propaganda',
        name: 'Launch Counter-Propaganda',
        description:
            'Launch a targeted campaign to counter specific disinformation threats.',
        targetType: 'REGION',
        resourceCost: { intel: 500 },
        availability: [
            {
                type: 'selected_threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'INFO',
            },
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
            {
                type: 'region_has_buff',
                buffType: 'COUNTER_PROPAGANDA',
                comparison: 'eq',
                value: false,
            },
        ],
        effects: [
            {
                type: 'call_method_on_target',
                method: 'launchCounterPropaganda',
                params: ['playerFaction'],
            },
        ],
    },
    invest_in_education: {
        id: 'invest_in_education',
        name: 'Invest in Education',
        description:
            'Invest in a region to improve its education level, making it more resistant to misinformation.',
        targetType: 'REGION',
        resourceCost: { funds: 2000 },
        availability: [
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
            {
                type: 'region_property',
                property: 'education',
                comparison: 'lt',
                value: 1.0,
            },
        ],
        effects: [
            // This requires a custom method on the Region class to handle the logic
            {
                type: 'call_method_on_target',
                method: 'investInEducation',
                params: ['playerFaction'],
            },
        ],
    },

    // --- GLOBAL ACTIONS (Target: GLOBAL) ---
    launch_satellite: {
        id: 'launch_satellite',
        name: 'Launch Recon Satellite',
        description:
            'Launch a satellite to provide a permanent global boost to Intel generation.',
        targetType: 'GLOBAL',
        resourceCost: { funds: 2500, tech: 5000 },
        availability: [
            {
                type: 'world_property_count',
                property: 'satellites',
                filter: {
                    property: 'owner',
                    comparison: 'eq',
                    value: 'PLAYER',
                },
                comparison: 'lt',
                value: 5,
            },
        ],
        effects: [
            {
                type: 'call_method_on_world',
                method: 'launchSatellite',
                params: ['playerFaction'],
            },
        ],
    },

    // --- NEW ACTIONS FROM EXTENSION ---

    // RADIOLOGICAL (Threat Target)
    radiological_cleanup: {
        id: 'radiological_cleanup',
        name: 'Radiological Cleanup',
        description:
            'Decontaminate areas affected by radiation, reducing threat severity.',
        targetType: 'THREAT',
        resourceCost: { funds: 800, tech: 300 }, // manpower cost is not a resource, will ignore for now
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'RAD',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'radiologicalCleanup',
                params: ['playerFaction'],
            },
        ],
    },
    rad_contain: {
        id: 'rad_contain',
        name: 'Contain Radiation',
        description:
            'Deploy shielding to contain radiological contamination and prevent spread.',
        targetType: 'THREAT',
        resourceCost: { funds: 300, tech: 100 },
        availability: [
            {
                type: 'threat_property',
                property: 'domain',
                comparison: 'eq',
                value: 'RAD',
            },
            {
                type: 'threat_property',
                property: 'investigationProgress',
                comparison: 'gte',
                value: 1.0,
            },
        ],
        effects: [
            {
                type: 'call_method',
                method: 'radContain',
                params: ['playerFaction'],
            },
        ],
    },

    // ENVIRONMENTAL (Region Target)
    weather_control: {
        id: 'weather_control',
        name: 'Weather Control',
        description:
            'Manipulate local weather patterns for strategic advantage.',
        targetType: 'REGION',
        resourceCost: { funds: 1000, tech: 800 },
        availability: [
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
        ],
        effects: [
            {
                type: 'call_method_on_world',
                method: 'initiateWeatherControl',
                params: ['selectedRegion', 'CLEAR'],
            }, // Default to clearing weather
        ],
    },

    // GEOLOGICAL (Region Target)
    fortify_region: {
        id: 'fortify_region',
        name: 'Fortify Region',
        description:
            'Reinforce infrastructure to grant a temporary buff against GEO-domain threats.',
        targetType: 'REGION',
        resourceCost: { funds: 1500, tech: 500 },
        availability: [
            {
                type: 'region_property',
                property: 'owner',
                comparison: 'eq',
                value: 'PLAYER',
            },
            {
                type: 'region_has_buff',
                buffType: 'FORTIFIED',
                comparison: 'eq',
                value: false,
            },
        ],
        effects: [
            {
                type: 'call_method_on_target',
                method: 'addBuff',
                params: ['FORTIFIED', 300],
            }, // 300 seconds = 5 minutes
        ],
    },

    // SPACE (Global Target)
    disrupt_satellite_comms: {
        id: 'disrupt_satellite_comms',
        name: 'Disrupt Satellite Comms',
        description:
            'Jam AI satellite communications, temporarily disabling their intel bonus.',
        targetType: 'GLOBAL',
        resourceCost: { intel: 2000, tech: 1500 },
        availability: [
            {
                type: 'world_property_count',
                property: 'satellites',
                filter: { property: 'owner', comparison: 'eq', value: 'AI' },
                comparison: 'gt',
                value: 0,
            },
            {
                type: 'world_has_buff',
                buffType: 'AI_SATELLITE_DISRUPTION',
                comparison: 'eq',
                value: false,
            },
        ],
        effects: [
            {
                type: 'call_method_on_world',
                method: 'disruptAiSatellites',
                params: [180],
            }, // Disrupt for 180 seconds (3 minutes)
        ],
    },
};

export const AgentActions = {
    gather_intel: {
        id: 'gather_intel',
        name: 'Gather Intelligence',
        description:
            'Gather general intelligence in the region. Low risk, low reward.',
        baseRisk: 0.05,
        duration: 20, // seconds
        xpGain: 10,
        requiredAbilities: [],
        isAvailable: (agent) => agent.status === 'IDLE',
        onSuccess: (agent, worldState) => {
            const faction = worldState.factionManager.factions.find(
                (f) => f.id === agent.factionId
            );
            const intelGained = 100 + agent.level * 10;
            faction.resources.intel += intelGained;
            return `Gained ${intelGained} Intel.`;
        },
    },
    steal_tech: {
        id: 'steal_tech',
        name: 'Steal Technology',
        description:
            'Attempt to steal valuable technology from the ruling faction in the region.',
        baseRisk: 0.2,
        duration: 45,
        xpGain: 50,
        requiredAbilities: ['CYBER_SPECIALIST'],
        isAvailable: (agent) =>
            agent.status === 'IDLE' &&
            agent.region.owner !== agent.factionId &&
            agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent, worldState) => {
            const faction = worldState.factionManager.factions.find(
                (f) => f.id === agent.factionId
            );
            const techGained = 250 + agent.level * 25;
            faction.resources.tech += techGained;
            return `Stole ${techGained} Tech.`;
        },
    },
    sabotage: {
        id: 'sabotage',
        name: 'Sabotage Infrastructure',
        description:
            'Sabotage key infrastructure in the region, reducing its economic output.',
        baseRisk: 0.25,
        duration: 60,
        xpGain: 60,
        requiredAbilities: ['DEMOLITIONS_EXPERT'],
        isAvailable: (agent) =>
            agent.status === 'IDLE' &&
            agent.region.owner !== agent.factionId &&
            agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent) => {
            agent.region.economy = Math.max(0.1, agent.region.economy - 0.2);
            return `Economy in ${agent.region.name} damaged.`;
        },
    },
    incite_unrest: {
        id: 'incite_unrest',
        name: 'Incite Unrest',
        description:
            'Spread propaganda and sow discord to lower stability in the region.',
        baseRisk: 0.15,
        duration: 40,
        xpGain: 40,
        requiredAbilities: ['PROPAGANDA_SPECIALIST'],
        isAvailable: (agent) =>
            agent.status === 'IDLE' &&
            agent.region.owner !== agent.factionId &&
            agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent) => {
            agent.region.stability = Math.max(0, agent.region.stability - 0.3);
            return `Stability in ${agent.region.name} lowered.`;
        },
    },
    counter_espionage: {
        id: 'counter_espionage',
        name: 'Counter-Espionage',
        description: 'Patrol the region to detect and neutralize enemy agents.',
        baseRisk: 0.1,
        duration: 50,
        xpGain: 70,
        requiredAbilities: ['COUNTER_INTELLIGENCE'],
        isAvailable: (agent) =>
            agent.status === 'IDLE' && agent.region.owner === agent.factionId,
        onSuccess: (agent, worldState) => {
            const enemyAgents = worldState.worldState.agents.filter(
                (a) =>
                    a.factionId !== agent.factionId && a.region === agent.region
            );
            if (enemyAgents.length > 0) {
                const targetAgent =
                    enemyAgents[Math.floor(Math.random() * enemyAgents.length)];
                targetAgent.status = 'CAPTURED';
                targetAgent.mesh.visible = false; // Hide captured agent
                return `Captured enemy agent ${targetAgent.name}!`;
            }
            return 'No enemy agents found in the region.';
        },
    },
    recruit_informant: {
        id: 'recruit_informant',
        name: 'Recruit Informant',
        description:
            'Recruit an informant in the region to provide a passive intel boost.',
        baseRisk: 0.3,
        duration: 70,
        xpGain: 80,
        requiredAbilities: ['CHARISMA'],
        isAvailable: (agent) =>
            agent.status === 'IDLE' &&
            agent.region.owner !== agent.factionId &&
            agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent) => {
            agent.region.addBuff('INFORMANT_NETWORK', 300, agent.factionId); // 300 seconds (5 minutes) of passive intel
            return `Informant network established in ${agent.region.name}.`;
        },
    },
    dismantle_wmd_program: {
        id: 'dismantle_wmd_program',
        name: 'Dismantle WMD Program',
        description:
            'Attempt to find and dismantle a WMD program in an enemy region. High risk, high reward.',
        baseRisk: 0.4,
        duration: 120, // 2 minutes
        xpGain: 200,
        requiredAbilities: ['DEMOLITIONS_EXPERT', 'COUNTER_INTELLIGENCE'], // Requires multiple skills
        isAvailable: (agent) =>
            agent.status === 'IDLE' && agent.region.owner === 'technocrats', // Only in AI territory
        onSuccess: (agent, worldState) => {
            const wmdThreats = worldState.threatManager.threats.filter(
                (t) =>
                    t.domain === 'WMD' &&
                    worldState.regionManager.getRegionForThreat(t) === agent.region
            );
            if (wmdThreats.length > 0) {
                wmdThreats.forEach((t) => (t.severity *= 0.5)); // Halve severity
                return `Successfully sabotaged WMD program in ${agent.region.name}!`;
            }
            return `No active WMD program was found in ${agent.region.name}, but the mission provided valuable intel.`;
        },
    },
};
