import * as THREE from 'three';

export class PathfindingService {
    constructor(world) {
        this.world = world; // The world state, might be needed for complex pathfinding
    }

    /**
     * Calculates a path from a start point to an end point.
     * @param {THREE.Vector3} start - The starting position vector.
     * @param {THREE.Vector3} end - The ending position vector.
     * @param {string} movementType - The type of movement (e.g., 'GROUND', 'AIR').
     * @returns {THREE.Vector3[]} An array of vectors representing the path.
     */
    calculatePath(start, end, movementType = 'GROUND') {
        switch (movementType) {
            case 'GROUND':
                return this.calculateGroundPath(start, end);
            case 'AIR':
                return this.calculateAirPath(start, end);
            default:
                console.warn(`Unknown movement type: ${movementType}`);
                return [];
        }
    }

    /**
     * Calculates a path along the surface of the sphere.
     * For now, a simple great-circle arc interpolation.
     */
    calculateGroundPath(start, end) {
        const path = [];
        const numPoints = 50; // Number of points to interpolate

        const globeRadius = start.length(); // Assume start is on the surface

        // Get a point between start and end to create an arc
        const mid = new THREE.Vector3()
            .addVectors(start, end)
            .multiplyScalar(0.5);
        // Bend the curve outwards slightly so it's not a straight line through the globe
        const bendFactor = start.distanceTo(end) * 0.15;
        mid.normalize().multiplyScalar(globeRadius + bendFactor);

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);

        for (let i = 0; i <= numPoints; i++) {
            const point = curve.getPoint(i / numPoints);
            // Ensure the point is on the sphere's surface by normalizing and scaling
            point.normalize().multiplyScalar(globeRadius);
            path.push(point);
        }

        return path;
    }

    /**
     * Calculates a direct path for air units.
     */
    calculateAirPath(start, end) {
        // For now, a simple straight line.
        // In the future, this could account for altitude, no-fly zones, etc.
        return [start, end];
    }
}
