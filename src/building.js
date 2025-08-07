export class Building {
    constructor({ region, type, owner, position }) {
        this.id = `${type}-${region.id}-${Date.now()}`;
        this.region = region;
        this.type = type; // 'BASE', 'SENSOR', etc.
        this.owner = owner; // 'PLAYER' or 'technocrats'
        this.position = position;
    }
}
