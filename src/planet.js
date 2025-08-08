import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CHUNK_SIZE } from './constants.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.rotateSpeed = 1.2;

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 3, 5);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

// Worker
const worker = new Worker('/src/simulation_worker.js', { type: 'module' });

worker.onmessage = (e) => {
    const { type, payload } = e.data;
    switch (type) {
        case 'init_complete':
            console.log('Main: Worker initialization complete.');
            worker.postMessage({ type: 'start' });
            break;
        case 'chunk_geometry':
            addChunkMesh(payload);
            break;
    }
};

worker.postMessage({
    type: 'init',
    payload: { /* config if any */ },
});

const chunkMeshes = new Map();

function addChunkMesh(payload) {
    const { chunkId, chunkPosition, geometry: geometryData } = payload;

    if (!geometryData) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(geometryData.positions, 3)
    );
    geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(geometryData.normals, 3)
    );
    geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(geometryData.colors, 3)
    );

    const vertexShader = `
        varying vec3 vColor;
        void main() {
            vColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4(vColor, 1.0);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        vertexColors: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        chunkPosition.x * CHUNK_SIZE,
        chunkPosition.y * CHUNK_SIZE,
        chunkPosition.z * CHUNK_SIZE
    );
    mesh.userData.isChunkMesh = true;

    chunkMeshes.set(chunkId, mesh);
    scene.add(mesh);
    console.log(`Added chunk mesh: ${chunkId}`);
}


// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
