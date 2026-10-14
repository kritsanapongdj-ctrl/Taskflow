---
name: property-maintenance-bot
description: >-
  Provides end-to-end guidance for operating, extending, and debugging the Land and Houses (LH) Property & Infrastructure Maintenance Multi-Agent System (LH TaskFlow). Covers LINE Bot webhook routing via MasterOrchestrator, daily task tracking and 3-day SLA work order countdowns (TaskAgent), 9-category fiscal budget forecasting (BudgetAgent), real-time flood monitoring with ThaiWater telemetry and Gemini Vision (FloodAgent), silent contractor manpower surveillance (ManpowerAgent), and autonomous scraper bot coordination. Use when developing, troubleshooting, or querying maintenance workflows, SLA alerts, repair tickets, expense reports, water level telemetry, or LINE Bot commands.
---

# LH Property & Infrastructure Maintenance Multi-Agent System

This skill provides operational workflows, command routing, and architectural runbooks for the Land and Houses (LH) Property & Infrastructure Maintenance system (`lh-taskflow` & `lh-scraper`).

## 1. Quick Navigation & Multi-Agent Overview

The platform uses a centralized `MasterOrchestrator` (`api/_agents/orchestrator.js`) that handles incoming LINE Webhook events and delegates tasks to specialized domain agents:

```
LINE Webhook (/api/webhook.js)
  └── MasterOrchestrator (/api/_agents/orchestrator.js)
        ├── [Priority 1] FloodAgent      -> Flood reports, radar, ThaiWater telemetry, Gemini photo analysis
        ├── [Priority 2] BudgetAgent     -> 9-category budget analysis, YTD/YTG variance & FY landing
        ├── [Priority 3] TaskAgent       -> Daily task overview, 3-day Work Order countdown, repair tickets
        └── [Priority 4] ManpowerAgent   -> Silent contractor headcount surveillance (Zero LINE Quota)
```

For full architecture details and sequence flows, consult [Architecture Reference](./references/architecture.md).

---

## 2. LINE Bot Command Catalog

Commands accept prefix `!`, `/`, or direct text. For complete parameter documentation and examples, see [LINE Commands Reference](./references/line_commands.md).

### Task & Maintenance Commands (`TaskAgent`)
- `!สรุปงาน`, `!สรุปงานA`, `!สรุปงานB`, `!สรุปงานA2`: Displays tasks scheduled for today, current execution progress, and SLA status.
- `!รอใบงาน`, `!รอใบงานA`, `!รอใบงานB`, `!รอใบงานA2`: Lists finished tasks awaiting official Work Orders (WO) grouped by month with a strict **3-day SLA countdown** (`getWorkOrderCountdownText`).
- `!เช็คงาน`, `!เช็คงานA`, `!เช็คงานB`, `!เช็คงานA2`: Checks pending tickets scraped from the LHAppServ portal; highlights jobs overdue > 48 hours or > 5 days.
- `!คำสั่ง` / `HELP` / `เมนู`: Returns the interactive help menu.

### Budget & Financial Forecast Commands (`BudgetAgent`)
- `!งบ`: High-level portfolio budget summary comparing YTD Actual vs YTG Forecast vs FY Landing.
- `!งบA`, `!งบB`, `!งบA2`: Group-level budget summaries for projects under specific management clusters.
- `!งบ [รหัส]`: In-depth breakdown for a specific project code (e.g. `!งบ 410`, `!งบ LA-025`) across 9 accounting categories and Payment Vouchers (PV).
- `!เกินงบ`: Lists projects and expense categories exceeding budgeted limits.

### Flood & Hydrology Commands (`FloodAgent`)
- `!น้ำท่วม [รหัส] [รายละเอียด]`: Initializes an active flood report draft for a project (e.g. `!น้ำท่วม 410 ถนนเมนแห้งสนิท สูบระบายปกติ`).
- Send 5–10 site survey images: Automatically ingested by Gemini 2.5 Vision to assess road water levels, pump running statuses, and drainage flow.
- `เสร็จ`: Finalizes report, aggregates real-time weather & ThaiWater telemetry, and sends an interactive Flex Message with PDF download link.
- `ยกเลิก`: Clears the current draft session.

### Manpower Surveillance (`ManpowerAgent`)
- **Group chats (Silent)**: Automatically detects contractor daily attendance logs matching regular expressions (e.g. `มา 5 คน ขาด 1`) and records to Firestore without sending messages (Zero Quota).
- **Direct message (1-on-1)**: `!คนงาน` or `!แรงงาน` queries recent attendance summaries per contractor.

---

## 3. Standard Operating Procedures (SOP)

### SOP-1: Running Background Autonomous Bots
When fresh data is required from LH intranet systems (LHAppServ, LHIAS, Budget Sheets):
1. Navigate to the scraper directory: `C:\Users\krits\lh-scraper`.
2. Check current status: `node bots/run_bots.js status`.
3. Execute required scrapers:
   - All bots: `node bots/run_bots.js all`
   - Repair tickets only: `node bots/run_bots.js scout`
   - Water & power meters: `node bots/run_bots.js utility`
   - Budget calculation: `node bots/run_bots.js budget`
   - SLA monitoring: `node bots/run_bots.js watcher`
   - KPI evaluation: `node bots/run_bots.js evaluator`
4. Refer to the dedicated skill: [LH Autonomous Guild](../lh-autonomous-guild/SKILL.md).

### SOP-2: Updating As-Built Elevation Benchmarks
When site engineering measurements change:
1. Open As-Built Manager via URL: `/api/flood-report?mode=asbuilt`.
2. Enter the authorized Admin PIN (configured via `ADMIN_PIN`).
3. Modify parameters:
   - `asBuiltElevationDiff`: Internal road elevation relative to external public road.
   - `entranceCrestDiff`: Security booth crest barrier height.
   - `hasFloodwall` & `floodwallHeightDiff`: Perimeter flood protection wall height.
   - `asBuiltBenchmarkMSL`: Geodetic Mean Sea Level benchmark.
4. Save changes to sync directly with Firestore `flood_settings/as_built_elevations`.
5. For deep hydrology details, consult [LH Flood Telemetry](../lh-flood-telemetry/SKILL.md).

### SOP-3: Troubleshooting LINE Webhook & API Errors
1. Verify required environment variables in Vercel:
   - `LINE_TOKEN`: Channel Access Token.
   - `GEMINI_API_KEY`: Google AI Studio API key.
   - `ADMIN_PIN`: Authorization PIN for administrative mutations.
2. Check endpoint health via GET request: `/api/radar?station=bma` (Doppler radar proxy).
3. Test LINE reply token validity: Note that LINE reply tokens expire after 60 seconds; long operations must use `pushToLine` fallback.
4. For service signatures and schema mappings, review [API Services Reference](./references/api_services.md).

---

## 4. Related Skills in This Ecosystem

- [LH Autonomous Guild](../lh-autonomous-guild/SKILL.md): 5 autonomous bots scraping intranet portals.
- [LH Flood Telemetry](../lh-flood-telemetry/SKILL.md): Hydrological sensor networks, Doppler radar proxy, and Gemini vision.
- [ChangTuen GAS Service](../changtuen-gas-service/SKILL.md): Google Apps Script email alerts and SLA triggers.
