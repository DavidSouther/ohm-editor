/* eslint-env node */
import 'global-jsdom/register';
import './codeMirrorStub.js';
import testUtils from '@vue/test-utils';
import {test} from 'uvu';
import * as assert from 'uvu/assert';
import ProblemsPanel from '../src/components/problems-panel.js';
import ohmEditor from '../src/ohmEditor.js';

let wrapper;
let focused;
let cursor;
let selected;
let subscription;
const onSelected = failure => selected.push(failure);

test.before.each(() => {
  focused = false;
  cursor = null;
  selected = [];
  ohmEditor.ui.inputEditor = {
    posFromIndex: index => ({line: 1, ch: index - 5}),
    focus: () => (focused = true),
    setCursor: pos => (cursor = pos),
  };
  subscription = ohmEditor.addListener('goto:recoveredFailure', onSelected);
});

test.after.each(() => {
  wrapper.destroy();
  subscription.remove();
});

function mountProblem(kind) {
  const failure = {};
  wrapper = testUtils.shallowMount(
    {
      ...ProblemsPanel,
      render: h => h('div'),
    },
    {
      propsData: {
        source: [
          {
            kind,
            failure,
            position: 8,
            interval: {contents: '  bad\n token '},
            message: 'Line 2, col 4: expected a letter',
          },
        ],
      },
    }
  );
  return failure;
}

test('panel presents positions and moves input while selecting recovered trace failures', () => {
  const failure = mountProblem('recovered');
  const problem = wrapper.vm.problems[0];
  assert.is(problem.where, '2:4');
  assert.is(problem.expected, 'expected a letter');
  assert.is(problem.skipped, 'bad token');
  wrapper.vm.select(problem);
  assert.is(focused, true);
  assert.equal(cursor, {line: 1, ch: 3});
  assert.equal(selected, [failure]);
});

test('final failures move input without selecting a recovered trace step', () => {
  mountProblem('final');
  wrapper.vm.select(wrapper.vm.problems[0]);
  assert.is(focused, true);
  assert.equal(cursor, {line: 1, ch: 3});
  assert.equal(selected, []);
});

test.run();
