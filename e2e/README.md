# Browser suite

`npm run e2e` starts the API on a **throwaway copy** of the local database
(`verax_backend/verax_livetest.db`, cloned per run, email held for every
address), builds the current source, and runs:

| Spec                     | What fails it                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crawl.spec.js`          | Clicks every distinct control on every admin page it can reach (and the public pages). Fails on a **dead click** (nothing opens, navigates, changes or calls the server), any figure written the viewer's way instead of the US way (it runs in a German browser), page errors and 5xx responses. |
| `spanish-portal.spec.js` | The client portal (admin preview) in a Spanish browser: English labels left in the Spanish UI, non-US figures, dead clicks.                                                                                                                                                                       |
| `writer-portal.spec.js`  | Signed in as a real writer (invites seeded and accepted on the throwaway copy): their earnings, statements and settings, in English and in Spanish. Same failures as the crawl, plus English labels in the Spanish portal.                                                                        |
| `flows.spec.js`          | Move a payee code to another client end to end; open and cancel Delete statement.                                                                                                                                                                                                                 |

Reports: `e2e/.tmp/*-report.json`, HTML via `npm run e2e:report`.

Before every deploy run **`bash e2e/qa.sh`**: backend tests, roster integrity
audit, lint, unit tests, then this suite. GitHub runs lint, unit tests and the
build on every push (`.github/workflows`).

Knobs: `E2E_SKIP_BUILD=1` (reuse the last build), `E2E_SEEDS=/admin/writers/733`
(crawl only those pages), `E2E_NO_FOLLOW=1`, `E2E_VERBOSE=1` (every click's
result), `E2E_MAX_PER_PAGE`, `E2E_SOURCE_DB`, `E2E_BACKEND_DIR`.

A control that is meant to do nothing when already selected is recognised by
`aria-selected/pressed/checked/current` or an `active`/`selected` class. Mark
anything else that should never be clicked with `data-e2e-ignore`.
