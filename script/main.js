document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const originalPreview = document.getElementById('originalPreview');
  const originalImage = document.getElementById('originalImage');
  const originalDetails = document.getElementById('originalDetails');
  const compressedPreview = document.getElementById('compressedPreview');
  const compressedImage = document.getElementById('compressedImage');
  const compressedDetails = document.getElementById('compressedDetails');
  const downloadBtn = document.getElementById('downloadBtn');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorMessage = document.getElementById('errorMessage');

  let filesQueue = [];
  let compressedBlobs = [];

  uploadBox.addEventListener('click', () => imageInput.click());
  uploadBox.addEventListener('dragover', e => {
    e.preventDefault();
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
  });
  uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
  });
  uploadBox.addEventListener('drop', e => {
    e.preventDefault();
    uploadBox.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
    if (e.dataTransfer.files.length) {
      imageInput.files = e.dataTransfer.files;
      handleFileSelect({ target: imageInput });
    }
  });

  imageInput.addEventListener('change', handleFileSelect);
  compressBtn.addEventListener('click', compressAllImages);
  downloadBtn.addEventListener('click', downloadAllCompressedImages);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);

    if (files.length > 10) {
      return showError('Maximum 10 images allowed.');
    }

    const uniqueFiles = [];
    const seen = new Set();
    files.forEach(file => {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (!seen.has(id)) {
        seen.add(id);
        uniqueFiles.push(file);
      }
    });

    if (uniqueFiles.length === 0) {
      return showError('Duplicate files are not allowed.');
    }

    filesQueue = uniqueFiles;
    compressedBlobs = [];
    compressBtn.disabled = false;
    downloadBtn.disabled = true;
    hideError();

    showImagePreview(filesQueue[0]);
  }

  function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      originalImage.src = e.target.result;
      originalPreview.style.display = 'block';
      originalDetails.innerHTML = `
        <div class="file-meta">
          <p><strong>Name:</strong> ${file.name}</p>
          <p><strong>Type:</strong> ${file.type}</p>
          <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
          <p><strong>Dimensions:</strong> <span id="originalDimensions">Loading...</span></p>
        </div>
      `;
      const img = new Image();
      img.onload = function () {
        document.getElementById('originalDimensions').textContent = `${img.width} × ${img.height}px`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function compressAllImages() {
    if (!filesQueue.length) return;

    compressBtn.disabled = true;
    downloadBtn.disabled = true;
    showLoading(true);
    hideError();

    for (let i = 0; i < filesQueue.length; i++) {
      const file = filesQueue[i];
      try {
        const targetSizeKB = parseInt(targetSizeInput.value) || 100;
        const format = formatSelect.value;
        const dataUrl = await compressImage(file, targetSizeKB, format);
        const blob = dataURItoBlob(dataUrl);
        compressedBlobs.push({ blob, name: file.name, format });

        showCompressedPreview(dataUrl, blob, file, format);
        await new Promise(r => setTimeout(r, 500)); // slight delay for UI update
      } catch (err) {
        console.error('Compression failed:', err);
        showError(`Failed to compress ${file.name}`);
      }
    }

    showLoading(false);
    downloadBtn.disabled = false;
  }

  function showCompressedPreview(dataUrl, blob, file, format) {
    compressedImage.src = dataUrl;
    compressedPreview.style.display = 'block';

    const img = new Image();
    img.onload = () => {
      compressedDetails.innerHTML = `
        <div class="file-meta">
          <p><strong>New Size:</strong> ${formatFileSize(blob.size)}</p>
          <p><strong>Reduction:</strong> ${calculateReduction(file.size, blob.size)}%</p>
          <p><strong>Format:</strong> ${format.toUpperCase()}</p>
          <p><strong>Dimensions:</strong> ${img.width} × ${img.height}px</p>
          <p><strong>Quality:</strong> ${Math.round((blob.size / file.size) * 100)}%</p>
        </div>
      `;
    };
    img.src = dataUrl;
  }

  async function compressImage(file, targetSizeKB, format) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;
          const maxDim = Math.min(Math.max(width, height), 2000);
          const scale = Math.min(maxDim / width, maxDim / height);
          width *= scale;
          height *= scale;

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let mimeType = 'image/jpeg';
          if (format === 'png') mimeType = 'image/png';
          else if (format === 'webp') mimeType = 'image/webp';
          else if (format === 'gif') mimeType = 'image/gif';
          else if (format === 'bmp') mimeType = 'image/bmp';

          let quality = 0.85, minQ = 0.1, maxQ = 1.0, iteration = 0, maxIt = 15;
          let result, sizeKB;

          do {
            result = canvas.toDataURL(mimeType, quality);
            sizeKB = (result.length * 0.75) / 1024;

            if (sizeKB > targetSizeKB) {
              maxQ = quality;
              quality = (quality + minQ) / 2;
              if (iteration > 5 && sizeKB > targetSizeKB * 1.5) {
                width *= 0.95;
                height *= 0.95;
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
              }
            } else {
              minQ = quality;
              quality = (quality + maxQ) / 2;
            }
            iteration++;
          } while (iteration < maxIt && Math.abs(sizeKB - targetSizeKB) > targetSizeKB * 0.1);

          resolve(result);
        };
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  function downloadAllCompressedImages() {
    if (!compressedBlobs.length) return showError('No compressed images available');

    compressedBlobs.forEach(({ blob, name, format }, index) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format || name.split('.').pop();
      a.href = url;
      a.download = `compressed_${index + 1}_${name.replace(/\.[^/.]+$/, '')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  function formatFileSize(bytes) {
    return bytes < 1024
      ? bytes + ' bytes'
      : bytes < 1048576
      ? (bytes / 1024).toFixed(1) + ' KB'
      : (bytes / 1048576).toFixed(1) + ' MB';
  }

  function calculateReduction(original, compressed) {
    return Math.round((1 - compressed / original) * 100);
  }

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }

  function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
    compressBtn.disabled = show;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  // Init
  compressBtn.disabled = true;
  downloadBtn.disabled = true;
  loadingIndicator.style.display = 'none';
  errorMessage.style.display = 'none';
});
