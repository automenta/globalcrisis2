class Game {
    constructor() {
        this.initEngine();
        this.initManagers();
        this.initEventListeners();
    }

    initEngine() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 150;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Post-processing
        this.composer = new THREE.EffectComposer(this.renderer);
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
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
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        this.selectionIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.selectionIndicator.visible = false;
        this.scene.add(this.selectionIndicator);

        this.clock = new THREE.Clock();
        this.gameSpeed = 1;
    }

    initManagers() {
        this.audioManager = new AudioManager();
        this.actionService = new ActionService();
        this.narrativeManager = new NarrativeManager();

        const casualModeCheckbox = document.getElementById('casual-mode-checkbox');
        this.worldState = new WorldState(this.scene, this.narrativeManager, casualModeCheckbox.checked);

        this.eventManager = new EventManager(this.worldState);
        this.goalManager = new GoalManager(this.worldState);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.uiManager = new UIManager(this.worldState, this.actionService, this.audioManager, this.goalManager, this.selectionIndicator);
        this.inputManager = new InputManager(this.camera, this.scene, this.renderer, this.worldState, this.uiManager, this.audioManager, this.controls);
    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }, false);

        const sounds = {
            music: 'https://cdn.pixabay.com/audio/2022/11/22/audio_7333d45a97.mp3',
            click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_28b1b9b81f.mp3',
            investigate: 'https://cdn.pixabay.com/audio/2021/08/04/audio_5734a3108c.mp3',
            mitigate: 'https://cdn.pixabay.com/audio/2022/01/18/audio_8db1f1b621.mp3',
            investigation_complete: 'https://cdn.pixabay.com/audio/2022/08/18/audio_2c0d13a5db.mp3'
        };

        const loadAudio = async () => {
            for (const [name, url] of Object.entries(sounds)) {
                await this.audioManager.loadSound(name, url);
            }
        }
        loadAudio();

        const startMusicOnFirstInteraction = () => {
            this.audioManager.playMusic('music');
            window.removeEventListener('click', startMusicOnFirstInteraction);
            window.removeEventListener('keydown', startMusicOnFirstInteraction);
        }
        window.addEventListener('click', startMusicOnFirstInteraction);
        window.addEventListener('keydown', startMusicOnFirstInteraction);
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta() * this.gameSpeed;

        const worldUpdateResult = this.worldState.update(deltaTime, this.camera.position);
        if (worldUpdateResult.threatsRemoved && worldUpdateResult.threatsRemoved.length > 0) {
            this.inputManager.handleThreatsRemoved(worldUpdateResult.threatsRemoved);
        }

        this.eventManager.update(deltaTime);
        this.goalManager.update(deltaTime);
        this.uiManager.update();
        this.inputManager.update();
        this.worldState.updateVisualization(deltaTime, this.uiManager.uiState.isClimateVisible);

        this.controls.update();
        this.composer.render(deltaTime);
        TWEEN.update();
    }
}
