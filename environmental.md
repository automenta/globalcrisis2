# Environmental Systems

## Dynamic Weather System
```typescript
interface WeatherSystem {
  currentConditions: {
    type: "CLEAR" | "RAIN" | "SNOW" | "STORM" | "DUST_STORM" | "FLOOD" | "ACID_RAIN" | "RADIOLOGICAL_FALLOUT";  // UPDATED
    intensity: number; // 0-1 scale
    duration: number; // turns remaining
  };
  effects: {
    visibilityModifier: number; // -1.0 to 1.0
    movementPenalty: number; // 0-1 scale
    threatAmplification: {
      domain: ThreatDomain;
      multiplier: number;
    }[];
    // NEW: Domain-specific weather effects
    cyberDisruption?: number;    // Signal interference
    radiologicalSpread?: number; // Contamination dispersion
    roboticMalfunction?: number; // Sensor/actuator failure rates
  };
  forecast: WeatherForecast[];
}

function applyWeatherEffects(unit: MilitaryUnit, weather: WeatherSystem) {
  // Visibility reduction
  unit.sensorRange *= (1 - weather.effects.visibilityModifier);
  
  // Movement speed penalty
  unit.movementSpeed *= (1 - weather.effects.movementPenalty);
  
  // Threat amplification
  threat.crossDomainImpacts.push(
    ...weather.effects.threatAmplification
  );
  
  // NEW: Robotic unit effects
  if (unit.type.includes("ROBOT") || unit.type === "DRONE") {
    unit.errorRate += weather.effects.roboticMalfunction || 0;
  }
  
  // NEW: Cyber disruption
  if (unit.capabilities.includes("CYBER_OPS")) {
    unit.effectiveness *= (1 - (weather.effects.cyberDisruption || 0));
  }
}

// Weather generation algorithm
function generateWeather(region: Region, globalClimate: number): WeatherSystem {
  const weatherTypes = ["CLEAR", "RAIN", "STORM", "SNOW"];
  if (region.attributes.climateVulnerability > 0.7) {
    weatherTypes.push("ACID_RAIN", "DUST_STORM");
  }
  if (region.threats.some(t => t.domain === "RAD")) {
    weatherTypes.push("RADIOLOGICAL_FALLOUT");
  }
  
  const weatherType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  const intensity = Math.min(1, region.attributes.climateVulnerability * globalClimate);
  
  return {
    currentConditions: {
      type: weatherType,
      intensity,
      duration: Math.floor(3 + Math.random() * 10) // 3-12 turns
    },
    effects: calculateWeatherEffects(weatherType, intensity),
    forecast: generateForecast(region, globalClimate),
    // NEW: Space weather integration
    spaceWeather: {
      solarFlareProbability: Math.random() * region.attributes.climateVulnerability,
      radiationLevel: Math.random() * 0.5
    }
  };
}
```

## Terrain Modification
- **Dynamic Terrain**: Units with terraforming capabilities can modify elevation
- **Environmental Hazards**: Create or mitigate natural disaster zones
- **Resource Depletion**: Over-exploitation reduces resource yields
- **Climate Change**: Long-term environmental effects from industrial activity
- **Radiological Contamination**: Persistent environmental effects from radiological events
- **Robotic Terraforming**: Autonomous systems reshaping terrain for strategic advantage

## Ecosystem Simulation
- **Food Chain Interactions**: Biological threats affect ecosystem balance
- **Pollution Effects**: Environmental contamination impacts population health
- **Resource Renewal**: Natural regeneration rates for sustainable management
- **Biodiversity Index**: Measure of ecological health affecting threat evolution
- **Quantum Ecosystem Effects**: Entanglement in biological systems
- **Robotic Ecosystem Impact**: Autonomous systems affecting wildlife behavior