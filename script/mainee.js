document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const uploadBox = document.getElementById('uploadBox');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const loadingText = document.getElementById('loadingText');
  const previewContainer = document.getElementById('previewContainer');
  const formatSelect = document.getElementById('formatSelect');

  // Configuration
  const MAX_PARALLEL = 3; // Maximum parallel image processing
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max file size
  const MAX_DIMENSION = 4000; // Max width/height for canvas
  const DEFAULT_TARGET_SIZE = 100; // Default target size in KB

  // State management
  let images = [];
  let previewMap = new Map(); // Maps file to its preview DOM
  let processingCount = 0;

  // Event Listeners
  imageInput.addEventListener('change', handleFileInput);
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);
  compressBtn.addEventListener('click', startCompression);

  // Main Functions
  async function handleFileInput(e) {
    cleanup(); // Clear previous files
    
    images = Array.from(e.target.files)
      .filter(f => f.type.startsWith('image/'))
      .filter(f => f.size <= MAX_FILE_SIZE)
      .slice(0, 20);

    if (e.target.files.length !== images.length) {
      alert('Some files were removed (non-images, too large, or exceeded 20 file limit)');
    }

    compressBtn.disabled = images.length === 0;
    updateProgress(0, images.length);

    // Process images in batches to prevent UI freeze
    for (let i = 0; i < images.length; i += MAX_PARALLEL) {
      const batch = images.slice(i, i + MAX_PARALLEL);
      await Promise.all(batch.map(processPreview));
      updateProgress(Math.min(i + MAX_PARALLEL, images.length), images.length);
    }
  }

  async function processPreview(file) {
    try {
      const img = await loadImage(file);
      const preview = createPreviewElement(file, img);
      previewContainer.appendChild(preview);
      previewMap.set(file, preview);
    } catch (err) {
      console.error('Error loading image:', err);
      createErrorPreview(file, err.message);
    }
  }

  function createErrorPreview(file, errorMessage) {
    const preview = document.createElement('div');
    preview.className = 'preview-container error';
    preview.innerHTML = `
      <div class="preview-details">
        <p class="preview-filename">${file.name}</p>
        <div class="preview-stats">
          <span style="color: red">Error: ${errorMessage}</span>
        </div>
      </div>
    `;
    previewContainer.appendChild(preview);
  }

  function createPreviewElement(file, img) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';

    const objectUrl = URL.createObjectURL(file);

    preview.innerHTML = `
      <img src="${objectUrl}" alt="Preview" loading="lazy">
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

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      URL.revokeObjectURL(objectUrl);
      preview.remove();
      images = images.filter(i => i !== file);
      previewMap.delete(file);
      compressBtn.disabled = images.length === 0;
    });

    return preview;
  }

  async function startCompression() {
    const targetSizeKB = parseInt(targetSizeInput.value) || DEFAULT_TARGET_SIZE;
    if (targetSizeKB <= 0) {
      alert('Please enter a valid target size in KB');
      return;
    }

    const outputFormat = formatSelect.value;
    loadingIndicator.hidden = false;
    loadingText.textContent = 'Processing images...';
    compressBtn.disabled = true;

    updateProgress(0, images.length);

    // Process images in parallel batches
    for (let i = 0; i < images.length; i += MAX_PARALLEL) {
      const batch = images.slice(i, i + MAX_PARALLEL);
      await Promise.all(batch.map(file => processImage(file, targetSizeKB * 1024, outputFormat)));
      updateProgress(i + batch.length, images.length);
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  }

  async function processImage(file, targetBytes, outputFormat) {
    const preview = previewMap.get(file);
    if (!preview) return;

    try {
      processingCount++;
      const { blob, url, dimensions } = await compressImageToTarget(file, targetBytes, outputFormat);
      updatePreviewAfterCompression(preview, file, blob, url, dimensions, outputFormat);
    } catch (err) {
      updatePreviewWithError(preview, err.message);
    } finally {
      processingCount--;
    }
  }

  function updatePreviewAfterCompression(preview, originalFile, blob, url, dimensions, outputFormat) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');

    // Revoke previous object URL if exists
    const prevImg = preview.querySelector('img');
    if (prevImg.src.startsWith('blob:')) {
      URL.revokeObjectURL(prevImg.src);
    }
    prevImg.src = url;

    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → <strong>${formatFileSize(blob.size)}</strong></span>
      <span style="color: ${blob.size < originalFile.size ? 'green' : 'red'}">
        ${calculateReduction(originalFile.size, blob.size)}% ${blob.size < originalFile.size ? 'smaller' : 'larger'}
      </span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;

    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
      a.click();
    };
  }

  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    statsContainer.innerHTML = `<span style="color: red">Error: ${errorMessage}</span>`;
  }

  // Drag and Drop Handlers
  function handleDragOver(e) {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  }

  function handleDragLeave() {
    uploadBox.classList.remove('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    imageInput.files = e.dataTransfer.files;
    imageInput.dispatchEvent(new Event('change'));
  }

  // Progress Tracking
  function updateProgress(processed, total) {
    if (total > 0) {
      loadingText.textContent = `Processing ${processed} of ${total} images (${Math.round((processed/total)*100)}%)`;
    }
  }

  // Cleanup Function
  function cleanup() {
    // Clean up object URLs
    previewMap.forEach((preview, file) => {
      const img = preview.querySelector('img');
      if (img && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    
    previewMap.clear();
    images = [];
    previewContainer.innerHTML = '';
  }

  // Image Processing Functions
  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  async function compressImageToTarget(file, targetBytes, outputFormat = 'jpeg') {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate scaled dimensions
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    let width = Math.round(img.width * scale);
    let height = Math.round(img.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let bestBlob = null;
    let qualityMin = 0.01, qualityMax = 1.0;
    const maxIterations = 20;
    const tolerance = 0.03; // 3% tolerance for target size

    const tryBlob = (q) => new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), `image/${outputFormat}`, q);
    });

    // Binary search for optimal quality
    for (let i = 0; i < maxIterations; i++) {
      const q = (qualityMin + qualityMax) / 2;
      const blob = await tryBlob(q);
      if (!blob) continue;

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        qualityMin = q;
        if ((targetBytes - blob.size) < targetBytes * tolerance) break;
      } else {
        qualityMax = q;
      }
    }

    // Fallback to best found if we didn't hit target
    if (!bestBlob) {
      const fallbackBlob = await tryBlob(qualityMin);
      if (!fallbackBlob) {
        throw new Error('Compression failed. Try increasing target size.');
      }
      bestBlob = fallbackBlob;
    }

    return {
      blob: bestBlob,
      url: URL.createObjectURL(bestBlob),
      dimensions: { width, height }
    };
  }

  // Utility Functions
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function calculateReduction(original, reduced) {
    return Math.round((1 - reduced / original) * 100);
  }
});
