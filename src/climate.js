class ClimateGrid {
    constructor(width = 36, height = 18) {
        this.width = width;
        this.height = height;
        this.baseTemperature = new Array(width * height);
        this.moisture = new Array(width * height);
        this.simulationTime = 0; // Tracks time in seconds for seasonal cycle
        this.yearDuration = 120; // A full year cycle takes 120 seconds
        this.initialize();
    }

    initialize() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = y * this.width + x;
                // Simple latitude-based temperature: hot at equator, cold at poles
                // This now represents the yearly average temperature.
                const latitudeEffect = 1 - Math.abs(y - this.height / 2) / (this.height / 2); // 1 at equator, 0 at poles
                this.baseTemperature[index] = -15 + 40 * latitudeEffect; // Ranges from -15C to 25C
                this.moisture[index] = Math.random();
            }
        }
    }

    getIndex(x, y) {
        return y * this.width + x;
    }

    /**
     * Updates the simulation time. The old diffusion logic is removed in favor of a dynamic seasonal model.
     * @param {number} dt Delta time in seconds.
     */
    update(dt) {
        this.simulationTime += dt;
    }

    /**
     * Gets climate data for a specific location, factoring in the seasonal cycle.
     * @param {number} lat Latitude.
     * @param {number} lon Longitude.
     * @returns {{temperature: number, moisture: number}}
     */
    getDataAt(lat, lon) {
        const x = Math.floor(((lon + 180) / 360) * this.width) % this.width;
        const y = Math.floor(((90 - lat) / 180) * this.height) % this.height;
        const index = y * this.width + x;

        const baseTemp = this.baseTemperature[index];
        const moisture = this.moisture[index];

        // --- Seasonal Temperature Variation ---
        const maxSeasonalOffset = 15; // Max temp change from season
        // `timeOfYear` goes from 0 to 1 over the course of a year
        const timeOfYear = (this.simulationTime % this.yearDuration) / this.yearDuration;
        const angle = timeOfYear * 2 * Math.PI;

        // The seasonal effect is strongest at the poles and weakest at the equator.
        // We use Math.abs(lat) to determine the magnitude of the seasonal swing.
        const seasonalAmplitude = (Math.abs(lat) / 90) * maxSeasonalOffset;

        // Northern hemisphere (lat > 0) is warmest in summer (timeOfYear=0.25, angle=PI/2)
        // Southern hemisphere (lat < 0) is coldest at that time.
        // We use a phase shift for the southern hemisphere.
        const phase = lat >= 0 ? 0 : Math.PI;
        const seasonalOffset = seasonalAmplitude * Math.sin(angle + phase);

        const currentTemperature = baseTemp + seasonalOffset;

        return {
            temperature: currentTemperature,
            moisture: moisture
        };
    }
}
