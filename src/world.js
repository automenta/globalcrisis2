const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

class WorldState {
    constructor(scene) {
        this.scene = scene;
        this.regions = [];
        this.factions = [];
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

        // Calculate total environmental threat level
        const totalEnvSeverity = this.threats
            .filter(t => t.domain === "ENV")
            .reduce((sum, t) => sum + t.severity, 0);

        // Update weather system
        this.weatherSystem.update(this.regions, dt, totalEnvSeverity);

        // Update all threats and their impact on regions
        this.threats.forEach(threat => {
            threat.update(dt);

            const region = this.getRegionForThreat(threat);
            if (region) {
                // Economic damage
                const economicDamage = this.getEconomicDamage(threat) * 0.001;
                region.economy = Math.max(0, region.economy - economicDamage);

                // Decrease stability based on threat severity
                const stabilityDecrease = threat.severity * 0.001; // Adjust this factor
                region.stability = Math.max(0, region.stability - stabilityDecrease);
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
    }

    handleCrossDomainInteractions(dt) {
        for (let i = 0; i < this.threats.length; i++) {
            for (let j = i + 1; j < this.threats.length; j++) {
                const threatA = this.threats[i];
                const threatB = this.threats[j];

                const regionA = this.getRegionForThreat(threatA);
                const regionB = this.getRegionForThreat(threatB);

                if (regionA && regionA === regionB) {
                    // Rule 1: CYBER + RAD
                    if (threatA.domain === "CYBER" && threatB.domain === "RAD") {
                        threatB.severity = Math.min(1.0, threatB.severity + 0.001 * threatA.severity);
                    }
                    if (threatB.domain === "CYBER" && threatA.domain === "RAD") {
                        threatA.severity = Math.min(1.0, threatA.severity + 0.001 * threatB.severity);
                    }

                    // Rule 2: ECON + INFO
                    if (threatA.domain === "ECON" && threatB.domain === "INFO") {
                        threatB.severity = Math.min(1.0, threatB.severity + 0.001 * threatA.severity);
                    }
                    if (threatB.domain === "ECON" && threatA.domain === "INFO") {
                        threatA.severity = Math.min(1.0, threatA.severity + 0.001 * threatB.severity);
                    }
                }
            }
        }
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
     * Creates a new threat with random properties and adds it to the simulation.
     */
    generateThreat() {
        const id = this.threats.length;
        const domain = threatDomains[Math.floor(Math.random() * threatDomains.length)];
        const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const severity = Math.random();
        const lat = Math.random() * 180 - 90;
        const lon = Math.random() * 360 - 180;

        // The constructor now expects a single object
        const threat = new Threat({ id, domain, type, severity, lat, lon });

        this.addThreat(threat);
        this.scene.add(threat.mesh);

        if (domain === "RAD") {
            const plume = new RadiologicalPlume(threat, this.scene);
            this.plumes.push(plume);
        }
    }
}
