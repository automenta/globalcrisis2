import * as THREE from 'three';
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
        case 'move_unit':
            if (simulation) {
                const unit = simulation.units.find(u => u.id === payload.unitId) || simulation.agents.find(a => a.id === payload.unitId);
                if (unit) {
                    const destination = new THREE.Vector3(payload.destination.x, payload.destination.y, payload.destination.z);
                    unit.moveTo(destination, simulation);
                }
            }
            break;
    }
};

async function init() {
    console.log('Worker: Initializing simulation...');

    const narrativeManagerMock = { logEvent: () => {} };

    regionManager = new RegionManager();
    factionManager = new FactionManager(true);
    threatManager = new ThreatManager(null, narrativeManagerMock, true);
    aiManager = new AIManager(factionManager.aiFaction, true);

    simulation = new Simulation(narrativeManagerMock, true);
    await simulation.init(); // This now loads region data
    simulation.regionManager = regionManager;
    simulation.factionManager = factionManager;
    simulation.threatManager = threatManager;
    simulation.aiManager = aiManager;


    // Generate and post chunk geometry
    simulation.voxelWorld.chunks.forEach(chunk => {
        // For now, only generate LOD 0
        const geometryData = simulation.voxelWorld.generateChunkGeometry(chunk, 0);
        if (geometryData) {
            const transferable = [
                geometryData.positions.buffer,
                geometryData.normals.buffer,
                geometryData.colors.buffer
            ];
            self.postMessage({
                type: 'chunk_geometry',
                payload: {
                    chunkId: chunk.id,
                    chunkPosition: chunk.position,
                    geometry: geometryData
                }
            }, transferable);
        }
    });

    console.log('Worker: Simulation initialized and geometry generated.');
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
