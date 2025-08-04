const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

const CROSS_DOMAIN_INTERACTIONS = {
    "CYBER-RAD": {
        narrativeEvent: "CYBER_RAD_SYNERGY",
        effect: (cyberThreat, radThreat, dt) => {
            radThreat.severity = Math.min(1.0, radThreat.severity + 0.001 * cyberThreat.severity);
            cyberThreat.severity = Math.min(1.0, cyberThreat.severity + 0.0005 * radThreat.severity);
        }
    },
    "ECON-INFO": {
        narrativeEvent: "ECON_INFO_SYNERGY",
        effect: (econThreat, infoThreat, dt) => {
            // Economic trouble makes people more susceptible to misinformation
            infoThreat.spreadRate = Math.min(1.0, infoThreat.spreadRate + 0.002 * econThreat.severity);
            // Misinformation can amplify economic panic
            econThreat.severity = Math.min(1.0, econThreat.severity + 0.001 * infoThreat.severity);
        }
    },
    "QUANTUM-ROBOT": {
        narrativeEvent: "QUANTUM_ROBOTIC_ENHANCEMENT",
        effect: (qThreat, rThreat, dt) => {
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
        effect: (cyberThreat, robotThreat, dt) => {
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
        effect: (qThreat, infoThreat, dt) => {
            const qProps = qThreat.quantumProperties;
            const iProps = infoThreat.informationProperties;
            // Quantum computing can dramatically improve deepfake quality
            if (qProps && iProps && qProps.coherenceTime > 3) {
                 const qualityGain = qProps.coherenceTime * 0.005 * dt;
                 iProps.deepfakeQuality = Math.min(1, (iProps.deepfakeQuality || 0) + qualityGain);
            }
        }
    }
};

class WorldState {
    constructor(scene, uiState) {
        this.scene = scene;
        this.uiState = uiState;
        this.regions = [];
        this.factions = [];
        this.playerFaction = null;
        this.aiFaction = null;
        this.initializeFactions();
        this.travelRoutes = [];
        this.initializeRegions();
        this.initializeTravelRoutes();
        this.weatherSystem = new WeatherSystem();
        this.threats = [];
        this.plumes = [];
        this.currentTurn = 0;
        this.globalMetrics = {
            stability: 1.0,
            economy: 1.0,
            trust: 1.0,
        };
        this.threatGenerationTimer = 0;
        this.threatGenerationInterval = 3; // seconds
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
                this.scene.add(curveObject);
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
            { id: 'na', name: 'North America', centroid: [40, -100], radius: 3000, attributes: { climateVulnerability: 0.4, temperature: 15, economy: 1.0 } },
            { id: 'sa', name: 'South America', centroid: [-20, -60], radius: 2500, attributes: { climateVulnerability: 0.6, temperature: 25, economy: 0.8 } },
            { id: 'eu', name: 'Europe', centroid: [50, 15], radius: 2000, attributes: { climateVulnerability: 0.3, temperature: 10, economy: 1.0 } },
            { id: 'af', name: 'Africa', centroid: [0, 20], radius: 3000, attributes: { climateVulnerability: 0.8, temperature: 30, economy: 0.6 } },
            { id: 'as', name: 'Asia', centroid: [40, 90], radius: 4000, attributes: { climateVulnerability: 0.7, temperature: 20, economy: 0.9 } },
            { id: 'oc', name: 'Oceania', centroid: [-25, 135], radius: 2000, attributes: { climateVulnerability: 0.5, temperature: 22, economy: 0.9 } },
            { id: 'an', name: 'Antarctica', centroid: [-90, 0], radius: 2000, attributes: { climateVulnerability: 0.9, temperature: -50, economy: 0.1 } },
        ];

        regionsData.forEach(data => {
            const region = new Region(data);
            this.regions.push(region);
            this.scene.add(region.mesh);
        });
    }

    initializeFactions() {
        // Player Faction
        this.playerFaction = new Faction({
            id: 'mitigators',
            name: 'Hero Mitigators',
            resources: {
                funds: 10000,
                intel: 5000,
                tech: 2000
            }
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
            f.resources.funds += 10; // 10 funds per turn/tick
            f.resources.intel += 5;
            f.resources.tech += 2;
        });

        // Calculate total environmental threat level
        const totalEnvSeverity = this.threats
            .filter(t => t.domain === "ENV")
            .reduce((sum, t) => sum + t.severity, 0);

        // Update weather system
        this.weatherSystem.update(this.regions, dt, totalEnvSeverity);

        // Update all threats and their impact on regions
        this.threats.forEach(threat => {
            threat.update(dt);

            // If threat is fully mitigated, it will be removed, so no need to process further
            if (threat.isMitigated) return;

            const region = this.getRegionForThreat(threat);
            if (region) {
                // Economic damage
                const economicDamage = this.getEconomicDamage(threat) * 0.001;
                region.economy = Math.max(0, region.economy - economicDamage);

                // Decrease stability based on threat severity
                const stabilityDecrease = threat.severity * 0.001; // Adjust this factor
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
            // Stability drain from low economy
            if (region.economy < 0.5) {
                region.stability = Math.max(0, region.stability - (0.5 - region.economy) * 0.0005);
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

        // Update visualizations
        this.updateVisualization(dt);

        // Update threat generation timer
        this.threatGenerationTimer += dt;
        if (this.threatGenerationTimer >= this.threatGenerationInterval) {
            this.generateThreat();
            this.threatGenerationTimer = 0;
        }

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
        const vulnerability = 1 - region.population.psychodynamics.trust;

        const spreadRateChange = (0.4 * polarizationFactor + 0.3 * deepfakeQuality + 0.3 * vulnerability) * (dt / 10);
        threat.spreadRate = Math.min(1, (threat.spreadRate || 0) + spreadRateChange);

        // Educational metric decay
        const resistanceDecay = 0.15 * threat.severity * (dt / 10);
        region.educationMetrics.misinformationResistance = Math.max(0, region.educationMetrics.misinformationResistance - resistanceDecay);

        // Trust decay
        const trustDecay = (polarizationFactor * 0.1 + deepfakeQuality * 0.2) * threat.severity * (dt / 10);
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
                NarrativeManager.logEvent('RAD_FALLOUT_AMPLIFY', {
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
                            NarrativeManager.logEvent(interaction.narrativeEvent, {
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
        // Calculate environmental damage per region
        const envDamage = new Map(this.regions.map(r => [r.id, 0]));
        this.threats.forEach(t => {
            if (t.domain === "ENV") {
                const region = this.getRegionForThreat(t);
                if (region) {
                    envDamage.set(region.id, envDamage.get(region.id) + t.severity);
                }
            }
        });

        this.regions.forEach(region => {
            // Update region color based on stability and env damage
            region.updateMeshColor(envDamage.get(region.id) || 0);

            // Update weather visibility
            if (region.weather && region.weather.type !== "CLEAR") {
                region.weatherMesh.visible = true;
                region.weatherMesh.material.color.set(WEATHER_COLORS[region.weather.type]);
            } else {
                region.weatherMesh.visible = false;
            }
        });
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
     * Creates a new threat, orchestrated by the AI faction.
     */
    generateThreat() {
        const cost = { funds: 1000, tech: 500 };

        if (this.aiFaction.canAfford(cost)) {
            this.aiFaction.spend(cost);
            console.log(`AI Faction ${this.aiFaction.name} spent resources to create a new threat.`);

            const id = `threat-${this.currentTurn}-${this.threats.length}`;

            // Evil Technocrats prefer certain domains
            const technocratDomains = ["CYBER", "ROBOT", "QUANTUM", "ECON", "INFO", "WMD"];
            let domain;
            if (Math.random() < 0.75) { // 75% chance to pick a preferred domain
                domain = technocratDomains[Math.floor(Math.random() * technocratDomains.length)];
            } else {
                domain = threatDomains[Math.floor(Math.random() * threatDomains.length)];
            }

            // AI always creates REAL threats for now, but could create FAKE ones later
            const type = 'REAL';
            const severity = Math.random() * 0.4 + 0.1; // Start with 10-50% severity
            const lat = Math.random() * 180 - 90;
            const lon = Math.random() * 360 - 180;

            let threatProps = { id, domain, type, severity, lat, lon };

            // Add domain-specific properties based on the generated domain
            switch (domain) {
                case 'QUANTUM':
                    threatProps.quantumProperties = {
                        coherenceTime: 5 + Math.random() * 5, // e.g., 5-10
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

            if (domain === "RAD") {
                const plume = new RadiologicalPlume(threat, this.scene);
                plume.mesh.visible = this.uiState.arePlumesVisible;
                this.plumes.push(plume);
            }
        } else {
            console.log(`AI Faction ${this.aiFaction.name} cannot afford to create a new threat.`);
        }
    }
}
