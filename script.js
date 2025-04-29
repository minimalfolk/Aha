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
    const targetBytes = targetKB * 1024; // Target size in bytes
    const minBytes = targetBytes - 3 * 1024; // Allow a little margin (3KB less)

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    applyEnhancement(ctx, width, height); // Optional enhancement step

    // Compress the image to the target size with lossy quality
    let blob = await compressCanvas(canvas, format, targetKB, minBytes);
    const url = URL.createObjectURL(blob);

    resizedImage.src = url;
    resizedPreview.hidden = false;
    previousSize.textContent = `${(originalFile.size / 1024).toFixed(2)} KB`;
    newSize.textContent = `${(blob.size / 1024).toFixed(2)} KB`;

    downloadBtn.onclick = () => {
      const a = document.createElement("a");
      const fileExtension = format.split("/")[1];
      const cleanName = originalFile.name.replace(/\.(svg|xml|jpg|jpeg|png|webp)+/gi, '');
      const formattedSize = `${targetKB}KB`;
      a.href = url;
      a.download = `${cleanName}_${formattedSize}.${fileExtension}`;
      a.click();
    };

    loadingIndicator.hidden = true;
    resizeBtn.disabled = false;
  };

  const reader = new FileReader();
  reader.onload = (e) => (img.src = e.target.result);
  reader.readAsDataURL(originalFile);
});

async function compressCanvas(canvas, format, targetSize, minSize) {
  const bufferKB = 2; // Buffer size in KB (2KB less than target)
  let targetBytes = (targetSize - bufferKB) * 1024;
  let minBytes = (minSize - bufferKB) * 1024;
  
  let quality = 0.95;
  let blob = await getBlob(canvas, format, quality);
  let attempts = 0;

  const maxBytes = targetBytes;

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

  // Ensure the final size is within the acceptable range (target size - buffer)
  if (blob.size > maxBytes) {
    return compressCanvas(canvas, format, targetSize, minSize); // Recursion if still too large
  }

  return blob;
}

function applyEnhancement(ctx, width, height) {
  // Apply contrast and saturation adjustment
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Contrast and Saturation Enhancements
  for (let i = 0; i < data.length; i += 4) {
    // Get current RGB values
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Increase contrast (simple contrast formula: newValue = (value - 128) * factor + 128)
    const contrastFactor = 1.2;  // Increase or decrease for more/less contrast
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Increase saturation (simple saturation formula: value = value * factor)
    const saturationFactor = 1.1;  // Increase or decrease for more/less saturation
    r = Math.min(255, Math.max(0, r * saturationFactor));
    g = Math.min(255, Math.max(0, g * saturationFactor));
    b = Math.min(255, Math.max(0, b * saturationFactor));

    // Apply the modified values to the image data
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // Apply the imageData back to the canvas
  ctx.putImageData(imageData, 0, 0);

  // Apply mild sharpening with a basic convolution filter
  const sharpenKernel = [
    [0, -0.25, 0],
    [-0.25, 2, -0.25],
    [0, -0.25, 0],
  ];

  const sharpenedImageData = ctx.getImageData(0, 0, width, height);
  const sharpenedData = sharpenedImageData.data;
  const widthPx = sharpenedImageData.width;
  const heightPx = sharpenedImageData.height;

  for (let y = 1; y < heightPx - 1; y++) {
    for (let x = 1; x < widthPx - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = (y + ky) * widthPx + (x + kx);
          const weight = sharpenKernel[ky + 1][kx + 1];
          r += sharpenedData[px * 4] * weight;
          g += sharpenedData[px * 4 + 1] * weight;
          b += sharpenedData[px * 4 + 2] * weight;
        }
      }

      const idx = (y * widthPx + x) * 4;
      sharpenedData[idx] = Math.min(255, Math.max(0, r));
      sharpenedData[idx + 1] = Math.min(255, Math.max(0, g));
      sharpenedData[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }

  ctx.putImageData(sharpenedImageData, 0, 0);
}
