// Pro Countdown — app.js
(function(){
  const STORAGE = 'proct_timers_v1';
  const form = document.getElementById('timerForm');
  const titleEl = document.getElementById('title');
  const dateEl = document.getElementById('date');
  const timeEl = document.getElementById('time');
  const soundEl = document.getElementById('sound');
  const formMsg = document.getElementById('formMsg');
  const listEl = document.getElementById('timersList');
  const emptyEl = document.getElementById('empty');
  const themeBtn = document.getElementById('themeBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const clearAllBtn = document.getElementById('clearAll');

  let timers = [];
  let ticker = null;

  // small helpers
  const uid = ()=> 't_'+Math.random().toString(36).slice(2,9);
  const fmt = ms => {
    if(ms <= 0) return '00d 00:00:00';
    const s = Math.floor(ms/1000);
    const sec = s % 60;
    const min = Math.floor(s/60) % 60;
    const hr = Math.floor(s/3600) % 24;
    const days = Math.floor(s/86400);
    const p = (n, l = 2) => String(n).padStart(l, '0');
    return `${p(days)}d ${p(hr)}:${p(min)}:${p(sec)}`;
  };

  // load / save
  function load(){
    try {
      const raw = localStorage.getItem(STORAGE);
      timers = raw ? JSON.parse(raw) : [];
    } catch (e) {
      timers = [];
      console.error('Failed to load timers', e);
    }
  }
  function save(){
    try { localStorage.setItem(STORAGE, JSON.stringify(timers)); } catch(e){ console.error('Save failed', e); }
  }

  // render timers
  function render(){
    listEl.innerHTML = '';
    if(!timers.length){
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    timers.forEach(t => {
      const el = document.createElement('div');
      el.className = 'timer';
      if(t.finished) el.classList.add('finished');

      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = t.title || 'Untitled';
      const target = document.createElement('div');
      target.className = 'target';
      target.textContent = new Date(t.target).toLocaleString();
      meta.appendChild(title);
      meta.appendChild(target);

      const count = document.createElement('div');
      count.className = 'count';
      count.id = 'c_' + t.id;
      const remaining = new Date(t.target).getTime() - Date.now();
      count.textContent = fmt(remaining);
      if(remaining <= 60000 && remaining > 0) count.classList.add('warn');
      if(remaining <= 10000 && remaining > 0) count.classList.add('danger');

      const actions = document.createElement('div');
      actions.className = 'actions';
      const toggle = document.createElement('button');
      toggle.className = 'btn ghost';
      toggle.textContent = (t.running && !t.finished) ? 'Pause' : 'Start';
      toggle.addEventListener('click', () => toggleTimer(t.id));
      const reset = document.createElement('button');
      reset.className = 'btn';
      reset.textContent = 'Reset';
      reset.addEventListener('click', () => resetTimer(t.id));
      const del = document.createElement('button');
      del.className = 'btn ghost';
      del.textContent = 'Delete';
      del.addEventListener('click', () => { if (confirm('Delete this timer?')) deleteTimer(t.id); });

      actions.appendChild(toggle);
      actions.appendChild(reset);
      actions.appendChild(del);

      el.appendChild(meta);
      el.appendChild(count);
      el.appendChild(actions);
      listEl.appendChild(el);

      if(t.finished){
        const badge = document.createElement('div');
        badge.className = 'finished-badge';
        badge.textContent = 'Completed';
        meta.appendChild(badge);
      }
    });
  }

  // ticker
  function startTicker(){
    if(ticker) return;
    ticker = setInterval(() => {
      const now = Date.now();
      let changed = false;
      timers.forEach(t => {
        const rem = new Date(t.target).getTime() - now;
        const el = document.getElementById('c_' + t.id);
        if(el) el.textContent = fmt(rem);
        if(t.running && !t.finished && rem <= 0){
          t.finished = true;
          t.running = false;
          changed = true;
          triggerFinish(t);
        }
      });
      if(changed){ save(); render(); }
    }, 1000);
  }

  function stopIfIdle(){
    if(!timers.some(t => t.running && !t.finished) && ticker){
      clearInterval(ticker);
      ticker = null;
    }
  }
  setInterval(stopIfIdle, 2000);

  // actions
  function addTimer(title, targetISO, sound){
    timers.unshift({ id: uid(), title, target: targetISO, running: true, finished: false, sound });
    save();
    render();
    startTicker();
  }

  function toggleTimer(id){
    timers = timers.map(t => {
      if(t.id === id){
        if(t.finished) return t;
        t.running = !t.running;
        if(t.running && new Date(t.target).getTime() <= Date.now()){
          t.finished = true;
          t.running = false;
          triggerFinish(t);
        }
      }
      return t;
    });
    save();
    render();
  }

  function resetTimer(id){
    const t = timers.find(x => x.id === id);
    if(!t) return;
    if(t.finished){
      t.finished = false;
      t.running = true;
    } else {
      const targetMs = new Date(t.target).getTime();
      if(targetMs <= Date.now()){
        t.target = new Date(Date.now() + 60 * 1000).toISOString();
        t.running = true;
      } else {
        t.running = true;
      }
    }
    save();
    render();
  }

  function deleteTimer(id){
    timers = timers.filter(t => t.id !== id);
    save();
    render();
  }

  function clearAll(){
    if(confirm('Clear ALL timers?')){
      timers = [];
      save();
      render();
    }
  }

  // finish behavior
  function triggerFinish(t){
    try {
      const a = document.getElementById(t.sound === 'chime' ? 'alarmChime' : 'alarmBeep');
      if(a){
        a.currentTime = 0;
        a.play().catch(()=>{/* autoplay may block until user interacts */});
      }
    } catch(e){ console.error(e); }

    if('Notification' in window && Notification.permission === 'granted'){
      new Notification('Timer finished', { body: t.title });
    } else if('Notification' in window && Notification.permission !== 'denied'){
      Notification.requestPermission().then(p => { if(p === 'granted') new Notification('Timer finished', { body: t.title }); }).catch(()=>{});
    }

    const el = document.getElementById('c_' + t.id);
    if(el) el.classList.add('pulse');
  }

  // export / import
  function exportTimers(){
    try {
      const data = JSON.stringify(timers);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'procountdown-timers.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch(e){ console.error('Export failed', e); }
  }

  function importTimers(){
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = e => {
        try {
          const arr = JSON.parse(e.target.result);
          if(Array.isArray(arr)){
            timers = arr;
            save();
            render();
            alert('Imported');
          } else {
            alert('Invalid file format');
          }
        } catch(err){
          alert('Invalid file');
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  // wire form
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const title = titleEl.value.trim();
    const date = dateEl.value;
    const time = timeEl.value;
    const sound = soundEl.value;

    if(!title){
      formMsg.textContent = 'Please add a title';
      formMsg.style.color = 'var(--danger)';
      return;
    }
    if(!date || !time){
      formMsg.textContent = 'Please choose date and time';
      formMsg.style.color = 'var(--warn)';
      return;
    }

    const target = new Date(date + 'T' + time);
    if(isNaN(target)){
      formMsg.textContent = 'Invalid date/time';
      formMsg.style.color = 'var(--danger)';
      return;
    }
    if(target.getTime() <= Date.now()){
      formMsg.textContent = 'Choose a future date/time';
      formMsg.style.color = 'var(--warn)';
      return;
    }

    addTimer(title, target.toISOString(), sound);
    formMsg.textContent = 'Timer added';
    formMsg.style.color = '';
    titleEl.value = '';
    titleEl.focus();
    setTimeout(()=> formMsg.textContent = '', 2200);
  });

  // theme toggle
  themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme');
    if(cur === 'dark'){
      root.removeAttribute('data-theme');
      themeBtn.textContent = '🌙 Theme';
      themeBtn.setAttribute('aria-pressed', 'false');
    } else {
      root.setAttribute('data-theme', 'dark');
      themeBtn.textContent = '☀️ Theme';
      themeBtn.setAttribute('aria-pressed', 'true');
    }
  });

  exportBtn.addEventListener('click', exportTimers);
  importBtn.addEventListener('click', importTimers);
  clearAllBtn.addEventListener('click', clearAll);

  // init
  load();
  render();
  if(timers.some(t => t.running && !t.finished)) startTicker();
  // expose for debugging
  window._proct = { timers, load, save, render };
})();
