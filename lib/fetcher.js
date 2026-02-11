// 通用舆情抓取器 - 支持多平台
const SOURCES = {
  steam: {
    name: 'Steam',
    fetch: async (config) => fetchSteamReviews(config.appid),
    enabled: true
  },
  
  xiaoheihe: {
    name: '小黑盒',
    fetch: async (config) => fetchXiaoHeiHe(config.appid),
    enabled: true
  },
  
  bilibili: {
    name: 'B站',
    fetch: async (config) => fetchBilibili(config.bvid || config.keyword),
    enabled: true
  },
  
  taptap: {
    name: 'TapTap',
    fetch: async (config) => fetchTapTap(config.app_id),
    enabled: false  // 预留
  },
  
  zhihu: {
    name: '知乎',
    fetch: async (config) => fetchZhihu(config.question_id),
    enabled: false  // 预留
  }
};

// ==================== Steam ====================
async function fetchSteamReviews(appid, count = 100) {
  const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=schinese&num_per_page=${count}&filter=recent`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.success !== 1) {
    throw new Error(data.error || 'Steam API failed');
  }
  
  return data.reviews.map(r => ({
    platform: 'steam',
    contentId: r.recommendationid,
    author: r.author.steamid,
    content: r.review.slice(0, 1000),
    rating: r.voted_up ? 1 : 0,  // 1=好评, 0=差评
    likes: r.votes_up,
    replies: r.comment_count,
    date: new Date(r.timestamp_created * 1000),
    metadata: {
      playtime: Math.round(r.author.playtime_forever / 60),
      steamPurchase: r.steam_purchase
    }
  }));
}

// ==================== 小黑盒 ====================
async function fetchXiaoHeiHe(appid) {
  // 小黑盒没有官方 API，需要爬取
  // 使用 web fetch 获取游戏评价页面
  
  try {
    // 尝试多个可能的 URL 格式
    const urls = [
      `https://api.xiaoheihe.cn/game/info?appid=${appid}`,
      `https://api.xiaoheihe.cn/game/review?appid=${appid}&limit=50`
    ];
    
    for (const url of urls) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.reviews || data.data?.reviews) {
          const reviews = data.reviews || data.data.reviews;
          return reviews.map(r => ({
            platform: 'xiaoheihe',
            contentId: r.review_id || r.id,
            author: r.username || r.user_id,
            content: (r.content || r.review).slice(0, 1000),
            rating: r.score ? r.score / 10 : (r.is_recommend ? 1 : 0),  // 小黑盒是 0-10 分
            likes: r.like_count || 0,
            replies: r.reply_count || 0,
            date: new Date(r.create_time * 1000 || r.created_at),
            metadata: {
              playtime: r.playtime_hours,
              platform: r.platform
            }
          }));
        }
      }
    }
    
    // 如果 API 失败，返回空数组
    console.warn('XiaoHeiHe API failed, returning empty');
    return [];
    
  } catch (error) {
    console.error('XiaoHeiHe fetch error:', error);
    return [];
  }
}

// ==================== B站 ====================
async function fetchBilibili(query) {
  // 支持两种模式：
  // 1. 通过 BV 号获取视频评论
  // 2. 通过关键词搜索相关视频/专栏
  
  try {
    if (query.startsWith('BV')) {
      // 获取视频评论
      return await fetchBilibiliVideoComments(query);
    } else {
      // 搜索关键词
      return await searchBilibiliVideos(query);
    }
  } catch (error) {
    console.error('Bilibili fetch error:', error);
    return [];
  }
}

async function fetchBilibiliVideoComments(bvid) {
  // 获取视频基本信息
  const infoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const infoRes = await fetch(infoUrl);
  const infoData = await infoRes.json();
  
  if (infoData.code !== 0) {
    throw new Error(infoData.message);
  }
  
  const oid = infoData.data.aid;  // 视频 aid
  
  // 获取评论
  const commentsUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${oid}&ps=50`;
  const commentsRes = await fetch(commentsUrl);
  const commentsData = await commentsRes.json();
  
  if (commentsData.code !== 0) {
    throw new Error(commentsData.message);
  }
  
  const replies = commentsData.data?.replies || [];
  
  return replies.map(r => ({
    platform: 'bilibili',
    contentId: r.rpid,
    author: r.member.uname,
    content: r.content.message.slice(0, 1000),
    rating: r.like > 10 ? 1 : 0,  // 简单判断：高赞视为正面
    likes: r.like,
    replies: r.rcount || 0,
    date: new Date(r.ctime * 1000),
    metadata: {
      avatar: r.member.avatar,
      level: r.member.level_info.current_level
    }
  }));
}

async function searchBilibiliVideos(keyword) {
  // 搜索视频
  const searchUrl = `https://api.bilibili.com/x/web-interface/search/type?keyword=${encodeURIComponent(keyword)}&search_type=video&page=1`;
  
  const response = await fetch(searchUrl);
  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  
  const videos = data.data?.result || [];
  
  // 获取前 3 个视频的评论
  const allComments = [];
  
  for (const video of videos.slice(0, 3)) {
    try {
      const comments = await fetchBilibiliVideoComments(video.bvid);
      allComments.push(...comments);
    } catch (e) {
      console.warn(`Failed to fetch comments for ${video.bvid}:`, e);
    }
  }
  
  return allComments;
}

// ==================== 主入口 ====================
export async function fetchFromSource(sourceType, config) {
  const source = SOURCES[sourceType];
  
  if (!source || !source.enabled) {
    throw new Error(`Unknown or disabled source: ${sourceType}`);
  }
  
  console.log(`Fetching from ${source.name}...`);
  const contents = await source.fetch(config);
  console.log(`Fetched ${contents.length} items from ${source.name}`);
  
  return contents;
}

export function getSupportedSources() {
  return Object.entries(SOURCES)
    .filter(([_, s]) => s.enabled)
    .map(([key, s]) => ({ key, name: s.name }));
}

export default SOURCES;
