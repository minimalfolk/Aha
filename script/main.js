// Main functionality for image compression
document.addEventListener('DOMContentLoaded', function() {
  const uploadBox = document.getElementById('uploadBox');
  const imageInput = document.getElementById('imageInput');
  const originalImagesGrid = document.getElementById('originalImagesGrid');
  const compressBtn = document.getElementById('compressBtn');
  const targetSize = document.getElementById('targetSize');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const compressedImagesGrid = document.getElementById('compressedImagesGrid');
  const supportMessage = document.getElementById('supportMessage');
  const adBlock = document.getElementById('adBlock');
  
  let uploadedFiles = [];
  
  // Handle drag and drop
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });
  
  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
  });
  
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  
  // Handle file input
  imageInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Handle files
  function handleFiles(files) {
    if (files.length === 0) return;
    
    uploadedFiles = Array.from(files);
    originalImagesGrid.innerHTML = '';
    originalImagesGrid.style.display = 'grid';
    
    // Show support message and ad after first upload
    supportMessage.style.display = 'block';
    adBlock.style.display = 'block';
    
    // Process each file
    uploadedFiles.forEach((file, index) => {
      if (!file.type.match('image.*')) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          createOriginalPreview(img, file, index);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    
    compressBtn.disabled = false;
  }
  
  // Create original preview
  function createOriginalPreview(img, file, index) {
    const item = document.createElement('div');
    item.className = 'original-image-item fade-in';
    
    const imgElement = document.createElement('img');
    imgElement.src = img.src;
    imgElement.alt = `Original image ${index + 1}`;
    
    const details = document.createElement('div');
    details.className = 'original-image-details';
    details.innerHTML = `
      <p>${file.name}</p>
      <p>${(file.size / 1024).toFixed(2)} KB</p>
      <p>${img.width} × ${img.height} px</p>
    `;
    
    item.appendChild(imgElement);
    item.appendChild(details);
    originalImagesGrid.appendChild(item);
  }
  
  // Compress button click
  compressBtn.addEventListener('click', async function() {
    if (uploadedFiles.length === 0) return;
    
    loadingIndicator.style.display = 'block';
    compressedImagesGrid.innerHTML = '';
    compressedImagesGrid.style.display = 'none';
    
    // Simulate compression (in a real app, you'd use actual compression)
    setTimeout(() => {
      loadingIndicator.style.display = 'none';
      compressedImagesGrid.style.display = 'grid';
      
      uploadedFiles.forEach((file, index) => {
        createCompressedPreview(file, index);
      });
    }, 1500);
  });
  
  // Create compressed preview
  function createCompressedPreview(file, index) {
    const item = document.createElement('div');
    item.className = 'compressed-image-item fade-in';
    
    const imgElement = document.createElement('img');
    imgElement.src = URL.createObjectURL(file);
    imgElement.alt = `Compressed image ${index + 1}`;
    
    const details = document.createElement('div');
    details.className = 'compressed-image-details';
    
    // Simulate compressed size (50% of original in this example)
    const compressedSize = parseInt(targetSize.value) || Math.max(10, Math.floor(file.size / 1024 / 2));
    details.innerHTML = `
      <p>${file.name}</p>
      <p>${compressedSize} KB (${Math.floor((compressedSize * 1024 / file.size) * 100)}% smaller)</p>
    `;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', () => {
      downloadImage(imgElement.src, file.name);
    });
    
    item.appendChild(imgElement);
    item.appendChild(details);
    item.appendChild(downloadBtn);
    compressedImagesGrid.appendChild(item);
  }
  
  // Download image
  function downloadImage(src, filename) {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

// Navigation toggle for mobile
function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('active');
}
