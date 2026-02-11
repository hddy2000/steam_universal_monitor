import { getDb } from '../../lib/mongodb';
import { analyzeSentiment, extractTopics } from '../../lib/analyzer';

// 抓取 Steam 评论
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
    recommended: r.voted_up,
    rating: r.voted_up ? 1 : 0,
    playtime: Math.round(r.author.playtime_forever / 60),
    helpful: r.votes_up,
    date: new Date(r.timestamp_created * 1000)
  }));
}

export default async function handler(req, res) {
  const { appid, action = 'get' } = req.query;
  
  if (!appid) {
    return res.status(400).json({ error: 'Missing appid' });
  }
  
  try {
    const db = await getDb();
    const appidNum = parseInt(appid);
    
    if (action === 'fetch') {
      // 实时抓取
      const reviews = await fetchSteamReviews(appidNum);
      
      // 情感分析
      const analyzed = reviews.map(r => ({
        ...r,
        appid: appidNum,
        sentiment: analyzeSentiment(r.content).label,
        sentimentScore: analyzeSentiment(r.content).score,
        keywords: extractTopics(r.content),
        fetchedAt: new Date()
      }));
      
      // 保存
      if (analyzed.length > 0) {
        const bulkOps = analyzed.map(r => ({
          updateOne: {
            filter: { contentId: r.contentId, platform: 'steam' },
            update: { $set: r },
            upsert: true
          }
        }));
        await db.collection('contents').bulkWrite(bulkOps);
      }
      
      res.status(200).json({
        success: true,
        count: analyzed.length,
        reviews: analyzed
      });
      
    } else {
      // 从数据库读取
      const reviews = await db.collection('contents')
        .find({ appid: appidNum, platform: 'steam' })
        .sort({ date: -1 })
        .limit(100)
        .toArray();
      
      const total = reviews.length;
      const positive = reviews.filter(r => r.recommended).length;
      
      res.status(200).json({
        success: true,
        total,
        positive,
        negative: total - positive,
        positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
        reviews
      });
    }
  } catch (error) {
    console.error('Reviews API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
