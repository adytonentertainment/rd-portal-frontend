import { useEffect, useRef, useState } from 'react';

const defaultColors = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex) => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const vertex = `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uMouseStrength;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = random;
    vColor = color;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;
    vec4 clipPos = projectionMatrix * mvPos;
    vec2 screenPos = clipPos.xy / clipPos.w;

    vec2 diff = screenPos - uMouse;
    float dist = length(diff);
    if (dist < uMouseRadius && dist > 0.0) {
      vec2 push = normalize(diff) * uMouseStrength * (1.0 - dist / uMouseRadius);
      clipPos.xy += push * clipPos.w;
    }

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = clipPos;
  }
`;

const fragment = `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));

    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

const Particles = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className,
  mouseRadius = 0.5,
  mouseStrength = 0.3,
}) => {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    let gl;
    let canvasEl;

    const init = async () => {
      try {
        const OGL = await import('ogl');
        const { Renderer, Camera, Geometry, Program, Mesh } = OGL;

        const renderer = new Renderer({
          dpr: pixelRatio,
          depth: false,
          alpha: true,
        });
        gl = renderer.gl;
        canvasEl = gl.canvas;

        Object.assign(canvasEl.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        });

        container.appendChild(canvasEl);
        gl.clearColor(0, 0, 0, 0);

        const camera = new Camera(gl, { fov: 15 });
        camera.position.set(0, 0, cameraDistance);

        const resize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          renderer.setSize(width, height);
          camera.perspective({ aspect: width / height });
        };
        window.addEventListener('resize', resize, false);
        resize();

        const handleMouseMove = (e) => {
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = -((e.clientY / window.innerHeight) * 2 - 1);
          mouseRef.current = { x, y };
        };

        window.addEventListener('mousemove', handleMouseMove);

        const count = particleCount;
        const positions = new Float32Array(count * 3);
        const randoms = new Float32Array(count * 4);
        const colors = new Float32Array(count * 3);
        const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors;

        for (let i = 0; i < count; i++) {
          let x, y, z, len;
          do {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            z = Math.random() * 2 - 1;
            len = x * x + y * y + z * z;
          } while (len > 1 || len === 0);
          const r = Math.cbrt(Math.random());
          positions.set([x * r, y * r, z * r], i * 3);
          randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
          const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
          colors.set(col, i * 3);
        }

        const geometry = new Geometry(gl, {
          position: { size: 3, data: positions },
          random: { size: 4, data: randoms },
          color: { size: 3, data: colors },
        });

        const program = new Program(gl, {
          vertex,
          fragment,
          uniforms: {
            uTime: { value: 0 },
            uSpread: { value: particleSpread },
            uBaseSize: { value: particleBaseSize * pixelRatio },
            uSizeRandomness: { value: sizeRandomness },
            uAlphaParticles: { value: alphaParticles ? 1 : 0 },
            uMouse: { value: [0, 0] },
            uMouseRadius: { value: mouseRadius },
            uMouseStrength: { value: mouseStrength },
          },
          transparent: true,
          depthTest: false,
        });

        const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

        let lastTime = performance.now();
        let elapsed = 0;

        const update = (t) => {
          animationFrameId = requestAnimationFrame(update);
          const delta = t - lastTime;
          lastTime = t;
          elapsed += delta * speed;

          program.uniforms.uTime.value = elapsed * 0.001;
          program.uniforms.uMouse.value = [mouseRef.current.x, mouseRef.current.y];

          if (moveParticlesOnHover) {
            particles.position.x = -mouseRef.current.x * particleHoverFactor * 0.3;
            particles.position.y = -mouseRef.current.y * particleHoverFactor * 0.3;
          } else {
            particles.position.x = 0;
            particles.position.y = 0;
          }

          if (!disableRotation) {
            particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
            particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
            particles.rotation.z += 0.01 * speed;
          }

          renderer.render({ scene: particles, camera });
        };

        animationFrameId = requestAnimationFrame(update);

        return () => {
          window.removeEventListener('resize', resize);
          window.removeEventListener('mousemove', handleMouseMove);
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Particles init error:', err);
        setError(err.message);
      }
    };

    let cleanupFn;
    init().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      if (cleanupFn) cleanupFn();
      cancelAnimationFrame(animationFrameId);
      if (canvasEl && container.contains(canvasEl)) {
        container.removeChild(canvasEl);
      }
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation,
    pixelRatio,
    particleColors,
    mouseRadius,
    mouseStrength,
  ]);

  if (error) {
    return <div style={{ color: 'red', padding: 20 }}>Particles error: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={className || undefined}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default Particles;
