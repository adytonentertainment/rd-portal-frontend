import { request } from './client';

// Distribution admin API (ingestion PRD Stage C, infra PRD §10). The gate is
// read-only; distribute enforces it (409 + gate state when not green);
// unpublish is reversible.

export const getBatchGate = (batchId) => request({ url: `/admin/statements/batches/${batchId}/gate` });

export const distributeBatch = (batchId) =>
  request({ url: `/admin/statements/batches/${batchId}/distribute`, method: 'POST' });

export const unpublishDistribution = (distributionId) =>
  request({ url: `/admin/distributions/${distributionId}/unpublish`, method: 'POST' });
