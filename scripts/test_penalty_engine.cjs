const assert = require('assert');

// Test runner for penalty calculations and auto-deduct in archetypeEngine
async function runTests() {
  console.log('--- Testing Decision Room Penalties & Auto-Deduct ---');

  const { aggregateStaffTaskTelemetry, analyzeOuterLayer } = await import('../src/utils/archetypeEngine.js');

  const mockSets = {
    staffClasses: [{ id: 'foreman', key: 'foreman', title: 'โฟร์แมนโครงการ' }],
    emails: ['somchai@lh.co.th|มัณฑนา|สมชาย ช่างทอง']
  };

  const mockStaff = {
    id: 'staff-1',
    name: 'สมชาย ช่างทอง',
    classId: 'foreman',
    role: 'foreman',
    str: 7, agi: 8, dex: 7, int: 6, con: 7, sen: 6,
    outerAssessed: true,
    cx: 8, tech: 8, sla: 8, crisis: 8, resource: 8, innovation: 8
  };

  const mkTask = (id, overrides = {}) => ({
    id,
    project: 'มัณฑนา',
    staffName: 'สมชาย ช่างทอง',
    status: 'จบงาน',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    completedDate: '2026-09-09',
    receivedDate: '2026-09-01',
    ...overrides
  });
  const lateTask = (id, overrides = {}) => mkTask(id, { completedDate: '2026-09-12', ...overrides });
  const slaPts = (t) => (t.penalties.find(p => p.axis === 'sla') || { points: 0 }).points;

  // 1. Too few completed jobs (< 5): no rate-based deduction, but an info alert explains why
  const telemetry1 = aggregateStaffTaskTelemetry(mockStaff, [lateTask('JOB-001')], mockSets, '2026-09');
  assert.strictEqual(slaPts(telemetry1), 0, '1 completed job is too small a sample to deduct');
  assert(telemetry1.alerts.some(a => a.type === 'info'), 'Should explain insufficient sample');
  console.log('✓ Test 1 Passed: sample < 5 jobs = no SLA deduction + info alert');

  // 2. Volume fairness: 3 late of 20 (15%) = -2, same late count on a small base is harsher
  const tasks20 = [
    ...Array.from({ length: 17 }, (_, i) => mkTask(`OK-${i}`)),
    ...Array.from({ length: 3 }, (_, i) => lateTask(`LATE-${i}`))
  ];
  const telemetry2 = aggregateStaffTaskTelemetry(mockStaff, tasks20, mockSets, '2026-09');
  assert.strictEqual(slaPts(telemetry2), 2, '15% late rate should deduct 2 points');
  const tasks152 = [
    ...Array.from({ length: 139 }, (_, i) => mkTask(`BIG-OK-${i}`)),
    ...Array.from({ length: 13 }, (_, i) => lateTask(`BIG-LATE-${i}`))
  ];
  const telemetryBig = aggregateStaffTaskTelemetry(mockStaff, tasks152, mockSets, '2026-09');
  assert.strictEqual(telemetryBig.slaRate, 91, 'On-time rate should be 91%');
  assert.strictEqual(slaPts(telemetryBig), 1, '91% on-time (13 late of 152) should deduct only 1 point');
  const telemetryAllLate = aggregateStaffTaskTelemetry(mockStaff, Array.from({ length: 13 }, (_, i) => lateTask(`L-${i}`)), mockSets, '2026-09');
  assert.strictEqual(slaPts(telemetryAllLate), 5, '100% late should hit the SLA cap of 5');
  console.log('✓ Test 2 Passed: SLA deduction scales with late rate, not raw count');

  // 3. Same task is penalized once: a WO-late job (BOQ) must not also count as a late finish
  const woLateTasks = Array.from({ length: 13 }, (_, i) => mkTask(`WO-${i}`, { overdueStatus: 'ออกใบงานช้า', lateWorkOrder: true, overdueReason: 'รอ BOQ' }));
  const telemetryWO = aggregateStaffTaskTelemetry(mockStaff, woLateTasks, mockSets, '2026-09');
  assert.strictEqual(telemetryWO.lateFinishedTasks, 0, 'Late-WO status is not a late finish');
  assert.strictEqual(slaPts(telemetryWO), 0, 'Late-WO jobs must not be penalized on SLA axis');
  assert.strictEqual(telemetryWO.penalties.find(p => p.axis === 'tech').points, 4, 'Late-WO jobs are penalized once on TECH axis');
  const bothLate = Array.from({ length: 10 }, (_, i) => lateTask(`BOTH-${i}`, { lateWorkOrder: true, overdueReason: 'รอ BOQ' }));
  const telemetryBoth = aggregateStaffTaskTelemetry(mockStaff, bothLate, mockSets, '2026-09');
  assert.strictEqual(telemetryBoth.penalties.find(p => p.axis === 'tech'), undefined, 'Job already penalized as late finish is not penalized again as late WO');
  console.log('✓ Test 3 Passed: one task is penalized once across axes');

  // 3b. Per-axis cap: stacked rules cannot exceed 5 points on one axis
  const stacked = [
    ...Array.from({ length: 10 }, (_, i) => lateTask(`ST-${i}`)),
    ...Array.from({ length: 4 }, (_, i) => mkTask(`RE-${i}`, { status: 'เลื่อนวันจบ', postponedAt: '2026-09-20', previousEndDate: '2026-09-10' }))
  ];
  const telemetryStacked = aggregateStaffTaskTelemetry(mockStaff, stacked, mockSets, '2026-09');
  assert(telemetryStacked.penalties.filter(p => p.axis === 'sla').reduce((a, p) => a + p.points, 0) <= 5, 'SLA axis total deduction must not exceed 5');
  console.log('✓ Test 3b Passed: per-axis deduction cap = 5');

  // 3c. Finished before due date but carrying a stale 'เกินกำหนด' flag is NOT late; same-day defers to the flag
  const early = Array.from({ length: 10 }, (_, i) => mkTask(`EARLY-${i}`, { completedDate: '2026-10-13', endDate: '2026-10-14', overdueStatus: 'เกินกำหนด' }));
  const telemetryEarly = aggregateStaffTaskTelemetry(mockStaff, early, mockSets, '2026-10');
  assert.strictEqual(telemetryEarly.lateFinishedTasks, 0, 'Early finish with stale flag must not count as late');
  const sameDay = Array.from({ length: 10 }, (_, i) => mkTask(`SAME-${i}`, { completedDate: '2026-10-14', endDate: '2026-10-14', overdueStatus: 'เกินกำหนด' }));
  assert.strictEqual(aggregateStaffTaskTelemetry(mockStaff, sameDay, mockSets, '2026-10').lateFinishedTasks, 10, 'Same-day finish keeps the after-cutoff flag');
  console.log('✓ Test 3c Passed: dates override stale overdue flag');

  // 3d. Month isolation: September work never leaks into October, and vice versa
  const septTasks = Array.from({ length: 10 }, (_, i) => lateTask(`SEP-${i}`));
  const octTasks = Array.from({ length: 10 }, (_, i) => mkTask(`OCT-${i}`, { endDate: '2026-10-10', completedDate: '2026-10-09' }));
  const mixed = [...septTasks, ...octTasks];
  const tSep = aggregateStaffTaskTelemetry(mockStaff, mixed, mockSets, '2026-09');
  const tOct = aggregateStaffTaskTelemetry(mockStaff, mixed, mockSets, '2026-10');
  assert.strictEqual(tSep.completedTasks, 10, 'September sees only its own 10 finished jobs');
  assert.strictEqual(tSep.lateFinishedTasks, 10, 'September late jobs counted in September');
  assert.strictEqual(tOct.completedTasks, 10, 'October sees only its own 10 finished jobs');
  assert.strictEqual(tOct.lateFinishedTasks, 0, 'September late jobs must not leak into October');
  assert.strictEqual(slaPts(tOct), 0, 'October SLA must be clean');
  assert(!tOct.discrepancyTasks.some(i => i.type !== 'BILLING_CUTOFF'), 'October room holds no September SLA items (only the 15th billing cycle lapse is booked in the following month)');
  console.log('✓ Test 3d Passed: audit room is isolated per month');

  // 3e. Shared ruling splits the deduction (Foreman % / Admin %) instead of charging both in full
  const adminStaff = { id: 'staff-2', name: 'ธุรการ ทดสอบ', classId: 'admin', role: 'admin', outerAssessed: true, cx: 8, tech: 8, sla: 8, crisis: 8, resource: 8, innovation: 8 };
  const adminSets = { staffClasses: [{ id: 'admin', key: 'admin', title: 'ธุรการ' }], emails: ['adm@lh.co.th|มัณฑนา|ธุรการ ทดสอบ'] };
  const onTime16 = Array.from({ length: 16 }, (_, i) => mkTask('SHOK-' + i));
  const ruled = (role, foremanShare) => onTime16.concat(Array.from({ length: 4 }, (_, i) => lateTask(`SH-${role}-${i}`, {
    slaAuditResolution: { responsibleRole: role, reason: 'test', supervisorName: 'ผู้ดูแล', timestamp: '2026-09-30T10:00:00Z', ...(foremanShare !== undefined ? { foremanShare } : {}) }
  })));
  const fmPts = (tasks) => slaPts(aggregateStaffTaskTelemetry(mockStaff, tasks, mockSets, '2026-09'));
  const adPts = (tasks) => slaPts(aggregateStaffTaskTelemetry(adminStaff, tasks, adminSets, '2026-09'));
  assert.strictEqual(fmPts(ruled('foreman')), 3, 'Foreman 100%: 4/20 late (20%) = -3');
  assert.strictEqual(adPts(ruled('foreman')), 0, 'Foreman 100%: Admin bears nothing');
  assert.strictEqual(fmPts(ruled('admin')), 0, 'Admin 100%: Foreman bears nothing');
  assert.strictEqual(adPts(ruled('admin')), 3, 'Admin 100%: 4/20 late (20%) = -3');
  assert.strictEqual(fmPts(ruled('waived')) + adPts(ruled('waived')), 0, 'Waived: nobody is penalized');
  assert(fmPts(ruled('shared', 70)) > 0 && adPts(ruled('shared', 70)) > 0, 'Shared: both bear a part');
  assert(fmPts(ruled('shared', 70)) < fmPts(ruled('foreman')), 'Shared 70%: Foreman bears less than a full 100% ruling');
  assert(fmPts(ruled('shared', 70)) > fmPts(ruled('shared', 30)), 'Higher Foreman share = larger Foreman deduction');
  assert(adPts(ruled('shared', 70)) < adPts(ruled('shared', 30)), 'Higher Foreman share = smaller Admin deduction');
  console.log('✓ Test 3e Passed: shared rulings split Foreman/Admin deductions');

  const tasks6 = Array.from({ length: 6 }, (_, i) => lateTask(`JOB-00${i + 10}`));
  const telemetry6 = aggregateStaffTaskTelemetry(mockStaff, tasks6, mockSets, '2026-09');
  assert.strictEqual(slaPts(telemetry6), 5, '6 of 6 late should cap at 5 points');

  // 3f. Rolling quarter (R3:YYYY-MM): each month scored on its own, then blended with recency weights
  const sepBad = Array.from({ length: 10 }, (_, i) => (i < 4 ? lateTask(`Q-SEP-L-${i}`) : mkTask(`Q-SEP-${i}`)));
  const octGood = Array.from({ length: 10 }, (_, i) => mkTask(`Q-OCT-${i}`, { endDate: '2026-10-10', completedDate: '2026-10-09' }));
  const qTasks = [...sepBad, ...octGood];
  const tQ = aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, 'R3:2026-10');
  const tSepOnly = aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, '2026-09');
  assert.strictEqual(tQ.isRolling, true, 'R3 period is flagged as rolling');
  assert.strictEqual(tQ.totalTasks, 20, 'Quarter sums the months with work (Sep 10 + Oct 10)');
  assert.strictEqual(tQ.monthly.length, 3, 'Three monthly rows (Aug has no data)');
  assert.strictEqual(tQ.monthly.filter(m => m.hasData).length, 2, 'Only Sep and Oct carry data');
  assert(Math.abs(tQ.monthly.reduce((a, m) => a + m.weight, 0) - 1) < 1e-9, 'Weights renormalise to 1 over months with data');
  const sepPts = slaPts(tSepOnly);
  assert(sepPts >= 3, 'September alone is a bad month');
  assert(slaPts(tQ) > 0 && slaPts(tQ) < sepPts, 'A clean October softens (but does not erase) a bad September');
  assert.strictEqual(slaPts(aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, 'R3:2026-12')), 0, 'Sep is outside a Oct-Dec window; Oct alone is clean');
  assert.strictEqual(aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, '2026-10').isRolling, undefined, 'Plain month keeps single-month behaviour');
  console.log('✓ Test 3f Passed: rolling 3-month blend with recency weights');

  // 3g. Monthly snapshots: build, closing rules, and a frozen month overriding live data in the rolling quarter
  const { buildMonthlySnapshots, canCloseMonth, isMonthClosed } = await import('../src/utils/monthlySnapshot.js');
  assert.strictEqual(canCloseMonth('2026-09', '2026-10'), true, 'A finished month can be closed');
  assert.strictEqual(canCloseMonth('2026-10', '2026-10'), false, 'The running month cannot be closed');
  assert.strictEqual(canCloseMonth('bad', '2026-10'), false, 'Malformed month is rejected');

  const { docs: snapDocs } = buildMonthlySnapshots([mockStaff], qTasks, mockSets, '2026-09', 'ผู้ดูแล', new Date('2026-10-01T00:00:00Z'));
  assert.strictEqual(snapDocs.length, 1, 'One snapshot per operational staff member');
  assert.strictEqual(snapDocs[0].id, '2026-09_staff-1', 'Snapshot id is month_staffId');
  assert.strictEqual(snapDocs[0].metrics.totalTasks, 10, 'Snapshot freezes the September metrics');
  assert(snapDocs[0].penaltyTotal >= 3, 'Snapshot carries the September deductions');
  assert.strictEqual(snapDocs[0].closedBy, 'ผู้ดูแล');
  assert.strictEqual(isMonthClosed({ [snapDocs[0].id]: snapDocs[0] }, '2026-09'), true);
  assert.strictEqual(isMonthClosed({ [snapDocs[0].id]: snapDocs[0] }, '2026-10'), false);

  // a staff member with an unruled discrepancy blocks closing (the frozen score would be wrong)
  const staleOpen = [mkTask('PEND-1', { status: 'กำลังดำเนินการ', completedDate: undefined, updatedAt: '2000-01-01', startDate: '2000-01-01' })];
  const { pending: blocked } = buildMonthlySnapshots([mockStaff], staleOpen, mockSets, '2099-01');
  assert.strictEqual(blocked.length > 0, true, 'Pending discrepancies are reported so the month can not be closed');

  const frozen = { [snapDocs[0].id]: { ...snapDocs[0], penalties: [], metrics: { ...snapDocs[0].metrics, lateFinishedTasks: 0, onTimeFinishedTasks: 10, slaRate: 100 } } };
  const tLive = aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, 'R3:2026-10');
  const tFrozen = aggregateStaffTaskTelemetry(mockStaff, qTasks, mockSets, 'R3:2026-10', frozen);
  assert(slaPts(tFrozen) < slaPts(tLive), 'A frozen (snapshot) September replaces its live deductions');
  assert.strictEqual(tFrozen.monthly.find(m => m.month === '2026-09').locked, true, 'Frozen month is flagged locked');
  assert.strictEqual(tLive.monthly.find(m => m.month === '2026-09').locked, false, 'Live month is not locked');
  console.log('✓ Test 3g Passed: monthly snapshots build, close rules and freeze behave');

  // 4. Test Live Auto-Deduct in analyzeOuterLayer
  const statsObj = { str: 7, agi: 8, dex: 7, int: 6, con: 7, sen: 6 };
  const outerSummary = analyzeOuterLayer(mockStaff, statsObj, { telemetry: telemetry2 });

  assert.strictEqual(outerSummary.rawValues.sla, 8, 'Raw evaluated SLA should be preserved at 8');
  assert.strictEqual(outerSummary.penaltiesByAxis.sla, 2, 'Penalties on SLA axis should be 2');
  assert.strictEqual(outerSummary.actualValues.sla, 6, 'Net actual SLA should be 8 - 2 = 6');
  assert(outerSummary.avgOuter < 8, 'Average outer score should drop due to penalty');
  // 5. Test Officer Exemption: Officers are 100% exempt from field operational penalties
  const mockOfficer = {
    id: 'staff-officer',
    name: 'กิตติศักดิ์ ประจำการ',
    classId: 'officer',
    role: 'officer',
    str: 8, agi: 8, dex: 8, int: 8, con: 8, sen: 8,
    outerAssessed: true,
    cx: 9, tech: 8, sla: 9, crisis: 8, resource: 8, innovation: 9
  };
  const officerSets = {
    staffClasses: [{ id: 'officer', key: 'officer', title: 'เจ้าหน้าที่โครงการ' }]
  };
  const officerTelemetry = aggregateStaffTaskTelemetry(mockOfficer, tasks6, officerSets, '2026-09');
  assert.strictEqual(officerTelemetry.isExempt, true, 'Officer role should be marked as exempt');
  assert.strictEqual(officerTelemetry.penalties.length, 0, 'Officer should receive zero penalties');
  const officerOuter = analyzeOuterLayer(mockOfficer, statsObj, { telemetry: officerTelemetry });
  assert.strictEqual(officerOuter.actualValues.sla, 9, 'Officer SLA should not be penalized');
  console.log('✓ Test 5 Passed: Officer role 100% exempt from field SLA penalties');

  // 6. Test Score Clamping (minimum 1.0)
  const lowMockStaff = { ...mockStaff, sla: 2 };
  const heavyOuter = analyzeOuterLayer(lowMockStaff, statsObj, { telemetry: telemetry6 }); // -5 pts on SLA
  assert.strictEqual(heavyOuter.actualValues.sla, 1, 'Penalized score must clamp at 1.0 minimum (never 0 or negative)');
  console.log('✓ Test 6 Passed: Net score bounded safely with min 1.0');

  console.log('--- ALL PENALTY ENGINE TESTS PASSED! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
