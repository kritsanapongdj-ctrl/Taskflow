# Decision Room Penalty Refactor & Live Competency Auto-Deduct Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Decision Room (ห้องตัดสิน) penalty system: increase penalty weights (1 task = 1–2 pts, expand caps to 4–6 pts), clarify RACI responsibility labels (from "ตัดคะแนน 100%" to "รับผิดชอบเต็ม 100%"), and connect live audit penalties to the 6 Outer Competencies (WHAT), cascading into average scores, McKinsey 9-Box grid, and visual deduction badges.

**Tech Stack:** React 19, Tailwind CSS, Lucide Icons, Vite, JS ES Modules.

---

## Global Constraints
- Preserve RACI rules and Go-Live Cutoff (2026-09-01).
- Officer role must remain 100% exempt from field operational penalties.
- Net competency scores must stay within the bounded range of [1.0, 10.0].
- Zero regression on existing telemetry, supervisor forensic logging, and PDF printing.

---

## Tasks

### Task 1: Refactor Penalty Weights in `src/utils/archetypeEngine.js`
- [x] **Step 1: Write test script `scripts/test_penalty_engine.cjs`**
  Verify that 1 late completion deducts 1 full point (not fractional 0.5), 2 late completions deduct 2 points, and cap extends to 5 points.
- [x] **Step 2: Update penalty formulas in `aggregateStaffTaskTelemetry`**
  - Late completed: 1 pt per task (cap 5).
  - Late WO (Admin): 1 pt per task (cap 5).
  - Late WO (Foreman): 1 pt per task (cap 4).
  - Retroactive start / end: 1 pt per task (cap 4).
  - Stale tasks: 1 pt per task (Foreman cap 5, Admin cap 3).
  - Penalty spare parts: 2 pts per task (cap 6).
  - Duplicate WO / Billing cutoff: 1 pt per task (cap 4–5).
- [x] **Step 3: Run test script to verify GREEN**
  `node scripts/test_penalty_engine.cjs`

---

### Task 2: Live Auto-Deduct in `analyzeOuterLayer`
- [x] **Step 1: Update `analyzeOuterLayer` to receive penalties**
  - Group penalties by axis (`sla`, `tech`, `crisis`, `resource`, `innovation`, `cx`).
  - Calculate `penaltiesByAxis`, `rawValues`, and `actualValues = Math.max(1, rawValues - penalty)`.
  - Recompute `avgOuter`, `gap`, `whatLevel`, and 9-Box grid positioning using `actualValues`.
  - Add operational risk alert when `totalPenalties > 0`.
- [x] **Step 2: Add test cases to `scripts/test_penalty_engine.cjs`**
  Verify that an assessed SLA score of 8.0 drops to 7.0 when a 1-point penalty is present, and average WHAT updates accordingly.

---

### Task 3: Clarify UI in `DiscrepancyAuditModal.jsx`
- [x] **Step 1: Update button labels and subtexts in `DiscrepancyAuditModal.jsx`**
  - Change `ตัดคะแนนโฟร์แมน 100%` -> `รับผิดชอบเต็ม 100% (หักคะแนนโฟร์แมน)`
  - Change `ตัดคะแนนแอดมิน 100%` -> `รับผิดชอบเต็ม 100% (หักคะแนนแอดมิน)`
  - Change `แบ่งสัดส่วนทั้งคู่` -> `แบ่งสัดส่วนรับผิดชอบคู่หู`
  - Change `เหตุสุดวิสัย ไม่หักคะแนน` -> `เหตุสุดวิสัย (ไม่หักคะแนน)`
- [x] **Step 2: Update audit badge and timeline text**
  Reflect the clarified RACI attribution phrasing in the timeline note.

---

### Task 4: Connect Live Penalties to `TeamStatusTab.jsx` & Reports
- [x] **Step 1: Pass `{ telemetry }` to all `analyzeOuterLayer` calls in `TeamStatusTab.jsx`**
  - Lines 421, 920, 1238, 2257, 3049.
- [x] **Step 2: Update 6 Competency Micro-Cards**
  - Display `-N` rose badge if `o.penalty > 0`.
  - Highlight card border in subtle rose when penalized.
- [x] **Step 3: Pass telemetry / tasks to `StaffAssessmentReportModal.jsx`**
  Ensure official assessment printout displays net scores and audit notices.

---

### Task 5: Verification & Build
- [x] **Step 1: Run production build verification**
  `cmd /c "npm run build"`
- [x] **Step 2: Run all unit tests**
  `node scripts/test_penalty_engine.cjs` & `node scripts/test_sla_detector.cjs`
- [x] **Step 3: Commit and push changes**
  `git push origin main`
