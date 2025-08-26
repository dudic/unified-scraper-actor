/**
 * Enhanced logging utilities for the unified scraper actor
 * Provides structured logging with context and progress tracking
 */

/**
 * Create a structured log message with context
 * @param {Object} params - Log parameters
 * @param {string} params.level - Log level (info, warn, error, debug)
 * @param {string} params.message - Log message
 * @param {Object} params.context - Additional context data
 * @param {Object} params.log - Logger instance
 */
export function logWithContext({ level, message, context = {}, log }) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 
    ? ` | Context: ${JSON.stringify(context)}`
    : '';
  
  const fullMessage = `[${timestamp}] ${message}${contextStr}`;
  
  switch (level.toLowerCase()) {
    case 'info':
      log.info(fullMessage);
      break;
    case 'warn':
      log.warn(fullMessage);
      break;
    case 'error':
      log.error(fullMessage);
      break;
    case 'debug':
      log.debug(fullMessage);
      break;
    default:
      log.info(fullMessage);
  }
}

/**
 * Log step progress with context
 * @param {Object} params - Step parameters
 * @param {string} params.step - Step name
 * @param {number} params.current - Current step number
 * @param {number} params.total - Total steps
 * @param {Object} params.context - Additional context
 * @param {Object} params.log - Logger instance
 */
export function logStep({ step, current, total, context = {}, log }) {
  const percentage = Math.round((current / total) * 100);
  logWithContext({
    level: 'info',
    message: `STEP ${current}/${total} (${percentage}%): ${step}`,
    context,
    log
  });
}

/**
 * Log file download progress
 * @param {Object} params - Download parameters
 * @param {string} params.fileName - File name being downloaded
 * @param {number} params.current - Current file number
 * @param {number} params.total - Total files
 * @param {Object} params.log - Logger instance
 */
export function logDownload({ fileName, current, total, log }) {
  logWithContext({
    level: 'info',
    message: `Downloading file ${current}/${total}: ${fileName}`,
    context: { fileName, current, total },
    log
  });
}

/**
 * Log error with full context
 * @param {Object} params - Error parameters
 * @param {Error} params.error - Error object
 * @param {string} params.operation - Operation that failed
 * @param {Object} params.context - Additional context
 * @param {Object} params.log - Logger instance
 */
export function logError({ error, operation, context = {}, log }) {
  logWithContext({
    level: 'error',
    message: `Error in ${operation}: ${error.message}`,
    context: {
      ...context,
      errorStack: error.stack,
      errorName: error.name
    },
    log
  });
}

/**
 * Log successful operation
 * @param {Object} params - Success parameters
 * @param {string} params.operation - Operation that succeeded
 * @param {Object} params.result - Result data
 * @param {Object} params.log - Logger instance
 */
export function logSuccess({ operation, result = {}, log }) {
  logWithContext({
    level: 'info',
    message: `Successfully completed: ${operation}`,
    context: result,
    log
  });
}

/**
 * Log configuration validation
 * @param {Object} params - Validation parameters
 * @param {string} params.codeType - Code type being validated
 * @param {Object} params.config - Configuration object
 * @param {Object} params.log - Logger instance
 */
export function logConfigValidation({ codeType, config, log }) {
  logWithContext({
    level: 'info',
    message: `Configuration validated for code type: ${codeType}`,
    context: {
      codeType,
      baseUrl: config.baseUrl,
      navigationPath: config.navigationPath,
      fileTypes: config.fileTypes,
      includeCSV: config.includeCSV
    },
    log
  });
}
