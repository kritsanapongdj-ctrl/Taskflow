# LINE Bot Commands Catalog: LH TaskFlow

This reference documents the full command matrix supported by the LINE Official Account backend (`MasterOrchestrator`).

## 1. Task Management Commands (`TaskAgent`)

| Command Trigger | Description | Target Scope | Output Data Points |
| :--- | :--- | :--- | :--- |
| `!สรุปงาน` | Summary of today's tasks | All Projects | Active tasks today, finished tasks today, status breakdown (✅ จบงาน, 📋 จบงาน(รอใบงาน), ⚙️ กำลังดำเนินการ). |
| `!สรุปงานA` | Summary of today's tasks | Group A (LH-410, LH-415, NE-419) | Filtered by Group A projects. |
| `!สรุปงานB` | Summary of today's tasks | Group B (LH-379, LH-392, LH-395) | Filtered by Group B projects. |
| `!สรุปงานA2` | Summary of today's tasks | Group A2 (LA-025, LH-329, LH-402, LH-120, LH-195, LH-225) | Filtered by Group A2 projects. |
| `!รอใบงาน` | Finished tasks awaiting WO | All Projects | Grouped by month, completed date, assignee, remaining days in **3-Day SLA countdown**. |
| `!รอใบงานA` / `!รอใบงานB` / `!รอใบงานA2` | Finished tasks awaiting WO | Group A / B / A2 | Filtered by corresponding management group. |
| `!เช็คงาน` | Scraped portal tickets | All Projects | New tickets, tickets pending > 48 hours, critical tickets delayed > 5 days. |
| `!เช็คงานA` / `!เช็คงานB` / `!เช็คงานA2` | Scraped portal tickets | Group A / B / A2 | Filtered by corresponding management group. |
| `!คำสั่ง`, `HELP`, `เมนู` | System Help | Global | Command directory and formatting tips. |

---

## 2. Budget & Financial Commands (`BudgetAgent`)

| Command Trigger | Description | Output Details |
| :--- | :--- | :--- |
| `!งบ` | High-level portfolio budget | Total YTD Actual, Total YTG Forecast, Full-Year (FY) Landing, Approved Budget, and Variance % across all projects. |
| `!งบA` / `!งบB` / `!งบA2` | Management group budget | Group total plus project-by-project breakdown with variance alerts (⚠️ vs ✅). |
| `!งบ [รหัส]` | Specific project deep-dive | Detailed breakdown of the **9 Accounting Categories**:<br>1. Security (รปภ.)<br>2. Gardening (ดูแลสวน)<br>3. Club & Pool (สโมสรและสระว่ายน้ำ)<br>4. Electricity (ค่ากระแสไฟฟ้า)<br>5. Water (ค่าน้ำประปา)<br>6. Garbage (เก็บขยะ)<br>7. Pest Control (กำจัดปลวก/แมลง)<br>8. Shuttle / Van (รถรับส่ง)<br>9. Miscellaneous / Repairs (เบ็ดเตล็ดและงานซ่อมบำรุง) |
| `!เกินงบ` | Overrun risk audit | Highlights any project or category with projected FY Landing exceeding approved budget (`diff < 0`). |

---

## 3. Flood & Weather Commands (`FloodAgent`)

| Command Trigger | Description | Usage Workflow |
| :--- | :--- | :--- |
| `!น้ำท่วม [รหัส] [ข้อความ]` | Starts a new flood survey draft | Example: `!น้ำท่วม 410 ถนนเมนแห้งสนิท ปั๊มสูบทำงานปกติ`<br>Stores draft with project code, timestamp, and notes in Firestore. |
| *Send Image(s)* | Submits field photos | Users send 5–10 photos in 1-on-1 chat. Photos are saved to the draft's photo collection and analyzed via Gemini Vision. |
| `เสร็จ` | Finalizes and compiles report | Triggers multimodal analysis, fetches live weather & ThaiWater telemetry, compares with As-Built benchmark, generates report ID (`FLD-...`), and replies with interactive Flex Message. |
| `ยกเลิก` | Cancels draft | Clears active draft and uploaded photos from Firestore. |
| `ล้าง` | Resets draft session | Synonym for cancel. |

---

## 4. Manpower Surveillance (`ManpowerAgent`)

| Mode | Trigger Condition | Behavior |
| :--- | :--- | :--- |
| **Passive Group Listener** | Text matching manpower keywords (e.g. `คนงาน`, `ยอดคน`, `มา...ขาด...`, `ผรม.`) | Extracts contractor, project, actual headcount, missing headcount. Saves to Firestore **silently** without reply (Zero LINE Quota). |
| **Active 1-on-1 Query** | `!คนงาน` or `!แรงงาน` in direct chat | Returns aggregated contractor headcount logs for cross-checking monthly invoices. |
