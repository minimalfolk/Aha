// Optimized and fixed image compression script

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const uploadBox = document.getElementById('uploadBox');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewContainer = document.getElementById('previewContainer');

  let images = [];
  let previewMap = new Map(); // Maps file to its preview DOM

  imageInput.addEventListener('change', async (e) => {
    images = Array.from(e.target.files).filter(f => f.type.startsWith('image/')).slice(0, 20);
    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';
    previewMap.clear();

    for (const file of images) {
      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img);
        previewContainer.appendChild(preview);
        previewMap.set(file, preview);
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }
  });

  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });

  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));

  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    imageInput.files = e.dataTransfer.files;
    imageInput.dispatchEvent(new Event('change'));
  });

  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    if (isNaN(targetSizeKB) || targetSizeKB <= 0) return alert('Enter valid target size in KB');

    loadingIndicator.hidden = false;
    compressBtn.disabled = true;

    for (const file of images) {
      const preview = previewMap.get(file);
      try {
        const { blob, url, dimensions } = await compressImageToTarget(file, targetSizeKB * 1024, 'jpeg');
        updatePreviewAfterCompression(preview, file, blob, url, dimensions);
      } catch (err) {
        updatePreviewWithError(preview, err.message);
      }
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  });

  function createPreviewElement(file, img) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';

    const objectUrl = URL.createObjectURL(file);

    preview.innerHTML = `
      <img src="${objectUrl}" alt="Preview">
      <div class="preview-details">
        <p class="preview-filename">${file.name}</p>
        <div class="preview-stats">
          <span>${formatFileSize(file.size)}</span>
          <span>${img.width}×${img.height}px</span>
        </div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled><i class="fas fa-download"></i> Download</button>
        <button class="remove-btn"><i class="fas fa-trash"></i> Remove</button>
      </div>
    `;

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      URL.revokeObjectURL(objectUrl);
      preview.remove();
      images = images.filter(i => i !== file);
      previewMap.delete(file);
      if (images.length === 0) compressBtn.disabled = true;
    });

    return preview;
  }

  function updatePreviewAfterCompression(preview, originalFile, blob, url, dimensions) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');

    preview.querySelector('img').src = url;
    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → ${formatFileSize(blob.size)}</span>
      <span>${calculateReduction(originalFile.size, blob.size)}% smaller</span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;

    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, '.jpg')}`;
      a.click();
    };
  }

  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    statsContainer.innerHTML = `<span style="color: red">Error: ${errorMessage}</span>`;
  }

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

    let width = img.width;
    let height = img.height;
    const MAX_DIM = 4000;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let bestBlob = null;
    let qualityMin = 0.01, qualityMax = 1.0;
    const maxIterations = 20;

    const tryBlob = (q) => new Promise(res => canvas.toBlob(res, `image/${outputFormat}`, q));

    for (let i = 0; i < maxIterations; i++) {
      const q = (qualityMin + qualityMax) / 2;
      const blob = await tryBlob(q);
      if (!blob) continue;

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        qualityMin = q;
        if (targetBytes - blob.size < targetBytes * 0.03) break;
      } else {
        qualityMax = q;
      }
    }

    if (!bestBlob) throw new Error('Cannot compress below target size. Try increasing target size.');

    return {
      blob: bestBlob,
      url: URL.createObjectURL(bestBlob),
      dimensions: { width, height }
    };
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function calculateReduction(original, reduced) {
    return Math.round((1 - reduced / original) * 100);
  }
});
