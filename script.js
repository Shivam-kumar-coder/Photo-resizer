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

// ===================== TOAST (MESSAGES) =====================
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
  
  files = []; 
  thumbGrid.innerHTML = ''; 
  let loadedCount = 0;
  
  // Use Promise.all to ensure files are processed synchronously and correctly
  const filePromises = valid.map(file => {
      return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
              const img = new Image();
              img.onload = () => {
                  const fileData = {
                      file, 
                      dataURL: e.target.result, 
                      width: img.naturalWidth, 
                      height: img.naturalHeight
                  };
                  // Add to the main files array
                  files.push(fileData);
                  
                  // Add thumbnail to UI
                  thumbGrid.innerHTML += `<div class="thumb-item"><img src="${e.target.result}"><div class="thumb-meta">${file.name}<br>${(file.size/1024).toFixed(1)} KB<br>${img.naturalWidth}×${img.naturalHeight}</div></div>`;
                  
                  resolve();
              };
              img.src = e.target.result; 
          };
          reader.readAsDataURL(file);
      });
  });

  Promise.all(filePromises).then(() => {
    document.getElementById('select-area').style.display = 'none';
    thumbsArea.classList.remove('hidden');
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function stripExt(name) { return name.replace(/\.[^/.]+$/, ""); }

// Utility function to load image safely (used by all async tools)
function loadImage(dataURL) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = dataURL;
    });
}

// ===================== EASY KB REDUCER LOGIC =====================
async function compressToTargetSize(file, targetKB) {
  const targetBytes = targetKB * 1024;
  const url = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
  const img = await loadImage(url);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

  let quality = 0.9;
  for (let i = 0; i < 15; i++) { 
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));

    // Exit when target size is reached (with 5KB tolerance)
    if (blob.size <= targetBytes + 5 * 1024) return blob; 

    quality -= 0.06; 
    if (quality < 0.1) break; 
  }

  // Final low quality fallback
  return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.1));
}

// ===================== KB/MB BUTTON (FINAL FIX) =====================
document.getElementById('runKb')?.addEventListener('click', async () => {
  // 1. INPUT CHECK
  if (!files.length) return showError("Upload images first!");
  const val = Number(targetSizeEl.value);
  if (!val || val <= 0) return showError("Enter valid size!");
  
  // 2. TARGET SIZE CALCULATION
  const targetKB = sizeUnitEl.value === 'mb' ? val * 1024 : val;

  let success = 0;
  // 3. PROCESS EACH FILE
  for (const item of files) {
    // The core logic is called here
    const blob = await compressToTargetSize(item.file, targetKB);
    if (blob) {
      downloadBlob(blob, `${stripExt(item.file.name)}-${targetKB}KB.jpg`);
      success++;
    }
  }

  // 4. SHOW RESULT
  success ? showSuccess(`Done! ${success} images reduced`) : showError("Try higher size or check image format!");
});

// ===================== PIXEL RESIZE =====================
document.getElementById('runPx')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload first!"); let w = Number(widthPxEl.value), h = Number(heightPxEl.value);
  if (!w && !h) return showError("Enter width/height!"); 
  
  let success = 0;
  for (const item of files) {
    const img = await loadImage(item.dataURL);
    let tw = w || img.naturalWidth, th = h || img.naturalHeight;
    
    if (keepAspectEl.checked) { 
      if (w && !h) th = Math.round(img.naturalHeight * (w/img.naturalWidth));
      else if (h && !w) tw = Math.round(img.naturalWidth * (h/img.naturalHeight)); 
    }
    
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    c.getContext('2d').drawImage(img, 0, 0, tw, th);
    
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.92));
    if (blob) {
      downloadBlob(blob, `${stripExt(item.file.name)}-${tw}x${th}.jpg`);
      success++;
    }
  }
  if (success > 0) showSuccess("Resized!");
});


qualitySlider && (qualitySlider.oninput = () => qualityVal.textContent = qualitySlider.value);

// ===================== QUALITY COMPRESS =====================
document.getElementById('runCompress')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload first!"); 
  const q = Number(qualitySlider.value)/100; 
  
  let success = 0;
  for (const item of files) {
    const img = await loadImage(item.dataURL);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
    if (blob) {
      downloadBlob(blob, `${stripExt(item.file.name)}-compressed.jpg`);
      success++;
    }
  }
  if (success > 0) showSuccess("Compressed!");
});


// ===================== FORMAT CONVERT =====================
document.getElementById('runConvert')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload first!"); 
  const fmt = convertFormat.value; 
  const ext = fmt==='image/png' ? '.png' : '.jpg'; 
  
  let success = 0;
  for (const item of files) {
    const img = await loadImage(item.dataURL);
    
    const c = document.createElement('canvas'); 
    c.width = img.naturalWidth; 
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    
    const blob = await new Promise(res => c.toBlob(res, fmt));

    if (blob) {
      downloadBlob(blob, `${stripExt(item.file.name)}${ext}`);
      success++;
    }
  }
  
  if (success > 0) showSuccess("Converted!");
});

// ===================== IMAGE TO PDF =====================
document.getElementById('runPdf')?.addEventListener('click', async () => {
  if (!files.length) return showError("Upload first!");
  const { jsPDF } = window.jspdf; 
  const pdf = new jsPDF({unit:'pt',format:'a4'}); 
  
  let success = 0;
  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    
    const img = await loadImage(item.dataURL);

    const r = Math.min(pdf.internal.pageSize.getWidth()/img.naturalWidth, pdf.internal.pageSize.getHeight()/img.naturalHeight);
    const w = img.naturalWidth*r, h = img.naturalHeight*r;
    
    if (i > 0) pdf.addPage();
    
    pdf.addImage(item.dataURL, 'JPEG', (pdf.internal.pageSize.getWidth()-w)/2, (pdf.internal.pageSize.getHeight()-h)/2, w, h);
    success++;
  }
  
  if (success === files.length) { 
    pdf.save('images.pdf'); 
    showSuccess("PDF ready!"); 
  }
});

// ===================== PASSPORT SIZE =====================
passportBtn && (passportBtn.onclick = async () => {
  if (!files.length) return showError("Upload first!"); 
  
  let success = 0;
  for (const item of files) {
    const img = await loadImage(item.dataURL);
    
    const c = document.createElement('canvas'); c.width = 413; c.height = 531; // 35x45mm at 300 DPI
    const ctx = c.getContext('2d');
    
    // Center Crop Logic
    const scale = Math.max(413/img.naturalWidth, 531/img.naturalHeight);
    const tw = img.naturalWidth * scale, th = img.naturalHeight * scale;
    const dx = (413 - tw) / 2;
    const dy = (531 - th) / 2;

    ctx.drawImage(img, dx, dy, tw, th);
    
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.95));
    if (blob) {
      downloadBlob(blob, `${stripExt(item.file.name)}-passport.jpg`);
      success++;
    }
  }
  if (success > 0) showSuccess("Passport photos ready!");
});
