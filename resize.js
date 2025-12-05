function resizeImg() {
    let file = document.getElementById("resizeInput").files[0];
    let w = document.getElementById("resizeW").value;
    let h = document.getElementById("resizeH").value;

    let img = new Image();
    img.onload = function () {
        let canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        let link = document.getElementById("resizeDownload");
        link.href = canvas.toDataURL("image/jpeg");
        link.download = "resized.jpg";
        link.style.display = "inline";
        link.innerText = "Download Resized Image";
    };
    img.src = URL.createObjectURL(file);
}