class Agent {
    constructor({
        id,
        factionId,
        region, // The region the agent is currently in
        mission = null, // e.g., { type: 'INFILTRATE', progress: 0, risk: 0.1 }
        isCovert = true,
        experience = 0
    }) {
        this.id = id;
        this.factionId = factionId;
        this.region = region;
        this.mission = mission;
        this.isCovert = isCovert;
        this.experience = experience;

        // 3D representation (for now, let's make it a simple, small cone)
        // It should only be visible to the player.
        const geometry = new THREE.ConeGeometry(0.1, 0.4, 6);
        // A distinct color to represent a covert unit
        const material = new THREE.MeshPhongMaterial({ color: 0x88aaff, emissive: 0x88aaff, emissiveIntensity: 0.6 });
        this.mesh = new THREE.Mesh(geometry, material);

        // Position it in the region's center for now
        const position = worldState.latLonToVector3(region.centroid[0], region.centroid[1]);
        this.mesh.position.copy(position);

        // Orient the agent to stand up on the globe's surface
        this.mesh.lookAt(new THREE.Vector3(0,0,0));
        this.mesh.rotateX(Math.PI / 2);
    }

    startMission(missionType) {
        // Logic to start a new mission
        this.mission = {
            type: missionType,
            progress: 0,
            risk: this.calculateMissionRisk(missionType)
        };
        console.log(`Agent ${this.id} starting mission ${missionType} in ${this.region.name}`);
    }

    calculateMissionRisk(missionType) {
        // Base risk for the mission type
        let risk = 0.05;
        if (missionType === 'SABOTAGE' || missionType === 'STEAL_TECH') {
            risk = 0.15; // Higher base risk for aggressive actions
        }

        // Factor in agent experience (more experience = lower risk)
        risk -= this.experience * 0.02; // Each level of experience reduces risk by 2%

        // Factor in target region's counter-intel
        const targetFaction = worldState.factions.find(f => f.id === this.region.owner);
        if (targetFaction) {
            // The faction's counterIntel score directly adds to the risk.
            // We also add the global AI alert level as a modifier for the AI faction.
            let counterIntelFactor = targetFaction.counterIntel;
            if (targetFaction.id === 'technocrats') {
                 counterIntelFactor += (worldState.aiAlertLevel * 0.05); // Each alert level adds 5% risk
            }
            risk += counterIntelFactor;
        }

        // Ensure risk is within a reasonable bound (e.g., 1% to 95%)
        return Math.max(0.01, Math.min(0.95, risk));
    }

    update(dt) {
        if (this.mission) {
            // Update mission progress, let's say a mission takes 30 seconds
            this.mission.progress += dt / 30;

            if (this.mission.progress >= 1) {
                // The mission completion logic will be handled in world.js
                // to have access to the full world state.
                worldState.resolveAgentMission(this);
            }
        }
    }
}
