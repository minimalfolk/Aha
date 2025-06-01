document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn'); // New button

  let images = [];
  let compressedResults = [];

  // Initialize UI
  compressBtn.disabled = true;
  downloadBtn.disabled = true;
  downloadAllBtn.disabled = true;

  // Handle file selection
  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    originalPreview.innerHTML = '';
    compressedPreview.innerHTML = '';
    
    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImages(images); // Changed to show all images
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
    compressedResults = []; // Reset previous results

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

  // Keep your existing compression functions:
  // loadImage(), compressImageToTarget(), calculateReduction()
  
  // Add these UI helpers:
  function startLoading() {
    loadingIndicator.hidden = false;
    compressBtn.disabled = true;
    errorMessage.hidden = true;
  }
  
  function stopLoading() {
    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }
});
