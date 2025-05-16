document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const originalPreview = document.getElementById('originalPreview');
  const originalImage = document.getElementById('originalImage');
  const originalDetails = document.getElementById('originalDetails');
  const compressedPreview = document.getElementById('compressedPreview');
  const compressedImage = document.getElementById('compressedImage');
  const compressedDetails = document.getElementById('compressedDetails');
  const downloadBtn = document.getElementById('downloadBtn');

  let images = [];

  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files);
    if (images.length > 0) {
      compressBtn.disabled = false;
      displayOriginalImage(images[0]);
    } else {
      compressBtn.disabled = true;
      originalPreview.style.display = 'none';
      errorMessage.hidden = true;
    }
  });

  compressBtn.addEventListener('click', async () => {
    if (!images.length) return;

    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      errorMessage.textContent = 'Please enter a valid target size in KB.';
      errorMessage.hidden = false;
      return;
    }

    errorMessage.hidden = true;
    loadingIndicator.hidden = false;
    compressedPreview.style.display = 'none';

    const results = [];

    for (const image of images) {
      try {
        const { blob, url, dimensions } = await compressImageToTarget(image, targetSizeKB * 1024, format);
        results.push({ blob, url, dimensions, original: image });
      } catch (err) {
        errorMessage.textContent = `Error processing ${image.name}: ${err.message}`;
        errorMessage.hidden = false;
      }
    }

    if (results.length > 0) {
      const first = results[0];
      compressedImage.src = first.url;
      compressedDetails.innerHTML = `
        <p><strong>New Size:</strong> ${(first.blob.size / 1024).toFixed(1)} KB</p>
        <p><strong>Format:</strong> ${format.toUpperCase()}</p>
        <p><strong>Dimensions:</strong> ${first.dimensions.width} × ${first.dimensions.height} px</p>
        <p><strong>Reduction:</strong> ${calculateReduction(first.original.size, first.blob.size)}%</p>
      `;
      compressedPreview.style.display = 'block';
      downloadBtn.disabled = false;

      downloadBtn.onclick = () => {
        results.forEach(({ blob, original }, idx) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `compressed_${idx + 1}_${original.name.replace(/\.[^/.]+$/, '')}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        });
      };
    } else {
      downloadBtn.disabled = true;
    }

    loadingIndicator.hidden = true;
  });

  function displayOriginalImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      originalImage.src = url;
      originalDetails.innerHTML = `
        <p><strong>Name:</strong> ${file.name}</p>
        <p><strong>Type:</strong> ${file.type}</p>
        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(1)} KB</p>
        <p><strong>Dimensions:</strong> ${img.width} × ${img.height} px</p>
      `;
      originalPreview.style.display = 'block';
    };
    img.src = url;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image format.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageToTarget(file, targetBytes, format) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const MAX_DIMENSION = 2000;
    let width = img.width;
    let height = img.height;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let quality = 0.9;
    let blob = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      blob = await new Promise(resolve => canvas.toBlob(resolve, `image/${format}`, quality));

      if (!blob) throw new Error('Failed to compress image.');

      const sizeDiff = blob.size - targetBytes;

      if (Math.abs(sizeDiff) < 5000) break;

      if (sizeDiff > 0) {
        quality *= 0.85;
        width *= 0.9;
        height *= 0.9;
      } else {
        quality = Math.min(quality * 1.05, 0.95);
      }

      width = Math.round(width);
      height = Math.round(height);
    }

    const url = URL.createObjectURL(blob);
    return { blob, url, dimensions: { width, height } };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
