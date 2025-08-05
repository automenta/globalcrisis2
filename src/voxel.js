const CHUNK_SIZE = 32;

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
class Chunk {
    /**
     * @param {THREE.Vector3} position The position of the chunk in chunk coordinates.
     */
    constructor(position) {
        this.position = position;
        // Initialize a 3D array for the voxel data (density).
        this.voxels = new Float32Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        // Initialize a 3D array for the material type.
        this.materials = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        this.mesh = null; // This will hold the Three.js mesh for this chunk.
        this.weather = null; // To store weather data for this chunk
    }

    /**
     * Gets the voxel value at a given local coordinate within the chunk.
     * @param {number} x The local x-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} y The local y-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} z The local z-coordinate (0 to CHUNK_SIZE - 1).
     * @returns {number} The voxel value.
     */
    getVoxel(x, y, z) {
        const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
        return this.voxels[index];
    }

    /**
     * Sets the voxel value at a given local coordinate within the chunk.
     * @param {number} x The local x-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} y The local y-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} z The local z-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} value The voxel value to set.
     */
    setVoxel(x, y, z, value) {
        const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
        this.voxels[index] = value;
    }

    /**
     * Gets the material type at a given local coordinate within the chunk.
     * @param {number} x The local x-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} y The local y-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} z The local z-coordinate (0 to CHUNK_SIZE - 1).
     * @returns {number} The material type.
     */
    getMaterial(x, y, z) {
        const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
        return this.materials[index];
    }

    /**
     * Sets the material type at a given local coordinate within the chunk.
     * @param {number} x The local x-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} y The local y-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} z The local z-coordinate (0 to CHUNK_SIZE - 1).
     * @param {number} value The material type to set.
     */
    setMaterial(x, y, z, value) {
        const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
        this.materials[index] = value;
    }
}

/**
 * Manages the entire voxel world, including all chunks.
 */
class VoxelWorld {
    constructor(seed = 'default-seed') {
        this.chunks = new Map(); // Use a map for sparse storage of chunks.
        this.noise = new SimplexNoise(seed);
        this.marchingCubes = new MarchingCubes(CHUNK_SIZE);
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

                    chunk.setVoxel(x, y, z, density);
                    chunk.setMaterial(x, y, z, material);
                }
            }
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
     * Creates a THREE.Mesh for a given chunk based on its voxel data.
     * @param {Chunk} chunk The chunk to create a mesh for.
     */
    createMeshForChunk(chunk) {
        // The MarchingCubes algorithm needs to be reset with the new data.
        this.marchingCubes.data = chunk.voxels;
        this.marchingCubes.isolation = 0; // The surface level. Values > 0 are solid.

        const geometry = this.marchingCubes.generate();
        if (geometry.attributes.position.count === 0) {
            // No geometry was generated, so no mesh to create.
            chunk.mesh = null;
            return;
        }

        // --- Vertex Coloring based on Material ---
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        const positions = geometry.attributes.position.array;

        const materialColors = {
            [MATERIAL_ROCK]: new THREE.Color(0x968772), // Brownish rock
            [MATERIAL_WATER]: new THREE.Color(0x0066ff), // Blue
            [MATERIAL_ICE]: new THREE.Color(0xe6f2ff),   // Whitish blue
            [MATERIAL_SAND]: new THREE.Color(0xf0e68c),  // Khaki
            [MATERIAL_GRASS]: new THREE.Color(0x228b22), // ForestGreen
        };
        const defaultColor = new THREE.Color(0xff00ff); // Magenta for errors

        for (let i = 0; i < positions.length; i += 3) {
            // Clamp coordinates to be safe
            const x = Math.max(0, Math.min(CHUNK_SIZE - 1, Math.floor(positions[i])));
            const y = Math.max(0, Math.min(CHUNK_SIZE - 1, Math.floor(positions[i + 1])));
            const z = Math.max(0, Math.min(CHUNK_SIZE - 1, Math.floor(positions[i + 2])));

            const material = chunk.getMaterial(x, y, z);
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
                overlayIntensity: { value: 0.0 } // Start with no overlay
            },
            vertexColors: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Position the mesh according to the chunk's world position.
        mesh.position.set(
            chunk.position.x * CHUNK_SIZE,
            chunk.position.y * CHUNK_SIZE,
            chunk.position.z * CHUNK_SIZE
        );

        chunk.mesh = mesh;
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
                    const oldMaterial = chunk.getMaterial(x, y, z);

                    if (distance <= terrainHeight) {
                        // This is a terrain voxel, its material might change.
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
                        // Not a terrain voxel, so the material is the same as before.
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
            chunk.materials = newMaterials;
            // The density of voxels hasn't changed, so the geometry is the same.
            // We just need to regenerate the mesh to update the vertex colors.
            this.createMeshForChunk(chunk);
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
