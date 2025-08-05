class ActionService {
    constructor() {
        // Comparison functions for availability checks
        this.comparisons = {
            'eq': (a, b) => a === b,
            'neq': (a, b) => a !== b,
            'gt': (a, b) => a > b,
            'gte': (a, b) => a >= b,
            'lt': (a, b) => a < b,
            'lte': (a, b) => a <= b,
        };
    }

    /**
     * Checks if a given action is available in the current context.
     * @param {object} action The declarative action object from PlayerActions.
     * @param {object} context An object containing the current game state { worldState, playerFaction, selectedThreat, selectedRegion }.
     * @returns {boolean} True if the action is available, false otherwise.
     */
    isActionAvailable(action, context) {
        const { worldState, playerFaction } = context;

        // 1. Check resource cost
        if (action.resourceCost && !playerFaction.canAfford(action.resourceCost)) {
            return false;
        }

        // 2. Check availability conditions
        if (!action.availability) {
            return true; // No conditions means it's always available (if resources allow)
        }

        return action.availability.every(cond => this.checkCondition(cond, context));
    }

    /**
     * Executes a given action in the current context.
     * @param {object} action The declarative action object from PlayerActions.
     * @param {object} context An object containing the current game state { worldState, playerFaction, selectedThreat, selectedRegion }.
     * @returns {boolean} True if the action was successfully executed, false otherwise.
     */
    executeAction(action, context) {
        if (!this.isActionAvailable(action, context)) {
            return false;
        }

        const { playerFaction } = context;

        // 1. Spend resources
        if (action.resourceCost) {
            playerFaction.spend(action.resourceCost);
        }

        // 2. Apply effects
        action.effects.forEach(effect => {
            this.applyEffect(effect, context);
        });

        return true;
    }

    // --- Private Helper Methods ---

    checkCondition(condition, context) {
        const { worldState, selectedThreat, selectedRegion } = context;
        let subject;
        let propertyValue;

        switch (condition.type) {
            case 'threat_property':
                if (!selectedThreat) return false;
                propertyValue = this.resolveProperty(selectedThreat, condition.property);
                break;
            case 'region_property':
                if (!selectedRegion) return false;
                propertyValue = this.resolveProperty(selectedRegion, condition.property);
                break;
            case 'world_property':
                propertyValue = this.resolveProperty(worldState, condition.property);
                break;
            case 'selected_threat_property':
                if (!selectedThreat) return false;
                propertyValue = this.resolveProperty(selectedThreat, condition.property);
                break;
            case 'region_has_buff':
                if (!selectedRegion) return false;
                propertyValue = selectedRegion.activeBuffs.some(b => b.type === condition.buffType);
                // Note: The comparison value for this type is a boolean
                break;
            case 'world_property_count':
                const items = this.resolveProperty(worldState, condition.property);
                if (!Array.isArray(items)) return false;
                const filteredItems = items.filter(item => {
                    const itemValue = this.resolveProperty(item, condition.filter.property);
                    const compareValue = condition.filter.value === 'PLAYER' ? context.playerFaction.id : condition.filter.value;
                    return this.comparisons[condition.filter.comparison](itemValue, compareValue);
                });
                propertyValue = filteredItems.length;
                break;
            default:
                console.warn(`Unknown availability condition type: ${condition.type}`);
                return false;
        }

        const comparisonFunc = this.comparisons[condition.comparison];
        if (!comparisonFunc) {
            console.warn(`Unknown comparison type: ${condition.comparison}`);
            return false;
        }

        return comparisonFunc(propertyValue, condition.value);
    }

    applyEffect(effect, context) {
        let targetObject;
        const { worldState, selectedThreat, selectedRegion, playerFaction } = context;

        switch (effect.type) {
            case 'call_method': // Default to selectedThreat
                if (!selectedThreat) return;
                targetObject = selectedThreat;
                break;
            case 'call_method_on_target':
                const action = Object.values(PlayerActions).find(a => a.effects.includes(effect));
                if (!action) return;
                if (action.targetType === 'THREAT') targetObject = selectedThreat;
                if (action.targetType === 'REGION') targetObject = selectedRegion;
                break;
            case 'call_method_on_world':
                targetObject = worldState;
                break;
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
                return;
        }

        if (!targetObject || typeof targetObject[effect.method] !== 'function') {
            console.error(`Target object for effect does not have method: ${effect.method}`);
            return;
        }

        // Resolve parameters, allowing special keywords like 'playerFaction'
        const resolvedParams = (effect.params || []).map(p => {
            if (p === 'playerFaction') return playerFaction;
            return p;
        });

        targetObject[effect.method](...resolvedParams);
    }

    /**
     * Safely resolves nested properties from an object (e.g., 'attributes.internetAccess').
     * @param {object} obj The object to query.
     * @param {string} path The property path.
     * @returns {*} The value of the property, or undefined if not found.
     */
    resolveProperty(obj, path) {
        return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
    }
}
