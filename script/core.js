document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const uploadContainer = document.querySelector('.upload-container');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  const advancedSettings = document.getElementById('advancedSettings');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  // Constants
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const MAX_DIMENSION = 5000; // Max width/height for processing
  const QUALITY_PRESETS = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  // State
  let uploadedFiles = [];
  let cancelCompression = false;

  // Create thumbnail container
  const thumbnailContainer = document.createElement('div');
  thumbnailContainer.className = 'uploader-grid';
  uploadContainer.appendChild(thumbnailContainer);

  // Event Listeners
  uploadBox.addEventListener('click', triggerFileInput);
  imageInput.addEventListener('change', handleFileSelect);
  toggleAdvanced.addEventListener('change', toggleAdvancedSettings);
  compressBtn.addEventListener('click', startCompression);
  document.getElementById('cancelBtn')?.addEventListener('click', cancelProcessing);

  // Drag and Drop
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);

  // Functions
  function triggerFileInput() {
    imageInput.value = ''; // Reset to allow same file re-upload
    imageInput.click();
  }

  function handleFileSelect(e) {
    if (e.target.files.length) {
      processFiles(e.target.files);
    }
  }

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
    if (e.dataTransfer.files.length) {
      processFiles(e.dataTransfer.files);
    }
  }

  function toggleAdvancedSettings() {
    advancedSettings.style.display = this.checked ? 'block' : 'none';
  }

  function cancelProcessing() {
    cancelCompression = true;
    resetCompressionState();
  }

  function resetCompressionState() {
    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
    document.getElementById('cancelBtn').style.display = 'none';
    progressBar.style.width = '0%';
    progressText.textContent = '';
    cancelCompression = false;
  }

  async function processFiles(files) {
    // Reset state
    uploadedFiles = [];
    thumbnailContainer.innerHTML = '';
    originalPreview.innerHTML = '';
    compressedPreview.style.display = 'none';
    compressedPreview.innerHTML = '';
    
    // Filter valid image files
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.match('image.*')) {
        console.warn(`Skipped non-image file: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipped large file: ${file.name} (${formatFileSize(file.size)})`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      alert('Please select valid image files (max 25MB each)');
      return;
    }

    uploadedFiles = validFiles;
    
    // Update UI
    uploadContainer.classList.add('has-files');
    originalPreview.style.display = 'block';
    compressBtn.disabled = false;

    // Process files with progress tracking
    const processPromises = uploadedFiles.map((file, index) => 
      createThumbnailAndPreview(file, index)
    );

    await Promise.all(processPromises);
  }

  async function createThumbnailAndPreview(file, index) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        createThumbnail(file, e.target.result);
        createOriginalPreview(file, e.target.result, index);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  function createThumbnail(file, dataUrl) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'uploader-thumbnail';
    
    thumbnail.innerHTML = `
      <img src="${dataUrl}" alt="${file.name}">
      <div class="file-info">
        <div class="file-name">${truncateFileName(file.name)}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
      </div>
      <button class="remove-thumbnail" title="Remove image">&times;</button>
    `;
    
    const removeBtn = thumbnail.querySelector('.remove-thumbnail');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(thumbnail);
    });
    
    thumbnailContainer.appendChild(thumbnail);
  }

  function removeFile(thumbnailElement) {
    thumbnailElement.remove();
    
    const index = Array.from(thumbnailContainer.children).indexOf(thumbnailElement);
    if (index !== -1) {
      uploadedFiles.splice(index, 1);
      const originalItem = originalPreview.children[index];
      if (originalItem) originalItem.remove();
    }
    
    if (thumbnailContainer.children.length === 0) {
      uploadContainer.classList.remove('has-files');
      originalPreview.style.display = 'none';
      compressBtn.disabled = true;
    }
  }

  function createOriginalPreview(file, dataUrl, index) {
    const img = new Image();
    img.onload = function() {
      const wrapper = document.createElement('div');
      wrapper.className = 'preview-item';
      
      wrapper.innerHTML = `
        <div class="image-container">
          <img src="${dataUrl}" alt="Original ${index + 1}">
        </div>
        <div class="details">
          <p><strong>Name:</strong> ${truncateFileName(file.name)}</p>
          <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
          <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
          <p><strong>Dimensions:</strong> ${img.width} × ${img.height}px</p>
        </div>
      `;
      
      originalPreview.appendChild(wrapper);
    };
    img.src = dataUrl;
  }

  async function startCompression() {
    if (!uploadedFiles.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;
    const qualityPreset = document.querySelector('input[name="qualityPreset"]:checked')?.value || 'medium';

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      alert('Please enter a valid target size in KB.');
      return;
    }

    // Show loading state
    loadingIndicator.hidden = false;
    document.getElementById('cancelBtn').style.display = 'inline-block';
    compressedPreview.innerHTML = '';
    compressBtn.disabled = true;
    cancelCompression = false;

    try {
      // Process images with progress tracking
      for (let i = 0; i < uploadedFiles.length; i++) {
        if (cancelCompression) break;

        updateProgress(i, uploadedFiles.length);
        
        const file = uploadedFiles[i];
        const result = await compressImage(file, targetSizeKB * 1024, format, QUALITY_PRESETS[qualityPreset]);
        
        if (result) {
          createCompressedPreview(file, result, i);
        }
      }
    } catch (error) {
      console.error('Compression error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      resetCompressionState();
      compressedPreview.style.display = 'block';
    }
  }

  function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `Processing ${current + 1} of ${total} (${percent}%)`;
  }

  async function compressImage(file, targetBytes, format, initialQuality) {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate initial dimensions with aspect ratio
        let { width, height } = calculateInitialDimensions(img, MAX_DIMENSION);

        // Quality settings with initial preset
        let qualityMin = 0.1;
        let qualityMax = initialQuality;
        let quality = qualityMax;

        let blob = null;
        let lastGoodBlob = null;
        let lastGoodDims = { width, height };

        // Phase 1: Quality adjustment with binary search
        for (let i = 0; i < 6; i++) {
          if (cancelCompression) throw new Error('Compression cancelled');

          blob = await drawAndCompressImage(canvas, ctx, img, width, height, format, quality);
          
          if (!blob) throw new Error('Compression failed');

          if (blob.size <= targetBytes) {
            lastGoodBlob = blob;
            lastGoodDims = { width, height };
            if (targetBytes - blob.size < targetBytes * 0.1) break; // Within 10% of target
            qualityMin = quality;
            quality = (quality + qualityMax) / 2;
          } else {
            qualityMax = quality;
            quality = (quality + qualityMin) / 2;
          }
        }

        // Phase 2: Smart dimension reduction if needed
        if (!lastGoodBlob) {
          let reductionFactor = 0.9; // Start with 10% reduction
          
          while (width > 100 && height > 100 && !cancelCompression) {
            width = Math.max(100, Math.round(width * reductionFactor));
            height = Math.max(100, Math.round(height * reductionFactor));

            blob = await drawAndCompressImage(canvas, ctx, img, width, height, format, qualityMax);
            
            if (blob && blob.size <= targetBytes) {
              lastGoodBlob = blob;
              lastGoodDims = { width, height };
              break;
            }

            // Adjust reduction factor based on how far we are from target
            const oversizeRatio = blob ? blob.size / targetBytes : 2;
            reductionFactor = Math.max(0.5, Math.min(0.9, 1 - (oversizeRatio - 1) / 10));
          }
        }

        if (!lastGoodBlob) {
          throw new Error('Could not meet target size without significant quality loss');
        }

        const url = URL.createObjectURL(lastGoodBlob);
        resolve({ 
          blob: lastGoodBlob, 
          url, 
          dimensions: lastGoodDims,
          quality: quality,
          format: format
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function calculateInitialDimensions(img, maxDimension) {
    let width = img.width;
    let height = img.height;

    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    return { width, height };
  }

  async function drawAndCompressImage(canvas, ctx, img, width, height, format, quality) {
    canvas.width = width;
    canvas.height = height;
    
    // Use high-quality downscaling
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise(resolve => {
      canvas.toBlob(resolve, `image/${format}`, quality);
    });
  }

  function createCompressedPreview(originalFile, result, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';
    
    wrapper.innerHTML = `
      <div class="image-container">
        <img src="${result.url}" alt="Compressed ${index + 1}">
        <div class="quality-badge">Quality: ${Math.round(result.quality * 100)}%</div>
      </div>
      <div class="details">
        <p><strong>Name:</strong> ${truncateFileName(originalFile.name)}</p>
        <p><strong>New Size:</strong> ${formatFileSize(result.blob.size)}</p>
        <p><strong>Format:</strong> ${result.format.toUpperCase()}</p>
        <p><strong>Dimensions:</strong> ${result.dimensions.width} × ${result.dimensions.height}px</p>
        <p><strong>Reduction:</strong> ${calculateReduction(originalFile.size, result.blob.size)}%</p>
        <div class="preview-actions">
          <button class="download-btn">Download</button>
          <button class="copy-btn">Copy</button>
        </div>
      </div>
    `;
    
    // Add download functionality
    wrapper.querySelector('.download-btn').addEventListener('click', () => {
      downloadFile(result.url, originalFile.name, result.format);
    });

    // Add copy to clipboard functionality
    wrapper.querySelector('.copy-btn').addEventListener('click', async () => {
      try {
        const response = await fetch(result.url);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert('Image copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy image: ', err);
        alert('Failed to copy image to clipboard');
      }
    });
    
    compressedPreview.appendChild(wrapper);
  }

  // Utility functions
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  function downloadFile(url, originalName, format) {
    const a = document.createElement('a');
    a.href = url;
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_compressed.${format}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }

  function truncateFileName(name, maxLength = 20) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const baseName = name.substring(0, maxLength - extension.length - 4);
    return `${baseName}...${extension}`;
  }
});
