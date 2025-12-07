// ===================== QUICKPIC - SAB KUCH 100% WORKING + FAST =====================
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

// ===================== TOAST (SPINNER REMOVED) =====================
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

// ===================== FILE HANDLING =====================
['dragenter','dragover'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.add('dragover');}));
['dragleave','drop'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.remove('dragover');}));
dropbox?.addEventListener('drop', e => {e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files);});

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

function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type?.startsWith('image/'));
  if (!valid.length) return showError("Only images allowed!");
  files = []; thumbGrid.innerHTML = ''; let loaded = 0;

  valid.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        files.push({file, dataURL: e.target.result, width: img.naturalWidth, height: img.naturalHeight});

        // FIX: THUMBNAIL DISPLAY
        thumbGrid.innerHTML += `<div class="thumb-item"><img src="${e.target.result}"><div class="thumb-meta">${file.name}<br>${(file.size/1024).toFixed(1)} KB<br>${img.naturalWidth}×${img.naturalHeight}</div></div>`;

        if (++loaded === valid.length) {
          document.getElementById('select-area').style.display = 'none';
          thumbsArea.classList.remove('hidden');
        }
      };
      // IMPROVEMENT: Faster file loading
      img.src = e.target.result; 
    };
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function stripExt(name) { return name.replace(/\.[^/.]+$/, ""); }

// ===================== EASY KB REDUCER (ONLY QUALITY) =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const url = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
  const img = new Image(); img.src = url; await new Promise(r => img.onload = r);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

  let quality = 0.9;
  for (let i = 0; i < 15; i++) { 
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));

    // Check if the size is reached. (5KB tolerance, as per logic)
    if (blob.size <= targetBytes + 5 * 1024) return blob; 

    quality -= 0.06; 
    if (quality < 0.1) break; 
  }

  // Final low quality fallback
  return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.1));
}

// ===================== KB/MB BUTTON (WORKING NOW) =====================
document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload images first!");
  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return showError("Enter valid size!");
  const targetKB = sizeUnitEl.value === 'mb' ? val * 1024 : val;

  let success = 0;
  for (const item of files) {
    const blob = await compressToTargetSize(item.file, targetKB);
    if (blob) {
      // FIX: KB REDUCE DOWNLOAD SYNTAX
      downloadBlob(blob, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
      success++;
    }
  }

  success ? showSuccess(`Done! ${success} images reduced`) : showError("Try higher size or check image format!");
});

// ===================== BA AKI TOOLS (Quick & Working) =====================
document.getElementById('runPx')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload first!"); let w = Number(widthPxEl.value), h = Number(heightPxEl.value);
  if (!w && !h) return showError("Enter width/height!"); let s = 0;
  files.forEach(item => { const img = new Image(); img.src = item.dataURL; img.onload = () => {
    let tw = w || img.naturalWidth, th = h || img.naturalHeight;
    if (keepAspectEl.checked) { if (w && !h) th = Math.round(img.naturalHeight * (w/img.naturalWidth));
    else if (h && !w) tw = Math.round(img.naturalWidth * (h/img.naturalHeight)); }
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    c.getContext('2d').drawImage(img, 0, 0, tw, th);
    c.toBlob(b => b && downloadBlob(b, `${stripExt(item.file.name)}-${tw}x${th}.jpg`), 'image/jpeg', 0.92);
    if (++s === files.length) showSuccess("Resized!");
  };});
});

qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload first!"); const q = Number(qualitySlider.value)/100; let s = 0;
  files.forEach(item => { const img = new Image(); img.src = item.dataURL; img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    c.toBlob(b => b && downloadBlob(b, `${stripExt(item.file.name)}-compressed.jpg`), 'image/jpeg', q);
    if (++s === files.length) showSuccess("Compressed!");
  };});
});

document.getElementById('runConvert')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload first!"); const fmt = convertFormat.value; const ext = fmt==='image/png'?'.png':'.jpg'; let s = 0;
  files.forEach(item => { const img = new Image(); img.src = item.dataURL; img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    c.toBlob(b => b && downloadBlob(b, `${stripExt(item.file.name)}${ext}`), fmt);
    if (++s === files.length) showSuccess("Converted!");
  };});
});

document.getElementById('runPdf')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload first!");
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({unit:'pt',format:'a4'}); let done = 0;
  files.forEach((item,i) => { const img = new Image(); img.src = item.dataURL; img.onload = () => {
    const r = Math.min(pdf.internal.pageSize.getWidth()/img.naturalWidth, pdf.internal.pageSize.getHeight()/img.naturalHeight);
    const w = img.naturalWidth*r, h = img.naturalHeight*r;
    if (i>0) pdf.addPage();
    pdf.addImage(img, 'JPEG', (pdf.internal.pageSize.getWidth()-w)/2, (pdf.internal.pageSize.getHeight()-h)/2, w, h);
    if (++done === files.length) { pdf.save('images.pdf'); showSuccess("PDF ready!"); }
  };});
});

passportBtn && (passportBtn.onclick = () => {
  if (!files.length) return showError("Upload first!"); let s = 0;
  files.forEach(item => { const img = new Image(); img.src = item.dataURL; img.onload = () => {
    const c = document.createElement('canvas'); c.width = 413; c.height = 531;
    const ctx = c.getContext('2d');
    const scale = Math.max(413/img.naturalWidth, 531/img.naturalHeight);
    const sw = Math.round(413/scale), sh = Math.round(531/scale);
    ctx.drawImage(img, (img.naturalWidth-sw)/2, (img.naturalHeight-sh)/2, sw, sh, 0, 0, 413, 531);
    c.toBlob(b => b && downloadBlob(b, `${stripExt(item.file.name)}-passport.jpg`), 'image/jpeg', 0.95);
    if (++s === files.length) showSuccess("Passport photos ready!");
  };});
});
