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