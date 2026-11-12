/**
 * Renders the generated tree into a PNG using the Canvas API.
 * No libraries, no network: everything happens in the browser.
 * The image contains only the tree itself (plus padding), using the palette
 * of the active Terminal CSS theme.
 */
(function (global) {
  'use strict';

  var MONO_FALLBACK =
    '"Menlo", "Monaco", "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace';

  var FONT_SIZE = 15;
  var LINE_HEIGHT = Math.round(FONT_SIZE * 1.3);
  var PADDING = 30;
  var MAX_DIMENSION = 16000;
  var SCALE = 2;

  function readVar(name, fallback) {
    var value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  function getColors() {
    return {
      background: readVar('--background-color', '#ffffff'),
      text: readVar('--font-color', '#151515'),
    };
  }

  /**
   * Builds a friendly file name from the first item of the tree.
   * @param {string} treeText
   * @returns {string}
   */
  function sanitizeFilename(treeText) {
    var lines = String(treeText || '')
      .split('\n')
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    var candidate = lines[0] === '.' ? lines[1] || '' : lines[0] || '';

    candidate = candidate.replace(/^[│├└─|`\-\s]+/, '');
    candidate = candidate.split('/')[0];
    candidate = candidate.split(/\s{2,}/)[0];
    candidate = candidate
      .replace(/[^\w.@-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '');

    if (!candidate) {
      candidate = 'indentree';
    }

    return candidate.toLowerCase() + '-tree.png';
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) {
        reject(new Error('Este navegador no puede exportar el canvas a PNG'));
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo convertir el canvas a PNG'));
        }
      }, 'image/png');
    });
  }

  /**
   * Renders the tree to a PNG and triggers the download.
   * @param {string} treeText
   * @param {{filename?: string}} [options]
   * @returns {Promise<Blob>}
   */
  async function download(treeText, options) {
    var settings = options || {};
    var text = treeText == null ? '' : String(treeText);

    // Make sure we measure using the actual loaded font.
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (error) {
        /* ignore: fall back to system fonts */
      }
    }

    var monoStack = readVar('--mono-font-stack', MONO_FALLBACK);
    var font = FONT_SIZE + 'px ' + monoStack;
    var lines = text.split('\n');

    var measureCanvas = document.createElement('canvas');
    var measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = font;

    var textWidth = 0;
    lines.forEach(function (line) {
      var width = measureCtx.measureText(line).width;
      if (width > textWidth) {
        textWidth = width;
      }
    });
    textWidth = Math.ceil(textWidth);

    var width = textWidth + PADDING * 2;
    var height = lines.length * LINE_HEIGHT + PADDING * 2;

    // Keep the canvas within safe browser limits while staying crisp.
    var scale = Math.min(SCALE, MAX_DIMENSION / width, MAX_DIMENSION / height);
    if (!isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    var colors = getColors();

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;

    if (text.trim()) {
      lines.forEach(function (line, index) {
        ctx.fillText(
          line,
          PADDING,
          PADDING + index * LINE_HEIGHT + LINE_HEIGHT / 2
        );
      });
    } else {
      ctx.fillText('// sin contenido', PADDING, PADDING + LINE_HEIGHT / 2);
    }

    var blob = await toBlob(canvas);
    var url = URL.createObjectURL(blob);

    var link = document.createElement('a');
    link.href = url;
    link.download = settings.filename || sanitizeFilename(text);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);

    return blob;
  }

  global.TreeImage = {
    download: download,
    sanitizeFilename: sanitizeFilename,
  };
})(window);
