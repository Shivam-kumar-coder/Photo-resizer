// ------------------------
// QuickPic - FINAL UPDATED VERSION (Multi-file + Passport + Robust messages)
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

// Passport button could be named 'passportBtn' or 'runPassport' - support both
const passportBtn = document.getElementById('passportBtn') || document.getElementById('runPassport');

let files = [];

// ---------------- Drag & Drop ----------------
['dragenter', 'dragover'].forEach(e =>
  dropbox && dropbox.addEventListener(e, ev => { ev.preventDefault(); dropbox.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach(e =>
  dropbox && dropbox.addEventListener(e, ev => { ev.preventDefault(); dropbox.classList.remove('dragover'); })
);

dropbox && dropbox.addEventListener('drop', e => {
  e.preventDefault();
  e.stopPropagation();
  handleFiles(e.dataTransfer.files);
});

// ---------------- File Select ----------------
selectBtn && (selectBtn.onclick = () => fileInput.click());
browseText && (browseText.onclick = () => fileInput.click());
fileInput && (fileInput.onchange = e => handleFiles(e.target.files));
resetBtn && (resetBtn.onclick = resetAll);

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
  const valid = Array.from(fileList).filter(f => f.type && f.type.startsWith('image/'));
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
          height: img.naturalHeight,
          name: file.name,
          size: file.size
        });

        addThumb(file.name, e.target.result, img.naturalWidth, img.naturalHeight, file.size);

        if (++loaded === valid.length) afterFilesLoaded();
      };
      img.onerror = () => {
        // skip corrupted image but continue
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
  const sa = document.getElementById('select-area');
  if (sa) sa.style.display = 'none';
  thumbsArea && thumbsArea.classList.remove('hidden');
}

function resetAll() {
  files = [];
  if (fileInput) fileInput.value = '';
  thumbGrid.innerHTML = '';
  thumbsArea && thumbsArea.classList.add('hidden');
  const sa = document.getElementById('select-area');
  if (sa) sa.style.display = 'block';
}

// ---------------- Utilities ----------------
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(",");
  const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function downloadBlob(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = 'none';
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function stripExt(name) {
  return name.replace(/\.[^/.]+$/, "");
}

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

// ============================================
//       KB / MB EXACT COMPRESSOR (FIXED)
// ============================================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const minBytes = Math.max(2000, (targetKB - 5) * 1024); // avoid too tiny
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

  // limit iterations and make safe adjustments
  for (let i = 0; i < 40; i++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const outURL = canvas.toDataURL("image/jpeg", Math.max(0.1, Math.min(0.95, quality)));
    const blob = dataURLtoBlob(outURL);
    const size = blob.size;

    const diff = Math.abs(size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = blob;
    }

    if (size >= minBytes && size <= maxBytes) return blob;

    if (size > maxBytes) {
      if (quality > 0.35) quality -= 0.06;
      else scale -= 0.06;
    } else {
      if (quality < 0.95) quality += 0.05;
      else scale += 0.05;
    }
  }

  return bestBlob;
}

// Run KB/MB
const runKbBtn = document.getElementById('runKb');
runKbBtn && (runKbBtn.onclick = async () => {
  if (!files.length) return alert("Upload image(s) first.");

  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return alert("Enter valid size.");

  const targetKB = sizeUnitEl.value === "mb" ? val * 1024 : val;

  let done = 0;
  let successCount = 0;

  for (const item of files) {
    try {
      const out = await compressToTargetSize(item.file, targetKB);
      if (out) {
        downloadBlob(out, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
        successCount++;
      } else {
        console.warn("Compression returned null for", item.file.name);
      }
    } catch (err) {
      console.error("Error compressing", item.file.name, err);
    } finally {
      done++;
      // Show final only when all processed
      if (done === files.length) {
        if (successCount) showSuccessBox("Images Compressed Successfully!");
        else alert("Compression failed for all images.");
      }
    }
  }
});

// ============================================
//              PIXEL RESIZER
// ============================================
const runPxBtn = document.getElementById('runPx');
runPxBtn && (runPxBtn.onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const w = Number(widthPxEl.value);
  const h = Number(heightPxEl.value);
  const keep = keepAspectEl.checked;

  if (!w && !h) return alert("Enter width or height.");

  let done = 0;
  let successCount = 0;

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
        if (blob) {
          downloadBlob(blob, `${stripExt(item.file.name)}-${tw}x${th}.jpg`);
          successCount++;
        }
        if (++done === files.length) {
          if (successCount) showSuccessBox("Images Resized Successfully!");
          else alert("Resizing failed for all files.");
        }
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => {
      if (++done === files.length) {
        if (successCount) showSuccessBox("Images Resized Successfully!");
        else alert("Resizing failed for all files.");
      }
    };
    img.src = item.dataURL;
  });
});

// ============================================
//            COMPRESS QUALITY
// ============================================
qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);

const runCompressBtn = document.getElementById('runCompress');
runCompressBtn && (runCompressBtn.onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const q = Number(qualitySlider.value) / 100;
  let done = 0;
  let successCount = 0;

  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;

      c.getContext("2d").drawImage(img, 0, 0);

      c.toBlob(blob => {
        if (blob) {
          downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`);
          successCount++;
        }
        if (++done === files.length) {
          if (successCount) showSuccessBox("Compression Done!");
          else alert("Compression failed for all files.");
        }
      }, "image/jpeg", q);
    };
    img.onerror = () => {
      if (++done === files.length) {
        if (successCount) showSuccessBox("Compression Done!");
        else alert("Compression failed for all files.");
      }
    };
    img.src = item.dataURL;
  });
});

// ============================================
//             CONVERTER (JPG/PNG)
// ============================================
const runConvertBtn = document.getElementById('runConvert');
runConvertBtn && (runConvertBtn.onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const fmt = convertFormat.value;
  const ext = fmt === "image/png" ? ".png" : ".jpg";

  let done = 0;
  let successCount = 0;

  files.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);

      c.toBlob(blob => {
        if (blob) {
          downloadBlob(blob, `${stripExt(item.file.name)}${ext}`);
          successCount++;
        }
        if (++done === files.length) {
          if (successCount) showSuccessBox("Converted Successfully!");
          else alert("Conversion failed for all files.");
        }
      }, fmt);
    };
    img.onerror = () => {
      if (++done === files.length) {
        if (successCount) showSuccessBox("Converted Successfully!");
        else alert("Conversion failed for all files.");
      }
    };
    img.src = item.dataURL;
  });
});

// ============================================
//                PDF TOOL
// ============================================
const runPdfBtn = document.getElementById('runPdf');
runPdfBtn && (runPdfBtn.onclick = () => {
  if (!files.length) return alert("Upload image(s) first.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  let done = 0;
  let successCount = 0;

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

      // Add image as JPEG (if input PNG will be added as JPEG)
      try {
        pdf.addImage(img, "JPEG", x, y, w, h);
        successCount++;
      } catch (err) {
        console.error("PDF addImage failed for", item.file.name, err);
      }

      if (++done === files.length) {
        if (successCount) {
          pdf.save("images.pdf");
          showSuccessBox("PDF Created Successfully!");
        } else alert("PDF creation failed.");
      }
    };
    img.onerror = () => {
      if (++done === files.length) {
        if (successCount) {
          pdf.save("images.pdf");
          showSuccessBox("PDF Created Successfully!");
        } else alert("PDF creation failed.");
      }
    };
    img.src = item.dataURL;
  });
});

// ============================================
//         PASSPORT SIZE (35mm x 45mm)
// ============================================
// Attach only if a passport button exists in HTML (robust)
if (passportBtn) {
  passportBtn.onclick = () => {
    if (!files.length) return alert("Upload image(s) first.");

    const targetW = 413; // 35mm -> px (approx high quality)
    const targetH = 531; // 45mm -> px

    let done = 0;
    let successCount = 0;

    files.forEach(item => {
      const img = new Image();
      img.onload = () => {
        // We'll center-crop to fill passport aspect ratio (cover)
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        // Calculate scale to cover the canvas
        const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
        const sw = Math.round(targetW / scale);
        const sh = Math.round(targetH / scale);

        // Choose crop start to center the image
        const sx = Math.round((img.naturalWidth - sw) / 2);
        const sy = Math.round((img.naturalHeight - sh) / 2);

        // Draw the cropped area scaled to canvas
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        canvas.toBlob(blob => {
          if (blob) {
            downloadBlob(blob, `${stripExt(item.file.name)}-passport.jpg`);
            successCount++;
          }
          if (++done === files.length) {
            if (successCount) showSuccessBox("Passport Size Images Downloaded!");
            else alert("Passport creation failed for all files.");
          }
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => {
        if (++done === files.length) {
          if (successCount) showSuccessBox("Passport Size Images Downloaded!");
          else alert("Passport creation failed for all files.");
        }
      };
      img.src = item.dataURL;
    });
  };
}

// Green Success Message (Ab dikhega!)
function showSuccessBox(msg) {
  // Remove old one
  const old = document.querySelector('.success-toast');
  if (old) old.remove();

  const d = document.createElement("div");
  d.className = "success-toast";
  d.innerText = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

// ================== END ==================
