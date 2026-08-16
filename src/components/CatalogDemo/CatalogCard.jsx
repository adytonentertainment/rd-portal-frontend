import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Upload, Download, Search, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

const catalogSongs = [
  {
    id: 1,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    completion: 50,
    status: 'review',
    date: '11/29/19',
    code: 'USUG1201916',
    albumArt: '/The_Weeknd_-_Blinding_Lights.png',
  },
  {
    id: 2,
    title: 'Levitating',
    artist: 'Dua Lipa',
    completion: 50,
    status: 'case',
    date: '03/27/20',
    code: 'GBAHT2000245',
    albumArt: '/album-levitating.png',
  },
  {
    id: 3,
    title: 'Heat Waves',
    artist: 'Glass Animals',
    completion: 100,
    status: 'case',
    date: '06/29/20',
    code: 'GBUM72003401',
    albumArt: 'https://i.scdn.co/image/ab67616d00001e02712701c5e263efc8726b1464',
  },
  {
    id: 4,
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    completion: 50,
    status: 'case',
    date: '07/09/21',
    code: 'USSM12103613',
    albumArt: 'https://i.scdn.co/image/ab67616d00001e02aed1660585c1e3c9ffb50b6a',
  },
  {
    id: 5,
    title: 'As It Was',
    artist: 'Harry Styles',
    completion: 100,
    status: 'review',
    date: '04/01/22',
    code: 'USSM12200612',
    albumArt: '/album-as-it-was.png',
  },
];

export function CatalogCard({ theme = 'dark' }) {
  const [selectedSongs, setSelectedSongs] = useState([1, 2, 3]);
  const [view, setView] = useState(0);
  const isLight = theme === 'light';

  const cardBg = isLight ? '#ffffff' : '#000000';
  const cardBorder = isLight ? '#e2ddd5' : 'rgba(255, 255, 255, 0.05)';
  const headerBg = isLight ? '#ffffff' : '#000000';
  const headerBorder = isLight ? '#e5e5e5' : '#262626';
  const textPrimary = isLight ? '#111111' : '#f5f5f5';
  const textSecondary = isLight ? '#525252' : '#a3a3a3';
  const textMuted = isLight ? '#a3a3a3' : '#737373';
  const inputBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const inputBorder = isLight ? '#d4d4d4' : '#262626';
  const rowHover = isLight ? '#fafafa' : '#0a0a0a';
  const rowBorder = isLight ? '#f5f5f5' : '#1a1a1a';
  const checkboxBg = isLight ? '#111111' : '#f5f5f5';
  const checkboxBorder = isLight ? '#a3a3a3' : '#525252';
  const checkmarkColor = isLight ? '#ffffff' : '#000000';
  const iconColor = isLight ? '#525252' : '#a3a3a3';
  const iconBtnBg = isLight ? '#f5f5f5' : '#0a0a0a';
  const iconBtnBorder = isLight ? '#d4d4d4' : '#262626';

  useEffect(() => {
    const timer = setInterval(() => {
      setView((prev) => (prev + 1) % 2);
      if (view === 0) {
        setSelectedSongs([1, 2, 4]);
      } else {
        setSelectedSongs([1, 2, 3, 4, 5]);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [view]);

  const toggleSelect = (id) => {
    setSelectedSongs((prev) => (prev.includes(id) ? prev.filter((songId) => songId !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedSongs(catalogSongs.map((s) => s.id));
  };

  const deselectAll = () => {
    setSelectedSongs([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'relative',
        width: '400px',
        height: '480px',
        overflow: 'hidden',
        borderRadius: '16px',
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: isLight ? '0 2px 16px rgba(0, 0, 0, 0.06)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${headerBorder}`,
          background: headerBg,
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: textPrimary, margin: 0 }}>Catalog</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus style={{ height: '16px', width: '16px' }} />
              ADD
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Trash2 style={{ height: '16px', width: '16px' }} />
              CLEAR
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: inputBg,
              border: `1px solid ${inputBorder}`,
              borderRadius: '6px',
            }}
          >
            <Search style={{ height: '16px', width: '16px', color: textMuted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search..."
              style={{
                flex: 1,
                background: 'transparent',
                fontSize: '14px',
                color: textPrimary,
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            style={{
              padding: '8px',
              background: iconBtnBg,
              border: `1px solid ${iconBtnBorder}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Upload style={{ height: '16px', width: '16px', color: iconColor }} />
          </button>
          <button
            style={{
              padding: '8px',
              background: iconBtnBg,
              border: `1px solid ${iconBtnBorder}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Download style={{ height: '16px', width: '16px', color: iconColor }} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{ padding: '4px', color: iconColor, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft style={{ height: '16px', width: '16px' }} />
            </button>
            <span style={{ color: textSecondary }}>Page 1 of 3</span>
            <button style={{ padding: '4px', color: iconColor, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronRight style={{ height: '16px', width: '16px' }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={selectAll}
              style={{
                color: textSecondary,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              SELECT ALL
            </button>
            <button
              onClick={deselectAll}
              style={{
                color: textSecondary,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              DESELECT
            </button>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div style={{ overflowY: 'auto', height: '300px' }}>
        <AnimatePresence mode="wait">
          {catalogSongs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderBottom: `1px solid ${rowBorder}`,
                transition: 'background 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(song.id)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    border: `2px solid ${selectedSongs.includes(song.id) ? checkboxBg : checkboxBorder}`,
                    background: selectedSongs.includes(song.id) ? checkboxBg : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {selectedSongs.includes(song.id) && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ width: '10px', height: '10px', color: checkmarkColor }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </div>
              </button>

              {/* Album Art */}
              <img
                src={song.albumArt}
                alt={song.title}
                style={{
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                }}
              />

              {/* Song Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {song.title}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {song.artist}
                </div>
              </div>

              {/* Status & Actions Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: song.status === 'review' ? '#f97316' : isLight ? '#111111' : '#f5f5f5',
                    color: song.status === 'review' ? '#ffffff' : isLight ? '#ffffff' : '#000000',
                  }}
                >
                  {song.status === 'review' ? 'IN REVIEW' : 'RAISE A CASE'}
                </button>
                <div style={{ fontSize: '11px', color: textMuted }}>{song.date}</div>
              </div>

              {/* More Menu */}
              <button
                style={{
                  flexShrink: 0,
                  padding: '6px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <MoreVertical style={{ height: '16px', width: '16px', color: iconColor }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Decorative corner accent */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '128px',
          width: '128px',
          borderTopLeftRadius: '100%',
          background: isLight
            ? 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.06), transparent)'
            : 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), transparent)',
        }}
      />
    </motion.div>
  );
}
