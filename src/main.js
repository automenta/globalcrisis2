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


// Create the Earth
const textureLoader = new THREE.TextureLoader();
const dayTexture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg');
const specularTexture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.tif');
const nightTexture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg');
const normalTexture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_normal_map.tif');

const geometry = new THREE.SphereGeometry(5, 32, 32);
const material = new THREE.MeshPhongMaterial({
    map: dayTexture,
    specularMap: specularTexture,
    specular: new THREE.Color('grey'),
    shininess: 10,
    emissive: nightTexture,
    emissiveIntensity: 1,
    emissiveMap: nightTexture,
    normalMap: normalTexture
});
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// Create clouds
const cloudTexture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg');
const cloudGeometry = new THREE.SphereGeometry(5.05, 32, 32);
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.8
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

// Atmospheric glow
const vertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec3 vNormal;
    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
    }
`;

const atmosphereGeometry = new THREE.SphereGeometry(5.2, 32, 32);
const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);


// Position the camera
camera.position.z = 10;

// UI State
const uiState = {
    arePlumesVisible: true,
};

// Instantiate the narrative manager
const narrativeManager = new NarrativeManager();

// Instantiate the world state
const worldState = new WorldState(scene, uiState, narrativeManager);

// UI Controls
const togglePlumesButton = document.getElementById('toggle-plumes-button');
togglePlumesButton.addEventListener('click', () => {
    uiState.arePlumesVisible = !uiState.arePlumesVisible;
    worldState.plumes.forEach(plume => {
        plume.mesh.visible = uiState.arePlumesVisible;
    });
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

function updateWeatherPanel() {
    if (!selectedThreat) {
        weatherPanel.panel.style.display = 'none';
        return;
    }

    const region = worldState.getRegionForThreat(selectedThreat);
    if (region && region.weather) {
        weatherPanel.panel.style.display = 'block';
        weatherPanel.type.textContent = region.weather.type;
        weatherPanel.windSpeed.textContent = region.weather.windSpeed.toFixed(1);
        weatherPanel.windDir.textContent = region.weather.windDirection.toFixed(0);
    } else {
        weatherPanel.panel.style.display = 'none';
    }
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
        <p><strong>Domain:</strong> ${threat.domain}</p>
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
    for (const actionId in PlayerActions) {
        const action = PlayerActions[actionId];
        if (action.isAvailable(threat)) {
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

            button.addEventListener('click', () => {
                // Store investigation status before executing action
                const wasInvestigated = threat.investigationProgress >= 1.0;

                if (action.execute(threat, worldState.playerFaction)) {
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

    if (moveMode && selectedUnit) {
        const regionMeshes = worldState.regions.map(r => r.mesh);
        const intersects = raycaster.intersectObjects(regionMeshes);
        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const targetRegion = worldState.regions.find(r => r.mesh === intersectedMesh);
            if (targetRegion) {
                selectedUnit.moveTo(targetRegion);
            }
        }
        moveMode = false;
        document.getElementById('move-agent-button').textContent = 'Move Agent';
        return;
    }

    const allThreats = worldState.getThreats();
    const threatMeshes = allThreats.map(t => t.mesh);
    const allUnits = worldState.units;
    const unitMeshes = allUnits.map(u => u.mesh);
    const intersects = raycaster.intersectObjects([...threatMeshes, ...unitMeshes]);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        audioManager.playSound('click');

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
            if (region && region.owner === 'NEUTRAL') {
                claimButton.disabled = false;
                buildButton.disabled = true;
            } else if (region && region.owner === 'PLAYER') {
                claimButton.disabled = true;
                buildButton.disabled = false;
            } else {
                claimButton.disabled = true;
                buildButton.disabled = true;
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
            document.getElementById('build-button').disabled = true;
            document.getElementById('move-agent-button').disabled = false;
        }
    } else {
        selectedThreat = null;
        selectedUnit = null;
        updateThreatPanel();
        updateWeatherPanel();
        updateSelectionIndicator();
        document.getElementById('cheat-investigate-threat').disabled = true;
        document.getElementById('cheat-mitigate-threat').disabled = true;
        document.getElementById('claim-region-button').disabled = true;
        document.getElementById('build-button').disabled = true;
        document.getElementById('move-agent-button').disabled = true;
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
document.getElementById('research-button').addEventListener('click', () => {
    const isVisible = researchPanel.style.display === 'block';
    researchPanel.style.display = isVisible ? 'none' : 'block';
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

    // Update UI Panels
    updatePlayerPanel();
    updateWeatherPanel();
    updateNarrativeLog();

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

    // Animate clouds
    clouds.rotation.y += 0.0005;

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
