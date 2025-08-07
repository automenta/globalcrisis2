import * as THREE from 'three';
import { THREAT_DOMAINS, CHUNK_SIZE } from './constants.js';

export class WorldView {
    constructor(scene) {
        this.scene = scene;
        this.threatMeshes = new Map();
        this.buildingMeshes = new Map();
        this.unitMeshes = new Map();
        this.agentMeshes = new Map();
        this.satelliteMeshes = new Map();
        this.chunkMeshes = new Map();
    }

    update(simulationState) {
        this.updateObjects(simulationState.threats, this.threatMeshes, this.addThreat.bind(this), this.updateThreat.bind(this));
        this.updateObjects(simulationState.buildings, this.buildingMeshes, this.addBuilding.bind(this), this.updateBuilding.bind(this));
        this.updateObjects(simulationState.units, this.unitMeshes, this.addUnit.bind(this), this.updateUnit.bind(this));
        this.updateObjects(simulationState.agents, this.agentMeshes, this.addAgent.bind(this), this.updateAgent.bind(this));
        this.updateObjects(simulationState.satellites, this.satelliteMeshes, this.addSatellite.bind(this), this.updateSatellite.bind(this));
    }

    updateObjects(objects, meshes, addFn, updateFn) {
        const allIds = new Set(objects.map(o => o.id));
        meshes.forEach((mesh, id) => {
            if (!allIds.has(id)) {
                this.scene.remove(mesh);
                meshes.delete(id);
            }
        });
        objects.forEach(obj => {
            if (meshes.has(obj.id)) {
                updateFn(obj);
            } else {
                addFn(obj);
            }
        });
    }

    addThreat(threat) {
        const domainInfo = THREAT_DOMAINS[threat.domain] || {};
        const color = domainInfo.color || 0xffffff;
        const geometry = new THREE.OctahedronGeometry(2, 0);
        const material = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(threat.position);
        mesh.userData = { simObject: threat, type: 'threat' };
        this.threatMeshes.set(threat.id, mesh);
        this.scene.add(mesh);
    }

    updateThreat(threat) {
        const mesh = this.threatMeshes.get(threat.id);
        if (mesh) {
            mesh.material.opacity = threat.visibility * 0.8 + 0.2;
            mesh.visible = threat.visibility > 0.1;
        }
    }

    addBuilding(building) {
        let geometry;
        switch (building.type) {
            case 'BASE': geometry = new THREE.BoxGeometry(0.2, 0.2, 0.4); break;
            case 'SENSOR': geometry = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 8); break;
            case 'RESEARCH_OUTPOST': geometry = new THREE.DodecahedronGeometry(0.2); break;
            default: geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }
        const ownerColor = building.owner === 'mitigators' ? 0x0000ff : 0xff0000;
        const material = new THREE.MeshPhongMaterial({ color: ownerColor });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(building.position);
        mesh.userData = { simObject: building, type: 'building' };
        this.buildingMeshes.set(building.id, mesh);
        this.scene.add(mesh);
    }

    updateBuilding(building) {
        // No updates for now
    }

    addUnit(unit) {
        let geometry;
        switch (unit.type) {
            case 'AGENT': geometry = new THREE.ConeGeometry(0.1, 0.4, 8); break;
            case 'GROUND_VEHICLE': geometry = new THREE.BoxGeometry(0.3, 0.1, 0.2); break;
            case 'AIRCRAFT': geometry = new THREE.TetrahedronGeometry(0.2, 0); break;
            default: geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }
        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(unit.position);
        mesh.userData = { simObject: unit, type: 'unit' };
        this.unitMeshes.set(unit.id, mesh);
        this.scene.add(mesh);
    }

    updateUnit(unit) {
        const mesh = this.unitMeshes.get(unit.id);
        if (mesh) {
            mesh.position.set(unit.position.x, unit.position.y, unit.position.z);
        }
    }

    addAgent(agent) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(agent.position);
        mesh.userData = { simObject: agent, type: 'agent' };
        this.agentMeshes.set(agent.id, mesh);
        this.scene.add(mesh);
    }

    updateAgent(agent) {
        // No updates for now
    }

    addSatellite(satellite) {
        const geometry = new THREE.OctahedronGeometry(0.15, 0);
        const material = new THREE.MeshPhongMaterial({ color: 0xcccccc, emissive: 0xaaaaaa });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(satellite.position.x, satellite.position.y, satellite.position.z);
        mesh.userData = { simObject: satellite, type: 'satellite' };
        this.satelliteMeshes.set(satellite.id, mesh);
        this.scene.add(mesh);
    }

    updateSatellite(satellite) {
        const mesh = this.satelliteMeshes.get(satellite.id);
        if (mesh) {
            mesh.position.set(satellite.position.x, satellite.position.y, satellite.position.z);
        }
    }

    addChunkMesh(payload) {
        const { chunkId, chunkPosition, geometry: geometryData } = payload;

        if (!geometryData) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(geometryData.positions, 3)
        );
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(geometryData.normals, 3)
        );
        geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(geometryData.colors, 3)
        );

        const vertexShader = `
            varying vec3 vColor;
            void main() {
                vColor = color;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;
            uniform vec3 overlayColor;
            uniform float overlayIntensity;
            void main() {
                vec3 finalColor = mix(vColor, overlayColor, overlayIntensity);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                overlayColor: { value: new THREE.Color(0xff0000) },
                overlayIntensity: { value: 0.0 },
            },
            vertexColors: true,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            chunkPosition.x * CHUNK_SIZE,
            chunkPosition.y * CHUNK_SIZE,
            chunkPosition.z * CHUNK_SIZE
        );
        mesh.userData.isChunkMesh = true;

        this.chunkMeshes.set(chunkId, mesh);
        this.scene.add(mesh);
    }
}
