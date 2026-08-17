const canvas = document.querySelector('#canvas');
const emptyMessage = document.querySelector('#emptyMessage');
const template = document.querySelector('#itemTemplate');
const saveState = document.querySelector('#saveState');
const textForm = document.querySelector('#textForm');
const imageForm = document.querySelector('#imageForm');
const uploadForm = document.querySelector('#uploadForm');
const photoInput = document.querySelector('#photoInput');
const photoHint = document.querySelector('#photoHint');
const emojiPalette = document.querySelector('#emojiPalette');
const fontSelect = document.querySelector('#fontSelect');
const fontSizeInput = document.querySelector('#fontSizeInput');
const fontSizeValue = document.querySelector('#fontSizeValue');
const colorPalette = document.querySelector('#colorPalette');
const styleHint = document.querySelector('#styleHint');
const unlockForm = document.querySelector('#unlockForm');
const passcodeInput = document.querySelector('#passcode');
const accessHint = document.querySelector('#accessHint');
const generateButton = document.querySelector('#generateButton');
const clearButton = document.querySelector('#clearBoard');

const BOARD_ENDPOINT = '/.netlify/functions/vision-board';
const IMAGE_ENDPOINT = '/.netlify/functions/vision-image';
const UPLOAD_ENDPOINT = '/.netlify/functions/vision-upload';
let items = [];
let passcode = sessionStorage.getItem('vision-board-passcode') || '';
let unlocked = false;
let selectedId = null;
let saveTimer;
let topLayer = 10;

const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function setEditing(enabled) {
    unlocked = enabled;
    document.body.classList.toggle('is-unlocked', enabled);
    [...textForm.elements, ...imageForm.elements, ...uploadForm.elements, ...emojiPalette.querySelectorAll('button')].forEach((el) => { el.disabled = !enabled; });
    clearButton.disabled = !enabled;
    passcodeInput.value = enabled ? '••••••••••••' : '';
    passcodeInput.disabled = enabled;
    unlockForm.querySelector('button').textContent = enabled ? 'Editing unlocked' : 'Unlock board';
    unlockForm.querySelector('button').disabled = enabled;
    accessHint.textContent = enabled ? 'Your changes save for everyone.' : 'Everyone can view. Only Kate can edit.';
    updateStyleControls();
}

function updateStyleControls() {
    const item = items.find((entry) => entry.id === selectedId);
    const enabled = unlocked && item?.type === 'text';
    fontSelect.disabled = !enabled;
    fontSizeInput.disabled = !enabled;
    colorPalette.querySelectorAll('button').forEach((button) => {
        button.disabled = !enabled;
        button.setAttribute('aria-pressed', String(enabled && button.dataset.color === (item.color || 'ink')));
    });
    if (enabled) {
        fontSelect.value = item.font || 'display';
        fontSizeInput.value = item.fontSize || 44;
    }
    fontSizeValue.textContent = enabled ? `${fontSizeInput.value}px` : 'Select text';
    styleHint.textContent = enabled ? 'Style changes save automatically.' : 'Select a text item on the board.';
}

async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (passcode) headers['x-vision-passcode'] = passcode;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
}

async function loadBoard() {
    saveState.textContent = 'Loading shared board…';
    try {
        const data = await api(BOARD_ENDPOINT);
        items = Array.isArray(data.items) ? data.items : [];
        render();
        saveState.textContent = 'Shared board · saved';
    } catch (error) {
        saveState.textContent = error.message;
    }
}

function queueSave() {
    if (!unlocked) return;
    saveState.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveBoard, 450);
}

async function saveBoard() {
    try {
        await api(BOARD_ENDPOINT, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items })
        });
        saveState.textContent = 'Shared board · saved';
    } catch (error) {
        saveState.textContent = error.message;
    }
}

function selectItem(element) {
    if (!unlocked) return;
    document.querySelectorAll('.board-item').forEach((node) => node.classList.remove('selected'));
    element.classList.add('selected');
    selectedId = element.dataset.id;
    element.style.zIndex = ++topLayer;
    updateStyleControls();
}

function render() {
    canvas.querySelectorAll('.board-item').forEach((node) => node.remove());
    emptyMessage.hidden = items.length > 0;
    items.forEach((item) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.dataset.id = item.id;
        node.classList.add(item.type);
        if (item.type === 'text') node.classList.add(`font-${item.font || 'display'}`, `color-${item.color || 'ink'}`);
        if (item.id === selectedId && unlocked) node.classList.add('selected');
        Object.assign(node.style, { left: `${item.x}px`, top: `${item.y}px`, width: `${item.w}px`, height: `${item.h}px`, zIndex: item.z || 1 });
        const content = node.querySelector('.item-content');
        if (item.type === 'image') {
            const img = new Image();
            img.src = `${IMAGE_ENDPOINT}?id=${encodeURIComponent(item.imageId)}`;
            img.alt = item.prompt || item.alt || 'Vision board image';
            content.append(img);
        } else {
            content.textContent = item.text;
            if (item.type === 'text') content.style.fontSize = `${clamp(Number(item.fontSize) || 44, 10, 96)}px`;
        }
        node.addEventListener('pointerdown', (event) => beginMove(event, node, item));
        node.addEventListener('focus', () => selectItem(node));
        node.querySelector('.remove').addEventListener('click', (event) => {
            event.stopPropagation();
            items = items.filter((entry) => entry.id !== item.id);
            if (selectedId === item.id) selectedId = null;
            render();
            updateStyleControls();
            queueSave();
        });
        node.querySelector('.resize').addEventListener('pointerdown', (event) => beginResize(event, node, item));
        canvas.append(node);
    });
}

function beginMove(event, node, item) {
    if (!unlocked || event.target.closest('button')) return;
    event.preventDefault();
    selectItem(node);
    const start = { x: event.clientX, y: event.clientY, left: item.x, top: item.y };
    const move = (next) => {
        item.x = clamp(start.left + next.clientX - start.x, 0, canvas.clientWidth - item.w);
        item.y = clamp(start.top + next.clientY - start.y, 0, canvas.clientHeight - item.h);
        node.style.left = `${item.x}px`;
        node.style.top = `${item.y}px`;
    };
    const end = () => { window.removeEventListener('pointermove', move); queueSave(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end, { once: true });
}

function beginResize(event, node, item) {
    if (!unlocked) return;
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, w: item.w, h: item.h };
    const ratio = item.w / item.h;
    const move = (next) => {
        item.w = clamp(start.w + next.clientX - start.x, 110, 650);
        item.h = item.type === 'image' ? item.w / ratio : clamp(start.h + next.clientY - start.y, 70, 420);
        node.style.width = `${item.w}px`;
        node.style.height = `${item.h}px`;
    };
    const end = () => { window.removeEventListener('pointermove', move); queueSave(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end, { once: true });
}

unlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    passcode = passcodeInput.value;
    try {
        await api(BOARD_ENDPOINT, { method: 'POST' });
        sessionStorage.setItem('vision-board-passcode', passcode);
        setEditing(true);
    } catch (error) {
        passcode = '';
        accessHint.textContent = error.message;
    }
});

textForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#textInput');
    const text = input.value.trim();
    if (!text) return;
    const id = uid();
    items.push({ id, type: 'text', text, font: 'display', fontSize: 44, color: 'ink', x: 70 + items.length * 16, y: 70 + items.length * 14, w: 280, h: 150, z: ++topLayer });
    selectedId = id;
    input.value = '';
    render();
    updateStyleControls();
    queueSave();
});

fontSelect.addEventListener('change', () => {
    const item = items.find((entry) => entry.id === selectedId && entry.type === 'text');
    if (!item || !unlocked) return;
    item.font = fontSelect.value;
    render();
    updateStyleControls();
    queueSave();
});

fontSizeInput.addEventListener('input', () => {
    const item = items.find((entry) => entry.id === selectedId && entry.type === 'text');
    if (!item || !unlocked) return;
    item.fontSize = Number(fontSizeInput.value);
    fontSizeValue.textContent = `${item.fontSize}px`;
    render();
    queueSave();
});

colorPalette.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-color]');
    const item = items.find((entry) => entry.id === selectedId && entry.type === 'text');
    if (!button || !item || !unlocked) return;
    item.color = button.dataset.color;
    render();
    updateStyleControls();
    queueSave();
});

emojiPalette.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !unlocked) return;
    items.push({ id: uid(), type: 'emoji', text: button.textContent, x: 100 + items.length * 14, y: 100 + items.length * 12, w: 150, h: 150, z: ++topLayer });
    render();
    queueSave();
});

photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
        photoHint.textContent = 'That photo is larger than 8 MB.';
        photoInput.value = '';
        return;
    }
    photoHint.textContent = 'Uploading…';
    try {
        let ratio = 1;
        try {
            const bitmap = await createImageBitmap(file);
            ratio = bitmap.width / bitmap.height;
            bitmap.close();
        } catch { /* Use a square frame when dimensions cannot be read. */ }
        const result = await api(UPLOAD_ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': file.type },
            body: await file.arrayBuffer()
        });
        const width = 360;
        items.push({ id: uid(), type: 'image', imageId: result.id, alt: file.name, x: 110 + items.length * 14, y: 110 + items.length * 12, w: width, h: width / ratio, z: ++topLayer });
        render();
        await saveBoard();
        photoHint.textContent = 'Photo added to the shared board.';
    } catch (error) {
        photoHint.textContent = error.message;
    } finally {
        photoInput.value = '';
    }
});

imageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector('#imagePrompt');
    const prompt = input.value.trim();
    if (!prompt) return;
    generateButton.disabled = true;
    generateButton.textContent = 'Making image…';
    try {
        const result = await api(IMAGE_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt }) });
        items.push({ id: uid(), type: 'image', imageId: result.id, prompt, x: 90 + items.length * 18, y: 90 + items.length * 16, w: 340, h: 340, z: ++topLayer });
        input.value = '';
        render();
        await saveBoard();
    } catch (error) {
        saveState.textContent = error.message;
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate with AI';
    }
});

clearButton.addEventListener('click', () => {
    if (!unlocked || !items.length) return;
    if (confirm('Clear every item from the shared board?')) {
        items = [];
        render();
        queueSave();
    }
});

canvas.addEventListener('pointerdown', (event) => {
    if (event.target === canvas) {
        selectedId = null;
        document.querySelectorAll('.board-item').forEach((node) => node.classList.remove('selected'));
        updateStyleControls();
    }
});

setEditing(false);
if (passcode) {
    api(BOARD_ENDPOINT, { method: 'POST' }).then(() => setEditing(true)).catch(() => sessionStorage.removeItem('vision-board-passcode'));
}
loadBoard();
