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

    async initializeTravelRoutes() {
        const response = await fetch('data/travel_routes.json');
        const routesData = await response.json();

        routesData.forEach((routeData) => {
            const fromRegion = this.regions.find(
                (r) => r.id === routeData.from
            );
            const toRegion = this.regions.find((r) => r.id === routeData.to);

            if (fromRegion && toRegion) {
                const start = this.latLonToVector3(
                    fromRegion.centroid[0],
                    fromRegion.centroid[1]
                );
                const end = this.latLonToVector3(
                    toRegion.centroid[0],
                    toRegion.centroid[1]
                );

                const curve = new THREE.CatmullRomCurve3([
                    start,
                    this.getMidpoint(start, end, 0.2),
                    end,
                ]);

                const points = curve.getPoints(50);
                const geometry = new THREE.BufferGeometry().setFromPoints(
                    points
                );
                const material = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.2,
                });
                const curveObject = new THREE.Line(geometry, material);
                this.travelRoutes.push({
                    from: fromRegion,
                    to: toRegion,
                    mesh: curveObject,
                });
            }
        });
    }

    getMidpoint(v1, v2, bend) {
        const midpoint = new THREE.Vector3()
            .addVectors(v1, v2)
            .multiplyScalar(0.5);
        const distance = v1.distanceTo(v2);
        midpoint
            .normalize()
            .multiplyScalar(midpoint.length() + distance * bend);
        return midpoint;
    }

    latLonToVector3(lat, lon, radius = 5) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);

        return new THREE.Vector3(x, y, z);
    }

    getRegionForThreat(threat) {
        for (const region of this.regions) {
            const distance = this.greatCircleDistance(
                threat.lat,
                threat.lon,
                region.centroid[0],
                region.centroid[1]
            );
            if (distance <= region.radius) {
                return region;
            }
        }
        return null;
    }

    greatCircleDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
