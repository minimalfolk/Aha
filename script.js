const uploadBox = document.getElementById("uploadBox");
const imageInput = document.getElementById("imageInput");
const originalPreview = document.getElementById("originalPreview");
const originalImage = document.getElementById("originalImage");
const originalDetails = document.getElementById("originalDetails");
const resizeOptions = document.querySelector(".resize-options");
const resizeBtn = document.getElementById("resizeBtn");
const resizedPreview = document.getElementById("resizedPreview");
const resizedImage = document.getElementById("resizedImage");
const previousSize = document.getElementById("previousSize");
const newSize = document.getElementById("newSize");
const downloadBtn = document.getElementById("downloadBtn");
const loadingIndicator = document.getElementById("loadingIndicator");

const newWidth = document.getElementById("newWidth");
const newHeight = document.getElementById("newHeight");
const formatSelect = document.getElementById("formatSelect");
const customSize = document.getElementById("customSize");
const presetSize = document.getElementById("presetSize");

let originalFile;
let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");

uploadBox.addEventListener("click", () => imageInput.click());
uploadBox.addEventListener("dragover", (e) => e.preventDefault());
uploadBox.addEventListener("drop", handleDrop);
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file && file.size <= 50 * 1024 * 1024 && file.type.startsWith("image/")) {
    previewOriginal(file);
  }
});

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.size <= 50 * 1024 * 1024 && file.type.startsWith("image/")) {
    previewOriginal(file);
  }
}

function previewOriginal(file) {
  originalFile = file;
  const reader = new FileReader();
  reader.onload = function (e) {
    originalImage.src = e.target.result;
    originalPreview.hidden = false;
    resizeOptions.hidden = false;
    resizedPreview.hidden = true;

    originalImage.onload = () => {
      originalDetails.innerText = `Size: ${(file.size / 1024).toFixed(2)} KB | Dimensions: ${originalImage.naturalWidth} x ${originalImage.naturalHeight}`;
      resizeBtn.disabled = false;
    };
  };
  reader.readAsDataURL(file);
}

resizeBtn.addEventListener("click", () => {
  if (!originalFile) return;

  resizeBtn.disabled = true;
  loadingIndicator.hidden = false;

  const img = new Image();
  img.onload = async () => {
    const width = newWidth.value ? parseInt(newWidth.value) : img.width;
    const height = newHeight.value ? parseInt(newHeight.value) : img.height;
    const format = formatSelect.value;
    const targetKB = customSize.value ? parseInt(customSize.value) : parseInt(presetSize.value);
    const targetBytes = targetKB * 1024;
    const minBytes = targetBytes - 3 * 1024; // Allow 3KB margin below the target size

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Apply enhancement function
    applyEnhancement(ctx, width, height);

    let blob = await compressCanvas(canvas, format, targetBytes, minBytes);
    const url = URL.createObjectURL(blob);

    resizedImage.src = url;
    resizedPreview.hidden = false;
    previousSize.textContent = `${(originalFile.size / 1024).toFixed(2)} KB`;
    newSize.textContent = `${(blob.size / 1024).toFixed(2)} KB`;

    downloadBtn.onclick = () => {
  const a = document.createElement("a");
  const targetKB = customSize.value ? parseInt(customSize.value) : parseInt(presetSize.value);
  const formattedSize = `${targetKB}KB`; // Format the size for the filename

  // Set the download filename with target size in the name (e.g., name_200KB.jpg)
  const fileExtension = format.split("/")[1]; // Get the file extension (e.g., 'jpeg' or 'jpg')
  a.href = url;
  a.download = `${originalFile.name.split(".")[0]}_${formattedSize}.${fileExtension}`;
  a.click();
};

loadingIndicator.hidden = true;
resizeBtn.disabled = false;

async function compressCanvas(canvas, format, targetSize, minSize) {
  let quality = 0.95;
  let blob = await getBlob(canvas, format, quality);
  let attempts = 0;
  const maxBytes = targetSize;
  const minBytes = minSize;

  // Start compression loop
  while (blob.size > maxBytes && quality > 0.05 && attempts < 20) {
    quality -= 0.05; // Reduce quality if the file is too large
    blob = await getBlob(canvas, format, quality);
    attempts++;
  }

  // If the file is still too large after adjusting quality, scale down the image dimensions proportionally
  if (blob.size > maxBytes) {
    const ratio = Math.sqrt(maxBytes / blob.size); // Proportional size reduction factor
    const newWidth = Math.floor(canvas.width * ratio);
    const newHeight = Math.floor(canvas.height * ratio);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

    // Recurse to compress the scaled image
    return await compressCanvas(tempCanvas, format, targetSize, minSize);
  }

  // Ensure the final size is within the acceptable range (target size or less)
  if (blob.size > maxBytes) {
    return compressCanvas(canvas, format, targetSize, minSize); // Recursion if still too large
  }

  return blob;
}

function getBlob(canvas, type, quality = 1.0) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function applyEnhancement(ctx, width, height) {
  // Apply sharpening to the image
  const sharpenKernel = [
    [-1, -1, -1],
    [-1,  9, -1],
    [-1, -1, -1],
  ];

  // Apply the sharpen kernel to the canvas image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const widthPx = imageData.width;
  const heightPx = imageData.height;

  for (let y = 1; y < heightPx - 1; y++) {
    for (let x = 1; x < widthPx - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = (y + ky) * widthPx + (x + kx);
          const weight = sharpenKernel[ky + 1][kx + 1];
          r += data[px * 4] * weight;
          g += data[px * 4 + 1] * weight;
          b += data[px * 4 + 2] * weight;
        }
      }

      const idx = (y * widthPx + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
