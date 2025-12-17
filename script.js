/**
 * QuickPic - Professional Client-Side Image Suite
 * Developed by SKS Technologies
 * Full Feature: KB Reducer, Pixel Resizer, Quality Compressor, Format Converter, 
 * Passport Maker (35x45mm), and Robust PDF Merger.
 */

const state = {
    files: [],
    activeTool: 'tool-kb',
    isProcessing: false,
    quality: 70
};

// --- DOM ELEMENTS ---
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const thumbGrid = document.getElementById('thumb-grid');
const thumbsArea = document.getElementById('thumbs-area');
const resetBtn = document.getElementById('resetBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const notificationContainer = document.getElementById('notification-container');

// --- INITIALIZATION & NAVIGATION ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool');
        setActiveTool(toolId);
    });
});

function setActiveTool(toolId) {
    state.activeTool = toolId;
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tool') === toolId);
    });
    document.querySelectorAll('.tool-panel').forEach(p => {
        p.classList.toggle('visible', p.id === toolId);
    });
    window.location.hash = toolId;
}

// --- NOTIFICATION SYSTEM ---
function showNotify(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    toast.innerText = message;
    notificationContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- FILE HANDLING LOGIC ---
selectBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', handleFiles);

function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showNotify(`File ${file.name} is not an image`, 'error');
            return;
        }

        const fileId = Math.random().toString(36).substr(2, 9);
        state.files.push({
            id: fileId,
            originalFile: file,
            filename: file.name,
            size: (file.size / 1024).toFixed(2)
        });

        const reader = new FileReader();
        reader.onload = (event) => {
            const thumb = document.createElement('div');
            thumb.className = 'thumb-item';
            thumb.id = `thumb-${fileId}`;
            thumb.innerHTML = `
                <div class="thumb-img-container">
                    <img src="${event.target.result}" alt="preview">
                </div>
                <div class="thumb-info">
                    <p class="name">${file.name}</p>
                    <p class="size">${(file.size / 1024).toFixed(1)} KB</p>
                    <span class="status" id="status-${fileId}">Ready</span>
                </div>
            `;
            thumbGrid.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });

    thumbsArea.classList.remove('hidden');
    showNotify(`${files.length} images added`);
}

resetBtn.addEventListener('click', () => {
    state.files = [];
    thumbGrid.innerHTML = '';
    thumbsArea.classList.add('hidden');
    fileInput.value = '';
    showNotify("All files cleared", "error");
});

// --- CORE IMAGE PROCESSING ENGINE ---
async function processImage(fileObj, options = {}) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');

                let targetWidth = img.width;
                let targetHeight = img.height;

                // Handle Passport Specific (Center Crop 35x45mm)
                if (options.isPassport) {
                    canvas.width = 413; // ~35mm at 300 DPI
                    canvas.height = 531; // ~45mm at 300 DPI
                    const imgRatio = img.width / img.height;
                    const targetRatio = canvas.width / canvas.height;
                    
                    let drawWidth, drawHeight, offsetX, offsetY;
                    if (imgRatio > targetRatio) {
                        drawHeight = img.height;
                        drawWidth = img.height * targetRatio;
                        offsetX = (img.width - drawWidth) / 2;
                        offsetY = 0;
                    } else {
                        drawWidth = img.width;
                        drawHeight = img.width / targetRatio;
                        offsetX = 0;
                        offsetY = (img.height - drawHeight) / 2;
                    }
                    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
                } 
                // Handle Pixel Resize
                else if (options.width && options.height) {
                    canvas.width = options.width;
                    canvas.height = options.height;
                    ctx.drawImage(img, 0, 0, options.width, options.height);
                } 
                // Default
                else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                }

                resolve({ canvas, filename: fileObj.filename, originalType: fileObj.originalFile.type });
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileObj.originalFile);
    });
}

// --- TOOL: KB REDUCER (ITERATIVE ALGORITHM) ---
document.getElementById('runKb').addEventListener('click', async () => {
    const targetKB = parseInt(document.getElementById('targetSize').value);
    if (!targetKB) return showNotify("Please enter target KB", "error");

    state.isProcessing = true;
    for (const file of state.files) {
        document.getElementById(`status-${file.id}`).innerText = "Reducing...";
        const { canvas, filename } = await processImage(file);
        
        let quality = 0.95;
        let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        
        // Smart Iteration to hit target
        while (blob.size > targetKB * 1024 && quality > 0.05) {
            quality -= (blob.size > targetKB * 2048) ? 0.15 : 0.05;
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
        }

        downloadBlob(blob, `QuickPic_${targetKB}kb_${filename.split('.')[0]}.jpg`);
        document.getElementById(`status-${file.id}`).innerText = "Done";
    }
    state.isProcessing = false;
    showNotify("Bulk KB Reduction Finished");
});

// --- TOOL: PDF MERGER (THE BIG ONE) ---
async function runPDF(isMerge) {
    if (state.files.length === 0) return showNotify("No images selected", "error");
    if (typeof jspdf === 'undefined') return showNotify("PDF Library Error", "error");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    showNotify(isMerge ? "Merging PDF..." : "Exporting PDFs...");

    for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        const { canvas } = await processImage(file);
        const imgData = canvas.toDataURL('image/jpeg', 0.85);

        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pw / canvas.width, ph / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pw - w) / 2;
        const y = (ph - h) / 2;

        if (isMerge) {
            if (i > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', x, y, w, h);
        } else {
            const singleDoc = new jsPDF();
            singleDoc.addImage(imgData, 'JPEG', x, y, w, h);
            singleDoc.save(`QuickPic_${file.filename.split('.')[0]}.pdf`);
        }
    }

    if (isMerge) doc.save('QuickPic_Merged_Documents.pdf');
    showNotify("PDF Export Complete");
}

document.getElementById('runPdfMerge').addEventListener('click', () => runPDF(true));
document.getElementById('runPdfSeparate').addEventListener('click', () => runPDF(false));

// --- TOOL: PASSPORT MAKER ---
document.getElementById('runPassport').addEventListener('click', async () => {
    for (const file of state.files) {
        const { canvas, filename } = await processImage(file, { isPassport: true });
        canvas.toBlob((blob) => {
            downloadBlob(blob, `Passport_35x45_${filename}`);
        }, 'image/jpeg', 0.95);
    }
    showNotify("Passport Photos Generated");
});

// --- OTHER TOOLS (PIXEL, COMPRESS, CONVERT) ---
document.getElementById('runPx').addEventListener('click', async () => {
    const w = parseInt(document.getElementById('widthPx').value);
    const h = parseInt(document.getElementById('heightPx').value);
    if (!w || !h) return showNotify("Enter W x H", "error");

    for (const file of state.files) {
        const { canvas, filename } = await processImage(file, { width: w, height: h });
        canvas.toBlob(b => downloadBlob(b, `Resized_${filename}`), 'image/jpeg', 0.9);
    }
});

document.getElementById('runConvert').addEventListener('click', async () => {
    const format = document.getElementById('convertFormat').value;
    for (const file of state.files) {
        const { canvas, filename } = await processImage(file);
        const ext = format.split('/')[1];
        canvas.toBlob(b => downloadBlob(b, `Converted_${filename.split('.')[0]}.${ext}`), format);
    }
});

document.getElementById('runCompress').addEventListener('click', async () => {
    const q = qualitySlider.value / 100;
    for (const file of state.files) {
        const { canvas, filename } = await processImage(file);
        canvas.toBlob(b => downloadBlob(b, `Compressed_${filename}`), 'image/jpeg', q);
    }
});

// --- HELPER: DOWNLOAD ---
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Update Quality Slider Label
qualitySlider.addEventListener('input', (e) => {
    qualityVal.innerText = e.target.value;
});

// Auto-switch tool on hash change
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash) setActiveTool(hash);
});
