# Architecture Reference: LH Property & Infrastructure Maintenance

## 1. Component Boundaries & Responsibilities

| Component | Technology | Primary Location | Key Function |
| :--- | :--- | :--- | :--- |
| **Web Client Dashboard** | React 19, Vite, Tailwind | `lh-taskflow/src/` | Interactive management UI, Daily Tasks, Calendar, Kanban Billing, Team Status. |
| **Serverless Webhook** | Node.js ESM (Vercel) | `lh-taskflow/api/webhook.js` | Receives LINE OA webhook requests and proxies them to MasterOrchestrator. |
| **Multi-Agent Orchestrator** | Node.js ESM | `lh-taskflow/api/_agents/orchestrator.js` | Prioritized routing, text cleaning, connection pooling. |
| **TaskAgent** | Node.js ESM | `lh-taskflow/api/_agents/taskAgent.js` | Daily task status, 3-day WO countdown, pending job inspection. |
| **BudgetAgent** | Node.js ESM | `lh-taskflow/api/_agents/budgetAgent.js` | 9-category accounting breakdown, YTD/YTG calculations, overrun alerts. |
| **FloodAgent** | Node.js ESM | `lh-taskflow/api/_agents/floodAgent.js` | Hydrology telemetry, photo batching, Gemini Vision inference, PDF compilation. |
| **ManpowerAgent** | Node.js ESM | `lh-taskflow/api/_agents/manpowerAgent.js` | Passive contractor headcount surveillance with zero LINE quota cost. |
| **5 Scraper Bots Guild** | Node.js CJS, Puppeteer | `lh-scraper/bots/` | Headless scraping of intranet portals (LHAppServ, LHIAS) and workbook parsing. |
| **ChangTuen Service** | Google Apps Script | `gas-project/` | Spreadsheet persistence, anti-spam email alerts, 17:30 overdue cron jobs. |
| **IoT Pump Monitoring** | Vanilla JS / Chart.js | `lh-iot-pump-monitoring/` | Stormwater, sewage lift, and WWTP pump status and electrical telemetry. |

---

## 2. Event Sequence & Execution Flow

### 2.1 LINE Webhook Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Group
    participant LineGateway as LINE Platform
    participant Webhook as /api/webhook.js
    participant Orch as MasterOrchestrator
    participant DB as Firestore (ensureAuth)
    participant Agent as Specialized Agent (Task/Budget/Flood/Manpower)
    participant LineService as lineService.js

    User->>LineGateway: Sends text message or photo batch
    LineGateway->>Webhook: POST /api/webhook.js (Events payload)
    Webhook->>Orch: route(events, { host, proto })
    Orch->>DB: ensureAuth() [Connection Pooling]
    
    alt Event is Manpower Surveillance
        Orch->>Agent: recordSilentLog(event) [Zero LINE Quota]
        Agent->>DB: Save to artifacts/default-app-id/.../manpower_logs
    else Event is Text Command
        Orch->>Agent: Check canHandle() & route by priority
        Agent->>DB: Fetch relevant state / records
        Agent->>LineService: replyToLine(replyToken, formattedResponse)
        LineService->>LineGateway: POST https://api.line.me/v2/bot/message/reply
        LineGateway->>User: Displays response in chat
    else Event is Image Batch
        Orch->>Agent: FloodAgent.handleImageBatch()
        Agent->>DB: Ingest and store image metadata
    end
```

### 2.2 Data Sync with LH Intranet Systems

```mermaid
sequenceDiagram
    autonumber
    participant TaskScheduler as Windows Task Scheduler / CLI
    participant BotHub as bot_hub.js / run_bots.js
    participant Scout as bot_scout.js (Puppeteer)
    participant LHAppServ as LHAppServ Intranet Portal
    participant Utility as bot_utility.js (LHIAS / Excel)
    participant Wizard as bot_budget.js (Excel Engine)
    participant Firestore as Google Cloud Firestore

    TaskScheduler->>BotHub: node run_bots.js all
    BotHub->>Scout: Execute Scout Bot
    Scout->>LHAppServ: Headless Login & Scrape Wait Jobs
    Scout->>Firestore: Upsert to lh_scraper/database & history
    BotHub->>Utility: Execute Utility Bot
    Utility->>Firestore: Check 160 meters & flag spikes
    BotHub->>Wizard: Execute Budget Bot
    Wizard->>Firestore: Upsert 9-project 9-category forecast to budget_forecast
    BotHub-->>TaskScheduler: Execution summary completed
```
