// Handle file selection
document.getElementById('imageInput').addEventListener('change', function(e) {
  const files = e.target.files;
  if (files.length > 0) {
    document.getElementById('compressBtn').disabled = false;
    showPreviews(files);
  }
});

// Show previews in compact format
function showPreviews(files) {
  const previewContainer = document.getElementById('previewContainer');
  previewContainer.innerHTML = '';
  
  Array.from(files).forEach(file => {
    if (!file.type.match('image.*')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.createElement('div');
      preview.className = 'preview-container';
      
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <div class="preview-details">
          <p class="preview-filename">${file.name}</p>
          <div class="preview-stats">
            <span>${formatFileSize(file.size)}</span>
            <span>Not compressed</span>
          </div>
        </div>
        <div class="preview-actions">
          <button class="download-btn" disabled>Download</button>
          <button class="remove-btn">Remove</button>
        </div>
      `;
      
      // Add remove button functionality
      preview.querySelector('.remove-btn').addEventListener('click', () => {
        preview.remove();
        updateFileList();
      });
      
      previewContainer.appendChild(preview);
    };
    reader.readAsDataURL(file);
  });
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update file list after removal
function updateFileList() {
  const dataTransfer = new DataTransfer();
  const previews = document.querySelectorAll('.preview-container');
  
  if (previews.length === 0) {
    document.getElementById('compressBtn').disabled = true;
    document.getElementById('imageInput').files = dataTransfer.files;
    return;
  }
  
  // Rebuild the file list from remaining previews
  previews.forEach(preview => {
    // In a real implementation, you would need to store the File object
    // or reconstruct it from the preview data
  });
  
  document.getElementById('imageInput').files = dataTransfer.files;
}
