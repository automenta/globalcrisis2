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