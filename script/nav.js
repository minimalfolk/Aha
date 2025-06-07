document.addEventListener('DOMContentLoaded', function() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle current item
      item.classList.toggle('active');
    });
  });
});
// Upload Section Animations Manager
class UploadAnimator {
  constructor() {
    this.uploadBox = document.getElementById('uploadBox');
    this.imageInput = document.getElementById('imageInput');
    this.init();
  }

  init() {
    this.setupHoverEffects();
    this.setupDragEffects();
    this.setupFileSelection();
    this.setupClickFeedback();
  }

  setupHoverEffects() {
    // 3D tilt effect on hover
    this.uploadBox.addEventListener('mousemove', (e) => {
      const rect = this.uploadBox.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const angleX = (y - centerY) / 20;
      const angleY = (centerX - x) / 20;
      
      this.uploadBox.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    });

    this.uploadBox.addEventListener('mouseleave', () => {
      this.uploadBox.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  }

  setupDragEffects() {
    // Drag-over pulse animation
    this.uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadBox.classList.add('drag-over');
    });

    ['dragleave', 'drop'].forEach(event => {
      this.uploadBox.addEventListener(event, () => {
        this.uploadBox.classList.remove('drag-over');
      });
    });
  }

  setupFileSelection() {
    // Success animation when files are selected
    this.imageInput.addEventListener('change', () => {
      if (this.imageInput.files.length) {
        this.playSuccessAnimation();
      }
    });
  }

  setupClickFeedback() {
    // Button press effect
    this.uploadBox.addEventListener('mousedown', () => {
      this.uploadBox.style.transform = 'scale(0.98)';
    });

    this.uploadBox.addEventListener('mouseup', () => {
      this.uploadBox.style.transform = '';
    });

    this.uploadBox.addEventListener('mouseleave', () => {
      this.uploadBox.style.transform = '';
    });
  }

  playSuccessAnimation() {
    this.uploadBox.classList.add('upload-success');
    
    // Create confetti-like particles
    for (let i = 0; i < 12; i++) {
      this.createParticle();
    }
    
    setTimeout(() => {
      this.uploadBox.classList.remove('upload-success');
    }, 2000);
  }

  createParticle() {
    const particle = document.createElement('div');
    particle.className = 'upload-particle';
    
    // Random position and animation
    const size = Math.random() * 8 + 4;
    const posX = Math.random() * 100;
    const duration = Math.random() * 2 + 1;
    
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${posX}%;
      background: var(--primary-color);
      animation: particle-float ${duration}s ease-out forwards;
    `;
    
    this.uploadBox.appendChild(particle);
    
    // Remove after animation
    setTimeout(() => {
      particle.remove();
    }, duration * 1000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UploadAnimator();
});
