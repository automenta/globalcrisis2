const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

class WorldState {
    constructor() {
        this.regions = [];
        this.factions = [];
        this.threats = [];
        this.currentTurn = 0;
        this.globalMetrics = {
            stability: 1.0,
            economy: 1.0,
            trust: 1.0,
        };
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
     * A placeholder for the main simulation update logic.
     */
    update() {
        this.currentTurn++;
        // In the future, this method will drive the simulation updates for all entities.
        // console.log(`Turn: ${this.currentTurn}`);
    }

    /**
     * Creates a new threat with random properties and adds it to the simulation.
     * @param {THREE.Scene} scene The scene to add the threat's mesh to.
     */
    generateThreat(scene) {
        const id = this.threats.length;
        const domain = threatDomains[Math.floor(Math.random() * threatDomains.length)];
        const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const severity = Math.random();
        const lat = Math.random() * 180 - 90;
        const lon = Math.random() * 360 - 180;

        // The constructor now expects a single object
        const threat = new Threat({ id, domain, type, severity, lat, lon });

        this.addThreat(threat);
        scene.add(threat.mesh);
    }
}
