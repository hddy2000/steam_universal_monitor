// 简单的密码保护中间件
// 在 pages/_app.js 或特定页面使用

import { useState, useEffect } from 'react';

export function withPasswordProtection(Component) {
  return function ProtectedPage(props) {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    
    // 从环境变量读取密码
    const correctPassword = process.env.NEXT_PUBLIC_SITE_PASSWORD || '123456';
    
    useEffect(() => {
      // 检查本地存储
      const saved = localStorage.getItem('site_auth');
      if (saved === correctPassword) {
        setAuthenticated(true);
      }
    }, []);
    
    const handleSubmit = (e) => {
      e.preventDefault();
      if (password === correctPassword) {
        localStorage.setItem('site_auth', password);
        setAuthenticated(true);
      } else {
        alert('密码错误');
      }
    };
    
    if (!authenticated) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff'
        }}>
          <form onSubmit={handleSubmit} style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '20px' }}>🔒 Steam 评论监控</h2>
            <p style={{ marginBottom: '20px', color: '#888' }}>请输入访问密码</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                marginBottom: '15px',
                width: '200px'
              }}
            />
            <br />
            <button type="submit" style={{
              padding: '12px 30px',
              background: '#4a9eff',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer'
            }}>
              进入
            </button>
          </form>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}
