// src/actions.js

const PlayerActions = {
    // --- GENERIC ACTIONS ---
    'investigate': {
        id: 'investigate',
        name: 'Investigate',
        description: 'Spend Intel to learn more about an unknown threat.',
        resourceCost: { intel: 100 },
        isAvailable: (threat) => threat.investigationProgress < 1.0,
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
    'counter_intel': {
        id: 'counter_intel',
        domain: 'INFO',
        name: 'Deploy Counter-Intel',
        description: 'Reduce the spread rate of an information-based threat.',
        resourceCost: { intel: 250, funds: 100 },
        isAvailable: (threat) => threat.domain === 'INFO' && threat.investigationProgress >= 1.0,
        execute: (threat, faction) => threat.deployCounterIntel(faction)
    },
    'stabilize_markets': {
        id: 'stabilize_markets',
        domain: 'ECON',
        name: 'Stabilize Markets',
        description: 'Use funds to reduce the severity of an economic threat.',
        resourceCost: { funds: 1000 },
        isAvailable: (threat) => threat.domain === 'ECON' && threat.investigationProgress >= 1.0,
        execute: (threat, faction) => threat.stabilizeMarkets(faction)
    },
    'robotic_sabotage': {
        id: 'robotic_sabotage',
        domain: 'ROBOT',
        name: 'Robotic Sabotage',
        description: 'Attempt to sabotage a robotic threat, reducing its collective intelligence.',
        resourceCost: { tech: 400, intel: 200 },
        isAvailable: (threat) => threat.domain === 'ROBOT' && threat.investigationProgress >= 1.0,
        execute: (threat, faction) => threat.sabotageRobotics(faction)
    },
    'induce_decoherence': {
        id: 'induce_decoherence',
        domain: 'QUANTUM',
        name: 'Induce Decoherence',
        description: 'Use targeted energy to accelerate the collapse of a quantum threat\'s coherence.',
        resourceCost: { tech: 500, funds: 300 },
        isAvailable: (threat) => threat.domain === 'QUANTUM' && threat.investigationProgress >= 1.0 && threat.quantumProperties.coherenceTime > 0,
        execute: (threat, faction) => threat.induceDecoherence(faction)
    },

    // --- GLOBAL/PROACTIVE ACTIONS ---
    'fund_research': {
        id: 'fund_research',
        name: 'Fund Research',
        description: 'Invest in a long-term research project to gain a technological advantage.',
        resourceCost: { tech: 2000 },
        isAvailable: (threat, worldState) => !worldState.research.isProjectActive,
        execute: (threat, faction, worldState) => worldState.startResearchProject('advanced_materials')
    },
    'diplomatic_mission': {
        id: 'diplomatic_mission',
        name: 'Launch Diplomatic Mission',
        description: 'Send a diplomatic mission to a region to improve stability and trust.',
        resourceCost: { funds: 1500 },
        isAvailable: (threat, worldState, region) => region && !region.activeMission,
        execute: (threat, faction, worldState, region) => region.startDiplomaticMission()
    },
    'awareness_campaign': {
        id: 'awareness_campaign',
        name: 'Public Awareness Campaign',
        description: 'Launch a campaign to counter misinformation in a region.',
        resourceCost: { funds: 500, intel: 200 },
        isAvailable: (threat, worldState, region) => region && !region.activeMission,
        execute: (threat, faction, worldState, region) => region.startAwarenessCampaign()
    },
    'deploy_network_infrastructure': {
        id: 'deploy_network_infrastructure',
        name: 'Deploy Network Infrastructure',
        description: 'Invest in a region to improve its internet access, boosting tech generation and goal progress.',
        resourceCost: { funds: 800, tech: 400 },
        isAvailable: (threat, worldState, region) => region && region.attributes.internetAccess < 1.0,
        execute: (threat, faction, worldState, region) => region.deployNetworkInfrastructure(faction)
    },
    'launch_satellite': {
        id: 'launch_satellite',
        name: 'Launch Recon Satellite',
        description: 'Launch a satellite to provide a permanent global boost to Intel generation.',
        resourceCost: { funds: 2500, tech: 5000 },
        isAvailable: (threat, worldState) => worldState.satellites.filter(s => s.owner === worldState.playerFaction.id).length < 5,
        execute: (threat, faction, worldState) => worldState.launchSatellite(faction)
    },
    'initiate_quarantine': {
        id: 'initiate_quarantine',
        name: 'Initiate Quarantine',
        description: 'Enforce a regional quarantine to slow the spread of biological threats.',
        resourceCost: { funds: 700 },
        isAvailable: (threat, worldState, region) => threat && threat.domain === 'BIO' && region.owner === 'PLAYER' && !region.activeBuffs.some(b => b.type === 'QUARANTINE'),
        execute: (threat, faction, worldState, region) => region.initiateQuarantine(faction)
    },
    'scrub_network': {
        id: 'scrub_network',
        name: 'Scrub Network',
        description: 'Deploy a deep-clean of the regional network to reduce the severity of cyber threats.',
        resourceCost: { tech: 600 },
        isAvailable: (threat, worldState, region) => threat && threat.domain === 'CYBER' && region.owner === 'PLAYER' && !region.activeBuffs.some(b => b.type === 'NETWORK_SCRUB'),
        execute: (threat, faction, worldState, region) => region.scrubNetwork(faction)
    },
    'counter_propaganda': {
        id: 'counter_propaganda',
        name: 'Launch Counter-Propaganda',
        description: 'Launch a targeted campaign to counter specific disinformation threats.',
        resourceCost: { intel: 500 },
        isAvailable: (threat, worldState, region) => threat && threat.domain === 'INFO' && region.owner === 'PLAYER' && !region.activeBuffs.some(b => b.type === 'COUNTER_PROPAGANDA'),
        execute: (threat, faction, worldState, region) => region.launchCounterPropaganda(faction)
    },
    'invest_in_education': {
        id: 'invest_in_education',
        name: 'Invest in Education',
        description: 'Invest in a region to improve its education level, making it more resistant to misinformation.',
        resourceCost: { funds: 2000 },
        isAvailable: (threat, worldState, region) => region && region.owner === 'PLAYER' && region.education < 1.0,
        execute: (threat, faction, worldState, region) => {
            if (faction.canAfford({ funds: 2000 })) {
                faction.spend({ funds: 2000 });
                region.education = Math.min(1.0, region.education + 0.1);
                return true;
            }
            return false;
        }
    }
};

const AgentActions = {
    'gather_intel': {
        id: 'gather_intel',
        name: 'Gather Intelligence',
        description: 'Gather general intelligence in the region. Low risk, low reward.',
        baseRisk: 0.05,
        duration: 20, // seconds
        xpGain: 10,
        requiredAbilities: [],
        isAvailable: (agent) => agent.status === 'IDLE',
        onSuccess: (agent, worldState) => {
            const faction = worldState.factions.find(f => f.id === agent.factionId);
            const intelGained = 100 + (agent.level * 10);
            faction.resources.intel += intelGained;
            return `Gained ${intelGained} Intel.`;
        }
    },
    'steal_tech': {
        id: 'steal_tech',
        name: 'Steal Technology',
        description: 'Attempt to steal valuable technology from the ruling faction in the region.',
        baseRisk: 0.20,
        duration: 45,
        xpGain: 50,
        requiredAbilities: ['CYBER_SPECIALIST'],
        isAvailable: (agent) => agent.status === 'IDLE' && agent.region.owner !== agent.factionId && agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent, worldState) => {
            const faction = worldState.factions.find(f => f.id === agent.factionId);
            const techGained = 250 + (agent.level * 25);
            faction.resources.tech += techGained;
            return `Stole ${techGained} Tech.`;
        }
    },
    'sabotage': {
        id: 'sabotage',
        name: 'Sabotage Infrastructure',
        description: 'Sabotage key infrastructure in the region, reducing its economic output.',
        baseRisk: 0.25,
        duration: 60,
        xpGain: 60,
        requiredAbilities: ['DEMOLITIONS_EXPERT'],
        isAvailable: (agent) => agent.status === 'IDLE' && agent.region.owner !== agent.factionId && agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent, worldState) => {
            agent.region.economy = Math.max(0.1, agent.region.economy - 0.2);
            return `Economy in ${agent.region.name} damaged.`;
        }
    },
    'incite_unrest': {
        id: 'incite_unrest',
        name: 'Incite Unrest',
        description: 'Spread propaganda and sow discord to lower stability in the region.',
        baseRisk: 0.15,
        duration: 40,
        xpGain: 40,
        requiredAbilities: ['PROPAGANDA_SPECIALIST'],
        isAvailable: (agent) => agent.status === 'IDLE' && agent.region.owner !== agent.factionId && agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent, worldState) => {
            agent.region.stability = Math.max(0, agent.region.stability - 0.3);
            return `Stability in ${agent.region.name} lowered.`;
        }
    },
    'counter_espionage': {
        id: 'counter_espionage',
        name: 'Counter-Espionage',
        description: 'Patrol the region to detect and neutralize enemy agents.',
        baseRisk: 0.10,
        duration: 50,
        xpGain: 70,
        requiredAbilities: ['COUNTER_INTELLIGENCE'],
        isAvailable: (agent) => agent.status === 'IDLE' && agent.region.owner === agent.factionId,
        onSuccess: (agent, worldState) => {
            const enemyAgents = worldState.agents.filter(a => a.factionId !== agent.factionId && a.region === agent.region);
            if (enemyAgents.length > 0) {
                const targetAgent = enemyAgents[Math.floor(Math.random() * enemyAgents.length)];
                targetAgent.status = 'CAPTURED';
                targetAgent.mesh.visible = false; // Hide captured agent
                return `Captured enemy agent ${targetAgent.name}!`;
            }
            return 'No enemy agents found in the region.';
        }
    },
    'recruit_informant': {
        id: 'recruit_informant',
        name: 'Recruit Informant',
        description: 'Recruit an informant in the region to provide a passive intel boost.',
        baseRisk: 0.30,
        duration: 70,
        xpGain: 80,
        requiredAbilities: ['CHARISMA'],
        isAvailable: (agent) => agent.status === 'IDLE' && agent.region.owner !== agent.factionId && agent.region.owner !== 'NEUTRAL',
        onSuccess: (agent, worldState) => {
            agent.region.addBuff('INFORMANT_NETWORK', 300, agent.factionId); // 300 seconds (5 minutes) of passive intel
            return `Informant network established in ${agent.region.name}.`;
        }
    }
};
