<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
<script>
const previewContainer = document.getElementById("preview-container");
const downloadAllContainer = document.getElementById("download-all-container");
const uploadInput = document.getElementById("imageUpload");
const processBtn = document.getElementById("process-btn");
const targetSizeInput = document.getElementById("target-size");
const downloadAllBtn = document.getElementById("downloadAllBtn");

let imageDataList = [];

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
        const format = file.name.split(".").pop().toUpperCase();

        imageDataList.push({
          index,
          name: file.name,
          format,
          width,
          height,
          originalSize,
          file,
          dataURL: e.target.result,
          compressedBlob: null
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
              <p><strong>Size:</strong> ${originalSize} KB → <span id="compressed-${index}">Pending</span> KB</p>
              <a id="download-${index}" class="download-btn" style="display:none;">Download</a>
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

processBtn.addEventListener("click", async () => {
  const targetKB = parseInt(targetSizeInput.value);
  if (!targetKB || targetKB <= 0) {
    alert("Please enter a valid target size in KB.");
    return;
  }

  const zip = new JSZip();
  for (const data of imageDataList) {
    const img = new Image();
    img.src = data.dataURL;
    await new Promise(resolve => {
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        let quality = 0.9;
        let blob;

        while (true) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          blob = await new Promise(res => canvas.toBlob(res, data.file.type, quality));
          const sizeKB = blob.size / 1024;

          if (sizeKB <= targetKB || (quality < 0.4 && width < 200)) break;

          quality -= 0.1;
          if (quality < 0.5) {
            width *= 0.9;
            height *= 0.9;
          }
        }

        const newName = data.name.replace(/\.[^/.]+$/, '') + `_${targetKB}KB.${data.format.toLowerCase()}`;
        const url = URL.createObjectURL(blob);

        document.getElementById(`compressed-${data.index}`).innerText = `${(blob.size / 1024).toFixed(1)}`;
        const downloadBtn = document.getElementById(`download-${data.index}`);
        downloadBtn.href = url;
        downloadBtn.download = newName;
        downloadBtn.style.display = "inline-block";
        downloadBtn.innerText = "Download";

        zip.file(newName, blob);
        resolve();
      };
    });
  }

  downloadAllBtn.onclick = () => {
    zip.generateAsync({ type: "blob" }).then(content => {
      saveAs(content, "resized_images.zip");
    });
  };
});
</script>
