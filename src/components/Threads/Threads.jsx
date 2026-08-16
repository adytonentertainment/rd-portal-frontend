import React, { useEffect, useRef } from 'react';

const Threads = ({ amplitude = 1, distance = 0, enableMouseInteraction = true }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e) => {
      if (enableMouseInteraction) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    };

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    class Thread {
      constructor(x, y, color) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.001 + Math.random() * 0.002;
        this.radius = 100 + Math.random() * 200;
      }

      update(time, mouseX, mouseY) {
        this.angle += this.speed;

        const targetX = this.baseX + Math.cos(this.angle) * this.radius * amplitude;
        const targetY = this.baseY + Math.sin(this.angle) * this.radius * amplitude;

        if (enableMouseInteraction) {
          const dx = mouseX - targetX;
          const dy = mouseY - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;

          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            this.x = targetX + dx * force * 0.3;
            this.y = targetY + dy * force * 0.3;
          } else {
            this.x += (targetX - this.x) * 0.1;
            this.y += (targetY - this.y) * 0.1;
          }
        } else {
          this.x = targetX;
          this.y = targetY;
        }
      }

      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const threads = [];
    const colors = ['rgba(82, 39, 255, 0.6)', 'rgba(255, 159, 252, 0.6)', 'rgba(177, 158, 239, 0.6)'];
    const numThreads = 50;

    for (let i = 0; i < numThreads; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const color = colors[Math.floor(Math.random() * colors.length)];
      threads.push(new Thread(x, y, color));
    }

    const animate = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby threads
      for (let i = 0; i < threads.length; i++) {
        for (let j = i + 1; j < threads.length; j++) {
          const dx = threads[i].x - threads[j].x;
          const dy = threads[i].y - threads[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 150 + distance;

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.3;
            ctx.strokeStyle = `rgba(177, 158, 239, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(threads[i].x, threads[i].y);
            ctx.lineTo(threads[j].x, threads[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw threads
      threads.forEach((thread) => {
        thread.update(time, mouseX, mouseY);
        thread.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [amplitude, distance, enableMouseInteraction]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default Threads;
