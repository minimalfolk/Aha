document.addEventListener("DOMContentLoaded", function () { const fileInput = document.getElementById("fileInput"); const uploadBox = document.getElementById("uploadBox"); const imageContainer = document.getElementById("imageContainer"); const reduceSize = document.getElementById("reduceSize"); const processing = document.getElementById("processing"); const downloadButton = document.getElementById("downloadButton"); const customSizeInput = document.getElementById("sizeInput"); const customSizeText = document.getElementById("customSizeText");

let originalFiles = []; let compressedBlobs = [];

uploadBox.addEventListener("click", () => fileInput.click()); uploadBox.addEventListener("dragover", (e) => e.preventDefault()); uploadBox.addEventListener("drop", (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(files) { if (files.length > 0) { imageContainer.innerHTML = ""; originalFiles = []; compressedBlobs = [];

for (let i = 0; i < files.length; i++) {
    if (!files[i].type.startsWith("image/")) {
      alert("Please upload only image files.");
      return;
    }

    const file = files[i];
    originalFiles.push(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("image-wrapper");

      const preview = document.createElement("img");
      preview.src = e.target.result;
      wrapper.appendChild(preview);

      const imageSize = document.createElement("p");
      imageSize.textContent = `Image Size: ${(file.size / 1024).toFixed(2)} KB`;
      wrapper.appendChild(imageSize);

      const processingText = document.createElement("p");
      processingText.textContent = "Processing...";
      processingText.style.display = "none";
      wrapper.appendChild(processingText);

      const compressedImg = document.createElement("img");
      compressedImg.style.display = "none";
      wrapper.appendChild(compressedImg);

      imageContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  }
}

}

function compressToTargetSize(file, index, targetSizeKB) { const img = new Image(); img.src = URL.createObjectURL(file);

img.onload = () => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  let quality = 0.95;
  let step = 0.05;

  function tryCompress() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const sizeKB = blob.size / 1024;

      if (sizeKB > targetSizeKB + 2 && quality > 0.05) {
        quality -= step;
        tryCompress();
      } else {
        compressedBlobs[index] = blob;

        const compressedImg = imageContainer.children[index].querySelector("img:nth-of-type(2)");
        compressedImg.src = URL.createObjectURL(blob);
        compressedImg.style.display = "block";

        const originalSize = (file.size / 1024).toFixed(2);
        const sizeReduction = (((originalSize - sizeKB) / originalSize) * 100).toFixed(2);

        const stats = imageContainer.children[index].querySelector("p:nth-of-type(2)");
        stats.textContent = `Size reduced by ${sizeReduction}% (${originalSize} KB → ${sizeKB.toFixed(2)} KB)`;

        const processingText = imageContainer.children[index].querySelector("p:nth-of-type(3)");
        processingText.style.display = "none";
      }
    }, "image/jpeg", quality);
  }

  tryCompress();
};

}

reduceSize.addEventListener("click", () => { const targetSize = parseFloat(customSizeInput.value); if (!targetSize || originalFiles.length === 0) return;

processing.style.display = "block";

for (let i = 0; i < originalFiles.length; i++) {
  const processingText = imageContainer.children[i].querySelector("p:nth-of-type(3)");
  processingText.style.display = "block";
  compressToTargetSize(originalFiles[i], i, targetSize);
}

});

customSizeInput.addEventListener("input", () => { const val = customSizeInput.value; customSizeText.textContent = Custom size set to: ${val} KB; });

downloadButton.addEventListener("click", () => { compressedBlobs.forEach((blob, index) => { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = compressed-${originalFiles[index].name}; link.click(); }); }); });

