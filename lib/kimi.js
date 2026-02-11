// Kimi AI API 集成
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * 调用 Kimi API 进行智能分析
 */
export async function analyzeWithKimi(contents, type = 'comprehensive') {
  const apiKey = process.env.KIMI_API_KEY;
  
  if (!apiKey) {
    console.warn('KIMI_API_KEY not set, using fallback analysis');
    return fallbackAnalysis(contents);
  }
  
  try {
    const prompt = buildPrompt(contents, type);
    
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content: `你是一位资深的游戏舆情分析师，擅长从玩家反馈中提取关键信息，识别风险点，并给出专业建议。
分析时要客观、全面，既关注正面评价，也不忽视负面声音。
输出格式要求结构清晰，便于阅读。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Kimi API error');
    }
    
    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // 尝试解析为结构化数据
    return parseKimiResponse(result);
    
  } catch (error) {
    console.error('Kimi API error:', error);
    // 失败时使用备用分析
    return fallbackAnalysis(contents);
  }
}

/**
 * 构建 Prompt
 */
function buildPrompt(contents, type) {
  // 统计各平台数据
  const platformStats = {};
  contents.forEach(c => {
    if (!platformStats[c.platform]) {
      platformStats[c.platform] = { count: 0, positive: 0, negative: 0 };
    }
    platformStats[c.platform].count++;
    if (c.rating >= 0.5) {
      platformStats[c.platform].positive++;
    } else {
      platformStats[c.platform].negative++;
    }
  });
  
  // 准备评论样本（每个平台取 5 条代表性的）
  const samples = [];
  Object.keys(platformStats).forEach(platform => {
    const platformContents = contents.filter(c => c.platform === platform);
    const highRated = platformContents.filter(c => c.rating >= 0.5).slice(0, 3);
    const lowRated = platformContents.filter(c => c.rating < 0.5).slice(0, 2);
    
    samples.push(`\n【${platform.toUpperCase()}】`);
    [...highRated, ...lowRated].forEach(c => {
      samples.push(`${c.rating >= 0.5 ? '👍' : '👎'} ${c.content.slice(0, 200)}${c.content.length > 200 ? '...' : ''}`);
    });
  });
  
  const prompts = {
    comprehensive: `请对以下多平台游戏舆情进行综合分析：

【数据概览】
总评论数：${contents.length} 条
${Object.entries(platformStats).map(([p, s]) => `- ${p}: ${s.count}条 (好评${s.positive}, 差评${s.negative})`).join('\n')}

【评论样本】
${samples.join('\n')}

请提供以下分析（用 JSON 格式返回）：
{
  "overall": "总体评价，50字以内",
  "sentiment": "整体情感倾向: positive/neutral/negative",
  "score": "舆情评分 0-100",
  "platforms": {
    "steam": { "sentiment": "该平台的评价特点", "key_issues": ["问题1", "问题2"] },
    "xiaoheihe": { "sentiment": "该平台的评价特点", "key_issues": [] },
    "bilibili": { "sentiment": "该平台的评价特点", "key_issues": [] }
  },
  "common_praises": ["大家普遍认可的点1", "点2"],
  "common_complaints": ["普遍抱怨的问题1", "问题2"],
  "unique_findings": ["跨平台对比发现的独特洞察"],
  "risks": ["风险点1", "风险点2"],
  "suggestions": ["给开发者的建议1", "建议2"]
}`,

    sentiment: `请分析以下评论的情感倾向：

${samples.slice(0, 10).join('\n')}

返回 JSON：
{
  "sentiment": "positive/neutral/negative",
  "confidence": 0.85,
  "score": 75,
  "key_emotions": ["满意", "失望"],
  "keywords": ["关键词1", "关键词2"]
}`,

    risk: `请识别以下评论中的风险点：

${samples.slice(0, 15).join('\n')}

返回 JSON：
{
  "risk_level": "low/medium/high/critical",
  "risks": [
    {"type": "技术问题/运营问题/口碑危机", "description": "具体描述", "severity": "high/medium/low"}
  ],
  "warning_signs": ["需要关注的信号1", "信号2"],
  "urgent_actions": ["紧急建议1", "建议2"]
}`,

    compare: `请对比不同平台的评价差异：

${samples.join('\n')}

分析各平台的评价特点和差异原因。`
  };
  
  return prompts[type] || prompts.comprehensive;
}

/**
 * 解析 Kimi 返回的结构化数据
 */
function parseKimiResponse(text) {
  try {
    // 尝试提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 如果没有 JSON，返回文本格式
    return {
      raw: text,
      overall: text.slice(0, 100),
      sentiment: 'neutral',
      score: 50
    };
  } catch (e) {
    return {
      raw: text,
      overall: text.slice(0, 100),
      sentiment: 'neutral',
      score: 50
    };
  }
}

/**
 * 备用分析（Kimi API 失败时使用）
 */
function fallbackAnalysis(contents) {
  const total = contents.length;
  const positive = contents.filter(c => c.rating >= 0.5).length;
  const negative = total - positive;
  const score = Math.round((positive / total) * 100);
  
  // 简单关键词统计
  const keywordCounts = {};
  const keywords = ['优化', 'BUG', '剧情', '画面', '操作', '价格', '肝', '氪'];
  
  contents.forEach(c => {
    keywords.forEach(kw => {
      if (c.content.includes(kw)) {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      }
    });
  });
  
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return {
    overall: score >= 70 ? '整体评价较好，玩家满意度较高' : 
             score >= 50 ? '评价褒贬不一，存在改进空间' : 
             '整体评价偏负面，需要重点关注',
    sentiment: score >= 70 ? 'positive' : score >= 50 ? 'neutral' : 'negative',
    score: score,
    platforms: {},
    common_praises: score >= 60 ? ['有一定玩家基础'] : [],
    common_complaints: score < 60 ? ['玩家满意度较低'] : [],
    unique_findings: [],
    risks: score < 50 ? [{ type: '口碑风险', description: '差评率较高', severity: 'high' }] : [],
    suggestions: ['持续收集玩家反馈', '关注核心问题'],
    keywords: topKeywords,
    _fallback: true  // 标记为备用分析
  };
}

/**
 * 生成跨平台对比报告
 */
export async function generateCrossPlatformReport(contentsByPlatform) {
  const allContents = Object.values(contentsByPlatform).flat();
  
  // 各平台独立分析
  const platformAnalyses = {};
  for (const [platform, contents] of Object.entries(contentsByPlatform)) {
    if (contents.length > 0) {
      platformAnalyses[platform] = await analyzeWithKimi(contents, 'sentiment');
    }
  }
  
  // 综合分析
  const comprehensive = await analyzeWithKimi(allContents, 'comprehensive');
  
  return {
    comprehensive,
    platforms: platformAnalyses,
    crossPlatform: {
      totalContents: allContents.length,
      platformCount: Object.keys(contentsByPlatform).length,
      consistency: calculateConsistency(platformAnalyses)
    }
  };
}

/**
 * 计算平台间一致性
 */
function calculateConsistency(analyses) {
  const sentiments = Object.values(analyses).map(a => a.sentiment);
  const allSame = sentiments.every(s => s === sentiments[0]);
  
  if (allSame) return 'high';
  if (sentiments.filter(s => s === 'positive').length > 0 && 
      sentiments.filter(s => s === 'negative').length > 0) {
    return 'low';  // 有正面也有负面
  }
  return 'medium';
}

export default { analyzeWithKimi, generateCrossPlatformReport };
