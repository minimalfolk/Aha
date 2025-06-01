document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const errorMessage = document.getElementById('errorMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewGrid = document.getElementById('previewGrid');

  let images = [];

  imageInput.addEventListener('change', (e) => {
    images = Array.from(e.target.files).slice(0, 15); // Max 15
    compressBtn.disabled = images.length === 0;
    previewGrid.innerHTML = '';

    images.forEach(async (file, idx) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <div class="original-section">
          <img class="original-thumb" />
          <div class="original-info"></div>
        </div>
        <div class="compressed-section" style="display: none;">
          <img class="compressed-thumb" />
          <div class="compressed-info"></div>
          <button class="downloadBtn" disabled>Download</button>
        </div>
      `;
      previewGrid.appendChild(card);

      const img = await loadImage(file);
      card.querySelector('.original-thumb').src = URL.createObjectURL(file);
      card.querySelector('.original-info').innerHTML = `
        <p><strong>Name:</strong> ${file.name}</p>
        <p><strong>Size:</strong> ${(file.size / 1024).toFixed(1)} KB</p>
        <p><strong>Dimensions:</strong> ${img.width} × ${img.height}px</p>
      `;
    });
  });

  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      alert('Enter a valid target size in KB.');
      return;
    }

    loadingIndicator.hidden = false;

    const cards = previewGrid.querySelectorAll('.image-card');

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const card = cards[i];
      try {
        const { blob, url, dimensions } = await compressImageToTarget(file, targetSizeKB * 1024, format);
        const downloadBtn = card.querySelector('.downloadBtn');
        const compressedThumb = card.querySelector('.compressed-thumb');
        const compressedInfo = card.querySelector('.compressed-info');

        compressedThumb.src = url;
        compressedInfo.innerHTML = `
          <p><strong>New Size:</strong> ${(blob.size / 1024).toFixed(1)} KB</p>
          <p><strong>Format:</strong> ${format.toUpperCase()}</p>
          <p><strong>Dimensions:</strong> ${dimensions.width} × ${dimensions.height}px</p>
          <p><strong>Reduction:</strong> ${calculateReduction(file.size, blob.size)}%</p>
        `;

        downloadBtn.disabled = false;
        downloadBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `compressed_${i + 1}_${file.name.replace(/\.[^/.]+$/, '')}.${format}`;
          a.click();
        };

        card.querySelector('.compressed-section').style.display = 'block';
      } catch (err) {
        card.querySelector('.compressed-info').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
      }
    }

    loadingIndicator.hidden = true;
  });

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Read error.'));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageToTarget(file, targetBytes, format) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const MAX_DIM = 2000;
    let width = img.width;
    let height = img.height;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    let qualityMin = 0.3, qualityMax = 0.95, quality = qualityMax;
    let blob = null, lastGoodBlob = null, lastGoodDims = { width, height };

    for (let i = 0; i < 12; i++) {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, quality));
      if (!blob) throw new Error('Compression failed');

      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        if (targetBytes - blob.size < 1024) break;
        qualityMin = quality;
        quality = (quality + qualityMax) / 2;
      } else {
        qualityMax = quality;
        quality = (quality + qualityMin) / 2;
      }
    }

    while (!lastGoodBlob && width > 100 && height > 100) {
      width = Math.round(width * 0.95);
      height = Math.round(height * 0.95);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 0.85));
      if (!blob) throw new Error('Dimension reduction failed');
      if (blob.size <= targetBytes) {
        lastGoodBlob = blob;
        lastGoodDims = { width, height };
        break;
      }
    }

    if (!lastGoodBlob) throw new Error('Could not meet target size.');
    const url = URL.createObjectURL(lastGoodBlob);
    return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
  }

  function calculateReduction(originalSize, newSize) {
    return Math.round((1 - newSize / originalSize) * 100);
  }
});
