const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const serveHandler = require('serve-handler');

(async () => {
    const server = http.createServer((request, response) => {
        return serveHandler(request, response, {
            public: path.join(__dirname)
        });
    });

    server.listen(8080, async () => {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.goto('http://localhost:8080/tests/test.html', { waitUntil: 'networkidle' });

        const failures = await page.$('.fail');
        if (failures) {
            console.error('Tests failed!');
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
