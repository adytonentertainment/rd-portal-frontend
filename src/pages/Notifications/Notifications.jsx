import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs, BreadcrumbItem } from '@heroui/react';
import { CircularProgress, Skeleton } from '@mui/material';
import {
  FaExclamationTriangle,
  FaDollarSign,
  FaMusic,
  FaExclamationCircle,
  FaCheckCircle,
  FaFileAlt,
  FaBell,
  FaBellSlash,
  FaChartLine,
  FaCheck,
  FaSearch,
  FaFire,
  FaChartBar,
  FaTrophy,
  FaClock,
  FaFilter,
} from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { HiTrendingUp } from 'react-icons/hi';
import Sidebar from '../../components/Sidebar/Sidebar';
import styles from './notifications.module.css';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  getPushStatus,
} from '../../services/pushNotificationService';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Icon and color mapping for notification types
const getNotificationConfig = (type, priority) => {
  const configs = {
    // Attention types
    revenue_discrepancy: { icon: FaDollarSign, color: '#ef4444', cta: 'Investigate' },
    song_missing: { icon: FaMusic, color: '#ef4444', cta: 'Review Statement' },
    revenue_leak: { icon: FaExclamationTriangle, color: '#ef4444', cta: 'Fix Now' },
    termination_expiring: { icon: FaClock, color: '#ef4444', cta: 'Review Agreement' },
    audit_expiring: { icon: FaFileAlt, color: '#f59e0b', cta: 'Schedule Audit' },
    collection_ending: { icon: FaClock, color: '#f59e0b', cta: 'Review' },
    unauthorized_use: { icon: FaExclamationTriangle, color: '#ef4444', cta: 'Take Action' },
    missing_metadata: { icon: FaExclamationCircle, color: '#6366f1', cta: 'Update Catalog' },
    contract_expiring: { icon: FaFileAlt, color: '#8b5cf6', cta: 'Review' },
    critical_red_flag: { icon: FaExclamationTriangle, color: '#ef4444', cta: 'Review Agreement' },
    // Feed types
    new_match_auto: { icon: FaSearch, color: '#3b82f6', cta: 'View Match' },
    new_match_manual: { icon: FaSearch, color: '#3b82f6', cta: 'View Results' },
    new_match: { icon: FaSearch, color: '#10b981', cta: 'View Match' },
    approaching_recoupment: { icon: FaDollarSign, color: '#10b981', cta: 'View Details' },
    revenue_spike: { icon: HiTrendingUp, color: '#22c55e', cta: 'View Report' },
    weekly_report: { icon: FaChartBar, color: '#3b82f6', cta: 'View Report' },
    milestone: { icon: FaTrophy, color: '#f59e0b', cta: 'Celebrate' },
    trending: { icon: FaFire, color: '#ef4444', cta: 'View Analytics' },
    statement_processed: { icon: FaCheckCircle, color: '#22c55e', cta: 'View Statement' },
    catalog_update: { icon: FaMusic, color: '#06b6d4', cta: 'View Catalog' },
  };

  return configs[type] || { icon: FaBell, color: '#6b7280', cta: 'View' };
};

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'high':
      return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'HIGH' };
    case 'medium':
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'MEDIUM' };
    case 'low':
      return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'LOW' };
    default:
      return null;
  }
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const AttentionItem = ({ notification, onDismiss, onResolve, onClick }) => {
  const config = getNotificationConfig(notification.type, notification.priority);
  const priorityConfig = getPriorityConfig(notification.priority);
  const Icon = config.icon;

  return (
    <div className={styles.attentionItem} onClick={() => onClick(notification)}>
      <div className={styles.priorityIndicator} style={{ backgroundColor: priorityConfig?.color || '#6b7280' }} />
      <div className={styles.itemIcon} style={{ backgroundColor: `${config.color}15`, color: config.color }}>
        <Icon size={18} />
      </div>
      <div className={styles.itemContent}>
        <div className={styles.itemHeader}>
          <div className={styles.itemTitle}>{notification.title}</div>
          {priorityConfig && (
            <span
              className={styles.priorityBadge}
              style={{ backgroundColor: priorityConfig.bg, color: priorityConfig.color }}
            >
              {priorityConfig.label}
            </span>
          )}
        </div>
        {notification.body && <div className={styles.itemBody}>{notification.body}</div>}
        <div className={styles.itemMeta}>
          <span className={styles.itemTime}>{formatTimeAgo(notification.created_at)}</span>
          <div className={styles.itemActions}>
            {notification.extra_data?.amount > 0 && (
              <span className={styles.itemAmount}>${notification.extra_data.amount.toLocaleString()}</span>
            )}
            <span
              className={styles.itemCta}
              style={{ color: config.color }}
              onClick={(e) => {
                e.stopPropagation();
                onClick(notification);
              }}
            >
              {config.cta} →
            </span>
          </div>
        </div>
      </div>
      <button
        className={styles.dismissButton}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        title="Dismiss"
      >
        <IoClose size={16} />
      </button>
    </div>
  );
};

const FeedItem = ({ notification, onMarkRead, onDelete, onClick }) => {
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;
  const isUnread = notification.status === 'unread';

  return (
    <div className={`${styles.feedItem} ${isUnread ? styles.unread : ''}`} onClick={() => onClick(notification)}>
      {isUnread && <div className={styles.unreadIndicator} />}
      <div className={styles.feedIcon} style={{ backgroundColor: `${config.color}15`, color: config.color }}>
        <Icon size={16} />
      </div>
      <div className={styles.feedContent}>
        <div className={styles.feedTitle}>{notification.title}</div>
        {notification.body && <div className={styles.feedBody}>{notification.body}</div>}
        <div className={styles.feedMeta}>
          <span className={styles.feedTime}>{formatTimeAgo(notification.created_at)}</span>
          {notification.action_url && (
            <span className={styles.feedCta} style={{ color: config.color }}>
              {config.cta} →
            </span>
          )}
        </div>
      </div>
      <div className={styles.feedActions}>
        {isUnread && (
          <button
            className={styles.markReadButton}
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
          >
            <FaCheck size={12} />
          </button>
        )}
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
        >
          <IoClose size={16} />
        </button>
      </div>
    </div>
  );
};

const SkeletonAttentionItem = () => (
  <div className={styles.attentionItem} style={{ opacity: 0.6 }}>
    <Skeleton variant="rectangular" width={3} height="100%" sx={{ borderRadius: '4px 0 0 4px' }} />
    <Skeleton variant="circular" width={36} height={36} />
    <div style={{ flex: 1 }}>
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="80%" height={16} />
      <Skeleton variant="text" width="30%" height={14} />
    </div>
  </div>
);

const SkeletonFeedItem = () => (
  <div className={styles.feedItem} style={{ opacity: 0.6 }}>
    <Skeleton variant="circular" width={32} height={32} />
    <div style={{ flex: 1 }}>
      <Skeleton variant="text" width="50%" height={18} />
      <Skeleton variant="text" width="70%" height={14} />
      <Skeleton variant="text" width="20%" height={12} />
    </div>
  </div>
);

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'match', label: 'Matches' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'report', label: 'Reports' },
];

const Notifications = () => {
  const navigate = useNavigate();
  const [attentionItems, setAttentionItems] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [loadingAttention, setLoadingAttention] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedFilter, setFeedFilter] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);

  // Push notification state
  const [pushSupported] = useState(isPushSupported());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState(getPermissionStatus());
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    fetchAttentionItems();
    // Check push status on mount
    if (pushSupported) {
      getPushStatus().then((status) => {
        setPushEnabled(status.enabled);
        setPushPermission(status.permission);
      });
    }
  }, [pushSupported]);

  const handleEnablePush = async () => {
    if (!pushSupported) return;

    setEnablingPush(true);
    try {
      await subscribeToPush();
      setPushEnabled(true);
      setPushPermission('granted');
    } catch (error) {
      console.error('Failed to enable push:', error);
      if (error.message === 'Notification permission denied') {
        setPushPermission('denied');
      }
    } finally {
      setEnablingPush(false);
    }
  };

  useEffect(() => {
    setFeedOffset(0);
    setFeedItems([]);
    setLoadingFeed(true);
    fetchFeedItems(0, false, feedFilter);
  }, [feedFilter]);

  const fetchAttentionItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/notifications/attention`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAttentionItems(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching attention items:', error);
    } finally {
      setLoadingAttention(false);
    }
  };

  const fetchFeedItems = async (offset = 0, append = false, filter = 'all') => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/notifications/feed?limit=20&offset=${offset}`;

      // Add filter params based on selection
      if (filter === 'unread') {
        url += '&status=unread';
      } else if (filter === 'match') {
        url += '&type=new_match,new_match_auto,new_match_manual';
      } else if (filter === 'revenue') {
        url += '&type=revenue_spike,approaching_recoupment,statement_processed';
      } else if (filter === 'report') {
        url += '&type=weekly_report';
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (append) {
          setFeedItems((prev) => [...prev, ...(data.notifications || [])]);
        } else {
          setFeedItems(data.notifications || []);
        }
        setFeedHasMore(data.has_more);
        setFeedOffset(offset + (data.notifications?.length || 0));
      }
    } catch (error) {
      console.error('Error fetching feed items:', error);
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttentionItems((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedItems((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n)));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/mark-all-read?category=feed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedItems((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteFeedItem = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedItems((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const loadMoreFeed = () => {
    setLoadingMore(true);
    fetchFeedItems(feedOffset, true, feedFilter);
  };

  const unreadAttentionCount = attentionItems.filter((n) => n.status === 'unread').length;
  const unreadFeedCount = feedItems.filter((n) => n.status === 'unread').length;

  return (
    <div className="flex flex-col h-full">
      <Sidebar />
      <Helmet>
        <title>RD - Notifications</title>
      </Helmet>
      <div className={styles.container} style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
        {/* Breadcrumb */}
        <Breadcrumbs className={styles.breadcrumb}>
          <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
          <BreadcrumbItem>Notifications</BreadcrumbItem>
        </Breadcrumbs>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notifications</h1>
            <p className={styles.pageSubtitle}>Stay on top of important updates and actionable items</p>
          </div>
          {/* Push Notification Toggle */}
          {pushSupported && (
            <div className={styles.pushToggle}>
              {pushEnabled ? (
                <div className={styles.pushEnabled}>
                  <FaBell size={16} style={{ color: '#22c55e' }} />
                  <span>Push notifications enabled</span>
                </div>
              ) : pushPermission === 'denied' ? (
                <div className={styles.pushDenied}>
                  <FaBellSlash size={16} style={{ color: '#ef4444' }} />
                  <span>Notifications blocked in browser</span>
                </div>
              ) : (
                <button className={styles.enablePushButton} onClick={handleEnablePush} disabled={enablingPush}>
                  {enablingPush ? (
                    <CircularProgress size={14} sx={{ color: 'white' }} />
                  ) : (
                    <>
                      <FaBell size={14} />
                      <span>Enable push notifications</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Two-Column Layout */}
        <div className={styles.columnsContainer}>
          {/* Needs Attention Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <FaExclamationTriangle className={styles.sectionIcon} style={{ color: '#f59e0b' }} />
                <h2 className={styles.sectionTitle}>Needs Attention</h2>
                {unreadAttentionCount > 0 && <span className={styles.badge}>{unreadAttentionCount}</span>}
              </div>
              <p className={styles.sectionSubtitle}>Actionable items requiring your review</p>
            </div>
            <div className={styles.sectionContent}>
              {loadingAttention ? (
                <div className={styles.skeletonList}>
                  <SkeletonAttentionItem />
                  <SkeletonAttentionItem />
                  <SkeletonAttentionItem />
                </div>
              ) : attentionItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <FaCheckCircle size={48} className={styles.emptyIcon} style={{ color: '#22c55e' }} />
                  <p className={styles.emptyTitle}>All caught up!</p>
                  <p className={styles.emptyText}>No items need your attention right now.</p>
                </div>
              ) : (
                <div className={styles.attentionList}>
                  {attentionItems.map((notification) => (
                    <AttentionItem
                      key={notification.id}
                      notification={notification}
                      onDismiss={handleDismiss}
                      onResolve={handleDismiss}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notification Feed Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <FaBell className={styles.sectionIcon} />
                <h2 className={styles.sectionTitle}>Notification Feed</h2>
                {unreadFeedCount > 0 && <span className={styles.badge}>{unreadFeedCount}</span>}
              </div>
              <p className={styles.sectionSubtitle}>Recent updates and activity</p>
            </div>
            <div className={styles.sectionContent}>
              {loadingFeed ? (
                <div className={styles.feedList}>
                  <SkeletonFeedItem />
                  <SkeletonFeedItem />
                  <SkeletonFeedItem />
                  <SkeletonFeedItem />
                  <SkeletonFeedItem />
                </div>
              ) : feedItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <FaBell size={40} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>No notifications yet.</p>
                </div>
              ) : (
                <>
                  <div className={styles.feedList}>
                    {feedItems.map((notification) => (
                      <FeedItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDeleteFeedItem}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </div>
                  {feedHasMore && (
                    <button className={styles.loadMoreButton} onClick={loadMoreFeed} disabled={loadingMore}>
                      {loadingMore ? <CircularProgress size={14} sx={{ color: 'var(--muted-text)' }} /> : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
