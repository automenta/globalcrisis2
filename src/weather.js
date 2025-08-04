const WEATHER_TYPES = ["CLEAR", "RAIN", "STORM", "SNOW"];

class WeatherSystem {
    constructor() {
        // This could hold global weather parameters in the future
    }

    /**
     * Updates the weather for all regions.
     * @param {Region[]} regions - The array of regions to update.
     * @param {number} dt - Delta time.
     */
    update(regions, dt) {
        regions.forEach(region => {
            // If there's no weather or the duration is over, try to generate new weather
            if (!region.weather || region.weather.duration <= 0) {
                this.generateWeatherForRegion(region);
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
    generateWeatherForRegion(region) {
        // Higher vulnerability means a higher chance of non-clear weather
        const chanceOfAdverseWeather = region.attributes.climateVulnerability * 0.1;

        if (Math.random() < chanceOfAdverseWeather) {
            // Pick a random adverse weather type
            const weatherType = WEATHER_TYPES[Math.floor(Math.random() * (WEATHER_TYPES.length - 1)) + 1];
            region.weather = {
                type: weatherType,
                duration: 60 + Math.random() * 120 // Lasts 1-3 minutes
            };
        } else {
            region.weather = {
                type: "CLEAR",
                duration: 60 + Math.random() * 120 // Lasts 1-3 minutes
            };
        }
    }
}
