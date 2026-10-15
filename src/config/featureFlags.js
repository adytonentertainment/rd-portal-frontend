// Feature flags for dark-shipping live-data behavior.
// statementsLive gates all statement-ingestion backend integration:
// flag off → admin screens keep their existing mock/demo behavior untouched.
export const statementsLive = process.env.REACT_APP_STATEMENTS_LIVE === '1';

// Unsigned demo admin is for local development, or a demo deploy that opts in.
// A production bundle must not open as the demo admin just because the live
// flag was left unset.
export const demoAutoLogin =
  !statementsLive && (process.env.NODE_ENV !== 'production' || process.env.REACT_APP_DEMO_AUTO_LOGIN === '1');
