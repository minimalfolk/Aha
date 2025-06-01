document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const imageInput = document.getElementById('imageInput');
  const uploadBox = document.getElementById('uploadBox');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const toggleAdvanced = document.getElementById('toggleAdvanced');
  const advancedSettings = document.getElementById('advancedSettings');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const supportedFormats = document.querySelector('.supported-formats');

  // State
  let images = [];
  let compressedResults = [];

  // Toggle advanced options
  toggleAdvanced.addEventListener('change', () => {
    advancedSettings.style.display = toggleAdvanced.checked ? 'block' : 'none';
  });

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
      handleFileSelection();
    }
  });

  // Handle file selection
  imageInput.addEventListener('change', handleFileSelection);

  function handleFileSelection() {
    images = Array.from(imageInput.files);
    originalPreview.innerHTML = '';
    compressedPreview.innerHTML = '';
    
    if (images.length > 0) {
      compressBtn.disabled = false;
      supportedFormats.style.display = 'none';
      uploadBox.style.display = 'none';
      originalPreview.style.display = 'grid';
      
      // Display all selected images in a grid
      images.forEach((file, index) => {
        displayOriginalImage(file, index);
      });
    } else {
      compressBtn.disabled = true;
      originalPreview.style.display = 'none';
      supportedFormats.style.display = 'block';
      uploadBox.style.display = 'flex';
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
    compressBtn.disabled = true;
    compressedPreview.innerHTML = '';
    compressedPreview.style.display = 'none';

    compressedResults = [];

    try {
      // Process all images
      for (const [index, image] of images.entries()) {
        const { blob, url, dimensions } = await compressImageToTarget(
          image, 
          targetSizeKB * 1024, 
          format
        );
        
        compressedResults.push({
          blob,
          url,
          dimensions,
          original: image,
          index
        });
      }

      // Display compressed results
      compressedPreview.style.display = 'grid';
      compressedResults.forEach(result => {
        createCompressedPreview(result);
      });
    } catch (error) {
      console.error('Compression error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      loadingIndicator.hidden = true;
      compressBtn.disabled = false;
    }
  });

  // Display original image in the grid
  function displayOriginalImage(file, index) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.innerHTML = `
      <div class="image-container">
        <img id="originalImage-${index}" alt="Original preview" />
      </div>
      <div class="image-info">
        <p class="filename">${file.name}</p>
        <p class="filesize">${(file.size / 1024).toFixed(1)} KB</p>
      </div>
    `;
    originalPreview.appendChild(previewItem);

    const imgElement = previewItem.querySelector(`#originalImage-${index}`);
    const reader = new FileReader();
    reader.onload = (e) => {
      imgElement.src = e.target.result;
      
      // Get actual dimensions after load
      const img = new Image();
      img.onload = () => {
        const dimensionsInfo = previewItem.querySelector('.dimensions');
        if (!dimensionsInfo) {
          const infoDiv = previewItem.querySelector('.image-info');
          infoDiv.innerHTML += `<p class="dimensions">${img.width} × ${img.height} px</p>`;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Create compressed preview item
  function createCompressedPreview(result) {
    const { blob, url, original, index } = result;
    const reduction = calculateReduction(original.size, blob.size);

    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item compressed';
    previewItem.innerHTML = `
      <div class="image-container">
        <img src="${url}" alt="Compressed preview" />
      </div>
      <div class="image-info">
        <p class="filename">${original.name}</p>
        <p class="filesize">${(blob.size / 1024).toFixed(1)} KB (↓${reduction}%)</p>
        <p class="dimensions">${result.dimensions.width} × ${result.dimensions.height} px</p>
        <button class="download-btn" data-index="${index}">Download</button>
      </div>
    `;
    compressedPreview.appendChild(previewItem);

    // Add download handler
    previewItem.querySelector('.download-btn').addEventListener('click', () => {
      downloadCompressedImage(result);
    });
  }

  // Download single compressed image
  function downloadCompressedImage(result) {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `compressed_${result.original.name.replace(/\.[^/.]+$/, '')}.${formatSelect.value}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Image compression function
  async function compressImageToTarget(file, targetBytes, format) {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await loadImage(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Initial dimensions
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 2500;
        const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        // Quality settings for binary search
        let qualityMin = 0.1;
        let qualityMax = 0.95;
        let quality = qualityMax;

        const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
        let blob = null;
        let lastGoodBlob = null;
        let lastGoodDims = { width, height };

        // Binary search for optimal quality
        for (let i = 0; i < 10; i++) {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          blob = await new Promise(resolve => 
            canvas.toBlob(resolve, mimeType, quality)
          );

          if (!blob) throw new Error('Compression failed');

          if (blob.size <= targetBytes) {
            lastGoodBlob = blob;
            lastGoodDims = { width, height };
            qualityMin = quality;
            quality = (quality + qualityMax) / 2;
          } else {
            qualityMax = quality;
            quality = (quality + qualityMin) / 2;
          }

          // Early exit if we're close enough
          if (Math.abs(blob.size - targetBytes) < targetBytes * 0.05) break;
        }

        // If we didn't find a good blob, try reducing dimensions
        if (!lastGoodBlob) {
          for (let reduction = 0.95; reduction >= 0.5; reduction *= 0.95) {
            width = Math.round(width * reduction);
            height = Math.round(height * reduction);

            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            blob = await new Promise(resolve => 
              canvas.toBlob(resolve, mimeType, 0.7)
            );

            if (blob && blob.size <= targetBytes) {
              lastGoodBlob = blob;
              lastGoodDims = { width, height };
              break;
            }
          }
        }

        if (!lastGoodBlob) {
          throw new Error('Could not compress to target size without significant quality loss');
        }

        const url = URL.createObjectURL(lastGoodBlob);
        resolve({ blob: lastGoodBlob, url, dimensions: lastGoodDims });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper function to load image
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

  // Calculate size reduction percentage
  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
