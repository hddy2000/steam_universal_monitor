import { fetchFromSource } from '../../lib/fetcher';
import { analyzeWithKimi, generateCrossPlatformReport } from '../../lib/kimi';
import { getDb } from '../../lib/mongodb';

/**
 * 多源抓取并生成 AI 报告 API
 */
export default async function handler(req, res) {
  const { gameId } = req.query;
  
  if (!gameId) {
    return res.status(400).json({ error: 'Missing gameId' });
  }
  
  try {
    const db = await getDb();
    
    // 1. 获取游戏配置
    const game = await db.collection('games').findOne({ 
      $or: [
        { appid: parseInt(gameId) },
        { _id: gameId }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // 2. 获取启用的数据源配置
    const sources = game.sources || [
      { type: 'steam', config: { appid: game.appid } },
      { type: 'xiaoheihe', config: { appid: game.appid } },
    ];
    
    // 3. 并行抓取各平台数据
    const fetchPromises = sources
      .filter(s => s.enabled !== false)
      .map(async (source) => {
        try {
          const contents = await fetchFromSource(source.type, source.config);
          return { platform: source.type, contents, success: true };
        } catch (error) {
          console.error(`Failed to fetch ${source.type}:`, error);
          return { platform: source.type, contents: [], success: false, error: error.message };
        }
      });
    
    const fetchResults = await Promise.all(fetchPromises);
    
    // 4. 整合数据
    const contentsByPlatform = {};
    const allContents = [];
    
    fetchResults.forEach(result => {
      contentsByPlatform[result.platform] = result.contents;
      allContents.push(...result.contents);
    });
    
    // 5. 保存到数据库
    const bulkOps = allContents.map(c => ({
      updateOne: {
        filter: { platform: c.platform, contentId: c.contentId },
        update: { 
          $set: {
            ...c,
            gameId: game._id,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));
    
    if (bulkOps.length > 0) {
      await db.collection('contents').bulkWrite(bulkOps);
    }
    
    // 6. 生成 AI 报告
    let aiReport = null;
    if (allContents.length > 0) {
      try {
        aiReport = await generateCrossPlatformReport(contentsByPlatform);
      } catch (error) {
        console.error('AI analysis failed:', error);
        // AI 失败时使用简单统计
        aiReport = generateSimpleReport(allContents, contentsByPlatform);
      }
    }
    
    // 7. 保存报告
    const reportDoc = {
      gameId: game._id,
      gameName: game.name,
      date: new Date(),
      stats: {
        total: allContents.length,
        byPlatform: Object.fromEntries(
          Object.entries(contentsByPlatform).map(([k, v]) => [k, v.length])
        )
      },
      aiReport,
      rawData: fetchResults
    };
    
    await db.collection('ai_reports').insertOne(reportDoc);
    
    // 8. 清理旧数据（保留最近 30 条报告）
    const oldReports = await db.collection('ai_reports')
      .find({ gameId: game._id })
      .sort({ date: -1 })
      .skip(30)
      .toArray();
    
    if (oldReports.length > 0) {
      await db.collection('ai_reports').deleteMany({
        _id: { $in: oldReports.map(r => r._id) }
      });
    }
    
    // 9. 返回结果
    res.status(200).json({
      success: true,
      game: {
        id: game._id,
        name: game.name,
        appid: game.appid
      },
      fetchResults: fetchResults.map(r => ({
        platform: r.platform,
        count: r.contents.length,
        success: r.success
      })),
      totalContents: allContents.length,
      aiReport: aiReport ? {
        ...aiReport.comprehensive,
        platforms: aiReport.platforms,
        crossPlatform: aiReport.crossPlatform
      } : null,
      updatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Multi-source fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * 生成简单报告（AI 失败时使用）
 */
function generateSimpleReport(allContents, byPlatform) {
  const total = allContents.length;
  const positive = allContents.filter(c => c.rating >= 0.5).length;
  const score = Math.round((positive / total) * 100);
  
  const platformStats = {};
  Object.entries(byPlatform).forEach(([platform, contents]) => {
    const p = contents.filter(c => c.rating >= 0.5).length;
    platformStats[platform] = {
      count: contents.length,
      positive: p,
      negative: contents.length - p,
      sentiment: p > contents.length / 2 ? 'positive' : 'negative'
    };
  });
  
  return {
    comprehensive: {
      overall: `共收集 ${total} 条评价，好评率 ${score}%`,
      sentiment: score >= 70 ? 'positive' : score >= 50 ? 'neutral' : 'negative',
      score: score,
      platforms: platformStats,
      common_praises: [],
      common_complaints: [],
      risks: score < 50 ? [{ type: '口碑风险', severity: 'high', description: '差评率较高' }] : []
    },
    platforms: platformStats,
    crossPlatform: {
      totalContents: total,
      platformCount: Object.keys(byPlatform).length,
      consistency: 'unknown'
    }
  };
}
