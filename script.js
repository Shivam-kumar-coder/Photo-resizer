// Ensure jspdf is loaded globally from index.html

const state = {
    files: [], // Array to hold File objects and their processed data
    activeTool: 'tool-kb',
    isProcessing: false,
};

// DOM Elements
const dropArea = document.getElementById('dropbox');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const thumbsArea = document.getElementById('thumbs-area');
const thumbGrid = document.getElementById('thumb-grid');
const resetBtn = document.getElementById('resetBtn');

// Tool Buttons and Panels
const navButtons = document.querySelectorAll('.nav-btn');
const toolPanels = document.querySelectorAll('.tool-panel');

// KB Reducer Elements
const targetSizeInput = document.getElementById('targetSize');
const runKbBtn = document.getElementById('runKb');

// Pixel Resize Elements
const widthPxInput = document.getElementById('widthPx');
const heightPxInput = document.getElementById('heightPx');
const keepAspectCheckbox = document.getElementById('keepAspect');
const runPxBtn = document.getElementById('runPx');

// Compress Elements
const qualitySlider = document.getElementById('qualitySlider');
const qualityValSpan = document.getElementById('qualityVal');
const runCompressBtn = document.getElementById('runCompress');

// Convert Elements
const convertFormatSelect = document.getElementById('convertFormat');
const runConvertBtn = document.getElementById('runConvert');

// PDF Elements
const runPdfMergeBtn = document.getElementById('runPdfMerge');
const runPdfSeparateBtn = document.getElementById('runPdfSeparate');

// Passport Element (assuming you have a runPassportBtn in index.html)
const runPassportBtn = document.getElementById('runPassport'); 

// NEW: Notification Container
const notificationContainer = document.getElementById('notification-container');


// =========================================================
// UI SWITCHING & DEEP LINKING LOGIC (SCROLLING REMOVED)
// =========================================================

// Function to switch tool panels and update navigation
function switchTool(toolId) {
    state.activeTool = toolId;
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tool') === toolId) {
            btn.classList.add('active');
        }
    });

    toolPanels.forEach(panel => {
        if (panel.id === toolId) {
            panel.classList.add('visible');
        } else {
            panel.classList.remove('visible');
        }
    });
}

// Event listeners for navigation buttons (FINAL FIX: NO SCROLLING)
navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => { 
        e.preventDefault(); // सुनिश्चित करें कि कोई डिफ़ॉल्ट HTML व्यवहार (जैसे स्क्रॉलिंग) न हो
        const toolId = btn.getAttribute('data-tool');

        // 1. केवल टूल को स्विच करें
        switchTool(toolId); 

        // 2. URL में हैश अपडेट करें (SEO के लिए ज़रूरी)
        window.location.hash = toolId; 

        // 3. कोई स्क्रॉल कमांड नहीं!
    });
});


// Functionality to switch tools based on content links (SCROLLING REMOVED)
document.querySelectorAll('[data-tool-link]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const toolId = link.getAttribute('data-tool-link');
        switchTool(toolId);
        window.location.hash = toolId;

        // SCROLLING REMOVED FROM HERE
    });
});


// Checks URL Hash on Load (Deep Linking Fix) - SCROLLING REMOVED
function checkURLHash() {
    const hash = window.location.hash;
    if (hash) {
        const toolId = hash.substring(1); 

        // सीधे switchTool कॉल करें
        switchTool(toolId); 
    }
    // अगर hash नहीं है, तो डिफ़ॉल्ट टूल 'tool-kb' पहले ही लोड हो जाएगा।
}


// =========================================================
// FILE UPLOAD AND THUMBNAIL LOGIC
// =========================================================

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFilesToState(files);
}

function handleDrop(event) {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    addFilesToState(files);
}

function addFilesToState(files) {
    if (state.isProcessing) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        showNotification("Please select image files (JPG, PNG, WebP).", 'error', 4000);
        return;
    }

    if (state.files.length === 0) {
        state.files = [];
        thumbGrid.innerHTML = '';
        thumbsArea.classList.remove('hidden');
    }

    imageFiles.forEach(file => {
        state.files.push({
            originalFile: file,
            filename: file.name,
            originalSize: file.size,
            processedBlob: null,
            processedSize: 0,
            status: 'Ready',
        });

        const reader = new FileReader();
        reader.onload = (e) => {
            displayThumbnail(file.name, e.target.result, file.size);
        };
        reader.readAsDataURL(file);
    });
}

function displayThumbnail(filename, dataURL, size) {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.dataset.filename = filename;

    const img = document.createElement('img');
    img.className = 'thumb-img';
    img.src = dataURL;

    const name = document.createElement('span');
    name.className = 'thumb-filename';
    name.textContent = filename;

    const status = document.createElement('span');
    status.className = 'thumb-status';
    status.textContent = `Size: ${(size / 1024).toFixed(1)} KB`;

    item.appendChild(img);
    item.appendChild(name);
    item.appendChild(status);
    thumbGrid.appendChild(item);
}


// Reset Button Functionality
resetBtn.addEventListener('click', () => {
    state.files = [];
    thumbGrid.innerHTML = '';
    thumbsArea.classList.add('hidden');
    fileInput.value = '';
    showNotification("Image selection cleared. Ready for new upload.", 'success');
});


// Drag/Drop Event Listeners
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', handleDrop);
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);


// =========================================================
// CORE IMAGE PROCESSING & UTILITIES
// =========================================================

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                resolve({ img, canvas, ctx });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality); 
    });
}

function updateThumbnailStatus(filename, statusText) {
    const thumbItem = document.querySelector(`.thumb-item[data-filename="${filename}"]`);
    if (thumbItem) {
        const statusSpan = thumbItem.querySelector('.thumb-status');
        statusSpan.textContent = statusText;
        if (statusText.includes('DONE')) {
             statusSpan.style.color = 'green';
        } else if (statusText === 'ERROR') {
             statusSpan.style.color = 'red';
        } else {
             statusSpan.style.color = 'var(--accent)';
        }
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// NEW: Toast Notification Handler
function showNotification(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    notificationContainer.appendChild(toast);
    void toast.offsetWidth; 
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// NEW: Updated Download Batch
function downloadBatch(blobs, filenames) {
    showNotification(`${blobs.length} image(s) downloaded successfully!`, 'success');

    // In a real app, you would use a library like JSZip here.
    blobs.forEach((blob, index) => {
        downloadBlob(blob, filenames[index]);
    });
}


// =========================================================
// MAIN PROCESSING FUNCTION (CLEANED)
// =========================================================
async function processFile(fileEntry, toolType, options = {}) {
    try {
        const { img, canvas, ctx } = await loadImage(fileEntry.originalFile);

        let targetWidth = img.width;
        let targetHeight = img.height;
        let mimeType = fileEntry.originalFile.type;
        let quality = 0.9; 

        // Apply tool-specific transformations
        if (toolType === 'compress') {
            quality = options.quality / 100;
            mimeType = 'image/jpeg';
        } else if (toolType === 'px') {
            targetWidth = options.width;
            targetHeight = options.height;
            if (options.keepAspect) {
                const ratio = Math.min(options.width / img.width, options.height / img.height);
                targetWidth = img.width * ratio;
                targetHeight = img.height * ratio;
            }
        } else if (toolType === 'convert') {
            mimeType = options.format;
            if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                quality = 0.9;
            }
        } else if (toolType === 'passport') {
             // Passport size 413x531 pixels (standard Indian 3.5x4.5 cm at 300 DPI)
             targetWidth = 413;
             targetHeight = 531;

             const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
             const x = (targetWidth / 2) - (img.width / 2) * scale;
             const y = (targetHeight / 2) - (img.height / 2) * scale;

             canvas.width = targetWidth;
             canvas.height = targetHeight;
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        }

        if (toolType !== 'passport') {
             canvas.width = targetWidth;
             canvas.height = targetHeight;
             ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }


        let blob = await canvasToBlob(canvas, mimeType, quality);

        // --- KB REDUCER: Iterative Logic ---
        if (toolType === 'kb' && options.targetSizeKB > 0) {
             const targetBytes = options.targetSizeKB * 1024;
             let currentQuality = 90; 
             let currentBlob = blob;
             let iterationCount = 0; // Prevent infinite loop

             // Step 1: Reduce quality
             while (currentBlob.size > targetBytes && currentQuality > 10 && iterationCount < 20) {
                 currentQuality -= 5;
                 // Note: We use the original canvas from loadImage
                 currentBlob = await canvasToBlob(canvas, 'image/jpeg', currentQuality / 100); 
                 iterationCount++;
             }

             // Step 2: Reduce dimensions if quality reduction failed to reach target
             if (currentBlob.size > targetBytes) {
                 // Reset canvas/context using original image for clean scaling
                 canvas.width = img.width * 0.8;
                 canvas.height = img.height * 0.8;
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                 // Try one more time with lower dimension and fixed quality (e.g., 80)
                 currentBlob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
                 showNotification("KB target difficult to reach, reducing image dimensions by 20%.", 'warning', 5000);
             }

             blob = currentBlob;
             mimeType = 'image/jpeg';
        }
        // --- End KB Reducer Logic ---

        fileEntry.processedBlob = blob;
        fileEntry.processedSize = blob.size;
        fileEntry.status = `DONE: ${(blob.size / 1024).toFixed(1)} KB`;
        updateThumbnailStatus(fileEntry.filename, fileEntry.status);
        return blob;

    } catch (error) {
        // NEW: Error handling with Toast Notification
        console.error("Error processing file:", error);
        fileEntry.status = 'ERROR';
        updateThumbnailStatus(fileEntry.filename, 'ERROR');
        showNotification(`Error: Could not process ${fileEntry.filename}.`, 'error', 5000);
        return null;
    }
}


// =========================================================
// TOOL ACTION HANDLERS
// =========================================================

async function runTool(toolType, options = {}) {
    if (state.files.length === 0 || state.isProcessing) {
        showNotification("Please select images first to run the tool.", 'error', 4000);
        return;
    }

    state.isProcessing = true;

    const processedBlobs = [];
    const processedFilenames = [];

    for (const fileEntry of state.files) {
        updateThumbnailStatus(fileEntry.filename, 'Processing...');

        const blob = await processFile(fileEntry, toolType, options);

        if (blob) {
            processedBlobs.push(blob);

            let newExt = 'jpg';
            if (toolType === 'convert') {
                // Get extension from mime type (image/jpeg -> jpeg)
                newExt = options.format.split('/')[1];
            } else if (blob.type === 'image/png') {
                 newExt = 'png';
            } else if (blob.type === 'image/webp') {
                 newExt = 'webp';
            } else if (toolType === 'passport') {
                 // Passport photos are best saved as JPG
                 newExt = 'jpg';
            }

            const originalNameWithoutExt = fileEntry.filename.split('.').slice(0, -1).join('.');
            processedFilenames.push(`${originalNameWithoutExt}-quickpic.${newExt}`);
        }
    }

    state.isProcessing = false;

    if (processedBlobs.length > 0 && toolType !== 'pdf') {
        downloadBatch(processedBlobs, processedFilenames);
    }
}

// --- KB Reducer Handler ---
runKbBtn.addEventListener('click', () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
        showNotification("Please enter a valid target size in KB.", 'error', 4000);
        return;
    }
    runTool('kb', { targetSizeKB });
});


// --- Pixel Resize Handler ---
runPxBtn.addEventListener('click', () => {
    const width = parseInt(widthPxInput.value);
    const height = parseInt(heightPxInput.value);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        showNotification("Please enter valid width and height in pixels.", 'error', 4000);
        return;
    }
    const keepAspect = keepAspectCheckbox.checked;
    runTool('px', { width, height, keepAspect });
});


// --- Compress Handler ---
qualitySlider.addEventListener('input', () => {
    qualityValSpan.textContent = qualitySlider.value;
});

runCompressBtn.addEventListener('click', () => {
    const quality = parseInt(qualitySlider.value);
    runTool('compress', { quality });
});


// --- Convert Handler ---
runConvertBtn.addEventListener('click', () => {
    const format = convertFormatSelect.value;
    runTool('convert', { format });
});

// --- Passport Handler (FIXED: Event Listener Added) ---
if (runPassportBtn) {
    runPassportBtn.addEventListener('click', () => {
        runTool('passport');
    });
}


// --- PDF Handlers ---
async function runPDF(merge) {
    if (state.files.length === 0 || state.isProcessing) {
        showNotification("Please select images first to create PDF.", 'error', 4000);
        return;
    }
    state.isProcessing = true;

    // Use a placeholder for pdfBlobs to keep the structure simple, 
    // though pdf generation handles download immediately.

    if (merge) {
        // MERGE: Create a single PDF with all images
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

        try {
             for (let i = 0; i < state.files.length; i++) {
                const fileEntry = state.files[i];
                updateThumbnailStatus(fileEntry.filename, 'Adding to PDF...');

                const { img, canvas } = await loadImage(fileEntry.originalFile);
                // Draw image on canvas without scaling/resizing just for DataURL capture
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);

                const imgData = canvas.toDataURL('image/jpeg', 0.9);

                if (i > 0) pdf.addPage();

                // Calculate image dimensions to fit page with padding
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                const w = img.width * ratio;
                const h = img.height * ratio;
                const x = (pageWidth - w) / 2;
                const y = (pageHeight - h) / 2;

                pdf.addImage(imgData, 'JPEG', x, y, w, h);
                fileEntry.status = `Added to PDF`;
                updateThumbnailStatus(fileEntry.filename, fileEntry.status);
            }

            const pdfBlob = pdf.output('blob');
            downloadBlob(pdfBlob, 'QuickPic-Merged.pdf');
            showNotification("Successfully merged images into a single PDF!", 'success');

        } catch (error) {
             console.error("PDF Merge Error:", error);
             showNotification("Error during PDF merging.", 'error', 5000);
        }

    } else {
        // SEPARATE: Create one PDF per image
        try {
             for (const fileEntry of state.files) {
                updateThumbnailStatus(fileEntry.filename, 'Creating PDF...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                const { img, canvas } = await loadImage(fileEntry.originalFile);

                // Draw image on canvas without scaling/resizing just for DataURL capture
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);

                const imgData = canvas.toDataURL('image/jpeg', 0.9);

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                const w = img.width * ratio;
                const h = img.height * ratio;
                const x = (pageWidth - w) / 2;
                const y = (pageHeight - h) / 2;

                pdf.addImage(imgData, 'JPEG', x, y, w, h);

                const pdfBlob = pdf.output('blob');

                fileEntry.status = `PDF Ready`;
                updateThumbnailStatus(fileEntry.filename, fileEntry.status);

                const originalNameWithoutExt = fileEntry.filename.split('.').slice(0, -1).join('.');
                downloadBlob(pdfBlob, `${originalNameWithoutExt}-quickpic.pdf`);
            }
            showNotification("Successfully exported all images as separate PDFs!", 'success');
        } catch (error) {
             console.error("PDF Separate Error:", error);
             showNotification("Error during PDF export.", 'error', 5000);
        }
    }

    state.isProcessing = false;
}

runPdfMergeBtn.addEventListener('click', () => runPDF(true));
runPdfSeparateBtn.addEventListener('click', () => runPDF(false));


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    checkURLHash();
});

window.addEventListener('load', checkURLHash);
