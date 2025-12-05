document.getElementById("quality").oninput = function () {
    document.getElementById("qVal").innerText = this.value;
};

function compressImg() {
    let file = document.getElementById("compressInput").files[0];
    let q = document.getElementById("quality").value / 100;

    let img = new Image();
    img.onload = function () {
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        let link = document.getElementById("compressDownload");
        link.href = canvas.toDataURL("image/jpeg", q);
        link.download = "compressed.jpg";
        link.style.display = "inline";
        link.innerText = "Download Compressed Image";
    };
    img.src = URL.createObjectURL(file);
}