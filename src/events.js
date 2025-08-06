/**
 * @file Manages the generation and effects of global events.
 * Events are now conditional and more varied.
 */

const WorldEvents = [
    {
        id: 'economic_boom',
        title: 'Global Economic Boom',
        description: 'A wave of innovation and investment leads to a global economic boom. All factions receive a significant funding boost.',
        weight: 10,
        condition: (worldState) => worldState.globalMetrics.economy < 0.8, // Only happens if economy is not already booming
        effect: (worldState) => {
            worldState.factions.forEach(faction => {
                faction.resources.funds += 5000;
            });
            worldState.globalMetrics.economy = Math.min(1.0, worldState.globalMetrics.economy + 0.1);
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Economic Boom', description: 'The world economy is flourishing.' });
        }
    },
    {
        id: 'market_correction',
        title: 'Global Market Correction',
        description: 'A speculative bubble bursts, causing a slight market correction. Global economy dips slightly.',
        weight: 5,
        condition: (worldState) => worldState.globalMetrics.economy > 0.9, // Only happens if economy is high
        effect: (worldState) => {
            worldState.globalMetrics.economy -= 0.1;
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Market Correction', description: 'The global markets have cooled down.' });
        }
    },
    {
        id: 'political_scandal',
        title: 'Major Political Scandal',
        description: 'A major political scandal erupts in a random region, causing instability and reducing trust in the ruling faction.',
        weight: 10,
        condition: (worldState) => worldState.globalMetrics.trust > 0.3,
        effect: (worldState) => {
            const region = worldState.regions[Math.floor(Math.random() * worldState.regions.length)];
            region.stability = Math.max(0, region.stability - 0.2);
            worldState.globalMetrics.trust = Math.max(0, worldState.globalMetrics.trust - 0.1);
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Political Scandal', description: `A scandal in ${region.name} has rocked the world.` });
        }
    },
    {
        id: 'scientific_breakthrough',
        title: 'Scientific Breakthrough',
        description: 'A major scientific breakthrough provides a significant boost to all factions\' tech resources.',
        weight: 10,
        condition: () => true, // Can always happen
        effect: (worldState) => {
            worldState.factions.forEach(faction => {
                faction.resources.tech += 2000;
            });
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Scientific Breakthrough', description: 'A new discovery promises to change the world.' });
        }
    },
    {
        id: 'natural_disaster',
        title: 'Natural Disaster',
        description: 'A severe natural disaster strikes a random region, causing widespread devastation.',
        weight: 5,
        condition: (worldState) => worldState.regions.some(r => r.attributes.climateVulnerability > 0.6),
        effect: (worldState) => {
            const vulnerableRegions = worldState.regions.filter(r => r.attributes.climateVulnerability > 0.6);
            const region = vulnerableRegions[Math.floor(Math.random() * vulnerableRegions.length)];
            region.economy = Math.max(0, region.economy - 0.3);
            region.stability = Math.max(0, region.stability - 0.3);
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Natural Disaster', description: `A disaster has struck ${region.name}.` });
        }
    },
    {
        id: 'solar_flare',
        title: 'Major Solar Flare',
        description: 'A major solar flare disrupts satellite communications, temporarily disabling all satellites.',
        weight: 3,
        condition: (worldState) => worldState.satellites.length > 0,
        effect: (worldState) => {
            // This is a good candidate for a temporary global debuff system in the future.
            // For now, we'll just log the event. A more advanced implementation could disable satellite bonuses.
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Solar Flare', description: 'Satellite communications have been disrupted.' });
        }
    }
];

export class EventManager {
    constructor(worldState) {
        this.worldState = worldState;
        this.eventTimer = 0;
        this.eventInterval = 60; // seconds
    }

    update(dt) {
        this.eventTimer += dt;
        if (this.eventTimer >= this.eventInterval) {
            this.triggerRandomEvent();
            this.eventTimer = 0;
        }
    }

    triggerRandomEvent() {
        // Filter events that can be triggered
        const possibleEvents = WorldEvents.filter(event => event.condition(this.worldState));

        if (possibleEvents.length === 0) {
            console.log("No valid global events to trigger at this time.");
            return;
        }

        const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
        let random = Math.random() * totalWeight;

        for (const event of possibleEvents) {
            random -= event.weight;
            if (random <= 0) {
                this.triggerEvent(event);
                return;
            }
        }
    }

    triggerEvent(event) {
        console.log(`Triggering event: ${event.title}`);
        event.effect(this.worldState);
    }
}
