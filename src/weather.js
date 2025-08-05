const WEATHER_TYPES = ["CLEAR", "RAIN", "STORM", "SNOW", "DUST_STORM", "ACID_RAIN", "RADIOLOGICAL_FALLOUT"];

const WEATHER_COLORS = {
    "CLEAR": 0x87ceeb, // Sky blue
    "RAIN": 0x4682b4, // Steel blue
    "STORM": 0x708090, // Slate gray
    "SNOW": 0xfffafa, // Snow white
    "DUST_STORM": 0xbdb76b, // Dark khaki
    "ACID_RAIN": 0x8fbc8f, // Dark sea green
    "RADIOLOGICAL_FALLOUT": 0x9acd32, // Yellow green
};

class WeatherSystem {
    constructor(climateGrid) {
        this.climateGrid = climateGrid;
        // This helper function is needed to convert chunk positions to lat/lon.
        // It's duplicated from voxel.js to avoid a major refactoring of constructor dependencies.
        this.vector3ToLatLon = function(position) {
            const radius = position.length();
            if (radius === 0) return { lat: 0, lon: 0 };
            const phi = Math.acos(position.y / radius);
            const theta = Math.atan2(position.z, -position.x);

            const lat = 90 - (phi * 180 / Math.PI);
            const lon = (theta * 180 / Math.PI) - 180;

            return { lat, lon };
        }
    }

    /**
     * Updates the weather for all chunks in the voxel world.
     * @param {VoxelWorld} voxelWorld - The voxel world containing the chunks.
     * @param {number} dt - Delta time.
     * @param {number} totalEnvSeverity - The sum of severity of all ENV threats.
     */
    update(voxelWorld, dt, totalEnvSeverity = 0) {
        voxelWorld.chunks.forEach(chunk => {
            // If there's no weather or the duration is over, try to generate new weather
            if (!chunk.weather || chunk.weather.duration <= 0) {
                this.generateWeatherForChunk(chunk, totalEnvSeverity);
            } else {
                // Otherwise, just tick down the duration
                chunk.weather.duration -= dt;
            }
        });
    }

    /**
     * Generates a new weather state for a single chunk based on climate data.
     * @param {Chunk} chunk - The chunk to generate weather for.
     * @param {number} totalEnvSeverity - The sum of severity of all ENV threats.
     */
    generateWeatherForChunk(chunk, totalEnvSeverity) {
        // Calculate the world position of the chunk's center
        const chunkCenterWorldPos = new THREE.Vector3(
            (chunk.position.x + 0.5) * CHUNK_SIZE,
            (chunk.position.y + 0.5) * CHUNK_SIZE,
            (chunk.position.z + 0.5) * CHUNK_SIZE
        );

        const { lat, lon } = this.vector3ToLatLon(chunkCenterWorldPos);
        const climateData = this.climateGrid.getDataAt(lat, lon);
        const { temperature, moisture } = climateData;

        const weather = {
            windSpeed: Math.random() * 100, // km/h
            windDirection: Math.random() * 360, // degrees
            duration: 60 + Math.random() * 120, // Lasts 1-3 minutes
            intensity: Math.random() // 0-1 scale
        };

        // Determine weather type based on climate
        let potentialWeather = ["CLEAR"];
        if (temperature <= 0 && moisture > 0.3) {
            potentialWeather.push("SNOW");
        }
        if (temperature > 0 && moisture > 0.5) {
            potentialWeather.push("RAIN");
        }
        if (moisture > 0.7) {
            potentialWeather.push("STORM");
        }
        if (temperature > 25 && moisture < 0.2) {
            potentialWeather.push("DUST_STORM");
        }

        // Use a default climateVulnerability since chunks don't have this attribute.
        const climateVulnerability = 0.5;
        const climateFactor = climateVulnerability * 0.1;
        const envFactor = totalEnvSeverity * 0.05; // Each point of ENV severity adds 5% chance
        const chanceOfAdverseWeather = climateFactor + envFactor;

        if (Math.random() < chanceOfAdverseWeather && potentialWeather.length > 1) {
            // Pick a random adverse weather type from the potential list
            const adverseTypes = potentialWeather.filter(w => w !== "CLEAR");
            weather.type = adverseTypes[Math.floor(Math.random() * adverseTypes.length)];
        } else {
            weather.type = "CLEAR";
        }

        chunk.weather = weather;
    }
}
