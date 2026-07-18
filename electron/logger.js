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

  /**
   * Delete log files older than `days` days. A non-positive value disables
   * cleanup (keeps everything). Returns the number of files removed.
   */
  cleanupOldLogs(days) {
    if (!days || days <= 0) return 0;
    let removed = 0;
    try {
      if (!fs.existsSync(this.logsDir)) return 0;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      for (const file of fs.readdirSync(this.logsDir)) {
        if (!file.endsWith('.log')) continue;
        // File names are YYYY-MM-DD.log; parse the date from the name.
        const dateStr = file.replace('.log', '');
        const parsed = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) continue;
        if (parsed.getTime() < cutoff) {
          fs.unlinkSync(path.join(this.logsDir, file));
          removed += 1;
        }
      }
      if (removed > 0) {
        this.info('Log cleanup complete', { removed, retentionDays: days });
      }
    } catch (err) {
      console.error('[Logger] Failed to clean up old logs:', err);
    }
    return removed;
  }
}

module.exports = Logger;
