import {createElement} from './domUtil.js';
import {supportsRecovery} from './recovery.js';

// Initialize the option before the first parse, using only supported builds.
export function initializeRecovery(editor, ohmLib, optionsList) {
  editor.capabilities.recover = supportsRecovery(ohmLib);
  if (editor.capabilities.recover) {
    const li = createElement('li');
    li.innerHTML =
      '<input type="checkbox" name="recover" id="recoverOption" checked />' +
      '<label for="recoverOption">Recover from errors</label>';
    optionsList.appendChild(li);
    editor.options.recover = true;
  }
}
