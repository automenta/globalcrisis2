Simulation/strategy/war game, prioritizing performance on commodity PCs (e.g., Intel i5/i7 or AMD equivalent, 16GB RAM, GTX 1660/RTX 3050 GPU) to ensure smooth single-player operation at 60 FPS with 1080p resolution and medium settings. The core architecture remains Sparse Voxel Octrees (SVOs) for efficient storage and rendering, but with enhanced optimizations like aggressive Level of Detail (LOD), zoned simulation throttling, and procedural on-demand generation to minimize CPU/GPU load. Multiplayer potential is preserved via a client-server model (e.g., using WebSockets or UDP for low-latency sync), where servers handle shared state, but single-player runs entirely locally without network overhead, simulating AI opponents or neutral entities.

The planet scale stays at ~50 km radius (~31,400 km² surface) for complex gameplay, but voxel resolution and simulation depth are dynamically scaled based on hardware detection (e.g., auto-reduce to 2m³ base voxels on lower-end PCs). This allows human-scale details (e.g., 10m buildings) while ensuring feasibility—total active memory footprint targets <8GB, with CPU usage <50% during typical play. Testing assumptions are based on Unity or Godot engine implementations, leveraging multithreading and GPU acceleration.

### Planet Structure and Generation

Generation is procedural and lazy-loaded to avoid upfront costs. Only player-visible or interacted chunks are fully realized, reducing initial load times to <30 seconds.

- **Orbit**: Thinned to ~2-5 km thick, with sparser procedural spawns (e.g., 1-2% voxel occupancy). Orbital mechanics use precomputed trajectories for entities, updated at 1-5 Hz globally.

- **Atmosphere**: Reduced to 3-5 km thick, with weather simulated via 2D heightmaps projected onto voxels (e.g., cloud layers as billboards at distance). Density gradients use simple linear falloff.

- **Surface (Land and Water)**: Core layer at ~50-100m thick. Biomes generated with fewer noise octaves (3-4) for faster computation. Water uses a hybrid grid: voxel-based near players for interaction, wave equation simulation elsewhere at low res.

- **Underground**: Depth capped at 5 km for performance (still deep enough for D.U.M.B.s spanning 1-2 km). Procedural features like caves use seeded noise with early termination for unexplored areas.

Revised Generation Process:

1. Use a lower-res cubed-sphere grid (e.g., 64x64 faces) for base topology.
2. Generate on-demand: When a chunk loads, apply noise locally with caching.
3. Erosion/water simulation runs in background threads, batched over frames to avoid hitches.

This ensures single-player worlds load progressively, with no stutters during exploration.

### Voxel System

Voxels remain 1m³ base (configurable to 2m³), stored in SVOs with deeper compression (e.g., run-length encoding for uniform regions like ocean depths).

- **Storage**: Target <4GB for the entire planet via sparsity (e.g., underground mostly empty/collapsed until dug). Unloaded chunks serialize to disk for seamless saving.

- **Dynamic Updates**: Limit edits to 100-500 voxels/frame. Use dirty flags for mesh regeneration only on changes. LOD merges voxels at distance (e.g., 16m³ beyond 500m).

- **Granularity**: Supports human-scale (e.g., 5m roads as voxel strips with pathfinding overlays). For performance, auto-merge adjacent identical voxels into larger blocks during idle frames.

### Deployable/Autonomous Entity Types

Entity count capped at 1,000-5,000 active globally in single-player (e.g., via pooling and sleep states for distant units). ECS architecture includes a performance profiler to throttle AI.

| Entity Type             | Revised Description          | Autonomy/Deployment                                | Optimization                                                                  |
| ----------------------- | ---------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Static Deployables**  | Voxel-integrated structures. | Manual deployment; no AI.                          | Pre-baked meshes for common buildings; lazy voxel integration.                |
| **Mobile Units**        | AI-driven agents.            | Deploy from bases; pathfinding batched every 0.5s. | LOD behaviors: Distant units simulate at 1Hz, aggregate into squads.          |
| **Orbital Assets**      | Space entities.              | Autonomous orbits.                                 | Simplified physics; offloaded to GPU compute shaders.                         |
| **Biological Entities** | Ecosystem agents.            | Procedural spawning/migration.                     | Cull off-screen; use flock simulations for herds to reduce per-entity checks. |

In single-player, AI uses behavior trees with priority queuing (e.g., player-near entities update at 30Hz, others at 5Hz). Multiplayer syncs entity deltas only, reducing bandwidth.

### Pluggable Properties and Systems

Systems are modular and throttled: Global updates run at 1-10Hz, local (player vicinity) at 30Hz. Plugins can self-optimize via config files (e.g., disable high-fidelity modes).

| System              | Revised Description         | Pluggability             | Performance Tweaks                                                                                           |
| ------------------- | --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Physical**        | Destruction/fluids/gravity. | Custom forces via hooks. | Proximity-based: Full sim in 200m radius; approximations elsewhere (e.g., no fluid flow in unloaded chunks). |
| **Social**          | Factions/morale.            | AI/diplomacy extensions. | Event-driven: Only recompute on interactions.                                                                |
| **Economic**        | Resources/trading.          | Scriptable markets.      | Batch processing: Update chains every 5s; use voxel tags for passive yields.                                 |
| **Biological**      | Growth/diseases.            | Species data files.      | Cellular automata on GPU; skip cycles in stable areas.                                                       |
| **Climate/Weather** | Temp/rain/seasons.          | Modular weathers.        | 2D simulation grid (1km resolution) projected to voxels; affects only loaded areas.                          |

Multithreading ensures systems parallelize (e.g., physics on 4-6 cores). Single-player disables network serialization overhead.

### Depth for Underground/Undersea Bases (D.U.M.B.s)

Depth remains viable at 5 km, but with zoned loading: Only excavated areas stay in memory. Pressure/heat simulations use lookup tables instead of per-voxel computes. Bases load as "instances" with interior high-res voxels, exteriors low-res for overview maps.

### Feasible Resolution for Semi-Realistic Realtime Physics Updates

- **Resolution**: Dynamic LOD: 1m³ near player (100m radius), scaling to 8m³ at 1km, 64m³ globally. Active voxels per frame: ~10⁵-10⁶, feasible on commodity hardware.
- **Physics**: Approximations include rigid body for small scales, particle systems for debris. Updates multi-threaded and zoned—e.g., global gravity at low freq, local collisions at high. Frame budget: <10ms physics tick.
- **Optimization Suite**:
    - Chunking: 32x32x32 voxel chunks, loaded in a 5x5x5 grid around player (~160 chunks max).
    - Culling: Frustum/occlusion for rendering; spatial partitioning (octrees) for queries.
    - Hardware Adaptation: Runtime profiling adjusts entity caps, sim rates (e.g., halve on detected low FPS).
    - Single-Player Boost: No sync overhead; AI can pause in unexplored regions.

Benchmarks (estimated): Exploration at 60 FPS, intense battles (100 entities) at 45-60 FPS on target hardware.

### 3D Rendering and UI Interaction

- **Rendering**: GPU-focused—Marching Cubes on compute shaders for meshes, ray marching for atmospheres at reduced samples (4-8). Fallback to rasterization on weaker GPUs. Global illumination via baked probes + screen-space effects.
- **UI Interaction**: Streamlined for performance—raycasts limited to screen center, UI elements batched. Single-player includes pause/resume for heavy computations. Minimap uses 2D projection with LOD textures.

### Scale Considerations

- **Overall Scale**: 50 km radius balances complexity (e.g., multi-continent wars) with load—full planet traversal takes ~hours in-game, but fast travel via orbitals.
- **Granularity vs. Performance**: Human-scale details preserved, but with auto-optimizations (e.g., merge roads into textures at distance).
- **Single-Player Focus**: Runs standalone; multiplayer as optional mode (host local server or connect to dedicated). This ensures "ultimate success" by making the game accessible and engaging solo, with scalable depth for groups.

# World State Representation

This document describes the core data structures and systems used to represent the game world in ThreatForge. It covers the global `WorldState`, detailed `Region` and `Faction` interfaces, and the underlying physics and environmental models that drive the simulation.

## World State Interface

```typescript
interface WorldState {
    regions: Region[]; // An array of all geographical regions in the game world.
    factions: Faction[]; // An array of all active factions in the simulation.
    currentTurn: number; // The current turn number in the simulation, advancing game time.
    globalMetrics: {
        // Key performance indicators for the entire world.
        stability: number; // Overall global stability (0-1 scale, higher is more stable).
        economy: number; // Global economic health (0-1 scale, higher is stronger).
        trust: number; // Global population trust in institutions (0-1 scale, higher is more trusting).
    };
}

// Unified Action System Implementation
const DomainActions: Record<string, Action[]> = {
    QUANTUM: [
        {
            id: 'quantum_entangle',
            type: 'QUANTUM',
            name: 'Entangle Systems',
            description: 'Create quantum entanglement for coordinated attacks',
            resourceCost: { funds: 500, intel: 300, tech: 400 },
            successProbability: 0.7,
            effects: [{ target: 'QUANTUM_SYSTEM', modifier: 0.3, duration: 5 }],
            cooldown: 3,
            requiredCapabilities: ['quantumOperations'],
        },
        {
            id: 'quantum_sensor_jam',
            type: 'QUANTUM',
            name: 'Quantum Sensor Jam',
            description: 'Disrupt enemy sensors using quantum interference',
            resourceCost: { funds: 600, tech: 500 },
            successProbability: 0.65,
            effects: [{ target: 'SPACE', modifier: -0.5, duration: 4 }],
            cooldown: 4,
            requiredCapabilities: ['quantumOperations'],
        },
    ],
    RADIOLOGICAL: [
        {
            id: 'radiological_cleanup',
            type: 'RADIOLOGICAL',
            name: 'Radiological Cleanup',
            description: 'Decontaminate areas affected by radiation',
            resourceCost: { funds: 800, manpower: 400, tech: 300 },
            successProbability: 0.75,
            effects: [{ target: 'RAD', modifier: -0.6, duration: 6 }],
            cooldown: 5,
            requiredCapabilities: ['radiologicalContainment'],
        },
    ],
    ROBOTIC: [
        {
            id: 'swarm_coordination',
            type: 'ROBOTIC',
            name: 'Swarm Coordination',
            description: 'Enhance robotic swarm intelligence',
            resourceCost: { funds: 450, tech: 350 },
            successProbability: 0.8,
            effects: [
                { target: 'ROBOTIC_NETWORK', modifier: 0.5, duration: 5 },
            ],
            cooldown: 3,
            requiredCapabilities: ['roboticCommand'],
        },
    ],
    INFO: [
        {
            id: 'deepfake_campaign',
            type: 'INFO',
            name: 'Deepfake Campaign',
            description: 'Spread manipulated media to influence populations',
            resourceCost: { intel: 400, tech: 300 },
            successProbability: 0.7,
            effects: [{ target: 'POPULATION', modifier: -0.4, duration: 4 }],
            cooldown: 4,
            requiredCapabilities: ['misinformationCampaigns'],
        },
    ],
    ECON: [
        {
            id: 'targeted_sanctions',
            type: 'ECON',
            name: 'Targeted Sanctions',
            description: 'Cripple enemy economy through financial restrictions',
            resourceCost: { funds: 700, influence: 400 },
            successProbability: 0.65,
            effects: [{ target: 'ECONOMY', modifier: -0.5, duration: 6 }],
            cooldown: 5,
            requiredCapabilities: ['economicSanctions'],
        },
    ],
};

// Environmental manipulation actions
const EnvironmentalActions: Action[] = [
    {
        id: 'geoengineering',
        type: 'ENVIRONMENTAL',
        name: 'Geoengineering Project',
        description: 'Deploy large-scale climate manipulation technology',
        resourceCost: { funds: 1500, tech: 1200 },
        successProbability: 0.65,
        effects: [{ target: 'ENV', modifier: -0.5, duration: 8 }],
        cooldown: 10,
        requiredCapabilities: ['geoengineering'],
    },
    {
        id: 'weather_control',
        type: 'ENVIRONMENTAL',
        name: 'Weather Control',
        description:
            'Manipulate local weather patterns for strategic advantage',
        resourceCost: { funds: 1000, tech: 800 },
        successProbability: 0.7,
        effects: [{ target: 'REGION', modifier: 0.4, duration: 5 }],
        cooldown: 7,
        requiredCapabilities: ['spaceWeatherControl'],
    },
];

const EnvironmentalDisasters = [
    {
        id: 'mega_storm',
        triggerConditions: (region: Region) =>
            region.attributes.climateVulnerability > 0.7 &&
            region.attributes.temperature > 30,
        effects: {
            infrastructureDamage: 0.6,
            populationDisplacement: 0.8,
            economicImpact: 0.7,
            duration: 8, // turns
        },
    },
    {
        id: 'desertification',
        triggerConditions: (region: Region) =>
            region.attributes.precipitation < 500 &&
            region.attributes.agriculturalIntensity > 0.6,
        effects: {
            agriculturalYield: -0.9,
            waterScarcity: 0.7,
            migrationTrigger: 0.5,
            duration: 15, // turns
        },
    },
];

// Radiological-specific actions
const RadiologicalActions: Action[] = [
    {
        id: 'rad_contain',
        type: 'RADIOLOGICAL',
        name: 'Contain Radiation',
        description: 'Deploy shielding to contain radiological contamination',
        resourceCost: { funds: 300, manpower: 200, tech: 100 },
        successProbability: 0.8,
        effects: [{ target: 'RAD', modifier: -0.5, duration: 4 }],
        cooldown: 2,
        requiredCapabilities: ['radiologicalContainment'],
    },
];

// Robotic-specific actions
const RoboticActions: Action[] = [
    {
        id: 'swarm_command',
        type: 'ROBOTIC',
        name: 'Swarm Command',
        description: 'Issue coordinated commands to robotic swarms',
        resourceCost: { funds: 400, intel: 300, tech: 200 },
        successProbability: 0.75,
        effects: [{ target: 'ROBOTIC_NETWORK', modifier: 0.4, duration: 4 }],
        cooldown: 3,
        requiredCapabilities: ['roboticOperations'],
    },
];

function handleRadiationContainment(region: Region, action: Action): void {
    const containmentEfficiency = calculateContainmentEfficiency(
        region.techLevel,
        action.resourceCost.tech
    );

    region.threats.forEach((threat) => {
        if (threat.domain === 'RAD') {
            threat.severity *= 1 - containmentEfficiency;
            threat.radiologicalProperties!.halfLife *= 0.8;
        }
    });

    // Educational effect
    if (containmentEfficiency > 0.7) {
        region.population.psychodynamics.trust += 0.1;
    }
}

const EconomicActions: Action[] = [
    {
        id: 'currency_manipulation',
        type: 'ECON',
        name: 'Currency Manipulation',
        description: "Devalue opponent's currency to trigger inflation",
        resourceCost: { funds: 700, influence: 500 },
        successProbability: 0.65,
        effects: [
            {
                target: 'ECONOMY',
                modifier: -0.6,
                duration: 8,
                cascadeEffects: ['MARKET_CRASH', 'HYPERINFLATION'],
            },
        ],
        cooldown: 10,
    },
    {
        id: 'supply_chain_attack',
        type: 'ECON',
        name: 'Supply Chain Attack',
        description: 'Disrupt critical resource distribution networks',
        resourceCost: { intel: 400, tech: 300 },
        successProbability: 0.75,
        effects: [
            {
                target: 'INFRASTRUCTURE',
                modifier: -0.7,
                duration: 6,
                cascadeEffects: ['SHORTAGES', 'ECONOMIC_STAGNATION'],
            },
        ],
        cooldown: 8,
    },
];

interface Region {
    id: string; // Unique identifier for the region.
    population: PopulationPyramid; // Demographic and psychological data for the region's inhabitants.
    resources: ResourcePool; // Available resources within the region (e.g., funds, manpower).
    threats: ActiveThreat[]; // An array of active threats present in this region.
    attributes: {
        // Intrinsic properties of the region.
        climateVulnerability: number; // 0-1 scale, how susceptible the region is to climate-related threats.
        techLevel: number; // 0-1 scale, the technological advancement level of the region.
    };
    // Spatial properties
    boundary: [number, number][]; // Polygon coordinates [longitude, latitude] defining the geographical shape of the region.
    centroid: [number, number]; // [longitude, latitude] coordinates of the region's geographical center.
    elevation: number; // Meters above sea level, representing the average elevation of the region.
}

interface PopulationPyramid {
    ageGroups: {
        // Distribution of the population across different age demographics.
        youth: number; // Percentage or count of youth.
        adults: number; // Percentage or count of adults.
        elderly: number; // Percentage or count of elderly.
    };
    psychodynamics: {
        // Psychological state and societal dynamics of the population.
        trust: number; // 0-1 scale, population's trust in authorities and institutions.
        fear: number; // 0-1 scale, level of fear or anxiety within the population.
        compliance: number; // 0-1 scale, willingness of the population to comply with directives.
        // Pharmaceutical warfare effects
        addictionLevel?: number; // 0-1 scale, level of addiction within the population due to biological/pharmaceutical threats.
        dependencyLevel?: number; // 0-1 scale, how quickly dependency develops on a substance.
        contaminationExposure?: number; // 0-1 scale, level of exposure to contaminants.
    };
}
```

## Faction System

The Faction System defines the various playable and non-playable entities within the ThreatForge simulation, each with distinct goals, capabilities, and win conditions. This system drives the asymmetric gameplay and allows for diverse strategic approaches.

````typescript
enum FactionType {
  TECHNOOCRAT = "Evil Technocrat", // Focuses on technological dominance and control.
  MITIGATOR = "Hero Mitigator",     // Aims to neutralize threats and restore global stability.
  NATION_STATE = "Nation-State",   // Represents traditional governmental powers with diplomatic and military capabilities.
  RESISTANCE = "Free Human Resistance", // Works to expose hidden agendas and fight for human freedom.
  HERO_DOCTOR = "Hero Doctor/Scientist", // Dedicated to scientific research, cures, and public health.
  PHARMA = "Pharma Conglomerate",   // A corporate entity seeking to profit from global crises, particularly in the biological domain.
  CONTROLLED_OPPOSITION = "Controlled Opposition", // A deceptive faction designed to sow confusion and serve hidden agendas.
  NEURO_CORP = "Neuro-Corporation", // Specializes in cognitive threats
  CLIMATE_ENGINEER = "Geo-Climate Engineer" // Specializes in large-scale environmental manipulation
}

interface Faction {
  id: string; // Unique identifier for the faction.
  type: FactionType; // The specific type of faction.
  resources: ResourcePool; // The current pool of resources available to the faction.
  objectives: Objective[]; // An array of current objectives the faction is pursuing.
  winConditions: { // Specific criteria that, if met, lead to this faction's victory.
    dominationThreshold?: number;   // % of world to control, percentage of global regions to control for victory.
    survivalThreshold?: number;     // Minimum stability level, minimum global stability required for victory.
    exposureCount?: number;          // Number of conspiracies to expose, number of hidden plots to reveal.
    economicControlThreshold?: number; // % of resources to control, percentage of global economic resources to control.
    populationControlThreshold?: number; // % population reduction, percentage of global population to reduce (for hostile factions).
    allianceCount?: number;          // Number of alliances required, minimum number of strategic alliances to form.
  };
  capabilities: {
    threatDeployment: boolean;
    investigation: boolean;
    influence: boolean;
    economicWarfare: boolean;
    cyberOperations: boolean;
    environmentalManipulation: boolean;
    spaceDominance: boolean;
    geoengineering: boolean;
    spaceWeatherControl: boolean;
    aiAssistedDesign: boolean;
    mediaPropaganda: boolean;
    whistleblowerNetworks: boolean;
    diplomaticImmunity: boolean;
    // NEW: Domain-specific capabilities
    quantumOperations: boolean;       // For quantum computing actions
    radiologicalContainment: boolean; // For radiological threat management
    roboticCommand: boolean;          // For controlling robotic systems
    misinformationCampaigns: boolean; // For information warfare
    economicSanctions: boolean;       // For targeted financial attacks
    // NEW: Specialized faction capabilities
    neuroManipulation: boolean;       // Can deploy cognitive/neuro threats
    planetaryEngineering: boolean;    // Can execute large-scale geoengineering
    temporalOperations: boolean;      // Can manipulate perceived time
  };
  // Spatial capabilities
  militaryUnits: MilitaryUnit[]; // An array of military units controlled by this faction.
  satellites: Satellite[];       // An array of satellites deployed by this faction.
  sensorRange: number; // km, the maximum distance at which this faction's units can detect threats or other entities.
  movementSpeed: number; // multiplier, a factor applied to the base movement speed of this faction's units.
  // Deployment constraints
  deploymentConstraints: { // Defines rules and limitations for deploying units.
    maxUnits: number;     // Maximum number of units allowed per region.
    cooldown: number;     // Number of turns that must pass between unit deployments.
    zoneRestrictions: string[]; // A list of specific zones or regions where deployment is restricted or allowed.
    // NEW: Deployment contexts
    deploymentContexts: ("SURFACE" | "UNDERGROUND" | "ORBITAL" | "AQUATIC")[]; // Specifies the environments where units can be deployed.
    // NEW: Unit type restrictions
    unitTypeRestrictions?: MilitaryUnit['type'][]; // Optional: Restricts deployment to specific types of military units.
  };
}

interface Objective {
  id: string; // Unique identifier for the objective.
  type: "TERRITORIAL" | "ECONOMIC" | "INFLUENCE" | "THREAT_MITIGATION" | "THREAT_DEPLOYMENT"; // The category of the objective.
  target: string; // Region ID, Faction ID, or Threat ID, the specific entity or goal of the objective.
  progress: number; // 0-100, current progress towards completing the objective.
  requiredProgress: number; // The progress value needed to complete the objective.
  rewards: { // Benefits granted upon successful completion of the objective.
    resources?: ResourcePool; // Optional: Resources awarded.
    reputation?: number; // Optional: Reputation gain.
    unlock?: string; // Optional: ID of an unlockable ability or unit.
  };
}

interface ResourcePool {
  funds: number; // Monetary resources.
  intel: number; // Intelligence points, used for investigations and information gathering.
  manpower: number; // Human resources, used for unit deployment and operations.
  tech: number; // Technological resources, used for research and development.
}

// Spatial entity interfaces
interface MilitaryUnit {
  id: string; // Unique identifier for the military unit.
  factionId: string; // The ID of the faction that owns this unit.
  type: "INFANTRY" | "TANK" | "AIRCRAFT" | "NAVAL" | "CYBER" | "DRONE" |
        "AUTONOMOUS_GROUND" | "ROBOTIC_SWARM" | "QUANTUM_NODE" |
        "RAD_DISPERSAL" | "TUNNELER" | "SPACE_PLATFORM" |
        "NEURO_IMPLANT" | "CLOUD_SEEDER" | "CHRONO_DISRUPTOR" | "GRAVITY_WELL_GENERATOR"; // The type of military unit.
  position: [number, number];   // [longitude, latitude] coordinates of the unit's current location.
  velocity: [number, number];   // [m/s east, m/s north] current velocity vector of the unit.
  mass: number;                 // Kilograms, the mass of the unit, affecting physics interactions.
  energy: number;               // Joules (battery/fuel), current energy reserves of the unit.
  autonomyLevel: number;        // 0-1 scale (0: remote, 1: fully autonomous), degree of self-governance.
  abilities: UnitAbility[];     // An array of special abilities possessed by this unit.
}

interface Satellite {
  id: string; // Unique identifier for the satellite.
  factionId: string; // The ID of the faction that owns this satellite.
  type: "COMMS" | "RECON" | "WEAPON" | "NAVIGATION"; // The primary function of the satellite.
  orbit: { // Orbital parameters defining the satellite's trajectory.
    semiMajorAxis: number;      // km, the average distance from the center of the Earth.
    eccentricity: number;       // Shape of the orbit (0 for circular, <1 for elliptical).
    inclination: number;        // degrees, angle of the orbit relative to the Earth's equator.
    period: number;             // seconds, time taken to complete one orbit.
  };
  position: [number, number, number]; // ECEF coordinates [x, y, z] in km, current 3D position.
  velocity: [number, number, number]; // km/s, current 3D velocity vector.
  mass: number;                 // kg, the mass of the satellite.
  abilities: UnitAbility[];     // An array of special abilities possessed by this satellite.
  // Space weather vulnerabilities
  solarFlareVulnerability?: number; // 0-1 scale, how susceptible the satellite is to solar flares.
  radiationSensitivity?: number;    // 0-1 scale, how susceptible the satellite is to radiation.
}

// NEW: Faction-specific quantum advantages
function applyFactionQuantumBonus(faction: Faction, quantumAction: Action) {
  if (faction.capabilities.quantumHacking) {
    quantumAction.successProbability *= 1.25;
    quantumAction.resourceCost.tech *= 0.8;
  }
}
## Faction Details

ThreatForge features a diverse set of factions, each with unique goals, abilities, and perspectives, contributing to the game's asymmetric gameplay. Understanding each faction's characteristics is crucial for strategic planning and anticipating their actions.

### Evil Technocrats
*   **Goal**: To achieve global depopulation and absolute control through technological means, often by deploying advanced threats and manipulating systems.
*   **Abilities**: Possess advanced threat deployment capabilities, leverage AI-assisted design for rapid innovation, and can implement media blackouts to control information flow.
*   **Perspective**: Their user interface is cold and data-driven, featuring detailed profit dashboards and efficiency metrics, reflecting their utilitarian and calculating approach.
*   **Win Condition**: Achieve a specified level of global depopulation without being detected or exposed, maintaining a facade of normalcy while executing their agenda.

### Hero Mitigators
*   **Goal**: To investigate and neutralize global threats, restore stability, and protect populations from harm.
*   **Abilities**: Equipped with sophisticated investigation tools for uncovering hidden threats and effective countermeasures for threat neutralization.
*   **Perspective**: Their interface is focused on threat analysis and countermeasure deployment, providing detailed insights into threat vectors and mitigation strategies.
*   **Win Condition**: Successfully expose all major global threats and reduce the overall global threat level below a critical threshold.

### Nation-States
*   **Goal**: To maintain diplomatic influence, project military power, and ensure the stability and control of their territories.
*   **Abilities**: Possess strong diplomatic influence, significant military power for conventional warfare, and the ability to impose economic sanctions.
*   **Perspective**: Their view is centered on geopolitical strategy, featuring maps of territorial control, alliance networks, and international relations.
*   **Win Condition**: Maintain stability and control over a significant percentage of global territory while navigating complex diplomatic landscapes.

### Free Human Resistance
*   **Goal**: To expose hidden threats, survive oppressive regimes, and fight for human freedom and autonomy.
*   **Abilities**: Excel at establishing whistleblower networks, organizing grassroots movements, and conducting cyber hacks to disrupt enemy operations.
*   **Perspective**: Their interface provides a grassroots view, featuring rumor maps and networks of trust, reflecting their reliance on popular support and covert operations.
*   **Win Condition**: Successfully expose all major conspiracies and ensure the survival and liberation of a significant portion of the global population.

### Pharma Conglomerates
*   **Goal**: To maximize profit from global crises, particularly in the biological and health sectors, and influence medical policies to their advantage.
*   **Abilities**: Can profit significantly from the development and distribution of cures or by exacerbating existing threats, and exert considerable influence over medical policies and research.
*   **Perspective**: Their dashboards are heavily profit-focused, displaying market trends, revenue projections, and crisis-related profit opportunities.
*   **Win Condition**: Achieve economic dominance through crisis profiteering, leveraging global events to secure vast financial gains.

### Hero Doctors/Scientists
*   **Goal**: To develop cures, conduct critical research, and investigate biological threats for the benefit of humanity.
*   **Abilities**: Capable of rapid testing and diagnosis, forming alliances with whistleblowers, and conducting advanced medical research.
*   **Perspective**: Their UI is lab-focused, featuring detailed health metric overlays, research progress trackers, and epidemiological data.
*   **Win Condition**: Successfully develop cures or effective countermeasures for all active biological threats and ensure widespread distribution.

### Controlled Opposition
*   **Goal**: To sow confusion, manipulate public opinion, and serve hidden agendas by creating fake dissent groups and spreading misinformation.
*   **Abilities**: Highly skilled in media manipulation, deception tactics, and the creation of fabricated opposition movements to control narratives.
*   **Perspective**: Their interface focuses on media influence networks, propaganda dissemination channels, and public sentiment analysis.
*   **Win Condition**: Maintain control over key narratives and public perception through misinformation and manipulation, ensuring their hidden agendas are advanced.

### Additional Notes:
*   **Faction Switching**: Factions can dynamically switch allegiances or roles mid-game through specific "betrayal events" or major narrative shifts, adding unpredictability.
*   **Multiplayer Mode**: In multiplayer, factions are pitted against each other, creating competitive scenarios where players must outmaneuver and outwit their opponents.
*   **Modding Support**: The engine supports modding, allowing the community to add entirely new factions (e.g., "Eco-Terrorists," "AI Overlords") with custom abilities, goals, and unique gameplay mechanics.

# Environmental Systems

This section details the environmental systems within ThreatForge, which simulate dynamic weather patterns, terrain modifications, and complex ecosystem interactions. These systems introduce environmental challenges and opportunities that influence threat propagation and faction strategies.

## Dynamic Weather System

The Dynamic Weather System simulates realistic and evolving weather conditions across the globe, impacting unit movement, visibility, and the amplification of certain threats. Weather events can range from localized storms to widespread climate phenomena.

```typescript
interface WeatherSystem {
  currentConditions: { // The current weather conditions in a specific region.
    type: "CLEAR" | "RAIN" | "SNOW" | "STORM" | "DUST_STORM" | "FLOOD" | "ACID_RAIN" | "RADIOLOGICAL_FALLOUT";  // The type of weather event.
    intensity: number; // 0-1 scale, the severity or strength of the weather event.
    duration: number; // turns remaining, how long the current weather conditions are expected to last.
  };
  effects: { // The direct impacts of the current weather conditions on gameplay.
    visibilityModifier: number; // -1.0 to 1.0, modifies unit sensor range and overall visibility.
    movementPenalty: number; // 0-1 scale, reduces the movement speed of units.
    threatAmplification: { // Specifies how certain threats are amplified by the weather.
      domain: ThreatDomain;
      multiplier: number;
    }[];
    // NEW: Domain-specific weather effects
    cyberDisruption?: number;    // Signal interference, impacting cyber operations.
    radiologicalSpread?: number; // Contamination dispersion, affecting radiological threats.
    roboticMalfunction?: number; // Sensor/actuator failure rates, increasing malfunction probability for robotic units.
  };
  forecast: WeatherForecast[]; // A projection of future weather conditions.
}

function applyWeatherEffects(unit: MilitaryUnit, weather: WeatherSystem) {
  // Visibility reduction: Reduces the unit's sensor range based on weather visibility modifier.
  unit.sensorRange *= (1 - weather.effects.visibilityModifier);

  // Movement speed penalty: Applies a penalty to the unit's movement speed.
  unit.movementSpeed *= (1 - weather.effects.movementPenalty);

  // Threat amplification: Adds weather-induced threat amplification to existing cross-domain impacts.
  threat.crossDomainImpacts.push(
    ...weather.effects.threatAmplification
  );

  // NEW: Robotic unit effects: Increases the error rate for robotic units during adverse weather.
  if (unit.type.includes("ROBOT") || unit.type === "DRONE") {
    unit.errorRate += weather.effects.roboticMalfunction || 0;
  }

  // NEW: Cyber disruption: Reduces the effectiveness of cyber operations during signal interference.
  if (unit.capabilities.includes("CYBER_OPS")) {
    unit.effectiveness *= (1 - (weather.effects.cyberDisruption || 0));
  }
}

// Weather generation algorithm
// This function generates new weather conditions for a given region, taking into account
// the region's climate vulnerability and the global climate state. It can also introduce
// domain-specific weather types like radiological fallout.
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
````

## Terrain Modification

Terrain modification allows certain units or factions to alter the physical landscape of regions, creating strategic advantages or mitigating environmental threats. This system introduces dynamic changes to the world map based on player actions and environmental events.

- **Dynamic Terrain**: Units equipped with terraforming capabilities can dynamically modify elevation, create new landforms, or flatten areas, impacting movement, line of sight, and resource accessibility.
- **Environmental Hazards**: Players can create or mitigate natural disaster zones, such as building flood defenses, initiating controlled burns to prevent wildfires, or even triggering localized seismic events.
- **Resource Depletion**: Over-exploitation of natural resources in a region leads to reduced resource yields over time, simulating the long-term consequences of unsustainable practices.
- **Climate Change**: Industrial activity and certain threat types can contribute to long-term climate change effects, leading to shifts in global temperatures, sea levels, and weather patterns.
- **Radiological Contamination**: Radiological events leave persistent environmental effects, contaminating regions and rendering them hazardous for extended periods, impacting population health and resource extraction.
- **Robotic Terraforming**: Autonomous robotic systems can be deployed to reshape terrain for strategic advantage, such as constructing defensive barriers, digging tunnels, or preparing areas for large-scale operations.

## Ecosystem Simulation

The Ecosystem Simulation models the complex interdependencies within natural environments, demonstrating how threats and player actions can impact biodiversity, resource renewal, and overall ecological health. This system adds a layer of environmental realism and strategic depth.

- **Food Chain Interactions**: Biological threats and environmental changes can disrupt food chain interactions, leading to cascading effects on species populations and ecosystem stability.
- **Pollution Effects**: Environmental contamination from industrial activities or specific threats directly impacts population health, resource quality, and the viability of ecosystems.
- **Resource Renewal**: Natural regeneration rates for various resources are simulated, allowing for sustainable management strategies or highlighting the consequences of over-exploitation.
- **Biodiversity Index**: A quantifiable measure of ecological health, the biodiversity index affects the evolution and mutation of biological threats, with lower biodiversity potentially leading to more virulent strains.
- **Quantum Ecosystem Effects**: Explores the theoretical impact of quantum entanglement on biological systems, potentially leading to unforeseen mutations or accelerated evolution in response to quantum threats.
- **Robotic Ecosystem Impact**: Autonomous robotic systems can have both positive and negative impacts on wildlife behavior and natural habitats, from environmental cleanup to unintended ecological disruption.

# Physics Modeling

# Physics Modeling

This section details the various physics models implemented in ThreatForge, which govern the movement of units, the propagation of threats, and the interactions between different elements in the game world. These models ensure a realistic and dynamic simulation environment.

## Newtonian Mechanics Examples

The engine utilizes Newtonian mechanics to simulate the movement and interactions of physical entities within the game world, providing a foundational layer of realism for unit behavior and environmental responses.

### Military Unit Movement

These functions demonstrate how different types of military units are simulated using basic Newtonian physics principles, accounting for factors like terrain resistance, engine force, and mass.

```typescript
function updateTankMovement(
    tank: MilitaryUnit,
    terrainResistance: number,
    dt: number
) {
    // Calculate net force (engine power - friction)
    // The net force determines the acceleration of the tank.
    const engineForce = 50000; // N (typical main battle tank engine force)
    const frictionForce = terrainResistance * tank.mass * 9.8; // Friction opposing movement.
    const netForce = engineForce - frictionForce;

    // Update acceleration, velocity, position
    // Applying Newton's second law (F=ma) to update the tank's state.
    const acceleration = netForce / tank.mass;
    tank.velocity[0] += acceleration * dt * Math.cos(tank.heading); // Update x-velocity component.
    tank.velocity[1] += acceleration * dt * Math.sin(tank.heading); // Update y-velocity component.
    tank.position[0] += tank.velocity[0] * dt; // Update x-position.
    tank.position[1] += tank.velocity[1] * dt; // Update y-position.

    // Update energy (fuel consumption)
    // Simulates fuel consumption based on engine force and distance traveled.
    tank.energy -= engineForce * 0.0001 * dt; // 0.0001 Joules per Newton of force per second.
}
```

### Robotic Swarm Movement

This function models the collective movement of a robotic swarm, incorporating principles of cohesion and attraction towards a central point, while also accounting for damping to prevent runaway acceleration.

```typescript
function updateSwarmMovement(
    swarm: MilitaryUnit,
    cohesion: number,
    dt: number
) {
    // Calculate average velocity of nearby swarm units
    // This represents the collective intelligence guiding the swarm.
    const center = swarm.centerOfMass; // [x, y] - calculated from swarm units' positions.
    const directionToCenter = [
        center[0] - swarm.position[0],
        center[1] - swarm.position[1],
    ];
    const distanceToCenter = Math.hypot(...directionToCenter);

    // Normalize and scale by cohesion
    if (distanceToCenter > 0) {
        const normalizedDir = [
            directionToCenter[0] / distanceToCenter,
            directionToCenter[1] / distanceToCenter,
        ];
        const attractionForce = 100 * cohesion; // Newtons, force pulling units towards the center of mass.

        // Update velocity
        swarm.velocity[0] +=
            ((attractionForce * normalizedDir[0]) / swarm.mass) * dt;
        swarm.velocity[1] +=
            ((attractionForce * normalizedDir[1]) / swarm.mass) * dt;
    }

    // Damping to prevent infinite acceleration
    // Reduces velocity over time to simulate drag or energy loss.
    swarm.velocity[0] *= 0.99;
    swarm.velocity[1] *= 0.99;

    // Update position
    swarm.position[0] += swarm.velocity[0] * dt;
    swarm.position[1] += swarm.velocity[1] * dt;
}

// Geological event simulation
// This function simulates the physical effects of various geological events on military units within a region.
function simulateGeologicalEvent(
    region: Region,
    eventType: string,
    magnitude: number
) {
    switch (eventType) {
        case 'EARTHQUAKE':
            // Shake all units in region by applying random velocity impulses.
            region.militaryUnits.forEach((unit) => {
                unit.velocity[0] += (Math.random() - 0.5) * magnitude * 0.1;
                unit.velocity[1] += (Math.random() - 0.5) * magnitude * 0.1;
            });
            break;

        case 'VOLCANO':
            // Create ash cloud that affects aircraft, reducing their engine efficiency.
            region.militaryUnits
                .filter((u) => u.type === 'AIRCRAFT')
                .forEach((unit) => {
                    unit.energy *= 0.8; // Ash reduces engine efficiency.
                });
            break;

        case 'TSUNAMI':
            // Push naval units with a strong directional force.
            region.militaryUnits
                .filter((u) => u.type === 'NAVAL')
                .forEach((unit) => {
                    unit.velocity[0] += magnitude * 0.2;
                    unit.velocity[1] += magnitude * 0.2;
                });
            break;
    }
}
```

### Satellite Orbital Adjustment

This function simulates the adjustment of a satellite's orbit, allowing for changes in altitude based on proportional control. This is crucial for maintaining satellite constellations or repositioning assets for strategic purposes.

```typescript
function adjustSatelliteOrbit(
    sat: Satellite,
    targetAltitude: number,
    dt: number
) {
    const currentAlt = Math.sqrt(
        sat.position[0] ** 2 + sat.position[1] ** 2 + sat.position[2] ** 2
    );
    const deltaV = 0.1 * (targetAltitude - currentAlt); // Proportional control, calculates the required change in velocity.

    // Apply thrust in velocity direction
    const velocityDir = [
        sat.velocity[0] / Math.hypot(...sat.velocity),
        sat.velocity[1] / Math.hypot(...sat.velocity),
        sat.velocity[2] / Math.hypot(...sat.velocity),
    ];

    sat.velocity[0] += velocityDir[0] * deltaV;
    sat.velocity[1] += velocityDir[1] * deltaV;
    sat.velocity[2] += velocityDir[2] * deltaV;

    // Update orbital parameters
    updateOrbit(sat, dt); // Calls the main orbital mechanics function to update the satellite's position and velocity.
}
```

## Orbital Mechanics

This section details the fundamental principles of orbital mechanics used to simulate the movement of satellites and other space-based assets around celestial bodies. It applies Newtonian gravitational laws to accurately model trajectories.

```typescript
const G = 6.6743e-11; // Gravitational constant (m^3 kg^-1 s^-2)
const EARTH_MASS = 5.972e24; // kg, mass of the Earth.

function updateOrbit(satellite: Satellite, dt: number) {
    // Calculate distance from Earth center
    const r = Math.sqrt(
        satellite.position[0] ** 2 +
            satellite.position[1] ** 2 +
            satellite.position[2] ** 2
    ); // Distance from the center of the Earth to the satellite.

    // Calculate gravitational force
    const Fg = (G * EARTH_MASS * satellite.mass) / r ** 2; // Newton's Law of Universal Gravitation.

    // Direction vector towards Earth
    const dir = [
        -satellite.position[0] / r,
        -satellite.position[1] / r,
        -satellite.position[2] / r,
    ]; // Unit vector pointing from the satellite towards the Earth's center.

    // Update velocity
    satellite.velocity[0] += ((dir[0] * Fg) / satellite.mass) * dt;
    satellite.velocity[1] += ((dir[1] * Fg) / satellite.mass) * dt;
    satellite.velocity[2] += ((dir[2] * Fg) / satellite.mass) * dt; // Update velocity based on gravitational acceleration.

    // Update position
    satellite.position[0] += satellite.velocity[0] * dt;
    satellite.position[1] += satellite.velocity[1] * dt;
    satellite.position[2] += satellite.velocity[2] * dt; // Update position based on current velocity.

    // Update orbital parameters
    satellite.orbit.semiMajorAxis = r; // For a circular orbit, semi-major axis is the radius.
    satellite.orbit.period = 2 * Math.PI * Math.sqrt(r ** 3 / (G * EARTH_MASS)); // Kepler's Third Law for orbital period.
}
```

## Quantum Physics Modeling

This section describes the quantum physics models used to simulate quantum threats and their effects on systems. It covers concepts like quantum state representation, decoherence, and the impact of quantum computing on other domains.

```typescript
// Quantum state representation
interface QuantumState {
    qubits: number; // The number of qubits in the quantum system.
    entanglement: number; // 0-1 entanglement level, representing the degree of quantum correlation.
    coherenceTime: number; // ms, the duration for which a quantum system maintains its coherence.
}

// Unified Physics Model
class UnifiedPhysicsEngine {
    applyQuantumGravity(unit: MilitaryUnit, region: Region) {
        const gravityDistortion = 0.05 * region.quantumFieldDensity;
        unit.velocity[0] *= 1 + gravityDistortion;
        unit.velocity[1] *= 1 + gravityDistortion;
    }

    simulateNeuroWavePropagation(threat: Threat, population: number) {
        return threat.severity * Math.log(population) * 0.3;
    }
}

// Quantum physics modeling
// Quantum decoherence effects
function applyQuantumDecoherence(
    state: QuantumState,
    environmentNoise: number,
    dt: number
) {
    // Decoherence increases with noise and time
    const decoherenceRate = environmentNoise * 0.01; // % per ms, rate at which coherence is lost.
    state.coherenceTime -= dt * decoherenceRate;

    // When coherence time drops below threshold, quantum effects diminish
    if (state.coherenceTime < 100) {
        state.entanglement *= 0.9; // Rapid loss of entanglement when coherence is low.
    }
}

// New environmental interactions
function applyRadiationWeatherEffects(
    weather: WeatherSystem,
    radThreat: Threat
) {
    if (weather.radiationLevel > 500) {
        radThreat.spreadRate *= 1.2;
        radThreat.severity *= 1.15;
    }
}

// Quantum computing threat effects
// This function applies the effects of a quantum threat, such as increasing decryption capabilities
// and creating cross-domain impacts through entanglement.
function applyQuantumThreat(threat: Threat, dt: number) {
    if (threat.domain === 'QUANTUM') {
        const quantumProps = threat.quantumProperties;
        if (quantumProps) {
            // Increase decryption capability over time
            quantumProps.decryptionTime = Math.max(
                1,
                quantumProps.decryptionTime * (1 - 0.01 * dt)
            ); // Decryption time decreases, meaning faster decryption.

            // Entanglement with other quantum systems
            threat.crossDomainImpacts.forEach((impact) => {
                if (impact.domain === 'CYBER') {
                    impact.multiplier += 0.1 * dt; // Quantum threats can amplify cyber impacts through entanglement.
                }
            });
        }
    }
}

// Neurological threat propagation
function propagateNeuroThreat(threat: Threat, populationDensity: number): void {
    if (threat.domain !== 'BIO' || !threat.biologicalProperties) return;

    const { transmissionVectors, addictionPotential } =
        threat.biologicalProperties;
    let neuroModifier = 1.0;

    if (transmissionVectors.includes('NEURAL_LINK')) {
        neuroModifier += populationDensity * 0.5;
    }
    if (addictionPotential > 0.6) {
        neuroModifier *= 1 + addictionPotential * 0.8;
    }

    threat.spreadRate *= neuroModifier;
}

// Quantum-gravity interactions
function applyQuantumGravityEffects(
    quantumState: QuantumState,
    region: Region
): void {
    const gravityDistortion =
        0.01 * quantumState.entanglement * region.elevation;
    region.militaryUnits.forEach((unit) => {
        unit.velocity[0] *= 1 + gravityDistortion;
        unit.velocity[1] *= 1 + gravityDistortion;
    });
}
```

## Energy Systems

This section describes the energy systems that govern the power consumption and generation of various units and entities within ThreatForge. It includes models for unit energy consumption, different recharge behaviors, and energy generation from radiological decay.

````typescript
// Military unit energy consumption modifiers
// Defines how much energy different unit types consume relative to a base rate.
const UNIT_ENERGY_MODIFIERS = {
  "INFANTRY": 1.0,
  "TANK": 1.8,
  "AIRCRAFT": 3.0,
  "NAVAL": 2.5,
  "CYBER": 0.5,
  "DRONE": 1.2,
  "QUANTUM_NODE": 5.0,
  "RAD_DISPERSAL": 2.0,
  "ROBOTIC_SWARM": 1.5,  // NEW: Energy modifier for robotic swarm units.
  "AUTONOMOUS_GROUND": 2.2  // NEW: Energy modifier for autonomous ground units.
};

interface EnergySystem {
  capacity: number;       // Max energy storage (Joules), the maximum amount of energy the system can hold.
  current: number;        // Current energy, the current energy level in Joules.
  rechargeRate: number;   // Joules per second, the rate at which the system recharges.
  consumptionRate: number;// Joules per second during operation, the rate at which energy is consumed when active.
  // NEW: Robotic energy systems
  autonomyMode?: "SOLAR" | "BATTERY" | "NUCLEAR"; // The primary energy source for autonomous systems.
  rechargeEfficiency?: number; // 0-1, efficiency of the recharge process.
}

function updateEnergy(system: EnergySystem, isActive: boolean, dt: number) {
  if (isActive) {
    system.current -= system.consumptionRate * dt; // Consume energy if the system is active.
  } else {
    // NEW: Different recharge behaviors
    let effectiveRate = system.rechargeRate;
    if (system.autonomyMode === "SOLAR") {
      effectiveRate *= getSolarEfficiency(); // Solar-powered systems recharge based on solar efficiency.
    }
    system.current = Math.min(
      system.capacity,
      system.current + effectiveRate * dt * (system.rechargeEfficiency || 1)
    ); // Recharge energy, capped at capacity.
  }
}

// NEW: Radiological energy systems
// This function simulates energy generation from radioactive decay, relevant for units or systems
// powered by radiological sources. Energy is generated based on the half-life of the material.
function updateRadiationEnergy(system: EnergySystem, halfLife: number, dt: number) {
  // Radioactive decay energy generation
  const decayEnergy = 0.001 * system.capacity * (1 - Math.exp(-0.693 * dt / halfLife)); // Energy generated from decay.
  system.current = Math.min(system.capacity, system.current + decayEnergy); // Add decay energy, capped at capacity.
}
## Physics-Based Threat Propagation

ThreatForge employs sophisticated physics models to simulate the realistic propagation of various threats across the game world. These models account for domain-specific characteristics and environmental factors, ensuring dynamic and emergent threat behaviors.

### Biological Threats
*   **Transmission Models**: Utilizes advanced epidemiological models to simulate the spread of biological threats through various vectors, including airborne diffusion, waterborne contamination, and vector-borne transmission (e.g., insects).
*   **Health Effects**: Calculates mortality rates and other health impacts based on factors like population age cohorts, existing health infrastructure, and the virulence of the pathogen.
*   **Example**: A highly contagious virus spreads through a densely populated urban area, modeled using fluid dynamics simulation combined with real-time population density data, leading to rapid infection rates and overwhelming healthcare systems.

### Cyber Threats
*   **Network Propagation**: Simulates the spread of cyber threats through interconnected networks using node-to-node infection models, accounting for network topology, security protocols, and vulnerabilities.
*   **AI-Driven Attacks**: Models adaptive malware and AI-driven attacks that can learn and evolve using machine learning algorithms, making them more resilient and difficult to contain.
*   **Example**: A sophisticated botnet grows exponentially by exploiting IoT vulnerabilities, modeled as a network contagion that rapidly infects devices across different geographical regions.

### Environmental Threats
*   **Atmospheric Dispersion**: Employs Gaussian plume models to simulate the dispersion of aerosol threats (e.g., chemical agents, pollutants) through the atmosphere, accounting for wind patterns, topography, and atmospheric stability.
*   **Geological Events**: Utilizes finite element analysis to model the physical impacts of geological events like earthquakes and tsunamis, including ground shaking, structural damage, and wave propagation.
*   **Example**: A radioactive cloud disperses across a continent, with its trajectory and concentration accurately modeled based on real-time wind patterns and atmospheric conditions, leading to widespread contamination.

### Quantum Effects
*   **Entanglement Propagation**: Simulates the non-local correlation and propagation of quantum entanglement, which can be leveraged for highly secure communication or for disruptive quantum attacks.
*   **Decoherence Waves**: Models the collapse of quantum probability fields, representing the loss of quantum coherence and its impact on quantum systems, potentially leading to widespread system failures.
*   **Example**: A quantum hacking wavefront propagates through a global quantum network, causing a cascade of decoherence and breaking encryption in real-time across multiple interconnected systems.

### Robotic Systems
*   **Swarm Movement**: Implements advanced algorithms like the Boids model to simulate the coordinated movement of robotic swarms, including obstacle avoidance, flocking, and pursuit behaviors.
*   **Autonomy Failure**: Models cascading error propagation within autonomous robotic systems, simulating how a single malfunction can lead to widespread system failures or unpredictable behaviors.
*   **Example**: A drone swarm, initially deployed for surveillance, becomes rogue due to a cyber attack, and its coordinated movement and attack patterns are simulated using complex physics, leading to unexpected and devastating outcomes.

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
| Neuro + Quantum | 3.2x cognitive impact | Quantum-entangled neural networks |
| Climate + Space | 2.5x weather control  | Orbital climate manipulation platforms |
| Temporal + Info | 4.0x perception shift | Retroactive disinformation campaigns |

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

// New temporal disruption effect
function applyTemporalDisruption(threatA: Threat, threatB: Threat): void {
  if (threatA.domainsInvolved.includes("QUANTUM") &&
      threatB.domainsInvolved.includes("INFO")) {
    const timeDilation = threatA.quantumProperties?.entanglementLevel || 0;
    const infoSpread = threatB.informationProperties?.misinformationSpreadRate || 0;

    threatB.effects.forEach(effect => {
      effect.duration *= 1 + (timeDilation * infoSpread * 0.5);
    });
  }
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
````

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
```
