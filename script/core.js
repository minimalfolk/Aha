<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const processBtn = document.getElementById('process-btn');
const previewContainer = document.getElementById('preview-container');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadAllContainer = document.getElementById('download-all-container');

let originalFiles = [];
let compressedFiles = [];

// Click to open file selector
uploadBox.addEventListener('click', () => imageInput.click());

// Drag & drop support
uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = '#0d6efd';
});
uploadBox.addEventListener('dragleave', () => {
  uploadBox.style.borderColor = '#ccc';
});
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.style.borderColor = '#ccc';
  handleFiles(e.dataTransfer.files);
});

imageInput.addEventListener('change', () => handleFiles(imageInput.files));

function handleFiles(files) {
  previewContainer.innerHTML = '';
  downloadAllContainer.style.display = 'none';
  compressedFiles = [];

  originalFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

  originalFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewContainer.appendChild(createPreview(e.target.result, file.name, 'Original'));
    };
    reader.readAsDataURL(file);
  });
}

processBtn.addEventListener('click', async () => {
  const targetSizeKB = parseInt(document.getElementById('target-size').value);
  if (!targetSizeKB || targetSizeKB < 10) return alert("Enter a valid target size (min 10 KB).");
  if (!originalFiles.length) return alert("Upload images first.");

  previewContainer.innerHTML = '';
  compressedFiles = [];

  for (let file of originalFiles) {
    const originalURL = await fileToDataURL(file);
    const image = await loadImage(originalURL);
    const blob = await compressImage(image, targetSizeKB * 1024);
    const url = URL.createObjectURL(blob);

    compressedFiles.push({ name: file.name, blob });
    previewContainer.appendChild(createPreview(url, file.name, `Compressed: ${(blob.size / 1024).toFixed(1)} KB`));
  }

  if (compressedFiles.length) downloadAllContainer.style.display = 'block';
});

downloadAllBtn.addEventListener('click', () => {
  const zip = new JSZip();
  compressedFiles.forEach(file => zip.file(file.name, file.blob));
  zip.generateAsync({ type: 'blob' }).then(content => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'compressed_images.zip';
    a.click();
  });
});

function fileToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function compressImage(img, targetBytes) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let quality = 0.9;
    let width = img.width;
    let height = img.height;

    function attempt() {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (blob.size <= targetBytes || quality < 0.4 || width < 50 || height < 50) {
          resolve(blob);
        } else {
          quality -= 0.05;
          width *= 0.95;
          height *= 0.95;
          attempt();
        }
      }, 'image/jpeg', quality);
    }

    attempt();
  });
}

function createPreview(src, name, label) {
  const container = document.createElement('div');
  container.style.textAlign = 'center';
  container.style.margin = '10px';

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '180px';
  img.style.maxHeight = '180px';
  img.style.display = 'block';
  img.style.margin = 'auto';
  img.style.borderRadius = '8px';

  const filename = document.createElement('p');
  filename.textContent = name;
  filename.style.fontWeight = 'bold';
  filename.style.fontSize = '13px';
  filename.style.marginTop = '5px';

  const info = document.createElement('p');
  info.textContent = label;
  info.style.fontSize = '12px';
  info.style.color = '#555';

  container.appendChild(img);
  container.appendChild(filename);
  container.appendChild(info);
  return container;
}
</script>
