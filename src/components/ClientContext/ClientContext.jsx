import { useEffect, createContext, useState, useCallback, useContext } from 'react';
import { MOCK_WRITERS } from '../../mocks/roster';
import { getWriterPersonaId, setPersona, ADMIN_PERSONA } from '../../utils/persona';

const ClientContextProvider = createContext();

const STORAGE_KEY = 'selectedClientId';

// The client list is the demo roster only. The live portal resolves the
// signed-in writer through /me, not through this context; the old SaaS
// /clients endpoint it used to merge in no longer exists.
const clients = MOCK_WRITERS;

const ClientContext = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState(() => {
    // If a writer persona is active, that writer is always the selected client.
    const personaId = getWriterPersonaId();
    if (personaId != null) {
      // The roster (MOCK_WRITERS) has already had any deleted writers pruned by
      // distributionState's rehydrate(). If the persona points at a writer who
      // no longer exists, the persona is stale — fall back to the admin persona
      // rather than silently rendering the deleted writer's data.
      if (MOCK_WRITERS.some((w) => w.id === personaId)) return personaId;
      setPersona(ADMIN_PERSONA);
      return null;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  // Persist selected client to localStorage
  useEffect(() => {
    if (selectedClientId !== null) {
      localStorage.setItem(STORAGE_KEY, selectedClientId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedClientId]);

  // Validate selectedClientId exists in clients list
  useEffect(() => {
    if (selectedClientId !== null && clients.length > 0) {
      const clientExists = clients.some((c) => c.id === selectedClientId);
      if (!clientExists) {
        // If a writer persona was pointing at this now-deleted writer, drop the
        // stale persona so the app reverts to the admin view instead of showing
        // a half-broken portal.
        if (getWriterPersonaId() === selectedClientId) setPersona(ADMIN_PERSONA);
        setSelectedClientId(null);
      }
    }
  }, [selectedClientId]);

  const selectClient = useCallback((clientId) => {
    setSelectedClientId(clientId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  // Get current selected client object
  const selectedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;

  return (
    <ClientContextProvider.Provider
      value={{
        clients,
        selectedClientId,
        selectedClient,
        loading: false,
        selectClient,
        clearSelection,
      }}
    >
      {children}
    </ClientContextProvider.Provider>
  );
};

// Custom hook for using the client context
export const useClientContext = () => {
  const context = useContext(ClientContextProvider);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientContext provider');
  }
  return context;
};

export { ClientContextProvider };
export default ClientContext;
