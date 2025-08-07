import { Simulation } from './simulation.js';
import { RegionManager } from './managers/RegionManager.js';
import { FactionManager } from './managers/FactionManager.js';
import { ThreatManager } from './managers/ThreatManager.js';
import { AIManager } from './managers/AIManager.js';

let simulation;
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
            if (simulation) {
                threatManager.generateThreat(payload, simulation);
            }
            break;
    }
};

function init() {
    console.log('Worker: Initializing simulation...');

    const narrativeManagerMock = { logEvent: () => {} };

    regionManager = new RegionManager();
    factionManager = new FactionManager(true);
    threatManager = new ThreatManager(null, narrativeManagerMock, true);
    aiManager = new AIManager(factionManager.aiFaction, true);

    simulation = new Simulation(narrativeManagerMock, true);
    simulation.regionManager = regionManager;
    simulation.factionManager = factionManager;
    simulation.threatManager = threatManager;
    simulation.aiManager = aiManager;

    console.log('Worker: Simulation initialized.');
    self.postMessage({ type: 'init_complete' });
}

function start() {
    console.log('Worker: Starting simulation loop...');
    const SIMULATION_TICK_RATE = 1000 / 30; // 30 ticks per second
    setInterval(update, SIMULATION_TICK_RATE);
}

function update() {
    if (!simulation) return;

    const deltaTime = 1 / 30;

    simulation.update(deltaTime);
    regionManager.update(deltaTime, simulation);
    factionManager.update(deltaTime, simulation);
    threatManager.update(deltaTime, simulation);
    aiManager.update(deltaTime, simulation);

    self.postMessage({ type: 'update', payload: simulation });
}
