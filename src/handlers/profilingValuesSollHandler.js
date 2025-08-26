/**
 * Profiling Values Soll Handler
 * Handles PROFILING_VALUES_SOLL code type
 * Extracts PAT (Profile Analysis Tool) metadata and structured data
 */

import { Dataset } from "crawlee";
import * as cheerio from "cheerio";
import { sendProgressUpdate } from "../utils/progressUtils.js";
import { logStep, logError, logSuccess } from "../utils/loggingUtils.js";

export async function handleProfilingValuesSoll({ page, crawler, log }) {
  const { code, codeType, runId, actorConfig: config } = crawler;
  
  log.info(`Starting Profiling Values Soll handler for ${config.name}`);
  
  const result = { code, codeType };
  let totalSteps = 5; // Login + Navigation + Filter + Extract + Save
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
    
    // STEP 2: Navigate to PAT administration
    currentStep++;
    logStep({ step: "Navigate to PAT administration", current: currentStep, total: totalSteps, log });
    
    // Send progress update for navigation step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Navigate to PAT administration",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await page.locator('a:has-text("PAT-Verwaltung")').click();
    log.info("Clicked on 'PAT-Verwaltung' successfully");
    
    // STEP 3: Filter and search for code
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
    
    await page.locator("input[name=filter_text]").waitFor({ state: "visible" });
    await page.locator("input[name=filter_text]").clear();
    await page.locator("input[name=filter_text]").fill(code);
    await page.keyboard.press("Enter");
    
    // Wait for code to appear and click view button
    await page.locator(`td:has-text("${code}")`).waitFor();
    await page.locator(`tr:has-text("${code}") i[title=Anzeigen]`).click();
    log.info(`Found and clicked on code: ${code}`);
    
    // STEP 4: Wait for PAT container and extract data
    currentStep++;
    logStep({ step: "Extract PAT data", current: currentStep, total: totalSteps, log });
    
    // Send progress update for extraction step
    if (runId) {
      try {
        await sendProgressUpdate({
          runId,
          done: currentStep,
          total: totalSteps,
          description: "Extract PAT data",
          log
        });
      } catch (progressError) {
        log.info(`Progress update failed (non-critical): ${progressError.message}`);
      }
    }
    
    await page.locator("#pat_container").waitFor({ state: "visible" });
    log.info("PAT container is visible, extracting data...");
    
    // Extract data using cheerio
    const $ = cheerio.load(await page.content());
    
    // Extract metadata
    result.metadata = {
      code,
      key: $("td:contains(Schlüssel)").next("td").text(),
      created: $("td:contains(Erstellt)")
        .next("td")
        .text()
        .split("von")
        .shift()
        .trim(),
      created_by: $("td:contains(Erstellt)")
        .next("td")
        .text()
        .split("von")
        .pop()
        .trim(),
      pat_type: $("td:contains(PAT-Typ)").next("td").text(),
      company: $("td:contains(Firma)").next("td").text(),
      industry: $("td:contains(Branche)").next("td").text(),
      role: $("td:contains(Funktion)").next("td").text(),
      modified: $("td:contains(Geändert)").next("td").text(),
    };
    
    // Extract structured data
    result.data = [];
    const trs = $("#pat_table tr").slice(1);
    
    for (let i = 0; i < trs.length; i += 2) {
      const row = {};
      row.definition = $(trs[i]).find("td").eq(0).text().trim();
      row.koennen = {};
      row.koennen.min = Number($(trs[i]).find("td").eq(2).text().trim());
      row.koennen.max = Number($(trs[i]).find("td").eq(3).text().trim());
      row.koennen.mitte = Number($(trs[i]).find("td").eq(4).text().trim());

      row.wollen = {};
      row.wollen.min = Number(
        $(trs[i]).next("tr").find("td").eq(2).text().trim()
      );
      row.wollen.max = Number(
        $(trs[i]).next("tr").find("td").eq(3).text().trim()
      );
      row.wollen.mitte = Number(
        $(trs[i]).next("tr").find("td").eq(4).text().trim()
      );
      result.data.push(row);
    }
    
    log.info(`Extracted ${result.data.length} data rows and metadata for code: ${code}`);
    
    // Send progress update
    if (runId) {
      await sendProgressUpdate({
        runId,
        done: currentStep,
        total: totalSteps,
        description: "Extract PAT data",
        log
      });
    }
    
    // STEP 5: Save results
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
      operation: `Profiling Values Soll processing for ${codeType}`, 
      result: { 
        code, 
        codeType, 
        metadataFields: Object.keys(result.metadata).length,
        dataRows: result.data.length
      }, 
      log 
    });
    
  } catch (error) {
    logError({ error, operation: `Profiling Values Soll processing for ${codeType}`, context: { code, codeType }, log });
    throw error;
  }
}
