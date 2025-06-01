import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const imageInput = document.getElementById("imageInput");
const uploadBox = document.getElementById("uploadBox");
const originalPreview = document.getElementById("originalPreview");
const compressedPreview = document.getElementById("compressedPreview");
const compressBtn = document.getElementById("compressBtn");
const targetSizeInput = document.getElementById("targetSize");
const formatSelect = document.getElementById("formatSelect");
const loadingIndicator = document.getElementById("loadingIndicator");
const downloadBtn = document.getElementById("downloadBtn");
const actionsContainer = document.querySelector(".actions");

let selectedFiles = [];
let compressedBlobs = [];

uploadBox.addEventListener("dragover", e => {
  e.preventDefault();
  uploadBox.classList.add("dragging");
});

uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("dragging");
});

uploadBox.addEventListener("drop", e => {
  e.preventDefault();
  uploadBox.classList.remove("dragging");
  imageInput.files = e.dataTransfer.files;
  handleImageUpload({ target: { files: e.dataTransfer.files } });
});

imageInput.addEventListener("change", handleImageUpload);

function handleImageUpload(event) {
  selectedFiles = Array.from(event.target.files);
  originalPreview.innerHTML = '';
  compressedPreview.innerHTML = '';
  compressedBlobs = [];
  actionsContainer.hidden = true;
  compressedPreview.hidden = true;

  if (!selectedFiles.length) {
    compressBtn.disabled = true;
    return;
  }

  compressBtn.disabled = false;

  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "150px";
      img.style.margin = "10px";
      originalPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

compressBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;

  compressedPreview.innerHTML = '';
  compressedBlobs = [];
  compressBtn.disabled = true;
  loadingIndicator.hidden = false;
  actionsContainer.hidden = true;
  compressedPreview.hidden = true;

  const targetSizeKB = parseInt(targetSizeInput.value, 10) || 100;
  const outputFormat = formatSelect.value;

  for (let i = 0; i < selectedFiles.length; i++) {
    loadingIndicator.textContent = `Processing image ${i + 1} of ${selectedFiles.length}...`;
    const file = selectedFiles[i];
    const compressedBlob = await compressImageToTargetSize(file, targetSizeKB, outputFormat);
    compressedBlobs.push({ blob: compressedBlob, originalName: file.name });

    const imgURL = URL.createObjectURL(compressedBlob);
    const img = document.createElement("img");
    img.src = imgURL;
    img.style.maxWidth = "150px";
    img.style.margin = "10px";
    compressedPreview.appendChild(img);
  }

  loadingIndicator.hidden = true;
  compressBtn.disabled = false;
  compressedPreview.hidden = false;
  actionsContainer.hidden = false;
});

async function compressImageToTargetSize(file, targetSizeKB, format) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let quality = 0.95;
      let attempts = 0;
      const maxAttempts = 10;

      const compressStep = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
          if (!blob) return resolve(file);

          const sizeKB = blob.size / 1024;
          if (sizeKB <= targetSizeKB || attempts >= maxAttempts) {
            resolve(blob);
          } else {
            quality -= 0.05;
            width *= 0.9;
            height *= 0.9;
            attempts++;
            compressStep();
          }
        }, `image/${format}`, quality);
      };

      compressStep();
    };
    img.src = URL.createObjectURL(file);
  });
}

downloadBtn.addEventListener("click", async () => {
  if (!compressedBlobs.length) return;

  const zip = new JSZip();
  compressedBlobs.forEach(({ blob, originalName }, index) => {
    const name = originalName.replace(/\.[^/.]+$/, "") || `image-${index + 1}`;
    zip.file(`${name}.${formatSelect.value}`, blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const zipLink = document.createElement("a");
  zipLink.href = URL.createObjectURL(content);
  zipLink.download = "compressed-images.zip";
  document.body.appendChild(zipLink);
  zipLink.click();
  document.body.removeChild(zipLink);
});
