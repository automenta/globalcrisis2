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
    }

    /**
     * Updates the weather for all regions.
     * @param {Region[]} regions - The array of regions to update.
     * @param {number} dt - Delta time.
     * @param {number} totalEnvSeverity - The sum of severity of all ENV threats.
     */
    update(regions, dt, totalEnvSeverity = 0) {
        regions.forEach(region => {
            // If there's no weather or the duration is over, try to generate new weather
            if (!region.weather || region.weather.duration <= 0) {
                this.generateWeatherForRegion(region, totalEnvSeverity);
            } else {
                // Otherwise, just tick down the duration
                region.weather.duration -= dt;
            }
        });
    }

    /**
     * Generates a new weather state for a single region based on climate data.
     * @param {Region} region - The region to generate weather for.
     * @param {number} totalEnvSeverity - The sum of severity of all ENV threats.
     */
    generateWeatherForRegion(region, totalEnvSeverity) {
        const climateData = this.climateGrid.getDataAt(region.centroid[0], region.centroid[1]);
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

        // Higher vulnerability and higher ENV threat severity increase chance of adverse weather
        const climateFactor = region.attributes.climateVulnerability * 0.1;
        const envFactor = totalEnvSeverity * 0.05; // Each point of ENV severity adds 5% chance
        const chanceOfAdverseWeather = climateFactor + envFactor;

        if (Math.random() < chanceOfAdverseWeather && potentialWeather.length > 1) {
            // Pick a random adverse weather type from the potential list
            const adverseTypes = potentialWeather.filter(w => w !== "CLEAR");
            weather.type = adverseTypes[Math.floor(Math.random() * adverseTypes.length)];
        } else {
            weather.type = "CLEAR";
        }

        // Special case for radiological fallout, can happen anywhere if RAD threats are present
        // This part is not implemented yet, as it requires access to the full threat list.
        // We can add it later if needed.

        region.weather = weather;
    }
}
