// src/narrative.js

/**
 * This module contains the foundational components for the Narrative Engine.
 * It provides a central place to log significant events, which can later be
 * used to generate dynamic chronicles and storylines as described in narrative.md.
 */

class NarrativeManager {
    constructor() {
        this.eventLog = [];
        this.chronicles = [];
        this.processedEventIds = new Set(); // Keep track of events that have been part of a chronicle
    }

    /**
     * Logs a significant event from the simulation.
     * @param {string} eventType - A specific identifier for the type of event (e.g., 'QUANTUM_DECOHERENCE').
     * @param {object} data - A payload containing relevant data about the event.
     */
    logEvent(eventType, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: `event-${Date.now()}-${Math.random()}`, // Unique ID for the event
            timestamp,
            eventType,
            data
        };

        this.eventLog.push(logEntry);
        console.log('%c[Narrative Event]', 'color: #8A2BE2; font-weight: bold;', eventType, logEntry.data);
    }

    /**
     * This method is called in the main game loop to process events and generate chronicles.
     * @param {WorldState} worldState - The current state of the world.
     */
    update(worldState) {
        this.checkForCyberRadSynergy();
    }

    /**
     * A simple rule to generate a chronicle for a specific cross-domain event.
     */
    checkForCyberRadSynergy() {
        const unprocessedEvents = this.eventLog.filter(event => !this.processedEventIds.has(event.id));

        for (const event of unprocessedEvents) {
            if (event.eventType === 'CYBER_RAD_SYNERGY') {
                // Found a candidate event, let's create a chronicle
                const radChain = {
                    id: `chain-${Date.now()}`,
                    title: "The Chernobyl Echo",
                    timeline: [event.id],
                    primaryFactions: ["NATION_STATE", "MITIGATOR"], // Placeholder
                    globalImpact: 0.82,
                    keyOutcomes: ["Continent-wide contamination", "Nuclear disarmament calls"],
                    domainsInvolved: ["RAD", "CYBER", "ENV", "GEO"],
                    turningPoint: event.id,
                    resolution: "NEGATIVE",
                    duration: 15, // Placeholder
                    radContamination: 0.87,
                    description: `A major cyber-attack has compromised nuclear facility safety protocols, leading to a significant radiological event. The synergy between digital and radiological threats marks a new, dangerous chapter in global security.`
                };

                this.chronicles.push(radChain);
                this.processedEventIds.add(event.id);

                // For now, we'll only generate one chronicle of this type to avoid spam.
                // A more advanced system would have cooldowns or more complex conditions.
                break;
            }
        }
    }
}
