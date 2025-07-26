# World State Representation

## World State Interface
```typescript
interface WorldState {
  regions: Region[];
  factions: Faction[];
  currentTurn: number;
  globalMetrics: {
    stability: number;
    economy: number;
    trust: number;
  };
}

interface Region {
  id: string;
  population: PopulationPyramid;
  resources: ResourcePool;
  threats: ActiveThreat[];
  attributes: {
    climateVulnerability: number;
    techLevel: number;
  };
  // Spatial properties
  boundary: [number, number][]; // Polygon coordinates [longitude, latitude]
  centroid: [number, number];   // [longitude, latitude]
  elevation: number;            // Meters above sea level
}

interface PopulationPyramid {
  ageGroups: {
    youth: number;
    adults: number;
    elderly: number;
  };
  psychodynamics: {
    trust: number;
    fear: number;
    compliance: number;
    // Pharmaceutical warfare effects
    addictionLevel?: number; // 0-1 scale
    dependencyLevel?: number; // 0-1 scale
    contaminationExposure?: number; // 0-1 scale
  };
}
```

## Faction System
```typescript
enum FactionType {
  TECHNOOCRAT = "Evil Technocrat",
  MITIGATOR = "Hero Mitigator",
  NATION_STATE = "Nation-State",
  RESISTANCE = "Free Human Resistance",
  HERO_DOCTOR = "Hero Doctor/Scientist",
  PHARMA = "Pharma Conglomerate",
  CONTROLLED_OPPOSITION = "Controlled Opposition"
}

interface Faction {
  id: string;
  type: FactionType;
  resources: ResourcePool;
  objectives: Objective[];
  winConditions: {
    dominationThreshold?: number;   // % of world to control
    survivalThreshold?: number;     // Minimum stability level
    exposureCount?: number;          // Number of conspiracies to expose
    economicControlThreshold?: number; // % of resources to control
    populationControlThreshold?: number; // % population reduction
    allianceCount?: number;          // Number of alliances required
  };
  capabilities: {
    threatDeployment: boolean;
    investigation: boolean;
    influence: boolean;
    economicWarfare: boolean;
    cyberOperations: boolean;
    environmentalManipulation: boolean;
    spaceDominance: boolean;
    // NEW: Geoengineering and space weather capabilities
    geoengineering: boolean;          // For manipulating climate/geology
    spaceWeatherControl: boolean;     // For manipulating space weather
    // Faction-specific capabilities
    aiAssistedDesign: boolean;       // For TECHNOOCRAT and PHARMA
    mediaPropaganda: boolean;         // For CONTROLLED_OPPOSITION
    whistleblowerNetworks: boolean;   // For RESISTANCE and HERO_DOCTOR
    diplomaticImmunity: boolean;      // For NATION_STATE
  };
  // Spatial capabilities
  militaryUnits: MilitaryUnit[];
  satellites: Satellite[];
  sensorRange: number; // km
  movementSpeed: number; // multiplier
  // Deployment constraints
  deploymentConstraints: {
    maxUnits: number;     // Max units per region
    cooldown: number;     // Turns between deployments
    zoneRestrictions: string[]; // Allowed deployment zones
    // NEW: Deployment contexts
    deploymentContexts: ("SURFACE" | "UNDERGROUND" | "ORBITAL" | "AQUATIC")[];
    // NEW: Unit type restrictions
    unitTypeRestrictions?: MilitaryUnit['type'][];
  };
}

interface Objective {
  id: string;
  type: "TERRITORIAL" | "ECONOMIC" | "INFLUENCE" | "THREAT_MITIGATION" | "THREAT_DEPLOYMENT";
  target: string; // Region ID, Faction ID, or Threat ID
  progress: number; // 0-100
  requiredProgress: number;
  rewards: {
    resources?: ResourcePool;
    reputation?: number;
    unlock?: string; // Unlockable ability or unit
  };
}

interface ResourcePool {
  funds: number;
  intel: number;
  manpower: number;
  tech: number;
}

// Spatial entity interfaces
interface MilitaryUnit {
  id: string;
  factionId: string;
  type: "INFANTRY" | "TANK" | "AIRCRAFT" | "NAVAL" | "CYBER" | "DRONE" | 
        "AUTONOMOUS_GROUND" | "ROBOTIC_SWARM" | "QUANTUM_NODE" | 
        "RAD_DISPERSAL" | "TUNNELER" | "SPACE_PLATFORM";
  position: [number, number];   // [longitude, latitude]
  velocity: [number, number];   // [m/s east, m/s north]
  mass: number;                 // Kilograms
  energy: number;               // Joules (battery/fuel)
  autonomyLevel: number;        // 0-1 scale (0: remote, 1: fully autonomous)
  abilities: UnitAbility[];     // Faction-specific special abilities
}

interface Satellite {
  id: string;
  factionId: string;
  type: "COMMS" | "RECON" | "WEAPON" | "NAVIGATION";
  orbit: {
    semiMajorAxis: number;      // km
    eccentricity: number;
    inclination: number;        // degrees
    period: number;             // seconds
  };
  position: [number, number, number]; // ECEF coordinates [x, y, z] in km
  velocity: [number, number, number]; // km/s
  mass: number;                 // kg
  abilities: UnitAbility[];     // Faction-specific special abilities
  // Space weather vulnerabilities
  solarFlareVulnerability?: number; // 0-1 scale
  radiationSensitivity?: number;    // 0-1 scale
}
## Faction Details

### Evil Technocrats
- **Goal**: Depopulation/control
- **Abilities**: Advanced threat deployment, AI-assisted design, media blackouts
- **Perspective**: Cold, data-driven UI with profit dashboards
- **Win Condition**: Achieve depopulation without detection

### Hero Mitigators
- **Goal**: Investigation, threat neutralization
- **Abilities**: Investigation tools, threat neutralization
- **Perspective**: Focused on threat analysis and countermeasures
- **Win Condition**: Expose all threats

### Nation-States
- **Goal**: Diplomatic influence, military power
- **Abilities**: Diplomatic influence, military power, economic sanctions
- **Perspective**: Geopolitical strategy view
- **Win Condition**: Maintain stability and control over territory

### Free Human Resistance
- **Goal**: Expose/survive threats
- **Abilities**: Whistleblower networks, grassroots organizing, hack networks
- **Perspective**: Grassroots view with rumor maps
- **Win Condition**: Expose all conspiracies and survive

### Pharma Conglomerates
- **Goal**: Profit from crises, influence medical policies
- **Abilities**: Profit from cures/threats, influence medical policies
- **Perspective**: Profit-focused dashboards
- **Win Condition**: Achieve economic dominance through crisis profiteering

### Hero Doctors/Scientists
- **Goal**: Cure/investigate
- **Abilities**: Rapid testing, whistleblower alliances, medical research
- **Perspective**: Lab-focused UI with health metric overlays
- **Win Condition**: Develop cures for all active threats

### Controlled Opposition
- **Goal**: Sow confusion for hidden agendas
- **Abilities**: Media manipulation, deception tactics, creating fake dissent groups
- **Perspective**: Media influence networks
- **Win Condition**: Maintain control through misinformation

### Additional Notes:
- Factions can switch mid-game via "betrayal events"
- Multiplayer mode pits factions against each other
- Modders can add new factions like "Eco-Terrorists" or "AI Overlords"

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

# Physics Modeling

## Newtonian Mechanics Examples

### Military Unit Movement
```typescript
function updateTankMovement(tank: MilitaryUnit, terrainResistance: number, dt: number) {
  // Calculate net force (engine power - friction)
  const engineForce = 50000; // N (typical main battle tank)
  const frictionForce = terrainResistance * tank.mass * 9.8;
  const netForce = engineForce - frictionForce;
  
  // Update acceleration, velocity, position
  const acceleration = netForce / tank.mass;
  tank.velocity[0] += acceleration * dt * Math.cos(tank.heading);
  tank.velocity[1] += acceleration * dt * Math.sin(tank.heading);
  tank.position[0] += tank.velocity[0] * dt;
  tank.position[1] += tank.velocity[1] * dt;
  
  // Update energy (fuel consumption)
  tank.energy -= engineForce * 0.0001 * dt; // 0.0001 J/N
}
```

### Robotic Swarm Movement
```typescript
function updateSwarmMovement(swarm: MilitaryUnit, cohesion: number, dt: number) {
  // Calculate average velocity of nearby swarm units
  const center = swarm.centerOfMass; // [x, y] - calculated from swarm units
  const directionToCenter = [center[0] - swarm.position[0], center[1] - swarm.position[1]];
  const distanceToCenter = Math.hypot(...directionToCenter);

  // Normalize and scale by cohesion
  if (distanceToCenter > 0) {
    const normalizedDir = [directionToCenter[0]/distanceToCenter, directionToCenter[1]/distanceToCenter];
    const attractionForce = 100 * cohesion; // Newtons

    // Update velocity
    swarm.velocity[0] += attractionForce * normalizedDir[0] / swarm.mass * dt;
    swarm.velocity[1] += attractionForce * normalizedDir[1] / swarm.mass * dt;
  }

  // Damping to prevent infinite acceleration
  swarm.velocity[0] *= 0.99;
  swarm.velocity[1] *= 0.99;

  // Update position
  swarm.position[0] += swarm.velocity[0] * dt;
  swarm.position[1] += swarm.velocity[1] * dt;
}

// Geological event simulation
function simulateGeologicalEvent(region: Region, eventType: string, magnitude: number) {
  switch (eventType) {
    case "EARTHQUAKE":
      // Shake all units in region
      region.militaryUnits.forEach(unit => {
        unit.velocity[0] += (Math.random() - 0.5) * magnitude * 0.1;
        unit.velocity[1] += (Math.random() - 0.5) * magnitude * 0.1;
      });
      break;
      
    case "VOLCANO":
      // Create ash cloud that affects aircraft
      region.militaryUnits
        .filter(u => u.type === "AIRCRAFT")
        .forEach(unit => {
          unit.energy *= 0.8; // Ash reduces engine efficiency
        });
      break;
      
    case "TSUNAMI":
      // Push naval units
      region.militaryUnits
        .filter(u => u.type === "NAVAL")
        .forEach(unit => {
          unit.velocity[0] += magnitude * 0.2;
          unit.velocity[1] += magnitude * 0.2;
        });
      break;
  }
}
```

### Satellite Orbital Adjustment
```typescript
function adjustSatelliteOrbit(sat: Satellite, targetAltitude: number, dt: number) {
  const currentAlt = Math.sqrt(sat.position[0]**2 + sat.position[1]**2 + sat.position[2]**2);
  const deltaV = 0.1 * (targetAltitude - currentAlt); // Proportional control
  
  // Apply thrust in velocity direction
  const velocityDir = [
    sat.velocity[0] / Math.hypot(...sat.velocity),
    sat.velocity[1] / Math.hypot(...sat.velocity),
    sat.velocity[2] / Math.hypot(...sat.velocity)
  ];
  
  sat.velocity[0] += velocityDir[0] * deltaV;
  sat.velocity[1] += velocityDir[1] * deltaV;
  sat.velocity[2] += velocityDir[2] * deltaV;
  
  // Update orbital parameters
  updateOrbit(sat, dt);
}
```

## Orbital Mechanics
```typescript
const G = 6.67430e-11; // Gravitational constant
const EARTH_MASS = 5.972e24; // kg

function updateOrbit(satellite: Satellite, dt: number) {
  // Calculate distance from Earth center
  const r = Math.sqrt(
    satellite.position[0]**2 +
    satellite.position[1]**2 +
    satellite.position[2]**2
  );
  
  // Calculate gravitational force
  const Fg = G * EARTH_MASS * satellite.mass / r**2;
  
  // Direction vector towards Earth
  const dir = [
    -satellite.position[0]/r,
    -satellite.position[1]/r,
    -satellite.position[2]/r
  ];
  
  // Update velocity
  satellite.velocity[0] += dir[0] * Fg / satellite.mass * dt;
  satellite.velocity[1] += dir[1] * Fg / satellite.mass * dt;
  satellite.velocity[2] += dir[2] * Fg / satellite.mass * dt;
  
  // Update position
  satellite.position[0] += satellite.velocity[0] * dt;
  satellite.position[1] += satellite.velocity[1] * dt;
  satellite.position[2] += satellite.velocity[2] * dt;
  
  // Update orbital parameters
  satellite.orbit.semiMajorAxis = r;
  satellite.orbit.period = 2 * Math.PI * Math.sqrt(r**3 / (G * EARTH_MASS));
}
```

## Quantum Physics Modeling
```typescript
// Quantum state representation
interface QuantumState {
  qubits: number;
  entanglement: number; // 0-1 entanglement level
  coherenceTime: number; // ms
}

// Quantum decoherence effects
function applyQuantumDecoherence(state: QuantumState, environmentNoise: number, dt: number) {
  // Decoherence increases with noise and time
  const decoherenceRate = environmentNoise * 0.01; // % per ms
  state.coherenceTime -= dt * decoherenceRate;
  
  // When coherence time drops below threshold, quantum effects diminish
  if (state.coherenceTime < 100) {
    state.entanglement *= 0.9; // Rapid loss of entanglement
  }
}

// Quantum computing threat effects
function applyQuantumThreat(threat: Threat, dt: number) {
  if (threat.domain === "QUANTUM") {
    const quantumProps = threat.quantumProperties;
    if (quantumProps) {
      // Increase decryption capability over time
      quantumProps.decryptionTime = Math.max(1, quantumProps.decryptionTime * (1 - 0.01 * dt));
      
      // Entanglement with other quantum systems
      threat.crossDomainImpacts.forEach(impact => {
        if (impact.domain === "CYBER") {
          impact.multiplier += 0.1 * dt;
        }
      });
    }
  }
}
```

## Energy Systems
```typescript
// Military unit energy consumption modifiers
const UNIT_ENERGY_MODIFIERS = {
  "INFANTRY": 1.0,
  "TANK": 1.8,
  "AIRCRAFT": 3.0,
  "NAVAL": 2.5,
  "CYBER": 0.5,
  "DRONE": 1.2,
  "QUANTUM_NODE": 5.0,
  "RAD_DISPERSAL": 2.0,
  "ROBOTIC_SWARM": 1.5,  // NEW
  "AUTONOMOUS_GROUND": 2.2  // NEW
};

interface EnergySystem {
  capacity: number;       // Max energy storage (Joules)
  current: number;        // Current energy
  rechargeRate: number;   // Joules per second
  consumptionRate: number;// Joules per second during operation
  // NEW: Robotic energy systems
  autonomyMode?: "SOLAR" | "BATTERY" | "NUCLEAR";
  rechargeEfficiency?: number; // 0-1
}

function updateEnergy(system: EnergySystem, isActive: boolean, dt: number) {
  if (isActive) {
    system.current -= system.consumptionRate * dt;
  } else {
    // NEW: Different recharge behaviors
    let effectiveRate = system.rechargeRate;
    if (system.autonomyMode === "SOLAR") {
      effectiveRate *= getSolarEfficiency();
    }
    system.current = Math.min(
      system.capacity,
      system.current + effectiveRate * dt * (system.rechargeEfficiency || 1)
    );
  }
}

// NEW: Radiological energy systems
function updateRadiationEnergy(system: EnergySystem, halfLife: number, dt: number) {
  // Radioactive decay energy generation
  const decayEnergy = 0.001 * system.capacity * (1 - Math.exp(-0.693 * dt / halfLife));
  system.current = Math.min(system.capacity, system.current + decayEnergy);
}
## Physics-Based Threat Propagation

### Biological Threats
- **Transmission Models**: Airborne, waterborne, vector-borne diffusion
- **Health Effects**: Mortality rates based on age cohorts and health infrastructure
- **Example**: Virus spread via fluid dynamics simulation with population density

### Cyber Threats
- **Network Propagation**: Node-to-node infection models
- **AI-Driven Attacks**: Adaptive malware using machine learning
- **Example**: Botnet growth modeled as network contagion

### Environmental Threats
- **Atmospheric Dispersion**: Gaussian plume models for aerosol threats
- **Geological Events**: Finite element analysis for earthquake/tsunami impacts
- **Example**: Radioactive cloud dispersion with wind patterns

### Quantum Effects
- **Entanglement Propagation**: Non-local correlation models
- **Decoherence Waves**: Probability field collapse simulations
- **Example**: Quantum hacking wavefront propagation

### Robotic Systems
- **Swarm Movement**: Boids algorithm with obstacle avoidance
- **Autonomy Failure**: Cascading error propagation models
- **Example**: Drone swarm coordination physics

These physics models enable realistic simulation of threat propagation across all domains.

# Cross-Domain Interactions

## Interaction Matrix
| Domain Pair | Interaction Effect | Example |
|-------------|-------------------|---------|
| Cyber + Info | 1.5x disinformation spread | AI-generated deepfakes accelerate propaganda |
| Env + Geo | 2.0x migration effects | Drought triggers border conflicts |
| WMD + Space | 3.0x detection risk | Orbital nukes increase geopolitical tension |
| Economic + Cyber | 0.5x recovery time | Ransomware extends recession duration |
| Space + Cyber | 2.2x disruption | Satellite hack disables global comms |
| Geo + Space | 1.8x escalation | Anti-satellite test sparks diplomatic crisis |
| Bio + Economic | 1.7x market panic | Lab leak causes biotech stock crash |
| Info + Economic | 2.5x volatility | Fake news triggers flash market crash |
| Quantum + Cyber | 3.0x decryption | Quantum computers break encryption in hours |
| Rad + Env | 1.8x contamination | Dirty bombs create long-term ecological damage |
| Robot + Cyber | 2.5x autonomy | Hacked robots turn against owners |
| Robot + Info | 1.7x deception | Robot networks spread disinformation |
| Robot + Bio | 3.0x horror | Robotic organ harvesting operations |

## Interaction Algorithm
```typescript
function calculateCrossImpact(threatA: Threat, threatB: Threat): number {
  // Base effect from threat severities
  const baseEffect = threatA.severity * threatB.severity;
  
  // Domain matrix multiplier
  const domainMultiplier = DOMAIN_MATRIX[threatA.domain][threatB.domain];
  
  // Domain-specific synergy multipliers
  const synergy = threatA.crossDomainImpacts
    .find(i => i.domain === threatB.domain)?.multiplier || 1.0;
  
  // Environmental modifiers based on region attributes
  const regionModifier = calculateRegionModifier(threatA.region, threatB.region);
  
  // Temporal decay factor for long-term threats
  const timeFactor = Math.exp(-0.1 * Math.abs(threatA.age - threatB.age));
  
  return baseEffect * domainMultiplier * synergy * regionModifier * timeFactor;
}

// Helper function to calculate region-specific modifiers
function calculateRegionModifier(regionA: Region, regionB: Region): number {
  // Calculate distance between regions
  const distance = calculateDistance(regionA.centroid, regionB.centroid);
  
  // Shared border multiplier
  const sharedBorder = regionsShareBorder(regionA, regionB) ? 1.5 : 1.0;
  
  // Climate vulnerability multiplier
  const climateFactor = 1 + (regionA.attributes.climateVulnerability * 
                            regionB.attributes.climateVulnerability);
  
  return sharedBorder * climateFactor / (1 + distance/1000);
}

# Action System

## Action Types
```mermaid
flowchart LR
  A[Player Actions] --> B[Threat Actions]
  A --> C[Influence Actions]
  A --> D[Investigation Actions]
  A --> E[Economic Actions]
  A --> F[Quantum Actions]      // NEW
  A --> G[Radiological Actions] // NEW
  A --> H[Robotic Actions]      // NEW
  
  B --> I[Deploy Threat]
  B --> J[Amplify Threat]
  B --> K[Modify Threat]
  
  C --> L[Lobby Faction]
  C --> M[Spread Disinformation]
  C --> N[Form Alliance]
  
  D --> O[Investigate Threat]
  D --> P[Uncover Truth]
  D --> Q[Counter Propaganda]
  
  E --> R[Sanction Region]
  E --> S[Invest in Infrastructure]
  E --> T[Manipulate Markets]
  
  F --> U[Entangle Systems]     // NEW
  F --> V[Quantum Decrypt]      // NEW
  F --> W[Induce Decoherence]   // NEW
  
  G --> X[Deploy Contamination] // NEW
  G --> Y[Contain Radiation]    // NEW
  G --> Z[Amplify Half-Life]    // NEW
  
  H --> AA[Swarm Command]       // NEW
  H --> AB[Autonomy Override]   // NEW
  H --> AC[Robotic Sabotage]    // NEW
  
  I --> AD[Geoengineering]      // NEW
  I --> AE[Climate Control]     // NEW
```

## Action Interface
```typescript
interface Action {
  id: string;
  type: "THREAT" | "INFLUENCE" | "INVESTIGATION" | "ECONOMIC" | "QUANTUM" | "RADIOLOGICAL" | "ROBOTIC" | "ENVIRONMENTAL"; // UPDATED
  name: string;
  description: string;
  resourceCost: ResourcePool;
  successProbability: number; // 0-1
  effects: {
    target: "REGION" | "FACTION" | "THREAT" | "QUANTUM_SYSTEM" | "ROBOTIC_NETWORK"; // UPDATED
    modifier: number; // -1.0 to 1.0
    duration: number; // turns
  }[];
  cooldown: number; // turns
  requiredCapabilities: (keyof Faction['capabilities'])[];
}

// Quantum-specific actions
const QuantumActions: Action[] = [
  {
    id: "quantum_entangle",
    type: "QUANTUM",
    name: "Entangle Systems",
    description: "Create quantum entanglement between systems for coordinated attacks",
    resourceCost: { funds: 500, intel: 300, tech: 400 },
    successProbability: 0.7,
    effects: [
      { target: "QUANTUM_SYSTEM", modifier: 0.3, duration: 5 }
    ],
    cooldown: 3,
    requiredCapabilities: ["quantumOperations"]
  },
  {
    id: "quantum_decrypt",
    type: "QUANTUM",
    name: "Quantum Decryption",
    description: "Break encryption using quantum computing power",
    resourceCost: { funds: 800, intel: 500, tech: 700 },
    successProbability: 0.6,
    effects: [
      { target: "CYBER", modifier: -0.4, duration: 3 }
    ],
    cooldown: 5,
    requiredCapabilities: ["quantumOperations"]
  }
];

// Environmental manipulation actions
const EnvironmentalActions: Action[] = [
  {
    id: "geoengineering",
    type: "ENVIRONMENTAL",
    name: "Geoengineering Project",
    description: "Deploy large-scale climate manipulation technology",
    resourceCost: { funds: 1500, tech: 1200 },
    successProbability: 0.65,
    effects: [
      { target: "ENV", modifier: -0.5, duration: 8 }
    ],
    cooldown: 10,
    requiredCapabilities: ["geoengineering"]
  },
  {
    id: "weather_control",
    type: "ENVIRONMENTAL",
    name: "Weather Control",
    description: "Manipulate local weather patterns for strategic advantage",
    resourceCost: { funds: 1000, tech: 800 },
    successProbability: 0.7,
    effects: [
      { target: "REGION", modifier: 0.4, duration: 5 }
    ],
    cooldown: 7,
    requiredCapabilities: ["spaceWeatherControl"]
  }
];

// Radiological-specific actions
const RadiologicalActions: Action[] = [
  {
    id: "rad_contain",
    type: "RADIOLOGICAL",
    name: "Contain Radiation",
    description: "Deploy shielding to contain radiological contamination",
    resourceCost: { funds: 300, manpower: 200, tech: 100 },
    successProbability: 0.8,
    effects: [
      { target: "RAD", modifier: -0.5, duration: 4 }
    ],
    cooldown: 2,
    requiredCapabilities: ["radiologicalContainment"]
  }
];

// Robotic-specific actions
const RoboticActions: Action[] = [
  {
    id: "swarm_command",
    type: "ROBOTIC",
    name: "Swarm Command",
    description: "Issue coordinated commands to robotic swarms",
    resourceCost: { funds: 400, intel: 300, tech: 200 },
    successProbability: 0.75,
    effects: [
      { target: "ROBOTIC_NETWORK", modifier: 0.4, duration: 4 }
    ],
    cooldown: 3,
    requiredCapabilities: ["roboticOperations"]
  }
];
## New Action Types

### Quantum Actions
- **Entangle Systems**: Create quantum entanglement between systems for coordinated attacks
- **Quantum Decrypt**: Break encryption using quantum computing power
- **Induce Decoherence**: Disrupt quantum systems by accelerating decoherence

### Radiological Actions
- **Deploy Contamination**: Spread radiological contamination in a region
- **Contain Radiation**: Deploy shielding to contain radiological contamination
- **Amplify Half-Life**: Increase the persistence of radiological threats

### Robotic Actions
- **Swarm Command**: Issue coordinated commands to robotic swarms
- **Autonomy Override**: Take control of autonomous robotic systems
- **Robotic Sabotage**: Sabotage robotic systems to cause malfunctions

### Environmental Actions
- **Geoengineering Project**: Deploy large-scale climate manipulation technology
- **Weather Control**: Manipulate local weather patterns for strategic advantage

### Cross-Domain Actions
- **Threat Evolution**: AddDomainInteraction() for creating new domain synergies
- **Narrative Chains**: OnCascadeEvent(callback) for triggering event sequences
- **Physics Simulations**: AddPhysicsModel() for custom physics interactions

### Examples:
- Cyber deepfake + info propaganda = societal coup
- Quantum + cyber = undetectable attacks
- Environmental failure → economic downturn → geopolitical war
- Radiological event → migration crisis → faction conflict