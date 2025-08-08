export class UIManager {
    constructor(
        voxelWorld,
        actionService,
        audioManager,
        goalManager,
        selectionIndicator
    ) {
        this.voxelWorld = voxelWorld;
        this.actionService = actionService;
        this.audioManager = audioManager;
        this.goalManager = goalManager;
        this.selectionIndicator = selectionIndicator;

        this.selectedThreat = null;
        this.selectedUnit = null;

        this.uiState = {
            arePlumesVisible: true,
            isClimateVisible: false,
        };

        this.materialNames = {
            0: 'Air',
            1: 'Rock',
            2: 'Water',
            3: 'Ice',
            4: 'Sand',
            5: 'Grass',
        };
        this.lastChronicleCount = 0;

        this.frames = 0;
        this.lastFPSTime = 0;
        this.currentFPS = 0;

        this.initUI();
        this.bindEventListeners();
    }

    initUI() {
        // This method will hold all the document.getElementById calls
        this.threatInfoPanel = document.getElementById('threat-info');
        this.weatherPanel = {
            panel: document.getElementById('weather-panel'),
            type: document.getElementById('weather-type'),
            windSpeed: document.getElementById('weather-wind-speed'),
            windDir: document.getElementById('weather-wind-dir'),
        };
        this.playerPanel = {
            name: document.getElementById('faction-name'),
            funds: document.getElementById('funds-value'),
            intel: document.getElementById('intel-value'),
            tech: document.getElementById('tech-value'),
        };
        this.agentPanel = {
            recruitButton: document.getElementById('recruit-agent-button'),
            list: document.getElementById('agent-list'),
        };
        this.locationInfoPanel = {
            panel: document.getElementById('location-info-panel'),
            material: document.getElementById('location-material'),
            temp: document.getElementById('location-temp'),
            moisture: document.getElementById('location-moisture'),
        };
        this.narrativeLogPanel = document.getElementById('narrative-log');
        this.goalsPanel = document.getElementById('goals-panel');
        this.researchPanel = document.getElementById('research-panel');
        this.buildPanel = document.getElementById('build-panel');
        this.aiAlertDiv = document.getElementById('ai-alert-level');

        this.fpsCounter = document.getElementById('fps-counter');

        this.quantumViewer = {
            panel: document.getElementById('quantum-viewer'),
            entanglement: document.getElementById('quantum-entanglement'),
            coherence: document.getElementById('quantum-coherence'),
        };

        // Buttons
        this.togglePlumesButton = document.getElementById(
            'toggle-plumes-button'
        );
        this.toggleClimateButton = document.getElementById(
            'toggle-climate-button'
        );
        this.powerModeSelector = document.getElementById('power-mode-selector');
        this.casualModeCheckbox = document.getElementById(
            'casual-mode-checkbox'
        );

        // Right Panel Buttons
        this.cheatInvestigateButton = document.getElementById(
            'cheat-investigate-threat'
        );
        this.cheatMitigateButton = document.getElementById(
            'cheat-mitigate-threat'
        );
        this.moveAgentButton = document.getElementById('move-agent-button');
        this.claimRegionButton = document.getElementById('claim-region-button');
        this.buildButton = document.getElementById('build-button');
        this.deployNetworkButton = document.getElementById(
            'deploy-network-button'
        );
        this.launchSatelliteButton = document.getElementById(
            'launch-satellite-button'
        );
        this.weatherControlButton = document.getElementById(
            'weather-control-button'
        );
        this.researchButton = document.getElementById('research-button');

        // Build Panel Buttons
        this.buildBaseButton = document.getElementById('build-base-button');
        this.buildResearchOutpostButton = document.getElementById(
            'build-research-outpost-button'
        );
        this.buildSensorButton = document.getElementById('build-sensor-button');
        this.buildAgentButton = document.getElementById('build-agent-button');
        this.buildVehicleButton = document.getElementById(
            'build-vehicle-button'
        );
        this.buildAircraftButton = document.getElementById(
            'build-aircraft-button'
        );
        this.buildSatelliteUnitButton = document.getElementById(
            'build-satellite-unit-button'
        );

        // Research Panel Buttons
        this.researchAdvancedAgentsButton = document.getElementById(
            'research-advanced-agents-button'
        );
        this.researchMoonProgramButton = document.getElementById(
            'research-moon-program-button'
        );
        this.researchSingularity1Button = document.getElementById(
            'research-singularity-1-button'
        );
        this.researchSingularity2Button = document.getElementById(
            'research-singularity-2-button'
        );
        this.researchSingularity3Button = document.getElementById(
            'research-singularity-3-button'
        );
    }

    bindEventListeners() {
        this.casualModeCheckbox.addEventListener('change', () => {
            alert('Casual Mode setting will apply on next new game.');
        });

        this.togglePlumesButton.addEventListener('click', () => {
            this.uiState.arePlumesVisible = !this.uiState.arePlumesVisible;
            // this.voxelWorld.plumes.forEach(plume => {
            //     plume.mesh.visible = this.uiState.arePlumesVisible;
            // });
        });

        this.toggleClimateButton.addEventListener('click', () => {
            this.uiState.isClimateVisible = !this.uiState.isClimateVisible;
        });

        this.powerModeSelector.addEventListener('change', (event) => {
            if (event.target.name === 'power-mode') {
                this.voxelWorld.setPowerMode(event.target.value);
            }
        });

        this.deployNetworkButton.addEventListener('click', () => {
            // const action = PlayerActions.deploy_network_infrastructure;
            // const region = this.selectedThreat ? this.voxelWorld.getRegionForThreat(this.selectedThreat) : null;
            // const context = { worldState: this.voxelWorld, playerFaction: this.voxelWorld.playerFaction, selectedThreat: this.selectedThreat, selectedRegion: region };
            // if (this.actionService.executeAction(action, context)) {
            //     // success
            // } else {
            //     alert(`Could not perform action: ${action.name}`);
            // }
            // this.updateRightPanelButtons();
        });

        this.weatherControlButton.addEventListener('click', () => {
            // const action = PlayerActions.weather_control;
            // const region = this.selectedThreat ? this.voxelWorld.getRegionForThreat(this.selectedThreat) : null;
            // const context = { worldState: this.voxelWorld, playerFaction: this.voxelWorld.playerFaction, selectedThreat: this.selectedThreat, selectedRegion: region };
            // if (this.actionService.executeAction(action, context)) {
            //     alert(`Weather control initiated in ${region.name}.`);
            // } else {
            //     alert(`Could not perform action: ${action.name}`);
            // }
            // this.updateRightPanelButtons();
        });

        this.launchSatelliteButton.addEventListener('click', () => {
            // const action = PlayerActions.launch_satellite;
            // const context = { worldState: this.voxelWorld, playerFaction: this.voxelWorld.playerFaction, selectedThreat: null, selectedRegion: null };
            // if (this.actionService.executeAction(action, context)) {
            //     alert('Satellite launched successfully!');
            // } else {
            //     alert('Failed to launch satellite. Check resources or limits.');
            // }
            // this.updateRightPanelButtons();
        });

        this.buildResearchOutpostButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER') {
            //         if (this.voxelWorld.addBuilding(region, 'RESEARCH_OUTPOST')) {
            //             this.buildPanel.style.display = 'none';
            //         } else {
            //             alert('Not enough resources to build a Research Outpost.');
            //         }
            //     }
            // }
        });

        this.buildSensorButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER') {
            //         this.voxelWorld.addBuilding(region, 'SENSOR');
            //         this.buildPanel.style.display = 'none';
            //     }
            // }
        });

        this.researchButton.addEventListener('click', () => {
            const isVisible = this.researchPanel.style.display === 'block';
            this.researchPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                // this.updateResearchPanel(); // Update when opening
            }
        });

        this.researchAdvancedAgentsButton.addEventListener('click', () => {
            // const cost = { tech: 2000 };
            // if (this.voxelWorld.playerFaction.canAfford(cost)) {
            //     this.voxelWorld.playerFaction.spend(cost);
            //     this.voxelWorld.research.advancedAgents = true;
            //     this.researchAdvancedAgentsButton.disabled = true;
            //     this.researchPanel.style.display = 'none';
            // } else {
            //     alert("Not enough tech to research Advanced Agents.");
            // }
        });

        this.researchMoonProgramButton.addEventListener('click', () => {
            // if (this.voxelWorld.startResearchProject('moon_program')) {
            //     this.researchMoonProgramButton.disabled = true;
            //     this.researchPanel.style.display = 'none';
            // } else {
            //     alert("Cannot start Moon Program. Is another project active or do you lack resources?");
            // }
        });

        this.researchSingularity1Button.addEventListener('click', () => {
            // if (this.voxelWorld.startResearchProject('singularity_1')) {
            //     this.researchSingularity1Button.disabled = true;
            //     this.researchPanel.style.display = 'none';
            // } else {
            //     alert("Cannot start Singularity Phase 1. Check resources and active projects.");
            // }
        });

        this.researchSingularity2Button.addEventListener('click', () => {
            // if (this.voxelWorld.startResearchProject('singularity_2')) {
            //     this.researchSingularity2Button.disabled = true;
            //     this.researchPanel.style.display = 'none';
            // } else {
            //     alert("Cannot start Singularity Phase 2. Check resources and active projects.");
            // }
        });

        this.researchSingularity3Button.addEventListener('click', () => {
            // if (this.voxelWorld.startResearchProject('singularity_3')) {
            //     this.researchSingularity3Button.disabled = true;
            //     this.researchPanel.style.display = 'none';
            // } else {
            //     alert("Cannot start Singularity Phase 3. Check resources and active projects.");
            // }
        });

        this.buildAgentButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER' && this.voxelWorld.buildings.some(b => b.region === region && b.type === 'BASE')) {
            //         if (this.voxelWorld.addUnit(region, 'AGENT')) {
            //             this.buildPanel.style.display = 'none';
            //         }
            //     } else {
            //         alert("You need a base in this region to build an agent.");
            //     }
            // } else {
            //     alert("You must select a region to build in.");
            // }
        });

        this.buildVehicleButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER' && this.voxelWorld.buildings.some(b => b.region === region && b.type === 'BASE')) {
            //         if (this.voxelWorld.addUnit(region, 'GROUND_VEHICLE')) {
            //             this.buildPanel.style.display = 'none';
            //         }
            //     } else {
            //         alert("You need a base in this region to build a vehicle.");
            //     }
            // } else {
            //     alert("You must select a region to build in.");
            // }
        });

        this.buildAircraftButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER' && this.voxelWorld.buildings.some(b => b.region === region && b.type === 'BASE')) {
            //         if (this.voxelWorld.addUnit(region, 'AIRCRAFT')) {
            //             this.buildPanel.style.display = 'none';
            //         }
            //     } else {
            //         alert("You need a base in this region to build an aircraft.");
            //     }
            // } else {
            //     alert("You must select a region to build in.");
            // }
        });

        this.buildSatelliteUnitButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER' && this.voxelWorld.buildings.some(b => b.region === region && b.type === 'BASE')) {
            //         if (this.voxelWorld.addUnit(region, 'SATELLITE')) {
            //             this.buildPanel.style.display = 'none';
            //         }
            //     } else {
            //         alert("You need a base in this region to build a satellite.");
            //     }
            // } else {
            //     alert("You must select a region to build in.");
            // }
        });

        this.buildButton.addEventListener('click', () => {
            const isVisible = this.buildPanel.style.display === 'block';
            this.buildPanel.style.display = isVisible ? 'none' : 'block';
        });

        this.buildBaseButton.addEventListener('click', () => {
            // if (this.selectedThreat) {
            //     const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
            //     if (region && region.owner === 'PLAYER') {
            //         this.voxelWorld.addBuilding(region, 'BASE');
            //         this.buildPanel.style.display = 'none';
            //     }
            // }
        });
    }

    update(deltaTime) {
        this.frames++;
        this.lastFPSTime += deltaTime;

        if (this.lastFPSTime >= 1.0) {
            this.currentFPS = Math.round(this.frames / this.lastFPSTime);
            this.fpsCounter.textContent = this.currentFPS;
            this.frames = 0;
            this.lastFPSTime = 0;
        }

        // this.updatePlayerPanel();
        // this.updateWeatherPanel();
        // this.updateNarrativeLog();
        // this.updateGoalsPanel();
        // this.updateResearchPanel();
        // this.updateAgentPanel();
    }

    setSelectedThreat(threat) {
        this.selectedThreat = threat;
        this.updateOnSelectionChange();
    }

    setSelectedUnit(unit) {
        this.selectedUnit = unit;
        this.updateOnSelectionChange();
    }

    clearSelection() {
        this.selectedThreat = null;
        this.selectedUnit = null;
        this.updateOnSelectionChange();
    }

    updateOnSelectionChange() {
        this.updateQuantumViewer();
        // this.updateThreatPanel();
        // this.updateWeatherPanel();
        // this.updateSelectionIndicator();
        // this.updateRightPanelButtons();
    }

    updateQuantumViewer() {
        if (this.selectedThreat && this.selectedThreat.domain === 'QUANTUM') {
            this.quantumViewer.panel.style.display = 'block';
            const qProps = this.selectedThreat.quantumProperties;
            if (qProps) {
                this.quantumViewer.entanglement.textContent =
                    qProps.entanglementLevel.toFixed(2);
                this.quantumViewer.coherence.textContent =
                    qProps.coherenceTime.toFixed(2);
            }
        } else {
            this.quantumViewer.panel.style.display = 'none';
        }
    }

    updateSelectionIndicator() {
        if (this.selectedThreat) {
            this.selectionIndicator.visible = true;
            this.selectionIndicator.position.copy(
                this.selectedThreat.mesh.position
            );
            this.selectionIndicator.quaternion.copy(
                this.selectedThreat.mesh.quaternion
            );
            const threatSize =
                this.selectedThreat.mesh.geometry.boundingSphere.radius *
                this.selectedThreat.mesh.scale.x;
            const indicatorScale = threatSize * 1.5;
            this.selectionIndicator.scale.set(
                indicatorScale,
                indicatorScale,
                indicatorScale
            );
        } else {
            this.selectionIndicator.visible = false;
        }
    }

    updateAgentPanel() {
        // const agents = this.voxelWorld.agents.filter(a => a.factionId === this.voxelWorld.playerFaction.id);
        // this.agentPanel.list.innerHTML = '';
        // if (agents.length === 0) {
        //     this.agentPanel.list.innerHTML = '<li>No active agents.</li>';
        //     return;
        // }
        // agents.forEach(agent => {
        //     const missionStatus = agent.mission ? `${agent.mission.type} (${(agent.mission.progress * 100).toFixed(0)}%)` : 'Idle';
        //     const li = document.createElement('li');
        //     li.style.marginBottom = '10px';
        //     const statusText = document.createElement('span');
        //     statusText.textContent = `Agent ${agent.id} (${agent.region.name}): ${missionStatus}`;
        //     li.appendChild(statusText);
        //     if (!agent.mission) {
        //         const buttonContainer = document.createElement('div');
        //         buttonContainer.style.marginTop = '5px';
        //         for (const actionId in AgentActions) {
        //             const action = AgentActions[actionId];
        //             if (action.isAvailable(agent)) {
        //                 const button = document.createElement('button');
        //                 button.textContent = action.name;
        //                 button.title = action.description;
        //                 button.style.fontSize = '10px';
        //                 button.style.padding = '2px 4px';
        //                 button.style.marginRight = '5px';
        //                 button.addEventListener('click', () => agent.startMission(action));
        //                 buttonContainer.appendChild(button);
        //             }
        //         }
        //         li.appendChild(buttonContainer);
        //     }
        //     this.agentPanel.list.appendChild(li);
        // });
    }

    updatePlayerPanel() {
        // if (this.voxelWorld.playerFaction) {
        //     const faction = this.voxelWorld.playerFaction;
        //     this.playerPanel.name.textContent = faction.name;
        //     this.playerPanel.funds.textContent = Math.floor(faction.resources.funds);
        //     this.playerPanel.intel.textContent = Math.floor(faction.resources.intel);
        //     this.playerPanel.tech.textContent = Math.floor(faction.resources.tech);
        // }
        // switch (this.voxelWorld.aiAlertLevel) {
        //     case 0: this.aiAlertDiv.textContent = 'AI Alert: LOW'; this.aiAlertDiv.style.color = 'green'; break;
        //     case 1: this.aiAlertDiv.textContent = 'AI Alert: MEDIUM'; this.aiAlertDiv.style.color = 'orange'; break;
        //     case 2: this.aiAlertDiv.textContent = 'AI Alert: HIGH'; this.aiAlertDiv.style.color = 'red'; break;
        // }
    }

    updateNarrativeLog() {
        // const chronicles = this.voxelWorld.narrativeManager.chronicles;
        // if (chronicles.length === this.lastChronicleCount) return;
        // this.narrativeLogPanel.innerHTML = '<h3>Narrative Log</h3>' + chronicles.map(c => `
        //     <div class="narrative-entry">
        //         <h4>${c.title}</h4>
        //         <p>${c.description}</p>
        //     </div>`).join('');
        // this.narrativeLogPanel.scrollTop = this.narrativeLogPanel.scrollHeight;
        // this.lastChronicleCount = chronicles.length;
    }

    updateGoalsPanel() {
        // const goalsState = this.voxelWorld.goalManager.getGoalsState();
        // this.goalsPanel.innerHTML = '<h3>Global Goals</h3>' + goalsState.map(goal => {
        //     const progressPercent = (goal.progress * 100).toFixed(0);
        //     return `
        //         <div class="goal-entry">
        //             <strong>${goal.title}</strong>
        //             <div class="goal-progress-bar">
        //                 <div class="goal-progress" style="width: ${progressPercent}%;">${progressPercent}%</div>
        //             </div>
        //         </div>`;
        // }).join('');
    }

    updateWeatherPanel() {
        // if (!this.selectedThreat || !this.selectedThreat.mesh) {
        //     this.weatherPanel.panel.style.display = 'none';
        //     return;
        // }
        // const { chunkCoord } = this.voxelWorld.worldToVoxel(this.selectedThreat.mesh.position.x, this.selectedThreat.mesh.position.y, this.selectedThreat.mesh.position.z);
        // const chunk = this.voxelWorld.getChunk(chunkCoord.x, chunkCoord.y, chunkCoord.z);
        // if (chunk && chunk.weather) {
        //     this.weatherPanel.panel.style.display = 'block';
        //     this.weatherPanel.type.textContent = chunk.weather.type;
        //     this.weatherPanel.windSpeed.textContent = chunk.weather.windSpeed.toFixed(1);
        //     this.weatherPanel.windDir.textContent = chunk.weather.windDirection.toFixed(0);
        // } else {
        //     this.weatherPanel.panel.style.display = 'none';
        // }
    }

    getRecommendedActionId(threat) {
        // if (!threat) return null;
        // if (threat.investigationProgress < 1.0) return 'investigate';
        // if (threat.type === 'REAL') return 'mitigate';
        return null;
    }

    updateThreatPanel() {
        // if (!this.selectedThreat) {
        //     this.threatInfoPanel.style.display = 'none';
        //     return;
        // }
        // const isInvestigated = this.selectedThreat.investigationProgress >= 1.0;
        // const typeDisplay = isInvestigated ? this.selectedThreat.type : 'UNKNOWN';
        // this.threatInfoPanel.style.display = 'block';
        // let infoHTML = `<h3>Threat Details</h3>...`; // Basic info rendering (omitted for brevity, no changes here)
        // this.threatInfoPanel.innerHTML = infoHTML + '<div id="action-buttons"></div>';
        // const actionButtonsContainer = document.getElementById('action-buttons');
        // const recommendedActionId = this.getRecommendedActionId(this.selectedThreat);
        // const region = this.voxelWorld.getRegionForThreat(this.selectedThreat);
        // for (const actionId in PlayerActions) {
        //     const action = PlayerActions[actionId];
        //     const context = { worldState: this.voxelWorld, playerFaction: this.voxelWorld.playerFaction, selectedThreat: this.selectedThreat, selectedRegion: region };
        //     if (action.targetType === 'THREAT' && this.actionService.isActionAvailable(action, context)) {
        //         const button = this.createActionButton(action, context, recommendedActionId === action.id);
        //         actionButtonsContainer.appendChild(button);
        //     }
        // }
    }

    createActionButton() {
        // const button = document.createElement('button');
        // button.id = `${action.id}-button`;
        // let costText = '';
        // if (action.resourceCost) {
        //     costText = Object.entries(action.resourceCost)
        //         .map(([key, value]) => `${value} ${key.charAt(0).toUpperCase() + key.slice(1)}`)
        //         .join(', ');
        // }
        // button.textContent = `${action.name}${costText ? ` (${costText})` : ''}`;
        // button.title = action.description;
        // if (isRecommended) {
        //     button.style.boxShadow = '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #00aaff, 0 0 40px #00aaff';
        //     button.style.borderColor = '#00aaff';
        // }
        // button.addEventListener('click', () => {
        //     const wasInvestigated = context.selectedThreat.investigationProgress >= 1.0;
        //     if (this.actionService.executeAction(action, context)) {
        //         if (action.id === 'investigate') {
        //             this.audioManager.playSound('investigate');
        //             const isNowInvestigated = context.selectedThreat.investigationProgress >= 1.0;
        //             if (!wasInvestigated && isNowInvestigated) {
        //                 this.audioManager.playSound('investigation_complete');
        //             }
        //         } else if (action.id === 'mitigate') {
        //             this.audioManager.playSound('mitigate');
        //         }
        //         this.updateThreatPanel();
        //     } else {
        //         alert(`Could not perform action: ${action.name}. Check resources or conditions.`);
        //     }
        // });
        // return button;
    }

    updateRightPanelButtons() {
        // const region = this.selectedThreat ? this.voxelWorld.getRegionForThreat(this.selectedThreat) : null;
        // const context = { worldState: this.voxelWorld, playerFaction: this.voxelWorld.playerFaction, selectedThreat: this.selectedThreat, selectedRegion: region };
        // this.cheatInvestigateButton.disabled = !this.selectedThreat;
        // this.cheatMitigateButton.disabled = !this.selectedThreat;
        // this.moveAgentButton.disabled = !this.selectedUnit;
        // this.claimRegionButton.disabled = !(region && region.owner === 'NEUTRAL');
        // this.buildButton.disabled = !(region && region.owner === 'PLAYER');
        // const networkAction = PlayerActions['deploy_network_infrastructure'];
        // this.deployNetworkButton.disabled = !this.actionService.isActionAvailable(networkAction, context);
        // const satelliteAction = PlayerActions['launch_satellite'];
        // this.launchSatelliteButton.disabled = !this.actionService.isActionAvailable(satelliteAction, context);
        // const weatherControlAction = PlayerActions['weather_control'];
        // this.weatherControlButton.disabled = !this.actionService.isActionAvailable(weatherControlAction, context);
    }

    updateResearchPanel() {
        // if (this.researchPanel.style.display !== 'block') return;
        // const research = this.voxelWorld.research;
        // const btn1 = this.researchSingularity1Button;
        // const btn2 = this.researchSingularity2Button;
        // const btn3 = this.researchSingularity3Button;
        // if (research.singularity_1_complete) {
        //     btn1.style.display = 'none';
        //     btn2.style.display = 'inline-block';
        // } else {
        //     btn2.style.display = 'none';
        // }
        // if (research.singularity_2_complete) {
        //     btn2.style.display = 'none';
        //     btn3.style.display = 'inline-block';
        // } else {
        //     btn3.style.display = 'none';
        // }
        // if (research.singularity_3_complete) {
        //     btn3.style.display = 'none';
        // }
    }

    showLocationInfo() {
        // const { chunkCoord, localCoord } = this.voxelWorld.voxelWorld.worldToVoxel(point.x, point.y, point.z);
        // const chunk = this.voxelWorld.voxelWorld.getChunk(chunkCoord.x, chunkCoord.y, chunkCoord.z);
        // if (chunk) {
        //     const materialId = chunk.getMaterial(Math.floor(localCoord.x), Math.floor(localCoord.y), Math.floor(localCoord.z));
        //     const { lat, lon } = this.voxelWorld.voxelWorld.vector3ToLatLon(point);
        //     const climateData = this.voxelWorld.climateGrid.getDataAt(lat, lon);
        //     this.locationInfoPanel.panel.style.display = 'block';
        //     this.locationInfoPanel.material.textContent = this.materialNames[materialId] || 'Unknown';
        //     this.locationInfoPanel.temp.textContent = climateData.temperature.toFixed(1);
        //     this.locationInfoPanel.moisture.textContent = climateData.moisture.toFixed(2);
        // }
    }

    hideLocationInfo() {
        this.locationInfoPanel.panel.style.display = 'none';
    }
}
