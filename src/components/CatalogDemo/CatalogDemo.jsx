import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './catalogDemo.module.css';
import CardSwap, { Card } from '../CardSwap/CardSwap';
import RoundedSection from '../RoundedSection/RoundedSection';
import { Checkbox } from '@mui/material';
import { BsThreeDots, BsSoundwave } from 'react-icons/bs';
import {
  FaArrowLeftLong,
  FaArrowRightLong,
  FaMagnifyingGlass,
  FaChartLine,
  FaDollarSign,
  FaGlobe,
  FaHandshake,
  FaUserTie,
  FaFileContract,
} from 'react-icons/fa6';
import { FaCaretDown, FaArrowsRotate } from 'react-icons/fa6';
import { MdDashboard, MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md';
import { BiCheckShield } from 'react-icons/bi';
import { FaSpotify } from 'react-icons/fa';
import { SiApplemusic, SiYoutubemusic } from 'react-icons/si';
import UltraFastGraph from '../../pages/Catalog/UltraFastGraph';
import DropdownMultiSelection from '../DropdownMultiSelection/DropdownMultiSelection';
import SortButton from '../Buttons/SortButton/SortButton';
import SpotlightCard from '../SpotlightCard/SpotlightCard';
import { TrackCard } from './TrackCard';
import { CatalogCard } from './CatalogCard';
import { EarningsCard } from './EarningsCard';
import { DiscoveryCard } from './DiscoveryCard';
import { SolutionsCard } from './SolutionsCard';

const CatalogDemo = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [chartViewMode, setChartViewMode] = useState('streams');
  const [selectedStreamingServices, setSelectedStreamingServices] = useState(['Spotify', 'YouTube']);
  const [selectedRevenueTypes, setSelectedRevenueTypes] = useState(['Master', 'Publishing']);
  const [selectedArtists, setSelectedArtists] = useState([
    'Various Artists',
    'The Producers',
    'Beat Makers',
    'Sound Lab',
    'Studio Sessions',
  ]);
  const [dateSortOrder, setDateSortOrder] = useState('nothing');
  const [popularitySortOrder, setPopularitySortOrder] = useState('nothing');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage] = useState(1);
  const [selectedTimeframe, setSelectedTimeframe] = useState('Last 30 Days');
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedTrack1, setExpandedTrack1] = useState(true); // First track expanded by default
  const [expandedTrack2, setExpandedTrack2] = useState(false);
  const [expandedTrack3, setExpandedTrack3] = useState(false);

  // Mock demo data matching real catalog exactly
  const mockTracksData = [
    {
      id: 1,
      title: 'Summer Nights',
      artist: 'Various Artists',
      album_art: 'https://picsum.photos/seed/track1/128/128',
      master_royalty: 0.75,
      publishing_royalty: 0.25,
      date_added: '2024-01-15',
      isrc: 'USRC12345678',
      popularity: 850000, // mock playcount for popularity sorting
    },
    {
      id: 2,
      title: 'Midnight Drive',
      artist: 'The Producers',
      album_art: 'https://picsum.photos/seed/track2/128/128',
      master_royalty: 0.8,
      publishing_royalty: 0.2,
      date_added: '2024-02-20',
      isrc: 'USRC23456789',
      popularity: 620000,
    },
    {
      id: 3,
      title: 'City Lights',
      artist: 'Beat Makers',
      album_art: 'https://picsum.photos/seed/track3/128/128',
      master_royalty: 0.7,
      publishing_royalty: 0.3,
      date_added: '2024-03-10',
      isrc: 'USRC34567890',
      popularity: 1200000,
    },
    {
      id: 4,
      title: 'Ocean Wave',
      artist: 'Sound Lab',
      album_art: 'https://picsum.photos/seed/track4/128/128',
      master_royalty: 0.85,
      publishing_royalty: 0.15,
      date_added: '2024-04-05',
      isrc: 'USRC45678901',
      popularity: 450000,
    },
    {
      id: 5,
      title: 'Neon Dreams',
      artist: 'Studio Sessions',
      album_art: 'https://picsum.photos/seed/track5/128/128',
      master_royalty: 0.75,
      publishing_royalty: 0.25,
      date_added: '2024-05-12',
      isrc: 'USRC56789012',
      popularity: 950000,
    },
  ];

  // Sort tracks based on current sort orders
  const mockTracks = useMemo(() => {
    let sorted = [...mockTracksData];

    // Filter by selected artists
    sorted = sorted.filter((track) => selectedArtists.includes(track.artist));

    // Apply date sorting
    if (dateSortOrder === 'ascending') {
      sorted.sort((a, b) => new Date(a.date_added) - new Date(b.date_added));
    } else if (dateSortOrder === 'descending') {
      sorted.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
    }

    // Apply popularity sorting (if date sort is 'nothing', popularity takes precedence)
    if (popularitySortOrder === 'ascending') {
      sorted.sort((a, b) => a.popularity - b.popularity);
    } else if (popularitySortOrder === 'descending') {
      sorted.sort((a, b) => b.popularity - a.popularity);
    }

    return sorted;
  }, [dateSortOrder, popularitySortOrder, selectedArtists]);

  // Create realistic chart data based on timeframe
  const chartData = useMemo(() => {
    // Generate labels and data points based on timeframe
    let labels = [];
    let dataPoints = 0;
    let baseSpotify = 45000;
    let baseYouTube = 12000;
    let baseMaster = 1200;
    let basePublishing = 400;

    switch (selectedTimeframe) {
      case 'Today':
        labels = ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
        dataPoints = 6;
        baseSpotify = 2000;
        baseYouTube = 550;
        baseMaster = 52;
        basePublishing = 18;
        break;
      case 'Last 7 Days':
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataPoints = 7;
        baseSpotify = 10000;
        baseYouTube = 2700;
        baseMaster = 270;
        basePublishing = 90;
        break;
      case 'Last 30 Days':
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        dataPoints = 4;
        baseSpotify = 60000;
        baseYouTube = 16000;
        baseMaster = 1600;
        basePublishing = 530;
        break;
      case 'Last 3 Months':
        labels = ['Month 1', 'Month 2', 'Month 3'];
        dataPoints = 3;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'Last 6 Months':
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        dataPoints = 6;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'Last Year':
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dataPoints = 12;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'All Time':
        labels = ['2022', '2023', '2024 Q1', '2024 Q2', '2024 Q3', '2024 Q4'];
        dataPoints = 6;
        baseSpotify = 720000;
        baseYouTube = 192000;
        baseMaster = 19200;
        basePublishing = 6400;
        break;
      default:
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        dataPoints = 4;
    }

    // Generate cumulative data that always increases
    const generateData = (base, growthRate = 0.15) => {
      let cumulative = 0;
      return Array.from({ length: dataPoints }, (_, i) => {
        const growth = 1 + (growthRate * i) / dataPoints;
        const periodValue = base * growth * (0.9 + Math.random() * 0.2); // 10% variance
        cumulative += periodValue;
        return Math.round(cumulative);
      });
    };

    const datasets = [];

    // Add streaming data (only affected by timeframe, not revenue type)
    if (chartViewMode === 'streams') {
      if (selectedStreamingServices.includes('Spotify')) {
        datasets.push({
          label: 'Spotify Streams',
          data: generateData(baseSpotify, 0.18),
          borderColor: '#1DB954',
          backgroundColor: 'rgba(29, 185, 84, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y',
        });
      }

      if (selectedStreamingServices.includes('YouTube')) {
        datasets.push({
          label: 'YouTube Streams',
          data: generateData(baseYouTube, 0.25),
          borderColor: '#FF0000',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y',
        });
      }
    }

    // Add revenue data (affected by both timeframe and revenue type selection)
    if (chartViewMode === 'revenue') {
      if (selectedRevenueTypes.includes('Master')) {
        datasets.push({
          label: 'Master Royalty ($)',
          data: generateData(baseMaster, 0.2),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }

      if (selectedRevenueTypes.includes('Publishing')) {
        datasets.push({
          label: 'Publishing Royalty ($)',
          data: generateData(basePublishing, 0.22),
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderWidth: 2,
          fill: false,
          yAxisID: 'y1',
        });
      }
    }

    return { labels, datasets };
  }, [selectedStreamingServices, selectedRevenueTypes, selectedTimeframe, chartViewMode, refreshKey]);

  // Helper function to format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  // Calculate stats from chart data - independent of chart view mode
  const calculatedStats = useMemo(() => {
    // Calculate streams from selected services
    let baseSpotify = 0;
    let baseYouTube = 0;
    let baseMaster = 0;
    let basePublishing = 0;
    let dataPointCount = 0;

    switch (selectedTimeframe) {
      case 'Today':
        dataPointCount = 6;
        baseSpotify = 2000;
        baseYouTube = 550;
        baseMaster = 52;
        basePublishing = 18;
        break;
      case 'Last 7 Days':
        dataPointCount = 7;
        baseSpotify = 10000;
        baseYouTube = 2700;
        baseMaster = 270;
        basePublishing = 90;
        break;
      case 'Last 30 Days':
        dataPointCount = 4;
        baseSpotify = 60000;
        baseYouTube = 16000;
        baseMaster = 1600;
        basePublishing = 530;
        break;
      case 'Last 3 Months':
        dataPointCount = 3;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'Last 6 Months':
        dataPointCount = 6;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'Last Year':
        dataPointCount = 12;
        baseSpotify = 180000;
        baseYouTube = 48000;
        baseMaster = 4800;
        basePublishing = 1600;
        break;
      case 'All Time':
        dataPointCount = 6;
        baseSpotify = 720000;
        baseYouTube = 192000;
        baseMaster = 19200;
        basePublishing = 6400;
        break;
      default:
        dataPointCount = 4;
        baseSpotify = 60000;
        baseYouTube = 16000;
        baseMaster = 1600;
        basePublishing = 530;
    }

    // Calculate total streams across all periods
    const totalSpotifyStreams = selectedStreamingServices.includes('Spotify') ? baseSpotify * dataPointCount * 1.1 : 0;
    const totalYouTubeStreams = selectedStreamingServices.includes('YouTube') ? baseYouTube * dataPointCount * 1.1 : 0;
    const totalStreams = totalSpotifyStreams + totalYouTubeStreams;

    // Calculate total revenue based on selected revenue types
    // Master = 5% of streams, Publishing = 50% of streams
    let totalRevenue = 0;
    if (selectedRevenueTypes.includes('Master')) {
      totalRevenue += baseMaster * dataPointCount * 1.1;
    }
    if (selectedRevenueTypes.includes('Publishing')) {
      totalRevenue += basePublishing * dataPointCount * 1.1;
    }

    return {
      totalStreams,
      totalRevenue,
    };
  }, [selectedTimeframe, selectedStreamingServices, selectedRevenueTypes]);

  // Mock best performer
  const bestPerformer = mockTracks[0];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  // Mock worst performer (second track)
  const worstPerformer = mockTracks[1];

  const cardSwapRef = React.useRef();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(document.documentElement.getAttribute('data-theme'));
  const [consultationForm, setConsultationForm] = useState({
    email: '',
    companyName: '',
    companySize: '',
    businessType: '',
    painPoints: '',
  });

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Close timeframe dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target)) {
        setIsTimeframeOpen(false);
      }
    };

    if (isTimeframeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeframeOpen]);

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % 5);
    if (cardSwapRef.current) {
      cardSwapRef.current.swap();
    }
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + 5) % 5);
    if (cardSwapRef.current) {
      cardSwapRef.current.swapReverse();
    }
  };

  // Spotlight card content for each catalog view - matching service cards from Home page
  const spotlightCards = [
    // Cards for first view (Graph + Stats) - 2 cards
    [
      {
        icon: MdDashboard,
        title: 'Financial Dashboard',
        description:
          'Track royalties from streaming, sync, radio, and performance across all platforms. Monitor master and publishing revenue streams for producers, songwriters, and artists with real-time analytics and detailed breakdowns.',
      },
      {
        icon: FaChartLine,
        title: 'Streaming Analytics',
        description:
          'Monitor streaming performance across Spotify, YouTube, Apple Music, and more. Analyze trends, identify top performers, and make data-driven decisions to grow your catalog.',
      },
    ],
    // Cards for second view (Track List/Catalog) - 4 cards
    [
      {
        icon: BiCheckShield,
        title: 'PRO Registration Audit',
        description:
          'Complete audit of your catalog with performing rights organizations. Ensure proper registration and maximize royalty collection opportunities.',
      },
      {
        icon: FaDollarSign,
        title: 'Master Royalty Collection',
        description:
          'Recover unclaimed master royalties with professional legal support. Collect every dollar owed from streaming platforms and digital services.',
      },
      {
        icon: FaGlobe,
        title: 'Publishing Collection',
        description:
          'We work with trusted sub-publishers and partners globally to ensure leak-free, fast royalty collection. Maximize publishing revenue across international markets and collection societies worldwide.',
      },
      {
        icon: FaHandshake,
        title: 'Catalog Financing',
        description:
          'Get advances on catalog value with flexible financing options. Professional valuations and support for catalog sales and acquisitions.',
      },
    ],
    // Cards for third view (Dashboard/Song Discovery) - 1 card
    [
      {
        icon: BsSoundwave,
        title: 'TuneScan (Discovery & Fingerprinting)',
        description:
          "Search and identify your tracks across Spotify, YouTube, and Apple Music. Our advanced audio fingerprinting scans the internet for unauthorized usage, identifying unlicensed music across platforms so you can claim what's rightfully yours.",
      },
    ],
    // Cards for fourth view (Code/API Integration) - 2 cards
    [
      {
        icon: FaUserTie,
        title: 'Development/Custom Solutions',
        description:
          'Custom tools for publishing companies and labels. Optimize operations with tailored accounting systems, portals, and workflow automation.',
        hasButton: false,
      },
      {
        icon: FaFileContract,
        title: 'Free Professional Consultation',
        description:
          'Publishers, managers, and labels – discover custom solutions for your business. Schedule a free consultation to explore tailored systems that streamline your operations and maximize efficiency.',
        hasButton: true,
      },
    ],
    // Cards for fifth view (Revenue Analytics) - 3 cards
    [
      {
        icon: FaDollarSign,
        title: 'Revenue Insights',
        description:
          'Track total revenue across all income sources. Monitor quarterly and yearly trends with detailed breakdowns by territory, platform, and revenue type.',
      },
      {
        icon: FaGlobe,
        title: 'Territory Analytics',
        description:
          'Interactive global map showing revenue distribution. Identify your strongest markets and discover untapped opportunities for growth.',
      },
      {
        icon: FaChartLine,
        title: 'Platform Performance',
        description:
          'Compare earnings across Spotify, Apple Music, YouTube and more. Optimize your release strategy based on platform-specific performance data.',
      },
    ],
  ];

  // Flatten all spotlight cards for mobile view
  const allFeatures = spotlightCards.flat();

  // Mobile card titles
  const cardTitles = [
    'Financial Dashboard',
    'Catalog Management',
    'Song Discovery',
    'Custom Solutions',
    'Revenue Analytics',
  ];

  return (
    <div
      style={{
        minHeight: isMobile ? 'auto' : '750px',
        width: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        background: 'var(--background)',
        padding: isMobile ? '0' : '10rem 0',
        overflow: 'hidden',
      }}
    >
      {/* Left Button Column - desktop only */}
      <div
        style={{
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '0 3rem',
        }}
      >
        <button
          onClick={handlePrevCard}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 1,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
            e.currentTarget.style.color = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow =
              '0 6px 24px rgba(0, 229, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Center Content Column */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '24px' : '5rem',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: isMobile ? 'auto' : '500px',
          maxWidth: '100%',
          width: isMobile ? '100%' : 'auto',
        }}
      >
        {/* Left Side - Card Swap (flat on mobile) */}
        <div
          style={{
            width: isMobile ? '100%' : '46%',
            height: isMobile ? 'auto' : '500px',
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'start',
            alignItems: 'center',
            position: 'relative',
            flexShrink: 1,
            zIndex: 1,
            minWidth: 0,
            overflowX: 'visible',
            overflowY: 'visible',
            padding: isMobile ? '0 16px' : 0,
          }}
        >
          {isMobile ? (
            <div style={{ width: '100%' }}>
              {/* Card */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '400 / 480',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '400px',
                    height: '480px',
                    transform: 'scale(var(--track-scale))',
                    transformOrigin: 'top left',
                  }}
                  ref={(el) => {
                    if (el) {
                      const parentWidth = el.parentElement.offsetWidth;
                      el.style.setProperty('--track-scale', parentWidth / 400);
                    }
                  }}
                >
                  {currentCardIndex === 0 && <TrackCard theme={currentTheme} />}
                  {currentCardIndex === 1 && <CatalogCard theme={currentTheme} />}
                  {currentCardIndex === 2 && <DiscoveryCard theme={currentTheme} />}
                  {currentCardIndex === 3 && <SolutionsCard theme={currentTheme} />}
                  {currentCardIndex === 4 && <EarningsCard theme={currentTheme} />}
                </div>
              </div>

              {/* Navigation: arrows + dots - fixed position below card */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '14px',
                  marginTop: '10px',
                  marginBottom: '10px',
                }}
              >
                <button
                  onClick={handlePrevCard}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: `1px solid ${currentTheme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)'}`,
                    color: currentTheme === 'light' ? '#111' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                    fontSize: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentCardIndex(idx)}
                      style={{
                        width: idx === currentCardIndex ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        background:
                          idx === currentCardIndex
                            ? currentTheme === 'light'
                              ? '#111111'
                              : '#ffffff'
                            : currentTheme === 'light'
                              ? 'rgba(0, 0, 0, 0.12)'
                              : 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.3s ease',
                        WebkitTapHighlightColor: 'transparent',
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNextCard}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: `1px solid ${currentTheme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)'}`,
                    color: currentTheme === 'light' ? '#111' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                    fontSize: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Text descriptions - below nav, variable height doesn't affect arrows */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '0 2px',
                }}
              >
                {spotlightCards[currentCardIndex].map((card, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: currentTheme === 'light' ? '#111111' : '#eeeef0',
                        lineHeight: 1.3,
                        marginBottom: '2px',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {card.title}
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        lineHeight: 1.4,
                        color: currentTheme === 'light' ? '#6b6b6b' : 'rgba(255, 255, 255, 0.4)',
                        margin: 0,
                        fontWeight: 400,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CardSwap
              ref={cardSwapRef}
              width={420}
              height={500}
              cardDistance={20}
              verticalDistance={25}
              delay={999999999}
              pauseOnHover={true}
              easing="elastic"
            >
              {/* Card 1 - Left Side: Graph + Stats */}
              <Card>
                <div className={styles.catalogLeft}>
                  <div>
                    <div className={styles.catalogLeftNavigation}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setChartViewMode('streams')}
                          style={{
                            fontSize: '10px',
                            padding: '6px 12px',
                            background: chartViewMode === 'streams' ? 'var(--secondary)' : 'transparent',
                            border: '1px solid var(--button-border)',
                            borderRadius: '5px',
                            color: chartViewMode === 'streams' ? 'var(--secondary-text)' : 'var(--soft-text)',
                            cursor: 'pointer',
                            fontWeight: chartViewMode === 'streams' ? 600 : 500,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Streams
                        </button>
                        <button
                          onClick={() => setChartViewMode('revenue')}
                          style={{
                            fontSize: '10px',
                            padding: '6px 12px',
                            background: chartViewMode === 'revenue' ? 'var(--secondary)' : 'transparent',
                            border: '1px solid var(--button-border)',
                            borderRadius: '5px',
                            color: chartViewMode === 'revenue' ? 'var(--secondary-text)' : 'var(--soft-text)',
                            cursor: 'pointer',
                            fontWeight: chartViewMode === 'revenue' ? 600 : 500,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Revenue
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {chartViewMode === 'streams' && (
                          <DropdownMultiSelection
                            header="Streaming Service"
                            content={['Spotify', 'YouTube']}
                            selected={selectedStreamingServices}
                            onSelect={setSelectedStreamingServices}
                          />
                        )}
                        {chartViewMode === 'revenue' && (
                          <DropdownMultiSelection
                            header="Revenue Type"
                            content={['Master', 'Publishing']}
                            selected={selectedRevenueTypes}
                            onSelect={setSelectedRevenueTypes}
                          />
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            ref={timeframeRef}
                            style={{
                              position: 'relative',
                              minWidth: '100px',
                              fontSize: '11px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 12px',
                                background: 'transparent',
                                border: '1px solid var(--button-border)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '11px',
                                color: 'var(--soft-text)',
                                fontWeight: 500,
                              }}
                              onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--button-border)';
                              }}
                            >
                              <FaCaretDown
                                style={{
                                  transform: isTimeframeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                  fontSize: '10px',
                                }}
                              />
                              <span style={{ flexGrow: 1, textAlign: 'center' }}>{selectedTimeframe}</span>
                            </div>
                            <div
                              style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                width: '100%',
                                background: 'var(--background)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                padding: '12px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                opacity: isTimeframeOpen ? 1 : 0,
                                transform: isTimeframeOpen ? 'translateY(0)' : 'translateY(-10px)',
                                pointerEvents: isTimeframeOpen ? 'all' : 'none',
                                transition: 'opacity 150ms, transform 150ms',
                                zIndex: 9999,
                                maxHeight: '300px',
                                overflowY: 'auto',
                              }}
                            >
                              {[
                                'Today',
                                'Last 7 Days',
                                'Last 30 Days',
                                'Last 3 Months',
                                'Last 6 Months',
                                'Last Year',
                                'All Time',
                              ].map((timeframe) => (
                                <div
                                  key={timeframe}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s',
                                    fontSize: '11px',
                                    color: 'var(--text)',
                                    marginBottom: '2px',
                                  }}
                                  onClick={() => {
                                    setSelectedTimeframe(timeframe);
                                    setIsTimeframeOpen(false);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--input-bg)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  {timeframe}
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => setRefreshKey((prev) => prev + 1)}
                            style={{
                              padding: '7px',
                              background: 'transparent',
                              border: '1px solid var(--button-border)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              color: 'var(--soft-text)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.color = 'var(--text)';
                              e.currentTarget.style.background = 'var(--hover-bg)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--button-border)';
                              e.currentTarget.style.color = 'var(--soft-text)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <FaArrowsRotate style={{ fontSize: '11px' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <UltraFastGraph
                      key={`${chartViewMode}-${refreshKey}`}
                      data={chartData}
                      selectedServices={selectedStreamingServices}
                      selectedRevenueTypes={selectedRevenueTypes}
                      chartViewMode={chartViewMode}
                      className={styles.catalogChart}
                    />
                  </div>
                  <div className={styles.stats} style={{ padding: '0 2px' }}>
                    <div className={styles.statsPanels}>
                      <div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--muted-text)',
                            marginBottom: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Total Revenue
                        </div>
                        <div className="text-left">
                          <div className="flex flex-row items-center" style={{ gap: '3px' }}>
                            <div
                              style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              ${formatNumber(calculatedStats.totalRevenue)}
                            </div>
                            <span
                              style={{
                                fontSize: '9px',
                                padding: '2px 3px',
                                borderRadius: '3px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#22c55e',
                              }}
                            >
                              ↑ +12.5%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--muted-text)',
                            marginBottom: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Play Count
                        </div>
                        <div className="text-left">
                          <div className="flex flex-row items-center" style={{ gap: '3px' }}>
                            <div
                              style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              {formatNumber(calculatedStats.totalStreams)}
                            </div>
                            <span
                              style={{
                                fontSize: '9px',
                                padding: '2px 3px',
                                borderRadius: '3px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#22c55e',
                              }}
                            >
                              ↑ +8.3%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: 'var(--muted-text)',
                            marginBottom: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Track Count
                        </div>
                        <div className="text-left">
                          <div className="flex flex-row items-baseline" style={{ gap: '4px' }}>
                            <div
                              style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              24
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                color: 'var(--muted-text)',
                                fontWeight: 'normal',
                              }}
                            >
                              tracks
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.performerCardsGrid}>
                    <div
                      style={{
                        padding: '10px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '6px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '11px',
                          marginBottom: '8px',
                          color: 'var(--soft-text)',
                          fontWeight: 500,
                        }}
                      >
                        Best Performer
                      </h3>
                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--input-bg)',
                          borderRadius: '5px',
                          display: 'grid',
                          gridTemplateColumns: '32px 1fr 60px',
                          gap: '8px',
                          alignItems: 'center',
                          minHeight: '55px',
                        }}
                      >
                        <img
                          src={bestPerformer.album_art}
                          alt={bestPerformer.title}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '5px',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '11px',
                              color: 'var(--text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.3',
                            }}
                          >
                            {bestPerformer.title}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              color: 'var(--muted-text)',
                              lineHeight: '1.3',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {bestPerformer.artist}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            alignItems: 'flex-end',
                          }}
                        >
                          <button
                            style={{
                              fontSize: '9px',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              border: 'none',
                              fontWeight: 500,
                              background: 'var(--secondary)',
                              color: 'var(--secondary-text)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Claim
                          </button>
                          <div
                            style={{
                              fontSize: '8px',
                              color: 'var(--muted-text)',
                              lineHeight: '1.3',
                              textAlign: 'right',
                            }}
                          >
                            <div>{formatDate(bestPerformer.date_added)}</div>
                            <div style={{ marginTop: '2px' }}>{bestPerformer.isrc}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '6px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '11px',
                          marginBottom: '8px',
                          color: 'var(--soft-text)',
                          fontWeight: 500,
                        }}
                      >
                        Worst Performer
                      </h3>
                      <div
                        style={{
                          padding: '8px',
                          background: 'var(--input-bg)',
                          borderRadius: '5px',
                          display: 'grid',
                          gridTemplateColumns: '32px 1fr 60px',
                          gap: '8px',
                          alignItems: 'center',
                          minHeight: '55px',
                        }}
                      >
                        <img
                          src={worstPerformer.album_art}
                          alt={worstPerformer.title}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '5px',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '11px',
                              color: 'var(--text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.3',
                            }}
                          >
                            {worstPerformer.title}
                          </div>
                          <div
                            style={{
                              fontSize: '9px',
                              color: 'var(--muted-text)',
                              lineHeight: '1.3',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {worstPerformer.artist}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            alignItems: 'flex-end',
                          }}
                        >
                          <button
                            style={{
                              fontSize: '9px',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              border: 'none',
                              fontWeight: 500,
                              background: 'var(--secondary)',
                              color: 'var(--secondary-text)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Claim
                          </button>
                          <div
                            style={{
                              fontSize: '8px',
                              color: 'var(--muted-text)',
                              lineHeight: '1.3',
                              textAlign: 'right',
                            }}
                          >
                            <div>{formatDate(worstPerformer.date_added)}</div>
                            <div style={{ marginTop: '2px' }}>{worstPerformer.isrc}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2 - Right Side: Track List */}
              <Card>
                <div className={styles.catalogRight}>
                  <div
                    className="flex items-center justify-between"
                    style={{
                      marginBottom: '6px',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <h2
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          margin: 0,
                        }}
                      >
                        Catalog
                      </h2>
                      <button
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#0D9488';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#14B8A6';
                        }}
                        style={{
                          fontSize: '8px',
                          padding: '4px 8px',
                          background: '#14B8A6',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid #0D9488',
                          borderRadius: '4px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        Audit
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        style={{
                          fontSize: '8px',
                          padding: '4px 8px',
                          background: 'rgba(220, 38, 38, 0.9)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(220, 38, 38, 0.5)',
                          borderRadius: '4px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Clear
                      </button>
                      <button
                        style={{
                          fontSize: '8px',
                          padding: '4px 8px',
                          background: 'var(--panel-bg)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '4px',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Import
                      </button>
                    </div>
                  </div>
                  <div className={styles.catalogRightNavigation}>
                    <div
                      className="flex flex-row gap-2 items-center"
                      style={{
                        fontSize: '11px',
                        flex: '1 1 200px',
                        minWidth: '200px',
                      }}
                    >
                      <FaMagnifyingGlass size={12} style={{ color: 'var(--muted-text)' }} />
                      <input
                        placeholder="Search..."
                        type="text"
                        style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          color: 'var(--text)',
                          fontSize: '11px',
                          outline: 'none',
                          flex: 1,
                        }}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <DropdownMultiSelection
                        header="Artists"
                        content={['Various Artists', 'The Producers', 'Beat Makers', 'Sound Lab', 'Studio Sessions']}
                        selected={selectedArtists}
                        onSelect={setSelectedArtists}
                      />
                      <SortButton onSort={setDateSortOrder}>Date</SortButton>
                      <SortButton onSort={setPopularitySortOrder}>Popularity</SortButton>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                          e.currentTarget.style.color = 'var(--hover-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--soft-text)';
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '7px 12px',
                          background: 'transparent',
                          border: '1px solid var(--button-border)',
                          borderRadius: '6px',
                          color: 'var(--soft-text)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Select All
                      </button>
                      <button
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                          e.currentTarget.style.color = 'var(--hover-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--soft-text)';
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '7px 12px',
                          background: 'transparent',
                          border: '1px solid var(--button-border)',
                          borderRadius: '6px',
                          color: 'var(--soft-text)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Deselect All
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                          e.currentTarget.style.color = 'var(--hover-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--soft-text)';
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '7px 10px',
                          background: 'transparent',
                          border: '1px solid var(--button-border)',
                          borderRadius: '6px',
                          color: 'var(--soft-text)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <FaArrowLeftLong />
                      </button>
                      <div
                        style={{
                          fontSize: '11px',
                          padding: '7px 12px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '6px',
                          color: 'var(--muted-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Page {currentPage} of {lastPage}
                      </div>
                      <button
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                          e.currentTarget.style.color = 'var(--hover-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--soft-text)';
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '7px 10px',
                          background: 'transparent',
                          border: '1px solid var(--button-border)',
                          borderRadius: '6px',
                          color: 'var(--soft-text)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <FaArrowRightLong />
                      </button>
                    </div>
                  </div>
                  <div className={styles.catalogTable}>
                    {mockTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center"
                        style={{ position: 'relative', zIndex: 1, gap: '6px' }}
                      >
                        <div className="flex-1">
                          <div className={styles.catalogItem} style={{ padding: '8px', gap: '8px' }}>
                            <Checkbox
                              defaultChecked
                              sx={{
                                padding: '1px',
                                '& .MuiSvgIcon-root': { fontSize: 14 },
                              }}
                            />
                            <div className={styles.catalogItemImage} style={{ width: '28px', height: '28px' }}>
                              <img src={track.album_art} alt={track.title} style={{ width: '28px', height: '28px' }} />
                            </div>
                            <div className={styles.catalogItemTitle}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '10px',
                                  marginBottom: '1px',
                                }}
                              >
                                {track.title}
                              </div>
                              <div className={styles.catalogItemArtists} style={{ fontSize: '9px' }}>
                                <span style={{ color: '#888' }}>{track.artist}</span>
                                <br />
                                <span
                                  className="text-orange-400/60 cursor-pointer hover:text-orange-400 transition-colors"
                                  style={{ display: 'inline', fontSize: '8px' }}
                                >
                                  {track.master_royalty * 100}%
                                </span>
                                <span style={{ margin: '0 2px', color: '#888' }}>·</span>
                                <span
                                  className="text-teal-400/60 cursor-pointer hover:text-teal-400 transition-colors"
                                  style={{ display: 'inline', fontSize: '8px' }}
                                >
                                  {track.publishing_royalty * 100}%
                                </span>
                              </div>
                            </div>
                            <button
                              className="rounded font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                              style={{
                                fontSize: '9px',
                                padding: '3px 6px',
                                borderRadius: '3px',
                                border: 'none',
                                fontWeight: 500,
                                background: 'var(--secondary)',
                                color: 'var(--secondary-text)',
                              }}
                            >
                              Claim
                            </button>
                            <div
                              style={{
                                fontSize: '8px',
                                color: '#666',
                                lineHeight: '1.3',
                                textAlign: 'right',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1px',
                              }}
                            >
                              <div>{formatDate(track.date_added)}</div>
                              <div>{track.isrc}</div>
                            </div>
                          </div>
                        </div>
                        <button
                          className={styles.trackOptionsButton}
                          style={{
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '5px',
                            padding: '6px 10px',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            height: '32px',
                            position: 'relative',
                            zIndex: 1000,
                          }}
                        >
                          <BsThreeDots size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Card 3 - Dashboard View */}
              <Card>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--background)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Dashboard Header - Compact version */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--panel-border)',
                      background: 'var(--panel-bg)',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <h2
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          margin: 0,
                          marginBottom: '2px',
                        }}
                      >
                        Scan Your Works
                      </h2>
                      <p
                        style={{
                          fontSize: '10px',
                          color: 'var(--muted-text)',
                          margin: 0,
                        }}
                      >
                        Upload beats to scan for usage across DSPs
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Search scans..."
                      disabled
                      style={{
                        padding: '5px 10px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--button-border)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: 'var(--text)',
                        outline: 'none',
                        width: '180px',
                      }}
                    />
                  </div>

                  {/* Dashboard Content */}
                  <div
                    className={`${styles.dashboardScrollContent}`}
                    style={{
                      flex: 1,
                      padding: '16px 24px',
                      overflowY: 'auto',
                      background: 'var(--background)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Track 1 - Toggleable */}
                      <div
                        style={{
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--panel-border)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          onClick={() => setExpandedTrack1(!expandedTrack1)}
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: expandedTrack1 ? '1px solid var(--panel-border)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--text)',
                            }}
                          >
                            summer_nights_beat.mp3
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#22c55e',
                                fontWeight: 600,
                              }}
                            >
                              3 Results
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: 'var(--muted-text)',
                                transform: expandedTrack1 ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              ▼
                            </div>
                          </div>
                        </div>

                        {/* Expanded matches */}
                        {expandedTrack1 && (
                          <div style={{ background: 'var(--input-bg)' }}>
                            {/* Match 1 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '12px 16px',
                                gap: '8px',
                                borderBottom: '1px solid var(--panel-border)',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src="https://picsum.photos/seed/track1/48/48"
                                  alt=""
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text)',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Summer Vibes
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--soft-text)',
                                    }}
                                  >
                                    DJ Producer • 3:24
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <FaSpotify size={16} style={{ color: '#1DB954' }} />
                                  <SiApplemusic size={16} style={{ color: '#FC3C44' }} />
                                  <SiYoutubemusic size={16} style={{ color: '#FF0000' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'var(--secondary)',
                                    color: 'var(--secondary-text)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Add to Catalog
                                </button>
                                <button
                                  style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--button-border)',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Re-scan
                                </button>
                                <button
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Match 2 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '12px 16px',
                                gap: '8px',
                                borderBottom: '1px solid var(--panel-border)',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src="https://picsum.photos/seed/track2/48/48"
                                  alt=""
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text)',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Late Night Summer
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--soft-text)',
                                    }}
                                  >
                                    The Collective • 4:12
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <FaSpotify size={16} style={{ color: '#1DB954' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'var(--secondary)',
                                    color: 'var(--secondary-text)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Add to Catalog
                                </button>
                                <button
                                  style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--button-border)',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Re-scan
                                </button>
                                <button
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Match 3 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '12px 16px',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src="https://picsum.photos/seed/track3/48/48"
                                  alt=""
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text)',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Summer Nights (Remix)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--soft-text)',
                                    }}
                                  >
                                    Beat Maker • 2:56
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <SiYoutubemusic size={16} style={{ color: '#FF0000' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'var(--secondary)',
                                    color: 'var(--secondary-text)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Add to Catalog
                                </button>
                                <button
                                  style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--button-border)',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Re-scan
                                </button>
                                <button
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Track 2 - Toggleable with 2 results */}
                      <div
                        style={{
                          background: 'var(--panel-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--panel-border)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          onClick={() => setExpandedTrack2(!expandedTrack2)}
                          style={{
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: expandedTrack2 ? '1px solid var(--panel-border)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'var(--text)',
                            }}
                          >
                            midnight_drive_sample.wav
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#22c55e',
                                fontWeight: 600,
                              }}
                            >
                              2 Results
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: 'var(--muted-text)',
                                transform: expandedTrack2 ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              ▼
                            </div>
                          </div>
                        </div>
                        {expandedTrack2 && (
                          <div style={{ background: 'var(--input-bg)' }}>
                            {/* Match 1 for Track 2 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '12px 16px',
                                gap: '8px',
                                borderBottom: '1px solid var(--panel-border)',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src="https://picsum.photos/seed/track4/48/48"
                                  alt=""
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text)',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    Midnight Drive
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--soft-text)',
                                    }}
                                  >
                                    Urban Producer • 3:18
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <FaSpotify size={16} style={{ color: '#1DB954' }} />
                                  <SiYoutubemusic size={16} style={{ color: '#FF0000' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'var(--secondary)',
                                    color: 'var(--secondary-text)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Add to Catalog
                                </button>
                                <button
                                  style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--button-border)',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Re-scan
                                </button>
                                <button
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Match 2 for Track 2 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '12px 16px',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                  src="https://picsum.photos/seed/track5/48/48"
                                  alt=""
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text)',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    City Night Drive
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--soft-text)',
                                    }}
                                  >
                                    Night Beats • 2:45
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <SiApplemusic size={16} style={{ color: '#FC3C44' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  style={{
                                    background: 'var(--secondary)',
                                    color: 'var(--secondary-text)',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Add to Catalog
                                </button>
                                <button
                                  style={{
                                    background: 'var(--input-bg)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--button-border)',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Re-scan
                                </button>
                                <button
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pagination Footer */}
                  <div
                    style={{
                      padding: '12px 24px',
                      borderTop: '1px solid var(--panel-border)',
                      background: 'var(--panel-bg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Page 1 of 1</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          style={{
                            padding: '4px 6px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--button-border)',
                            borderRadius: '4px',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.5,
                          }}
                        >
                          <MdKeyboardArrowLeft size={16} />
                        </button>
                        <button
                          style={{
                            padding: '4px 6px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--button-border)',
                            borderRadius: '4px',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.5,
                          }}
                        >
                          <MdKeyboardArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>2 scans found</div>
                  </div>
                </div>
              </Card>

              {/* Card 4 - Code/API View */}
              <Card>
                <div className={styles.catalogLeft}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      width: '100%',
                      overflow: 'hidden',
                      background: 'rgba(30, 30, 30, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Mac window title bar */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                        background: 'rgba(40, 40, 40, 0.95)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#FF5F56',
                            flexShrink: 0,
                          }}
                        ></div>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#FFBD2E',
                            flexShrink: 0,
                          }}
                        ></div>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#27C93F',
                            flexShrink: 0,
                          }}
                        ></div>
                      </div>
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginLeft: '4px',
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                          fontWeight: 500,
                        }}
                      >
                        yoursolution.js
                      </span>
                    </div>

                    {/* Code content area with line numbers */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                        background: 'rgba(30, 30, 30, 0.95)',
                      }}
                    >
                      {/* Line numbers */}
                      <div
                        style={{
                          padding: '16px 8px',
                          background: 'rgba(20, 20, 20, 0.5)',
                          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                          fontFamily: '"SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace',
                          fontSize: '10.5px',
                          lineHeight: '1.7',
                          color: 'rgba(255, 255, 255, 0.3)',
                          textAlign: 'right',
                          userSelect: 'none',
                          minWidth: '40px',
                        }}
                      >
                        <div>1</div>
                        <div>2</div>
                        <div>3</div>
                        <div>4</div>
                        <div>5</div>
                        <div>6</div>
                        <div>7</div>
                        <div>8</div>
                        <div>9</div>
                        <div>10</div>
                        <div>11</div>
                        <div>12</div>
                        <div>13</div>
                        <div>14</div>
                        <div>15</div>
                        <div>16</div>
                        <div>17</div>
                        <div>18</div>
                        <div>19</div>
                        <div>20</div>
                        <div>21</div>
                        <div>22</div>
                        <div>23</div>
                      </div>

                      {/* Code content */}
                      <div
                        style={{
                          flex: 1,
                          padding: '16px 20px',
                          overflow: 'hidden',
                        }}
                      >
                        <pre
                          style={{
                            fontFamily: '"SF Mono", Monaco, Menlo, Consolas, "Courier New", monospace',
                            fontSize: '10.5px',
                            lineHeight: '1.7',
                            margin: 0,
                            color: '#D4D4D4',
                          }}
                        >
                          <span style={{ color: '#C586C0' }}>import</span> {'{ '}
                          <span style={{ color: '#4FC1FF' }}>TuneMGMT</span>
                          {' }'} <span style={{ color: '#C586C0' }}>from</span>{' '}
                          <span style={{ color: '#CE9178' }}>'@tunemgmt/sdk'</span>;{'\n'}
                          <span style={{ color: '#6A9955' }}>// Initialize TuneMGMT client</span>
                          <br />
                          <span style={{ color: '#C586C0' }}>const</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>client</span> ={' '}
                          <span style={{ color: '#C586C0' }}>new</span>{' '}
                          <span style={{ color: '#4EC9B0' }}>TuneMGMT</span>({'({'}
                          <span style={{ color: '#9CDCFE' }}>apiKey</span>:{' '}
                          <span style={{ color: '#4FC1FF' }}>process</span>.
                          <span style={{ color: '#9CDCFE' }}>env</span>.
                          <span style={{ color: '#4FC1FF' }}>TUNEMGMT_API_KEY</span>,
                          <span style={{ color: '#9CDCFE' }}>environment</span>:{' '}
                          <span style={{ color: '#CE9178' }}>'production'</span>
                          {'});'}
                          {'\n'}
                          <span style={{ color: '#6A9955' }}>// Fetch catalog analytics</span>
                          <br />
                          <span style={{ color: '#C586C0' }}>const</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>analytics</span> ={' '}
                          <span style={{ color: '#C586C0' }}>await</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>client</span>.
                          <span style={{ color: '#9CDCFE' }}>catalog</span>.
                          <span style={{ color: '#DCDCAA' }}>getAnalytics</span>({'({'}
                          <span style={{ color: '#9CDCFE' }}>timeframe</span>:{' '}
                          <span style={{ color: '#CE9178' }}>'last_30_days'</span>,
                          <span style={{ color: '#9CDCFE' }}>metrics</span>: [
                          <span style={{ color: '#CE9178' }}>'streams'</span>,{' '}
                          <span style={{ color: '#CE9178' }}>'revenue'</span>,{' '}
                          <span style={{ color: '#CE9178' }}>'royalties'</span>]{'});'}
                          {'\n'}
                          <span style={{ color: '#6A9955' }}>// Search and discover tracks</span>
                          <br />
                          <span style={{ color: '#C586C0' }}>const</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>results</span> ={' '}
                          <span style={{ color: '#C586C0' }}>await</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>client</span>.
                          <span style={{ color: '#9CDCFE' }}>tracks</span>.
                          <span style={{ color: '#DCDCAA' }}>search</span>({'({'}
                          <span style={{ color: '#9CDCFE' }}>query</span>:{' '}
                          <span style={{ color: '#CE9178' }}>'Summer Nights'</span>,
                          <span style={{ color: '#9CDCFE' }}>platforms</span>: [
                          <span style={{ color: '#CE9178' }}>'spotify'</span>,{' '}
                          <span style={{ color: '#CE9178' }}>'youtube'</span>]{'});'}
                          {'\n'}
                          <span style={{ color: '#6A9955' }}>// Add track to your catalog</span>
                          <br />
                          <span style={{ color: '#C586C0' }}>await</span>{' '}
                          <span style={{ color: '#4FC1FF' }}>client</span>.
                          <span style={{ color: '#9CDCFE' }}>catalog</span>.
                          <span style={{ color: '#DCDCAA' }}>addTrack</span>({'({'}
                          <span style={{ color: '#9CDCFE' }}>trackId</span>:{' '}
                          <span style={{ color: '#4FC1FF' }}>results</span>[<span style={{ color: '#B5CEA8' }}>0</span>
                          ].
                          <span style={{ color: '#9CDCFE' }}>id</span>,<span style={{ color: '#9CDCFE' }}>splits</span>:{' '}
                          {'{ '}
                          <span style={{ color: '#9CDCFE' }}>master</span>:{' '}
                          <span style={{ color: '#B5CEA8' }}>0.75</span>,{' '}
                          <span style={{ color: '#9CDCFE' }}>publishing</span>:{' '}
                          <span style={{ color: '#B5CEA8' }}>0.25</span>
                          {' }'}
                          {'});'}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 5 - Revenue Analytics Demo */}
              <Card>
                <div className={styles.revenueDemo}>
                  {/* Header */}
                  <div className={styles.revenueDemoHeader}>
                    <h2 className={styles.revenueDemoTitle}>
                      <FaDollarSign className={styles.revenueDemoIcon} />
                      Revenue Analytics
                    </h2>
                    <p className={styles.revenueDemoSubtitle}>Real-time revenue tracking and insights</p>
                  </div>

                  {/* Revenue Overview Cards */}
                  <div className={styles.revenueCards}>
                    <div className={styles.revenueCard}>
                      <div className={styles.revenueCardHeader}>
                        <span className={styles.revenueCardLabel}>Total Revenue</span>
                        <span className={styles.revenueCardPeriod}>Last 30 Days</span>
                      </div>
                      <div className={styles.revenueCardAmount}>$24,563.89</div>
                      <div className={styles.revenueCardChange} style={{ color: '#10b981' }}>
                        <FaArrowRightLong style={{ transform: 'rotate(-45deg)' }} />
                        <span>+12.5%</span>
                        <span className={styles.revenueCardChangeText}>vs previous period</span>
                      </div>
                    </div>

                    <div className={styles.revenueCard}>
                      <div className={styles.revenueCardHeader}>
                        <span className={styles.revenueCardLabel}>Master Royalties</span>
                        <span className={styles.revenueCardPeriod}>Q3 2024</span>
                      </div>
                      <div className={styles.revenueCardAmount}>$18,422.67</div>
                      <div className={styles.revenueCardChange} style={{ color: '#10b981' }}>
                        <FaArrowRightLong style={{ transform: 'rotate(-45deg)' }} />
                        <span>+8.3%</span>
                        <span className={styles.revenueCardChangeText}>quarter over quarter</span>
                      </div>
                    </div>

                    <div className={styles.revenueCard}>
                      <div className={styles.revenueCardHeader}>
                        <span className={styles.revenueCardLabel}>Publishing</span>
                        <span className={styles.revenueCardPeriod}>Q3 2024</span>
                      </div>
                      <div className={styles.revenueCardAmount}>$6,141.22</div>
                      <div className={styles.revenueCardChange} style={{ color: '#f59e0b' }}>
                        <FaArrowRightLong style={{ transform: 'rotate(0deg)' }} />
                        <span>+0.8%</span>
                        <span className={styles.revenueCardChangeText}>stable growth</span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Breakdown */}
                  <div className={styles.platformBreakdown}>
                    <h3 className={styles.sectionTitle}>Platform Breakdown</h3>
                    <div className={styles.platformList}>
                      <div className={styles.platformItem}>
                        <div className={styles.platformInfo}>
                          <FaSpotify style={{ color: '#1DB954' }} />
                          <span>Spotify</span>
                        </div>
                        <div className={styles.platformRevenue}>
                          <span className={styles.platformAmount}>$12,841.22</span>
                          <span className={styles.platformPercentage}>52.3%</span>
                        </div>
                      </div>

                      <div className={styles.platformItem}>
                        <div className={styles.platformInfo}>
                          <SiApplemusic style={{ color: '#FC3C44' }} />
                          <span>Apple Music</span>
                        </div>
                        <div className={styles.platformRevenue}>
                          <span className={styles.platformAmount}>$7,369.17</span>
                          <span className={styles.platformPercentage}>30.0%</span>
                        </div>
                      </div>

                      <div className={styles.platformItem}>
                        <div className={styles.platformInfo}>
                          <SiYoutubemusic style={{ color: '#FF0000' }} />
                          <span>YouTube Music</span>
                        </div>
                        <div className={styles.platformRevenue}>
                          <span className={styles.platformAmount}>$4,353.50</span>
                          <span className={styles.platformPercentage}>17.7%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Territories */}
                  <div className={styles.topTerritories}>
                    <h3 className={styles.sectionTitle}>Top Territories</h3>
                    <div className={styles.territoryList}>
                      <div className={styles.territoryItem}>
                        <span className={styles.territoryRank}>1</span>
                        <span className={styles.territoryName}>United States</span>
                        <span className={styles.territoryAmount}>$11,256.45</span>
                      </div>
                      <div className={styles.territoryItem}>
                        <span className={styles.territoryRank}>2</span>
                        <span className={styles.territoryName}>United Kingdom</span>
                        <span className={styles.territoryAmount}>$4,892.31</span>
                      </div>
                      <div className={styles.territoryItem}>
                        <span className={styles.territoryRank}>3</span>
                        <span className={styles.territoryName}>Germany</span>
                        <span className={styles.territoryAmount}>$3,128.77</span>
                      </div>
                      <div className={styles.territoryItem}>
                        <span className={styles.territoryRank}>4</span>
                        <span className={styles.territoryName}>Canada</span>
                        <span className={styles.territoryAmount}>$2,564.89</span>
                      </div>
                      <div className={styles.territoryItem}>
                        <span className={styles.territoryRank}>5</span>
                        <span className={styles.territoryName}>Australia</span>
                        <span className={styles.territoryAmount}>$2,721.47</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className={styles.revenueDemoFooter}>
                    <p>💡 Access detailed revenue analytics, export reports, and track trends in real-time</p>
                  </div>
                </div>
              </Card>
            </CardSwap>
          )}
        </div>

        {/* Right Side - Spotlight Cards (desktop only, mobile text is integrated into cards) */}
        <div
          style={{
            width: isMobile ? '100%' : '54%',
            height: isMobile ? 'auto' : '500px',
            display: isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'stretch',
            flexShrink: 1,
            minWidth: 0,
            position: 'relative',
            zIndex: 1,
            padding: isMobile ? '0 16px' : 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap:
                spotlightCards[currentCardIndex].length === 1
                  ? '0'
                  : spotlightCards[currentCardIndex].length === 2
                    ? '30px'
                    : '15px',
              height:
                spotlightCards[currentCardIndex].length === 1
                  ? '400px'
                  : spotlightCards[currentCardIndex].length === 2
                    ? '500px'
                    : 'auto',
              maxWidth: '100%',
              maxHeight: '500px',
              justifyContent: spotlightCards[currentCardIndex].length === 1 ? 'center' : 'flex-start',
              animation: 'fadeInScale 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <style>{`
            @keyframes fadeInScale {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(10px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            @keyframes slideInFromRight {
              from {
                opacity: 0;
                transform: translateX(30px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
            {spotlightCards[currentCardIndex].map((card, index) => {
              const cardCount = spotlightCards[currentCardIndex].length;
              const fontSize =
                cardCount === 1
                  ? { icon: 36, title: '24px', desc: '16px', button: '14px' }
                  : cardCount === 2
                    ? { icon: 28, title: '20px', desc: '14px', button: '14px' }
                    : { icon: 20, title: '14px', desc: '11px', button: '11px' };
              const padding = cardCount === 1 ? '40px 48px' : cardCount === 2 ? '28px 30px' : '16px 20px';
              const contentGap = cardCount === 1 ? '16px' : cardCount === 2 ? '12px' : '8px';
              const headerMargin = cardCount === 1 ? '12px' : cardCount === 2 ? '8px' : '4px';
              const minHeight = cardCount === 1 ? '300px' : cardCount === 2 ? '235px' : '112px';

              return (
                <SpotlightCard
                  key={`${currentCardIndex}-${index}`}
                  className="service-card neo-brutalist"
                  spotlightColor="rgba(0, 229, 255, 0.2)"
                  style={{
                    flex: cardCount === 1 || cardCount === 2 ? 1 : '0 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: cardCount === 1 ? 'center' : 'flex-start',
                    alignItems: 'stretch',
                    padding: padding,
                    minHeight: minHeight,
                    maxHeight: cardCount === 4 ? '120px' : 'none',
                    borderRadius: '16px',
                    transition: 'all 0.3s ease',
                    width: '100%',
                    overflow: 'hidden',
                    animation: `slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s both`,
                  }}
                >
                  <div
                    className="service-content"
                    style={{
                      gap: contentGap,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      width: '100%',
                      height: cardCount === 4 ? '100%' : 'auto',
                      justifyContent: cardCount === 4 ? 'center' : 'flex-start',
                    }}
                  >
                    <div
                      className="service-header"
                      style={{
                        marginBottom: headerMargin,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: cardCount === 2 ? '16px' : '10px',
                        width: '100%',
                      }}
                    >
                      <card.icon
                        size={fontSize.icon}
                        style={{
                          flexShrink: 0,
                          color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 229, 255, 0.9)',
                          filter: currentTheme === 'light' ? 'none' : 'drop-shadow(0 2px 8px rgba(0, 229, 255, 0.4))',
                        }}
                      />
                      <h1
                        style={{
                          fontSize: fontSize.title,
                          fontWeight: 700,
                          lineHeight: cardCount === 2 ? 1.3 : 1.2,
                          margin: 0,
                          color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {card.title}
                      </h1>
                    </div>
                    <p
                      style={{
                        fontSize: fontSize.desc,
                        lineHeight: cardCount === 2 ? '1.7' : '1.5',
                        margin: 0,
                        color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.65)',
                        width: '100%',
                        fontWeight: 400,
                        letterSpacing: '0.02em',
                        textShadow: currentTheme === 'light' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {card.description}
                    </p>
                    {card.hasButton && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          width: '100%',
                          marginTop: cardCount === 2 ? '0px' : '0px',
                          marginBottom: cardCount === 2 ? '16px' : '12px',
                        }}
                      >
                        <button
                          onClick={() => setShowConsultationModal(true)}
                          style={{
                            padding: cardCount === 2 ? '8px 18px' : '6px 12px',
                            background: 'var(--secondary)',
                            color: currentTheme === 'dark' ? 'black' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: cardCount === 2 ? '12px' : '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0, 229, 255, 0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 229, 255, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 229, 255, 0.15)';
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          Book Free Consultation
                        </button>
                      </div>
                    )}
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Button Column - desktop only */}
      <div
        style={{
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '0 3rem',
        }}
      >
        <button
          onClick={handleNextCard}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            color: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 1,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
            e.currentTarget.style.color = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow =
              '0 6px 24px rgba(0, 229, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Consultation Modal */}
      {showConsultationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowConsultationModal(false)}
        >
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: 0,
                }}
              >
                Book Free Consultation
              </h2>
              <button
                onClick={() => setShowConsultationModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  color: 'var(--soft-text)',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Handle form submission here
                setShowConsultationModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={consultationForm.email}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      email: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  placeholder="your.email@company.com"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={consultationForm.companyName}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      companyName: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Business Type *
                </label>
                <select
                  required
                  value={consultationForm.businessType}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      businessType: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">Select business type</option>
                  <option value="publishing">Publishing Company</option>
                  <option value="management">Management Company</option>
                  <option value="label">Record Label</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  Company Size *
                </label>
                <select
                  required
                  value={consultationForm.companySize}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      companySize: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201+">201+ employees</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    marginBottom: '8px',
                  }}
                >
                  What pain points are you looking to address?
                </label>
                <textarea
                  value={consultationForm.painPoints}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      painPoints: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    minHeight: '100px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Tell us about your current challenges..."
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '14px 28px',
                  background: 'var(--secondary)',
                  color: 'var(--secondary-text)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginTop: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogDemo;
