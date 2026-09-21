/**
 * Word Search
 * Full Game Architecture compliant with Cocktail Lounge Universal Design System
 */

(() => {
  'use strict';

  // --- Constants & Config ---
  const STORAGE_KEY = 'cocktail_wordsearch_state_v2';
  const CSV_FILE = 'puzzles.csv';
  const HOME_PORTAL_URL = 'https://tileworksgamesstudio.github.io/86/';
  const FUTURE_EXT_URL = '#';

  // Application State
  const STATE = {
    puzzles: [],
    todayPuzzle: null,
    activePuzzle: null,
    activeTier: 'mini',
    gridSize: 8,
    gridData: null,
    placedWords: [],
    foundWords: new Set(),
    foundCoords: new Set(),
    isSelecting: false,
    startCell: null,
    currentCoords: [],
    timerSeconds: 0,
    timerInterval: null,
    isSolved: false,
    serverDate: null,
    settings: {
      bgAnimation: true
    },
    userData: {
      stats: { played: 0, solved: 0, streak: 0, bestStreak: 0 },
      history: {}
    }
  };

  // DOM Elements Cache
  const DOM = {
    viewError: document.getElementById('viewError'),
    errorMsg: document.getElementById('errorMsg'),
    btnRetry: document.getElementById('btnRetry'),
    viewMenu: document.getElementById('viewMenu'),
    viewGame: document.getElementById('viewGame'),
    viewVault: document.getElementById('viewVault'),

    linkHome: document.getElementById('linkHome'),
    lblPlayAction: document.getElementById('lblPlayAction'),
    lblPlayTheme: document.getElementById('lblPlayTheme'),
    btnPlayGame: document.getElementById('btnPlayGame'),
    btnOpenVault: document.getElementById('btnOpenVault'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnOpenRules: document.getElementById('btnOpenRules'),

    btnOpenStats: document.getElementById('btnOpenStats'),
    btnShareGame: document.getElementById('btnShareGame'),
    btnUtilityPlus: document.getElementById('btnUtilityPlus'),

    btnGameBack: document.getElementById('btnGameBack'),
    btnVaultBack: document.getElementById('btnVaultBack'),
    gameTitle: document.getElementById('gameTitle'),
    gameTimer: document.getElementById('gameTimer'),
    tierTabs: document.querySelectorAll('.tier-tab'),
    wordCounter: document.getElementById('wordCounter'),
    currentSelection: document.getElementById('currentSelection'),
    grid: document.getElementById('grid'),
    wordList: document.getElementById('wordList'),
    vaultList: document.getElementById('vaultList'),

    panelHowToPlay: document.getElementById('panelHowToPlay'),
    btnCloseRules: document.getElementById('btnCloseRules'),
    btnAcknowledgeRules: document.getElementById('btnAcknowledgeRules'),

    modalSettings: document.getElementById('modalSettings'),
    btnToggleAnimation: document.getElementById('btnToggleAnimation'),
    lblAnimationState: document.getElementById('lblAnimationState'),

    modalStats: document.getElementById('modalStats'),
    statPlayed: document.getElementById('statPlayed'),
    statSolved: document.getElementById('statSolved'),
    statStreak: document.getElementById('statStreak'),
    statBestStreak: document.getElementById('statBestStreak'),

    modalVictory: document.getElementById('modalVictory'),
    victoryText: document.getElementById('victoryText'),
    btnVictoryNext: document.getElementById('btnVictoryNext'),

    appToast: document.getElementById('appToast'),
    iconAtmosphere: document.getElementById('iconAtmosphere')
  };

  // --- Safe Local Storage ---
  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.stats) {
          STATE.userData.stats.played = Number(parsed.stats.played) || 0;
          STATE.userData.stats.solved = Number(parsed.stats.solved) || 0;
          STATE.userData.stats.streak = Number(parsed.stats.streak) || 0;
          STATE.userData.stats.bestStreak = Number(parsed.stats.bestStreak) || 0;
        }
        if (parsed.history && typeof parsed.history === 'object') {
          STATE.userData.history = parsed.history;
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          if (typeof parsed.settings.bgAnimation === 'boolean') {
            STATE.settings.bgAnimation = parsed.settings.bgAnimation;
          }
        }
      }
    } catch (_) {}
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stats: STATE.userData.stats,
        history: STATE.userData.history,
        settings: STATE.settings
      }));
    } catch (_) {}
  }

  // --- Authoritative Internet-Derived Time Strategy ---
  async function resolveAuthoritativeDate() {
    try {
      const headRes = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = headRes.headers.get('date');
      const now = dateHeader ? new Date(dateHeader) : new Date();
      return formatLondonISODate(now);
    } catch (_) {
      return formatLondonISODate(new Date());
    }
  }

  function formatLondonISODate(d) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  function formatDisplayDate(isoStr) {
    if (!isoStr) return '';
    try {
      const [y, m, d] = isoStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (_) {
      return isoStr;
    }
  }

  // --- Toast Feedback ---
  let toastTimer = null;
  function showToast(msg) {
    DOM.appToast.textContent = msg;
    DOM.appToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.appToast.classList.remove('visible');
    }, 2400);
  }

  // --- Cocktail Lounge Garnish Flight System ---
  const GARNISH_SVGS = [
    // 1. Orange Twist
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19c-3-3-2-8 1-11s8-5 11-2-2 9-5 12c-4 4-10 4-7-1"/></svg>`,
    // 2. Lemon Twist
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16c-4-2-4-8 0-10s8-3 10 1-2 7-6 9-8 3-4 0"/></svg>`,
    // 3. Lime Wheel
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l7.5-4.5M12 12l-7.5-4.5M12 12v9M12 12l7.5 4.5M12 12l-7.5 4.5"/></svg>`,
    // 4. Grapefruit Wheel
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l8.5-5M12 12L3.5 7M12 12v10M12 12l8.5 5M12 12l-8.5 5M12 12l-5-8.5M12 12l5-8.5"/></svg>`,
    // 5. Blood Orange
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" stroke-dasharray="2 2"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/></svg>`,
    // 6. Dehydrated Citrus
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4.9 0-9-4-9-9 0-5 3.9-9 8.8-9 5.2 0 9.2 4.2 9.2 9.3 0 4.8-4 8.7-9 8.7z" stroke-dasharray="4 2"/><path d="M12 12l5-6M12 12l-6-5M12 12l-6 6M12 12l5 6M12 12v6"/></svg>`,
    // 7. Cocktail Cherry
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="16" r="4"/><path d="M10 12c0-5 3-9 8-9"/></svg>`,
    // 8. Double Cherry
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="17" r="4"/><circle cx="17" cy="15" r="4"/><path d="M7 13c0-6 3-10 8-10s7 4 7 8"/></svg>`,
    // 9. Mint Sprig
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V10M12 10c-3-2-6 1-4 4 1 2 4 2 4-4zM12 10c3-2 6 1 4 4-1 2-4 2-4-4zM12 14c-4-1-6 3-3 5 2 2 4 0 3-5zM12 14c4-1 6 3 3 5-2 2-4 0-3-5zM12 6c-2-3-4-1-2 2 1 1 2 1 2-2zM12 6c2-3 4-1 2 2-1 1-2 1-2-2z"/></svg>`,
    // 10. Rosemary Sprig
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C10 14 14 8 12 2M12 8c-2-2-4 0-2 2M12 12c-2-1-3 1-2 2M13 6c2-1 3 1 2 2M12 16c-3-1-4 1-2 3M12 10c2-1 4 1 3 2M12 14c2-1 4 1 3 2M12 4c-2 0-3 1-2 2"/></svg>`,
    // 11. Green Olive
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="6" ry="8" transform="rotate(45 12 12)"/><path d="M16 8c-1-1-3 0-3 1s1 2 2 1 2-1 1-2z"/></svg>`,
    // 12. Cucumber Ribbon
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4c4-2 8 2 8 6s-4 8-8 10M18 4c-4-2-8 2-8 6s4 8 8 10"/></svg>`
  ];

  function initAtmosphere() {
    DOM.iconAtmosphere.innerHTML = '';
    const depths = ['depth-bg', 'depth-mid', 'depth-fore'];
    const count = 8; // Maintain 6-9 visible garnishes

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const depth = depths[i % depths.length];
      el.className = `floating-garnish ${depth}`;
      el.innerHTML = GARNISH_SVGS[i % GARNISH_SVGS.length];

      const leftPos = Math.round((i / count) * 94 + (Math.random() * 3));
      // Slower, calmer animations (25s - 45s)
      const duration = depth === 'depth-bg' ? 38 + Math.random() * 12 :
                       depth === 'depth-mid' ? 30 + Math.random() * 10 :
                       24 + Math.random() * 8;
      
      const delay = -(Math.random() * duration).toFixed(1);
      const drift = (Math.random() * 40 - 20).toFixed(0);
      
      // Calm rotation
      const rotStart = (Math.random() * 90 - 45).toFixed(0);
      const rotEnd = (parseInt(rotStart) + (Math.random() * 60 - 30)).toFixed(0);

      el.style.left = `${leftPos}%`;
      el.style.animationDuration = `${duration}s`;
      el.style.animationDelay = `${delay}s`;
      el.style.setProperty('--drift-x', `${drift}px`);
      el.style.setProperty('--rot-start', `${rotStart}deg`);
      el.style.setProperty('--rot-end', `${rotEnd}deg`);

      DOM.iconAtmosphere.appendChild(el);
    }

    applyAnimationSetting();
  }

  function applyAnimationSetting() {
    const isMotionDisabled = !STATE.settings.bgAnimation;
    document.body.classList.toggle('motion-disabled', isMotionDisabled);
    DOM.btnToggleAnimation.setAttribute('aria-checked', STATE.settings.bgAnimation ? 'true' : 'false');
    DOM.lblAnimationState.textContent = STATE.settings.bgAnimation ? 'On' : 'Off';
  }

  // --- Deterministic RNG ---
  function createRNG(seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // --- Grid Generation ---
  function generateBoard(words, size, seedKey) {
    const rng = createRNG(seedKey);
    const grid = Array.from({ length: size }, () => Array(size).fill(''));
    const placed = [];

    const dirs = [
      [0, 1], [1, 0], [1, 1], [-1, 1],
      [0, -1], [-1, 0], [-1, -1], [1, -1]
    ];

    const cleanWords = words
      .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
      .filter(w => w.length >= 2 && w.length <= size)
      .sort((a, b) => b.length - a.length);

    cleanWords.forEach(word => {
      let isPlaced = false;
      for (let attempt = 0; attempt < 120 && !isPlaced; attempt++) {
        const [dr, dc] = dirs[Math.floor(rng() * dirs.length)];
        const minR = dr < 0 ? word.length - 1 : 0;
        const maxR = dr > 0 ? size - word.length : size - 1;
        const minC = dc < 0 ? word.length - 1 : 0;
        const maxC = dc > 0 ? size - word.length : size - 1;

        if (minR > maxR || minC > maxC) continue;

        const r = Math.floor(rng() * (maxR - minR + 1)) + minR;
        const c = Math.floor(rng() * (maxC - minC + 1)) + minC;

        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const cell = grid[r + dr * i][c + dc * i];
          if (cell !== '' && cell !== word[i]) {
            fits = false;
            break;
          }
        }

        if (fits) {
          const coords = [];
          for (let i = 0; i < word.length; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            grid[nr][nc] = word[i];
            coords.push(`${nr},${nc}`);
          }
          placed.push({ word, coords });
          isPlaced = true;
        }
      }
    });

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(rng() * alphabet.length)];
      }
    }

    return { grid, placed };
  }

  // --- CSV Parser ---
  function parseCSV(text) {
    const lines = [];
    let row = [], token = '', inQuote = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuote) {
        if (ch === '"' && next === '"') { token += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { token += ch; }
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { row.push(token.trim()); token = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (token || row.length) { row.push(token.trim()); lines.push(row); }
          row = []; token = '';
          if (ch === '\r' && next === '\n') i++;
        } else {
          token += ch;
        }
      }
    }
    if (token || row.length) { row.push(token.trim()); lines.push(row); }
    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim());
    return lines.slice(1).map(line => {
      const rec = {};
      headers.forEach((h, idx) => { rec[h] = line[idx] || ''; });
      return rec;
    });
  }

  // --- Navigation & Views ---
  function showView(viewId) {
    DOM.viewError.classList.add('hidden');
    DOM.viewMenu.classList.toggle('hidden', viewId !== 'menu');
    DOM.viewGame.classList.toggle('hidden', viewId !== 'game');
    DOM.viewVault.classList.toggle('hidden', viewId !== 'vault');

    if (viewId === 'menu') renderMenu();
    if (viewId === 'vault') renderVault();
  }

  function renderMenu() {
    const puzzle = STATE.todayPuzzle;
    if (!puzzle) return;
    DOM.lblPlayAction.textContent = 'Play';
    DOM.lblPlayTheme.textContent = puzzle.title || 'Daily Blend';
  }

  function renderVault() {
    DOM.vaultList.innerHTML = '';
    const today = STATE.serverDate;
    const past = STATE.puzzles.filter(p => p.date < today);

    if (!past.length) {
      DOM.vaultList.innerHTML = '<p class="text-center dialog-subtitle" style="padding: 24px;">No past ledgers available yet.</p>';
      return;
    }

    past.forEach(p => {
      const item = document.createElement('div');
      item.className = 'vault-card';
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');

      const isDone = tier => !!STATE.userData.history[`${p.date}_${tier}`];

      item.innerHTML = `
        <div>
          <div class="vault-title">${p.title}</div>
          <div class="vault-date">${formatDisplayDate(p.date)}</div>
        </div>
        <div class="vault-badges">
          <span class="vault-badge ${isDone('mini') ? 'solved' : ''}">Mini</span>
          <span class="vault-badge ${isDone('midi') ? 'solved' : ''}">Midi</span>
          <span class="vault-badge ${isDone('main') ? 'solved' : ''}">Main</span>
        </div>
      `;

      const launch = () => {
        STATE.activePuzzle = p;
        startTier('mini');
      };

      item.addEventListener('click', launch);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          launch();
        }
      });

      DOM.vaultList.appendChild(item);
    });
  }

  // --- How To Play Panel (Single-Axis Right -> Left) ---
  function openRulesPanel() {
    DOM.panelHowToPlay.classList.remove('hidden');
    void DOM.panelHowToPlay.offsetWidth;
    DOM.panelHowToPlay.classList.add('open');
  }

  function closeRulesPanel() {
    DOM.panelHowToPlay.classList.remove('open');
    setTimeout(() => {
      if (!DOM.panelHowToPlay.classList.contains('open')) {
        DOM.panelHowToPlay.classList.add('hidden');
      }
    }, 450);
  }

  // --- Gameplay Setup & Board Flow ---
  function startTier(tier) {
    STATE.activeTier = tier;
    STATE.gridSize = tier === 'mini' ? 8 : tier === 'midi' ? 10 : 12;

    const puzzle = STATE.activePuzzle || STATE.todayPuzzle;
    const wordsRaw = puzzle[tier] || '';
    const words = wordsRaw.split(',').map(w => w.trim()).filter(Boolean);

    const seed = `${puzzle.date}_${tier}`;
    const generated = generateBoard(words, STATE.gridSize, seed);

    STATE.gridData = generated.grid;
    STATE.placedWords = generated.placed;
    STATE.foundWords = new Set();
    STATE.foundCoords = new Set();
    STATE.currentCoords = [];
    STATE.isSelecting = false;
    STATE.startCell = null;

    DOM.gameTitle.textContent = `${puzzle.title} (${tier.toUpperCase()})`;
    DOM.tierTabs.forEach(tab => {
      const isActive = tab.dataset.tier === tier;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const key = `${puzzle.date}_${tier}`;
    const past = STATE.userData.history[key];
    STATE.isSolved = !!past;

    if (STATE.isSolved) {
      STATE.timerSeconds = past.time || 0;
      clearInterval(STATE.timerInterval);
      STATE.placedWords.forEach(pw => {
        STATE.foundWords.add(pw.word);
        pw.coords.forEach(c => STATE.foundCoords.add(c));
      });
    } else {
      STATE.timerSeconds = 0;
      startTimer();
    }

    updateTimerDisplay();
    renderBoard();
    renderWordList();
    updateStatus();
    showView('game');
  }

  function renderBoard() {
    DOM.grid.innerHTML = '';
    DOM.grid.className = `word-grid grid-${STATE.gridSize}`;

    for (let r = 0; r < STATE.gridSize; r++) {
      for (let c = 0; c < STATE.gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.textContent = STATE.gridData[r][c];
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'gridcell');
        if (STATE.foundCoords.has(`${r},${c}`)) cell.classList.add('found');
        DOM.grid.appendChild(cell);
      }
    }
  }

  function renderWordList() {
    DOM.wordList.innerHTML = '';
    STATE.placedWords.forEach(({ word }) => {
      const li = document.createElement('li');
      li.className = 'word-chip';
      li.dataset.word = word;
      li.textContent = word;
      if (STATE.foundWords.has(word)) li.classList.add('found');
      DOM.wordList.appendChild(li);
    });
  }

  function updateStatus() {
    DOM.wordCounter.textContent = `${STATE.foundWords.size} / ${STATE.placedWords.length}`;
    if (STATE.currentCoords.length > 0) {
      const text = STATE.currentCoords.map(c => STATE.gridData[c.r][c.c]).join('');
      DOM.currentSelection.textContent = text;
    } else {
      DOM.currentSelection.textContent = STATE.isSolved ? 'Completed!' : 'Select letters';
    }
  }

  // --- Timer Operations ---
  function startTimer() {
    clearInterval(STATE.timerInterval);
    STATE.timerInterval = setInterval(() => {
      if (!STATE.isSolved) {
        STATE.timerSeconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(STATE.timerSeconds / 60)).padStart(2, '0');
    const s = String(STATE.timerSeconds % 60).padStart(2, '0');
    DOM.gameTimer.textContent = `${m}:${s}`;
  }

  // --- Selection Geometry & Validation ---
  function getLine(r0, c0, r1, c1) {
    const dr = r1 - r0;
    const dc = c1 - c0;
    const absR = Math.abs(dr);
    const absC = Math.abs(dc);

    if (absR !== 0 && absC !== 0 && absR !== absC) return null;

    const stepR = dr === 0 ? 0 : dr / absR;
    const stepC = dc === 0 ? 0 : dc / absC;
    const len = Math.max(absR, absC);

    const coords = [];
    for (let i = 0; i <= len; i++) {
      coords.push({ r: r0 + stepR * i, c: c0 + stepC * i });
    }
    return coords;
  }

  function getCellFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.classList.contains('grid-cell')) {
      return { r: parseInt(el.dataset.row, 10), c: parseInt(el.dataset.col, 10) };
    }
    return null;
  }

  function applyHighlight(coords) {
    const cells = DOM.grid.children;
    for (let i = 0; i < cells.length; i++) cells[i].classList.remove('selecting');
    if (!coords) return;
    coords.forEach(({ r, c }) => {
      const idx = r * STATE.gridSize + c;
      if (cells[idx]) cells[idx].classList.add('selecting');
    });
  }

  function checkSelection(coords) {
    const forward = coords.map(p => STATE.gridData[p.r][p.c]).join('');
    const backward = [...forward].reverse().join('');

    const match = STATE.placedWords.find(pw =>
      !STATE.foundWords.has(pw.word) && (pw.word === forward || pw.word === backward)
    );

    if (match) {
      STATE.foundWords.add(match.word);
      coords.forEach(p => {
        STATE.foundCoords.add(`${p.r},${p.c}`);
        const idx = p.r * STATE.gridSize + p.c;
        if (DOM.grid.children[idx]) DOM.grid.children[idx].classList.add('found');
      });

      const chip = DOM.wordList.querySelector(`[data-word="${match.word}"]`);
      if (chip) chip.classList.add('found');

      if (STATE.foundWords.size >= STATE.placedWords.length) {
        onPuzzleComplete();
      }
    }
  }

  function onPuzzleComplete() {
    STATE.isSolved = true;
    clearInterval(STATE.timerInterval);

    const key = `${STATE.activePuzzle.date}_${STATE.activeTier}`;
    if (!STATE.userData.history[key]) {
      STATE.userData.history[key] = { time: STATE.timerSeconds, solved: true };
      STATE.userData.stats.played++;
      STATE.userData.stats.solved++;
      STATE.userData.stats.streak++;
      if (STATE.userData.stats.streak > STATE.userData.stats.bestStreak) {
        STATE.userData.stats.bestStreak = STATE.userData.stats.streak;
      }
      saveStorage();
    }

    DOM.victoryText.textContent = `Completed ${STATE.activeTier.toUpperCase()} in ${DOM.gameTimer.textContent}.`;
    DOM.btnVictoryNext.textContent = STATE.activeTier === 'mini' ? 'Play Midi' :
                                    STATE.activeTier === 'midi' ? 'Play Main' : 'Back to Menu';
    DOM.modalVictory.showModal();
  }

  // --- Sharing Strategy ---
  async function handleShare() {
    const shareData = {
      title: 'Word Search',
      text: 'Find all hidden words in today\'s Cocktail Lounge Word Search.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard');
      } else {
        showToast('Share: ' + window.location.href);
      }
    } catch (_) {
      showToast('Share: ' + window.location.href);
    }
  }

  // --- Event Bindings & Single-Tap Optimization ---
  function bindEvents() {
    DOM.linkHome.setAttribute('href', HOME_PORTAL_URL);

    DOM.btnPlayGame.addEventListener('click', () => {
      STATE.activePuzzle = STATE.todayPuzzle;
      startTier('mini');
    });

    DOM.btnOpenVault.addEventListener('click', () => showView('vault'));
    DOM.btnVaultBack.addEventListener('click', () => showView('menu'));

    DOM.btnOpenSettings.addEventListener('click', () => {
      DOM.modalSettings.showModal();
    });

    DOM.btnToggleAnimation.addEventListener('click', () => {
      STATE.settings.bgAnimation = !STATE.settings.bgAnimation;
      saveStorage();
      applyAnimationSetting();
    });

    DOM.btnOpenRules.addEventListener('click', openRulesPanel);
    DOM.btnCloseRules.addEventListener('click', closeRulesPanel);
    DOM.btnAcknowledgeRules.addEventListener('click', closeRulesPanel);

    DOM.panelHowToPlay.addEventListener('click', e => {
      if (e.target === DOM.panelHowToPlay) closeRulesPanel();
    });

    DOM.btnOpenStats.addEventListener('click', () => {
      DOM.statPlayed.textContent = STATE.userData.stats.played;
      DOM.statSolved.textContent = STATE.userData.stats.solved;
      DOM.statStreak.textContent = STATE.userData.stats.streak;
      DOM.statBestStreak.textContent = STATE.userData.stats.bestStreak;
      DOM.modalStats.showModal();
    });

    DOM.btnShareGame.addEventListener('click', handleShare);

    DOM.btnUtilityPlus.addEventListener('click', () => {
      if (FUTURE_EXT_URL && FUTURE_EXT_URL !== '#') {
        window.open(FUTURE_EXT_URL, '_blank', 'noopener,noreferrer');
      } else {
        showToast('Features forthcoming.');
      }
    });

    DOM.btnGameBack.addEventListener('click', () => {
      clearInterval(STATE.timerInterval);
      showView('menu');
    });

    DOM.tierTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tier = tab.dataset.tier;
        if (tier !== STATE.activeTier) startTier(tier);
      });
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById(btn.dataset.close);
        if (modal) modal.close();
      });
    });

    DOM.btnVictoryNext.addEventListener('click', () => {
      DOM.modalVictory.close();
      if (STATE.activeTier === 'mini') startTier('midi');
      else if (STATE.activeTier === 'midi') startTier('main');
      else showView('menu');
    });

    // Pointer event interaction without delay or double-tap requirement
    DOM.grid.addEventListener('pointerdown', e => {
      if (STATE.isSolved) return;
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      STATE.isSelecting = true;
      STATE.startCell = cell;
      STATE.currentCoords = [cell];
      applyHighlight(STATE.currentCoords);
      updateStatus();
    });

    window.addEventListener('pointermove', e => {
      if (!STATE.isSelecting || !STATE.startCell) return;
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      const line = getLine(STATE.startCell.r, STATE.startCell.c, cell.r, cell.c);
      if (line) {
        STATE.currentCoords = line;
        applyHighlight(line);
        updateStatus();
      }
    });

    const finalizeSelection = () => {
      if (!STATE.isSelecting) return;
      STATE.isSelecting = false;
      applyHighlight(null);
      if (STATE.currentCoords.length > 1) {
        checkSelection(STATE.currentCoords);
      }
      STATE.currentCoords = [];
      STATE.startCell = null;
      updateStatus();
    };

    window.addEventListener('pointerup', finalizeSelection);
    window.addEventListener('pointercancel', finalizeSelection);

    DOM.btnRetry.addEventListener('click', initApp);
  }

  // --- Application Bootstrap ---
  async function initApp() {
    loadStorage();
    initAtmosphere();

    try {
      STATE.serverDate = await resolveAuthoritativeDate();
      const res = await fetch(CSV_FILE, { cache: 'no-store' });
      if (!res.ok) throw new Error('Unable to fetch puzzle ledgers');
      const text = await res.text();
      const rows = parseCSV(text);

      if (!rows.length) throw new Error('Puzzle dataset is empty');

      STATE.puzzles = rows.sort((a, b) => b.date.localeCompare(a.date));

      STATE.todayPuzzle = STATE.puzzles.find(p => p.date === STATE.serverDate) ||
                          STATE.puzzles.find(p => p.date <= STATE.serverDate) ||
                          STATE.puzzles[0];

      STATE.activePuzzle = STATE.todayPuzzle;

      bindEvents();
      showView('menu');
    } catch (err) {
      DOM.viewMenu.classList.add('hidden');
      DOM.viewGame.classList.add('hidden');
      DOM.viewVault.classList.add('hidden');
      DOM.viewError.classList.remove('hidden');
      DOM.errorMsg.textContent = err.message || 'Unable to load puzzle records.';
    }
  }

  initApp();
})();