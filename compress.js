async function compressToTargetSize(file, targetKB) {
  const target = targetKB * 1024;
  let quality = 0.9;

  const readFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

  const img = document.createElement("img");
  img.src = await readFile(file);

  await new Promise((r) => (img.onload = r));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;

  let compressed;

  while (true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    const binary = atob(dataUrl.split(",")[1]);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    compressed = new Blob([buffer], { type: "image/jpeg" });

    if (compressed.size <= target || quality <= 0.1) break;

    quality -= 0.05;
  }

  return compressed;
}