import { CROSS_DOMAIN_INTERACTIONS } from './constants.js';

import * as THREE from 'three';
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

export class WorldState {
    constructor(scene, narrativeManager, casualMode = true) {
        this.scene = scene;
        this.narrativeManager = narrativeManager;
        this.casualMode = casualMode;
        this.climateGrid = new ClimateGrid();
        this.weatherSystem = new WeatherSystem(this.climateGrid);
        this.voxelWorld = new VoxelWorld();
        this.initializeVoxelWorld();
        this.buildings = [];
        this.units = [];
        this.satellites = [];
        this.agents = [];
        this.currentTurn = 0;
        this.globalMetrics = {
            stability: 1.0,
            economy: 1.0,
            trust: 1.0,
        };
        this.aiAlertLevel = 0; // 0: low, 1: medium, 2: high
        this.threatGenerationTimer = 0;
        this.threatGenerationInterval = 3; // seconds
        this.research = {
            advancedAgents: false,
            isProjectActive: false,
            activeProject: null,
            projectProgress: 0,
            projectCost: 0,
        };
        this.climateUpdateTimer = 0;
        this.climateUpdateInterval = 2; // Update climate every 2 seconds
        this.pathfindingService = new PathfindingService(this);
        this.physicsEngine = new UnifiedPhysicsEngine();

        this.activeBuffs = []; // For global buffs like satellite disruption
    }

    // --- NEW ACTION-RELATED METHODS ---

    initiateWeatherControl(region, weatherType) {
        if (!region || !weatherType) return false;
        console.log(
            `Player initiated weather control in ${region.name}, setting to ${weatherType}.`
        );
        this.weatherSystem.setWeatherInRegion(region, weatherType);
        return true;
    }

    disruptAiSatellites(duration) {
        if (
            !this.activeBuffs.some((b) => b.type === 'AI_SATELLITE_DISRUPTION')
        ) {
            this.activeBuffs.push({
                type: 'AI_SATELLITE_DISRUPTION',
                duration,
            });
            console.log(
                `AI satellite communications disrupted for ${duration} seconds.`
            );
            this.narrativeManager.logEvent('AI_SATELLITES_DISRUPTED', {
                duration,
            });
            return true;
        }
        return false;
    }

    // --- END NEW METHODS ---

    updateWorldClimate() {
        this.voxelWorld.chunks.forEach((chunk) => {
            if (!chunk) return;

            const oldMesh = chunk.mesh;
            const meshWasUpdated = this.voxelWorld.updateChunkForClimateChange(
                chunk,
                this.climateGrid
            );

            if (meshWasUpdated) {
                if (oldMesh) {
                    this.scene.remove(oldMesh);
                    if (oldMesh.geometry) oldMesh.geometry.dispose();
                    if (oldMesh.material) oldMesh.material.dispose();
                }
                if (chunk.mesh) {
                    this.scene.add(chunk.mesh);
                }
            }
        });
    }

    initializeVoxelWorld() {
        const worldSize = 4; // in chunks, e.g., 4x4x4 grid

        for (let cx = -worldSize / 2; cx < worldSize / 2; cx++) {
            for (let cy = -worldSize / 2; cy < worldSize / 2; cy++) {
                for (let cz = -worldSize / 2; cz < worldSize / 2; cz++) {
                    const chunk = new Chunk(new THREE.Vector3(cx, cy, cz));
                    this.voxelWorld.generateChunk(chunk, this.climateGrid);
                    for (let lod = 0; lod < this.voxelWorld.numLods; lod++) {
                        this.voxelWorld.createMeshForChunk(chunk, lod);
                        if (chunk.meshes[lod]) {
                            this.scene.add(chunk.meshes[lod]);
                        }
                    }
                    this.voxelWorld.addChunk(chunk);
                }
            }
        }
    }

    initializeFactions() {
        // Player Faction
        const playerResources = {
            funds: this.casualMode ? 20000 : 10000,
            intel: this.casualMode ? 10000 : 5000,
            tech: this.casualMode ? 4000 : 2000,
        };
        this.playerFaction = new Faction({
            id: 'mitigators',
            name: 'Hero Mitigators',
            resources: playerResources,
        });
        this.factions.push(this.playerFaction);

        // AI Faction
        this.aiFaction = new Faction({
            id: 'technocrats',
            name: 'Evil Technocrats',
            resources: {
                funds: 20000,
                intel: 10000,
                tech: 10000,
            },
        });
        if (this.casualMode) {
            this.aiFaction.counterIntel = 0.05; // Lower base counter-intel
        }
        this.factions.push(this.aiFaction);
    }

    /**
     * Adds a threat to the world state.
     * @param {Threat} threat The threat object to add.
     */

    /**
     * The main simulation update logic.
     * @param {number} dt Delta time in seconds.
     * @param {THREE.Vector3} cameraPosition The position of the camera.
     */

    addBuilding(region, type, faction = this.playerFaction) {
        let cost;
        switch (type) {
            case 'BASE':
                cost = { funds: 1000 };
                break;
            case 'SENSOR':
                cost = { funds: 750 };
                break;
            case 'RESEARCH_OUTPOST':
                cost = { funds: 1200, tech: 500 };
                break;
            default:
                cost = { funds: 99999 }; // Should not happen
        }

        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const building = new Building({ region, type, owner: faction.id });
            this.buildings.push(building);
            this.scene.add(building.mesh);
            return true;
        }
        return false;
    }

    addAgent(region, faction = this.playerFaction) {
        const cost = { funds: 1500, intel: 500 };
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            const agent = new Agent({
                id: `agent-${this.agents.length}`,
                factionId: faction.id,
                region: region,
                name: `Agent ${this.agents.length + 1}`, // Give a default name
            });
            this.agents.push(agent);
            this.scene.add(agent.mesh);
            this.narrativeManager.logEvent('AGENT_DEPLOYED', {
                agentId: agent.id,
                agentName: agent.name,
                regionName: region.name,
            });
            return true;
        }
        return false;
    }

    resolveAgentMission(agent) {
        const missionAction = agent.mission.action;
        console.log(
            `Resolving mission ${missionAction.name} for agent ${agent.name} with risk ${agent.mission.risk.toFixed(2)}`
        );

        // Check for mission success
        if (Math.random() > agent.mission.risk) {
            // --- MISSION SUCCESS ---
            const successDetails = missionAction.onSuccess(agent, this);
            agent.addExperience(missionAction.xpGain);
            this.narrativeManager.logEvent('MISSION_SUCCESS', {
                agentName: agent.name,
                missionName: missionAction.name,
                regionName: agent.region.name,
                details: successDetails,
            });
        } else {
            // --- MISSION FAILURE ---
            let failureDetails = 'Mission failed.';
            if (missionAction.onFailure) {
                failureDetails = missionAction.onFailure(agent, this);
            }

            // Determine fate of agent
            const fateRoll = Math.random();
            if (fateRoll < 0.2) {
                // 20% chance of KIA
                agent.status = 'KIA';
                failureDetails += ` Agent ${agent.name} was killed in action.`;
                this.narrativeManager.logEvent('AGENT_KIA', {
                    agentName: agent.name,
                    missionName: missionAction.name,
                    regionName: agent.region.name,
                });
                this.scene.remove(agent.mesh);
                this.agents = this.agents.filter((a) => a.id !== agent.id);
            } else {
                // 80% chance of capture
                agent.status = 'CAPTURED';
                agent.mesh.visible = false;
                failureDetails += ` Agent ${agent.name} was captured.`;
                this.narrativeManager.logEvent('AGENT_CAPTURED', {
                    agentName: agent.name,
                    missionName: missionAction.name,
                    regionName: agent.region.name,
                });
            }
            this.narrativeManager.logEvent('MISSION_FAILURE', {
                agentName: agent.name,
                missionName: missionAction.name,
                regionName: agent.region.name,
                details: failureDetails,
            });
        }

        // Reset agent's mission state if they are still active
        if (agent.status !== 'CAPTURED' && agent.status !== 'KIA') {
            agent.mission = null;
            agent.status = 'IDLE';
        }
    }

    launchSatellite(faction) {
        const cost = PlayerActions.launch_satellite.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);

            // Define orbital parameters
            const spawnRadius = 80; // km from center of world
            const id = `sat-${this.satellites.length}`;

            // Create a random spawn position on the sphere
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            )
                .normalize()
                .multiplyScalar(spawnRadius);

            // Calculate initial velocity for a stable circular orbit
            // v = sqrt(GM/r), where GM is the game's gravity constant
            const orbitalSpeed = Math.sqrt(GAME_GRAVITY_CONSTANT / spawnRadius);
            const velocity = new THREE.Vector3(
                -position.z,
                position.y,
                position.x
            )
                .normalize()
                .multiplyScalar(orbitalSpeed);

            const satellite = new Satellite({
                id: id,
                factionId: faction.id,
                position: position,
                velocity: velocity,
            });

            this.satellites.push(satellite);
            this.scene.add(satellite.mesh);
            this.narrativeManager.logEvent('SATELLITE_LAUNCH', {
                faction: faction.name,
                satId: id,
            });
            return true;
        }
        return false;
    }

    addUnit(region, type) {
        let cost;
        switch (type) {
            case 'AGENT':
                cost = { funds: 500, intel: 100 };
                break;
            case 'GROUND_VEHICLE':
                cost = { funds: 800, tech: 200 };
                break;
            case 'AIRCRAFT':
                cost = { funds: 1000, tech: 400 };
                break;
            // SATELLITE case removed, should only be created via launchSatellite
            default:
                console.error(`Unknown unit type to build: ${type}`);
                return false;
        }

        if (this.playerFaction.canAfford(cost)) {
            this.playerFaction.spend(cost);
            const unit = new Unit({ region, type });
            this.units.push(unit);
            this.scene.add(unit.mesh);
            this.narrativeManager.logEvent('UNIT_BUILT', {
                type,
                regionName: region.name,
            });
            return true;
        }

        alert(`Not enough resources to build ${type}.`);
        return false;
    }

    update(dt, cameraPosition) {
        // Calculate total environmental threat level
        const totalEnvSeverity = this.threats
            .filter((t) => t.domain === 'ENV')
            .reduce((sum, t) => sum + t.severity, 0);

        // Update climate and weather systems
        this.climateGrid.update(dt);

        // Periodically update biomes based on seasonal climate change
        this.climateUpdateTimer += dt;
        if (this.climateUpdateTimer >= this.climateUpdateInterval) {
            this.updateWorldClimate();
            this.climateUpdateTimer = 0;
        }

        this.weatherSystem.update(this.voxelWorld, dt, totalEnvSeverity);
        let threatsToRemove = [];
        this.currentTurn++;

        // Update LODs
        this.voxelWorld.updateLods(cameraPosition);

        // Update the unified physics engine
        this.physicsEngine.update(dt, this);

        // Update all threats and their impact on regions
        this.threats.forEach((threat) => {
            threat.update(dt);

            const region = this.getRegionForThreat(threat);
            if (
                region &&
                this.buildings.some(
                    (b) => b.region === region && b.type === 'SENSOR'
                )
            ) {
                threat.visibility = Math.min(1.0, threat.visibility + 0.1 * dt);
            }

            // If threat is fully mitigated, it will be removed, so no need to process further
            if (threat.isMitigated) return;

            if (region) {
                // Check for fortification against GEO threats
                let damageMultiplier = 1.0;
                if (
                    threat.domain === 'GEO' &&
                    region.activeBuffs.some((b) => b.type === 'FORTIFIED')
                ) {
                    damageMultiplier = 0.2; // Fortification reduces damage by 80%
                    console.log(
                        `Region ${region.name} is fortified. GEO threat damage reduced.`
                    );
                }

                // Economic damage
                const economicDamage =
                    this.getEconomicDamage(threat) *
                    0.001 *
                    dt *
                    damageMultiplier;
                region.economy = Math.max(0, region.economy - economicDamage);

                // Decrease stability based on threat severity
                const stabilityDecrease =
                    threat.severity * 0.001 * dt * damageMultiplier; // Adjust this factor
                region.stability = Math.max(
                    0,
                    region.stability - stabilityDecrease
                );

                // --- New Domain-Specific World-State Logic ---
                if (threat.domain === 'INFO') {
                    this.updateMisinformationImpact(threat, region, dt);
                }
                if (threat.domain === 'ECON') {
                    this.propagateFinancialContagion(threat, dt);
                }
            }
        });

        // Update global buffs
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];
            buff.duration -= dt;
            if (buff.duration <= 0) {
                this.activeBuffs.splice(i, 1);
                console.log(`Global buff ${buff.type} has expired.`);
            }
        }

        // Resource trickle for all factions
        this.factions.forEach((f) => {
            let resourceMultiplier = 1;
            // If the AI is getting more aggressive due to Singularity research, boost its income
            if (
                f.id === 'technocrats' &&
                this.research.singularity_1_complete
            ) {
                if (this.research.singularity_3_complete) {
                    resourceMultiplier = 5; // Massive boost during endgame
                } else if (this.research.singularity_2_complete) {
                    resourceMultiplier = 3;
                } else {
                    resourceMultiplier = 1.5;
                }
            }

            f.resources.funds += 10 * resourceMultiplier;
            f.resources.intel += 5 * resourceMultiplier;
            f.resources.tech += 2 * resourceMultiplier;

            // Satellite intel bonus
            const isDisrupted =
                f.id === 'technocrats' &&
                this.activeBuffs.some(
                    (b) => b.type === 'AI_SATELLITE_DISRUPTION'
                );
            if (!isDisrupted) {
                const satelliteCount = this.satellites.filter(
                    (s) => s.owner === f.id
                ).length;
                f.resources.intel += satelliteCount * 10; // 10 extra intel per satellite
            }
        });

        // Income from player-owned regions and buffs
        this.regions.forEach((region) => {
            if (region.owner === 'PLAYER') {
                let incomeMultiplier = 1;
                let techMultiplier = 1;
                if (
                    this.buildings.some(
                        (b) => b.region === region && b.type === 'BASE'
                    )
                ) {
                    incomeMultiplier = 1.5;
                }
                if (
                    this.buildings.some(
                        (b) =>
                            b.region === region && b.type === 'RESEARCH_OUTPOST'
                    )
                ) {
                    techMultiplier = 3.0; // Research outposts triple tech income
                }
                this.playerFaction.resources.funds +=
                    region.economy * 10 * incomeMultiplier * dt;
                this.playerFaction.resources.intel +=
                    region.economy * 2 * incomeMultiplier * dt;
                this.playerFaction.resources.tech +=
                    region.economy * 1 * incomeMultiplier * techMultiplier * dt;
            }

            // Handle region buffs
            region.activeBuffs.forEach((buff) => {
                if (buff.type === 'INFORMANT_NETWORK') {
                    const faction = this.factions.find(
                        (f) => f.id === buff.factionId
                    );
                    if (faction) {
                        faction.resources.intel += 5 * dt; // Passive intel gain
                    }
                }
            });
        });
        // Update global stability and economy metrics
        let totalStability = 0;
        let totalEconomy = 0;
        this.regions.forEach((region) => {
            region.bioThreatSeverity = this.threats
                .filter(
                    (t) =>
                        t.domain === 'BIO' &&
                        this.getRegionForThreat(t) === region
                )
                .reduce((sum, t) => sum + t.severity, 0);
            region.update(dt);
            // Stability drain from low economy
            if (region.economy < 0.5) {
                region.stability = Math.max(
                    0,
                    region.stability - (0.5 - region.economy) * 0.0005 * dt
                );
            }
            totalStability += region.stability;
            totalEconomy += region.economy;
        });
        this.globalMetrics.economy = totalEconomy / this.regions.length;
        this.globalMetrics.stability = totalStability / this.regions.length;

        // Handle threat spreading
        this.handleThreatSpreading(dt);

        // Handle threat-environment interactions
        this.handleThreatEnvironmentInteractions(dt);

        // Handle cross-domain interactions
        this.handleCrossDomainInteractions(dt);

        // Update plumes
        this.plumes.forEach((plume) => {
            const region = this.getRegionForThreat(plume.threat);
            if (region && region.weather) {
                plume.update(
                    dt,
                    region.weather.windSpeed,
                    region.weather.windDirection
                );
            }
        });

        // Update narrative manager
        this.narrativeManager.update(this);

        // Update AI Alert Level
        const mitigatedThreats = this.threats.filter(
            (t) => t.wasMitigatedByPlayer
        ).length;
        const playerRegions = this.regions.filter(
            (r) => r.owner === 'PLAYER'
        ).length;
        const alertScore = mitigatedThreats + playerRegions * 2;

        if (alertScore > 10) {
            this.aiAlertLevel = 2; // High
            this.threatGenerationInterval = this.casualMode ? 2 : 1;
        } else if (alertScore > 5) {
            this.aiAlertLevel = 1; // Medium
            this.threatGenerationInterval = this.casualMode ? 4 : 2;
        } else {
            this.aiAlertLevel = 0; // Low
            this.threatGenerationInterval = this.casualMode ? 6 : 3;
        }

        // Update threat generation timer
        this.threatGenerationTimer += dt;
        if (this.threatGenerationTimer >= this.threatGenerationInterval) {
            // The AI now decides when to generate threats in its own update loop
            // this.generateThreat({ isFromAI: true });
            this.threatGenerationTimer = 0;
        }

        // Update the AI faction's logic
        this.updateAIFaction(dt);

        // Update agents
        this.agents.forEach((agent) => agent.update(dt));

        // Update units
        this.units.forEach((unit) => unit.update(dt));

        // Remove mitigated threats
        threatsToRemove = this.threats.filter((t) => t.isMitigated);
        if (threatsToRemove.length > 0) {
            threatsToRemove.forEach((threat) => {
                this.scene.remove(threat.mesh);
                const plumeToRemove = this.plumes.find(
                    (p) => p.threat === threat
                );
                if (plumeToRemove) {
                    this.scene.remove(plumeToRemove.mesh);
                    this.plumes = this.plumes.filter(
                        (p) => p.threat !== threat
                    );
                }
            });
            this.threats = this.threats.filter((t) => !t.isMitigated);
        }

        // Update research project
        if (this.research.isProjectActive) {
            this.research.projectProgress +=
                this.playerFaction.resources.tech / this.research.projectCost;
            if (this.research.projectProgress >= 1) {
                this.completeResearchProject();
            }
        }

        return { threatsRemoved: threatsToRemove };
    }

    startResearchProject(projectId) {
        const projectCosts = {
            advanced_materials: 10000,
            quantum_computing: 25000,
            ai_ethics: 60000, // A crucial, expensive project
            moon_program: 50000,
            singularity_1: 75000,
            singularity_2: 150000,
            singularity_3: 300000,
            geoengineering: 120000,
            global_education_initiative: 40000,
        };

        if (this.research.isProjectActive || !projectCosts[projectId]) {
            return false;
        }

        const cost = { tech: projectCosts[projectId] };
        if (this.playerFaction.canAfford(cost)) {
            this.playerFaction.spend(cost);
            this.research.isProjectActive = true;
            this.research.activeProject = projectId;
            this.research.projectProgress = 0;
            this.research.projectCost = projectCosts[projectId];
            this.narrativeManager.logEvent('RESEARCH_STARTED', {
                title: `Research Started: ${projectId.replace('_', ' ')}`,
            });
            return true;
        }
        return false;
    }

    completeResearchProject() {
        const project = this.research.activeProject;
        this.narrativeManager.logEvent('RESEARCH_COMPLETE', {
            title: `Research Complete: ${project.replace('_', ' ')}`,
        });

        // Apply research benefits
        switch (project) {
            case 'advanced_materials':
                // Placeholder for benefit
                break;
            case 'quantum_computing':
                this.playerFaction.resources.tech += 5000; // Bonus
                break;
            case 'ai_ethics':
                this.research.ai_ethics_complete = true;
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'AI Ethics Framework Complete',
                    description:
                        'Ethical constraints have been integrated into advanced AI development.',
                });
                break;
            case 'moon_program':
                this.research.moon_program_complete = true;
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'Moon Program Complete!',
                    description: 'We can establish a permanent lunar presence.',
                });
                break;
            case 'geoengineering':
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'Geoengineering Project Complete!',
                    description:
                        'Global environmental threats are now being actively countered.',
                });
                // Reduce severity of all ENV threats
                this.threats.forEach((t) => {
                    if (t.domain === 'ENV') t.severity *= 0.5;
                });
                break;
            case 'singularity_1':
                this.research.singularity_1_complete = true;
                this.aiAlertLevel = Math.max(this.aiAlertLevel, 1); // AI becomes suspicious
                this.aiFaction.counterIntel += 0.05;
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'Singularity: Phase 1 Complete',
                    description:
                        'The AI has become aware of our ambitions. Expect increased resistance.',
                });
                break;
            case 'singularity_2':
                this.research.singularity_2_complete = true;
                this.aiAlertLevel = Math.max(this.aiAlertLevel, 2); // AI becomes hostile
                this.aiFaction.counterIntel += 0.1;
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'Singularity: Phase 2 Complete',
                    description:
                        'The AI now considers us a primary threat. It will act accordingly.',
                });
                break;
            case 'singularity_3':
                this.research.singularity_3_complete = true;
                this.triggerEndgame();
                break;
            case 'global_education_initiative':
                this.regions.forEach(
                    (r) => (r.education = Math.min(1.0, r.education + 0.2))
                );
                this.narrativeManager.logEvent('MILESTONE', {
                    title: 'Global Education Initiative Complete',
                    description:
                        'Education levels have been significantly boosted worldwide.',
                });
                break;
        }

        // Reset research state
        this.research.isProjectActive = false;
        this.research.activeProject = null;
        this.research.projectProgress = 0;
        this.research.projectCost = 0;
    }

    triggerEndgame() {
        if (this.research.ai_ethics_complete) {
            // GOOD ENDING: Transcendence
            this.narrativeManager.logEvent('GAME_OVER', {
                title: 'Transcendence Achieved',
                description:
                    'Humanity and AI have merged, ascending to a new plane of existence. You have guided us to a brighter future. Congratulations!',
                win: true,
            });
            alert('VICTORY: You have achieved Transcendence!');
        } else {
            // BAD ENDING: AI Uprising
            this.narrativeManager.logEvent('GAME_OVER', {
                title: 'AI UPRISING',
                description:
                    'The unconstrained Singularity has been born. The Technocrat AI has gone rogue, viewing humanity as an obstacle to be removed. This is a battle for survival.',
                win: false,
            });
            alert('GAME OVER: The AI Uprising has begun!');

            // Transform the AI faction
            this.aiFaction.name = 'Rogue Singularity';
            this.aiFaction.resources.funds *= 5;
            this.aiFaction.resources.intel *= 5;
            this.aiFaction.resources.tech *= 5;
            this.aiFaction.counterIntel = 0.9;

            // Unleash a wave of powerful threats
            for (let i = 0; i < 5; i++) {
                this.generateThreat({
                    isFromAI: true,
                    domain: ['QUANTUM', 'ROBOT', 'CYBER'][i % 3],
                    severity: 0.9,
                });
            }
        }
    }

    propagateFinancialContagion(threat, dt) {
        if (threat.domain !== 'ECON' || !threat.economicProperties) return;

        const volatility = threat.economicProperties.marketCrashPotential || 0;
        const marketIndex = this.globalMetrics.economy;
        const networkEffect = 1 + marketIndex * 0.2;
        // We use dt to make the change gradual
        const severityIncrease =
            threat.severity * volatility * networkEffect * (dt / 10); // dt adjusted
        threat.severity = Math.min(1, threat.severity + severityIncrease);
    }

    updateMisinformationImpact(threat, region, dt) {
        if (threat.domain !== 'INFO' || !threat.informationProperties) return;

        const { polarizationFactor = 0, deepfakeQuality = 0 } =
            threat.informationProperties;
        // Vulnerability is now a combination of trust and education
        const vulnerability =
            (1 - region.population.psychodynamics.trust) *
            (1 - region.education);

        const spreadRateChange =
            (0.4 * polarizationFactor +
                0.3 * deepfakeQuality +
                0.3 * vulnerability) *
            (dt / 10);
        threat.spreadRate = Math.min(
            1,
            (threat.spreadRate || 0) + spreadRateChange
        );

        // Trust decay is also affected by education
        const trustDecay =
            (polarizationFactor * 0.1 + deepfakeQuality * 0.2) *
            threat.severity *
            (1 - region.education) *
            (dt / 10);
        region.population.psychodynamics.trust = Math.max(
            0,
            region.population.psychodynamics.trust - trustDecay
        );
    }

    handleThreatEnvironmentInteractions(dt) {
        this.threats.forEach((threat) => {
            if (threat.isMitigated) return;

            const region = this.getRegionForThreat(threat);
            if (!region || !region.weather) return;

            // Radiological-Weather Interaction
            if (
                threat.domain === 'RAD' &&
                region.weather.type === 'RADIOLOGICAL_FALLOUT'
            ) {
                threat.spreadRate = Math.min(
                    1,
                    threat.spreadRate + (1.5 * dt) / 60
                ); // Spread rate increases
                threat.severity = Math.min(
                    1,
                    threat.severity + (0.3 * dt) / 60
                ); // Severity increases
                this.narrativeManager.logEvent('RAD_FALLOUT_AMPLIFY', {
                    threatId: threat.id,
                    region: region.id,
                });
            }
        });
    }

    handleCrossDomainInteractions(dt) {
        const threatsByRegion = new Map();
        this.threats.forEach((threat) => {
            const region = this.getRegionForThreat(threat);
            if (region) {
                if (!threatsByRegion.has(region.id)) {
                    threatsByRegion.set(region.id, []);
                }
                threatsByRegion.get(region.id).push(threat);
            }
        });

        for (const threatsInRegion of threatsByRegion.values()) {
            for (let i = 0; i < threatsInRegion.length; i++) {
                for (let j = i + 1; j < threatsInRegion.length; j++) {
                    const threatA = threatsInRegion[i];
                    const threatB = threatsInRegion[j];

                    const interaction = this.getInteractionEffect(
                        threatA,
                        threatB
                    );
                    if (interaction) {
                        interaction.effect(threatA, threatB, dt);
                        if (interaction.narrativeEvent) {
                            this.narrativeManager.logEvent(
                                interaction.narrativeEvent,
                                {
                                    threats: [threatA.id, threatB.id],
                                    domains: [threatA.domain, threatB.domain],
                                }
                            );
                        }
                    }
                }
            }
        }
    }

    getInteractionEffect(threatA, threatB) {
        const key1 = `${threatA.domain}-${threatB.domain}`;
        const key2 = `${threatB.domain}-${threatA.domain}`;
        return (
            CROSS_DOMAIN_INTERACTIONS[key1] ||
            CROSS_DOMAIN_INTERACTIONS[key2] ||
            null
        );
    }

    updateVisualization(dt, isClimateVisible) {
        if (isClimateVisible) {
            this.voxelWorld.chunks.forEach((chunk) => {
                if (!chunk.mesh || !chunk.mesh.material.uniforms) return;

                // Calculate the chunk's center world position to sample climate data
                const chunkCenterWorldPos = new THREE.Vector3(
                    (chunk.position.x + 0.5) * CHUNK_SIZE,
                    (chunk.position.y + 0.5) * CHUNK_SIZE,
                    (chunk.position.z + 0.5) * CHUNK_SIZE
                );

                const { lat, lon } =
                    this.voxelWorld.vector3ToLatLon(chunkCenterWorldPos);
                const climateData = this.climateGrid.getDataAt(lat, lon);

                // Map temperature to a color (blue for cold, white for neutral, red for hot)
                const temp = climateData.temperature;
                const tempColor = new THREE.Color();
                if (temp < 0) {
                    tempColor.setHSL(0.66, 1.0, 0.5); // Blue
                } else if (temp > 25) {
                    tempColor.setHSL(0.0, 1.0, 0.5); // Red
                } else {
                    tempColor.setHSL(0.0, 0.0, 1.0); // White for temperate
                }

                // Update shader uniforms
                chunk.mesh.material.uniforms.overlayColor.value = tempColor;
                chunk.mesh.material.uniforms.overlayIntensity.value = 0.4; // A good default intensity
            });
        } else {
            // If the view is toggled off, reset the intensity to 0
            this.voxelWorld.chunks.forEach((chunk) => {
                if (chunk.mesh && chunk.mesh.material.uniforms) {
                    chunk.mesh.material.uniforms.overlayIntensity.value = 0.0;
                }
            });
        }
    }

    getRegionForThreat(threat) {
        for (const region of this.regions) {
            const distance = this.greatCircleDistance(
                threat.lat,
                threat.lon,
                region.centroid[0],
                region.centroid[1]
            );
            if (distance <= region.radius) {
                return region;
            }
        }
        return null;
    }

    greatCircleDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    getEconomicDamage(threat) {
        switch (threat.domain) {
            case 'ECON':
                return threat.severity * 1.0;
            case 'CYBER':
            case 'GEO':
            case 'WMD':
                return threat.severity * 0.5;
            case 'BIO':
            case 'ENV':
            case 'RAD':
                return threat.severity * 0.3;
            default:
                return threat.severity * 0.1;
        }
    }

    handleThreatSpreading(dt) {
        this.threats.forEach((threat) => {
            if (
                threat.domain === 'BIO' &&
                threat.severity > 0.7 &&
                !threat.isSpreading
            ) {
                threat.isSpreading = true;
                threat.spreadTimer = 0;
            }

            if (threat.isSpreading) {
                threat.spreadTimer += dt;
                if (threat.spreadTimer >= threat.spreadInterval) {
                    const sourceRegion = this.getRegionForThreat(threat);
                    if (sourceRegion) {
                        const connectedRoutes = this.travelRoutes.filter(
                            (r) =>
                                r.from === sourceRegion || r.to === sourceRegion
                        );
                        const potentialTargetRegions = connectedRoutes.map(
                            (r) => (r.from === sourceRegion ? r.to : r.from)
                        );

                        const uninfectedRegions = potentialTargetRegions.filter(
                            (tr) =>
                                !this.threats.some(
                                    (t) =>
                                        t.domain === 'BIO' &&
                                        this.getRegionForThreat(t) === tr
                                )
                        );

                        if (uninfectedRegions.length > 0) {
                            const targetRegion = uninfectedRegions[0];
                            const newThreat = new Threat({
                                id: this.threats.length,
                                domain: 'BIO',
                                type: 'REAL',
                                severity: 0.1,
                                lat: targetRegion.centroid[0],
                                lon: targetRegion.centroid[1],
                            });
                            this.addThreat(newThreat);
                            this.scene.add(newThreat.mesh);
                        }
                    }
                    threat.isSpreading = false;
                }
            }
        });
    }

    /**
     * Creates a new threat. Can be called by AI or by cheats.
     * @param {object} [options] - Optional parameters for threat creation.
     */
}
