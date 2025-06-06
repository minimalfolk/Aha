document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const uploadBox = document.getElementById('uploadBox');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const formatSelect = document.getElementById('formatSelect');
  const previewContainer = document.getElementById('previewContainer');

  let images = [];

  // Handle file selection
  imageInput.addEventListener('change', async (e) => {
    images = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';

    for (const file of images) {
      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img);
        previewContainer.appendChild(preview);
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }
  });

  // Drag & Drop support
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
  });

  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    imageInput.files = e.dataTransfer.files;
    imageInput.dispatchEvent(new Event('change'));
  });

  // Compression trigger
  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const outputFormat = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      alert('Please enter a valid target size in KB');
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
          outputFormat
        );
        updatePreviewAfterCompression(preview, file, blob, url, dimensions, outputFormat);
      } catch (err) {
        updatePreviewWithError(preview, err.message);
      }
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  });

  // Preview creation
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

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      preview.remove();
      const index = Array.from(previewContainer.children).indexOf(preview);
      images.splice(index, 1);
      if (images.length === 0) compressBtn.disabled = true;
    });

    return preview;
  }

  // Compression result handler
  function updatePreviewAfterCompression(preview, originalFile, compressedBlob, url, dimensions, format) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');

    preview.querySelector('img').src = url;

    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → ${formatFileSize(compressedBlob.size)}</span>
      <span>${calculateReduction(originalFile.size, compressedBlob.size)}% smaller</span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;

    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.\w+$/, '.' + format)}`;
      a.click();
    };
  }

  // Error in compression
  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    statsContainer.innerHTML = `<span style="color: red">Error: ${errorMessage}</span>`;
  }

  // Load image utility
  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Image compression core logic
  async function compressImageToTarget(file, targetBytes, outputFormat = 'jpeg') {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = img.width;
  let height = img.height;

  const MAX_DIM = 2000;
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let bestBlob = null;
  let bestQuality = 1.0;
  let qualityMin = 0.4, qualityMax = 1.0;
  const maxIterations = 10;

  const tryWebPBlob = async (q) => {
    return new Promise((res) => canvas.toBlob(res, 'image/webp', q));
  };

  const tryFinalBlob = async (q) => {
    return new Promise((res) => canvas.toBlob(res, `image/${outputFormat}`, q));
  };

  const initialBlob = await tryWebPBlob(1.0);
  if (!initialBlob) throw new Error('Initial compression failed');
  if (initialBlob.size <= targetBytes) bestBlob = initialBlob;

  if (!bestBlob) {
    for (let i = 0; i < maxIterations; i++) {
      const q = (qualityMin + qualityMax) / 2;
      const blob = await tryWebPBlob(q);
      if (!blob) throw new Error('Binary search failed');

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

  // If still too big, resize down
  while (!bestBlob && width > 100 && height > 100) {
    width = Math.round(width * 0.9);
    height = Math.round(height * 0.9);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await tryWebPBlob(0.9);
    if (blob && blob.size <= targetBytes) {
      bestBlob = blob;
      bestQuality = 0.9;
      break;
    }
  }

  if (!bestBlob) throw new Error('Could not meet target size');

  // Convert WebP to final desired format (jpeg, png, etc.)
  const finalBlob = await new Promise((res) =>
    canvas.toBlob(res, `image/${outputFormat}`, bestQuality)
  );

  if (!finalBlob) throw new Error('Final output conversion failed');

  return {
    blob: finalBlob,
    url: URL.createObjectURL(finalBlob),
    dimensions: { width, height },
    qualityUsed: bestQuality.toFixed(2)
  };
  }

  // File size formatter
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Compression % calculator
  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
