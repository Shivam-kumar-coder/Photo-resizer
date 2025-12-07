// ===================== QUICKPIC - SAB KUCH 100% WORKING FINAL =====================
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

// ===================== TOAST + SPINNER =====================
function showSuccess(msg) {
  const t = document.createElement('div'); t.className = 'toast success'; t.textContent = msg;
  Object.assign(t.style, {position:'fixed',top:'18px',right:'18px',background:'#16a34a',color:'#fff',padding:'12px 20px',borderRadius:'8px',zIndex:99999,fontWeight:600,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'});
  document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}
function showError(msg) {
  const t = document.createElement('div'); t.className = 'toast error'; t.textContent = msg;
  Object.assign(t.style, {position:'fixed',top:'18px',right:'18px',background:'#dc2626',color:'#fff',padding:'12px 20px',borderRadius:'8px',zIndex:99999,fontWeight:600,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'});
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function createSpinner(msg) {
  const s = document.createElement('div'); s.id = 'spinner-box';
  Object.assign(s.style, {position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',padding:'20px 30px',borderRadius:'12px',boxShadow:'0 8px 25px rgba(0,0,0,0.2)',textAlign:'center',zIndex:99999,fontSize:'16px',fontWeight:600});
  s.innerHTML = `<div style="border:5px solid #f0f0f0;border-top:5px solid #16a34a;border-radius:50%;width:40px;height:40px;margin:0 auto 12px;animation:spin 1s linear infinite;"></div>${msg}`;
  document.body.appendChild(s);
}
function removeSpinner() { document.getElementById('spinner-box')?.remove(); }

// Spinner animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`;
document.head.appendChild(spinStyle);

// ===================== FILE HANDLING =====================
['dragenter','dragover'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.add('dragover');}));
['dragleave','drop'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.remove('dragover');}));
dropbox?.addEventListener('drop', e => {e.preventDefault(); handleFiles(e.dataTransfer.files);});

selectBtn?.addEventListener('click', () => fileInput.click());
browseText?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', e => handleFiles(e.target.files));
resetBtn?.addEventListener('click', () => {
  files = []; fileInput.value = ''; thumbGrid.innerHTML = '';
  thumbsArea.classList.add('hidden');
  document.getElementById('select-area').style.display = 'block';
});

// Tool switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('visible', p.id === btn.dataset.tool));
  };
});

function handleFiles(fl) {
  const valid = Array.from(fl).filter(f => f.type?.startsWith('image/'));
  if (!valid.length) return showError("Only images allowed!");
  files = []; thumbGrid.innerHTML = ''; let loaded = 0;
  valid.forEach(f => {
    const r = new FileReader(); r.onload = e => {
      const img = new Image(); img.onload = () => {
        files.push({file: f, dataURL: e.target.result, width: img.naturalWidth, height: img.naturalHeight});
        thumbGrid.innerHTML += `<div class="thumb-item"><img src="\( {e.target.result}"><div class="thumb-meta"> \){f.name}<br>\( {(f.size/1024).toFixed(1)} KB<br> \){img.naturalWidth}×${img.naturalHeight}</div></div>`;
        if (++loaded === valid.length) {
          document.getElementById('select-area').style.display = 'none';
          thumbsArea.classList.remove('hidden');
        }
      }; img.src = e.target.result;
    }; r.readAsDataURL(f);
  });
}

function downloadBlob(b, n) {
  const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = n; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
function stripExt(n) { return n.replace(/\.[^/.]+$/, ""); }

// ===================== TERA GENIUS KB/MB METHOD (Perfect!) =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const dataURL = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
  const img = new Image(); img.src = dataURL; await new Promise(r => img.onload = r);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let size = Math.max(img.naturalWidth, img.naturalHeight);
  const step = targetKB > 1000 ? 80 : targetKB > 300 ? 25 : targetKB > 100 ? 10 : 3;

  for (let i = 0; i < 30; i++) {
    const ratio = img.naturalHeight / img.naturalWidth;
    canvas.width = size; canvas.height = Math.round(size * ratio);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const current = blob.size;

    if (Math.abs(current - targetBytes) <= 10 * 1024) return blob;
    if (current > targetBytes + 10 * 1024) size -= step;
    else size += Math.round(step / 2);
  }

  // Final attempt
  canvas.width = size; canvas.height = Math.round(size * (img.naturalHeight / img.naturalWidth));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
}

// ===================== ALL TOOLS =====================

// KB/MB
document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload images first!");
  const val = Number(targetSizeEl.value); if (!val || val <= 0) return showError("Enter valid size!");
  const targetKB = sizeUnitEl.value === 'mb' ? val * 1024 : val;
  createSpinner(`Resizing to ~${targetKB} KB...`);

  let success = 0;
  for (const item of files) {
    const blob = await compressToTargetSize(item.file, targetKB);
    if (blob) { downloadBlob(blob, `\( {stripExt(item.file.name)}- \){targetKB}KB.jpg`); success++; }
  }
  removeSpinner();
  success ? showSuccess(`Success: ${success} images resized!`) : showError("Try a nearby size");
});

// Pixel Resize
document.getElementById('runPx')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const w = Number(widthPxEl.value), h = Number(heightPxEl.value);
  if (!w && !h) return showError("Enter width or height!");
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL; img.onload = () => {
      let tw = w || img.naturalWidth, th = h || img.naturalHeight;
      if (keepAspectEl.checked) {
        if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
        else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
      }
      const c = document.createElement('canvas'); c.width = tw; c.height = th;
      c.getContext('2d').drawImage(img, 0, 0, tw, th);
      c.toBlob(b => { if (b) { downloadBlob(b, `\( {stripExt(item.file.name)}- \){tw}x${th}.jpg`); success++; } }, 'image/jpeg', 0.92);
      if (++done === files.length) success ? showSuccess("Resized!") : showError("Failed");
    };
  });
});

// Compress
qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const q = Number(qualitySlider.value) / 100;
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL; img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-compressed.jpg`); success++; } }, 'image/jpeg', q);
      if (++done === files.length) success ? showSuccess("Compressed!") : showError("Failed");
    };
  });
});

// Convert
document.getElementById('runConvert')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const fmt = convertFormat.value;
  const ext = fmt === 'image/png' ? '.png' : '.jpg';
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL; img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `\( {stripExt(item.file.name)} \){ext}`); success++; } }, fmt);
      if (++done === files.length) success ? showSuccess("Converted!") : showError("Failed");
    };
  });
});

// PDF
document.getElementById('runPdf')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  let done = 0;
  files.forEach((item, i) => {
    const img = new Image(); img.src = item.dataURL; img.onload = () => {
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const r = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * r, h = img.naturalHeight * r;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h);
      if (++done === files.length) { pdf.save('images.pdf'); showSuccess("PDF ready!"); }
    };
  });
});

// Passport Size
passportBtn && (passportBtn.onclick = () => {
  if (!files.length) return showError("Upload images first!");
  let success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL; img.onload = () => {
      const c = document.createElement('canvas'); c.width = 413; c.height = 531;
      const ctx = c.getContext('2d');
      const scale = Math.max(413 / img.naturalWidth, 531 / img.naturalHeight);
      const sw = Math.round(413 / scale), sh = Math.round(531 / scale);
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, 413, 531);
      c.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-passport.jpg`); success++; } }, 'image/jpeg', 0.95);
    };
  });
  setTimeout(() => success ? showSuccess("Passport photos ready!") : null, 1500);
});