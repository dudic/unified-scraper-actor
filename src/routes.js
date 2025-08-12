/**
 * Main router for the unified scraper actor
 * Dispatches requests to appropriate handlers based on code type
 */

import { createPlaywrightRouter } from "crawlee";
import { handleHRCockpit } from "./handlers/hrCockpitHandler.js";
import { handleProfilingValues } from "./handlers/profilingValuesHandler.js";
import { handleProfilingValuesSoll } from "./handlers/profilingValuesSollHandler.js";
import { logWithContext } from "./utils/loggingUtils.js";

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, crawler, log }) => {
  const { code, codeType, runId, actorConfig: config } = crawler;
  
  log.info(`Starting unified scraper process`);
  log.info(`Code: ${code}`);
  log.info(`Code Type: ${codeType}`);
  log.info(`Configuration: ${config.name}`);
  
  try {
    // Route to appropriate handler based on code type
    switch (codeType) {
      case 'HR_COCKPIT':
      case 'HR_COCKPIT_SOLL':
        log.info(`Routing to HR Cockpit handler for ${codeType}`);
        await handleHRCockpit({ page, crawler, log });
        break;
        
      case 'PROFILING_VALUES':
        log.info(`Routing to Profiling Values handler for ${codeType}`);
        await handleProfilingValues({ page, crawler, log });
        break;
        
      case 'PROFILING_VALUES_SOLL':
        log.info(`Routing to Profiling Values Soll handler for ${codeType}`);
        await handleProfilingValuesSoll({ page, crawler, log });
        break;
        
      default:
        throw new Error(`Unknown code type: ${codeType}`);
    }
    
    log.info(`Successfully completed processing for code: ${code}, type: ${codeType}`);
    
  } catch (error) {
    log.error(`Error processing code ${code} with type ${codeType}: ${error.message}`);
    
    // Log error with context
    logWithContext({
      level: 'error',
      message: `Processing failed for ${codeType}`,
      context: {
        code,
        codeType,
        error: error.message,
        stack: error.stack
      },
      log
    });
    
    throw error; // Re-throw to trigger error handling
  }
});

// Handler for detail pages (currently unused but kept for potential future use)
router.addHandler("detail", async ({ request, page, log }) => {
  const title = await page.title();
  log.info(`Detail page: ${title}`, { url: request.loadedUrl });

  await Actor.pushData({
    url: request.loadedUrl,
    title,
  });
});
