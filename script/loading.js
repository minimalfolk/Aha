// JavaScript
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

function getRandomMessage() {
  if (messagePool.length === 0) {
    messagePool = [...loadingMessages]; // Reset if all shown
  }
  const randomIndex = Math.floor(Math.random() * messagePool.length);
  const message = messagePool[randomIndex];
  messagePool.splice(randomIndex, 1); // Remove from pool to avoid repeats
  return message;
}

function showLoadingIndicator() {
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = getRandomMessage();
  document.getElementById("loadingIndicator").hidden = false;
}

function hideLoadingIndicator() {
  document.getElementById("loadingIndicator").hidden = true;
}

// Example usage when compress button is clicked
document.getElementById("compressBtn").addEventListener("click", () => {
  showLoadingIndicator();

  // Simulate compression delay
  setTimeout(() => {
    hideLoadingIndicator();
  }, 3000); // Adjust duration as needed
});
