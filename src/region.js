const REGION_COLORS = {
    NEUTRAL: 0x808080, // Grey
    PLAYER: 0x00ff00,  // Green
    AI: 0xff0000,      // Red
};

const EARTH_RADIUS_KM = 6371; // For converting region radius to sphere scale

class Region {
    constructor({ id, name, centroid, radius, attributes }) {
        this.id = id;
        this.name = name;
        this.centroid = centroid; // [lat, lon]
        this.radius = radius; // km
        this.attributes = attributes; // { climateVulnerability, temperature, economy: 1.0 }
        this.stability = 1.0; // Initial stability
        this.economy = 1.0; // Initial economy
        this.owner = 'NEUTRAL'; // NEUTRAL, PLAYER, or AI

        this.weather = null;

        // Population and Education
        this.population = {
            count: (Math.random() * 500 + 100) * 1000000, // 100M to 600M
            growthRate: 0.01, // 1% annual growth
        };
        this.education = Math.random() * 0.5 + 0.3; // 0.3 to 0.8

        this.mesh = this.createMesh();
        this.weatherMesh = this.createWeatherMesh();
        this.mesh.add(this.weatherMesh);

        this.activeMission = null;
        this.missionProgress = 0;
        this.missionDuration = 30;

        this.activeBuffs = [];
    }

    startDiplomaticMission() {
        if (this.activeMission) return false;
        this.activeMission = 'diplomatic';
        this.missionProgress = 0;
        return true;
    }

    startAwarenessCampaign() {
        if (this.activeMission) return false;
        this.activeMission = 'awareness';
        this.missionProgress = 0;
        return true;
    }

    update(dt) {
        // --- Mission Progress ---
        if (this.activeMission) {
            this.missionProgress += dt;
            if (this.missionProgress >= this.missionDuration) {
                this.completeMission();
            }
        }

        // --- Buffs ---
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];
            buff.duration -= dt;
            if (buff.duration <= 0) {
                this.activeBuffs.splice(i, 1);
                console.log(`Buff ${buff.type} has expired in ${this.name}.`);
            }
        }

        // --- Population and Education Simulation ---
        const bioThreatSeverity = worldState.threats
            .filter(t => t.domain === 'BIO' && worldState.getRegionForThreat(t) === this)
            .reduce((sum, t) => sum + t.severity, 0);

        const growthModifier = (this.stability - 0.5) + (this.economy - 0.5) - bioThreatSeverity;
        this.population.growthRate = 0.01 * growthModifier;
        this.population.count += this.population.count * this.population.growthRate * (dt / 365); // dt is in seconds, rate is annual

        // Education decays slowly over time
        this.education = Math.max(0, this.education - 0.001 * dt);
    }

    addBuff(type, duration, factionId = null) {
        if (!this.activeBuffs.some(b => b.type === type)) {
            this.activeBuffs.push({ type, duration, factionId });
            return true;
        }
        return false;
    }

    initiateQuarantine(faction) {
        const cost = PlayerActions.initiate_quarantine.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.addBuff('QUARANTINE', 60);
            return true;
        }
        return false;
    }

    scrubNetwork(faction) {
        const cost = PlayerActions.scrub_network.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.addBuff('NETWORK_SCRUB', 45);
            return true;
        }
        return false;
    }

    launchCounterPropaganda(faction) {
        const cost = PlayerActions.counter_propaganda.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.addBuff('COUNTER_PROPAGANDA', 90);
            return true;
        }
        return false;
    }

    completeMission() {
        if (this.activeMission === 'diplomatic') {
            this.stability = Math.min(1.0, this.stability + 0.1);
        } else if (this.activeMission === 'awareness') {
            this.education = Math.min(1.0, this.education + 0.1);
        }

        this.activeMission = null;
        this.missionProgress = 0;
    }

    deployNetworkInfrastructure(faction) {
        const cost = PlayerActions.deploy_network_infrastructure.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.attributes.internetAccess = Math.min(1.0, this.attributes.internetAccess + 0.25);
            console.log(`Network infrastructure deployed in ${this.name}. Internet access is now ${this.attributes.internetAccess.toFixed(2)}.`);
            return true;
        }
        alert(`Not enough resources to deploy network infrastructure in ${this.name}.`);
        return false;
    }

    updateMeshColor(envDamage = 0) {
        const color = this.getRegionColor(this.attributes.temperature, this.stability, envDamage);
        this.mesh.material.color.set(color);

        const ownerColor = new THREE.Color(REGION_COLORS[this.owner]);
        this.mesh.material.color.lerp(ownerColor, 0.5);
    }

    setOwner(owner) {
        this.owner = owner;
        this.updateMeshColor();
    }

    createMesh() {
        const sphereRadius = 5;
        const regionRadiusOnSphere = (this.radius / EARTH_RADIUS_KM) * sphereRadius;

        const geometry = new THREE.CircleGeometry(regionRadiusOnSphere, 32);
        const regionColor = this.getRegionColor(this.attributes.temperature, this.stability);
        const material = new THREE.MeshBasicMaterial({
            color: regionColor,
            transparent: true,
            opacity: 0.4
        });

        const mesh = new THREE.Mesh(geometry, material);
        const [lat, lon] = this.centroid;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(sphereRadius * Math.sin(phi) * Math.cos(theta));
        const z = sphereRadius * Math.sin(phi) * Math.sin(theta);
        const y = sphereRadius * Math.cos(phi);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);
        return mesh;
    }

    getRegionColor(temp, stability, envDamage) {
        const minTemp = -50;
        const maxTemp = 40;
        const normalizedTemp = (Math.max(minTemp, Math.min(maxTemp, temp)) - minTemp) / (maxTemp - minTemp);
        const tempHue = 0.7 * (1 - normalizedTemp);
        const stabilityHue = 0;
        const finalHue = tempHue * stability + stabilityHue * (1 - stability);
        const saturation = Math.max(0, 1.0 - envDamage * 0.5);
        const color = new THREE.Color();
        color.setHSL(finalHue, saturation, 0.5);
        return color;
    }

    createWeatherMesh() {
        const sphereRadius = 5;
        const regionRadiusOnSphere = (this.radius / EARTH_RADIUS_KM) * sphereRadius;

        const geometry = new THREE.SphereGeometry(regionRadiusOnSphere * 1.1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        return mesh;
    }

    investInEducation(faction) {
        const cost = PlayerActions.invest_in_education.resourceCost;
        if (faction.canAfford(cost)) {
            faction.spend(cost);
            this.education = Math.min(1.0, this.education + 0.1);
            console.log(`Education investment in ${this.name} successful. New level: ${this.education.toFixed(2)}`);
            return true;
        }
        console.log(`Faction ${faction.name} cannot afford to invest in education in ${this.name}.`);
        return false;
    }
}
