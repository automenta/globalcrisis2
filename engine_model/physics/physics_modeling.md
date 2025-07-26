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