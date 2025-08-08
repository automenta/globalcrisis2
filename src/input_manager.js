import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';

export class InputManager {
    constructor(
        camera,
        scene,
        renderer,
        worldView,
        uiManager,
        audioManager,
        controls,
        worker
    ) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.worldView = worldView;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        this.controls = controls;
        this.worker = worker;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedObject = null;
        this.moveMode = false;

        this.bindEventListeners();
    }

    bindEventListeners() {
        this.renderer.domElement.addEventListener(
            'click',
            this.onMouseClick.bind(this),
            false
        );
        this.renderer.domElement.addEventListener(
            'dblclick',
            this.onMouseDoubleClick.bind(this),
            false
        );
        this.renderer.domElement.addEventListener(
            'contextmenu',
            this.onRightClick.bind(this),
            false
        );
        window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    }

    onMouseClick(event) {
        this.mouse.x =
            (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y =
            -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const chunkMeshes = [...this.worldView.chunkMeshes.values()];
        const selectableMeshes = [
            ...this.worldView.threatMeshes.values(),
            ...this.worldView.unitMeshes.values(),
            ...this.worldView.agentMeshes.values(),
        ];

        if (this.moveMode && this.selectedObject) {
            const intersects = this.raycaster.intersectObjects(chunkMeshes);
            if (intersects.length > 0) {
                // This will be refactored to post a message to the worker
                // this.selectedObject.moveTo(intersects[0].point);
                console.log('Move command to:', intersects[0].point);
            }
            this.moveMode = false;
            // this.uiManager.moveAgentButton.textContent = 'Move Agent';
            this.renderer.domElement.style.cursor = 'default';
            return;
        }

        const intersects = this.raycaster.intersectObjects(selectableMeshes);

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            this.selectedObject = intersectedMesh.userData.simObject;

            this.audioManager.playSound('click');
            this.uiManager.setSelected(this.selectedObject);
            this.uiManager.selectionIndicator.visible = true;
            this.uiManager.selectionIndicator.position.copy(
                intersectedMesh.position
            );
        } else {
            this.selectedObject = null;
            this.uiManager.clearSelection();
            this.uiManager.selectionIndicator.visible = false;

            const planetIntersects =
                this.raycaster.intersectObjects(chunkMeshes);
            if (planetIntersects.length > 0) {
                // const point = planetIntersects[0].point;
                // this.uiManager.showLocationInfo(point);
            } else {
                this.uiManager.hideLocationInfo();
            }
        }
    }

    onMouseDoubleClick() {
        // this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        // this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        // this.raycaster.setFromCamera(this.mouse, this.camera);
        // const allThreats = this.voxelWorld.getThreats();
        // const threatMeshes = allThreats.map(t => t.mesh);
        // const intersects = this.raycaster.intersectObjects(threatMeshes);
        // if (intersects.length > 0) {
        //     const lookAtPosition = intersects[0].object.position.clone();
        //     const cameraDistance = 20;
        //     const newCameraPosition = lookAtPosition.clone().add(new THREE.Vector3(0, 0, cameraDistance));
        //     // This is a simplified animation. Will be improved later.
        //     this.camera.position.copy(newCameraPosition);
        //     this.controls.target.copy(lookAtPosition);
        // }
    }

    onRightClick(event) {
        event.preventDefault();
        if (
            !this.selectedObject ||
            (this.selectedObject.type !== 'unit' &&
                this.selectedObject.type !== 'agent')
        ) {
            return;
        }

        this.mouse.x =
            (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y =
            -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const chunkMeshes = [...this.worldView.chunkMeshes.values()];
        const intersects = this.raycaster.intersectObjects(chunkMeshes);

        if (intersects.length > 0) {
            const destination = intersects[0].point;

            this.worker.postMessage({
                type: 'move_unit',
                payload: {
                    unitId: this.selectedObject.id,
                    destination: {
                        x: destination.x,
                        y: destination.y,
                        z: destination.z,
                    },
                },
            });

            // Visual feedback for the move command
            const indicatorGeo = new THREE.RingGeometry(0.4, 0.5, 32);
            const indicatorMat = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
            });
            const moveIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
            moveIndicator.position.copy(destination);
            moveIndicator.lookAt(
                this.selectedObject.position
                    .clone()
                    .normalize()
                    .multiplyScalar(100)
            ); // Look away from planet center
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
        if (
            this.selectedThreat &&
            removedThreats.some((t) => t.id === this.selectedThreat.id)
        ) {
            this.selectedThreat = null;
            this.selectedUnit = null; // Also clear unit selection for safety
            this.uiManager.clearSelection();
        }
    }
}
