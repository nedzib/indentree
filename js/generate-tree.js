/**
 * Generates the ASCII/UTF-8 tree diagram.
 * Ported from tree-online (src/lib/generate-tree.ts + line-strings.ts).
 */
(function (global) {
  'use strict';

  var LINE_STRINGS = {
    ascii: {
      CHILD: '|-- ',
      LAST_CHILD: '`-- ',
      DIRECTORY: '|   ',
      EMPTY: '    ',
    },
    'utf-8': {
      CHILD: '├── ',
      LAST_CHILD: '└── ',
      DIRECTORY: '│   ',
      EMPTY: '    ',
    },
  };

  var DEFAULT_OPTIONS = {
    charset: 'utf-8',
    trailingDirSlash: false,
    fullPath: false,
    rootDot: true,
  };

  function mergeOptions(options) {
    var merged = {};
    var key;

    for (key in DEFAULT_OPTIONS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key)) {
        merged[key] = DEFAULT_OPTIONS[key];
      }
    }

    if (options) {
      for (key in options) {
        if (
          Object.prototype.hasOwnProperty.call(options, key) &&
          options[key] !== undefined
        ) {
          merged[key] = options[key];
        }
      }
    }

    return merged;
  }

  function hasTrailingSlash(name) {
    return /\/\s*$/.test(name);
  }

  /**
   * Returns the name of a file or folder according to the rendering options.
   * When `asPathParent` is true the name is being used as part of another
   * item's full path, so directories always get a trailing slash. This matches
   * the original implementation's `defaultsDeep({}, { trailingDirSlash: true }, options)`.
   */
  function getName(structure, options, asPathParent) {
    var nameChunks = [structure.name];
    var trailingSlash = asPathParent ? true : options.trailingDirSlash;

    if (
      trailingSlash &&
      structure.children.length > 0 &&
      !hasTrailingSlash(structure.name)
    ) {
      nameChunks.push('/');
    }

    if (options.fullPath && structure.parent) {
      nameChunks.unshift(getName(structure.parent, options, true));
    }

    return nameChunks.join('');
  }

  function isLastChild(structure) {
    var parent = structure.parent;
    return Boolean(
      parent && parent.children[parent.children.length - 1] === structure
    );
  }

  /**
   * Returns a single rendered line, or null for the root when rootDot is off.
   */
  function getLine(structure, options) {
    var lines = LINE_STRINGS[options.charset] || LINE_STRINGS['utf-8'];

    if (!structure.parent) {
      return options.rootDot ? structure.name : null;
    }

    var chunks = [
      isLastChild(structure) ? lines.LAST_CHILD : lines.CHILD,
      getName(structure, options, false),
    ];

    var current = structure.parent;
    while (current && current.parent) {
      chunks.unshift(isLastChild(current) ? lines.EMPTY : lines.DIRECTORY);
      current = current.parent;
    }

    var line = chunks.join('');

    // If the root dot isn't rendered, drop the leading indentation of
    // the first level of children.
    return line.substring(options.rootDot ? 0 : lines.CHILD.length);
  }

  /**
   * Generates a tree diagram from a parsed structure.
   * @param {Object} structure
   * @param {Object} [options]
   * @returns {string}
   */
  function generateTree(structure, options) {
    var opts = mergeOptions(options);
    var output = [];

    function visit(node) {
      var line = getLine(node, opts);
      if (line !== null) {
        output.push(line);
      }
      node.children.forEach(visit);
    }

    visit(structure);
    return output.join('\n');
  }

  global.TreeLib = global.TreeLib || {};
  global.TreeLib.generateTree = generateTree;
  global.TreeLib.LINE_STRINGS = LINE_STRINGS;
})(window);
