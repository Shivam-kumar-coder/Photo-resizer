// QuickPic Tools - client-side utilities
const fileInput = document.getElementById('fileInput');
const chooseBtn = document.getElementById('chooseBtn');
const dropArea = document.getElementById('dropArea');
const previewImg = document.getElementById('previewImg');
const previewMeta = document.getElementById('previewMeta');
let currentDataURL = null;
let currentFileName = 'image';

// choose button
chooseBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

// drag & drop
['dragenter','dragover'].forEach(ev => dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.style.borderColor='#7aa7ff'; }));
['dragleave','drop'].forEach(ev => dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.style.borderColor='#cbd5e1'; }));
dropArea.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});

// file -> preview
function handleFile(file){
  if(!file) return;
  currentFileName = file.name.split('.').slice(0,-1).join('.') || 'image';
  const reader = new FileReader();
  reader.onload = function(ev){
    currentDataURL = ev.target.result;
    previewImg.src = currentDataURL;
    previewImg.onload = ()=> {
      previewMeta.innerText = `Name: ${file.name} • ${(file.size/1024).toFixed(1)} KB • ${previewImg.naturalWidth}×${previewImg.naturalHeight}`;
      document.getElementById('previewBox').style.display = 'flex';
    };
  };
  reader.readAsDataURL(file);
}

// utility: estimate KB from dataURL
function dataURLSizeKB(dataURL){
  if(!dataURL) return 0;
  const idx = dataURL.indexOf(',') + 1;
  const base64 = dataURL.substring(idx);
  const bytes = Math.ceil(base64.length * 3/4);
  return Math.round(bytes/1024);
}

// utility: download dataURL
function downloadDataURL(dataURL, filename){
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ----------------- Resize by pixels ----------------- */
document.getElementById('doPx').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Choose image first');
  const w = parseInt(document.getElementById('widthPx').value,10);
  const h = parseInt(document.getElementById('heightPx').value,10);
  if(!w || !h) return alert('Enter width and height (px)');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    const out = c.toDataURL('image/jpeg',0.92);
    previewImg.src = out;
    previewMeta.innerText += ` • resized ${w}×${h} • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, currentFileName + '-resized.jpg');
  };
  img.src = currentDataURL;
});

/* ----------------- Compress by quality ----------------- */
document.getElementById('qualityRange').addEventListener('input', (e)=>{
  document.getElementById('qualityVal').innerText = e.target.value;
});
document.getElementById('doCompress').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Choose image first');
  const q = parseInt(document.getElementById('qualityRange').value,10)/100;
  const img = new Image();
  img.onload = function(){
    const can = document.createElement('canvas');
    can.width = img.width; can.height = img.height;
    can.getContext('2d').drawImage(img,0,0);
    const out = can.toDataURL('image/jpeg', q);
    previewImg.src = out;
    previewMeta.innerText += ` • compressed ${dataURLSizeKB(out)} KB (q=${Math.round(q*100)}%)`;
    downloadDataURL(out, currentFileName + '-compressed.jpg');
  };
  img.src = currentDataURL;
});

/* ----------------- Convert ----------------- */
document.getElementById('toPng').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Choose image first');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    const out = c.toDataURL('image/png');
    previewImg.src = out;
    previewMeta.innerText += ` • converted PNG • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, currentFileName + '.png');
  };
  img.src = currentDataURL;
});

document.getElementById('toJpg').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Choose image first');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    const out = c.toDataURL('image/jpeg', 0.92);
    previewImg.src = out;
    previewMeta.innerText += ` • converted JPG • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, currentFileName + '.jpg');
  };
  img.src = currentDataURL;
});

/* ----------------- Resize to target KB (iterative) ----------------- */
document.getElementById('doKB').addEventListener('click', async ()=>{
  if(!currentDataURL) return alert('Choose image first');
  const target = parseInt(document.getElementById('targetKB').value,10);
  if(!target || target <= 0) return alert('Enter a target KB (e.g. 100)');

  const img = new Image();
  img.src = currentDataURL;
  img.onload = async function(){
    // Strategy: reduce quality, then downscale if needed.
    let quality = 0.92;
    let scale = 1;
    let result = null;
    for(let iter=0; iter<12; iter++){
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d');
      ctx.fillStyle = "#fff";
      ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img,0,0,c.width,c.height);
      const out = c.toDataURL('image/jpeg', quality);
      const sizeKB = dataURLSizeKB(out);
      if(sizeKB <= target || (quality <= 0.12 && scale <= 0.35)){
        result = out;
        break;
      }
      // if quality still high, reduce quality, else reduce scale
      if(quality > 0.2) quality -= 0.12;
      else scale -= 0.12;
    }
    // fallback to last attempt if not matched
    if(!result){
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*scale);
      c.height = Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      result = c.toDataURL('image/jpeg', Math.max(0.12, quality));
    }
    previewImg.src = result;
    previewMeta.innerText += ` • target ${target}KB → ${dataURLSizeKB(result)} KB`;
    downloadDataURL(result, currentFileName + `-to-${target}KB.jpg`);
  };
});