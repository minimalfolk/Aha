document.addEventListener('DOMContentLoaded', () => {
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  const advancedSettings = document.getElementById('advancedSettings');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');

  let images = [];

  // Handle drag and drop
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
    if (e.dataTransfer.files.length) {
      imageInput.files = e.dataTransfer.files;
      handleFiles(e.dataTransfer.files);
    }
  });

  uploadBox.addEventListener('click', () => {
    imageInput.click();
  });

  // Toggle advanced settings
  toggleAdvanced.addEventListener('change', () => {
    advancedSettings.style.display = toggleAdvanced.checked ? 'block' : 'none';
  });

  // Handle file selection
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFiles(e.target.files);
    }
  });

  function handleFiles(files) {
    images = Array.from(files);
    originalPreview.innerHTML = '';
    compressedPreview.style.display = 'none';
    
    if (images.length > 0) {
      compressBtn.disabled = false;
      originalPreview.style.display = 'block';
      displayOriginalImages(images);
    } else {
      compressBtn.disabled = true;
      originalPreview.style.display = 'none';
    }
  }

  // Compress button click handler
  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) {
      alert('Please enter a valid target size in KB.');
      return;
    }

    loadingIndicator.hidden = false;
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'none';

    const results = [];

    for (const image of images) {
      try {
        const { blob, url, dimensions } = await compressImageToTarget(image, targetSizeKB * 1024, format);
        results.push({ blob, url, dimensions, original: image });
      } catch (err) {
        console.error(`Error processing ${image.name}:`, err);
        alert(`Error processing ${image.name}: ${err.message}`);
      }
    }

    if (results.length > 0) {
      compressedPreview.style.display = 'block';
      results.forEach(({ blob, url, dimensions, original }, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.innerHTML = `
          <div class="image-container">
            <img src="${url}" alt="Compressed ${idx + 1}">
          </div>
          <div class="details">
            <p><strong>Name:</strong> ${original.name}</p>
            <p><strong>New Size:</strong> ${(blob.size / 1024).toFixed(1)} KB</p>
            <p><strong>Format:</strong> ${format.toUpperCase()}</p>
            <p><strong>Dimensions:</strong> ${dimensions.width} × ${dimensions.height}px</p>
            <p><strong>Reduction:</strong> ${calculateReduction(original.size, blob.size)}%</p>
            <button class="download-btn">Download</button>
          </div>
        `;
        const downloadBtn = wrapper.querySelector('.download-btn');
        downloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = url;
          a.download = `compressed_${original.name.replace(/\.[^/.]+$/, '')}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        compressedPreview.appendChild(wrapper);
      });
    }

    loadingIndicator.hidden = true;
  });

  function displayOriginalImages(files) {
    originalPreview.innerHTML = '';
    files.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.innerHTML = `
          <div class="image-container">
            <img src="${url}" alt="Original ${index + 1}">
          </div>
          <div class="details">
            <p><strong>Name:</strong> ${file.name}</p>
            <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
            <p><strong>Size:</strong> ${(file.size / 1024).toFixed(1)} KB</p>
            <p><strong>Dimensions:</strong> ${img.width} × ${img.height}px</p>
          </div>
        `;
        originalPreview.appendChild(wrapper);
      };
      img.src = url;
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
    const ctx = canvas.getContext('2d');

    const MAX_DIMENSION = 2000;
    let width = img.width;
    let height = img.height;

    // Scale down if too large
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let qualityMin = 0.3;
    let qualityMax = 0.95;
    let quality = qualityMax;

    let blob = null;
    let lastGoodBlob = null;
    let lastGoodDims = { width, height };

    // Phase 1: Binary search for quality
    for (let i = 0; i < 12; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => {
        canvas.toBlob(resolve, `image/${format}`, quality);
      });

      if (!blob) throw new Error('Compression failed.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < 1024) break; // Close enough
        qualityMin = quality;
        quality = (quality + qualityMax) / 2;
      } else {
        qualityMax = quality;
        quality = (quality + qualityMin) / 2;
      }
    }

    // Phase 2: Reduce dimensions if needed
    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.95);
      height = Math.round(height * 0.95);

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => {
        canvas.toBlob(resolve, `image/${format}`, 0.85);
      });

      if (!blob) throw new Error('Failed to compress further.');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) {
      throw new Error('Could not meet target size without degrading too much.');
    }

    const url = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
