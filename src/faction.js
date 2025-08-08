export class Faction {
    /**
     * @param {object} options
     * @param {string} options.id - Unique identifier for the faction.
     * @param {string} options.name - Display name of the faction.
     * @param {object} options.resources - Initial resources.
     * @param {number} options.resources.funds - Monetary resources.
     * @param {number} options.resources.intel - Intelligence points.
     * @param {number} options.resources.tech - Technological resources.
     * @param {object} [options.capabilities={}] - The faction's capabilities.
     */
    constructor({ id, name, resources, capabilities = {} }) {
        this.id = id;
        this.name = name;
        this.resources = {
            funds: resources.funds || 0,
            intel: resources.intel || 0,
            tech: resources.tech || 0,
        };
        this.capabilities = {
            threatDeployment: capabilities.threatDeployment || false,
            investigation: capabilities.investigation || true, // All factions can investigate
            influence: capabilities.influence || false,
            economicWarfare: capabilities.economicWarfare || false,
            cyberOperations: capabilities.cyberOperations || false,
            environmentalManipulation:
                capabilities.environmentalManipulation || false,
            spaceDominance: capabilities.spaceDominance || false,
            geoengineering: capabilities.geoengineering || false,
            spaceWeatherControl: capabilities.spaceWeatherControl || false,
            aiAssistedDesign: capabilities.aiAssistedDesign || false,
            mediaPropaganda: capabilities.mediaPropaganda || false,
            whistleblowerNetworks: capabilities.whistleblowerNetworks || false,
            diplomaticImmunity: capabilities.diplomaticImmunity || false,
            quantumOperations: capabilities.quantumOperations || false,
            radiologicalContainment:
                capabilities.radiologicalContainment || false,
            roboticCommand: capabilities.roboticCommand || false,
            misinformationCampaigns:
                capabilities.misinformationCampaigns || false,
            economicSanctions: capabilities.economicSanctions || false,
            neuroManipulation: capabilities.neuroManipulation || false,
            planetaryEngineering: capabilities.planetaryEngineering || false,
            temporalOperations: capabilities.temporalOperations || false,
        };
        // Base counter-intelligence strength. Can be modified by tech, events, etc.
        this.counterIntel = 0.1;
        // Timer for AI decision-making, to prevent decisions every frame
        this.decisionTimer = 0;
    }

    /**
     * Checks if the faction can afford a given resource cost.
     * @param {object} cost - The resource cost to check.
     * @param {number} [cost.funds=0] - Cost in funds.
     * @param {number} [cost.intel=0] - Cost in intel.
     * @param {number} [cost.tech=0] - Cost in tech.
     * @returns {boolean} - True if the faction can afford the cost, false otherwise.
     */
    canAfford(cost) {
        return (
            this.resources.funds >= (cost.funds || 0) &&
            this.resources.intel >= (cost.intel || 0) &&
            this.resources.tech >= (cost.tech || 0)
        );
    }

    /**
     * Spends resources from the faction's pool.
     * @param {object} cost - The resource cost to spend.
     * @param {number} [cost.funds=0] - Cost in funds.
     * @param {number} [cost.intel=0] - Cost in intel.
     * @param {number} [cost.tech=0] - Cost in tech.
     */
    spend(cost) {
        if (this.canAfford(cost)) {
            this.resources.funds -= cost.funds || 0;
            this.resources.intel -= cost.intel || 0;
            this.resources.tech -= cost.tech || 0;
        } else {
            console.error(`Faction ${this.name} cannot afford cost`, cost);
        }
    }
}
