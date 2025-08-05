const ChronicleRules = {
    'crisis_averted': {
        title: 'Crisis Averted in {regionName}',
        description: 'A {domain} threat that emerged in {regionName} has been successfully neutralized by {factionName}.',
        trigger: 'THREAT_MITIGATED',
        condition: (triggeringEvent, eventLog) => {
            const threatId = triggeringEvent.data.threatId;
            const generationEvent = eventLog.find(e => e.eventType === 'THREAT_GENERATED' && e.data.threatId === threatId);
            return generationEvent !== undefined;
        },
        getTemplateData: (triggeringEvent, eventLog, worldState) => {
            const threat = triggeringEvent.data.threat;
            const region = worldState.getRegionForThreat(threat);
            const faction = worldState.factions.find(f => f.id === triggeringEvent.data.factionId);
            return {
                regionName: region ? region.name : 'an unknown region',
                domain: threat.domain,
                factionName: faction ? faction.name : 'an unknown entity'
            };
        }
    },
    'technocrat_plot': {
        title: 'Technocrat Plot Uncovered in {regionName}',
        description: 'A {domain} threat secretly deployed by the Evil Technocrats in {regionName} has been exposed and neutralized.',
        trigger: 'THREAT_MITIGATED',
        condition: (triggeringEvent, eventLog) => {
            const threatId = triggeringEvent.data.threatId;
            const generationEvent = eventLog.find(e => e.eventType === 'THREAT_GENERATED' && e.data.threatId === threatId);
            return generationEvent && generationEvent.data.isFromAI && triggeringEvent.data.factionId === 'mitigators';
        },
        getTemplateData: (triggeringEvent, eventLog, worldState) => {
            const threat = triggeringEvent.data.threat;
            const region = worldState.getRegionForThreat(threat);
            return {
                regionName: region ? region.name : 'an unknown region',
                domain: threat.domain,
            };
        },
        onTrigger: (worldState) => {
            // Reward the player with a temporary counter-intel boost
            worldState.playerFaction.counterIntel += 0.1;
            setTimeout(() => {
                worldState.playerFaction.counterIntel -= 0.1;
            }, 60000); // Buff lasts for 1 minute
        }
    },
    'fallout_warning': {
        title: 'Nuclear Fallout Detected',
        description: 'A WMD detonation in {regionName} has resulted in significant radioactive fallout, creating a new radiological threat.',
        trigger: 'WMD_DETONATION',
        condition: (triggeringEvent, eventLog) => triggeringEvent.data.yield > 20,
        getTemplateData: (triggeringEvent, eventLog, worldState) => ({
            regionName: triggeringEvent.data.region
        })
    },
    'agent_promoted': {
        title: 'Agent Promoted: {agentName}',
        description: 'Agent {agentName} has been promoted to level {newLevel} after demonstrating exceptional skill in the field.',
        trigger: 'AGENT_LEVEL_UP',
        condition: (triggeringEvent, eventLog) => triggeringEvent.data.newLevel > 1,
        getTemplateData: (triggeringEvent) => ({
            agentName: triggeringEvent.data.agentName,
            newLevel: triggeringEvent.data.newLevel
        })
    },
    'agent_captured_narrative': {
        title: 'Agent Captured: {agentName}',
        description: 'Agent {agentName} was captured during a failed {missionName} mission in {regionName}. Their fate is unknown.',
        trigger: 'AGENT_CAPTURED',
        condition: () => true,
        getTemplateData: (triggeringEvent) => ({
            agentName: triggeringEvent.data.agentName,
            missionName: triggeringEvent.data.missionName,
            regionName: triggeringEvent.data.regionName
        })
    },
    'critical_success': {
        title: 'Critical Success: {missionName}',
        description: 'Agent {agentName} achieved a critical success during a high-stakes {missionName} mission in {regionName}, yielding exceptional results.',
        trigger: 'MISSION_SUCCESS',
        condition: (triggeringEvent, eventLog, worldState) => {
            const agent = worldState.agents.find(a => a.name === triggeringEvent.data.agentName);
            return agent && agent.level >= 3 && agent.mission && agent.mission.risk > 0.5;
        },
        getTemplateData: (triggeringEvent) => ({
            missionName: triggeringEvent.data.missionName,
            agentName: triggeringEvent.data.agentName,
            regionName: triggeringEvent.data.regionName
        })
    },
    'ai_expansion': {
        title: 'Technocrat Expansion',
        description: 'The Technocrats have expanded their influence by claiming the region of {regionName}.',
        trigger: 'REGION_CLAIMED',
        condition: (triggeringEvent) => triggeringEvent.data.faction === 'Evil Technocrats',
        getTemplateData: (triggeringEvent) => ({
            regionName: triggeringEvent.data.region
        })
    },
    'satellite_launch_success': {
        title: 'Satellite in Orbit',
        description: 'The {factionName} have successfully launched a new satellite, boosting their global intelligence capabilities.',
        trigger: 'SATELLITE_LAUNCH',
        condition: () => true,
        getTemplateData: (triggeringEvent) => ({
            factionName: triggeringEvent.data.faction
        })
    }
};
