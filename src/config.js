/**
 * Configuration for the unified scraper actor
 * Maps each code type to its specific settings and behavior
 */

export const CONFIG = {
  HR_COCKPIT: {
    name: "HR Cockpit - Standard",
    baseUrl: "https://wle2.constant-dialog.ch/admin.php",
    navigationPath: "Outvision: Persönlichkeitsanalyse Skills",
    fileTypes: ["Standard-Report", "Assessment-Report", "PPT-Report"],
    includeCSV: true,
    loginSelector: {
      user: "input[name=user]",
      password: "input[name=password]",
      submit: "input[value=Login]"
    },
    envCredentials: {
      user: "HR_COCKPIT_USER",
      password: "HR_COCKPIT_PASSWORD"
    }
  },
  
  HR_COCKPIT_SOLL: {
    name: "HR Cockpit - Soll Profile",
    baseUrl: "https://wle2.constant-dialog.ch/admin.php",
    navigationPath: "Outvision: SKILLS Soll-Profile",
    fileTypes: ["Standard-Report", "Assessment-Report", "PPT-Report"],
    includeCSV: true,
    loginSelector: {
      user: "input[name=user]",
      password: "input[name=password]",
      submit: "input[value=Login]"
    },
    envCredentials: {
      user: "HR_COCKPIT_USER",
      password: "HR_COCKPIT_PASSWORD"
    }
  },
  
  PROFILING_VALUES: {
    name: "Profiling Values - Reports",
    baseUrl: "https://backoffice.profilingvalues.com/login.html",
    navigationPath: "default",
    fileTypes: ["all_reports"],
    includeCSV: false,
    loginSelector: {
      user: "input#loginname",
      password: "input[name=password]",
      submit: "button#button_10"
    },
    envCredentials: {
      user: "PROFILING_VALUES_USER",
      password: "PROFILING_VALUES_PASSWORD"
    }
  },
  
  PROFILING_VALUES_SOLL: {
    name: "Profiling Values - PAT Data",
    baseUrl: "https://backoffice.profilingvalues.com/login.html",
    navigationPath: "PAT-Verwaltung",
    fileTypes: ["metadata_only"],
    includeCSV: false,
    loginSelector: {
      user: "input#loginname",
      password: "input[name=password]",
      submit: "button#button_10"
    },
    envCredentials: {
      user: "PROFILING_VALUES_USER",
      password: "PROFILING_VALUES_PASSWORD"
    }
  }
};

/**
 * Validate that a code type is supported
 * @param {string} codeType - The code type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidCodeType(codeType) {
  return Object.keys(CONFIG).includes(codeType);
}

/**
 * Get configuration for a specific code type
 * @param {string} codeType - The code type
 * @returns {Object} - The configuration object
 */
export function getConfig(codeType) {
  if (!isValidCodeType(codeType)) {
    throw new Error(`Invalid code type: ${codeType}. Valid types: ${Object.keys(CONFIG).join(', ')}`);
  }
  return CONFIG[codeType];
}

/**
 * Get all valid code types
 * @returns {string[]} - Array of valid code types
 */
export function getValidCodeTypes() {
  return Object.keys(CONFIG);
}
