import { getDb } from '../../lib/mongodb';
import { generateSentimentReport } from '../../lib/summarizer';

export default async function handler(req, res) {
  const { appid } = req.query;
  
  if (!appid) {
    return res.status(400).json({ error: 'Missing appid' });
  }
  
  try {
    const db = await getDb();
    const appidNum = parseInt(appid);
    
    // 1. 获取最新评论
    const reviews = await db.collection('reviews')
      .find({ appid: appidNum })
      .sort({ date: -1 })
      .limit(100)
      .toArray();
    
    // 2. 获取历史统计（用于对比）
    const previousStats = await db.collection('daily_stats')
      .find({ appid: appidNum })
      .sort({ date: -1 })
      .skip(1)
      .limit(1)
      .toArray();
    
    const previous = previousStats[0] || null;
    
    // 3. 生成舆情报告
    const report = generateSentimentReport(reviews, previous);
    
    // 4. 保存报告到数据库
    await db.collection('sentiment_reports').updateOne(
      { appid: appidNum },
      { 
        $set: {
          ...report,
          appid: appidNum,
          reviewCount: reviews.length
        }
      },
      { upsert: true }
    );
    
    // 5. 只保留最近 30 天的报告
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.collection('sentiment_reports').deleteMany({
      appid: appidNum,
      updatedAt: { $lt: thirtyDaysAgo }
    });
    
    res.status(200).json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Report API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
