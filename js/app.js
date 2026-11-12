/**
 * App wiring: source editor, tree rendering, clipboard, PNG export
 * and localStorage persistence.
 */
(function (global) {
  'use strict';

  var DEFAULT_SOURCE = [
    'my-project',
    '  src',
    '    index.html',
    '    main.js',
    '    styles.css',
    '  assets',
    '    logo.svg',
    '    - icons',
    '      - star.svg',
    '      - heart.svg',
    '  docs',
    '    - getting-started.md',
    '    - examples.md',
    '  README.md',
    '  package.json',
  ].join('\n');

  var DEFAULT_OPTIONS = {
    fancy: true,
    fullPath: false,
    trailingSlash: true,
    rootDot: true,
  };

  var SAVE_DEBOUNCE = 220;
  var FEEDBACK_TIMEOUT = 1500;

  var sourceEl = document.getElementById('source');
  var treeEl = document.getElementById('tree');
  var treeMetaEl = document.getElementById('tree-meta');
  var copyButton = document.getElementById('copy-button');
  var copyLabel = document.getElementById('copy-label');
  var downloadButton = document.getElementById('download-button');
  var downloadLabel = document.getElementById('download-label');
  var saveStatusEl = document.getElementById('save-status');
  var optionInputs = Array.prototype.slice.call(
    document.querySelectorAll('[data-option]')
  );

  var restored = global.IndentreeStorage.load();

  var state = {
    source:
      restored && typeof restored.source === 'string'
        ? restored.source
        : DEFAULT_SOURCE,
    options: Object.assign({}, DEFAULT_OPTIONS, restored ? restored.options : {}),
  };

  var saveTimer = null;
  var statusTimer = null;
  var copyTimer = null;

  /* ------------------------------ rendering ----------------------------- */

  function countItems(root) {
    var total = 0;
    var stack = root.children.slice();

    while (stack.length) {
      var node = stack.pop();
      total += 1;
      stack = stack.concat(node.children);
    }

    return total;
  }

  function render() {
    var tree = '';
    var itemCount = 0;

    try {
      var structure = global.TreeLib.parseInput(state.source);
      tree = global.TreeLib.generateTree(structure, {
        charset: state.options.fancy ? 'utf-8' : 'ascii',
        fullPath: state.options.fullPath,
        trailingDirSlash: state.options.trailingSlash,
        rootDot: state.options.rootDot,
      });
      itemCount = countItems(structure);
    } catch (error) {
      console.error('No se pudo generar el árbol:', error);
    }

    treeEl.textContent = tree;

    treeMetaEl.textContent =
      itemCount > 0
        ? itemCount + (itemCount === 1 ? ' elemento' : ' elementos')
        : '';

    var hasTree = Boolean(tree.trim());
    copyButton.disabled = !hasTree;
    downloadButton.disabled = !hasTree;
  }

  /* ------------------------------- saving ------------------------------- */

  function flashStatus(message, isError) {
    saveStatusEl.textContent = message;
    saveStatusEl.classList.toggle('is-error', Boolean(isError));
    saveStatusEl.classList.add('is-visible');

    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      saveStatusEl.classList.remove('is-visible');
    }, FEEDBACK_TIMEOUT);
  }

  function persist() {
    var saved = global.IndentreeStorage.save(state);
    flashStatus(
      saved ? 'Guardado localmente' : 'No se pudo guardar en este navegador',
      !saved
    );
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, SAVE_DEBOUNCE);
  }

  /* ------------------------------ clipboard ----------------------------- */

  function fallbackCopy(text) {
    var helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '-1000px';
    helper.style.opacity = '0';

    document.body.appendChild(helper);
    helper.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    helper.remove();
    return copied;
  }

  async function copyTree() {
    var text = treeEl.textContent;
    if (!text) {
      return;
    }

    var copied = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      copied = fallbackCopy(text);
    }

    if (!copied) {
      flashStatus('No se pudo copiar el árbol', true);
      return;
    }

    copyLabel.textContent = '¡Copiado!';
    copyButton.classList.add('is-success');

    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      copyLabel.textContent = 'Copiar';
      copyButton.classList.remove('is-success');
    }, FEEDBACK_TIMEOUT);
  }

  /* ------------------------------ image export -------------------------- */

  async function downloadImage() {
    var tree = treeEl.textContent;
    if (!tree) {
      return;
    }

    var originalLabel = downloadLabel.textContent;

    downloadButton.disabled = true;
    downloadLabel.textContent = 'Generando…';

    try {
      await global.TreeImage.download(tree, {
        filename: global.TreeImage.sanitizeFilename(tree),
      });
      flashStatus('Imagen PNG descargada');
    } catch (error) {
      console.error('No se pudo exportar la imagen:', error);
      flashStatus('No se pudo generar la imagen', true);
    } finally {
      downloadButton.disabled = !treeEl.textContent.trim();
      downloadLabel.textContent = originalLabel;
    }
  }

  /* ------------------------- editor niceties ---------------------------- */

  /** Inserts text at the caret, keeping the native undo stack when possible. */
  function insertText(text) {
    var inserted = false;

    try {
      inserted = document.execCommand('insertText', false, text);
    } catch (error) {
      inserted = false;
    }

    if (!inserted) {
      var start = sourceEl.selectionStart;
      var end = sourceEl.selectionEnd;
      sourceEl.setRangeText(text, start, end, 'end');
      sourceEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function currentBlock() {
    var value = sourceEl.value;
    var start = sourceEl.selectionStart;
    var end = sourceEl.selectionEnd;

    var blockStart = value.lastIndexOf('\n', start - 1) + 1;
    var blockEnd = value.indexOf('\n', end);

    if (blockEnd === -1) {
      blockEnd = value.length;
    }

    return {
      value: value,
      start: start,
      end: end,
      blockStart: blockStart,
      blockEnd: blockEnd,
      block: value.slice(blockStart, blockEnd),
    };
  }

  function indentSelection() {
    if (sourceEl.selectionStart === sourceEl.selectionEnd) {
      insertText('  ');
      return;
    }

    var block = currentBlock();
    var updated = block.block
      .split('\n')
      .map(function (line) {
        return '  ' + line;
      })
      .join('\n');

    var delta = updated.length - block.block.length;

    sourceEl.setSelectionRange(block.blockStart, block.blockEnd);
    insertText(updated);
    sourceEl.setSelectionRange(block.blockStart, block.blockEnd + delta);
    sourceEl.focus();
  }

  function dedentSelection() {
    var block = currentBlock();
    var updated = block.block
      .split('\n')
      .map(function (line) {
        return line.replace(/^ {1,2}/, '');
      })
      .join('\n');

    if (updated === block.block) {
      return;
    }

    var delta = updated.length - block.block.length;

    sourceEl.setSelectionRange(block.blockStart, block.blockEnd);
    insertText(updated);
    sourceEl.setSelectionRange(
      Math.max(block.blockStart, block.start + delta),
      Math.max(block.blockStart, block.end + delta)
    );
    sourceEl.focus();
  }

  /* ------------------------------- events ------------------------------- */

  sourceEl.addEventListener('input', function () {
    state.source = sourceEl.value;
    render();
    scheduleSave();
  });

  optionInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      state.options[input.dataset.option] = input.checked;
      render();
      scheduleSave();
    });
  });

  copyButton.addEventListener('click', copyTree);
  downloadButton.addEventListener('click', downloadImage);

  sourceEl.addEventListener('keydown', function (event) {
    if (event.isComposing) {
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        dedentSelection();
      } else {
        indentSelection();
      }
      return;
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      var value = sourceEl.value;
      var caret = sourceEl.selectionStart;
      var lineStart = value.lastIndexOf('\n', caret - 1) + 1;
      var leading = value.slice(lineStart, caret).match(/^[ \t]*/)[0];

      if (leading) {
        event.preventDefault();
        insertText('\n' + leading);
      }
    }
  });

  // Never lose the last keystrokes when leaving the page.
  window.addEventListener('beforeunload', function () {
    clearTimeout(saveTimer);
    global.IndentreeStorage.save(state);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      global.IndentreeStorage.save(state);
    }
  });

  /* -------------------------------- init -------------------------------- */

  sourceEl.value = state.source;

  optionInputs.forEach(function (input) {
    input.checked = Boolean(state.options[input.dataset.option]);
  });

  render();

  if (restored) {
    setTimeout(function () {
      flashStatus('Restaurado desde este navegador');
    }, 350);
  }
})(window);
