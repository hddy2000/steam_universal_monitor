import { useState, useEffect } from 'react';
import Head from 'next/head';

const PLATFORMS = [
  { key: 'steam', name: 'Steam', icon: '🎮', color: '#1b2838' },
  { key: 'xiaoheihe', name: '小黑盒', icon: '📦', color: '#00b4d8' },
  { key: 'bilibili', name: 'B站', icon: '📺', color: '#fb7299' },
  { key: 'taptap', name: 'TapTap', icon: '📱', color: '#12b886' },
  { key: 'zhihu', name: '知乎', icon: '💭', color: '#0084ff' }
];

export default function UniversalMonitor() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newGame, setNewGame] = useState({ appid: '', name: '', sources: ['steam', 'xiaoheihe'] });
  const [message, setMessage] = useState('');

  useEffect(() => { fetchGames(); }, []);

  const fetchGames = async () => {
    const res = await fetch('/api/games');
    const data = await res.json();
    if (data.success) {
      setGames(data.games);
      if (data.games.length > 0 && !selectedGame) {
        setSelectedGame(data.games[0]);
        fetchReport(data.games[0]._id || data.games[0].appid);
      }
    }
  };

  const fetchReport = async (gameId) => {
    if (!gameId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analyze?gameId=${gameId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
        setMessage(`✅ 已分析 ${data.totalContents} 条数据`);
      }
    } catch (err) {
      setMessage('❌ 分析失败');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const addGame = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newGame,
        appid: parseInt(newGame.appid),
        sources: newGame.sources.map(s => ({ type: s, enabled: true, config: { appid: parseInt(newGame.appid) } }))
      })
    });
    if (res.ok) {
      setMessage('✅ 添加成功');
      setNewGame({ appid: '', name: '', sources: ['steam', 'xiaoheihe'] });
      fetchGames();
    }
  };

  const toggleSource = (source) => {
    setNewGame(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source]
    }));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1e', color: '#fff', fontFamily: 'system-ui' }}>
      <Head><title>通用舆情监控 - Kimi AI</title></Head>

      <header style={{ padding: '30px', borderBottom: '1px solid #333', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0, background: 'linear-gradient(90deg, #00d4ff, #7b2cbf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌐 通用舆情监控平台
        </h1>
        <p style={{ color: '#888', marginTop: '10px' }}>多平台数据 + Kimi AI 智能分析</p>
      </header>

      {message && <div style={{ background: '#1a1a2e', padding: '15px', margin: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* 左侧：游戏列表 */}
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ marginBottom: '15px' }}>🎮 监控游戏</h2>
          
          {games.map(game => (
            <div
              key={game._id || game.appid}
              onClick={() => { setSelectedGame(game); fetchReport(game._id || game.appid); }}
              style={{
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedGame?._id === game._id ? '#2a2a4e' : '#0f0f1e',
                border: selectedGame?._id === game._id ? '1px solid #00d4ff' : '1px solid transparent'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{game.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#888' }}>ID: {game.appid}</div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                {game.sources?.map(s => (
                  <span key={s.type} style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#333', borderRadius: '4px' }}>
                    {PLATFORMS.find(p => p.key === s.type)?.icon}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* 添加游戏 */}
          <form onSubmit={addGame} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>+ 添加监控</h3>
            <input
              placeholder="AppID"
              value={newGame.appid}
              onChange={e => setNewGame({...newGame, appid: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#0f0f1e', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
            />
            <input
              placeholder="游戏名称"
              value={newGame.name}
              onChange={e => setNewGame({...newGame, name: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#0f0f1e', border: '1px solid #333', borderRadius: '6px', color: '#fff' }}
            />
            
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>选择数据源：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PLATFORMS.slice(0, 3).map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggleSource(p.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: newGame.sources.includes(p.key) ? p.color : '#333',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
            
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#00d4ff', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
              添加监控
            </button>
          </form>
        </div>

        {/* 右侧：AI 报告 */}
        <div>
          {selectedGame && report?.aiReport ? (
            <div>
              {/* 顶部操作栏 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{selectedGame.name}</h2>
                <button
                  onClick={() => fetchReport(selectedGame._id || selectedGame.appid)}
                  disabled={loading}
                  style={{ padding: '10px 20px', background: '#7b2cbf', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                >
                  {loading ? '🤖 Kimi 分析中...' : '🔄 重新分析'}
                </button>
              </div>

              {/* 平台数据概览 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                {report.fetchResults?.map(result => {
                  const platform = PLATFORMS.find(p => p.key === result.platform);
                  return (
                    <div key={result.platform} style={{ background: '#1a1a2e', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem' }}>{platform?.icon}</div>
                      <div style={{ fontWeight: 'bold', marginTop: '10px' }}>{platform?.name}</div>
                      <div style={{ fontSize: '1.5rem', color: result.success ? '#00d4ff' : '#f44336', marginTop: '5px' }}>
                        {result.count} 条
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {result.success ? '✅ 抓取成功' : '❌ 抓取失败'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kimi AI 分析结果 */}
              {report.aiReport.comprehensive && (
                <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '25px', marginBottom: '20px' }}>
                  {/* 总体评分 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        width: '100px', height: '100px', borderRadius: '50%', 
                        background: `conic-gradient(#00d4ff ${report.aiReport.comprehensive.score * 3.6}deg, #333 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                          {report.aiReport.comprehensive.score}
                        </div>
                      </div>
                      <div style={{ marginTop: '10px', color: '#888' }}>Kimi 舆情分</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'inline-block', 
                        padding: '8px 20px', 
                        borderRadius: '20px', 
                        background: report.aiReport.comprehensive.sentiment === 'positive' ? 'rgba(0, 212, 255, 0.2)' : 
                                   report.aiReport.comprehensive.sentiment === 'negative' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                        color: report.aiReport.comprehensive.sentiment === 'positive' ? '#00d4ff' : 
                               report.aiReport.comprehensive.sentiment === 'negative' ? '#f44336' : '#ff9800',
                        marginBottom: '15px'
                      }}>
                        {report.aiReport.comprehensive.sentiment === 'positive' ? '🟢 整体正面' : 
                         report.aiReport.comprehensive.sentiment === 'negative' ? '🔴 整体负面' : '🟡 褒贬不一'}
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#ddd' }}>{report.aiReport.comprehensive.overall}</p>
                    </div>
                  </div>

                  {/* AI 详细分析 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* 好评点 */}
                    {report.aiReport.comprehensive.common_praises?.length > 0 && (
                      <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #00d4ff' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#00d4ff' }}>👍 玩家认可</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {report.aiReport.comprehensive.common_praises.map((item, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 抱怨点 */}
                    {report.aiReport.comprehensive.common_complaints?.length > 0 && (
                      <div style={{ background: 'rgba(244, 67, 54, 0.1)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f44336' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#f44336' }}>👎 主要问题</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {report.aiReport.comprehensive.common_complaints.map((item, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 风险提示 */}
                  {report.aiReport.comprehensive.risks?.length > 0 && (
                    <div style={{ marginTop: '20px', background: 'rgba(255, 152, 0, 0.1)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#ff9800' }}>⚠️ 风险提示</h4>
                      {report.aiReport.comprehensive.risks.map((risk, i) => (
                        <div key={i} style={{ marginBottom: '8px' }}>
                          <strong>{risk.type}:</strong> {risk.description}
                          <span style={{ 
                            marginLeft: '10px', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem',
                            background: risk.severity === 'high' ? '#f44336' : risk.severity === 'medium' ? '#ff9800' : '#4caf50'
                          }}>
                            {risk.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 建议 */}
                  {report.aiReport.comprehensive.suggestions?.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#00d4ff' }}>💡 Kimi 建议</h4>
                      <ol style={{ margin: 0, paddingLeft: '20px' }}>
                        {report.aiReport.comprehensive.suggestions.map((s, i) => (
                          <li key={i} style={{ marginBottom: '8px', lineHeight: '1.6' }}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* 跨平台对比 */}
                  {report.aiReport.crossPlatform && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
                      <h4 style={{ margin: '0 0 10px 0' }}>📊 跨平台分析</h4>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ background: '#0f0f1e', padding: '10px 20px', borderRadius: '6px' }}>
                          <span style={{ color: '#888' }}>监控平台数: </span>
                          <strong>{report.aiReport.crossPlatform.platformCount}</strong>
                        </div>
                        <div style={{ background: '#0f0f1e', padding: '10px 20px', borderRadius: '6px' }}>
                          <span style={{ color: '#888' }}>数据一致性: </span>
                          <strong style={{ 
                            color: report.aiReport.crossPlatform.consistency === 'high' ? '#00d4ff' : 
                                   report.aiReport.crossPlatform.consistency === 'low' ? '#f44336' : '#ff9800'
                          }}>
                            {report.aiReport.crossPlatform.consistency === 'high' ? '高 ✅' : 
                             report.aiReport.crossPlatform.consistency === 'low' ? '低 ⚠️' : '中'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
              <p>选择游戏并点击"重新分析"，Kimi AI 将为你生成舆情报告</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
