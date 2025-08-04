const EARTH_RADIUS_KM = 6371; // For converting region radius to sphere scale

class Region {
    /**
     * @param {object} options
     * @param {string} options.id - Unique identifier for the region.
     * @param {string} options.name - Display name of the region.
     * @param {[number, number]} options.centroid - [latitude, longitude] of the region's center.
     * @param {number} options.radius - The radius of the region in kilometers.
     * @param {object} options.attributes - Climate-related attributes.
     * @param {number} options.attributes.climateVulnerability - 0-1 scale.
     * @param {number} options.attributes.temperature - Average temperature in Celsius.
     */
    constructor({ id, name, centroid, radius, attributes }) {
        this.id = id;
        this.name = name;
        this.centroid = centroid; // [lat, lon]
        this.radius = radius; // km
        this.attributes = attributes; // { climateVulnerability, temperature, economy: 1.0 }
        this.stability = 1.0; // Initial stability
        this.economy = 1.0; // Initial economy

        // Weather will be managed by the WeatherSystem
        this.weather = null;

        // 3D representation
        this.mesh = this.createMesh();
        this.weatherMesh = this.createWeatherMesh();
        this.mesh.add(this.weatherMesh); // Add weather mesh as a child
    }

    updateMeshColor(envDamage = 0) {
        const color = this.getRegionColor(this.attributes.temperature, this.stability, envDamage);
        this.mesh.material.color.set(color);
    }

    createMesh() {
        const sphereRadius = 5; // The radius of the Earth mesh in the scene
        const regionRadiusOnSphere = (this.radius / EARTH_RADIUS_KM) * sphereRadius;

        const geometry = new THREE.CircleGeometry(regionRadiusOnSphere, 32);

        // Color based on temperature and stability
        const regionColor = this.getRegionColor(this.attributes.temperature, this.stability);
        const material = new THREE.MeshBasicMaterial({
            color: regionColor,
            transparent: true,
            opacity: 0.4
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh on the surface of the Earth
        const [lat, lon] = this.centroid;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(sphereRadius * Math.sin(phi) * Math.cos(theta));
        const z = sphereRadius * Math.sin(phi) * Math.sin(theta);
        const y = sphereRadius * Math.cos(phi);

        mesh.position.set(x, y, z);

        // Orient the circle to be flat on the sphere's surface
        mesh.lookAt(0, 0, 0);

        return mesh;
    }

    getRegionColor(temp, stability, envDamage) {
        // Temperature based color (blue to red)
        const minTemp = -50;
        const maxTemp = 40;
        const normalizedTemp = (Math.max(minTemp, Math.min(maxTemp, temp)) - minTemp) / (maxTemp - minTemp);
        const tempHue = 0.7 * (1 - normalizedTemp);

        // Stability based color (stable = no change, unstable = red)
        const stabilityHue = 0; // Red

        // Blend hue based on stability. Full stability = tempHue, zero stability = stabilityHue
        const finalHue = tempHue * stability + stabilityHue * (1 - stability);

        // Environmental damage reduces saturation
        const saturation = Math.max(0, 1.0 - envDamage * 0.5);

        const color = new THREE.Color();
        color.setHSL(finalHue, saturation, 0.5);
        return color;
    }

    createWeatherMesh() {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);

        // Position it slightly above the region mesh
        mesh.position.z = 0.1;
        mesh.visible = false; // Initially hidden

        return mesh;
    }
}

const WEATHER_COLORS = {
    "STORM": 0x555555, // Dark grey
    "RAIN": 0x0000ff,  // Blue
    "SNOW": 0xffffff,  // White
    "CLEAR": 0x000000, // Hidden
};
