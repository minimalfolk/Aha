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

  // ... (previous code remains the same until createOriginalPreview function)
  
  // Create original preview item
  function createOriginalPreview(img, file, index) {
    const previewContent = document.getElementById('originalPreviewContent');
    const previewCount = document.querySelector('#originalPreview .preview-count');
    
    const item = document.createElement('div');
    item.className = 'preview-item fade-in';
    
    const imgElement = document.createElement('img');
    imgElement.className = 'preview-image';
    imgElement.src = img.src;
    imgElement.alt = `Original image ${index + 1}`;
    
    const details = document.createElement('div');
    details.className = 'preview-details';
    details.innerHTML = `
      <div class="detail-group">
        <span class="detail-label">Name:</span>
        <span class="detail-value">${file.name}</span>
      </div>
      <div class="detail-group">
        <span class="detail-label">Size:</span>
        <span class="detail-value">${(file.size / 1024).toFixed(2)} KB</span>
      </div>
      <div class="detail-group">
        <span class="detail-label">Dimensions:</span>
        <span class="detail-value">${img.width} × ${img.height} px</span>
      </div>
    `;
    
    item.appendChild(imgElement);
    item.appendChild(details);
    previewContent.appendChild(item);
    
    // Update count
    previewCount.textContent = `${previewContent.children.length} images`;
    document.getElementById('originalPreview').style.display = 'block';
  }
  
  // Create compressed preview item
  function createCompressedPreview(file, index) {
    const previewContent = document.getElementById('compressedPreviewContent');
    const previewCount = document.querySelector('#compressedPreview .preview-count');
    
    const item = document.createElement('div');
    item.className = 'preview-item fade-in';
    
    const imgElement = document.createElement('img');
    imgElement.className = 'preview-image';
    imgElement.src = URL.createObjectURL(file);
    imgElement.alt = `Compressed image ${index + 1}`;
    
    const compressedSize = parseInt(targetSize.value) || Math.max(10, Math.floor(file.size / 1024 / 2));
    const reductionPercent = Math.floor((compressedSize * 1024 / file.size) * 100);
    
    const details = document.createElement('div');
    details.className = 'preview-details';
    details.innerHTML = `
      <div class="detail-group">
        <span class="detail-label">Name:</span>
        <span class="detail-value">${file.name}</span>
      </div>
      <div class="detail-group">
        <span class="detail-label">Original:</span>
        <span class="detail-value">${(file.size / 1024).toFixed(2)} KB</span>
      </div>
      <div class="detail-group">
        <span class="detail-label">Compressed:</span>
        <span class="detail-value">${compressedSize} KB (${reductionPercent}% smaller)</span>
      </div>
    `;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    downloadBtn.addEventListener('click', () => {
      downloadImage(imgElement.src, file.name);
    });
    
    details.appendChild(downloadBtn);
    item.appendChild(imgElement);
    item.appendChild(details);
    previewContent.appendChild(item);
    
    // Update count
    previewCount.textContent = `${previewContent.children.length} images`;
    document.getElementById('compressedPreview').style.display = 'block';
  }
  
  // ... (rest of the JavaScript remains the same)
});
