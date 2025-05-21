const imageInput = document.getElementById('imageInput');
const processBtn = document.getElementById('process-btn');
const previewContainer = document.getElementById('preview-container');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadAllContainer = document.getElementById('download-all-container');

let originalFiles = [];
let processedImages = [];

imageInput.addEventListener('change', handleImageUpload);
processBtn.addEventListener('click', processImages);
downloadAllBtn.addEventListener('click', downloadAllAsZip);

function handleImageUpload() {
  previewContainer.innerHTML = '';
  processedImages = [];
  downloadAllContainer.style.display = 'none';

  originalFiles = Array.from(imageInput.files).filter(f => f.type.startsWith('image/'));

  originalFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.appendChild(createPreview(e.target.result, 'Original'));
    };
    reader.readAsDataURL(file);
  });
}

async function processImages() {
  const targetSizeKB = parseInt(document.getElementById('target-size').value);
  if (!targetSizeKB || targetSizeKB <= 0) {
    alert("Enter a valid target size in KB.");
    return;
  }
  if (originalFiles.length === 0) {
    alert("Please upload images first.");
    return;
  }

  previewContainer.innerHTML = '';
  processedImages = [];

  for (let i = 0; i < originalFiles.length; i++) {
    const file = originalFiles[i];
    const imgDataUrl = await fileToDataURL(file);
    const img = await loadImage(imgDataUrl);

    const compressedBlob = await compressImage(img, targetSizeKB * 1024);
    const compressedURL = URL.createObjectURL(compressedBlob);
    processedImages.push({ name: file.name, blob: compressedBlob });

    previewContainer.appendChild(createPreview(compressedURL, `Compressed: ${(compressedBlob.size / 1024).toFixed(1)} KB`));
  }

  downloadAllContainer.style.display = processedImages.length ? 'block' : 'none';
}

function createPreview(src, label) {
  const wrapper = document.createElement('div');
  wrapper.style.margin = '10px';
  wrapper.style.textAlign = 'center';

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '180px';
  img.style.maxHeight = '180px';
  img.style.borderRadius = '8px';
  img.style.display = 'block';
  img.style.margin = 'auto';

  const info = document.createElement('p');
  info.textContent = label;
  info.style.fontSize = '14px';

  wrapper.appendChild(img);
  wrapper.appendChild(info);

  return wrapper;
}

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function compressImage(img, targetBytes) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    let quality = 0.92;
    let width = img.width;
    let height = img.height;
    const scaleFactor = 0.95;

    const ctx = canvas.getContext('2d');

    function tryCompress() {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (blob.size <= targetBytes || quality < 0.5 || width < 50 || height < 50) {
          resolve(blob);
        } else {
          quality -= 0.05;
          width *= scaleFactor;
          height *= scaleFactor;
          tryCompress();
        }
      }, 'image/jpeg', quality);
    }

    tryCompress();
  });
}

function downloadAllAsZip() {
  const zip = new JSZip();
  processedImages.forEach(img => {
    zip.file(img.name, img.blob);
  });

  zip.generateAsync({ type: "blob" }).then(content => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = "compressed_images.zip";
    a.click();
  });
}
