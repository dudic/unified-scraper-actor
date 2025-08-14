/**
 * HR Cockpit Handler
 * Handles both HR_COCKPIT and HR_COCKPIT_SOLL code types
 * Downloads reports and CSV evaluation data from the HR Cockpit system
 */

import * as fs from "node:fs/promises";
import { Dataset, KeyValueStore } from "crawlee";
import { sendProgressUpdate } from "../utils/progressUtils.js";
import { logStep, logDownload, logError, logSuccess } from "../utils/loggingUtils.js";

export async function handleHRCockpit({ page, crawler, log }) {
  const { code, codeType, runId, actorConfig: config } = crawler;
  
  log.info(`Starting HR Cockpit handler for ${config.name}`);
  
  const result = { code, codeType, reports: [] };
  let totalSteps = 8; // Login + Navigation + Download steps + CSV
  let currentStep = 0;
  
  try {
    // STEP 1: Login to the system
    currentStep++;
    logStep({ step: "Login to HR Cockpit", current: currentStep, total: totalSteps, log });
    
    const user = process.env[config.envCredentials.user];
    const password = process.env[config.envCredentials.password];
    
    if (!user || !password) {
      throw new Error(`Missing credentials for ${codeType}. Please set ${config.envCredentials.user} and ${config.envCredentials.password} environment variables.`);
    }
    
    await page.type(config.loginSelector.user, user);
    await page.type(config.loginSelector.password, password);
    await page.click(config.loginSelector.submit);
    log.info("Login form submitted successfully");
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    
    // STEP 2: Navigate to the main administration area
    currentStep++;
    logStep({ step: "Navigate to administration area", current: currentStep, total: totalSteps, log });
    
    await page.waitForSelector('#nav-menu ul li a:has-text("Gruppen verwalten")');
    await page.click('#nav-menu ul li a:has-text("Gruppen verwalten")');
    log.info("Clicked on 'Gruppen verwalten' successfully");
    
    await page.waitForTimeout(2000);
    
    // STEP 3: Navigate to the specific skills profile section
    currentStep++;
    logStep({ step: `Navigate to ${config.navigationPath}`, current: currentStep, total: totalSteps, log });
    
    await page.waitForSelector(`a:has-text("${config.navigationPath}")`);
    await page.click(`a:has-text("${config.navigationPath}")`);
    log.info(`Clicked on '${config.navigationPath}' successfully`);
    
    await page.waitForTimeout(2000);
    
    // STEP 4: Navigate to completed tests view
    currentStep++;
    logStep({ step: "Navigate to completed tests", current: currentStep, total: totalSteps, log });
    
    await page.waitForSelector('a:has-text("Abgeschlossene Tests ansehen")');
    await page.click('a:has-text("Abgeschlossene Tests ansehen")');
    log.info("Clicked on 'Abgeschlossene Tests ansehen' successfully");
    
    await page.waitForTimeout(3000);
    
    // STEP 5: Find download links for the specified code
    currentStep++;
    logStep({ step: "Find download links", current: currentStep, total: totalSteps, log });
    
    const codeRows = await page.locator(`tr:has-text("${code}")`).all();
    log.info(`Found ${codeRows.length} table rows containing the code: ${code}`);
    
    if (codeRows.length === 0) {
      throw new Error(`Code ${code} not found in the test results table!`);
    }
    
    const locators = await page.locator(`tr:has-text("${code}") td a:has-text("DE")`).all();
    log.info(`Found ${locators.length} download links for standard reports`);
    
    if (locators.length === 0) {
      log.warn(`No download links found for code ${code}. Checking available links...`);
      const allLinks = await page.locator('td a').allTextContents();
      log.info(`Available link texts: ${allLinks.slice(0, 10).join(', ')}...`);
    }
    
    // Update total steps based on actual files found: 4 base steps + download steps + CSV step + save step
    totalSteps = 4 + locators.length + (config.includeCSV ? 1 : 0) + 1; // +1 for save results step
    
    // STEP 6: Download standard reports
    if (locators.length > 0) {
      for (let i = 0; i < locators.length; i++) {
        currentStep++;
        const fileType = config.fileTypes[i] || `Report-${i + 1}`;
        logStep({ step: `Download ${fileType}`, current: currentStep, total: totalSteps, log });
        
        const locator = locators[i];
        
        try {
          const downloadResult = await downloadWithRetry(page, locator, fileType, log);
          
          // Store file in Key-Value Store
          const buffer = await fs.readFile(downloadResult.fileName);
          await KeyValueStore.setValue(downloadResult.fileName, buffer, { 
            contentType: downloadResult.contentType 
          });
          
          // Add file metadata to result for dataset
          result.reports.push({
            fileUrl: `https://api.apify.com/v2/key-value-stores/${process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID}/records/${downloadResult.fileName}`,
            fileName: downloadResult.fileName,
            contentType: downloadResult.contentType,
            fileSize: buffer.length
          });
          
          // Send progress update (non-blocking)
          if (runId) {
            try {
              await sendProgressUpdate({
                runId,
                done: currentStep,
                total: totalSteps,
                log
              });
            } catch (progressError) {
              // Don't fail the main process due to progress update errors
              log.info(`Progress update failed (non-critical): ${progressError.message}`);
            }
          }
          
        } catch (error) {
          logError({ error, operation: `Download ${fileType}`, log });
          // Continue with next file instead of failing completely
        }
      }
    }
    
    // STEP 7: Download CSV evaluation data (if enabled)
    if (config.includeCSV) {
      currentStep++;
      logStep({ step: "Download CSV evaluation data", current: currentStep, total: totalSteps, log });
      
      try {
        const csvResult = await downloadCSVWithRetry(page, code, log);
        
        // Store file in Key-Value Store
        const buffer = await fs.readFile(csvResult.fileName);
        await KeyValueStore.setValue(csvResult.fileName, buffer, { 
          contentType: csvResult.contentType 
        });
        
        // Add file metadata to result for dataset
        result.reports.push({
          fileUrl: `https://api.apify.com/v2/key-value-stores/${process.env.ACTOR_DEFAULT_KEY_VALUE_STORE_ID}/records/${csvResult.fileName}`,
          fileName: csvResult.fileName,
          contentType: csvResult.contentType,
          fileSize: buffer.length
        });
        
        // Send progress update (non-blocking)
        if (runId) {
          try {
            await sendProgressUpdate({
              runId,
              done: currentStep,
              total: totalSteps,
              log
            });
          } catch (progressError) {
            // Don't fail the main process due to progress update errors
            log.info(`Progress update failed (non-critical): ${progressError.message}`);
          }
        }
        
      } catch (error) {
        logError({ error, operation: "Download CSV evaluation data", log });
        // Continue without the CSV file
      }
    }
    
    // STEP 8: Save results
    currentStep++;
    logStep({ step: "Save results to dataset", current: currentStep, total: totalSteps, log });
    
    await Dataset.pushData(result);
    
    // Send final progress update (non-blocking)
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: totalSteps,
          total: totalSteps,
          status: 'COMPLETED',
          log
        });
      } catch (progressError) {
        // Don't fail the main process due to progress update errors
        log.info(`Final progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    logSuccess({ 
      operation: `HR Cockpit processing for ${codeType}`, 
      result: { 
        code, 
        codeType, 
        reportsCount: result.reports.length,
        reports: result.reports.map(r => r.fileName)
      }, 
      log 
    });
    
  } catch (error) {
    logError({ error, operation: `HR Cockpit processing for ${codeType}`, context: { code, codeType }, log });
    throw error;
  }
}

/**
 * Helper function for downloading files with retries
 */
async function downloadWithRetry(page, locator, fileType, log, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logDownload({ fileName: fileType, current: attempt, total: maxRetries, log });
      
      const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
      await page.waitForTimeout(1000);
      await locator.click();
      const download = await downloadPromise;
      
      const fileName = download.suggestedFilename();
      await download.saveAs(fileName);
      log.info(`Successfully downloaded: ${fileName}`);
      
      const contentType = fileName.endsWith("pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      
      return { fileName, contentType };
      
    } catch (error) {
      log.error(`Attempt ${attempt} failed for ${fileType}: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Helper function for downloading CSV with retries
 */
async function downloadCSVWithRetry(page, code, log, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info(`CSV download attempt ${attempt}/${maxRetries}`);
      
      // Extract UID from the test results table
      const uid = await page.locator(`tr:has-text("${code}") td`).nth(1).innerText();
      log.info(`Extracted UID: ${uid}`);
      
      // Navigate to report creation page
      await page.goto(page.url().replace(
        'https://wle2.constant-dialog.ch/admin.php?a=view_completetests&gid=',
        'https://wle2.constant-dialog.ch/admin.php?a=create_new_report&gid='
      ));
      
      await page.waitForTimeout(3000);
      
      // Fill in the UID filter
      await page.locator('#filter_uid').fill(uid);
      await page.waitForTimeout(1000);
      
      // Select CSV output option
      await page.locator('input[type=checkbox][name=output_eval_csv]').click();
      await page.waitForTimeout(1000);
      
      // Submit form and wait for popup
      const popupPromise = page.waitForEvent('popup', { timeout: 30000 });
      await page.locator('input[type=submit]').click();
      const popup = await popupPromise;
      
      await page.waitForTimeout(2000);
      
      // Download CSV from popup
      const downloadPromise = popup.waitForEvent("download", { timeout: 30000 });
      await popup.locator('#content ul li a').click();
      const download = await downloadPromise;
      
      const fileName = download.suggestedFilename();
      await download.saveAs(fileName);
      log.info(`Successfully downloaded CSV: ${fileName}`);
      
      const contentType = 'text/csv';
      
      return { fileName, contentType };
      
    } catch (error) {
      log.error(`CSV download attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      await page.waitForTimeout(2000);
    }
  }
}
