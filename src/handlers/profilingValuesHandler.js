/**
 * Profiling Values Handler
 * Handles PROFILING_VALUES code type
 * Downloads various report types (PDFs, CSV, JSON) from the Profiling Values system
 */

import * as fs from "node:fs/promises";
import { Dataset, KeyValueStore } from "crawlee";
import pRetry from "p-retry";
import { sendProgressUpdate } from "../utils/progressUtils.js";
import { logStep, logDownload, logError, logSuccess } from "../utils/loggingUtils.js";

export async function handleProfilingValues({ page, crawler, log }) {
  const { code, codeType, runId, actorConfig: config } = crawler;
  
  log.info(`Starting Profiling Values handler for ${config.name}`);
  
  const result = { code, codeType, reports: [] };
  let totalSteps = 6; // Login + Filter + Find + Download steps
  let currentStep = 0;
  
  try {
    // STEP 1: Login to the system
    currentStep++;
    logStep({ step: "Login to Profiling Values", current: currentStep, total: totalSteps, log });
    
    // Send progress update for login step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Login to Profiling Values",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    const user = process.env[config.envCredentials.user];
    const password = process.env[config.envCredentials.password];
    
    if (!user || !password) {
      throw new Error(`Missing credentials for ${codeType}. Please set ${config.envCredentials.user} and ${config.envCredentials.password} environment variables.`);
    }
    
    await page.locator(config.loginSelector.user).fill(user);
    await page.locator(config.loginSelector.password).fill(password);
    await page.click(config.loginSelector.submit);
    log.info("Login form submitted successfully");
    
    // STEP 2: Wait for filter input and search for code
    currentStep++;
    logStep({ step: "Search for code", current: currentStep, total: totalSteps, log });
    
    // Send progress update for search step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Search for code",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await page.locator("input[name=filter_text]").waitFor({ state: "visible", timeout: 60000 });
    await page.locator("input[name=filter_text]").clear();
    await page.locator("input[name=filter_text]").fill(code);
    await page.keyboard.press("Enter");
    
    // STEP 3: Wait for code to appear and click PDF report icon
    currentStep++;
    logStep({ step: "Navigate to reports", current: currentStep, total: totalSteps, log });
    
    // Send progress update for navigation step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Navigate to reports",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await page.locator(`td:has-text("${code}")`).waitFor({ timeout: 60000 });
    await page.locator(`tr:has-text("${code}") i[title=PDF-Report]`).click();
    
    // STEP 4: Wait for report box and get all report buttons
    currentStep++;
    logStep({ step: "Get available reports", current: currentStep, total: totalSteps, log });
    
    // Send progress update for getting reports step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Get available reports",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await page.locator("#report_box").waitFor({ state: "visible", timeout: 60000 });
    
    // Get initial count of buttons to calculate total steps
    const initialButtons = await page.locator("#report_box button[onclick*=reportbox_submit]").all();
    const buttonCount = initialButtons.length;
    log.info(`Found ${buttonCount} report buttons`);
    
    // Update total steps based on button count
    totalSteps = 4 + buttonCount;
    
    // STEP 5: Download each report
    for (let i = 0; i < buttonCount; i++) {
      currentStep++;
      
      // Re-query buttons each time to get fresh references
      const buttons = await page.locator("#report_box button[onclick*=reportbox_submit]").all();
      if (buttons.length !== buttonCount) {
        throw new Error(`Button count changed during iteration. Expected ${buttonCount}, found ${buttons.length}`);
      }
      
      const button = buttons[i];
      const buttonText = await button.textContent();
      
      logStep({ step: `Download ${buttonText}`, current: currentStep, total: totalSteps, log });
      
      try {
        const reportResult = await pRetry(() => downloadAndUpload(button, page, log), {
          retries: 5,
          minTimeout: 2000,
          onFailedAttempt: (error) => {
            log.error(`Attempt ${error.attemptNumber} failed for ${buttonText}: ${error.message}. Retrying...`);
          },
        });
        
        result.reports.push(reportResult);
        log.info(`Successfully processed: ${reportResult.name}`);
        
        // Send progress update
        if (runId) {
          await sendProgressUpdate({
            runId,
            done: currentStep,
            total: totalSteps,
            description: `Download ${buttonText}`,
            log
          });
        }
        
      } catch (error) {
        logError({ error, operation: `Download ${buttonText}`, log });
        // Continue with other buttons instead of failing completely
      }
    }
    
    // STEP 6: Save results
    currentStep++;
    logStep({ step: "Save results to dataset", current: currentStep, total: totalSteps, log });
    
    // Send progress update for save step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Save results to dataset",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await Dataset.pushData(result);
    
    // Send final progress update
    if (runId) {
      await sendProgressUpdate({
        runId,
        done: totalSteps,
        total: totalSteps,
        status: 'COMPLETED',
        description: 'Completed',
        log
      });
    }
    
    logSuccess({ 
      operation: `Profiling Values processing for ${codeType}`, 
      result: { 
        code, 
        codeType, 
        reportsCount: result.reports.length,
        reports: result.reports.map(r => r.name)
      }, 
      log 
    });
    
  } catch (error) {
    logError({ error, operation: `Profiling Values processing for ${codeType}`, context: { code, codeType }, log });
    throw error;
  }
}

/**
 * Helper function to download and upload a report
 */
async function downloadAndUpload(button, page, log) {
  const name = await button.textContent();
  
  // Special handling for JSON-Report
  if (name === 'JSON-Report') {
    log.info("Processing JSON report");
    
    // Set up a response listener before clicking the button
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('action=downloadJSON'), 
      { timeout: 15000 }
    );
    
    // Click the button to trigger the proper form submission
    await button.click();
    
    // Wait for the response
    const response = await responsePromise;
    const jsonData = await response.text();
    
    log.info("Successfully fetched JSON data");
    
    // Save JSON data
    await KeyValueStore.setValue(name, jsonData, { contentType: "application/json" });
    
    return {
      name,
      url: `https://api.apify.com/v2/key-value-stores/${process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID}/records/${name}`,
    };
  }
  
  // Original download handling for other reports
  log.info("Setting up download event listener");
  const downloadPromise = page.waitForEvent("download", {
    timeout: 15000,
  });
  
  const command = await button.getAttribute("onclick");
  log.info(`Executing command: ${command}`);
  
  await page.evaluate((command) => {
    eval(command);
  }, command);
  
  log.info("Waiting for download to start");
  const download = await downloadPromise;
  const fileName = download.suggestedFilename();
  log.info(`Downloading file: ${fileName}`);
  
  await download.saveAs(fileName);
  // Better content type detection based on file extension
  let contentType = "application/octet-stream";
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv':
      contentType = "text/csv";
      break;
    case 'pdf':
      contentType = "application/pdf";
      break;
    case 'pptx':
      contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      break;
    case 'ppt':
      contentType = "application/vnd.ms-powerpoint";
      break;
    case 'xlsx':
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      break;
    case 'xls':
      contentType = "application/vnd.ms-excel";
      break;
    case 'docx':
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      break;
    case 'doc':
      contentType = "application/msword";
      break;
    case 'json':
      contentType = "application/json";
      break;
    case 'txt':
      contentType = "text/plain";
      break;
    case 'xml':
      contentType = "application/xml";
      break;
    case 'html':
    case 'htm':
      contentType = "text/html";
      break;
    default:
      contentType = "application/octet-stream";
  }
  
  log.info(`Reading file: ${fileName}`);
  const buffer = await fs.readFile(fileName);
  
  log.info(`Uploading to KeyValueStore: ${name}`);
  await KeyValueStore.setValue(name, buffer, { contentType });
  
  // Add a delay between downloads to prevent rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    name,
    url: `https://api.apify.com/v2/key-value-stores/${process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID}/records/${name}`,
  };
}
