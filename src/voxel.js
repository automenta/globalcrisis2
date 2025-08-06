
const MATERIAL_AIR = 0;
const MATERIAL_ROCK = 1;
const MATERIAL_WATER = 2;
const MATERIAL_ICE = 3;
const MATERIAL_SAND = 4;
const MATERIAL_GRASS = 5;

/**
 * Represents a chunk of voxels.
 * A chunk is a cube of voxels of size CHUNK_SIZE x CHUNK_SIZE x CHUNK_SIZE.
 */
export class Chunk {
    /**
     * @param {THREE.Vector3} position The position of the chunk in chunk coordinates.
     */
    constructor(position) {
        this.position = position;
        // LOD 0 (full resolution)
        this.voxels = [new Float32Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE)];
        this.materials = [new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE)];
        this.meshes = []; // To hold meshes for different LODs
        this.currentLod = -1; // -1 means no mesh is currently displayed

        this.weather = null; // To store weather data for this chunk
    }

    /**
     * Generates a lower-resolution LOD from a higher-resolution one.
     * @param {number} level The LOD level to generate (e.g., 1, 2).
     */
    generateLod(level) {
        if (level === 0 || !this.voxels[level - 1]) {
            console.error("Cannot generate LOD: base LOD not found or invalid level.");
            return;
        }

        const prevSize = CHUNK_SIZE / Math.pow(2, level - 1);
        const newSize = CHUNK_SIZE / Math.pow(2, level);
        const scale = 2; // Down-sampling factor

        const newVoxelData = new Float32Array(newSize * newSize * newSize);
        const newMaterialData = new Uint8Array(newSize * newSize * newSize);

        const prevVoxels = this.voxels[level - 1];
        const prevMaterials = this.materials[level - 1];

        for (let z = 0; z < newSize; z++) {
            for (let y = 0; y < newSize; y++) {
                for (let x = 0; x < newSize; x++) {
                    let totalDensity = 0;
                    const materialCounts = {};
                    let dominantMaterial = 0;
                    let maxCount = 0;

                    for (let dz = 0; dz < scale; dz++) {
                        for (let dy = 0; dy < scale; dy++) {
                            for (let dx = 0; dx < scale; dx++) {
                                const prevX = x * scale + dx;
                                const prevY = y * scale + dy;
                                const prevZ = z * scale + dz;
                                const index = prevX + prevY * prevSize + prevZ * prevSize * prevSize;

                                totalDensity += prevVoxels[index];
                                const mat = prevMaterials[index];
                                materialCounts[mat] = (materialCounts[mat] || 0) + 1;
                                if (materialCounts[mat] > maxCount) {
                                    maxCount = materialCounts[mat];
                                    dominantMaterial = mat;
                                }
                            }
                        }
                    }

                    const newIndex = x + y * newSize + z * newSize * newSize;
                    newVoxelData[newIndex] = totalDensity / (scale * scale * scale);
                    newMaterialData[newIndex] = dominantMaterial;
                }
            }
        }

        this.voxels[level] = newVoxelData;
        this.materials[level] = newMaterialData;
    }


    /**
     * Gets the voxel value at a given local coordinate within the chunk for a specific LOD.
     * @param {number} x The local x-coordinate.
     * @param {number} y The local y-coordinate.
     * @param {number} z The local z-coordinate.
     * @param {number} lod The level of detail.
     * @returns {number} The voxel value.
     */
    getVoxel(x, y, z, lod = 0) {
        const size = CHUNK_SIZE / Math.pow(2, lod);
        const index = x + y * size + z * size * size;
        return this.voxels[lod][index];
    }

    /**
     * Sets the voxel value at a given local coordinate within the chunk for a specific LOD.
     * @param {number} x The local x-coordinate.
     * @param {number} y The local y-coordinate.
     * @param {number} z The local z-coordinate.
     * @param {number} value The voxel value to set.
     * @param {number} lod The level of detail.
     */
    setVoxel(x, y, z, value, lod = 0) {
        const size = CHUNK_SIZE / Math.pow(2, lod);
        const index = x + y * size + z * size * size;
        this.voxels[lod][index] = value;
    }

    /**
     * Gets the material type at a given local coordinate within the chunk for a specific LOD.
     * @param {number} x The local x-coordinate.
     * @param {number} y The local y-coordinate.
     * @param {number} z The local z-coordinate.
     * @param {number} lod The level of detail.
     * @returns {number} The material type.
     */
    getMaterial(x, y, z, lod = 0) {
        const size = CHUNK_SIZE / Math.pow(2, lod);
        const index = x + y * size + z * size * size;
        return this.materials[lod][index];
    }

    /**
     * Sets the material type at a given local coordinate within the chunk for a specific LOD.
     * @param {number} x The local x-coordinate.
     * @param {number} y The local y-coordinate.
     * @param {number} z The local z-coordinate.
     * @param {number} value The material type to set.
     * @param {number} lod The level of detail.
     */
    setMaterial(x, y, z, value, lod = 0) {
        const size = CHUNK_SIZE / Math.pow(2, lod);
        const index = x + y * size + z * size * size;
        this.materials[lod][index] = value;
    }
}

/**
 * Manages the entire voxel world, including all chunks.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { CHUNK_SIZE, TERRAIN_FREQUENCY, TERRAIN_AMPLITUDE, CAVE_FREQUENCY, CAVE_THRESHOLD } from './constants.js';
import { MarchingCubes } from './marching_cubes.js';

export class VoxelWorld {
    constructor(seed = 'default-seed', numLods = 3) {
        this.chunks = new Map(); // Use a map for sparse storage of chunks.
        this.noise = new SimplexNoise(seed);
        this.numLods = numLods;
        this.powerMode = 'medium';
        this.lodDistances = [];
        this.setPowerMode(this.powerMode);
    }

    setPowerMode(mode) {
        this.powerMode = mode;
        switch (mode) {
            case 'high':
                this.lodDistances = [100, 200, 300]; // Distances for LOD 0, 1, 2
                break;
            case 'medium':
                this.lodDistances = [80, 160, 240];
                break;
            case 'low':
                this.lodDistances = [60, 120, 180];
                break;
        }
    }

    updateLods(cameraPosition) {
        this.chunks.forEach(chunk => {
            const chunkWorldPos = new THREE.Vector3(
                chunk.position.x * CHUNK_SIZE + CHUNK_SIZE / 2,
                chunk.position.y * CHUNK_SIZE + CHUNK_SIZE / 2,
                chunk.position.z * CHUNK_SIZE + CHUNK_SIZE / 2
            );
            const distance = cameraPosition.distanceTo(chunkWorldPos);

            let targetLod = this.numLods - 1;
            for (let i = 0; i < this.numLods; i++) {
                if (distance < this.lodDistances[i]) {
                    targetLod = i;
                    break;
                }
            }

            if (targetLod !== chunk.currentLod) {
                if (chunk.currentLod !== -1 && chunk.meshes[chunk.currentLod]) {
                    chunk.meshes[chunk.currentLod].visible = false;
                }
                if (chunk.meshes[targetLod]) {
                    chunk.meshes[targetLod].visible = true;
                }
                chunk.currentLod = targetLod;
            }
        });
    }

    /**
     * Generates the voxel data for a given chunk.
     * @param {Chunk} chunk The chunk to generate data for.
     * @param {ClimateGrid} climateGrid The climate data for the world.
     */
    generateChunk(chunk, climateGrid) {
        const planetRadius = 60; // Base radius of the rock sphere
        const seaLevel = 62;     // Radius of the water sphere
        const noiseScale = 0.05;

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const worldX = chunk.position.x * CHUNK_SIZE + x;
                    const worldY = chunk.position.y * CHUNK_SIZE + y;
                    const worldZ = chunk.position.z * CHUNK_SIZE + z;

                    const posVec = new THREE.Vector3(worldX, worldY, worldZ);
                    const distance = posVec.length();

                    const noiseValue = this.noise.noise3D(
                        worldX * noiseScale,
                        worldY * noiseScale,
                        worldZ * noiseScale
                    );

                    const terrainHeight = planetRadius + noiseValue * 10;

                    let density;
                    let material;

                    if (distance <= terrainHeight) {
                        // This is inside the terrain
                        density = terrainHeight - distance;

                        const { lat, lon } = this.vector3ToLatLon(posVec);
                        const climateData = climateGrid.getDataAt(lat, lon);

                        if (climateData.temperature < -5) {
                            material = MATERIAL_ICE;
                        } else if (climateData.temperature > 25 && climateData.moisture < 0.33) {
                            material = MATERIAL_SAND;
                        } else if (climateData.temperature > 5 && climateData.moisture >= 0.33) {
                            material = MATERIAL_GRASS;
                        } else {
                            material = MATERIAL_ROCK; // Default rock/dirt
                        }
                    } else if (distance <= seaLevel) {
                        // This is outside the terrain, but inside the water sphere
                        density = seaLevel - distance;
                        material = MATERIAL_WATER;
                    } else {
                        // This is in the air
                        density = seaLevel - distance;
                        material = MATERIAL_AIR;
                    }

                    chunk.setVoxel(x, y, z, density, 0);
                    chunk.setMaterial(x, y, z, material, 0);
                }
            }
        }

        // Generate lower-resolution LODs
        for (let level = 1; level < this.numLods; level++) {
            chunk.generateLod(level);
        }
    }

    vector3ToLatLon(position) {
        const radius = position.length();
        if (radius === 0) return { lat: 0, lon: 0 };
        const phi = Math.acos(position.y / radius);
        const theta = Math.atan2(position.z, -position.x);

        const lat = 90 - (phi * 180 / Math.PI);
        const lon = (theta * 180 / Math.PI) - 180;

        return { lat, lon };
    }

    /**
     * Creates a THREE.Mesh for a given chunk based on its voxel data for a specific LOD.
     * @param {Chunk} chunk The chunk to create a mesh for.
     * @param {number} lod The level of detail to create the mesh for.
     */
    createMeshForChunk(chunk, lod) {
        const size = CHUNK_SIZE / Math.pow(2, lod);
        const marchingCubes = new MarchingCubes(size);

        marchingCubes.data = chunk.voxels[lod];
        marchingCubes.isolation = 0; // The surface level. Values > 0 are solid.

        const geometry = marchingCubes.generate();
        if (geometry.attributes.position.count === 0) {
            chunk.meshes[lod] = null;
            return;
        }

        // --- Vertex Coloring based on Material ---
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        const positions = geometry.attributes.position.array;

        const materialColors = {
            [MATERIAL_ROCK]: new THREE.Color(0x968772),
            [MATERIAL_WATER]: new THREE.Color(0x0066ff),
            [MATERIAL_ICE]: new THREE.Color(0xe6f2ff),
            [MATERIAL_SAND]: new THREE.Color(0xf0e68c),
            [MATERIAL_GRASS]: new THREE.Color(0x228b22),
        };
        const defaultColor = new THREE.Color(0xff00ff);

        for (let i = 0; i < positions.length; i += 3) {
            const x = Math.max(0, Math.min(size - 1, Math.floor(positions[i])));
            const y = Math.max(0, Math.min(size - 1, Math.floor(positions[i + 1])));
            const z = Math.max(0, Math.min(size - 1, Math.floor(positions[i + 2])));

            const material = chunk.getMaterial(x, y, z, lod);
            const color = materialColors[material] || defaultColor;

            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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
                overlayIntensity: { value: 0.0 }
            },
            vertexColors: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        const scale = Math.pow(2, lod);
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(
            chunk.position.x * CHUNK_SIZE,
            chunk.position.y * CHUNK_SIZE,
            chunk.position.z * CHUNK_SIZE
        );
        mesh.visible = false; // Meshes are not visible by default
        mesh.userData.isChunkMesh = true;
        chunk.meshes[lod] = mesh;
    }


    /**
     * Updates a chunk's materials based on climate change and regenerates its mesh if necessary.
     * @param {Chunk} chunk The chunk to update.
     * @param {ClimateGrid} climateGrid The climate data for the world.
     * @returns {boolean} True if the mesh was updated, false otherwise.
     */
    updateChunkForClimateChange(chunk, climateGrid) {
        const newMaterials = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        let materialsChanged = false;

        const planetRadius = 60;
        const seaLevel = 62;
        const noiseScale = 0.05;

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const worldX = chunk.position.x * CHUNK_SIZE + x;
                    const worldY = chunk.position.y * CHUNK_SIZE + y;
                    const worldZ = chunk.position.z * CHUNK_SIZE + z;

                    const posVec = new THREE.Vector3(worldX, worldY, worldZ);
                    const distance = posVec.length();

                    const terrainHeight = planetRadius + this.noise.noise3D(
                        worldX * noiseScale,
                        worldY * noiseScale,
                        worldZ * noiseScale
                    ) * 10;

                    let newMaterial;
                    const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
                    const oldMaterial = chunk.getMaterial(x, y, z, 0);

                    if (distance <= terrainHeight) {
                        const { lat, lon } = this.vector3ToLatLon(posVec);
                        const climateData = climateGrid.getDataAt(lat, lon);

                        if (climateData.temperature < -5) {
                            newMaterial = MATERIAL_ICE;
                        } else if (climateData.temperature > 25 && climateData.moisture < 0.33) {
                            newMaterial = MATERIAL_SAND;
                        } else if (climateData.temperature > 5 && climateData.moisture >= 0.33) {
                            newMaterial = MATERIAL_GRASS;
                        } else {
                            newMaterial = MATERIAL_ROCK;
                        }
                    } else {
                        newMaterial = oldMaterial;
                    }

                    newMaterials[index] = newMaterial;

                    if (oldMaterial !== newMaterial) {
                        materialsChanged = true;
                    }
                }
            }
        }

        if (materialsChanged) {
            chunk.materials[0] = newMaterials;

            // Regenerate the lower LODs' material data from the new base
            for (let level = 1; level < this.numLods; level++) {
                chunk.generateLod(level);
            }

            // Regenerate all meshes for the chunk
            for (let lod = 0; lod < this.numLods; lod++) {
                // We need to properly remove the old mesh from the scene before creating a new one.
                // This will be handled by the LOD management system.
                this.createMeshForChunk(chunk, lod);
            }
            return true;
        }

        return false;
    }

    /**
     * Gets a chunk at a given chunk coordinate.
     * @param {number} cx The chunk x-coordinate.
     * @param {number} cy The chunk y-coordinate.
     * @param {number} cz The chunk z-coordinate.
     * @returns {Chunk | undefined} The chunk if it exists.
     */
    getChunk(cx, cy, cz) {
        const key = `${cx},${cy},${cz}`;
        return this.chunks.get(key);
    }

    /**
     * Adds a chunk to the world.
     * @param {Chunk} chunk The chunk to add.
     */
    addChunk(chunk) {
        const { x, y, z } = chunk.position;
        const key = `${x},${y},${z}`;
        this.chunks.set(key, chunk);
    }

    /**
     * Converts world coordinates to chunk and local voxel coordinates.
     * @param {number} x World x-coordinate.
     * @param {number} y World y-coordinate.
     * @param {number} z World z-coordinate.
     * @returns {{chunkCoord: THREE.Vector3, localCoord: THREE.Vector3}}
     */
    worldToVoxel(x, y, z) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cy = Math.floor(y / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const lx = x - cx * CHUNK_SIZE;
        const ly = y - cy * CHUNK_SIZE;
        const lz = z - cz * CHUNK_SIZE;
        return {
            chunkCoord: new THREE.Vector3(cx, cy, cz),
            localCoord: new THREE.Vector3(lx, ly, lz)
        };
    }
}
