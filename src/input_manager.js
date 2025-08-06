import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

export class InputManager {
    constructor(camera, scene, renderer, worldState, uiManager, audioManager, controls) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.worldState = worldState;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        this.controls = controls;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedThreat = null;
        this.selectedUnit = null;
        this.moveMode = false;

        this.bindEventListeners();
    }

    bindEventListeners() {
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
        this.renderer.domElement.addEventListener('dblclick', this.onMouseDoubleClick.bind(this), false);
        this.renderer.domElement.addEventListener('contextmenu', this.onRightClick.bind(this), false);
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const chunkMeshes = this.scene.children.filter(obj => obj.userData.isChunkMesh && obj.visible);

        if (this.moveMode && this.selectedUnit) {
            const intersects = this.raycaster.intersectObjects(chunkMeshes);
            if (intersects.length > 0) {
                this.selectedUnit.moveTo(intersects[0].point);
            }
            this.moveMode = false;
            this.uiManager.moveAgentButton.textContent = 'Move Agent';
            this.renderer.domElement.style.cursor = 'default';
            return;
        }

        const allThreats = this.worldState.getThreats();
        const threatMeshes = allThreats.map(t => t.mesh);
        const allUnits = this.worldState.units;
        const unitMeshes = allUnits.map(u => u.mesh);
        const intersects = this.raycaster.intersectObjects([...threatMeshes, ...unitMeshes]);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            this.audioManager.playSound('click');
            this.uiManager.hideLocationInfo();

            const newlySelectedThreat = allThreats.find(t => t.mesh === intersectedMesh);
            const newlySelectedAgent = this.worldState.agents.find(a => a.mesh === intersectedMesh);
            const newlySelectedUnit = allUnits.find(u => u.mesh === intersectedMesh && u.mesh.userData.unit);

            this.selectedThreat = newlySelectedThreat || null;
            this.selectedUnit = newlySelectedAgent || newlySelectedUnit || null;

            this.uiManager.setSelectedThreat(this.selectedThreat);
            this.uiManager.setSelectedUnit(this.selectedUnit);
        } else {
            this.selectedThreat = null;
            this.selectedUnit = null;
            this.uiManager.clearSelection();

            const planetIntersects = this.raycaster.intersectObjects(chunkMeshes);
            if (planetIntersects.length > 0) {
                const point = planetIntersects[0].point;
                this.uiManager.showLocationInfo(point);
            } else {
                this.uiManager.hideLocationInfo();
            }
        }
    }

    onMouseDoubleClick(event) {
        this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const allThreats = this.worldState.getThreats();
        const threatMeshes = allThreats.map(t => t.mesh);
        const intersects = this.raycaster.intersectObjects(threatMeshes);

        if (intersects.length > 0) {
            const lookAtPosition = intersects[0].object.position.clone();
            const cameraDistance = 20;
            const newCameraPosition = lookAtPosition.clone().add(new THREE.Vector3(0, 0, cameraDistance));

            // This is a simplified animation. Will be improved later.
            this.camera.position.copy(newCameraPosition);
            this.controls.target.copy(lookAtPosition);
        }
    }

    onRightClick(event) {
        event.preventDefault();
        if (!this.selectedUnit) return;

        this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const chunkMeshes = this.scene.children.filter(obj => obj.userData.isChunkMesh && obj.visible);
        const intersects = this.raycaster.intersectObjects(chunkMeshes);

        if (intersects.length > 0) {
            const destination = intersects[0].point;
            this.selectedUnit.moveTo(destination);

            const indicatorGeo = new THREE.RingGeometry(0.4, 0.5, 32);
            const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            const moveIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
            moveIndicator.position.copy(destination);
            moveIndicator.lookAt(new THREE.Vector3());
            this.scene.add(moveIndicator);

            new TWEEN.Tween(moveIndicator.scale)
                .to({ x: 1.5, y: 1.5, z: 1.5 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();

            new TWEEN.Tween(indicatorMat)
                .to({ opacity: 0 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    this.scene.remove(moveIndicator);
                    indicatorGeo.dispose();
                    indicatorMat.dispose();
                })
                .start();
        }
    }

    onKeyDown(event) {
        if (event.key === 'Escape' && this.moveMode) {
            this.moveMode = false;
            this.uiManager.moveAgentButton.textContent = 'Move Agent';
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    update() {
        // This can be used for things that need to be checked every frame, like hover effects.
    }

    handleThreatsRemoved(removedThreats) {
        if (this.selectedThreat && removedThreats.some(t => t.id === this.selectedThreat.id)) {
            this.selectedThreat = null;
            this.selectedUnit = null; // Also clear unit selection for safety
            this.uiManager.clearSelection();
        }
    }
}
