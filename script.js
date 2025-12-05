const imageInput = document.getElementById("imageInput");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const resizeBtn = document.getElementById("resizeBtn");
const canvas = document.getElementById("canvas");
const downloadBtn = document.getElementById("downloadBtn");

let img = new Image();

imageInput.onchange = (e) => {
  const file = e.target.files[0];
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    widthInput.value = img.width;
    heightInput.value = img.height;
  };
};

resizeBtn.onclick = () => {
  const width = widthInput.value;
  const height = heightInput.value;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  downloadBtn.href = canvas.toDataURL("image/jpeg");
  downloadBtn.style.display = "block";
};
