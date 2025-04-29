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
const newDPI = document.getElementById("newDPI");
const presetSize = document.getElementById("presetSize");
const customSize = document.getElementById("customSize");
const formatSelect = document.getElementById("formatSelect");

let originalFile;
let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");

uploadBox.addEventListener("click", () => imageInput.click());
uploadBox.addEventListener("dragover", (e) => e.preventDefault());
uploadBox.addEventListener("drop", handleDrop);
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file && file.type.startsWith("image/")) {
    previewOriginal(file);
  }
});

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
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
    const dpi = newDPI.value ? parseInt(newDPI.value) : 72;
    const format = formatSelect.value;
    const maxSizeKB = customSize.value ? parseInt(customSize.value) : parseInt(presetSize.value);

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, width, height);

    // Add DPI (metadata simulation)
    if (format === "image/jpeg" || format === "image/png") {
      try {
        const blob = await compressCanvasToTargetSize(canvas, format, maxSizeKB * 1024);
        const url = URL.createObjectURL(blob);

        resizedImage.src = url;
        resizedPreview.hidden = false;
        previousSize.textContent = `${(originalFile.size / 1024).toFixed(2)} KB`;
        newSize.textContent = `${(blob.size / 1024).toFixed(2)} KB`;

        downloadBtn.onclick = () => {
          const a = document.createElement("a");
          a.href = url;
          a.download = `resized-${originalFile.name.split(".")[0]}.${format.split("/")[1]}`;
          a.click();
        };
      } catch (err) {
        alert("Error compressing: " + err.message);
      }
    } else {
      // Default conversion for unsupported compression types (SVG, PDF)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resizedImage.src = url;
        resizedPreview.hidden = false;

        previousSize.textContent = `${(originalFile.size / 1024).toFixed(2)} KB`;
        newSize.textContent = `${(blob.size / 1024).toFixed(2)} KB`;

        downloadBtn.onclick = () => {
          const a = document.createElement("a");
          a.href = url;
          a.download = `converted-${originalFile.name.split(".")[0]}.${format.split("/")[1]}`;
          a.click();
        };
      }, format);
    }

    loadingIndicator.hidden = true;
    resizeBtn.disabled = false;
  };

  const reader = new FileReader();
  reader.onload = (e) => (img.src = e.target.result);
  reader.readAsDataURL(originalFile);
});

async function compressCanvasToTargetSize(canvas, format, targetSize) {
  let quality = 0.95;
  let blob = await getBlob(canvas, format, quality);

  while (blob.size > targetSize && quality > 0.1) {
    quality -= 0.05;
    blob = await getBlob(canvas, format, quality);
  }

  if (blob.size > targetSize) {
    throw new Error("Could not compress below target size.");
  }

  return blob;
}

function getBlob(canvas, type, quality = 1.0) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
