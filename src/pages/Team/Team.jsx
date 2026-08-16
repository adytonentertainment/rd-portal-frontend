import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTwitter,
  FaSpotify,
  FaChartLine,
  FaUsers,
  FaHeart,
  FaComment,
  FaShare,
  FaEye,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sidebar from '../../components/Sidebar/Sidebar';
import GlassButton from '../../components/Buttons/GlassButton/GlassButton';
import { UserContextProvider } from '../../components/UserContext/UserContext';
import Beams from '../../components/Beams/Beams';
import InstagramAPI from '../../services/instagramApi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import './team.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Team = () => {
  const navigate = useNavigate();
  const user = useContext(UserContextProvider);
  const [selectedTimeframe, setSelectedTimeframe] = useState('Monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [instagramData, setInstagramData] = useState(null);

  // Fetch Instagram data on component mount
  useEffect(() => {
    const fetchInstagramData = async () => {
      setIsLoading(true);
      try {
        const data = await InstagramAPI.getOmegaCreateData();
        setInstagramData(data);
      } catch (error) {
        console.error('Failed to load Instagram data:', error);
        toast.error('Failed to load Instagram data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstagramData();
  }, []);

  // Mock social media data (keeping other platforms as mock)
  const mockPlatforms = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FaFacebook size={24} />,
      color: '#1877F2',
      followers: 45200,
      engagement: 8.5,
      reach: 125000,
      posts: 42,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <FaTiktok size={24} />,
      color: '#000000',
      followers: 123500,
      engagement: 18.7,
      reach: 890000,
      posts: 95,
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <FaYoutube size={24} />,
      color: '#FF0000',
      followers: 34600,
      engagement: 6.2,
      reach: 156000,
      posts: 28,
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <FaTwitter size={24} />,
      color: '#1DA1F2',
      followers: 28900,
      engagement: 4.8,
      reach: 98000,
      posts: 156,
    },
    {
      id: 'spotify',
      name: 'Spotify',
      icon: <FaSpotify size={24} />,
      color: '#1DB954',
      followers: 15600,
      engagement: 15.2,
      reach: 245000,
      posts: 12,
    },
  ];

  // Dynamic engagement data for chart based on timeframe and real Instagram data
  const getEngagementData = () => {
    if (instagramData && instagramData.growth_data) {
      const timeframeData =
        selectedTimeframe === 'Monthly' ? instagramData.growth_data.monthly : instagramData.growth_data.weekly;

      if (timeframeData) {
        return {
          labels: timeframeData.map((d) =>
            selectedTimeframe === 'Monthly'
              ? new Date(d.date + '-01').toLocaleDateString('en-US', {
                  month: 'short',
                })
              : new Date(d.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
          ),
          datasets: [
            {
              label: 'Followers',
              data: timeframeData.map((d) => d.followers),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Reach',
              data: timeframeData.map((d) => d.reach),
              borderColor: 'rgb(236, 72, 153)',
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        };
      }
    }

    // Fallback mock data
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      datasets: [
        {
          label: 'Total Engagement',
          data: [12500, 15800, 18200, 22100, 25600, 28900, 32400, 35800, 41200],
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Reach',
          // prettier-ignore
          data: [45000, 52000, 58000, 67000, 75000, 82000, 91000, 98000, 108000],
          borderColor: 'rgb(236, 72, 153)',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const engagementData = getEngagementData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Combine real Instagram data with mock platforms
  const platforms = React.useMemo(() => {
    const allPlatforms = [...mockPlatforms];

    // Insert real Instagram data if available
    if (instagramData) {
      const instagramPlatform = {
        id: 'instagram',
        name: 'Instagram',
        icon: <FaInstagram size={24} />,
        color: '#E4405F',
        followers: instagramData.followers,
        engagement: instagramData.engagement,
        reach: instagramData.reach,
        posts: instagramData.posts,
        username: instagramData.username,
        isReal: true, // Flag to indicate this is real data
      };

      // Insert after Facebook (index 1)
      allPlatforms.splice(1, 0, instagramPlatform);
    }

    return allPlatforms;
  }, [mockPlatforms, instagramData]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
  const totalReach = platforms.reduce((sum, p) => sum + p.reach, 0);
  const avgEngagement =
    platforms.length > 0 ? (platforms.reduce((sum, p) => sum + p.engagement, 0) / platforms.length).toFixed(1) : '0.0';

  return (
    <div className="team-page">
      {/* Background */}
      <div className="team-background">
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#ffffff"
          speed={0.3}
          noiseIntensity={1.2}
          scale={0.15}
          rotation={0}
        />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="team-content">
        {/* Header */}
        <div className="team-header">
          <div>
            <h1 className="team-title">Social Media Analytics</h1>
            <p className="team-subtitle">Track your engagement across all platforms</p>
          </div>
          <div className="header-controls">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="overview-stats">
          <div className="stat-card-large">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
              <FaUsers style={{ color: 'rgb(99, 102, 241)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Followers</div>
              <div className="stat-value">{formatNumber(totalFollowers)}</div>
              <div className="stat-change positive">+12.5%</div>
            </div>
          </div>

          <div className="stat-card-large">
            <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
              <FaChartLine style={{ color: 'rgb(236, 72, 153)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Reach</div>
              <div className="stat-value">{formatNumber(totalReach)}</div>
              <div className="stat-change positive">+18.2%</div>
            </div>
          </div>

          <div className="stat-card-large">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
              <FaHeart style={{ color: 'rgb(34, 197, 94)' }} />
            </div>
            <div className="stat-content">
              <div className="stat-label">Avg Engagement</div>
              <div className="stat-value">{avgEngagement}%</div>
              <div className="stat-change positive">+2.3%</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="analytics-grid">
          {/* Chart Section */}
          <div className="chart-section">
            <div className="section-header">
              <h2 className="section-title">
                Growth Over Time
                {instagramData && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      marginLeft: '8px',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    (@{instagramData.username})
                  </span>
                )}
              </h2>
              <div className="chart-legend-custom">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'rgb(99, 102, 241)' }}></span>
                  Followers
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'rgb(236, 72, 153)' }}></span>
                  Reach
                </span>
              </div>
            </div>
            <div className="chart-container">
              <Line data={engagementData} options={chartOptions} />
            </div>
          </div>

          {/* Platforms List */}
          <div className="platforms-section">
            <h2 className="section-title">Platform Performance</h2>
            <div className="platforms-list">
              {platforms.map((platform) => (
                <div key={platform.id} className={`platform-card ${platform.isReal ? 'real-data' : ''}`}>
                  <div className="platform-header">
                    <div
                      className="platform-icon"
                      style={{
                        background: `${platform.color}15`,
                        color: platform.color,
                      }}
                    >
                      {platform.icon}
                    </div>
                    <div className="platform-info">
                      <h3 className="platform-name">
                        {platform.name}
                        {platform.isReal && (
                          <span className="real-badge" title="Live data from API">
                            ✓ Live
                          </span>
                        )}
                      </h3>
                      <p className="platform-followers">
                        {platform.username && `@${platform.username} • `}
                        {formatNumber(platform.followers)} followers
                      </p>
                    </div>
                  </div>

                  <div className="platform-metrics">
                    <div className="metric-item">
                      <FaChartLine size={12} className="metric-icon" />
                      <span className="metric-label">Engagement:</span>
                      <span className="metric-value">{platform.engagement}%</span>
                    </div>
                    <div className="metric-item">
                      <FaUsers size={12} className="metric-icon" />
                      <span className="metric-label">Reach:</span>
                      <span className="metric-value">{formatNumber(platform.reach)}</span>
                    </div>
                    <div className="metric-item">
                      <FaComment size={12} className="metric-icon" />
                      <span className="metric-label">Posts:</span>
                      <span className="metric-value">{platform.posts}</span>
                    </div>
                  </div>

                  <div className="platform-progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(platform.engagement * 5, 100)}%`,
                        background: platform.color,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {/* Real Instagram Activity */}
            {instagramData &&
              instagramData.recent_posts &&
              instagramData.recent_posts.slice(0, 2).map((post, index) => {
                const timeAgo = Math.floor((Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60 * 24));
                const totalEngagement = post.like_count + post.comments_count;

                return (
                  <div key={post.id} className="activity-item real-activity">
                    <div className="activity-icon" style={{ background: '#E4405F15', color: '#E4405F' }}>
                      <FaInstagram />
                    </div>
                    <div className="activity-content">
                      <p className="activity-text">
                        <span className="real-badge-small">✓</span>"{post.caption.substring(0, 40)}..." •
                        <strong> {formatNumber(totalEngagement)} engagements</strong>
                      </p>
                      <span className="activity-time">
                        {timeAgo === 0 ? 'today' : `${timeAgo} day${timeAgo !== 1 ? 's' : ''} ago`}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Mock activity for other platforms */}
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#1877F215', color: '#1877F2' }}>
                <FaFacebook />
              </div>
              <div className="activity-content">
                <p className="activity-text">
                  New post reached <strong>12.5K people</strong>
                </p>
                <span className="activity-time">2 hours ago</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#00000015', color: '#000' }}>
                <FaTiktok />
              </div>
              <div className="activity-content">
                <p className="activity-text">
                  Video went viral with <strong>125K views</strong>
                </p>
                <span className="activity-time">1 day ago</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#FF000015', color: '#FF0000' }}>
                <FaYoutube />
              </div>
              <div className="activity-content">
                <p className="activity-text">
                  New video gained <strong>500 subscribers</strong>
                </p>
                <span className="activity-time">2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;
