class Unit {
    constructor({ region, type }) {
        this.region = region;
        this.type = type; // 'AGENT', etc.
        this.mesh = this.createMesh();
        this.mesh.userData.unit = this;

        // Movement Component
        this.movement = new MovementComponent({ speed: 1.0 });
        this.status = 'IDLE';
    }

    createMesh() {
        let geometry;
        switch (this.type) {
            case 'AGENT':
                geometry = new THREE.ConeGeometry(0.1, 0.4, 8);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }

        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh on the surface of the Earth in the region's centroid
        const [lat, lon] = this.region.centroid;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const earthRadius = 5;
        const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
        const z = earthRadius * Math.sin(phi) * Math.sin(theta);
        const y = earthRadius * Math.cos(phi);
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);

        return mesh;
    }

    moveTo(targetPoint) {
        const path = worldState.pathfindingService.calculatePath(this.mesh.position, targetPoint, 'GROUND');
        this.movement.setPath(path);
        this.status = 'MOVING';
    }

    update(dt) {
        // Update movement
        if (this.movement.isActive) {
            this.movement.update(this, dt);
            if (!this.movement.isActive) {
                // Movement just finished
                this.status = 'IDLE';
                // TODO: Update unit's current region based on its new position
            }
        }
    }
}
