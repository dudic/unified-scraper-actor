/**
 * Unified Scraper Actor - Main Entry Point
 * 
 * This actor merges functionality from four separate actors:
 * - HR Cockpit (Standard)
 * - HR Cockpit Soll (Soll Profile)
 * - Profiling Values (Reports)
 * - Profiling Values Soll (PAT Data)
 * 
 * Integration with web UI via progress callbacks
 */

import { Actor } from "apify";
import { PlaywrightCrawler } from "crawlee";
import { router } from "./routes.js";
import { getConfig, isValidCodeType } from "./config.js";
import { sendProgressUpdate, sendErrorUpdate } from "./utils/progressUtils.js";
import { logWithContext } from "./utils/loggingUtils.js";

// Initialize the Apify SDK
await Actor.init();

try {
  // Get input parameters
  const input = await Actor.getInput();
  const { code, codeType, internalRunId } = input;
  
  // Validate required parameters
  if (!code) {
    throw new Error("Missing required parameter: 'code'");
  }
  
  if (!codeType) {
    throw new Error("Missing required parameter: 'codeType'. Valid types: HR_COCKPIT, HR_COCKPIT_SOLL, PROFILING_VALUES, PROFILING_VALUES_SOLL");
  }
  
  if (!isValidCodeType(codeType)) {
    throw new Error(`Invalid codeType: '${codeType}'. Valid types: HR_COCKPIT, HR_COCKPIT_SOLL, PROFILING_VALUES, PROFILING_VALUES_SOLL`);
  }
  
  // Get configuration for the specified code type
  const config = getConfig(codeType);
  
  // Use internalRunId (Supabase UUID) for progress tracking
  // This is the primary identifier for all database operations
  const runId = internalRunId;
  
  if (!runId) {
    throw new Error("Missing required parameter: 'internalRunId' (Supabase UUID)");
  }
  
  // Log startup information
  console.log(`Starting unified scraper actor`);
  console.log(`Code: ${code}`);
  console.log(`Code Type: ${codeType}`);
  console.log(`Configuration: ${config.name}`);
  console.log(`Supabase UUID: ${internalRunId}`);
  console.log(`Using UUID for all operations: ${runId}`);
  
  // Send initial progress update to web UI
  if (runId) {
    await sendProgressUpdate({
      runId,
      done: 0,
      total: 1, // Will be updated with actual total
      status: 'STARTING',
      log: console
    });
  }
  
  // Create proxy configuration (matches legacy actors)
  const proxyConfiguration = await Actor.createProxyConfiguration();
  
  // Set up crawler with configuration (matches legacy actors)
  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandlerTimeoutSecs: 600,
    maxRequestRetries: 3,
    requestHandler: router,
    headless: false, // Match legacy actors (headless: false)
    
    // Launch options (simplified to match legacy)
    launchContext: {
      launchOptions: {
        args: [
          "--disable-gpu", // Mitigates the "crashing GPU process" issue in Docker containers
        ],
      },
    },
    
    // Navigation timeout
    navigationTimeoutSecs: 120,
    
    // Error handling
    failedRequestHandler: async ({ request, error, log }) => {
      log.error(`Request ${request.url} failed: ${error.message}`);
      
      // Send error update to web UI
      if (runId) {
        await sendErrorUpdate({
          runId,
          error: error.message,
          log
        });
      }
      
      // Push error data
      await Actor.pushData({
        url: request.url,
        error: error.message,
        code,
        codeType,
        runId
      });
    },
  });
  
  // Attach context to crawler (avoid config object to prevent type errors)
  crawler.code = code;
  crawler.codeType = codeType;
  crawler.runId = runId;
  
  // Store config separately for handlers to access
  crawler.actorConfig = config;
  
  // Set start URLs based on configuration
  const startUrls = [config.baseUrl];
  
  // Log configuration validation
  logWithContext({
    level: 'info',
    message: 'Configuration loaded successfully',
    context: {
      code,
      codeType,
      baseUrl: config.baseUrl,
      navigationPath: config.navigationPath,
      fileTypes: config.fileTypes
    },
    log: console
  });
  
  // Run the crawler
  console.log(`Starting crawler for ${config.name}...`);
  await crawler.run(startUrls);
  
  // Send completion update to web UI
  if (runId) {
    await sendProgressUpdate({
      runId,
      done: 1,
      total: 1,
      status: 'COMPLETED',
      log: console
    });
  }
  
  console.log("Crawler finished successfully");
  
} catch (error) {
  console.error(`Actor failed: ${error.message}`);
  
  // Send error update to web UI
  // FIXED: Use the original runId (Supabase UUID) instead of shadowing it
  if (runId) {
    await sendErrorUpdate({
      runId,
      error: error.message,
      log: console
    });
  }
  
  // Push error data
  await Actor.pushData({
    error: error.message,
    stack: error.stack,
    runId: runId // Use the original runId (Supabase UUID)
  });
  
  // Exit with error
  await Actor.exit(1);
}

// Exit successfully
await Actor.exit();
