// ===================== QUICKPIC - FINAL FULL SCRIPT.JS =====================
// All tools working | Green/Red toast messages | No alerts | Mobile ready

// ---------- Toast helpers ----------
function showSuccess(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '18px',
    right: '18px',
    background: '#16a34a',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    zIndex: 99999,
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    fontWeight: 600
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '18px',
    right: '18px',
    background: '#dc2626',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    zIndex: 99999,
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    fontWeight: 600
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ---------- DOM references ----------
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

// validate DOM elements exist
if (!thumbGrid) {
  console.warn('thumb-grid not found in DOM. Make sure your HTML has #thumb-grid');
}

let files = [];

// ---------- Add WebP option if dropdown present ----------
if (convertFormat && !convertFormat.querySelector('#webpAdded')) {
  const opt = document.createElement('option');
  opt.value = 'image/webp';
  opt.id = 'webpAdded';
  opt.textContent = 'Convert → WebP';
  convertFormat.appendChild(opt);
}

// ===================== DRAG & DROP =====================
if (dropbox) {
  ['dragenter', 'dragover'].forEach(ev =>
    dropbox.addEventListener(ev, e => { e.preventDefault(); dropbox.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropbox.addEventListener(ev, e => { e.preventDefault(); dropbox.classList.remove('dragover'); })
  );

  dropbox.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  });
}

// ===================== FILE SELECT =====================
if (selectBtn) selectBtn.onclick = () => fileInput && fileInput.click();
if (browseText) browseText.onclick = () => fileInput && fileInput.click();
if (fileInput) fileInput.onchange = e => handleFiles(e.target.files);
if (resetBtn) resetBtn.onclick = resetAll;

// ===================== TOOL SWITCHING =====================
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const toolId = btn.dataset.tool;
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
  });
});

// ===================== FILE HANDLING =====================
function handleFiles(fileList) {
  const arr = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
  if (!arr.length) return showError('Please upload valid images (JPG/PNG/WebP)');

  files = [];
  if (thumbGrid) thumbGrid.innerHTML = '';

  let loaded = 0;

  arr.forEach(file => {
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
        if (thumbGrid) addThumb(file.name, e.target.result, img.naturalWidth, img.naturalHeight, file.size);
        if (++loaded === arr.length) afterFilesLoaded();
      };
      img.onerror = () => {
        if (++loaded === arr.length) afterFilesLoaded();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function addThumb(name, src, w, h, size) {
  if (!thumbGrid) return;
  const div = document.createElement('div');
  div.className = 'thumb-item';
  div.innerHTML = `
    <img src="${src}" alt="${name}">
    <div class="thumb-meta">${name}<br>${(size/1024).toFixed(1)} KB<br>${w}×${h}</div>
  `;
  thumbGrid.appendChild(div);
}

function afterFilesLoaded() {
  const sel = document.getElementById('select-area');
  if (sel) sel.style.display = 'none';
  if (thumbsArea) thumbsArea.classList.remove('hidden');
}

// reset
function resetAll() {
  files = [];
  if (fileInput) fileInput.value = '';
  if (thumbGrid) thumbGrid.innerHTML = '';
  if (thumbsArea) thumbsArea.classList.add('hidden');
  const sel = document.getElementById('select-area');
  if (sel) sel.style.display = 'block';
}

// ===================== UTILITIES =====================
function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function stripExt(n) {
  return n.replace(/\.[^/.]+$/, '');
}

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// ===================== KB/MB COMPRESSOR (Binary search + fallback) =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const minBytes = Math.max(1, targetBytes - 8 * 1024); // ±8KB
  const maxBytes = targetBytes + 8 * 1024;

  // read file
  const dataURL = await new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(file);
  });

  const img = new Image();
  img.src = dataURL;
  await new Promise(res => { img.onload = res; img.onerror = res; });

  // set canvas to original dimensions initially
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Binary search on quality between qmin and qmax
  let qMin = 0.06, qMax = 0.95;
  let bestBlob = null;
  let bestDiff = Infinity;

  for (let iter = 0; iter < 18; iter++) {
    const q = (qMin + qMax) / 2;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // draw + get blob
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
    if (!blob) continue;
    const size = blob.size;
    const diff = Math.abs(size - targetBytes);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = blob;
    }

    if (size > maxBytes) {
      // too big -> lower quality
      qMax = q;
    } else if (size < minBytes) {
      // too small -> increase quality
      qMin = q;
    } else {
      // within tolerance
      return blob;
    }
  }

  // fallback: try downscaling then re-run small quality search if needed
  if (!bestBlob || Math.abs(bestBlob.size - targetBytes) > 6 * 1024) {
    // iterative downscale loop with small quality adjust
    let scale = 0.95;
    let attempts = 0;
    while (scale > 0.3 && attempts < 12) {
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // small quality binary inside
      let localQMin = 0.05, localQMax = 0.95;
      for (let k = 0; k < 10; k++) {
        const q = (localQMin + localQMax) / 2;
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
        if (!blob) continue;
        const size = blob.size;
        const diff = Math.abs(size - targetBytes);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBlob = blob;
        }
        if (size > maxBytes) localQMax = q;
        else if (size < minBytes) localQMin = q;
        else return blob;
      }

      scale -= 0.08;
      attempts++;
    }
  }

  return bestBlob;
}

// run KB
document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const val = Number(targetSizeEl?.value);
  if (!val || val <= 0) return showError('Enter a valid size!');
  const targetKB = sizeUnitEl?.value === 'mb' ? val * 1024 : val;

  let processed = 0, success = 0;
  for (const item of files) {
    try {
      const out = await compressToTargetSize(item.file, targetKB);
      if (out) {
        downloadBlob(out, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
        success++;
      }
    } catch (e) {
      console.error('compress error', e);
    }
    if (++processed === files.length) {
      success ? showSuccess(`Success: ${success} image(s) resized near ${targetKB} KB`) : showError('Compression failed for all images');
    }
  }
});

// ===================== WIDTH x HEIGHT RESIZE =====================
document.getElementById('runPx')?.addEventListener('click', () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const w = Number(widthPxEl?.value);
  const h = Number(heightPxEl?.value);
  if (!w && !h) return showError('Enter width or height!');
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      let tw = w || img.naturalWidth;
      let th = h || img.naturalHeight;
      if (keepAspectEl?.checked) {
        if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
        else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
      }
      const c = document.createElement('canvas');
      c.width = Math.max(1, tw);
      c.height = Math.max(1, th);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => {
        if (b) { downloadBlob(b, `${stripExt(item.file.name)}-${tw}x${th}.jpg`); success++; }
        if (++done === files.length) success ? showSuccess('Resized successfully!') : showError('Resize failed');
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => {
      if (++done === files.length) showError('One or more images failed to load');
    };
    img.src = item.dataURL;
  });
});

// ===================== COMPRESS (QUALITY) =====================
if (qualitySlider) qualitySlider.oninput = () => qualityVal && (qualityVal.textContent = qualitySlider.value);

document.getElementById('runCompress')?.addEventListener('click', () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const q = Number(qualitySlider?.value) / 100;
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => {
        if (b) { downloadBlob(b, `${stripExt(item.file.name)}-compressed.jpg`); success++; }
        if (++done === files.length) success ? showSuccess('Compressed successfully!') : showError('Compression failed');
      }, 'image/jpeg', Math.max(0.03, Math.min(0.95, q)));
    };
    img.onerror = () => {
      if (++done === files.length) showError('One or more images failed to load');
    };
    img.src = item.dataURL;
  });
});

// ===================== CONVERT (JPG / PNG / WEBP) =====================
document.getElementById('runConvert')?.addEventListener('click', () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const fmt = convertFormat?.value || 'image/jpeg';
  const ext = fmt === 'image/png' ? '.png' : (fmt === 'image/webp' ? '.webp' : '.jpg');
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => {
        if (b) { downloadBlob(b, `${stripExt(item.file.name)}${ext}`); success++; }
        if (++done === files.length) success ? showSuccess('Converted successfully!') : showError('Conversion failed');
      }, fmt, fmt === 'image/jpeg' ? 0.92 : 0.95);
    };
    img.onerror = () => {
      if (++done === files.length) showError('One or more images failed to load');
    };
    img.src = item.dataURL;
  });
});

// ===================== PDF EXPORT =====================
document.getElementById('runPdf')?.addEventListener('click', () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  let done = 0;
  files.forEach((item, i) => {
    const img = new Image();
    img.onload = () => {
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      if (++done === files.length) { pdf.save('images.pdf'); showSuccess('PDF created successfully!'); }
    };
    img.onerror = () => {
      if (++done === files.length) showError('One or more images failed to load');
    };
    img.src = item.dataURL;
  });
});

// ===================== PASSPORT SIZE TOOL =====================
if (passportBtn) passportBtn.addEventListener('click', () => {
  if (!files.length) return showError('Please upload image(s) first!');
  const w = 413, h = 531; // px (35x45 mm approx at 300dpi)
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // center-crop
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = Math.round(w / scale);
      const sh = Math.round(h / scale);
      const sx = Math.round((img.naturalWidth - sw) / 2);
      const sy = Math.round((img.naturalHeight - sh) / 2);

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      canvas.toBlob(b => {
        if (b) { downloadBlob(b, `${stripExt(item.file.name)}-passport.jpg`); success++; }
        if (++done === files.length) success ? showSuccess('Passport photos ready!') : showError('Passport creation failed');
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      if (++done === files.length) showError('One or more images failed to load');
    };
    img.src = item.dataURL;
  });
});