const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

class WorldState {
    constructor(scene) {
        this.scene = scene;
        this.regions = [];
        this.factions = [];
        this.initializeRegions();
        this.weatherSystem = new WeatherSystem();
        this.threats = [];
        this.currentTurn = 0;
        this.globalMetrics = {
            stability: 1.0,
            economy: 1.0,
            trust: 1.0,
        };
        this.threatGenerationTimer = 0;
        this.threatGenerationInterval = 3; // seconds
    }

    initializeRegions() {
        const regionsData = [
            { id: 'na', name: 'North America', centroid: [40, -100], radius: 3000, attributes: { climateVulnerability: 0.4, temperature: 15 } },
            { id: 'sa', name: 'South America', centroid: [-20, -60], radius: 2500, attributes: { climateVulnerability: 0.6, temperature: 25 } },
            { id: 'eu', name: 'Europe', centroid: [50, 15], radius: 2000, attributes: { climateVulnerability: 0.3, temperature: 10 } },
            { id: 'af', name: 'Africa', centroid: [0, 20], radius: 3000, attributes: { climateVulnerability: 0.8, temperature: 30 } },
            { id: 'as', name: 'Asia', centroid: [40, 90], radius: 4000, attributes: { climateVulnerability: 0.7, temperature: 20 } },
            { id: 'oc', name: 'Oceania', centroid: [-25, 135], radius: 2000, attributes: { climateVulnerability: 0.5, temperature: 22 } },
            { id: 'an', name: 'Antarctica', centroid: [-90, 0], radius: 2000, attributes: { climateVulnerability: 0.9, temperature: -50 } },
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

        // Update weather system
        this.weatherSystem.update(this.regions, dt);

        // Update visualizations
        this.updateVisualization(dt);

        // Update threat generation timer
        this.threatGenerationTimer += dt;
        if (this.threatGenerationTimer >= this.threatGenerationInterval) {
            this.generateThreat();
            this.threatGenerationTimer = 0;
        }
    }

    updateVisualization(dt) {
        this.regions.forEach(region => {
            if (region.weather && region.weather.type !== "CLEAR") {
                region.weatherMesh.visible = true;
                region.weatherMesh.material.color.set(WEATHER_COLORS[region.weather.type]);
            } else {
                region.weatherMesh.visible = false;
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
    }
}
