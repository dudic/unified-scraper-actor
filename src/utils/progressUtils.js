/**
 * Progress update utilities for integration with the web UI
 * Sends progress updates to the web UI via HTTP callbacks
 */

/**
 * Send progress update to the web UI
 * @param {Object} params - Progress parameters
 * @param {string} params.runId - The Apify run ID
 * @param {number} params.done - Number of completed items
 * @param {number} params.total - Total number of items
 * @param {string} params.status - Current status (optional)
 * @param {Object} params.log - Logger instance
 * @returns {Promise<void>}
 */
export async function sendProgressUpdate({ runId, done, total, status = 'RUNNING', log }) {
  const frontUrl = process.env.FRONT_URL;
  const actorSecret = process.env.ACTOR_SECRET;
  
  if (!frontUrl || !actorSecret) {
    log.warn('Missing FRONT_URL or ACTOR_SECRET environment variables. Skipping progress update.');
    return;
  }
  
  try {
    const response = await fetch(`${frontUrl}/api/actor-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${actorSecret}`,
      },
      body: JSON.stringify({
        runId,
        done,
        total,
        status
      }),
    });
    
    if (!response.ok) {
      log.error(`Failed to send progress update: ${response.status} ${response.statusText}`);
    } else {
      log.info(`Progress update sent: ${done}/${total} (${Math.round((done/total)*100)}%)`);
    }
  } catch (error) {
    log.error(`Error sending progress update: ${error.message}`);
  }
}

/**
 * Send completion update to the web UI
 * @param {Object} params - Completion parameters
 * @param {string} params.runId - The Apify run ID
 * @param {number} params.total - Total number of items completed
 * @param {Object} params.log - Logger instance
 * @returns {Promise<void>}
 */
export async function sendCompletionUpdate({ runId, total, log }) {
  await sendProgressUpdate({
    runId,
    done: total,
    total,
    status: 'COMPLETED',
    log
  });
}

/**
 * Send error update to the web UI
 * @param {Object} params - Error parameters
 * @param {string} params.runId - The Apify run ID
 * @param {string} params.error - Error message
 * @param {Object} params.log - Logger instance
 * @returns {Promise<void>}
 */
export async function sendErrorUpdate({ runId, error, log }) {
  const frontUrl = process.env.FRONT_URL;
  const actorSecret = process.env.ACTOR_SECRET;
  
  if (!frontUrl || !actorSecret) {
    log.warn('Missing FRONT_URL or ACTOR_SECRET environment variables. Skipping error update.');
    return;
  }
  
  try {
    const response = await fetch(`${frontUrl}/api/actor-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${actorSecret}`,
      },
      body: JSON.stringify({
        runId,
        status: 'FAILED',
        error: error.message || error
      }),
    });
    
    if (!response.ok) {
      log.error(`Failed to send error update: ${response.status} ${response.statusText}`);
    } else {
      log.info('Error update sent to web UI');
    }
  } catch (err) {
    log.error(`Error sending error update: ${err.message}`);
  }
}
