// Set up the scene, camera, and renderer
const audioManager = new AudioManager();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Game Services ---
const actionService = new ActionService();

// --- AUDIO ---
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

// Position the camera
camera.position.z = 150;

// UI State
const uiState = {
    arePlumesVisible: true,
    isClimateVisible: false,
};

// Instantiate managers and game state
const narrativeManager = new NarrativeManager();
const casualModeCheckbox = document.getElementById('casual-mode-checkbox');
const worldState = new WorldState(scene, uiState, narrativeManager, casualModeCheckbox.checked);

casualModeCheckbox.addEventListener('change', () => {
    alert("Casual Mode setting will apply on next new game.");
});

const eventManager = new EventManager(worldState);
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

// Add camera controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Raycasting for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedThreat = null;
let selectedUnit = null;
let moveMode = false;

// --- UI Panel References ---
const threatInfoPanel = document.getElementById('threat-info');
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
const materialNames = { 0: 'Air', 1: 'Rock', 2: 'Water', 3: 'Ice', 4: 'Sand', 5: 'Grass' };

// --- UI Update Functions ---

function updateAgentPanel() {
    const agents = worldState.agents.filter(a => a.factionId === worldState.playerFaction.id);
    agentPanel.list.innerHTML = '';
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
                    button.addEventListener('click', () => agent.startMission(action));
                    buttonContainer.appendChild(button);
                }
            }
            li.appendChild(buttonContainer);
        }
        agentPanel.list.appendChild(li);
    });
}

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
        case 0: aiAlertDiv.textContent = 'AI Alert: LOW'; aiAlertDiv.style.color = 'green'; break;
        case 1: aiAlertDiv.textContent = 'AI Alert: MEDIUM'; aiAlertDiv.style.color = 'orange'; break;
        case 2: aiAlertDiv.textContent = 'AI Alert: HIGH'; aiAlertDiv.style.color = 'red'; break;
    }
}

function updateSelectionIndicator() {
    if (selectedThreat) {
        selectionIndicator.visible = true;
        selectionIndicator.position.copy(selectedThreat.mesh.position);
        selectionIndicator.quaternion.copy(selectedThreat.mesh.quaternion);
        const threatSize = selectedThreat.mesh.geometry.boundingSphere.radius * selectedThreat.mesh.scale.x;
        const indicatorScale = threatSize * 1.5;
        selectionIndicator.scale.set(indicatorScale, indicatorScale, indicatorScale);
    } else {
        selectionIndicator.visible = false;
    }
}

const narrativeLogPanel = document.getElementById('narrative-log');
let lastChronicleCount = 0;
function updateNarrativeLog() {
    const chronicles = narrativeManager.chronicles;
    if (chronicles.length === lastChronicleCount) return;
    narrativeLogPanel.innerHTML = '<h3>Narrative Log</h3>' + chronicles.map(c => `
        <div class="narrative-entry">
            <h4>${c.title}</h4>
            <p>${c.description}</p>
        </div>`).join('');
    narrativeLogPanel.scrollTop = narrativeLogPanel.scrollHeight;
    lastChronicleCount = chronicles.length;
}

const goalsPanel = document.getElementById('goals-panel');
function updateGoalsPanel() {
    const goalsState = goalManager.getGoalsState();
    goalsPanel.innerHTML = '<h3>Global Goals</h3>' + goalsState.map(goal => {
        const progressPercent = (goal.progress * 100).toFixed(0);
        return `
            <div class="goal-entry">
                <strong>${goal.title}</strong>
                <div class="goal-progress-bar">
                    <div class="goal-progress" style="width: ${progressPercent}%;">${progressPercent}%</div>
                </div>
            </div>`;
    }).join('');
}

function updateWeatherPanel() {
    if (!selectedThreat || !selectedThreat.mesh) {
        weatherPanel.panel.style.display = 'none';
        return;
    }
    const { chunkCoord } = worldState.voxelWorld.worldToVoxel(selectedThreat.mesh.position.x, selectedThreat.mesh.position.y, selectedThreat.mesh.position.z);
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

function getRecommendedActionId(threat) {
    if (!threat) return null;
    if (threat.investigationProgress < 1.0) return 'investigate';
    if (threat.type === 'REAL') return 'mitigate';
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

    let infoHTML = `<h3>Threat Details</h3>...`; // Basic info rendering (omitted for brevity, no changes here)
    threatInfoPanel.innerHTML = infoHTML + '<div id="action-buttons"></div>';
    const actionButtonsContainer = document.getElementById('action-buttons');
    const recommendedActionId = getRecommendedActionId(threat);
    const region = worldState.getRegionForThreat(threat);

    // *** REFACTORED ACTION BUTTON LOGIC ***
    for (const actionId in PlayerActions) {
        const action = PlayerActions[actionId];
        const context = { worldState, playerFaction: worldState.playerFaction, selectedThreat, selectedRegion: region };

        if (action.targetType === 'THREAT' && actionService.isActionAvailable(action, context)) {
            const button = createActionButton(action, context, recommendedActionId === action.id);
            actionButtonsContainer.appendChild(button);
        }
    }
}

function createActionButton(action, context, isRecommended) {
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
    if (isRecommended) {
        button.style.boxShadow = '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #00aaff, 0 0 40px #00aaff';
        button.style.borderColor = '#00aaff';
    }
    button.addEventListener('click', () => {
        const wasInvestigated = context.selectedThreat.investigationProgress >= 1.0;
        if (actionService.executeAction(action, context)) {
            // Play sound based on action type
            if (action.id === 'investigate') {
                audioManager.playSound('investigate');
                const isNowInvestigated = context.selectedThreat.investigationProgress >= 1.0;
                if (!wasInvestigated && isNowInvestigated) {
                    audioManager.playSound('investigation_complete');
                }
            } else if (action.id === 'mitigate') {
                audioManager.playSound('mitigate');
            }
            updateThreatPanel(); // Re-render the panel
        } else {
            alert(`Could not perform action: ${action.name}. Check resources or conditions.`);
        }
    });
    return button;
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
            selectedUnit.moveTo(intersects[0].point);
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
        locationInfoPanel.panel.style.display = 'none';

        const newlySelectedThreat = allThreats.find(t => t.mesh === intersectedMesh);
        const newlySelectedAgent = worldState.agents.find(a => a.mesh === intersectedMesh);
        const newlySelectedUnit = allUnits.find(u => u.mesh === intersectedMesh && u.mesh.userData.unit);

        selectedThreat = newlySelectedThreat || null;
        selectedUnit = newlySelectedAgent || newlySelectedUnit || null;

        updateThreatPanel();
        updateWeatherPanel();
        updateSelectionIndicator();
        updateRightPanelButtons();

    } else {
        // --- Planet Interaction & Deselection ---
        selectedThreat = null;
        selectedUnit = null;
        updateThreatPanel();
        updateWeatherPanel();
        updateSelectionIndicator();
        updateRightPanelButtons();

        const planetIntersects = raycaster.intersectObjects(chunkMeshes);
        if (planetIntersects.length > 0) {
            const point = planetIntersects[0].point;
            const { chunkCoord, localCoord } = worldState.voxelWorld.worldToVoxel(point.x, point.y, point.z);
            const chunk = worldState.voxelWorld.getChunk(chunkCoord.x, chunkCoord.y, chunkCoord.z);
            if (chunk) {
                const materialId = chunk.getMaterial(Math.floor(localCoord.x), Math.floor(localCoord.y), Math.floor(localCoord.z));
                const { lat, lon } = worldState.voxelWorld.vector3ToLatLon(point);
                const climateData = worldState.climateGrid.getDataAt(lat, lon);
                locationInfoPanel.panel.style.display = 'block';
                locationInfoPanel.material.textContent = materialNames[materialId] || 'Unknown';
                locationInfoPanel.temp.textContent = climateData.temperature.toFixed(1);
                locationInfoPanel.moisture.textContent = climateData.moisture.toFixed(2);
            }
        } else {
            locationInfoPanel.panel.style.display = 'none';
        }
    }
}

function updateRightPanelButtons() {
    const region = selectedThreat ? worldState.getRegionForThreat(selectedThreat) : null;
    const context = { worldState, playerFaction: worldState.playerFaction, selectedThreat, selectedRegion: region };

    document.getElementById('cheat-investigate-threat').disabled = !selectedThreat;
    document.getElementById('cheat-mitigate-threat').disabled = !selectedThreat;
    document.getElementById('move-agent-button').disabled = !selectedUnit;

    const claimButton = document.getElementById('claim-region-button');
    claimButton.disabled = !(region && region.owner === 'NEUTRAL');

    const buildButton = document.getElementById('build-button');
    buildButton.disabled = !(region && region.owner === 'PLAYER');

    const networkAction = PlayerActions['deploy_network_infrastructure'];
    const networkButton = document.getElementById('deploy-network-button');
    networkButton.disabled = !actionService.isActionAvailable(networkAction, context);

    const satelliteAction = PlayerActions['launch_satellite'];
    const satelliteButton = document.getElementById('launch-satellite-button');
    satelliteButton.disabled = !actionService.isActionAvailable(satelliteAction, context);
}


window.addEventListener('click', onMouseClick, false);

let isCameraAnimating = false;
let cameraTargetPosition = new THREE.Vector3();
let controlsTargetLookAt = new THREE.Vector3();

function onMouseDoubleClick(event) {
    // ... double click logic remains the same ...
}
window.addEventListener('dblclick', onMouseDoubleClick, false);

// --- KEYBOARD CONTROLS ---
// ... keyboard logic remains the same ...

// --- Button Event Listeners for Global/Regional Actions ---
document.getElementById('deploy-network-button').addEventListener('click', () => {
    const action = PlayerActions.deploy_network_infrastructure;
    const region = selectedThreat ? worldState.getRegionForThreat(selectedThreat) : null;
    const context = { worldState, playerFaction: worldState.playerFaction, selectedThreat, selectedRegion: region };
    if (actionService.executeAction(action, context)) {
        // success
    } else {
        alert(`Could not perform action: ${action.name}`);
    }
    updateRightPanelButtons();
});

document.getElementById('launch-satellite-button').addEventListener('click', () => {
    const action = PlayerActions.launch_satellite;
    const context = { worldState, playerFaction: worldState.playerFaction, selectedThreat: null, selectedRegion: null };
    if (actionService.executeAction(action, context)) {
        alert('Satellite launched successfully!');
    } else {
        alert('Failed to launch satellite. Check resources or limits.');
    }
    updateRightPanelButtons();
});

// ... Other button listeners for build, research, cheats etc. remain the same ...
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
        document.getElementById('move-agent-button').textContent = 'Select Target...';
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
            if (worldState.addUnit(region, 'AGENT')) {
                buildPanel.style.display = 'none';
            }
        } else {
            alert("You need a base in this region to build an agent.");
        }
    } else {
        alert("You must select a region to build in.");
    }
});

document.getElementById('build-vehicle-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER' && worldState.buildings.some(b => b.region === region && b.type === 'BASE')) {
            if (worldState.addUnit(region, 'GROUND_VEHICLE')) {
                buildPanel.style.display = 'none';
            }
        } else {
            alert("You need a base in this region to build a vehicle.");
        }
    } else {
        alert("You must select a region to build in.");
    }
});

document.getElementById('build-aircraft-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER' && worldState.buildings.some(b => b.region === region && b.type === 'BASE')) {
            if (worldState.addUnit(region, 'AIRCRAFT')) {
                buildPanel.style.display = 'none';
            }
        } else {
            alert("You need a base in this region to build an aircraft.");
        }
    } else {
        alert("You must select a region to build in.");
    }
});

document.getElementById('build-satellite-unit-button').addEventListener('click', () => {
    if (selectedThreat) {
        const region = worldState.getRegionForThreat(selectedThreat);
        if (region && region.owner === 'PLAYER' && worldState.buildings.some(b => b.region === region && b.type === 'BASE')) {
            if (worldState.addUnit(region, 'SATELLITE')) {
                buildPanel.style.display = 'none';
            }
        } else {
            alert("You need a base in this region to build a satellite.");
        }
    } else {
        alert("You must select a region to build in.");
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
// ... cheat panel logic remains the same ...

// Game loop
const clock = new THREE.Clock();
let gameSpeed = 1;

// ... game speed and camera control logic remains the same ...

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta() * gameSpeed;

    // Handle user input and camera
    // ...

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
    // No need to call updateRightPanelButtons() here, it's called on selection change

    // Animate camera if needed
    // ...

    // Update controls and render
    controls.update();
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
