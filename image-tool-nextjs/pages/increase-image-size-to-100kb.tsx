import Head from 'next/head';

const IncreaseImageSizePage = () => {
  return (
    <>
      <Head>
        <title>Increase Image Size to 100KB - ReducePic</title> {/* More specific title */}
        <meta name="description" content="Easily increase your image size to 100KB or any other specific size with ReducePic. Supports JPG, PNG, WebP, and more. Fast, free, and online." />
        <link rel="canonical" href="https://reducepic.in/increase-image-size-to-100kb" /> {/* Actual page URL */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="ReducePic India" />

        {/* Open Graph Meta - Adapted for this specific page */}
        <meta property="og:title" content="Increase Image Size to 100KB Online | ReducePic" />
        <meta property="og:description" content="Need your image to be a specific size like 100KB? Use ReducePic's online tool to increase image file sizes accurately and quickly." />
        <meta property="og:image" content="https://reducepic.in/image-compression-tool.jpg" /> {/* General OG image */}
        <meta property="og:url" content="https://reducepic.in/increase-image-size-to-100kb" />
        <meta property="og:type" content="website" />

        {/* Twitter Card - Adapted for this specific page */}
        <meta name="twitter:title" content="Increase Image Size to 100KB Online | ReducePic" />
        <meta name="twitter:description" content="Easily increase image file sizes to 100KB or your desired target. Free online tool by ReducePic." />
        <meta name="twitter:image" content="https://reducepic.in/image-compression-tool.jpg" /> {/* General Twitter image */}
        <meta name="twitter:card" content="summary_large_image" />

        {/* Favicons - Assuming they are linked in _app.js or layout.tsx globally */}

        {/* LD+JSON Scripts from original, assuming they are relevant or will be adapted */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": "https://reducepic.in/increase-image-size-to-100kb#webapp",
            "name": "ReducePic India – Increase Image Size Tool",
            "url": "https://reducepic.in/increase-image-size-to-100kb",
            "applicationCategory": "PhotoEditingApplication",
            "operatingSystem": "Web",
            "inLanguage": "en-IN",
            "description": "Increase image file size to a specific target like 100KB online. Supports JPG, PNG, GIF, WebP. Fast and free.",
            "offers": { "@type": "Offer", "price": "0.00", "priceCurrency": "INR" }
          }
        `}} />
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://reducepic.in" },
              { "@type": "ListItem", "position": 2, "name": "Increase Image Size to 100KB", "item": "https://reducepic.in/increase-image-size-to-100kb" }
            ]
          }
        `}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How can I increase an image's file size to 100KB?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Upload your image, enter '100' in the target size (KB) input, select your desired format, and our tool will process the image to meet the 100KB requirement."
                }
              },
              {
                "@type": "Question",
                "name": "Will increasing image size affect quality?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our tool aims to meet the target file size by adding padding or adjusting metadata, which typically does not degrade the visual quality of the image content itself. However, significantly increasing size might involve techniques that don't add new detail."
                }
              },
              {
                "@type": "Question",
                "name": "Is this tool free to use for increasing image size?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, ReducePic's image size modification tools, including increasing size to a specific target like 100KB, are completely free to use."
                }
              }
            ]
          }
        `}} />
      </Head>
      <header className="sticky-header">
        <div className="logo" onClick={() => (window.location.href = '/')}>
          ReducePic
        </div>
        <button
          className="hamburger-menu"
          aria-label="Open navigation menu"
          onClick={() => toggleMenu()}
        >
          ☰
        </button>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="/compress-images">Compress Images</a>
          <a href="/convert-to-jpg">Convert to JPG</a>
          <a href="/convert-to-webp">Convert to WebP</a>
          <a href="/convert-to-gif">Convert to GIF</a>
          <a href="/resize-image-20kb">Resize to 20KB</a>
          <a href="/resize-image-50kb">Resize to 50KB</a>
          <a href="/resize-image-100kb">Resize to 100KB</a>
        </nav>
      </header>

      <main>
        <section className="compress-image">
          <h1>Resize Your Image</h1>

          {/* Upload Container */}
          <div className="upload-container">
            <div className="upload-box" id="uploadBox">
              <i className="fas fa-cloud-upload-alt"></i>
              <h3>Drop your images here</h3>
              <p>
                or <span>browse files</span>
              </p>
              <input type="file" id="imageInput" accept="image/*" multiple />
            </div>
            <div className="supported-formats">
              <p>Supports: JPG, PNG, WebP | Max 50MB</p>
            </div>
          </div>

          {/* Original Image Preview */}
          <figure
            id="originalPreview"
            className="preview-container"
            style={{ display: 'none' }}
          >
            <img id="originalImage" alt="Original image preview" loading="lazy" />
            <figcaption id="originalDetails"></figcaption>
          </figure>

          {/* Compression Options */}
          <div className="compression-options">
            <label htmlFor="targetSize">Target Size (KB):</label>
            <input
              type="number"
              id="targetSize"
              min="10"
              max="5000"
              step="100"
              placeholder="Enter size in KB"
            />

            <label htmlFor="formatSelect">Output Format:</label>
            <select id="formatSelect">
              <option value="jpg">JPG</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="gif">GIF</option>
              <option value="bmp">BMP</option>
            </select>

            <button id="compressBtn" disabled>
              Reduce Now
            </button>
          </div>

          {/* Loading Indicator */}
          <div id="loadingIndicator" hidden>
            <p>Compressing your image...</p>
          </div>

          {/* Compressed Images Preview */}
          <figure
            id="compressedPreview"
            className="preview-container"
            style={{ display: 'none' }}
          >
            <img
              id="compressedImage"
              alt="Compressed image preview"
              loading="lazy"
            />
            <figcaption id="compressedDetails"></figcaption>
            <button id="downloadBtn" disabled>
              Download Image
            </button>
          </figure>
        </section>

        <section className="seo-copy">
          <p>
            Need images to a specific size? ReducePic lets you resize JPG,
            PNG, GIF, WebP, and BMP images online by setting your{' '}
            <strong>exact target size</strong> in KB or dimensions. Whether for
            passport photos, job forms, websites, or social media—get the your
            desire size you need in one click.
          </p>
        </section>

        <section className="how-it-works">
          <h2>Resize image by step by step:</h2>
          <ol>
            <li>
              <strong>Upload</strong> your JPG, PNG, or other image file.
            </li>
            <li>
              <strong>Enter your target size</strong> (in KB or width & height).
            </li>
            <li>
              <strong>Click “compress”</strong> and view preview and download
              option for your resized image.
            </li>
          </ol>
        </section>

        <section className="faq">
          <h2>Got Questions?</h2>

          <details>
            <summary>Why use ReducePic.in?</summary>
            <p>
              It’s fast, free, and private. Images never leave your browser,
              and quality is preserved.
            </p>
          </details>

          <details>
            <summary>Can I resize multiple images?</summary>
            <p>
              Yes, you can upload and resize many images at once using our bulk
              feature.
            </p>
          </details>

          <details>
            <summary>What's the max image size I can upload?</summary>
            <p>
              You can upload images up to 50MB each—great for high-res files.
            </p>
          </details>

          <details>
            <summary>Can I set custom sizes or file targets?</summary>
            <p>
              Yes, enter your desired width, height, or target file size in KB
              or MB.
            </p>
          </details>

          <details>
            <summary>Which devices and formats are supported?</summary>
            <p>
              It works on all devices and supports JPG, PNG, WebP, GIF, and
              BMP.
            </p>
          </details>
        </section>

        <section className="internal-links">
          <h2>Resize Images to Specific Sizes</h2>
          <ul>
            <li>
              <a href="/resize-to-10kb">Resize to 10 KB</a>
            </li>
            <li>
              <a href="/resize-to-20kb">Resize to 20 KB</a>
            </li>
            <li>
              <a href="/resize-to-50kb">Resize to 50 KB</a>
            </li>
            <li>
              <a href="/resize-to-100kb">Resize to 100 KB</a>
            </li>
            <li>
              <a href="/resize-to-200kb">Resize to 200 KB</a>
            </li>
            <li>
              <a href="/resize-to-250kb">Resize to 250 KB</a>
            </li>
            <li>
              <a href="/resize-to-300kb">Resize to 300 KB</a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col footer-about">
              <div className="footer-logo">
                <i className="fas fa-compress-alt" aria-hidden="true"></i>
                <span>ReducePic India</span>
              </div>
              <p>
                ReducePic lets you resize and compress JPG images online
                without quality loss. Ideal for students, professionals, and
                web or government use.
              </p>
              <div className="social-links">
                <a
                  href="https://instagram.com/resizyindia"
                  target="_blank"
                  rel="noopener"
                  aria-label="ReducePic on Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a
                  href="https://github.com/reducepic"
                  target="_blank"
                  rel="noopener"
                  aria-label="ReducePic on GitHub"
                >
                  <i className="fab fa-github"></i>
                </a>
                <a
                  href="https://www.linkedin.com/company/reducepic"
                  target="_blank"
                  rel="noopener"
                  aria-label="ReducePic on LinkedIn"
                >
                  <i className="fab fa-linkedin"></i>
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h3>Tools</h3>
              <ul>
                <li>
                  <a href="/">Reduce Any Image</a>
                </li>
                <li>
                  <a href="./resize-to-20kb">Resize to 20Kb</a>
                </li>
                <li>
                  <a href="/compress-jpg">Compress JPG Image</a>
                </li>
                <li>
                  <a href="/compress-png">Compress PNG File</a>
                </li>
                <li>
                  <a href="/resize-image">Resize Image Dimensions</a>
                </li>
                <li>
                  <a href="/compress-webp">Compress WebP Image</a>
                </li>
                <li>
                  <a href="/resize-jpg">Resize JPG Online</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3>Resources</h3>
              <ul>
                <li>
                  <a href="./blog">Blog & Guides</a>
                </li>
                <li>
                  <a href="#tutorials">How-To Tutorials</a>
                </li>
                <li>
                  <a href="#faq">FAQs</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3>Company</h3>
              <ul>
                <li>
                  <a href="./about">About Us</a>
                </li>
                <li>
                  <a href="./contact">Contact</a>
                </li>
                <li>
                  <a href="./sitemap">Sitemap</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h3>Legal</h3>
              <ul>
                <li>
                  <a href="./privacy">Privacy Policy</a>
                </li>
                <li>
                  <a href="./terms">Terms & Conditions</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              &copy; <span id="currentYear"></span> ReducePic - Made In India🇮🇳
            </p>
          </div>
        </div>
      </footer>
      {/*
      <script>
        document.getElementById("currentYear").textContent = new Date().getFullYear();
      </script>

      <script src="script/main.js" defer></script>
      <script src="script/nav.js" defer></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      */}
    </>
  );
};

export default IncreaseImageSizePage;
