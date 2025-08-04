// src/narrative.js

/**
 * This module contains the foundational components for the Narrative Engine.
 * It provides a central place to log significant events, which can later be
 * used to generate dynamic chronicles and storylines as described in narrative.md.
 */

class NarrativeManager {
    constructor() {
        this.eventLog = [];
    }

    /**
     * Logs a significant event from the simulation.
     * @param {string} eventType - A specific identifier for the type of event (e.g., 'QUANTUM_DECOHERENCE').
     * @param {object} data - A payload containing relevant data about the event.
     */
    static logEvent(eventType, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            eventType,
            data
        };

        // For now, we just log it to the console in a structured format.
        // In the future, this could push to an event log, trigger chronicle generation, etc.
        console.log('%c[Narrative Event]', 'color: #8A2BE2; font-weight: bold;', eventType, logEntry.data);

        // this.eventLog.push(logEntry); // This would be for an instance-based logger
    }
}

// In a real ES6 module system, we would use `export default NarrativeManager;`
// We are using a static method here so we don't need to instantiate the manager to use it.
// This makes it easy to call from anywhere in the code, e.g., `NarrativeManager.logEvent(...)`.
