/* eslint-env node */

import {test} from 'uvu';
import * as assert from 'uvu/assert';
import {Fallible} from './fallibleOhmStub.js';
import {
  childrenWithRecovery,
  containsRecovery,
  isFallible,
} from '../src/traceUtil.js';

// Helpers
// -------

const guarded = {name: 'guarded'};
const join = {name: 'join'};
const expr = new Fallible(guarded, join);

function trace(e, pos, succeeded, extra = {}) {
  return {expr: e, pos, succeeded, children: [], bindings: [], ...extra};
}

function recoveredFailure(startIdx, endIdx) {
  return {
    interval: {startIdx, endIdx, contents: 'x'.repeat(endIdx - startIdx)},
    position: endIdx,
    shortMessage: 'expected something',
  };
}

const describe = nodes =>
  nodes.map(n => {
    if (n.isCorrection) return `correction@${n.pos}-${n.pos2}`;
    return `${n.expr.name}${n.succeeded ? '' : '!'}@${n.pos}`;
  });

// Tests
// -----

test('a retained guarded iteration precedes one correction and the actual join', () => {
  const rf = recoveredFailure(11, 15);
  const node = trace(expr, 1, true, {
    isRecovered: true,
    bindings: [
      {ctorName: '_iter'},
      {ctorName: '_correction', recoveredFailure: rf},
      {ctorName: '_terminal'},
    ],
    children: [
      trace(guarded, 1, true),
      trace(join, 11, false),
      trace(join, 15, true),
    ],
  });
  const kids = childrenWithRecovery(node);
  assert.equal(describe(kids), [
    'guarded@1',
    'join!@11',
    'correction@11-15',
    'join@15',
  ]);
  assert.is(kids[2].recoveredFailure, rf);
  assert.is(kids[2].source.contents, 'xxxx');
  assert.is(kids[2].displayString, '_correction');
  assert.is(kids[2].bindings[0], node.bindings[1]);
  assert.is(kids[3], node.children[2]);
});

test('a failed guarded expression contributes no extra correction placeholder', () => {
  const node = trace(expr, 7, true, {
    isRecovered: true,
    bindings: [
      {ctorName: '_iter', children: []},
      {ctorName: '_correction', recoveredFailure: recoveredFailure(7, 8)},
      {ctorName: '_terminal'},
    ],
    children: [trace(guarded, 7, false), trace(join, 8, true)],
  });
  assert.equal(describe(childrenWithRecovery(node)), [
    'guarded!@7',
    'correction@7-8',
    'join@8',
  ]);
});

test('a recovery point that did not recover keeps its children', () => {
  const children = [trace(guarded, 0, true), trace(join, 3, true)];
  const node = trace(expr, 0, true, {
    bindings: [
      {ctorName: '_iter'},
      {ctorName: '_iter', children: []},
      {ctorName: '_terminal'},
    ],
    children,
  });
  assert.is(childrenWithRecovery(node), children);
});

test('containsRecovery finds a recovery among successful descendants', () => {
  const recovered = trace(expr, 0, true, {isRecovered: true});
  const parent = trace({}, 0, true, {children: [recovered]});
  const failedParent = trace({}, 0, false, {children: [recovered]});
  assert.ok(containsRecovery(parent));
  assert.not.ok(containsRecovery(failedParent));
  assert.not.ok(containsRecovery(trace({}, 0, true)));
});

test('isFallible is false without a Fallible class', () => {
  assert.ok(isFallible(expr));
  const saved = global.ohm.pexprs.Fallible;
  delete global.ohm.pexprs.Fallible;
  assert.not.ok(isFallible(expr));
  global.ohm.pexprs.Fallible = saved;
});

test.run();
