import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { UIManager } from './ui_manager.js';
import { WorldState } from './world.js';
import { VoxelWorld, Chunk } from './voxel.js';
import { ClimateGrid } from './climate.js';
import { AudioManager } from './audio.js';
import { ActionService } from './action_service.js';
import { NarrativeManager } from './narrative.js';
import { EventManager } from './events.js';
import { GoalManager } from './domain_logic.js';
import { InputManager } from './input_manager.js';
import { TestRunner } from './test_runner.js';
import { RegionManager } from './managers/RegionManager.js';
import { FactionManager } from './managers/FactionManager.js';
import { ThreatManager } from './managers/ThreatManager.js';
import { AIManager } from './managers/AIManager.js';
import { EventBus } from './event_bus.js';
import TWEEN from '@tweenjs/tween.js';

export class Game {
    constructor() {
        this.initEngine();
        this.initManagers();
        this.initEventListeners();
    }

    initEngine() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 150;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
        bloomPass.threshold = 0;
        bloomPass.strength = 0.5;
        bloomPass.radius = 0;
        this.composer.addPass(bloomPass);

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 3, 5);
        this.scene.add(light);

        // Selection Indicator
        const indicatorGeometry = new THREE.RingGeometry(1, 1.1, 32);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
        });
        this.selectionIndicator = new THREE.Mesh(
            indicatorGeometry,
            indicatorMaterial
        );
        this.selectionIndicator.visible = false;
        this.scene.add(this.selectionIndicator);

        this.clock = new THREE.Clock();
        this.gameSpeed = 1;
    }

    initManagers() {
        this.eventBus = new EventBus();
        this.audioManager = new AudioManager();
        this.actionService = new ActionService();
        this.narrativeManager = new NarrativeManager();
        this.regionManager = new RegionManager(this.scene);
        this.factionManager = new FactionManager(true);
        this.threatManager = new ThreatManager(
            this.scene,
            this.narrativeManager,
            true
        );
        this.aiManager = new AIManager(this.factionManager.aiFaction, true);

        this.worldState = new WorldState(
            this.scene,
            this.narrativeManager,
            true
        );
        this.worldState.regionManager = this.regionManager;
        this.worldState.factionManager = this.factionManager;
        this.worldState.threatManager = this.threatManager;
        this.worldState.aiManager = this.aiManager;

        this.climateGrid = new ClimateGrid(128, 128);
        this.climateGrid.generate();
        this.voxelWorld = new VoxelWorld();

        const chunk = new Chunk(new THREE.Vector3(0, 0, 0));
        this.voxelWorld.generateChunk(chunk, this.climateGrid);
        this.voxelWorld.addChunk(chunk);

        for (let lod = 0; lod < this.voxelWorld.numLods; lod++) {
            this.voxelWorld.createMeshForChunk(chunk, lod);
            if (chunk.meshes[lod]) {
                this.scene.add(chunk.meshes[lod]);
            }
        }
        this.voxelWorld.updateLods(this.camera.position);

        this.eventManager = new EventManager(this.worldState);
        this.goalManager = new GoalManager(this.worldState);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.uiManager = new UIManager(
            this.worldState,
            this.actionService,
            this.audioManager,
            this.goalManager,
            this.selectionIndicator
        );
        this.inputManager = new InputManager(
            this.camera,
            this.scene,
            this.renderer,
            this.worldState,
            this.uiManager,
            this.audioManager,
            this.controls
        );
        this.testRunner = new TestRunner(this.uiManager);
    }

    initEventListeners() {
        this.uiManager.runTestsButton.addEventListener('click', () => {
            this.testRunner.runTests();
        });
        window.addEventListener(
            'resize',
            () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.composer.setSize(window.innerWidth, window.innerHeight);
            },
            false
        );

        const sounds = {
            music: 'https://cdn.pixabay.com/audio/2022/11/22/audio_7333d45a97.mp3',
            click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_28b1b9b81f.mp3',
            investigate:
                'https://cdn.pixabay.com/audio/2021/08/04/audio_5734a3108c.mp3',
            mitigate:
                'https://cdn.pixabay.com/audio/2022/01/18/audio_8db1f1b621.mp3',
            investigation_complete:
                'https://cdn.pixabay.com/audio/2022/08/18/audio_2c0d13a5db.mp3',
        };

        const loadAudio = async () => {
            for (const [name, url] of Object.entries(sounds)) {
                await this.audioManager.loadSound(name, url);
            }
        };
        loadAudio();

        const startMusicOnFirstInteraction = () => {
            this.audioManager.playMusic('music');
            window.removeEventListener('click', startMusicOnFirstInteraction);
            window.removeEventListener('keydown', startMusicOnFirstInteraction);
        };
        window.addEventListener('click', startMusicOnFirstInteraction);
        window.addEventListener('keydown', startMusicOnFirstInteraction);
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta() * this.gameSpeed;

        this.worldState.update(deltaTime, this.camera.position);
        this.regionManager.update(deltaTime, this.worldState);
        this.factionManager.update(deltaTime, this.worldState);
        this.threatManager.update(deltaTime, this.worldState);
        this.aiManager.update(deltaTime, this.worldState);

        this.uiManager.update();
        this.inputManager.update();

        this.controls.update();
        this.composer.render(deltaTime);
        TWEEN.update();
    }
}
