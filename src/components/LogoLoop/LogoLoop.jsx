import { useEffect, useRef } from 'react';

// Generate filenames: 001-100, matching actual extensions
const allCoverArtImages = [];
// prettier-ignore
const jpgIndices = new Set([7,8,10,12,13,15,20,22,33,45,47,50,52,53,55,62,63,67,71,78,80,82,83,85,86,88,91,94,96,106,107,108,111,114,117,118,119,120,121,126,127,132,133,134,135,137,138,141,143,145,147,148,149,150,151,152,156]);
for (let i = 1; i <= 156; i++) {
  const num = String(i).padStart(3, '0');
  allCoverArtImages.push(num + (jpgIndices.has(i) ? '.jpg' : '.png'));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createLogoLoop(containerId, imageList, speed = 50, direction = 1) {
  const container = document.getElementById(containerId);
  if (!container) return () => {};

  const existing = Array.from(container.querySelectorAll('.logoloop'));
  existing.forEach((el) => el.remove());

  const wrapper = document.createElement('div');
  wrapper.className = 'logoloop logoloop--fade';

  const track = document.createElement('div');
  track.className = 'logoloop__track';

  const copyCount = 3;
  for (let copy = 0; copy < copyCount; copy++) {
    const list = document.createElement('ul');
    list.className = 'logoloop__list';
    list.setAttribute('role', 'list');

    for (let i = 0; i < imageList.length; i++) {
      const item = document.createElement('li');
      item.className = 'logoloop__item';
      item.setAttribute('role', 'listitem');

      const img = document.createElement('img');
      img.src = '/assets/coverarts/' + imageList[i];
      img.alt = 'Cover Art';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '160px';
      img.style.objectFit = 'cover';
      img.style.display = 'block';

      item.appendChild(img);
      list.appendChild(item);
    }

    track.appendChild(list);
  }

  wrapper.appendChild(track);
  container.appendChild(wrapper);

  let offset = 0;
  const velocity = speed * direction;
  let lastTime = Date.now();
  let rafId;

  const animate = () => {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    const firstList = track.querySelector('.logoloop__list');
    const listWidth = firstList ? firstList.offsetWidth : 0;

    if (listWidth > 0) {
      offset += velocity * deltaTime;
      offset = ((offset % listWidth) + listWidth) % listWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    try {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    } catch (e) {
      // ignore
    }
  };
}

export default function LogoLoop() {
  const cleanupRefs = useRef([]);

  useEffect(() => {
    const shuffledImages = shuffleArray(allCoverArtImages);
    const third = Math.ceil(shuffledImages.length / 3);
    const row1Images = shuffledImages.slice(0, third);
    const row2Images = shuffledImages.slice(third, third * 2);
    const row3Images = shuffledImages.slice(third * 2);

    const cleanup1 = createLogoLoop('logoLoop1', row1Images, 60, 1);
    const cleanup2 = createLogoLoop('logoLoop2', row2Images, 45, -1);
    const cleanup3 = createLogoLoop('logoLoop3', row3Images, 75, 1);

    cleanupRefs.current = [cleanup1, cleanup2, cleanup3];

    return () => {
      cleanupRefs.current.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <section className="logo-loop-section">
      <div className="logo-loop-row" id="logoLoop1"></div>
      <div className="logo-loop-row" id="logoLoop2"></div>
      <div className="logo-loop-row" id="logoLoop3"></div>
    </section>
  );
}
