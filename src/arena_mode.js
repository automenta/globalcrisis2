// src/arena_mode.js

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ArenaMode {
    constructor(game) {
        this.game = game; // Reference to the main game object
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.robots = [];
        this.selectedRobot = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    init() {
        console.log('Initializing Robotic Warfare Arena...');

        // Create a new scene for the arena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);

        // Use the same renderer as the main game
        this.renderer = this.game.renderer;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // Add a ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.5,
            roughness: 0.5,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Set up controls
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Add some placeholder robots
        this.addRobot(new THREE.Vector3(-3, 0.5, 0), 0xff0000);
        this.addRobot(new THREE.Vector3(3, 0.5, 0), 0x0000ff);

        this.selectionBox = new THREE.BoxHelper();
        this.selectionBox.visible = false;
        this.scene.add(this.selectionBox);

        this.renderer.domElement.addEventListener(
            'click',
            this.onMouseClick.bind(this),
            false
        );

        console.log('Arena initialized.');
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.robots);

        if (intersects.length > 0) {
            this.selectedRobot = intersects[0].object;
            this.selectionBox.setFromObject(this.selectedRobot);
            this.selectionBox.visible = true;
        } else {
            // Deselect if clicking on the ground
            const ground = this.scene.children.find(
                (c) => c.geometry instanceof THREE.PlaneGeometry
            );
            const groundIntersects = this.raycaster.intersectObject(ground);
            if (groundIntersects.length > 0 && this.selectedRobot) {
                // Move the robot
                const targetPoint = groundIntersects[0].point;
                // For now, just move it instantly. We'll add smooth movement later.
                this.selectedRobot.position.set(
                    targetPoint.x,
                    this.selectedRobot.position.y,
                    targetPoint.z
                );
            }
            this.selectedRobot = null;
            this.selectionBox.visible = false;
        }
    }

    addRobot(position, color) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const robot = new THREE.Mesh(geometry, material);
        robot.position.copy(position);
        this.scene.add(robot);
        this.robots.push(robot);
    }

    start() {
        console.log('Starting Arena Mode...');
        // We'll need a separate animation loop for the arena
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    end() {
        console.log('Ending Arena Mode...');
        // Clean up the arena scene and resources
        // For now, we'll just switch back to the main game's animation loop
    }
}
