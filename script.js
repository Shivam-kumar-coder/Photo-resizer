// Utilities
const fileInput = document.getElementById('fileInput');
const chooseBtn = document.getElementById('chooseBtn');
const dropZone = document.getElementById('dropZone');
const previewImg = document.getElementById('previewImg');
const previewBox = document.getElementById('preview');
const metaInfo = document.getElementById('metaInfo');

let currentDataURL = null;
let currentName = 'image';

// Tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelector('.tab.active').classList.remove('active');
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.tool-tab').forEach(t=> t.classList.remove('visible'));
    document.getElementById(target).classList.add('visible');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

// Choose / drag-drop
chooseBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

['dragenter','dragover'].forEach(ev=> dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.style.borderColor='#92a7ff'; }));
['dragleave','drop'].forEach(ev=> dropZone.addEventListener(ev, e=>{ e.preventDefault(); dropZone.style.borderColor='#d6d9f0'; }));
dropZone.addEventListener('drop', e=>{
  const f = e.dataTransfer.files[0];
  if(f) handleFile(f);
});

function handleFile(file){
  if(!file) return;
  currentName = file.name.split('.').slice(0,-1).join('.') || 'image';
  const reader = new FileReader();
  reader.onload = function(e){
    currentDataURL = e.target.result;
    previewImg.src = currentDataURL;
    previewBox.classList.remove('hide');
    setTimeout(()=> {
      metaInfo.innerText = `Name: ${file.name} • ${(file.size/1024).toFixed(1)} KB • ${previewImg.naturalWidth || '–'}×${previewImg.naturalHeight || '–'}`;
      previewBox.style.display = 'flex';
    },200);
  };
  reader.readAsDataURL(file);
}

// helper to compute KB of dataURL
function dataURLSizeKB(dataURL){
  if(!dataURL) return 0;
  const base64 = dataURL.split(',')[1] || '';
  const bytes = Math.ceil(base64.length * 3/4);
  return Math.round(bytes/1024);
}

// helper to download dataURL
function downloadDataURL(dataURL, filename){
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* --------- Resize W×H --------- */
document.getElementById('btnPx').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const w = parseInt(document.getElementById('widthPx').value,10);
  const h = parseInt(document.getElementById('heightPx').value,10);
  if(!w || !h) return alert('Enter width and height in px');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img,0,0,w,h);
    const out = c.toDataURL('image/jpeg', 0.92);
    previewImg.src = out;
    metaInfo.innerText += ` • resized ${w}×${h} • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, `${currentName}-resized-${w}x${h}.jpg`);
  };
  img.src = currentDataURL;
});

/* --------- Compress (quality slider) --------- */
const q = document.getElementById('quality');
const qualVal = document.getElementById('qualVal');
q.addEventListener('input', ()=>qualVal.innerText = q.value);
document.getElementById('btnCompress').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const quality = parseInt(q.value,10)/100;
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    const out = c.toDataURL('image/jpeg', quality);
    previewImg.src = out;
    metaInfo.innerText += ` • compressed ${dataURLSizeKB(out)} KB (q=${Math.round(quality*100)}%)`;
    downloadDataURL(out, `${currentName}-compressed.jpg`);
  };
  img.src = currentDataURL;
});

/* --------- Convert PNG / JPG --------- */
document.getElementById('toPng').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    const out = c.toDataURL('image/png');
    previewImg.src = out;
    metaInfo.innerText += ` • converted PNG • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, `${currentName}.png`);
  };
  img.src = currentDataURL;
});
document.getElementById('toJpg').addEventListener('click', ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const img = new Image();
  img.onload = function(){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img,0,0);
    const out = c.toDataURL('image/jpeg', 0.92);
    previewImg.src = out;
    metaInfo.innerText += ` • converted JPG • ${dataURLSizeKB(out)} KB`;
    downloadDataURL(out, `${currentName}.jpg`);
  };
  img.src = currentDataURL;
});

/* --------- Resize to target KB (iterative) --------- */
document.getElementById('btnKB').addEventListener('click', async ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const target = parseInt(document.getElementById('targetKB').value,10);
  if(!target || target <= 0) return alert('Enter a valid KB target (e.g. 100)');

  const img = new Image();
  img.src = currentDataURL;
  img.onload = function(){
    // iterative strategy: reduce quality, then downscale progressively
    let quality = 0.92;
    let scale = 1;
    let result = null;
    for(let i=0;i<12;i++){
      const c = document.createElement('canvas');
      const W = Math.max(1, Math.round(img.width * scale));
      const H = Math.max(1, Math.round(img.height * scale));
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = "#fff";
      ctx.fillRect(0,0,W,H);
      ctx.drawImage(img,0,0,W,H);
      const out = c.toDataURL('image/jpeg', quality);
      const sizeKB = dataURLSizeKB(out);
      if(sizeKB <= target || (quality <= 0.12 && scale <= 0.35)){
        result = out;
        break;
      }
      // reduce quality roughly until 0.2 then reduce scale
      if(quality > 0.25) quality -= 0.12;
      else scale -= 0.12;
    }
    if(!result){
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      result = c.toDataURL('image/jpeg', Math.max(0.12, quality));
    }
    previewImg.src = result;
    metaInfo.innerText += ` • target ${target}KB → ${dataURLSizeKB(result)} KB`;
    downloadDataURL(result, `${currentName}-to-${target}KB.jpg`);
  };
});

/* --------- Image to PDF (jsPDF) --------- */
document.getElementById('btnPdf').addEventListener('click', async ()=>{
  if(!currentDataURL) return alert('Select an image first');
  const { jsPDF } = window.jspdf;
  const img = new Image();
  img.src = currentDataURL;
  img.onload = function(){
    const pdf = new jsPDF({unit:'mm',format:'a4'});
    const pageW = pdf.internal.pageSize.getWidth();
    const imgRatio = img.height / img.width;
    const imgW = pageW;
    const imgH = pageW * imgRatio;
    pdf.addImage(img, 'JPEG', 0, 0, imgW, imgH);
    pdf.save(`${currentName}.pdf`);
  };
});