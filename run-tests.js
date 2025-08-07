const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const serveHandler = require('serve-handler');

(async () => {
    const server = http.createServer((request, response) => {
        return serveHandler(request, response, {
            public: path.join(__dirname),
        });
    });

    server.listen(8080, async () => {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

        console.log('Navigating to test page...');
        await page.goto('http://localhost:8080/tests/test.html', {
            waitUntil: 'networkidle',
        });
        console.log('Test page loaded.');

        // Wait for the tests to complete
        await page.waitForFunction('window.testsAreComplete === true');

        const failuresElement = await page.$('#mocha-stats .failures a');
        let failures = 0;
        if (failuresElement) {
            const failuresText = await failuresElement.textContent();
            failures = parseInt(failuresText, 10);
        }

        if (failures > 0) {
            console.error(`${failures} test(s) failed!`);
            await browser.close();
            server.close();
            process.exit(1);
        } else {
            console.log('All tests passed!');
            await browser.close();
            server.close();
        }
    });
})();
