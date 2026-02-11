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
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (data.success) {
        setGames(data.games);
        if (data.games.length > 0 && !selectedGame) {
          setSelectedGame(data.games[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    }
  };

  const fetchReport = async (gameId) => {
    if (!gameId) return;
    setLoading(true);
    setMessage('🤖 Kimi 正在分析，请稍候...');
    try {
      const res = await fetch(`/api/analyze?gameId=${gameId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
        setMessage(`✅ 分析完成！共 ${data.totalContents || 0} 条数据`);
      } else {
        setMessage('❌ 分析失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      setMessage('❌ 网络错误: ' + err.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const addGame = async (e) => {
    e.preventDefault();
    if (!newGame.appid || !newGame.name) {
      setMessage('❌ 请填写 AppID 和游戏名称');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGame,
          appid: parseInt(newGame.appid),
          sources: newGame.sources.map(s => ({ type: s, enabled: true, config: { appid: parseInt(newGame.appid) } }))
        })
      });
      
      const data = await res.json();
      
      if (res.status === 409) {
        // 游戏已存在，选中它
        setMessage('⚠️ 游戏已存在，自动选中');
        const existingGame = games.find(g => g.appid === parseInt(newGame.appid));
        if (existingGame) {
          setSelectedGame(existingGame);
          fetchReport(existingGame._id || existingGame.appid);
        }
      } else if (res.ok) {
        setMessage('✅ 添加成功');
        setNewGame({ appid: '', name: '', sources: ['steam', 'xiaoheihe'] });
        fetchGames();
      } else {
        setMessage('❌ ' + (data.error || '添加失败'));
      }
    } catch (err) {
      setMessage('❌ 网络错误: ' + err.message);
    }
    
    setTimeout(() => setMessage(''), 5000);
  };

  const deleteGame = async (appid) => {
    if (!confirm('确定要删除这个游戏吗？')) return;
    try {
      const res = await fetch(`/api/games?id=${appid}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('✅ 已删除');
        fetchGames();
        if (selectedGame?.appid === appid) {
          setSelectedGame(null);
          setReport(null);
        }
      }
    } catch (err) {
      setMessage('❌ 删除失败');
    }
    setTimeout(() => setMessage(''), 3000);
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
          <h2 style={{ marginBottom: '15px' }}>🎮 监控游戏 ({games.length})</h2>
          
          {games.map(game => (
            <div
              key={game._id || game.appid}
              onClick={() => setSelectedGame(game)}
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
              <button
                onClick={(e) => { e.stopPropagation(); deleteGame(game.appid); }}
                style={{ marginTop: '8px', padding: '4px 12px', background: '#f44336', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                删除
              </button>
            </div>
          ))}

          {games.length < 10 && (
            <form onSubmit={addGame} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>+ 添加监控</h3>
              <input
                placeholder="AppID (如: 1991040)"
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
          )}
        </div>

        {/* 右侧：AI 报告 */}
        <div>
          {selectedGame ? (
            <>
              {/* 操作栏 - 始终显示 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', background: '#1a1a2e', borderRadius: '12px' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedGame.name}</h2>
                  <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>
                    AppID: {selectedGame.appid} | 
                    数据源: {selectedGame.sources?.map(s => PLATFORMS.find(p => p.key === s.type)?.name).join(', ') || 'Steam, 小黑盒'}
                  </div>
                </div>
                <button
                  onClick={() => fetchReport(selectedGame._id || selectedGame.appid)}
                  disabled={loading}
                  style={{ 
                    padding: '12px 30px', 
                    background: loading ? '#333' : '#00d4ff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    color: loading ? '#888' : '#000', 
                    fontWeight: 'bold', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {loading ? '⏳ Kimi 分析中...' : '🔄 立即分析'}
                </button>
              </div>

              {/* 报告内容 */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
                  <p>Kimi 正在分析多平台数据...</p>
                  <p style={{ fontSize: '0.85rem' }}>这可能需要 10-30 秒</p>
                </div>
              )}

              {!loading && report?.aiReport ? (
                <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '25px' }}>
                  {/* 平台数据 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    {report.fetchResults?.map(result => {
                      const platform = PLATFORMS.find(p => p.key === result.platform);
                      return (
                        <div key={result.platform} style={{ background: '#0f0f1e', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '2rem' }}>{platform?.icon}</div>
                          <div style={{ fontWeight: 'bold', marginTop: '10px' }}>{platform?.name}</div>
                          <div style={{ fontSize: '1.5rem', color: result.success ? '#00d4ff' : '#f44336', marginTop: '5px' }}>
                            {result.count} 条
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#888' }}>
                            {result.success ? '✅ 成功' : '❌ 失败'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI 分析结果 */}
                  {report.aiReport.comprehensive && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px', padding: '20px', background: '#0f0f1e', borderRadius: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#00d4ff' }}>
                            {report.aiReport.comprehensive.score}
                          </div>
                          <div style={{ color: '#888' }}>舆情分</div>
                        </div>
                        <div>
                          <div style={{ 
                            display: 'inline-block', 
                            padding: '8px 20px', 
                            borderRadius: '20px', 
                            background: report.aiReport.comprehensive.sentiment === 'positive' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                            color: report.aiReport.comprehensive.sentiment === 'positive' ? '#00d4ff' : '#ff9800',
                            marginBottom: '10px'
                          }}>
                            {report.aiReport.comprehensive.label || (report.aiReport.comprehensive.sentiment === 'positive' ? '正面' : '中性')}
                          </div>
                          <p style={{ margin: 0, lineHeight: '1.6' }}>{report.aiReport.comprehensive.overall}</p>
                        </div>
                      </div>

                      {/* 关键词 */}
                      {report.aiReport.keywords?.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ marginBottom: '10px' }}>🔥 热议关键词</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {report.aiReport.keywords.slice(0, 10).map((kw, idx) => (
                              <span key={idx} style={{ background: 'rgba(0, 212, 255, 0.2)', padding: '6px 12px', borderRadius: '20px' }}>
                                {kw.word} ({kw.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 建议 */}
                      {report.aiReport.comprehensive.suggestions?.length > 0 && (
                        <div>
                          <h4 style={{ marginBottom: '10px' }}>💡 Kimi 建议</h4>
                          <ol style={{ margin: 0, paddingLeft: '20px' }}>
                            {report.aiReport.comprehensive.suggestions.map((s, i) => (
                              <li key={i} style={{ marginBottom: '8px' }}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : !loading && (
                <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888', background: '#1a1a2e', borderRadius: '12px' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🤖</div>
                  <h3>还没有分析报告</h3>
                  <p>点击上方的"🔄 立即分析"按钮，Kimi AI 将为你生成多平台舆情报告</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#888', background: '#1a1a2e', borderRadius: '12px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎮</div>
              <h3>请从左侧选择一款游戏</h3>
              <p>或添加新游戏开始监控</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
