document.addEventListener('DOMContentLoaded', () => {
  const MAX_FILES = 25;
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const uploadBox = document.getElementById('uploadBox');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewContainer = document.getElementById('previewContainer');
  const fileCounter = document.getElementById('fileCounter');
  const downloadAllBtn = document.createElement('button'); // Create download all button

  let images = [];

  // Configure download all button
  downloadAllBtn.id = 'downloadAllBtn';
  downloadAllBtn.className = 'download-all-btn';
  downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download All';
  downloadAllBtn.disabled = true;
  downloadAllBtn.style.display = 'none';
  previewContainer.parentNode.insertBefore(downloadAllBtn, previewContainer);

  // Handle file selection with 25 file limit
  imageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files).slice(0, MAX_FILES);
    images = files;
    updateFileCounter();
    updateDownloadAllButton();
    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';
    
    await Promise.all(files.map(async (file) => {
      if (!file.type.startsWith('image/')) {
        createPreviewElement(file, null, 'Unsupported file type');
        return;
      }

      try {
        const img = await loadImage(file);
        createPreviewElement(file, img);
      } catch (err) {
        createPreviewElement(file, null, 'Failed to load image');
      }
    }));
  });

  // Update file counter display
  function updateFileCounter() {
    fileCounter.textContent = `${images.length}/${MAX_FILES} files`;
    fileCounter.style.display = images.length > 0 ? 'block' : 'none';
  }

  // Update download all button visibility and state
  function updateDownloadAllButton() {
    const hasCompressedImages = Array.from(previewContainer.children).some(
      preview => preview.querySelector('.download-btn:not([disabled])'
    );
    
    downloadAllBtn.style.display = images.length >= 2 ? 'block' : 'none';
    downloadAllBtn.disabled = !hasCompressedImages;
  }

  // Handle download all functionality
  downloadAllBtn.addEventListener('click', async () => {
    if (downloadAllBtn.disabled) return;
    
    // Create a temporary zip file containing all compressed images
    try {
      downloadAllBtn.disabled = true;
      downloadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
      
      const zip = new JSZip();
      const imgFolder = zip.folder("compressed_images");
      let addedFiles = 0;

      // Add all compressed images to the zip
      Array.from(previewContainer.children).forEach(preview => {
        const downloadBtn = preview.querySelector('.download-btn:not([disabled])');
        if (downloadBtn) {
          const imgUrl = downloadBtn.dataset.downloadUrl || 
                        preview.querySelector('img').src;
          const filename = downloadBtn.dataset.filename || 
                          `compressed_${preview.dataset.filename.replace(/\.[^.]+$/, '.jpg')}`;
          
          // Fetch the image and add to zip
          fetch(imgUrl)
            .then(res => res.blob())
            .then(blob => {
              imgFolder.file(filename, blob);
              addedFiles++;
              if (addedFiles === images.length) {
                generateZip(zip);
              }
            })
            .catch(err => {
              console.error('Error adding file to zip:', err);
              addedFiles++;
              if (addedFiles === images.length) {
                generateZip(zip);
              }
            });
        } else {
          addedFiles++;
        }
      });
    } catch (err) {
      console.error('Error creating zip file:', err);
      downloadAllBtn.disabled = false;
      downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download All';
      alert('Error preparing download. Please try again.');
    }
  });

  // Generate and trigger zip download
  function generateZip(zip) {
    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed_images.zip';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      downloadAllBtn.disabled = false;
      downloadAllBtn.innerHTML = '<i class="fas fa-download"></i> Download All';
    });
  }

  // [Previous drag and drop handlers remain the same...]

  // Handle parallel compression
  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      alert('Please enter a valid target size in KB');
      return;
    }

    loadingIndicator.hidden = false;
    compressBtn.disabled = true;
    downloadAllBtn.disabled = true;
    const targetBytes = targetSizeKB * 1024;

    // Process all images in parallel with progress
    const compressionPromises = images.map(async (file, index) => {
      const preview = previewContainer.children[index];
      if (!preview || preview.dataset.error) return;

      try {
        preview.querySelector('.preview-status').textContent = 'Compressing...';
        const result = await compressImageToTarget(file, targetBytes);
        updatePreviewAfterCompression(preview, file, result);
      } catch (err) {
        console.error(`Error compressing ${file.name}:`, err);
        preview.querySelector('.preview-status').textContent = 'Error: ' + (err.message || 'Compression failed');
        preview.dataset.error = true;
      }
    });

    await Promise.all(compressionPromises);
    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
    updateDownloadAllButton();
  });

  // Improved preview element creation
  function createPreviewElement(file, img, error = null) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';
    preview.dataset.filename = file.name;
    if (error) preview.dataset.error = true;

    preview.innerHTML = `
      <div class="preview-image-container">
        ${img ? `<img src="${URL.createObjectURL(file)}" alt="Preview">` : ''}
        ${error ? `<div class="error-badge">!</div>` : ''}
      </div>
      <div class="preview-details">
        <p class="preview-filename">${file.name}</p>
        <div class="preview-stats">
          ${img ? `<span>${formatFileSize(file.size)}</span>` : ''}
          ${img ? `<span>${img.width}×${img.height}px</span>` : ''}
          ${error ? `<span class="error-text">${error}</span>` : ''}
        </div>
        <div class="preview-status"></div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled>
          <i class="fas fa-download"></i> Download
        </button>
        <button class="remove-btn">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      const index = Array.from(previewContainer.children).indexOf(preview);
      images.splice(index, 1);
      preview.remove();
      updateFileCounter();
      updateDownloadAllButton();
      if (images.length === 0) compressBtn.disabled = true;
    });

    previewContainer.appendChild(preview);
    return preview;
  }

  // Update preview after successful compression
  function updatePreviewAfterCompression(preview, originalFile, result) {
    const { blob, url, dimensions } = result;
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');

    preview.querySelector('img').src = url;
    preview.querySelector('.preview-status').textContent = 'Done!';

    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → <strong>${formatFileSize(blob.size)}</strong></span>
      <span class="reduction">${calculateReduction(originalFile.size, blob.size)}% smaller</span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;

    downloadBtn.disabled = false;
    downloadBtn.dataset.downloadUrl = url;
    downloadBtn.dataset.filename = `compressed_${originalFile.name.replace(/\.[^.]+$/, '.jpg')}`;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadBtn.dataset.filename;
      a.click();
    };

    updateDownloadAllButton();
  }
  // Improved preview element creation
  function createPreviewElement(file, img, error = null) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';
    preview.dataset.filename = file.name;
    if (error) preview.dataset.error = true;

    preview.innerHTML = `
      <div class="preview-image-container">
        ${img ? `<img src="${URL.createObjectURL(file)}" alt="Preview">` : ''}
        ${error ? `<div class="error-badge">!</div>` : ''}
      </div>
      <div class="preview-details">
        <p class="preview-filename">${file.name}</p>
        <div class="preview-stats">
          ${img ? `<span>${formatFileSize(file.size)}</span>` : ''}
          ${img ? `<span>${img.width}×${img.height}px</span>` : ''}
          ${error ? `<span class="error-text">${error}</span>` : ''}
        </div>
        <div class="preview-status"></div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled>
          <i class="fas fa-download"></i> Download
        </button>
        <button class="remove-btn">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    preview.querySelector('.remove-btn').addEventListener('click', () => {
      const index = Array.from(previewContainer.children).indexOf(preview);
      images.splice(index, 1);
      preview.remove();
      updateFileCounter();
      if (images.length === 0) compressBtn.disabled = true;
    });

    previewContainer.appendChild(preview);
    return preview;
  }

  // Update preview after successful compression
  function updatePreviewAfterCompression(preview, originalFile, result) {
    const { blob, url, dimensions } = result;
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');

    preview.querySelector('img').src = url;
    preview.querySelector('.preview-status').textContent = 'Done!';

    statsContainer.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → <strong>${formatFileSize(blob.size)}</strong></span>
      <span class="reduction">${calculateReduction(originalFile.size, blob.size)}% smaller</span>
      <span>${dimensions.width}×${dimensions.height}px</span>
    `;

    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.[^.]+$/, '.jpg')}`;
      a.click();
    };
  }

  // Improved image loading with timeout
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Image loading timed out'));
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Enhanced compression function with better error handling
  async function compressImageToTarget(file, targetBytes, outputFormat = 'jpeg') {
    let img, canvas, ctx;
    try {
      img = await loadImage(file);
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
    } catch (err) {
      throw new Error('Could not load image for compression');
    }

    // Calculate initial dimensions with max size limit
    const MAX_DIMENSION = 2500;
    let width = img.width;
    let height = img.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    // Binary search for optimal quality
    let qualityMin = 0.4;
    let qualityMax = 1.0;
    let bestBlob = null;
    let bestQuality = qualityMax;
    const maxIterations = 8;

    const getBlob = (quality) => new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), `image/${outputFormat}`, quality);
    });

    for (let i = 0; i < maxIterations; i++) {
      const quality = (qualityMin + qualityMax) / 2;
      const blob = await getBlob(quality);

      if (!blob) throw new Error('Compression failed');

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = quality;
        qualityMin = quality; // Try higher quality
      } else {
        qualityMax = quality; // Try lower quality
      }

      // Early exit if we're close enough
      if (bestBlob && Math.abs(blob.size - targetBytes) < targetBytes * 0.1) {
        break;
      }
    }

    // If still too big, progressively reduce dimensions
    let attempts = 0;
    while (!bestBlob && attempts < 5 && width > 100 && height > 100) {
      width = Math.round(width * 0.85);
      height = Math.round(height * 0.85);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await getBlob(0.7); // Try with medium quality
      if (blob && blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = 0.7;
        break;
      }
      attempts++;
    }

    if (!bestBlob) throw new Error('Could not meet target size');

    return {
      blob: bestBlob,
      url: URL.createObjectURL(bestBlob),
      dimensions: { width, height },
      quality: bestQuality
    };
  }

  // Utility functions
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
