// ui.js - Handles UI interactions and event listeners
import {
  loadImage,
  compressImageToTarget,
  createPreviewElement,
  updatePreviewAfterCompression,
  formatFileSize,
  calculateReduction
} from './script/imageTool.js';

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const compressBtn = document.getElementById('compressBtn');
  const targetSizeInput = document.getElementById('targetSize');
  const formatSelect = document.getElementById('formatSelect');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewContainer = document.getElementById('previewContainer');

  let images = [];

  // Handle file selection
  imageInput.addEventListener('change', async (e) => {
    images = Array.from(e.target.files).slice(0, 15); // Limit to 15 files
    compressBtn.disabled = images.length === 0;
    previewContainer.innerHTML = '';

    for (const file of images) {
      if (!file.type.match('image.*')) continue;

      try {
        const img = await loadImage(file);
        const preview = createPreviewElement(file, img);
        
        // Add remove functionality
        preview.querySelector('.remove-btn').addEventListener('click', () => {
          preview.remove();
          images = images.filter((_, index) => 
            index !== Array.from(previewContainer.querySelectorAll('.preview-container')).indexOf(preview));
          if (images.length === 0) compressBtn.disabled = true;
        });
        
        previewContainer.appendChild(preview);
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }
  });

  // Handle compression
  compressBtn.addEventListener('click', async () => {
    const targetSizeKB = parseInt(targetSizeInput.value);
    const format = formatSelect.value;

    if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
      showError('Please enter a valid target size in KB');
      return;
    }

    loadingIndicator.hidden = false;
    compressBtn.disabled = true;

    const previews = previewContainer.querySelectorAll('.preview-container');

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const preview = previews[i];
      
      try {
        const { blob, url, dimensions } = await compressImageToTarget(
          file, 
          targetSizeKB * 1024, 
          format
        );

        updatePreviewAfterCompression(
          preview,
          file,
          blob,
          url,
          dimensions,
          format
        );
      } catch (err) {
        updatePreviewWithError(preview, err.message);
      }
    }

    loadingIndicator.hidden = true;
    compressBtn.disabled = false;
  });

  /**
   * Updates preview with error message
   * @param {HTMLElement} preview - The preview container
   * @param {string} errorMessage - Error message to display
   */
  function updatePreviewWithError(preview, errorMessage) {
    const statsContainer = preview.querySelector('.preview-stats');
    statsContainer.innerHTML = `<span style="color: var(--error-color)">Error: ${errorMessage}</span>`;
  }

  /**
   * Shows an error message in the UI
   * @param {string} message - Error message to show
   */
  function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    previewContainer.prepend(error);
    setTimeout(() => error.remove(), 5000);
  }
});
