class Agent {
    constructor({
        id,
        factionId,
        region, // The region the agent is currently in
        name = "Rook", // Default name
        level = 1,
        experience = 0,
        abilities = [],
        status = 'IDLE', // IDLE, ON_MISSION, CAPTURED, KIA
    }) {
        this.id = id;
        this.factionId = factionId;
        this.region = region;
        this.name = name;
        this.level = level;
        this.experience = experience;
        this.abilities = abilities; // e.g., ['CYBER_SPECIALIST', 'STEALTH_EXPERT']
        this.status = status;
        this.mission = null; // Will hold the full mission object from AgentActions

        // 3D representation
        const geometry = new THREE.ConeGeometry(0.1, 0.4, 6);
        const material = new THREE.MeshPhongMaterial({ color: 0x88aaff, emissive: 0x88aaff, emissiveIntensity: 0.6 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.agent = this; // Link mesh back to agent object

        this.updatePosition();

        this.mesh.visible = this.factionId === 'player'; // Only show player's agents
    }

    updatePosition() {
        if (this.region) {
            const position = worldState.latLonToVector3(this.region.centroid[0], this.region.centroid[1]);
            this.mesh.position.copy(position);
            this.mesh.lookAt(new THREE.Vector3(0, 0, 0));
            this.mesh.rotateX(Math.PI / 2);
        }
    }

    startMission(missionAction) {
        if (this.status !== 'IDLE') {
            console.error(`Agent ${this.id} is not IDLE and cannot start a new mission.`);
            return false;
        }

        this.mission = {
            action: missionAction,
            progress: 0,
            risk: this.calculateMissionRisk(missionAction),
            startTime: worldState.currentTurn,
        };
        this.status = 'ON_MISSION';
        console.log(`Agent ${this.id} starting mission ${missionAction.name} in ${this.region.name}`);
        return true;
    }

    calculateMissionRisk(missionAction) {
        let risk = missionAction.baseRisk || 0.1;

        // Modify risk based on agent level and abilities
        risk -= this.level * 0.05; // Each level reduces risk by 5%
        missionAction.requiredAbilities?.forEach(ability => {
            if (!this.abilities.includes(ability)) {
                risk += 0.2; // 20% penalty for each missing required ability
            }
        });

        // Modify risk based on region properties
        if (this.region) {
            risk += (1 - this.region.stability) * 0.1; // Unstable regions are riskier
        }

        // Factor in target faction's counter-intel
        const targetFaction = worldState.factions.find(f => f.id === this.region.owner);
        if (targetFaction) {
            let counterIntelFactor = targetFaction.counterIntel || 0.1;
            if (targetFaction.id === 'technocrats') {
                counterIntelFactor += (worldState.aiAlertLevel * 0.1); // Each AI alert level adds 10% risk
            }
            risk += counterIntelFactor;
        }

        return Math.max(0.01, Math.min(0.95, risk));
    }

    addExperience(xp) {
        this.experience += xp;
        const xpForNextLevel = 100 * this.level;
        if (this.experience >= xpForNextLevel) {
            this.level++;
            this.experience = 0; // Reset for next level
            // Potentially grant new ability on level up
            console.log(`Agent ${this.name} has reached level ${this.level}!`);
            worldState.narrativeManager.logEvent('AGENT_LEVEL_UP', { agentId: this.id, agentName: this.name, newLevel: this.level });
        }
    }

    moveTo(targetRegion) {
        // For now, instant travel. Could be expanded to take time.
        this.region = targetRegion;
        this.updatePosition();
        console.log(`Agent ${this.id} moved to ${targetRegion.name}`);
    }

    update(dt) {
        if (this.status === 'ON_MISSION' && this.mission) {
            const missionDuration = this.mission.action.duration || 30; // default 30s
            this.mission.progress += dt / missionDuration;

            if (this.mission.progress >= 1) {
                worldState.resolveAgentMission(this);
            }
        }
    }
}
