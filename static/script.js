document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const filesInput = document.getElementById('files');
  const compressBtn = document.querySelector('.compressbtn');
  const targetSizeInput = document.getElementById('kbid');
  const previewContainer = document.getElementById('previewContainer');
  const uploadLabel = document.querySelector('.imagelabel');
  
  // State
  let selectedFiles = [];
  let isProcessing = false;

  // Event Listeners
  filesInput.addEventListener('change', handleFileSelection);
  compressBtn.addEventListener('click', handleCompression);
  
  // Drag and Drop
  uploadLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadLabel.classList.add('dragover');
  });
  
  uploadLabel.addEventListener('dragleave', () => {
    uploadLabel.classList.remove('dragover');
  });
  
  uploadLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadLabel.classList.remove('dragover');
    filesInput.files = e.dataTransfer.files;
    handleFileSelection({ target: filesInput });
  });

  // Main Functions
  async function handleFileSelection(e) {
    selectedFiles = Array.from(e.target.files);
    previewContainer.innerHTML = '';
    
    if (selectedFiles.length === 0) return;
    
    // Update UI
    const noTextElements = document.querySelectorAll('.notext');
    noTextElements.forEach(el => {
      el.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`;
    });
    
    // Create previews
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        createErrorPreview(file, 'Not an image file');
        continue;
      }
      
      try {
        const preview = await createImagePreview(file);
        previewContainer.appendChild(preview);
      } catch (error) {
        createErrorPreview(file, 'Failed to load image');
      }
    }
  }

  async function handleCompression() {
    if (isProcessing) return;
    if (selectedFiles.length === 0) {
      alert('Please select at least one image');
      return;
    }
    
    const targetSizeKB = parseInt(targetSizeInput.value);
    if (isNaN(targetSizeKB) {
      alert('Please enter a valid target size');
      return;
    }
    
    isProcessing = true;
    compressBtn.disabled = true;
    compressBtn.textContent = 'Compressing...';
    
    try {
      const previews = Array.from(previewContainer.children);
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const preview = previews[i];
        
        if (preview.classList.contains('error')) continue;
        
        try {
          const result = await compressImage(file, targetSizeKB * 1024);
          updatePreviewWithResult(preview, file, result);
        } catch (error) {
          updatePreviewWithError(preview, 'Compression failed');
        }
      }
    } finally {
      isProcessing = false;
      compressBtn.disabled = false;
      compressBtn.textContent = 'Compress Now';
    }
  }

  // Image Processing
  async function compressImage(file, targetBytes) {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions (limit to 4000px max dimension)
        let width = img.width;
        let height = img.height;
        const maxDimension = 4000;
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Binary search for optimal quality
        let quality = 0.9;
        let minQuality = 0.1;
        let maxQuality = 1.0;
        let blob = null;
        let iterations = 0;
        const maxIterations = 10;
        
        while (iterations < maxIterations) {
          blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
          
          if (blob.size <= targetBytes) {
            minQuality = quality;
            if ((targetBytes - blob.size) < targetBytes * 0.1) break;
          } else {
            maxQuality = quality;
          }
          
          quality = (minQuality + maxQuality) / 2;
          iterations++;
        }
        
        // If still too large, reduce dimensions
        if (blob.size > targetBytes) {
          let reductionFactor = 0.9;
          while (blob.size > targetBytes && width > 100 && height > 100) {
            width = Math.round(width * reductionFactor);
            height = Math.round(height * reductionFactor);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
          }
        }
        
        if (blob.size > targetBytes) {
          throw new Error('Could not meet target size');
        }
        
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          dimensions: { width, height },
          originalSize: file.size
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Preview Functions
  async function createImagePreview(file) {
    const preview = document.createElement('div');
    preview.className = 'preview-item';
    
    const img = await loadImage(file);
    const url = URL.createObjectURL(file);
    
    preview.innerHTML = `
      <div class="preview-image-container">
        <img src="${url}" alt="Preview">
      </div>
      <div class="preview-info">
        <div class="preview-filename">${file.name}</div>
        <div class="preview-stats">
          <span>${formatFileSize(file.size)}</span>
          <span>${img.width}×${img.height}</span>
        </div>
        <div class="preview-status">Ready to compress</div>
      </div>
      <div class="preview-actions">
        <button class="download-btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download
        </button>
      </div>
    `;
    
    return preview;
  }
  
  function updatePreviewWithResult(preview, originalFile, result) {
    const downloadBtn = preview.querySelector('.download-btn');
    const statusEl = preview.querySelector('.preview-status');
    const statsEl = preview.querySelector('.preview-stats');
    
    // Update image
    preview.querySelector('img').src = result.url;
    
    // Update stats
    statsEl.innerHTML = `
      <span>${formatFileSize(originalFile.size)} → ${formatFileSize(result.blob.size)}</span>
      <span>${result.dimensions.width}×${result.dimensions.height}</span>
      <span>${calculateReduction(originalFile.size, result.blob.size)}% smaller</span>
    `;
    
    // Update status
    statusEl.textContent = 'Compression successful';
    statusEl.style.color = '#10b981';
    
    // Enable download
    downloadBtn.disabled = false;
    downloadBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = result.url;
      a.download = `compressed_${originalFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
  
  function createErrorPreview(file, message) {
    const preview = document.createElement('div');
    preview.className = 'preview-item error';
    preview.innerHTML = `
      <div class="preview-info">
        <div class="preview-filename">${file.name}</div>
        <div class="preview-status error">${message}</div>
      </div>
    `;
    return preview;
  }
  
  function updatePreviewWithError(preview, message) {
    const statusEl = preview.querySelector('.preview-status');
    statusEl.textContent = message;
    statusEl.style.color = '#ef4444';
  }

  // Utility Functions
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
