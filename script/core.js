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
  const downloadBtn = document.getElementById('downloadBtn');

  let images = [];

  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    compressedPreview.innerHTML = '';
    errorMessage.hidden = true;

    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImage(images[0]);
    } else {
      compressBtn.disabled = true;
      originalPreview.style.display = 'none';
    }
  });

  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value, 10);
    const format = formatSelect.value.toLowerCase();

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      showError('Please enter a valid target size in KB.');
      return;
    }

    hideError();
    showLoading(true);
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'grid';
    const results = [];

    for (const [index, image] of images.entries()) {
      const card = createStatusCard(image.name, 'Processing...');
      compressedPreview.appendChild(card);

      try {
        const { blob, url, dimensions } = await compressImageToTarget(image, targetSizeKB * 1024, format);
        results.push({ blob, url, dimensions, original: image });
        updateCardWithPreview(card, image, blob, url, dimensions);
      } catch (err) {
        console.warn(`Compression failed for ${image.name}:`, err);
        card.querySelector('p').textContent = `❌ Failed: ${err.message}`;
      }
    }

    if (results.length > 0) {
      enableDownload(results, format);
    } else {
      downloadBtn.disabled = true;
    }

    showLoading(false);
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
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    };

    img.src = url;
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function hideError() {
    errorMessage.hidden = true;
  }

  function showLoading(isLoading) {
    loadingIndicator.hidden = !isLoading;
  }

  function createStatusCard(name, status) {
    const card = document.createElement('div');
    card.style.border = '1px solid #ccc';
    card.style.padding = '8px';
    card.style.margin = '4px';
    card.style.textAlign = 'center';
    card.innerHTML = `
      <p><strong>${name}</strong></p>
      <p>${status}</p>
    `;
    return card;
  }

  function updateCardWithPreview(card, image, blob, url, dimensions) {
    card.innerHTML = `
      <img src="${url}" alt="Compressed Image" style="max-width: 150px; margin-bottom: 4px;" />
      <p><strong>${image.name}</strong></p>
      <p>${(blob.size / 1024).toFixed(1)} KB • ${dimensions.width}×${dimensions.height}px</p>
      <p>↓ ${calculateReduction(image.size, blob.size)}%</p>
    `;
  }

  function enableDownload(results, format) {
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
        setTimeout(() => URL.revokeObjectURL(objectURL), 3000);
      });
    };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
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

    const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
    let quality = 0.92;
    let qualityMin = 0.3;
    let qualityMax = 0.95;
    let lastGoodBlob = null;
    let lastGoodDims = { width, height };

    for (let i = 0; i < 10; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (!blob) throw new Error('Compression failed.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < 1024) break;
        qualityMin = quality;
      } else {
        qualityMax = quality;
      }
      quality = (qualityMin + qualityMax) / 2;
    }

    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.9);
      height = Math.round(height * 0.9);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.85));
      if (!blob) throw new Error('Failed to compress further.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not meet target size without excessive quality loss.');
    const finalURL = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url: finalURL, dimensions: lastGoodDims };
  }
});
