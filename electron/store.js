/**
 * Simple JSON-backed settings store.
 *
 * Keeps user preferences (currently just the task-status base directory) in
 * `<userData>/settings.json` so they survive app restarts. The renderer cannot
 * read the filesystem, so settings are exposed through dedicated IPC handlers.
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const STORE_FILE_NAME = 'settings.json';

/** Return the full path to the settings JSON file. */
function getStorePath() {
  return path.join(app.getPath('userData'), STORE_FILE_NAME);
}

/** Read and parse the settings file, or return defaults if it does not exist. */
function readStore() {
  const storePath = getStorePath();
  try {
    if (!fs.existsSync(storePath)) return {};
    const raw = fs.readFileSync(storePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[store] failed to read settings:', err);
    return {};
  }
}

/** Persist settings to disk. */
function writeStore(data) {
  const storePath = getStorePath();
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[store] failed to write settings:', err);
    throw err;
  }
}

/** Get a setting value by key. */
function get(key, defaultValue = undefined) {
  const store = readStore();
  return store[key] ?? defaultValue;
}

/** Set a setting value by key. */
function set(key, value) {
  const store = readStore();
  store[key] = value;
  writeStore(store);
}

module.exports = { get, set };
