// scripts/test_sla_detector.cjs
const assert = require('assert');

async function run() {
  console.log('--- Testing slaDetector.js ---');
  const detector = await import('../src/utils/slaDetector.js');
  const { detectSlaCategory, detectAllSlaCategories, isSlaMismatch } = detector;

  const sampleDbSlas = [
    'ท่อสปริงเกอร์แตก|5',
    'หัวสปริงเกอร์แตก|3',
    'ปรับหัวสปริงเกอร์|3',
    'สุขภัณฑ์ป้อมหน้าชำรุด (กรณีซ่อมได้)|7',
    'อุปกรณ์ไฟฟ้าป้อมหน้าชำรุด (กรณีซ่อมได้)|7',
    'ฝ้าเพดานป้อมมีน้ำรั่วซึม|7',
    'ทางเท้า|14'
  ];

  // 1. Verify detectSlaCategory backward compatibility
  console.log('Test 1: detectSlaCategory single match backward compatibility...');
  const res1 = detectSlaCategory('ซ่อมท่อสปริงเกอร์รั่วในสวน', sampleDbSlas);
  assert.strictEqual(res1.hasMatch, true, 'Should have match');
  assert.strictEqual(res1.detectedCategory, 'ท่อสปริงเกอร์แตก', 'Should match ท่อสปริงเกอร์แตก');
  assert.strictEqual(res1.slaDays, 5, 'Should have 5 days SLA');
  console.log('✓ Test 1 passed');

  // 2. Verify detectAllSlaCategories exists and returns array
  console.log('Test 2: detectAllSlaCategories multi-match...');
  assert.strictEqual(typeof detectAllSlaCategories, 'function', 'detectAllSlaCategories must be a function');
  
  // Text containing both sprinkler pipe and guardhouse sanitation keywords
  const multiText = 'ซ่อมท่อสปริงเกอร์แตก และแก้ไขสุขภัณฑ์ห้องน้ำป้อมหน้าชำรุด';
  const multiRes = detectAllSlaCategories(multiText, sampleDbSlas, 3);
  assert(Array.isArray(multiRes), 'Result must be an array');
  assert(multiRes.length >= 2, `Expected at least 2 matches, got ${multiRes.length}`);
  
  const matchedCats = multiRes.map(m => m.detectedCategory);
  assert(matchedCats.includes('ท่อสปริงเกอร์แตก'), 'Must include ท่อสปริงเกอร์แตก');
  assert(matchedCats.includes('สุขภัณฑ์ป้อมหน้าชำรุด (กรณีซ่อมได้)'), 'Must include สุขภัณฑ์ป้อมหน้าชำรุด (กรณีซ่อมได้)');
  console.log('✓ Test 2 passed:', matchedCats);

  // 3. Verify empty or no match
  console.log('Test 3: detectAllSlaCategories no match...');
  const emptyRes = detectAllSlaCategories('งานตัดหญ้าทั่วไป', sampleDbSlas);
  assert(Array.isArray(emptyRes), 'Must return array');
  assert.strictEqual(emptyRes.length, 0, 'Must return empty array on no match');
  console.log('✓ Test 3 passed');

  // 4. Verify limit constraint maxResults
  console.log('Test 4: detectAllSlaCategories limit constraint...');
  const limitRes = detectAllSlaCategories(multiText, sampleDbSlas, 1);
  assert.strictEqual(limitRes.length, 1, 'Must strictly respect maxResults limit of 1');
  console.log('✓ Test 4 passed');

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
