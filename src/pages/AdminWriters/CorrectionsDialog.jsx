import { useEffect, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { applyRosterCorrections, previewRosterCorrections } from '../../api/writersAdmin';
import styles from './adminWriters.module.css';

const OP_LABELS = {
  create: 'new entries',
  update: 'field changes',
  move: 'codes moved',
  add_code: 'codes added',
  remove_alias: 'alternate names removed',
  add_alias: 'alternate names added',
  add_contact: 'contacts added',
};

// Upload a corrected roster export: preview every change and anything that
// blocks it, then apply all of it in one go. Nothing changes until Apply.
const CorrectionsDialog = ({ file, onClose, onApplied }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    previewRosterCorrections(file)
      .then(setPreview)
      .catch((err) => setError(err?.message || 'Could not read that file.'));
  }, [file]);

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const r = await applyRosterCorrections(file);
      setResult(r);
      onApplied?.(r);
    } catch (err) {
      setError(err?.message || 'Nothing was changed.');
    } finally {
      setApplying(false);
    }
  };

  const changes = preview?.changes || [];
  const problems = preview?.problems || [];
  const counts = Object.entries(preview?.counts || {});

  return (
    <div className={styles.overlay} onClick={() => !applying && onClose()}>
      <div
        className={styles.confirmModal}
        style={{ width: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className={styles.confirmTitle}>Upload corrections · {file.name}</h3>
        <div className={styles.confirmBody} style={{ overflowY: 'auto', flex: 1 }}>
          {!preview && !error && (
            <p>
              <FaSpinner size={12} className={styles.spin} /> Reading {file.name}…
            </p>
          )}
          {result ? (
            <p>
              Applied {result.applied} change{result.applied === 1 ? '' : 's'}.{' '}
              {result.remaining_errors
                ? `${result.remaining_errors} problem(s) remain on the roster — export again to see them.`
                : 'No problems remain on the roster.'}
            </p>
          ) : (
            preview && (
              <>
                <p>
                  {preview.rows} rows read.{' '}
                  {changes.length
                    ? `${changes.length} change${changes.length === 1 ? '' : 's'}: ${counts
                        .map(([op, n]) => `${n} ${OP_LABELS[op] || op}`)
                        .join(', ')}.`
                    : 'Nothing to change.'}
                </p>
                {problems.length > 0 && (
                  <>
                    <p className={styles.formError}>
                      Fix {problems.length === 1 ? 'this' : 'these'} in the spreadsheet and upload again — nothing is
                      applied while any remain:
                    </p>
                    <ul>
                      {problems.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </>
                )}
                {changes.length > 0 && (
                  <ul>
                    {changes.map((c, i) => (
                      <li key={i}>{c.text}</li>
                    ))}
                  </ul>
                )}
                {preview.warnings?.length > 0 && (
                  <>
                    <p className={styles.mutedNote}>Worth a look (does not block):</p>
                    <ul>
                      {preview.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )
          )}
          {error && <p className={styles.formError}>{error}</p>}
        </div>
        <div className={styles.confirmActions}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={applying}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              className={styles.primaryBtn}
              onClick={apply}
              disabled={applying || !preview || problems.length > 0 || changes.length === 0}
            >
              {applying ? 'Applying…' : `Apply ${changes.length} change${changes.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrectionsDialog;
