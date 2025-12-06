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

// Drag highlight
['dragenter', 'dragover'].forEach(e =>
  dropbox.addEventListener(e, () => dropbox.classList.add('dragover'))
);
['dragleave', 'drop'].forEach(e =>
  dropbox.addEventListener(e, () => dropbox.classList.remove('dragover'))
);

// Drop
dropbox.addEventListener('drop', e => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
});

// File select
selectBtn.onclick = browseText.onclick = () => fileInput.click();
fileInput.onchange = e => handleFiles(e.target.files);
resetBtn.onclick = resetAll;

// TAB SWITCH – Only one tool visible
navButtons.forEach(btn => {
  btn.onclick = () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const toolId = btn.dataset.tool;

    toolPanels.forEach(p =>
      p.classList.toggle('visible', p.id === toolId)
    );
  };
});

// Load files
function handleFiles(list) {
  const valid = [...list].filter(f => f.type.startsWith('image/'));
  if (!valid.length) return alert('Please select valid images');

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

        if (++loaded === valid.length) {
          document.getElementById('select-area').style.display = 'none';
          thumbsArea.classList.remove('hidden');
        }
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
      <div class="thumb-meta">${name}<br>${(size/1024).toFixed(1)} KB<br>${w}×${h}</div>
  `;
  thumbGrid.appendChild(div);
}

function resetAll() {
  files = [];
  thumbGrid.innerHTML = '';
  fileInput.value = '';
  thumbsArea.classList.add('hidden');
  document.getElementById('select-area').style.display = 'block';
}

// Utility
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bin = atob(arr[1]);
  let n = bin.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bin.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 150);
}

function stripExt(n) {
  return n.replace(/\.[^/.]+$/, '');
}

// KB Resize
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const minBytes = (targetKB - 10) * 1024;
  const maxBytes = (targetKB + 10) * 1024;

  const r = new FileReader();
  const dataURL = await new Promise(res => { r.onload = e => res(e.target.result); r.readAsDataURL(file); });

  const img = new Image();
  img.src = dataURL;
  await new Promise(res => img.onload = res);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let scale = 1;
  let quality = 0.95;
  let finalBlob = null;

  for (let i = 0; i < 30; i++) {
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const out = canvas.toDataURL('image/jpeg', quality);
    const blob = dataURLtoBlob(out);
    const size = blob.size;

    if (size > maxBytes) {
      quality -= 0.05;
      if (quality < 0.25) scale -= 0.05;
    } else if (size < minBytes) {
      quality += 0.05;
      if (quality > 0.95) scale += 0.03;
    } else {
      finalBlob = blob;
      break;
    }
  }

  return finalBlob;
}

document.getElementById('runKb').onclick = async () => {
  if (!files.length) return alert('Upload image(s) first.');

  let val = Number(targetSizeEl.value);
  if (!val) return alert('Enter valid size');

  if (sizeUnitEl.value === 'mb') val *= 1024;

  for (const f of files) {
    const out = await compressToTargetSize(f.file, val);
    downloadBlob(out, `${stripExt(f.file.name)}-${val}KB.jpg`);
  }

  alert('Completed!');
};

// PX Resize
document.getElementById('runPx').onclick = () => {
  if (!files.length) return alert('Upload image(s) first.');

  const w = Number(widthPxEl.value);
  const h = Number(heightPxEl.value);
  const keep = keepAspectEl.checked;

  if (!w && !h) return alert('Enter width or height');

  files.forEach(f => {
    const img = new Image();

    img.onload = () => {
      let tw = w || img.naturalWidth;
      let th = h || img.naturalHeight;

      if (keep) {
        if (w && !h) th = Math.round((img.naturalHeight * w) / img.naturalWidth);
        else if (h && !w) tw = Math.round((img.naturalWidth * h) / img.naturalHeight);
      }

      const c = document.createElement('canvas');
      c.width = tw;
      c.height = th;
      c.getContext('2d').drawImage(img, 0, 0, tw, th);

      c.toBlob(b => downloadBlob(b, `${stripExt(f.file.name)}-${tw}x${th}.jpg`), 'image/jpeg', 0.92);
    };

    img.src = f.dataURL;
  });

  alert('Completed!');
};

// Compress Tool
qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value;

document.getElementById('runCompress').onclick = () => {
  if (!files.length) return alert('Upload image(s) first.');

  const q = qualitySlider.value / 100;

  files.forEach(f => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      c.toBlob(b => downloadBlob(b, `${stripExt(f.file.name)}-compressed.jpg`), 'image/jpeg', q);
    };
    img.src = f.dataURL;
  });

  alert('Completed!');
};

// Convert Tool
document.getElementById('runConvert').onclick = () => {
  if (!files.length) return alert('Upload image(s) first.');

  const fmt = convertFormat.value;
  const ext = fmt === 'image/png' ? '.png' : '.jpg';

  files.forEach(f => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      c.toBlob(b => downloadBlob(b, `${stripExt(f.file.name)}${ext}`), fmt);
    };
    img.src = f.dataURL;
  });

  alert('Completed!');
};

// PDF
document.getElementById('runPdf').onclick = () => {
  if (!files.length) return alert('Upload image(s) first.');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

  files.forEach((f, idx) => {
    const img = new Image();
    img.onload = () => {
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);

      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;

      const x = (pw - w) / 2;
      const y = (ph - h) / 2;

      if (idx > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', x, y, w, h);

      if (idx === files.length - 1) {
        pdf.save('images.pdf');
        alert('PDF Ready!');
      }
    };
    img.src = f.dataURL;
  });
};