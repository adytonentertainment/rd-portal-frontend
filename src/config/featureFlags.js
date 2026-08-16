// Feature flags for dark-shipping live-data behavior.
// statementsLive gates all statement-ingestion backend integration:
// flag off → admin screens keep their existing mock/demo behavior untouched.
export const statementsLive = process.env.REACT_APP_STATEMENTS_LIVE === '1';
