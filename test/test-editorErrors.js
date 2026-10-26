/* eslint-env node */

import 'global-jsdom/register';

import {test} from 'uvu';
import * as assert from 'uvu/assert';

import {markRecoveredFailures} from '../src/editorErrors.js';
import ohmEditor from '../src/ohmEditor.js';
import {getProblems, matchOptions, supportsRecovery} from '../src/recovery.js';

// Helpers
// -------

// A CodeMirror stand-in that records marks and bookmarks on a single line.
function fakeEditor() {
  const marks = [];
  return {
    marks,
    posFromIndex(idx) {
      return {line: 0, ch: idx};
    },
    markText(from, to, opts) {
      const mark = {kind: 'text', from: from.ch, to: to.ch, ...opts};
      mark.clear = () => (mark.cleared = true);
      marks.push(mark);
      return mark;
    },
    setBookmark(pos, opts) {
      const mark = {kind: 'bookmark', at: pos.ch, widget: opts.widget};
      mark.clear = () => (mark.cleared = true);
      marks.push(mark);
      return mark;
    },
    addLineWidget() {
      return {clear() {}};
    },
  };
}

function fakeFailure(startIdx, endIdx, position, expected) {
  return {
    interval: {startIdx, endIdx, contents: 'x'.repeat(endIdx - startIdx)},
    position,
    shortMessage: `Line 1, col ${position + 1}: expected ${expected}`,
    getExpectedText: () => expected,
    getRightmostFailures: () => [],
  };
}

function fakeResult(succeeded, failures) {
  return {
    succeeded: () => succeeded,
    failed: () => !succeeded,
    getRecoveredFailures: () => failures,
    getInterval: () => ({startIdx: 0, endIdx: 0}),
    getRightmostFailures: () => [],
  };
}

const live = marks => marks.filter(m => !m.cleared);

// Tests
// -----

test('several recovered failures each get a tint and a marker', () => {
  const editor = fakeEditor();
  const result = fakeResult(true, [
    fakeFailure(7, 8, 7, '"}" or a letter'),
    fakeFailure(15, 17, 18, '";" or a letter'),
  ]);

  markRecoveredFailures(editor, getProblems(result));

  const tints = editor.marks.filter(m => m.kind === 'text');
  assert.equal(
    tints.map(m => [m.from, m.to, m.className]),
    [
      [7, 8, 'recovered-interval'],
      [15, 17, 'recovered-interval'],
    ]
  );
  const markers = editor.marks.filter(m => m.kind === 'bookmark');
  assert.equal(
    markers.map(m => m.at),
    [7, 18]
  );
  assert.ok(markers[1].widget.classList.contains('recovery-marker'));
  assert.match(markers[1].widget.title, 'expected ";" or a letter');
});

test('an empty skip region gets a marker but no tint', () => {
  const editor = fakeEditor();
  markRecoveredFailures(
    editor,
    getProblems(fakeResult(true, [fakeFailure(5, 5, 5, '";"')]))
  );
  assert.equal(
    editor.marks.map(m => m.kind),
    ['bookmark']
  );
});

test('the final failure of a parse recovery cannot finish is left to the error mark', () => {
  const editor = fakeEditor();
  const result = fakeResult(false, [
    fakeFailure(7, 10, 7, '"}" or a letter'),
    fakeFailure(19, 19, 19, '";"'),
  ]);
  const problems = getProblems(result);
  assert.equal(
    problems.map(p => p.kind),
    ['recovered', 'final']
  );

  markRecoveredFailures(editor, problems);
  assert.equal(
    editor.marks.map(m => [m.kind, m.from ?? m.at]),
    [
      ['text', 7],
      ['bookmark', 7],
    ]
  );
});

test('marking again clears the previous marks', () => {
  const editor = fakeEditor();
  const problems = getProblems(
    fakeResult(true, [fakeFailure(1, 2, 1, 'a'), fakeFailure(3, 4, 3, 'b')])
  );
  markRecoveredFailures(editor, problems);
  assert.is(live(editor.marks).length, 4);

  markRecoveredFailures(editor, []);
  assert.is(live(editor.marks).length, 0);
});

test('parse:input marks every recovery, and editing clears them', () => {
  const editor = fakeEditor();
  ohmEditor.ui.inputEditor = editor;
  const result = fakeResult(true, [
    fakeFailure(7, 8, 7, 'a'),
    fakeFailure(15, 17, 18, 'b'),
  ]);

  ohmEditor.emit('parse:input', result, {result});
  assert.is(live(editor.marks).length, 4);

  ohmEditor.emit('change:inputEditor', editor);
  assert.is(live(editor.marks).length, 0);
});

test('a result without recovery support marks nothing', () => {
  const editor = fakeEditor();
  const result = fakeResult(true, []);
  delete result.getRecoveredFailures;
  assert.equal(getProblems(result), []);
  markRecoveredFailures(editor, getProblems(result));
  assert.is(editor.marks.length, 0);
});

test('recovery is requested only from builds that support it', () => {
  const withFallible = {pexprs: {Fallible: function Fallible() {}}};
  const without = {pexprs: {}};
  assert.ok(supportsRecovery(withFallible));
  assert.not.ok(supportsRecovery(without));
  assert.not.ok(supportsRecovery(undefined));
  assert.equal(matchOptions(true, true), {recover: true});
  assert.is(matchOptions(false, true), undefined);
  assert.is(matchOptions(true, false), undefined);
});

test.run();
