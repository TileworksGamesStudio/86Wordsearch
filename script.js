/**
 * Word Search — The Cocktail Lounge Edition
 * Handcrafted Visual, Ambient & Audio System
 */

(() => {
  'use strict';

  // Config & Permanent Identity
  const STORAGE_KEY = 'wordsearch_save_v1';
  const CSV_FILE = 'puzzles.csv';
  const HOME_URL = 'https://tileworksgamesstudio.github.io/86/'; // Destination placeholder configured by project owner

  // Application State
  const STATE = {
    puzzles: [],
    todayPuzzle: null,
    activePuzzle: null,
    activeTier: 'mini', // 'mini' | 'midi' | 'main'
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
    userData: {
      stats: { played: 0, solved: 0, streak: 0, bestStreak: 0 },
      history: {} // [puzzleDate_tier]: { time: number, solved: boolean }
    }
  };

  // DOM Elements
  const DOM = {
    viewError: document.getElementById('viewError'),
    errorMsg: document.getElementById('errorMsg'),
    btnRetry: document.getElementById('btnRetry'),
    viewMenu: document.getElementById('viewMenu'),
    viewGame: document.getElementById('viewGame'),
    viewVault: document.getElementById('viewVault'),

    menuDate: document.getElementById('menuDate'),
    dailyPuzzleTheme: document.getElementById('dailyPuzzleTheme'),
    statusMini: document.getElementById('statusMini'),
    statusMidi: document.getElementById('statusMidi'),
    statusMain: document.getElementById('statusMain'),
    btnPlayMini: document.getElementById('btnPlayMini'),
    btnPlayMidi: document.getElementById('btnPlayMidi'),
    btnPlayMain: document.getElementById('btnPlayMain'),

    btnOpenVault: document.getElementById('btnOpenVault'),
    linkHome: document.getElementById('linkHome'),
    btnOpenRules: document.getElementById('btnOpenRules'),
    btnOpenStats: document.getElementById('btnOpenStats'),

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

    modalStats: document.getElementById('modalStats'),
    modalRules: document.getElementById('modalRules'),
    modalVictory: document.getElementById('modalVictory'),
    victoryText: document.getElementById('victoryText'),
    btnVictoryNext: document.getElementById('btnVictoryNext'),

    statPlayed: document.getElementById('statPlayed'),
    statSolved: document.getElementById('statSolved'),
    statStreak: document.getElementById('statStreak'),
    statBestStreak: document.getElementById('statBestStreak'),

    garnishStage: document.getElementById('garnishStage')
  };

  // ==========================================================================
  // Subtle Cocktail Lounge Audio System (Pure Web Audio Synthesizer)
  // Fail-safe, gesture-unlocked, luxurious restraint.
  // ==========================================================================
  const AUDIO = (() => {
    let ctx = null;
    let enabled = true;

    function getContext() {
      if (!enabled) return null;
      try {
        if (!ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) ctx = new AudioContextClass();
        }
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (_) {
        enabled = false;
      }
      return ctx;
    }

    function unlock() {
      getContext();
    }

    function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.04, pitchDecay = true) {
      try {
        const c = getContext();
        if (!c || c.state !== 'running') return;
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = type;
        const now = c.currentTime;
        osc.frequency.setValueAtTime(freq, now);
        if (pitchDecay) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.7), now + duration);
        }

        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch (_) {}
    }

    return {
      unlock,
      tap: () => playTone(680, 'sine', 0.04, 0.03, true),
      cellTick: () => playTone(1200, 'triangle', 0.03, 0.015, false),
      wordFound: () => {
        try {
          const c = getContext();
          if (!c || c.state !== 'running') return;
          const now = c.currentTime;
          [784, 987.77, 1318.5].forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0.035, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.28);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.28);
          });
        } catch (_) {}
      },
      victory: () => {
        try {
          const c = getContext();
          if (!c || c.state !== 'running') return;
          const now = c.currentTime;
          const chord = [523.25, 659.25, 783.99, 1046.5];
          chord.forEach((freq, idx) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.04, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.8);
          });
        } catch (_) {}
      }
    };
  })();

  // ==========================================================================
  // EXACTLY 12 COCKTAIL GARNISH VECTOR TEMPLATES
  // ==========================================================================
  const GARNISH_SVGS = [
    // 1. Orange twist
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 50 C20 40, 26 22, 40 20 C54 18, 52 38, 36 42 C20 46, 24 16, 48 12" stroke="url(#garnishGrad)"/></svg>`,
    // 2. Lemon twist
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M46 14 C36 12, 18 20, 20 34 C22 48, 44 42, 42 26 C40 10, 16 28, 14 48" stroke="url(#garnishGrad)"/></svg>`,
    // 3. Lime wheel
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="24" stroke="url(#garnishGrad)"/><circle cx="32" cy="32" r="20" stroke="url(#garnishGrad)" stroke-opacity="0.5"/><path d="M32 12 L32 52 M12 32 L52 32 M18 18 L46 46 M18 46 L46 18" stroke="url(#garnishGrad)" stroke-opacity="0.6"/></svg>`,
    // 4. Lemon wheel
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="25" stroke="url(#garnishGrad)"/><circle cx="32" cy="32" r="21" stroke="url(#garnishGrad)" stroke-opacity="0.45"/><circle cx="32" cy="32" r="3" fill="url(#garnishGrad)"/><path d="M32 11 L32 29 M32 35 L32 53 M11 32 L29 32 M35 32 L53 32 M17 17 L29 29 M35 35 L47 47 M17 47 L29 35 M35 29 L47 17" stroke="url(#garnishGrad)"/></svg>`,
    // 5. Dehydrated orange wheel
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><circle cx="32" cy="32" r="25" stroke="url(#garnishGrad)" stroke-dasharray="4 2"/><circle cx="32" cy="32" r="19" stroke="url(#garnishGrad)" stroke-opacity="0.7"/><circle cx="32" cy="32" r="5" stroke="url(#garnishGrad)"/><path d="M32 13 L32 27 M32 37 L32 51 M13 32 L27 32 M37 32 L51 32" stroke="url(#garnishGrad)"/></svg>`,
    // 6. Dehydrated lemon wheel
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="32" cy="32" r="24" stroke="url(#garnishGrad)"/><circle cx="32" cy="32" r="18" stroke="url(#garnishGrad)" stroke-dasharray="5 3"/><path d="M32 14 V50 M14 32 H50 M19 19 L45 45 M19 45 L45 19" stroke="url(#garnishGrad)" stroke-opacity="0.5"/></svg>`,
    // 7. Cocktail cherry
    `<svg viewBox="0 0 64 64" fill="none"><circle cx="28" cy="40" r="15" fill="url(#garnishGrad)" opacity="0.85"/><path d="M28 25 C30 15, 38 8, 48 8" stroke="url(#garnishGrad)" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    // 8. Maraschino cherry pair
    `<svg viewBox="0 0 64 64" fill="none"><circle cx="22" cy="42" r="12" fill="url(#garnishGrad)" opacity="0.8"/><circle cx="42" cy="42" r="12" fill="url(#garnishGrad)" opacity="0.85"/><path d="M22 30 C24 16, 32 12, 34 8 C36 12, 40 18, 42 30" stroke="url(#garnishGrad)" stroke-width="2.2" stroke-linecap="round"/><path d="M34 8 Q39 6 44 10" stroke="url(#garnishGrad)" stroke-width="2"/></svg>`,
    // 9. Mint sprig
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M32 52 L32 16" stroke="url(#garnishGrad)"/><path d="M32 36 C22 34 16 26 20 18 C28 16 32 26 32 36 Z" fill="url(#garnishGrad)" opacity="0.55"/><path d="M32 36 C42 34 48 26 44 18 C36 16 32 26 32 36 Z" fill="url(#garnishGrad)" opacity="0.55"/><path d="M32 20 C26 12 32 6 32 6 C32 6 38 12 32 20 Z" fill="url(#garnishGrad)" opacity="0.6"/></svg>`,
    // 10. Rosemary sprig
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M32 56 V10" stroke="url(#garnishGrad)" stroke-width="2.2"/><path d="M32 46 L20 40 M32 42 L44 36 M32 34 L18 28 M32 30 L46 24 M32 22 L20 16 M32 18 L44 12" stroke="url(#garnishGrad)"/></svg>`,
    // 11. Green olive
    `<svg viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="34" rx="16" ry="20" fill="url(#garnishGrad)" opacity="0.85"/><ellipse cx="32" cy="24" rx="6" ry="4" fill="#1A0A05"/><line x1="32" y1="6" x2="32" y2="58" stroke="url(#garnishGrad)" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    // 12. Cucumber ribbon
    `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 48 C20 44 26 50 34 46 C42 42 46 22 36 18 C26 14 18 32 30 36 C42 40 50 30 52 14" stroke="url(#garnishGrad)" stroke-linecap="round"/><path d="M16 48 C24 44 30 50 38 46" stroke="url(#garnishGrad)" stroke-opacity="0.5"/></svg>`
  ];

  // SVG Shared Gradient Definition
  const SVG_GRAD_DEF = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <linearGradient id="garnishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F7E5A0" />
          <stop offset="45%" stop-color="#D55E24" />
          <stop offset="100%" stop-color="#7C2C0E" />
        </linearGradient>
      </defs>
    </svg>
  `;

  // ==========================================================================
  // Animated Cocktail Garnish Engine (Restrained, Randomized Floating System)
  // ==========================================================================
  function initGarnishBackground() {
    if (!DOM.garnishStage) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    DOM.garnishStage.insertAdjacentHTML('beforebegin', SVG_GRAD_DEF);

    const isMobile = window.innerWidth < 560;
    const maxActive = isMobile ? 8 : 14;
    let currentCount = 0;

    function spawnGarnish() {
      if (currentCount >= maxActive) return;

      const el = document.createElement('div');
      const typeIdx = Math.floor(Math.random() * GARNISH_SVGS.length);
      const depthVal = Math.random();
      const depthClass = depthVal < 0.4 ? 'depth-distant' : depthVal < 0.8 ? 'depth-middle' : 'depth-near';

      el.className = `garnish-item ${depthClass}`;
      el.innerHTML = GARNISH_SVGS[typeIdx];

      const startX = Math.random() * 92 + 4; // 4vw to 96vw
      const baseScale = depthVal < 0.4 ? 0.65 : depthVal < 0.8 ? 0.95 : 1.25;
      const sizePx = 46 * baseScale;
      el.style.width = `${sizePx}px`;
      el.style.height = `${sizePx}px`;
      el.style.left = `${startX}vw`;

      // Movement configuration
      const duration = (depthVal < 0.4 ? 32 : depthVal < 0.8 ? 24 : 18) + Math.random() * 8;
      const driftX = (Math.random() - 0.5) * (depthVal < 0.4 ? 40 : 80);
      const startRot = Math.random() * 360;
      const endRot = startRot + (Math.random() - 0.5) * 180;

      DOM.garnishStage.appendChild(el);
      currentCount++;

      const keyframes = [
        {
          transform: `translate3d(0, 0, 0) rotate(${startRot}deg) scale(${baseScale})`,
          opacity: 0
        },
        {
          opacity: el.classList.contains('depth-near') ? 0.42 : el.classList.contains('depth-middle') ? 0.28 : 0.16,
          offset: 0.15
        },
        {
          opacity: el.classList.contains('depth-near') ? 0.42 : el.classList.contains('depth-middle') ? 0.28 : 0.16,
          offset: 0.85
        },
        {
          transform: `translate3d(${driftX}px, calc(-100vh - 120px), 0) rotate(${endRot}deg) scale(${baseScale * 1.05})`,
          opacity: 0
        }
      ];

      const anim = el.animate(keyframes, {
        duration: duration * 1000,
        easing: 'linear'
      });

      anim.onfinish = () => {
        el.remove();
        currentCount--;
      };
    }

    // Initial stagger spawn
    for (let i = 0; i < maxActive; i++) {
      setTimeout(() => spawnGarnish(), i * 1400);
    }
    // Continuous random interval spawning
    setInterval(() => {
      spawnGarnish();
    }, 2800);
  }

  // --- Defensive Storage ---
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
      }
    } catch (_) {
      STATE.userData = {
        stats: { played: 0, solved: 0, streak: 0, bestStreak: 0 },
        history: {}
      };
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.userData));
    } catch (_) {}
  }

  // --- Date Utility ---
  function getLondonISODate() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
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

    DOM.menuDate.textContent = formatDisplayDate(puzzle.date);
    DOM.dailyPuzzleTheme.textContent = puzzle.title || 'Daily Reserve';

    ['mini', 'midi', 'main'].forEach(tier => {
      const isSolved = !!STATE.userData.history[`${puzzle.date}_${tier}`];
      const el = DOM[`status${tier.charAt(0).toUpperCase() + tier.slice(1)}`];
      if (el) {
        el.textContent = isSolved ? 'Solved' : 'Unsolved';
        el.classList.toggle('solved', isSolved);
      }
    });
  }

  function renderVault() {
    DOM.vaultList.innerHTML = '';
    const today = getLondonISODate();
    const past = STATE.puzzles.filter(p => p.date < today);

    if (!past.length) {
      DOM.vaultList.innerHTML = '<p class="text-center subtitle" style="padding: 28px;">No previous vintages archived in the vault yet.</p>';
      return;
    }

    past.forEach(p => {
      const item = document.createElement('div');
      item.className = 'vault-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');

      const isDone = tier => !!STATE.userData.history[`${p.date}_${tier}`];

      item.innerHTML = `
        <div class="vault-meta">
          <strong>${p.title}</strong>
          <div class="subtitle">${formatDisplayDate(p.date)}</div>
        </div>
        <div class="vault-badges">
          <span class="badge ${isDone('mini') ? 'done' : ''}">Mini</span>
          <span class="badge ${isDone('midi') ? 'done' : ''}">Midi</span>
          <span class="badge ${isDone('main') ? 'done' : ''}">Main</span>
        </div>
      `;

      const launch = () => {
        AUDIO.tap();
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

  // --- Gameplay Setup ---
  function startTier(tier) {
    STATE.activeTier = tier;
    STATE.gridSize = tier === 'mini' ? 8 : tier === 'midi' ? 10 : 12;

    const puzzle = STATE.activePuzzle;
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

    // Check completion status
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
      DOM.currentSelection.textContent = STATE.isSolved ? 'Completed' : 'Drag across letters to select';
    }
  }

  // --- Timer ---
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

  // --- Selection Geometry ---
  function getLine(r0, c0, r1, c1) {
    const dr = r1 - r0;
    const dc = c1 - c0;
    const absR = Math.abs(dr);
    const absC = Math.abs(dc);

    // Only allow horizontal, vertical, or 45-degree diagonal
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
      AUDIO.wordFound();
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
    AUDIO.victory();

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

    DOM.victoryText.textContent = `Completed in ${DOM.gameTimer.textContent}.`;
    DOM.btnVictoryNext.textContent = STATE.activeTier === 'mini' ? 'Play Midi' :
                                    STATE.activeTier === 'midi' ? 'Play Main' : 'Back to Menu';
    DOM.modalVictory.showModal();
  }

  // --- Events Binding ---
  function bindEvents() {
    // Audio unlock listener for any initial user gesture
    window.addEventListener('pointerdown', AUDIO.unlock, { once: true });
    window.addEventListener('keydown', AUDIO.unlock, { once: true });

    // 1. Daily Puzzle
    DOM.btnPlayMini.addEventListener('click', () => { AUDIO.tap(); STATE.activePuzzle = STATE.todayPuzzle; startTier('mini'); });
    DOM.btnPlayMidi.addEventListener('click', () => { AUDIO.tap(); STATE.activePuzzle = STATE.todayPuzzle; startTier('midi'); });
    DOM.btnPlayMain.addEventListener('click', () => { AUDIO.tap(); STATE.activePuzzle = STATE.todayPuzzle; startTier('main'); });

    // 2. Vault
    DOM.btnOpenVault.addEventListener('click', () => { AUDIO.tap(); showView('vault'); });
    DOM.btnVaultBack.addEventListener('click', () => { AUDIO.tap(); showView('menu'); });

    // 3. Home
    DOM.linkHome.setAttribute('href', HOME_URL);
    DOM.linkHome.addEventListener('click', () => AUDIO.tap());

    // Gameplay navigation (Game -> Back -> Game Menu)
    DOM.btnGameBack.addEventListener('click', () => {
      AUDIO.tap();
      clearInterval(STATE.timerInterval);
      showView('menu');
    });

    // In-game Tier Switches
    DOM.tierTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        AUDIO.tap();
        const tier = tab.dataset.tier;
        if (tier !== STATE.activeTier) startTier(tier);
      });
    });

    // Modals
    DOM.btnOpenRules.addEventListener('click', () => { AUDIO.tap(); DOM.modalRules.showModal(); });
    DOM.btnOpenStats.addEventListener('click', () => {
      AUDIO.tap();
      DOM.statPlayed.textContent = STATE.userData.stats.played;
      DOM.statSolved.textContent = STATE.userData.stats.solved;
      DOM.statStreak.textContent = STATE.userData.stats.streak;
      DOM.statBestStreak.textContent = STATE.userData.stats.bestStreak;
      DOM.modalStats.showModal();
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        AUDIO.tap();
        const modal = document.getElementById(btn.dataset.close);
        if (modal) modal.close();
      });
    });

    DOM.btnVictoryNext.addEventListener('click', () => {
      AUDIO.tap();
      DOM.modalVictory.close();
      if (STATE.activeTier === 'mini') startTier('midi');
      else if (STATE.activeTier === 'midi') startTier('main');
      else showView('menu');
    });

    // Board Pointer Interactions
    DOM.grid.addEventListener('pointerdown', e => {
      if (STATE.isSolved) return;
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      AUDIO.cellTick();
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
        if (line.length !== STATE.currentCoords.length) {
          AUDIO.cellTick();
        }
        STATE.currentCoords = line;
        applyHighlight(line);
        updateStatus();
      }
    });

    const endSelection = () => {
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

    window.addEventListener('pointerup', endSelection);
    window.addEventListener('pointercancel', endSelection);
    DOM.btnRetry.addEventListener('click', () => {
      AUDIO.tap();
      init();
    });
  }

  // --- Initialization ---
  async function init() {
    loadStorage();
    initGarnishBackground();
    try {
      const res = await fetch(CSV_FILE, { cache: 'no-store' });
      if (!res.ok) throw new Error('Puzzle CSV not found');
      const text = await res.text();
      const rows = parseCSV(text);

      if (!rows.length) throw new Error('No puzzles found in data file');

      // Sort newest to oldest
      STATE.puzzles = rows.sort((a, b) => b.date.localeCompare(a.date));
      const today = getLondonISODate();

      // Today's puzzle or fallback to most recent
      STATE.todayPuzzle = STATE.puzzles.find(p => p.date === today) ||
                          STATE.puzzles.find(p => p.date <= today) ||
                          STATE.puzzles[0];

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

  init();
})();