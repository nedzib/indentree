/**
 * Translates the plain-text input into a nested file structure.
 * Ported from tree-online (src/lib/parse-input.ts) to vanilla JS.
 */
(function (global) {
  'use strict';

  /**
   * Matches the whitespace in front of a file name.
   * Also matches an optional markdown bullet point.
   * For example, testing against "  - hello" matches
   * "  - " in the first group and "  " in the second.
   */
  var LEADING_WHITESPACE_AND_BULLET = /^((\s*)(?:-\s)?)/;

  /** Matches lines that only contain whitespace */
  var ONLY_WHITESPACE = /^\s*$/;

  /** Used to split a block of text into individual lines */
  var NEWLINE_SPLITTER = /[^\r\n]+/g;

  /**
   * Splits a block of user-created text into individual,
   * un-nested file structure objects.
   * @param {string} input
   * @returns {Array<Object>}
   */
  function splitInput(input) {
    var lines = String(input).match(NEWLINE_SPLITTER) || [];

    lines = lines.filter(function (line) {
      return !ONLY_WHITESPACE.test(line);
    });

    return lines.map(function (line) {
      var match = LEADING_WHITESPACE_AND_BULLET.exec(line);
      var prefix = match ? match[1] : '';
      var indent = match ? match[2] : '';

      return {
        name: line.replace(prefix, ''),
        children: [],
        indentCount: indent.length,
        parent: null,
      };
    });
  }

  /**
   * Turns the plain-text input into a tree of nodes.
   * @param {string} input
   * @returns {Object} the root node
   */
  function parseInput(input) {
    var structures = splitInput(input);
    var root = {
      name: '.',
      children: [],
      indentCount: -1,
      parent: null,
    };

    var path = [root];

    structures.forEach(function (structure) {
      while (path[path.length - 1].indentCount >= structure.indentCount) {
        path.pop();
      }

      var parent = path[path.length - 1];
      parent.children.push(structure);
      structure.parent = parent;

      path.push(structure);
    });

    return root;
  }

  global.TreeLib = global.TreeLib || {};
  global.TreeLib.parseInput = parseInput;
  global.TreeLib.splitInput = splitInput;
})(window);
