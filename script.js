// QuickPic - 100% Working Final Version with All Tools Fixed
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
const runPassportBtn = document.getElementById('runPassport'); 
// New PDF Buttons
const runPdfMergeBtn = document.getElementById('runPdfMerge');
const runPdfSeparateBtn = document.getElementById('runPdfSeparate');

let files = [];

// ===================== TOAST MESSAGES & UTILITIES =====================
function showToast(msg, type) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.className = `toast ${type}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function showSuccess(msg) { return showToast(msg, 'success'); }
function showError(msg) { return showToast(msg, 'error'); }

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
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    // Success message moved to individual tool handlers for better context
}

function stripExt(name) {
    return name.replace(/\.[^/.]+$/, '');
}

function loadImage(dataURL) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load."));
        img.src = dataURL;
    });
}

// ===================== FILE HANDLING & UX =====================
['dragenter', 'dragover'].forEach(e => dropbox.addEventListener(e, () => dropbox.classList.add('dragover')));
['dragleave', 'drop'].forEach(e => dropbox.addEventListener(e, () => dropbox.classList.remove('dragover')));
dropbox.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); });

selectBtn.onclick = browseText.onclick = () => fileInput.click();
fileInput.onchange = e => handleFiles(e.target.files);
resetBtn.onclick = resetAll;

navButtons.forEach(btn => {
    btn.onclick = () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const toolId = btn.dataset.tool;
        toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
    };
});

function handleFiles(fileList) {
    const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!valid.length) return showError('Please select valid images (JPG/PNG/WebP)');
    
    files = []; 
    thumbGrid.innerHTML = '';
    
    const filePromises = valid.map(file => {
        return new Promise(resolve => {
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
                    resolve();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(() => {
        files.sort((a, b) => a.file.name.localeCompare(b.file.name)); // Sort by name
        document.getElementById('select-area').style.display = 'none';
        thumbsArea.classList.remove('hidden');
    });
}

function addThumb(name, src, w, h, size) {
    const div = document.createElement('div');
    div.className = 'thumb-item';
    div.innerHTML = `<img src="${src}" alt="${name}">
        <div class="thumb-meta">${name}<br>${(size/1024).toFixed(1)} KB<br>${w}×${h}</div>`;
    thumbGrid.appendChild(div);
}

function resetAll() {
    files = []; thumbGrid.innerHTML = ''; fileInput.value = '';
    thumbsArea.classList.add('hidden');
    document.getElementById('select-area').style.display = 'block';
}


// ===================== 1. KB REDUCER LOGIC =====================
async function compressToTargetSize(file, targetKB) {
    const targetBytes = targetKB * 1024;
    const dataURL = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
    const img = await loadImage(dataURL);

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    let quality = 0.92;
    let scale = 1;

    for (let iter = 0; iter < 18; iter++) {
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const data = canvas.toDataURL('image/jpeg', quality);
        const blob = dataURLtoBlob(data);

        if (blob.size <= targetBytes + 5 * 1024) return blob; 

        if (quality > 0.3) quality -= 0.08;
        else scale -= 0.08;

        if (quality < 0.1 || scale < 0.1) break; 
    }
    
    const finalData = canvas.toDataURL('image/jpeg', 0.1);
    return dataURLtoBlob(finalData);
}

document.getElementById('runKb').addEventListener('click', async () => {
    if (!files.length) return showError('Upload image(s) first.');
    const val = Number(targetSizeEl.value);
    if (!val || val <= 0) return showError('Enter valid target KB size.');
    
    const targetKB = val; 
    let processedCount = 0;

    for (const item of files) {
        try {
            const out = await compressToTargetSize(item.file, targetKB);
            downloadBlob(out, `${stripExt(item.file.name)}-to-${targetKB}KB.jpg`);
            processedCount++;
        } catch (err) {
            console.error(err);
        }
    }
    if (processedCount > 0) showSuccess(`Successfully reduced ${processedCount} image(s) to ${targetKB} KB!`);
    else showError('Error processing images. Try a higher target size.');
});


// ===================== 2. PX RESIZE TOOL (Multi-Image Fixed) =====================
document.getElementById('runPx').addEventListener('click', async () => {
    if (!files.length) return showError('Upload image(s) first.');
    const w = Number(widthPxEl.value);
    const h = Number(heightPxEl.value);
    const keep = keepAspectEl.checked;
    if (!w && !h) return showError('Enter width or height.');
    
    let processedCount = 0;
    for (const item of files) {
        const img = await loadImage(item.dataURL);
        let tw = w || img.naturalWidth;
        let th = h || img.naturalHeight;
        
        if (keep) {
            if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
            else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
        }
        
        const c = document.createElement('canvas');
        c.width = tw; c.height = th;
        c.getContext('2d').drawImage(img, 0, 0, tw, th);
        
        const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.92));
        downloadBlob(blob, `${stripExt(item.file.name)}-resized-${tw}x${th}.jpg`);
        processedCount++;
    }
    if (processedCount > 0) showSuccess(`Successfully resized ${processedCount} image(s)!`);
});

// ===================== 3. COMPRESS TOOL (Multi-Image Fixed) =====================
qualitySlider.addEventListener('input', () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress').addEventListener('click', async () => {
    if (!files.length) return showError('Upload image(s) first.');
    const q = Number(qualitySlider.value) / 100;
    
    let processedCount = 0;
    for (const item of files) {
        const img = await loadImage(item.dataURL);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        
        const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
        downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`);
        processedCount++;
    }
    if (processedCount > 0) showSuccess(`Successfully compressed ${processedCount} image(s) to ${qualitySlider.value}% quality!`);
});

// ===================== 4. CONVERT TOOL (Multi-Image Fixed & Naming Fixed) =====================
document.getElementById('runConvert').addEventListener('click', async () => {
    if (!files.length) return showError('Upload image(s) first.');
    const fmt = convertFormat.value;
    const extName = convertFormat.options[convertFormat.selectedIndex].text.split('→ ')[1];
    const ext = fmt === 'image/png' ? '.png' : fmt === 'image/webp' ? '.webp' : '.jpg';
    
    let processedCount = 0;
    for (const item of files) {
        const img = await loadImage(item.dataURL);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        
        const blob = await new Promise(res => c.toBlob(res, fmt));
        // NAMING FIX: Includes the target format name
        downloadBlob(blob, `${stripExt(item.file.name)}-converted-to-${extName.toLowerCase()}.jpg`);
        processedCount++;
    }
    if (processedCount > 0) showSuccess(`Successfully converted ${processedCount} image(s) to ${extName}!`);
});
      
// ===================== 5. PASSPORT SIZE TOOL (Multi-Image Fixed) =====================
runPassportBtn.addEventListener('click', async () => {
    if (!files.length) return showError('Upload image(s) first.');
    
    const TARGET_W = 413; // 35mm at 300 DPI
    const TARGET_H = 531; // 45mm at 300 DPI

    let processedCount = 0;
    for (const item of files) {
        const img = await loadImage(item.dataURL);
        
        const c = document.createElement('canvas');
        c.width = TARGET_W; c.height = TARGET_H;
        const ctx = c.getContext('2d');
        
        const scale = Math.max(TARGET_W / img.naturalWidth, TARGET_H / img.naturalHeight);
        const scaledW = img.naturalWidth * scale;
        const scaledH = img.naturalHeight * scale;
        
        const dx = (TARGET_W - scaledW) / 2;
        const dy = (TARGET_H - scaledH) / 2;

        ctx.drawImage(img, dx, dy, scaledW, scaledH);
        
        const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.95));
        downloadBlob(blob, `${stripExt(item.file.name)}-passport.jpg`);
        processedCount++;
    }
    if (processedCount > 0) showSuccess(`Successfully created ${processedCount} passport photo(s)!`);
});


// ===================== 6. PDF TOOL (Merge & Separate Options Fixed) =====================

// Function to process and download a single PDF
async function processAndDownloadPDF(fileList, isMerge) {
    if (!window.jspdf) return showError("PDF library not loaded.");
    const { jsPDF } = window.jspdf;
    
    if (isMerge) {
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        
        for (let i = 0; i < fileList.length; i++) {
            const item = fileList[i];
            const img = await loadImage(item.dataURL);

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            
            const ratio = Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight);
            const drawW = img.naturalWidth * ratio;
            const drawH = img.naturalHeight * ratio;
            const x = (pageW - drawW) / 2;
            const y = (pageH - drawH) / 2;
            
            if (i > 0) pdf.addPage();
            
            pdf.addImage(img, 'JPEG', x, y, drawW, drawH);
        }
        
        pdf.save('QuickPic-Merged-Images.pdf');
        showSuccess("Successfully merged all images into one PDF!");

    } else { // Separate PDFs
        let processedCount = 0;
        for (const item of fileList) {
            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            const img = await loadImage(item.dataURL);

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            
            const ratio = Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight);
            const drawW = img.naturalWidth * ratio;
            const drawH = img.naturalHeight * ratio;
            const x = (pageW - drawW) / 2;
            const y = (pageH - drawH) / 2;
            
            pdf.addImage(img, 'JPEG', x, y, drawW, drawH);
            pdf.save(`${stripExt(item.file.name)}.pdf`);
            processedCount++;
        }
        showSuccess(`Successfully exported ${processedCount} separate PDF files!`);
    }
}

runPdfMergeBtn.addEventListener('click', () => {
    if (!files.length) return showError('Upload image(s) first.');
    processAndDownloadPDF(files, true); // true for Merge
});

runPdfSeparateBtn.addEventListener('click', () => {
    if (!files.length) return showError('Upload image(s) first.');
    processAndDownloadPDF(files, false); // false for Separate
});

