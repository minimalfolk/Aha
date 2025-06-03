import Head from 'next/head';

const Custom404 = () => {
  return (
    <>
      <Head>
        <title>Page Not Found | ReducePic.in</title>
        <meta name="description" content="The page you are looking for could not be found on ReducePic.in. Let's get you back on track to resizing your images!" />
        <meta name="robots" content="noindex" />
      </Head>
      {/* Animated background bubbles */}
      <div className="bubbles">
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
        <div className="bubble"></div>
      </div>

      <div className="error-container">
        <div className="error-content">
          <div className="error-graphic">
            <img
              src="https://cdn-icons-png.flaticon.com/512/755/755014.png"
              alt="404 Error"
              className="error-image broken"
              id="brokenImage"
            />
          </div>

          <h1 className="error-code">404</h1>
          <h2 className="error-title">Oops! Image Not Found</h2>
          <p className="error-message">
            The page you're looking for seems to have been compressed out of
            existence. Don't worry, we'll help you find your way back to
            smaller file sizes!
          </p>
          <a href="/" className="btn">
            Back to ReducePic.in
          </a>
        </div>
      </div>

      {/*
      <script>
        // Interactive animation for the broken image
        const brokenImage = document.getElementById('brokenImage');
        let isBroken = true;

        brokenImage.addEventListener('click', function() {
          if (isBroken) {
            this.classList.remove('broken');
            this.src = "https://cdn-icons-png.flaticon.com/512/3176/3176158.png";
            isBroken = false;
          } else {
            this.classList.add('broken');
            this.src = "https://cdn-icons-png.flaticon.com/512/755/755014.png";
            isBroken = true;
          }
        });

        // Add floating compression icons that follow mouse
        document.addEventListener('DOMContentLoaded', function() {
          const body = document.querySelector('body');
          const colors = ['#4361ee', '#4895ef', '#3a56d4', '#3f37c9'];

          for (let i = 0; i < 12; i++) {
            const icon = document.createElement('div');
            icon.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 7H16M8 11H16M8 15H12M20 4H4V20H20V4Z" stroke="${colors[i%4]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
            icon.style.position = 'absolute';
            icon.style.width = '24px';
            icon.style.height = '24px';
            icon.style.opacity = '0.7';
            icon.style.pointerEvents = 'none';
            icon.style.transform = `translate(${Math.random() * window.innerWidth}px, ${Math.random() * window.innerHeight}px)`;
            icon.style.transition = 'transform 0.5s ease-out';
            icon.style.zIndex = '1';
            body.appendChild(icon);

            // Make icons follow mouse with delay
            document.addEventListener('mousemove', function(e) {
              setTimeout(() => {
                const x = e.clientX + (Math.random() * 40 - 20);
                const y = e.clientY + (Math.random() * 40 - 20);
                icon.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`;
              }, i * 50);
            });
          }
        });
      </script>
      */}
    </>
  );
};

export default Custom404;
