const row = 3;
const S_STR = "'ประเมินผลทีม'!C" + row;
const S_AGI = "'ประเมินผลทีม'!D" + row;
const S_DEX = "'ประเมินผลทีม'!E" + row;
const S_INT = "'ประเมินผลทีม'!F" + row;
const S_CON = "'ประเมินผลทีม'!G" + row;
const S_SEN = "'ประเมินผลทีม'!H" + row;

const V_STR = '(' + S_STR + '+0.06)';
const V_AGI = '(' + S_AGI + '+0.05)';
const V_DEX = '(' + S_DEX + '+0.04)';
const V_INT = '(' + S_INT + '+0.03)';
const V_CON = '(' + S_CON + '+0.02)';
const V_SEN = '(' + S_SEN + '+0.01)';

const ARR_STATS = 'CHOOSE({1,2,3,4,5,6},' + [S_STR, S_AGI, S_DEX, S_INT, S_CON, S_SEN].join(',') + ')';
const ARR_ADJ = 'CHOOSE({1,2,3,4,5,6},' + [V_STR, V_AGI, V_DEX, V_INT, V_CON, V_SEN].join(',') + ')';

const T = 'IF(LARGE(' + ARR_STATS + ',3)>=6.5,LARGE(' + ARR_ADJ + ',3),LARGE(' + ARR_ADJ + ',2))';

const f = 'SUBSTITUTE(TRIM(' +
  'IF(' + V_AGI + '>=' + T + '," AGI","")&' +
  'IF(' + V_CON + '>=' + T + '," CON","")&' +
  'IF(' + V_DEX + '>=' + T + '," DEX","")&' +
  'IF(' + V_INT + '>=' + T + '," INT","")&' +
  'IF(' + V_SEN + '>=' + T + '," SEN","")&' +
  'IF(' + V_STR + '>=' + T + '," STR","")' +
  ')," ","+")';

console.log(f);
console.log('Length:', f.length);
