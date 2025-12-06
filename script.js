// QuickPic - multi-image client-side tools
// Requires: jsPDF (included in index.html)

const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const dropbox = document.getElementById('dropbox');
const browseText = document.getElementById('browseText');
const selectArea = document.getElementById('select-area');
const thumbsSection = document.getElementById('thumbs');
const thumbGrid = document.getElementById('thumbGrid');

const navButtons = document.querySelectorAll('.nav-btn');
const toolPanels = document.querySelectorAll('.tool-panel');

let files = []; // array of {file, dataURL, image}

// helper: show/hide
function showTool(id){
  // hide select area when tool visible and files selected
  selectArea.style.display = files.length ? 'none' : 'block';
  thumbsSection.classList.toggle('hidden', files.length === 0);

  toolPanels.forEach(p=>{
    p.classList.remove('visible');
  });
  document.getElementById(id).classList.add('visible');
}

// Nav buttons logic (inline professional spacing)
navButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    // if files exist, hide select area and show tool; else show select area but also tool visible
    showTool(target);
    // scroll to tools
    setTimeout(()=> window.scrollTo({top: document.getElementById(target).offsetTop - 20, behavior:'smooth'}),100);
  });
});

// file selection
selectBtn.addEventListener('click', ()=> fileInput.click());
browseText.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// drag & drop
['dragenter','dragover'].forEach(ev => dropbox.addEventListener(ev, (e)=>{ e.preventDefault(); dropbox.style.borderColor = '#7fb3ff'; }));
['dragleave','drop'].forEach(ev => dropbox.addEventListener(ev, (e)=>{ e.preventDefault(); dropbox.style.borderColor = '#cfe0ff'; }));
dropbox.addEventListener('drop', e=>{
  const dt = e.dataTransfer;
  if(!dt) return;
  handleFiles(dt.files);
});

function handleFiles(fileList){
  const arr = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if(arr.length === 0) return alert('Select image files (jpg/png/webp...).');

  // reset files array
  files = [];
  thumbGrid.innerHTML = '';

  // read each file
  let loaded = 0;
  arr.forEach((file, i)=>{
    const reader = new FileReader();
    reader.onload = (ev)=>{
      const dataURL = ev.target.result;
      const img = new Image();
      img.onload = ()=>{
        files.push({file, dataURL, width: img.naturalWidth, height: img.naturalHeight});
        // create thumbnail
        const div = document.createElement('div');
        div.className = 'thumb-item';
        const imgel = document.createElement('img');
        imgel.src = dataURL;
        div.appendChild(imgel);
        const meta = document.createElement('div');
        meta.className = 'thumb-meta';
        meta.innerText = `${file.name}\n${(file.size/1024).toFixed(1)} KB\n${img.naturalWidth}×${img.naturalHeight}`;
        div.appendChild(meta);
        thumbGrid.appendChild(div);

        loaded++;
        if(loaded === arr.length){
          // show thumbnails and hide select area
          selectArea.style.display = 'none';
          thumbsSection.classList.remove('hidden');
          // show currently active tool panel
          const active = document.querySelector('.nav-btn.active').getAttribute('data-target');
          showTool(active);
        }
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);
  });
}

/* ----------------- Utilities ----------------- */
function dataURLSizeKB(dataURL){
  if(!dataURL) return 0;
  const base64 = dataURL.split(',')[1] || '';
  const bytes = Math.ceil(base64.length * 3/4);
  return Math.round(bytes/1024);
}
function downloadDataURL(dataURL, filename){
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ----------------- Resize to target KB/MB ----------------- */
document.getElementById('startKb').addEventListener('click', async ()=>{
  if(files.length === 0) return alert('Select images first.');
  const val = Number(document.getElementById('targetSize').value);
  if(!val || val <= 0) return alert('Enter a valid target number.');
  const unit = document.getElementById('sizeUnit').value;
  const targetKB = unit === 'mb' ? val*1024 : val;

  // process each image sequentially
  for(let i=0;i<files.length;i++){
    await processResizeToKB(files[i], targetKB);
  }
  alert('Done. Check your downloads.');
});

async function processResizeToKB(item, targetKB){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = function(){
      let quality = 0.92;
      let scale = 1;
      let attempt = 0;
      let result = null;

      while(attempt < 14){
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', quality);
        const sz = dataURLSizeKB(out);
        if(sz <= targetKB || (quality <= 0.12 && scale <= 0.35)){
          result = out;
          break;
        }
        if(quality > 0.25) quality -= 0.12;
        else scale -= 0.12;
        attempt++;
      }

      if(!result){
        // last fallback
        const c2 = document.createElement('canvas');
        c2.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c2.height = Math.max(1, Math.round(img.naturalHeight * scale));
        c2.getContext('2d').drawImage(img,0,0,c2.width,c2.height);
        result = c2.toDataURL('image/jpeg', Math.max(0.12, quality));
      }

      downloadDataURL(result, `${stripExt(item.file.name)}-to-${targetKB}KB.jpg`);
      resolve();
    };
    img.src = item.dataURL;
  });
}

/* ----------------- Resize by px ----------------- */
document.getElementById('startPx').addEventListener('click', ()=>{
  if(files.length === 0) return alert('Select images first.');
  const w = Number(document.getElementById('widthPx').value);
  const h = Number(document.getElementById('heightPx').value);
  if(!w && !h) return alert('Enter width or height.');
  const keepAspect = document.getElementById('keepAspect').checked;

  files.forEach(item=>{
    const img = new Image();
    img.onload = function(){
      let targetW = w || Math.round(img.naturalWidth * (h / img.naturalHeight));
      let targetH = h || Math.round(img.naturalHeight * (w / img.naturalWidth));
      if(keepAspect){
        // adjust to keep aspect ratio based on whichever provided
        if(w && !h){
          targetH = Math.round(img.naturalHeight * (w / img.naturalWidth));
        } else if(h && !w){
          targetW = Math.round(img.naturalWidth * (h / img.naturalHeight));
        } else {
          // both provided -> use as is
        }
      }
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = targetH;
      c.getContext('2d').drawImage(img, 0, 0, targetW, targetH);
      const out = c.toDataURL('image/jpeg', 0.92);
      downloadDataURL(out, `${stripExt(item.file.name)}-resized-${targetW}x${targetH}.jpg`);
    };
    img.src = item.dataURL;
  });
});

/* ----------------- Compress (quality) ----------------- */
const qualityRange = document.getElementById('qualityRange');
const qualityVal = document.getElementById('qualityVal');
qualityRange.addEventListener('input', ()=> qualityVal.textContent = qualityRange.value);

document.getElementById('startCompress').addEventListener('click', ()=>{
  if(files.length === 0) return alert('Select images first.');
  const q = Number(qualityRange.value)/100;
  files.forEach(item=>{
    const img = new Image();
    img.onload = function(){
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      const out = c.toDataURL('image/jpeg', q);
      downloadDataURL(out, `${stripExt(item.file.name)}-compressed.jpg`);
    };
    img.src = item.dataURL;
  });
});

/* ----------------- Convert ----------------- */
document.getElementById('startConvert').addEventListener('click', ()=>{
  if(files.length === 0) return alert('Select images first.');
  const fmt = document.getElementById('convertFormat').value;
  files.forEach(item=>{
    const img = new Image();
    img.onload = function(){
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img,0,0);
      const out = c.toDataURL(fmt);
      const ext = fmt === 'image/png' ? '.png' : fmt === 'image/webp' ? '.webp' : '.jpg';
      downloadDataURL(out, `${stripExt(item.file.name)}${ext}`);
    };
    img.src = item.dataURL;
  });
});

/* ----------------- Image -> PDF (multi image) ----------------- */
document.getElementById('startPdf').addEventListener('click', ()=>{
  if(files.length === 0) return alert('Select images first.');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({unit:'pt',format:'a4'});
  let processed = 0;

  files.forEach((item, idx)=>{
    const img = new Image();
    img.onload = function(){
      // fit into page width with aspect
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let w = img.width;
      let h = img.height;
      const ratio = Math.min(pageW / w, pageH / h);
      const drawW = w * ratio;
      const drawH = h * ratio;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      if(idx > 0) pdf.addPage();
      // use JPEG encoding for consistent results
      pdf.addImage(img, 'JPEG', x, y, drawW, drawH);
      processed++;
      if(processed === files.length){
        pdf.save(`${files.length > 1 ? 'images' : stripExt(files[0].file.name)}.pdf`);
      }
    };
    img.src = item.dataURL;
  });
});

/* ----------------- Helpers ----------------- */
function stripExt(name){
  return name.replace(/\.[^/.]+$/, "");
}