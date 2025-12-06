// QuickPic Tools — Client-side image utilities

const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const dropbox = document.getElementById('dropbox');
const browseText = document.getElementById('browseText');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');

let files = [];  // { file, dataURL, img }

function preventDefaults(e){
  e.preventDefault();
  e.stopPropagation();
}
['dragenter','dragover','dragleave','drop'].forEach(ev => dropbox.addEventListener(ev, preventDefaults));

dropbox.addEventListener('drop', e => {
  const dt = e.dataTransfer;
  handleFiles(dt.files);
});
selectBtn.addEventListener('click', ()=> fileInput.click());
browseText.addEventListener('click', ()=> fileInput.click());

fileInput.addEventListener('change', e => {
  handleFiles(e.target.files);
});

function handleFiles(fileList){
  const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (!arr.length) return alert('Select valid image files.');

  files = [];
  thumbGrid.innerHTML = '';

  arr.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataURL = ev.target.result;
      const img = new Image();
      img.onload = () => {
        files.push({ file, dataURL, width: img.naturalWidth, height: img.naturalHeight });
        addThumbnail(file, dataURL, img.naturalWidth, img.naturalHeight);
        updateUIAfterSelect();
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);
  });
}

function addThumbnail(file, url, w, h){
  const div = document.createElement('div');
  div.className = 'thumb-item';
  const im = document.createElement('img');
  im.src = url;
  const meta = document.createElement('div');
  meta.className = 'thumb-meta';
  meta.innerText = `${file.name}\n${(file.size/1024).toFixed(1)} KB\n${w}×${h}`;
  div.appendChild(im);
  div.appendChild(meta);
  thumbGrid.appendChild(div);
}

function updateUIAfterSelect(){
  document.getElementById('select-area').style.display = 'none';
  thumbsArea.classList.remove('hidden');
}

// NAV & Tool switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-tool');
    document.querySelectorAll('.tool-panel').forEach(tp => tp.classList.remove('visible'));
    document.getElementById(target).classList.add('visible');
    window.scrollTo({ top: document.getElementById(target).offsetTop - 20, behavior: 'smooth' });
  });
});

// Reset / Upload New
resetBtn.addEventListener('click', () => {
  files = [];
  document.getElementById('select-area').style.display = 'block';
  thumbsArea.classList.add('hidden');
  thumbGrid.innerHTML = '';
  fileInput.value = '';
});

// Utility: dataURL → Blob size check
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bStr = atob(arr[1]);
  const n = bStr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bStr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// Resize to Target Size (KB/MB)
async function compressToTargetSize(file, targetKB) {
  const target = targetKB * 1024;

  const read = f => new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(f);
  });

  const dataURL = await read(file);
  const img = new Image();
  img.src = dataURL;

  await new Promise(r => img.onload = r);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  let quality = 0.92;
  let blobOut;

  while (quality > 0.1) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', quality);
    blobOut = dataURLtoBlob(data);
    if (blobOut.size <= target) break;
    quality -= 0.06;
  }
  return blobOut;
}

// TOOL HANDLERS

// KB/MB → Resize
document.getElementById('runKb').addEventListener('click', async () => {
  if (!files.length) { alert('Upload image(s) first'); return; }
  const val = Number(document.getElementById('targetSize').value);
  const unit = document.getElementById('sizeUnit').value;
  if (!val || val <= 0) { alert('Enter valid size'); return; }
  const targetKB = unit === 'mb' ? val * 1024 : val;

  for (const itm of files) {
    const out = await compressToTargetSize(itm.file, targetKB);
    const url = URL.createObjectURL(out);
    downloadURL(url, stripExt(itm.file.name) + `-to-${targetKB}KB.jpg`);
  }
});

// Resize px
document.getElementById('runPx').addEventListener('click', () => {
  if (!files.length) { alert('Upload image(s) first'); return; }
  const w = Number(document.getElementById('widthPx').value);
  const h = Number(document.getElementById('heightPx').value);
  const keep = document.getElementById('keepAspect').checked;

  files.forEach(itm => {
    const img = new Image();
    img.onload = () => {
      let tw = w, th = h;
      if (keep) {
        const ar = img.naturalWidth / img.naturalHeight;
        if (w && !h) { th = Math.round(w / ar); }
        else if (h && !w) { tw = Math.round(h * ar); }
        else if (!w && !h) { tw = img.naturalWidth; th = img.naturalHeight; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);
      const data = canvas.toDataURL('image/jpeg', 0.92);
      downloadURL(data, stripExt(itm.file.name) + `-resized-${tw}x${th}.jpg`);
    };
    img.src = itm.dataURL;
  });
});

// Compress quality
const qs = document.getElementById('qualitySlider');
const qv = document.getElementById('qualityVal');
qs.addEventListener('input', ()=> qv.textContent = qs.value);

document.getElementById('runCompress').addEventListener('click', () => {
  if (!files.length) { alert('Upload image(s) first'); return; }
  const q = Number(qs.value) / 100;
  files.forEach(itm => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      const data = canvas.toDataURL('image/jpeg', q);
      downloadURL(data, stripExt(itm.file.name) + `-compressed.jpg`);
    };
    img.src = itm.dataURL;
  });
});

// Convert format
document.getElementById('runConvert').addEventListener('click', () => {
  if (!files.length) { alert('Upload image(s) first'); return; }
  const fmt = document.getElementById('convertFormat').value;
  files.forEach(itm => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      const data = canvas.toDataURL(fmt);
      const ext = fmt === 'image/png' ? '.png' : fmt === 'image/webp' ? '.webp' : '.jpg';
      downloadURL(data, stripExt(itm.file.name) + ext);
    };
    img.src = itm.dataURL;
  });
});

// Image → PDF
document.getElementById('runPdf').addEventListener('click', () => {
  if (!files.length) { alert('Upload image(s) first'); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit:'pt', format:'a4' });
  let processed = 0;

  files.forEach((itm, idx) => {
    const img = new Image();
    img.onload = () => {
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / img.naturalWidth, pageH / img.naturalHeight);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      const x = (pageW - drawW)/2;
      const y = (pageH - drawH)/2;
      if (idx > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', x, y, drawW, drawH);
      processed++;
      if (processed === files.length) {
        pdf.save('images.pdf');
      }
    };
    img.src = itm.dataURL;
  });
});

// Download helper
function downloadURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Utility to remove file extension
function stripExt(name) {
  return name.replace(/\.[^/.]+$/, "");
}