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

const WEATHER_EFFECTS = {
    "STORM": { movementPenalty: 0.5, visibilityModifier: 0.5, threatAmplification: { 'ENV': 1.5, 'GEO': 1.2 } },
    "RAIN": { movementPenalty: 0.2, visibilityModifier: 0.2, threatAmplification: { 'BIO': 1.2 } },
    "SNOW": { movementPenalty: 0.3, visibilityModifier: 0.4, threatAmplification: {} },
    "DUST_STORM": { movementPenalty: 0.4, visibilityModifier: 0.7, threatAmplification: { 'RAD': 1.3 } },
    "ACID_RAIN": { movementPenalty: 0.1, visibilityModifier: 0.1, threatAmplification: { 'BIO': 1.5, 'RAD': 1.2 } },
    "RADIOLOGICAL_FALLOUT": { movementPenalty: 0, visibilityModifier: 0.1, threatAmplification: { 'RAD': 2.0, 'BIO': 1.3 } },
    "CLEAR": { movementPenalty: 0, visibilityModifier: 0, threatAmplification: {} }
};

export class WeatherSystem {
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

        // Determine weather type based on climate
        let potentialWeather = ["CLEAR"];
        if (temperature <= 0 && moisture > 0.3) potentialWeather.push("SNOW");
        if (temperature > 0 && moisture > 0.5) potentialWeather.push("RAIN");
        if (moisture > 0.7) potentialWeather.push("STORM");
        if (temperature > 25 && moisture < 0.2) potentialWeather.push("DUST_STORM");

        let weatherType = "CLEAR";
        const climateVulnerability = 0.5; // Placeholder
        const envFactor = totalEnvSeverity * 0.05;
        if (Math.random() < (climateVulnerability * 0.1 + envFactor) && potentialWeather.length > 1) {
            const adverseTypes = potentialWeather.filter(w => w !== "CLEAR");
            weatherType = adverseTypes[Math.floor(Math.random() * adverseTypes.length)];
        }

        const effects = WEATHER_EFFECTS[weatherType] || WEATHER_EFFECTS["CLEAR"];

        chunk.weather = {
            type: weatherType,
            windSpeed: Math.random() * 100, // km/h
            windDirection: Math.random() * 360, // degrees
            duration: 60 + Math.random() * 120, // Lasts 1-3 minutes
            intensity: Math.random(), // 0-1 scale
            ...effects // Spread the effects into the weather object
        };
    }

    /**
     * Overrides the weather for all chunks within a given region.
     * @param {Region} region The region to affect.
     * @param {string} weatherType The type of weather to set (e.g., "CLEAR").
     */
    setWeatherInRegion(region, weatherType) {
        if (!WEATHER_TYPES.includes(weatherType)) {
            console.error(`Invalid weather type specified for control: ${weatherType}`);
            return;
        }

        // Find all chunks within this region
        // This is a simplified approach; a more robust solution would use spatial partitioning.
        worldState.voxelWorld.chunks.forEach(chunk => {
            const chunkCenterWorldPos = new THREE.Vector3(
                (chunk.position.x + 0.5) * CHUNK_SIZE,
                (chunk.position.y + 0.5) * CHUNK_SIZE,
                (chunk.position.z + 0.5) * CHUNK_SIZE
            );
            const { lat, lon } = this.vector3ToLatLon(chunkCenterWorldPos);

            // A simple distance check to see if the chunk is in the region
            const distance = worldState.greatCircleDistance(lat, lon, region.centroid[0], region.centroid[1]);
            if (distance <= region.radius) {
                chunk.weather = {
                    type: weatherType,
                    windSpeed: Math.random() * 20, // Gentle winds for controlled weather
                    windDirection: Math.random() * 360,
                    duration: 180, // Lasts for 3 minutes
                    intensity: 0.5
                };
            }
        });
    }
}
