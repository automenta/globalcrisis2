// src/narrative.js

/**
 * This module contains the foundational components for the Narrative Engine.
 * It provides a central place to log significant events, which can later be
 * used to generate dynamic chronicles and storylines as described in narrative.md.
 */

export class NarrativeManager {
    constructor() {
        this.eventLog = [];
        this.chronicles = [];
        this.processedEventIds = new Set();
    }

    logEvent(eventType, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: `event-${Date.now()}-${Math.random()}`,
            timestamp,
            eventType,
            data
        };
        this.eventLog.push(logEntry);
        console.log('%c[Narrative Event]', 'color: #8A2BE2; font-weight: bold;', eventType, logEntry.data);
    }

    update(worldState) {
        const unprocessedEvents = this.eventLog.filter(event => !this.processedEventIds.has(event.id));

        for (const event of unprocessedEvents) {
            for (const ruleId in ChronicleRules) {
                const rule = ChronicleRules[ruleId];
                if (rule.trigger === event.eventType) {
                    if (rule.condition(event, this.eventLog)) {
                        this.generateChronicle(rule, event, worldState);
                        this.processedEventIds.add(event.id);
                        // An event can only trigger one chronicle
                        break;
                    }
                }
            }
        }
    }

    generateChronicle(rule, triggeringEvent, worldState) {
        const templateData = rule.getTemplateData(triggeringEvent, this.eventLog, worldState);

        let title = rule.title;
        let description = rule.description;

        // Replace placeholders like {regionName} with actual data
        for (const key in templateData) {
            const regex = new RegExp(`{${key}}`, 'g');
            title = title.replace(regex, templateData[key]);
            description = description.replace(regex, templateData[key]);
        }

        const chronicle = {
            id: `chronicle-${Date.now()}`,
            title,
            description,
            timestamp: new Date().toISOString(),
            ruleId: rule.id,
            relatedEvents: [triggeringEvent.id]
        };

        this.chronicles.push(chronicle);

        // Handle the onTrigger effect if it exists
        if (rule.onTrigger) {
            rule.onTrigger(worldState, triggeringEvent);
        }
    }
}
