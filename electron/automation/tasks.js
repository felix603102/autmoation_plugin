/**
 * Task automation handlers.
 *
 * Each handler is an async function that receives the task ID and returns
 * any serializable data. Handlers can mix API calling via fetch() and
 * browser UI automation via playwright.
 *
 * Add one entry per task in TASK_HANDLERS. Task IDs match the `id` field in
 * src/data/timelines/*.json.
 */

// Lazy-load playwright so pure API tasks don't pay the browser startup cost.

/**
 * Example API-calling handler.
 * Replace the URL/params with the real endpoint for this task.
 */
async function callApi(taskId) {
  const response = await fetch(
    `https://httpbin.org/get?task_id=${encodeURIComponent(taskId)}`,
    { method: 'GET' },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Example UI-automation handler using Playwright.
 * Replace the navigation/selectors with the real automation steps.
 */
async function runUiAutomation(taskId) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    return { taskId, pageTitle: title };
  } finally {
    await browser.close();
  }
}

const TASK_HANDLERS = {
  'check-numbers': callApi,
  'matches-odds-validate': callApi,
  'tournament-odds-validate': callApi,
  'smart-dashboard-wording': runUiAutomation,
};

module.exports = { TASK_HANDLERS };
