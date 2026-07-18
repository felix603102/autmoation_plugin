const fs = require('node:fs');
const path = require('node:path');

/**
 * Simple file-based logger that writes to daily log files.
 * Logs are stored in <logsDir>/<YYYY-MM-DD>.log
 */
class Logger {
  constructor(logsDir) {
    this.logsDir = logsDir;
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return path.join(this.logsDir, `${dateStr}.log`);
  }

  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  write(level, message, data = null) {
    try {
      const timestamp = this.getTimestamp();
      let logLine = `[${timestamp}] [${level}] ${message}`;
      if (data) {
        logLine += ` | ${JSON.stringify(data)}`;
      }
      logLine += '\n';

      const filePath = this.getLogFilePath();
      fs.appendFileSync(filePath, logLine, 'utf-8');
    } catch (err) {
      console.error('[Logger] Failed to write log:', err);
    }
  }

  info(message, data) {
    this.write('INFO', message, data);
  }

  error(message, data) {
    this.write('ERROR', message, data);
  }

  warn(message, data) {
    this.write('WARN', message, data);
  }

  debug(message, data) {
    this.write('DEBUG', message, data);
  }

  task(taskId, status, data) {
    this.write('TASK', `${taskId}:${status}`, data);
  }
}

module.exports = Logger;
