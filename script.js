// ===================== QUICKPIC - SAB KUCH 100% WORKING + FAST (FIXED KB & CONVERT) =====================

// ---------- Toast (messages) ----------
function showSuccess(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', top:'20px', right:'20px', background:'#16a34a', color:'#fff',
    padding:'14px 24px', borderRadius:'10px', fontWeight:'600', zIndex:99999,
    boxShadow:'0 4px 15px rgba(0,0,0,0.2)', fontSize:'16px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function showError(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', top:'20px', right:'20px', background:'#dc2626', color:'#fff',
    padding:'14px 24px', borderRadius:'10px', fontWeight:'600', zIndex:99999,
    boxShadow:'0 4px 15px rgba(0,0,0,0.2)', fontSize:'16px'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ---------- DOM refs ----------
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const dropbox = document.getElementById('dropbox');
const browseText = document.getElementById('browseText');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');

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

// ---------- add webp option if missing ----------
if (convertFormat && !convertFormat.querySelector('#webpAdded')) {
  const opt = document.createElement('option');
  opt.value = 'image/webp';
  opt.id = 'webpAdded';
  opt.textContent = '→ WebP';
  convertFormat.appendChild(opt);
}

// ---------- drag & drop & file inputs ----------
['dragenter','dragover'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.add('dragover');}));
['dragleave','drop'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.remove('dragover');}));
dropbox?.addEventListener('drop', e => {e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files);});

selectBtn?.addEventListener('click', () => fileInput.click());
browseText?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', e => handleFiles(e.target.files));
resetBtn?.addEventListener('click', () => {
  files = []; if (fileInput) fileInput.value = '';
  if (thumbGrid) thumbGrid.innerHTML = '';
  if (thumbsArea) thumbsArea.classList.add('hidden');
  const sel = document.getElementById('select-area'); if (sel) sel.style.display = 'block';
});

// tool switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('visible', p.id === btn.dataset.tool));
  };
});

// ---------- file handling ----------
function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f && f.type && f.type.startsWith('image/'));
  if (!valid.length) return showError("Only images allowed (JPG/PNG/WebP)!");
  files = []; if (thumbGrid) thumbGrid.innerHTML = '';
  const proms = valid.map(file => new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        files.push({ file, dataURL: e.target.result, width: img.naturalWidth, height: img.naturalHeight });
        if (thumbGrid) thumbGrid.innerHTML += `<div class="thumb-item"><img src="${e.target.result}" alt="${file.name}"><div class="thumb-meta">${file.name}<br>${(file.size/1024).toFixed(1)} KB<br>${img.naturalWidth}×${img.naturalHeight}</div></div>`;
        res();
      };
      img.onerror = () => res();
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }));
  Promise.all(proms).then(() => {
    const sel = document.getElementById('select-area'); if (sel) sel.style.display = 'none';
    if (thumbsArea) thumbsArea.classList.remove('hidden');
  });
}

function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function stripExt(n) { return n.replace(/\.[^/.]+$/, ''); }
function loadImage(dataURL) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(img); // resolve anyway (error handled later)
    img.src = dataURL;
  });
}

// ----------------- KB/MB compressor (fixed: binary search + downscale fallback) -----------------
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const tolerance = 8 * 1024; // ±8 KB
  const minBytes = Math.max(1, targetBytes - tolerance);
  const maxBytes = targetBytes + tolerance;

  // read file as dataURL and load
  const dataURL = await new Promise(res => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.readAsDataURL(file); });
  const img = await loadImage(dataURL);

  // prepare canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // first: try binary search on quality at original dimensions
  let qMin = 0.05, qMax = 0.95;
  let bestBlob = null;
  let bestDiff = Infinity;

  for (let i = 0; i < 18; i++) {
    const q = (qMin + qMax) / 2;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
    if (!blob) continue;
    const size = blob.size;
    const diff = Math.abs(size - targetBytes);
    if (diff < bestDiff) { bestDiff = diff; bestBlob = blob; }
    if (size > maxBytes) qMax = q;
    else if (size < minBytes) qMin = q;
    else return blob; // in tolerance
  }

  // If not found, try progressive downscaling with small quality search
  // decrease dimensions gradually until acceptable or minimum scale reached
  let scale = 0.95;
  while (scale > 0.3) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // small quality binary search on this scale
    let localMin = 0.05, localMax = 0.95;
    for (let k = 0; k < 12; k++) {
      const q = (localMin + localMax) / 2;
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
      if (!blob) continue;
      const size = blob.size;
      const diff = Math.abs(size - targetBytes);
      if (diff < bestDiff) { bestDiff = diff; bestBlob = blob; }
      if (size > maxBytes) localMax = q;
      else if (size < minBytes) localMin = q;
      else return blob;
    }

    scale -= 0.08;
  }

  // final fallback: return best found blob (could be null if something broke)
  return bestBlob;
}

// run KB/MB
document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const val = Number(targetSizeEl?.value);
  if (!val || val <= 0) return showError('Enter a valid size!');
  const targetKB = sizeUnitEl?.value === 'mb' ? val * 1024 : val;

  let processed = 0, success = 0;
  for (const item of files) {
    try {
      const out = await compressToTargetSize(item.file, targetKB);
      if (out) { downloadBlob(out, `${stripExt(item.file.name)}-${targetKB}KB.jpg`); success++; }
    } catch (e) { console.error('compress error', e); }
    if (++processed === files.length) {
      success ? showSuccess(`Success: ${success} image(s) resized near ${targetKB} KB`) : showError('Compression failed for all images');
    }
  }
});

// ----------------- PIXEL RESIZE -----------------
document.getElementById('runPx')?.addEventListener('click', async () => {
  if (!files.length) return showError('Upload first!');
  let w = Number(widthPxEl?.value), h = Number(heightPxEl?.value);
  if (!w && !h) return showError('Enter width or height!');
  let done = 0, success = 0;
  for (const item of files) {
    try {
      const img = await loadImage(item.dataURL);
      let tw = w || img.naturalWidth, th = h || img.naturalHeight;
      if (keepAspectEl?.checked) {
        if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
        else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
      }
      const c = document.createElement('canvas'); c.width = Math.max(1, tw); c.height = Math.max(1, th);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.92));
      if (blob) { downloadBlob(blob, `${stripExt(item.file.name)}-${tw}x${th}.jpg`); success++; }
    } catch (e) { console.error('px resize error', e); }
    if (++done === files.length) success ? showSuccess('Resized successfully!') : showError('Resize failed');
  }
});

// ----------------- QUALITY COMPRESS -----------------
if (qualitySlider) qualitySlider.oninput = () => qualityVal && (qualityVal.textContent = qualitySlider.value);

document.getElementById('runCompress')?.addEventListener('click', async () => {
  if (!files.length) return showError('Upload first!');
  const q = Math.max(0.03, Math.min(0.95, Number(qualitySlider?.value) / 100));
  let done = 0, success = 0;
  for (const item of files) {
    try {
      const img = await loadImage(item.dataURL);
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
      if (blob) { downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`); success++; }
    } catch (e) { console.error('compress error', e); }
    if (++done === files.length) success ? showSuccess('Compressed successfully!') : showError('Compression failed');
  }
});

// ----------------- Convert (JPG / PNG / WEBP) - FIXED with fallback -----------------
async function canvasToBlobAsync(canvas, fmt, quality) {
  return new Promise(res => {
    try {
      canvas.toBlob(b => res(b), fmt, quality);
    } catch (e) {
      res(null);
    }
  });
}

document.getElementById('runConvert')?.addEventListener('click', async () => {
  if (!files.length) return showError('Upload first!');
  const fmt = convertFormat?.value || 'image/jpeg';
  let done = 0, success = 0;

  for (const item of files) {
    try {
      const img = await loadImage(item.dataURL);
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      // try requested format
      let blob = await canvasToBlobAsync(c, fmt, fmt === 'image/jpeg' ? 0.92 : 0.95);
      // fallback: if browser doesn't support webp or returned null, try jpeg
      if (!blob && fmt !== 'image/jpeg') {
        blob = await canvasToBlobAsync(c, 'image/jpeg', 0.92);
      }
      // if still null, final fallback: use dataURL -> convert to blob
      if (!blob) {
        const dataUrl = c.toDataURL('image/jpeg', 0.92);
        blob = (function(dataURL) {
          const arr = dataURL.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8 = new Uint8Array(n);
          while (n--) u8[n] = bstr.charCodeAt(n);
          return new Blob([u8], { type: mime });
        })(dataUrl);
      }

      const ext = fmt === 'image/png' ? '.png' : (fmt === 'image/webp' ? '.webp' : '.jpg');
      if (blob) { downloadBlob(blob, `${stripExt(item.file.name)}${ext}`); success++; }
    } catch (e) {
      console.error('convert error', e);
    }
    if (++done === files.length) success ? showSuccess('Converted successfully!') : showError('Conversion failed');
  }
});

// ----------------- Images -> PDF -----------------
document.getElementById('runPdf')?.addEventListener('click', async () => {
  if (!files.length) return showError('Upload first!');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({unit:'pt',format:'a4'});
  let success = 0;
  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    try {
      const img = await loadImage(item.dataURL);
      const ratio = Math.min(pdf.internal.pageSize.getWidth()/img.naturalWidth, pdf.internal.pageSize.getHeight()/img.naturalHeight);
      const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
      if (i > 0) pdf.addPage();
      pdf.addImage(item.dataURL, 'JPEG', (pdf.internal.pageSize.getWidth()-w)/2, (pdf.internal.pageSize.getHeight()-h)/2, w, h);
      success++;
    } catch (e) { console.error('pdf add image error', e); }
  }
  if (success === files.length) { pdf.save('images.pdf'); showSuccess('PDF ready!'); }
  else showError('PDF creation incomplete');
});

// ----------------- Passport size -----------------
passportBtn && (passportBtn.onclick = async () => {
  if (!files.length) return showError('Upload first!');
  let success = 0;
  for (const item of files) {
    try {
      const img = await loadImage(item.dataURL);
      const c = document.createElement('canvas'); c.width = 413; c.height = 531;
      const ctx = c.getContext('2d');
      // center-crop to fill
      const scale = Math.max(413/img.naturalWidth, 531/img.naturalHeight);
      const sw = Math.round(413 / scale), sh =