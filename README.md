# Unified Scraper Actor

A unified Apify actor that merges functionality from four separate scraping actors into one comprehensive solution. This actor can handle different types of scraping tasks based on the provided `codeType` parameter.

## Features

- **Unified Interface**: Single actor handles multiple scraping scenarios
- **Real-time Progress Tracking**: Integrates with web UI for live progress updates
- **Comprehensive Logging**: Structured logging with context and error handling
- **Retry Mechanisms**: Robust error handling with automatic retries
- **Modular Architecture**: Clean separation of concerns with dedicated handlers

## Supported Code Types

### 1. HR_COCKPIT
- **Platform**: HR Cockpit (Constant Dialog)
- **Downloads**: Standard-Report, Assessment-Report, PPT-Report (PDFs/PowerPoint) + CSV evaluation data
- **Navigation**: "Gruppen verwalten" → "Outvision: Persönlichkeitsanalyse Skills" → "Abgeschlossene Tests ansehen"

### 2. HR_COCKPIT_SOLL
- **Platform**: HR Cockpit (Constant Dialog)
- **Downloads**: Standard-Report, Assessment-Report, PPT-Report (PDFs/PowerPoint) + CSV evaluation data
- **Navigation**: "Gruppen verwalten" → "Outvision: SKILLS Soll-Profile" → "Abgeschlossene Tests ansehen"

### 3. PROFILING_VALUES
- **Platform**: Profiling Values Backoffice
- **Downloads**: Multiple report types (PDFs, CSV, JSON) via report buttons
- **Navigation**: Login → Filter by code → Click PDF report icon → Download various reports

### 4. PROFILING_VALUES_SOLL
- **Platform**: Profiling Values Backoffice
- **Downloads**: PAT (Profile Analysis Tool) metadata and structured data
- **Navigation**: Login → "PAT-Verwaltung" → Filter by code → View details

## Input Parameters

The actor requires two input parameters:

```json
{
  "code": "string",           // Required: The code to search for
  "codeType": "string"        // Required: One of "HR_COCKPIT", "HR_COCKPIT_SOLL", "PROFILING_VALUES", "PROFILING_VALUES_SOLL"
}
```

### Example Input
```json
{
  "code": "ABC123",
  "codeType": "HR_COCKPIT"
}
```

## Environment Variables

### Required for HR Cockpit (HR_COCKPIT, HR_COCKPIT_SOLL)
- `HR_COCKPIT_USER`: Username for HR Cockpit system
- `HR_COCKPIT_PASSWORD`: Password for HR Cockpit system

### Required for Profiling Values (PROFILING_VALUES, PROFILING_VALUES_SOLL)
- `PROFILING_VALUES_USER`: Username for Profiling Values system
- `PROFILING_VALUES_PASSWORD`: Password for Profiling Values system

### Required for Web UI Integration
- `FRONT_URL`: URL of your web UI (e.g., "https://your-app.vercel.app")
- `ACTOR_SECRET`: Shared secret for authenticating with the web UI

## Output

The actor outputs data to the Apify dataset with the following structure:

### For HR Cockpit Types (HR_COCKPIT, HR_COCKPIT_SOLL)
```json
{
  "code": "ABC123",
  "codeType": "HR_COCKPIT",
  "reports": [
    {
      "name": "Standard-Report",
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    },
    {
      "name": "Assessment-Report", 
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    },
    {
      "name": "PPT-Report",
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    },
    {
      "name": "Evaluate-daten",
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    }
  ]
}
```

### For Profiling Values (PROFILING_VALUES)
```json
{
  "code": "ABC123",
  "codeType": "PROFILING_VALUES",
  "reports": [
    {
      "name": "PDF-Report",
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    },
    {
      "name": "JSON-Report",
      "url": "https://api.apify.com/v2/key-value-stores/.../records/..."
    }
  ]
}
```

### For Profiling Values Soll (PROFILING_VALUES_SOLL)
```json
{
  "code": "ABC123",
  "codeType": "PROFILING_VALUES_SOLL",
  "metadata": {
    "code": "ABC123",
    "key": "...",
    "created": "...",
    "created_by": "...",
    "pat_type": "...",
    "company": "...",
    "industry": "...",
    "role": "...",
    "modified": "..."
  },
  "data": [
    {
      "definition": "...",
      "koennen": {
        "min": 1,
        "max": 5,
        "mitte": 3
      },
      "wollen": {
        "min": 1,
        "max": 5,
        "mitte": 3
      }
    }
  ]
}
```

## Web UI Integration

This actor is designed to integrate with the scraper web UI project. It sends progress updates to the web UI via HTTP callbacks:

### Progress Updates
The actor sends progress updates to `${FRONT_URL}/api/actor-update` with:
- Current step progress
- Total steps
- Status updates (STARTING, RUNNING, COMPLETED, FAILED)
- Error information if failures occur

### Authentication
Progress updates are authenticated using the `ACTOR_SECRET` environment variable.

## Architecture

```
┌─────────────────────────┐
│ Unified Scraper Actor   │
│                         │
│ ┌─────────────────────┐ │
│ │ Main Entry Point    │ │
│ │ (main.js)           │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Router              │ │
│ │ (routes.js)         │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Handlers            │ │
│ │ ├─ HR Cockpit       │ │
│ │ ├─ Profiling Values │ │
│ │ └─ Profiling Soll   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Utilities           │ │
│ │ ├─ Progress Updates │ │
│ │ ├─ Logging          │ │
│ │ └─ Configuration    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Development

### Project Structure
```
Unified APIFY Actor/
├── src/
│   ├── main.js                    # Main entry point
│   ├── routes.js                  # Request router
│   ├── config.js                  # Configuration management
│   ├── handlers/                  # Scraping handlers
│   │   ├── hrCockpitHandler.js    # HR Cockpit handler
│   │   ├── profilingValuesHandler.js # Profiling Values handler
│   │   └── profilingValuesSollHandler.js # Profiling Values Soll handler
│   └── utils/                     # Utility functions
│       ├── progressUtils.js       # Progress update utilities
│       └── loggingUtils.js        # Enhanced logging utilities
├── package.json                   # Dependencies and scripts
└── README.md                     # This file
```

### Running Locally
```bash
npm install
npm start
```

### Testing
```bash
# Test with different code types
npm start -- --input '{"code":"TEST123","codeType":"HR_COCKPIT"}'
npm start -- --input '{"code":"TEST123","codeType":"PROFILING_VALUES"}'
```

## Error Handling

The actor includes comprehensive error handling:

- **Input Validation**: Validates required parameters and code types
- **Credential Validation**: Checks for required environment variables
- **Retry Mechanisms**: Automatic retries for file downloads
- **Graceful Degradation**: Continues processing even if individual files fail
- **Detailed Logging**: Structured logging with context and stack traces

## Performance

- **Headless Mode**: Runs in headless mode for better performance
- **Timeout Management**: Configurable timeouts for different operations
- **Rate Limiting**: Built-in delays to prevent overwhelming target servers
- **Resource Management**: Efficient memory and CPU usage

## Security

- **Credential Management**: Secure handling of login credentials
- **Authentication**: Secure communication with web UI
- **Input Sanitization**: Validates and sanitizes all input parameters
- **Error Information**: Limited error information exposure

## Deployment

### To Apify
1. Push this repository to GitHub
2. Connect your GitHub repository to Apify
3. Set up the required environment variables in Apify
4. Deploy the actor

### Environment Variables in Apify
Make sure to set all required environment variables in your Apify actor configuration:
- `HR_COCKPIT_USER` and `HR_COCKPIT_PASSWORD`
- `PROFILING_VALUES_USER` and `PROFILING_VALUES_PASSWORD`
- `FRONT_URL` and `ACTOR_SECRET`

## Support

For issues or questions:
1. Check the logs for detailed error information
2. Verify environment variables are correctly set
3. Ensure the target systems are accessible
4. Check the web UI integration configuration

## License

This project is licensed under the ISC License.
