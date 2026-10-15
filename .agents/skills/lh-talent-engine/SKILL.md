---
name: lh-talent-engine
description: >-
  Governs the Land & Houses (LH) Property & Infrastructure Maintenance Talent Assessment System (Talent Engine 2.0). Covers the dual-layer competency framework (HOW behavioral potential vs WHAT operational performance), the 9-Box Talent Grid, automated RACI SLA penalty deduction rules for Foreman and Admin roles, supervisor role-based access control with forensic GPS logging, and AI talent diagnostic synthesis combining BARS rubrics with real-time TaskFlow work order telemetry. Use when auditing competency scores, configuring evaluation rules, updating BARS behavioral anchors, troubleshooting supervisor auth/GPS handshakes, or refining AI coaching diagnostics.
---

# LH Talent Assessment Engine 2.0 (Competency & Governance Framework)

This skill documents the end-to-end architecture, behavioral assessment science, operational rules engine, and role-based access controls for the Land and Houses (LH) Property & Infrastructure Maintenance Talent Assessment System.

---

## 1. Theoretical Grounding & Global Benchmarks

The system synthesizes four globally recognized organizational development and human resource frameworks:

```
                  [ 1. McClelland's Iceberg Competency Model ]
                             ▲
      Surface (Visible)     │  WHAT (The Outer Layer): Actual Work Orders, SLAs,
                             │       Billing, Technical Standards, Crisis Handling
    ═════════════════════════╪════════════════════════════════════════════════════
      Subsurface (Hidden)   │  HOW (The Inner Core): Behavioral Attributes &
                             │      Potential (STR, AGI, DEX, INT, CON, SEN)
                             ▼
```

1. **McClelland's Iceberg Model**:
   - **HOW (Inner Core - Potential)**: Core behavioral tendencies, cognitive agility, resilience, and personal work styles that drive behavior.
   - **WHAT (Outer Layer - Performance)**: Observable outputs, work order delivery, SLA compliance, customer touchpoints, and fiscal discipline.
2. **Flanagan's Critical Incident Technique (CIT) & BARS (1-5)**:
   - Evaluates performance using concrete, behaviorally anchored critical incidents (e.g. retroactive postponement vs proactive notice, parts hoarding vs authentic supplier lead times) rather than subjective impressions.
3. **SHRM Functional Competency Modeling for Infrastructure & Facility Management**:
   - Explicit separation between Technical Execution (Foreman) and Administrative & Systems Compliance (Admin).
4. **McKinsey / GE 9-Box Talent Grid**:
   - Maps Potential (HOW) on the Y-axis against Performance (WHAT) on the X-axis to drive talent decisions: Future Leaders, Core Performers, Misaligned/Under-leveraged, and Performance Improvement Plans (PIP).

---

## 2. Role Classification & Scope Binding

Evaluation against TaskFlow operational metrics applies **exclusively** to operational service roles:

| Role / Class | Status in TaskFlow Evaluation | Evaluation Scope |
| :--- | :---: | :--- |
| **Foreman (วิศวกร/โฟร์แมนหน้างาน)** | **EVALUATED** | Field execution speed, job completion quality, proactive scheduling, BOQ delivery, parts integrity |
| **Admin (ธุรการ/ผู้ประสานงานโครงการ)** | **EVALUATED** | Work order creation speed (3-day SLA), fiscal billing cycle discipline (15th cut-off), system accuracy |
| **Officer (จนท./ผจก. โครงการ LH)** | **EXEMPT** | Project owner, supervisor, and evaluator; strictly excluded from TaskFlow task metric penalties |

### Project Binding (`Staff-to-Project Mapping`)
- Staff are linked to projects via `Settings/main` (`sets.emails` string format: `email|proj1,proj2|name`).
- All metric aggregations (total jobs, overdue rate, late WOs, billing clearance) are filtered **strictly** to the assigned projects.

---

## 3. Operational RACI & SLA Disciplinary Rules Engine

The system enforces 8 operational rules to evaluate the **WHAT (Performance)** axis:

```
[ Trigger Event in TaskFlow ]
  ├── 1. Late Finish (จบงานช้า)                ──► 100% Foreman (SLA Speed)
  ├── 2. Retroactive Start Postpone (เลื่อนเริ่ม) ──► 100% Foreman (Proactive Planning)
  ├── 3. Retroactive End Postpone (เลื่อนจบ)    ──► 100% Foreman (Time Discipline)
  ├── 4. Late Work Order > 3 Days               ──► Reason-Based:
  │                                                  • "รอ BOQ/ราคา" ──► Foreman
  │                                                  • Other Reasons ──► Supervisor Decision
  ├── 5. Abandoned / Ghost Tasks > 7 Days       ──► Shared: 70% Foreman / 30% Admin
  ├── 6. Waiting for Parts Ceiling (45 Days)    ──► Max 45 days allowable lead time
  │      └─► Gaming/Dodging Caught              ──► Supervisor Flag: "ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)"
  ├── 7. Duplicate Work Order Cancellation       ──► 100% Admin (System Integrity)
  └── 8. Monthly Billing Cycle (15th Cut-off)   ──► Admin:
         • Finished <= 15th (or roll-over)      ──► Must be billed within current month
         • Finished > 15th                      ──► Grace Period: Roll-over to next month
```

### The 45-Day Parts Wait Ceiling & Disciplinary Lock
- Commercial estate equipment (booster pumps, wastewater aerators, specialized valves) often require 3–5 weeks lead time.
- The status `ติดปัญหา/รออะไหล่` allows up to **45 days** of SLA pause.
- If a supervisor discovers parts have arrived on site but the team avoids installation, the supervisor invokes:
  - Status: **`ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)`** (`PENALTY_REVOKE_SLA`).
  - System permanently attaches an immutable audit flag: `{ penalizedBy, timestamp, note }`.
  - When the job is later finished, this penalty flag **cannot be erased** and automatically deducts points from the Foreman's `SLA` and `CRISIS/DISCIPLINE` WHAT scores.

---

## 4. Role-Based Access Control (RBAC) & Forensic GPS Handshake

To prevent unauthorized manipulation or shared-PIN abuse, disciplinary controls are guarded by Supervisor Mode:

### Supervisor Mode Activation Flow
1. **Toggle**: Top-right corner toggle `[ 👤 โหมดผู้ใช้งาน ] ⇄ [ 🛡️ โหมดผู้ดูแล ]`.
2. **Authentication Modal**:
   - Input: Supervisor PIN (`1312` / `131236` / `SV2569`).
   - Selection: Supervisor Name (dropdown populated from authorized management emails in `Settings/main`).
   - Browser Prompt: `navigator.geolocation.getCurrentPosition()`.
3. **Forensic Handshake Requirements**:
   - GPS permission **MUST** be granted. Denying GPS rejects activation.
   - Session captures: `{ lat, lon, accuracyMeters, timestamp, supervisorName, userAgent }`.
4. **Privileges Granted in Supervisor Mode**:
   - Dropdown displays `ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)`.
   - Access to Disciplinary Audit Log with 1-click Foreman vs Admin penalty decision buttons.
5. **Security Safeguards**:
   - Auto-timeout revert to `โหมดผู้ใช้งาน` after **15 minutes** of inactivity.

---

## 5. Dual-Experience Presentation: RPG vs Corporate

The system provides two distinct views tailored to their audiences:

```
[ 🎮 RPG Mode ]                                [ 💼 Corporate Mode ]
• Audience: Technicians & Field Teams          • Audience: Executives, Managers, HR
• Dark Fantasy / Cyber-Medieval Visuals        • Clean Executive Slate / Navy / Gold
• STR/AGI/DEX/INT/CON/SEN Stat Gauges          • 6 Corporate Competencies (Execution, Agility,
• Class Crest & Fantasy Hero Title             • Technical Precision, Systems, Resilience, CX)
• Combat & Synergy Pairing Buffs               • McKinsey 9-Box Talent Grid Placement
• Focus: Motivation, Growth, Gamification      • Succession Readiness & Operational Risk Index
```

---

## 6. UI/UX Sticky Hero Stage Architecture

To solve layout collapse and image cropping:
- **Left Column (55%)**: Three clean Segmented Tabs (`ภาพรวมสมรรถนะ`, `ผลงานจริง & 9-Box`, `AI วินิจฉัย & โค้ชชิ่ง`). Scrolls vertically.
- **Right Column (45%)**: **Sticky Hero Stage**.
  - Avatar image is rendered as a clean, background-removed transparent silhouette.
  - No harsh rectangular box, no solid white borders, and no bottom black gradient masking.
  - Ambient soft radial glow anchors the full-body figure at eye level, remaining fixed as the left side scrolls.

---

## 7. AI Talent Diagnostic Ingestion Pipeline

Gemini AI synthesizes qualitative BARS rubrics with hard TaskFlow telemetry:

```json
{
  "staff": { "name": "...", "class": "Foreman", "projects": ["LH-379"] },
  "qualitativeRubrics": {
    "coreStats": { "str": 7, "agi": 8, "dex": 6, "int": 5, "con": 7, "sen": 6 },
    "primaryBarsStrength": "DEX Level 4: ตรวจสอบและซ่อมแซมระบบวาล์วได้ตามมาตรฐาน",
    "primaryBarsDevelopment": "INT Level 2: บันทึกข้อมูลอะไหล่ไม่ครบถ้วน"
  },
  "quantitativeTelemetry": {
    "totalTasksCompleted30d": 14,
    "onTimeSlaRate": "92.8%",
    "lateWoCount": 2,
    "deliberateDelayPenalties": 0,
    "billingClearanceRate": "N/A (Foreman)"
  }
}
```

AI Output avoids canned templates and produces:
1. **Executive Operational Diagnostic** (2 paragraphs connecting numbers to behaviors).
2. **Empirical Strengths & BARS Evidence** (Grounded in completed jobs).
3. **Operational Risk Flags** (Concrete estate failure risks).
4. **Actionable 30-60-90 Days Coaching Plan** (1-on-1 interview questions and milestones).
