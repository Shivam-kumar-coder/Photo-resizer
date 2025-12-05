function convertToPNG() {
    let file = document.getElementById("pngInput").files[0];
    let img = new Image();
    img.onload = function () {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        canvas.getContext("2d").drawImage(img, 0, 0);

        let link = document.getElementById("pngDownload");
        link.href = canvas.toDataURL("image/png");
        link.download = "converted.png";
        link.style.display = "inline";
        link.innerText = "Download PNG";
    };
    img.src = URL.createObjectURL(file);
}

function convertToJPG() {
    let file = document.getElementById("jpgInput").files[0];
    let img = new Image();
    img.onload = function () {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        canvas.getContext("2d").drawImage(img, 0, 0);

        let link = document.getElementById("jpgDownload");
        link.href = canvas.toDataURL("image/jpeg");
        link.download = "converted.jpg";
        link.style.display = "inline";
        link.innerText = "Download JPG";
    };
    img.src = URL.createObjectURL(file);
}