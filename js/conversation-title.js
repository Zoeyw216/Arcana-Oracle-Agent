// Temporary local titles; contextual summaries belong to the future Agent.
const shortTitle = text => Array.from(text.trim().replace(/\s+/g, ' ')).slice(0, 24).join('');
function isTopic(text) {
  const value = text.trim().replace(/[!！?？。.,，~～\s]/g, '');
  return value.length >= 4 && !/^(hi|hello|hey|你好|您好|嗨|哈喽|谢谢|谢谢你|好的|可以|开始抽牌|抽牌|再抽一张|补牌|继续)$/i.test(value);
}
export function updateConversationTitle(session) {
  const userMessages = session.messages.filter(message => message.role === 'user');
  if (!session.titleMode) {
    const legacyDefault = userMessages[0] ? shortTitle(userMessages[0].text) : '未发送的草稿';
    session.titleMode = session.title === legacyDefault || session.title === '新的对话' ? 'auto' : 'manual';
  }
  if (session.titleMode === 'manual') return;
  const topic = userMessages.find(message => isTopic(message.text));
  session.title = topic ? shortTitle(topic.text) : userMessages.length ? '新的对话' : '未发送的草稿';
}
