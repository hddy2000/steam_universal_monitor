import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  const db = await getDb();
  
  try {
    switch (req.method) {
      case 'GET': {
        const games = await db.collection('games').find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, games });
        break;
      }
      
      case 'POST': {
        const { appid, name, sources } = req.body;
        
        if (!appid || !name) {
          return res.status(400).json({ error: 'Missing appid or name' });
        }
        
        const appidNum = parseInt(appid);
        
        // 检查是否已存在
        const exists = await db.collection('games').findOne({ appid: appidNum });
        if (exists) {
          return res.status(409).json({ error: 'Game already exists' });
        }
        
        // 检查数量限制
        const count = await db.collection('games').countDocuments();
        if (count >= 10) {
          return res.status(403).json({ error: 'Maximum 10 games allowed' });
        }
        
        // 准备数据源配置
        const sourceConfigs = sources?.map(s => ({
          type: s,
          enabled: true,
          config: { appid: appidNum }
        })) || [
          { type: 'steam', enabled: true, config: { appid: appidNum } },
          { type: 'xiaoheihe', enabled: true, config: { appid: appidNum } }
        ];
        
        const newGame = {
          appid: appidNum,
          name: name.trim(),
          sources: sourceConfigs,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await db.collection('games').insertOne(newGame);
        
        res.status(201).json({ 
          success: true, 
          game: { ...newGame, _id: result.insertedId } 
        });
        break;
      }
      
      case 'DELETE': {
        const { id } = req.query;
        const idNum = parseInt(id);
        
        await db.collection('games').deleteOne({ appid: idNum });
        await db.collection('contents').deleteMany({ 'gameId': idNum });
        await db.collection('ai_reports').deleteMany({ 'gameId': idNum });
        
        res.status(200).json({ success: true });
        break;
      }
      
      case 'PUT': {
        const { id } = req.query;
        const updates = req.body;
        
        await db.collection('games').updateOne(
          { appid: parseInt(id) },
          { $set: { ...updates, updatedAt: new Date() } }
        );
        
        res.status(200).json({ success: true });
        break;
      }
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Games API error:', error);
    res.status(500).json({ error: error.message });
  }
}
