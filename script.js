// ------------------------------------------
// GLOBAL VARIABLES
// ------------------------------------------
let images = []; // Stores uploaded images as { file, url }

// Success green box message
function showSuccess() {
    const box = document.getElementById("successMsg");
    box.classList.remove("hidden");
    setTimeout(() => box.classList.add("hidden"), 2500);
}

// ------------------------------------------
// FILE UPLOAD SYSTEM
// ------------------------------------------
const fileInput = document.getElementById("fileInput");
const thumbGrid = document.getElementById("thumb-grid");

document.getElementById("selectBtn").onclick = () => fileInput.click();
document.getElementById("browseText").onclick = () => fileInput.click();

fileInput.onchange = (e) => loadImages(e.target.files);

function loadImages(files) {
    images = [];
    thumbGrid.innerHTML = "";

    [...files].forEach((file) => {
        const url = URL.createObjectURL(file);
        images.push({ file, url });

        const img = document.createElement("img");
        img.src = url;
        img.className = "thumb";
        thumbGrid.appendChild(img);
    });

    document.getElementById("thumbs-area").classList.remove("hidden");
}

// ------------------------------------------
// TOOL TABS SYSTEM (Only one panel visible)
// ------------------------------------------
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".tool-panel").forEach(panel =>
            panel.classList.remove("visible")
        );

        document.getElementById(btn.dataset.tool).classList.add("visible");
    });
});

// ------------------------------------------
// DOWNLOAD UTILITY
// ------------------------------------------
function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

// ------------------------------------------
// CONVERT FORMAT (JPG / PNG / WEBP)
// ------------------------------------------
document.getElementById("runConvert").onclick = async () => {
    const format = document.getElementById("convertFormat").value;

    for (const item of images) {
        await convertSingle(item.file, format);
    }

    showSuccess();
};

function convertSingle(file, format) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            canvas.getContext("2d").drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                downloadBlob(blob, file.name.replace(/\.\w+$/, "") + outputExt(format));
                resolve();
            }, format, 0.9);
        };
        img.src = URL.createObjectURL(file);
    });
}

function outputExt(type) {
    if (type === "image/jpeg") return ".jpg";
    if (type === "image/png") return ".png";
    return ".webp";
}

// ------------------------------------------
// COMPRESS IMAGE (QUALITY SLIDER)
// ------------------------------------------
document.getElementById("qualitySlider").oninput = function () {
    document.getElementById("qualityVal").textContent = this.value;
};

document.getElementById("runCompress").onclick = async () => {
    const q = document.getElementById("qualitySlider").value / 100;

    for (const item of images) {
        await compressImage(item.file, q);
    }

    showSuccess();
};

function compressImage(file, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                downloadBlob(blob, file.name.replace(/\.\w+$/, "") + ".jpg");
                resolve();
            }, "image/jpeg", quality);
        };
        img.src = URL.createObjectURL(file);
    });
}

// ------------------------------------------
// RESIZE TO WIDTH × HEIGHT (PX)
// ------------------------------------------
document.getElementById("runPx").onclick = async () => {
    const w = +document.getElementById("widthPx").value;
    const h = +document.getElementById("heightPx").value;
    const keep = document.getElementById("keepAspect").checked;

    for (const item of images) {
        await resizePx(item.file, w, h, keep);
    }

    showSuccess();
};

function resizePx(file, w, h, keepAspect) {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            let newW = w;
            let newH = h;

            if (keepAspect) {
                const ratio = img.width / img.height;
                if (w) newH = Math.round(w / ratio);
                if (h) newW = Math.round(h * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = newW;
            canvas.height = newH;

            canvas.getContext("2d").drawImage(img, 0, 0, newW, newH);

            canvas.toBlob((blob) => {
                downloadBlob(blob, file.name.replace(/\.\w+$/, "") + ".jpg");
                resolve();
            }, "image/jpeg", 0.9);
        };

        img.src = URL.createObjectURL(file);
    });
}

// ------------------------------------------
// RESIZE TO TARGET KB/MB
// ------------------------------------------
document.getElementById("runKb").onclick = async () => {
    const size = +document.getElementById("targetSize").value;
    const unit = document.getElementById("sizeUnit").value;

    const targetBytes = unit === "kb" ? size * 1024 : size * 1024 * 1024;

    for (const item of images) {
        await resizeToSize(item.file, targetBytes);
    }

    showSuccess();
};

function resizeToSize(file, targetBytes) {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            let quality = 0.9;

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            const attempt = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob.size > targetBytes && quality > 0.05) {
                        quality -= 0.05;
                        attempt();
                    } else {
                        downloadBlob(blob, file.name.replace(/\.\w+$/, "") + ".jpg");
                        resolve();
                    }
                }, "image/jpeg", quality);
            };

            attempt();
        };

        img.src = URL.createObjectURL(file);
    });
}

// ------------------------------------------
// EXPORT IMAGES TO PDF
// ------------------------------------------
document.getElementById("runPdf").onclick = async () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    let first = true;

    for (const item of images) {
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const w = pdf.internal.pageSize.getWidth();
                const h = (img.height * w) / img.width;

                if (!first) pdf.addPage();
                first = false;

                pdf.addImage(img, "JPEG", 0, 10, w, h);
                resolve();
            };
            img.src = item.url;
        });
    }

    pdf.save("images.pdf");
    showSuccess();
};