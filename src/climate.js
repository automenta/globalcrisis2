class ClimateGrid {
    constructor(width = 36, height = 18) {
        this.width = width;
        this.height = height;
        this.temperature = new Array(width * height);
        this.moisture = new Array(width * height);
        this.initialize();
    }

    initialize() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = y * this.width + x;
                // Simple latitude-based temperature: hot at equator, cold at poles
                const latitudeEffect = 1 - Math.abs(y - this.height / 2) / (this.height / 2); // 1 at equator, 0 at poles
                this.temperature[index] = -15 + 40 * latitudeEffect; // Ranges from -15C to 25C
                this.moisture[index] = Math.random();
            }
        }
    }

    getIndex(x, y) {
        return y * this.width + x;
    }

    update(dt) {
        const newTemperature = new Array(this.width * this.height);
        const diffusionRate = 0.1 * (dt / 1000); // Diffusion per second

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = this.getIndex(x, y);
                let totalTemp = 0;
                let neighborCount = 0;

                // Simple diffusion from neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;

                        const nx = (x + dx + this.width) % this.width; // Wrap around horizontally
                        const ny = Math.max(0, Math.min(this.height - 1, y + dy)); // Clamp vertically

                        if (ny !== y + dy) continue; // Don't wrap poles for this simple model

                        totalTemp += this.temperature[this.getIndex(nx, ny)];
                        neighborCount++;
                    }
                }

                const avgNeighborTemp = totalTemp / neighborCount;
                const currentTemp = this.temperature[index];
                newTemperature[index] = currentTemp + (avgNeighborTemp - currentTemp) * diffusionRate;
            }
        }
        this.temperature = newTemperature;
    }

    getDataAt(lat, lon) {
        const x = Math.floor(((lon + 180) / 360) * this.width) % this.width;
        const y = Math.floor(((90 - lat) / 180) * this.height) % this.height;
        const index = y * this.width + x;

        return {
            temperature: this.temperature[index],
            moisture: this.moisture[index]
        };
    }
}
