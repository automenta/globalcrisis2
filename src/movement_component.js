class MovementComponent {
    constructor(options = {}) {
        this.speed = options.speed || 1.0; // World units per second
        this.movementType = options.movementType || 'GROUND'; // e.g., GROUND, AIR, NAVAL
        this.path = []; // An array of THREE.Vector3 points
        this.currentTargetIndex = 0;
        this.isActive = false;
    }

    setPath(path) {
        this.path = path;
        this.currentTargetIndex = 1; // Start moving towards the first point in the path
        this.isActive = this.path.length > 0;
    }

    stop() {
        this.isActive = false;
        this.path = [];
        this.currentTargetIndex = 0;
    }

    update(entity, dt) {
        if (!this.isActive || !this.path || this.currentTargetIndex >= this.path.length) {
            this.stop();
            return;
        }

        const entityPosition = entity.mesh.position;
        const targetPosition = this.path[this.currentTargetIndex];
        const distanceToTarget = entityPosition.distanceTo(targetPosition);
        const moveDistance = this.speed * dt;

        if (distanceToTarget <= moveDistance) {
            // Arrived at the current target point, snap to it
            entityPosition.copy(targetPosition);
            this.currentTargetIndex++;
            if (this.currentTargetIndex >= this.path.length) {
                // Reached the end of the path
                this.stop();
            }
        } else {
            // Move towards the target
            const direction = new THREE.Vector3().subVectors(targetPosition, entityPosition).normalize();
            entityPosition.addScaledVector(direction, moveDistance);
            // Make the entity look where it's going
            entity.mesh.lookAt(targetPosition);
        }
    }
}
