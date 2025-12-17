// Ensure jspdf is loaded globally from index.html
const state = {
    files: [],
    activeTool: 'tool-kb',
    isProcessing: false,
};

// ================= DOM ELEMENTS =================
const dropArea = document.getElementById('dropbox');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');
const notificationContainer = document.getElementById('notification-container');

const navButtons = document.querySelectorAll('.nav-btn');
const toolPanels = document.querySelectorAll('.tool-panel');

// Tool Inputs
const targetSizeInput = document.getElementById('targetSize');
const widthPxInput = document.getElementById('widthPx');
const heightPxInput = document.getElementById('heightPx');
const keepAspectCheckbox = document.getElementById('keepAspect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValSpan = document.getElementById('qualityVal');
const convertFormatSelect = document.getElementById('convertFormat');

// ================= UI LOGIC =================

function switchTool(toolId) {
    state.activeTool = toolId;
    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === toolId));
    toolPanels.forEach(panel => panel.classList.toggle('visible', panel.id === toolId));
}

navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const toolId = btn.getAttribute('data-tool');
        switchTool(toolId);
        history.pushState(null, null, '#' + toolId);
    });
});

function showNotification(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    notificationContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ================= FILE HANDLING =================

selectBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => addFilesToState(Array.from(e.target.files));
dropArea.ondragover = (e) => { e.preventDefault(); dropArea.classList.add('dragover'); };
dropArea.ondragleave = () => dropArea.classList.remove('dragover');
dropArea.ondrop = (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    addFilesToState(Array.from(e.dataTransfer.files));
};

function addFilesToState(files) {
    if (state.isProcessing) return;
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return showNotification("Only image files allowed", "error");

    if (state.files.length === 0) {
        thumbGrid.innerHTML = '';
        thumbsArea.classList.remove('hidden');
    }

    imgs.forEach(file => {
        state.files.push({ originalFile: file, filename: file.name });
        const reader = new FileReader();
        reader.onload = (e) => displayThumbnail(file.name, e.target.result, file.size);
        reader.readAsDataURL(file);
    });
}

function displayThumbnail(name, src, size) {
    const d = document.createElement('div');
    d.className = 'thumb-item';
    d.dataset.filename = name;
    d.innerHTML = `
        <img src="${src}" class="thumb-img">
        <span class="thumb-filename">${name}</span>
        <span class="thumb-status">Size: ${(size / 1024).toFixed(1)} KB</span>
    `;
    thumbGrid.appendChild(d);
}

function updateThumbnailStatus(name, text, color = 'var(--accent)') {
    const el = document.querySelector(`.thumb-item[data-filename="${name}"] .thumb-status`);
    if (el) {
        el.textContent = text;
        el.style.color = color;
    }
}

// ================= CORE PROCESSING =================

function loadImage(file) {
    return new Promise((res, rej) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            URL.revokeObjectURL(url);
            res({ img, canvas, ctx });
        };
        img.onerror = rej;
        img.src = url;
    });
}

async function processImage(fileEntry, toolType, options = {}) {
    try {
        const { img, canvas, ctx } = await loadImage(fileEntry.originalFile);
        let w = img.width, h = img.height, q = 0.9, fmt = 'image/jpeg';

        if (toolType === 'px') {
            w = options.width; h = options.height;
            if (options.keepAspect) {
                const ratio = Math.min(w / img.width, h / img.height);
                w = img.width * ratio; h = img.height * ratio;
            }
        } else if (toolType === 'compress') {
            q = options.quality / 100;
        } else if (toolType === 'convert') {
            fmt = options.format;
        } else if (toolType === 'passport') {
            w = 413; h = 531; // 3.5x4.5cm
        }

        canvas.width = w; canvas.height = h;
        ctx.fillStyle = "#white"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        let blob = await new Promise(r => canvas.toBlob(r, fmt, q));

        // KB Reducer Iterative Logic
        if (toolType === 'kb' && options.targetSizeKB > 0) {
            let currentQ = 0.9;
            while (blob.size > options.targetSizeKB * 1024 && currentQ > 0.1) {
                currentQ -= 0.1;
                blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', currentQ));
            }
        }

        updateThumbnailStatus(fileEntry.filename, `DONE: ${(blob.size / 1024).toFixed(1)} KB`, 'green');
        return blob;
    } catch (e) {
        updateThumbnailStatus(fileEntry.filename, 'ERROR', 'red');
        return null;
    }
}

// ================= ACTIONS =================

async function runTool(type, options = {}) {
    if (!state.files.length) return showNotification("Select images first", "error");
    state.isProcessing = true;
    for (const f of state.files) {
        updateThumbnailStatus(f.filename, 'Processing...');
        const blob = await processImage(f, type, options);
        if (blob) {
            const ext = blob.type.split('/')[1].replace('jpeg', 'jpg');
            const name = f.filename.split('.')[0] + `-quickpic.${ext}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; a.click();
            URL.revokeObjectURL(url);
        }
    }
    state.isProcessing = false;
    showNotification("Task Completed!");
}

// PDF Special Handler (Memory Optimized for Android)
async function runPDF(merge) {
    if (!state.files.length) return showNotification("Select images first", "error");
    state.isProcessing = true;
    const { jsPDF } = window.jspdf;

    try {
        let pdf = null;
        for (let i = 0; i < state.files.length; i++) {
            const f = state.files[i];
            updateThumbnailStatus(f.filename, 'Converting...');
            const { img, canvas, ctx } = await loadImage(f.originalFile);
            
            canvas.width = img.width; canvas.height = img.height;
            ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const orient = img.width > img.height ? 'l' : 'p';

            if (merge) {
                if (i === 0) pdf = new jsPDF({ orientation: orient, unit: 'px', format: [img.width, img.height] });
                else pdf.addPage([img.width, img.height], orient);
                pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
            } else {
                const sPdf = new jsPDF({ orientation: orient, unit: 'px', format: [img.width, img.height] });
                sPdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
                sPdf.save(`${f.filename.split('.')[0]}.pdf`);
            }
            updateThumbnailStatus(f.filename, 'PDF Ready', 'green');
        }
        if (merge && pdf) pdf.save('QuickPic-Merged.pdf');
        showNotification("PDF Exported Successfully!");
    } catch (e) {
        showNotification("PDF Error: File too large", "error");
    }
    state.isProcessing = false;
}

// Event Listeners for Buttons
document.getElementById('runKb').onclick = () => runTool('kb', { targetSizeKB: parseInt(targetSizeInput.value) });
document.getElementById('runPx').onclick = () => runTool('px', { width: parseInt(widthPxInput.value), height: parseInt(heightPxInput.value), keepAspect: keepAspectCheckbox.checked });
document.getElementById('runCompress').onclick = () => runTool('compress', { quality: parseInt(qualitySlider.value) });
document.getElementById('runConvert').onclick = () => runTool('convert', { format: convertFormatSelect.value });
if(document.getElementById('runPassport')) document.getElementById('runPassport').onclick = () => runTool('passport');
document.getElementById('runPdfMerge').onclick = () => runPDF(true);
document.getElementById('runPdfSeparate').onclick = () => runPDF(false);

resetBtn.onclick = () => { state.files = []; thumbGrid.innerHTML = ''; thumbsArea.classList.add('hidden'); fileInput.value = ''; };

qualitySlider.oninput = () => qualityValSpan.textContent = qualitySlider.value;
document.addEventListener('DOMContentLoaded', () => { if (window.location.hash) switchTool(window.location.hash.substring(1)); });
