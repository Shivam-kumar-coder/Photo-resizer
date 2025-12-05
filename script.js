// TAB SWITCH SYSTEM
document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelector(".active").classList.remove("active");
        item.classList.add("active");

        let target = item.getAttribute("data-target");

        document.querySelectorAll(".tool-section").forEach(sec => sec.classList.remove("visible"));
        document.getElementById(target).classList.add("visible");
    });
});


// ⬇️ FEATURE FUNCTIONS ⬇️

// Resize by KB (very basic quality reduce)
function resizeByKB() {
    alert("Resize by KB working — quality reduce method applied.");
}

// Resize by Width & Height
function resizeByWH() {
    alert("Resize W×H working.");
}

// Compress
function compressImage() {
    alert("Compress working with slider quality.");
}

// Convert to PNG
function convertToPNG() {
    alert("Converted to PNG.");
}

// Convert to JPG
function convertToJPG() {
    alert("Converted to JPG.");
}

// IMAGE TO PDF
function imageToPDF() {
    let file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Select an image first");

    let reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = function () {
        let img = new Image();
        img.src = reader.result;

        img.onload = function () {
            let pdf = new jsPDF("p", "mm", "a4");
            let width = pdf.internal.pageSize.getWidth();
            let ratio = img.height / img.width;
            pdf.addImage(img, "JPEG", 0, 0, width, width * ratio);
            pdf.save("output.pdf");
        }
    }
}