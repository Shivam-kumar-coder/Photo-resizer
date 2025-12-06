// ===========================
// QUICKPIC FINAL FULL SCRIPT
// ===========================

// SUCCESS MESSAGE BOX
function showSuccess(msg = "Successfully downloaded") {
    let box = document.getElementById("successBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "successBox";
        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.background = "#28a745";
        box.style.color = "white";
        box.style.padding = "12px 25px";
        box.style.borderRadius = "8px";
        box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
        box.style.fontSize = "15px";
        box.style.zIndex = "9999";
        box.style.opacity = "0";
        box.style.transition = "opacity .3s ease";
        document.body.appendChild(box);
    }

    box.textContent = msg;
    box.style.opacity = "1";

    setTimeout(() => {
        box.style.opacity = "0";
    }, 2000);
}

// DOM ELEMENTS
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const dropbox = document.getElementById('dropbox');
const browseText = document.getElementById('browseText');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');

const navButtons = document.querySelectorAll('.nav-btn');
const toolPanels = document.querySelectorAll('.tool-panel');

const targetSizeEl = document.getElementById('targetSize');
const sizeUnitEl = document.getElementById('sizeUnit');
const widthPxEl = document.getElementById('widthPx');
const heightPxEl = document.getElementById('heightPx');
const keepAspectEl = document.getElementById('keepAspect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const convertFormat = document.getElementById('convertFormat');

let files = [];

// DRAG & DROP
['dragenter', 'dragover'].forEach(e =>
    dropbox.addEventListener(e, () => dropbox.classList.add('dragover'))
);
['dragleave', 'drop'].forEach(e =>
    dropbox.addEventListener(e, () => dropbox.classList.remove('dragover'))
);

dropbox.addEventListener('drop', e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

// FILE SELECTION
selectBtn.onclick = browseText.onclick = () => fileInput.click();
fileInput.onchange = e => handleFiles(e.target.files);
resetBtn.onclick = resetAll;

// TOOL SWITCHING (1 tab at a time)
navButtons.forEach(btn => {
    btn.onclick = () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const toolId = btn.dataset.tool;
        toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
    };
});

// FILE HANDLING
function handleFiles(fileList) {
    const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return alert("Please select valid images");

    files = [];
    thumbGrid.innerHTML = '';

    let loaded = 0;

    valid.forEach(file => {
        const reader = new FileReader();

        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                files.push({
                    file,
                    dataURL: e.target.result,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
                addThumb(file.name, e.target.result, img.naturalWidth, img.naturalHeight, file.size);

                if (++loaded === valid.length) afterFilesLoaded();
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    });
}

function addThumb(name, src, w, h, size) {
    const div = document.createElement('div');
    div.className = 'thumb-item';

    div.innerHTML = `
        <img src="${src}">
        <div class="thumb-meta">
            ${name}<br>
            ${(size / 1024).toFixed(1)} KB<br>
            ${w}×${h}
        </div>
    `;

    thumbGrid.appendChild(div);
}

function afterFilesLoaded() {
    document.getElementById('select-area').style.display = 'none';
    thumbsArea.classList.remove('hidden');
}

// RESET
function resetAll() {
    files = [];
    thumbGrid.innerHTML = '';
    fileInput.value = '';

    thumbsArea.classList.add('hidden');
    document.getElementById('select-area').style.display = 'block';
}

// UTILITIES
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);

    while (n--) u8[n] = bstr.charCodeAt(n);

    return new Blob([u8], { type: mime });
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function stripExt(name) {
    return name.replace(/\.[^/.]+$/, '');
}

// ===============================
// KB RESIZE TOOL
// ===============================
async function compressToTargetSize(file, targetKB) {
    const targetBytes = targetKB * 1024;
    const minBytes = (targetKB - 10) * 1024;
    const maxBytes = (targetKB + 10) * 1024;

    const read = f => new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(f);
    });

    const dataURL = await read(file);
    const img = new Image();

    img.src = dataURL;
    await new Promise(r => img.onload = r);

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    let quality = 0.95;
    let scale = 1.0;
    let resultBlob = null;

    for (let i = 0; i < 30; i++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        canvas.width = w;
        canvas.height = h;

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);

        ctx.drawImage(img, 0, 0, w, h);

        const data = canvas.toDataURL("image/jpeg", quality);
        const blob = dataURLtoBlob(data);

        const size = blob.size;

        if (size >= minBytes && size <= maxBytes) {
            resultBlob = blob;
            break;
        }

        if (size > maxBytes) {
            if (quality > 0.2) quality -= 0.05;
            else scale -= 0.03;
        } else {
            if (quality < 0.95) quality += 0.03;
            else scale += 0.02;
        }
    }

    if (!resultBlob) {
        const data = canvas.toDataURL("image/jpeg", quality);
        resultBlob = dataURLtoBlob(data);
    }

    return resultBlob;
}

document.getElementById('runKb').onclick = async () => {
    if (!files.length) return alert("Upload images first.");

    const val = Number(targetSizeEl.value);
    if (!val) return alert("Enter valid target size.");

    const unit = sizeUnitEl.value;
    const targetKB = unit === 'mb' ? val * 1024 : val;

    for (const item of files) {
        const out = await compressToTargetSize(item.file, targetKB);
        downloadBlob(out, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
    }

    showSuccess("Downloaded!");
};

// ===============================
// PX RESIZE TOOL
// ===============================
document.getElementById('runPx').onclick = () => {
    if (!files.length) return alert("Upload images first.");

    const w = Number(widthPxEl.value);
    const h = Number(heightPxEl.value);
    const keep = keepAspectEl.checked;

    if (!w && !h) return alert("Enter width or height");

    let processed = 0;

    files.forEach(item => {
        const img = new Image();

        img.onload = () => {
            let tw = w || img.naturalWidth;
            let th = h || img.naturalHeight;

            if (keep) {
                if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
                if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
            }

            const c = document.createElement('canvas');
            c.width = tw;
            c.height = th;

            c.getContext('2d').drawImage(img, 0, 0, tw, th);

            c.toBlob(blob => {
                downloadBlob(blob, `${stripExt(item.file.name)}-${tw}x${th}.jpg`);
                processed++;

                if (processed === files.length) showSuccess("Downloaded!");
            }, 'image/jpeg', 0.92);
        };

        img.src = item.dataURL;
    });
};

// ===============================
// COMPRESS TOOL
// ===============================
qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value;

document.getElementById('runCompress').onclick = () => {
    if (!files.length) return alert("Upload images first.");

    const q = Number(qualitySlider.value) / 100;
    let processed = 0;

    files.forEach(item => {
        const img = new Image();

        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;

            c.getContext('2d').drawImage(img, 0, 0);

            c.toBlob(blob => {
                downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`);
                processed++;

                if (processed === files.length) showSuccess("Downloaded!");
            }, 'image/jpeg', q);
        };

        img.src = item.dataURL;
    });
};

// ===============================
// CONVERT TOOL (FULL FIXED)
// JPG + PNG + WEBP FULL SUPPORT
// ===============================
document.getElementById('runConvert').onclick = () => {
    if (!files.length) return alert("Upload images first.");

    const fmt = convertFormat.value;

    const extMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
    };

    const ext = extMap[fmt] || '.jpg';

    let processed = 0;

    files.forEach(item => {
        const img = new Image();

        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;

            c.getContext('2d').drawImage(img, 0, 0);

            c.toBlob(blob => {
                downloadBlob(blob, `${stripExt(item.file.name)}${ext}`);
                processed++;

                if (processed === files.length) showSuccess("Converted & Downloaded!");
            }, fmt, 0.92);
        };

        img.src = item.dataURL;
    });
};

// ADD WEBP OPTION THROUGH JS (HTML untouched)
if (convertFormat && !document.getElementById("webpAdded")) {
    const opt = document.createElement("option");
    opt.value = "image/webp";
    opt.textContent = "WEBP";
    opt.id = "webpAdded";
    convertFormat.appendChild(opt);
}

// ===============================
// PDF TOOL
// ===============================
document.getElementById('runPdf').onclick = () => {
    if (!files.length) return alert("Upload images first.");

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    let processed = 0;

    files.forEach((item, idx) => {
        const img = new Image();

        img.onload = () => {
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            const ratio = Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight);

            const w = img.naturalWidth * ratio;
            const h = img.naturalHeight * ratio;

            const x = (pageW - w) / 2;
            const y = (pageH - h) / 2;

            if (idx > 0) pdf.addPage();

            pdf.addImage(img, "JPEG", x, y, w, h);

            processed++;

            if (processed === files.length) {
                pdf.save("images.pdf");
                showSuccess("PDF Downloaded!");
            }
        };

        img.src = item.dataURL;
    });
};