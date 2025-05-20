document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const previewContainer = document.getElementById('preview-container');
  const downloadAllContainer = document.getElementById('download-all-container');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const compressBtn = document.getElementById('process-btn');
  const targetSizeInput = document.getElementById('target-size');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  // State
  let filesQueue = [];
  let currentIndex = 0;
  let compressedBlobs = [];
  let originalDataURLs = [];

  // Event Listeners
  uploadBox.addEventListener('click', () => imageInput.click());
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);
  imageInput.addEventListener('change', handleFileSelect);
  compressBtn.addEventListener('click', compressAllImages);
  downloadAllBtn.addEventListener('click', downloadAllCompressedImages);

  // Drag-drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
  }

  function handleDragLeave() {
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';

    if (e.dataTransfer.files.length) {
      imageInput.files = e.dataTransfer.files;
      handleFileSelect({ target: imageInput });
    }
  }

  // File selection and preview rendering
  function handleFileSelect(e) {
    const files = Array.from(e.target.files);

    if (files.length > 10) {
      showError('Maximum 10 images allowed.');
      resetState();
      return;
    }

    // Deduplicate files by name-size-lastModified
    const uniqueFiles = [];
    const seen = new Set();
    for (const file of files) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (!seen.has(id)) {
        seen.add(id);
        uniqueFiles.push(file);
      }
    }

    if (uniqueFiles.length === 0) {
      showError('Duplicate files are not allowed.');
      resetState();
      return;
    }

    hideError();
    resetState();

    filesQueue = uniqueFiles;
    currentIndex = 0;
    compressedBlobs = [];
    originalDataURLs = [];

    previewContainer.innerHTML = '';
    downloadAllContainer.style.display = 'none';

    // Read all images to show preview
    uniqueFiles.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        originalDataURLs[i] = event.target.result;
        createPreviewCard(file, event.target.result, i);
      };
      reader.readAsDataURL(file);
    });

    compressBtn.disabled = false;
    downloadAllBtn.disabled = true;
  }

  // Create preview card for each image (original + compressed placeholders)
  function createPreviewCard(file, dataURL, index) {
    const img = new Image();
    img.onload = function() {
      const previewHTML = `
        <div class="image-preview" id="preview-${index}">
          <div class="image-thumbnail">
            <img src="${dataURL}" alt="${file.name}" />
          </div>
          <div class="image-details">
            <p><strong>Name:</strong> ${file.name}</p>
            <p><strong>Format:</strong> ${file.type.split('/')[1].toUpperCase()}</p>
            <p><strong>Dimensions:</strong> ${img.width}×${img.height}px</p>
            <p><strong>Original Size:</strong> ${formatFileSize(file.size)}</p>
            <p><strong>Compressed Size:</strong> <span id="compressed-size-${index}">-</span></p>
            <p><strong>Reduction:</strong> <span id="reduction-${index}">-</span></p>
            <p><strong>Quality:</strong> <span id="quality-${index}">-</span></p>
          </div>
          <div class="image-actions">
            <a href="${dataURL}" download="${file.name}" class="download-btn">Download Original</a>
            <a href="#" class="download-btn" id="download-compressed-${index}" style="display:none;">Download Compressed</a>
          </div>
        </div>
      `;
      previewContainer.insertAdjacentHTML('beforeend', previewHTML);
    };
    img.src = dataURL;
  }

  // Compress all images sequentially
  async function compressAllImages() {
    if (filesQueue.length === 0) {
      showError('Please upload images first.');
      return;
    }
    compressBtn.disabled = true;
    downloadAllBtn.disabled = true;
    showLoading(true);
    hideError();

    compressedBlobs = [];

    for (; currentIndex < filesQueue.length; currentIndex++) {
      try {
        const file = filesQueue[currentIndex];
        const targetSizeKB = parseInt(targetSizeInput.value) || 200;
        const format = getSelectedFormat(file);

        const compressedDataUrl = await compressImage(file, targetSizeKB, format);
        const blob = dataURItoBlob(compressedDataUrl);
        compressedBlobs.push({ blob, originalName: file.name, format });

        // Update preview with compressed info
        updatePreviewCompressed(currentIndex, compressedDataUrl, blob.size, file.size, format);
      } catch (err) {
        showError(`Error compressing ${filesQueue[currentIndex].name}: ${err.message}`);
        console.error(err);
      }
    }

    showLoading(false);
    downloadAllBtn.disabled = compressedBlobs.length === 0;
  }

  // Helper: get format from selected links or default jpg
  function getSelectedFormat(file) {
    // If you want to add format selector, adapt here
    // For now, infer from original file or default 'image/jpeg'
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext)) return ext;
    return 'jpeg';
  }

  // Update preview cards with compressed info and show download compressed link
  function updatePreviewCompressed(index, dataUrl, newSize, originalSize, format) {
    document.getElementById(`compressed-size-${index}`).textContent = formatFileSize(newSize);
    document.getElementById(`reduction-${index}`).textContent = calculateReduction(originalSize, newSize) + '%';

    // Approximate quality as ratio
    const qualityPercent = Math.round((newSize / originalSize) * 100);
    document.getElementById(`quality-${index}`).textContent = qualityPercent + '%';

    const downloadLink = document.getElementById(`download-compressed-${index}`);
    downloadLink.href = dataUrl;
    downloadLink.download = `${filesQueue[index].name.replace(/\.[^/.]+$/, '')}_compressed.${format}`;
    downloadLink.style.display = 'inline-block';
  }

  // Image compression function using canvas, iterative quality & dimension adjustment
  async function compressImage(file, targetSizeKB, format) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Initial dimensions limit
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 2000;
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Set mime type
            let mimeType = 'image/jpeg';
            if (format === 'png') mimeType = 'image/png';
            else if (format === 'webp') mimeType = 'image/webp';
            else if (format === 'gif') mimeType = 'image/gif';
            else if (format === 'bmp') mimeType = 'image/bmp';

            let quality = 0.85;
            let minQuality = 0.1;
            let maxQuality = 1.0;
            let iterations = 0;
            const maxIterations = 15;
            let resultUrl;

            // Binary search for quality to match target size with dimension reduction fallback
            (function tryCompress() {
              iterations++;
              resultUrl = canvas.toDataURL(mimeType, quality);
              const sizeKB = (resultUrl.length * 0.75) / 1024;

              if (Math.abs(sizeKB - targetSizeKB) < targetSizeKB * 0.1 || iterations >= maxIterations) {
                resolve(resultUrl);
                return;
              }

              if (sizeKB > targetSizeKB) {
                maxQuality = quality;
                quality = (quality + minQuality) / 2;

                if (iterations > 5 && sizeKB > targetSizeKB * 1.5) {
                  width = Math.floor(width * 0.95);
                  height = Math.floor(height * 0.95);
                  canvas.width = width;
                  canvas.height = height;
                  ctx.clearRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
                }
              } else {
                minQuality = quality;
                quality = (quality + maxQuality) / 2;
              }

              setTimeout(tryCompress, 10);
            })();
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Convert base64 dataURL to Blob
  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }

  // Format file size in KB/MB for display
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Calculate % reduction rounded
  function calculateReduction(originalSize, compressedSize) {
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }

  // Show or hide loading spinner / indicator
  function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  }

  // Show error messages
  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
  }

  // Hide error messages
  function hideError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }

  // Reset state to initial
  function resetState() {
    filesQueue = [];
    currentIndex = 0;
    compressedBlobs = [];
    originalDataURLs = [];
    previewContainer.innerHTML = '';
    downloadAllContainer.style.display = 'none';
    compressBtn.disabled = true;
    downloadAllBtn.disabled = true;
    hideError();
    showLoading(false);
  }

  // Download all compressed images as a ZIP file
  async function downloadAllCompressedImages() {
    if (compressedBlobs.length === 0) {
      showError('No compressed images available for download.');
      return;
    }

    downloadAllBtn.disabled = true;
    showLoading(true);
    hideError();

    try {
      // Using JSZip library — you need to include it in your HTML
      // <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js"></script>
      const zip = new JSZip();

      compressedBlobs.forEach(({ blob, originalName, format }, idx) => {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        zip.file(`${baseName}_compressed.${format}`, blob);
      });

      const content = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compressed_images.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError('Failed to create ZIP file: ' + err.message);
    } finally {
      showLoading(false);
      downloadAllBtn.disabled = false;
    }
  }
});
