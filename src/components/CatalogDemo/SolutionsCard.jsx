import { motion } from 'framer-motion';

const codeLines = [
  {
    num: 1,
    content: [
      { text: 'import', color: '#C586C0' },
      { text: ' { ', color: null },
      { text: 'TuneMGMT', color: '#4FC1FF' },
      { text: ' } ', color: null },
      { text: 'from', color: '#C586C0' },
      { text: " '@tunemgmt/sdk'", color: '#CE9178' },
      { text: ';', color: null },
    ],
  },
  { num: 2, content: [] },
  { num: 3, content: [{ text: '// Initialize client', color: '#6A9955' }] },
  {
    num: 4,
    content: [
      { text: 'const', color: '#C586C0' },
      { text: ' ', color: null },
      { text: 'client', color: '#4FC1FF' },
      { text: ' = ', color: null },
      { text: 'new', color: '#C586C0' },
      { text: ' ', color: null },
      { text: 'TuneMGMT', color: '#4EC9B0' },
      { text: '({', color: null },
    ],
  },
  {
    num: 5,
    content: [
      { text: '  apiKey', color: '#9CDCFE' },
      { text: ': ', color: null },
      { text: 'process', color: '#4FC1FF' },
      { text: '.', color: null },
      { text: 'env', color: '#9CDCFE' },
      { text: '.', color: null },
      { text: 'API_KEY', color: '#4FC1FF' },
      { text: ',', color: null },
    ],
  },
  {
    num: 6,
    content: [
      { text: '  environment', color: '#9CDCFE' },
      { text: ': ', color: null },
      { text: "'production'", color: '#CE9178' },
    ],
  },
  { num: 7, content: [{ text: '});', color: null }] },
  { num: 8, content: [] },
  { num: 9, content: [{ text: '// Fetch catalog analytics', color: '#6A9955' }] },
  {
    num: 10,
    content: [
      { text: 'const', color: '#C586C0' },
      { text: ' ', color: null },
      { text: 'data', color: '#4FC1FF' },
      { text: ' = ', color: null },
      { text: 'await', color: '#C586C0' },
      { text: ' ', color: null },
      { text: 'client', color: '#4FC1FF' },
    ],
  },
  {
    num: 11,
    content: [
      { text: '  .catalog', color: '#9CDCFE' },
      { text: '.', color: null },
      { text: 'getAnalytics', color: '#DCDCAA' },
      { text: '({', color: null },
    ],
  },
  {
    num: 12,
    content: [
      { text: '    timeframe', color: '#9CDCFE' },
      { text: ': ', color: null },
      { text: "'30d'", color: '#CE9178' },
      { text: ',', color: null },
    ],
  },
  {
    num: 13,
    content: [
      { text: '    metrics', color: '#9CDCFE' },
      { text: ': [', color: null },
      { text: "'streams'", color: '#CE9178' },
      { text: ', ', color: null },
      { text: "'revenue'", color: '#CE9178' },
      { text: ']', color: null },
    ],
  },
  { num: 14, content: [{ text: '  });', color: null }] },
  { num: 15, content: [] },
  { num: 16, content: [{ text: '// Process results', color: '#6A9955' }] },
  {
    num: 17,
    content: [
      { text: 'const', color: '#C586C0' },
      { text: ' ', color: null },
      { text: 'report', color: '#4FC1FF' },
      { text: ' = ', color: null },
      { text: 'data', color: '#4FC1FF' },
      { text: '.', color: null },
      { text: 'generateReport', color: '#DCDCAA' },
      { text: '();', color: null },
    ],
  },
  {
    num: 18,
    content: [
      { text: 'console', color: '#4FC1FF' },
      { text: '.', color: null },
      { text: 'log', color: '#DCDCAA' },
      { text: '(', color: null },
      { text: 'report', color: '#4FC1FF' },
      { text: '.', color: null },
      { text: 'summary', color: '#9CDCFE' },
      { text: ');', color: null },
    ],
  },
];

export function SolutionsCard({ theme = 'dark' }) {
  const isLight = theme === 'light';

  const cardBg = isLight ? '#ffffff' : '#000000';
  const cardBorder = isLight ? '#e2ddd5' : 'rgba(255, 255, 255, 0.05)';
  const textPrimary = isLight ? '#111111' : '#f5f5f5';
  const textSecondary = isLight ? '#525252' : '#a3a3a3';

  // Code editor always dark for contrast
  const editorBg = 'rgba(24, 24, 27, 0.98)';
  const editorBorder = 'rgba(255, 255, 255, 0.08)';
  const titleBarBg = 'rgba(32, 32, 35, 0.98)';
  const lineNumColor = 'rgba(255, 255, 255, 0.25)';
  const lineNumBorder = 'rgba(255, 255, 255, 0.06)';
  const lineNumBg = 'rgba(18, 18, 20, 0.5)';
  const defaultCodeColor = '#D4D4D4';

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
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: textPrimary, margin: '0 0 6px 0' }}>Custom Solutions</h2>
        <p style={{ fontSize: '14px', color: textSecondary, margin: 0 }}>
          Build with our SDK and APIs for tailored integrations
        </p>
      </div>

      {/* Code Editor */}
      <div
        style={{
          background: editorBg,
          borderRadius: '12px',
          border: `1px solid ${editorBorder}`,
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {/* Mac title bar */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${lineNumBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: titleBarBg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F' }} />
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: 'Monaco, Consolas, monospace',
              }}
            >
              yoursolution.js
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              background: 'rgba(39, 201, 63, 0.15)',
              color: '#27C93F',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            Connected
          </span>
        </div>

        {/* Code content */}
        <div style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>
          {/* Line numbers */}
          <div
            style={{
              padding: '12px 8px',
              borderRight: `1px solid ${lineNumBorder}`,
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '11px',
              lineHeight: '1.7',
              color: lineNumColor,
              textAlign: 'right',
              minWidth: '32px',
              background: lineNumBg,
              userSelect: 'none',
            }}
          >
            {codeLines.map((line) => (
              <div key={line.num}>{line.num}</div>
            ))}
          </div>

          {/* Code */}
          <pre
            style={{
              flex: 1,
              padding: '12px 14px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '11px',
              lineHeight: '1.7',
              margin: 0,
              color: defaultCodeColor,
              overflow: 'hidden',
            }}
          >
            {codeLines.map((line) => (
              <div key={line.num}>
                {line.content.length === 0
                  ? '\n'
                  : line.content.map((token, tIdx) => (
                      <span key={tIdx} style={token.color ? { color: token.color } : undefined}>
                        {token.text}
                      </span>
                    ))}
              </div>
            ))}
          </pre>
        </div>
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
            ? 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.06), transparent)'
            : 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.1), transparent)',
        }}
      />
    </motion.div>
  );
}
