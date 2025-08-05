export const threatDomains = ["CYBER", "BIO", "GEO", "ENV", "INFO", "SPACE", "WMD", "ECON", "QUANTUM", "RAD", "ROBOT"];
export const threatTypes = ["REAL", "FAKE", "UNKNOWN"];

export const CROSS_DOMAIN_INTERACTIONS = {
    "CYBER-RAD": {
        narrativeEvent: "CYBER_RAD_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            const radThreat = threatA.domain === 'RAD' ? threatA : threatB;
            if (!cyberThreat || !radThreat) return;
            radThreat.severity = Math.min(1.0, radThreat.severity + 0.001 * cyberThreat.severity);
            cyberThreat.severity = Math.min(1.0, cyberThreat.severity + 0.0005 * radThreat.severity);
        }
    },
    "ECON-INFO": {
        narrativeEvent: "ECON_INFO_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const econThreat = threatA.domain === 'ECON' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!econThreat || !infoThreat) return;
            // Economic trouble makes people more susceptible to misinformation
            infoThreat.spreadRate = Math.min(1.0, (infoThreat.spreadRate || 0) + 0.002 * econThreat.severity);
            // Misinformation can amplify economic panic
            econThreat.severity = Math.min(1.0, econThreat.severity + 0.001 * infoThreat.severity);
        }
    },
    "QUANTUM-ROBOT": {
        narrativeEvent: "QUANTUM_ROBOTIC_ENHANCEMENT",
        effect: (threatA, threatB, dt) => {
            const qThreat = threatA.domain === 'QUANTUM' ? threatA : threatB;
            const rThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            if (!qThreat || !rThreat) return;
            const qProps = qThreat.quantumProperties;
            const rProps = rThreat.roboticProperties;
            if (qProps && rProps && (qProps.entanglementLevel || 0) > 0.7) {
                rProps.adaptationRate = (rProps.adaptationRate || 1) * (1 + (0.5 * dt / 60));
                rProps.collectiveIntelligence = Math.min(1, (rProps.collectiveIntelligence || 0) + (qProps.entanglementLevel * 0.3 * dt / 60));
            }
        }
    },
    "CYBER-ROBOT": {
        narrativeEvent: "CYBER_ROBOT_HACK",
        effect: (threatA, threatB, dt) => {
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            const robotThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            if (!cyberThreat || !robotThreat) return;
            const rProps = robotThreat.roboticProperties;
            if (rProps && cyberThreat.severity > 0.6) {
                 // High severity cyber attacks can increase robot autonomy (e.g., hack them to be more independent)
                 const autonomyGain = (cyberThreat.severity - 0.6) * 0.01 * dt;
                 if(rProps.autonomyDegrees) {
                    rProps.autonomyDegrees.decisionLevel = Math.min(1, rProps.autonomyDegrees.decisionLevel + autonomyGain);
                 }
            }
        }
    },
    "QUANTUM-INFO": {
        narrativeEvent: "QUANTUM_DISINFORMATION_BREAKTHROUGH",
        effect: (threatA, threatB, dt) => {
            const qThreat = threatA.domain === 'QUANTUM' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!qThreat || !infoThreat) return;
            const qProps = qThreat.quantumProperties;
            const iProps = infoThreat.informationProperties;
            // Quantum computing can dramatically improve deepfake quality
            if (qProps && iProps && qProps.coherenceTime > 3) {
                 const qualityGain = qProps.coherenceTime * 0.005 * dt;
                 iProps.deepfakeQuality = Math.min(1, (iProps.deepfakeQuality || 0) + qualityGain);
            }
        }
    },
    "BIO-CYBER": {
        narrativeEvent: "BIO_CYBER_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const bioThreat = threatA.domain === 'BIO' ? threatA : threatB;
            const cyberThreat = threatA.domain === 'CYBER' ? threatA : threatB;
            if (!bioThreat || !cyberThreat) return;
            // Biological vectors make cyber attacks more severe
            const severityIncrease = 0.0015 * bioThreat.severity * dt;
            cyberThreat.severity = Math.min(1.0, cyberThreat.severity + severityIncrease);
        }
    },
    "ROBOT-INFO": {
        narrativeEvent: "ROBOT_INFO_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const robotThreat = threatA.domain === 'ROBOT' ? threatA : threatB;
            const infoThreat = threatA.domain === 'INFO' ? threatA : threatB;
            if (!robotThreat || !infoThreat) return;
            // Robotic networks (bots) amplify information spread
            const spreadRateIncrease = 0.0025 * robotThreat.severity * dt;
            infoThreat.spreadRate = Math.min(1.0, (infoThreat.spreadRate || 0) + spreadRateIncrease);
        }
    },
    "RAD-ENV": {
        narrativeEvent: "RAD_ENV_SYNERGY",
        effect: (threatA, threatB, dt) => {
            const radThreat = threatA.domain === 'RAD' ? threatA : threatB;
            const envThreat = threatA.domain === 'ENV' ? threatA : threatB;
            if (!radThreat || !envThreat) return;
            // Environmental events (e.g., storms) exacerbate radiological threats
            const severityIncrease = 0.002 * envThreat.severity * dt;
            const spreadRateIncrease = 0.003 * envThreat.severity * dt;
            radThreat.severity = Math.min(1.0, radThreat.severity + severityIncrease);
            radThreat.spreadRate = Math.min(1.0, (radThreat.spreadRate || 0) + spreadRateIncrease);
        }
    }
};
