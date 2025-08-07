import { CROSS_DOMAIN_INTERACTIONS } from './constants.js';
import { VoxelWorld, Chunk } from './voxel.js';
import { ClimateGrid } from './climate.js';
import { WeatherSystem } from './weather.js';
import { Faction } from './faction.js';
import { Threat } from './threat.js';
import { Building } from './building.js';
import { Unit } from './unit.js';
import { Satellite } from './satellite.js';
import { Agent } from './agent.js';
import { PathfindingService } from './pathfinding_service.js';
import { UnifiedPhysicsEngine } from './physics_engine.js';
import { PlayerActions } from './actions.js';
import { CHUNK_SIZE, GAME_GRAVITY_CONSTANT } from './constants.js';
import { Region } from './region.js';

export class Simulation {
    constructor(narrativeManager, casualMode = true) {
        this.narrativeManager = narrativeManager;
        this.casualMode = casualMode;
        this.climateGrid = new ClimateGrid();
        this.weatherSystem = new WeatherSystem(this.climateGrid);
        this.voxelWorld = new VoxelWorld();
        this.buildings = [];
        this.units = [];
        this.satellites = [];
        this.agents = [];
        this.threats = [];
        this.plumes = [];
        this.factions = [];
        this.regions = [];
        this.travelRoutes = [];
        this.currentTurn = 0;
        this.globalMetrics = { stability: 1.0, economy: 1.0, trust: 1.0 };
        this.aiAlertLevel = 0;
        this.threatGenerationTimer = 0;
        this.threatGenerationInterval = 3;
        this.research = { advancedAgents: false, isProjectActive: false, activeProject: null, projectProgress: 0, projectCost: 0 };
        this.climateUpdateTimer = 0;
        this.climateUpdateInterval = 2;
        this.pathfindingService = new PathfindingService(this);
        this.physicsEngine = new UnifiedPhysicsEngine();
        this.activeBuffs = [];

    }

    async init() {
        await this.initializeRegions();
        this.initializeVoxelWorld();
        this.initializeFactions();
    }

    async initializeRegions() {
        // This is running in a worker, so we need to specify the path
        const response = await fetch('../../data/regions.json');
        const regionsData = await response.json();
        this.regions = regionsData.map(data => new Region(data));
    }

    initializeVoxelWorld() {
        const planetChunkRadius = 5; // Planet radius in chunks, includes some buffer for terrain noise
        for (let cx = -planetChunkRadius; cx <= planetChunkRadius; cx++) {
            for (let cy = -planetChunkRadius; cy <= planetChunkRadius; cy++) {
                for (let cz = -planetChunkRadius; cz <= planetChunkRadius; cz++) {
                    const chunkPos = new THREE.Vector3(cx, cy, cz);
                    if (chunkPos.length() <= planetChunkRadius) {
                        const chunk = new Chunk({ x: cx, y: cy, z: cz });
                        this.voxelWorld.generateChunk(chunk, this.climateGrid);
                        this.voxelWorld.addChunk(chunk);
                    }
                }
            }
        }
    }

    initializeFactions() {
        const playerResources = { funds: this.casualMode ? 20000 : 10000, intel: this.casualMode ? 10000 : 5000, tech: this.casualMode ? 4000 : 2000 };
        this.playerFaction = new Faction({ id: 'mitigators', name: 'Hero Mitigators', resources: playerResources });
        this.factions.push(this.playerFaction);

        this.aiFaction = new Faction({ id: 'technocrats', name: 'Evil Technocrats', resources: { funds: 20000, intel: 10000, tech: 10000 } });
        if (this.casualMode) this.aiFaction.counterIntel = 0.05;
        this.factions.push(this.aiFaction);
    }

    addBuilding(regionId, type, factionId = 'mitigators') {
        const region = this.regions.find(r => r.id === regionId);
        if (!region) {
            console.error(`Region with id ${regionId} not found.`);
            return false;
        }

        const faction = this.factions.find(f => f.id === factionId);
         if (!faction) {
            console.error(`Faction with id ${factionId} not found.`);
            return false;
        }

        let cost;
        switch (type) {
            case 'BASE': cost = { funds: 1000 }; break;
            case 'SENSOR': cost = { funds: 750 }; break;
            case 'RESEARCH_OUTPOST': cost = { funds: 1200, tech: 500 }; break;
            default: cost = { funds: 99999 };
        }

        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const building = new Building({ region, type, owner: faction.id, position: region.position });
            this.buildings.push(building);
            return true;
        }
        return false;
    }

    addAgent(regionId, factionId = 'mitigators') {
        const region = this.regions.find(r => r.id === regionId);
        if (!region) {
            console.error(`Region with id ${regionId} not found.`);
            return false;
        }

        const faction = this.factions.find(f => f.id === factionId);
         if (!faction) {
            console.error(`Faction with id ${factionId} not found.`);
            return false;
        }

        const cost = { funds: 1500, intel: 500 };
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const agent = new Agent({ id: `agent-${this.agents.length}`, factionId: faction.id, region: region, name: `Agent ${this.agents.length + 1}`, position: region.position });
            this.agents.push(agent);
            this.narrativeManager.logEvent('AGENT_DEPLOYED', { agentId: agent.id, agentName: agent.name, regionName: region.name });
            return true;
        }
        return false;
    }

    launchSatellite(faction) {
        const cost = PlayerActions.launch_satellite.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const spawnRadius = 80;
            const id = `sat-${this.satellites.length}`;
            const position = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 };
            const mag = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
            position.x = position.x / mag * spawnRadius;
            position.y = position.y / mag * spawnRadius;
            position.z = position.z / mag * spawnRadius;

            const orbitalSpeed = Math.sqrt(GAME_GRAVITY_CONSTANT / spawnRadius);
            const velocity = { x: -position.z, y: position.y, z: position.x };
            const vMag = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
            velocity.x = velocity.x / vMag * orbitalSpeed;
            velocity.y = velocity.y / vMag * orbitalSpeed;
            velocity.z = velocity.z / vMag * orbitalSpeed;

            const satellite = new Satellite({ id: id, factionId: faction.id, position: position, velocity: velocity });
            this.satellites.push(satellite);
            this.narrativeManager.logEvent('SATELLITE_LAUNCH', { faction: faction.name, satId: id });
            return true;
        }
        return false;
    }

    addUnit(region, type) {
        let cost;
        switch (type) {
            case 'AGENT': cost = { funds: 500, intel: 100 }; break;
            case 'GROUND_VEHICLE': cost = { funds: 800, tech: 200 }; break;
            case 'AIRCRAFT': cost = { funds: 1000, tech: 400 }; break;
            default: console.error(`Unknown unit type to build: ${type}`); return false;
        }

        if (this.playerFaction.canAfford(cost)) {
            this.playerFaction.spend(cost);
            const unit = new Unit({ region, type, owner: this.playerFaction.id });
            this.units.push(unit);
            this.narrativeManager.logEvent('UNIT_BUILT', { type, regionName: region.name });
            return true;
        }
        return false;
    }

    update(dt) {
        const totalEnvSeverity = this.threats
            .filter((t) => t.domain === 'ENV')
            .reduce((sum, t) => sum + t.severity, 0);

        this.climateGrid.update(dt);

        this.climateUpdateTimer += dt;
        if (this.climateUpdateTimer >= this.climateUpdateInterval) {
            this.voxelWorld.chunks.forEach((chunk) => {
                if (!chunk) return;
                this.voxelWorld.updateChunkForClimateChange(chunk, this.climateGrid);
            });
            this.climateUpdateTimer = 0;
        }

        this.weatherSystem.update(this.voxelWorld, dt, totalEnvSeverity);
        this.currentTurn++;
        this.physicsEngine.update(dt, this);
        this.threats.forEach((threat) => threat.update(dt, this));
        this.units.forEach((unit) => unit.update(dt, this));
        this.agents.forEach((agent) => agent.update(dt, this));
        this.satellites.forEach((satellite) => satellite.update(dt, this));

        this.threats = this.threats.filter((t) => !t.isMitigated);
    }
}
