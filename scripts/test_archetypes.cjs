const assert = require('assert');
const archetypes = require('../src/data/archetypes.json');

async function runTests() {
  console.log('--- Testing Archetype data (RPG vs Corporate) ---');
  const { getCorporateArchetypePersona, getArchetypeIdentity, calculateArchetypeKey } = await import('../src/utils/archetypeEngine.js');

  // 1. Every archetype carries a complete Corporate block that differs from its RPG text
  const corpFields = ['title', 'thai', 'desc', 'strengths', 'development', 'fit'];
  archetypes.forEach(a => {
    assert(a.corporate, `${a.key}: missing corporate block`);
    corpFields.forEach(f => assert(String(a.corporate[f] || '').trim(), `${a.key}: corporate.${f} is empty`));
    assert.notStrictEqual(a.corporate.desc, a.desc, `${a.key}: corporate desc must differ from RPG desc`);
    assert.notStrictEqual(a.corporate.title.toLowerCase(), String(a.name).toLowerCase(), `${a.key}: corporate title must differ from RPG class name`);
  });
  console.log(`✓ Test 1 Passed: ${archetypes.length} archetypes have a distinct, complete Corporate profile`);

  // 2. Names are unique so two different styles never share a class name / identity / corporate title
  const dup = (vals) => vals.filter((v, i) => vals.indexOf(v) !== i);
  assert.deepStrictEqual(dup(archetypes.map(a => a.name.toLowerCase())), [], 'RPG class names must be unique');
  assert.deepStrictEqual(dup(archetypes.map(a => a.identity.replace(/\(.*\)/, '').trim().toLowerCase())), [], 'RPG identities must be unique');
  assert.deepStrictEqual(dup(archetypes.map(a => a.corporate.title.toLowerCase())), [], 'Corporate titles must be unique');
  console.log('✓ Test 2 Passed: class names, identities and corporate titles are unique');

  // 3. Corporate copy never leaks game vocabulary
  const gameTerms = /เควสต์|ดีบัฟ|ปาร์ตี้|คลาส|สกิล|\b(quest|buff|debuff|party|class|skill|tank|rogue|cleric|berserker|vanguard|hp|xp)\b/i;
  archetypes.forEach(a => {
    corpFields.forEach(f => assert(!gameTerms.test(a.corporate[f]), `${a.key}: corporate.${f} contains game vocabulary: ${a.corporate[f]}`));
  });
  console.log('✓ Test 3 Passed: Corporate mode uses no game vocabulary');

  // 4. Resolution and prefixes
  assert.strictEqual(getCorporateArchetypePersona('agi_str', 'Master The Spearhead').title, 'Principal Rapid Response Lead');
  assert.strictEqual(getCorporateArchetypePersona('agi_str', 'Senior The Spearhead').title, 'Senior Rapid Response Lead');
  const stats = { str: 7, agi: 8, dex: 4, int: 3, con: 4, sen: 4 };
  const key = calculateArchetypeKey(stats);
  assert(getArchetypeIdentity(stats, undefined, 'corporate').includes(archetypes.find(a => a.key === key).corporate.title));
  assert.strictEqual(getArchetypeIdentity(stats), archetypes.find(a => a.key === key).identity, 'RPG identity unchanged');
  console.log('✓ Test 4 Passed: persona/identity resolve per mode with tier prefixes');

  // 5. Person-specific strength/weakness text exists in both modes and the Corporate one differs and uses no stat codes
  const { analyzeArchetype } = await import('../src/utils/archetypeEngine.js');
  const samples = [
    { str: 3, agi: 4, dex: 2, int: 3, con: 4, sen: 3 },
    { str: 5, agi: 5, dex: 4, int: 5, con: 4, sen: 5 },
    { str: 6, agi: 6, dex: 5, int: 5, con: 6, sen: 5 },
    { str: 7, agi: 8, dex: 4, int: 3, con: 4, sen: 4 },
    { str: 8, agi: 8, dex: 7, int: 7, con: 8, sen: 7 },
    { str: 9, agi: 7, dex: 3, int: 6, con: 5, sen: 4 }
  ];
  samples.forEach(stats => {
    const a = analyzeArchetype(stats, {}, undefined, 'foreman');
    ['dynamicStrengthCorp', 'dynamicWeaknessCorp', 'weaknessLabelCorp'].forEach(f => assert(String(a[f] || '').trim(), `${JSON.stringify(stats)}: ${f} is empty`));
    assert.notStrictEqual(a.dynamicWeaknessCorp, a.dynamicWeakness, 'Corporate weakness text must differ from RPG text');
    assert.notStrictEqual(a.dynamicStrengthCorp, a.dynamicStrength, 'Corporate strength text must differ from RPG text');
    const codes = /\b(STR|AGI|DEX|INT|CON|SEN)\b/;
    assert(!codes.test(a.dynamicStrengthCorp) && !codes.test(a.dynamicWeaknessCorp), 'Corporate text must not show stat codes');
  });
  console.log('✓ Test 5 Passed: person-specific Corporate strength/weakness text differs from RPG');

  // 6. Mode vocabulary: every shared surface (9-box, DNA, axes, alignment, tiers) reads differently per mode
  const V = await import('../src/utils/modeVocabulary.js');
  const E = await import('../src/utils/archetypeEngine.js');
  E.NINE_BOX_DEFINITIONS.forEach(c => {
    const r = V.getNineBoxDisplay(c.code, 'rpg', c), p = V.getNineBoxDisplay(c.code, 'corporate', c);
    assert.notStrictEqual(r.title, p.title, `${c.code}: 9-box title identical across modes`);
    assert.notStrictEqual(r.desc, p.desc, `${c.code}: 9-box description identical across modes`);
    assert.notStrictEqual(r.action, p.action, `${c.code}: 9-box action identical across modes`);
  });
  E.OUTER_KEYS.forEach(k => {
    assert.notStrictEqual(V.getOuterNames(k, 'rpg', E.OUTER_DEFINITIONS[k]).name, V.getOuterNames(k, 'corporate', E.OUTER_DEFINITIONS[k]).name, `${k}: axis name identical`);
    assert.notStrictEqual(V.getOuterShort(k, 'rpg'), V.getOuterShort(k, 'corporate'), `${k}: axis short label identical`);
    assert.strictEqual(V.getOuterShort(k, 'rpg'), E.OUTER_DEFINITIONS[k].formulaDesc.replace(/[() ]/g, '').replace(/\/2$/, ''), `${k}: RPG short label must match the stat formula`);
  });
  ['harmonized', 'over_achiever', 'under_leveraged'].forEach(k => {
    assert.notStrictEqual(V.getAlignmentDisplay(k, 'rpg').title, V.getAlignmentDisplay(k, 'corporate').title, `${k}: alignment title identical`);
  });
  ['Frontline Shield', 'Creative Responder', 'Operations Guardian', 'Rapid Strike', 'System Rescuer', 'Service Innovator', 'Diplomatic Steward', 'Trusted Ambassador', 'Consultative Expert', 'Asset Optimizer', 'Workflow Driver', 'Tech Pioneer', 'Disciplined Controller', 'Master Inspector', 'Precision Fixer', 'Specialist', 'Needs PIP', 'Needs Mentoring', 'Focus Improvement'].forEach(tag => {
    const dna = { tag, title: `Base Title (ไทย) [${tag}]` };
    assert.notStrictEqual(V.getDnaTitle(dna, 'rpg'), V.getDnaTitle(dna, 'corporate'), `${tag}: DNA title identical`);
    assert(!/\[/.test(V.getDnaTitle(dna, 'corporate')), `${tag}: corporate DNA title must drop the [tag] suffix`);
  });
  [1, 2, 3, 4].forEach(l => assert(/^Lv\.\d/.test(V.getTierBadge(l, 'rpg', 'x')), `tier ${l}: RPG uses Lv. naming`));
  const hr = V.getModeVocab('rpg'), hc = V.getModeVocab('corporate');
  ['outerHeading', 'howLabel', 'whatLabel', 'gapLabel', 'bestFit', 'pairing', 'coaching', 'riskAdvice', 'nineBoxHeading', 'nineBoxPending', 'nineBoxDone'].forEach(f => assert.notStrictEqual(hr[f], hc[f], `heading ${f} identical`));
  console.log('✓ Test 6 Passed: shared surfaces use mode-specific vocabulary');

  console.log('--- ALL ARCHETYPE TESTS PASSED! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
