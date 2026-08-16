import React, { useMemo } from 'react';
import Globe_Pins from './Globe_Pins';

/**
 * Wrapper component for Globe_Pins with simplified props for revenue territory display
 *
 * @param {Object[]} territories - Array of territory objects with { territory: "US", amount: 1000 }
 * @param {Object} territoryCoordinates - Mapping of territory codes to { lon, lat, name }
 * @param {string} theme - Theme mode ('dark' or 'light')
 * @param {string} className - Optional CSS class
 */
const GlobeWithPins = ({
  territories = [],
  territoryCoordinates = {},
  theme = 'dark',
  className = '',
  showLabels = true,
  autoRotateSpeed = 0.03,
}) => {
  // Convert territories to pins format expected by Globe_Pins
  const pins = useMemo(() => {
    if (!territories || !Array.isArray(territories)) return [];

    console.log('🌍 GlobeWithPins rendering with', territories.length, 'territories');

    return territories
      .map((t) => {
        const coords = territoryCoordinates[t.territory];
        if (!coords) {
          console.warn('⚠️ No coordinates found for', t.territory);
          return null;
        }

        return {
          lon: coords.lon,
          lat: coords.lat,
          name: coords.name || t.territory,
          address: `Revenue: $${t.amount.toLocaleString()}`,
          phone: `Territory: ${t.territory}`,
        };
      })
      .filter(Boolean); // Remove nulls
  }, [territories, territoryCoordinates]);

  // Theme defaults - dark mode by default
  const isDark = theme === 'dark';
  const colors = {
    pointColor: isDark ? '#7AE1FF' : '#0C7A9E',
    labelColor: isDark ? '#E7F8FF' : '#0C2A33',
    pinDotColor: isDark ? '#7AE1FF' : '#0C7A9E',
    pinPanelBgColor: isDark ? '#0C2A33' : '#FFFFFF',
    pinPanelBorderColor: isDark ? '#7AE1FF' : '#0C7A9E',
    fillColor: isDark ? '#7AE1FF' : '#0C7A9E',
  };

  console.log('🌍 Rendering Globe_Pins with', pins.length, 'pins');

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Globe_Pins
        pins={pins}
        showLabels={showLabels}
        autoRotateSpeed={autoRotateSpeed}
        pointColor={colors.pointColor}
        labelColor={colors.labelColor}
        pinDotColor={colors.pinDotColor}
        pinPanelBgColor={colors.pinPanelBgColor}
        pinPanelBgOpacity={isDark ? 0.75 : 0.9}
        pinPanelBorderColor={colors.pinPanelBorderColor}
        fillColor={colors.fillColor}
        fillOpacity={0}
        backOpacity={isDark ? 0.01 : 0.01}
        pointSize={0.01}
        tileDeg={5}
        zoom={true}
        pinSize={0.012}
        haloScale={10}
        labelFont={{ family: 'Inter', style: 'Regular' }}
        labelFontSize={12}
        preloaderTheme={isDark ? 'Dark' : 'Light'}
      />
    </div>
  );
};

export default GlobeWithPins;
