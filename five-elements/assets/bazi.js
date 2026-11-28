(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../vendor/lunar-1.7.8.js'));
  else root.FiveElements = factory(root);
})(typeof globalThis === 'object' ? globalThis : this, function (calendar) {
  'use strict';
  const elements = ['木', '火', '土', '金', '水'];
  const stemElements = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  const traditional = text => String(text).replace(/财/g,'財').replace(/伤/g,'傷').replace(/杀/g,'殺');
  const counts = () => Object.fromEntries(elements.map(element => [element, 0]));
  function calculate({date, time, sect = 2, correction = 0}) {
    if (!calendar.Solar) throw new Error('排盤工具尚未載入，請重新整理後再試。');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) throw new Error('請填寫完整的出生日期與時間。');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const raw = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (year < 1900 || year > 2099 || raw.getUTCFullYear() !== year || raw.getUTCMonth() !== month - 1 || raw.getUTCDate() !== day || hour > 23 || minute > 59) throw new Error('日期或時間無效，支援西元 1900 至 2099 年。');
    sect = Number(sect); correction = Number(correction);
    if (![1, 2].includes(sect) || !Number.isInteger(correction) || Math.abs(correction) > 180) throw new Error('請確認換日規則與時間校正值。');
    // UTC arithmetic is only used to move the input civil clock without the device's timezone.
    // All library inputs represent UTC+8 standard clock time, never a device-local Date.
    const adjusted = new Date(raw.getTime() + correction * 60000);
    if (adjusted.getUTCFullYear() < 1900 || adjusted.getUTCFullYear() > 2099) throw new Error('校正後的日期超出可計算範圍。');
    const solar = calendar.Solar.fromYmdHms(adjusted.getUTCFullYear(), adjusted.getUTCMonth()+1, adjusted.getUTCDate(), adjusted.getUTCHours(), adjusted.getUTCMinutes(), 0);
    const lunar = solar.getLunar();
    const eight = lunar.getEightChar();
    eight.setSect(sect);
    const surface = counts(), hidden = counts();
    const pillars = ['Year', 'Month', 'Day', 'Time'].map((key, index) => {
      const pair = eight['get' + key]();
      const wuxing = [...eight['get' + key + 'WuXing']()];
      wuxing.forEach(element => surface[element]++);
      const hiddenStems = eight['get' + key + 'HideGan']().map(stem => {
        const element = stemElements[stem]; hidden[element]++;
        return {stem, element};
      });
      return {label:['年柱','月柱','日柱','時柱'][index], pair, elements:wuxing, hiddenStems, tenGod:traditional(eight['get' + key + 'ShiShenGan']())};
    });
    const maximum = Math.max(...Object.values(surface)), minimum = Math.min(...Object.values(surface));
    return {
      pillars, surface, hidden,
      most:elements.filter(element => surface[element] === maximum),
      least:elements.filter(element => surface[element] === minimum),
      absentSurface:elements.filter(element => surface[element] === 0),
      absentIncludingHidden:elements.filter(element => surface[element] + hidden[element] === 0),
      dayMaster:eight.getDayGan(), dayElement:stemElements[eight.getDayGan()],
      lunarDate:traditional(lunar.toString()), calculatedTime:solar.toYmdHms(),
      inputDate:date, inputTime:time, correction, sect, timezone:'UTC+8',
      method:'四柱八字各字等量計次；地支按本氣五行計，藏干另列，不作旺衰與喜用神判定。'
    };
  }
  return {calculate, elements};
});
