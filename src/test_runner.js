import 'https://cdn.jsdelivr.net/npm/jest-lite@1.0.0-alpha.4/dist/core.js';
import 'https://cdn.jsdelivr.net/npm/jest-lite@1.0.0-alpha.4/dist/prettify.js';

export class TestRunner {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    async runTests() {
        this.uiManager.showTestPanel();
        this.uiManager.setTestResults('Running tests...');

        try {
            // Dynamically import test files
            await import('../tests/game.test.js');
            await import('../tests/climate.test.js');
            await import('../tests/movement.test.js');
            await import('../tests/physics.test.js');

            // Run tests
            const result = await jest.run();
            const summary = prettify.summary(result);

            this.uiManager.setTestResults(summary);
        } catch (error) {
            this.uiManager.setTestResults(`Error running tests: ${error.message}`);
        }
    }
}
