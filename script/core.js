document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreviewContainer = document.getElementById('originalPreview');
  const compressedPreviewContainer = document.getElementById('compressedPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const imageCounter = document.getElementById('imageCounter');
  const progressBar = document.getElementById('progressBar');

  // Constants
  const MAX_IMAGES = 16;
  let images = [];

  // Event Listeners
  imageInput.addEventListener('change', (e) => {
    const newImages = Array.from(e.target.files).slice(0, MAX_IMAGES);
    
    if (newImages.length + images.length > MAX_IMAGES) {
      errorMessage.textContent = `Maximum ${MAX_IMAGES} images allowed. Only the first ${MAX_IMAGES} will be processed.`;
      errorMessage.hidden = false;
    }
    
    images = [...images, ...newImages].slice(0, MAX_IMAGES);
    updateImageCounter();
    
    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImages();
    } else {
      compressBtn.disabled = true;
      originalPreviewContainer.style.display = 'none';
      errorMessage.hidden = true;
    }
  });

  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const outputFormat = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      errorMessage.textContent = 'Please enter a valid target size in KB.';
      errorMessage.hidden = false;
      return;
    }

    // Reset UI
    errorMessage.hidden = true;
    loadingIndicator.hidden = false;
    compressedPreviewContainer.innerHTML = '';
    compressedPreviewContainer.style.display = 'grid';
    downloadBtn.disabled = true;
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    try {
      // Process all images in parallel
      const promises = images.map((image, index) => 
        processSingleImage(image, index, targetSizeKB * 1024, outputFormat)
          .then(result => {
            // Update progress
            const progress = Math.round(((index + 1) / images.length) * 100);
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;
            return result;
          });

      const results = await Promise.all(promises);
      
      // Display all compressed images
      results.forEach(result => {
        if (result.error) {
          const errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.innerHTML = `
            <p><strong>${result.image.name}</strong></p>
            <p class="error-text">${result.error}</p>
          `;
          compressedPreviewContainer.appendChild(errorElement);
        } else {
          const preview = createCompressedPreview(result);
          compressedPreviewContainer.appendChild(preview);
        }
      });

      // Enable download if we have at least one successful result
      if (results.some(r => !r.error)) {
        downloadBtn.disabled = false;
        downloadBtn.onclick = () => {
          results.filter(r => !r.error).forEach((result, idx) => {
            downloadImage(result.blob, result.image, result.format, idx + 1);
          });
        };
      }

    } catch (error) {
      console.error('Batch compression error:', error);
      errorMessage.textContent = `Error during batch processing: ${error.message}`;
      errorMessage.hidden = false;
    } finally {
      loadingIndicator.hidden = true;
    }
  });

  // Helper Functions
  function updateImageCounter() {
    imageCounter.textContent = `${images.length}/${MAX_IMAGES} images selected`;
    imageCounter.style.color = images.length === MAX_IMAGES ? '#e74c3c' : '#2ecc71';
  }

  function displayOriginalImages() {
    originalPreviewContainer.innerHTML = '';
    originalPreviewContainer.style.display = 'grid';
    
    images.forEach((image, index) => {
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      
      const img = new Image();
      const url = URL.createObjectURL(image);
      
      img.onload = () => {
        preview.innerHTML = `
          <img src="${url}" alt="Original" />
          <div class="image-info">
            <p><strong>${image.name}</strong></p>
            <p>${(image.size / 1024).toFixed(1)} KB</p>
            <p>${img.width} × ${img.height}px</p>
            <button class="remove-btn" data-index="${index}">×</button>
          </div>
        `;
        
        preview.querySelector('.remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(e.target.getAttribute('data-index'));
          images.splice(index, 1);
          displayOriginalImages();
          updateImageCounter();
          if (images.length === 0) {
            compressBtn.disabled = true;
            originalPreviewContainer.style.display = 'none';
          }
        });
        
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
      
      img.src = url;
      originalPreviewContainer.appendChild(preview);
    });
  }

  async function processSingleImage(image, index, targetBytes, outputFormat) {
    const status = document.createElement('div');
    status.className = 'processing-status';
    status.innerHTML = `
      <p>Processing <strong>${image.name}</strong> (${index + 1}/${images.length})...</p>
      <div class="spinner"></div>
    `;
    compressedPreviewContainer.appendChild(status);

    try {
      // First compress to WebP (for better compression)
      const { blob: webpBlob, dimensions } = await compressImageToTarget(image, targetBytes, 'webp');
      
      // Then convert to the user's desired format if needed
      let finalBlob = webpBlob;
      if (outputFormat !== 'webp') {
        const converted = await convertImageFormat(webpBlob, outputFormat);
        finalBlob = converted.blob;
      }

      compressedPreviewContainer.removeChild(status);
      return {
        image,
        blob: finalBlob,
        url: URL.createObjectURL(finalBlob),
        dimensions,
        format: outputFormat,
        error: null
      };
    } catch (err) {
      console.warn(`Compression failed for ${image.name}:`, err);
      compressedPreviewContainer.removeChild(status);
      return {
        image,
        error: err.message
      };
    }
  }

  function createCompressedPreview(result) {
    const preview = document.createElement('div');
    preview.className = 'image-preview compressed';
    
    if (result.error) {
      preview.innerHTML = `
        <div class="error-info">
          <p><strong>${result.image.name}</strong></p>
          <p class="error-text">${result.error}</p>
        </div>
      `;
    } else {
      preview.innerHTML = `
        <img src="${result.url}" alt="Compressed" />
        <div class="image-info">
          <p><strong>${result.image.name}</strong></p>
          <p>${(result.blob.size / 1024).toFixed(1)} KB</p>
          <p>${result.dimensions.width} × ${result.dimensions.height}px</p>
          <p class="reduction">↓ ${calculateReduction(result.image.size, result.blob.size)}%</p>
          <p class="format">${result.format.toUpperCase()}</p>
        </div>
      `;
    }
    
    return preview;
  }

  function downloadImage(blob, originalFile, format, index) {
    const a = document.createElement('a');
    const objectURL = URL.createObjectURL(blob);
    a.href = objectURL;
    a.download = `compressed_${index}_${originalFile.name.replace(/\.[^/.]+$/, '')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectURL), 2000);
  }

  async function convertImageFormat(blob, targetFormat) {
    const img = await loadImage(blob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: targetFormat === 'png' });
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    
    const mimeType = mimeTypes[targetFormat.toLowerCase()] || 'image/jpeg';
    
    return new Promise(resolve => {
      canvas.toBlob(resultBlob => {
        const url = URL.createObjectURL(resultBlob);
        resolve({ blob: resultBlob, url });
      }, mimeType, 0.92); // Use high quality for format conversion
    });
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
    const ctx = canvas.getContext('2d', { alpha: format === 'png' });

    // Resolution logic
    const MAX_DIMENSION = 1600;
    let width = img.width;
    let height = img.height;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };

    const mimeType = mimeTypes[format.toLowerCase()] || 'image/jpeg';

    let qualityMin = 0.4;
    let qualityMax = 0.95;
    let quality = qualityMax;

    let blob = null;
    let lastGoodBlob = null;
    let lastGoodDims = { width, height };

    for (let i = 0; i < 10; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // Image enhancement filters
      ctx.filter = 'contrast(1.05) brightness(1.03)';
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (!blob) throw new Error('Compression failed.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < 512) break;
        qualityMin = quality;
        quality = (quality + qualityMax) / 2;
      } else {
        qualityMax = quality;
        quality = (quality + qualityMin) / 2;
      }
    }

    // Fallback: slight dimension reduction if no match
    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.95);
      height = Math.round(height * 0.95);

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.filter = 'contrast(1.05) brightness(1.03)';
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.85));
      if (!blob) throw new Error('Fallback compression failed.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not reach target without major degradation.');

    return { blob: lastGoodBlob, dimensions: lastGoodDims };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
