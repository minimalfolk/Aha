const loadingMessages = [
    "Wait... your images are burning calories! 🏋️‍♂️🔥",
    "Hold on... pixel crunches in progress! 💪",
    "Your image is doing cardio... please wait. 🚴‍♂️📉",
    "Shedding extra KBs like a pro! 🏃‍♂️💨",
    "Compressing... one burpee at a time. 🤸‍♀️🖼️",
    "Sweating out those pixels! 💦📷",
    "Your image is in bootcamp mode! 🏋️‍♀️🔥",
    "Just a few more reps... 📸🏋️‍♂️",
    "Training your image for a lightweight future. 🧘‍♂️",
    "Chiseling down those bytes... 🪓📉"
  ];

  function showLoadingIndicator() {
    const randomIndex = Math.floor(Math.random() * loadingMessages.length);
    const loadingText = document.getElementById("loadingText");
    loadingText.textContent = loadingMessages[randomIndex];

    document.getElementById("loadingIndicator").hidden = false;
  }

  function hideLoadingIndicator() {
    document.getElementById("loadingIndicator").hidden = true;
  }

  // Example usage when compress button is clicked:
  document.getElementById("compressBtn").addEventListener("click", () => {
    showLoadingIndicator();

    // Simulate compression work with timeout
    setTimeout(() => {
      hideLoadingIndicator();
    }, 3000); // adjust as needed
  });
