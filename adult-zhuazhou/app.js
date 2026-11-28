(() => {
  const $ = (id) => document.getElementById(id);
  const button = $('signup');
  let content = null;
  let selectedId = '';
  const validUrl = (value) => { if (!value || typeof value !== 'string' || !value.trim()) return ''; try { const u = new URL(value, location.origin); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  const taipei = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const today = `${taipei.year}-${taipei.month}-${taipei.day}`;
  let viewYear = Number(taipei.year);
  let viewMonth = Number(taipei.month) - 1;
  let selectedDate = '';
  let calendarInitialized = false;
  let sessionSignature = '';
  let fresh = false;
  let loadFailed = false;
  const isFull = (s) => s.soldOut || s.remaining === 0;
  const canBook = (s) => !isFull(s) && !s.closed;
  const sessionStatus = (s) => isFull(s) ? '已額滿' : s.closed ? '暫停報名' : `剩餘 ${s.remaining} 位`;
  const dateKey = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const monthPrefix = () => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  function dateTitle(key) {
    const [y, m, d] = key.split('-').map(Number);
    return `${y}年${m}月${d}日（${'日一二三四五六'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
  }
  const monthSessions = () => (content?.sessions || []).filter(s => s.date.startsWith(monthPrefix()));

  function setButton() {
    const sessions = content?.sessions || [];
    const session = sessions.find(s => s.id === selectedId);
    const target = session ? session.registrationUrl || content.registrationUrl : sessions.length ? '' : content?.registrationUrl;
    const unavailable = sessions.length && (!session || !canBook(session));
    const daySessions = sessions.filter(s => s.date === selectedDate);
    const dayUnavailable = daySessions.length && daySessions.every(s => !canBook(s));
    const url = fresh && !unavailable && validUrl(target);
    button.setAttribute('aria-disabled', String(!url));
    if (url) { button.href = url; button.target = '_blank'; button.rel = 'noopener noreferrer'; }
    else { button.removeAttribute('href'); button.removeAttribute('target'); }
    $('signup-note').textContent = !fresh ? loadFailed ? '場次資訊暫時無法更新，請稍後重試' : '場次資訊載入中' : url ? '報名將於新分頁開啟' : dayUnavailable ? '此日期的場次已額滿或暫停報名，請選其他日期' : sessions.length && !session ? '請先從月曆選擇日期與場次' : unavailable ? '這個場次已額滿或暫停報名' : '報名連結即將開放';
    $('session-feedback').textContent = session ? `${session.title}・${sessionStatus(session)}` : '';
  }

  function renderCalendar() {
    $('calendar-month').textContent = `${viewYear} 年 ${viewMonth + 1} 月`;
    const grid = $('calendar-days');
    const focusDate = grid.contains(document.activeElement) ? document.activeElement.dataset.date : '';
    grid.replaceChildren();
    const first = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const days = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const total = Math.ceil((first + days) / 7) * 7;
    const sessions = monthSessions();
    for (let cell = 0; cell < total; cell++) {
      const day = cell - first + 1;
      if (day < 1 || day > days) {
        const blank = document.createElement('span'); blank.className = 'calendar-blank'; blank.setAttribute('aria-hidden', 'true'); grid.append(blank); continue;
      }
      const date = dateKey(viewYear, viewMonth, day);
      const daySessions = sessions.filter(s => s.date === date);
      const el = document.createElement(daySessions.length ? 'button' : 'span');
      el.className = 'calendar-day';
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = day;
      el.append(number);
      if (date === today) el.classList.add('is-today');
      if (daySessions.length) {
        const available = daySessions.some(canBook);
        const full = daySessions.some(isFull);
        el.type = 'button'; el.dataset.date = date;
        el.classList.add(available ? 'is-open' : 'is-unavailable');
        el.setAttribute('aria-pressed', String(selectedDate === date));
        el.setAttribute('aria-label', `${dateTitle(date)}，${daySessions.length} 場，${available ? '尚有名額' : full ? '已額滿' : '暫停報名'}`);
        const status = document.createElement('span'); status.className = 'day-status'; status.textContent = available ? '開放' : full ? '額滿' : '暫停';
        el.append(status);
        el.addEventListener('click', () => {
          if (selectedDate !== date) selectedId = '';
          selectedDate = date; renderCalendar(); renderDaySessions(); setButton();
          grid.querySelector(`[data-date="${date}"]`)?.focus({ preventScroll: true });
        });
      } else {
        el.classList.add('no-session');
        el.setAttribute('aria-label', `${dateTitle(date)}，無場次`);
      }
      grid.append(el);
    }
    if (focusDate) grid.querySelector(`[data-date="${focusDate}"]`)?.focus({ preventScroll: true });
  }

  function renderDaySessions() {
    const options = $('session-options');
    options.querySelectorAll('label').forEach(el => el.remove());
    const sessions = (content?.sessions || []).filter(s => s.date === selectedDate);
    $('session-day-title').textContent = selectedDate ? dateTitle(selectedDate) : '';
    $('session-day-title').hidden = !selectedDate;
    $('calendar-empty').hidden = !!sessions.length;
    $('calendar-empty').textContent = !content?.sessions.length ? '場次準備中，開放後會標示在月曆上。' : monthSessions().length ? '請點選月曆上有場次的日期。' : '這個月尚未安排場次，請查看其他月份。';
    options.hidden = !sessions.length;
    sessions.forEach(s => {
      const label = document.createElement('label'); label.className = 'session-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'session'; input.value = s.id;
      input.disabled = !canBook(s); input.checked = selectedId === s.id;
      input.addEventListener('change', () => { selectedId = s.id; setButton(); });
      const details = document.createElement('span'); details.className = 'session-details';
      const title = document.createElement('span'); title.className = 'session-title'; title.textContent = s.title;
      const time = document.createElement('span'); time.className = 'session-time'; time.textContent = [s.time, s.location].filter(Boolean).join(' ｜ ') || '時間與地點將另行公告';
      const status = document.createElement('span'); status.className = 'session-status'; status.textContent = sessionStatus(s);
      details.append(title, time); label.append(input, details, status); options.append(label);
    });
    $('data-note').hidden = false;
    $('data-note').textContent = '進度預覽｜場次為發布時的資料；後台修改後需重新發布。';
  }

  function initializeCalendar() {
    const sessions = content?.sessions || [];
    const upcoming = sessions.filter(s => s.date >= today);
    const first = upcoming.find(canBook) || upcoming[0] || sessions.find(canBook) || sessions[0];
    if (first) { selectedDate = first.date; const [y, m] = first.date.split('-').map(Number); viewYear = y; viewMonth = m - 1; }
    calendarInitialized = true;
  }

  function changeMonth(offset) {
    const next = new Date(Date.UTC(viewYear, viewMonth + offset, 1));
    viewYear = next.getUTCFullYear(); viewMonth = next.getUTCMonth();
    selectedId = '';
    const sessions = monthSessions();
    selectedDate = (sessions.find(canBook) || sessions[0])?.date || '';
    renderCalendar(); renderDaySessions(); setButton();
  }
  $('previous-month').addEventListener('click', () => changeMonth(-1));
  $('next-month').addEventListener('click', () => changeMonth(1));
  renderCalendar();

  let releaseVideoBehavior = () => {};
  function configureScrollVideo(player) {
    const controls = $('film-sound-controls');
    const soundButton = $('film-sound-toggle');
    const note = $('film-playback-note');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = false;
    let userPaused = false;
    let systemPause = false;
    let observer = null;
    controls.hidden = false;
    note.hidden = true;
    function showSoundState() {
      const soundOn = !player.muted && player.volume > 0;
      soundButton.textContent = soundOn ? '點擊關閉聲音' : '點擊開啟聲音';
      soundButton.setAttribute('aria-pressed', String(soundOn));
    }
    function start(userAction = false) {
      if (document.hidden || !visible || (!userAction && (userPaused || reduceMotion || player.ended))) return;
      const request = player.play();
      if (request?.catch) request.catch(() => {
        if (player.isConnected && visible) { note.hidden = false; note.textContent = '點擊影片即可播放'; }
      });
    }
    function stop() {
      if (!player.paused) { systemPause = true; player.pause(); }
      player.muted = true;
      showSoundState();
    }
    const onPause = () => {
      if (systemPause) { systemPause = false; return; }
      if (visible && !document.hidden && !player.ended) userPaused = true;
    };
    const onPlay = () => { userPaused = false; note.hidden = true; };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onSoundClick = () => {
      const turnOn = player.muted || player.volume === 0;
      if (turnOn && player.volume === 0) player.volume = 1;
      player.muted = !turnOn;
      showSoundState();
      if (turnOn) { userPaused = false; start(true); }
    };
    player.addEventListener('volumechange', showSoundState);
    player.addEventListener('pause', onPause);
    player.addEventListener('play', onPlay);
    document.addEventListener('visibilitychange', onVisibility);
    soundButton.addEventListener('click', onSoundClick);
    showSoundState();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries[0];
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        if (!visible) stop();
        else if (entry.intersectionRatio >= 0.4) start();
      }, { threshold: [0, 0.4] });
      observer.observe(player);
    } else {
      visible = true;
      note.hidden = false; note.textContent = '點擊影片即可播放';
    }
    if (reduceMotion) { note.hidden = false; note.textContent = '點擊影片即可播放'; }
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      soundButton.removeEventListener('click', onSoundClick);
      player.removeEventListener('volumechange', showSoundState);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('play', onPlay);
      player.muted = true; player.pause();
      controls.hidden = true;
    };
  }

  let previousVideo = '';
  function renderVideo() {
    const url = validUrl(content.videoUrl);
    if (!url && previousVideo) { releaseVideoBehavior(); $('film-container').classList.remove('portrait-video'); $('film-container').innerHTML = '<div class="film-placeholder"><svg class="film-star"><use href="#star"/></svg><p>一段記憶，即將展開</p><span>影片製作中，稍後與你相遇</span></div>'; previousVideo = ''; return; }
    if (!url || url === previousVideo) return;
    releaseVideoBehavior();
    const u = new URL(url);
    let embed = '';
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(u.hostname)) {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').pop();
      if (/^[a-zA-Z0-9_-]{11}$/.test(id || '')) embed = `https://www.youtube-nocookie.com/embed/${id}`;
    } else if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(u.hostname)) {
      const id = u.pathname.split('/').pop();
      if (/^\d+$/.test(id || '')) embed = `https://player.vimeo.com/video/${id}`;
    }
    const player = document.createElement(embed ? 'iframe' : 'video');
    $('film-container').classList.remove('portrait-video');
    if (embed) { player.src = embed; player.title = '成年人的抓周活動影片'; player.allow = 'fullscreen; picture-in-picture'; player.allowFullscreen = true; player.loading = 'lazy'; }
    else {
      player.defaultMuted = true; player.muted = true; player.setAttribute('muted', '');
      player.src = url; player.controls = true; player.playsInline = true; player.preload = 'metadata';
      player.setAttribute('aria-label', '成年人的抓周活動概念影片');
      player.addEventListener('loadedmetadata', () => {
        if (player.isConnected) $('film-container').classList.toggle('portrait-video', player.videoHeight > player.videoWidth);
      });
    }
    $('film-container').replaceChildren(player);
    if (!embed) releaseVideoBehavior = configureScrollVideo(player);
    previousVideo = url;
  }

  async function refresh() {
    try {
      const response = await fetch('./content.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('讀取失敗');
      const previouslyHadSessions = !!content?.sessions.length;
      content = await response.json();
      content.sessions.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
      fresh = true; loadFailed = false;
      if (!content.sessions.some(s => s.id === selectedId && canBook(s))) selectedId = '';
      if (!calendarInitialized || (!previouslyHadSessions && content.sessions.length)) initializeCalendar();
      if (selectedDate && !content.sessions.some(s => s.date === selectedDate)) selectedDate = '';
      const signature = JSON.stringify(content.sessions);
      if (signature !== sessionSignature) { renderCalendar(); renderDaySessions(); sessionSignature = signature; }
      setButton(); renderVideo();
    } catch {
      fresh = false; loadFailed = true;
      $('calendar-empty').textContent = '場次資訊暫時無法載入，請稍後重新整理。';
      if (!content?.sessions.length) $('calendar-empty').hidden = false;
      setButton();
    }
  }

  button.addEventListener('click', (event) => { if (button.getAttribute('aria-disabled') === 'true') event.preventDefault(); });
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
