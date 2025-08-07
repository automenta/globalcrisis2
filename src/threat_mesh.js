// src/threat_mesh.js
import * as THREE from 'three';

const DOMAIN_COLORS = {
    CYBER: 0x00ffff, // Cyan
    BIO: 0x00ff00, // Green
    GEO: 0xffff00, // Yellow
    ENV: 0x8b4513, // SaddleBrown
    INFO: 0xffa500, // Orange
    SPACE: 0xcccccc, // Light Grey
    WMD: 0xff4500, // OrangeRed
    ECON: 0x0000ff, // Blue
    QUANTUM: 0x9400d3, // DarkViolet
    RAD: 0xadff2f, // GreenYellow
    ROBOT: 0x808080, // Grey
    DEFAULT: 0xff0000, // Red for default/unknown
};

export class ThreatMesh {
    constructor(threatData) {
        this.threatData = threatData;
        this.mesh = this.createMesh();
        this.pulseTime = 0;
    }

    createMesh() {
        const { domain, lat, lon } = this.threatData;
        const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS['DEFAULT'];
        const isTransparent = domain === 'QUANTUM';

        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            transparent: isTransparent,
            opacity: 1.0,
        });

        let geometry;
        const radius = 0.2;
        switch (domain) {
            case 'CYBER':
                geometry = new THREE.OctahedronGeometry(radius, 0);
                break;
            case 'BIO':
                geometry = new THREE.IcosahedronGeometry(radius, 0);
                break;
            case 'GEO':
                geometry = new THREE.TetrahedronGeometry(radius, 0);
                break;
            case 'QUANTUM':
                geometry = new THREE.TorusKnotGeometry(
                    radius * 0.7,
                    radius * 0.3,
                    100,
                    16
                );
                break;
            case 'ROBOT':
                geometry = new THREE.BoxGeometry(radius, radius, radius);
                break;
            default:
                geometry = new THREE.SphereGeometry(radius, 16, 16);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = this.threatData.id; // Important for lookup

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const earthRadius = 62;
        const x = -(earthRadius * Math.sin(phi) * Math.cos(theta));
        const z = earthRadius * Math.sin(phi) * Math.sin(theta);
        const y = earthRadius * Math.cos(phi);
        mesh.position.set(x, y, z);

        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI / 2);

        return mesh;
    }

    update(dt, threatData) {
        this.threatData = threatData;
        this.pulseTime += dt;

        const {
            severity,
            domain,
            quantumProperties,
            roboticProperties,
            spreadRate,
        } = this.threatData;

        const baseScale = 0.5 + severity * 1.5;
        let pulseSpeed = 2 + severity * 8;
        let pulseIntensity = 0.2 * severity;

        if (
            domain === 'QUANTUM' &&
            quantumProperties?.coherenceTime !== undefined
        ) {
            const coherenceFactor = Math.max(
                0,
                quantumProperties.coherenceTime / 10
            );
            pulseIntensity *= coherenceFactor;
            if (
                quantumProperties.quantumEffects?.includes('QUANTUM_TUNNELING')
            ) {
                this.mesh.material.opacity =
                    0.5 + Math.sin(this.pulseTime * 5) * 0.4;
            } else {
                this.mesh.material.opacity = 1.0;
            }
        }

        if (
            domain === 'ROBOT' &&
            roboticProperties?.collectiveIntelligence !== undefined
        ) {
            pulseSpeed += roboticProperties.collectiveIntelligence * 5;
            if (
                roboticProperties.failureModes?.includes('GOAL_DRIFT') ||
                roboticProperties.failureModes?.includes('ETHICS_OVERRIDE')
            ) {
                const flicker = Math.sin(this.pulseTime * 20) > 0;
                this.mesh.material.color.set(
                    flicker ? 0xff0000 : DOMAIN_COLORS.ROBOT
                );
            } else {
                this.mesh.material.color.set(DOMAIN_COLORS.ROBOT);
            }
        }

        if (domain === 'INFO' && spreadRate !== undefined) {
            const originalColor = new THREE.Color(DOMAIN_COLORS[domain]);
            const brighterColor = originalColor.lerp(
                new THREE.Color(0xffffff),
                spreadRate * 0.5
            );
            this.mesh.material.color.set(brighterColor);
        }

        const pulseFactor =
            1 + Math.sin(this.pulseTime * pulseSpeed) * pulseIntensity;
        const scale = baseScale * pulseFactor;
        this.mesh.scale.set(scale, scale, scale);

        // Update visibility
        this.mesh.visible = this.threatData.visibility > 0.1;

        // Check for investigation completion
        if (this.threatData.investigationCompleted) {
            this.updateMeshForInvestigation();
        }
    }

    updateMeshForInvestigation() {
        const { type } = this.threatData;
        if (type === 'FAKE') {
            this.mesh.visible = false;
        } else if (type === 'REAL') {
            const radius = 0.2;
            const height = radius * 5;
            this.mesh.geometry.dispose();
            this.mesh.geometry = new THREE.ConeGeometry(radius, height, 8);
        }
    }
}
