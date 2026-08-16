import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../../components/Sidebar/Sidebar';
import { ThemeContext } from '../../components/ThemeProvider/ThemeProvider';
import { useClientContext } from '../../components/ClientContext/ClientContext';
import { Spinner } from '@heroui/react';
import { FaFileAlt } from 'react-icons/fa';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// ── Persistent Storage ──────────────────────────────────────────────
const STORAGE_KEY = 'verax_works_registry_v1';
const MLC_CACHE_KEY = 'verax_mlc_audit_cache_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function loadWorksData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveWorksData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

// ── Constants ───────────────────────────────────────────────────────
const PROS = ['ASCAP', 'BMI', 'SESAC', 'SOCAN'];
const CAPACITIES = [
  { value: 'CA', label: 'Composer & Author' },
  { value: 'C', label: 'Composer' },
  { value: 'A', label: 'Author / Lyricist' },
  { value: 'AR', label: 'Arranger' },
];
const PUB_ROLES = [
  { value: 'E', label: 'Original Publisher' },
  { value: 'AM', label: 'Administrator' },
  { value: 'SE', label: 'Sub-Publisher' },
];
const SOCS = ['ASCAP', 'BMI', 'MLC', 'HFA', 'SoundExchange'];
const SOC_KEYS = ['ascap', 'bmi', 'mlc', 'hfa', 'sx'];

const getStatusConfig = (isDark) => ({
  registered: {
    label: 'Registered',
    color: '#1a8a4a',
    bg: isDark ? 'rgba(26, 138, 74, 0.15)' : '#eefbf3',
    icon: '✓',
  },
  pending: {
    label: 'Pending',
    color: '#a6600a',
    bg: isDark ? 'rgba(166, 96, 10, 0.15)' : '#fef8ec',
    icon: '○',
  },
  failed: {
    label: 'Failed',
    color: '#c53030',
    bg: isDark ? 'rgba(197, 48, 48, 0.15)' : '#fef1f1',
    icon: '✕',
  },
  unregistered: {
    label: 'Unregistered',
    color: isDark ? '#666' : '#aaa',
    bg: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
    icon: '○',
  },
});

// ── ID Generator ────────────────────────────────────────────────────
let _seq = Date.now();
const uid = (prefix = 'WK') => `${prefix}-${(++_seq).toString(36).toUpperCase().slice(-6)}`;

// ── Default Empty Structures ────────────────────────────────────────
const emptyWriter = () => ({
  id: uid('W'),
  firstName: '',
  lastName: '',
  ipi: '',
  pro: 'ASCAP',
  capacity: 'CA',
  prShare: 50,
  mrShare: 50,
  publisherId: '',
});

const emptyPublisher = () => ({
  id: uid('P'),
  name: '',
  ipi: '',
  pro: 'ASCAP',
  role: 'E',
  hfaNumber: '',
  prShare: 50,
  mrShare: 100,
  territory: 'Worldwide',
});

const emptyRecording = () => ({
  isrc: '',
  artist: '',
  duration: '',
});

const emptyWork = () => ({
  id: uid('WK'),
  title: '',
  language: 'EN',
  iswc: '',
  writers: [emptyWriter()],
  publishers: [],
  recordings: [emptyRecording()],
  alternateTitles: [],
  registrations: {
    ascap: 'unregistered',
    bmi: 'unregistered',
    mlc: 'unregistered',
    hfa: 'unregistered',
    sx: 'unregistered',
  },
  regIds: {},
  regDates: {},
  regErrors: {},
  createdAt: new Date().toISOString().split('T')[0],
});

// ── CWR Generator ───────────────────────────────────────────────────
function generateCWR(
  works,
  submitterIpi = '000000000',
  submitterName = 'YOUR PUBLISHING TECH CO',
  targetSociety = 'MLC'
) {
  // CWR v2.2 Rev 2 compliant generator per CISAC spec CWR19-1070
  // All alpha fields MUST be upper case per spec section 2.1
  const padA = (s, n) =>
    String(s || '')
      .toUpperCase()
      .slice(0, n)
      .padEnd(n);
  const padN = (v, n) => String(v || 0).padStart(n, '0');
  // Shares: 5 digits with implied 2 decimal places (e.g. 50.00% = 05000)
  const fmtShare = (pct) => padN(Math.round(Number(pct || 0) * 100), 5);
  const socCode = { ASCAP: '010', BMI: '021', SESAC: '040', SOCAN: '055', AMRA: '083' };
  // Strip hyphens from ISRC for CWR (spec: 12 alphanumeric, no hyphens)
  const cleanIsrc = (isrc) => String(isrc || '').replace(/[-\s]/g, '');
  const now = new Date();
  const ds = now.toISOString().slice(0, 10).replace(/-/g, '');
  const ts = now.toTimeString().slice(0, 8).replace(/:/g, '');

  // Record prefix: RecordType(3) + TransactionSeq(8) + RecordSeq(8) = 19 bytes
  const prefix = (recType, transSeq, recSeq) => padA(recType, 3) + padN(transSeq, 8) + padN(recSeq, 8);

  let lines = [];

  // ── HDR: Transmission Header (spec 3.5, p14-15) ──
  // Pos 1:RecordType(3) + 4:SenderType(2) + 6:SenderID(9,N) + 15:SenderName(45) +
  // 60:EDIVersion(5) + 65:CreationDate(8) + 73:CreationTime(6) + 79:TransmissionDate(8) +
  // 87:CharacterSet(15) + 102:Version(3) + 105:Revision(3,N) +
  // 108:SoftwarePackage(30) + 138:SoftwarePackageVersion(30)
  lines.push(
    padA('HDR', 3) +
      padA('PB', 2) +
      padN(submitterIpi, 9) +
      padA(submitterName, 45) +
      padA('01.10', 5) +
      ds +
      ts +
      ds +
      padA('', 15) +
      padA('2.2', 3) +
      padN(2, 3) +
      padA('VERAX', 30) +
      padA('1.0', 30)
  );

  // ── GRH: Group Header (spec 3.6, p16) ──
  // Pos 1:RecordType(3) + 4:TransactionType(3) + 7:GroupID(5,N) +
  // 12:VersionNumber(5) + 17:BatchRequest(10,N) + 27:SubDistType(2)
  lines.push(padA('GRH', 3) + padA('NWR', 3) + padN(1, 5) + padA('02.20', 5) + padN(0, 10) + padA('', 2));

  let groupRecCount = 2; // GRH + GRT counted in group record count per spec 3.7
  let transCount = 0;

  works.forEach((work, wIdx) => {
    const transSeq = wIdx; // 0-based per spec p9
    let recSeq = 0;

    // Parse duration for NWR and REC
    const durationStr = work.recordings[0]?.duration || '';
    const durParts = durationStr.split(':');
    const durFormatted =
      durParts.length >= 2
        ? padN(durParts[0] || 0, 2) + padN(durParts[1] || 0, 2) + padN(durParts[2] || 0, 2)
        : '000000';

    // ── NWR: New Work Registration (spec 4.2, p24-25) ──
    // Prefix(19) + 20:WorkTitle(60) + 80:LanguageCode(2) + 82:SubmitterWork#(14) +
    // 96:ISWC(11) + 107:CopyrightDate(8,D) + 115:CopyrightNumber(12) +
    // 127:MusicalWorkDistCategory(3) + 130:Duration(6,T) + 136:RecordedIndicator(1,F) +
    // 137:TextMusicRelationship(3) + 140:CompositeType(3) + 143:VersionType(3) +
    // 146:ExcerptType(3) + 149:MusicArrangement(3) + 152:LyricAdaptation(3) +
    // 155:ContactName(30) + 185:ContactID(10) + 195:CWRWorkType(2) +
    // 197:GrandRightsInd(1) + 198:CompositeComponentCount(3,N)
    lines.push(
      prefix('NWR', transSeq, recSeq) +
        padA(work.title, 60) +
        padA(work.language || 'EN', 2) +
        padA(work.id, 14) +
        padA(work.iswc, 11) +
        padN(0, 8) +
        padA('', 12) +
        padA('POP', 3) +
        durFormatted +
        padA('U', 1) +
        padA('', 3) +
        padA('', 3) +
        padA('ORI', 3) +
        padA('', 3) +
        padA('', 3) +
        padA('', 3) +
        padA('', 30) +
        padA('', 10) +
        padA('', 2) +
        padA('', 1) +
        padN(0, 3)
    );
    recSeq++;
    groupRecCount++;

    // ── SPU: Publisher Controlled By Submitter (spec 5.4, p39-40) ──
    work.publishers.forEach((pub, pi) => {
      const pubSeqNum = padN(pi + 1, 2);
      const pc = socCode[pub.pro] || '   ';
      const srShare = pub.srShare != null ? pub.srShare : pub.mrShare; // FIX #1: SR defaults to MR if not set

      // Prefix(19) + 20:PubSeq#(2,N) + 22:InterestedParty#(9,A) +
      // 31:PublisherName(45,A) + 76:PubUnknownInd(1,F) + 77:PublisherType(2,L) +
      // 79:TaxID(9,A) + 88:PubIPIName#(11,L) + 99:SubmitterAgrNum(14,A) +
      // 113:PRAffSoc(3,L) + 116:PROwnership(5,N) + 121:MRSoc(3,L) +
      // 124:MROwnership(5,N) + 129:SRSoc(3,L) + 132:SROwnership(5,N) +
      // 137:SpecialAgrInd(1) + 138:FirstRecRefusal(1) + 139:Filler(1) +
      // 140:PubIPIBase(13) + 153:ISAC(14) + 167:SocAssignedAgrNum(14) +
      // 181:AgreementType(2) + 183:USALicenseInd(1)
      lines.push(
        prefix('SPU', transSeq, recSeq) +
          pubSeqNum +
          padA(pub.id || '', 9) +
          padA(pub.name, 45) +
          padA('', 1) +
          padA(pub.role || 'E', 2) +
          padA('', 9) +
          padA(pub.ipi || '', 11) +
          padA('', 14) +
          pc +
          fmtShare(pub.prShare) +
          pc +
          fmtShare(pub.mrShare) +
          pc +
          fmtShare(srShare) +
          padA('', 1) +
          padA('', 1) +
          padA('', 1) +
          padA('', 13) +
          padA('', 14) +
          padA('', 14) +
          padA('', 2) +
          padA('', 1)
      );
      recSeq++;
      groupRecCount++;

      // ── SPT: Publisher Territory of Control (spec 5.7, p44-45) ──
      // Prefix(19) + 20:InterestedParty#(9) + 29:Constant(6 spaces) +
      // 35:PRCollection(5,N) + 40:MRCollection(5,N) + 45:SRCollection(5,N) +
      // 50:InclExcl(1) + 51:TISCode(4) + 55:SharesChange(1) + 56:Seq#(3,N)
      lines.push(
        prefix('SPT', transSeq, recSeq) +
          padA(pub.id || '', 9) +
          padA('', 6) +
          fmtShare(pub.prShare) +
          fmtShare(pub.mrShare) +
          fmtShare(srShare) +
          'I' +
          '2136' +
          'N' +
          padN(1, 3)
      );
      recSeq++;
      groupRecCount++;
    });

    // ── SWR: Writer Controlled By Submitter (spec 5.9, p46-48) ──
    const validWriters = work.writers.filter((wr) => wr.lastName && wr.lastName.trim());
    validWriters.forEach((wr, wi) => {
      const wc = socCode[wr.pro] || '   ';
      const wrSrShare = wr.srShare != null ? wr.srShare : wr.mrShare; // FIX #3: SR defaults to MR

      // Prefix(19) + 20:InterestedParty#(9) + 29:WriterLastName(45) +
      // 74:WriterFirstName(30) + 104:WriterUnknownInd(1) + 105:WriterDesigCode(2) +
      // 107:TaxID(9,A) + 116:WriterIPIName#(11,L) + 127:PRAffSoc(3) +
      // 130:PROwnership(5,N) + 135:MRSoc(3) + 138:MROwnership(5,N) +
      // 143:SRSoc(3) + 146:SROwnership(5,N) + 151:ReversionaryInd(1) +
      // 152:FirstRecRefusal(1) + 153:WorkForHireInd(1) + 154:Filler(1) +
      // 155:WriterIPIBase(13) + 168:PersonalNum(12,N) + 180:USALicenseInd(1)
      lines.push(
        prefix('SWR', transSeq, recSeq) +
          padA(wr.id || '', 9) +
          padA(wr.lastName, 45) +
          padA(wr.firstName, 30) +
          padA('', 1) +
          padA(wr.capacity || 'CA', 2) +
          padA('', 9) +
          padA(wr.ipi || '', 11) +
          wc +
          fmtShare(wr.prShare) +
          wc +
          fmtShare(wr.mrShare) +
          wc +
          fmtShare(wrSrShare) +
          padA('', 1) +
          padA('', 1) +
          padA('', 1) +
          padA('', 1) +
          padA('', 13) +
          padN(0, 12) +
          padA('', 1)
      );
      recSeq++;
      groupRecCount++;

      // ── SWT: Writer Territory of Control (spec 5.12, p50-51) ──
      // Prefix(19) + 20:InterestedParty#(9) + 29:PRCollection(5) +
      // 34:MRCollection(5) + 39:SRCollection(5) + 44:InclExcl(1) +
      // 45:TISCode(4) + 49:SharesChange(1) + 50:Seq#(3,N)
      lines.push(
        prefix('SWT', transSeq, recSeq) +
          padA(wr.id || '', 9) +
          fmtShare(wr.prShare) +
          fmtShare(wr.mrShare) +
          fmtShare(wrSrShare) +
          'I' +
          '2136' +
          'N' +
          padN(1, 3)
      );
      recSeq++;
      groupRecCount++;

      // ── PWR: Publisher For Writer (spec 5.14, p52-53) ──
      // Prefix(19) + 20:PublisherIP#(9) + 29:PublisherName(45) +
      // 74:SubmitterAgrNum(14) + 88:SocAssignedAgrNum(14) +
      // 102:WriterIP#(9) + 111:PublisherSeq#(2,N)
      if (wr.publisherId && work.publishers.length > 0) {
        const linkedPub = work.publishers.find((p) => p.id === wr.publisherId);
        const pubIdx = work.publishers.findIndex((p) => p.id === wr.publisherId);
        if (linkedPub) {
          lines.push(
            prefix('PWR', transSeq, recSeq) +
              padA(linkedPub.id || '', 9) +
              padA(linkedPub.name, 45) +
              padA('', 14) +
              padA('', 14) +
              padA(wr.id || '', 9) +
              padN(pubIdx + 1, 2)
          );
          recSeq++;
          groupRecCount++;
        }
      } else if (work.publishers.length > 0) {
        const firstPub = work.publishers[0];
        lines.push(
          prefix('PWR', transSeq, recSeq) +
            padA(firstPub.id || '', 9) +
            padA(firstPub.name, 45) +
            padA('', 14) +
            padA('', 14) +
            padA(wr.id || '', 9) +
            padN(1, 2)
        );
        recSeq++;
        groupRecCount++;
      }
    });

    // ── OWR/OWT: Other Writer (unclaimed shares to reach 100%) ──
    // Sum all controlled shares (SPU publishers + SWR writers)
    let totalPR = 0,
      totalMR = 0,
      totalSR = 0;
    work.publishers.forEach((pub) => {
      totalPR += Number(pub.prShare || 0);
      totalMR += Number(pub.mrShare || 0);
      totalSR += Number(pub.srShare != null ? pub.srShare : pub.mrShare || 0);
    });
    validWriters.forEach((wr) => {
      totalPR += Number(wr.prShare || 0);
      totalMR += Number(wr.mrShare || 0);
      totalSR += Number(wr.srShare != null ? wr.srShare : wr.mrShare || 0);
    });

    const remainPR = Math.max(0, 100 - totalPR);
    const remainMR = Math.max(0, 100 - totalMR);
    const remainSR = Math.max(0, 100 - totalSR);

    if (remainPR > 0 || remainMR > 0 || remainSR > 0) {
      // OWR: Other Writer — same layout as SWR but for unclaimed writers
      lines.push(
        prefix('OWR', transSeq, recSeq) +
          padA('', 9) + // InterestedParty# (unknown)
          padA('', 45) + // WriterLastName (unknown)
          padA('', 30) + // WriterFirstName (unknown)
          padA('Y', 1) + // WriterUnknownInd = Yes
          padA('CA', 2) + // WriterDesigCode
          padA('', 9) + // TaxID
          padA('', 11) + // WriterIPIName#
          padA('', 3) + // PRAffSoc (unknown)
          fmtShare(remainPR) + // PROwnership
          padA('', 3) + // MRSoc
          fmtShare(remainMR) + // MROwnership
          padA('', 3) + // SRSoc
          fmtShare(remainSR) + // SROwnership
          padA('', 1) + // ReversionaryInd
          padA('', 1) + // FirstRecRefusal
          padA('', 1) + // WorkForHireInd
          padA('', 1) + // Filler
          padA('', 13) + // WriterIPIBase
          padN(0, 12) + // PersonalNum
          padA('', 1) // USALicenseInd
      );
      recSeq++;
      groupRecCount++;

      // OWT: Other Writer Territory of Control — same layout as SWT
      lines.push(
        prefix('OWT', transSeq, recSeq) +
          padA('', 9) + // InterestedParty# (matches OWR)
          fmtShare(remainPR) + // PRCollection
          fmtShare(remainMR) + // MRCollection
          fmtShare(remainSR) + // SRCollection
          'I' + // InclExcl (I=Include)
          '2136' + // TISCode (worldwide)
          'N' + // SharesChange
          padN(1, 3) // Seq#
      );
      recSeq++;
      groupRecCount++;
    }

    // ── PER: Performing Artist (spec 5.19, p58) ──
    // Prefix(19) + 20:PerfArtistLastName(45) + 65:PerfArtistFirstName(30) +
    // 95:PerfArtistIPIName#(11,L) + 106:PerfArtistIPIBase(13)
    if (work.recordings[0]?.artist) {
      lines.push(
        prefix('PER', transSeq, recSeq) +
          padA(work.recordings[0].artist, 45) +
          padA('', 30) +
          padA('', 11) +
          padA('', 13)
      );
      recSeq++;
      groupRecCount++;
    }

    // ── REC: Recording Detail (spec 5.21, p60 — v2.2 layout) ──
    // Prefix(19) + 20:ReleaseDate(8,D) + 28:Constant(60) + 88:ReleaseDuration(6,T) +
    // 94:Constant(5) + 99:AlbumTitle(60) + 159:AlbumLabel(60) +
    // 219:ReleaseCatalog#(18) + 237:EAN(13) + 250:ISRC(12) +
    // 262:RecordingFormat(1) + 263:RecordingTechnique(1) + 264:MediaType(3)
    // v2.2 additions: 267:RecordingTitle(60) + 327:VersionTitle(60) +
    // 387:DisplayArtist(60) + 447:RecordLabel(60) + 507:ISRCValidity(20) +
    // 527:SubmitterRecordingId(14)
    if (work.recordings[0]?.isrc || work.recordings[0]?.artist) {
      const rec = work.recordings[0];
      const isrc = cleanIsrc(rec.isrc);
      lines.push(
        prefix('REC', transSeq, recSeq) +
          padN(0, 8) +
          padA('', 60) +
          durFormatted +
          padA('', 5) +
          padA('', 60) +
          padA('', 60) +
          padA('', 18) +
          padA('', 13) +
          padA(isrc, 12) +
          padA('A', 1) +
          padA('U', 1) +
          padA('', 3) +
          padA(work.title, 60) +
          padA('', 60) +
          padA(rec.artist || '', 60) +
          padA('', 60) +
          padA(isrc ? 'Y' : '', 20) +
          padA('', 14)
      );
      recSeq++;
      groupRecCount++;
    }

    transCount++;
  });

  // ── GRT: Group Trailer (spec 3.7, p17) ──
  // Pos 1:RecordType(3) + 4:GroupID(5,N) + 9:TransactionCount(8,N) +
  // 17:RecordCount(8,N) + 25:CurrencyIndicator(3,L) + 28:TotalMonetaryValue(10,N)
  lines.push(padA('GRT', 3) + padN(1, 5) + padN(transCount, 8) + padN(groupRecCount, 8) + padA('', 3) + padN(0, 10));

  // ── TRL: Transmission Trailer (spec 3.8, p17) ──
  // Pos 1:RecordType(3) + 4:GroupCount(5,N) + 9:TransactionCount(8,N) + 17:RecordCount(8,N)
  // Record count = HDR(1) + group records (groupRecCount includes GRH+GRT) + TRL(1)
  const totalFileRecords = 1 + groupRecCount + 1; // HDR + group (GRH+data+GRT) + TRL
  lines.push(padA('TRL', 3) + padN(1, 5) + padN(transCount, 8) + padN(totalFileRecords, 8));

  return lines.join('\r\n') + '\r\n';
}

function generateEBR(works, pro = 'ASCAP') {
  const cols =
    pro === 'ASCAP'
      ? [
          'Work Title',
          'Submitter Work ID',
          'ISWC',
          'Writer 1 Last Name',
          'Writer 1 First Name',
          'Writer 1 IPI',
          'Writer 1 Role',
          'Writer 1 % PR',
          'Writer 1 % MR',
          'Writer 2 Last Name',
          'Writer 2 First Name',
          'Writer 2 IPI',
          'Writer 2 Role',
          'Writer 2 % PR',
          'Writer 2 % MR',
          'Publisher 1 Name',
          'Publisher 1 IPI',
          'Publisher 1 % PR',
          'Publisher 1 % MR',
          'Performing Artist',
          'ISRC',
        ]
      : [
          'Song Title',
          'Submitter Work Number',
          'ISWC',
          'Songwriter 1 Last Name',
          'Songwriter 1 First Name',
          'Songwriter 1 IPI #',
          'Songwriter 1 Capacity',
          'Songwriter 1 PR %',
          'Songwriter 1 MR %',
          'Songwriter 2 Last Name',
          'Songwriter 2 First Name',
          'Songwriter 2 IPI #',
          'Songwriter 2 Capacity',
          'Songwriter 2 PR %',
          'Songwriter 2 MR %',
          'Publisher 1 Name',
          'Publisher 1 IPI #',
          'Publisher 1 PR %',
          'Publisher 1 MR %',
          'Performing Artist',
          'ISRC',
        ];

  let rows = [cols.join('\t')];
  const filtered = works.filter((w) => w.writers.some((wr) => wr.pro === pro));
  filtered.forEach((w) => {
    const row = [w.title, w.id, w.iswc || ''];
    for (let i = 0; i < 2; i++) {
      if (i < w.writers.length) {
        const wr = w.writers[i];
        row.push(wr.lastName, wr.firstName, wr.ipi, wr.capacity, wr.prShare.toFixed(2), wr.mrShare.toFixed(2));
      } else row.push('', '', '', '', '', '');
    }
    const pub = w.publishers[0];
    if (pub) row.push(pub.name, pub.ipi, pub.prShare.toFixed(2), pub.mrShare.toFixed(2));
    else row.push('', '', '', '');
    const rec = w.recordings[0];
    row.push(rec?.artist || '', rec?.isrc || '');
    rows.push(row.join('\t'));
  });
  return rows.join('\n');
}

// ── Shared Components ───────────────────────────────────────────────
function Pill({ status, small, isDark }) {
  const ST = getStatusConfig(isDark);
  const c = ST[status] || ST.unregistered;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: small ? 9.5 : 11,
        fontWeight: 500,
        color: c.color,
        background: c.bg,
        padding: small ? '1px 6px' : '2px 8px',
        borderRadius: 4,
      }}
    >
      {c.icon} {c.label}
    </span>
  );
}

function overall(regs) {
  const vals = Object.values(regs);
  if (vals.some((v) => v === 'failed')) return 'failed';
  if (vals.every((v) => v === 'registered') && vals.some((v) => v === 'registered')) return 'registered';
  if (vals.some((v) => v === 'pending')) return 'pending';
  if (vals.some((v) => v === 'registered')) return 'pending';
  return 'unregistered';
}

function Progress({ regs, isDark }) {
  const total = Object.keys(regs).length;
  const done = Object.values(regs).filter((v) => v === 'registered').length;
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div
        style={{
          width: 44,
          height: 3,
          background: isDark ? 'rgba(255,255,255,0.1)' : '#e8e8e8',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: pct === 100 ? '#1a8a4a' : pct > 0 ? '#d4a017' : isDark ? '#444' : '#ccc',
            transition: 'width 0.4s',
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: isDark ? '#666' : '#999', fontFamily: 'var(--font-mono)' }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ── Input Components ────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, mono, type = 'text', style: extraStyle, isDark }) {
  const inputStyle = {
    width: '100%',
    padding: '7px 10px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
    borderRadius: 5,
    color: isDark ? '#fff' : '#111',
    fontSize: 12,
    outline: 'none',
    transition: 'border-color 0.12s',
    fontFamily: mono ? 'var(--font-mono)' : 'inherit',
  };
  const labelStyle = {
    fontSize: 9.5,
    color: isDark ? '#666' : '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 3,
    display: 'block',
    fontWeight: 600,
  };

  return (
    <div style={extraStyle}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => (e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.25)' : '#999')}
        onBlur={(e) => (e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0')}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style: extraStyle, isDark }) {
  const selectStyle = {
    width: '100%',
    padding: '7px 10px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
    borderRadius: 5,
    color: isDark ? '#fff' : '#111',
    fontSize: 12,
    outline: 'none',
    transition: 'border-color 0.12s',
    appearance: 'none',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    paddingRight: 24,
  };
  const labelStyle = {
    fontSize: 9.5,
    color: isDark ? '#666' : '#aaa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 3,
    display: 'block',
    fontWeight: 600,
  };

  return (
    <div style={extraStyle}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

// ── Work Form (Add / Edit) ──────────────────────────────────────────
function WorkForm({ work: initialWork, onSave, onCancel, isNew, isDark }) {
  const [work, setWork] = useState(initialWork);
  const [errors, setErrors] = useState([]);

  const set = (key, val) => setWork((prev) => ({ ...prev, [key]: val }));
  const setWriter = (idx, key, val) => {
    const writers = [...work.writers];
    writers[idx] = { ...writers[idx], [key]: val };
    set('writers', writers);
  };
  const setPub = (idx, key, val) => {
    const publishers = [...work.publishers];
    publishers[idx] = { ...publishers[idx], [key]: val };
    set('publishers', publishers);
  };
  const setRec = (key, val) => {
    const recordings = [{ ...work.recordings[0], [key]: val }];
    set('recordings', recordings);
  };

  const validate = () => {
    const errs = [];
    if (!work.title.trim()) errs.push('Title is required');
    if (!work.writers.length) errs.push('At least one writer required');
    work.writers.forEach((w, i) => {
      if (!w.lastName.trim()) errs.push(`Writer ${i + 1}: last name required`);
      if (!w.ipi.trim()) errs.push(`Writer ${i + 1}: IPI number required`);
      if (w.prShare <= 0) errs.push(`Writer ${i + 1}: PR share must be > 0`);
    });
    const totalPR = work.writers.reduce((s, w) => s + Number(w.prShare), 0);
    const totalMR = work.writers.reduce((s, w) => s + Number(w.mrShare), 0);
    if (totalPR > 100.1) errs.push(`Writer PR shares total ${totalPR.toFixed(1)}% (max 100%)`);
    if (totalMR > 100.1) errs.push(`Writer MR shares total ${totalMR.toFixed(1)}% (max 100%)`);
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    onSave(work);
  };

  const btnBase = {
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div style={{ animation: 'fadeUp 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: isDark ? '#fff' : '#111', margin: 0 }}>
          {isNew ? 'Add Work' : 'Edit Work'}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onCancel}
            style={{
              ...btnBase,
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              color: isDark ? '#888' : '#888',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              ...btnBase,
              background: isDark ? '#fff' : '#111',
              color: isDark ? '#000' : '#fafafa',
              fontWeight: 600,
            }}
          >
            Save Work
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          style={{
            padding: '10px 14px',
            background: isDark ? 'rgba(197, 48, 48, 0.15)' : '#fef1f1',
            border: `1px solid ${isDark ? 'rgba(197, 48, 48, 0.3)' : '#fecaca'}`,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#c53030' }}>
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Basic Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <Field
          label="Title"
          value={work.title}
          onChange={(v) => set('title', v)}
          placeholder="Song title"
          isDark={isDark}
        />
        <Field
          label="ISWC"
          value={work.iswc}
          onChange={(v) => set('iswc', v)}
          placeholder="T-xxx.xxx.xxx-x"
          mono
          isDark={isDark}
        />
        <Select
          label="Language"
          value={work.language}
          onChange={(v) => set('language', v)}
          options={['EN', 'ES', 'FR', 'DE', 'PT', 'IT', 'JA', 'KO', 'ZH']}
          isDark={isDark}
        />
      </div>

      {/* Writers */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 9.5,
              color: isDark ? '#666' : '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Writers
          </span>
          <button
            onClick={() => set('writers', [...work.writers, emptyWriter()])}
            style={{
              fontSize: 10,
              color: isDark ? '#fff' : '#111',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f3f3',
              border: 'none',
              borderRadius: 4,
              padding: '3px 8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Add Writer
          </button>
        </div>
        {work.writers.map((wr, i) => (
          <div
            key={wr.id}
            style={{
              padding: '12px 14px',
              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
              borderRadius: 6,
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px', gap: 8, marginBottom: 6 }}>
              <Field
                label="First Name"
                value={wr.firstName}
                onChange={(v) => setWriter(i, 'firstName', v)}
                isDark={isDark}
              />
              <Field
                label="Last Name"
                value={wr.lastName}
                onChange={(v) => setWriter(i, 'lastName', v)}
                isDark={isDark}
              />
              <Field
                label="IPI"
                value={wr.ipi}
                onChange={(v) => setWriter(i, 'ipi', v)}
                mono
                placeholder="00xxxxxxxxx"
                isDark={isDark}
              />
              <Select
                label="PRO"
                value={wr.pro}
                onChange={(v) => setWriter(i, 'pro', v)}
                options={PROS}
                isDark={isDark}
              />
              <Select
                label="Capacity"
                value={wr.capacity}
                onChange={(v) => setWriter(i, 'capacity', v)}
                options={CAPACITIES}
                isDark={isDark}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 40px', gap: 8, alignItems: 'end' }}>
              <Field
                label="PR Share %"
                value={wr.prShare}
                onChange={(v) => setWriter(i, 'prShare', Number(v))}
                type="number"
                isDark={isDark}
              />
              <Field
                label="MR Share %"
                value={wr.mrShare}
                onChange={(v) => setWriter(i, 'mrShare', Number(v))}
                type="number"
                isDark={isDark}
              />
              {work.publishers.length > 0 ? (
                <Select
                  label="Controlled By"
                  value={wr.publisherId}
                  onChange={(v) => setWriter(i, 'publisherId', v)}
                  options={[
                    { value: '', label: 'None (uncontrolled)' },
                    ...work.publishers.map((p) => ({ value: p.id, label: p.name || 'Unnamed publisher' })),
                  ]}
                  isDark={isDark}
                />
              ) : (
                <div />
              )}
              {work.writers.length > 1 && (
                <button
                  onClick={() =>
                    set(
                      'writers',
                      work.writers.filter((_, j) => j !== i)
                    )
                  }
                  style={{
                    padding: '6px',
                    background: isDark ? 'rgba(197, 48, 48, 0.15)' : '#fef1f1',
                    border: `1px solid ${isDark ? 'rgba(197, 48, 48, 0.3)' : '#fecaca'}`,
                    borderRadius: 4,
                    color: '#c53030',
                    fontSize: 11,
                    cursor: 'pointer',
                    marginBottom: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Publishers */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 9.5,
              color: isDark ? '#666' : '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Publishers{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', color: isDark ? '#444' : '#ccc' }}>
              (optional for self-published)
            </span>
          </span>
          <button
            onClick={() => set('publishers', [...work.publishers, emptyPublisher()])}
            style={{
              fontSize: 10,
              color: isDark ? '#fff' : '#111',
              background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f3f3',
              border: 'none',
              borderRadius: 4,
              padding: '3px 8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Add Publisher
          </button>
        </div>
        {work.publishers.length === 0 && (
          <div
            style={{
              padding: '10px 14px',
              background: isDark ? 'rgba(166, 96, 10, 0.1)' : '#fef8ec',
              border: `1px dashed ${isDark ? 'rgba(166, 96, 10, 0.3)' : '#f0d88a'}`,
              borderRadius: 6,
              fontSize: 12,
              color: '#a6600a',
            }}
          >
            No publisher — work will be registered as self-published
          </div>
        )}
        {work.publishers.map((pub, i) => (
          <div
            key={pub.id}
            style={{
              padding: '12px 14px',
              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
              borderRadius: 6,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 80px 80px 100px 40px',
                gap: 8,
                alignItems: 'end',
              }}
            >
              <Field label="Publisher Name" value={pub.name} onChange={(v) => setPub(i, 'name', v)} isDark={isDark} />
              <Field label="IPI" value={pub.ipi} onChange={(v) => setPub(i, 'ipi', v)} mono isDark={isDark} />
              <Select
                label="PRO"
                value={pub.pro}
                onChange={(v) => setPub(i, 'pro', v)}
                options={PROS}
                isDark={isDark}
              />
              <Select
                label="Role"
                value={pub.role}
                onChange={(v) => setPub(i, 'role', v)}
                options={PUB_ROLES}
                isDark={isDark}
              />
              <Field
                label="HFA #"
                value={pub.hfaNumber}
                onChange={(v) => setPub(i, 'hfaNumber', v)}
                mono
                isDark={isDark}
              />
              <button
                onClick={() =>
                  set(
                    'publishers',
                    work.publishers.filter((_, j) => j !== i)
                  )
                }
                style={{
                  padding: '6px',
                  background: isDark ? 'rgba(197, 48, 48, 0.15)' : '#fef1f1',
                  border: `1px solid ${isDark ? 'rgba(197, 48, 48, 0.3)' : '#fecaca'}`,
                  borderRadius: 4,
                  color: '#c53030',
                  fontSize: 11,
                  cursor: 'pointer',
                  marginBottom: 1,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
              <Field
                label="PR Collection %"
                value={pub.prShare}
                onChange={(v) => setPub(i, 'prShare', Number(v))}
                type="number"
                isDark={isDark}
              />
              <Field
                label="MR Collection %"
                value={pub.mrShare}
                onChange={(v) => setPub(i, 'mrShare', Number(v))}
                type="number"
                isDark={isDark}
              />
              <Field
                label="Territory"
                value={pub.territory}
                onChange={(v) => setPub(i, 'territory', v)}
                isDark={isDark}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recording */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            fontSize: 9.5,
            color: isDark ? '#666' : '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            display: 'block',
            marginBottom: 8,
          }}
        >
          Recording
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 100px',
            gap: 8,
            padding: '12px 14px',
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
            borderRadius: 6,
          }}
        >
          <Field
            label="Artist"
            value={work.recordings[0]?.artist || ''}
            onChange={(v) => setRec('artist', v)}
            isDark={isDark}
          />
          <Field
            label="ISRC"
            value={work.recordings[0]?.isrc || ''}
            onChange={(v) => setRec('isrc', v)}
            mono
            placeholder="USRC12345678"
            isDark={isDark}
          />
          <Field
            label="Duration"
            value={work.recordings[0]?.duration || ''}
            onChange={(v) => setRec('duration', v)}
            placeholder="3:42"
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}

// ── Export Modal ─────────────────────────────────────────────────────
function ExportModal({ works, onClose, isDark, onEnrichWorks }) {
  const [format, setFormat] = useState('cwr');
  const [target, setTarget] = useState('MLC');
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const textRef = useRef(null);

  // Fetch user profile for Sender ID / Sender Name
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_BASE_URL}/auth/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setUserProfile(data);
        }
      } catch {
        // non-critical
      }
    };
    fetchProfile();
  }, []);

  const doEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/mlc-audit/enrich-works`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(works),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        setEnrichResult({ error: errText || 'MLC enrichment failed' });
        return;
      }

      const data = await resp.json();
      setEnrichResult(data);

      // Apply enriched data back to works via parent callback
      if (data.enriched && onEnrichWorks) {
        onEnrichWorks(data.enriched);
      }
    } catch (e) {
      setEnrichResult({ error: e.message || 'Network error' });
    } finally {
      setEnriching(false);
    }
  };

  const doGenerate = () => {
    let content, filename;
    if (format === 'cwr') {
      // Pull Sender ID (publisher IPI) and Sender Name from user profile
      const senderIpi = userProfile?.publisher_ipi || userProfile?.writer_ipi || '000000000';
      const senderName =
        userProfile?.publisher_name ||
        `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() ||
        'UNKNOWN';
      content = generateCWR(works, senderIpi, senderName, target);
      const yr = new Date().getFullYear().toString().slice(-2);
      const socCodes = { MLC: '800', HFA: '801', PRS: '044', GEMA: '035' };
      const rrr = socCodes[target] || '000';
      filename = `CW${yr}0001TST_${rrr}.V22`;
    } else {
      content = generateEBR(works, target);
      filename = `EBR_${target}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.tsv`;
    }
    setGenerated({ content, filename });
    setCopied(false);
  };

  const dataUri = generated ? 'data:text/plain;charset=utf-8,' + encodeURIComponent(generated.content) : null;

  const doCopy = () => {
    if (textRef.current) {
      textRef.current.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // textarea selected for manual copy
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: isDark ? '#1a1a2e' : '#fafafa',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: isDark ? '#fff' : '#111' }}>
            Generate Registration File
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#666' : '#bbb',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '18px 22px', overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <Select
              label="Format"
              value={format}
              onChange={(v) => {
                setFormat(v);
                setGenerated(null);
                setTarget(v === 'cwr' ? 'MLC' : 'ASCAP');
              }}
              options={[
                { value: 'cwr', label: 'CWR (MLC, HFA, CMOs)' },
                { value: 'ebr', label: 'EBR (ASCAP, BMI)' },
              ]}
              isDark={isDark}
            />
            <Select
              label="Target Society"
              value={target}
              onChange={(v) => {
                setTarget(v);
                setGenerated(null);
              }}
              options={
                format === 'cwr'
                  ? [
                      { value: 'MLC', label: 'The MLC' },
                      { value: 'HFA', label: 'HFA' },
                      { value: 'PRS', label: 'PRS' },
                      { value: 'GEMA', label: 'GEMA' },
                    ]
                  : [
                      { value: 'ASCAP', label: 'ASCAP' },
                      { value: 'BMI', label: 'BMI' },
                    ]
              }
              isDark={isDark}
            />
          </div>
          <div style={{ fontSize: 12, color: isDark ? '#666' : '#888', marginBottom: 14 }}>
            {works.length} work{works.length !== 1 ? 's' : ''} will be included
          </div>

          {/* Sender ID warning */}
          {format === 'cwr' && userProfile && !userProfile.publisher_ipi && !generated && (
            <div
              style={{
                padding: '10px 14px',
                background: isDark ? 'rgba(197,48,48,0.1)' : '#fef1f1',
                border: `1px solid ${isDark ? 'rgba(197,48,48,0.25)' : '#fecaca'}`,
                borderRadius: 6,
                marginBottom: 10,
                fontSize: 11.5,
                color: isDark ? '#f87171' : '#c53030',
                lineHeight: 1.5,
              }}
            >
              <strong>Missing Sender ID:</strong> Your Publisher IPI is not set. CWR files require a valid CWR Sender ID
              (your publisher IPI number) in the header. Go to Settings to add it.
            </div>
          )}

          {/* MLC Enrichment for CWR */}
          {format === 'cwr' && !generated && (
            <div
              style={{
                padding: '12px 14px',
                background: isDark ? 'rgba(99,102,241,0.08)' : '#eef2ff',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : '#c7d2fe'}`,
                borderRadius: 6,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: isDark ? '#a5b4fc' : '#4f46e5',
                  marginBottom: 6,
                }}
              >
                MLC Enrichment
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#8890b0' : '#6366f1', marginBottom: 8, lineHeight: 1.5 }}>
                Query the MLC database to fill in ISWCs, validate writer IPIs, and discover registered publishers before
                generating your CWR file.
              </div>
              {enrichResult && !enrichResult.error && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    { l: 'Found', v: enrichResult.summary?.found || 0, c: '#1a8a4a' },
                    { l: 'Not Found', v: enrichResult.summary?.notFound || 0, c: '#a6600a' },
                    {
                      l: 'ISWCs Added',
                      v: (enrichResult.enriched || []).filter((e) => e.iswc && e.source).length,
                      c: isDark ? '#a5b4fc' : '#4f46e5',
                    },
                  ].map((s) => (
                    <div
                      key={s.l}
                      style={{
                        fontSize: 10,
                        color: s.c,
                        fontWeight: 600,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {s.l}: {s.v}
                    </div>
                  ))}
                </div>
              )}
              {enrichResult?.error && (
                <div style={{ fontSize: 11, color: '#c53030', marginBottom: 8 }}>{enrichResult.error}</div>
              )}
              <button
                onClick={doEnrich}
                disabled={enriching}
                style={{
                  padding: '7px 14px',
                  background:
                    enrichResult && !enrichResult.error
                      ? isDark
                        ? 'rgba(26,138,74,0.2)'
                        : '#eefbf3'
                      : isDark
                        ? 'rgba(99,102,241,0.2)'
                        : '#6366f1',
                  border:
                    enrichResult && !enrichResult.error
                      ? `1px solid ${isDark ? 'rgba(26,138,74,0.3)' : '#b8ecc8'}`
                      : 'none',
                  borderRadius: 6,
                  color: enrichResult && !enrichResult.error ? '#1a8a4a' : '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: enriching ? 'not-allowed' : 'pointer',
                  opacity: enriching ? 0.6 : 1,
                }}
              >
                {enriching ? 'Querying MLC...' : enrichResult && !enrichResult.error ? 'Enriched ✓' : 'Enrich from MLC'}
              </button>
            </div>
          )}

          {!generated ? (
            <button
              onClick={doGenerate}
              style={{
                width: '100%',
                padding: '10px',
                background: isDark ? '#fff' : '#111',
                border: 'none',
                borderRadius: 6,
                color: isDark ? '#000' : '#fafafa',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Generate File
            </button>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: isDark ? '#666' : '#aaa',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  {generated.filename}
                </div>
                <pre
                  style={{
                    padding: '12px',
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                    borderRadius: 6,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: isDark ? '#ccc' : '#444',
                    overflow: 'auto',
                    maxHeight: 180,
                    whiteSpace: 'pre',
                    lineHeight: 1.5,
                  }}
                >
                  {generated.content.slice(0, 5000)}
                  {generated.content.length > 5000 ? '\n...' : ''}
                </pre>
              </div>

              <textarea
                ref={textRef}
                value={generated.content}
                readOnly
                style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
              />

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <a
                  href={dataUri}
                  download={generated.filename}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: isDark ? '#fff' : '#111',
                    borderRadius: 6,
                    color: isDark ? '#000' : '#fafafa',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'opacity 0.12s',
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.target.style.opacity = '1')}
                >
                  Download {generated.filename}
                </a>
                <button
                  onClick={doCopy}
                  style={{
                    padding: '10px 16px',
                    background: copied
                      ? isDark
                        ? 'rgba(26,138,74,0.15)'
                        : '#eefbf3'
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : '#fff',
                    border: `1px solid ${copied ? (isDark ? 'rgba(26,138,74,0.3)' : '#b8ecc8') : isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                    borderRadius: 6,
                    color: copied ? '#1a8a4a' : isDark ? '#888' : '#666',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minWidth: 70,
                  }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>

              <div style={{ fontSize: 10.5, color: isDark ? '#555' : '#bbb', lineHeight: 1.5 }}>
                If download doesn't start, right-click the button and "Save link as…"
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Import From Catalog Modal ───────────────────────────────────────
function ImportModal({ onImport, onClose, isDark }) {
  const { selectedClientId } = useClientContext();
  const [catalogTracks, setCatalogTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const token = localStorage.getItem('token');
        let url = `${API_BASE_URL}/catalog/tracks?limit=1000`;
        if (selectedClientId) url += `&client_id=${selectedClientId}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (resp.ok) {
          const data = await resp.json();
          setCatalogTracks(data.items || []);
        }
      } catch (e) {
        console.error('Failed to fetch catalog:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [selectedClientId]);

  const toggleAll = () => {
    if (selected.size === catalogTracks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(catalogTracks.map((_, i) => i)));
    }
  };

  const handleImport = () => {
    const works = catalogTracks
      .filter((_, i) => selected.has(i))
      .map((track) => ({
        ...emptyWork(),
        title: track.title || track.name || '',
        recordings: [
          {
            isrc: track.isrc || '',
            artist: track.artist || '',
            duration: '',
          },
        ],
      }));
    onImport(works);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: isDark ? '#1a1a2e' : '#fafafa',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: isDark ? '#fff' : '#111' }}>
            Import from Catalog
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#666' : '#bbb',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '14px 22px', overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <Spinner size="md" color="default" />
            </div>
          ) : catalogTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: isDark ? '#666' : '#aaa', fontSize: 13 }}>
              No catalog tracks found.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <button
                  onClick={toggleAll}
                  style={{
                    fontSize: 11,
                    color: isDark ? '#888' : '#666',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {selected.size === catalogTracks.length ? 'Deselect All' : 'Select All'}
                </button>
                <span style={{ fontSize: 11, color: isDark ? '#666' : '#aaa' }}>{selected.size} selected</span>
              </div>
              {catalogTracks.map((track, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const n = new Set(selected);
                    n.has(idx) ? n.delete(idx) : n.add(idx);
                    setSelected(n);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: selected.has(idx) ? (isDark ? 'rgba(99,102,241,0.1)' : '#f0f0ff') : 'transparent',
                    marginBottom: 2,
                    transition: 'background 0.08s',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${selected.has(idx) ? '#6366f1' : isDark ? 'rgba(255,255,255,0.2)' : '#d0d0d0'}`,
                      background: selected.has(idx) ? '#6366f1' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {selected.has(idx) && '✓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: isDark ? '#fff' : '#111',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {track.title || track.name}
                    </div>
                    <div style={{ fontSize: 10, color: isDark ? '#666' : '#aaa' }}>{track.artist}</div>
                  </div>
                  <div style={{ fontSize: 10, color: isDark ? '#555' : '#ccc', fontFamily: 'var(--font-mono)' }}>
                    {track.isrc || '—'}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div
          style={{
            padding: '14px 22px',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderRadius: 6,
              color: isDark ? '#888' : '#888',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            style={{
              padding: '8px 16px',
              background:
                selected.size > 0 ? (isDark ? '#fff' : '#111') : isDark ? 'rgba(255,255,255,0.05)' : '#e0e0e0',
              border: 'none',
              borderRadius: 6,
              color: selected.size > 0 ? (isDark ? '#000' : '#fafafa') : isDark ? '#555' : '#aaa',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Import {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Edit Works Modal ────────────────────────────────────────────
function BulkEditWorksModal({ count, onApply, onClose, isDark }) {
  const [includeWriterPro, setIncludeWriterPro] = useState(false);
  const [includeWriterPr, setIncludeWriterPr] = useState(false);
  const [includeWriterMr, setIncludeWriterMr] = useState(false);
  const [includePubRole, setIncludePubRole] = useState(false);
  const [includePubPro, setIncludePubPro] = useState(false);
  const [includePubPr, setIncludePubPr] = useState(false);
  const [includePubMr, setIncludePubMr] = useState(false);

  const [writerPro, setWriterPro] = useState('ASCAP');
  const [writerPr, setWriterPr] = useState(50);
  const [writerMr, setWriterMr] = useState(50);
  const [pubRole, setPubRole] = useState('E');
  const [pubPro, setPubPro] = useState('ASCAP');
  const [pubPr, setPubPr] = useState(50);
  const [pubMr, setPubMr] = useState(100);

  const hasAny =
    includeWriterPro ||
    includeWriterPr ||
    includeWriterMr ||
    includePubRole ||
    includePubPro ||
    includePubPr ||
    includePubMr;

  const handleApply = () => {
    const updates = {};
    if (includeWriterPro) updates.writerPro = writerPro;
    if (includeWriterPr) updates.writerPrShare = Number(writerPr);
    if (includeWriterMr) updates.writerMrShare = Number(writerMr);
    if (includePubRole) updates.pubRole = pubRole;
    if (includePubPro) updates.pubPro = pubPro;
    if (includePubPr) updates.pubPrShare = Number(pubPr);
    if (includePubMr) updates.pubMrShare = Number(pubMr);
    onApply(updates);
  };

  const inputStyle = {
    padding: '6px 10px',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
    borderRadius: 5,
    color: isDark ? '#fff' : '#111',
    fontSize: 12,
    outline: 'none',
    width: 70,
  };

  const selectStyle = { ...inputStyle, width: 'auto', flex: 1 };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 8 };
  const labelStyle = { fontSize: 12, fontWeight: 500, minWidth: 100, color: isDark ? '#ccc' : '#333' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          background: isDark ? '#1a1a2e' : '#fafafa',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          animation: 'fadeUp 0.2s ease',
          padding: '22px 24px',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px 0', color: isDark ? '#fff' : '#111' }}>
          Bulk Edit
        </h3>
        <p style={{ fontSize: 12, color: isDark ? '#666' : '#aaa', margin: '0 0 18px 0' }}>
          Apply to {count} selected work{count !== 1 ? 's' : ''}. Check fields to update.
        </p>

        {/* Writer section */}
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            color: isDark ? '#666' : '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Writers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={rowStyle}>
            <input type="checkbox" checked={includeWriterPro} onChange={() => setIncludeWriterPro(!includeWriterPro)} />
            <span style={labelStyle}>PRO</span>
            <select
              value={writerPro}
              onChange={(e) => setWriterPro(e.target.value)}
              disabled={!includeWriterPro}
              style={{ ...selectStyle, opacity: includeWriterPro ? 1 : 0.4 }}
            >
              {PROS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div style={rowStyle}>
            <input type="checkbox" checked={includeWriterPr} onChange={() => setIncludeWriterPr(!includeWriterPr)} />
            <span style={labelStyle}>PR Share %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={writerPr}
              onChange={(e) => setWriterPr(e.target.value)}
              disabled={!includeWriterPr}
              style={{ ...inputStyle, opacity: includeWriterPr ? 1 : 0.4 }}
            />
          </div>
          <div style={rowStyle}>
            <input type="checkbox" checked={includeWriterMr} onChange={() => setIncludeWriterMr(!includeWriterMr)} />
            <span style={labelStyle}>MR Share %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={writerMr}
              onChange={(e) => setWriterMr(e.target.value)}
              disabled={!includeWriterMr}
              style={{ ...inputStyle, opacity: includeWriterMr ? 1 : 0.4 }}
            />
          </div>
        </div>

        {/* Publisher section */}
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            color: isDark ? '#666' : '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Publishers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <div style={rowStyle}>
            <input type="checkbox" checked={includePubRole} onChange={() => setIncludePubRole(!includePubRole)} />
            <span style={labelStyle}>Role</span>
            <select
              value={pubRole}
              onChange={(e) => setPubRole(e.target.value)}
              disabled={!includePubRole}
              style={{ ...selectStyle, opacity: includePubRole ? 1 : 0.4 }}
            >
              {PUB_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div style={rowStyle}>
            <input type="checkbox" checked={includePubPro} onChange={() => setIncludePubPro(!includePubPro)} />
            <span style={labelStyle}>PRO</span>
            <select
              value={pubPro}
              onChange={(e) => setPubPro(e.target.value)}
              disabled={!includePubPro}
              style={{ ...selectStyle, opacity: includePubPro ? 1 : 0.4 }}
            >
              {PROS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div style={rowStyle}>
            <input type="checkbox" checked={includePubPr} onChange={() => setIncludePubPr(!includePubPr)} />
            <span style={labelStyle}>PR Collection %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={pubPr}
              onChange={(e) => setPubPr(e.target.value)}
              disabled={!includePubPr}
              style={{ ...inputStyle, opacity: includePubPr ? 1 : 0.4 }}
            />
          </div>
          <div style={rowStyle}>
            <input type="checkbox" checked={includePubMr} onChange={() => setIncludePubMr(!includePubMr)} />
            <span style={labelStyle}>MR Collection %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={pubMr}
              onChange={(e) => setPubMr(e.target.value)}
              disabled={!includePubMr}
              style={{ ...inputStyle, opacity: includePubMr ? 1 : 0.4 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderRadius: 6,
              color: isDark ? '#888' : '#888',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!hasAny}
            style={{
              padding: '8px 16px',
              background: hasAny ? (isDark ? '#fff' : '#111') : isDark ? 'rgba(255,255,255,0.05)' : '#e0e0e0',
              border: 'none',
              borderRadius: 6,
              color: hasAny ? (isDark ? '#000' : '#fafafa') : isDark ? '#555' : '#aaa',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: hasAny ? 'pointer' : 'not-allowed',
            }}
          >
            Apply to {count} work{count !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AutoRegister = () => {
  const { currentTheme } = useContext(ThemeContext);
  const isDark = currentTheme === 'dark';
  const ST = getStatusConfig(isDark);

  const [catalog, setCatalog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [autoRegEnabled, setAutoRegEnabled] = useState(null);
  const [view, setView] = useState('list'); // list | add | edit | detail
  const [activeWork, setActiveWork] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [checked, setChecked] = useState(new Set());
  const [regging, setRegging] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  // Check if auto-register is enabled for this user
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setAutoRegEnabled(false);
          return;
        }
        const res = await fetch(`${API_BASE}/auth/user/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAutoRegEnabled(!!data.auto_register_enabled);
        } else {
          setAutoRegEnabled(false);
        }
      } catch {
        setAutoRegEnabled(false);
      }
    };
    checkAccess();
  }, []);

  // Load from localStorage
  useEffect(() => {
    const data = loadWorksData();
    setCatalog(data && data.length ? data : []);
    setLoaded(true);
  }, []);

  // Save on change
  useEffect(() => {
    if (loaded) saveWorksData(catalog);
  }, [catalog, loaded]);

  const notify = (msg, ok) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const addWork = (work) => {
    setCatalog((prev) => [work, ...prev]);
    setView('list');
    notify(`Added "${work.title}"`, true);
  };

  const updateWork = (work) => {
    setCatalog((prev) => prev.map((w) => (w.id === work.id ? work : w)));
    setView('list');
    setActiveWork(null);
    notify(`Updated "${work.title}"`, true);
  };

  const deleteWork = (id) => {
    const title = catalog.find((w) => w.id === id)?.title;
    setCatalog((prev) => prev.filter((w) => w.id !== id));
    setView('list');
    setActiveWork(null);
    setChecked((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    notify(`Deleted "${title}"`);
  };

  const importWorks = (works) => {
    // Deduplicate: skip works that already exist by title+ISRC
    const existingKeys = new Set(catalog.map((w) => `${w.title.toLowerCase()}|${w.recordings[0]?.isrc || ''}`));
    const newWorks = works.filter((w) => !existingKeys.has(`${w.title.toLowerCase()}|${w.recordings[0]?.isrc || ''}`));
    if (newWorks.length === 0) {
      notify('All selected tracks are already in your works registry');
      setShowImport(false);
      return;
    }
    setCatalog((prev) => [...newWorks, ...prev]);
    setShowImport(false);
    notify(`Imported ${newWorks.length} work${newWorks.length !== 1 ? 's' : ''} from catalog`, true);
  };

  const bulkEditWorks = (updates) => {
    const ids = [...checked];
    setCatalog((prev) =>
      prev.map((w) => {
        if (!ids.includes(w.id)) return w;
        const updated = { ...w };
        // Update writers
        if (updates.writerPro !== undefined) {
          updated.writers = updated.writers.map((wr) => ({ ...wr, pro: updates.writerPro }));
        }
        if (updates.writerPrShare !== undefined) {
          updated.writers = updated.writers.map((wr) => ({ ...wr, prShare: updates.writerPrShare }));
        }
        if (updates.writerMrShare !== undefined) {
          updated.writers = updated.writers.map((wr) => ({ ...wr, mrShare: updates.writerMrShare }));
        }
        // Update publishers
        if (updates.pubRole !== undefined && updated.publishers.length > 0) {
          updated.publishers = updated.publishers.map((p) => ({ ...p, role: updates.pubRole }));
        }
        if (updates.pubPro !== undefined && updated.publishers.length > 0) {
          updated.publishers = updated.publishers.map((p) => ({ ...p, pro: updates.pubPro }));
        }
        if (updates.pubPrShare !== undefined && updated.publishers.length > 0) {
          updated.publishers = updated.publishers.map((p) => ({ ...p, prShare: updates.pubPrShare }));
        }
        if (updates.pubMrShare !== undefined && updated.publishers.length > 0) {
          updated.publishers = updated.publishers.map((p) => ({ ...p, mrShare: updates.pubMrShare }));
        }
        return updated;
      })
    );
    setShowBulkEdit(false);
    notify(`Updated ${ids.length} work${ids.length !== 1 ? 's' : ''}`, true);
  };

  const simulateRegister = (ids) => {
    ids.forEach((id) => setRegging((p) => new Set([...p, id])));
    notify(`Submitting ${ids.length} work${ids.length > 1 ? 's' : ''}…`);

    setTimeout(() => {
      setCatalog((prev) =>
        prev.map((w) => {
          if (!ids.includes(w.id)) return w;
          const newRegs = { ...w.registrations };
          const newDates = { ...w.regDates };
          Object.keys(newRegs).forEach((k) => {
            if (newRegs[k] === 'unregistered' || newRegs[k] === 'failed') {
              newRegs[k] = 'pending';
              newDates[k] = new Date().toISOString().split('T')[0];
            }
          });
          return { ...w, registrations: newRegs, regDates: newDates };
        })
      );
      ids.forEach((id) =>
        setRegging((p) => {
          const n = new Set(p);
          n.delete(id);
          return n;
        })
      );
      notify('Registrations submitted', true);

      // Simulate ACK responses
      setTimeout(() => {
        setCatalog((prev) =>
          prev.map((w) => {
            if (!ids.includes(w.id)) return w;
            const newRegs = { ...w.registrations };
            const newIds = { ...w.regIds };
            const newDates = { ...w.regDates };
            const newErrors = { ...w.regErrors };
            Object.keys(newRegs).forEach((k) => {
              if (newRegs[k] === 'pending') {
                if (Math.random() > 0.15) {
                  newRegs[k] = 'registered';
                  newIds[k] = `${k.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                  newDates[k] = new Date().toISOString().split('T')[0];
                  delete newErrors[k];
                } else {
                  newRegs[k] = 'failed';
                  newErrors[k] = ['Missing IPI', 'Share mismatch', 'Duplicate work'][Math.floor(Math.random() * 3)];
                }
              }
            });
            return { ...w, registrations: newRegs, regIds: newIds, regDates: newDates, regErrors: newErrors };
          })
        );
        notify('ACK responses processed', true);
      }, 3000);
    }, 2000);
  };

  const toggle = (id) =>
    setChecked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtered = catalog.filter((w) => {
    const q = search.toLowerCase();
    const ms =
      !q ||
      w.title.toLowerCase().includes(q) ||
      w.writers.some((wr) => `${wr.firstName} ${wr.lastName}`.toLowerCase().includes(q)) ||
      w.id.toLowerCase().includes(q) ||
      (w.recordings[0]?.artist || '').toLowerCase().includes(q);
    const ov = overall(w.registrations);
    const mf =
      filter === 'all' ||
      (filter === 'complete' && ov === 'registered') ||
      (filter === 'incomplete' && ov !== 'registered') ||
      (filter === 'failed' && ov === 'failed');
    return ms && mf;
  });

  const stats = {
    total: catalog.length,
    done: catalog.filter((w) => overall(w.registrations) === 'registered').length,
    pend: catalog.filter((w) => overall(w.registrations) === 'pending').length,
    act: catalog.filter((w) => {
      const o = overall(w.registrations);
      return o === 'unregistered' || o === 'failed';
    }).length,
  };

  if (autoRegEnabled === false) {
    return (
      <>
        <Helmet>
          <title>RD - Works Registry</title>
        </Helmet>
        <div
          style={{
            minHeight: '100vh',
            background: isDark ? '#0f0f1a' : '#f6f5f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sidebar />
          <div
            style={{
              marginLeft: 'var(--sidebar-width, 72px)',
              textAlign: 'center',
              maxWidth: 420,
              padding: '0 24px',
            }}
          >
            <FaFileAlt size={48} style={{ color: isDark ? '#333' : '#ccc', marginBottom: 20 }} />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: isDark ? '#fff' : '#111',
                margin: '0 0 12px',
              }}
            >
              Automatic Registration
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: isDark ? '#888' : '#666',
                margin: '0 0 28px',
              }}
            >
              Register your works with PROs and CMOs automatically. Available by invitation only.
            </p>
            <a
              href="mailto:contact@verax.app?subject=Auto-Register%20Access%20Request&body=Hi%2C%20I%27d%20like%20to%20request%20access%20to%20automatic%20registration."
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: isDark ? '#fff' : '#111',
                color: isDark ? '#000' : '#fff',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Request Access
            </a>
          </div>
        </div>
      </>
    );
  }

  if (!loaded || autoRegEnabled === null) {
    return (
      <>
        <Helmet>
          <title>RD - Works Registry</title>
        </Helmet>
        <div
          style={{
            minHeight: '100vh',
            background: isDark ? '#0a0a0a' : '#f5f3ef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sidebar />
          <div style={{ marginLeft: 'var(--sidebar-width, 72px)', textAlign: 'center' }}>
            <Spinner size="lg" color="primary" />
            <div style={{ marginTop: 16, color: isDark ? '#888' : '#666', fontSize: 14 }}>Loading works…</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>RD - Works Registry</title>
      </Helmet>

      <div
        style={{
          minHeight: '100vh',
          background: isDark ? '#0f0f1a' : '#f6f5f3',
          color: isDark ? '#fff' : '#111',
          display: 'flex',
        }}
      >
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
          @keyframes toastIn{from{transform:translateX(-50%) translateY(14px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
          input[type=number]::-webkit-inner-spin-button{opacity:1}
        `}</style>

        <Sidebar />

        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '9px 20px',
              background: toast.ok ? (isDark ? 'rgba(26, 138, 74, 0.2)' : '#eefbf3') : isDark ? '#1a1a2e' : '#fff',
              border: `1px solid ${toast.ok ? (isDark ? 'rgba(26, 138, 74, 0.3)' : '#b8ecc8') : isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
              borderRadius: 6,
              color: toast.ok ? '#1a8a4a' : isDark ? '#fff' : '#111',
              fontSize: 12,
              fontWeight: 500,
              zIndex: 300,
              animation: 'toastIn 0.2s ease',
              boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
            }}
          >
            {toast.msg}
          </div>
        )}

        {showExport && (
          <ExportModal
            works={checked.size ? catalog.filter((w) => checked.has(w.id)) : catalog}
            onClose={() => setShowExport(false)}
            isDark={isDark}
            onEnrichWorks={(enriched) => {
              // Apply MLC enrichment data back to catalog works
              setCatalog((prev) =>
                prev.map((work) => {
                  const match = enriched.find((e) => e.workId === work.id);
                  if (!match || !match.source) return work;

                  const updated = { ...work };

                  // Apply ISWC if found and not already set
                  if (match.iswc && !updated.iswc) {
                    updated.iswc = match.iswc;
                  }

                  // Enrich writers: if current writers are empty placeholders, REPLACE with MLC data
                  if (match.enrichedWriters && match.enrichedWriters.length > 0) {
                    const hasRealWriters = updated.writers.some((wr) => wr.lastName && wr.lastName.trim());
                    if (!hasRealWriters) {
                      // Writers are blank placeholders — replace entirely with MLC writers
                      updated.writers = match.enrichedWriters.map((mw) => ({
                        ...emptyWriter(),
                        firstName: mw.firstName || '',
                        lastName: mw.lastName || '',
                        ipi: mw.ipi || '',
                        capacity:
                          mw.role === 'CA' || mw.role === 'C' || mw.role === 'A' || mw.role === 'AR' ? mw.role : 'CA',
                        prShare: Number(mw.prShare) || 50,
                        mrShare: Number(mw.mrShare) || 50,
                      }));
                    } else {
                      // Has real writers — merge IPI numbers by last name match
                      updated.writers = updated.writers.map((wr) => {
                        const mlcMatch = match.enrichedWriters.find(
                          (mw) => mw.lastName && wr.lastName && mw.lastName.toLowerCase() === wr.lastName.toLowerCase()
                        );
                        if (mlcMatch) {
                          return {
                            ...wr,
                            ipi: wr.ipi || mlcMatch.ipi || '',
                            firstName: wr.firstName || mlcMatch.firstName || wr.firstName,
                          };
                        }
                        return wr;
                      });
                    }
                  }

                  // Add MLC publishers if work has none
                  if (
                    match.enrichedPublishers &&
                    match.enrichedPublishers.length > 0 &&
                    updated.publishers.length === 0
                  ) {
                    updated.publishers = match.enrichedPublishers.map((mp) => ({
                      ...emptyPublisher(),
                      name: mp.name || '',
                      ipi: mp.ipi || '',
                      role: mp.role === 'E' || mp.role === 'AM' || mp.role === 'SE' ? mp.role : 'E',
                      prShare: Number(mp.prShare) || 50,
                      mrShare: Number(mp.mrShare) || 100,
                    }));
                  }

                  return updated;
                })
              );
            }}
          />
        )}

        {showImport && <ImportModal onImport={importWorks} onClose={() => setShowImport(false)} isDark={isDark} />}

        {showBulkEdit && (
          <BulkEditWorksModal
            count={checked.size}
            onApply={bulkEditWorks}
            onClose={() => setShowBulkEdit(false)}
            isDark={isDark}
          />
        )}

        <main style={{ flex: 1, padding: '30px 36px', marginLeft: 'var(--sidebar-width, 72px)' }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? '#666' : '#bbb',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                marginBottom: 2,
              }}
            >
              Catalog Registry
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#111',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Works
              </h1>
              {view === 'list' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setShowImport(true)}
                    style={{
                      padding: '8px 14px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                      borderRadius: 6,
                      color: isDark ? '#888' : '#555',
                      fontSize: 11.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Import from Catalog
                  </button>
                  <button
                    onClick={() => setShowExport(true)}
                    style={{
                      padding: '8px 14px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                      borderRadius: 6,
                      color: isDark ? '#888' : '#555',
                      fontSize: 11.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Export{checked.size > 0 ? ` (${checked.size})` : ''}
                  </button>
                  <button
                    onClick={() => {
                      setActiveWork(emptyWork());
                      setView('add');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: isDark ? '#fff' : '#111',
                      border: 'none',
                      borderRadius: 6,
                      color: isDark ? '#000' : '#f6f5f3',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add Work
                  </button>
                </div>
              )}
            </div>
          </div>

          {view === 'list' && (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
                {[
                  { l: 'Total', v: stats.total, c: isDark ? '#fff' : '#111' },
                  { l: 'Registered', v: stats.done, c: '#1a8a4a' },
                  { l: 'Pending', v: stats.pend, c: '#a6600a' },
                  { l: 'Needs Action', v: stats.act, c: '#c53030' },
                ].map((s) => (
                  <div
                    key={s.l}
                    style={{
                      padding: '13px 15px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: isDark ? '#666' : '#bbb',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {s.l}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Search + Filters */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#555' : '#ccc',
                      fontSize: 13,
                      pointerEvents: 'none',
                    }}
                  >
                    ⌕
                  </span>
                  <input
                    type="text"
                    placeholder="Search works, writers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 11px 8px 30px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                      borderRadius: 6,
                      color: isDark ? '#fff' : '#111',
                      fontSize: 12.5,
                      outline: 'none',
                      transition: 'border-color 0.12s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.25)' : '#999')}
                    onBlur={(e) => (e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0')}
                  />
                </div>
                {['all', 'complete', 'incomplete', 'failed'].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setFilter(fl)}
                    style={{
                      padding: '7px 11px',
                      background:
                        filter === fl ? (isDark ? '#fff' : '#111') : isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${filter === fl ? (isDark ? '#fff' : '#111') : isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                      borderRadius: 6,
                      color: filter === fl ? (isDark ? '#000' : '#f6f5f3') : isDark ? '#888' : '#888',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.1s',
                    }}
                  >
                    {fl}
                  </button>
                ))}
                {checked.size > 0 && (
                  <>
                    <button
                      onClick={() => setShowBulkEdit(true)}
                      style={{
                        padding: '7px 14px',
                        background: isDark ? 'rgba(139,92,246,0.15)' : '#f3f0ff',
                        border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#c4b5fd'}`,
                        borderRadius: 6,
                        color: '#8b5cf6',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Bulk Edit ({checked.size})
                    </button>
                    <button
                      onClick={() => {
                        simulateRegister([...checked]);
                        setChecked(new Set());
                      }}
                      style={{
                        padding: '7px 14px',
                        background: isDark ? '#fff' : '#111',
                        border: 'none',
                        borderRadius: 6,
                        color: isDark ? '#000' : '#f6f5f3',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Register ({checked.size})
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Add / Edit Form */}
          {(view === 'add' || view === 'edit') && (
            <WorkForm
              work={activeWork}
              isNew={view === 'add'}
              onSave={view === 'add' ? addWork : updateWork}
              onCancel={() => {
                setView('list');
                setActiveWork(null);
              }}
              isDark={isDark}
            />
          )}

          {/* Detail View */}
          {view === 'detail' && activeWork && (
            <div style={{ animation: 'fadeUp 0.2s ease' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isDark ? '#555' : '#bbb',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: 3,
                    }}
                  >
                    {activeWork.id}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: isDark ? '#fff' : '#111', margin: 0 }}>
                    {activeWork.title}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setView('edit')}
                    style={{
                      padding: '7px 14px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'}`,
                      borderRadius: 6,
                      color: isDark ? '#888' : '#555',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this work?')) deleteWork(activeWork.id);
                    }}
                    style={{
                      padding: '7px 14px',
                      background: isDark ? 'rgba(197, 48, 48, 0.15)' : '#fef1f1',
                      border: `1px solid ${isDark ? 'rgba(197, 48, 48, 0.3)' : '#fecaca'}`,
                      borderRadius: 6,
                      color: '#c53030',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setView('list');
                      setActiveWork(null);
                    }}
                    style={{
                      padding: '7px 14px',
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#f3f3f3',
                      border: 'none',
                      borderRadius: 6,
                      color: isDark ? '#888' : '#888',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { l: 'Language', v: activeWork.language },
                  { l: 'ISWC', v: activeWork.iswc || '—' },
                  { l: 'Added', v: activeWork.createdAt },
                  { l: 'Status', badge: overall(activeWork.registrations) },
                ].map((x) => (
                  <div
                    key={x.l}
                    style={{
                      padding: '10px 14px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: isDark ? '#666' : '#bbb',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {x.l}
                    </div>
                    {x.badge ? (
                      <Pill status={x.badge} isDark={isDark} />
                    ) : (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: x.v === '—' ? (isDark ? '#444' : '#ccc') : isDark ? '#fff' : '#222',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {x.v}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Writers */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 9.5,
                    color: isDark ? '#666' : '#aaa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  Writers
                </div>
                {activeWork.writers.map((wr, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '9px 12px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                      borderRadius: 6,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: isDark ? '#fff' : '#111', fontWeight: 500 }}>
                        {wr.firstName} {wr.lastName}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: isDark ? '#555' : '#bbb',
                          fontFamily: 'var(--font-mono)',
                          marginLeft: 8,
                        }}
                      >
                        IPI: {wr.ipi}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: isDark ? '#666' : '#888', fontFamily: 'var(--font-mono)' }}>
                        PR:{wr.prShare}% MR:{wr.mrShare}%
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: isDark ? '#ccc' : '#555',
                          background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f3f3',
                          padding: '2px 7px',
                          borderRadius: 3,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {wr.pro}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Publishers */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 9.5,
                    color: isDark ? '#666' : '#aaa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  Publisher
                </div>
                {activeWork.publishers.length ? (
                  activeWork.publishers.map((pub, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '9px 12px',
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                        borderRadius: 6,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontSize: 13, color: isDark ? '#fff' : '#111', fontWeight: 500 }}>{pub.name}</div>
                      <div style={{ fontSize: 10, color: isDark ? '#555' : '#bbb', fontFamily: 'var(--font-mono)' }}>
                        IPI: {pub.ipi} | HFA: {pub.hfaNumber || '—'} | {pub.pro}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '9px 12px',
                      background: isDark ? 'rgba(166, 96, 10, 0.1)' : '#fef8ec',
                      border: `1px dashed ${isDark ? 'rgba(166, 96, 10, 0.3)' : '#f0d88a'}`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#a6600a',
                    }}
                  >
                    Self-published
                  </div>
                )}
              </div>

              {/* Registrations */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      color: isDark ? '#666' : '#aaa',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 600,
                    }}
                  >
                    Registrations
                  </span>
                  {Object.values(activeWork.registrations).some((v) => v === 'unregistered' || v === 'failed') && (
                    <button
                      onClick={() => simulateRegister([activeWork.id])}
                      style={{
                        fontSize: 10,
                        color: isDark ? '#fff' : '#111',
                        background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f3f3',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Auto-Register All
                    </button>
                  )}
                </div>
                {SOC_KEYS.map((k, i) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                      borderRadius: 6,
                      marginBottom: 4,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: isDark ? '#fff' : '#222',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {SOCS[i]}
                      </div>
                      {activeWork.regIds[k] && (
                        <div
                          style={{
                            fontSize: 9.5,
                            color: isDark ? '#555' : '#bbb',
                            fontFamily: 'var(--font-mono)',
                            marginTop: 1,
                          }}
                        >
                          ID: {activeWork.regIds[k]}
                        </div>
                      )}
                      {activeWork.regDates[k] && (
                        <div style={{ fontSize: 9.5, color: isDark ? '#444' : '#ccc', fontFamily: 'var(--font-mono)' }}>
                          {activeWork.regDates[k]}
                        </div>
                      )}
                      {activeWork.regErrors[k] && (
                        <div style={{ fontSize: 10, color: '#c53030', marginTop: 2 }}>{activeWork.regErrors[k]}</div>
                      )}
                    </div>
                    <Pill status={activeWork.registrations[k]} small isDark={isDark} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog List */}
          {view === 'list' && (
            <div
              style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '30px 1.3fr 140px 180px 70px 44px',
                  padding: '9px 16px',
                  borderBottom: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                  background: isDark ? 'rgba(255,255,255,0.02)' : '#fafaf9',
                }}
              >
                {['', 'Work', 'Writers', 'Registrations', 'Progress', ''].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: isDark ? '#555' : '#bbb',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Table Rows */}
              {filtered.map((work, idx) => {
                const ov = overall(work.registrations);
                const busy = regging.has(work.id);
                return (
                  <div
                    key={work.id}
                    onClick={() => {
                      setActiveWork(work);
                      setView('detail');
                    }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 1.3fr 140px 180px 70px 44px',
                      padding: '11px 16px',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f3f3f2'}`,
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                      animation: `fadeUp 0.2s ease ${idx * 0.02}s both`,
                      background: checked.has(work.id) ? (isDark ? 'rgba(99,102,241,0.08)' : '#f8f7f4') : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!checked.has(work.id))
                        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#fcfcfb';
                    }}
                    onMouseLeave={(e) => {
                      if (!checked.has(work.id)) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(work.id);
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          border: `1.5px solid ${checked.has(work.id) ? (isDark ? '#fff' : '#111') : isDark ? 'rgba(255,255,255,0.2)' : '#d0d0d0'}`,
                          background: checked.has(work.id) ? (isDark ? '#fff' : '#111') : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 8,
                          color: isDark ? '#000' : '#fff',
                        }}
                      >
                        {checked.has(work.id) && '✓'}
                      </div>
                    </div>

                    {/* Work Title */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: isDark ? '#fff' : '#111',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {work.title}
                        </span>
                        {!work.publishers.length && (
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 600,
                              color: '#a6600a',
                              background: isDark ? 'rgba(166,96,10,0.15)' : '#fef8ec',
                              padding: '1px 4px',
                              borderRadius: 3,
                              flexShrink: 0,
                            }}
                          >
                            SELF-PUB
                          </span>
                        )}
                        {busy && (
                          <span
                            style={{
                              fontSize: 8,
                              color: isDark ? '#555' : '#bbb',
                              animation: 'pulse 1.2s infinite',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            SUBMITTING…
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: isDark ? '#555' : '#bbb', fontFamily: 'var(--font-mono)' }}>
                        {work.id} · {work.createdAt}
                      </div>
                    </div>

                    {/* Writers */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {work.writers.slice(0, 2).map((wr, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: isDark ? '#ccc' : '#444',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.4,
                          }}
                        >
                          {wr.firstName} {wr.lastName}
                          <span
                            style={{
                              fontSize: 9,
                              color: isDark ? '#555' : '#ccc',
                              marginLeft: 3,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {wr.pro}
                          </span>
                        </div>
                      ))}
                      {work.writers.length > 2 && (
                        <div style={{ fontSize: 9.5, color: isDark ? '#444' : '#ccc', fontFamily: 'var(--font-mono)' }}>
                          +{work.writers.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Registration Dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      {SOC_KEYS.map((k, i) => {
                        const st = work.registrations[k];
                        const c = ST[st] || ST.unregistered;
                        return (
                          <div
                            key={k}
                            title={`${SOCS[i]}: ${c.label}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              fontSize: 8.5,
                              color: c.color,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 400,
                            }}
                          >
                            <div
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 99,
                                background: c.color,
                                opacity: st === 'unregistered' ? 0.3 : 0.9,
                              }}
                            />
                            {SOCS[i].slice(0, 3).toUpperCase()}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Progress regs={work.registrations} isDark={isDark} />
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {(ov === 'unregistered' || ov === 'failed') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            simulateRegister([work.id]);
                          }}
                          disabled={busy}
                          style={{
                            padding: '3px 8px',
                            background: isDark ? '#fff' : '#111',
                            border: 'none',
                            borderRadius: 4,
                            color: isDark ? '#000' : '#f6f5f3',
                            fontSize: 9,
                            fontWeight: 600,
                            cursor: busy ? 'not-allowed' : 'pointer',
                            opacity: busy ? 0.35 : 1,
                          }}
                        >
                          {busy ? '…' : 'Reg'}
                        </button>
                      )}
                      {ov === 'registered' && <span style={{ fontSize: 12, color: '#1a8a4a' }}>✓</span>}
                    </div>
                  </div>
                );
              })}

              {!filtered.length && (
                <div style={{ padding: 40, textAlign: 'center', color: isDark ? '#555' : '#bbb', fontSize: 12 }}>
                  {catalog.length === 0
                    ? 'No works yet. Add a work or import from your catalog.'
                    : 'No works match your search.'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AutoRegister;
