// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add a light to the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 3, 5);
scene.add(light);

// Create the Earth
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg');
const geometry = new THREE.SphereGeometry(5, 32, 32);
const material = new THREE.MeshStandardMaterial({ map: texture });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// Position the camera
camera.position.z = 10;

// Instantiate the world state
const worldState = new WorldState(scene);

// Add controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Raycasting for threat interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const threatInfoPanel = document.getElementById('threat-info');
let selectedThreat = null;

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
    threatInfoPanel.innerHTML = `
        <h3>Threat Details</h3>
        <p><strong>ID:</strong> ${threat.id}</p>
        <p><strong>Domain:</strong> ${threat.domain}</p>
        <p><strong>Type:</strong> ${typeDisplay}</p>
        <p><strong>Severity:</strong> ${threat.severity.toFixed(2)}</p>
        <p><strong>Location:</strong> ${threat.lat.toFixed(2)}, ${threat.lon.toFixed(2)}</p>
        <p><strong>Visibility:</strong> ${(threat.visibility * 100).toFixed(0)}%</p>
        <p><strong>Investigation:</strong> ${(threat.investigationProgress * 100).toFixed(0)}%</p>
        <div id="action-buttons"></div>
    `;

    const actionButtonsContainer = document.getElementById('action-buttons');

    // Add Investigate Button
    if (!isInvestigated) {
        actionButtonsContainer.innerHTML += `
            <button id="investigate-button">Investigate (100 Intel)</button>
        `;
    } else {
        actionButtonsContainer.innerHTML += `
            <button id="investigate-button" disabled style="background-color: #555;">Fully Investigated</button>
        `;
    }

    // Add Mitigate Button if applicable
    if (isInvestigated && threat.type === 'REAL') {
        actionButtonsContainer.innerHTML += `
            <button id="mitigate-button">Mitigate (500 Funds, 200 Tech)</button>
        `;
    }

    // Add event listeners
    const investigateButton = document.getElementById('investigate-button');
    if (investigateButton && !investigateButton.disabled) {
        investigateButton.addEventListener('click', () => {
            if (threat.investigate(worldState.playerFaction)) {
                updateThreatPanel();
            }
        });
    }

    const mitigateButton = document.getElementById('mitigate-button');
    if (mitigateButton) {
        mitigateButton.addEventListener('click', () => {
            if (threat.mitigate(worldState.playerFaction)) {
                updateThreatPanel();
            }
        });
    }
}

function onMouseClick(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const allThreats = worldState.getThreats();
    const threatMeshes = allThreats.map(t => t.mesh);
    const intersects = raycaster.intersectObjects(threatMeshes);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        // If the same threat is clicked, do nothing to prevent panel flicker
        const newlySelectedThreat = allThreats.find(t => t.mesh === intersectedMesh);
        if (newlySelectedThreat !== selectedThreat) {
            selectedThreat = newlySelectedThreat;
            updateThreatPanel();
        }
    } else {
        if (selectedThreat) {
            selectedThreat = null;
            updateThreatPanel();
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

// Game loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update game state
    worldState.update(deltaTime);

    // Update UI Panels
    updatePlayerPanel();

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
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
