/* Somatic — micro-app selector + single exercise card
   - Filter by time & goal
   - Random uniform pick with anti-repeat (last N=3)
   - Favorites (localStorage)
   - Simple countdown timer based on time bucket
*/

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const LS_KEYS = {
    recent: 'somatic_recent_ids_v1',
    favs: 'somatic_favs_v1'
};

const recentN = 3;

let library = [];
let current = null;
let currentFilter = { time: null, goal: null };
let timer = null;
let remaining = 0;

function secondsForTimeBucket(t) {
    if (t === '0:30') return 30;
    if (t === '1–3 min') return 120; // default middle of range
    if (t === '3–5 min') return 240; // default middle of range
    return 60;
}

function loadJSON(url) {
    return fetch(url).then(r => r.json());
}

function loadRecent() {
    try { return (JSON.parse(localStorage.getItem(LS_KEYS.recent) || '[]') || []).map(String); } catch { return []; }
}
function saveRecent(arr) {
    localStorage.setItem(LS_KEYS.recent, JSON.stringify(arr.slice(0, recentN)));
}
function pushRecent(id) {
    const key = String(id);
    const r = loadRecent();
    const next = [key, ...r.filter(x => x !== key)];
    saveRecent(next);
}

function loadFavs() {
    try { return new Set((JSON.parse(localStorage.getItem(LS_KEYS.favs) || '[]') || []).map(String)); } catch { return new Set(); }
}
function saveFavs(set) {
    localStorage.setItem(LS_KEYS.favs, JSON.stringify(Array.from(set).map(String)));
}

// Stable ID generation (fallback when JSON lacks explicit id)
function stableIdFromCard(card, idx) {
    const s = `${card.time}|${card.goal}|${card.name}`;
    let h = 2166136261; // FNV-1a
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // include idx to avoid collisions across duplicates with same fields
    h ^= (idx >>> 0);
    h = (h >>> 0);
    return `c_${h.toString(36)}`;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function filterCards() {
    return library
        .map((c, i) => ({ ...c, id: c.id ?? stableIdFromCard(c, i) }))
        .filter(c => c.time === currentFilter.time && c.goal === currentFilter.goal);
}

function antiRepeatPool(cards) {
    const recent = new Set(loadRecent());
    const pool = cards.filter(c => !recent.has(c.id));
    return pool.length ? pool : cards; // if all filtered out, allow repeats
}

// No longer used for bullets; keep for potential future formatting
function toBullets(text) { return [text]; }

function renderCard(card) {
    current = card;
    $('#cardName').textContent = card.name;
    $('#cardTime').textContent = '';
    $('#cardGoal').textContent = '';
    $('#cardWhy').textContent = card.why;

    const howEl = $('#cardHow');
    howEl.textContent = card.how;

    const pill = `${card.time} • ${card.goal}`;
    $('#pill').textContent = pill;

    // fav button state
    const favs = loadFavs();
    const isFav = favs.has(String(card.id));
    const favBtn = $('#favBtn');
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.textContent = isFav ? '★ Favorited' : '☆ Favorite';

    // timer UI reset
    resetTimerUI();
}

function resetTimerUI() {
    clearInterval(timer); timer = null;
    $('#countdown').textContent = '';
    if (current) {
        const secs = secondsForTimeBucket(current.time);
        const m = String(Math.floor(secs / 60)).padStart(1, '0');
        const s = String(secs % 60).padStart(2, '0');
        const btn = $('#timerBtn');
        btn.dataset.state = 'idle';
        btn.textContent = `Start ${m}:${s}`;
    } else {
        const btn = $('#timerBtn');
        btn.dataset.state = 'idle';
        btn.textContent = 'Start';
    }
}

function startTimer() {
    if (!current) return;
    if (timer) { clearInterval(timer); timer = null; }
    remaining = secondsForTimeBucket(current.time);
    updateCountdown();
    const btn = $('#timerBtn');
    btn.dataset.state = 'running';
    btn.textContent = 'Pause';
    timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(timer); timer = null; remaining = 0; updateCountdown();
            if (current) {
                const secs = secondsForTimeBucket(current.time);
                const m = String(Math.floor(secs / 60)).padStart(1, '0');
                const s = String(secs % 60).padStart(2, '0');
                btn.dataset.state = 'done';
                btn.textContent = `Restart ${m}:${s}`;
            } else {
                btn.dataset.state = 'done';
                btn.textContent = 'Restart';
            }
            vibrateDone();
        } else {
            updateCountdown();
        }
    }, 1000);
}

function pauseTimer() {
    if (!timer) return;
    clearInterval(timer); timer = null;
    const btn = $('#timerBtn');
    btn.dataset.state = 'paused';
    btn.textContent = 'Resume';
}

function updateCountdown() {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    $('#countdown').textContent = `${m}:${s}`;
}

function vibrateDone() {
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch { }
}

function showCardForSelection() {
    const all = filterCards();
    if (!all.length) {
        alert('No exercises found for this selection.');
        return;
    }
    const pool = antiRepeatPool(all);
    const chosen = pickRandom(pool);
    renderCard(chosen);
    pushRecent(chosen.id);
    $('#screen-select').classList.add('hidden');
    $('#screen-card').classList.remove('hidden');
}

function shuffleCard() {
    const all = filterCards();
    if (!all.length) return;
    const pool = antiRepeatPool(all);
    let next = pickRandom(pool);
    if (current && pool.length > 1) {
        // ensure different from current when possible
        let tries = 8;
        while (tries-- && next.id === current.id) next = pickRandom(pool);
    }
    renderCard(next);
    pushRecent(next.id);
}

function initSelectors() {
    const timeButtons = $$('#timeChoices .chip');
    const goalButtons = $$('#goalChoices .chip');

    function updateFindState() {
        $('#findBtn').disabled = !(currentFilter.time && currentFilter.goal);
    }

    timeButtons.forEach(btn => btn.addEventListener('click', () => {
        timeButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
        currentFilter.time = btn.dataset.time;
        updateFindState();
    }));

    goalButtons.forEach(btn => btn.addEventListener('click', () => {
        goalButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
        currentFilter.goal = btn.dataset.goal;
        updateFindState();
    }));

    $('#findBtn').addEventListener('click', showCardForSelection);
}

function initCardControls() {
    $('#backBtn').addEventListener('click', () => {
        resetTimerUI();
        $('#screen-card').classList.add('hidden');
        $('#screen-select').classList.remove('hidden');
    });

    $('#shuffleBtn').addEventListener('click', () => { resetTimerUI(); shuffleCard(); });

    $('#favBtn').addEventListener('click', () => {
        if (!current) return;
        const favs = loadFavs();
        if (favs.has(current.id)) favs.delete(current.id); else favs.add(current.id);
        saveFavs(favs);
        renderCard(current); // refresh button state
    });

    $('#timerBtn').addEventListener('click', (e) => {
        if (!current) return;
        const st = e.currentTarget.dataset.state;
        if (st === 'idle' || st === 'paused' || st === 'done') {
            startTimer();
        } else if (st === 'running') {
            pauseTimer();
        } else {
            // Fallback: preserve previous label-based behavior
            const label = e.currentTarget.textContent.trim();
            if (label.startsWith('Start') || label.startsWith('Restart') || label === 'Resume') startTimer();
            else if (label === 'Pause') pauseTimer();
        }
    });
}

function preselectFromURL() {
    const params = new URLSearchParams(location.search);
    const t = params.get('time');
    const g = params.get('goal');
    const timeBtn = t ? $(`#timeChoices .chip[data-time="${CSS.escape(t)}"]`) : null;
    const goalBtn = g ? $(`#goalChoices .chip[data-goal="${CSS.escape(g)}"]`) : null;
    const setChecked = (btn, groupSel, key) => {
        if (!btn) return false;
        $$(groupSel).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
        currentFilter[key] = btn.dataset[key];
        return true;
    };
    const tOk = setChecked(timeBtn, '#timeChoices .chip', 'time');
    const gOk = setChecked(goalBtn, '#goalChoices .chip', 'goal');
    if (tOk && gOk) {
        showCardForSelection();
    } else {
        // keep button disabled/enabled accordingly
        $('#findBtn').disabled = !(currentFilter.time && currentFilter.goal);
    }
}

async function boot() {
    try {
        library = await loadJSON('./cards.json');
    } catch (e) {
        console.error('Failed to load cards.json', e);
        // fallback: minimal universal card
        library = [{
            time: '0:30',
            goal: 'Calm down',
            name: 'Physio Sigh 3x',
            how: 'Deep inhale through nose, small top-up sniff, long mouth exhale ×3.',
            why: 'Double inhale clears CO₂ pockets; long exhale engages the vagal brake.'
        }];
    }
    initSelectors();
    initCardControls();
    preselectFromURL();
}

boot();


