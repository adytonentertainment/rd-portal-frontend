// Mock writer roster for the demo. Real backend clients (if any) get merged on top.
// Negative IDs to avoid collision with real DB ids.

export const MOCK_WRITERS = [
  {
    id: -1,
    name: 'Demo Writer',
    color: '#c8102e',
    catalog: ['Lantern Light', 'Coastline Drive', 'Hours Like These', 'Slow Tide', 'Open Window'],
  },
  {
    id: -2,
    name: 'Ava Brooks',
    color: '#3b82f6',
    catalog: ['Garden in May', 'Telephone Wires', 'Saturday Letters', 'Thirteen'],
  },
  {
    id: -3,
    name: 'M. Okonkwo',
    color: '#16a34a',
    catalog: ['Eastlake', 'Iron Sky', 'Open Window'],
  },
  {
    id: -4,
    name: 'The Vine Sessions',
    color: '#f59e0b',
    catalog: ['Cathedral', 'Marrow', 'Ride Out', 'Hours Like These'],
  },
  {
    id: -5,
    name: 'RedZed',
    color: '#8b5cf6',
    beneficiaryCodes: ['C00616', 'JN0232'],
    catalog: [
      'Rave In The Grave',
      'Explode',
      'Meth Phonk',
      'Straight Outta Flames',
      'Deadboy98',
      'Drugs = Magic',
      'Counting Days Till Suicide',
      'Dead Bodies Everywhere',
      'Blood Spillin On Concrete',
      "Sippin' Blood",
      'Necromancer',
      'Cradle Of Filth',
      'Horror',
      'Burn My Bridges',
      'Junkie',
      'Ghoul',
    ],
  },
];

export const getWriterById = (id) => MOCK_WRITERS.find((w) => w.id === id);

// Immutable snapshot of the seed roster, taken before any runtime mutation
// (deletions splice MOCK_WRITERS in place). Used to restore a deleted seeded
// writer under its ORIGINAL id — e.g. recreating RedZed by re-uploading their
// statement files, so the real-data wiring keyed on id -5 keeps working.
export const SEED_WRITERS = MOCK_WRITERS.map((w) => ({
  ...w,
  catalog: [...(w.catalog || [])],
  ...(w.beneficiaryCodes ? { beneficiaryCodes: [...w.beneficiaryCodes] } : {}),
}));
