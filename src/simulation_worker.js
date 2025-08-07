// src/simulation_worker.js

import { WorldState } from './world.js';
import { RegionManager } from './managers/RegionManager.js';
import { FactionManager } from './managers/FactionManager.js';
import { ThreatManager } from './managers/ThreatManager.js';
import { AIManager } from './managers/AIManager.js';

let worldState;
let regionManager;
let factionManager;
let threatManager;
let aiManager;

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            init(payload);
            break;
        case 'start':
            start();
            break;
        case 'DEBUG_CREATE_THREAT':
            if (worldState) {
                threatManager.generateThreat(payload, worldState);
            }
            break;
        // Add other cases for user input, etc.
    }
};

function init() {
    console.log('Worker: Initializing simulation...');

    // We don't have a THREE.Scene in the worker, so we'll need to pass `null`
    // or a mock object to the managers that expect it.
    // This is a key part of the refactoring. For now, we'll pass null.
    const scene_mock = null;

    regionManager = new RegionManager(scene_mock);
    factionManager = new FactionManager(true);
    threatManager = new ThreatManager(scene_mock, null, true); // narrativeManager is null for now
    aiManager = new AIManager(factionManager.aiFaction, true);

    worldState = new WorldState(scene_mock, null, true); // narrativeManager is null for now
    worldState.regionManager = regionManager;
    worldState.factionManager = factionManager;
    worldState.threatManager = threatManager;
    worldState.aiManager = aiManager;

    console.log('Worker: Simulation initialized.');

    // Post a message back to the main thread to confirm initialization
    self.postMessage({ type: 'init_complete' });
}

function start() {
    console.log('Worker: Starting simulation loop...');
    // We'll use a fixed time step for the simulation loop
    const SIMULATION_TICK_RATE = 1000 / 30; // 30 ticks per second
    setInterval(update, SIMULATION_TICK_RATE);
}

function update() {
    const deltaTime = 1 / 30; // Fixed delta time

    // The order of updates is important.
    // 1. Update world state (e.g., global metrics).
    worldState.update(deltaTime, null); // cameraPosition is null
    // 2. Update regions and factions, as they may affect threats.
    regionManager.update(deltaTime, worldState);
    factionManager.update(deltaTime, worldState);
    // 3. Update threats based on the current state.
    threatManager.update(deltaTime, worldState);
    // 4. Update AI based on the new state of the world.
    aiManager.update(deltaTime, worldState);

    // After updating, we get the delta and send it to the main thread.
    const delta = threatManager.getDelta();

    // We only need to send the data that's relevant for rendering.
    const serializeThreat = (t) => ({
        id: t.id,
        domain: t.domain,
        type: t.type,
        lat: t.lat,
        lon: t.lon,
        severity: t.severity,
        investigationProgress: t.investigationProgress,
        investigationCompleted: t.investigationCompleted,
        visibility: t.visibility,
        spreadRate: t.spreadRate,
        isMitigated: t.isMitigated,
        quantumProperties: t.quantumProperties,
        roboticProperties: t.roboticProperties,
    });

    const deltaPayload = {
        newThreats: delta.newThreats.map(serializeThreat),
        updatedThreats: delta.updatedThreats.map(serializeThreat),
        removedThreatIds: delta.removedThreatIds,
    };

    if (deltaPayload.newThreats.length > 0 || deltaPayload.updatedThreats.length > 0 || deltaPayload.removedThreatIds.length > 0) {
        self.postMessage({ type: 'update', payload: deltaPayload });
    }
}
