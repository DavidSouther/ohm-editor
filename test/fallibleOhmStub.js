/* eslint-env node */

// Stands in for the `ohm` global of a build with Fallible, for traceUtil.js.
export class Fallible {
  constructor(guarded, join) {
    this.guarded = guarded;
    this.join = join;
  }
}
global.ohm = {pexprs: {Fallible}};
