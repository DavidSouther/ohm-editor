/* eslint-env browser */
import 'global-jsdom/register';
import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {initializeRecovery} from '../src/recoveryControls.js';
import {editorMatchOptions} from '../src/recovery.js';

test('capable startup enables recovery before the first match', () => {
  const editor = {capabilities: {}, options: {}};
  const list = document.createElement('ul');
  initializeRecovery(editor, {pexprs: {Fallible() {}}}, list);
  assert.is(editor.capabilities.recover, true);
  assert.is(list.querySelector('input').checked, true);
  assert.is(editor.options.recover, true);
  assert.equal(editorMatchOptions(editor), {recover: true});
  editor.options.recover = false;
  assert.is(editorMatchOptions(editor), undefined);
});

test('released startup omits the control and the options argument', () => {
  const editor = {capabilities: {}, options: {}};
  const list = document.createElement('ul');
  initializeRecovery(editor, {pexprs: {}}, list);
  assert.is(editor.capabilities.recover, false);
  assert.is(list.children.length, 0);
  assert.is(editor.options.recover, undefined);
  assert.is(editorMatchOptions(editor), undefined);
});

test.run();
