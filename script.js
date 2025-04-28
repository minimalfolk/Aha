const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const previewContainer = document.getElementById('previewContainer');
const stats = document.getElementById('stats');
const processing = document.getElementById('processing');
const downloadButton = document.getElementById('downloadButton');
const targetSize = 198; // Target size in KB (198KB)
let originalFiles = [];

uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover', (e) => e.preventDefault());
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  handleFiles(files);
});

function handleFiles(files) {
  originalFiles = files;
  processFiles();
}

function processFiles() {
  if (originalFiles.length === 0) return;

  processing.style.display = 'block';
  previewContainer.innerHTML = ''; // Clear previous previews
  
  // Iterate over each file
  Array.from(originalFiles).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgContainer = document.createElement('div');
      imgContainer.classList.add('image-container');
      
      const preview = document.createElement('img');
      preview.src = e.target.result;
      preview.classList.add('image-preview');
      imgContainer.appendChild(preview);

      const progressBar = document.createElement('div');
      progressBar.classList.add('progress-bar');
      imgContainer.appendChild(progressBar);
      
      previewContainer.appendChild(imgContainer);
      compressImage(file, progressBar, preview);
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(file, progressBar, preview) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const currentSize = file.size / 1024; // Original size in KB
    let quality = 0.8; // Initial quality
    let compressedSize;

    const compress = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          compressedSize = blob.size / 1024; // Compressed size in KB
          const sizeReduction = (((currentSize - compressedSize) / currentSize) * 100).toFixed(2);

          // Update the progress bar
          const progress = Math.min((compressedSize / currentSize) * 100, 100);
          progressBar.style.width = `${progress}%`;

          // Update the preview image with compressed image
          preview.src = URL.createObjectURL(blob);

          // If compressed size is still above the target, reduce quality further
          if (compressedSize > targetSize && quality > 0.1) {
            quality -= 0.05; // Reduce quality in steps
            compress();
          } else {
            stats.textContent = `Size reduced by ${sizeReduction}% (${currentSize.toFixed(2)} KB → ${compressedSize.toFixed(2)} KB)`;
            processing.style.display = 'none';
          }
        },
        'image/jpeg',
        quality
      );
    };

    compress();
  };
}

// Download all compressed images as a ZIP file
downloadButton.addEventListener('click', () => {
  if (originalFiles.length === 0) return;

  // Create a zip file for download
  const zip = new JSZip();
  
  Array.from(originalFiles).forEach((file, index) => {
    const imgContainer = previewContainer.children[index];
    const compressedBlob = imgContainer.querySelector('img').src;
    const compressedName = `compressed-${file.name}`;
    zip.file(compressedName, compressedBlob.split(',')[1], { base64: true });
  });

  // Generate the ZIP file
  zip.generateAsync({ type: 'blob' }).then(function (content) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'compressed_images.zip';
    link.click();
  });
});
