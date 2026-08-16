import { useEffect, createContext, useState, useCallback, useContext } from 'react';
import urlJoin from 'url-join';
import axios from 'axios';
import { MOCK_WRITERS } from '../../mocks/roster';
import { getWriterPersonaId, setPersona, ADMIN_PERSONA } from '../../utils/persona';

const ClientContextProvider = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const STORAGE_KEY = 'selectedClientId';

const ClientContext = ({ children }) => {
  const [clients, setClients] = useState([]);
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
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(urlJoin(BACKEND_URL, 'clients'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const real = response.data.clients || [];
      // Demo mode: append mock writers so the dropdown is populated even when the backend has none.
      // Real backend clients (if any) take precedence by id; mocks have negative ids so no collisions.
      setClients([...real, ...MOCK_WRITERS]);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([...MOCK_WRITERS]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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
    if (!loading && selectedClientId !== null && clients.length > 0) {
      const clientExists = clients.some((c) => c.id === selectedClientId);
      if (!clientExists) {
        // If a writer persona was pointing at this now-deleted writer, drop the
        // stale persona so the app reverts to the admin view instead of showing
        // a half-broken portal.
        if (getWriterPersonaId() === selectedClientId) setPersona(ADMIN_PERSONA);
        setSelectedClientId(null);
      }
    }
  }, [clients, selectedClientId, loading]);

  const selectClient = useCallback((clientId) => {
    setSelectedClientId(clientId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  const createClient = useCallback(
    async (clientData) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await axios.post(urlJoin(BACKEND_URL, 'clients'), clientData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Refresh clients list
      await fetchClients();
      return response.data;
    },
    [fetchClients]
  );

  const updateClient = useCallback(
    async (clientId, clientData) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await axios.put(urlJoin(BACKEND_URL, `clients/${clientId}`), clientData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Refresh clients list
      await fetchClients();
      return response.data;
    },
    [fetchClients]
  );

  const deleteClient = useCallback(
    async (clientId) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      await axios.delete(urlJoin(BACKEND_URL, `clients/${clientId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear selection if deleted client was selected
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }

      // Refresh clients list
      await fetchClients();
    },
    [fetchClients, selectedClientId]
  );

  // Get current selected client object
  const selectedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;

  return (
    <ClientContextProvider.Provider
      value={{
        clients,
        selectedClientId,
        selectedClient,
        loading,
        selectClient,
        clearSelection,
        createClient,
        updateClient,
        deleteClient,
        refreshClients: fetchClients,
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
