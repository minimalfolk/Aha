// Functions adapted from script/main.js

export async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function compressImageToTarget(file, targetBytes, format) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = img.width;
  let height = img.height;
  const MAX_DIM = 2000; // Max dimension for initial resize
  const scale = Math.min(1, MAX_DIM / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  let qualityMin = 0.1, qualityMax = 0.9, quality = 0.7;
  let blob = null, lastGoodBlob = null, lastGoodDims = { width, height };

  // Try to meet target size by adjusting quality (up to 6 iterations)
  for (let i = 0; i < 6; i++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, quality));

    if (!blob) throw new Error('Compression failed: canvas.toBlob returned null');

    if (blob.size <= targetBytes) {
      lastGoodBlob = blob;
      lastGoodDims = { width, height };
      // If the current blob is within 10% of target, consider it good enough
      if (targetBytes - blob.size < targetBytes * 0.1) break;
      qualityMin = quality; // Increase quality for next try
    } else {
      qualityMax = quality; // Decrease quality for next try
    }
    quality = (qualityMin + qualityMax) / 2;
  }

  // Fallback: if still no good blob, try reducing dimensions
  while (!lastGoodBlob && width > 100 && height > 100) {
    width = Math.round(width * 0.9); // Reduce dimensions by 10%
    height = Math.round(height * 0.9);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    // Use a default quality for dimension reduction attempts
    blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 0.7));
    if (blob && blob.size <= targetBytes) {
      lastGoodBlob = blob;
      lastGoodDims = { width, height };
      break;
    }
  }

  if (!lastGoodBlob) throw new Error('Could not meet target size after multiple attempts.');

  const url = URL.createObjectURL(lastGoodBlob);
  return { blob: lastGoodBlob, url, dimensions: lastGoodDims };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function calculateReduction(originalSize, newSize) {
  return Math.round((1 - newSize / originalSize) * 100);
}

// Adapted from script/loading.js
const loadingMessages = [
  // Gym & Fitness themed
  "Images hitting the gym! 💪",
  "Pixel crunches on! 🤸‍♂️",
  "Cardio for your pics! 🚴‍♂️",
  "Dropping KBs fast! 🏃‍♂️💨",
  "Burpees for bytes! 🤸‍♀️",
  "Sweat mode: ON! 💦",
  "Bootcamp for pixels! 🔥",
  "Few reps left... 📸",
  "Yoga for your images! 🧘‍♂️",
  "Chiseling bytes down! 🪓",
  "Pixels squatting! 🍑",
  "Bench pressing pics! 🏋️‍♂️",
  "No-KB diet activated! 🥗",
  "KBs sweating bullets! 💦",
  "Pixel yoga stretch! 🧘",

  // Nerdy / Techie
  "Thanos snapped your size! 🫰",
  "Bytes making deals... 🤝",
  "Quantum compressing... ⚛️",
  "Zeros & ones shredded! 💻",
  "AI on a pixel diet! 🤖",
  "Algorithm grinding! 🧠",
  "Byte deflation in progress! 🧬",
  "Math flex mode! 📊",

  // Funny / Meme-Inspired
  "Image wants to slim down! 👙",
  "Pixels in therapy... 🛋️",
  "Glow-up loading... ✨",
  "Compressing like ex’s sorry! 💌",
  "No pixels harmed! 😇",
  "Image fasting mode! 🍽️",
  "Serving low-KB delight! 🍛"
];

let messagePool = [...loadingMessages];

export function getRandomLoadingMessage() {
  if (messagePool.length === 0) {
    messagePool = [...loadingMessages]; // Reset if all shown
  }
  const randomIndex = Math.floor(Math.random() * messagePool.length);
  const message = messagePool[randomIndex];
  messagePool.splice(randomIndex, 1); // Remove from pool to avoid repeats
  return message;
}
