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

test('released Ohm starts without recovery controls or matching options', async ({
  page,
}) => {
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

  // Recovery starts enabled for capable builds.
  await expect(recoverToggle(page)).toBeChecked();
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

test('the problems panel lists every error and jumps to it', async ({page}) => {
  await loadBlocksGrammar(page, TWO_MISTAKES);
  await recoverToggle(page).check();

  const problems = page
    .getByRole('list', {name: 'Problems'})
    .getByRole('button');
  await expect(problems).toHaveCount(2);
  await expect(problems.first()).toContainText('1:8');
  await expect(problems.first()).toContainText('expected "}" or a letter');
  await expect(problems.nth(1)).toContainText('1:19');
  await expect(problems.nth(1)).toContainText('expected ";" or a letter');

  await problems.nth(1).click();
  const cursor = await page.evaluate(() => {
    const cm = ohmEditor.ui.inputEditor;
    return cm.indexFromPos(cm.getCursor());
  });
  expect(cursor).toBe(18);

  // The trace step for that recovery is selected.
  const step = page.locator('.pexpr.currentParseStep');
  await expect(step).toHaveCount(1);
  await expect(step).toHaveClass(/\bcorrection\b/);
  await expect(step.locator('> .self .label')).toContainText('_correction');
});

test('a parse recovery cannot finish lists its final failure too', async ({
  page,
}) => {
  await loadBlocksGrammar(page, '{ aaa; 1 2; bbb; xx');
  await recoverToggle(page).check();

  const problems = page
    .getByRole('list', {name: 'Problems'})
    .getByRole('button');
  await expect(problems).toHaveCount(2);
  await expect(problems.first()).toContainText('1:8');
  await expect(problems.nth(1)).toContainText('1:20');
  await expect(problems.nth(1)).toHaveClass(/\bfinal\b/);
  await expect(exampleItem(page)).toHaveClass(/\bfail\b/);
});

test('the parse tree keeps statements and shows one correction before the join', async ({
  page,
}) => {
  await loadBlocksGrammar(page, '{ aaa; bbb; xxx }');
  await recoverToggle(page).check();

  const fallible = page.locator('.pexpr.fallible.recovered').first();
  await expect(fallible).toBeVisible();

  // The kept iteration, correction and actual join are separate children.
  const childLabels = fallible.locator(
    ':scope > .children > .pexpr > .self .label'
  );
  await expect(childLabels.first()).toHaveText('Stmt*');
  await expect(childLabels.nth(1)).toHaveText('_correction');
  await expect(childLabels.nth(2)).toHaveText('"}"');
  await expect(childLabels).toHaveCount(3);

  // The kept Stmt nodes stay inside the iteration.
  const iteration = fallible.locator(':scope > .children > .pexpr').first();
  const stmts = iteration.locator(
    ':scope > .children > .pexpr > .self .label',
    {hasText: /^\s*Stmt\s*$/}
  );
  await expect(stmts).toHaveCount(2);

  // The skip region node is shown with "Explain parse" off.
  await expect(page.locator('input[name=showFailures]')).not.toBeChecked();
  const skip = fallible.locator(':scope > .children > .pexpr.correction');
  await expect(skip).toHaveCount(1);
  await expect(skip).toBeVisible();
});
