<script>
const previewContainer = document.getElementById("preview-container");
const downloadAllContainer = document.getElementById("download-all-container");
const uploadInput = document.getElementById("imageUpload");

let imageDataList = []; // Store original and "compressed" data

uploadInput.addEventListener("change", function (event) {
  const files = Array.from(event.target.files);
  previewContainer.innerHTML = "";
  imageDataList = [];

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.src = e.target.result;

      img.onload = function () {
        const width = img.width;
        const height = img.height;
        const originalSize = (file.size / 1024).toFixed(2);
        const compressedSize = (originalSize * 0.2).toFixed(2); // Simulated
        const format = file.name.split(".").pop().toUpperCase();

        imageDataList.push({
          name: file.name,
          format: format,
          width,
          height,
          originalSize,
          compressedSize,
          url: e.target.result
        });

        const imageHTML = `
          <div class="image-preview" id="preview-${index}">
            <div class="image-thumbnail">
              <img src="${e.target.result}" alt="${file.name}" />
            </div>
            <div class="image-details">
              <p><strong>Name:</strong> ${file.name}</p>
              <p><strong>Format:</strong> ${format}</p>
              <p><strong>Dimensions:</strong> ${width}x${height}</p>
            </div>
            <div class="image-sizes">
              <p><strong>Size:</strong></p>
              <p>${originalSize} KB → <span id="compressed-${index}">${compressedSize}</span> KB</p>
              <a href="${e.target.result}" download="${file.name}" class="download-btn">Download</a>
            </div>
          </div>
        `;
        previewContainer.insertAdjacentHTML("beforeend", imageHTML);

        if (imageDataList.length === files.length) {
          downloadAllContainer.style.display = "block";
        }
      };
    };
    reader.readAsDataURL(file);
  });
});
</script>
