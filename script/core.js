document.addEventListener("DOMContentLoaded", () => {
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const actionsContainer = document.getElementById('actionsContainer');

  let selectedFiles = [];
  let compressedResults = [];

  // Drag & Drop Upload
  uploadBox.addEventListener('dragover', e => {
    e.preventDefault();
    uploadBox.classList.add('dragging');
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragging');
  });

  uploadBox.addEventListener('drop', e => {
    e.preventDefault();
    uploadBox.classList.remove('dragging');
    handleFiles(e.dataTransfer.files);
  });

  imageInput.addEventListener('change', () => {
    handleFiles(imageInput.files);
  });

  function handleFiles(files) {
    selectedFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    originalPreview.innerHTML = '';
    compressedPreview.innerHTML = '';
    actionsContainer.hidden = true;
    downloadBtn.disabled = true;

    selectedFiles.forEach(file => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      Object.assign(img.style, {
        maxWidth: '150px',
        maxHeight: '150px',
        borderRadius: '8px',
        objectFit: 'cover',
        margin: '4px'
      });
      originalPreview.appendChild(img);
    });

    compressBtn.disabled = selectedFiles.length === 0;
  }

  compressBtn.addEventListener('click', async () => {
    if (!selectedFiles.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB < 10) {
      errorMessage.textContent = 'Please enter a valid target size (10KB minimum).';
      errorMessage.hidden = false;
      return;
    }

    errorMessage.hidden = true;
    loadingIndicator.hidden = false;
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'grid';
    compressedResults = [];

    for (const [i, file] of selectedFiles.entries()) {
      const status = document.createElement('p');
      status.textContent = `Processing ${file.name}...`;
      compressedPreview.appendChild(status);

      try {
        const { blob, url, dimensions } = await compressImageToTarget(file, targetSizeKB * 1024, format);

        const preview = document.createElement('div');
        preview.style.border = '1px solid #ccc';
        preview.style.padding = '8px';
        preview.style.margin = '4px';
        preview.style.textAlign = 'center';
        preview.innerHTML = `
          <img src="${url}" alt="Compressed Image" style="max-width: 150px; margin-bottom: 4px;" />
          <p><strong>${file.name}</strong></p>
          <p>${(blob.size / 1024).toFixed(1)} KB • ${dimensions.width}×${dimensions.height}px</p>
          <p>↓ ${calculateReduction(file.size, blob.size)}%</p>
        `;
        compressedPreview.appendChild(preview);
        compressedPreview.removeChild(status);

        compressedResults.push({ blob, name: file.name });
      } catch (err) {
        console.error('Compression error:', err);
        errorMessage.textContent = `Error processing ${file.name}: ${err.message}`;
        errorMessage.hidden = false;
      }
    }

    loadingIndicator.hidden = true;
    compressedPreview.hidden = false;
    actionsContainer.hidden = false;
    downloadBtn.disabled = compressedResults.length === 0;
  });

  downloadBtn.addEventListener('click', async () => {
    if (!compressedResults.length) return;

    const zip = new JSZip();
    const ext = formatSelect.value;

    for (let { blob, name } of compressedResults) {
      const newName = name.replace(/\.[^/.]+$/, "") + `.${ext}`;
      zip.file(newName, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "compressed_images.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image format.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageToTarget(file, targetBytes, format) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const MAX_DIMENSION = 2000;
    let width = img.width;
    let height = img.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let qualityMin = 0.3;
    let qualityMax = 0.95;
    let quality = qualityMax;
    const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;

    let lastGoodBlob = null;
    let lastGoodDims = { width, height };

    for (let i = 0; i < 12; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise(res => canvas.toBlob(res, mimeType, quality));
      if (!blob) throw new Error('Compression failed.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < 1024) break;
        qualityMin = quality;
        quality = (quality + qualityMax) / 2;
      } else {
        qualityMax = quality;
        quality = (quality + qualityMin) / 2;
      }
    }

    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.95);
      height = Math.round(height * 0.95);

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise(res => canvas.toBlob(res, mimeType, 0.85));
      if (!blob) throw new Error('Failed to compress further.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not meet target size without degrading too much.');
    const url = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
