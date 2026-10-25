"""Create portal invites for the browser suite's writers, on the throwaway copy.

Run by start-backend.sh before the API starts. Writes the raw invite tokens to
e2e/.tmp/invites.json; global-setup.js redeems them through the real
/portal/accept-invite endpoint, so the writer logins are made the way a
writer's own is.
"""

import json
import os
import sys

backend, out = sys.argv[1], sys.argv[2]
sys.path.insert(0, backend)
os.chdir(backend)

from app.database.database import SessionLocal  # noqa: E402
from app.models.statements import ContactRole, Writer, WriterStatus  # noqa: E402
from app.services.portal.invites import create_invite  # noqa: E402

# One English-language and one Spanish-language client with statements.
WRITERS = {"en": "B-Legit", "es": "Rata Blanca"}

db = SessionLocal()
tokens = {}
for lang, name in WRITERS.items():
    w = (
        db.query(Writer)
        .filter(Writer.canonical_name == name, Writer.status != WriterStatus.OFFBOARDED)
        .first()
    )
    if w is None:
        continue
    _, raw = create_invite(db, w.id, f"e2e-writer-{lang}@example.com", role=ContactRole.PRIMARY, is_admin_invite=True)
    tokens[lang] = {"token": raw, "writer_id": w.id, "writer": name}
    # A second invite left OPEN, for testing the accept page itself.
    _, raw = create_invite(db, w.id, f"e2e-open-{lang}@example.com", role=ContactRole.MANAGER, is_admin_invite=True)
    tokens[f"{lang}-open"] = {"token": raw, "writer_id": w.id, "writer": name}
db.commit()
db.close()
with open(out, "w") as fh:
    json.dump(tokens, fh)
print("seeded invites: " + ", ".join(k + "=" + v["writer"] for k, v in tokens.items()))
