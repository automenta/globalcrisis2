class Building {
    constructor({ region, type, owner }) {
        this.region = region;
        this.type = type; // 'BASE', 'SENSOR', etc.
        this.owner = owner; // 'PLAYER' or 'technocrats'
        this.mesh = this.createMesh();
    }

    createMesh() {
        let geometry;
        switch (this.type) {
            case 'BASE':
                geometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
                break;
            case 'SENSOR':
                geometry = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 8);
                break;
            case 'RESEARCH_OUTPOST':
                geometry = new THREE.DodecahedronGeometry(0.2);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }

        const ownerColor = this.owner === 'mitigators' ? 0x0000ff : 0xff0000; // Blue for player, Red for AI
        const material = new THREE.MeshPhongMaterial({ color: ownerColor });
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
}
