import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import './GlobeWithPings.css';

/**
 * Globe component with markers/pins using react-globe.gl
 */
const GlobeWithPings = ({ className = '', territories = [], territoryCoordinates = {}, theme = 'dark' }) => {
  const globeEl = useRef();

  // Convert territories to points data for react-globe.gl
  const pointsData = React.useMemo(() => {
    if (!territories || !Array.isArray(territories)) return [];

    return territories
      .map((t) => {
        const coords = territoryCoordinates[t.territory];
        if (!coords) return null;

        return {
          lat: coords.lat,
          lng: coords.lon,
          size: Math.log(t.amount + 1) * 0.1,
          color: theme === 'dark' ? '#7AE1FF' : '#0C7A9E',
          label: `${coords.name || t.territory}: $${t.amount.toLocaleString()}`,
          amount: t.amount,
          territory: coords.name || t.territory,
        };
      })
      .filter(Boolean);
  }, [territories, territoryCoordinates, theme]);

  useEffect(() => {
    if (globeEl.current) {
      // Auto-rotate
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;

      // Point the camera at the initial position
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`globe-with-pings ${className}`} style={{ width: '100%', height: '600px' }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl={isDark ? '//unpkg.com/three-globe/example/img/night-sky.png' : null}
        // Points for territories
        pointsData={pointsData}
        pointAltitude="size"
        pointColor="color"
        pointRadius={0.5}
        pointLabel={(d) => `
          <div style="
            background: ${isDark ? 'rgba(12, 42, 51, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
            color: ${isDark ? '#E7F8FF' : '#0C2A33'};
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid ${isDark ? '#7AE1FF' : '#0C7A9E'};
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <strong>${d.territory}</strong><br/>
            Revenue: $${d.amount.toLocaleString()}
          </div>
        `}
        // Atmosphere
        atmosphereColor={isDark ? '#7AE1FF' : '#0C7A9E'}
        atmosphereAltitude={0.15}
        // Animation
        animateIn={true}
      />
    </div>
  );
};

export default GlobeWithPings;
