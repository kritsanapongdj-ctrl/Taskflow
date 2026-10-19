# Smart SLA Selector with Searchable Combobox and Auto-Suggest Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Searchable SLA Selector (Combobox) with Frequent Pins and Multi-Suggestion Smart AI Chips in `TaskFormModal` to eliminate user confusion when opening new tasks with expanding SLA categories.

**Architecture:** 
1. Enhance the keyword engine in `src/utils/slaDetector.js` to support multi-match ranking via `detectAllSlaCategories(...)` while preserving 100% backward compatibility for `detectSlaCategory(...)`.
2. Create a clean, accessible, mobile-friendly `SearchableSlaSelect.jsx` combobox component featuring instant live filter, clear selection, and top 5 frequently used category quick-pins.
3. Integrate the combobox and smart suggestion chips into `TaskFormModal.jsx` with one-tap auto-fill for both `slaCategory` and `endDate` calculation, with fallback handling for "งานทั่วไป (ไม่มี SLA)".

**Tech Stack:** React 19, Tailwind CSS, Lucide Icons, Vite.

**Spec:** User requirement to combine Approach 1 (Searchable Combobox + Most Frequent Pins) and Approach 2 (Smart AI/Keyword Auto-Suggest Chips).

---

## Global Constraints

- **Zero Regression on Existing Telemetry**: Must preserve all existing SLA strings (`name|days`), formulas, and validation logic in `App.jsx` line 789–821.
- **Backward Compatibility**: `detectSlaCategory(...)` and `isSlaMismatch(...)` signatures and return shapes must remain intact.
- **Thai UX First**: Thai labels, keyboard accessibility, clear badge indicators (`5 วัน`, `ไม่มี SLA`), and graceful handling of empty or unlisted categories.
- **Design Alignment**: Adhere to High Luxury corporate theme (`#0F2E4A` Navy, `#7A1C28` Burgundy, `#C5A059` Gold, Slate border).

---

## Review Focus

1. **Unlisted / Custom SLA Categories**: Ensure custom strings in `sets.slas` or legacy tasks without days still display and select without throwing NaN or crashing.
2. **Mobile Viewport & Overflow**: Popover must stay within screen bounds without causing modal scroll jumping or cut-off on mobile devices.
3. **End Date Calculation Symmetry**: Selecting an SLA category via chip or combobox must calculate `endDate = startDate + (slaDays - 1)` reliably without timezone offsets.
4. **Frequent Categories Dynamic Fallback**: If task history is empty, fall back gracefully to standard defaults ("งานทั่วไป (ไม่มี SLA)", "ท่อสปริงเกอร์แตก", "หัวสปริงเกอร์แตก", "สุขภัณฑ์ป้อมหน้า").
5. **Form Submission Validation**: Submitting without selecting an SLA category must still block submission with Thai alert message as before.

---

## Tasks

### Task 1: Multi-Match Ranking in `src/utils/slaDetector.js`

**Files:**
- Modify: `src/utils/slaDetector.js:240-335`
- Test: `scripts/test_sla_detector.cjs`

- [x] **Step 1: Write test script `scripts/test_sla_detector.cjs`**
  Verify that multi-match returns top 1-3 matching categories ranked by keyword relevance, while `detectSlaCategory` still returns the exact primary match.
- [x] **Step 2: Run test to observe failure**
  Run `node scripts/test_sla_detector.cjs` to confirm `detectAllSlaCategories` is undefined.
- [x] **Step 3: Implement `detectAllSlaCategories` in `src/utils/slaDetector.js`**
  Iterate through all matching `SLA_RULES`, filter negatives, resolve `slaDbMap` days, and return an array of up to `maxResults` unique matches:
  ```js
  export function detectAllSlaCategories(detailsText, availableSlas = [], maxResults = 3)
  ```
- [x] **Step 4: Re-run test to verify GREEN**
  Run `node scripts/test_sla_detector.cjs` and verify all test assertions pass.
- [x] **Step 5: Commit Task 1**
  `git commit -m "feat(sla): add detectAllSlaCategories for multi-match recommendation chips"`

---

### Task 2: Create `SearchableSlaSelect.jsx` Component

**Files:**
- Create: `src/components/ui/SearchableSlaSelect.jsx`

- [x] **Step 1: Design `SearchableSlaSelect.jsx` interface and state**
  - Props: `value`, `onChange`, `slas`, `getProjName`, `getProjArea`, `frequentCategories`, `placeholder`, `disabled`.
  - State: `isOpen`, `searchTerm`, `highlightedIndex`.
- [x] **Step 2: Implement search filtering and keyboard navigation**
  - Case-insensitive, whitespace-trimmed search matching both category name and days.
  - Escape closes popover; Enter selects highlighted item.
  - Outside click listener to dismiss popover cleanly.
- [x] **Step 3: Implement Quick Pins (หมวดใช้งานบ่อย)**
  - Render top 3-5 frequent category chips directly beneath the search input for one-click access.
- [x] **Step 4: Implement clean UI styling with days badges**
  - Render badge e.g. `[5 วัน]` in amber/blue badge; "งานทั่วไป (ไม่มี SLA)" in gray badge.
  - Show active checkmark for currently selected item.
- [x] **Step 5: Verify build with test import**
  Run `cmd /c "npm run build"` to verify component syntax and bundle integration.
- [x] **Step 6: Commit Task 2**
  `git commit -m "feat(ui): add SearchableSlaSelect combobox with live search and frequent pins"`

---

### Task 3: Integrate into `TaskFormModal.jsx` and `App.jsx`

**Files:**
- Modify: `src/components/modals/TaskFormModal.jsx:20-140`
- Modify: `src/App.jsx:160-200, 770-830`

- [x] **Step 1: Compute dynamic frequent categories in `App.jsx` or pass `tasks` to modal**
  Derive top 5 most frequent `t.slaCategory` from `tasks` history (excluding blanks), fallback to standard pins if empty.
- [x] **Step 2: Replace native `<select>` in `TaskFormModal.jsx` with `<SearchableSlaSelect>`**
  Wire `value={taskForm.slaCategory}` and `onChange={(cat, days) => ...}`.
  Auto-calculate `endDate` when an SLA with valid days is selected:
  ```js
  const handleSlaChange = (catName, days) => {
    let newEndDate = taskForm.endDate;
    if (days && days > 0) {
      const sDate = new Date(taskForm.startDate || new Date());
      sDate.setDate(sDate.getDate() + (days - 1));
      newEndDate = sDate.toISOString().split('T')[0];
    }
    setTaskForm({ ...taskForm, slaCategory: catName, endDate: newEndDate });
  };
  ```
- [x] **Step 3: Enhance Smart SLA Auto-Suggest section with Multi-Recommendation Chips**
  Use `detectAllSlaCategories(taskForm.details, sets.slas || [])`.
  If multiple categories match, render them as clickable recommendation chips right under details textarea:
  `💡 แนะนำจากรายละเอียดงาน: [⚡ ท่อสปริงเกอร์แตก (5 วัน)] [💧 หัวสปริงเกอร์แตก (3 วัน)]`
  Clicking any chip immediately selects it and calculates `endDate`.
- [x] **Step 4: Keep SLA Mismatch Warning Banner intact**
  Preserve warning banner when the selected category contradicts the detected keyword.
- [x] **Step 5: Commit Task 3**
  `git commit -m "feat(task-form): integrate SearchableSlaSelect and multi-suggestion chips into TaskFormModal"`

---

### Task 4: Verification and Polish

**Files:**
- Verify: Full manual simulation of opening a task, searching SLA, clicking suggestion chips, and testing form submission.
- Build: `cmd /c "npm run build"`

- [x] **Step 1: Run production build verification**
  Execute `cmd /c "npm run build"` and verify 0 errors.
- [x] **Step 2: Run test suite**
  Execute `node scripts/test_sla_detector.cjs` and verify clean execution.
- [x] **Step 3: Verify git status and commit final adjustments**
  `git push origin main`
