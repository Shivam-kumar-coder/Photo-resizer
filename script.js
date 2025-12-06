let img = null;

document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
        img = new Image();
        img.src = evt.target.result;
        img.onload = () => {
            document.getElementById("preview").src = img.src;
            document.getElementById("preview").style.display = "block";
        };
    };
    reader.readAsDataURL(file);
});

/* TAB SWITCH */
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    };
});

/* RESIZE KB */
function resizeToKB() {
    if (!img) return alert("Select image first!");

    let target = Number(document.getElementById("targetKB").value) * 1024;
    let quality = 0.9;
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    function loop() {
        let data = canvas.toDataURL("image/jpeg", quality);
        if (data.length <= target || quality <= 0.2) {
            download(data, "resized_kb.jpg");
        } else {
            quality -= 0.05;
            loop();
        }
    }
    loop();
}

/* RESIZE PX */
function resizePX() {
    if (!img) return alert("Select image first!");

    let w = Number(document.getElementById("widthPX").value);
    let h = Number(document.getElementById("heightPX").value);

    let canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    download(canvas.toDataURL("image/jpeg", 0.9), "resized_px.jpg");
}

/* COMPRESS */
function compress() {
    if (!img) return alert("Select image first!");
    let q = Number(document.getElementById("quality").value) / 100;
    download(imgToData(q), "compressed.jpg");
}
function imgToData(q) {
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", q);
}

/* CONVERT */
function convertImage() {
    if (!img) return alert("Select image first!");
    let format = document.getElementById("format").value;

    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);

    download(canvas.toDataURL(format), "converted" + (format === "image/png" ? ".png" : ".jpg"));
}

/* PDF */
function makePDF() {
    if (!img) return alert("Select image first!");

    let pdf = new jsPDF({
        orientation: img.width > img.height ? "l" : "p",
        unit: "px",
        format: [img.width, img.height]
    });

    pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
    pdf.save("image.pdf");
}

/* DOWNLOAD HELPER */
function download(dataURL, filename) {
    let a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    a.click();
}

/* QUALITY SLIDER UPDATE */
document.getElementById("quality").oninput = function () {
    document.getElementById("qval").innerText = this.value + "%";
};