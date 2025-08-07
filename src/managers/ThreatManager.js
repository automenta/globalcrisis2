import * as THREE from 'three';
import { Threat } from '../threat.js';
import { RadiologicalPlume } from '../plume.js';
import { THREAT_DOMAINS, CROSS_DOMAIN_INTERACTIONS } from '../constants.js';

export class ThreatManager {
    constructor(scene, narrativeManager, casualMode) {
        this.scene = scene;
        this.narrativeManager = narrativeManager;
        this.casualMode = casualMode;
        this.threats = [];
        this.newThreats = [];
        this.removedThreatIds = [];
        this.plumes = [];
    }

    addThreat(threat) {
        this.threats.push(threat);
        this.newThreats.push(threat);

        if (this.scene) { // scene is null in the worker
            this.scene.add(threat.mesh);
        }

        if (threat.domain === 'RAD') {
            const plume = new RadiologicalPlume(threat, this.scene);
            this.plumes.push(plume);
        }
    }

    update(dt, worldState) {
        let threatsToRemove = [];

        // Update all threats and their impact on regions
        this.threats.forEach((threat) => {
            threat.update(dt, worldState);

            const region = worldState.regionManager.getRegionForThreat(threat);
            if (
                region &&
                worldState.buildings.some(
                    (b) => b.region === region && b.type === 'SENSOR'
                )
            ) {
                threat.visibility = Math.min(1.0, threat.visibility + 0.1 * dt);
            }

            if (threat.isMitigated) {
                threatsToRemove.push(threat);
                return;
            }

            if (region) {
                let damageMultiplier = 1.0;
                if (
                    threat.domain === 'GEO' &&
                    region.activeBuffs.some((b) => b.type === 'FORTIFIED')
                ) {
                    damageMultiplier = 0.2;
                }

                const economicDamage =
                    this.getEconomicDamage(threat) *
                    0.001 *
                    dt *
                    damageMultiplier;
                region.economy = Math.max(0, region.economy - economicDamage);

                const stabilityDecrease =
                    threat.severity * 0.001 * dt * damageMultiplier;
                region.stability = Math.max(
                    0,
                    region.stability - stabilityDecrease
                );

                if (threat.domain === 'INFO') {
                    this.updateMisinformationImpact(threat, region, dt);
                }
                if (threat.domain === 'ECON') {
                    this.propagateFinancialContagion(
                        threat,
                        dt,
                        worldState.globalMetrics.economy
                    );
                }
            }
        });

        // Remove mitigated threats
        if (threatsToRemove.length > 0) {
            threatsToRemove.forEach((threat) => {
                this.removedThreatIds.push(threat.id);
                if (this.scene) { // scene is null in the worker
                    this.scene.remove(threat.mesh);
                    const plumeToRemove = this.plumes.find(
                        (p) => p.threat === threat
                    );
                    if (plumeToRemove) {
                        this.scene.remove(plumeToRemove.mesh);
                        this.plumes = this.plumes.filter(
                            (p) => p.threat !== threat
                        );
                    }
                }
            });
            this.threats = this.threats.filter((t) => !t.isMitigated);
        }

        this.handleThreatSpreading(dt, worldState);
        this.handleCrossDomainInteractions(dt, worldState);

        this.plumes.forEach((plume) => {
            const region = worldState.regionManager.getRegionForThreat(
                plume.threat
            );
            if (region && region.weather) {
                plume.update(
                    dt,
                    region.weather.windSpeed,
                    region.weather.windDirection
                );
            }
        });
    }

    getEconomicDamage(threat) {
        switch (threat.domain) {
            case 'ECON':
                return threat.severity * 1.0;
            case 'CYBER':
            case 'GEO':
            case 'WMD':
                return threat.severity * 0.5;
            case 'BIO':
            case 'ENV':
            case 'RAD':
                return threat.severity * 0.3;
            default:
                return threat.severity * 0.1;
        }
    }

    handleThreatSpreading(dt, worldState) {
        this.threats.forEach((threat) => {
            if (
                threat.domain === 'BIO' &&
                threat.severity > 0.7 &&
                !threat.isSpreading
            ) {
                threat.isSpreading = true;
                threat.spreadTimer = 0;
            }

            if (threat.isSpreading) {
                threat.spreadTimer += dt;
                if (threat.spreadTimer >= threat.spreadInterval) {
                    const sourceRegion =
                        worldState.regionManager.getRegionForThreat(threat);
                    if (sourceRegion) {
                        const connectedRoutes =
                            worldState.regionManager.travelRoutes.filter(
                                (r) =>
                                    r.from === sourceRegion ||
                                    r.to === sourceRegion
                            );
                        const potentialTargetRegions = connectedRoutes.map(
                            (r) => (r.from === sourceRegion ? r.to : r.from)
                        );

                        const uninfectedRegions = potentialTargetRegions.filter(
                            (tr) =>
                                !this.threats.some(
                                    (t) =>
                                        t.domain === 'BIO' &&
                                        worldState.regionManager.getRegionForThreat(
                                            t
                                        ) === tr
                                )
                        );

                        if (uninfectedRegions.length > 0) {
                            const targetRegion = uninfectedRegions[0];
                            const newThreat = new Threat({
                                id: this.threats.length,
                                domain: 'BIO',
                                type: 'REAL',
                                severity: 0.1,
                                position: targetRegion.position,
                            });
                            this.addThreat(newThreat);
                        }
                    }
                    threat.isSpreading = false;
                }
            }
        });
    }

    handleCrossDomainInteractions(dt, worldState) {
        const threatsByRegion = new Map();
        this.threats.forEach((threat) => {
            const region = worldState.regionManager.getRegionForThreat(threat);
            if (region) {
                if (!threatsByRegion.has(region.id)) {
                    threatsByRegion.set(region.id, []);
                }
                threatsByRegion.get(region.id).push(threat);
            }
        });

        for (const threatsInRegion of threatsByRegion.values()) {
            for (let i = 0; i < threatsInRegion.length; i++) {
                for (let j = i + 1; j < threatsInRegion.length; j++) {
                    const threatA = threatsInRegion[i];
                    const threatB = threatsInRegion[j];

                    const interaction = this.getInteractionEffect(
                        threatA,
                        threatB
                    );
                    if (interaction) {
                        interaction.effect(threatA, threatB, dt);
                        if (interaction.narrativeEvent) {
                            this.narrativeManager.logEvent(
                                interaction.narrativeEvent,
                                {
                                    threats: [threatA.id, threatB.id],
                                    domains: [threatA.domain, threatB.domain],
                                }
                            );
                        }
                    }
                }
            }
        }
    }

    getInteractionEffect(threatA, threatB) {
        const key1 = `${threatA.domain}-${threatB.domain}`;
        const key2 = `${threatB.domain}-${threatA.domain}`;
        return (
            CROSS_DOMAIN_INTERACTIONS[key1] ||
            CROSS_DOMAIN_INTERACTIONS[key2] ||
            null
        );
    }

    propagateFinancialContagion(threat, dt, marketIndex) {
        if (threat.domain !== 'ECON' || !threat.economicProperties) return;

        const volatility = threat.economicProperties.marketCrashPotential || 0;
        const networkEffect = 1 + marketIndex * 0.2;
        const severityIncrease =
            threat.severity * volatility * networkEffect * (dt / 10);
        threat.severity = Math.min(1, threat.severity + severityIncrease);
    }

    updateMisinformationImpact(threat, region, dt) {
        if (threat.domain !== 'INFO' || !threat.informationProperties) return;

        const { polarizationFactor = 0, deepfakeQuality = 0 } =
            threat.informationProperties;
        const vulnerability =
            (1 - region.population.psychodynamics.trust) *
            (1 - region.education);

        const spreadRateChange =
            (0.4 * polarizationFactor +
                0.3 * deepfakeQuality +
                0.3 * vulnerability) *
            (dt / 10);
        threat.spreadRate = Math.min(
            1,
            (threat.spreadRate || 0) + spreadRateChange
        );

        const trustDecay =
            (polarizationFactor * 0.1 + deepfakeQuality * 0.2) *
            threat.severity *
            (1 - region.education) *
            (dt / 10);
        region.population.psychodynamics.trust = Math.max(
            0,
            region.population.psychodynamics.trust - trustDecay
        );
    }

    generateThreat(options = {}, worldState) {
        let threatProps = {};
        const id = `threat-${worldState.currentTurn}-${this.threats.length}`;

        if (options.isFromAI) {
            if (!worldState.aiManager.aiGoal) {
                worldState.aiManager.selectAIGoal();
            }

            const cost = { funds: 1000, tech: 500 };
            if (!worldState.factionManager.aiFaction.canAfford(cost)) {
                return;
            }
            worldState.factionManager.aiFaction.spend(cost);

            let domain;
            let targetRegion;

            switch (worldState.aiManager.aiGoal) {
                case 'destabilize_region':
                    domain = ['GEO', 'INFO', 'BIO'][
                        Math.floor(Math.random() * 3)
                    ];
                    targetRegion = worldState.regions.reduce((prev, curr) =>
                        prev.stability < curr.stability ? prev : curr
                    );
                    break;
                case 'disrupt_economy':
                    domain = ['ECON', 'CYBER'][Math.floor(Math.random() * 2)];
                    targetRegion = worldState.regions.reduce((prev, curr) =>
                        prev.economy > curr.economy ? prev : curr
                    );
                    break;
                case 'tech_supremacy':
                    domain = ['QUANTUM', 'ROBOT'][
                        Math.floor(Math.random() * 2)
                    ];
                    targetRegion =
                        worldState.regions[
                            Math.floor(
                                Math.random() * worldState.regions.length
                            )
                        ];
                    break;
                case 'counter_player': {
                    domain = ['CYBER', 'INFO', 'WMD'][
                        Math.floor(Math.random() * 3)
                    ];
                    const playerRegions =
                        worldState.regionManager.regions.filter(
                            (r) =>
                                r.owner === 'PLAYER' || r.owner === 'mitigators'
                        );
                    if (playerRegions.length > 0) {
                        const frontierRegions = playerRegions.filter((pr) =>
                            worldState.regionManager.travelRoutes.some(
                                (route) =>
                                    (route.from === pr &&
                                        worldState.regionManager.regions.find(
                                            (r) => r === route.to
                                        )?.owner === 'technocrats') ||
                                    (route.to === pr &&
                                        worldState.regionManager.regions.find(
                                            (r) => r === route.from
                                        )?.owner === 'technocrats')
                            )
                        );

                        if (frontierRegions.length > 0) {
                            targetRegion =
                                frontierRegions[
                                    Math.floor(
                                        Math.random() * frontierRegions.length
                                    )
                                ];
                        } else {
                            targetRegion =
                                playerRegions[
                                    Math.floor(
                                        Math.random() * playerRegions.length
                                    )
                                ];
                        }
                    } else {
                        targetRegion = worldState.regionManager.regions.reduce(
                            (prev, curr) =>
                                prev.stability > curr.stability ? prev : curr
                        );
                    }
                    break;
                }
                default:
                    domain =
                        THREAT_DOMAINS[
                            Math.floor(Math.random() * THREAT_DOMAINS.length)
                        ];
                    targetRegion =
                        worldState.regions[
                            Math.floor(
                                Math.random() * worldState.regions.length
                            )
                        ];
            }

            if (Math.random() < 0.3) {
                worldState.aiGoal = null;
            }

            const randomOffset = new THREE.Vector3(
                (Math.random() - 0.5),
                (Math.random() - 0.5),
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(5); // 5 units of random offset
            const threatPosition = new THREE.Vector3().copy(targetRegion.position).add(randomOffset).normalize().multiplyScalar(60);

            threatProps = {
                id,
                domain,
                type: 'REAL',
                severity: this.casualMode
                    ? Math.random() * 0.2 + 0.1
                    : Math.random() * 0.4 + 0.1,
                position: threatPosition,
            };
        } else {
            // This path is likely for debugging or testing, needs a position.
            // For now, we'll place it at a default location if no position is provided.
            const position = options.position || new THREE.Vector3(60, 0, 0);
            threatProps = {
                id,
                domain: options.domain,
                type: options.type,
                severity: options.severity,
                position: position
            };
        }

        switch (threatProps.domain) {
            case 'BIO':
                if (Math.random() < 0.1) {
                    threatProps.subType = 'DISEASE_X';
                    threatProps.severity = 0.5;
                }
                break;
            case 'QUANTUM':
                threatProps.quantumProperties = {
                    coherenceTime: 5 + Math.random() * 5,
                    entanglementLevel: Math.random(),
                };
                break;
            case 'ROBOT':
                threatProps.roboticProperties = {
                    adaptationRate: Math.random() * 0.5,
                    collectiveIntelligence: Math.random() * 0.2,
                };
                break;
            case 'SPACE':
                threatProps.spaceProperties = {
                    orbitalDebrisPotential: Math.random(),
                };
                break;
            case 'INFO':
                threatProps.informationProperties = {
                    polarizationFactor: Math.random(),
                    deepfakeQuality: Math.random(),
                };
                break;
            case 'ECON':
                threatProps.economicProperties = {
                    marketCrashPotential: Math.random(),
                };
                break;
        }

        const threat = new Threat(threatProps);
        this.addThreat(threat);

        this.narrativeManager.logEvent('THREAT_GENERATED', {
            threatId: threat.id,
            domain: threat.domain,
            type: threat.type,
            lat: threat.lat,
            lon: threat.lon,
            isFromAI: options.isFromAI || false,
        });
    }

    getDelta() {
        const updatedThreats = this.threats.filter(t => t.dirty && !this.newThreats.includes(t));
        const newThreats = [...this.newThreats];
        const removedThreatIds = [...this.removedThreatIds];

        // Reset flags and lists
        updatedThreats.forEach(t => t.dirty = false);
        this.newThreats.forEach(t => t.dirty = false);
        this.newThreats = [];
        this.removedThreatIds = [];

        return {
            newThreats,
            updatedThreats,
            removedThreatIds,
        };
    }
}
