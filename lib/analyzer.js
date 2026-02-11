// 简单情感分析
const POSITIVE_WORDS = ['推荐', '好玩', '不错', '喜欢', '值得', '满意', '棒', '优秀', '神作', '良心', '惊喜'];
const NEGATIVE_WORDS = ['垃圾', '烂', '失望', '差评', '坑', '恶心', '骗钱', '后悔', '无聊', '退款'];
const TOPIC_WORDS = ['优化', 'BUG', '剧情', '画面', '操作', '价格', '肝', '氪', '服务器'];

export function analyzeSentiment(text) {
  if (!text) return { label: 'neutral', score: 0 };
  
  let score = 0;
  POSITIVE_WORDS.forEach(w => { if (text.includes(w)) score += 0.5; });
  NEGATIVE_WORDS.forEach(w => { if (text.includes(w)) score -= 0.8; });
  
  return {
    label: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
    score: Math.max(-1, Math.min(1, score))
  };
}

export function extractTopics(text) {
  if (!text) return [];
  return TOPIC_WORDS.filter(word => text.includes(word));
}
