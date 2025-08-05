const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('file:' + path.join(__dirname, 'tests/test.html'), {waitUntil: 'networkidle'});

  const testFailure = await page.$('#test-failure');
  if (testFailure) {
    const errorMessage = await page.evaluate(el => el.textContent, testFailure);
    console.error('Test failed with error:', errorMessage);
    await browser.close();
    process.exit(1);
  } else {
    // Add a delay to wait for tests to finish, since there is no clear signal.
    await new Promise(resolve => setTimeout(resolve, 2000));
    const testFailureAfterWait = await page.$('#test-failure');
    if (testFailureAfterWait) {
        const errorMessage = await page.evaluate(el => el.textContent, testFailureAfterWait);
        console.error('Test failed with error:', errorMessage);
        await browser.close();
        process.exit(1);
    } else {
        console.log('All tests passed!');
        await browser.close();
    }
  }
})();
