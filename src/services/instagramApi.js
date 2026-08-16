import axios from 'axios';

/**
 * Instagram API service for TuneScan frontend
 * Uses Phyllo API to fetch creator profile and engagement data
 * Documentation: https://docs.getphyllo.com/
 */
class InstagramAPI {
  // NOTE: Phyllo API calls should be made through the backend to protect credentials
  // Frontend only uses mock data for now

  /**
   * Mock data for omegacreate Instagram account
   * This simulates real Instagram data until OAuth is properly implemented
   * In production, replace this with actual API calls
   * Data reflects actual @omegacreate profile: 760 followers
   */
  static getMockInstagramData() {
    return {
      id: 'omegacreate',
      username: 'omegacreate',
      name: 'Omega Create',
      profile_picture: null,
      followers: 760,
      following: 285,
      media_count: 89,
      engagement_rate: 6.2,
      avg_likes: 45,
      avg_comments: 8,
      total_reach: 2840,
      impressions: 4120,
      profile_views: 324,
      recent_posts: [
        {
          id: '1',
          caption: 'New music dropping soon! 🎵✨',
          media_type: 'IMAGE',
          like_count: 68,
          comments_count: 12,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          engagement: 10.5,
        },
        {
          id: '2',
          caption: 'Behind the scenes at the studio 🎤',
          media_type: 'VIDEO',
          like_count: 92,
          comments_count: 15,
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          engagement: 14.1,
        },
        {
          id: '3',
          caption: 'Thank you all for the support! 🙏',
          media_type: 'IMAGE',
          like_count: 54,
          comments_count: 8,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          engagement: 8.2,
        },
        {
          id: '4',
          caption: 'Live performance energy ⚡',
          media_type: 'CAROUSEL_ALBUM',
          like_count: 71,
          comments_count: 11,
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          engagement: 10.8,
        },
      ],
      growth_data: {
        monthly: [
          { date: '2024-08', followers: 685, engagement: 5.8, reach: 2200 },
          { date: '2024-09', followers: 710, engagement: 6.0, reach: 2450 },
          { date: '2024-10', followers: 735, engagement: 6.1, reach: 2680 },
          { date: '2024-11', followers: 760, engagement: 6.2, reach: 2840 },
        ],
        weekly: [
          {
            date: '2024-11-04',
            followers: 735,
            engagement: 6.0,
            reach: 2600,
          },
          {
            date: '2024-11-11',
            followers: 742,
            engagement: 6.1,
            reach: 2680,
          },
          {
            date: '2024-11-18',
            followers: 751,
            engagement: 6.1,
            reach: 2750,
          },
          {
            date: '2024-11-25',
            followers: 760,
            engagement: 6.2,
            reach: 2840,
          },
        ],
      },
      demographics: {
        top_cities: [
          { city: 'Los Angeles', percentage: 23.4 },
          { city: 'New York', percentage: 18.7 },
          { city: 'London', percentage: 12.3 },
          { city: 'Toronto', percentage: 9.8 },
          { city: 'Berlin', percentage: 7.6 },
        ],
        age_ranges: [
          { range: '18-24', percentage: 32.1 },
          { range: '25-34', percentage: 45.6 },
          { range: '35-44', percentage: 15.3 },
          { range: '45-54', percentage: 5.2 },
          { range: '55+', percentage: 1.8 },
        ],
        gender: {
          male: 58.3,
          female: 41.7,
        },
      },
    };
  }

  /**
   * Calculate engagement metrics from Instagram data
   * @param {Object} data - Instagram data object
   * @returns {Object} Calculated engagement metrics
   */
  static calculateEngagementMetrics(data) {
    if (!data || !data.recent_posts) {
      return {
        avg_engagement_rate: 0,
        total_likes: 0,
        total_comments: 0,
        total_engagements: 0,
      };
    }

    const posts = data.recent_posts;
    const totalLikes = posts.reduce((sum, post) => sum + post.like_count, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments_count, 0);
    const totalEngagements = totalLikes + totalComments;
    const avgEngagementRate = posts.reduce((sum, post) => sum + post.engagement, 0) / posts.length;

    return {
      avg_engagement_rate: avgEngagementRate.toFixed(1),
      total_likes: totalLikes,
      total_comments: totalComments,
      total_engagements: totalEngagements,
      avg_likes: Math.round(totalLikes / posts.length),
      avg_comments: Math.round(totalComments / posts.length),
    };
  }

  /**
   * Format Instagram data for Team page display
   * @param {Object} data - Raw Instagram data
   * @returns {Object} Formatted data for display
   */
  static formatForTeamPage(data) {
    const metrics = this.calculateEngagementMetrics(data);

    return {
      id: 'instagram',
      name: 'Instagram',
      username: data.username,
      followers: data.followers,
      following: data.following,
      posts: data.media_count,
      engagement: parseFloat(metrics.avg_engagement_rate),
      reach: data.total_reach,
      impressions: data.impressions,
      profile_views: data.profile_views,
      avg_likes: metrics.avg_likes,
      avg_comments: metrics.avg_comments,
      growth_rate: this.calculateGrowthRate(data.growth_data),
      recent_posts: data.recent_posts,
      demographics: data.demographics,
    };
  }

  /**
   * Calculate follower growth rate
   * @param {Object} growthData - Growth data object
   * @returns {number} Growth rate percentage
   */
  static calculateGrowthRate(growthData) {
    if (!growthData || !growthData.daily || growthData.daily.length < 2) {
      return 0;
    }

    const data = growthData.daily;
    const oldest = data[0].followers;
    const newest = data[data.length - 1].followers;
    const growthRate = ((newest - oldest) / oldest) * 100;

    return parseFloat(growthRate.toFixed(1));
  }

  /**
   * Get formatted Instagram data for omegacreate
   * This is the main method to call from Team page
   * @returns {Object} Formatted Instagram data ready for display
   */
  static async getOmegaCreateData() {
    try {
      // For now, return mock data
      // In production, this would make actual API calls with OAuth token
      const mockData = this.getMockInstagramData();
      return this.formatForTeamPage(mockData);
    } catch (error) {
      console.error('Error getting Instagram data:', error);
      // Return fallback data on error
      return {
        id: 'instagram',
        name: 'Instagram',
        username: 'omegacreate',
        followers: 0,
        posts: 0,
        engagement: 0,
        reach: 0,
        error: true,
      };
    }
  }
}

export default InstagramAPI;
