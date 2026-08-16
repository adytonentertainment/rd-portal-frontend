import React, { useEffect, useRef } from 'react';

const LiquidEther = ({
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  resolution = 0.5,
  isBounce = false,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 3000,
  autoRampDuration = 0.6,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let mouseX = 0;
    let mouseY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let isMouseDown = false;
    let autoAngle = 0;
    let lastInteraction = Date.now();
    let isAutoMode = autoDemo;

    // Resize canvas
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;

      canvas.width = container.offsetWidth * resolution;
      canvas.height = container.offsetHeight * resolution;
      canvas.style.width = `${container.offsetWidth}px`;
      canvas.style.height = `${container.offsetHeight}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Simple fluid simulation
    const particleCount = 150;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
      });
    }

    // Mouse handlers
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = (e.clientX - rect.left) * resolution;
      mouseY = (e.clientY - rect.top) * resolution;
      lastInteraction = Date.now();
      isAutoMode = false;
    };

    const handleMouseDown = () => {
      isMouseDown = true;
      lastInteraction = Date.now();
      isAutoMode = false;
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleMouseLeave = () => {
      isMouseDown = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Auto mode timer
    const checkAutoMode = () => {
      if (!isAutoMode && Date.now() - lastInteraction > autoResumeDelay) {
        isAutoMode = true;
      }
    };

    // Animation loop
    const animate = () => {
      checkAutoMode();

      // Clear canvas with slight fade for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate mouse velocity
      let dx = 0;
      let dy = 0;

      if (isAutoMode) {
        // Auto demo mode
        autoAngle += autoSpeed * 0.01;
        const targetX = canvas.width / 2 + Math.cos(autoAngle) * canvas.width * 0.3;
        const targetY = canvas.height / 2 + Math.sin(autoAngle * 1.3) * canvas.height * 0.3;

        dx = (targetX - mouseX) * 0.1;
        dy = (targetY - mouseY) * 0.1;

        mouseX += dx;
        mouseY += dy;
      } else {
        dx = mouseX - prevMouseX;
        dy = mouseY - prevMouseY;
      }

      // Update and draw particles
      particles.forEach((particle) => {
        // Calculate distance to mouse
        const distX = particle.x - mouseX;
        const distY = particle.y - mouseY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Apply mouse force
        const force = isAutoMode ? mouseForce * autoIntensity : mouseForce;
        const maxDist = cursorSize;

        if (distance < maxDist) {
          const normalizedDist = distance / maxDist;
          const strength = 1 - normalizedDist;
          particle.vx += (distX / distance) * strength * force * 0.1;
          particle.vy += (distY / distance) * strength * force * 0.1;
        }

        // Apply viscosity
        if (isViscous) {
          particle.vx *= 1 - viscous * 0.001;
          particle.vy *= 1 - viscous * 0.001;
        } else {
          particle.vx *= 0.99;
          particle.vy *= 0.99;
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce or wrap
        if (isBounce) {
          if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        } else {
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Add glow effect
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3);
        gradient.addColorStop(0, particle.color + '80');
        gradient.addColorStop(1, particle.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [
    colors,
    mouseForce,
    cursorSize,
    isViscous,
    viscous,
    resolution,
    isBounce,
    autoDemo,
    autoSpeed,
    autoIntensity,
    autoResumeDelay,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
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

export default LiquidEther;
