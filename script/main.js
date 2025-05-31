document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const originalImage = document.getElementById('originalImage');
  const originalDetails = document.getElementById('originalDetails');
  const compressedPreview = document.getElementById('compressedPreview');
  const compressedImage = document.getElementById('compressedImage');
  const compressedDetails = document.getElementById('compressedDetails');
  const downloadBtn = document.getElementById('downloadBtn');

  let images = [];

  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    compressedPreview.innerHTML = '';
    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImage(images[0]);
    } else {
      compressBtn.disabled = true;
      originalPreview.style.display = 'none';
      errorMessage.hidden = true;
    }
  });

  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      errorMessage.textContent = 'Please enter a valid target size in KB.';
      errorMessage.hidden = false;
      return;
    }

    errorMessage.hidden = true;
    loadingIndicator.hidden = false;
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'grid';

    const results = [];

    for (const [index, image] of images.entries()) {
      const status = document.createElement('p');
      status.textContent = `Processing ${image.name}...`;
      compressedPreview.appendChild(status);

      try {
        const { blob, url, dimensions } = await compressImageToTarget(image, targetSizeKB * 1024, format);
        results.push({ blob, url, dimensions, original: image });

        const preview = document.createElement('div');
        preview.style.border = '1px solid #ccc';
        preview.style.padding = '8px';
        preview.style.margin = '4px';
        preview.style.textAlign = 'center';
        preview.innerHTML = `
          <img src="${url}" alt="Compressed Image" style="max-width: 150px; margin-bottom: 4px;" />
          <p><strong>${image.name}</strong></p>
          <p>${(blob.size / 1024).toFixed(1)} KB • ${dimensions.width}×${dimensions.height}px</p>
          <p>↓ ${calculateReduction(image.size, blob.size)}%</p>
        `;
        compressedPreview.appendChild(preview);
        compressedPreview.removeChild(status);
      } catch (err) {
        console.warn(`Compression failed for ${image.name}:`, err);
        errorMessage.textContent = `Error processing ${image.name}: ${err.message}`;
        errorMessage.hidden = false;
      }
    }

    if (results.length > 0) {
      downloadBtn.disabled = false;
      downloadBtn.onclick = () => {
        results.forEach(({ blob, original }, idx) => {
          const a = document.createElement('a');
          const objectURL = URL.createObjectURL(blob);
          a.href = objectURL;
          a.download = `compressed_${idx + 1}_${original.name.replace(/\.[^/.]+$/, '')}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objectURL), 2000);
        });
      };
    } else {
      downloadBtn.disabled = true;
    }

    loadingIndicator.hidden = true;
  });

  function displayOriginalImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      originalImage.src = url;
      originalDetails.innerHTML = `
        <p><strong>Name:</strong> ${file.name}</p>
        <p><strong>Type:</strong> ${file.type}</p>
        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(1)} KB</p>
        <p><strong>Dimensions:</strong> ${img.width} × ${img.height} px</p>
      `;
      originalPreview.style.display = 'block';
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    img.src = url;
  }

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

    let blob = null;
    let lastGoodBlob = null;
    let lastGoodDims = { width, height };
    const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;

    for (let i = 0; i < 12; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
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

      blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.85));
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
