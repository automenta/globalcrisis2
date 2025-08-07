/**
 * @file A generic Goal-Oriented Action Planning (GOAP) system using the A* search algorithm.
 * This implementation is designed to be reusable and is not tied to any specific game logic.
 * It operates on abstract states (key-value pairs) and actions with preconditions and effects.
 */

/**
 * Represents a node in the A* search graph.
 */
class Node {
    /**
     * @param {object} state - The state of the world at this node.
     * @param {Node|null} parent - The parent node in the plan.
     * @param {object|null} action - The action that led to this state.
     * @param {number} g - The cost from the start node to this node.
     * @param {number} h - The heuristic cost from this node to the goal.
     */
    constructor(state, parent, action, g, h) {
        this.state = state;
        this.parent = parent;
        this.action = action;
        this.g = g; // Cost from start
        this.h = h; // Heuristic cost to goal
    }

    /**
     * The total estimated cost of the path through this node.
     * @returns {number}
     */
    f() {
        return this.g + this.h;
    }
}

/**
 * A generic GOAP planner that uses A* to find a sequence of actions to achieve a goal.
 */
export class GOAPPlanner {
    /**
     * Finds a sequence of actions to satisfy a goal from a given world state.
     * @param {object} worldState - The initial state of the world.
     * @param {Array<object>} availableActions - The set of all possible actions the AI can perform.
     * @param {object} goal - The desired goal state.
     * @returns {Array<object>|null} A sequence of actions, or null if no plan is found.
     */
    plan(worldState, availableActions, goal) {
        const openSet = [];
        const closedSet = new Set();

        // The heuristic is the number of unmet goal conditions.
        const heuristic = (state) => {
            let distance = 0;
            for (const key in goal) {
                if (state[key] !== goal[key]) {
                    distance++;
                }
            }
            return distance;
        };

        // We are doing a backward search from the goal.
        // The start node for our search is the goal state.
        const startNode = new Node(goal, null, null, 0, heuristic(worldState));
        openSet.push(startNode);

        let maxIterations = 1000; // Safety break to prevent infinite loops

        while (openSet.length > 0 && maxIterations > 0) {
            maxIterations--;

            // Find the node with the lowest f-cost in the open set.
            openSet.sort((a, b) => a.f() - b.f());
            const currentNode = openSet.shift();

            // If the current state satisfies the initial world state, we've found a plan.
            if (this.satisfies(worldState, currentNode.state)) {
                return this.reconstructPlan(currentNode);
            }

            closedSet.add(JSON.stringify(currentNode.state));

            // Find neighbors (actions that could lead to the current state).
            for (const action of availableActions) {
                // Check if the action's effects can produce the current state.
                if (this.canAchieve(action, currentNode.state)) {
                    const newState = this.applyPreconditions(
                        currentNode.state,
                        action
                    );
                    const newStateKey = JSON.stringify(newState);

                    if (closedSet.has(newStateKey)) {
                        continue;
                    }

                    const g = currentNode.g + (action.cost || 1);
                    const h = heuristic(newState);
                    const newNode = new Node(
                        newState,
                        currentNode,
                        action,
                        g,
                        h
                    );

                    // Check if this new state is already in the open set with a lower cost.
                    let inOpenSetIndex = -1;
                    for (let i = 0; i < openSet.length; i++) {
                        if (JSON.stringify(openSet[i].state) === newStateKey) {
                            inOpenSetIndex = i;
                            break;
                        }
                    }

                    if (inOpenSetIndex === -1) {
                        openSet.push(newNode);
                    } else if (newNode.f() < openSet[inOpenSetIndex].f()) {
                        openSet[inOpenSetIndex] = newNode;
                    }
                }
            }
        }

        // No plan found.
        return null;
    }

    /**
     * Reconstructs the plan by backtracking from the goal node.
     * @param {Node} node - The final node in the search graph.
     * @returns {Array<object>} The sequence of actions.
     */
    reconstructPlan(node) {
        const plan = [];
        let current = node;
        while (current.parent && current.action) {
            plan.unshift(current.action); // Add action to the front of the plan
            current = current.parent;
        }
        return plan;
    }

    /**
     * Checks if a source state satisfies a target state.
     * @param {object} sourceState - The state to check from.
     * @param {object} targetState - The state to check against.
     * @returns {boolean}
     */
    satisfies(sourceState, targetState) {
        for (const key in targetState) {
            if (sourceState[key] !== targetState[key]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if an action's effects can contribute to achieving a state.
     * @param {object} action - The action to check.
     * @param {object} state - The target state.
     * @returns {boolean}
     */
    canAchieve(action, state) {
        for (const key in action.effects) {
            if (state[key] === action.effects[key]) {
                return true; // The action has at least one effect that matches the target state
            }
        }
        return false;
    }

    /**
     * Applies the preconditions of an action to a state to get the preceding state.
     * This is used for backward search.
     * @param {object} state - The current state.
     * @param {object} action - The action whose preconditions to apply.
     * @returns {object} The new state.
     */
    applyPreconditions(state, action) {
        const newState = { ...state };
        // Remove the effects of the action to get the previous state
        for (const key in action.effects) {
            delete newState[key];
        }
        // Add the preconditions to get the previous state
        for (const key in action.preconditions) {
            newState[key] = action.preconditions[key];
        }
        return newState;
    }
}
