import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const FadeInAnimation = ({ children, id, className = '' }) => {
  useEffect(() => {
    // animation when section gets into view
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target;

        // add fade class when in view
        if (entry.isIntersecting && !section.classList.contains('fade-in')) {
          section.classList.add('fade-in');
          section.style.opacity = 1;
          return;
        }
      });
    });
    obs.observe(document.querySelector(`#${id}`));
  }, []);

  return (
    <div id={id} className={className}>
      {children}
    </div>
  );
};

export default FadeInAnimation;
