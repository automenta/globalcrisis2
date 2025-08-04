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

const threats = [];
const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

function generateThreat() {
    const id = threats.length;
    const domain = threatDomains[Math.floor(Math.random() * threatDomains.length)];
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
    const severity = Math.random();
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;

    const threat = new Threat(id, domain, type, severity, lat, lon);
    threats.push(threat);
    scene.add(threat.mesh);
}

setInterval(generateThreat, 3000);

// Add controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Raycasting for threat interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const threatInfoPanel = document.getElementById('threat-info');

function onMouseClick(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const threatMeshes = threats.map(t => t.mesh);
    const intersects = raycaster.intersectObjects(threatMeshes);

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const threat = threats.find(t => t.mesh === intersectedMesh);
        if (threat) {
            threatInfoPanel.style.display = 'block';
            threatInfoPanel.innerHTML = `
                <h3>Threat Details</h3>
                <p><strong>ID:</strong> ${threat.id}</p>
                <p><strong>Domain:</strong> ${threat.domain}</p>
                <p><strong>Type:</strong> ${threat.type}</p>
                <p><strong>Severity:</strong> ${threat.severity.toFixed(2)}</p>
                <p><strong>Location:</strong> ${threat.lat.toFixed(2)}, ${threat.lon.toFixed(2)}</p>
            `;
        }
    } else {
        threatInfoPanel.style.display = 'none';
    }
}

window.addEventListener('click', onMouseClick, false);

// Render loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
