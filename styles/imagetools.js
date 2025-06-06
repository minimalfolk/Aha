/* Image Compression Tool Specific Styles */
.compress-image {
  max-width: 900px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

.compress-image h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--primary-color);
}

.upload-container {
  margin-bottom: 2.5rem;
  text-align: center;
}

.upload-box {
  border: 2px dashed var(--light-gray);
  border-radius: var(--border-radius);
  padding: 3rem 2rem;
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 1rem;
}

.upload-box:hover {
  border-color: var(--primary-color);
  background-color: rgba(67, 97, 238, 0.05);
}

.upload-box i {
  font-size: 3rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.upload-box h3 {
  margin-bottom: 0.5rem;
}

.upload-box p span {
  color: var(--primary-color);
  font-weight: 600;
  text-decoration: underline;
}

.upload-box input[type="file"] {
  display: none;
}

.supported-formats p {
  font-size: var(--font-sm);
  color: var(--gray-color);
}

/* Compression Options */
.compression-options {
  background-color: var(--light-color);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 2rem;
}

.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-row label {
  font-weight: 600;
  min-width: 120px;
}

.option-row select,
.option-row input[type="number"] {
  padding: 0.5rem 1rem;
  border: 1px solid var(--light-gray);
  border-radius: var(--border-radius);
  flex: 1;
  max-width: 200px;
}

#compressBtn {
  padding: 0.5rem 1.5rem;
  margin-left: auto;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

#compressBtn:hover {
  background-color: var(--primary-dark);
}

#compressBtn:disabled {
  background-color: var(--gray-color);
  cursor: not-allowed;
}

/* Loading Indicator */
#loadingIndicator {
  text-align: center;
  padding: 1rem;
  margin-bottom: 2rem;
  display: none;
}

#loadingText {
  font-weight: 600;
  color: var(--primary-color);
}

/* Preview Container */
#previewContainer {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

.preview-card {
  display: flex;
  flex-direction: column;
  background-color: var(--light-color);
  border-radius: var(--border-radius);
  padding: 1rem;
  box-shadow: var(--box-shadow);
}

.preview-image-container {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.preview-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.preview-details {
  flex: 1;
}

.preview-details p {
  font-size: var(--font-sm);
  margin-bottom: 0.25rem;
}

.preview-details .file-name {
  font-weight: 600;
  color: var(--dark-color);
}

.preview-details .file-stats {
  color: var(--gray-color);
  font-size: var(--font-xs);
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.preview-actions button {
  padding: 0.25rem 0.75rem;
  font-size: var(--font-xs);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: var(--transition);
}

.download-btn {
  background-color: var(--success-color);
  color: white;
}

.download-btn:hover {
  background-color: #3a9a32;
}

.remove-btn {
  background-color: var(--error-color);
  color: white;
}

.remove-btn:hover {
  background-color: #e60000;
}

/* Ads Container */
.ads-container {
  margin: 2rem 0;
  padding: 1rem;
  background-color: var(--light-gray);
  border-radius: var(--border-radius);
  text-align: center;
  min-height: 90px;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .compress-image {
    padding: 1.5rem;
  }
  
  .option-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .option-row select,
  .option-row input[type="number"] {
    max-width: 100%;
    width: 100%;
  }
  
  #compressBtn {
    width: 100%;
    margin-left: 0;
    margin-top: 0.5rem;
  }
  
  .preview-image-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}

/* Add these styles to your existing CSS */

/* Loading Circle Styles */
.loading-circle {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(67, 97, 238, 0.3);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-sm);
  color: var(--primary-color);
  font-weight: 600;
}

/* Updated Preview Card Styles */
.preview-card {
  position: relative;
  overflow: hidden;
}

.preview-card.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-card.loading .preview-actions {
  visibility: hidden;
}

/* Compression Progress Indicator */
.compression-progress {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
}

.progress-bar {
  flex-grow: 1;
  height: 6px;
  background-color: var(--light-gray);
  border-radius: 3px;
  overflow: hidden;
  margin-right: 0.5rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  width: 0%;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: var(--font-xs);
  color: var(--gray-color);
  min-width: 40px;
  text-align: right;
}
