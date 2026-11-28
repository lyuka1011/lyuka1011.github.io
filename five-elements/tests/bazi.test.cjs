const assert = require('node:assert/strict');
const {calculate} = require('../assets/bazi.js');
const chart = (date, time, extra = {}) => calculate({date, time, ...extra});
const pairs = value => value.pillars.map(p => p.pair);
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS', name); }
// Expected pillars/hidden stems: https://github.com/6tail/lunar-javascript/blob/master/__tests__/EightChar.test.js
test('official four-pillar fixture', () => assert.deepEqual(pairs(chart('2005-12-23','08:37')), ['乙酉','戊子','辛巳','壬辰']));
test('late Zi hour, midnight day boundary', () => assert.deepEqual(pairs(chart('1988-02-15','23:30')), ['戊辰','甲寅','庚子','戊子']));
test('late Zi hour, 23:00 day boundary', () => assert.deepEqual(pairs(chart('1988-02-15','23:30',{sect:1})), ['戊辰','甲寅','辛丑','戊子']));
test('before Zi hour', () => assert.deepEqual(pairs(chart('1988-02-15','22:30')), ['戊辰','甲寅','庚子','丁亥']));
// HKO Almanac 2024: Li Chun on February 4 at 16:27 UTC+8 (rounded to minute).
// https://www.hko.gov.hk/tc/gts/astron2024/files/HKO_almanac_2024.pdf
test('before Li Chun, old year and month', () => assert.deepEqual(pairs(chart('2024-02-04','16:26')).slice(0,2), ['癸卯','乙丑']));
test('after Li Chun, new year and month before lunar new year', () => assert.deepEqual(pairs(chart('2024-02-04','16:28')).slice(0,2), ['甲辰','丙寅']));
test('surface counts and all tied elements', () => {
  const value = chart('2005-12-23','08:37');
  assert.deepEqual(value.surface, {木:1,火:1,土:2,金:2,水:2});
  assert.deepEqual(value.most, ['土','金','水']); assert.deepEqual(value.least,['木','火']);
  assert.deepEqual(value.pillars[2].hiddenStems, [{stem:'丙',element:'火'},{stem:'庚',element:'金'},{stem:'戊',element:'土'}]);
  assert.equal(value.pillars[3].tenGod,'傷官'); assert.equal(value.dayElement,'金');
});
test('manual correction crosses midnight independently of device timezone', () => assert.deepEqual(pairs(chart('1988-02-15','23:30',{correction:60})),pairs(chart('1988-02-16','00:30'))));
test('negative correction crosses date', () => assert.deepEqual(pairs(chart('1988-02-16','00:30',{correction:-60})),pairs(chart('1988-02-15','23:30'))));
test('valid leap day', () => assert.equal(chart('2000-02-29','12:00').pillars.length,4));
test('reject non-leap February 29 and normalized invalid dates', () => {
  for (const date of ['1900-02-29','2023-02-29','2024-04-31','2024-00-01','2024-13-01','1899-12-31','2100-01-01']) assert.throws(() => chart(date,'12:00'));
});
test('reject invalid times and correction settings', () => {
  for (const time of ['24:00','12:60','','8:30']) assert.throws(() => chart('2000-01-01',time));
  for (const extra of [{sect:3},{correction:181},{correction:-181},{correction:0.5},{correction:'x'}]) assert.throws(() => chart('2000-01-01','12:00',extra));
});
test('correction cannot exceed supported calendar range', () => {
  assert.throws(() => chart('1900-01-01','00:00',{correction:-1}));
  assert.throws(() => chart('2099-12-31','23:59',{correction:1}));
});
test('surface always totals eight; hidden stems remain separate', () => {
  for (const date of ['1900-01-01','1950-06-15','2000-02-29','2024-02-04','2099-12-31']) {
    const value = chart(date,'12:00');
    assert.equal(Object.values(value.surface).reduce((a,b) => a+b,0),8);
    assert.deepEqual(value.absentSurface,Object.keys(value.surface).filter(e => value.surface[e]===0));
    assert.deepEqual(value.absentIncludingHidden,Object.keys(value.surface).filter(e => value.surface[e]+value.hidden[e]===0));
    assert.equal(Object.hasOwn(value,'fav'),false);
  }
});
console.log(`${passed} calendar integration tests passed`);
