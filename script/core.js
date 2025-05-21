<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
const imageInput = document.getElementById('imageInput');
const processBtn = document.getElementById('process-btn');
const previewContainer = document.getElementById('preview-container');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadAllContainer = document.getElementById('download-all-container');
let processedImages = [];

imageInput.addEventListener('change', handleImageUpload);
processBtn.addEventListener('click', processImages);
downloadAllBtn.addEventListener('click', downloadAllAsZip);

function handleImageUpload() {
  previewContainer.innerHTML = '';
  processedImages = [];
  const files = imageInput.files;

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;
      img.onload = function () {
        previewContainer.appendChild(createPreview(img.src, 'Pending...'));
      };
    };
    reader.readAsDataURL(file);
  });
}

function processImages() {
  const targetSizeKB = parseInt(document.getElementById('target-size').value);
  if (!targetSizeKB || targetSizeKB <= 0) return alert("Enter a valid target size.");

  const files = imageInput.files;
  if (!files.length) return alert("Please upload images first.");

  previewContainer.innerHTML = '';
  processedImages = [];

  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;

      img.onload = async function () {
        const compressedBlob = await compressImage(img, targetSizeKB * 1024);
        const compressedURL = URL.createObjectURL(compressedBlob);
        processedImages.push({ name: `image${index + 1}.jpg`, blob: compressedBlob });

        previewContainer.appendChild(createPreview(compressedURL, `${(compressedBlob.size / 1024).toFixed(1)} KB`));

        if (processedImages.length === files.length) {
          downloadAllContainer.style.display = 'block';
        }
      };
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(img, targetBytes) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    let quality = 0.92;
    let width = img.width;
    let height = img.height;
    const scaleFactor = 0.95; // Decrease factor each iteration

    const tryCompress = () => {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
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
    };

    tryCompress();
  });
}

function createPreview(src, label) {
  const wrapper = document.createElement('div');
  wrapper.style.margin = '10px';
  wrapper.style.textAlign = 'center';

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '180px';
  img.style.maxHeight = '180px';
  img.style.display = 'block';
  img.style.margin = 'auto';
  img.style.borderRadius = '8px';

  const info = document.createElement('p');
  info.textContent = label;
  info.style.fontSize = '14px';

  wrapper.appendChild(img);
  wrapper.appendChild(info);
  return wrapper;
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
</script>
