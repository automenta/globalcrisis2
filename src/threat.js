class Threat {
    constructor(id, domain, type, severity, lat, lon) {
        this.id = id;
        this.domain = domain;
        this.type = type;
        this.severity = severity;
        this.lat = lat;
        this.lon = lon;
        this.mesh = this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.ConeGeometry(0.2, 1, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cone = new THREE.Mesh(geometry, material);

        // Position the cone on the surface of the Earth
        const phi = (90 - this.lat) * (Math.PI / 180);
        const theta = (this.lon + 180) * (Math.PI / 180);

        const x = -(5 * Math.sin(phi) * Math.cos(theta));
        const z = 5 * Math.sin(phi) * Math.sin(theta);
        const y = 5 * Math.cos(phi);

        cone.position.set(x, y, z);

        // Point the cone outwards
        cone.lookAt(0, 0, 0);
        cone.rotateX(Math.PI / 2);


        return cone;
    }
}
