import Head from 'next/head';

const IncreaseJpgSizePage = () => {
  return (
    <>
      <Head>
        <title>Increase JPG Size to 100KB – Online JPG Enlarger | ReducePic</title>
        <meta name="description" content="Enlarge your JPG file to exactly 100KB online. Fast, free and secure with ReducePic. No quality loss." />
        <link rel="canonical" href="https://www.reducepic.in/increase-jpg-to-100kb" /> {/* Adjust if path changes */}
        <meta name="robots" content="index, follow" />

        {/* OG tags for this specific page - can be simple or more detailed */}
        <meta property="og:title" content="Increase JPG Size to 100KB – Online JPG Enlarger | ReducePic" />
        <meta property="og:description" content="Need your JPG to be 100KB? Enlarge it quickly and for free with ReducePic's online tool." />
        <meta property="og:url" content="https://www.reducepic.in/increase-jpg-to-100kb" />
        <meta property="og:image" content="https://reducepic.in/image-compression-tool.jpg" /> {/* Use a relevant OG image */}
        <meta property="og:type" content="website" />

        {/* Twitter Card for this specific page */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Increase JPG Size to 100KB – Online JPG Enlarger | ReducePic" />
        <meta name="twitter:description" content="Enlarge JPG files to 100KB easily with ReducePic. Free, secure, and maintains quality." />
        <meta name="twitter:image" content="https://reducepic.in/image-compression-tool.jpg" /> {/* Use a relevant Twitter image */}

        {/* LD+JSON Script */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Increase JPG to 100KB",
            "description": "Enlarge your JPG file to exactly 100KB online. Fast, free and secure with ReducePic.",
            "url": "https://www.reducepic.in/increase-jpg-to-100kb"
            // Add more details like publisher, mainEntity (for an Article/Tool page) if desired
          }
        `}} />
      </Head>
      <header>
        <h1>Increase JPG File Size to 100KB</h1>
        <p>
          Need your JPG image to be exactly 100KB? Use our free tool to
          enlarge your image online – instantly, safely, and without losing
          quality.
        </p>
        <button className="cta-button">
          Upload JPG &rarr; Increase to 100KB
        </button>
      </header>

      <main>
        <h2>Make Your JPG Exactly 100KB – Online & Free</h2>
        <p>
          This tool helps you pad your JPG image to meet minimum file size
          requirements (like 100KB) for document uploads, online forms, and
          government portals.
        </p>

        <h3>Why Increase JPG Size?</h3>
        <ul>
          <li>Upload portals often reject images that are too small</li>
          <li>Maintain image integrity while meeting requirements</li>
          <li>Fast fixes for resumes, ID photos, or application scans</li>
        </ul>

        <h3>How to Enlarge JPG Image to 100KB</h3>
        <ol>
          <li>Click the upload button and select your JPG</li>
          <li>Our system adjusts the image by adding optimal padding</li>
          <li>Download your 100KB-ready JPG instantly</li>
        </ol>

        <h3>Common Use Cases</h3>
        <ul>
          <li>Government ID portals</li>
          <li>Online job applications</li>
          <li>University registration</li>
          <li>Client profile photo uploads</li>
        </ul>

        <section className="trust">
          <p>
            <strong>Trusted by 500,000+ users worldwide</strong>
          </p>
          <p>Your privacy is our priority – images are never stored or viewed.</p>
        </section>

        <section className="faq">
          <h2>Frequently Asked Questions</h2>
          <h3>Will the image quality be affected?</h3>
          <p>
            No. The tool adds optimized, non-destructive padding without
            compressing or distorting the original photo.
          </p>
          <h3>Is it really free?</h3>
          <p>Yes. ReducePic.in is a 100% free service with no sign-up required.</p>
          <h3>Can I shrink JPGs instead?</h3>
          <p>
            Yes! Try our <a href="/compress-jpg">JPG Compressor</a> for
            reducing file size.
          </p>
        </section>
      </main>

      <footer>
        <p>
          &copy; 2025 ReducePic. All rights reserved. |{' '}
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
      {/* <script defer src="/scripts/app.min.js"></script> */}
    </>
  );
};

export default IncreaseJpgSizePage;
