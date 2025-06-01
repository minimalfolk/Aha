// core.js

document.addEventListener("DOMContentLoaded", () => {
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const actionsContainer = document.getElementById('actionsContainer');
  const downloadBtn = document.getElementById('downloadBtn');

  let selectedFiles = [];
  let compressedBlobs = [];

  // Drag and Drop Events
  uploadBox.addEventListener('dragover', e => {
    e.preventDefault();
    uploadBox.classList.add('dragging');
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragging');
  });

  uploadBox.addEventListener('drop', e => {
    e.preventDefault();
    uploadBox.classList.remove('dragging');
    handleFiles(e.dataTransfer.files);
  });

  imageInput.addEventListener('change', () => {
    handleFiles(imageInput.files);
  });

  function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    originalPreview.innerHTML = '';
    compressedPreview.innerHTML = '';
    actionsContainer.hidden = true;

    selectedFiles.forEach(file => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      Object.assign(img.style, {
        maxWidth: '150px',
        maxHeight: '150px',
        borderRadius: '8px',
        objectFit: 'cover'
      });
      originalPreview.appendChild(img);
    });

    compressBtn.disabled = selectedFiles.length === 0;
  }

  compressBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const targetSize = parseInt(targetSizeInput.value);
    const outputFormat = formatSelect.value;
    if (!targetSize || targetSize < 10) {
      alert("Please enter a valid target size (10KB minimum).");
      return;
    }

    loadingIndicator.hidden = false;
    compressedPreview.hidden = true;
    compressedBlobs = [];
    compressedPreview.innerHTML = '';

    for (let file of selectedFiles) {
      const options = {
        maxSizeMB: targetSize / 1024,
        fileType: `image/${outputFormat}`,
        useWebWorker: true
      };
      try {
        const compressedFile = await imageCompression(file, options);
        compressedBlobs.push({ blob: compressedFile, name: file.name });

        const img = document.createElement('img');
        img.src = URL.createObjectURL(compressedFile);
        Object.assign(img.style, {
          maxWidth: '150px',
          maxHeight: '150px',
          borderRadius: '8px',
          objectFit: 'cover'
        });
        compressedPreview.appendChild(img);
      } catch (e) {
        console.error('Compression error:', e);
      }
    }

    loadingIndicator.hidden = true;
    compressedPreview.hidden = false;
    actionsContainer.hidden = false;
  });

  downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    for (let { blob, name } of compressedBlobs) {
      const ext = formatSelect.value;
      const newName = name.replace(/\.[^/.]+$/, "") + `.${ext}`;
      zip.file(newName, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "compressed_images.zip";
    a.click();
  });
});
