/* global document */

import {markInterval} from './cmUtil.js';
import {createElement} from './domUtil.js';
import ohmEditor from './ohmEditor.js';
import {getProblems} from './recovery.js';

const errorMarks = {
  grammar: null,
  input: null,
};

// The skip region tints and failure markers of every recovered failure.
let recoveryMarks = [];

function hideError(category, editor) {
  const errInfo = errorMarks[category];
  if (errInfo) {
    errInfo.mark.clear();
    clearTimeout(errInfo.timeout);
    if (errInfo.widget) {
      errInfo.widget.clear();
    }
    errorMarks[category] = null;
  }
}

function setError(category, editor, interval, messageOrNode) {
  hideError(category, editor);

  errorMarks[category] = {
    mark: markInterval(editor, interval, 'error-interval', false),
    timeout: setTimeout(
      showError.bind(null, category, editor, interval, messageOrNode),
      1500
    ),
    widget: null,
  };
}

function showError(category, editor, interval, messageOrNode) {
  const errorEl = createElement('.error');
  if (typeof messageOrNode === 'string') {
    errorEl.textContent = messageOrNode;
  } else {
    errorEl.appendChild(messageOrNode);
  }
  const {line} = editor.posFromIndex(interval.endIdx);
  errorMarks[category].widget = editor.addLineWidget(line, errorEl, {
    insertAt: 0,
  });
}

function createErrorEl(result, pos) {
  const el = createElement('span', 'Expected ');

  const failures = result.getRightmostFailures();
  const sep = ', ';
  const lastSep = failures.length >= 3 ? ', or ' : ' or '; // Oxford comma.

  failures.forEach((f, i) => {
    let prefix = '';
    if (i > 0) {
      prefix = i === failures.length - 1 ? lastSep : sep;
    }
    el.appendChild(document.createTextNode(prefix));
    const link = el.appendChild(createElement('span.link', f.toString()));
    link.onclick = function () {
      ohmEditor.emit('goto:failure', f);
    };
    link.onmouseenter = function () {
      ohmEditor.emit('peek:failure', f);
    };
    link.onmouseout = function () {
      ohmEditor.emit('unpeek:failure');
    };
  });
  return el;
}

// Hide errors in the editors as soon as the user starts typing again.
ohmEditor.addListener('change:grammarEditor', cm => {
  hideError('grammar', cm);
});

const hideInputError = _ => {
  hideError('input', ohmEditor.ui.inputEditor);
  clearRecoveredFailures();
};

// Hide errors in the input in all cases where the input will be reparsed.
ohmEditor.addListener('change:inputEditor', hideInputError);
ohmEditor.addListener('change:grammars', hideInputError);
ohmEditor.addListener('set:startRule', hideInputError);
ohmEditor.addListener('change:option', optionName => {
  if (optionName === 'recover') {
    hideInputError();
  }
});

ohmEditor.addListener(
  'parse:grammars',
  (matchResult, grammars, examples, err) => {
    if (err) {
      const editor = ohmEditor.ui.grammarEditor;
      setError(
        'grammar',
        editor,
        err.interval,
        err.shortMessage || err.message
      );
    }
  }
);
ohmEditor.addListener('parse:input', (matchResult, trace) => {
  markRecoveredFailures(ohmEditor.ui.inputEditor, getProblems(trace.result));
  if (trace.result.failed()) {
    const editor = ohmEditor.ui.inputEditor;
    // Intervals with start == end won't show up in CodeMirror.
    const interval = trace.result.getInterval();
    interval.endIdx += 1;

    setError('input', editor, interval, createErrorEl(trace.result));
  }
});

// Mark each recovered failure in `problems`: tint its skip region and put a
// marker at its failure position. Clears the marks from the previous call.
// When recovery cannot finish, the original failure keeps the ordinary error mark.
export function markRecoveredFailures(editor, problems) {
  clearRecoveredFailures();
  problems
    .filter(p => p.kind === 'recovered')
    .forEach(({interval, position, message}) => {
      if (interval.endIdx > interval.startIdx) {
        recoveryMarks.push(
          markInterval(editor, interval, 'recovered-interval', false)
        );
      }
      const marker = createElement('span.recovery-marker');
      marker.title = message;
      recoveryMarks.push(
        editor.setBookmark(editor.posFromIndex(position), {
          widget: marker,
          insertLeft: true,
        })
      );
    });
}

function clearRecoveredFailures() {
  recoveryMarks.forEach(mark => mark.clear());
  recoveryMarks = [];
}
