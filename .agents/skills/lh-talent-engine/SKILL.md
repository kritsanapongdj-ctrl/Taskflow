---
name: lh-talent-engine
description: >-
  Governs the Land & Houses (LH) Property & Infrastructure Maintenance Talent Assessment System (Talent Engine 2.0). Covers the dual-layer competency framework (HOW behavioral potential vs WHAT operational performance), 10-level BARS rubrics (Crisis to Benchmark) across 12 dimensions, 50+ RPG/Corporate Archetypes with formula unlocks, automated RACI SLA penalty deduction rules for Foreman and Admin roles, automated post-save AI evaluation triggers, and Gemini-powered talent diagnostic synthesis. Use when auditing competency scores, evaluating staff potential, updating BARS behavioral anchors, analyzing archetypes, or managing automated evaluation pipelines.
---

# LH Talent Assessment Engine 2.0 (Competency & Governance Framework)

This skill documents the end-to-end architecture, behavioral assessment science, operational rules engine, 10-level BARS rubrics, 50+ archetypes, and automated post-save evaluation pipelines for the Land and Houses (LH) Property & Infrastructure Maintenance Talent Assessment System (`lh-taskflow`).

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
   - **HOW (Inner Core - Potential)**: 6 Core Behavioral Stats (`str`, `agi`, `dex`, `int`, `con`, `sen`) driving work style, resilience, and problem solving.
   - **WHAT (Outer Layer - Field Performance)**: 6 Field Competencies (`cx`, `tech`, `sla`, `crisis`, `resource`, `innovation`) observed in real work orders, response times, and billing cycles.
2. **Behaviorally Anchored Rating Scale (BARS Level 1–10)**:
   - Evaluates performance using concrete, observable behavioral indicators across a 10-point scale (`rubrics.json`), ranging from Level 1 (Crisis) to Level 10 (Organizational Benchmark).
3. **SHRM Functional Competency Modeling for Infrastructure & Facility Management**:
   - Explicit separation between Technical Execution (`Foreman`) and Administrative & Systems Compliance (`Admin`).
4. **McKinsey / GE 9-Box Talent Grid**:
   - Maps Potential (HOW) on the Y-axis against Performance (WHAT) on the X-axis to drive succession planning, risk mitigation, and talent development.

---

## 2. 10-Level BARS Rubric Architecture (`rubrics.json`)

The system evaluates staff across **12 dimensions** with deterministic 10-level descriptions:

### Inner Layer (6 Core Stats - HOW)
* **STR (Strength - พลังขับเคลื่อนและการตัดสินใจ)**: Core Execution, Problem Solving, Supervision.
* **AGI (Agility - ความรวดเร็วและการปรับตัว)**: Responsiveness, Adaptability, Field Agility.
* **DEX (Dexterity - ความแม่นยำและมาตรฐานคุณภาพ)**: Data Accuracy, Time Management, Quality Control.
* **INT (Intelligence - ระบบเทคโนโลยีและการจัดการ)**: Tool Proficiency, Workflow Optimization, Automation.
* **CON (Constitution - ความทรหดและการควบคุมอารมณ์)**: Stress Tolerance, Stamina, Grit.
* **SEN (Sensitivity - การเจรจาและความเข้าใจผู้คน)**: Service Mind, Interpersonal Empathy, Conflict De-escalation.

### Outer Layer (6 Field Competencies - WHAT)
* **CX (Customer Experience)**: สัมพันธภาพกับลูกบ้าน และการจัดการข้อร้องเรียน
* **TECH (Technical Competence)**: มาตรฐานช่าง ซ่อมแซมระบบสาธารณูปโภค (ประปา, ไฟฟ้า, สระว่ายน้ำ)
* **SLA (SLA Compliance)**: ความเร็วในการตอบสนอง และการปิดใบงานตามกรอบเวลา
* **CRISIS (Crisis Management)**: การรับมือเหตุฉุกเฉินเฉพาะหน้า (ท่อเมนแตก, ปั๊มดับ, น้ำท่วม)
* **RESOURCE (Resource Management)**: การควบคุมงบประมาณ 9 หมวด และบริหารสต็อกอะไหล่
* **INNOVATION (Innovation)**: การปรับปรุงกระบวนการทำงาน และการใช้ดิจิทัลเพื่อเพิ่มผลผลิต

### 10-Level Behavioral Scale Ladder
| Level | Code | Meaning | Thai Description | Action Required |
| :---: | :--- | :--- | :--- | :--- |
| **1** | CRISIS | Crisis | ภาวะวิกฤต / ก่อความเสียหายร้ายแรง | Immediate Intervention / Re-role |
| **2** | CRITICAL_GAP | Critical Gap | ต่ำกว่าเกณฑ์อย่างมาก ต้องแก้ซ้ำซาก | Performance Improvement Plan (PIP) |
| **3** | NEEDS_SUPPORT | Needs Support | ต้องมีพี่เลี้ยงประกบทุกขั้นตอน | Close Mentorship & Supervision |
| **4** | DEVELOPING | Developing | ทำงานได้เมื่อสภาวะปกติ ผลงานแกว่ง | Frequent Checkpoints & Coaching |
| **5** | STANDARD | Standard Baseline | ตามเกณฑ์มาตรฐานบริษัท สม่ำเสมอ | Reliable Independent Contributor |
| **6** | PROFICIENT | Proficient | สูงกว่ามาตรฐาน รับมือความซับซ้อนได้ | Advanced Task Assignment |
| **7** | ADVANCED | Advanced | ชำนาญเฉพาะทาง เป็นที่พึ่งของทีมได้ | Project Lead / Specialized Roles |
| **8** | EXPERT | Expert | เชี่ยวชาญขั้นสูง วิเคราะห์สาเหตุเชิงลึก | Team Mentor / Best Practice Coach |
| **9** | SYSTEM_LEADER | System Leader | กำหนดแนวทางข้ามสายงาน บริหารภาพรวม | Organizational Driver |
| **10** | BENCHMARK | Benchmark | ต้นแบบอ้างอิงระดับองค์กร | Role Model & Culture Bearer |

---

## 3. Archetype Engine & Formula Unlocks (`archetypes.json`)

The Archetype Engine transforms multi-dimensional stats into vivid personas categorized into 5 tiers:

1. **Uniform Stats (`uniform_1` to `uniform_10`)**:
   - `uniform_1`: Critical Crisis (ALL = 1)
   - `uniform_2`: Severe Underperformer (ALL = 2)
   - `uniform_3`: Needs Intensive Care (ALL = 3)
   - `uniform_4`: Inconsistent Performer (ALL = 4)
   - `uniform_5`: Standard Achiever (ALL = 5 - Baseline เสาหลัก)
   - `uniform_6`: Solid Contributor (ALL = 6)
   - `uniform_7`: High-Caliber Professional (ALL = 7)
   - `uniform_8`: Master Craftsman / Domain Expert (ALL = 8)
   - `uniform_9`: Vanguard Champion (ALL = 9)
   - `uniform_10`: Living Legend / Organizational Benchmark (ALL = 10)
2. **Dual-Stat Archetypes (สายผสม 2 มิติ)**:
   - ผสมจุดเด่น 2 แกน เช่น STR+AGI (Iron Striker - สายทะลวงไว), DEX+INT (Tech Architect - สถาปนิกข้อมูล), CON+SEN (Harmonic Guardian - ผู้ประสานสิบทิศ).
3. **Tri-Stat Archetypes (สายผสม 3 มิติ)**:
   - ผสมจุดเด่น 3 แกนสำหรับผู้ปฏิบัติงานระดับสูง (เช่น STR+AGI+CON = Field Commander).
4. **Special & Edge Cases**:
   - ผู้มีความเชี่ยวชาญเฉพาะด้านสุดโต่ง (Hyper-specialist) หรือผู้ที่มีจุดโหว่วิกฤตเฉพาะด้าน (Achilles' Heel).
5. **Seniority Rules**:
   - คำนำหน้าระดับความเก๋าตามประสบการณ์และผลงานสะสม.

---

## 4. Role Target Profiles (`ROLE_TARGET_PROFILES`)

Staff evaluations are benchmarked against role-specific target baselines:

```javascript
ROLE_TARGET_PROFILES = {
  admin: {
    name: 'ธุรการบริการ (Customer Service Admin)',
    baseline: 5,
    targetStats: { str: 5, agi: 6, dex: 7, int: 7, con: 6, sen: 6 },
    coreFocus: ['dex', 'int', 'con', 'sen', 'agi'],
    mission: 'ดูแลระบบใบงาน LHAppServ ตรวจเอกสารค่าใช้จ่าย 9 หมวด และประสานงานลูกบ้าน'
  },
  foreman: {
    name: 'ผู้ควบคุมงาน (Customer Service Foreman)',
    baseline: 5,
    targetStats: { str: 7, agi: 7, dex: 6, int: 5, con: 7, sen: 5 },
    coreFocus: ['str', 'agi', 'dex', 'con'],
    mission: 'ควบคุมงานระบบสาธารณูปโภค 6 หมวด ตรวจรับงานผู้รับเหมา และแก้ปัญหาฉุกเฉินหน้างาน'
  },
  officer: {
    name: 'เจ้าหน้าที่บริการ (Customer Service Officer)',
    baseline: 5,
    targetStats: { str: 6, agi: 6, dex: 6, int: 6, con: 6, sen: 6 },
    coreFocus: ['str', 'agi', 'dex', 'int', 'con', 'sen'],
    mission: 'บริหารจัดการภาพรวมโครงการ ควบคุมยอดงานค้าง Wait คุมงบประมาณ และกำกับดูแลทีม'
  }
}
```

---

## 5. Automated Post-Save AI Evaluation Trigger & Pipeline

The system incorporates an **Automated Post-Save Evaluation Pipeline**:

```
[ AssessmentModal / User Saves Evaluation ]
                     │
                     ▼
  1. Instant Heuristic Diagnostic (Zero-Latency BARS Anchor)
     `generateHeuristicTalentDiagnostic(updatedStaff, sets, archetypesData)`
                     │
                     ▼
  2. Async AI Dispatch to `/api/talent-assessment`
     Payload: { staff, stats, roleName, archAnalysis, featurePacket }
                     │
                     ▼
  3. Strict HR Professional Guardrails Evaluation:
     • Zero-Template Mandate: No canned responses.
     • Score Anchor Rule: Max Stat < 6 cannot claim "Core Strength".
     • Stat Interaction Analysis: Identify skill imbalances (e.g., High AGI + Low DEX = Speed without accuracy).
     • Can-Do vs Will-Do Gap: Synthesize Inner potential vs Outer performance.
                     │
                     ▼
  4. Auto-Cache & Result Emission
     Updates `staff.aiDiagnostic` in `sets.staffStats` with:
     • `overallVerdict`: 1-2 sentence executive assessment
     • `competencyTier`: Tier 1 to 4 placement
     • `verifiedStrengths`: Empirical strengths backed by BARS
     • `operationalRisks`: Concrete field hazards and risks
     • `managerActionPlan`: Management playbook for supervisors
     • `coachingQuestions`: Targeted 1-on-1 interview questions
     • `nextGrowthMilestone`: 30-60 day development goal
```

---

## 6. Operational RACI & Disciplinary Rules Engine

Enforces 8 deterministic rules for the **WHAT (Performance)** axis:
1. **Late Finish**: 100% Foreman (SLA Speed).
2. **Retroactive Start Postpone**: 100% Foreman (Proactive Planning).
3. **Retroactive End Postpone**: 100% Foreman (Time Discipline).
4. **Late Work Order > 3 Days**: Reason-based (Wait BOQ $\rightarrow$ Foreman; Others $\rightarrow$ Supervisor).
5. **Abandoned / Ghost Tasks > 7 Days**: Shared 70% Foreman / 30% Admin.
6. **Waiting for Parts Ceiling (45 Days)**: Max allowable lead time. If gaming is caught, supervisor issues `ผิดเงื่อนไขรออะไหล่ (ตัดคะแนน)` with immutable audit stamp.
7. **Duplicate Work Order Cancellation**: 100% Admin (System Integrity).
8. **Monthly Billing Cycle (15th Cut-off)**: Admin billing discipline.

---

## 7. Dual-Experience Presentation: RPG vs Corporate

* **RPG Mode**: For field staff & technicians. Dark fantasy visuals, stat gauges, class crests, and hero progression.
* **Corporate Mode**: For management, HR, and executives. Slate/navy/gold executive theme, McKinsey 9-Box Placement, Succession Readiness, and Operational Risk Index.
