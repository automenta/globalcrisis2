const DOMAIN_COLORS = {
    "CYBER": 0x00ffff, // Cyan
    "BIO": 0x00ff00,   // Green
    "GEO": 0xffff00,   // Yellow
    "ENV": 0x8B4513,   // SaddleBrown
    "INFO": 0xffa500,  // Orange
    "SPACE": 0xcccccc, // Light Grey
    "WMD": 0xff4500,   // OrangeRed
    "ECON": 0x0000ff,  // Blue
    "QUANTUM": 0x9400d3,// DarkViolet
    "RAD": 0xADFF2F,   // GreenYellow
    "ROBOT": 0x808080, // Grey
    "DEFAULT": 0xff0000 // Red for default/unknown
};

class Threat {
    constructor({
        id,
        domain,
        type,
        lat,
        lon,
        severity = 0.5,
        detectionRisk = 0.1,
        investigationProgress = 0,
        visibility = 0.1,
        spreadRate = 0.1,
        effects = [],
        crossDomainImpacts = [],
        economicImpact = null,
        biologicalProperties = null,
        cyberProperties = null,
        environmentalProperties = null,
        quantumProperties = null,
        radiologicalProperties = null,
        roboticProperties = null,
        neurologicalProperties = null,
        temporalProperties = null,
        informationProperties = null,
        spaceProperties = null
    }) {
        this.id = id;
        this.domain = domain;
        this.type = type;
        this.lat = lat;
        this.lon = lon;

        // Core simulation properties
        this.severity = severity;
        this.detectionRisk = detectionRisk;
        this.investigationProgress = investigationProgress;
        this.visibility = visibility;
        this.spreadRate = spreadRate;
        this.effects = effects;
        this.crossDomainImpacts = crossDomainImpacts;

        // Domain-specific properties
        this.economicImpact = economicImpact;
        this.biologicalProperties = biologicalProperties;
        this.cyberProperties = cyberProperties;
        this.environmentalProperties = environmentalProperties;
        this.quantumProperties = quantumProperties;
        this.radiologicalProperties = radiologicalProperties;
        this.roboticProperties = roboticProperties;
        this.neurologicalProperties = neurologicalProperties;
        this.temporalProperties = temporalProperties;
        this.informationProperties = informationProperties;
        this.spaceProperties = spaceProperties;

        // 3D representation
        this.mesh = this.createMesh();
    }

    createMesh() {
        // Determine color based on domain
        const color = DOMAIN_COLORS[this.domain] || DOMAIN_COLORS["DEFAULT"];
        const material = new THREE.MeshBasicMaterial({ color: color });

        // Determine size based on severity
        const baseHeight = 0.5;
        const maxHeight = 2.0;
        const height = baseHeight + (this.severity * (maxHeight - baseHeight));
        const radius = height * 0.2; // Keep a constant aspect ratio

        const geometry = new THREE.ConeGeometry(radius, height, 8);
        const cone = new THREE.Mesh(geometry, material);

        // Position the cone on the surface of the Earth
        const phi = (90 - this.lat) * (Math.PI / 180);
        const theta = (this.lon + 180) * (Math.PI / 180);

        const earthRadius = 5;
        const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
        const z = earthRadius * Math.sin(phi) * Math.sin(theta);
        const y = earthRadius * Math.cos(phi);

        cone.position.set(x, y, z);

        // Point the cone outwards from the center of the Earth
        cone.lookAt(0, 0, 0);
        cone.rotateX(Math.PI / 2);

        return cone;
    }
}
