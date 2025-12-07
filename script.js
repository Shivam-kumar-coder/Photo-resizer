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

let files = [];

// Drag & Drop Highlight
['dragenter', 'dragover'].forEach(e => dropbox.addEventListener(e, () => dropbox.classList.add('dragover')));
['dragleave', 'drop'].forEach(e => dropbox.addEventListener(e, () => dropbox.classList.remove('dragover')));
dropbox.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); });

// File selection
selectBtn.onclick = browseText.onclick = () => fileInput.click();
fileInput.onchange = e => handleFiles(e.target.files);
resetBtn.onclick = resetAll;

// Tool Switching - EK HI TOOL DIKHEGA
navButtons.forEach(btn => {
  btn.onclick = () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const toolId = btn.dataset.tool;
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
  };
});

// Handle Files
function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (!valid.length) return alert('Please select valid images (JPG/PNG/WebP)');
  files = []; thumbGrid.innerHTML = '';
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
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function addThumb(name, src, w, h, sizeKB) {
  const div = document.createElement('div');
  div.className = 'thumb-item';
  div.innerHTML = `<img src="\( {src}" alt=" \){name}">
    <div class="thumb-meta">\( {name}<br> \){(sizeKB/1024).toFixed(1)} KB<br>\( {w}× \){h}</div>`;
  thumbGrid.appendChild(div);
}

function afterFilesLoaded() {
  document.getElementById('select-area').style.display = 'none';
  thumbsArea.classList.remove('hidden');
}

// Reset
function resetAll() {
  files = []; thumbGrid.innerHTML = ''; fileInput.value = '';
  thumbsArea.classList.add('hidden');
  document.getElementById('select-area').style.display = 'block';
}

// Utility: dataURL to Blob
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// Utility: Download Blob
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Utility: Strip Extension
function stripExt(name) {
  return name.replace(/\.[^/.]+$/, '');
}

// KB/MB Resize Tool - Fixed
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
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

  let quality = 0.92;
  let scale = 1;
  let resultBlob = null;

  for (let iter = 0; iter < 18; iter++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL('image/jpeg', quality);
    const blob = dataURLtoBlob(data);
    if (blob.size <= targetBytes || (quality <= 0.12 && scale <= 0.34)) {
      resultBlob = blob;
      break;
    }
    if (quality > 0.25) quality -= 0.08;
    else scale -= 0.08;
  }

  if (!resultBlob) {
    const data = canvas.toDataURL('image/jpeg', Math.max(0.12, quality));
    resultBlob = dataURLtoBlob(data);
  }
  return resultBlob;
}

document.getElementById('runKb').addEventListener('click', async () => {
  if (!files.length) return alert('Upload image(s) first.');
  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return alert('Enter valid size.');
  const unit = sizeUnitEl.value;
  const targetKB = unit === 'mb' ? val * 1024 : val;
  for (const item of files) {
    try {
      const out = await compressToTargetSize(item.file, targetKB);
      downloadBlob(out, `\( {stripExt(item.file.name)}-to- \){Math.round(targetKB)}KB.jpg`);
    } catch (err) {
      console.error(err);
      alert('Error processing ' + item.file.name);
    }
  }
  alert('Processing finished.');
});

// PX Resize Tool - Fixed
document.getElementById('runPx').addEventListener('click', () => {
  if (!files.length) return alert('Upload image(s) first.');
  const w = Number(widthPxEl.value);
  const h = Number(heightPxEl.value);
  const keep = keepAspectEl.checked;
  if (!w && !h) return alert('Enter width or height.');
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      let tw = w || img.naturalWidth;
      let th = h || img.naturalHeight;
      if (keep) {
        if (w && !h) th = Math.round(img.naturalHeight * (w / img.naturalWidth));
        else if (h && !w) tw = Math.round(img.naturalWidth * (h / img.naturalHeight));
      }
      const c = document.createElement('canvas');
      c.width = tw; c.height = th;
      c.getContext('2d').drawImage(img, 0, 0, tw, th);
      c.toBlob(blob => downloadBlob(blob, `\( {stripExt(item.file.name)}-resized- \){tw}x${th}.jpg`), 'image/jpeg', 0.92);
    };
    img.src = item.dataURL;
  });
});

// Compress Tool - Fixed
qualitySlider.addEventListener('input', () => qualityVal.textContent = qualitySlider.value);
document.getElementById('runCompress').addEventListener('click', () => {
  if (!files.length) return alert('Upload image(s) first.');
  const q = Number(qualitySlider.value) / 100;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(blob => downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`), 'image/jpeg', q);
    };
    img.src = item.dataURL;
  });
});

// Convert Tool - Fixed
document.getElementById('runConvert').addEventListener('click', () => {
  if (!files.length) return alert('Upload image(s) first.');
  const fmt = convertFormat.value;
  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const ext = fmt === 'image/png' ? '.png' : fmt === 'image/webp' ? '.webp' : '.jpg';
      c.toBlob(blob => downloadBlob(blob, `\( {stripExt(item.file.name)} \){ext}`), fmt);
    };
    img.src = item.dataURL;
  });
});

// PDF Tool - Fixed
document.getElementById('runPdf').addEventListener('click', () => {
  if (!files.length) return alert('Upload image(s) first.');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  let processed = 0;
  files.forEach((item, idx) => {
    const img = new Image();
    img.onload = () => {
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      if (idx > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', x, y, drawW, drawH);
      processed++;
      if (processed === files.length) {
        pdf.save(files.length > 1 ? 'images.pdf' : `${stripExt(files[0].file.name)}.pdf`);
      }
    };
    img.src = item.dataURL;
  });
});