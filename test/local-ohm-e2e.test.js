/* global ohmEditor */
import {test, expect} from '@playwright/test';
import {initNetworkReplay} from './playwrightHelpers.js';

test('the local loader starts the editor with a usable Ohm grammar', async ({
  page,
}) => {
  await initNetworkReplay(page);
  await page.goto('/?ohm-js=local');
  await expect(page).toHaveTitle(/Ohm Editor/);
  await page.waitForFunction(() => window.ohmEditor && ohmEditor.examples);
  await page.evaluate(() =>
    ohmEditor.ui.grammarEditor.setValue('Local { start = "ok" }')
  );
  await page.waitForFunction(() => ohmEditor.currentGrammar?.name === 'Local');
  expect(
    await page.evaluate(() => ohmEditor.currentGrammar.match('ok').succeeded())
  ).toBe(true);
});
