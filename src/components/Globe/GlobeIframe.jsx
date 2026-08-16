import { useEffect, useRef, useState } from 'react';

export default function GlobeIframe({ territories = [], territoryCoordinates = {}, theme = 'dark' }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Convert territories to pins format
  const pins = territories
    .map((t) => {
      const coords = territoryCoordinates[t.territory];
      if (!coords) return null;
      return {
        lon: coords.lon,
        lat: coords.lat,
        name: coords.name || t.territory,
        address: `Revenue: $${t.amount.toLocaleString()}`,
        phone: `Territory: ${t.territory}`,
      };
    })
    .filter(Boolean);

  const isDark = theme === 'dark';

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      setLoading(false);
      setError(true);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, [loading]);

  // Create inline HTML with the Framer component
  const globeHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.2.0",
      "react/": "https://esm.sh/react@18.2.0/",
      "react-dom": "https://esm.sh/react-dom@18.2.0",
      "react-dom/": "https://esm.sh/react-dom@18.2.0/",
      "three": "https://esm.sh/three@0.157.0",
      "three/": "https://esm.sh/three@0.157.0/",
      "framer": "https://esm.sh/framer@2.4.1",
      "framer/": "https://esm.sh/framer@2.4.1/"
    }
  }
  </script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: ${isDark ? '#141414' : '#ffffff'} !important;
    }
    #root {
      width: 100%;
      height: 100%;
      background: ${isDark ? '#141414' : '#ffffff'};
    }
    canvas {
      background: ${isDark ? '#141414' : '#ffffff'} !important;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import Globe_Pins from 'https://framerusercontent.com/modules/roub8N1wwpfcb0zXsfNx/rRtXfPln7xCWbrrq68jF/Globe_Pins.js';

    const root = ReactDOM.createRoot(document.getElementById('root'));

    const pins = ${JSON.stringify(pins)};

    root.render(
      React.createElement(Globe_Pins, {
        autoRotateSpeed: 0.05,
        pointSize: ${isDark ? 0.008 : 0.012},
        pointColor: "${isDark ? '#00CCCC' : '#0099CC'}",
        tileDeg: ${isDark ? 1.5 : 0.5},
        fillColor: "${isDark ? '#00CCCC' : '#0099CC'}",
        fillOpacity: ${isDark ? 0.4 : 0.7},
        backOpacity: ${isDark ? 0.08 : 0.08},
        pins: pins,
        pinDotColor: "${isDark ? '#FF6B00' : '#FF8C00'}",
        pinSize: 0.018,
        haloScale: ${isDark ? 15 : 12},
        showLabels: false,
        labelColor: "${isDark ? '#FFFFFF' : '#000000'}",
        labelFont: {
          family: "Inter",
          style: "Regular"
        },
        labelFontSize: 13,
        pinPanelBgColor: "${isDark ? '#001A1A' : '#FFFFFF'}",
        pinPanelBgOpacity: ${isDark ? 0.95 : 0.95},
        pinPanelBorderColor: "${isDark ? '#00FFFF' : '#FF8C00'}",
        zoom: true,
        zoomMin: 1.5,
        zoomMax: 2.5,
        preloaderTheme: "${isDark ? 'Dark' : 'Light'}"
      })
    );
  </script>
</body>
</html>
  `;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Loading State */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 20,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(122, 225, 255, 0.3)',
                borderTopColor: '#7AE1FF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            ></div>
            <p style={{ color: '#7AE1FF', fontWeight: 500 }}>Loading Globe...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 20,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '400px',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#F87171', marginBottom: '8px' }}>
              Failed to Load Globe
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '16px' }}>
              The Framer component could not be loaded.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(false);
                setReloadKey((prev) => prev + 1);
              }}
              style={{
                padding: '8px 24px',
                background: 'rgba(122, 225, 255, 0.2)',
                border: '1px solid rgba(122, 225, 255, 0.5)',
                borderRadius: '8px',
                color: '#7AE1FF',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Globe iframe */}
      <iframe
        key={reloadKey}
        ref={iframeRef}
        srcDoc={globeHTML}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          background: 'transparent',
        }}
        title="Interactive Globe"
        sandbox="allow-scripts allow-same-origin allow-downloads"
        allow="autoplay; fullscreen"
      />

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
