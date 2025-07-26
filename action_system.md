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