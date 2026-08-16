import React, { useEffect, useRef, useState } from 'react';

const Beams = ({
  beamWidth = 2,
  beamHeight = 15,
  beamNumber = 12,
  lightColor = null,
  speed = 2,
  noiseIntensity = 1.75,
  scale = 0.2,
  rotation = 0,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'dark');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Determine colors based on theme
  const backgroundColor = theme === 'light' ? '#F5F5F0' : '#000000';
  const beamColor = lightColor || (theme === 'light' ? 'rgba(245, 245, 240, 1)' : '#ffffff');
  const clearColor = theme === 'light' ? 'rgba(245, 245, 240, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    // Resize canvas
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;

      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Simple noise function (pseudo-random)
    const noise = (x, y, t) => {
      const n = Math.sin(x * 0.1 + t) * Math.cos(y * 0.1 + t) * noiseIntensity;
      return n;
    };

    // Create beams
    const beams = [];
    for (let i = 0; i < beamNumber; i++) {
      const angle = (i / beamNumber) * Math.PI * 2 + rotation;
      beams.push({
        angle,
        baseX: canvas.width / 2,
        baseY: canvas.height / 2,
        offset: Math.random() * Math.PI * 2,
      });
    }

    // Animation loop
    const animate = () => {
      time += speed * 0.01;

      // Clear canvas
      ctx.fillStyle = clearColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw beams
      beams.forEach((beam, index) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Calculate beam path with noise
        const points = [];
        const segments = 50;

        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const distance = t * Math.max(canvas.width, canvas.height);

          // Add noise to angle
          const noiseValue = noise(
            Math.cos(beam.angle) * distance * scale,
            Math.sin(beam.angle) * distance * scale,
            time + beam.offset
          );

          const wobbledAngle = beam.angle + noiseValue * 0.3;

          const x = centerX + Math.cos(wobbledAngle) * distance;
          const y = centerY + Math.sin(wobbledAngle) * distance;

          points.push({ x, y, opacity: 1 - t });
        }

        // Draw beam as gradient
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];

          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);

          // Parse light color and create gradient
          const opacity1 = Math.max(0, p1.opacity * 0.4);
          const opacity2 = Math.max(0, p2.opacity * 0.4);

          // Handle rgba vs hex color formats
          let color1, color2;
          if (beamColor.startsWith('rgba')) {
            // Replace the opacity in rgba
            color1 = beamColor.replace(/[\d.]+\)$/, `${opacity1})`);
            color2 = beamColor.replace(/[\d.]+\)$/, `${opacity2})`);
          } else {
            // Hex color, append opacity
            color1 = `${beamColor}${Math.floor(opacity1 * 255)
              .toString(16)
              .padStart(2, '0')}`;
            color2 = `${beamColor}${Math.floor(opacity2 * 255)
              .toString(16)
              .padStart(2, '0')}`;
          }

          gradient.addColorStop(0, color1);
          gradient.addColorStop(1, color2);

          ctx.strokeStyle = gradient;
          ctx.lineWidth = beamWidth;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Draw glow at center
        const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);

        // Handle rgba vs hex for glow
        if (beamColor.startsWith('rgba')) {
          glowGradient.addColorStop(0, beamColor.replace(/[\d.]+\)$/, '0.25)'));
          glowGradient.addColorStop(1, beamColor.replace(/[\d.]+\)$/, '0)'));
        } else {
          glowGradient.addColorStop(0, `${beamColor}40`);
          glowGradient.addColorStop(1, `${beamColor}00`);
        }

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [beamWidth, beamHeight, beamNumber, beamColor, speed, noiseIntensity, scale, rotation, clearColor, theme]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: backgroundColor,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default Beams;
