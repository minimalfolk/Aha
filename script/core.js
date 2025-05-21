document.addEventListener("DOMContentLoaded", function () {
  // ... [all your const declarations remain unchanged]

  let originalFile, originalSize, compressedBlob, originalType;

  uploadBox.addEventListener("click", () => imageInput.click());
  uploadBox.addEventListener("dragover", (e) => e.preventDefault());
  uploadBox.addEventListener("drop", handleDrop);
  imageInput.addEventListener("change", handleFileUpload);
  compressRange.addEventListener("input", updateCompressionDisplay);
  compressBtn.addEventListener("click", compressAndRenderImage);
  downloadBtn.addEventListener("click", downloadImage);

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) processImage(file);
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) processImage(file);
  }

  function processImage(file) {
    clearUI();

    if (!file.type.startsWith("image/")) {
      showError("Please upload a valid image file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showError("Please upload an image smaller than 50MB.");
      return;
    }

    originalFile = file;
    originalSize = file.size;
    originalType = file.type;

    setAvailableFormats(originalType);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = function () {
        originalPreview.hidden = false;
        originalImage.src = e.target.result;
        originalDetails.innerHTML = `Format: ${originalType.split("/")[1].toUpperCase()}<br>
                                     Dimensions: ${img.width} x ${img.height}<br>
                                     Size: ${formatSize(originalSize)}`;
        compressBtn.disabled = false;
      };
    };
    reader.readAsDataURL(file);
  }

  function setAvailableFormats(type) {
    const format = type.split("/")[1];
    const options = [
      { label: "JPG (.jpg)", value: "jpg" },
      { label: "JPEG (.jpeg)", value: "jpeg" },
      { label: "PNG (.png)", value: "png" },
      { label: "WebP (.webp)", value: "webp" },
      { label: "GIF (.gif)", value: "gif" },
      { label: "BMP (.bmp)", value: "bmp" },
    ];

    formatSelect.innerHTML = "";
    options.forEach((opt) => {
      if (opt.value === format || (format === "jpg" && opt.value === "jpeg") || (format === "jpeg" && opt.value === "jpg")) {
        formatSelect.innerHTML += `<option value="${opt.value}" selected>${opt.label}</option>`;
      } else {
        formatSelect.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
      }
    });
  }

  function updateCompressionDisplay() {
    compressValue.textContent = `${compressRange.value}%`;
  }

  async function compressAndRenderImage() {
    if (!originalFile) {
      showError("Please upload an image first.");
      return;
    }

    loadingIndicator.hidden = false;
    compressedPreview.hidden = true;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.src = event.target.result;

      img.onload = async function () {
        const originalW = img.width;
        const originalH = img.height;
        const scalePercent = parseInt(compressRange.value);

        // Maintain dimensions scaling
        const scale = Math.min((scalePercent / 100), 0.99); // never above 99%
        const targetW = Math.round(originalW * scale);
        const targetH = Math.round(originalH * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const selectedFormat = formatSelect.value;
        const mimeType = selectedFormat === "jpg" || selectedFormat === "jpeg" ? "image/jpeg" : `image/${selectedFormat}`;

        let quality = 0.92;
        const targetSize = originalSize * scale; // target is always < original size

        let blob = await tryCompress(canvas, mimeType, quality);

        while (blob.size > targetSize && quality > 0.3) {
          quality -= 0.05;
          blob = await tryCompress(canvas, mimeType, quality);
        }

        // Guarantee smaller size than original
        if (blob.size >= originalSize) {
          quality = 0.75;
          blob = await tryCompress(canvas, mimeType, quality);
        }

        displayCompressedImage(blob, targetW, targetH, selectedFormat);
      };
    };
    reader.readAsDataURL(originalFile);
  }

  function tryCompress(canvas, mimeType, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  }

  function displayCompressedImage(blob, width, height, formatExt) {
    loadingIndicator.hidden = true;
    compressedPreview.hidden = false;

    compressedBlob = blob;
    compressedImage.src = URL.createObjectURL(blob);

    const newSize = blob.size;
    const savedSize = originalSize - newSize;

    compressedDetails.innerHTML = `
      <strong>New Size:</strong> <strong>${formatSize(newSize)}</strong><br>
      <strong>Saved Size:</strong> ${formatSize(savedSize)}<br>
      <strong>New Dimensions:</strong> ${width} x ${height}<br>
      <strong>Format:</strong> ${formatExt.toUpperCase()}
    `;

    downloadBtn.disabled = false;
  }

  function downloadImage() {
    if (!compressedBlob) {
      showError("No compressed image available.");
      return;
    }

    const ext = formatSelect.value;
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(compressedBlob);
    downloadLink.download = `compressed-image.${ext}`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  function formatSize(size) {
    return size >= 1024 * 1024
      ? (size / (1024 * 1024)).toFixed(2) + " MB"
      : (size / 1024).toFixed(2) + " KB";
  }

  function showError(message) {
    errorMessage.hidden = false;
    errorMessage.textContent = message;
  }

  function clearUI() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
    originalPreview.hidden = true;
    compressedPreview.hidden = true;
    loadingIndicator.hidden = true;
    compressBtn.disabled = true;
    downloadBtn.disabled = true;
  }
});
