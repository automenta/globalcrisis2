import * as THREE from 'three';
import { latLonToVector3 } from './utils.js';

import * as THREE from 'three';
import { latLonToVector3 } from './utils.js';
import { THREAT_DOMAINS } from './constants.js';

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
        this.updateObjects(Array.from(simulationState.voxelWorld.chunks.values()), this.chunkMeshes, this.addChunk.bind(this), this.updateChunk.bind(this));
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
        mesh.position.copy(latLonToVector3(threat.lat, threat.lon, 50));
        mesh.userData = { id: threat.id, type: 'threat' };
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
        mesh.position.copy(latLonToVector3(building.lat, building.lon, 50));
        mesh.userData = { id: building.id, type: 'building' };
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
        mesh.position.copy(latLonToVector3(unit.lat, unit.lon, 50));
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
        mesh.position.copy(latLonToVector3(agent.lat, agent.lon, 50));
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
        this.satelliteMeshes.set(satellite.id, mesh);
        this.scene.add(mesh);
    }

    updateSatellite(satellite) {
        const mesh = this.satelliteMeshes.get(satellite.id);
        if (mesh) {
            mesh.position.set(satellite.position.x, satellite.position.y, satellite.position.z);
        }
    }

    addChunk(chunk) {
        // This is more complex, as it involves generating geometry data from the worker
        // For now, we'll just create a placeholder
        const geometry = new THREE.BoxGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(chunk.position.x * CHUNK_SIZE, chunk.position.y * CHUNK_SIZE, chunk.position.z * CHUNK_SIZE);
        this.chunkMeshes.set(chunk.id, mesh);
        this.scene.add(mesh);
    }

    updateChunk(chunk) {
        // This will be implemented later
    }
}
