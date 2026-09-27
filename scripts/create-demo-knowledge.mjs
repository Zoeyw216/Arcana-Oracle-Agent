import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cards = [
  ['愚者','The Fool','开始、自由、探索'], ['魔术师','The Magician','行动、资源、创造'],
  ['女祭司','The High Priestess','直觉、静观、未知'], ['女皇','The Empress','滋养、丰盛、创造'],
  ['皇帝','The Emperor','结构、责任、边界'], ['教皇','The Hierophant','传统、学习、信念'],
  ['恋人','The Lovers','选择、关系、价值'], ['战车','The Chariot','方向、意志、推进'],
  ['力量','Strength','勇气、耐心、内在力量'], ['隐士','The Hermit','独处、反思、寻找'],
  ['命运之轮','Wheel of Fortune','变化、周期、机会'], ['正义','Justice','平衡、事实、责任'],
  ['倒吊人','The Hanged Man','暂停、换位、放下'], ['死神','Death','结束、转化、更新'],
  ['节制','Temperance','协调、节奏、整合'], ['恶魔','The Devil','执着、欲望、束缚'],
  ['塔','The Tower','冲击、揭示、重建'], ['星星','The Star','希望、疗愈、方向'],
  ['月亮','The Moon','不确定、情绪、想象'], ['太阳','The Sun','清晰、活力、成果'],
  ['审判','Judgement','觉醒、复盘、回应'], ['世界','The World','完成、整合、新阶段'],
];

const knowledge = {
  version: 'public-demo-v1',
  source: 'Original concise demonstration content for the public repository',
  cards: cards.map(([name, nameEn, keywords], id) => ({
    id, name, nameEn, keywords,
    symbolism: `${name}的公开示例牌面提示关注“${keywords}”之间的关系。生产版本会在这里提供更完整的图像象征资料。`,
    upright: {
      general: `${name}正位提示相关能量正在形成，可以辨认已有资源并采取合适行动。`,
      love: `${name}正位建议在关系中看见真实需要，并用清晰沟通推动连接。`,
      career: `${name}正位建议把象征主题转化为可执行的目标、节奏与下一步。`,
      spiritual: `${name}正位邀请你观察内在感受，并让选择与核心价值保持一致。`,
    },
    reversed: {
      general: `${name}逆位提示相关能量可能受阻、失衡或被忽略，需要先识别卡点。`,
      love: `${name}逆位建议留意关系中的误解、回避或边界问题，再决定如何回应。`,
      career: `${name}逆位建议检查资源、优先级和执行节奏，避免在信息不足时仓促推进。`,
      spiritual: `${name}逆位邀请你区分直觉与焦虑，给自己留出诚实反思的空间。`,
    },
    wisdom: `围绕“${keywords}”，此刻最值得被看见的事实是什么？你能采取的最小下一步是什么？`,
    source: 'public-demo',
  })),
};

const root = fileURLToPath(new URL('../', import.meta.url));
writeFileSync(new URL('../data/knowledge-v2.json', import.meta.url), `${JSON.stringify(knowledge, null, 2)}\n`);
const map = Object.fromEntries(knowledge.cards.map(card => [card.id, {
  keywords: card.keywords, symbolism: card.symbolism, wisdom: card.wisdom,
  upright: card.upright, reversed: card.reversed,
}]));
writeFileSync(new URL('../js/cards-knowledge.js', import.meta.url), `// Generated from the public demonstration corpus.\nexport const cardKnowledge = ${JSON.stringify(map, null, 2)};\n`);
console.log(`Generated ${knowledge.cards.length} public demonstration cards in ${root}`);
