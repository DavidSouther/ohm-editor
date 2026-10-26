// Runtime support for Ohm's `B ! C` error recovery (ohm-js 17.5 with Fallible).
//
// The editor detects the capability of the loaded Ohm build, so an Ohm build
// without recovery (for example ohm-js 17 from unpkg) sees no new controls and
// matches exactly as before.

// Return true if `ohmLib` can recover at `B ! C` recovery points.
export function supportsRecovery(ohmLib) {
  return !!(
    ohmLib &&
    ohmLib.pexprs &&
    typeof ohmLib.pexprs.Fallible === 'function'
  );
}

// The options argument for `match` and `trace`, or undefined when recovery is
// off or unsupported, so that builds without recovery are called as before.
export function matchOptions(recover, supported) {
  return recover && supported ? {recover: true} : undefined;
}

// The match options for the editor's current settings.
export function editorMatchOptions(editor) {
  return matchOptions(editor.options.recover, editor.capabilities.recover);
}

function recoveredFailuresOf(result) {
  if (!result || typeof result.getRecoveredFailures !== 'function') {
    return [];
  }
  return result.getRecoveredFailures();
}

// Every problem a match result reports, in input order. Each problem is
// {kind, failure, interval, position, message, expected}, where `kind` is
// 'recovered' for a skip region the parse continued past, and 'final' for the
// failure of a parse that recovery could not finish.
export function getProblems(result) {
  const failures = recoveredFailuresOf(result);
  const failed = failures.length > 0 && result.failed();
  return failures.map((failure, i) => ({
    kind: failed && i === failures.length - 1 ? 'final' : 'recovered',
    failure,
    interval: failure.interval,
    position: failure.position,
    message: failure.shortMessage,
    expected: failure.getExpectedText(),
  }));
}

// A stable key for a recovered failure, shared by the trace and the match result.
export function failureKey(failure) {
  const {startIdx, endIdx} = failure.interval;
  return `${startIdx}:${endIdx}:${failure.position}`;
}

// The status of an example: 'pass', 'fail' or 'recovered' (matched, but only
// by recovering from errors).
export function exampleStatusClass(result, shouldMatch) {
  const matched = result.succeeded();
  if (matched && recoveredFailuresOf(result).length > 0) {
    return 'recovered';
  }
  return matched === shouldMatch ? 'pass' : 'fail';
}
