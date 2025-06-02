<!-- Include JSZip from CDN -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const zipDownloadBtn = document.getElementById('zipDownloadBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewContainer = document.getElementById('previewContainer');

  let images = [];
  let compressedFiles = [];

  imageInput.addEventListener('change', async (e) => {
    images = Array.from(e.target.files); // no limit now
    compressedFiles = [];
    compressBtn.disabled = images.length === 0;
    zipDownloadBtn.disabled = true;
    previewContainer.innerHTML = '';

    for (const [index, file] of images.entries()) {
      if (!file.type.match('image.*')) continue;
      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img, index);
        previewContainer.appendChild(preview);
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }
  });

  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      showError('Please enter a valid target size in KB');
      return;
    }

    compressBtn.disabled = true;
    zipDownloadBtn.disabled = true;
    loadingIndicator.hidden = false;
    compressedFiles = [];

    const previews = previewContainer.querySelectorAll('.preview-container');

    await Promise.all(images.map(async (file, i) => {
      const preview = previews[i];
      try {
        const { blob, url, dimensions } = await compressImageToTarget(
          file,
          targetSizeKB * 1024,
          format
        );
        updatePreviewAfterCompression(preview, file, blob, url, dimensions, format);

        compressedFiles[i] = {
          name: `compressed_${file.name.replace(/\.[^/.]+$/, '')}.${format}`,
          blob
        };
      } catch (err) {
        updatePreviewWithError(preview, err.message);
        compressedFiles[i] = null;
      }
    }));

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;

    // Enable ZIP download if at least one compressed file exists
    if (compressedFiles.some(f => f !== null)) {
      zipDownloadBtn.disabled = false;
    }
  });

  zipDownloadBtn.addEventListener('click', async () => {
    if (!compressedFiles.length) return;

    zipDownloadBtn.disabled = true;
    compressBtn.disabled = true;
    loadingIndicator.hidden = false;

    try {
      const zip = new JSZip();
      const folder = zip.folder('compressed_images');

      // Add files to zip
      for (const file of compressedFiles) {
        if (file) {
          folder.file(file.name, file.blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = 'compressed_images.zip';
      a.click();

      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      showError('Failed to generate ZIP: ' + err.message);
    }

    loadingIndicator.hidden = true;
    zipDownloadBtn.disabled = false;
    compressBtn.disabled = false;
  });

  // --- Helper functions from previous version ---

  function createPreviewElement(file, img, index) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';
    preview.dataset.index = index;

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
      const idx = parseInt(preview.dataset.index);
      images.splice(idx, 1);
      compressedFiles.splice(idx, 1);
      updatePreviewIndexes();
      compressBtn.disabled = images.length === 0;
      zipDownloadBtn.disabled = true;
    });

    return preview;
  }

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

  async function compressImageToTarget(file, targetBytes, format) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = img.width;
    let height = img.height;
    const MAX_DIM = 2000;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let qualityMin = 0.1, qualityMax = 0.9, quality = 0.7;
    let blob = null, lastGoodBlob = null, lastGoodDims = { width, height };

    for (let i = 0; i < 6; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, quality));
      if (!blob) throw new Error('Compression failed');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < targetBytes * 0.1) break;
        qualityMin = quality;
      } else {
        qualityMax = quality;
      }
      quality = (qualityMin + qualityMax) / 2;
    }

    // fallback: reduce dimension
    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.9);
      height = Math.round(height * 0.9);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 0.7));
      if (blob && blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not meet target size');
    const url = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }

  function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    previewContainer.prepend(error);
    setTimeout(() => error.remove(), 5000);
  }

  function updatePreviewIndexes() {
    const previews = document.querySelectorAll('.preview-container');
    previews.forEach((preview, index) => {
      preview.dataset.index = index;
    });
  }
});
</script>
