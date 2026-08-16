import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function PublishingAnalysis() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [statements, setStatements] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [streamingData, setStreamingData] = useState({});

  useEffect(() => {
    fetchDataAndAnalyze();
  }, []);

  const fetchDataAndAnalyze = async () => {
    try {
      setLoading(true);

      // Fetch transactions
      const transactionsResponse = await fetch('http://localhost:8000/revenue/transactions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Fetch statements
      const statementsResponse = await fetch('http://localhost:8000/revenue/statements', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Fetch catalog
      const catalogResponse = await fetch('http://localhost:8000/catalog', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Fetch streaming revenue analysis
      const streamingResponse = await fetch('http://localhost:8000/catalog/streaming-revenue-analysis', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (transactionsResponse.ok && statementsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        const statementsData = await statementsResponse.json();
        const catalogData = catalogResponse.ok ? await catalogResponse.json() : { catalog: [] };

        setTransactions(transactionsData.transactions || []);
        setStatements(statementsData.statements || []);

        // Index streaming data by title
        let streamingByTitle = {};
        if (streamingResponse.ok) {
          const streamingResponseData = await streamingResponse.json();
          (streamingResponseData.tracks || []).forEach((track) => {
            const normalizedTitle = (track.title || '').toLowerCase().trim();
            streamingByTitle[normalizedTitle] = track;
          });
          setStreamingData(streamingByTitle);
        }

        // Analyze the data with catalog and streaming data
        const analyzed = analyzeData(
          transactionsData.transactions || [],
          statementsData.statements || [],
          catalogData.catalog || [],
          streamingByTitle
        );
        setAnalysis(analyzed);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeData = (transactions, statements, catalog, streamingDataParam = {}) => {
    if (transactions.length === 0 && catalog.length === 0) {
      return {
        statementTotals: [],
        yearlyIncome: [],
        timeline: [],
        redFlags: [],
        totalReported: 0,
        duplicateCount: 0,
        microPaymentCount: 0,
        uniqueSongs: 0,
        uniqueCountries: 0,
        catalogSongs: 0,
        missingSongs: [],
        catalogHealth: 0,
        totalStreamingDiscrepancy: 0,
        discrepancyPercentage: 0,
        totalExpectedRevenue: 0,
        totalActualRevenue: 0,
      };
    }

    // Analyze statements
    const statementTotals = statements.map((s) => ({
      statement: new Date(s.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      amount: s.totalAmount || 0,
      rows: s.transactionCount || 0,
      date: s.uploadDate,
    }));

    // Analyze by year
    const yearlyMap = {};
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const year = date.getFullYear();
      if (!yearlyMap[year]) yearlyMap[year] = 0;
      yearlyMap[year] += t.amount || 0;
    });

    const yearlyIncome = Object.entries(yearlyMap)
      .sort(([a], [b]) => a - b)
      .map(([year, amount], idx) => ({
        year,
        amount: Math.round(amount * 100) / 100,
        status: idx === 0 ? 'Early Period' : `Year ${idx}`,
        color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][idx % 5],
      }));

    // Detect duplicates
    const duplicateMap = {};
    transactions.forEach((t) => {
      const key = `${t.date}:${t.source}:${t.amount}:${t.product}`;
      duplicateMap[key] = (duplicateMap[key] || 0) + 1;
    });
    const duplicateCount = Object.values(duplicateMap).filter((count) => count > 1).length;

    // Count micro-payments
    const microPaymentCount = transactions.filter((t) => t.amount > 0 && t.amount < 0.01).length;

    // Unique songs and countries
    const uniqueSongs = new Set(transactions.map((t) => t.product).filter(Boolean)).size;
    const uniqueCountries = new Set(transactions.map((t) => t.territory).filter(Boolean)).size;

    // Total reported
    const totalReported = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Red flags
    const redFlags = [];
    if (duplicateCount > transactions.length * 0.1) {
      redFlags.push({
        title: 'High Duplicate Rate',
        description: `${duplicateCount} potential duplicates (${Math.round((duplicateCount / transactions.length) * 100)}% of transactions)`,
        severity: 'critical',
      });
    }
    if (microPaymentCount > transactions.length * 0.2) {
      redFlags.push({
        title: 'Excessive Micro-Payments',
        description: `${microPaymentCount} payments under $0.01 (${Math.round((microPaymentCount / transactions.length) * 100)}%)`,
        severity: 'warning',
      });
    }
    if (uniqueSongs > 0 && transactions.length / uniqueSongs > 1000) {
      redFlags.push({
        title: 'Extreme Fragmentation',
        description: `${Math.round(transactions.length / uniqueSongs)} transactions per song on average`,
        severity: 'warning',
      });
    }
    if (statements.length < 3) {
      redFlags.push({
        title: 'Insufficient Statements',
        description: `Only ${statements.length} statement(s) uploaded. More data needed for full analysis.`,
        severity: 'info',
      });
    }

    // Catalog Health Analysis
    const catalogSongs = catalog.length;
    const missingSongs = [];
    let catalogHealth = 100;
    let totalPotentiallyLostRevenue = 0;

    if (catalogSongs > 0 && transactions.length > 0) {
      // Get all song titles from transactions (normalize for comparison)
      const songsInStatements = new Set(
        transactions.map((t) => (t.product || '').toLowerCase().trim()).filter(Boolean)
      );

      // Check which catalog songs are missing from statements
      catalog.forEach((song) => {
        const songTitle = (song.title || '').toLowerCase().trim();
        const artist = song.artist || '';

        // Check if song appears in any transaction
        const foundInStatements =
          songsInStatements.has(songTitle) ||
          Array.from(songsInStatements).some(
            (statementSong) => statementSong.includes(songTitle) || songTitle.includes(statementSong)
          );

        if (!foundInStatements) {
          // Calculate potentially lost revenue from streaming data
          let potentialRevenue = 0;
          if (streamingDataParam && Object.keys(streamingDataParam).length > 0) {
            const normalizedTitle = (song.title || '').toLowerCase().trim();
            const streamInfo = streamingDataParam[normalizedTitle];
            if (streamInfo) {
              potentialRevenue = streamInfo.expected_publishing_revenue || 0;
            }
          }

          missingSongs.push({
            title: song.title,
            artist: artist,
            isrc: song.isrc || '',
            master_royalty: song.master_royalty || 0,
            publishing_royalty: song.publishing_royalty || 0,
            potentialRevenue: potentialRevenue,
          });

          totalPotentiallyLostRevenue += potentialRevenue;
        }
      });

      catalogHealth = Math.round(((catalogSongs - missingSongs.length) / catalogSongs) * 100);

      // Add red flag if many songs are missing
      if (missingSongs.length > 0) {
        const missingPercentage = Math.round((missingSongs.length / catalogSongs) * 100);
        redFlags.push({
          title: 'Missing Songs in Statements',
          description: `${missingSongs.length} songs (${missingPercentage}%) from your catalog are not found in uploaded statements - potential revenue leaks!`,
          severity: missingPercentage > 50 ? 'critical' : 'warning',
        });
      }
    } else if (catalogSongs > 0 && transactions.length === 0) {
      redFlags.push({
        title: 'No Revenue Data',
        description: `You have ${catalogSongs} songs in your catalog but no revenue statements uploaded.`,
        severity: 'warning',
      });
    }

    // Calculate streaming revenue discrepancy
    let totalStreamingDiscrepancy = 0;
    let totalExpectedRevenue = 0;
    let totalActualRevenue = 0;

    if (streamingDataParam && Object.keys(streamingDataParam).length > 0 && transactions.length > 0) {
      // Group transactions by song title to get total revenue per song
      const revenueByTitle = {};
      transactions.forEach((t) => {
        const normalizedTitle = (t.product || '').toLowerCase().trim();
        if (normalizedTitle) {
          revenueByTitle[normalizedTitle] = (revenueByTitle[normalizedTitle] || 0) + (t.amount || 0);
        }
      });

      // Calculate discrepancy for each song with streaming data
      Object.keys(streamingDataParam).forEach((normalizedTitle) => {
        const streamInfo = streamingDataParam[normalizedTitle];
        const expectedRevenue = streamInfo.expected_publishing_revenue || 0;
        const actualRevenue = revenueByTitle[normalizedTitle] || 0;

        totalExpectedRevenue += expectedRevenue;
        totalActualRevenue += actualRevenue;

        const discrepancy = expectedRevenue - actualRevenue;
        if (discrepancy > 0) {
          totalStreamingDiscrepancy += discrepancy;
        }
      });
    }

    // Calculate discrepancy percentage
    const discrepancyPercentage =
      totalExpectedRevenue > 0 ? (totalStreamingDiscrepancy / totalExpectedRevenue) * 100 : 0;

    // Apply health penalty based on discrepancy
    let adjustedCatalogHealth = catalogHealth;
    if (discrepancyPercentage > 0 && totalExpectedRevenue > 0) {
      const healthPenalty = Math.min(discrepancyPercentage / 2, 50);
      adjustedCatalogHealth = Math.max(0, catalogHealth - healthPenalty);
    }

    // Add red flag for revenue discrepancy
    if (totalStreamingDiscrepancy > 0 && discrepancyPercentage > 10) {
      redFlags.push({
        title: 'Revenue Discrepancy Detected',
        description: `${discrepancyPercentage.toFixed(1)}% revenue discrepancy detected ($${totalStreamingDiscrepancy.toFixed(2)} underreported) - expected publishing revenue significantly exceeds reported revenue.`,
        severity: discrepancyPercentage > 50 ? 'critical' : 'warning',
      });
    }

    return {
      statementTotals,
      yearlyIncome,
      timeline: [], // Would need more complex logic to detect missing quarters
      redFlags,
      totalReported: Math.round(totalReported * 100) / 100,
      duplicateCount,
      microPaymentCount,
      uniqueSongs,
      uniqueCountries,
      transactionCount: transactions.length,
      catalogSongs,
      missingSongs,
      catalogHealth: Math.round(adjustedCatalogHealth),
      catalogCoverage: catalogHealth,
      totalStreamingDiscrepancy,
      discrepancyPercentage,
      totalExpectedRevenue,
      totalActualRevenue,
      totalPotentiallyLostRevenue,
    };
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
          <p className="text-gray-600">Analyzing revenue data...</p>
        </div>
      </div>
    );
  }

  if (!analysis || transactions.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Revenue Data Found</h2>
          <p className="text-gray-600 mb-6">Upload CSV statements to begin forensic analysis</p>
          <p className="text-sm text-gray-500">
            Go to Revenue page and click "Upload Statement" to add your publishing royalty statements.
          </p>
        </div>
      </div>
    );
  }

  const {
    statementTotals,
    yearlyIncome,
    redFlags,
    totalReported,
    duplicateCount,
    microPaymentCount,
    uniqueSongs,
    uniqueCountries,
    transactionCount,
    catalogSongs,
    missingSongs,
    catalogHealth,
    totalStreamingDiscrepancy,
    discrepancyPercentage,
    totalPotentiallyLostRevenue,
  } = analysis;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catalog Health & Revenue Analysis</h1>
        <p className="text-gray-600 mb-4">
          {catalogSongs > 0 && `${catalogSongs} songs in catalog • `}
          {statements.length} statement(s) • {transactionCount.toLocaleString()} transactions
        </p>

        <div
          className={`grid grid-cols-1 ${totalStreamingDiscrepancy > 0 ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 mb-6`}
        >
          {catalogSongs > 0 && (
            <div
              className={`${catalogHealth >= 80 ? 'bg-green-50 border-green-500' : catalogHealth >= 50 ? 'bg-yellow-50 border-yellow-500' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded`}
            >
              <div className="flex items-center mb-2">
                <TrendingUp
                  className={`w-5 h-5 ${catalogHealth >= 80 ? 'text-green-600' : catalogHealth >= 50 ? 'text-yellow-600' : 'text-red-600'} mr-2`}
                />
                <h3
                  className={`font-bold ${catalogHealth >= 80 ? 'text-green-900' : catalogHealth >= 50 ? 'text-yellow-900' : 'text-red-900'}`}
                >
                  Catalog Health
                </h3>
              </div>
              <p
                className={`text-3xl font-bold ${catalogHealth >= 80 ? 'text-green-600' : catalogHealth >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
              >
                {catalogHealth}%
              </p>
              <p
                className={`text-sm ${catalogHealth >= 80 ? 'text-green-700' : catalogHealth >= 50 ? 'text-yellow-700' : 'text-red-700'}`}
              >
                {catalogSongs - missingSongs.length}/{catalogSongs} songs earning
              </p>
              {totalStreamingDiscrepancy > 0 && discrepancyPercentage > 10 && (
                <p className="text-xs text-red-700 mt-2 font-semibold">
                  Critical: {discrepancyPercentage.toFixed(1)}% revenue discrepancy detected
                </p>
              )}
            </div>
          )}

          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="font-bold text-red-900">Red Flags</h3>
            </div>
            <p className="text-3xl font-bold text-red-600">{redFlags.length}</p>
            <p className="text-sm text-red-700">Issues detected</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <div className="flex items-center mb-2">
              <Calendar className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="font-bold text-yellow-900">Duplicates</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{duplicateCount}</p>
            <p className="text-sm text-yellow-700">
              {transactionCount > 0 ? Math.round((duplicateCount / transactionCount) * 100) : 0}% of transactions
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center mb-2">
              <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-bold text-blue-900">Total Revenue</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">${totalReported.toLocaleString()}</p>
            <p className="text-sm text-blue-700">Across all statements</p>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="font-bold text-purple-900">Micro-Payments</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">{microPaymentCount}</p>
            <p className="text-sm text-purple-700">
              {transactionCount > 0 ? Math.round((microPaymentCount / transactionCount) * 100) : 0}% under $0.01
            </p>
          </div>

          {totalStreamingDiscrepancy > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-bold text-red-900">Revenue Discrepancy</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{discrepancyPercentage.toFixed(1)}%</p>
              <p className="text-sm text-red-700 font-semibold">
                ${totalStreamingDiscrepancy.toFixed(2)} underreported
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statement Comparison */}
      {statementTotals.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Statement Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statementTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="statement" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} labelStyle={{ color: '#000' }} />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="Revenue Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Yearly Income */}
      {yearlyIncome.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Revenue by Year</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyIncome}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} labelStyle={{ color: '#000' }} />
              <Legend />
              <Bar dataKey="amount" name="Total Revenue">
                {yearlyIncome.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Missing Songs (Revenue Leaks) */}
      {missingSongs && missingSongs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            Potential Revenue Leaks - Missing Songs
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-900 font-semibold">
              ⚠️ {missingSongs.length} song{missingSongs.length !== 1 ? 's' : ''} from your catalog not found in revenue
              statements
            </p>
            <p className="text-red-800 text-sm mt-1">
              These songs may not be properly registered or you may be missing royalty payments.
            </p>
            {totalPotentiallyLostRevenue > 0 && (
              <p className="text-red-900 font-bold text-lg mt-2">
                Potentially Lost Revenue: ${totalPotentiallyLostRevenue.toFixed(2)}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Song Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ISRC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Master %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publishing %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potentially Lost Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missingSongs.map((song, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{song.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{song.artist || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{song.isrc || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{song.master_royalty}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{song.publishing_royalty}%</td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-bold"
                      style={{
                        color: song.potentialRevenue > 0 ? '#EF4444' : '#9CA3AF',
                      }}
                    >
                      {song.potentialRevenue > 0 ? `$${song.potentialRevenue.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Not in Statements
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Red Flags */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Findings</h2>
        {redFlags.length === 0 ? (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800">✓ No major red flags detected in uploaded statements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {redFlags.map((flag, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  flag.severity === 'critical'
                    ? 'bg-red-50 border-red-500'
                    : flag.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                }`}
              >
                <h3
                  className={`font-bold mb-2 ${
                    flag.severity === 'critical'
                      ? 'text-red-900'
                      : flag.severity === 'warning'
                        ? 'text-yellow-900'
                        : 'text-blue-900'
                  }`}
                >
                  {flag.title}
                </h3>
                <p
                  className={
                    flag.severity === 'critical'
                      ? 'text-red-800'
                      : flag.severity === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                  }
                >
                  {flag.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{transactionCount.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600 mb-1">Unique Songs</p>
            <p className="text-2xl font-bold text-gray-900">{uniqueSongs}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600 mb-1">Countries</p>
            <p className="text-2xl font-bold text-gray-900">{uniqueCountries}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600 mb-1">Avg per Transaction</p>
            <p className="text-2xl font-bold text-gray-900">${(totalReported / transactionCount).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
