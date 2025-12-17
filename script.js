// QuickPic - Full Script with Bulk Processing & PDF Merge
const state = {
    files: [],
    isProcessing: false,
};

// DOM Elements
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const thumbGrid = document.getElementById('thumb-grid');
const thumbsArea = document.getElementById('thumbs-area');
const notificationContainer = document.getElementById('notification-container');

// --- 1. Navigation Logic ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('visible'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tool).classList.add('visible');
        
        // Update URL hash for SEO without scrolling
        history.pushState(null, null, '#' + btn.dataset.tool);
    });
});

// --- 2. File Upload & Thumbnails ---
selectBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);
    newFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
            state.files.push({ originalFile: file, filename: file.name });
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'thumb-item';
                div.innerHTML = `
                    <img src="${ev.target.result}">
                    <p>${file.name}</p>
                    <span class="status-badge" id="status-${file.name.replace(/\s+/g, '')}">Ready</span>
                `;
                thumbGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        }
    });
    if (state.files.length > 0) {
        thumbsArea.classList.remove('hidden');
    }
});

// Reset Button
document.getElementById('resetBtn').addEventListener('click', () => {
    state.files = [];
    thumbGrid.innerHTML = '';
    thumbsArea.classList.add('hidden');
    fileInput.value = '';
    showNotification("Cleared all files", "info");
});

// --- 3. Utility Functions ---
function showNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.className = `toast-notification ${type}`;
    n.innerText = msg;
    if(notificationContainer) notificationContainer.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

async function loadImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                resolve({ img, canvas, ctx: canvas.getContext('2d') });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuickPic-${filename}`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- 4. CORE TOOLS LOGIC ---

// A. KB Reducer (Bulk)
document.getElementById('runKb').addEventListener('click', async () => {
    const targetKB = parseInt(document.getElementById('targetSize').value);
    if (!targetKB) return showNotification("Enter target KB!", "error");

    for (let file of state.files) {
        const { img, canvas, ctx } = await loadImage(file.originalFile);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let quality = 0.9;
        let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        
        // Iterative reduction
        while (blob.size > targetKB * 1024 && quality > 0.1) {
            quality -= 0.05;
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        }
        download(blob, `resized-${file.filename.split('.')[0]}.jpg`);
    }
    showNotification("Bulk KB Reduction Complete!");
});

// B. Pixel Resize (Bulk)
document.getElementById('runPx').addEventListener('click', async () => {
    const w = parseInt(document.getElementById('widthPx').value);
    const h = parseInt(document.getElementById('heightPx').value);
    if (!w || !h) return showNotification("Enter Width and Height!", "error");

    for (let file of state.files) {
        const { img, canvas, ctx } = await loadImage(file.originalFile);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const blob = await new Promise(r => canvas.toBlob(r, file.originalFile.type, 0.9));
        download(blob, `pixel-${file.filename}`);
    }
    showNotification("Bulk Resize Complete!");
});

// C. PDF Logic (Merge & Separate - FIXED)
async function runPDF(isMerge) {
    if (state.files.length === 0) return showNotification("Upload images first!", "error");
    if (!window.jspdf) return showNotification("PDF Library not loaded!", "error");

    const { jsPDF } = window.jspdf;
    const mainDoc = new jsPDF();

    for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        const { img } = await loadImage(file.originalFile);
        
        // Calculate fit-to-page dimensions
        const pw = mainDoc.internal.pageSize.getWidth();
        const ph = mainDoc.internal.pageSize.getHeight();
        const ratio = Math.min(pw / img.width, ph / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (pw - w) / 2;
        const y = (ph - h) / 2;

        if (isMerge) {
            if (i > 0) mainDoc.addPage();
            mainDoc.addImage(img, 'JPEG', x, y, w, h);
        } else {
            const singleDoc = new jsPDF();
            singleDoc.addImage(img, 'JPEG', x, y, w, h);
            singleDoc.save(`QuickPic-${file.filename.split('.')[0]}.pdf`);
        }
    }
    if (isMerge) mainDoc.save('QuickPic-Merged-Collection.pdf');
    showNotification("PDF Export Successful!");
}

document.getElementById('runPdfMerge').addEventListener('click', () => runPDF(true));
document.getElementById('runPdfSeparate').addEventListener('click', () => runPDF(false));

// D. Passport Photo Maker
document.getElementById('runPassport').addEventListener('click', async () => {
    for (let file of state.files) {
        const { img, canvas, ctx } = await loadImage(file.originalFile);
        // Standard Passport Ratio (3.5 x 4.5)
        canvas.width = 350;
        canvas.height = 450;
        ctx.drawImage(img, 0, 0, 350, 450);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
        download(blob, `passport-${file.filename.split('.')[0]}.jpg`);
    }
    showNotification("Passport Photos Created!");
});

// E. Convert Tool
document.getElementById('runConvert').addEventListener('click', async () => {
    const format = document.getElementById('convertFormat').value;
    for (let file of state.files) {
        const { img, canvas, ctx } = await loadImage(file.originalFile);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise(r => canvas.toBlob(r, format, 0.9));
        const ext = format.split('/')[1];
        download(blob, `converted-${file.filename.split('.')[0]}.${ext}`);
    }
    showNotification("Bulk Conversion Done!");
});

// F. Simple Compressor
document.getElementById('runCompress').addEventListener('click', async () => {
    const q = parseInt(document.getElementById('qualitySlider').value) / 100;
    for (let file of state.files) {
        const { img, canvas, ctx } = await loadImage(file.originalFile);
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
        download(blob, `compressed-${file.filename}`);
    }
    showNotification("Bulk Compression Done!");
});

// Update Quality Value display
document.getElementById('qualitySlider')?.addEventListener('input', (e) => {
    document.getElementById('qualityVal').innerText = e.target.value;
});

// Final SEO Check on Load
window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash) {
        const toolId = hash.substring(1);
        const btn = document.querySelector(`[data-tool="${toolId}"]`);
        if (btn) btn.click();
    }
});
