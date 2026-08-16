import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ADMIN_PERSONA, setPersona, clearPersona } from '../../utils/persona';
import { MOCK_WRITERS } from '../../mocks/roster';

// Path-based persona switch:
//   /persona/admin      → log in as the publisher admin
//   /persona/-5         → log in as writer with id -5 (RedZed) in their portal
//   /persona/redzed     → resolves the slug, then same as above
const PersonaSwitch = () => {
  const { id } = useParams();

  useEffect(() => {
    let target = id;
    let landingPath = '/admin';

    if (id === 'admin' || id === ADMIN_PERSONA) {
      clearPersona();
      setPersona(ADMIN_PERSONA);
      landingPath = '/admin';
    } else {
      // Resolve slug ↔ id
      const numeric = Number(id);
      const writer = MOCK_WRITERS.find(
        (w) =>
          w.id === numeric ||
          w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === String(id).toLowerCase() ||
          w.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === String(id).toLowerCase()
      );
      if (writer) {
        setPersona(writer.id);
        try {
          localStorage.setItem('selectedClientId', String(writer.id));
        } catch {
          /* noop */
        }
        landingPath = '/earnings';
        target = writer.id;
      } else {
        // Unknown — fall back to admin
        setPersona(ADMIN_PERSONA);
        landingPath = '/admin';
      }
    }

    // Full reload so UserContext + ClientContext re-initialize cleanly
    window.location.replace(landingPath);
    return () => {
      // Defensive: keep target referenced so eslint doesn't warn it's unused
      void target;
    };
  }, [id]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-body)',
        color: 'var(--soft-text)',
        fontSize: 13,
      }}
    >
      Switching persona…
    </div>
  );
};

export default PersonaSwitch;
