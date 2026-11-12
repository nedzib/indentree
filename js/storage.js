/**
 * Persists the app state (source + rendering options) in localStorage.
 * Every value is validated before being used, so a corrupted or outdated
 * entry can never break the app.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'indentree.state.v1';
  var OPTION_KEYS = ['fancy', 'fullPath', 'trailingSlash', 'rootDot'];

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Reads the saved state. Returns null when there's nothing valid to restore.
   * @returns {{source?: string, options?: Object}|null}
   */
  function load() {
    var raw;
    try {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }

    if (!raw) {
      return null;
    }

    try {
      var parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return null;
      }

      var state = {};

      if (typeof parsed.source === 'string') {
        state.source = parsed.source;
      }

      if (isPlainObject(parsed.options)) {
        state.options = {};
        OPTION_KEYS.forEach(function (key) {
          if (typeof parsed.options[key] === 'boolean') {
            state.options[key] = parsed.options[key];
          }
        });
      }

      return state;
    } catch (error) {
      return null;
    }
  }

  /**
   * Saves the state. Returns false if storage is unavailable or full.
   * @param {{source: string, options: Object}} state
   * @returns {boolean}
   */
  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  global.IndentreeStorage = {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    save: save,
  };
})(window);
