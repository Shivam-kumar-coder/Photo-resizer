// ===================== QUICKPIC - FINAL FULL SCRIPT.JS =====================
// All tools working | Green/Red toast messages | No alerts | Mobile ready

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
const passportBtn = document.getElementById('passportBtn');

let files = [];

// ===================== TOAST MESSAGES (Green & Red) =====================
function showSuccess(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ===================== DRAG & DROP =====================
['dragenter', 'dragover'].forEach(e => dropbox?.addEventListener(e, ev => { ev.preventDefault(); dropbox.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(e => dropbox?.addEventListener(e, ev => { ev.preventDefault(); dropbox.classList.remove('dragover'); }));

dropbox?.addEventListener('drop', e => {
  e.preventDefault(); e.stopPropagation();
  handleFiles(e.dataTransfer.files);
});

// ===================== FILE SELECT =====================
selectBtn && (selectBtn.onclick = () => fileInput.click());
browseText && (browseText.onclick = () => fileInput.click());
fileInput && (fileInput.onchange = e => handleFiles(e.target.files));
resetBtn && (resetBtn.onclick = resetAll);

// ===================== TOOL SWITCHING =====================
navButtons.forEach(btn => {
  btn.onclick = () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const toolId = btn.dataset.tool;
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
  };
});

// ===================== HANDLE FILES =====================
function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type?.startsWith('image/'));
  if (!valid.length) return showError("Please upload valid images (JPG/PNG/WebP)");

  files = [];
  thumbGrid.innerHTML = '';
  let loaded = 0;

  valid.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        files.push({ file, dataURL: e.target.result, width: img.naturalWidth, height: img.naturalHeight });
        addThumb(file.name, e.target.result, img.naturalWidth, img.naturalHeight, file.size);
        if (++loaded === valid.length) afterFilesLoaded();
      };
      img.onerror = () => { if (++loaded === valid.length) afterFilesLoaded(); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function addThumb(name, src, w, h, size) {
  const div = document.createElement('div');
  div.className = 'thumb-item';
  div.innerHTML = `<img src="\( {src}"><div class="thumb-meta"> \){name}<br>\( {(size/1024).toFixed(1)} KB<br> \){w}×${h}</div>`;
  thumbGrid.appendChild(div);
}

function afterFilesLoaded() {
  document.getElementById('select-area').style.display = 'none';
  thumbsArea.classList.remove('hidden');
}

function resetAll() {
  files = []; fileInput.value = ''; thumbGrid.innerHTML = '';
  thumbsArea.classList.add('hidden');
  document.getElementById('select-area').style.display = 'block';
}

// ===================== UTILITIES =====================
function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stripExt(name) { return name.replace(/\.[^/.]+$/, ""); }

// ===================== KB/MB RESIZE (Now with Green Message!) =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const minBytes = (targetKB - 10) * 1024;
  const maxBytes = (targetKB + 10) * 1024;

  const dataURL = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
  const img = new Image(); img.src = dataURL; await new Promise(res => img.onload = res);

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  let quality = 0.92, scale = 1.0, bestBlob = null, bestDiff = Infinity;

  for (let i = 0; i < 35; i++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    const size = blob.size;
    const diff = Math.abs(size - targetBytes);
    if (diff < bestDiff) { bestDiff = diff; bestBlob = blob; }
    if (size >= minBytes && size <= maxBytes) return blob;
    if (size > maxBytes) { if (quality > 0.3) quality -= 0.05; else scale -= 0.04; }
    else { if (quality < 0.95) quality += 0.03; else scale += 0.02; }
  }
  return bestBlob;
}

document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return showError("Enter a valid size!");
  const targetKB = sizeUnitEl.value === 'mb' ? val * 1024 : val;

  let processed = 0, success = 0;
  for (const item of files) {
    const blob = await compressToTargetSize(item.file, targetKB);
    if (blob) { downloadBlob(blob, `\( {stripExt(item.file.name)}- \){targetKB}KB.jpg`); success++; }
    if (++processed === files.length) {
      success ? showSuccess(`Success: ${success} image(s) resized!`) : showError("Compression failed");
    }
  }
});

// ===================== OTHER TOOLS (All with Toast) =====================
document.getElementById('runPx')?.addEventListener('click', () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const w = Number(widthPxEl.value), h = Number(heightPxEl.value);
  if (!w && !h) return showError("Enter width or height!");
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      let tw = w || img.naturalWidth, th = h || img.naturalHeight;
      if (keepAspectEl.checked) {
        if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
        else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
      }
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      c.getContext('2d').drawImage(img, 0, 0, tw, th);
      c.toBlob(b => { if (b) { downloadBlob(b, `\( {stripExt(item.file.name)}- \){tw}x${th}.jpg`); success++; } }, 'image/jpeg', 0.92);
      if (++done === files.length) success ? showSuccess("Resized successfully!") : showError("Resize failed");
    };
  });
});

qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress')?.addEventListener('click', () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const q = Number(qualitySlider.value) / 100;
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-compressed.jpg`); success++; } }, 'image/jpeg', q);
      if (++done === files.length) success ? showSuccess("Compressed successfully!") : showError("Compression failed");
    };
  });
});

document.getElementById('runConvert')?.addEventListener('click', () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const fmt = convertFormat.value;
  const ext = fmt === 'image/png' ? '.png' : '.jpg';
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `\( {stripExt(item.file.name)} \){ext}`); success++; } }, fmt);
      if (++done === files.length) success ? showSuccess("Converted successfully!") : showError("Conversion failed");
    };
  });
});

document.getElementById('runPdf')?.addEventListener('click', () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  let done = 0;
  files.forEach((item, i) => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const r = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * r, h = img.naturalHeight * r;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      if (++done === files.length) { pdf.save('images.pdf'); showSuccess("PDF created successfully!"); }
    };
  });
});

// ===================== PASSPORT SIZE =====================
passportBtn && (passportBtn.onclick = () => {
  if (!files.length) return showError("Please upload image(s) first!");
  const w = 413, h = 531; // 35×45 mm high quality
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = Math.round(w / scale), sh = Math.round(h / scale);
      const sx = Math.round((img.naturalWidth - sw) / 2);
      const sy = Math.round((img.naturalHeight - sh) / 2);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      canvas.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-passport.jpg`); success++; } }, 'image/jpeg', 0.95);
      if (++done === files.length) success ? showSuccess("Passport photos ready!") : showError("Passport creation failed");
    };
  });
});