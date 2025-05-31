document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const widthInput = document.getElementById('customWidth');
  const heightInput = document.getElementById('customHeight');
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
    const format = formatSelect.value.toLowerCase();
    const customWidth = parseInt(widthInput.value);
    const customHeight = parseInt(heightInput.value);

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      errorMessage.textContent = 'Please enter a valid target size in KB.';
      errorMessage.hidden = false;
      return;
    }

    errorMessage.hidden = true;
    loadingIndicator.hidden = false;
    compressedPreview.style.display = 'none';

    const results = [];

    for (const image of images) {
      try {
        const { blob, url, dimensions } = await compressImageToTarget(
          image,
          targetSizeKB * 1024,
          format,
          customWidth,
          customHeight
        );
        results.push({ blob, url, dimensions, original: image });
      } catch (err) {
        errorMessage.textContent = `Error processing ${image.name}: ${err.message}`;
        errorMessage.hidden = false;
      }
    }

    if (results.length > 0) {
      const first = results[0];
      compressedImage.src = first.url;
      compressedDetails.innerHTML = `
        <p><strong>New Size:</strong> ${(first.blob.size / 1024).toFixed(1)} KB</p>
        <p><strong>Format:</strong> ${format.toUpperCase()}</p>
        <p><strong>Dimensions:</strong> ${first.dimensions.width} × ${first.dimensions.height} px</p>
        <p><strong>Reduction:</strong> ${calculateReduction(first.original.size, first.blob.size)}%</p>
      `;
      compressedPreview.style.display = 'block';
      downloadBtn.disabled = false;

      downloadBtn.onclick = () => {
        results.forEach(({ blob, original }, idx) => {
          const a = document.createElement('a');
          const safeName = original.name.replace(/\.[^/.]+$/, '');
          a.href = URL.createObjectURL(blob);
          a.download = `compressed_${idx + 1}_${safeName}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
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

  async function compressImageToTarget(file, targetBytes, format, customWidth, customHeight) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // MIME type + quality support
    let mimeType;
    switch (format) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'avif':
        mimeType = 'image/avif';
        break;
      case 'bmp':
        mimeType = 'image/bmp';
        break;
      default:
        mimeType = 'image/jpeg';
    }
    const supportsQuality = ['image/jpeg', 'image/webp', 'image/avif'].includes(mimeType);

    // Dimensions
    let width = isNaN(customWidth) ? img.width : customWidth;
    let height = isNaN(customHeight) ? img.height : customHeight;

    const MAX_DIM = 2000;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let qualityMin = 0.3;
    let qualityMax = 0.95;
    let quality = supportsQuality ? qualityMax : 1;

    let blob = null;
    let lastGoodBlob = null;
    let lastGoodDims = { width, height };

    // Phase 1: Binary search quality
    for (let i = 0; i < 10; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve =>
        canvas.toBlob(resolve, mimeType, supportsQuality ? quality : undefined)
      );
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

    // Phase 2: shrink dimensions if still too large
    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.95);
      height = Math.round(height * 0.95);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve =>
        canvas.toBlob(resolve, mimeType, supportsQuality ? 0.85 : undefined)
      );
      if (!blob) throw new Error('Failed to compress further.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not meet target size without too much loss.');

    const url = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
