import ohmEditor from '../ohmEditor.js';

const SKIPPED_MAX = 24;
const HORIZONTAL_ELLIPSIS = '…';

function excerpt(text) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > SKIPPED_MAX
    ? oneLine.slice(0, SKIPPED_MAX) + HORIZONTAL_ELLIPSIS
    : oneLine;
}

// Lists every recovered failure of the current parse, and the final failure
// of a parse that recovery could not finish. Selecting one moves the input
// cursor to its failure position and selects its trace step.
export default {
  name: 'problems-panel',
  props: {
    // Problems from recovery.js `getProblems`.
    source: {type: Array, required: true},
  },
  computed: {
    problems() {
      const cm = ohmEditor.ui.inputEditor;
      return this.source.map((p, i) => {
        const {line, ch} = cm.posFromIndex(p.position);
        return {
          ...p,
          key: `${i}:${p.position}`,
          where: `${line + 1}:${ch + 1}`,
          expected: p.message.replace(/^Line \d+, col \d+: /, ''),
          skipped: excerpt(p.interval.contents || ''),
        };
      });
    },
  },
  methods: {
    select(problem) {
      const cm = ohmEditor.ui.inputEditor;
      cm.focus();
      cm.setCursor(cm.posFromIndex(problem.position));
      if (problem.kind === 'recovered') {
        ohmEditor.emit('goto:recoveredFailure', problem.failure);
      }
    },
  },
};
