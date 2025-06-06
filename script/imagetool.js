document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const preserveMetadata = document.getElementById('preserveMetadata');
  const batchDownloadBtn = document.getElementById('batchDownload');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const progressContainer = document.getElementById('progressContainer');
  const previewContainer = document.getElementById('previewContainer');
  const uploadBox = document.getElementById('uploadBox');

  // State
  let images = [];

  // Initialize
  batchDownloadBtn.disabled = true;

  // Enhanced Drag and Drop
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
    uploadBox.querySelector('.drop-message').textContent = 'Drop your images here';
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
    uploadBox.querySelector('.drop-message').textContent = 'Drag & Drop images here or click to browse';
  });

  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFileSelection(e.dataTransfer.files);
    }
  });

  // File Selection Handler
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFileSelection(e.target.files);
    }
  });

  async function handleFileSelection(files) {
    images = Array.from(files).slice(0, MAX_FILES);
    
    if (files.length > MAX_FILES) {
      showToast(`Only first ${MAX_FILES} files will be processed`, 'warning');
    }

    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';
    batchDownloadBtn.disabled = true;
    compressedFiles = [];

    // Parallel image loading with progress
    const progress = document.createElement('div');
    progress.className = 'loading-progress';
    progressContainer.innerHTML = '';
    progressContainer.appendChild(progress);

    let loaded = 0;
    const loadPromises = images.map(async (file, index) => {
      if (!file.type.match('image.*')) {
        loaded++;
        progress.textContent = `Loading ${loaded}/${images.length} (skipped non-image)`;
        return null;
      }

      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img, index);
        previewContainer.appendChild(preview);
        loaded++;
        progress.textContent = `Loading ${loaded}/${images.length}`;
        return preview;
      } catch (err) {
        console.error('Error loading image:', err);
        loaded++;
        progress.textContent = `Loading ${loaded}/${images.length} (error)`;
        return null;
      }
    });

    await Promise.all(loadPromises);
    progressContainer.innerHTML = '';
  }

  // Compression Engine
  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;
    const keepMetadata = preserveMetadata.checked;

    if (isNaN(targetSizeKB) {
      showToast('Please enter a valid target size', 'error');
      return;
    }

    if (targetSizeKB <= 0) {
      showToast('Target size must be positive', 'error');
      return;
    }

    loadingIndicator.hidden = false;
    compressBtn.disabled = true;
    batchDownloadBtn.disabled = true;
    compressedFiles = [];

    const previews = Array.from(previewContainer.querySelectorAll('.preview-container'));
    const progress = document.createElement('div');
    progress.className = 'compression-progress';
    progressContainer.innerHTML = '';
    progressContainer.appendChild(progress);

    // Process images sequentially for better performance control
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const preview = previews[i];
      
      if (!preview) continue;

      progress.textContent = `Compressing ${i+1}/${images.length}: ${file.name}`;
      
      try {
        const { blob, url, dimensions, quality } = await compressImageToTarget(
          file, 
          targetSizeKB * 1024,
          format,
          keepMetadata
        );

        compressedFiles.push({
          blob,
          url,
          originalName: file.name,
          format
        });

        updatePreviewAfterCompression(
          preview,
          file,
          blob,
          url,
          dimensions,
          quality,
          format
        );
      } catch (err) {
        updatePreviewWithError(preview, err.message);
      }
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
    progressContainer.innerHTML = '';
    
    if (compressedFiles.length > 0) {
      batchDownloadBtn.disabled = false;
      showToast(`Successfully compressed ${compressedFiles.length} images`, 'success');
    }
  });

  // Batch Download
  batchDownloadBtn.addEventListener('click', () => {
    if (compressedFiles.length === 0) return;

    // Create zip file if multiple images
    if (compressedFiles.length > 1) {
      const zip = new JSZip();
      const folder = zip.folder("compressed_images");
      
      compressedFiles.forEach(file => {
        const extension = file.format === 'jpeg' ? 'jpg' : file.format;
        const filename = `compressed_${file.originalName.replace(/\.[^/.]+$/, '')}.${extension}`;
        folder.file(filename, file.blob);
      });

      zip.generateAsync({type:"blob"}).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_images_${new Date().toISOString().slice(0,10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } else {
      // Single file download
      const file = compressedFiles[0];
      const extension = file.format === 'jpeg' ? 'jpg' : file.format;
      const a = document.createElement('a');
      a.href = file.url;
      a.download = `compressed_${file.originalName.replace(/\.[^/.]+$/, '')}.${extension}`;
      a.click();
    }
  });

  // Helper Functions
  function createPreviewElement(file, img, index) {
    const preview = document.createElement('div');
    preview.className = 'preview-container';
    preview.dataset.index = index;
    
    preview.innerHTML = `
      <div class="preview-image-container">
        <img src="${URL.createObjectURL(file)}" alt="Preview" loading="lazy">
        <div class="image-dimensions">${img.width}×${img.height}</div>
      </div>
      <div class="preview-details">
        <p class="preview-filename" title="${file.name}">${file.name}</p>
        <div class="preview-stats">
          <span class="file-size">${formatFileSize(file.size)}</span>
          <span class="status-badge pending">Pending</span>
        </div>
        <div class="preview-progress">
          <progress value="0" max="100"></progress>
        </div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled>
          <i class="fas fa-download"></i>
        </button>
        <button class="remove-btn">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    preview.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(preview.dataset.index);
      images.splice(index, 1);
      preview.remove();
      
      // Update indices
      document.querySelectorAll('.preview-container').forEach((el, i) => {
        el.dataset.index = i;
      });
      
      if (images.length === 0) {
        compressBtn.disabled = true;
        batchDownloadBtn.disabled = true;
      }
    });

    return preview;
  }

  function updatePreviewAfterCompression(preview, originalFile, compressedBlob, url, dimensions, quality, format) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statsContainer = preview.querySelector('.preview-stats');
    const progressBar = preview.querySelector('progress');
    
    // Update preview image
    const img = preview.querySelector('img');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    
    // Update stats
    statsContainer.innerHTML = `
      <span class="file-size">${formatFileSize(originalFile.size)} → <strong>${formatFileSize(compressedBlob.size)}</strong></span>
      <span class="status-badge success">${calculateReduction(originalFile.size, compressedBlob.size)}%</span>
      <span class="quality-info">Quality: ${quality}</span>
    `;
    
    // Complete progress
    progressBar.value = 100;
    
    // Enable download button
    downloadBtn.disabled = false;
    downloadBtn.onclick = (e) => {
      e.stopPropagation();
      const extension = format === 'jpeg' ? 'jpg' : format;
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, '')}.${extension}`;
      a.click();
    };
  }

  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    const progressBar = preview.querySelector('progress');
    
    statsContainer.innerHTML = `
      <span class="status-badge error">Failed</span>
      <span class="error-message">${errorMessage}</span>
    `;
    
    progressBar.value = 0;
    progressBar.classList.add('error');
  }

  async function compressImageToTarget(file, targetBytes, format = 'webp', keepMetadata = false) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Preserve EXIF orientation if needed
    let orientation = 1;
    if (keepMetadata) {
      try {
        const exif = await readExif(file);
        orientation = exif && exif.Orientation ? exif.Orientation : 1;
      } catch (e) {
        console.warn('Failed to read EXIF data', e);
      }
    }

    // Apply orientation
    let width = img.width;
    let height = img.height;
    if (orientation > 4) [width, height] = [height, width];

    // Scale down very large images initially for better performance
    const MAX_INITIAL_DIM = 4000;
    const initialScale = Math.min(1, MAX_INITIAL_DIM / Math.max(width, height));
    width = Math.round(width * initialScale);
    height = Math.round(height * initialScale);

    // Set up canvas with correct orientation
    canvas.width = width;
    canvas.height = height;
    
    // Apply orientation transform
    applyOrientation(ctx, width, height, orientation);
    ctx.drawImage(img, 0, 0, width, height);

    // Compression algorithm
    let bestBlob = null;
    let bestQuality = 0.9; // Start slightly lower than max for better compression
    let bestDimensions = { width, height };
    const maxIterations = 8; // Reduced for better performance

    // First pass - adjust quality only
    let qualityMin = 0.1;
    let qualityMax = 0.9;
    
    for (let i = 0; i < maxIterations; i++) {
      const quality = (qualityMin + qualityMax) / 2;
      const blob = await canvasToBlob(canvas, format, quality);
      
      if (!blob) continue;
      
      if (blob.size <= targetBytes) {
        bestBlob = blob;
        bestQuality = quality;
        qualityMin = quality; // Try for better quality
      } else {
        qualityMax = quality;
      }
      
      // Early exit if we're close enough
      if (bestBlob && (targetBytes - bestBlob.size) < targetBytes * 0.1) break;
    }

    // Second pass - adjust dimensions if needed
    if (!bestBlob) {
      let currentWidth = width;
      let currentHeight = height;
      const minDimension = 200;
      const quality = 0.7; // Fixed decent quality
      
      while (!bestBlob && currentWidth > minDimension && currentHeight > minDimension) {
        currentWidth = Math.round(currentWidth * 0.9);
        currentHeight = Math.round(currentHeight * 0.9);
        
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        applyOrientation(ctx, currentWidth, currentHeight, orientation);
        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        
        const blob = await canvasToBlob(canvas, format, quality);
        if (blob && blob.size <= targetBytes) {
          bestBlob = blob;
          bestDimensions = { width: currentWidth, height: currentHeight };
          bestQuality = quality;
        }
      }
    }

    if (!bestBlob) {
      // Final fallback - use lowest quality
      canvas.width = width;
      canvas.height = height;
      applyOrientation(ctx, width, height, orientation);
      ctx.drawImage(img, 0, 0, width, height);
      bestBlob = await canvasToBlob(canvas, format, 0.1);
      if (!bestBlob) throw new Error('Compression failed completely');
    }

    return {
      blob: bestBlob,
      url: URL.createObjectURL(bestBlob),
      dimensions: bestDimensions,
      quality: Math.round(bestQuality * 100)
    };
  }

  // Utility Functions
  function canvasToBlob(canvas, format, quality) {
    return new Promise(resolve => {
      if (format === 'png') {
        canvas.toBlob(resolve, 'image/png');
      } else if (format === 'jpeg') {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      } else {
        // Default to webp
        canvas.toBlob(resolve, 'image/webp', quality);
      }
    });
  }

  function applyOrientation(ctx, width, height, orientation) {
    ctx.clearRect(0, 0, width, height);
    
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, height, width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
      default: ctx.transform(1, 0, 0, 1, 0, 0);
    }
  }

  async function readExif(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const view = new DataView(e.target.result);
          if (view.getUint16(0, false) !== 0xFFD8) return resolve(null);
          
          let offset = 2;
          let length = view.byteLength;
          let marker, exifData;
          
          while (offset < length) {
            marker = view.getUint16(offset, false);
            offset += 2;
            
            if (marker === 0xFFE1) {
              if (view.getUint32(offset += 2, false) !== 0x45786966) continue;
              
              const little = view.getUint16(offset += 6, false) === 0x4949;
              offset += view.getUint32(offset + 4, little);
              const tags = view.getUint16(offset, little);
              offset += 2;
              
              for (let i = 0; i < tags; i++) {
                if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                  exifData = view.getUint16(offset + (i * 12) + 8, little);
                  break;
                }
              }
            } else if ((marker & 0xFF00) !== 0xFF00) {
              break;
            } else {
              offset += view.getUint16(offset, false);
            }
          }
          
          resolve(exifData ? { Orientation: exifData } : null);
        } catch (e) {
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
});
