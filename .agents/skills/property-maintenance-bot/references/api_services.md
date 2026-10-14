# API & Services Reference: LH TaskFlow Backend

This document details external APIs, internal serverless endpoints, Firestore schemas, and environment configuration.

## 1. Environment Variables Configuration

| Variable | Required | Description | Example / Target Service |
| :--- | :--- | :--- | :--- |
| `LINE_TOKEN` | Yes | Channel Access Token for LINE Messaging API | `Bearer ...` (LINE Developers Console) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API Key for multimodal flood survey analysis | AI Studio / Vertex AI |
| `ADMIN_PIN` | Optional | PIN used to authorize As-Built elevation modifications | Default: `lh2026` |
| `VITE_FIREBASE_API_KEY` | Yes | Client & serverless Firebase API key | Project: `taskflow-plus-3fce7` |

---

## 2. Serverless Function Endpoints (`/api/*`)

### `POST /api/webhook.js`
- **Purpose**: Ingestion endpoint for LINE Bot Webhooks.
- **Headers**: Accepts standard LINE signature header.
- **Behavior**: Parses `events[]`, establishes anonymous Firebase auth, and delegates asynchronously to `MasterOrchestrator.route()`.

### `GET /api/radar.js`
- **Purpose**: Doppler weather radar proxy bypassing anti-hotlinking.
- **Parameters**: `station` (`bma`, `tmd`, `svp`, `wide`, `hii`).
- **Headers Added**: `Referer: https://weather.bangkok.go.th/` and `User-Agent`.
- **Caching**: `Cache-Control: public, max-age=180, s-maxage=180`.

### `GET / POST /api/flood-report.js`
- **Parameters**:
  - `id`: Report ID to view interactive report or export PDF.
  - `mode=asbuilt`: Launches As-Built Elevation Benchmark Manager.
  - `mode=map`: Renders interactive Leaflet flood situation map.
  - `mode=radar`: Proxies radar imagery.

---

## 3. External API Integrations

### ThaiWater API (Hydro-Informatics Institute & Royal Irrigation Dept)
- **Endpoints**:
  - `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`
  - `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/watergate_load`
- **Headers**: Custom user agent `LH-FloodMonitoring/2.0`.
- **Caching**: In-memory cache with 10-minute TTL (`CACHE_TTL_MS = 600000`).
- **Features**: Haversine distance nearest-neighbor matching, watergate status, situation code (1: Normal, 2: Watch, 3: Warning, 4: Critical Bank, 5: Overflow), and freshness evaluation (<2.5h Live, 2.5-6h Delayed, >6h Stale).

### Weather API (Open-Meteo & TMD)
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Parameters**: `latitude`, `longitude`, `hourly=precipitation_probability`, `daily=precipitation_sum,precipitation_probability_max`.

### Gemini AI Multimodal Service
- **Model**: Gemini 2.5 Flash / Flash Lite.
- **Functions**:
  - `analyzeFloodReportWithGemini()`: Synthesizes site notes and weather data.
  - `analyzeWaterLevelFromPhotos()`: Processes image buffers to assess curb submersion, vehicle tire water depth, and pump discharge activity.

---

## 4. Firestore Document Hierarchy

All application collections reside under the root path `artifacts/default-app-id/public/data/`:

| Collection / Path | Description | Key Fields |
| :--- | :--- | :--- |
| `Tasks` | Work orders and maintenance tickets | `taskId`, `project`, `status`, `startDate`, `endDate`, `completedDate`, `category`, `details`. |
| `lh_scraper/database` | Scraped active portal tickets (Wait status) | `jobs[]` or dictionary keyed by `job_id`: `project`, `house_no`, `customer_name`, `phone`, `reported_timestamp`. |
| `lh_scraper/history` | Historical scraped tickets (30-day retention) | `archived_jobs[]`. |
| `lh_scraper/budget_forecast` | Scraped budget & forecast data | `projects`: map of project code to 9-category breakdown, `totalYtdActual`, `totalYtgForecast`, `totalFyLanding`, `totalBudget`. |
| `flood_drafts/{userId}` | In-progress flood survey draft | `projectCode`, `projectName`, `notes`, `createdAt`, subcollection `photos/` (base64 or storage URLs). |
| `flood_reports/{reportId}` | Final compiled flood reports | `reportId`, `project`, `waterLevel`, `pumpsRunning`, `drainageCondition`, `aiSynthesis`, `photos[]`. |
| `flood_settings/as_built_elevations` | Project engineering benchmarks | Dictionary keyed by project code: `asBuiltElevationDiff`, `entranceCrestDiff`, `hasFloodwall`, `asBuiltBenchmarkMSL`. |
| `manpower_logs/{date}/{contractor}` | Contractor daily headcount logs | `project`, `contractor`, `headcountText`, `actual`, `missing`, `rawLine`, `timestamp`. |
