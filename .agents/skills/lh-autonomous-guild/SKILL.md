---
name: lh-autonomous-guild
description: >-
  Coordinates and executes the 5 autonomous background bots of the Land and Houses (LH) Scraper Guild. Covers Scout Bot (scraping repair tickets from the LHAppServ intranet portal via headless Puppeteer), Utility Bot (analyzing 160 water and electricity meters across 9 projects for consumption spikes), Budget Bot / The Wizard (calculating 9-category budget forecasts and fiscal variance), Watcher Bot (monitoring 48-hour and 5-day SLA breaches), and Evaluator Bot (scoring technician performance and project health using a 10-tier RPG framework). Use when scheduling, executing, debugging, or verifying intranet scrapers, bot health statuses, meter audits, or automated SLA inspections.
---

# LH Autonomous Scraper Guild (5 Bots)

This skill governs the execution, maintenance, and diagnostics of the 5 autonomous background bots located in `lh-scraper/bots`.

## 1. Guild Roster & Bot Directory

| Bot ID | Role & Title | Primary Script | Target Source & Output |
| :--- | :--- | :--- | :--- |
| `scout` | **Scout Bot** (The Scout) | `bots/bot_scout.js` / `run_bot.js` | Headless Puppeteer login to LHAppServ intranet; extracts tickets in `Wait` status to Firestore (`lh_scraper/database`). |
| `utility` | **Utility Bot** (The Sentinel) | `bots/bot_utility.js` | Audits 160 meters across 9 projects; flags spikes exceeding 140% of 8-month rolling average. |
| `budget` | **Budget Bot** (The Wizard) | `bots/bot_budget.js` | Evaluates B69 vs A69 vs B70 Excel workbooks; publishes 9-category forecast to Firestore (`budget_forecast`). |
| `watcher` | **Watcher Bot** (The Watcher) | `bots/bot_watcher.js` | Scans Firestore active tickets; alerts on jobs stalled > 48h or overdue > 5 days. |
| `evaluator` | **Evaluator Bot** (The Evaluator)| `bots/bot_evaluator.js` | Calculates technician performance and project grades (A through D) using 10-tier RPG framework with monthly cutoff dates. |

---

## 2. Command Line Interface & Execution Runbook

All bot operations are orchestrated through `run_bots.js` in `lh-scraper/bots`:

```powershell
# Navigate to scraper directory
cd C:\Users\krits\lh-scraper

# Check real-time statuses of all 5 bots
node bots/run_bots.js status

# Run all 5 bots sequentially
node bots/run_bots.js all

# Run specific bots individually
node bots/run_bots.js scout
node bots/run_bots.js utility
node bots/run_bots.js budget
node bots/run_bots.js watcher
node bots/run_bots.js evaluator
```

### Dry-Run Mode
To test portal scraping without writing to Firestore or notifying LINE:
```powershell
$env:DRY_RUN="1"; node run_bot.js
```

---

## 3. Concurrency Protection & Stale Lock Management

To prevent duplicate runs from overlapping Task Scheduler events:
- A lock file `.run_bot.lock` is created upon execution.
- If the lock file is older than 25 minutes (`LOCK_STALE_MS = 25 * 60 * 1000`), the runner considers the previous process dead, automatically unlinks the file, and proceeds.
- Manual lock cleanup if stuck:
```powershell
Remove-Item C:\Users\krits\lh-scraper\.run_bot.lock -Force -ErrorAction SilentlyContinue
```

---

## 4. Verification & Health Audit

After running the bots, verify successful execution:
1. Check status summary: `node bots/run_bots.js status`.
2. Inspect log outputs in `lh-scraper/bots/status/`:
   - `evaluator.json`
   - `utility.json`
   - `watcher.json`
   - `wizard.json`
3. Verify Firestore update timestamp on document `artifacts/default-app-id/public/data/lh_scraper/bot_status`.
