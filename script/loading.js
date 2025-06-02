// JavaScript
const loadingMessages = [
  // Gym & Fitness themed
  "Wait... your images are burning calories! 🏋️‍♂️🔥",
  "Hold on... pixel crunches in progress! 💪",
  "Your image is doing cardio... please wait. 🚴‍♂️📉",
  "Shedding extra KBs like a pro! 🏃‍♂️💨",
  "Compressing... one burpee at a time. 🤸‍♀️🖼️",
  "Sweating out those pixels! 💦📷",
  "Your image is in bootcamp mode! 🏋️‍♀️🔥",
  "Just a few more reps... 📸🏋️‍♂️",
  "Training your image for a lightweight future. 🧘‍♂️",
  "Chiseling down those bytes... 🪓📉",
  "Pixels are doing squats… 🍑📉",
  "Spotting your image on the bench press… 🏋️‍♂️🪑",
  "On a no-KB diet… 🥗📷",
  "KBs are sweating bullets… 💦💾",
  "Pixel yoga in progress… breathing out excess size. 🧘",

  // Nerdy / Techie
  "Thanos just snapped half your file size. 🫰📁",
  "Bits and bytes negotiating a slimmer deal... 🤝📉",
  "Your image is entering the quantum compression zone... ⚛️🧪",
  "Zeroes and ones getting shredded. 💻🏋️‍♂️",
  "Deploying AI pixel diet protocol... 🤖🥗",
  "Running compression algorithm... please don’t blink. 👀⌛",
  "Initiating byte deflation sequence… 🧬📉",
  "Math is happening... real hard. 📊🧠",

  // Funny / Meme-Inspired
  "Image: 'I want to look slim in front-end.' 👙📷",
  "Hang tight... pixels are in therapy. 🛋️📸",
  "Even images need a glow-up. ✨🖼️",
  "Compressing like your ex’s apology: late but effective. 💌📉",
  "Don’t worry… no pixels were harmed in this process. 😇",
  "Image doing intermittent fasting... 0 KB incoming. 🍽️📷",
  "Serving a hot plate of low-KB deliciousness! 🍛📉"
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
