# Integration with Game Systems

## Physics in Game Loop
```mermaid
sequenceDiagram
  participant G as Game Loop
  participant P as Physics Engine
  participant V as Visualization
  participant E as Event Bus
  participant M as Multiplayer Sync
  
  G->>P: Update positions (dt)
  P->>V: Send spatial data
  V->>V: Render frame
  P->>E: Emit collision events
  E->>G: Trigger game effects
  G->>M: Broadcast state updates
```

## Spatial Event Examples
| Event Type | Condition | Effect |
|------------|-----------|--------|
| Satellite pass | Satellite over region | +Intel gathering |
| Unit collision | Military units in same cell | Combat initiated |
| Threat detection | Threat in sensor range | Visibility increased |
| Orbital strike | Weapon sat in position | Regional damage |
| Economic collapse | Region stability < 20% | Faction resource penalty |