// Demo persona switch — lets us preview the app as either the publisher admin
// or as any individual writer in their portal, all without a real login screen.
// Persisted in localStorage so a refresh keeps the persona.

const KEY = 'rd_persona';

export const ADMIN_PERSONA = 'admin';

export const getPersona = () => {
  try {
    return localStorage.getItem(KEY) || ADMIN_PERSONA;
  } catch {
    return ADMIN_PERSONA;
  }
};

export const setPersona = (id) => {
  try {
    if (id == null || id === ADMIN_PERSONA) {
      localStorage.setItem(KEY, ADMIN_PERSONA);
    } else {
      localStorage.setItem(KEY, String(id));
    }
  } catch {
    /* noop */
  }
};

export const clearPersona = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};

export const isAdminPersona = () => getPersona() === ADMIN_PERSONA;

export const getWriterPersonaId = () => {
  const v = getPersona();
  if (v === ADMIN_PERSONA) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
