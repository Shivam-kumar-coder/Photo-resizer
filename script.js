// ---------------------- GLOBALS ----------------------
let images = [];

function showSuccess() {
    const box = document.getElementById("successMsg");
    box.classList.remove("hidden");
    setTimeout(() => box.classList.add("hidden"), 3000);
}

// ---------------------- UPLOAD ----------------------

document.getElementById("selectBtn").onclick = () => fileInput.click();
document.getElementById("browseText").onclick = () => fileInput.click();

fileInput.onchange = (e) => loadImages(e.target.files);

function loadImages(files) {
    images = [];
    document.getElementById("thumb-grid").innerHTML = "";

    [...files].forEach((file, i) => {
        const url = URL.createObjectURL(file);
        images.push({ file, url });

        const img = document.createElement("img");
        img.src = url;
        img.className = "thumb";

        document.getElementById("thumb-grid").appendChild(img);
    });

    document.getElementById("thumbs-area").classList.remove("hidden");
}

// ---------------------- CONVERSION ----------------------
document.getElementById("runConvert").onclick = async () => {
    const format = document.getElementById("convertFormat").value;

    for (const item of images) {
        await convertImage(item.file, format);
    }

    showSuccess();
};

function convertImage(file, format) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                downloadBlob(blob, file.name.replace(/\.\w+$/, "") + getExt(format));
                resolve();
            }, format, 0.9);
        };
        img.src = URL.createObjectURL(file);
    });
}

function getExt(fmt) {
    if (fmt === "image/jpeg") return ".jpg";
    if (fmt === "image/png") return ".png";
    if (fmt === "image/webp") return ".webp";
}

// ---------------------- DOWNLOAD ----------------------
function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}