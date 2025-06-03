document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewContainer = document.getElementById('previewContainer');

  let images = [];

  // Handle file selection
  imageInput.addEventListener('change', async (e) => {
    images = Array.from(e.target.files).slice(0, 15); // Limit to 15 files
    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';

    for (const file of images) {
      if (!file.type.match('image.*')) continue;

      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img);
        previewContainer.appendChild(preview);
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }
  });

  // Handle compression
  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      showError('Please enter a valid target size in KB');
      return;
    }

    loadingIndicator.hidden = false;
    compressBtn.disabled = true;

    const previews = previewContainer.querySelectorAll('.preview-container');

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const preview = previews[i];
      
      try {
        const { blob, url, dimensions } = await compressImageToTarget(
          file, 
          targetSizeKB * 1024, 
          format
        );

        updatePreviewAfterCompression(
          preview,
          file,
          blob,
          url,
          dimensions,
          format
        );
      } catch (err) {
        updatePreviewWithError(preview, err.message);
      }
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  });

  // Helper functions
  function createPreviewElement(file, img) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';
    
    preview.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="Preview">
      <div class="preview-details">
        <p class="preview-filename">${file.name}</p>
        <div class="preview-stats">
          <span>${formatFileSize(file.size)}</span>
          <span>${img.width}×${img.height}px</span>
        </div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled>
          <i class="fas fa-download"></i> Download
        </button>
        <button class="remove-btn">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    `;

    // Add remove functionality
    preview.querySelector('.remove-btn').addEventListener('click', () => {
      preview.remove();
      images = images.filter((_, index) => index !== Array.from(previews).indexOf(preview));
      if (images.length === 0) compressBtn.disabled = true;
    });

    return preview;
  }

  function updatePreviewAfterCompression(preview, originalFile, compressedBlob, url, dimensions, format) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');
    
    // Update preview image
    preview.querySelector('img').src = url;
    
    // Update stats
    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → ${formatFileSize(compressedBlob.size)}</span>
      <span>${calculateReduction(originalFile.size, compressedBlob.size)}% smaller</span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;
    
    // Enable download button
    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, '')}.${format}`;
      a.click();
    };
  }

  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    statsContainer.innerHTML = `<span style="color: var(--error-color)">Error: ${errorMessage}</span>`;
  }

  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function compressImageToTarget(file, targetBytes, format = 'webp') {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = img.width;
  let height = img.height;

  // Optional cap
  const MAX_DIM = 2000;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  let bestBlob = null;
  let bestQuality = 1.0;
  let qualityMin = 0.6, qualityMax = 1.0;
  const maxIterations = 10;

  // Try at highest quality first
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  let initialBlob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 1.0));

  if (!initialBlob) throw new Error('Compression failed');
  if (initialBlob.size <= targetBytes) {
    bestBlob = initialBlob;
  }

  // If too large, apply binary search
  if (!bestBlob) {
    for (let i = 0; i < maxIterations; i++) {
      let q = (qualityMin + qualityMax) / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, q));
      if (!blob) throw new Error('Compression failed');

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = q;
        if (targetBytes - blob.size < targetBytes * 0.05) break;
        qualityMin = q;
      } else {
        qualityMax = q;
      }
    }
  }

  // Fallback: shrink dimensions, but keep quality high
  while (!bestBlob && width > 100 && height > 100) {
    width = Math.round(width * 0.9);
    height = Math.round(height * 0.9);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 0.9));
    if (blob && blob.size <= targetBytes) {
      bestBlob = blob;
      break;
    }
  }

  if (!bestBlob) throw new Error('Could not meet target size');

  return {
    blob: bestBlob,
    url: URL.createObjectURL(bestBlob),
    dimensions: { width, height },
    qualityUsed: bestQuality.toFixed(2)
  };
}

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }

  function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    previewContainer.prepend(error);
    setTimeout(() => error.remove(), 5000);
  }
});
