/* ============================================================
   Дейликард — прототип
   Бесконечные карточки со словами, три попытки, колоды и слова.
   Данные хранятся локально (localStorage), формат — обычный JSON.
   ============================================================ */
(function () {
  'use strict';

  const PARAMS = new URLSearchParams(location.search);
  const IS_TEST = PARAMS.has('test');
  const IS_APP = PARAMS.has('app');
  const STORAGE_KEY = IS_TEST ? 'dailycard.test.v2' : 'dailycard.data.v2';

  /* ---------------- утилиты ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[.,!?;:¿¡"'«»()\-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  const icon = (name, cls) =>
    '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';

  const LOGO =
    '<svg class="brand-logo" viewBox="0 0 40 40" aria-hidden="true">' +
      '<rect width="40" height="40" rx="12" fill="#0B57D0"/>' +
      '<circle cx="35" cy="5" r="12" fill="#7FB0FF" opacity="0.55"/>' +
      '<g transform="rotate(-13 16 22)"><rect x="8" y="12" width="13" height="18" rx="3" fill="#fff" opacity="0.62"/></g>' +
      '<g transform="rotate(4 23 20)"><rect x="16" y="9" width="14" height="19" rx="3" fill="#fff"/></g>' +
      '<rect x="19.5" y="15" width="7" height="1.7" rx="0.85" fill="#BCD4FF"/>' +
      '<rect x="19.5" y="19" width="5" height="1.7" rx="0.85" fill="#D8E5FF"/>' +
    '</svg>';

  /* ---------------- данные ---------------- */
  function makeWord(word, meanings, synonyms) {
    return { id: uid('word'), word: word, meanings: meanings.slice(), synonyms: (synonyms || []).slice() };
  }

  function makeDeck(name, enabled, words) {
    return { id: uid('deck'), name: name, enabled: !!enabled, words: words || [] };
  }

  function seedState() {
    const english = makeDeck('Английский · базовые слова', true, [
      makeWord('apple', ['яблоко']),
      makeWord('house', ['дом']),
      makeWord('to learn', ['учиться', 'изучать']),
      makeWord('although', ['хотя', 'несмотря на']),
      makeWord('journey', ['путешествие']),
      makeWord('reliable', ['надёжный', 'надежный'], ['верный']),
      makeWord('to improve', ['улучшать']),
      makeWord('knowledge', ['знание']),
      makeWord('schedule', ['расписание']),
      makeWord('to achieve', ['достигать']),
      makeWord('neighbour', ['сосед']),
      makeWord('careful', ['внимательный', 'осторожный']),
      makeWord('brave', ['смелый', 'храбрый'], ['отважный']),
      makeWord('quiet', ['тихий'], ['безмолвный']),
      makeWord('to borrow', ['одалживать', 'брать взаймы']),
      makeWord('fragile', ['хрупкий']),
      makeWord('honest', ['честный'], ['правдивый']),
      makeWord('to wander', ['бродить', 'скитаться']),
      makeWord('sudden', ['внезапный']),
      makeWord('whole', ['целый', 'весь'])
    ]);

    const spanish = makeDeck('Испанский · простые слова', false, [
      makeWord('hola', ['привет']),
      makeWord('gracias', ['спасибо']),
      makeWord('casa', ['дом']),
      makeWord('libro', ['книга']),
      makeWord('amigo', ['друг']),
      makeWord('agua', ['вода']),
      makeWord('comer', ['есть']),
      makeWord('hablar', ['говорить'])
    ]);

    return {
      version: 2,
      theme: 'light',
      activeDeckId: english.id,
      decks: [english, spanish]
    };
  }

  function sanitizeTheme(t) {
    return t === 'dark' || t === 'system' || t === 'light' ? t : 'light';
  }

  function uniqueStrings(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach((v) => {
      const s = String(v == null ? '' : v).trim().slice(0, 120);
      if (s && !out.some((x) => norm(x) === norm(s))) out.push(s);
    });
    return out;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object') return seedState();
    const base = seedState();
    const state = {
      version: 2,
      theme: sanitizeTheme(raw.theme),
      activeDeckId: null,
      decks: []
    };

    const decks = Array.isArray(raw.decks) ? raw.decks : [];
    const usedDeck = new Set();
    const usedWord = new Set();

    decks.forEach((d) => {
      if (!d || typeof d !== 'object') return;
      let id = typeof d.id === 'string' && d.id ? d.id : uid('deck');
      if (usedDeck.has(id)) id = uid('deck');
      usedDeck.add(id);
      const deck = {
        id: id,
        name: String(d.name || 'Колода').trim().slice(0, 60) || 'Колода',
        enabled: d.enabled !== false,
        words: []
      };
      const words = Array.isArray(d.words) ? d.words : [];
      words.forEach((w) => {
        if (!w || typeof w !== 'object') return;
        const wordText = String(w.word || '').trim().slice(0, 80);
        if (!wordText) return;
        let wid = typeof w.id === 'string' && w.id ? w.id : uid('word');
        if (usedWord.has(wid)) wid = uid('word');
        usedWord.add(wid);
        deck.words.push({
          id: wid,
          word: wordText,
          meanings: uniqueStrings(w.meanings),
          synonyms: uniqueStrings(w.synonyms)
        });
      });
      state.decks.push(deck);
    });

    if (!state.decks.length) state.decks = base.decks;
    if (!state.decks.some((d) => d.enabled)) state.decks[0].enabled = true;

    const wanted = typeof raw.activeDeckId === 'string' ? raw.activeDeckId : null;
    state.activeDeckId =
      (state.decks.find((d) => d.id === wanted) && wanted) ||
      (state.decks.find((d) => d.enabled) || state.decks[0]).id;

    return state;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : seedState();
    } catch (e) {
      return seedState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showSnack('Не удалось сохранить данные', 'info');
    }
  }

  // Первый запуск: сразу сохраняем стартовый набор, чтобы он пережил перезагрузку.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

  const getDeck = (id) => state.decks.find((d) => d.id === id) || null;
  const enabledDecks = () => state.decks.filter((d) => d.enabled);
  const getWord = (deckId, wordId) => {
    const d = getDeck(deckId);
    return d ? d.words.find((w) => w.id === wordId) || null : null;
  };

  /* ---------------- тема ---------------- */
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolvedTheme() {
    if (state.theme === 'system') return media && media.matches ? 'dark' : 'light';
    return state.theme;
  }

  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A101B' : '#F3F7FF');
    // В Android-приложении подкрашиваем системные панели под тему.
    try {
      if (window.DailycardAndroid && window.DailycardAndroid.setTheme) {
        window.DailycardAndroid.setTheme(t === 'dark');
      }
    } catch (e) {}
  }

  if (media && media.addEventListener) {
    media.addEventListener('change', () => {
      if (state.theme === 'system') {
        applyTheme();
        if (route().name === 'settings') renderAppbar(route());
      }
    });
  }

  /* ---------------- маршруты ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h === 'decks') return { name: 'decks' };
    if (h === 'settings') return { name: 'settings' };
    if (h.indexOf('deck/') === 0) return { name: 'deck', id: decodeURIComponent(h.slice(5)) };
    return { name: 'home' };
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  const VIEW = $('#view');
  const APPBAR = $('#appbar');

  /* ---------------- снекбар ---------------- */
  function showSnack(text, iconName, ms) {
    const root = $('#snackbarRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'snackbar';
    el.innerHTML = icon(iconName || 'check', 'sm') + '<span>' + esc(text) + '</span>';
    root.appendChild(el);
    window.setTimeout(() => {
      el.classList.add('out');
      window.setTimeout(() => el.remove(), 300);
    }, ms || 2600);
  }

  /* ---------------- модальные окна ---------------- */
  let modalOpen = false;
  const modalRoot = $('#modalRoot');

  function openModal(inner) {
    closeModal();
    modalRoot.innerHTML = '<div class="scrim">' + inner + '</div>';
    const scrim = $('.scrim', modalRoot);
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) closeModal();
    });
    document.body.style.overflow = 'hidden';
    modalOpen = true;
  }

  function closeModal() {
    if (!modalRoot) return;
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
    modalOpen = false;
  }

  /* ---------------- главный экран ---------------- */
  let home = null;

  function buildPool() {
    const pool = [];
    enabledDecks().forEach((deck) => {
      deck.words.forEach((word) => {
        if (word.meanings.length) pool.push({ deck: deck, word: word });
      });
    });
    return pool;
  }

  function randomEntry() {
    const pool = home.pool;
    if (pool.length === 1) return pool[0];
    for (let i = 0; i < 8; i++) {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      if (!home.current || candidate.word.id !== home.current.word.id) return candidate;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderAttempts(count, pop) {
    const wrap = $('#attempts');
    if (!wrap) return;
    let html = '';
    for (let i = 0; i < 3; i++) {
      const spent = i >= count;
      const isNew = pop && i === count;
      html += '<span class="attempt' + (spent ? ' spent' : '') + (isNew ? ' pop' : '') + '"></span>';
    }
    wrap.innerHTML = html;
    wrap.setAttribute('aria-label', 'Осталось попыток: ' + count);
  }

  function announce(text) {
    const live = $('#live');
    if (live) live.textContent = text;
  }

  function nextCard(animate) {
    if (!home) return;
    const entry = randomEntry();
    if (!entry) return;

    home.current = { word: entry.word, deck: entry.deck };
    home.attempts = 3;
    home.lock = false;

    const card = $('#frontCard');
    const wordEl = $('#cardWord');
    const deckEl = $('#cardDeck');
    const input = $('#answerInput');
    const field = $('#answerField');
    const form = $('#answerForm');
    if (!card || !wordEl || !deckEl || !input) return;

    card.className = 'stack-card front';
    const text = entry.word.word;
    wordEl.textContent = text;
    wordEl.className =
      'card-word' + (text.length > 18 ? ' xlong' : text.length > 11 ? ' long' : '');

    deckEl.innerHTML = icon('cards', 'sm') + esc(entry.deck.name);
    deckEl.setAttribute('title', entry.deck.name);

    input.value = '';
    field.classList.remove('error', 'shake');
    form.classList.remove('busy');
    renderAttempts(3, false);

    if (animate) {
      card.classList.add('enter');
      window.setTimeout(() => card.classList.remove('enter'), 560);
    }

    announce('Слово: ' + text);

    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      input.focus({ preventScroll: true });
    }
  }

  function onCorrect() {
    if (!home || home.lock) return;
    home.lock = true;
    const card = $('#frontCard');
    const form = $('#answerForm');
    form.classList.add('busy');
    card.classList.add('correct');
    announce('Верно!');
    window.setTimeout(() => card.classList.add('fly-right'), 170);
    window.setTimeout(() => {
      form.classList.remove('busy');
      nextCard(true);
    }, 700);
  }

  function onWrong() {
    if (!home || home.lock) return;
    home.lock = true;
    home.attempts -= 1;

    const card = $('#frontCard');
    const field = $('#answerField');
    const input = $('#answerInput');
    const form = $('#answerForm');

    renderAttempts(home.attempts, true);
    form.classList.add('busy');
    card.classList.remove('wrong', 'shake');
    void card.offsetWidth;
    card.classList.add('wrong', 'shake');
    field.classList.add('error', 'shake');
    input.value = '';

    window.setTimeout(() => {
      field.classList.remove('shake');
      card.classList.remove('shake');
    }, 430);

    const answer = home.current.word.meanings.join(', ');

    if (home.attempts > 0) {
      announce(
        'Неверно. Осталось ' +
          home.attempts +
          ' ' +
          plural(home.attempts, 'попытка', 'попытки', 'попыток')
      );
      window.setTimeout(() => {
        card.classList.remove('wrong');
        field.classList.remove('error');
        form.classList.remove('busy');
        home.lock = false;
        input.focus({ preventScroll: true });
      }, 640);
    } else {
      announce('Попытки закончились. Правильный ответ: ' + answer);
      showSnack('Правильный ответ: ' + answer, 'info', 4200);
      window.setTimeout(() => card.classList.add('fly-left'), 480);
      window.setTimeout(() => {
        form.classList.remove('busy');
        nextCard(true);
      }, 1020);
    }
  }

  function submitAnswer(value) {
    if (!home || home.lock) return;
    const accepted = home.current.word.meanings.concat(home.current.word.synonyms || []);
    const ok = accepted.some((a) => norm(a) === norm(value));
    if (ok) onCorrect();
    else onWrong();
  }

  function initHome(pool) {
    home = { pool: pool, current: null, attempts: 3, lock: false, lastEntry: null };
    renderAttempts(3, false);

    const form = $('#answerForm');
    const input = $('#answerInput');
    const field = $('#answerField');

    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!home || home.lock) return;
      const value = input.value.trim();
      if (!value) {
        field.classList.add('shake');
        window.setTimeout(() => field.classList.remove('shake'), 420);
        input.focus();
        return;
      }
      submitAnswer(value);
    });

    input.addEventListener('input', () => {
      field.classList.remove('error');
    });

    nextCard(true);
  }

  function homeEmptyHTML() {
    return (
      '<div class="home">' +
        '<div class="empty-state">' +
          '<div class="empty-art">' + icon('cards') + '</div>' +
          '<h2>Пока нечего учить</h2>' +
          '<p>Добавьте колоду и хотя бы одно слово с переводом — карточки появятся здесь.</p>' +
          '<button class="btn btn-filled" data-act="to-decks">' + icon('plus', 'sm') + 'Перейти к колодам</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderHome() {
    const pool = buildPool();
    if (!pool.length) {
      VIEW.innerHTML = homeEmptyHTML();
      return;
    }
    VIEW.innerHTML =
      '<div class="home">' +
        '<div class="stack-area">' +
          '<div class="stack">' +
            '<div class="stack-card back back-3"></div>' +
            '<div class="stack-card back back-2"></div>' +
            '<div class="stack-card back back-1"></div>' +
            '<div class="stack-card front" id="frontCard">' +
              '<div class="card-top">' +
                '<span class="card-kicker">Слово</span>' +
                '<span class="card-spark">' + icon('spark', 'sm') + '</span>' +
              '</div>' +
              '<div class="card-word" id="cardWord"></div>' +
              '<div class="card-bottom">' +
                '<span class="card-deck" id="cardDeck"></span>' +
                '<span class="card-hint">Введите значение</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="attempts" id="attempts" role="img" aria-label="Осталось попыток: 3"></div>' +
        '<form class="answer-form" id="answerForm" autocomplete="off" novalidate>' +
          '<div class="answer-field" id="answerField">' +
            '<input id="answerInput" type="text" placeholder="Введите перевод" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" aria-label="Ваш ответ">' +
            '<button class="send-btn" type="submit" aria-label="Проверить ответ">' + icon('send') + '</button>' +
          '</div>' +
        '</form>' +
        '<div class="sr-only" id="live" aria-live="polite"></div>' +
      '</div>';
    initHome(pool);
  }

  /* ---------------- колоды ---------------- */
  function deckRowHTML(deck) {
    const words = deck.words.length;
    const initial = (deck.name.trim().charAt(0) || 'К').toUpperCase();
    return (
      '<div class="deck-row' + (deck.enabled ? '' : ' off') + '">' +
        '<div class="deck-avatar" aria-hidden="true">' + esc(initial) + '</div>' +
        '<button class="deck-main" data-act="open-deck" data-id="' + deck.id + '">' +
          '<span class="deck-name">' + esc(deck.name) + '</span>' +
          '<span class="deck-meta">' + words + ' ' + plural(words, 'слово', 'слова', 'слов') +
            (deck.enabled ? '' : ' · выключена') +
          '</span>' +
        '</button>' +
        '<button class="switch" role="switch" aria-checked="' + (deck.enabled ? 'true' : 'false') + '"' +
          ' aria-label="' + (deck.enabled ? 'Выключить' : 'Включить') + ' колоду ' + esc(deck.name) + '"' +
          ' data-act="toggle-deck" data-id="' + deck.id + '"><span></span></button>' +
        '<button class="icon-btn small ghost" data-act="edit-deck" data-id="' + deck.id + '"' +
          ' aria-label="Редактировать колоду ' + esc(deck.name) + '">' + icon('pencil', 'sm') + '</button>' +
      '</div>'
    );
  }

  function renderDecks() {
    const enabled = enabledDecks().length;
    const total = state.decks.length;
    let inner;
    if (!total) {
      inner =
        '<div class="empty-state" style="padding:34px 16px 26px">' +
          '<div class="empty-art">' + icon('cards') + '</div>' +
          '<h2>Колод пока нет</h2>' +
          '<p>Создайте первую колоду — затем добавьте в неё слова.</p>' +
        '</div>';
    } else {
      inner = '<div class="deck-list">' + state.decks.map(deckRowHTML).join('') + '</div>';
    }

    VIEW.innerHTML =
      '<div class="page">' +
        '<div class="page-meta">' + total + ' ' + plural(total, 'колода', 'колоды', 'колод') +
          ' · включено <b>' + enabled + '</b></div>' +
        inner +
        '<button class="add-full" data-act="new-deck">' + icon('plus') + 'Добавить колоду</button>' +
        '<p class="footnote">Хотя бы одна колода должна быть включена</p>' +
      '</div>';
  }

  function renderDeck(id) {
    const deck = getDeck(id);
    if (!deck) {
      VIEW.innerHTML =
        '<div class="page">' +
          '<div class="empty-state" style="padding:50px 16px">' +
            '<div class="empty-art">' + icon('cards') + '</div>' +
            '<h2>Колода не найдена</h2>' +
            '<p>Возможно, она была удалена.</p>' +
            '<button class="btn btn-filled" data-act="to-decks">К колодам</button>' +
          '</div>' +
        '</div>';
      return;
    }

    if (state.activeDeckId !== deck.id) {
      state.activeDeckId = deck.id;
      saveState();
    }

    const addTop =
      '<button class="add-full top" data-act="new-word" data-deck="' + deck.id + '">' +
        icon('plus') + 'Новое слово' +
      '</button>';

    let list;
    if (!deck.words.length) {
      list =
        '<div class="empty-state" style="padding:30px 16px 26px">' +
          '<div class="empty-art">' + icon('cards') + '</div>' +
          '<h2>Пока нет слов</h2>' +
          '<p>Добавьте слово и его значения — оно сразу попадёт в карточки.</p>' +
        '</div>';
    } else {
      list =
        '<div class="word-list">' +
          deck.words
            .map(function (w) {
              const preview = w.meanings.join(' · ') || 'Без значения';
              return (
                '<div class="word-row">' +
                  '<button class="word-main" data-act="edit-word" data-deck="' + deck.id + '" data-word="' + w.id + '">' +
                    '<span class="word-title">' + esc(w.word) + '</span>' +
                    '<span class="word-sub">' + esc(preview) + '</span>' +
                  '</button>' +
                  '<button class="icon-btn small ghost" data-act="edit-word" data-deck="' + deck.id + '" data-word="' + w.id + '"' +
                    ' aria-label="Редактировать слово ' + esc(w.word) + '">' + icon('pencil', 'sm') + '</button>' +
                '</div>'
              );
            })
            .join('') +
        '</div>';
    }

    VIEW.innerHTML =
      '<div class="page">' +
        addTop +
        list +
        (deck.words.length
          ? '<button class="add-full" data-act="new-word" data-deck="' + deck.id + '">' + icon('plus') + 'Новое слово</button>'
          : '') +
        '<p class="footnote">' +
          (deck.enabled
            ? 'Колода включена — её слова участвуют в тренировке'
            : 'Колода выключена — её слова не показываются на главной') +
        '</p>' +
      '</div>';
  }

  /* ---------------- настройки ---------------- */
  function renderSettings() {
    const items = [
      { key: 'light', label: 'Светлая', iconName: 'sun' },
      { key: 'dark', label: 'Тёмная', iconName: 'moon' },
      { key: 'system', label: 'Как в системе', iconName: 'system' }
    ];
    VIEW.innerHTML =
      '<div class="page">' +
        '<div class="section-label">Оформление</div>' +
        '<div class="settings-card" role="radiogroup" aria-label="Тема оформления">' +
          items
            .map(function (it) {
              const active = state.theme === it.key;
              return (
                '<button class="theme-row' + (active ? ' active' : '') + '" role="radio" aria-checked="' + (active ? 'true' : 'false') + '"' +
                  ' data-act="set-theme" data-theme="' + it.key + '">' +
                  '<span class="theme-ico">' + icon(it.iconName) + '</span>' +
                  '<span class="theme-name">' + it.label + '</span>' +
                  '<span class="radio" aria-hidden="true"></span>' +
                '</button>'
              );
            })
            .join('') +
        '</div>' +

        '<div class="about-card">' +
          '<div class="about-top">' + LOGO +
            '<div><h3>Дейликард</h3><p>v0.2 · прототип</p></div>' +
          '</div>' +
          '<p class="about-text">Карточки для запоминания слов. Введите значение, и следующее слово появится само. Данные хранятся только на этом устройстве.</p>' +
          '<div class="pills">' +
            '<span class="pill ok">Бесплатно</span>' +
            '<span class="pill ok">Без подписки</span>' +
            '<span class="pill">Офлайн</span>' +
            '<span class="pill">Без аккаунта</span>' +
          '</div>' +
        '</div>' +

        '<p class="footnote">Шрифт Roboto · Material Expressive</p>' +
      '</div>';
  }

  /* ---------------- верхняя панель ---------------- */
  function renderAppbar(r) {
    if (r.name === 'home') {
      APPBAR.innerHTML =
        '<button class="icon-btn" data-act="to-decks" aria-label="Открыть колоды">' + icon('menu') + '</button>' +
        '<div class="brand">' + LOGO + '<span class="brand-name">Дейликард</span></div>' +
        '<button class="icon-btn tonal" data-act="to-active-words" aria-label="Список слов">' + icon('list') + '</button>' +
        '<button class="icon-btn" data-act="to-settings" aria-label="Настройки">' + icon('settings') + '</button>';
      return;
    }
    if (r.name === 'decks') {
      APPBAR.innerHTML =
        '<button class="icon-btn" data-act="to-home" aria-label="На главную">' + icon('back') + '</button>' +
        '<h1>Колоды</h1>';
      return;
    }
    if (r.name === 'deck') {
      const deck = getDeck(r.id);
      APPBAR.innerHTML =
        '<button class="icon-btn" data-act="to-decks" aria-label="К колодам">' + icon('back') + '</button>' +
        '<h1>' + esc(deck ? deck.name : 'Колода') + '</h1>' +
        (deck
          ? '<button class="icon-btn" data-act="rename-deck" data-id="' + deck.id + '" aria-label="Переименовать колоду">' + icon('pencil') + '</button>'
          : '');
      return;
    }
    APPBAR.innerHTML =
      '<button class="icon-btn" data-act="to-home" aria-label="На главную">' + icon('back') + '</button>' +
      '<h1>Настройки</h1>';
  }

  /* ---------------- рендер ---------------- */
  function render() {
    const r = route();
    applyTheme();
    renderAppbar(r);

    if (r.name === 'home') renderHome();
    else if (r.name === 'decks') renderDecks();
    else if (r.name === 'deck') renderDeck(r.id);
    else renderSettings();

    VIEW.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /* ---------------- диалог колоды ---------------- */
  function openDeckDialog(deck) {
    const isEdit = !!deck;
    openModal(
      '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">' +
        '<h2 id="dlgTitle">' + (isEdit ? 'Название колоды' : 'Новая колода') + '</h2>' +
        '<p>' + (isEdit ? 'Слова останутся на месте.' : 'Например: «Испанский» или «Формулы».') + '</p>' +
        '<input class="text-field" id="deckNameInput" maxlength="60" placeholder="Название колоды" value="' + esc(isEdit ? deck.name : '') + '">' +
        '<div class="dialog-actions">' +
          '<button class="btn btn-text" type="button" data-close>Отмена</button>' +
          '<button class="btn btn-filled" type="button" id="deckSave">' + (isEdit ? 'Сохранить' : 'Создать') + '</button>' +
        '</div>' +
      '</div>'
    );

    const input = $('#deckNameInput');
    const submit = function () {
      const name = input.value.trim();
      if (!name) {
        input.classList.add('invalid');
        input.focus();
        showSnack('Введите название колоды', 'info');
        return;
      }
      if (isEdit) {
        deck.name = name.slice(0, 60);
        saveState();
        closeModal();
        render();
        showSnack('Название обновлено', 'check');
      } else {
        const d = makeDeck(name.slice(0, 60), true, []);
        state.decks.unshift(d);
        state.activeDeckId = d.id;
        saveState();
        closeModal();
        navigate('#/deck/' + d.id);
        showSnack('Колода создана', 'check');
      }
    };

    $('#deckSave').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    input.addEventListener('input', function () {
      input.classList.remove('invalid');
    });
    window.setTimeout(function () {
      input.focus();
      input.select();
    }, 40);
  }

  /* ---------------- редактор слова ---------------- */
  function openWordEditor(deckId, wordId) {
    const deck = getDeck(deckId);
    if (!deck) return;
    const word = wordId ? getWord(deckId, wordId) : null;

    const draft = {
      mode: 'meanings',
      meanings: word ? word.meanings.slice() : [],
      synonyms: word ? word.synonyms.slice() : []
    };

    openModal(
      '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="weTitle">' +
        '<div class="sheet-head">' +
          '<div class="sheet-titles">' +
            '<div class="sheet-eyebrow">' + (word ? 'Редактирование' : 'Новое слово') + '</div>' +
            '<h2 id="weTitle">' + (word ? 'Слово' : 'Добавить слово') + '</h2>' +
          '</div>' +
          '<button class="icon-btn small ghost" type="button" data-close aria-label="Закрыть">' + icon('close') + '</button>' +
        '</div>' +
        '<div class="sheet-body">' +
          '<div>' +
            '<label class="field-label" for="weWord">Слово или фраза</label>' +
            '<input class="text-field" id="weWord" maxlength="80" placeholder="Например, apple" autocomplete="off" spellcheck="false" value="' + esc(word ? word.word : '') + '">' +
          '</div>' +
          '<div class="seg" id="weSeg" data-mode="meanings">' +
            '<span class="seg-thumb" aria-hidden="true"></span>' +
            '<button type="button" role="tab" aria-selected="true" class="active" data-mode="meanings">Значения</button>' +
            '<button type="button" role="tab" aria-selected="false" data-mode="synonyms">Синонимы</button>' +
          '</div>' +
          '<div>' +
            '<label class="field-label" id="weFieldLabel" for="weTagInput">Значения</label>' +
            '<div class="tag-field" id="weTagField">' +
              '<input class="tag-input" id="weTagInput" autocomplete="off" autocapitalize="none" spellcheck="false">' +
            '</div>' +
            '<p class="helper" id="weHelper">Разделяйте значения запятыми. Любое из них подойдёт как ответ.</p>' +
          '</div>' +
        '</div>' +
        '<div class="sheet-foot">' +
          '<button class="btn btn-text" type="button" data-close>Отмена</button>' +
          '<button class="btn btn-filled" type="button" id="weSave">Сохранить</button>' +
        '</div>' +
      '</div>'
    );

    const wordInput = $('#weWord');
    const tagInput = $('#weTagInput');
    const tagField = $('#weTagField');
    const seg = $('#weSeg');
    const fieldLabel = $('#weFieldLabel');
    const helper = $('#weHelper');
    const segButtons = $$('#weSeg button');

    function commitTag(raw) {
      const value = String(raw || '').trim().slice(0, 120);
      if (!value) return;
      const list = draft[draft.mode];
      if (!list.some((x) => norm(x) === norm(value))) list.push(value);
    }

    function commitInput() {
      if (!tagInput) return;
      const raw = tagInput.value;
      if (!raw.trim()) {
        tagInput.value = '';
        return;
      }
      raw.split(',').forEach(commitTag);
      tagInput.value = '';
    }

    function renderTags() {
      $$('.tag', tagField).forEach((t) => t.remove());
      const list = draft[draft.mode];
      list.forEach(function (value, index) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML =
          '<span>' + esc(value) + '</span>' +
          '<button type="button" aria-label="Удалить ' + esc(value) + '">' + icon('close') + '</button>';
        tag.querySelector('button').addEventListener('click', function () {
          list.splice(index, 1);
          renderTags();
          tagInput.focus();
        });
        tagField.insertBefore(tag, tagInput);
      });
      tagInput.placeholder = list.length
        ? 'Ещё…'
        : draft.mode === 'meanings'
        ? 'Например, яблоко'
        : 'Например, плод';
    }

    function syncSeg() {
      seg.dataset.mode = draft.mode;
      segButtons.forEach(function (b) {
        const on = b.dataset.mode === draft.mode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      fieldLabel.textContent = draft.mode === 'meanings' ? 'Значения' : 'Синонимы';
      helper.textContent =
        draft.mode === 'meanings'
          ? 'Разделяйте значения запятыми. Любое из них подойдёт как ответ.'
          : 'Синонимы тоже принимаются как правильный ответ.';
    }

    segButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (draft.mode === btn.dataset.mode) return;
        commitInput();
        draft.mode = btn.dataset.mode;
        syncSeg();
        renderTags();
        tagInput.focus();
      });
    });

    tagInput.addEventListener('input', function () {
      if (tagInput.value.indexOf(',') === -1) return;
      const parts = tagInput.value.split(',');
      const rest = parts.pop();
      parts.forEach(commitTag);
      tagInput.value = rest.replace(/^\s+/, '');
      renderTags();
    });

    tagInput.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        commitInput();
        renderTags();
        tagInput.focus();
      } else if (e.key === 'Backspace' && !tagInput.value) {
        const list = draft[draft.mode];
        if (list.length) {
          list.pop();
          renderTags();
        }
      }
    });

    tagField.addEventListener('click', function (e) {
      if (e.target === tagField) tagInput.focus();
    });

    $('#weSave').addEventListener('click', function () {
      commitInput();
      const title = wordInput.value.trim();
      if (!title) {
        wordInput.classList.add('invalid');
        wordInput.focus();
        showSnack('Введите слово', 'info');
        return;
      }
      if (!draft.meanings.length) {
        draft.mode = 'meanings';
        syncSeg();
        renderTags();
        tagInput.focus();
        showSnack('Добавьте хотя бы одно значение', 'info');
        return;
      }

      if (word) {
        word.word = title.slice(0, 80);
        word.meanings = draft.meanings.slice();
        word.synonyms = draft.synonyms.slice();
      } else {
        deck.words.unshift({
          id: uid('word'),
          word: title.slice(0, 80),
          meanings: draft.meanings.slice(),
          synonyms: draft.synonyms.slice()
        });
      }

      saveState();
      closeModal();
      render();
      showSnack(word ? 'Слово сохранено' : 'Слово добавлено', 'check');
    });

    wordInput.addEventListener('input', function () {
      wordInput.classList.remove('invalid');
    });

    renderTags();
    window.setTimeout(function () {
      wordInput.focus();
      const len = wordInput.value.length;
      if (len) wordInput.setSelectionRange(len, len);
    }, 40);
  }

  /* ---------------- события ---------------- */
  document.addEventListener('click', function (e) {
    const closer = e.target.closest('[data-close]');
    if (closer) {
      closeModal();
      return;
    }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;

    if (act === 'to-home') {
      navigate('#/');
    } else if (act === 'to-decks') {
      navigate('#/decks');
    } else if (act === 'to-settings') {
      navigate('#/settings');
    } else if (act === 'to-active-words') {
      const active = getDeck(state.activeDeckId) || enabledDecks()[0] || state.decks[0];
      if (active) {
        state.activeDeckId = active.id;
        saveState();
        navigate('#/deck/' + active.id);
      } else {
        navigate('#/decks');
      }
    } else if (act === 'open-deck' || act === 'edit-deck') {
      const deck = getDeck(id);
      if (!deck) return;
      state.activeDeckId = deck.id;
      saveState();
      navigate('#/deck/' + deck.id);
    } else if (act === 'toggle-deck') {
      const deck = getDeck(id);
      if (!deck) return;
      if (deck.enabled && enabledDecks().length === 1) {
        showSnack('Оставьте включённой хотя бы одну колоду', 'info');
        return;
      }
      deck.enabled = !deck.enabled;
      saveState();
      render();
      showSnack(deck.enabled ? 'Колода включена' : 'Колода выключена', 'check');
    } else if (act === 'new-deck') {
      openDeckDialog(null);
    } else if (act === 'rename-deck') {
      const deck = getDeck(id);
      if (deck) openDeckDialog(deck);
    } else if (act === 'new-word') {
      openWordEditor(el.dataset.deck, null);
    } else if (act === 'edit-word') {
      openWordEditor(el.dataset.deck, el.dataset.word);
    } else if (act === 'set-theme') {
      state.theme = sanitizeTheme(el.dataset.theme);
      applyTheme();
      saveState();
      render();
      showSnack('Тема обновлена', 'check');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalOpen) {
        closeModal();
        return;
      }
      const r = route();
      if (r.name === 'deck') navigate('#/decks');
      else if (r.name === 'decks' || r.name === 'settings') navigate('#/');
    }
  });

  window.addEventListener('hashchange', function () {
    closeModal();
    render();
  });

  /* ---------------- запуск ---------------- */
  if (!location.hash || location.hash === '#') {
    history.replaceState(null, '', '#/');
  }
  applyTheme();
  render();

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !IS_TEST && !IS_APP) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* отладочный доступ для проверки прототипа */
  window.__dailycard = {
    get state() {
      return state;
    },
    reset: function () {
      state = seedState();
      saveState();
      navigate('#/');
      render();
    }
  };

  // Системная кнопка «Назад» в Android-приложении.
  window.__dailycardBack = function () {
    if (modalOpen) {
      closeModal();
      return true;
    }
    if (route().name !== 'home') {
      if (history.length > 1) history.back();
      else navigate('#/');
      return true;
    }
    return false;
  };
})();
