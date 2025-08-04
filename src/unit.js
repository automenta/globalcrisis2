class Unit {
    constructor({ region, type }) {
        this.region = region;
        this.type = type; // 'AGENT', etc.
        this.mesh = this.createMesh();
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

    moveTo(targetRegion) {
        // Animate the movement from the current region to the target region
        const startPos = this.mesh.position.clone();
        const [lat, lon] = targetRegion.centroid;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const earthRadius = 5;
        const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
        const z = earthRadius * Math.sin(phi) * Math.sin(theta);
        const y = earthRadius * Math.cos(phi);
        const endPos = new THREE.Vector3(x, y, z);

        new TWEEN.Tween(this.mesh.position)
            .to(endPos, 2000) // 2 seconds to move
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                this.mesh.lookAt(0, 0, 0);
            })
            .onComplete(() => {
                this.region = targetRegion;
            })
            .start();
    }
}
