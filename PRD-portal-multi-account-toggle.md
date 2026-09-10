# PRD — Portal Multi-Account Toggle (client / commission-partner switching)

**Owner:** Steven Garcia / Regalias Digitales, LLC
**Status:** Draft v1 (2026-09-10) — core implemented 2026-08-20, see §9
**Scope:** One portal login holding several roster entries, and switching between them.
**Relationship to prior docs:** Extends `PRD-portal-infrastructure.md` §7 (portal access & invites). Does not touch ingestion or distribution.

---

## 1. Problem

One person is frequently several entries on the roster.

Regalias Digitales pays some people twice over: once as a **client**, for their own catalog, and again as a **commission partner**, for commission earned on other writers' works. Those arrive as different statements — commission statements are identifiable by account code, they all begin with `CS` — and they are different money. Several people also hold more than one client entry, because the catalog they brought with them and the catalog Regalias owns are accounted for separately.

From the publisher's own correction list (2026-08-20), real shapes in the live roster:

```
Likybo          Commission Partner   CSJ047, CS0067        <- commission on others' works
Likybo NEW      Client               JN0440, C00746        <- the CLIENT's own catalog
Likybo (100% to Regalias)  Client    JN0192, C00434        <- OLD catalog, now owned by
                                                             Regalias. NOT the writer's.

Dante Storch    Commission Partner   CS0052, CSJ023
Dante Storch NEW           Client    C00306a, JN0047a
Dante Storch (Regalias)    Client    C00306, JN0047

M.I.M.E         Commission Partner   CSJ060
M.I.M.E (Regalias)         Client    C00691, JN0319
```

### 1.1 Two different axes, easily confused

The entries above differ along **two independent dimensions**, and conflating them is how the wrong statements end up on the wrong account:

**Axis 1 — role.** Client, or commission partner. Commission partner entries hold the `CS*` statements: money earned on *other people's* works.

**Axis 2 — who owns the catalog, and therefore who may see it.**

| entry | catalog | who may read it |
|---|---|---|
| `Likybo NEW` | the client's **current** catalog | **the client** |
| `Likybo` / `Likybo (100% to Regalias)` | the **old** catalog, now owned by the publishing company | **the publisher only** |

This is not two views of one person's money. The old account was acquired: Regalias owns that catalog now, so the writer **must not have access to it any more**. It carries their name for historical reasons and nothing else.

> **Therefore it is NOT part of the toggle.** A writer switches between entries that are theirs — their current catalog, and their commission-partner entry if they have one. A publisher-owned entry must never appear in their switcher, never be invitable, and never be readable by them.

Today that distinction exists **only as a naming convention inside a string** — `NEW`, `(Regalias)`, `(100% to Regalias)`. Nothing in the schema records it, nothing validates it, and a rename breaks it silently. See §8.

**A roster entry carries exactly one role.** (Confirmed by Steven, 2026-08-20, reversing an earlier request for a dual-role flag: "They can be only one or the other thing.") Being both is expressed by holding two entries, not by one entry with two markings. 13 of the 15 people the publisher named already arrive this way, appearing on both sheets of the delivered client list.

The portal, however, is reached by **one login per email address**, holding every entry that address has accepted an invite for. Without a way to switch, that login has two bad options: show only one entry and hide the rest, or add them together. Adding them together is wrong — a combined figure mixes commission income with royalty income and answers no question anybody asks.

**We need one login, several accounts, one on screen at a time, chosen by the reader.**

---

## 2. Users

| Who | Holds | Needs |
|---|---|---|
| Writer with one catalog | 1 client entry | Nothing to switch. Must not see a control at all. |
| Writer who is also a commission partner | 1 client + 1 partner entry | Read their royalties, then read their commission, without confusing the two. |
| Writer with own + Regalias-owned catalogs | 2+ client entries | Tell the two catalogs apart, since both carry their name. |
| Manager / attorney | Several unrelated clients | Move between the artists they represent. |

---

## 2.1 What the toggle is, and is not

**The toggle is the role split.** A person's own catalog and their commission
partnership are both theirs, hold different money, and are switched between:

```
Likybo NEW                  client   JN0440, C00746     -> in the switcher
Likybo                      partner  CSJ047, CS0067     -> in the switcher
```

**The `NEW` split is not a toggle.** It marks ownership. The counterpart the
publisher acquired is not the writer's money, is invisible to them, and cannot
be invited to:

```
Likybo (100% to Regalias)   acquired, publisher's       -> NOT in the switcher
```

All three carry the same person's name, and the acquired one is a client-type
row, so nothing about its shape keeps it away from them. Only `publisher_owned`
does.

---

## 3. Goals / Non-goals

### Goals

- One login reaches **every entry it has accepted an invite for**, and no others.
- The portal shows **exactly one entry at a time**, chosen by the reader.
- The choice **persists** across pages and reloads, so moving between Earnings and Statements never silently changes whose money is on screen.
- The control is **invisible** to the single-entry logins that are the overwhelming majority.
- Entries are **distinguishable** on screen when their names are near-identical (`Likybo` vs `Likybo NEW`).

### Non-goals (this phase)

- A dual-role flag on a single entry. Explicitly rejected; roles stay one-per-entry.
- Any **combined** or rolled-up total across entries.
- Linking entries as parent/child sub-accounts of one person (see §8, open).
- Separate credentials per entry. Tried and reversed 2026-08-20: it made switching impossible, which is the point of this document.
- Changing who may see what. Access rules are unchanged (§4).

---

## 4. Access model (unchanged, restated because it bounds this feature)

Two facts this feature must not weaken:

1. **A recorded contact is not an admitted one.** An admin putting an email on a client's contact list makes them contactable; it grants nothing. Access exists only where an invite for that entry has been **accepted** (`writer_contact.user_id`).
2. **An invite link is not proof of identity.** When the address already has a login, accepting a second invite requires that account's password (or an active session for it) before the entry is added. A forwarded link must never attach a stranger to somebody's account.

The switcher therefore offers exactly the entries in `writer_ids_for_user(user)` — claims, never mere contact links.

3. **A publisher-owned entry is never the writer's to see.** An acquired catalog stays on the roster under the original writer's name so the publisher can account for it, but the writer has no claim to that money. It must be excluded from invites and from the portal outright, not merely left un-invited by convention.

**Current gap (2026-09-10):** nothing enforces rule 3. `is_house_account` exists and would do the job, but the acquired entries are labelled `Client` in the delivered list, so they are not marked. Worse, only *bulk* invite skips house accounts — the single-invite dialog and `create_invite` have no guard, so one mis-click hands a writer a catalog they no longer own. See §8.

---

## 5. Data model

No schema change. The claim already lives in the right place:

```
User            one per email address
  |
  |  writer_contact.user_id      <- THE claim, set on invite acceptance
  v
Writer          one roster entry, one role (is_client XOR is_commission_partner)
  |
  v
BeneficiaryAccount   the statement codes (CS* = commission)
```

One `User` → many `writer_contact` rows → many `Writer` entries. The switcher is a read over that.

---

## 6. API surface

Existing endpoints, no new ones required:

```
GET  /me/writers                       -> every entry this login claimed
GET  /me/statements?writer_id=         -> scoped
GET  /me/earnings?writer_id=           -> scoped
GET  /me/transactions?writer_id=       -> scoped
```

`/me/writers` must return, per entry: `id`, `name`, and the entry's **role**, so the UI can disambiguate two entries with near-identical names.

---

## 7. UX

**Placement.** Portal header on `/earnings` and `/statements`, labelled `Viewing`.

**Rendering.** Nothing at all when the login holds fewer than two entries.

**Label.** Name plus role, because `Likybo` and `Likybo NEW` are not distinguishable otherwise:

```
Viewing:  [ Likybo — Commission partner  v ]
          [ Likybo NEW — Client            ]
          [ Likybo (100% to Regalias) — Client ]
```

**Behaviour.**
- Switching refetches statements, earnings and transactions for that entry.
- The choice is stored per browser and survives navigation and reload.
- A stored entry the login no longer holds (access revoked, different person signed in) falls back to the first available rather than showing an empty portal.
- Page copy names the entry being read, never a list of all of them.

**Never:** a combined view, an "All accounts" option, or a total spanning entries.

---

## 8. Open questions

1. **How is a publisher-owned entry marked?** `is_house_account` already excludes the publisher's own books from sends and bulk invites, and would exclude these too — but the publisher labels them `Client`, and they are not house accounts in the ordinary sense (they are named after a writer and reported on separately). Either reuse that flag, or add an explicit `catalog_owner` / `publisher_owned` attribute. **This blocks the toggle being safe to ship**, because today nothing stops an acquired catalog appearing in a writer's portal.

2. **Independent entries or linked sub-accounts?** The publisher's written list reads as independent roster rows. Steven's call notes say "sub accounts". If they should be linked to one person, the switcher can group them and the roster can roll them up — that is a schema change (a `person`/`party` above `Writer`) and a larger piece of work than this document covers.
2. **Should the switcher group by person** when a login holds many entries across several artists (a manager with twelve)? Flat list is fine at 2–3, poor at 12.
3. **Is catalog ownership a field, or forever a naming convention?** `NEW` / `(Regalias)` / `(100% to Regalias)` currently encode, in free text, which side owns the catalog behind an entry — the thing that decides who is owed the money. A rename, a typo, or an import that normalises the name loses it with no error. Making it an explicit attribute on the entry would let the portal label it, the switcher disambiguate it, and validation catch a statement filed against the wrong side.
4. **Which entry is which for `Likybo`?** The publisher's list marks the bare name `Likybo` as the **commission partner** (`CSJ047`, `CS0067`). Steven describes the bare name as **the publisher-owned catalog**. Both cannot be true of one entry, and the codes are the tiebreak: `CS*` is commission. Needs one line back from the publisher before any account is moved.
5. **Does `CS*` hold universally** as the commission marker? If so, ingestion can classify commission accounts automatically instead of relying on the client list, and entries could be created correctly on arrival.

---

## 9. Implementation status (2026-09-10)

**Done** (`verax_frontend RD`, `verax_backend`, branch `rd-portal-clean`, unreleased):

- One login per address holding many claims; accepting a second invite adds the entry to the existing account after proving it (backend `app/services/portal/invites.py::accept_invite`).
- Invite page adapts: username only on first claim, existing password when the address already has a login.
- `WriterSwitcher` + `useActiveWriter` (`src/components/WriterSwitcher/`), rendered on `/earnings` and `/statements`, persisted in `localStorage`, hidden below two entries, falling back when a stored entry is no longer held.
- All `/me` reads scoped by `writer_id`.
- Tests: one login holds both clients and can switch; an invite link alone cannot act on an existing account.

**Outstanding:**

- ~~`/me/writers` does not return the entry's role~~ — **done 2026-09-10.** `_writer_card` already returned `kind`; the switcher now renders `Name — Client` / `Name — Commission partner`, translated EN/ES.
- Entries must actually exist and hold the right accounts. Today there is **no way to move a beneficiary account between entries**, so the splits in §1 cannot be produced. That is the blocking dependency and belongs in its own document.
- Open questions in §8 unanswered.
