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
  
  // Create thumbnail container
  const thumbnailContainer = document.createElement('div');
  thumbnailContainer.className = 'uploader-grid';
  uploadContainer.appendChild(thumbnailContainer);

  // State
  let uploadedFiles = [];

  // Event Listeners
  uploadBox.addEventListener('click', triggerFileInput);
  imageInput.addEventListener('change', handleFileSelect);
  toggleAdvanced.addEventListener('change', toggleAdvancedSettings);
  compressBtn.addEventListener('click', compressImages);

  // Drag and Drop
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);

  // Functions
  function triggerFileInput() {
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
      imageInput.files = e.dataTransfer.files;
      processFiles(e.dataTransfer.files);
    }
  }

  function toggleAdvancedSettings() {
    advancedSettings.style.display = this.checked ? 'block' : 'none';
  }

  function processFiles(files) {
    // Reset state
    uploadedFiles = Array.from(files);
    thumbnailContainer.innerHTML = '';
    originalPreview.innerHTML = '';
    compressedPreview.style.display = 'none';
    
    // Update UI
    uploadContainer.classList.add('has-files');
    originalPreview.style.display = 'block';
    compressBtn.disabled = false;

    // Create thumbnails and original previews
    uploadedFiles.forEach((file, index) => {
      if (!file.type.match('image.*')) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        createThumbnail(file, e.target.result);
        createOriginalPreview(file, e.target.result, index);
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
        <div class="file-name">${file.name}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
      </div>
      <button class="remove-thumbnail" title="Remove image">&times;</button>
    `;
    
    // Add remove functionality
    const removeBtn = thumbnail.querySelector('.remove-thumbnail');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      thumbnail.remove();
      
      // Remove file from array
      const index = Array.from(thumbnailContainer.children).indexOf(thumbnail);
      if (index !== -1) {
        uploadedFiles.splice(index, 1);
        
        // Also remove from original preview
        const originalItem = originalPreview.children[index];
        if (originalItem) originalItem.remove();
      }
      
      // If no files left, reset uploader
      if (thumbnailContainer.children.length === 0) {
        uploadContainer.classList.remove('has-files');
        originalPreview.style.display = 'none';
        compressBtn.disabled = true;
      }
    });
    
    thumbnailContainer.appendChild(thumbnail);
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
          <p><strong>Name:</strong> ${file.name}</p>
          <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
          <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
          <p><strong>Dimensions:</strong> ${img.width} × ${img.height}px</p>
        </div>
      `;
      
      originalPreview.appendChild(wrapper);
    };
    img.src = dataUrl;
  }

  async function compressImages() {
    if (!uploadedFiles.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) {
      alert('Please enter a valid target size in KB.');
      return;
    }

    // Show loading state
    loadingIndicator.hidden = false;
    compressedPreview.innerHTML = '';
    compressBtn.disabled = true;

    try {
      // Process each image
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const result = await compressImage(file, targetSizeKB * 1024, format);
        createCompressedPreview(file, result, i);
      }
    } catch (error) {
      console.error('Compression error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      loadingIndicator.hidden = true;
      compressBtn.disabled = false;
      compressedPreview.style.display = 'block';
    }
  }

  function createCompressedPreview(originalFile, result, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';
    
    wrapper.innerHTML = `
      <div class="image-container">
        <img src="${result.url}" alt="Compressed ${index + 1}">
      </div>
      <div class="details">
        <p><strong>Name:</strong> ${originalFile.name}</p>
        <p><strong>New Size:</strong> ${formatFileSize(result.blob.size)}</p>
        <p><strong>Format:</strong> ${formatSelect.value.toUpperCase()}</p>
        <p><strong>Dimensions:</strong> ${result.dimensions.width} × ${result.dimensions.height}px</p>
        <p><strong>Reduction:</strong> ${calculateReduction(originalFile.size, result.blob.size)}%</p>
        <button class="download-btn">Download</button>
      </div>
    `;
    
    // Add download functionality
    const downloadBtn = wrapper.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
      downloadFile(result.url, originalFile.name, formatSelect.value);
    });
    
    compressedPreview.appendChild(wrapper);
  }

  async function compressImage(file, targetBytes, format) {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Initial dimensions
        const MAX_DIMENSION = 2500;
        let width = img.width;
        let height = img.height;

        // Scale down if too large
        const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        // Quality settings
        let qualityMin = 0.1;
        let qualityMax = 0.9;
        let quality = qualityMax;

        let blob = null;
        let lastGoodBlob = null;
        let lastGoodDims = { width, height };

        // Phase 1: Binary search for quality
        for (let i = 0; i < 8; i++) {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          blob = await new Promise(resolve => {
            canvas.toBlob(resolve, `image/${format}`, quality);
          });

          if (!blob) throw new Error('Compression failed');

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
          width = Math.round(width * 0.9);
          height = Math.round(height * 0.9);

          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          blob = await new Promise(resolve => {
            canvas.toBlob(resolve, `image/${format}`, 0.7);
          });

          if (!blob) throw new Error('Failed to compress further');

          if (blob.size <= targetBytes) {
            lastGoodBlob = blob;
            lastGoodDims = { width, height };
            break;
          }
        }

        if (!lastGoodBlob) {
          throw new Error('Could not meet target size without significant quality loss');
        }

        const url = URL.createObjectURL(lastGoodBlob);
        resolve({ blob: lastGoodBlob, url, dimensions: lastGoodDims });
      } catch (error) {
        reject(error);
      }
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function downloadFile(url, originalName, format) {
    const a = document.createElement('a');
    a.href = url;
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    a.download = `compressed_${baseName}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
});
