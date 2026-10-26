/* global ohmEditor */
import {test, expect} from '@playwright/test';
import {initNetworkReplay} from './playwrightHelpers.js';

// Needs a local Ohm build with Fallible, linked at public/dist.
const BLOCKS_GRAMMAR = String.raw`Blocks {
  Block = "{" Stmt* ! "}"
  Stmt = Body ! ";"
  Body = letter+
}`;

// A statement in the middle of the block is broken, and the last statement
// lacks its terminator before the block's "}".
const TWO_MISTAKES = '{ aaa; 1; bbb; xx }';

async function loadBlocksGrammar(page, exampleText) {
  await initNetworkReplay(page);
  await page.goto('/?ohm-js=local');
  await expect(page).toHaveTitle(/Ohm Editor/);
  await page.waitForFunction(() => window.ohmEditor && ohmEditor.examples);
  await page.evaluate(
    ([grammar, text]) => {
      ohmEditor.ui.grammarEditor.setValue(grammar);
      ohmEditor.examples.restoreExamples([
        {text, startRule: '', selectedGrammar: '', shouldMatch: true},
      ]);
    },
    [BLOCKS_GRAMMAR, exampleText]
  );
  await page.waitForFunction(
    () => ohmEditor.currentGrammar && ohmEditor.currentGrammar.name === 'Blocks'
  );
}

const exampleItem = page =>
  page.getByRole('list', {name: 'Examples'}).getByRole('listitem').first();

const recoverToggle = page =>
  page.getByRole('checkbox', {name: 'Recover from errors'});

test('released Ohm starts without recovery controls or matching options', async ({page}) => {
  await initNetworkReplay(page);
  await page.goto('/');
  await page.waitForFunction(() => window.ohmEditor && ohmEditor.examples);
  await expect(recoverToggle(page)).toHaveCount(0);
  expect(await page.evaluate(() => ohmEditor.capabilities.recover)).toBe(false);
  expect(await page.evaluate(() => ohmEditor.options.recover)).toBeUndefined();
});

test('the recover toggle marks the example as matched with recovered errors', async ({
  page,
}) => {
  await loadBlocksGrammar(page, TWO_MISTAKES);

  // Recovery is opt-in for capable builds.
  await expect(recoverToggle(page)).not.toBeChecked();
  await expect(exampleItem(page)).toHaveClass(/\bfail\b/);
  await recoverToggle(page).check();
  await expect(exampleItem(page)).toHaveClass(/\brecovered\b/);
  await expect(exampleItem(page)).toHaveAttribute(
    'title',
    'Matched with recovered errors'
  );

  // Off: the example fails as a plain sequence would.
  await recoverToggle(page).uncheck();
  await expect(exampleItem(page)).toHaveClass(/\bfail\b/);
});

test('the input pane tints skip regions and marks failure positions', async ({
  page,
}) => {
  await loadBlocksGrammar(page, TWO_MISTAKES);
  await recoverToggle(page).check();

  const input = page.locator('#exampleEditor .CodeMirror');
  await expect(input.locator('.recovered-interval')).toHaveCount(2);
  await expect(input.locator('.recovered-interval').first()).toHaveText('1');
  await expect(input.locator('.recovered-interval').nth(1)).toHaveText('xx');
  await expect(input.locator('.recovery-marker')).toHaveCount(2);
});
