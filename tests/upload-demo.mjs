// Starts a local Vite server. Install Playwright separately if needed.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = process.env.TEST_BASE_URL ? null : await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } });
await server?.listen();
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // Isolate UI checks from live services; this test does not validate API responses.
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Live service excluded from UI test' } }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const mode of ['enable', 'direct']) {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:5173'}/#/${mode}`);
      await page.getByTestId('subnav-documents').waitFor({ timeout: 15000 }).catch(async e => { console.error('PAGE', await page.locator('body').innerText(), errors); throw e; });
      await page.getByTestId('subnav-documents').click();
      const panel = page.getByTestId('upload-dropzone').locator('../../..');
      await panel.waitFor();
      assert.match(await panel.innerText(), /Demo only/);
      assert.equal(await panel.locator('input[type="file"]').count(), 0);
      const list = page.getByRole('note').filter({ hasText: 'Demo library:' }).locator('..');
      const rows = list.locator('li[data-testid^="uploaded-item-"]');
      const initial = await rows.count();
      let requests = 0;
      const countRequest = request => { if (request.url().includes('/api/')) requests++; };
      page.on('request', countRequest);
      const dropFile = async () => {
        const dataTransfer = await page.evaluateHandle(() => {
          const data = new DataTransfer();
          data.items.add(new File(['private content'], 'actual-client-document.pdf', { type: 'application/pdf' }));
          return data;
        });
        await panel.getByTestId('upload-dropzone').dispatchEvent('drop', { dataTransfer });
        await page.getByRole('alert').waitFor();
        assert.match(await page.getByRole('alert').innerText(), /No document was uploaded or analysed/);
        await dataTransfer.dispose();
      };
      await dropFile();
      assert.equal(await rows.count(), initial);
      assert.doesNotMatch(await list.innerText(), /actual-client-document/);
      // Exercise a non-default material type and keyboard activation.
      const typeButton = panel.getByTestId('material-type-list').getByRole('button').nth(1);
      const typeLabel = (await typeButton.innerText()).split('\n')[0];
      await typeButton.click();
      await panel.getByRole('button', { name: 'Show sample entry', exact: true }).focus();
      await page.keyboard.press('Enter');
      await panel.getByText('Demo sample added. No analysis performed.', { exact: true }).waitFor();
      assert.equal(await rows.count(), initial + 1);
      assert.match(await rows.first().innerText(), /Demo sample/i);
      assert.ok((await rows.first().innerText()).toLowerCase().includes(typeLabel.toLowerCase()));
      assert.match(await rows.first().innerText(), /No document analysis performed/);
      assert.doesNotMatch(await rows.first().innerText(), /Claim audit completed|Brief inputs extracted|mapping refreshed/);
      for (const row of await rows.all()) assert.match(await row.innerText(), /Demo ·/i);
      await dropFile();
      assert.equal(await rows.count(), initial + 1);
      await panel.getByRole('button', { name: 'Show another sample', exact: true }).click();
      await panel.getByRole('button', { name: 'Show sample entry', exact: true }).click();
      assert.equal(await rows.count(), initial + 2);
      assert.equal(requests, 0, 'Demo actions must not call APIs');
      page.off('request', countRequest);
      if (mode === 'enable') {
        await page.getByTestId('subnav-rfp').click();
        await page.getByTestId('rfp-analyzer').waitFor();
        assert.equal(await page.getByTestId('rfp-analyzer').locator('input[type="file"]').count(), 1);
      }
      console.log(`PASS ${mode} at ${width}px: rejection, sample, reset, labels, no API calls`);
    }
    await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:5173'}/#/how-it-works`);
    await page.getByText('Demo model impacts', { exact: true }).first().waitFor();
    assert.doesNotMatch(await page.locator('body').innerText(), /Captured, not predicted/);
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
  await server?.close();
}
