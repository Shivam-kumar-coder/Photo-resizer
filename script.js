// Ensure jspdf is loaded globally from index.html

const state = {
    files: [],
    activeTool: 'tool-kb',
    isProcessing: false,
};

// ================= DOM =================
const dropArea = document.getElementById('dropbox');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');

const navButtons = document.querySelectorAll('.nav-btn');
const toolPanels = document.querySelectorAll('.tool-panel');

const targetSizeInput = document.getElementById('targetSize');
const runKbBtn = document.getElementById('runKb');

const widthPxInput = document.getElementById('widthPx');
const heightPxInput = document.getElementById('heightPx');
const keepAspectCheckbox = document.getElementById('keepAspect');
const runPxBtn = document.getElementById('runPx');

const qualitySlider = document.getElementById('qualitySlider');
const qualityValSpan = document.getElementById('qualityVal');
const runCompressBtn = document.getElementById('runCompress');

const convertFormatSelect = document.getElementById('convertFormat');
const runConvertBtn = document.getElementById('runConvert');

const runPdfMergeBtn = document.getElementById('runPdfMerge');
const runPdfSeparateBtn = document.getElementById('runPdfSeparate');
const runPassportBtn = document.getElementById('runPassport');

const notificationContainer = document.getElementById('notification-container');

// ================= UI =================
function switchTool(toolId) {
    state.activeTool = toolId;
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === toolId));
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
}

function checkURLHash() {
    if (location.hash) switchTool(location.hash.substring(1));
}

// ================= Notifications =================
function showNotification(msg, type = 'success', time = 3000) {
    const t = document.createElement('div');
    t.className = `toast-notification ${type}`;
    t.textContent = msg;
    notificationContainer.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, time);
}

// ================= Upload =================
function addFilesToState(files) {
    if (state.isProcessing) return;

    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) {
        showNotification("Only image files allowed", "error");
        return;
    }

    if (!state.files.length) {
        thumbGrid.innerHTML = '';
        thumbsArea.classList.remove('hidden');
    }

    imgs.forEach(file => {
        state.files.push({
            originalFile: file,
            filename: file.name,
            status: 'Ready'
        });

        const r = new FileReader();
        r.onload = e => displayThumb(file.name, e.target.result, file.size);
        r.readAsDataURL(file);
    });
}

function displayThumb(name, src, size) {
    const d = document.createElement('div');
    d.className = 'thumb-item';
    d.dataset.filename = name;
    d.innerHTML = `
        <img src="${src}" class="thumb-img">
        <span class="thumb-filename">${name}</span>
        <span class="thumb-status">Size: ${(size/1024).toFixed(1)} KB</span>
    `;
    thumbGrid.appendChild(d);
}

function updateThumbnailStatus(name, text) {
    const el = document.querySelector(`.thumb-item[data-filename="${name}"] .thumb-status`);
    if (el) el.textContent = text;
}

// ================= Image Loader =================
function loadImage(file) {
    return new Promise((res, rej) => {
        const img = new Image();
        const r = new FileReader();
        r.onload = e => {
            img.onload = () => {
                const c = document.createElement('canvas');
                const ctx = c.getContext('2d');
                res({ img, canvas: c, ctx });
            };
            img.onerror = rej;
            img.src = e.target.result;
        };
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ================= PDF (🔥 FIXED) =================
async function runPDF(merge) {
    if (!state.files.length || state.isProcessing) {
        showNotification("Select images first", "error");
        return;
    }

    state.isProcessing = true;
    const { jsPDF } = window.jspdf;

    try {
        if (merge) {
            let pdf = null;

            for (let i = 0; i < state.files.length; i++) {
                const f = state.files[i];
                updateThumbnailStatus(f.filename, "Adding to PDF...");

                const { img, canvas, ctx } = await loadImage(f.originalFile);

                // ✅ White background + mobile safe
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                const imgData = canvas.toDataURL('image/jpeg', 0.9);

                if (i === 0) {
                    pdf = new jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [img.width, img.height]
                    });
                } else {
                    pdf.addPage(
                        [img.width, img.height],
                        img.width > img.height ? 'landscape' : 'portrait'
                    );
                }

                pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
                updateThumbnailStatus(f.filename, "Added");
            }

            downloadBlob(pdf.output('blob'), 'QuickPic-Merged.pdf');
            showNotification("PDF merged successfully");

        } else {
            for (const f of state.files) {
                updateThumbnailStatus(f.filename, "Creating PDF...");

                const { img, canvas, ctx } = await loadImage(f.originalFile);

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                const pdf = new jsPDF({
                    orientation: img.width > img.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [img.width, img.height]
                });

                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0);
                downloadBlob(pdf.output('blob'), f.filename.replace(/\.\w+$/, '') + ".pdf");
                updateThumbnailStatus(f.filename, "PDF Ready");
            }
            showNotification("All PDFs exported");
        }
    } catch (e) {
        console.error(e);
        showNotification("PDF processing failed", "error", 5000);
    }

    state.isProcessing = false;
}

runPdfMergeBtn.onclick = () => runPDF(true);
runPdfSeparateBtn.onclick = () => runPDF(false);

// ================= INIT =================
document.addEventListener('DOMContentLoaded', checkURLHash);

Bhai isme kuchh gadbad hai koi featur kaam nhi kar raha hai please ise fix kar de de do