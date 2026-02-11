# 🚀 通用舆情监控平台 - 部署指南

## 快速部署（10 分钟）

### 第 1 步：获取 Kimi API Key（2 分钟）

1. 访问 https://platform.moonshot.cn/
2. 注册/登录账号
3. 点击 **"API Key 管理"**
4. 创建新 Key，复制保存（格式：`sk-xxxxxxxx`）

### 第 2 步：上传代码到 GitHub

**文件列表：**
```
universal_monitor/
├── package.json
├── vercel.json
├── .env.local.example
├── README.md
├── lib/
│   ├── mongodb.js
│   ├── fetcher.js      ← 多平台抓取
│   └── kimi.js         ← AI 分析
├── pages/
│   ├── index.js        ← 前端界面
│   └── api/
│       ├── games.js
│       └── analyze.js  ← 核心分析 API
```

**上传方式：**
1. 打开 https://github.com/hddy2000/steam_reviews
2. 删除旧文件（除了 .git）
3. 上传 `universal_monitor` 里的所有文件到根目录
4. Commit

### 第 3 步：部署到 Vercel（3 分钟）

1. 访问 https://vercel.com/new
2. 选择你的 GitHub 仓库
3. 点击 **Import**
4. **配置环境变量**（关键！）：
   ```
   Name: MONGODB_URI
   Value: mongodb+srv://hddy2000:hd9049yi@cluster0.anrajtg.mongodb.net/universal_monitor?retryWrites=true&w=majority
   
   Name: KIMI_API_KEY
   Value: sk-your-kimi-api-key-here
   ```
5. 点击 **Deploy**

### 第 4 步：验证部署

1. 等待部署完成（1-2 分钟）
2. 访问网站链接
3. 添加第一个游戏测试：
   - AppID: `1991040`
   - 名称: `学生时代`
   - 数据源: Steam + 小黑盒
4. 点击 **"🔄 重新分析"**
5. 等待 10-30 秒，看 AI 报告生成

---

## ⚠️ 常见问题

### 1. Kimi API 报错
- 检查 `KIMI_API_KEY` 是否正确
- 检查 API Key 是否还有余额

### 2. 小黑盒抓取失败
- 小黑盒反爬较严，有时会失败
- 失败时会自动跳过，不影响其他平台

### 3. B站抓取失败
- 需要提供 BV 号（如 `BV1xx411c7mD`）
- 或提供搜索关键词

### 4. 数据没更新
- 点击 **"🔄 重新分析"** 手动触发
- 每天自动更新（UTC 9:00）

---

## 🎉 部署完成！

现在你有：
- ✅ 多平台数据监控（Steam、小黑盒、B站）
- ✅ Kimi AI 智能分析
- ✅ 统一的舆情报告
- ✅ 跨平台对比分析

**把链接发给我，我帮你测试一下！** 🐾
