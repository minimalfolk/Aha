<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
const imageInput = document.getElementById('imageInput');
const processBtn = document.getElementById('process-btn');
const previewContainer = document.getElementById('preview-container');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadAllContainer = document.getElementById('download-all-container');
const uploadBox = document.getElementById('uploadBox');

let originalImages = [];
let processedImages = [];

imageInput.addEventListener('change', handleImageUpload);
processBtn.addEventListener('click', processImages);
downloadAllBtn.addEventListener('click', downloadAllAsZip);

// Drag-and-drop support
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('drag-over');
});
uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('drag-over'));
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('drag-over');
  imageInput.files = e.dataTransfer.files;
  handleImageUpload();
});

function handleImageUpload() {
  previewContainer.innerHTML = '';
  processedImages = [];
  downloadAllContainer.style.display = 'none';

  originalImages = Array.from(imageInput.files);
  originalImages.forEach((file, index) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        previewContainer.appendChild(createPreview(img.src, 'Pending...', `image${index + 1}.jpg`, null));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function processImages() {
  const targetSizeKB = parseInt(document.getElementById('target-size').value);
  if (!targetSizeKB || targetSizeKB <= 0) return alert("Enter a valid target size in KB.");
  if (!originalImages.length) return alert("Please upload images first.");

  previewContainer.innerHTML = '';
  processedImages = [];

  for (let i = 0; i < originalImages.length; i++) {
    const file = originalImages[i];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const blob = await compressImage(img, targetSizeKB * 1024);
        const url = URL.createObjectURL(blob);
        const name = `image${i + 1}.jpg`;
        processedImages.push({ name, blob });
        previewContainer.appendChild(createPreview(url, `${(blob.size / 1024).toFixed(1)} KB`, name, blob));
        if (processedImages.length === originalImages.length) {
          downloadAllContainer.style.display = 'block';
        }
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
}

function compressImage(img, targetBytes) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    let quality = 0.92;
    let width = img.width;
    let height = img.height;
    const scaleFactor = 0.95;

    const tryCompress = () => {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
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

function createPreview(src, label, filename, blob) {
  const wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';
  wrapper.style.border = '1px solid #ccc';
  wrapper.style.padding = '10px';
  wrapper.style.borderRadius = '10px';
  wrapper.style.margin = '10px';
  wrapper.style.width = '200px';
  wrapper.style.display = 'inline-block';

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '160px';
  img.style.borderRadius = '6px';

  const info = document.createElement('p');
  info.textContent = label;
  info.style.fontSize = '14px';

  const downloadBtn = document.createElement('a');
  downloadBtn.textContent = 'Download';
  downloadBtn.style.display = blob ? 'inline-block' : 'none';
  downloadBtn.style.marginTop = '6px';
  downloadBtn.style.fontSize = '14px';
  downloadBtn.style.textDecoration = 'none';
  downloadBtn.style.color = '#fff';
  downloadBtn.style.background = '#007bff';
  downloadBtn.style.padding = '5px 10px';
  downloadBtn.style.borderRadius = '5px';

  if (blob) {
    downloadBtn.href = URL.createObjectURL(blob);
    downloadBtn.download = filename;
  }

  wrapper.appendChild(img);
  wrapper.appendChild(info);
  wrapper.appendChild(downloadBtn);

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
