import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  loadImage,
  compressImageToTarget,
  formatFileSize,
  calculateReduction,
  getRandomLoadingMessage,
} from '../utils/imageUtils';

const HomePage = () => {
  // ... (other state variables remain the same)
  const [images, setImages] = useState([]); // Holds original File objects
  const [compressedFilesData, setCompressedFilesData] = useState([]); // Holds { name, blob } for zipping
  const [previews, setPreviews] = useState([]); // Holds data for rendering previews
  const [targetSizeKB, setTargetSizeKB] = useState('100'); // Target size in KB
  const [outputFormat, setOutputFormat] = useState('jpg'); // Output format
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) =>
          console.log('Service Worker registered with scope:', registration.scope)
        )
        .catch((error) =>
          console.error('Service Worker registration failed:', error)
        );
    }
  }, []);

  const handleImageInputChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setImages(files);
    setCompressedFilesData([]); // Reset compressed files

    const newPreviews = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.match('image.*')) {
        newPreviews.push({
          id: Date.now() + i, // Unique ID for key prop
          originalName: file.name,
          error: 'Not an image file.',
        });
        continue;
      }
      try {
        const img = await loadImage(file);
        newPreviews.push({
          id: Date.now() + i,
          originalSrc: URL.createObjectURL(file),
          originalName: file.name,
          originalSize: file.size,
          originalDimensions: { width: img.width, height: img.height },
          fileObject: file, // Store file object for compression
        });
      } catch (err) {
        console.error('Error loading image for preview:', err);
        newPreviews.push({
          id: Date.now() + i,
          originalName: file.name,
          error: 'Failed to load image preview.',
        });
      }
    }
    setPreviews(newPreviews);
  };

  const handleCompressClick = async () => {
    if (images.length === 0 || !targetSizeKB || isNaN(parseInt(targetSizeKB))) {
      // Basic validation
      alert('Please select images and enter a valid target size.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage(getRandomLoadingMessage());

    const targetBytes = parseInt(targetSizeKB) * 1024;
    const newCompressedFilesData = [];
    const updatedPreviews = [...previews];

    for (let i = 0; i < updatedPreviews.length; i++) {
      const preview = updatedPreviews[i];
      if (!preview.fileObject || preview.error) { // Skip if not a valid image or already errored
        newCompressedFilesData.push(null); // Keep array length consistent
        continue;
      }

      try {
        const { blob, url, dimensions } = await compressImageToTarget(
          preview.fileObject,
          targetBytes,
          outputFormat
        );
        updatedPreviews[i] = {
          ...preview,
          compressedSrc: url,
          compressedSize: blob.size,
          compressedDimensions: dimensions,
          reduction: calculateReduction(preview.originalSize, blob.size),
          compressedBlob: blob, // Store blob for single download
        };
        newCompressedFilesData.push({ name: `compressed_${preview.originalName.replace(/\.[^/.]+$/, `.${outputFormat}`)}`, blob });
      } catch (err) {
        console.error('Error compressing image:', err);
        updatedPreviews[i] = { ...preview, error: err.message || 'Compression failed' };
        newCompressedFilesData.push(null);
      }
    }
    setPreviews(updatedPreviews);
    setCompressedFilesData(newCompressedFilesData.filter(Boolean)); // Filter out nulls
    setIsLoading(false);
  };

  const handleDownloadZipClick = async () => {
    if (compressedFilesData.length === 0) return;

    setIsZipping(true);
    setLoadingMessage("Zipping files... 🤐"); // Specific message for zipping

    try {
      const zip = new JSZip();
      const folder = zip.folder('compressed_images');
      compressedFilesData.forEach((file) => {
        if (file && file.blob) {
          folder.file(file.name, file.blob);
        }
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = 'compressed_images.zip';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(zipUrl);
      a.remove();
    } catch (err) {
      console.error('Error creating ZIP:', err);
      alert(`Failed to create ZIP: ${err.message}`);
    }
    setIsZipping(false);
  };

  const handleRemoveImage = (idToRemove) => {
    const newImages = images.filter((img, i) => previews.find(p=>p.id === idToRemove && p.fileObject === img ? false : true)); // This logic might need refinement if IDs don't map directly to images array
    const newPreviews = previews.filter((p) => p.id !== idToRemove);
    const newCompressedFilesData = compressedFilesData.filter((cf, i) => previews.find(p=>p.id === idToRemove && p.compressedBlob === cf?.blob ? false: true ) );


    setImages(newImages);
    setPreviews(newPreviews);
    setCompressedFilesData(newCompressedFilesData);


    // If all previews are removed, reset file input
    if (newPreviews.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDownloadImage = (idToDownload) => {
    const preview = previews.find(p => p.id === idToDownload);
    if (preview && preview.compressedSrc && preview.compressedBlob) {
      const a = document.createElement('a');
      a.href = preview.compressedSrc;
      a.download = `compressed_${preview.originalName.replace(/\.[^/.]+$/, `.${outputFormat}`)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  // Function to simulate toggleMenu, replace with actual implementation if needed
  const toggleMenu = () => console.log("Menu toggle clicked");


  return (
    <>
      <Head>
        <title>Resize Image Sizes in Bulk – JPG, GIF, PNG & WebP</title>
        <meta name="description" content="Resize and convert JPG, PNG, GIF, and WebP images online in bulk in one click. ReducePic is your fast, free image resizer—perfect size, every time." />
        <meta name="keywords" content="image compressor, resize image, reduce image size, compress JPG PNG GIF, online image resizer, image shrinker, photo optimizer, image resizer India" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph Meta */}
        <meta property="og:title" content="Resize Image Sizes in Bulk – JPG, GIF, PNG & WebP" />
        <meta property="og:description" content="Resize and convert JPG, PNG, GIF, and WebP images online in bulk in one click. ReducePic is your fast, free image resizer—perfect size, every time." />
        <meta property="og:image" content="https://reducepic.in/image-compression-tool.jpg" />
        <meta property="og:url" content="https://reducepic.in" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:title" content="Resize Image Sizes in Bulk – JPG, GIF, PNG & WebP" />
        <meta name="twitter:description" content="Resize and convert JPG, PNG, GIF, and WebP images online in bulk in one click. ReducePic is your fast, free image resizer—perfect size, every time." />
        <meta name="twitter:image" content="https://reducepic.in/image-compression-tool.jpg" />
        <meta name="twitter:card" content="summary_large_image" />

        <meta name="google-site-verification" content="tFSw_3krhCp7xBursD0kPYXo-twhTfaW73wMX2YPMKQ" />
        <link rel="canonical" href="https://reducepic.in" /> {/* Placeholder, update with actual domain */}

        {/* Favicons - Assuming they will be in public/assets/ */}
        <link rel="icon" href="/assets/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />

        {/* LD+JSON Scripts */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "url": "https://reducepic.in",
            "name": "ReducePic India",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://reducepic.in/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        `}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": "https://reducepic.in/#webapp",
            "name": "ReducePic India – Resize JPG, GIF, PNG and WebP Image in bulk",
            "url": "https://reducepic.in",
            "applicationCategory": "PhotoEditingApplication",
            "operatingSystem": "Web",
            "inLanguage": "en-IN",
            "description": "Resize and convert JPG, PNG, GIF, and WebP images online in bulk. ReducePic is your fast, free image resizer—perfect size, every time.",
            "screenshot": "https://reducepic.in/reduce-image-size-tool.jpg",
            "offers": {
              "@type": "Offer",
              "price": "0.00",
              "priceCurrency": "INR"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "1500"
            },
            "interactionStatistic": {
              "@type": "InteractionCounter",
              "interactionType": { "@type": "http://schema.org/UseAction" },
              "userInteractionCount": 250000
            },
            "publisher": {
              "@type": "Organization",
              "name": "ReducePic India",
              "url": "https://reducepic.in",
              "logo": {
                "@type": "ImageObject",
                "url": "https://reducepic.in/logo.png"
              }
            },
            "sameAs": [
              "https://twitter.com/reducepic",
              "https://www.instagram.com/reducepic.in",
              "https://www.linkedin.com/company/reducepic"
            ]
          }
        `}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://reducepic.in"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://reducepic.in/blog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Contact",
                "item": "https://reducepic.in/contact"
              }
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
                "name": "How can I reduce image size online for free?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Upload your images, choose your target size, and click 'Reduce Now' to download the optimized image instantly — no sign-up."
                }
              },
              {
                "@type": "Question",
                "name": "Does ReducePic maintain image quality after compression?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. ReducePic uses smart compression algorithms to reduce file size while keeping your image visually sharp and clear."
                }
              },
              {
                "@type": "Question",
                "name": "Is there a limit to how many images I can compress?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, there are no limits. You can compress as many images as you like for free, without creating an account."
                }
              },
              {
                "@type": "Question",
                "name": "Can I use ReducePic on mobile devices?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. ReducePic is mobile-friendly and works smoothly across all devices and modern browsers."
                }
              }
            ]
          }
        `}} />
        {/* Google Tag Manager script itself should be handled differently in Next.js, often via _document.js or a third-party library */}
      </Head>
      {/* Google Tag Manager (noscript) - Consider moving to _document.js or using a Next.js specific solution */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        ></iframe>
      </noscript>

      <header className="sticky-header">
        <div className="logo" onClick={() => (window.location.href = '/')}>
          ReducePic
        </div>
        <button
          className="hamburger-menu"
          aria-label="Open navigation menu"
          onClick={toggleMenu}
        >
          ☰
        </button>
        <nav className="nav-links" aria-label="Main navigation">
          {/* Navigation links - consider using Next/Link for client-side navigation */}
          <a href="/convert-image">Convert Images</a>
          <a href="/increase-image-size">Increase Image Size</a>
          {/* ... other links */}
        </nav>
      </header>

      <main>
        <section className="compress-image">
          <h1>Resize Your Image</h1>

          <div className="upload-container">
            <div className="upload-box" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <i className="fas fa-cloud-upload-alt"></i>
              <h3>Drop your images here</h3>
              <p>
                or <span>browse files</span>
              </p>
              <input
                type="file"
                id="imageInput" // Retained for label association if any, but direct interaction via ref
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleImageInputChange}
                style={{ display: 'none' }} // Hidden as the div is the clickable area
              />
            </div>
            <div className="supported-formats">
              <p>Supports: JPG, PNG, WebP | Max 50MB</p>
            </div>
          </div>

          <label htmlFor="formatSelect">Output Format:</label>
          <select
            id="formatSelect"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
          >
            <option value="jpg">JPG</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="gif">GIF</option>
            <option value="bmp">BMP</option>
          </select>

          <div className="compression-options">
            <label htmlFor="targetSize">Target Size (KB):</label>
            <input
              type="number"
              id="targetSize"
              min="10"
              max="5000"
              step="100"
              placeholder="Enter size in KB"
              value={targetSizeKB}
              onChange={(e) => setTargetSizeKB(e.target.value)}
            />
            <button
              id="compressBtn"
              onClick={handleCompressClick}
              disabled={images.length === 0 || isLoading || isZipping}
            >
              {isLoading ? 'Compressing...' : 'Compress'}
            </button>
          </div>

          { (isLoading || isZipping) && (
            <div id="loadingIndicator"> {/* Retained ID for styling, content is dynamic */}
              <p>{loadingMessage}</p>
            </div>
          )}

          <div id="previewContainer"> {/* Retained ID for styling */}
            {previews.map((p, index) => (
              <div key={p.id || index} className="preview-item"> {/* Ensure unique key */}
                <div className="preview-info original-preview">
                  {p.originalSrc && <img src={p.originalSrc} alt={`Original ${p.originalName}`} />}
                  <p>Name: {p.originalName}</p>
                  {p.originalSize && <p>Size: {formatFileSize(p.originalSize)}</p>}
                  {p.originalDimensions && <p>Dimensions: {p.originalDimensions.width}x{p.originalDimensions.height}</p>}
                </div>
                {p.compressedSrc && (
                  <div className="preview-info compressed-preview">
                    <img src={p.compressedSrc} alt={`Compressed ${p.originalName}`} />
                    <p>Compressed Size: {formatFileSize(p.compressedSize)}</p>
                    {p.compressedDimensions && <p>New Dimensions: {p.compressedDimensions.width}x{p.compressedDimensions.height}</p>}
                    {typeof p.reduction === 'number' && <p>Reduction: {p.reduction}%</p>}
                    <button onClick={() => handleDownloadImage(p.id)} disabled={isLoading || isZipping}>
                      Download Compressed
                    </button>
                  </div>
                )}
                {p.error && <p className="error-message">Error: {p.error}</p>}
                <button onClick={() => handleRemoveImage(p.id)} disabled={isLoading || isZipping}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {compressedFilesData.length > 0 && !isLoading && (
            <button
              onClick={handleDownloadZipClick}
              disabled={isZipping}
              className="download-zip-btn"
            >
              {isZipping ? 'Zipping...' : 'Download All as ZIP'}
            </button>
          )}

        </section>
        {/* Other sections from original HTML can remain here */}
        <section className="features">
          <h2>Why Choose ReducePic?</h2>
          <p>
            ReducePic is designed to simplify your image compression needs
            without compromising quality. Whether you're a student submitting
            online forms, a developer optimizing site performance, or a content
            creator sharing on social media, ReducePic adapts to your needs
            effortlessly.
          </p>
          <ul>
            <li>
              <strong>Lossless Compression:</strong> Reduce image file sizes
              while preserving clarity and detail. Ideal for printing, web
              publishing, or portfolio sharing.
            </li>
            <li>
              <strong>Multiple Format Support:</strong> Compatible with JPG,
              JPEG, PNG, GIF, and BMP formats. No need for conversions before
              uploading.
            </li>
            <li>
              <strong>Free and Secure:</strong> Enjoy unlimited usage at zero
              cost. No login or registration required. Your files are never
              stored or shared.
            </li>
            <li>
              <strong>Cross-Platform Compatibility:</strong> Fully responsive
              interface optimized for desktops, tablets, and smartphones.
            </li>
            <li>
              <strong>AI-Powered Optimization:</strong> Our smart compression
              algorithm intelligently reduces file size while retaining visual
              integrity.
            </li>
            <li>
              <strong>Form & Web Ready:</strong> Perfect for uploading images to
              government portals, school applications, websites, blogs, and
              social media platforms like Instagram and WhatsApp.
            </li>
          </ul>
        </section>

        <section className="faq">
          <h2>Got Questions?</h2>

          <details>
            <summary>How can I reduce image size online for free?</summary>
            <p>
              Step 1 – Upload images. <br />
              Step 2 – Set your target size. <br />
              Step 3 – Click “Reduce Now” and download—all images free, no
              sign-up.
            </p>
          </details>

          <details>
            <summary>Does ReducePic maintain image quality?</summary>
            <p>
              Yes, ReducePic compresses images while keeping them visually
              sharp using smart optimization algorithms.
            </p>
          </details>

          <details>
            <summary>
              Is there a limit to how many images I can compress?
            </summary>
            <p>
              No limits. Compress as many images as you like—completely free.
            </p>
          </details>

          <details>
            <summary>Can I use ReducePic on mobile?</summary>
            <p>
              Yes, it's fully mobile-friendly and works on all modern devices
              and browsers.
            </p>
          </details>
        </section>

        <section className="internal-links">
          <h2>Resize Images to Specific Sizes</h2>
          <ul>
            <li><a href="/resize-to-10kb">Resize to 10 KB</a></li>
            <li><a href="/resize-to-20kb">Resize to 20 KB</a></li>
            <li><a href="/resize-to-50kb">Resize to 50 KB</a></li>
            <li><a href="/resize-to-100kb">Resize to 100 KB</a></li>
            <li><a href="/resize-to-200kb">Resize to 200 KB</a></li>
            <li><a href="/resize-to-250kb">Resize to 250 KB</a></li>
            <li><a href="/resize-to-300kb">Resize to 300 KB</a></li>
          </ul>
        </section>
      </main>

      <footer className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col footer-about">
              <div className="footer-logo">
                <i className="fas fa-compress-alt" aria-hidden="true"></i>
                <span>ReducePic</span>
              </div>
              <p>
                ReducePic is your go-to tool for fast, free, and high-quality
                image compression and resizing.
              </p>
              <div className="social-links">
                  <a href="https://instagram.com/resizyindia" target="_blank" rel="noopener noreferrer" aria-label="ReducePic on Instagram">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="https://github.com/reducepic" target="_blank" rel="noopener noreferrer" aria-label="ReducePic on GitHub">
                    <i className="fab fa-github"></i>
                  </a>
                  <a href="https://www.linkedin.com/company/reducepic" target="_blank" rel="noopener noreferrer" aria-label="ReducePic on LinkedIn">
                    <i className="fab fa-linkedin"></i>
                  </a>
              </div>
            </div>
            <div className="footer-col">
              <h3>Tools</h3>
              <ul>
                <li><a href="/">Reduce Any Image</a></li>
                <li><a href="/resize-to-20kb">Resize to 20Kb</a></li>
                <li><a href="#formats">Supported Formats</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h3>Resources</h3>
              <ul>
                <li><a href="/blog">Blog & Guides</a></li>
                <li><a href="#tutorials">How-To Tutorials</a></li>
                <li><a href="#faq">FAQs</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h3>Company</h3>
              <ul>
                <li><a href="/about">About Us</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/sitemap">Sitemap</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h3>Legal</h3>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms & Conditions</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; <span id="currentYear">{new Date().getFullYear()}</span> ReducePic - Made In India🇮🇳</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default HomePage;
