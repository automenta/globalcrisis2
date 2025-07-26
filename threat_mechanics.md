# Threat Mechanics

## Threat Representation
```typescript
interface Threat {
  id: string;
  domain: ThreatDomain;
  type: "REAL" | "FAKE" | "UNKNOWN";  // Fake threats cause psych damage, unknown require investigation
  detectionRisk: number;               // 0-1 probability of being discovered
  investigationProgress: number;       // 0-100, only for unknown threats
  severity: number;
  visibility: number;
  spreadRate: number;
  effects: ThreatEffect[];
  crossDomainImpacts: {
    domain: ThreatDomain;
    multiplier: number;
  }[];
  // Domain-specific properties
  economicImpact?: {
    marketSector: "TECH" | "ENERGY" | "FINANCE" | "INFRASTRUCTURE";
    volatility: number; // 0-1 scale
    // Energy infrastructure accidents
    infrastructureType?: "NUCLEAR" | "PETROLEUM" | "GRID" | "RENEWABLE";
    accidentSeverity?: number; // 0-1 scale
    coverupDifficulty?: number; // 0-1 scale
  };
  biologicalProperties?: {
    incubationPeriod?: number;   // in days
    mortalityRate?: number;      // 0-1
    transmissionVectors?: string[]; // e.g., ["airborne", "waterborne"]
    // Pharmaceutical warfare properties
    addictionPotential?: number; // 0-1 scale
    dependencyRate?: number; // 0-1 scale, how quickly dependency develops
    contaminationMethods?: string[]; // e.g., "WATER_SUPPLY", "AIRBORNE", "FOOD_CHAIN"
  };
  cyberProperties?: {
    attackVector?: "NETWORK" | "PHYSICAL" | "SOCIAL";
    exploitComplexity?: number; // 0-1 scale
    zeroDay?: boolean;
  };
  environmentalProperties?: {
    temperatureSensitivity?: number; // 0-1 scale
    precipitationDependency?: number; // 0-1 scale
    // Weather, geological, and space events
    weatherEvents?: string[]; // e.g., ["HURRICANE", "DROUGHT", "ACID_RAIN"]
    geologicalEvents?: string[]; // e.g., ["EARTHQUAKE", "VOLCANO", "SUBSIDENCE", "TSUNAMI"]
    spaceWeatherEvents?: string[]; // e.g., ["SOLAR_FLARE", "RADIATION_STORM", "GEOMAGNETIC_STORM"]
    severityScale?: number; // 1-10 scale for event intensity
    // Construction and deployment contexts
    deploymentLocation?: "SURFACE" | "UNDERGROUND" | "OCEANIC" | "ATMOSPHERIC" | "ORBITAL";
    // Geoengineering and climate manipulation
    geoengineeringProjects?: string[]; // e.g., ["CLOUD_SEEDING", "SOLAR_RADIATION_MANAGEMENT", "CARBON_CAPTURE"]
    climateManipulation?: {
      targetTemperature?: number; // in degrees Celsius
      areaOfEffect?: number; // km²
      duration?: number; // turns
    };
  };
  quantumProperties?: {
    decryptionTime?: number; // seconds
    qubitCount?: number;
    entanglementLevel?: number; // 0-1 scale
    coherenceTime?: number; // seconds before decoherence
    quantumEffects?: QuantumEffect[]; // NEW
  };
  radiologicalProperties?: {
    halfLife?: number; // days
    contaminationRadius?: number; // km
    radiationType?: "ALPHA" | "BETA" | "GAMMA" | "NEUTRON";
    shieldingRequirements?: { // NEW
      material: string;
      thickness: number; // cm
    }[];
  };
  roboticProperties?: { // NEW
    autonomyLevel?: number; // 0-1 scale
    swarmIntelligence?: number; // 0-1 scale
    learningRate?: number; // 0-1 scale
    failureModes?: string[]; // e.g., ["SENSOR_FAILURE", "NAVIGATION_ERROR"]
  };
}

type ThreatDomain =
  | "CYBER"
  | "GEO"
  | "ENV"
  | "INFO"
  | "SPACE"
  | "WMD"
  | "BIO"
  | "ECON"
  | "QUANTUM"   // Quantum computing threats
  | "RAD"       // Radiological threats
  | "ROBOT";    // Robotics and autonomous systems

// NEW: Quantum-specific effects
type QuantumEffect =
  | "ENTANGLEMENT_DISRUPTION"  // Disrupts quantum communications
  | "SUPERPOSITION_EXPLOIT"    // Exploits quantum superposition for attacks
  | "QUANTUM_TUNNELING"        // Bypasses physical security
  | "DECOHERENCE_CASCADE";     // Causes widespread quantum system failures

interface ThreatEffect {
  target: "POPULATION" | "ECONOMY" | "INFRASTRUCTURE" | "PSYCHE" | "QUANTUM" | "ROBOTIC"; // UPDATED
  modifier: number; // -1.0 to 1.0
  // Population trauma types
  traumaType?: "ETHNIC" | "ORGAN_HARVEST" | "WAR_CRIME" | "DISPLACEMENT" | "RADIATION_SICKNESS"; // UPDATED
  severity: number; // 0-1 scale
  propagation: {
    type: "DIFFUSION" | "NETWORK" | "VECTOR" | "SOCIAL_MEDIA" | "QUANTUM_ENTANGLEMENT" | "SWARM_INTELLIGENCE"; // UPDATED
    rate: number;       // Propagation speed
    range: number;      // Effective radius in km
    persistence: number; // Duration of effect
  };
}

// NEW: Radiological decay model
function calculateRadiationDecay(threat: Threat, elapsedDays: number): number {
  if (threat.domain !== "RAD" || !threat.radiologicalProperties) return 0;
  
  const { halfLife } = threat.radiologicalProperties;
  const decayConstant = Math.LN2 / halfLife;
  return Math.exp(-decayConstant * elapsedDays);
}

// NEW: Quantum coherence model
function updateQuantumCoherence(threat: Threat, dt: number): void {
  if (threat.domain !== "QUANTUM" || !threat.quantumProperties) return;
  
  const props = threat.quantumProperties;
  if (props.coherenceTime === undefined) return;
  
  // Decoherence increases with time and threat severity
  const decoherenceRate = 0.01 * threat.severity;
  props.coherenceTime -= dt * decoherenceRate;
  
  // When coherence drops too low, quantum effects diminish
  if (props.coherenceTime < 1) {
    threat.severity *= 0.5;
    threat.visibility *= 0.8;
  }
}

// NEW: Robotic swarm evolution
function evolveSwarmIntelligence(threat: Threat, dt: number): void {
  if (threat.domain !== "ROBOT" || !threat.roboticProperties) return;
  
  const props = threat.roboticProperties;
  if (props.swarmIntelligence === undefined || props.learningRate === undefined) return;
  
  // Swarm intelligence grows over time but risks emergent behaviors
  props.swarmIntelligence = Math.min(1, props.swarmIntelligence + props.learningRate * dt);
  
  // Chance of developing failure modes as intelligence increases
  if (Math.random() < props.swarmIntelligence * 0.01) {
    const newFailure = ["SENSOR_FAILURE", "NAVIGATION_ERROR", "TARGETING_ERROR"][Math.floor(Math.random()*3)];
    if (!props.failureModes) props.failureModes = [];
    if (!props.failureModes.includes(newFailure)) {
      props.failureModes.push(newFailure);
    }
  }
}