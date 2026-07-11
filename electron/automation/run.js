/**
 * Standalone automation runner executed by the Electron main process as a
 * child process (ELECTRON_RUN_AS_NODE=1).
 *
 * Usage: node electron/automation/run.js --task-id <task-id>
 *
 * Each task ID maps to a handler in ./tasks.js. Handlers may call external
 * APIs via fetch() and/or drive a browser via playwright. The final result
 * is always written to stdout as a single JSON object:
 *
 *   { "success": true, "data": <any> }
 *   { "success": false, "error": "<message>" }
 */

const { TASK_HANDLERS } = require('./tasks');

function parseArgs() {
  const args = process.argv.slice(2);
  const taskIdIndex = args.indexOf('--task-id');
  if (taskIdIndex === -1 || !args[taskIdIndex + 1]) {
    return null;
  }
  return args[taskIdIndex + 1];
}

async function main() {
  const taskId = parseArgs();
  if (!taskId) {
    console.log(JSON.stringify({
      success: false,
      error: 'Missing --task-id argument.',
    }));
    process.exit(1);
  }

  const handler = TASK_HANDLERS[taskId];
  if (!handler) {
    console.log(JSON.stringify({
      success: false,
      error: `No automation handler registered for task '${taskId}'.`,
    }));
    process.exit(1);
  }

  try {
    const data = await handler(taskId);
    console.log(JSON.stringify({ success: true, data }));
  } catch (err) {
    console.log(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }));
    process.exit(1);
  }
}

main();
