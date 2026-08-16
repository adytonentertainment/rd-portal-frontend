import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { FaSearch, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useIsAdmin } from '../../utils/auth';
import { MOCK_WRITERS } from '../../mocks/roster';
import styles from './adminCatalog.module.css';

// Simple hash function for deterministic values
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Generate ISRC (always present)
const generateISRC = (title) => {
  const hash = simpleHash(title);
  const country = 'US';
  const reg = 'ABC';
  const year = 20 + (hash % 6);
  const id = String(hash % 100000).padStart(5, '0');
  return `${country}${reg}${year}${id}`;
};

// Generate ISWC (30% missing)
const generateISWC = (title) => {
  const hash = simpleHash(title);
  if (hash % 100 < 30) return null; // 30% missing
  const id = String(hash % 10000000000).padStart(10, '0');
  return `T-${id.slice(0, 3)}.${id.slice(3, 6)}.${id.slice(6, 9)}-${hash % 10}`;
};

// Generate status
const generateStatus = (title) => {
  const hash = simpleHash(title);
  const mod = hash % 100;
  if (mod < 75) return 'active';
  if (mod < 90) return 'sub-pub';
  return 'archived';
};

// Generate registration PROs
const generateRegistrations = (title) => {
  const hash = simpleHash(title);
  const pros = ['BMI', 'ASCAP', 'PRS', 'GEMA', 'MLC'];
  const result = [];
  const numRegs = 1 + (hash % 3);
  for (let i = 0; i < numRegs; i++) {
    result.push(pros[(hash + i * 7) % pros.length]);
  }
  return [...new Set(result)];
};

// Generate split sheet status
const generateSplitStatus = (title) => {
  const hash = simpleHash(title);
  return hash % 100 >= 15; // 85% complete, 15% incomplete
};

const AdminCatalog = () => {
  const isAdmin = useIsAdmin();
  const [searchTerm, setSearchTerm] = useState('');

  // Build combined works list from all writers
  const allWorks = useMemo(() => {
    const worksMap = new Map();

    MOCK_WRITERS.forEach((writer) => {
      writer.catalog.forEach((title) => {
        if (worksMap.has(title)) {
          // Add writer to existing work (collab)
          worksMap.get(title).writers.push(writer.name);
        } else {
          worksMap.set(title, {
            title,
            writers: [writer.name],
            isrc: generateISRC(title),
            iswc: generateISWC(title),
            status: generateStatus(title),
            registrations: generateRegistrations(title),
            splitComplete: generateSplitStatus(title),
          });
        }
      });
    });

    return Array.from(worksMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  // Filter by search term
  const filteredWorks = useMemo(() => {
    if (!searchTerm.trim()) return allWorks;
    const term = searchTerm.toLowerCase();
    return allWorks.filter((work) => work.title.toLowerCase().includes(term));
  }, [allWorks, searchTerm]);

  if (!isAdmin) {
    return <Navigate to="/earnings" replace />;
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'sub-pub':
        return styles.statusSubpub;
      case 'archived':
        return styles.statusArchived;
      default:
        return styles.statusActive;
    }
  };

  return (
    <>
      <Helmet>
        <title>Catalog | Admin | RD</title>
      </Helmet>
      <div className="flex flex-col flex-nowrap h-full" style={{ position: 'relative' }}>
        <Sidebar />
        <main className={styles.shell}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Catalog</h1>
              <p className={styles.subtitle}>All works across your roster</p>
            </div>
            <div className={styles.searchBox}>
              <FaSearch className={styles.searchIcon} size={14} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search works..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Writer(s)</th>
                  <th>ISRC</th>
                  <th>ISWC</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Split Sheet</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.noResults}>
                      No works found matching "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredWorks.map((work) => (
                    <tr key={work.title}>
                      <td className={styles.workTitle}>{work.title}</td>
                      <td className={styles.writers}>{work.writers.join(', ')}</td>
                      <td className={styles.code}>{work.isrc}</td>
                      <td className={styles.code}>{work.iswc || '\u2014'}</td>
                      <td>
                        <span className={`${styles.statusPill} ${getStatusClass(work.status)}`}>{work.status}</span>
                      </td>
                      <td>
                        <div className={styles.registrations}>
                          {work.registrations.map((reg) => (
                            <span key={reg} className={styles.regChip}>
                              {reg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.splitBadge} ${work.splitComplete ? styles.splitComplete : styles.splitIncomplete}`}
                        >
                          {work.splitComplete ? (
                            <>
                              <FaCheck size={10} /> Complete
                            </>
                          ) : (
                            <>
                              <FaExclamationTriangle size={10} /> Incomplete
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminCatalog;
