class RadiologicalPlume {
    constructor(threat, scene) {
        this.threat = threat;
        this.scene = scene;
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
        this.particles = [];
        this.particleCount = 500; // Increased particle count
        this.maxAge = 15; // Increased lifespan
    }

    createMesh() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.7
        });
        const points = new THREE.Points(geometry, material);
        return points;
    }

    update(dt, windSpeed, windDirection) {
        // Create new particles
        if (this.particles.length < this.particleCount) {
            const particle = {
                position: this.threat.mesh.position.clone(),
                age: 0,
                color: new THREE.Color(0xADFF2F) // GreenYellow for RAD
            };
            this.particles.push(particle);
        }

        const positions = [];
        const colors = [];
        this.particles.forEach((p, index) => {
            // Update particle age
            p.age += dt;
            if (p.age > this.maxAge) {
                this.particles.splice(index, 1);
                return;
            }

            // Update color based on age
            const lifeRatio = p.age / this.maxAge;
            // Fade from GreenYellow to a dark green
            p.color.setHSL(0.22, 1, 0.5 * (1 - lifeRatio));

            // Move particle with wind
            const windVector = new THREE.Vector3(
                Math.cos(windDirection * Math.PI / 180),
                0.2, // Add a slight upward movement to the plume
                Math.sin(windDirection * Math.PI / 180)
            ).multiplyScalar(windSpeed * dt * 0.01);
            p.position.add(windVector);

            // Add some turbulence/randomness
            p.position.x += (Math.random() - 0.5) * 0.1;
            p.position.y += (Math.random() - 0.5) * 0.1;
            p.position.z += (Math.random() - 0.5) * 0.1;

            positions.push(p.position.x, p.position.y, p.position.z);
            colors.push(p.color.r, p.color.g, p.color.b);
        });

        this.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.color.needsUpdate = true;
    }
}
