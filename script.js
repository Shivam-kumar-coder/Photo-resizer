// ------------------------
// QuickPic - FINAL VERSION
// ------------------------

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

// ---------------- Drag & Drop ----------------
['dragenter', 'dragover'].forEach(e =>
  dropbox.addEventListener(e, () => dropbox.classList.add('dragover'))
);
['dragleave', 'drop'].forEach(e =>
  dropbox.addEventListener(e, () => dropbox.classList.remove('dragover'))
);

dropbox.addEventListener('drop', e => {
  e.preventDefault();
  e.stopPropagation();
  handleFiles(e.dataTransfer.files);
});

// ---------------- File Select ----------------
selectBtn.onclick = browseText.onclick = () => fileInput.click();
fileInput.onchange = e => handleFiles(e.target.files);
resetBtn.onclick = resetAll;

// ---------------- Tool Switching ----------------
navButtons.forEach(btn => {
  btn.onclick = () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const toolId = btn.dataset.tool;
    toolPanels.forEach(p => p.classList.toggle('visible', p.id === toolId));
  };
});

// ---------------- Handle Files ----------------
function handleFiles(fileList) {
  const valid = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (!valid.length) return alert("Please upload valid images.");

  files = [];
  thumbGrid.innerHTML = '';

  let loaded = 0;

  valid.forEach(file => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        files.push({
          file,
          dataURL: e.target.result,
          width: img.naturalWidth,
          height: img.naturalHeight
        });

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
  div.innerHTML = `
    <img src="${src}">
    <div class="thumb-meta">${name}<br>${(size / 1024).toFixed(1)} KB<br>${w}×${h}</div>
  `;
  thumbGrid.appendChild(div);
}

function afterFilesLoaded() {
  document.getElementById('select-area').style.display = 'none';
  thumbsArea.classList.remove('hidden');
}

function resetAll() {
  files = [];
  fileInput.value = '';
  thumbGrid.innerHTML = '';
  thumbsArea.classList.add('hidden');
  document.getElementById('select-area').style.display = 'block';
}

// ---------------- Utilities ----------------
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function stripExt(name) {
  return name.replace(/\.[^/.]+$/, "");
}

// ============================================
//       KB / MB EXACT COMPRESSOR (FIXED)
// ============================================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const minBytes = (targetKB - 5) * 1024;
  const maxBytes = (targetKB + 5) * 1024;

  const dataURL = await new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(file);
  });

  const img = new Image();
  img.src = dataURL;
  await new Promise(res => img.onload = res);

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");

  let quality = 0.92;
  let scale = 1.0;
  let bestBlob = null;
  let bestDiff = Infinity;

  for (let i = 0; i < 40; i++) {
    let w = Math.round(img.naturalWidth * scale);
    let h = Math.round(img.naturalHeight * scale);

    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const outURL = canvas.toDataURL("image/jpeg", quality);
    const blob = dataURLtoBlob(outURL);
    const size = blob.size;

    const diff = Math.abs(size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = blob;
    }

    if (size >= minBytes && size <= maxBytes) return blob;

    if (size > maxBytes) {
      if (quality > 0.40) quality -= 0.05;
      else scale -= 0.05;
    } else {
      if (quality < 0.95) quality += 0.04;
      else scale += 0.04;
    }
  }

  return bestBlob;
}

// Run KB/MB
document.getElementById('runKb').onclick = async () => {
  if (!files.length) return alert("Upload image(s) first.");

  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return alert("Enter valid size.");

  const targetKB = sizeUnitEl.value === "mb" ? val * 1024 : val;

  for (const item of files) {
    const out = await compressToTargetSize(item.file, targetKB);
    downloadBlob(out, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
  }

  showSuccessBox("Images Compressed Successfully!");
};

// ============================================
//              PIXEL RESIZER
// ============================================
document.getElementById('runPx').onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const w = Number(widthPxEl.value);
  const h = Number(heightPxEl.value);
  const keep = keepAspectEl.checked;

  if (!w && !h) return alert("Enter width or height.");

  let done = 0;

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
      c.width = tw;
      c.height = th;
      c.getContext('2d').drawImage(img, 0, 0, tw, th);

      c.toBlob(blob => {
        downloadBlob(blob, `${stripExt(item.file.name)}-${tw}x${th}.jpg`);
        if (++done === files.length) showSuccessBox("Images Resized Successfully!");
      }, "image/jpeg", 0.92);
    };
    img.src = item.dataURL;
  });
};

// ============================================
//            COMPRESS QUALITY
// ============================================
qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value;

document.getElementById('runCompress').onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const q = Number(qualitySlider.value) / 100;
  let done = 0;

  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;

      c.getContext("2d").drawImage(img, 0, 0);

      c.toBlob(blob => {
        downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`);
        if (++done === files.length) showSuccessBox("Compression Done!");
      }, "image/jpeg", q);
    };
    img.src = item.dataURL;
  });
};

// ============================================
//             CONVERTER (JPG/PNG)
// ============================================
document.getElementById('runConvert').onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const fmt = convertFormat.value;
  const ext = fmt === "image/png" ? ".png" : ".jpg";

  let done = 0;

  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);

      c.toBlob(blob => {
        downloadBlob(blob, `${stripExt(item.file.name)}${ext}`);
        if (++done === files.length) showSuccessBox("Converted Successfully!");
      }, fmt);
    };
    img.src = item.dataURL;
  });
};

// ============================================
//                PDF TOOL
// ============================================
document.getElementById('runPdf').onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  let done = 0;

  files.forEach((item, i) => {
    const img = new Image();
    img.onload = () => {
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();

      const r = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
      const w = img.naturalWidth * r;
      const h = img.naturalHeight * r;

      const x = (pw - w) / 2;
      const y = (ph - h) / 2;

      if (i > 0) pdf.addPage();

      pdf.addImage(img, "JPEG", x, y, w, h);

      if (++done === files.length) {
        pdf.save("images.pdf");
        showSuccessBox("PDF Created Successfully!");
      }
    };
    img.src = item.dataURL;
  });
};

// ============================================
//      SUCCESS GREEN POPUP MESSAGE
// ============================================
function showSuccessBox(msg) {
  const d = document.createElement("div");
  d.style.position = "fixed";
  d.style.top = "20px";
  d.style.right = "20px";
  d.style.background = "#1abc9c";
  d.style.color = "#fff";
  d.style.padding = "12px 20px";
  d.style.borderRadius = "8px";
  d.style.fontSize = "16px";
  d.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  d.innerText = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2500);
}