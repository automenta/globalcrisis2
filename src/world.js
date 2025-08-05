const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

const CROSS_DOMAIN_INTERACTIONS = {
    "CYBER-RAD": {
        narrativeEvent: "CYBER_RAD_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            const radThreat = threatA.domain === 'RAD' ? threatA : threatB;
            if (!cyberThreat || !radThreat) return;
            radThreat.severity = Math.min(1.0, radThreat.severity + 0.001 * cyberThreat.severity);
            cyberThreat.severity = Math.min(1.0, cyberThreat.severity + 0.0005 * radThreat.severity);
        }
    },
    "ECON-INFO": {
        narrativeEvent: "ECON_INFO_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const econThreat = threatA.domain === 'ECON' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!econThreat || !infoThreat) return;
            // Economic trouble makes people more susceptible to misinformation
            infoThreat.spreadRate = Math.min(1.0, (infoThreat.spreadRate || 0) + 0.002 * econThreat.severity);
            // Misinformation can amplify economic panic
            econThreat.severity = Math.min(1.0, econThreat.severity + 0.001 * infoThreat.severity);
        }
    },
    "QUANTUM-ROBOT": {
        narrativeEvent: "QUANTUM_ROBOTIC_ENHANCEMENT",
        effect: (threatA, threatB, dt) => {
            const qThreat = threatA.domain === 'QUANTUM' ? threatA : threatB;
            const rThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            if (!qThreat || !rThreat) return;
            const qProps = qThreat.quantumProperties;
            const rProps = rThreat.roboticProperties;
            if (qProps && rProps && (qProps.entanglementLevel || 0) > 0.7) {
                rProps.adaptationRate = (rProps.adaptationRate || 1) * (1 + (0.5 * dt / 60));
                rProps.collectiveIntelligence = Math.min(1, (rProps.collectiveIntelligence || 0) + (qProps.entanglementLevel * 0.3 * dt / 60));
            }
        }
    },
    "CYBER-ROBOT": {
        narrativeEvent: "CYBER_ROBOT_HACK",
        effect: (threatA, threatB, dt) => {
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            const robotThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            if (!cyberThreat || !robotThreat) return;
            const rProps = robotThreat.roboticProperties;
            if (rProps && cyberThreat.severity > 0.6) {
                 // High severity cyber attacks can increase robot autonomy (e.g., hack them to be more independent)
                 const autonomyGain = (cyberThreat.severity - 0.6) * 0.01 * dt;
                 if(rProps.autonomyDegrees) {
                    rProps.autonomyDegrees.decisionLevel = Math.min(1, rProps.autonomyDegrees.decisionLevel + autonomyGain);
                 }
            }
        }
    },
    "QUANTUM-INFO": {
        narrativeEvent: "QUANTUM_DISINFORMATION_BREAKTHROUGH",
        effect: (threatA, threatB, dt) => {
            const qThreat = threatA.domain === 'QUANTUM' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!qThreat || !infoThreat) return;
            const qProps = qThreat.quantumProperties;
            const iProps = infoThreat.informationProperties;
            // Quantum computing can dramatically improve deepfake quality
            if (qProps && iProps && qProps.coherenceTime > 3) {
                 const qualityGain = qProps.coherenceTime * 0.005 * dt;
                 iProps.deepfakeQuality = Math.min(1, (iProps.deepfakeQuality || 0) + qualityGain);
            }
        }
    },
    "BIO-CYBER": {
        narrativeEvent: "BIO_CYBER_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const bioThreat = threatA.domain === 'BIO' ? threatA : threatB;
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            if (!bioThreat || !cyberThreat) return;
            // Biological vectors make cyber attacks more severe
            const severityIncrease = 0.0015 * bioThreat.severity * dt;
            cyberThreat.severity = Math.min(1.0, cyberThreat.severity + severityIncrease);
        }
    },
    "ROBOT-INFO": {
        narrativeEvent: "ROBOT_INFO_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const robotThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!robotThreat || !infoThreat) return;
            // Robotic networks (bots) amplify information spread
            const spreadRateIncrease = 0.0025 * robotThreat.severity * dt;
            infoThreat.spreadRate = Math.min(1.0, (infoThreat.spreadRate || 0) + spreadRateIncrease);
        }
    },
    "RAD-ENV": {
        narrativeEvent: "RAD_ENV_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const radThreat = threatA.domain === 'RAD' ? threatA : threatB;
            const envThreat = threatA.domain === 'ENV' ? threatA : threatB;
            if (!radThreat || !envThreat) return;
            // Environmental events (e.g., storms) exacerbate radiological threats
            const severityIncrease = 0.002 * envThreat.severity * dt;
            const spreadRateIncrease = 0.003 * envThreat.severity * dt;
            radThreat.severity = Math.min(1.0, radThreat.severity + severityIncrease);
            radThreat.spreadRate = Math.min(1.0, (radThreat.spreadRate || 0) + spreadRateIncrease);
        }
    }
};

class WorldState {
    constructor(scene, uiState, narrativeManager, casualMode = true) {
        this.scene = scene;
        this.uiState = uiState;
        this.narrativeManager = narrativeManager;
        this.casualMode = casualMode;
        this.regions = [];
        this.factions = [];
        this.playerFaction = null;
        this.aiFaction = null;
        this.initializeFactions();
        this.travelRoutes = [];
        this.initializeRegions();
        this.initializeTravelRoutes();
        this.climateGrid = new ClimateGrid();
        this.weatherSystem = new WeatherSystem(this.climateGrid);
        this.voxelWorld = new VoxelWorld();
        this.initializeVoxelWorld();
        this.threats = [];
        this.plumes = [];
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
            projectCost: 0
        };
        this.planner = new GOAPPlanner();
        this.aiGoal = null;
        this.climateUpdateTimer = 0;
        this.climateUpdateInterval = 2; // Update climate every 2 seconds
    }

    updateWorldClimate() {
        this.voxelWorld.chunks.forEach(chunk => {
            if (!chunk) return;

            const oldMesh = chunk.mesh;
            const meshWasUpdated = this.voxelWorld.updateChunkForClimateChange(chunk, this.climateGrid);

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

    initializeTravelRoutes() {
        const routesData = [
            { from: 'na', to: 'eu' },
            { from: 'na', to: 'as' },
            { from: 'eu', to: 'as' },
            { from: 'eu', to: 'af' },
            { from: 'as', to: 'af' },
            { from: 'as', to: 'oc' },
            { from: 'sa', to: 'na' },
            { from: 'sa', to: 'af' },
        ];

        routesData.forEach(routeData => {
            const fromRegion = this.regions.find(r => r.id === routeData.from);
            const toRegion = this.regions.find(r => r.id === routeData.to);

            if (fromRegion && toRegion) {
                const start = this.latLonToVector3(fromRegion.centroid[0], fromRegion.centroid[1]);
                const end = this.latLonToVector3(toRegion.centroid[0], toRegion.centroid[1]);

                const curve = new THREE.CatmullRomCurve3([
                    start,
                    this.getMidpoint(start, end, 0.2),
                    end
                ]);

                const points = curve.getPoints(50);
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
                const curveObject = new THREE.Line(geometry, material);
                // this.scene.add(curveObject); // Voxel-TODO: Don't add old routes
                this.travelRoutes.push({ from: fromRegion, to: toRegion, mesh: curveObject });
            }
        });
    }

    getMidpoint(v1, v2, bend) {
        const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        const distance = v1.distanceTo(v2);
        midpoint.normalize().multiplyScalar(midpoint.length() + distance * bend);
        return midpoint;
    }

    latLonToVector3(lat, lon, radius = 5) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);

        return new THREE.Vector3(x, y, z);
    }

    initializeRegions() {
        const regionsData = [
            { id: 'na', name: 'North America', centroid: [40, -100], radius: 3000, attributes: { climateVulnerability: 0.4, temperature: 15, economy: 1.0, internetAccess: Math.random() } },
            { id: 'sa', name: 'South America', centroid: [-20, -60], radius: 2500, attributes: { climateVulnerability: 0.6, temperature: 25, economy: 0.8, internetAccess: Math.random() } },
            { id: 'eu', name: 'Europe', centroid: [50, 15], radius: 2000, attributes: { climateVulnerability: 0.3, temperature: 10, economy: 1.0, internetAccess: Math.random() } },
            { id: 'af', name: 'Africa', centroid: [0, 20], radius: 3000, attributes: { climateVulnerability: 0.8, temperature: 30, economy: 0.6, internetAccess: Math.random() } },
            { id: 'as', name: 'Asia', centroid: [40, 90], radius: 4000, attributes: { climateVulnerability: 0.7, temperature: 20, economy: 0.9, internetAccess: Math.random() } },
            { id: 'oc', name: 'Oceania', centroid: [-25, 135], radius: 2000, attributes: { climateVulnerability: 0.5, temperature: 22, economy: 0.9, internetAccess: Math.random() } },
            { id: 'an', name: 'Antarctica', centroid: [-90, 0], radius: 2000, attributes: { climateVulnerability: 0.9, temperature: -50, economy: 0.1, internetAccess: Math.random() } },
        ];

        regionsData.forEach(data => {
            const region = new Region(data);
            this.regions.push(region);
            // this.scene.add(region.mesh); // Voxel-TODO: Don't add old regions
        });
    }

    initializeVoxelWorld() {
        const worldSize = 4; // in chunks, e.g., 4x4x4 grid

        for (let cx = -worldSize / 2; cx < worldSize / 2; cx++) {
            for (let cy = -worldSize / 2; cy < worldSize / 2; cy++) {
                for (let cz = -worldSize / 2; cz < worldSize / 2; cz++) {
                    const chunk = new Chunk(new THREE.Vector3(cx, cy, cz));
                    this.voxelWorld.generateChunk(chunk, this.climateGrid);
                    this.voxelWorld.createMeshForChunk(chunk);
                    if (chunk.mesh) {
                        this.scene.add(chunk.mesh);
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
            tech: this.casualMode ? 4000 : 2000
        };
        this.playerFaction = new Faction({
            id: 'mitigators',
            name: 'Hero Mitigators',
            resources: playerResources
        });
        this.factions.push(this.playerFaction);

        // AI Faction
        this.aiFaction = new Faction({
            id: 'technocrats',
            name: 'Evil Technocrats',
            resources: {
                funds: 20000,
                intel: 10000,
                tech: 10000
            }
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
    addThreat(threat) {
        this.threats.push(threat);
    }

    /**
     * Returns all active threats.
     * @returns {Threat[]} An array of threat objects.
     */
    getThreats() {
        return this.threats;
    }

    /**
     * The main simulation update logic.
     * @param {number} dt Delta time in seconds.
     */
    update(dt) {
        this.currentTurn++;

        // Resource trickle for all factions
        this.factions.forEach(f => {
            let resourceMultiplier = 1;
            // If the AI is getting more aggressive due to Singularity research, boost its income
            if (f.id === 'technocrats' && this.research.singularity_1_complete) {
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
            const satelliteCount = this.satellites.filter(s => s.owner === f.id).length;
            f.resources.intel += satelliteCount * 10; // 10 extra intel per satellite
        });

        // Income from player-owned regions and buffs
        this.regions.forEach(region => {
            if (region.owner === 'PLAYER') {
                let incomeMultiplier = 1;
                let techMultiplier = 1;
                if (this.buildings.some(b => b.region === region && b.type === 'BASE')) {
                    incomeMultiplier = 1.5;
                }
                if (this.buildings.some(b => b.region === region && b.type === 'RESEARCH_OUTPOST')) {
                    techMultiplier = 3.0; // Research outposts triple tech income
                }
                this.playerFaction.resources.funds += region.economy * 10 * incomeMultiplier * dt;
                this.playerFaction.resources.intel += region.economy * 2 * incomeMultiplier * dt;
                this.playerFaction.resources.tech += region.economy * 1 * incomeMultiplier * techMultiplier * dt;
            }

            // Handle region buffs
            region.activeBuffs.forEach(buff => {
                if (buff.type === 'INFORMANT_NETWORK') {
                    const faction = this.factions.find(f => f.id === buff.factionId);
                    if (faction) {
                        faction.resources.intel += 5 * dt; // Passive intel gain
                    }
                }
            });
        });
    }

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
                name: `Agent ${this.agents.length + 1}` // Give a default name
            });
            this.agents.push(agent);
            this.scene.add(agent.mesh);
            this.narrativeManager.logEvent('AGENT_DEPLOYED', { agentId: agent.id, agentName: agent.name, regionName: region.name });
            return true;
        }
        return false;
    }

    resolveAgentMission(agent) {
        const missionAction = agent.mission.action;
        console.log(`Resolving mission ${missionAction.name} for agent ${agent.name} with risk ${agent.mission.risk.toFixed(2)}`);

        // Check for mission success
        if (Math.random() > agent.mission.risk) {
            // --- MISSION SUCCESS ---
            const successDetails = missionAction.onSuccess(agent, this);
            agent.addExperience(missionAction.xpGain);
            this.narrativeManager.logEvent('MISSION_SUCCESS', {
                agentName: agent.name,
                missionName: missionAction.name,
                regionName: agent.region.name,
                details: successDetails
            });
        } else {
            // --- MISSION FAILURE ---
            let failureDetails = 'Mission failed.';
            if (missionAction.onFailure) {
                failureDetails = missionAction.onFailure(agent, this);
            }

            // Determine fate of agent
            const fateRoll = Math.random();
            if (fateRoll < 0.2) { // 20% chance of KIA
                agent.status = 'KIA';
                failureDetails += ` Agent ${agent.name} was killed in action.`;
                this.narrativeManager.logEvent('AGENT_KIA', {
                    agentName: agent.name,
                    missionName: missionAction.name,
                    regionName: agent.region.name,
                });
                this.scene.remove(agent.mesh);
                this.agents = this.agents.filter(a => a.id !== agent.id);
            } else { // 80% chance of capture
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
                details: failureDetails
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
            const satellite = {
                id: `sat-${this.satellites.length}`,
                owner: faction.id,
            };
            this.satellites.push(satellite);
            this.narrativeManager.logEvent('SATELLITE_LAUNCH', { faction: faction.name });
            return true;
        }
        return false;
    }

    addUnit(region, type) {
        const cost = { funds: 500 };
        if (this.playerFaction.canAfford(cost)) {
            this.playerFaction.spend(cost);
            const unit = new Unit({ region, type });
            this.units.push(unit);
            this.scene.add(unit.mesh);
            return true;
        }
        return false;
    }

    // Calculate total environmental threat level
        const totalEnvSeverity = this.threats
            .filter(t => t.domain === "ENV")
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

        // Update all threats and their impact on regions
        this.threats.forEach(threat => {
            threat.update(dt);

            const region = this.getRegionForThreat(threat);
            if (region && this.buildings.some(b => b.region === region && b.type === 'SENSOR')) {
                threat.visibility = Math.min(1.0, threat.visibility + 0.1 * dt);
            }


            // If threat is fully mitigated, it will be removed, so no need to process further
            if (threat.isMitigated) return;

            if (region) {
                // Economic damage
                const economicDamage = this.getEconomicDamage(threat) * 0.001 * dt;
                region.economy = Math.max(0, region.economy - economicDamage);

                // Decrease stability based on threat severity
                const stabilityDecrease = threat.severity * 0.001 * dt; // Adjust this factor
                region.stability = Math.max(0, region.stability - stabilityDecrease);

                // --- New Domain-Specific World-State Logic ---
                if (threat.domain === "INFO") {
                    this.updateMisinformationImpact(threat, region, dt);
                }
                if (threat.domain === "ECON") {
                    this.propagateFinancialContagion(threat, dt);
                }
            }
        });

        // Update global stability and economy metrics
        let totalStability = 0;
        let totalEconomy = 0;
        this.regions.forEach(region => {
            region.update(dt);
            // Stability drain from low economy
            if (region.economy < 0.5) {
                region.stability = Math.max(0, region.stability - (0.5 - region.economy) * 0.0005 * dt);
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
        this.plumes.forEach(plume => {
            const region = this.getRegionForThreat(plume.threat);
            if (region && region.weather) {
                plume.update(dt, region.weather.windSpeed, region.weather.windDirection);
            }
        });

        // Update narrative manager
        this.narrativeManager.update(this);

        // Update visualizations
        this.updateVisualization(dt);

        // Update AI Alert Level
        const mitigatedThreats = this.threats.filter(t => t.wasMitigatedByPlayer).length;
        const playerRegions = this.regions.filter(r => r.owner === 'PLAYER').length;
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
        this.agents.forEach(agent => agent.update(dt));

        // Remove mitigated threats
        const threatsToRemove = this.threats.filter(t => t.isMitigated);
        if (threatsToRemove.length > 0) {
            threatsToRemove.forEach(threat => {
                this.scene.remove(threat.mesh);
                // If the removed threat was selected, deselect it
                if (typeof selectedThreat !== 'undefined' && selectedThreat === threat) {
                    selectedThreat = null;
                    if (typeof updateThreatPanel !== 'undefined') {
                        updateThreatPanel();
                    }
                }
            });
            this.threats = this.threats.filter(t => !t.isMitigated);
        }

        // Update research project
        if (this.research.isProjectActive) {
            this.research.projectProgress += this.playerFaction.resources.tech / this.research.projectCost;
            if (this.research.projectProgress >= 1) {
                this.completeResearchProject();
            }
        }
    }

    startResearchProject(projectId) {
        const projectCosts = {
            'advanced_materials': 10000,
            'quantum_computing': 25000,
            'ai_ethics': 60000, // A crucial, expensive project
            'moon_program': 50000,
            'singularity_1': 75000,
            'singularity_2': 150000,
            'singularity_3': 300000,
            'geoengineering': 120000,
            'global_education_initiative': 40000,
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
            this.narrativeManager.logEvent('RESEARCH_STARTED', { title: `Research Started: ${projectId.replace('_', ' ')}`});
            return true;
        }
        return false;
    }

    completeResearchProject() {
        const project = this.research.activeProject;
        this.narrativeManager.logEvent('RESEARCH_COMPLETE', { title: `Research Complete: ${project.replace('_', ' ')}`});

        // Apply research benefits
        switch(project) {
            case 'advanced_materials':
                // Placeholder for benefit
                break;
            case 'quantum_computing':
                this.playerFaction.resources.tech += 5000; // Bonus
                break;
            case 'ai_ethics':
                this.research.ai_ethics_complete = true;
                this.narrativeManager.logEvent('MILESTONE', { title: 'AI Ethics Framework Complete', description: 'Ethical constraints have been integrated into advanced AI development.' });
                break;
            case 'moon_program':
                this.research.moon_program_complete = true;
                this.narrativeManager.logEvent('MILESTONE', { title: 'Moon Program Complete!', description: 'We can establish a permanent lunar presence.' });
                break;
            case 'geoengineering':
                this.narrativeManager.logEvent('MILESTONE', { title: 'Geoengineering Project Complete!', description: 'Global environmental threats are now being actively countered.' });
                // Reduce severity of all ENV threats
                this.threats.forEach(t => {
                    if (t.domain === 'ENV') t.severity *= 0.5;
                });
                break;
            case 'singularity_1':
                this.research.singularity_1_complete = true;
                this.aiAlertLevel = Math.max(this.aiAlertLevel, 1); // AI becomes suspicious
                this.aiFaction.counterIntel += 0.05;
                this.narrativeManager.logEvent('MILESTONE', { title: 'Singularity: Phase 1 Complete', description: 'The AI has become aware of our ambitions. Expect increased resistance.' });
                break;
            case 'singularity_2':
                this.research.singularity_2_complete = true;
                this.aiAlertLevel = Math.max(this.aiAlertLevel, 2); // AI becomes hostile
                this.aiFaction.counterIntel += 0.1;
                this.narrativeManager.logEvent('MILESTONE', { title: 'Singularity: Phase 2 Complete', description: 'The AI now considers us a primary threat. It will act accordingly.' });
                break;
            case 'singularity_3':
                this.research.singularity_3_complete = true;
                this.triggerEndgame();
                break;
            case 'global_education_initiative':
                this.regions.forEach(r => r.education = Math.min(1.0, r.education + 0.2));
                this.narrativeManager.logEvent('MILESTONE', { title: 'Global Education Initiative Complete', description: 'Education levels have been significantly boosted worldwide.' });
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
                description: 'Humanity and AI have merged, ascending to a new plane of existence. You have guided us to a brighter future. Congratulations!',
                win: true
            });
            alert("VICTORY: You have achieved Transcendence!");
        } else {
            // BAD ENDING: AI Uprising
            this.narrativeManager.logEvent('GAME_OVER', {
                title: 'AI UPRISING',
                description: 'The unconstrained Singularity has been born. The Technocrat AI has gone rogue, viewing humanity as an obstacle to be removed. This is a battle for survival.',
                win: false
            });
            alert("GAME OVER: The AI Uprising has begun!");

            // Transform the AI faction
            this.aiFaction.name = "Rogue Singularity";
            this.aiFaction.resources.funds *= 5;
            this.aiFaction.resources.intel *= 5;
            this.aiFaction.resources.tech *= 5;
            this.aiFaction.counterIntel = 0.9;

            // Unleash a wave of powerful threats
            for(let i = 0; i < 5; i++) {
                this.generateThreat({
                    isFromAI: true,
                    domain: ['QUANTUM', 'ROBOT', 'CYBER'][i % 3],
                    severity: 0.9,
                });
            }
        }
    }

    updateAIFaction(dt) {
        const ai = this.aiFaction;
        if (!ai) return;

        ai.decisionTimer = (ai.decisionTimer || 0) + dt;
        if (ai.decisionTimer < 5) { // Make a decision every 5 seconds
            return;
        }
        ai.decisionTimer = 0;

        // 1. Define Goals
        const goals = [
            { id: 'weaken_player', goal: { playerIsWeaker: true }, priority: this.aiAlertLevel * 2 },
            { id: 'expand_territory', goal: { aiHasMoreTerritory: true }, priority: 1 },
            { id: 'strengthen_territory', goal: { aiTerritoryIsStronger: true }, priority: 1 },
            { id: 'distract_player', goal: { playerIsDistracted: true }, priority: 0.5 },
        ];

        // 2. Build World State for Planner
        const plannerWorldState = {
            hasEnoughResources: ai.resources.funds > 2000, // A general check for having some buffer
            neutralRegionExists: this.regions.some(r => r.owner === 'NEUTRAL'),
            unfortifiedRegionExists: this.regions.some(r => r.owner === ai.id && !this.buildings.some(b => b.region === r && b.type === 'BASE')),
            aiHasMoreTerritory: this.regions.filter(r => r.owner === ai.id).length > this.regions.filter(r => r.owner === this.playerFaction.id).length,
            aiTerritoryIsStronger: !this.regions.some(r => r.owner === ai.id && !this.buildings.some(b => b.region === r && b.type === 'BASE')),
        };

        // 3. Select Goal and Plan
        // Simple priority-based selection for now
        goals.sort((a, b) => b.priority - a.priority);

        for (const g of goals) {
            const plan = this.planner.plan(plannerWorldState, AI_ACTIONS, g.goal);

            if (plan && plan.length > 0) {
                console.log(`AI Plan for goal '${g.id}':`, plan.map(p => p.name));
                // 4. Execute first action of the plan
                const actionToExecute = plan[0];
                actionToExecute.run(this);
                // Break after finding and executing a plan for the highest priority goal
                return;
            }
        }
        console.log("AI could not find a valid plan.");
    }

    propagateFinancialContagion(threat, dt) {
        if (threat.domain !== "ECON" || !threat.economicProperties) return;

        const volatility = threat.economicProperties.marketCrashPotential || 0;
        const marketIndex = this.globalMetrics.economy;
        const networkEffect = 1 + (marketIndex * 0.2);
        // We use dt to make the change gradual
        const severityIncrease = threat.severity * volatility * networkEffect * (dt / 10); // dt adjusted
        threat.severity = Math.min(1, threat.severity + severityIncrease);
    }

    updateMisinformationImpact(threat, region, dt) {
        if (threat.domain !== "INFO" || !threat.informationProperties) return;

        const { polarizationFactor = 0, deepfakeQuality = 0 } = threat.informationProperties;
        // Vulnerability is now a combination of trust and education
        const vulnerability = (1 - region.population.psychodynamics.trust) * (1 - region.education);

        const spreadRateChange = (0.4 * polarizationFactor + 0.3 * deepfakeQuality + 0.3 * vulnerability) * (dt / 10);
        threat.spreadRate = Math.min(1, (threat.spreadRate || 0) + spreadRateChange);

        // Trust decay is also affected by education
        const trustDecay = (polarizationFactor * 0.1 + deepfakeQuality * 0.2) * threat.severity * (1 - region.education) * (dt / 10);
        region.population.psychodynamics.trust = Math.max(0, region.population.psychodynamics.trust - trustDecay);
    }

    handleThreatEnvironmentInteractions(dt) {
        this.threats.forEach(threat => {
            if (threat.isMitigated) return;

            const region = this.getRegionForThreat(threat);
            if (!region || !region.weather) return;

            // Radiological-Weather Interaction
            if (threat.domain === "RAD" && region.weather.type === "RADIOLOGICAL_FALLOUT") {
                threat.spreadRate = Math.min(1, threat.spreadRate + (1.5 * dt / 60)); // Spread rate increases
                threat.severity = Math.min(1, threat.severity + (0.3 * dt / 60)); // Severity increases
                this.narrativeManager.logEvent('RAD_FALLOUT_AMPLIFY', {
                    threatId: threat.id,
                    region: region.id
                });
            }
        });
    }

    handleCrossDomainInteractions(dt) {
        const threatsByRegion = new Map();
        this.threats.forEach(threat => {
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

                    const interaction = this.getInteractionEffect(threatA, threatB);
                    if (interaction) {
                        interaction.effect(threatA, threatB, dt);
                        if (interaction.narrativeEvent) {
                            this.narrativeManager.logEvent(interaction.narrativeEvent, {
                                threats: [threatA.id, threatB.id],
                                domains: [threatA.domain, threatB.domain]
                            });
                        }
                    }
                }
            }
        }
    }

    getInteractionEffect(threatA, threatB) {
        const key1 = `${threatA.domain}-${threatB.domain}`;
        const key2 = `${threatB.domain}-${threatA.domain}`;
        return CROSS_DOMAIN_INTERACTIONS[key1] || CROSS_DOMAIN_INTERACTIONS[key2] || null;
    }

    updateVisualization(dt) {
        if (this.uiState.isClimateVisible) {
            this.voxelWorld.chunks.forEach(chunk => {
                if (!chunk.mesh || !chunk.mesh.material.uniforms) return;

                // Calculate the chunk's center world position to sample climate data
                const chunkCenterWorldPos = new THREE.Vector3(
                    (chunk.position.x + 0.5) * CHUNK_SIZE,
                    (chunk.position.y + 0.5) * CHUNK_SIZE,
                    (chunk.position.z + 0.5) * CHUNK_SIZE
                );

                const { lat, lon } = this.voxelWorld.vector3ToLatLon(chunkCenterWorldPos);
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
            this.voxelWorld.chunks.forEach(chunk => {
                if (chunk.mesh && chunk.mesh.material.uniforms) {
                    chunk.mesh.material.uniforms.overlayIntensity.value = 0.0;
                }
            });
        }
    }

    getRegionForThreat(threat) {
        for (const region of this.regions) {
            const distance = this.greatCircleDistance(threat.lat, threat.lon, region.centroid[0], region.centroid[1]);
            if (distance <= region.radius) {
                return region;
            }
        }
        return null;
    }

    greatCircleDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    getEconomicDamage(threat) {
        switch (threat.domain) {
            case "ECON":
                return threat.severity * 1.0;
            case "CYBER":
            case "GEO":
            case "WMD":
                return threat.severity * 0.5;
            case "BIO":
            case "ENV":
            case "RAD":
                return threat.severity * 0.3;
            default:
                return threat.severity * 0.1;
        }
    }

    handleThreatSpreading(dt) {
        this.threats.forEach(threat => {
            if (threat.domain === "BIO" && threat.severity > 0.7 && !threat.isSpreading) {
                threat.isSpreading = true;
                threat.spreadTimer = 0;
            }

            if (threat.isSpreading) {
                threat.spreadTimer += dt;
                if (threat.spreadTimer >= threat.spreadInterval) {
                    const sourceRegion = this.getRegionForThreat(threat);
                    if (sourceRegion) {
                        const connectedRoutes = this.travelRoutes.filter(r => r.from === sourceRegion || r.to === sourceRegion);
                        const potentialTargetRegions = connectedRoutes.map(r => r.from === sourceRegion ? r.to : r.from);

                        const uninfectedRegions = potentialTargetRegions.filter(tr =>
                            !this.threats.some(t => t.domain === "BIO" && this.getRegionForThreat(t) === tr)
                        );

                        if (uninfectedRegions.length > 0) {
                            const targetRegion = uninfectedRegions[0];
                            const newThreat = new Threat({
                                id: this.threats.length,
                                domain: "BIO",
                                type: "REAL",
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
    selectAIGoal() {
        const goals = [
            { id: 'destabilize_region', weight: 10 },
            { id: 'disrupt_economy', weight: 10 },
            { id: 'tech_supremacy', weight: 5 },
            { id: 'counter_player', weight: 15 }
        ];

        const totalWeight = goals.reduce((sum, goal) => sum + goal.weight, 0);
        let random = Math.random() * totalWeight;

        for (const goal of goals) {
            random -= goal.weight;
            if (random <= 0) {
                this.aiGoal = goal.id;
                console.log(`New AI Goal: ${this.aiGoal}`);
                return;
            }
        }
    }

    generateThreat(options = {}) {
        let threatProps = {};
        const id = `threat-${this.currentTurn}-${this.threats.length}`;

        if (options.isFromAI) {
            if (!this.aiGoal) {
                this.selectAIGoal();
            }

            const cost = { funds: 1000, tech: 500 };
            if (!this.aiFaction.canAfford(cost)) {
                console.log(`AI Faction ${this.aiFaction.name} cannot afford to create a new threat.`);
                return;
            }
            this.aiFaction.spend(cost);
            console.log(`AI Faction ${this.aiFaction.name} spent resources to create a new threat.`);

            let domain;
            let targetRegion;

            switch (this.aiGoal) {
                case 'destabilize_region':
                    domain = ['GEO', 'INFO', 'BIO'][Math.floor(Math.random() * 3)];
                    targetRegion = this.regions.reduce((prev, curr) => prev.stability < curr.stability ? prev : curr);
                    break;
                case 'disrupt_economy':
                    domain = ['ECON', 'CYBER'][Math.floor(Math.random() * 2)];
                    targetRegion = this.regions.reduce((prev, curr) => prev.economy > curr.economy ? prev : curr);
                    break;
                case 'tech_supremacy':
                    domain = ['QUANTUM', 'ROBOT'][Math.floor(Math.random() * 2)];
                    targetRegion = this.regions[Math.floor(Math.random() * this.regions.length)];
                    break;
                case 'counter_player':
                    domain = ['CYBER', 'INFO', 'WMD'][Math.floor(Math.random() * 3)];
                    const playerRegions = this.regions.filter(r => r.owner === 'PLAYER' || r.owner === 'mitigators');
                    if (playerRegions.length > 0) {
                        // Find a player region that is adjacent to an AI region to target the frontier
                        const frontierRegions = playerRegions.filter(pr =>
                            this.travelRoutes.some(route =>
                                (route.from === pr && (this.regions.find(r => r === route.to)?.owner === 'technocrats')) ||
                                (route.to === pr && (this.regions.find(r => r === route.from)?.owner === 'technocrats'))
                            )
                        );

                        if (frontierRegions.length > 0) {
                            targetRegion = frontierRegions[Math.floor(Math.random() * frontierRegions.length)];
                        } else {
                            // If no frontier, target a random player region
                            targetRegion = playerRegions[Math.floor(Math.random() * playerRegions.length)];
                        }
                    } else {
                        // If player has no regions, fall back to targeting the most stable region
                        targetRegion = this.regions.reduce((prev, curr) => prev.stability > curr.stability ? prev : curr);
                    }
                    break;
                default:
                    domain = threatDomains[Math.floor(Math.random() * threatDomains.length)];
                    targetRegion = this.regions[Math.floor(Math.random() * this.regions.length)];
            }

            // Once a goal is acted upon, there's a chance to select a new one next turn
            if (Math.random() < 0.3) {
                this.aiGoal = null;
            }

            threatProps = {
                id,
                domain,
                type: 'REAL',
                severity: this.casualMode ? (Math.random() * 0.2 + 0.1) : (Math.random() * 0.4 + 0.1),
                lat: targetRegion.centroid[0] + (Math.random() - 0.5) * 10,
                lon: targetRegion.centroid[1] + (Math.random() - 0.5) * 10,
            };

        } else {
            // Threat created from cheat menu
            threatProps = {
                id,
                domain: options.domain,
                type: options.type,
                severity: options.severity,
                lat: options.lat,
                lon: options.lon,
            };
        }


        // Add domain-specific properties based on the generated domain
        switch (threatProps.domain) {
            case 'BIO':
                // Add a chance for a special, persistent disease to appear for the global goal
                if (Math.random() < 0.1) { // 10% chance for a BIO threat to be 'Disease X'
                    threatProps.subType = 'DISEASE_X';
                    threatProps.severity = 0.5; // Make it a bit stronger
                }
                break;
            case 'QUANTUM':
                threatProps.quantumProperties = {
                    coherenceTime: 5 + Math.random() * 5,
                    entanglementLevel: Math.random()
                };
                break;
            case 'ROBOT':
                threatProps.roboticProperties = {
                    adaptationRate: Math.random() * 0.5,
                    collectiveIntelligence: Math.random() * 0.2
                };
                break;
            case 'SPACE':
                threatProps.spaceProperties = {
                    orbitalDebrisPotential: Math.random()
                };
                break;
            case 'INFO':
                threatProps.informationProperties = {
                    polarizationFactor: Math.random(),
                    deepfakeQuality: Math.random()
                };
                break;
            case 'ECON':
                threatProps.economicProperties = {
                    marketCrashPotential: Math.random()
                };
                break;
        }

        const threat = new Threat(threatProps);

        this.addThreat(threat);
        this.scene.add(threat.mesh);

        this.narrativeManager.logEvent('THREAT_GENERATED', {
            threatId: threat.id,
            domain: threat.domain,
            type: threat.type,
            lat: threat.lat,
            lon: threat.lon,
            isFromAI: options.isFromAI || false
        });

        if (threatProps.domain === "RAD") {
            const plume = new RadiologicalPlume(threat, this.scene);
            plume.mesh.visible = this.uiState.arePlumesVisible;
            this.plumes.push(plume);
        }
    }
}
