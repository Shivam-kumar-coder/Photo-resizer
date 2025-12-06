async function resizeImage() {
  const input = document.getElementById("fileInput");
  const size = parseFloat(document.getElementById("sizeInput").value);
  const unit = document.getElementById("unitSelect").value;

  if (!input.files.length) {
    alert("Please select an image first!");
    return;
  }

  if (!size) {
    alert("Please enter target size!");
    return;
  }

  const file = input.files[0];
  const finalKB = unit === "MB" ? size * 1024 : size;

  const output = await compressToTargetSize(file, finalKB);

  const url = URL.createObjectURL(output);
  document.getElementById("outputImage").src = url;

  const downloadLink = document.getElementById("downloadBtn");
  downloadLink.href = url;
  downloadLink.download = "compressed.jpg";
}