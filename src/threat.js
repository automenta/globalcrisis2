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
        this.isSpreading = false;
        this.spreadTimer = 0;
        this.spreadInterval = 10; // 10 seconds to spread

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
        this.pulseTime = 0;
    }

    update(dt) {
        this.pulseTime += dt;
        // Increase severity over time, capped at 1.0
        if (this.severity < 1.0) {
            this.severity += 0.01 * dt; // Adjust rate as needed
            this.severity = Math.min(this.severity, 1.0);
        }
        this.updateMesh();
    }

    updateMesh() {
        const baseScale = 0.5 + (this.severity * 1.5);
        // Pulse speed and intensity are based on severity
        const pulseSpeed = 1 + this.severity * 4;
        const pulseIntensity = 0.1 * this.severity;
        const pulseFactor = 1 + Math.sin(this.pulseTime * pulseSpeed) * pulseIntensity;

        const scale = baseScale * pulseFactor;
        this.mesh.scale.set(scale, scale, scale);

        // Also update the selection indicator if this threat is selected
        if (typeof selectionIndicator !== 'undefined' && typeof selectedThreat !== 'undefined' && selectedThreat === this) {
            if (typeof updateSelectionIndicator !== 'undefined') {
                updateSelectionIndicator();
            }
        }
    }

    updateMeshForInvestigation() {
        if (this.type === 'FAKE') {
            console.log(`Threat ${this.id} revealed as FAKE. Removing.`);
            this.isMitigated = true; // Mark for removal
        } else if (this.type === 'REAL') {
            console.log(`Threat ${this.id} revealed as REAL. Updating mesh.`);
            // Swap geometry to a cone
            const radius = 0.2;
            const height = radius * 5; // Maintain aspect ratio
            this.mesh.geometry.dispose();
            this.mesh.geometry = new THREE.ConeGeometry(radius, height, 8);
        }
    }

    createMesh() {
        // Determine color based on domain
        const color = DOMAIN_COLORS[this.domain] || DOMAIN_COLORS["DEFAULT"];
        const material = new THREE.MeshBasicMaterial({ color: color });

        // Determine size based on severity
        const baseHeight = 0.5;
        const maxHeight = 2.0;
        const height = baseHeight + (this.severity * (maxHeight - baseHeight));
        const radius = height * 0.2;

        // All threats start as 'UNKNOWN' visually (a sphere).
        // The mesh will be updated upon successful investigation.
        const geometry = new THREE.SphereGeometry(radius * 1.2, 16, 16);
        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh on the surface of the Earth
        const phi = (90 - this.lat) * (Math.PI / 180);
        const theta = (this.lon + 180) * (Math.PI / 180);

        const earthRadius = 5;
        const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
        const z = earthRadius * Math.sin(phi) * Math.sin(theta);
        const y = earthRadius * Math.cos(phi);

        mesh.position.set(x, y, z);

        // Point the mesh outwards from the center of the Earth
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI / 2);

        return mesh;
    }

    investigate(faction) {
        const cost = { intel: 100 };
        if (this.investigationProgress >= 1.0) {
            console.log("Threat already fully investigated.");
            return false;
        }

        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.investigationProgress += 0.2; // Increase by 20%
            this.investigationProgress = Math.min(this.investigationProgress, 1.0);

            // Visibility increases as investigation progresses
            this.visibility = this.investigationProgress;

            if (this.investigationProgress >= 1.0) {
                console.log(`Threat ${this.id} fully investigated. Type: ${this.type}`);
                this.updateMeshForInvestigation();
            }
            return true; // Success
        } else {
            console.log(`Faction ${faction.name} cannot afford to investigate.`);
            alert("Not enough Intel to investigate!"); // Simple user feedback
            return false; // Failure
        }
    }

    mitigate(faction) {
        const cost = { funds: 500, tech: 200 };
        if (this.investigationProgress < 1.0 || this.type !== 'REAL') {
            console.log("Cannot mitigate: Threat is not a fully investigated REAL threat.");
            return false;
        }

        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.severity -= 0.25; // Reduce severity by 25%

            if (this.severity <= 0) {
                this.severity = 0;
                this.isMitigated = true; // Mark for removal
                console.log(`Threat ${this.id} has been fully mitigated.`);
            }
            return true; // Success
        } else {
            console.log(`Faction ${faction.name} cannot afford to mitigate.`);
            alert("Not enough Funds or Tech to mitigate!");
            return false; // Failure
        }
    }
}
