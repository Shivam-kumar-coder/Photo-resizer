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


// =========================================================
// UI SWITCHING LOGIC (Includes Deep Linking Fix)
// =========================================================

// Function to switch tool panels and update navigation
function switchTool(toolId) {
    // Update state and active button
    state.activeTool = toolId;
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tool') === toolId) {
            btn.classList.add('active');
        }
    });

    // Show/Hide tool panels
    toolPanels.forEach(panel => {
        if (panel.id === toolId) {
            panel.classList.add('visible');
        } else {
            panel.classList.remove('visible');
        }
    });
}

// Event listeners for navigation buttons (using event delegation)
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool');
        switchTool(toolId);
    });
});

// Functionality to switch tools based on content links
document.querySelectorAll('[data-tool-link]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const toolId = link.getAttribute('data-tool-link');
        switchTool(toolId);
        // Update URL hash for deep linking
        window.location.hash = toolId;
    });
});


// =========================================================
// NEW: DEEP LINKING FIX - Checks URL Hash on Load
// =========================================================
function checkURLHash() {
    const hash = window.location.hash;
    if (hash) {
        // Remove '#' from the hash to get the tool ID (e.g., "tool-pdf")
        const toolId = hash.substring(1); 
        const targetButton = document.querySelector(`[data-tool="${toolId}"]`);
        
        if (targetButton) {
            // Simulate a click on the navigation button to activate the tool panel
            targetButton.click();
            // Scroll to the main tool area for better UX
            document.getElementById('select-area').scrollIntoView({ behavior: 'smooth' });
        }
    }
}


// =========================================================
// FILE UPLOAD AND DRAG-DROP LOGIC
// =========================================================

// Handle file selection from input
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFilesToState(files);
}

// Handle file drop
function handleDrop(event) {
    event.preventDefault();
    dropArea.classList.remove('dragover');
    const files = Array.from(event.dataTransfer.files);
    addFilesToState(files);
}

// Add files to the global state and display thumbnails
function addFilesToState(files) {
    if (state.isProcessing) return;
    
    // Filter out non-image files if needed
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    // Reset current files if new ones are uploaded
    if (state.files.length === 0) {
        state.files = [];
        thumbGrid.innerHTML = '';
        thumbsArea.classList.remove('hidden');
    }

    imageFiles.forEach(file => {
        // Create an entry in the state for the new file
        state.files.push({
            originalFile: file,
            filename: file.name,
            originalSize: file.size,
            processedBlob: null,
            processedSize: 0,
            status: 'Ready',
        });

        // Use FileReader to read file for thumbnail preview
        const reader = new FileReader();
        reader.onload = (e) => {
            displayThumbnail(file.name, e.target.result, file.size);
        };
        reader.readAsDataURL(file);
    });
}

// Display file thumbnail and info
function displayThumbnail(filename, dataURL, size) {
    const item = document.createElement('div');
    item.className = 'thumb-item';
    item.dataset.filename = filename; // Link thumbnail to file object

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
    fileInput.value = ''; // Clear file input
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
// CORE IMAGE PROCESSING FUNCTIONS (Canvas API)
// =========================================================

// Utility to load image and get canvas context
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

// Utility to convert canvas to Blob
function canvasToBlob(canvas, mimeType, quality) {
    return new Promise(resolve => {
        // Use p5.js/canvas default for PNG (quality ignored), or quality for JPG/WEBP
        canvas.toBlob(resolve, mimeType, quality); 
    });
}

// Function to process a single file based on tool (placeholder, actual logic defined below)
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
            mimeType = 'image/jpeg'; // Usually compression is best with JPG
        } else if (toolType === 'px') {
            // ... (Pixel resize logic, maintaining aspect ratio if needed)
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
             // 35x45mm at 300 DPI is 413x531 pixels
             targetWidth = 413;
             targetHeight = 531;
             // Simple centering crop logic (for demo)
             const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
             const x = (targetWidth / 2) - (img.width / 2) * scale;
             const y = (targetHeight / 2) - (img.height / 2) * scale;
             
             canvas.width = targetWidth;
             canvas.height = targetHeight;
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        } else if (toolType === 'kb') {
            // KB Reducer is complex and requires iterative processing (see below for actual implementation)
            // For general processing:
            quality = 0.7; // Start with a default quality
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
             
             // First attempt with lower quality (or the processed blob if coming from another tool)
             let currentBlob = blob;

             // Iteratively reduce quality until target size is met or quality is too low
             while (currentBlob.size > targetBytes && currentQuality > 10) {
                 currentQuality -= 5; // Decrease quality by 5%
                 currentBlob = await canvasToBlob(canvas, 'image/jpeg', currentQuality / 100);
             }
             
             // If size is still too big, scale down the image (final attempt)
             if (currentBlob.size > targetBytes) {
                 // Simple reduction: scale canvas to 80% and re-attempt blob conversion
                 canvas.width *= 0.8;
                 canvas.height *= 0.8;
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                 currentBlob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
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
        console.error("Error processing file:", error);
        fileEntry.status = 'ERROR';
        updateThumbnailStatus(fileEntry.filename, 'ERROR');
        return null;
    }
}

// Utility to update thumbnail status
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

// Utility to download a single file
function downloadBlob(blob, filename, mimeType) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Utility to download all files in a zip (placeholder for simplicity)
function downloadBatch(blobs, filenames) {
    alert("Batch download complete! (If this were a production app, it would download a ZIP file)");
    // In a real app, you would use a library like JSZip here.
    // For now, we will download them sequentially if a single tool is run.
    blobs.forEach((blob, index) => {
        downloadBlob(blob, filenames[index]);
    });
}


// =========================================================
// TOOL ACTION HANDLERS
// =========================================================

// Wrapper for all tool actions
async function runTool(toolType, options = {}) {
    if (state.files.length === 0 || state.isProcessing) return;
    
    state.isProcessing = true;
    
    const processedBlobs = [];
    const processedFilenames = [];
    
    for (const fileEntry of state.files) {
        updateThumbnailStatus(fileEntry.filename, 'Processing...');
        
        const blob = await processFile(fileEntry, toolType, options);
        
        if (blob) {
            processedBlobs.push(blob);
            
            // Determine new filename extension
            let newExt = 'jpg';
            if (toolType === 'convert') {
                newExt = options.format.split('/')[1];
            } else if (blob.type === 'image/png') {
                 newExt = 'png';
            } else if (blob.type === 'image/webp') {
                 newExt = 'webp';
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
        alert("Please enter a valid target size in KB.");
        return;
    }
    runTool('kb', { targetSizeKB });
});


// --- Pixel Resize Handler ---
runPxBtn.addEventListener('click', () => {
    const width = parseInt(widthPxInput.value);
    const height = parseInt(heightPxInput.value);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert("Please enter valid width and height in pixels.");
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

// --- Passport Handler ---
runPassportBtn.addEventListener('click', () => {
    // Passport size is hardcoded as 413x531 (35x45mm @ 300dpi)
    runTool('passport');
});


// --- PDF Handlers ---
async function runPDF(merge) {
    if (state.files.length === 0 || state.isProcessing) return;
    state.isProcessing = true;
    
    const pdfBlobs = [];
    
    if (merge) {
        // MERGE: Create a single PDF with all images
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        for (let i = 0; i < state.files.length; i++) {
            const fileEntry = state.files[i];
            updateThumbnailStatus(fileEntry.filename, 'Adding to PDF...');

            const { img, canvas, ctx } = await loadImage(fileEntry.originalFile);
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            if (i > 0) pdf.addPage();
            
            // Calculate dimensions to fit page
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
        downloadBlob(pdfBlob, 'QuickPic-Merged.pdf', 'application/pdf');

    } else {
        // SEPARATE: Create one PDF per image
        for (const fileEntry of state.files) {
            updateThumbnailStatus(fileEntry.filename, 'Creating PDF...');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const { img, canvas, ctx } = await loadImage(fileEntry.originalFile);
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Add image to PDF
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (pageWidth - w) / 2;
            const y = (pageHeight - h) / 2;
            
            pdf.addImage(imgData, 'JPEG', x, y, w, h);
            
            const pdfBlob = pdf.output('blob');
            pdfBlobs.push(pdfBlob);
            
            fileEntry.status = `PDF Ready`;
            updateThumbnailStatus(fileEntry.filename, fileEntry.status);
            
            // Download immediately for separate mode
            const originalNameWithoutExt = fileEntry.filename.split('.').slice(0, -1).join('.');
            downloadBlob(pdfBlob, `${originalNameWithoutExt}-quickpic.pdf`, 'application/pdf');
        }
    }

    state.isProcessing = false;
}

runPdfMergeBtn.addEventListener('click', () => runPDF(true));
runPdfSeparateBtn.addEventListener('click', () => runPDF(false));


// =========================================================
// INITIALIZATION
// =========================================================

// =========================================================
// NEW: TOAST NOTIFICATION HANDLER
// =========================================================

const notificationContainer = document.getElementById('notification-container');

/**
 * Displays a toast notification on the screen.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' (green) or 'error' (red).
 * @param {number} duration - Time in milliseconds to show the notification.
 */
function showNotification(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;

    notificationContainer.appendChild(toast);

    // Force reflow to ensure the transition plays
    void toast.offsetWidth; 

    // Add 'show' class to slide the toast in
    toast.classList.add('show');

    // Automatically hide the notification after the duration
    setTimeout(() => {
        toast.classList.remove('show');
        
        // Wait for the slide-out transition to finish before removing from DOM
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300); // Should match the CSS transition time
    }, duration);
}


// =========================================================
// INTEGRATION: Download/Error Notification Updates
// =========================================================

// अब आपको अपनी पुरानी 'downloadBatch' और 'processFile' के एरर हैंडलिंग को अपडेट करना होगा।

// 1. 'processFile' के Catch Block को बदलें (लगभग लाइन 345)
// OLD:
// } catch (error) {
//     console.error("Error processing file:", error);
//     fileEntry.status = 'ERROR';
//     updateThumbnailStatus(fileEntry.filename, 'ERROR');
//     return null;
// }

// NEW CATCH BLOCK:
} catch (error) {
    console.error("Error processing file:", error);
    fileEntry.status = 'ERROR';
    updateThumbnailStatus(fileEntry.filename, 'ERROR');
    // Show Red Box Notification:
    showNotification(`Error: Could not process ${fileEntry.filename}.`, 'error', 5000);
    return null;
}


// 2. 'downloadBatch' फ़ंक्शन को बदलें (लगभग लाइन 400)
// OLD:
// function downloadBatch(blobs, filenames) {
//     alert("Batch download complete!..."); // OLD ALERT
//     // ... download logic ...
// }

// NEW DOWNLOAD BATCH FUNCTION:
function downloadBatch(blobs, filenames) {
    // Show Green Box Notification:
    showNotification(`${blobs.length} image(s) downloaded successfully!`, 'success');
    
    blobs.forEach((blob, index) => {
        downloadBlob(blob, filenames[index]);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if there is a hash in the URL for deep linking
    checkURLHash();
});

// Call checkURLHash on load (essential for the deep linking fix)
window.addEventListener('load', checkURLHash);
