import { getDb } from '../../../lib/mongodb';
import { analyzeSentiment, extractTopics } from '../../../lib/analyzer';

// 抓取 Steam 评论
async function fetchSteamReviews(appid, count = 100) {
  const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=schinese&num_per_page=${count}&filter=recent`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.success !== 1) {
    throw new Error(data.error || 'Failed to fetch');
  }
  
  return data.reviews.map(r => ({
    reviewId: r.recommendationid,
    author: r.author.steamid,
    content: r.review.slice(0, 500),
    recommended: r.voted_up,
    playtime: Math.round(r.author.playtime_forever / 60),
    helpful: r.votes_up,
    funny: r.votes_funny,
    commentCount: r.comment_count,
    date: new Date(r.timestamp_created * 1000),
    appid: parseInt(appid),
    fetchedAt: new Date()
  }));
}

// 生成每日统计
async function generateDailyStats(db, appid, reviews) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayReviews = reviews.filter(r => {
    const reviewDate = new Date(r.date);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate.getTime() === today.getTime();
  });
  
  const positive = todayReviews.filter(r => r.recommended).length;
  const negative = todayReviews.length - positive;
  
  const avgSentiment = todayReviews.length > 0
    ? todayReviews.reduce((sum, r) => sum + (r.sentimentScore || 0), 0) / todayReviews.length
    : 0;
  
  const stats = {
    appid: parseInt(appid),
    date: today,
    totalReviews: reviews.length,
    newReviews: todayReviews.length,
    positive,
    negative,
    sentimentScore: avgSentiment,
    updatedAt: new Date()
  };
  
  await db.collection('daily_stats').updateOne(
    { appid: parseInt(appid), date: today },
    { $set: stats },
    { upsert: true }
  );
  
  // 只保留 30 天数据
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  await db.collection('daily_stats').deleteMany({
    appid: parseInt(appid),
    date: { $lt: thirtyDaysAgo }
  });
}

export default async function handler(req, res) {
  // 验证 Cron 请求（Vercel 自动处理，但加个简单验证）
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    // 允许手动触发（开发/测试）
    console.log('Cron triggered:', new Date().toISOString());
  }
  
  try {
    const db = await getDb();
    const games = await db.collection('games').find({ enabled: true }).toArray();
    
    const results = [];
    
    for (const game of games) {
      try {
        console.log(`Updating ${game.name} (${game.appid})...`);
        
        // 1. 抓取评论
        const reviews = await fetchSteamReviews(game.appid, 100);
        
        // 2. 情感分析
        const analyzed = reviews.map(r => {
          const sentiment = analyzeSentiment(r.content);
          const topics = extractTopics(r.content);
          return {
            ...r,
            sentiment: sentiment.label,
            sentimentScore: sentiment.score,
            keywords: sentiment.keywords,
            topics
          };
        });
        
        // 3. 保存到数据库
        const bulkOps = analyzed.map(r => ({
          updateOne: {
            filter: { reviewId: r.reviewId },
            update: { $set: r },
            upsert: true
          }
        }));
        
        if (bulkOps.length > 0) {
          await db.collection('reviews').bulkWrite(bulkOps);
        }
        
        // 4. 清理旧数据（只保留 100 条）
        const allReviews = await db.collection('reviews')
          .find({ appid: game.appid })
          .sort({ date: -1 })
          .skip(100)
          .toArray();
        
        if (allReviews.length > 0) {
          await db.collection('reviews').deleteMany({
            _id: { $in: allReviews.map(r => r._id) }
          });
        }
        
        // 5. 生成每日统计
        const latestReviews = await db.collection('reviews')
          .find({ appid: game.appid })
          .sort({ date: -1 })
          .limit(100)
          .toArray();
        
        await generateDailyStats(db, game.appid, latestReviews);
        
        results.push({
          appid: game.appid,
          name: game.name,
          status: 'success',
          count: analyzed.length
        });
        
      } catch (error) {
        console.error(`Failed to update ${game.name}:`, error);
        results.push({
          appid: game.appid,
          name: game.name,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      updated: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    });
    
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: error.message });
  }
}
