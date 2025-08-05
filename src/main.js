// Set up the scene, camera, and renderer
const audioManager = new AudioManager();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- AUDIO ---
// NOTE: Using placeholder URLs for audio assets.
// These should be replaced with actual URLs to desired sound files.
const sounds = {
    music: 'https://cdn.pixabay.com/audio/2022/11/22/audio_7333d45a97.mp3', // Stellar Sphere by JuliusH
    click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_28b1b9b81f.mp3', // UI Click by Pixabay
    investigate: 'https://cdn.pixabay.com/audio/2021/08/04/audio_5734a3108c.mp3', // Sci-fi Scan by Pixabay
    mitigate: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8db1f1b621.mp3', // Success by Pixabay
    investigation_complete: 'https://cdn.pixabay.com/audio/2022/08/18/audio_2c0d13a5db.mp3' // Level Up by Pixabay
};

async function loadAudio() {
    for (const [name, url] of Object.entries(sounds)) {
        await audioManager.loadSound(name, url);
    }
}
loadAudio();

// Start music on first user interaction
function startMusicOnFirstInteraction() {
    audioManager.playMusic('music');
    window.removeEventListener('click', startMusicOnFirstInteraction);
    window.removeEventListener('keydown', startMusicOnFirstInteraction);
}
window.addEventListener('click', startMusicOnFirstInteraction);
window.addEventListener('keydown', startMusicOnFirstInteraction);


// Add a light to the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 3, 5);
scene.add(light);

// --- SELECTION INDICATOR ---
const indicatorGeometry = new THREE.RingGeometry(1, 1.1, 32);
const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
});
const selectionIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
selectionIndicator.visible = false;
scene.add(selectionIndicator);


// Voxel world setup is now handled within the WorldState class


// Position the camera
camera.position.z = 150;

// UI State
const uiState = {
    arePlumesVisible: true,
    isClimateVisible: false, // Start with climate overlay off
};

// Instantiate the narrative manager
const narrativeManager = new NarrativeManager();

// Instantiate the world state
const casualModeCheckbox = document.getElementById('casual-mode-checkbox');
const worldState = new WorldState(scene, uiState, narrativeManager, casualModeCheckbox.checked);

casualModeCheckbox.addEventListener('change', () => {
    alert("Casual Mode setting will apply on next new game.");
});

// Instantiate the event manager
const eventManager = new EventManager(worldState);

// Instantiate the goal manager
const goalManager = new GoalManager(worldState);

// UI Controls
const togglePlumesButton = document.getElementById('toggle-plumes-button');
togglePlumesButton.addEventListener('click', () => {
    uiState.arePlumesVisible = !uiState.arePlumesVisible;
    worldState.plumes.forEach(plume => {
        plume.mesh.visible = uiState.arePlumesVisible;
    });
});

const toggleClimateButton = document.getElementById('toggle-climate-button');
toggleClimateButton.addEventListener('click', () => {
    uiState.isClimateVisible = !uiState.isClimateVisible;
});


// Add controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Raycasting for threat interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const threatInfoPanel = document.getElementById('threat-info');
let selectedThreat = null;
let selectedUnit = null;
let moveMode = false;

const weatherPanel = {
    panel: document.getElementById('weather-panel'),
    type: document.getElementById('weather-type'),
    windSpeed: document.getElementById('weather-wind-speed'),
    windDir: document.getElementById('weather-wind-dir'),
};

const playerPanel = {
    name: document.getElementById('faction-name'),
    funds: document.getElementById('funds-value'),
    intel: document.getElementById('intel-value'),
    tech: document.getElementById('tech-value'),
};

const agentPanel = {
    recruitButton: document.getElementById('recruit-agent-button'),
    list: document.getElementById('agent-list'),
};

const locationInfoPanel = {
    panel: document.getElementById('location-info-panel'),
    material: document.getElementById('location-material'),
    temp: document.getElementById('location-temp'),
    moisture: document.getElementById('location-moisture'),
};

const materialNames = {
    0: 'Air',
    1: 'Rock',
    2: 'Water',
    3: 'Ice',
    4: 'Sand',
    5: 'Grass'
};

function updateAgentPanel() {
    const agents = worldState.agents.filter(a => a.factionId === worldState.playerFaction.id);
    agentPanel.list.innerHTML = ''; // Clear existing list

    if (agents.length === 0) {
        agentPanel.list.innerHTML = '<li>No active agents.</li>';
        return;
    }

    agents.forEach(agent => {
        const missionStatus = agent.mission ? `${agent.mission.type} (${(agent.mission.progress * 100).toFixed(0)}%)` : 'Idle';
        const li = document.createElement('li');
        li.style.marginBottom = '10px';

        const statusText = document.createElement('span');
        statusText.textContent = `Agent ${agent.id} (${agent.region.name}): ${missionStatus}`;
        li.appendChild(statusText);

        if (!agent.mission) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '5px';

            for (const actionId in AgentActions) {
                const action = AgentActions[actionId];
                if (action.isAvailable(agent)) {
                    const button = document.createElement('button');
                    button.textContent = action.name;
                    button.title = action.description;
                    button.style.fontSize = '10px';
                    button.style.padding = '2px 4px';
                    button.style.marginRight = '5px';
                    button.addEventListener('click', () => {
                        // This was a bug, AgentActions don't have execute(). They are started on the agent.
                        agent.startMission(action);
                    });
                    buttonContainer.appendChild(button);
                }
            }
            li.appendChild(buttonContainer);
        }

        agentPanel.list.appendChild(li);
    });
}

agentPanel.recruitButton.addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER') {
            if (worldState.addAgent(region)) {
                // successfully added
            } else {
                alert("Not enough resources to recruit an agent.");
            }
        } else {
            alert("Select a player-controlled region to recruit an agent.");
        }
    } else {
        alert("Select a player-controlled region to recruit an agent.");
    }
});

function updatePlayerPanel() {
    if (worldState.playerFaction) {
        const faction = worldState.playerFaction;
        playerPanel.name.textContent = faction.name;
        playerPanel.funds.textContent = Math.floor(faction.resources.funds);
        playerPanel.intel.textContent = Math.floor(faction.resources.intel);
        playerPanel.tech.textContent = Math.floor(faction.resources.tech);
    }

    const aiAlertDiv = document.getElementById('ai-alert-level');
    switch (worldState.aiAlertLevel) {
        case 0:
            aiAlertDiv.textContent = 'AI Alert: LOW';
            aiAlertDiv.style.color = 'green';
            break;
        case 1:
            aiAlertDiv.textContent = 'AI Alert: MEDIUM';
            aiAlertDiv.style.color = 'orange';
            break;
        case 2:
            aiAlertDiv.textContent = 'AI Alert: HIGH';
            aiAlertDiv.style.color = 'red';
            break;
    }
}

function updateSelectionIndicator() {
    if (selectedThreat) {
        selectionIndicator.visible = true;
        selectionIndicator.position.copy(selectedThreat.mesh.position);
        selectionIndicator.quaternion.copy(selectedThreat.mesh.quaternion);

        // Scale the indicator to be slightly larger than the threat.
        // We use the bounding sphere of the geometry, scaled by the mesh's scale.
        const threatSize = selectedThreat.mesh.geometry.boundingSphere.radius * selectedThreat.mesh.scale.x;
        const indicatorScale = threatSize * 1.5; // 50% larger
        selectionIndicator.scale.set(indicatorScale, indicatorScale, indicatorScale);
    } else {
        selectionIndicator.visible = false;
    }
}

const narrativeLogPanel = document.getElementById('narrative-log');
let lastChronicleCount = 0;

function updateNarrativeLog() {
    const chronicles = narrativeManager.chronicles;
    if (chronicles.length === lastChronicleCount) {
        return; // No update needed
    }

    let logHTML = '<h3>Narrative Log</h3>';
    chronicles.forEach(chronicle => {
        logHTML += `
            <div class="narrative-entry">
                <h4>${chronicle.title}</h4>
                <p>${chronicle.description}</p>
            </div>
        `;
    });

    narrativeLogPanel.innerHTML = logHTML;
    narrativeLogPanel.scrollTop = narrativeLogPanel.scrollHeight; // Auto-scroll to bottom
    lastChronicleCount = chronicles.length;
}

const goalsPanel = document.getElementById('goals-panel');
function updateGoalsPanel() {
    const goalsState = goalManager.getGoalsState();
    let goalsHTML = '<h3>Global Goals</h3>';
    goalsState.forEach(goal => {
        const progressPercent = (goal.progress * 100).toFixed(0);
        goalsHTML += `
            <div class="goal-entry">
                <strong>${goal.title}</strong>
                <div class="goal-progress-bar">
                    <div class="goal-progress" style="width: ${progressPercent}%;">${progressPercent}%</div>
                </div>
            </div>
        `;
    });
    goalsPanel.innerHTML = goalsHTML;
}

function updateWeatherPanel() {
    if (!selectedThreat || !selectedThreat.mesh) {
        weatherPanel.panel.style.display = 'none';
        return;
    }

    // Get the chunk at the threat's position
    const threatPosition = selectedThreat.mesh.position;
    const { chunkCoord } = worldState.voxelWorld.worldToVoxel(threatPosition.x, threatPosition.y, threatPosition.z);
    const chunk = worldState.voxelWorld.getChunk(chunkCoord.x, chunkCoord.y, chunkCoord.z);

    if (chunk && chunk.weather) {
        weatherPanel.panel.style.display = 'block';
        weatherPanel.type.textContent = chunk.weather.type;
        weatherPanel.windSpeed.textContent = chunk.weather.windSpeed.toFixed(1);
        weatherPanel.windDir.textContent = chunk.weather.windDirection.toFixed(0);
    } else {
        weatherPanel.panel.style.display = 'none';
    }
}

function getRecommendedAction(threat) {
    if (!threat) return null;
    if (threat.investigationProgress < 1.0) {
        return 'investigate';
    }
    if (threat.type === 'REAL') {
        return 'mitigate';
    }
    return null;
}

function updateThreatPanel() {
    if (!selectedThreat) {
        threatInfoPanel.style.display = 'none';
        return;
    }

    const threat = selectedThreat;
    const isInvestigated = threat.investigationProgress >= 1.0;
    const typeDisplay = isInvestigated ? threat.type : 'UNKNOWN';

    threatInfoPanel.style.display = 'block';

    // --- Render Threat Info ---
    let infoHTML = `
        <h3>Threat Details</h3>
        <p><strong>ID:</strong> ${threat.id}</p>
        <p><strong>Domain:</strong> ${threat.domain} ${threat.subType ? `(${threat.subType})` : ''}</p>
        <p><strong>Type:</strong> ${typeDisplay}</p>
        <p><strong>Severity:</strong> ${threat.severity.toFixed(2)}</p>
        <p><strong>Location:</strong> ${threat.lat.toFixed(2)}, ${threat.lon.toFixed(2)}</p>
        <p><strong>Visibility:</strong> ${(threat.visibility * 100).toFixed(0)}%</p>
        <p><strong>Investigation:</strong> ${(threat.investigationProgress * 100).toFixed(0)}%</p>
    `;

    if (isInvestigated) {
        let domainDetails = '<h4>Domain-Specifics</h4>';
        let hasDetails = false;
        if (threat.domain === 'QUANTUM' && threat.quantumProperties) {
            const qp = threat.quantumProperties;
            if (qp.coherenceTime !== undefined) {
                const coherenceStatus = qp.coherenceTime < 0 ? 'Collapsed' : qp.coherenceTime.toFixed(2);
                domainDetails += `<p><strong>Coherence Time:</strong> ${coherenceStatus}</p>`;
                hasDetails = true;
            }
        }
        if (threat.domain === 'ROBOT' && threat.roboticProperties) {
            const rp = threat.roboticProperties;
            domainDetails += `<p><strong>Collective Intel:</strong> ${(rp.collectiveIntelligence || 0).toFixed(2)}</p>`;
            if (rp.emergentBehaviors && rp.emergentBehaviors.length > 0) {
                domainDetails += `<p><strong>Behaviors:</strong> ${rp.emergentBehaviors.join(', ')}</p>`;
            }
            hasDetails = true;
        }
        if (threat.domain === 'SPACE' && threat.spaceProperties) {
            const sp = threat.spaceProperties;
            if (sp.altitude !== undefined) {
                domainDetails += `<p><strong>Altitude:</strong> ${sp.altitude.toFixed(2)} km</p>`;
                hasDetails = true;
            }
        }
        if (threat.domain === 'INFO' && threat.informationProperties) {
            const ip = threat.informationProperties;
            if (threat.spreadRate !== undefined) {
                domainDetails += `<p><strong>Spread Rate:</strong> ${threat.spreadRate.toFixed(2)}</p>`;
                hasDetails = true;
            }
        }
        if (hasDetails) {
            infoHTML += domainDetails;
        }
    }

    threatInfoPanel.innerHTML = infoHTML + '<div id="action-buttons"></div>';
    const actionButtonsContainer = document.getElementById('action-buttons');

    // --- Dynamically Generate Action Buttons ---
    const recommendedActionId = getRecommendedAction(threat);
    const region = worldState.getRegionForThreat(threat); // Get the region for context
    for (const actionId in PlayerActions) {
        const action = PlayerActions[actionId];
        // Pass the region to isAvailable
        if (action.isAvailable(threat, worldState, region)) {
            const button = document.createElement('button');
            button.id = `${action.id}-button`;

            let costText = '';
            if (action.resourceCost) {
                costText = Object.entries(action.resourceCost)
                               .map(([key, value]) => `${value} ${key.charAt(0).toUpperCase() + key.slice(1)}`)
                               .join(', ');
            }
            button.textContent = `${action.name}${costText ? ` (${costText})` : ''}`;
            button.title = action.description;

            if (action.id === recommendedActionId) {
                button.style.boxShadow = '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #00aaff, 0 0 40px #00aaff';
                button.style.borderColor = '#00aaff';
            }

            button.addEventListener('click', () => {
                // Store investigation status before executing action
                const wasInvestigated = threat.investigationProgress >= 1.0;

                // Pass the region to execute
                if (action.execute(threat, worldState.playerFaction, worldState, region)) {
                    // Play sound based on action type
                    if (action.id === 'investigate') {
                        audioManager.playSound('investigate');
                        const isNowInvestigated = threat.investigationProgress >= 1.0;
                        if (!wasInvestigated && isNowInvestigated) {
                            audioManager.playSound('investigation_complete');
                        }
                    } else if (action.id === 'mitigate') {
                        audioManager.playSound('mitigate');
                    }

                    // The threat might be removed or its state changed, so re-render the panel
                    // If the threat is removed, selectedThreat will become null, hiding the panel
                    updateThreatPanel();
                } else {
                    // Provide feedback for failed actions (e.g., not enough resources)
                    alert(`Could not perform action: ${action.name}. Check resources.`);
                }
            });
            actionButtonsContainer.appendChild(button);
        }
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const chunkMeshes = [...worldState.voxelWorld.chunks.values()].map(c => c.mesh).filter(m => m);

    // --- Agent Movement ---
    if (moveMode && selectedUnit) {
        const intersects = raycaster.intersectObjects(chunkMeshes);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // TODO: Implement agent movement to a specific point.
            // For now, we just log it. The old logic was tied to regions.
            console.log(`Agent ${selectedUnit.id} move command to:`, point);
        }
        moveMode = false;
        document.getElementById('move-agent-button').textContent = 'Move Agent';
        return;
    }

    // --- Threat/Unit Selection ---
    const allThreats = worldState.getThreats();
    const threatMeshes = allThreats.map(t => t.mesh);
    const allUnits = worldState.units;
    const unitMeshes = allUnits.map(u => u.mesh);
    const intersects = raycaster.intersectObjects([...threatMeshes, ...unitMeshes]);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        audioManager.playSound('click');

        // Hide location panel when selecting a threat/unit
        locationInfoPanel.panel.style.display = 'none';

        const newlySelectedThreat = allThreats.find(t => t.mesh === intersectedMesh);
        const newlySelectedUnit = allUnits.find(u => u.mesh === intersectedMesh);

        if (newlySelectedThreat) {
            selectedThreat = newlySelectedThreat;
            selectedUnit = null;
            updateThreatPanel();
            updateWeatherPanel();
            updateSelectionIndicator();
            document.getElementById('cheat-investigate-threat').disabled = false;
            document.getElementById('cheat-mitigate-threat').disabled = false;
            document.getElementById('move-agent-button').disabled = true;

            const region = worldState.getRegionForThreat(selectedThreat);
            const claimButton = document.getElementById('claim-region-button');
            const buildButton = document.getElementById('build-button');
            const networkButton = document.getElementById('deploy-network-button');
            if (region && region.owner === 'NEUTRAL') {
                claimButton.disabled = false;
                buildButton.disabled = true;
                networkButton.disabled = true; // Can't deploy in neutral region
            } else if (region && region.owner === 'PLAYER') {
                claimButton.disabled = true;
                buildButton.disabled = false;
                networkButton.disabled = !PlayerActions.deploy_network_infrastructure.isAvailable(null, worldState, region);
            } else {
                claimButton.disabled = true;
                buildButton.disabled = true;
                networkButton.disabled = true;
            }
        } else if (newlySelectedUnit) {
            selectedUnit = newlySelectedUnit;
            selectedThreat = null;
            updateThreatPanel();
            updateWeatherPanel();
            updateSelectionIndicator();
            document.getElementById('cheat-investigate-threat').disabled = true;
            document.getElementById('cheat-mitigate-threat').disabled = true;
            document.getElementById('claim-region-button').disabled = true;
            document.getElementById('deploy-network-button').disabled = true;
            document.getElementById('build-button').disabled = true;
            document.getElementById('move-agent-button').disabled = false;
        }
    } else {
        // --- Planet Interaction & Deselection ---
        // Deselect any active threat/unit first
        selectedThreat = null;
        selectedUnit = null;
        updateThreatPanel();
        updateWeatherPanel();
        updateSelectionIndicator();
        document.getElementById('cheat-investigate-threat').disabled = true;
        document.getElementById('cheat-mitigate-threat').disabled = true;
        document.getElementById('claim-region-button').disabled = true;
        document.getElementById('deploy-network-button').disabled = true;
        document.getElementById('build-button').disabled = true;
        document.getElementById('move-agent-button').disabled = true;

        const planetIntersects = raycaster.intersectObjects(chunkMeshes);
        if (planetIntersects.length > 0) {
             const intersection = planetIntersects[0];
             const point = intersection.point;

             // Get voxel data
             const { chunkCoord, localCoord } = worldState.voxelWorld.worldToVoxel(point.x, point.y, point.z);
             const chunk = worldState.voxelWorld.getChunk(chunkCoord.x, chunkCoord.y, chunkCoord.z);
             if (chunk) {
                 const materialId = chunk.getMaterial(
                     Math.floor(localCoord.x),
                     Math.floor(localCoord.y),
                     Math.floor(localCoord.z)
                 );
                 const materialName = materialNames[materialId] || 'Unknown';

                 // Get climate data
                 const { lat, lon } = worldState.voxelWorld.vector3ToLatLon(point);
                 const climateData = worldState.climateGrid.getDataAt(lat, lon);

                 // Update and show panel
                 locationInfoPanel.panel.style.display = 'block';
                 locationInfoPanel.material.textContent = materialName;
                 locationInfoPanel.temp.textContent = climateData.temperature.toFixed(1);
                 locationInfoPanel.moisture.textContent = climateData.moisture.toFixed(2);
             }
        } else {
            // If we clicked on empty space, hide the location panel
            locationInfoPanel.panel.style.display = 'none';
        }
    }
}

window.addEventListener('click', onMouseClick, false);

let isCameraAnimating = false;
let cameraTargetPosition = new THREE.Vector3();
let controlsTargetLookAt = new THREE.Vector3();

function onMouseDoubleClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const allThreats = worldState.getThreats();
    const threatMeshes = allThreats.map(t => t.mesh);
    const intersects = raycaster.intersectObjects(threatMeshes);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;

        // The target for the controls is the threat's position
        controlsTargetLookAt.copy(intersectedMesh.position);

        // The target for the camera is a point offset from the threat
        // We want to be looking at the threat from a bit further away
        const offset = camera.position.clone().sub(intersectedMesh.position).normalize().multiplyScalar(5);
        cameraTargetPosition.copy(intersectedMesh.position).add(offset);

        // A better camera position calculation
        const direction = intersectedMesh.position.clone().normalize();
        const distance = camera.position.length(); // Maintain current camera distance
        cameraTargetPosition.copy(direction.multiplyScalar(distance));


        isCameraAnimating = true;
        // Disable damping during animation for a smoother feel
        controls.enableDamping = false;
    }
}
window.addEventListener('dblclick', onMouseDoubleClick, false);

// --- KEYBOARD CONTROLS ---
const keyStates = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keyStates.hasOwnProperty(key)) {
        keyStates[key] = true;
    }
});
window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keyStates.hasOwnProperty(key)) {
        keyStates[key] = false;
    }
});

document.getElementById('launch-satellite-button').addEventListener('click', () => {
    const action = PlayerActions.launch_satellite;
    if (action.isAvailable(null, worldState)) {
        if (worldState.launchSatellite(worldState.playerFaction)) {
            alert('Satellite launched successfully!');
            // Disable button if max satellites reached
            document.getElementById('launch-satellite-button').disabled = !action.isAvailable(null, worldState);
        } else {
            alert('Failed to launch satellite. Not enough resources.');
        }
    } else {
        alert('Cannot launch more satellites.');
    }
});

let currentThreatIndex = -1;

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'c') {
        const isVisible = cheatPanel.style.display === 'block';
        cheatPanel.style.display = isVisible ? 'none' : 'block';
    } else if (key === 'p') {
        gameSpeed = gameSpeed > 0 ? 0 : 1;
        document.getElementById('cheat-game-speed').value = gameSpeed;
        document.getElementById('game-speed-value').textContent = `${gameSpeed.toFixed(1)}x`;
    } else if (key === 't') {
        const threats = worldState.getThreats();
        if (threats.length > 0) {
            currentThreatIndex = (currentThreatIndex + 1) % threats.length;
            selectedThreat = threats[currentThreatIndex];
            updateThreatPanel();
            updateWeatherPanel();
            updateSelectionIndicator();
        }
    }
});

document.getElementById('build-research-outpost-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER') {
            if (worldState.addBuilding(region, 'RESEARCH_OUTPOST')) {
                buildPanel.style.display = 'none';
            } else {
                alert('Not enough resources to build a Research Outpost.');
            }
        }
    }
});

document.getElementById('deploy-network-button').addEventListener('click', () => {
    if (selectedThreat) { // A threat must be selected to identify the region
        const region = worldState.getRegionForThreat(selectedThreat);
        const action = PlayerActions.deploy_network_infrastructure;
        if (region && action.isAvailable(null, worldState, region)) {
            if (region.deployNetworkInfrastructure(worldState.playerFaction)) {
                // Action was successful, button might need to be disabled if access is now 1.0
                document.getElementById('deploy-network-button').disabled = !action.isAvailable(null, worldState, region);
            }
        }
    }
});

document.getElementById('build-sensor-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER') {
            worldState.addBuilding(region, 'SENSOR');
            buildPanel.style.display = 'none';
        }
    }
});

document.getElementById('move-agent-button').addEventListener('click', () => {
    if (selectedUnit) {
        moveMode = true;
        document.getElementById('move-agent-button').textContent = 'Select Target Region...';
    }
});

const researchPanel = document.getElementById('research-panel');

function updateResearchPanel() {
    if (researchPanel.style.display !== 'block') return;

    const research = worldState.research;

    // Handle Singularity buttons
    const btn1 = document.getElementById('research-singularity-1-button');
    const btn2 = document.getElementById('research-singularity-2-button');
    const btn3 = document.getElementById('research-singularity-3-button');

    if (research.singularity_1_complete) {
        btn1.style.display = 'none';
        btn2.style.display = 'inline-block';
    } else {
        btn2.style.display = 'none';
    }

    if (research.singularity_2_complete) {
        btn2.style.display = 'none';
        btn3.style.display = 'inline-block';
    } else {
        btn3.style.display = 'none';
    }

    if (research.singularity_3_complete) {
        btn3.style.display = 'none';
    }
}

document.getElementById('research-button').addEventListener('click', () => {
    const isVisible = researchPanel.style.display === 'block';
    researchPanel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        updateResearchPanel(); // Update when opening
    }
});

document.getElementById('research-advanced-agents-button').addEventListener('click', () => {
    const cost = { tech: 2000 };
    if (worldState.playerFaction.canAfford(cost)) {
        worldState.playerFaction.spend(cost);
        worldState.research.advancedAgents = true;
        document.getElementById('research-advanced-agents-button').disabled = true;
        researchPanel.style.display = 'none';
    } else {
        alert("Not enough tech to research Advanced Agents.");
    }
});

document.getElementById('research-moon-program-button').addEventListener('click', () => {
    if (worldState.startResearchProject('moon_program')) {
        document.getElementById('research-moon-program-button').disabled = true;
        researchPanel.style.display = 'none';
    } else {
        alert("Cannot start Moon Program. Is another project active or do you lack resources?");
    }
});

document.getElementById('research-singularity-1-button').addEventListener('click', () => {
    if (worldState.startResearchProject('singularity_1')) {
        document.getElementById('research-singularity-1-button').disabled = true;
        researchPanel.style.display = 'none';
    } else {
        alert("Cannot start Singularity Phase 1. Check resources and active projects.");
    }
});

document.getElementById('research-singularity-2-button').addEventListener('click', () => {
    if (worldState.startResearchProject('singularity_2')) {
        document.getElementById('research-singularity-2-button').disabled = true;
        researchPanel.style.display = 'none';
    } else {
        alert("Cannot start Singularity Phase 2. Check resources and active projects.");
    }
});

document.getElementById('research-singularity-3-button').addEventListener('click', () => {
    if (worldState.startResearchProject('singularity_3')) {
        document.getElementById('research-singularity-3-button').disabled = true;
        researchPanel.style.display = 'none';
    } else {
        alert("Cannot start Singularity Phase 3. Check resources and active projects.");
    }
});

document.getElementById('build-agent-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER' && worldState.buildings.some(b => b.region === region && b.type === 'BASE')) {
            worldState.addUnit(region, 'AGENT');
            buildPanel.style.display = 'none';
        } else {
            alert("You need a base in this region to build an agent.");
        }
    }
});

const buildPanel = document.getElementById('build-panel');
document.getElementById('build-button').addEventListener('click', () => {
    const isVisible = buildPanel.style.display === 'block';
    buildPanel.style.display = isVisible ? 'none' : 'block';
});

document.getElementById('build-base-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER') {
            worldState.addBuilding(region, 'BASE');
            buildPanel.style.display = 'none';
        }
    }
});

// --- CHEAT PANEL ---
const cheatPanel = document.getElementById('cheat-panel');
const toggleCheatPanelButton = document.getElementById('toggle-cheat-panel');
const cheatThreatDomainSelect = document.getElementById('cheat-threat-domain');
const cheatThreatTypeSelect = document.getElementById('cheat-threat-type');

// Populate cheat menu dropdowns
const allThreatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
allThreatDomains.forEach(domain => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    cheatThreatDomainSelect.appendChild(option);
});

const allThreatTypes = ["REAL", "FAKE", "UNKNOWN"];
allThreatTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    cheatThreatTypeSelect.appendChild(option);
});


toggleCheatPanelButton.addEventListener('click', () => {
    const isVisible = cheatPanel.style.display === 'block';
    cheatPanel.style.display = isVisible ? 'none' : 'block';
});

// Cheat functionality
document.getElementById('cheat-add-funds').addEventListener('click', () => {
    worldState.playerFaction.resources.funds += 1000;
    updatePlayerPanel();
});

document.getElementById('cheat-add-intel').addEventListener('click', () => {
    worldState.playerFaction.resources.intel += 1000;
    updatePlayerPanel();
});

document.getElementById('cheat-add-tech').addEventListener('click', () => {
    worldState.playerFaction.resources.tech += 1000;
    updatePlayerPanel();
});

document.getElementById('cheat-create-threat').addEventListener('click', () => {
    const domain = cheatThreatDomainSelect.value;
    const type = cheatThreatTypeSelect.value;
    const severity = parseFloat(document.getElementById('cheat-threat-severity').value);
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;

    worldState.generateThreat({
        domain,
        type,
        severity,
        lat,
        lon
    });
});

document.getElementById('cheat-investigate-threat').addEventListener('click', () => {
    if (selectedThreat) {
        selectedThreat.investigate(worldState.playerFaction, true);
        updateThreatPanel();
    }
});

document.getElementById('claim-region-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'NEUTRAL') {
            region.setOwner('PLAYER');
            document.getElementById('claim-region-button').disabled = true;
        }
    }
});

document.getElementById('cheat-mitigate-threat').addEventListener('click', () => {
    if (selectedThreat) {
        selectedThreat.mitigate(worldState.playerFaction, true);
        updateThreatPanel();
    }
});

// Game loop
const clock = new THREE.Clock();
let gameSpeed = 1; // Initial game speed

document.getElementById('cheat-game-speed').addEventListener('input', (event) => {
    gameSpeed = parseFloat(event.target.value);
    document.getElementById('game-speed-value').textContent = `${gameSpeed.toFixed(1)}x`;
});


function handleKeyboardCameraControls(dt) {
    const panSpeed = 2.0; // Radians per second
    const moveSpeed = panSpeed * dt;

    // Pan left/right (around world Y-axis)
    if (keyStates.a || keyStates.d) {
        const panAngle = (keyStates.a ? 1 : -1) * moveSpeed;
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), panAngle);
    }

    // Pan up/down (around camera's local right-axis)
    if (keyStates.w || keyStates.s) {
        // Calculate the camera's right vector
        const right = new THREE.Vector3().crossVectors(camera.position, new THREE.Vector3(0, 1, 0)).normalize();
        const panAngle = (keyStates.s ? 1 : -1) * moveSpeed;
        camera.position.applyAxisAngle(right, panAngle);
    }
}

// Post-processing
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 0.5;
bloomPass.radius = 0;
composer.addPass(bloomPass);

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta() * gameSpeed;

    // Handle user input
    handleKeyboardCameraControls(deltaTime);

    // Update game state
    worldState.update(deltaTime);
    eventManager.update(deltaTime);
    goalManager.update(deltaTime);

    // Update UI Panels
    updatePlayerPanel();
    updateWeatherPanel();
    updateNarrativeLog();
    updateGoalsPanel();
    updateResearchPanel();
    updateAgentPanel();

    // Animate camera if needed
    if (isCameraAnimating) {
        const alpha = 0.05;
        camera.position.lerp(cameraTargetPosition, alpha);
        controls.target.lerp(controlsTargetLookAt, alpha);

        // Stop animation when close enough
        if (camera.position.distanceTo(cameraTargetPosition) < 0.01) {
            isCameraAnimating = false;
            camera.position.copy(cameraTargetPosition);
            controls.target.copy(controlsTargetLookAt);
            controls.enableDamping = true; // Re-enable damping
        }
    }

    // Update controls
    controls.update();

    // Render the scene
    composer.render();

    TWEEN.update();
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
