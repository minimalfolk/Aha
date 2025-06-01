document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = ensureElement('errorMessage', 'div', { hidden: true, style: 'color: red; margin: 1em 0;' });
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadAllBtn = ensureElement('downloadAllBtn', 'button', { disabled: true, style: 'margin-left: 8px;' }, 'Download All');

  let images = [];
  let compressedResults = [];

  // Initialize UI
  compressBtn.disabled = true;
  downloadBtn.disabled = true;
  downloadAllBtn.disabled = true;

  // Insert downloadAllBtn after downloadBtn if not present in DOM
  if (!downloadAllBtn.parentNode) {
    downloadBtn?.parentNode?.insertBefore(downloadAllBtn, downloadBtn.nextSibling);
  }

  // Handle file selection
  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    originalPreview.innerHTML = '';
    compressedPreview.innerHTML = '';
    
    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImages(images);
      downloadBtn.disabled = true;
      downloadAllBtn.disabled = true;
    } else {
      compressBtn.disabled = true;
      downloadBtn.disabled = true;
      downloadAllBtn.disabled = true;
      originalPreview.style.display = 'none';
      errorMessage.hidden = true;
    }
  });

  // Compression handler
  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      showError('Please enter a valid target size in KB.');
      return;
    }

    startLoading();
    compressedResults = [];

    try {
      for (const image of images) {
        const { blob, url, dimensions } = await compressImageToTarget(image, targetSizeKB * 1024, format);
        compressedResults.push({ 
          blob, 
          url, 
          dimensions, 
          original: image,
          reduction: calculateReduction(image.size, blob.size)
        });
      }

      displayCompressedResults();
      downloadBtn.disabled = false;
      downloadAllBtn.disabled = false;
    } catch (err) {
      showError(`Error during compression: ${err.message}`);
    } finally {
      stopLoading();
    }
  });

  // Download all handler
  downloadAllBtn.addEventListener('click', () => {
    compressedResults.forEach((result, idx) => {
      downloadImage(result.blob, `compressed_${idx + 1}_${result.original.name}`, formatSelect.value);
    });
  });

  // Download single handler for legacy downloadBtn (downloads first compressed image)
  downloadBtn.addEventListener('click', () => {
    if (compressedResults.length) {
      const result = compressedResults[0];
      downloadImage(result.blob, `compressed_${result.original.name}`, formatSelect.value);
    }
  });

  // Helper functions
  function displayOriginalImages(files) {
    originalPreview.innerHTML = '';
    originalPreview.style.display = 'grid';
    originalPreview.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    originalPreview.style.gap = '1rem';

    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const card = document.createElement('div');
      card.className = 'image-card';
      
      const img = new Image();
      img.onload = () => {
        card.innerHTML = `
          <img src="${url}" alt="Original" class="preview-image" />
          <figcaption>
            <p><strong>${file.name}</strong></p>
            <p>${(file.size / 1024).toFixed(1)} KB</p>
            <p>${img.width} × ${img.height} px</p>
          </figcaption>
        `;
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
      img.src = url;
      
      originalPreview.appendChild(card);
    });
  }

  function displayCompressedResults() {
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'grid';
    compressedPreview.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    compressedPreview.style.gap = '1rem';

    compressedResults.forEach((result, idx) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <img src="${result.url}" alt="Compressed" class="preview-image" />
        <figcaption>
          <p><strong>${result.original.name}</strong></p>
          <p>${(result.blob.size / 1024).toFixed(1)} KB</p>
          <p>${result.dimensions.width} × ${result.dimensions.height} px</p>
          <p class="reduction">↓ ${result.reduction}%</p>
          <button class="download-btn" data-index="${idx}">Download</button>
        </figcaption>
      `;
      compressedPreview.appendChild(card);
    });

    // Add individual download handlers
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        const result = compressedResults[idx];
        downloadImage(result.blob, `compressed_${result.original.name}`, formatSelect.value);
      });
    });
  }

  function downloadImage(blob, baseName, format) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${baseName.replace(/\.[^/.]+$/, '')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // Compression logic helpers
  async function compressImageToTarget(file, targetSize, format) {
    // Load image
    const img = await loadImage(file);
    // Draw on canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Try different quality steps to get as close as possible to the target size
    let quality = 0.92;
    let lastGoodBlob = null;
    let lastGoodUrl = '';
    let lastGoodDims = { width: img.width, height: img.height };

    for (let tries = 0; tries < 7; tries++) {
      const blob = await new Promise(resolve => 
        canvas.toBlob(resolve, 'image/' + (format === 'jpg' ? 'jpeg' : format), quality)
      );
      if (!blob) break;
      if (blob.size <= targetSize || quality <= 0.4) {
        lastGoodBlob = blob;
        lastGoodUrl = URL.createObjectURL(blob);
        break;
      }
      lastGoodBlob = blob;
      lastGoodUrl = URL.createObjectURL(blob);
      quality -= 0.18;
    }
    return {
      blob: lastGoodBlob,
      url: lastGoodUrl,
      dimensions: lastGoodDims,
    };
  }

  function calculateReduction(originalSize, newSize) {
    if (!originalSize) return 0;
    return Math.round(100 - (newSize / originalSize) * 100);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(img);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // UI helpers
  function startLoading() {
    if (loadingIndicator) loadingIndicator.hidden = false;
    compressBtn.disabled = true;
    errorMessage.hidden = true;
  }
  
  function stopLoading() {
    if (loadingIndicator) loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  // Utility: ensures an element with id exists, otherwise creates and inserts it
  function ensureElement(id, tag, attrs = {}, textContent = '') {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      Object.keys(attrs).forEach(key => {
        el[key] = attrs[key];
      });
      if (textContent) el.textContent = textContent;
      // Default insertion location: after imageInput or at body end
      if (id === 'errorMessage') {
        imageInput.parentNode.insertBefore(el, imageInput.nextSibling);
      } else if (id === 'downloadAllBtn') {
        // Insert after downloadBtn if possible
        downloadBtn?.parentNode?.insertBefore(el, downloadBtn.nextSibling);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }
});
