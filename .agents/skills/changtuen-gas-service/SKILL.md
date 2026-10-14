---
name: changtuen-gas-service
description: >-
  Operates and manages the ChangTuen (ช่างเตือน) Google Apps Script (GAS) maintenance engine and spreadsheet backend. Covers work order lifecycle states (Pending, On Progress, Finish, Postpone, Cancelled), anti-spam email alert templating, technician appointment delay warnings, and automated time-driven cron triggers (processSlaAlerts) detecting missed start times and 17:30 daily finish cut-offs. Use when configuring Google Sheets integrations, deploying GAS web apps, auditing email alert triggers, updating SLA threshold limits, or debugging scheduled maintenance cron executions.
---

# ChangTuen (ช่างเตือน) Google Apps Script Service

This skill covers the configuration, spreadsheet integration, email alert engine, and scheduled cron triggers of the ChangTuen maintenance engine (`gas-project`).

## 1. Core Service Architecture

- **Backend Platform**: Google Apps Script (GAS) Web App + Google Sheets.
- **Project Location**: `C:\Users\krits\.gemini\antigravity\scratch\gas-project`.
- **Database Sheets**:
  - `Tasks`: Maintenance tickets, appointment times, completion timestamps, and SLA breach indicators.
  - `Settings`: Project list, job categories, SLA duration limits (days), and admin notification recipient emails.

---

## 2. Work Order Lifecycle & Trigger Logic

```
[Pending]
   │
   ├─► (Appointment Time passed without Start) ──► Cron: Email "เลยเวลานัดหมายเข้างาน"
   │
   ▼
[On Progress] (Technician presses Start)
   │  └─► (If now > appointment) ──────────────► Email "ช่างเข้างานล่าช้า"
   │
   ├─► (Now > 17:30 of Expected Date) ──────────► Cron: Email "งานเลยกำหนดจบ Overdue"
   │
   ▼
[Finish] (Technician completes work)
   └─► (If completed after 17:30) ──────────────► Email "จบงานล่าช้า / Overdue"
```

---

## 3. Anti-Spam Email Engine (`sendSystemEmail`)

- **Format**: Responsive HTML template with LH corporate header and clear warning callouts.
- **Sender Identity**: `ช่างเตือน (System Alert)` with `replyTo: "no-reply@lh.co.th"`.
- **Recipients**: Dynamically loaded from Column D of the `Settings` sheet.
- **Test Command**: Run `testEmailNotification()` in GAS console to verify delivery.

---

## 4. Automated SLA Cron Job (`processSlaAlerts`)

The time-driven trigger runs periodically to scan for SLA violations:
1. **Late Start Inspection**: Checks if task is `Pending`, appointment time has passed, and column 19 is not `"Yes"`. If breached, fires email and marks column 19 to prevent repeat notifications.
2. **Overdue Finish Inspection**: Checks if task is `On Progress`, current time exceeds 17:30 on the expected finish date, and column 20 is not `"Yes"`. If breached, fires overdue email and marks column 20.

---

## 5. Security & Administrative Mutations

Administrative functions (`saveSettings`, `clearAllData`) require PIN authentication:
- PIN verification: `"SV2569"` required before altering system settings or truncating rows.
