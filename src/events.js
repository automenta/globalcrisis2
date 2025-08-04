/**
 * @file Manages the generation and effects of global events.
 */

const WorldEvents = [
    {
        id: 'economic_boom',
        title: 'Global Economic Boom',
        description: 'A wave of innovation and investment leads to a global economic boom. All factions receive a significant funding boost.',
        weight: 10,
        /**
         * @param {WorldState} worldState
         */
        effect: (worldState) => {
            worldState.factions.forEach(faction => {
                faction.resources.funds += 5000;
            });
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Economic Boom', description: 'The world economy is flourishing.' });
        }
    },
    {
        id: 'political_scandal',
        title: 'Major Political Scandal',
        description: 'A major political scandal erupts in a random region, causing instability and reducing trust in the ruling faction.',
        weight: 10,
        /**
         * @param {WorldState} worldState
         */
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
        /**
         * @param {WorldState} worldState
         */
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
        /**
         * @param {WorldState} worldState
         */
        effect: (worldState) => {
            const region = worldState.regions[Math.floor(Math.random() * worldState.regions.length)];
            region.economy = Math.max(0, region.economy - 0.3);
            region.stability = Math.max(0, region.stability - 0.3);
            worldState.narrativeManager.logEvent('GLOBAL_EVENT', { title: 'Natural Disaster', description: `A disaster has struck ${region.name}.` });
        }
    }
];

class EventManager {
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
        const totalWeight = WorldEvents.reduce((sum, event) => sum + event.weight, 0);
        let random = Math.random() * totalWeight;

        for (const event of WorldEvents) {
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
