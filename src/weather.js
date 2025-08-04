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
    constructor() {
        // This could hold global weather parameters in the future
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
     * Generates a new weather state for a single region.
     * @param {Region} region - The region to generate weather for.
     */
    generateWeatherForRegion(region, totalEnvSeverity) {
        const weather = {
            windSpeed: Math.random() * 100, // km/h
            windDirection: Math.random() * 360, // degrees
            duration: 60 + Math.random() * 120, // Lasts 1-3 minutes
            intensity: Math.random() // 0-1 scale
        };

        // Higher vulnerability and higher ENV threat severity increase chance of adverse weather
        const climateFactor = region.attributes.climateVulnerability * 0.1;
        const envFactor = totalEnvSeverity * 0.05; // Each point of ENV severity adds 5% chance
        const chanceOfAdverseWeather = climateFactor + envFactor;

        if (Math.random() < chanceOfAdverseWeather) {
            // Pick a random adverse weather type
            weather.type = WEATHER_TYPES[Math.floor(Math.random() * (WEATHER_TYPES.length - 1)) + 1];
        } else {
            weather.type = "CLEAR";
        }

        region.weather = weather;
    }
}
