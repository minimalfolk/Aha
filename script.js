// Image Processing and PDF Conversion Logic
const fileInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const resizeBtn = document.getElementById('resizeBtn');
const originalImage = document.getElementById('originalImage');
const originalPreview = document.getElementById('originalPreview');
const resizedPreview = document.getElementById('resizedPreview');
const downloadBtn = document.getElementById('downloadBtn');
const formatSelect = document.getElementById('formatSelect');
const newWidth = document.getElementById('newWidth');
const newHeight = document.getElementById('newHeight');
const newDPI = document.getElementById('newDPI');

let originalFile;
let resizedBlob;

// Handle Image Upload
uploadBox.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Handle Drag & Drop
uploadBox.addEventListener('dragover', (e) => e.preventDefault());
uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file.');
    return;
  }

  originalFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    originalImage.src = e.target.result;
    originalPreview.style.display = 'block';
    resizeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// Handle Resize and PDF Conversion
resizeBtn.addEventListener('click', () => {
  const format = formatSelect.value;

  if (format === "application/pdf") {
    convertToPDF();
  } else {
    resizeImage();
  }
});

function resizeImage() {
  const width = parseInt(newWidth.value);
  const height = parseInt(newHeight.value);
  
  const img = new Image();
  img.src = originalImage.src;

  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob((blob) => {
      resizedBlob = blob;
      const resizedImage = document.getElementById('resizedImage');
      resizedImage.src = URL.createObjectURL(blob);
      resizedPreview.style.display = 'block';

      downloadBtn.style.display = 'block';
    }, 'image/jpeg', 0.8);
  };
}

// PDF Conversion Logic using jsPDF
function convertToPDF() {
  const img = new Image();
  img.src = originalImage.src;

  img.onload = () => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [img.width, img.height]
    });
    pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
    pdf.save('converted.pdf');
  };
}

// Download Resized Image
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(resizedBlob);
  link.download = "resized-image.jpg";
  link.click();
});
