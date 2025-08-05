const CHUNK_SIZE = 32;

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
        // Initialize a 3D array for the voxel data.
        // A value > 0 can represent solid material, and <= 0 can represent air.
        this.voxels = new Float32Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        this.mesh = null; // This will hold the Three.js mesh for this chunk.
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
     */
    generateChunk(chunk) {
        const planetRadius = 64; // In voxels
        const noiseScale = 0.05;

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let y = 0; y < CHUNK_SIZE; y++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const worldX = chunk.position.x * CHUNK_SIZE + x;
                    const worldY = chunk.position.y * CHUNK_SIZE + y;
                    const worldZ = chunk.position.z * CHUNK_SIZE + z;

                    // Calculate distance from the center of the world (0,0,0)
                    const distance = Math.sqrt(worldX * worldX + worldY * worldY + worldZ * worldZ);

                    // Get a noise value
                    const noiseValue = this.noise.noise3D(
                        worldX * noiseScale,
                        worldY * noiseScale,
                        worldZ * noiseScale
                    );

                    // Combine distance and noise to form the planet
                    // The density is higher closer to the center and perturbed by noise
                    const density = planetRadius - distance + noiseValue * 10;

                    chunk.setVoxel(x, y, z, density);
                }
            }
        }
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

        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Green for land
            roughness: 0.8,
            metalness: 0.2,
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
