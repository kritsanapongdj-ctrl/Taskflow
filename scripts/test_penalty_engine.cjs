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

  // 1. Test Single Late Completion: Should deduct exactly 1 pt (not fractional 0.5)
  const taskLate1 = {
    id: 'JOB-001',
    project: 'มัณฑนา',
    staffName: 'สมชาย ช่างทอง',
    status: 'จบงาน',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    completedDate: '2026-09-05', // 2 days late
    receivedDate: '2026-09-01'
  };

  const telemetry1 = aggregateStaffTaskTelemetry(mockStaff, [taskLate1], mockSets, '2026-09');
  const slaPen1 = telemetry1.penalties.find(p => p.axis === 'sla');
  assert(slaPen1, 'Should produce an SLA penalty for 1 late task');
  assert.strictEqual(slaPen1.points, 1, '1 late task should deduct exactly 1 point');
  console.log('✓ Test 1 Passed: 1 late task = -1 pt SLA');

  // 2. Test 2 Late Completions: Should deduct 2 pts (previously was capped at 1 due to Math.ceil(2*0.5) = 1)
  const taskLate2 = {
    id: 'JOB-002',
    project: 'มัณฑนา',
    staffName: 'สมชาย ช่างทอง',
    status: 'จบงาน',
    startDate: '2026-09-05',
    endDate: '2026-09-07',
    completedDate: '2026-09-10',
    receivedDate: '2026-09-05'
  };

  const telemetry2 = aggregateStaffTaskTelemetry(mockStaff, [taskLate1, taskLate2], mockSets, '2026-09');
  const slaPen2 = telemetry2.penalties.find(p => p.axis === 'sla');
  assert.strictEqual(slaPen2.points, 2, '2 late tasks should deduct 2 points (not 1)');
  console.log('✓ Test 2 Passed: 2 late tasks = -2 pts SLA');

  // 3. Test Cap: 6 Late Completions should reach new cap of 5 (previously 3)
  const tasks6 = Array.from({ length: 6 }, (_, i) => ({
    id: `JOB-00${i + 10}`,
    project: 'มัณฑนา',
    staffName: 'สมชาย ช่างทอง',
    status: 'จบงาน',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    completedDate: '2026-09-06',
    receivedDate: '2026-09-01'
  }));

  const telemetry6 = aggregateStaffTaskTelemetry(mockStaff, tasks6, mockSets, '2026-09');
  const slaPen6 = telemetry6.penalties.find(p => p.axis === 'sla');
  assert.strictEqual(slaPen6.points, 5, '6 late tasks should cap at 5 points (not 3)');
  console.log('✓ Test 3 Passed: 6 late tasks = -5 pts SLA (expanded cap)');

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
