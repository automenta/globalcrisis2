import * as THREE from 'three';
import { Region } from '../region.js';

export class RegionManager {
    constructor(scene) {
        this.scene = scene;
        this.regions = [];
        this.travelRoutes = [];
        this.initializeRegions();
        this.initializeTravelRoutes();
    }

    async initializeRegions() {
        const response = await fetch('data/regions.json');
        const regionsData = await response.json();

        regionsData.forEach((data) => {
            const region = new Region(data);
            this.regions.push(region);
        });
    }

    getRegionForThreat(threat) {
        // This is an approximation. A better method would be to check if the point is inside a spherical cap.
        // For now, we use simple 3D distance. The region's "radius" is in km, which doesn't map directly to 3D units.
        // We'll use an arbitrary mapping for now. 1000km = 10 units.
        const REGION_RADIUS_3D_SCALE = 1 / 100;

        for (const region of this.regions) {
            const distance = threat.position.distanceTo(region.position);
            if (distance <= region.radius * REGION_RADIUS_3D_SCALE) {
                return region;
            }
        }
        return null;
    }
}
