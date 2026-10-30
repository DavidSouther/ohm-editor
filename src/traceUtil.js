/* global ohm */

// A primitive is any expression that should appear as a leaf in the parse tree.
export function isPrimitive(grammar, expr) {
  // An application of a primitive rule is considered to be a primitive expression.
  if (
    expr instanceof ohm.pexprs.Apply &&
    isPrimitiveRule(grammar, expr.ruleName)
  ) {
    return true;
  }
  return (
    expr instanceof ohm.pexprs.Range ||
    expr instanceof ohm.pexprs.Terminal ||
    expr instanceof ohm.pexprs.UnicodeChar
  );
}

// Primitive rules are ones whose body can't meaningfully be shown.
export function isPrimitiveRule(grammar, ruleName) {
  return grammar.rules[ruleName].primitive;
}

export function isLRBaseCase(traceNode) {
  // If the children are exactly `[undefined]`, it's the base case for left recursion.
  // TODO: Figure out a better way to handle this when generating traces.
  return traceNode.children.length === 1 && traceNode.children[0] == null;
}

// Return true if `traceNode` should be treated as a leaf node in the parse tree.
export function isLeaf(grammar, traceNode) {
  if (isPrimitive(grammar, traceNode.expr)) {
    return true;
  }
  if (isLRBaseCase(traceNode)) {
    return true;
  }
  return traceNode.children.length === 0;
}

// Error recovery (`B ! C`)
// ------------------------

// Return true if `expr` is a recovery point, `B ! C`. Builds of Ohm without
// recovery have no Fallible class.
export function isFallible(expr) {
  const {Fallible} = ohm.pexprs;
  return typeof Fallible === 'function' && expr instanceof Fallible;
}

// A correction is a CST binding, so the trace needs a stand-in leaf to display it.
const correctionExpr = {
  toDisplayString() {
    return '_correction';
  },
  toMemoKey() {
    return '_correction';
  },
};

class CorrectionTraceNode {
  constructor(input, correction) {
    const {recoveredFailure} = correction;
    const {interval} = recoveredFailure;
    this.input = input;
    this.pos = this.pos1 = interval.startIdx;
    this.pos2 = interval.endIdx;
    this.source = interval;
    this.expr = correctionExpr;
    this.succeeded = true;
    this.children = [];
    this.bindings = [correction];
    this.recoveredFailure = recoveredFailure;
    this.isCorrection = true;
  }

  get displayString() {
    return '_correction';
  }
}

function findLastIndex(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) {
      return i;
    }
  }
  return -1;
}

// Show the correction binding between the guarded expression and the actual
// join match. Ordinary absent bindings do not add trace nodes.
export function childrenWithRecovery(traceNode) {
  const {children} = traceNode;
  if (!traceNode.isRecovered || !isFallible(traceNode.expr)) {
    return children;
  }
  const correction = traceNode.bindings[1];
  if (!correction || !correction.recoveredFailure) {
    return children;
  }
  const result = children.slice();
  const joinIdx = findLastIndex(
    result,
    c => c && c.expr === traceNode.expr.join && c.succeeded
  );
  result.splice(
    joinIdx === -1 ? result.length : joinIdx,
    0,
    new CorrectionTraceNode(traceNode.input, correction)
  );
  return result;
}

const containsRecoveryCache = new WeakMap();

// Return true if `traceNode` or a successful descendant recovered from an
// error. Such nodes start expanded so that every skip region is visible.
export function containsRecovery(traceNode) {
  if (!traceNode || !traceNode.succeeded) {
    return false;
  }
  if (containsRecoveryCache.has(traceNode)) {
    return containsRecoveryCache.get(traceNode);
  }
  const ans =
    !!traceNode.isRecovered || traceNode.children.some(containsRecovery);
  containsRecoveryCache.set(traceNode, ans);
  return ans;
}
