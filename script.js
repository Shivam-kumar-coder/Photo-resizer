// ===================== QUICKPIC - FINAL FULL JS (Tera Genius Method Inside) =====================
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

// ===================== TOAST (Green & Red) =====================
function showSuccess(msg) {
  const t = document.createElement('div');
  t.className = 'toast success';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
function showError(msg) {
  const t = document.createElement('div');
  t.className = 'toast error';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ===================== FILE HANDLING =====================
['dragenter','dragover'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.add('dragover');}));
['dragleave','drop'].forEach(e => dropbox?.addEventListener(e, ev => {ev.preventDefault(); dropbox.classList.remove('dragover');}));
dropbox?.addEventListener('drop', e => {e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files);});

selectBtn && (selectBtn.onclick = () => fileInput.click());
browseText && (browseText.onclick = () => fileInput.click());
fileInput && (fileInput.onchange = e => handleFiles(e.target.files));
resetBtn && (resetBtn.onclick = resetAll);

navButtons.forEach(btn => {
  btn.onclick = () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === btn.dataset.tool));
  };
});

function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type?.startsWith('image/'));
  if (!valid.length) return showError("Only JPG/PNG/WebP allowed!");
  files = []; thumbGrid.innerHTML = ''; let loaded = 0;
  valid.forEach(file => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        files.push({file, dataURL: e.target.result, width: img.naturalWidth, height: img.naturalHeight});
        addThumb(file.name, e.target.result, img.naturalWidth, img.naturalHeight, file.size);
        if (++loaded === valid.length) afterFilesLoaded();
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
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

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function stripExt(n) { return n.replace(/\.[^/.]+$/, ""); }

// ===================== TERA KHUD KA GENIUS METHOD (KB/MB) =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const tolerance = 8 * 1024; // ±8KB (tera logic jaisa)

  const dataURL = await new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(file);
  });

  const img = new Image();
  img.src = dataURL;
  await new Promise(res => img.onload = res);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let size = Math.max(img.naturalWidth, img.naturalHeight);
  const step = targetKB > 1000 ? 100 : targetKB > 300 ? 30 : targetKB > 100 ? 10 : 2;

  while (size > 20) {
    const ratio = img.naturalHeight / img.naturalWidth;
    canvas.width = size;
    canvas.height = Math.round(size * ratio);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const currentBytes = blob.size;

    if (Math.abs(currentBytes - targetBytes) <= tolerance) {
      return blob;
    }

    if (currentBytes > targetBytes + tolerance) {
      size -= step;
    } else {
      // Thoda wapas badhao taaki nearest best mile
      size += Math.round(step / 2);
      const finalBlob = await new Promise(res => {
        canvas.width = size;
        canvas.height = Math.round(size * ratio);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(res, 'image/jpeg', 0.92);
      });
      return finalBlob;
    }
  }

  // Final fallback
  return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
}

// ===================== KB/MB BUTTON =====================
document.getElementById('runKb')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload images first!");
  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return showError("Enter valid size!");
  const targetKB = sizeUnitEl.value === 'mb' ? val * 1024 : val;

  let success = 0;
  for (const item of files) {
    const blob = await compressToTargetSize(item.file, targetKB);
    if (blob && blob.size > 2000) {
      downloadBlob(blob, `\( {stripExt(item.file.name)}- \){targetKB}KB.jpg`);
      success++;
    }
  }
  success ? showSuccess(`Done! \( {success} image(s) resized to ~ \){targetKB}KB`) : showError("Try a nearby size");
});

// ===================== BA AKI TOOLS (Sab Toast ke saath) =====================
document.getElementById('runPx')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
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
      if (++done === files.length) success ? showSuccess("Resized!") : showError("Resize failed");
    };
  });
});

qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const q = Number(qualitySlider.value) / 100;
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-compressed.jpg`); success++; } }, 'image/jpeg', q);
      if (++done === files.length) success ? showSuccess("Compressed!") : showError("Failed");
    };
  });
});

document.getElementById('runConvert')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
  const fmt = convertFormat.value;
  const ext = fmt === 'image/png' ? '.png' : '.jpg';
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { if (b) { downloadBlob(b, `\( {stripExt(item.file.name)} \){ext}`); success++; } }, fmt);
      if (++done === files.length) success ? showSuccess("Converted!") : showError("Failed");
    };
  });
});

document.getElementById('runPdf')?.addEventListener('click', () => {
  if (!files.length) return showError("Upload images first!");
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
      if (++done === files.length) { pdf.save('images.pdf'); showSuccess("PDF ready!"); }
    };
  });
});

passportBtn && (passportBtn.onclick = () => {
  if (!files.length) return showError("Upload images first!");
  const w = 413, h = 531;
  let done = 0, success = 0;
  files.forEach(item => {
    const img = new Image(); img.src = item.dataURL;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = Math.round(w / scale), sh = Math.round(h / scale);
      const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      canvas.toBlob(b => { if (b) { downloadBlob(b, `${stripExt(item.file.name)}-passport.jpg`); success++; } }, 'image/jpeg', 0.95);
      if (++done === files.length) success ? showSuccess("Passport photos ready!") : showError("Failed");
    };
  });
});