  const imageInput = document.getElementById("imageInput");
  const imagePreviewSection = document.getElementById("imagePreviewSection");
  const imagePreviewList = document.getElementById("imagePreviewList");
  const compressBtn = document.getElementById("compressBtn");
  const targetSizeInput = document.getElementById("targetSize");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  const loadingIndicator = document.getElementById("loadingIndicator");

  let images = [];

  imageInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);
    images = files.map((file, index) => ({ file, id: index }));
    previewImages(images);
    compressBtn.disabled = false;
  });

  function previewImages(images) {
    imagePreviewList.innerHTML = "";
    imagePreviewSection.style.display = "block";
    images.forEach(({ file, id }) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.className = "preview-image";
        div.id = `img-preview-${id}`;
        div.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <p>${file.name}</p>
        `;
        imagePreviewList.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  compressBtn.addEventListener("click", async () => {
    const targetSize = parseInt(targetSizeInput.value);
    if (!targetSize || isNaN(targetSize)) return alert("Please enter a valid target size.");

    loadingIndicator.hidden = false;
    downloadAllBtn.style.display = "none";

    const compressedImages = await Promise.all(images.map((item) => compressImage(item.file, targetSize)));
    
    images = compressedImages.map((blob, index) => ({
      file: new File([blob], images[index].file.name, { type: blob.type }),
      id: images[index].id
    }));

    updatePreviews(images);
    loadingIndicator.hidden = true;
    downloadAllBtn.style.display = "inline-block";
  });

  async function compressImage(file, targetKB) {
    const maxWidth = 1920;
    const maxHeight = 1080;
    const qualitySteps = [0.9, 0.75, 0.5, 0.3, 0.1];

    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let [w, h] = [imageBitmap.width, imageBitmap.height];
    if (w > maxWidth || h > maxHeight) {
      const ratio = Math.min(maxWidth / w, maxHeight / h);
      w = w * ratio;
      h = h * ratio;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imageBitmap, 0, 0, w, h);

    for (let quality of qualitySteps) {
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
      if (blob.size / 1024 <= targetKB) return blob;
    }

    return await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.1)); // fallback
  }

  function updatePreviews(updatedImages) {
    updatedImages.forEach(({ file, id }) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.getElementById(`img-preview-${id}`);
        if (div) {
          div.querySelector("img").src = e.target.result;
          div.querySelector("p").textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  downloadAllBtn.addEventListener("click", () => {
    images.forEach(({ file }) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  });
