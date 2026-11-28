(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const sounds = [['土','金'],['火','水'],['金','木'],['水','土'],['木','火'],['土','水'],['火','金'],['金','火'],['水','木'],['木','土']];
  const intentions = {木:'生長與伸展',火:'熱度與表達',土:'安定與承接',金:'清晰與界線',水:'流動與留白'};
  let current = 0, reading = null, nickname = '', toastTimer, cardUrl = null;
  const today = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part => [part.type,part.value]));
  const latestBirthDate = `${today.year}-${today.month}-${today.day}`;
  el('birthDate').max = latestBirthDate;
  function toast(message) {
    el('toast').textContent = message; el('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el('toast').classList.remove('show'), 3100);
  }
  function updateExtended() {
    const [first, second] = sounds[current];
    el('fullHeading').textContent = reading ? `${reading.dayMaster}${reading.dayElement}日主的聆聽起點` : `${first}與${second}的聲音意象`;
    el('fullParagraph1').textContent = reading
      ? `你的四柱為${reading.pillars.map(p => p.pair).join('、')}。八字表層以${reading.most.join('、')}出現較多，${reading.least.join('、')}較少；這是字數分布，不代表完整命理旺衰。`
      : '填寫出生資訊後，這裡會顯示你的實際四柱與五行分布摘要。你也可以只從聲音開始探索。';
    el('fullParagraph2').textContent = `目前選擇「${first}・${second}」聲景，以「${intentions[first]}」與「${intentions[second]}」為創作意象。聲景與五行的連結屬創作編排，並非 EEG 檢測結論或喜用神處方。`;
    el('mockCardTitle').textContent = reading ? `${reading.dayMaster}${reading.dayElement}日主` : `${first} · ${second}`;
    el('mockCardMessage').textContent = `${nickname ? nickname + '的' : ''}聆聽旅程 · ${first}與${second}`;
    el('cardCaption').textContent = reading ? '四柱曆法排盤 · 聲景為創作意象' : '聲景創作意象';
  }
  function selectSound(index, announce = false) {
    current = index;
    const [first, second] = sounds[current], audio = el('freeAudio');
    el('audioTitle').textContent = `${first}與${second}的聲音片段`;
    el('audioDescription').textContent = `${intentions[first]} × ${intentions[second]}`;
    el('audioStatus').textContent = '正在載入 30 秒聲景…';
    audio.pause(); audio.src = `assets/五行聲景示意_${String(current + 1).padStart(2,'0')}.mp3`; audio.load();
    document.querySelectorAll('#quickSamples button').forEach((button, i) => {
      button.classList.toggle('active', i === current); button.setAttribute('aria-pressed', String(i === current));
    });
    updateExtended();
    if (announce) toast('已切換聲景，請按播放開始聆聽。');
  }
  sounds.forEach(([first, second], index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'chip'; button.textContent = `${first}・${second}`;
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click', () => selectSound(index, true)); el('quickSamples').appendChild(button);
  });
  el('freeAudio').addEventListener('loadedmetadata', () => { el('audioStatus').textContent = `音檔已就緒 · ${Math.round(el('freeAudio').duration)} 秒`; });
  el('freeAudio').addEventListener('error', () => { el('audioStatus').textContent = '音檔無法載入，請切換組合或重新整理後再試。'; });
  function renderReading() {
    el('readingEmpty').hidden = true; el('readingContent').hidden = false;
    el('readingMode').textContent = '曆法計算結果';
    el('readingTitle').textContent = `日主 ${reading.dayMaster} · ${reading.dayElement}`;
    el('birthSummary').textContent = `${reading.calculatedTime.slice(0,16)}（UTC+8）｜農曆${reading.lunarDate}｜${reading.sect === 1 ? '23:00' : '00:00'} 換日${reading.correction ? `｜校正 ${reading.correction > 0 ? '+' : ''}${reading.correction} 分鐘` : ''}`;
    el('pillars').innerHTML = reading.pillars.map(p => `<div class="pillar"><span>${p.label}</span><strong>${p.pair}</strong><small>${p.elements.join('・')}</small></div>`).join('');
    el('readingSummary').textContent = `八字表層以${reading.most.join('、')}出現較多，${reading.least.join('、')}較少；同數量的五行一併列出。`;
    el('energyChart').innerHTML = FiveElements.elements.map(element => `<div class="energy-row"><b>${element}</b><div class="bar-track"><div class="bar-fill" style="width:${reading.surface[element] / 8 * 100}%"></div></div><span>${reading.surface[element]} / 8</span></div>`).join('');
    el('absenceSummary').textContent = reading.absentSurface.length ? `八字表層未見：${reading.absentSurface.join('、')}。另請參考藏干。` : '八字表層五行皆有出現。';
    el('hiddenDetails').innerHTML = reading.pillars.map(p => `<p><strong>${p.label} ${p.pair}</strong>｜天干十神：${p.tenGod}<br>藏干：${p.hiddenStems.map(h => `${h.stem}（${h.element}）`).join('、')}</p>`).join('');
    el('hiddenAbsence').textContent = reading.absentIncludingHidden.length ? `連同藏干仍未見：${reading.absentIncludingHidden.join('、')}。` : '連同藏干，五行皆有出現。';
    el('previewIntro').textContent = `排盤已完成。先以日主「${reading.dayElement}」選取一段聲景；你也可以自由切換，留意自己的感受。`;
  }
  el('birthForm').addEventListener('submit', event => {
    event.preventDefault();
    try {
      if (!el('acknowledge').checked) throw new Error('請先確認資料與體驗說明。');
      if (!window.FiveElements) throw new Error('排盤工具尚未載入，請重新整理後再試。');
      if (el('birthDate').value > latestBirthDate) throw new Error('出生日期不能晚於今天。');
      const result = FiveElements.calculate({date:el('birthDate').value, time:el('birthTime').value, sect:el('dayBoundary').value, correction:el('timeCorrection').value});
      reading = result; nickname = el('nickname').value.trim();
      renderReading(); selectSound({木:4,火:1,土:0,金:2,水:3}[reading.dayElement]);
      el('formStatus').textContent = '排盤完成，四柱與五行分布已顯示於下方。';
      el('resultSection').scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) { el('formStatus').textContent = error.message || '暫時無法排盤，請確認資料後再試。'; }
  });
  el('birthForm').addEventListener('input', () => { if (reading) el('readingMode').textContent = '資料已更動，請重新排盤'; });
  el('fillExample').addEventListener('click', () => {
    el('birthDate').value = '2005-12-23'; el('birthTime').value = '08:37'; el('nickname').value = '';
    el('dayBoundary').value = '2'; el('timeCorrection').value = '0'; el('acknowledge').checked = false;
    if (reading) el('readingMode').textContent = '資料已更動，請重新排盤';
    el('formStatus').textContent = '範例資料已填入，確認說明後即可排盤。';
  });
  el('clearBirth').addEventListener('click', () => {
    el('birthForm').reset(); reading = null; nickname = '';
    el('readingContent').hidden = true; el('readingEmpty').hidden = false; el('readingMode').textContent = '等待填寫';
    ['birthSummary','readingTitle','readingSummary','absenceSummary','hiddenAbsence','pillars','energyChart','hiddenDetails'].forEach(id => { el(id).textContent = ''; });
    el('previewIntro').textContent = '出生資料與排盤已清除。仍可自由切換聲景試聽。';
    el('formStatus').textContent = '資料已清除。'; updateExtended();
    if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = null; }
    el('cardPreview').removeAttribute('src'); el('downloadCard').removeAttribute('href');
  });
  el('payBtn').addEventListener('click', () => el('payDialog').showModal());
  el('previewFull').addEventListener('click', () => {
    el('payDialog').close(); el('unlockedPanel').classList.add('open');
    el('unlockedPanel').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => el(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  el('shareBtn').addEventListener('click', () => {
    const url = new URL(location.href); url.search = ''; url.searchParams.set('sound', String(current + 1)); url.hash = 'resultSection';
    el('shareLink').value = url.href; el('shareDescription').textContent = `${sounds[current].join('・')}，30 秒聲景範例。`;
    el('shareStatus').textContent = '朋友開啟連結後，就能試聽相同組合。'; el('shareDialog').showModal();
  });
  el('copyShare').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el('shareLink').value); el('shareStatus').textContent = '連結已複製，可以貼給朋友。'; }
    catch { el('shareLink').focus(); el('shareLink').select(); el('shareStatus').textContent = '請長按連結，或使用複製快捷鍵複製。'; }
  });
  const cardHero = new Image(); cardHero.src = 'assets/潚_人物主視覺.png';
  el('saveCard').addEventListener('click', async () => {
    const button = el('saveCard'); button.disabled = true;
    try {
      await cardHero.decode().catch(() => {});
      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas unavailable');
      const background = ctx.createLinearGradient(0,0,0,1920); background.addColorStop(0,'#302035'); background.addColorStop(1,'#0b0912');
      ctx.fillStyle = background; ctx.fillRect(0,0,1080,1920);
      if (cardHero.naturalWidth) ctx.drawImage(cardHero,300,0,840,682,0,0,1080,850);
      const shade = ctx.createLinearGradient(0,420,0,1100); shade.addColorStop(0,'#1c142100'); shade.addColorStop(1,'#1c1421'); ctx.fillStyle = shade; ctx.fillRect(0,420,1080,1500);
      ctx.textAlign = 'center'; ctx.fillStyle = '#efce98'; ctx.font = '40px serif'; ctx.fillText('潚 · YOUR ELEMENTAL SOUND',540,1000);
      ctx.font = 'bold 92px serif'; ctx.fillStyle = '#fff0d4'; ctx.fillText(reading ? `${reading.dayMaster}${reading.dayElement}日主` : sounds[current].join(' · '),540,1150);
      ctx.font = '38px sans-serif'; ctx.fillStyle = '#e5c5ba'; ctx.fillText(nickname ? `${nickname}的聆聽旅程` : '你的五行，有自己的聲音。',540,1250);
      ctx.font = '38px serif'; ctx.fillStyle = '#f2d8af'; ctx.fillText(`聲景意象：${sounds[current].join(' · ')}`,540,1370);
      ctx.font = '34px sans-serif'; ctx.fillStyle = '#e4dce5';
      if (reading) { ctx.fillText(reading.pillars.map(p => p.pair).join('　'),540,1490); ctx.fillText(FiveElements.elements.map(e => `${e}${reading.surface[e]}`).join('　'),540,1570); }
      else { ctx.fillText('讓聲音，成為覺察的起點。',540,1510); }
      ctx.font = '27px sans-serif'; ctx.fillStyle = '#c7bbc7'; ctx.fillText(reading ? '五行為八字表層計次，非旺衰或喜用神判定' : '五行聲景創作意象，非個人命盤結果',540,1740);
      ctx.fillText('潚然塵外 · 聲音體驗',540,1820);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png')); if (!blob) throw new Error('export failed');
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = URL.createObjectURL(blob); el('cardPreview').src = cardUrl; el('downloadCard').href = cardUrl;
      el('cardDialog').showModal();
    } catch { toast('圖卡產生失敗，請稍後再試。'); } finally { button.disabled = false; }
  });
  const requested = new URLSearchParams(location.search).get('sound');
  selectSound(/^(?:[1-9]|10)$/.test(requested || '') ? Number(requested)-1 : 0);
})();
