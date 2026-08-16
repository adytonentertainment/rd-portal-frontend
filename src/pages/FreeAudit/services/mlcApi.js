const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Run MLC audit on a catalog of songs
 *
 * @param {Object} formData - User info (IPI, publisher, etc.)
 * @param {Array}  catalog  - Songs from Genius or Spotify
 * @returns {Object} Audit results with per-song data and summary
 */
export async function runAudit(formData, catalog) {
  // Build writerName from legal name fields if provided
  const nameParts = [formData.writerFirstName, formData.writerMiddleName, formData.writerLastName]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  const writerName = nameParts.length > 0 ? nameParts.join(' ') : null;

  const res = await fetch(`${API_URL}/free-audit/mlc/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      songs: catalog,
      ipNumber: formData.ipNumber || null,
      publisherIpNumber: formData.hasPublisher === 'yes' ? formData.publisherIpNumber : null,
      publisherName: formData.hasPublisher === 'yes' ? formData.publisherName : null,
      writerName,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Audit failed (${res.status})`);
  }

  const data = await res.json();

  // Transform backend response into the shape the UI expects
  const songs = data.songs || [];
  const summary = data.summary || {};

  const issues = [];
  const warnings = [];
  const success = [];

  // Registration summary
  if (summary.unregistered > 0) {
    issues.push({
      type: 'registration',
      severity: 'high',
      message: `${summary.unregistered} of ${summary.total} songs are not registered`,
      details: ['You are not receiving royalties for these songs', 'Register to claim past and future royalties'],
    });
  } else if (summary.total > 0) {
    success.push({
      type: 'registration',
      message: `All ${summary.total} songs are registered`,
    });
  }

  // Writer IPI matching
  const writerMismatchCount = songs.filter(
    (s) => s.registered && s.issues.some((i) => i.includes('Writer IPI'))
  ).length;
  if (writerMismatchCount > 0) {
    issues.push({
      type: 'writer_match',
      severity: 'high',
      message: `${writerMismatchCount} registered song(s) don't list your writer IPI`,
      details: ['You may not be receiving writer royalties for these works', 'Update writer credits to resolve this'],
    });
  }

  // Publisher IPI matching
  const pubMismatchCount = songs.filter(
    (s) => s.registered && s.issues.some((i) => i.includes('Publisher IPI'))
  ).length;
  if (pubMismatchCount > 0) {
    issues.push({
      type: 'publisher_match',
      severity: 'high',
      message: `${pubMismatchCount} registered song(s) don't list your publisher IPI`,
      details: [
        'Your publisher may not be receiving royalties for these works',
        'Contact your publisher to update publisher credits',
      ],
    });
  }

  // If both match everywhere
  if (writerMismatchCount === 0 && pubMismatchCount === 0 && summary.registered > 0) {
    success.push({
      type: 'ipi_match',
      message: 'Your IPI matches all registered works',
    });
  }

  // ISRC missing
  if (summary.isrcMissing > 0) {
    issues.push({
      type: 'isrc',
      severity: 'high',
      message: `${summary.isrcMissing} registered song(s) have ISRC not linked`,
      details: [
        "Song was found by title/artist search but ISRC isn't directly linked",
        'This can cause royalty matching delays or missed payments',
      ],
    });
  }

  // PRO recommendation
  if (formData.hasPRO === 'no') {
    warnings.push({
      type: 'recommendation',
      message: 'Register with a PRO (ASCAP, BMI, SESAC) to collect performance royalties',
    });
  }

  // Publisher recommendation
  if (formData.hasPublisher === 'dont_know') {
    warnings.push({
      type: 'recommendation',
      message: 'Verify your publisher status - affects how royalties are collected',
    });
  }

  const missingIsrc = songs.filter((s) => !s.isrc || s.isrc === 'N/A');
  if (missingIsrc.length > 0) {
    warnings.push({
      type: 'isrc',
      message: `${missingIsrc.length} song(s) have no ISRC code at all`,
      details: ['Contact your distributor to assign ISRC codes'],
    });
  } else {
    success.push({ type: 'isrc', message: 'All songs have ISRC codes' });
  }

  return {
    timestamp: new Date().toISOString(),
    totalSongs: summary.total,
    registeredCount: summary.registered,
    unregisteredCount: summary.unregistered,
    issuesCount: summary.issueCount,
    songs,
    summary: { issues, warnings, success },
  };
}
