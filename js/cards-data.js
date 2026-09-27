import { cardKnowledge } from './cards-knowledge.js?v=public-demo-v1';
// 22 Major Arcana - complete card data
export const majorArcana = [
  {
    id: 0, numeral: '0', name: '愚者', nameEn: 'The Fool',
    colors: { primary: '#E8C547', secondary: '#7CB342', bg: 'linear-gradient(135deg, #1a1a0a, #1a2410)' },
    svgPath: 'M60,25 Q65,15 70,25 L75,45 Q70,50 65,45 Z M55,50 L75,50 L70,90 L60,90 Z M50,90 L80,90 M45,95 Q65,85 85,95',
    element: 'air'
  },
  {
    id: 1, numeral: 'I', name: '魔术师', nameEn: 'The Magician',
    colors: { primary: '#E53935', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #1a0a0a, #1a1508)' },
    svgPath: 'M65,15 Q68,10 71,15 Q68,20 65,15 M55,25 L65,20 L75,25 M60,30 L70,30 M58,35 L72,35 L72,75 L58,75 Z M50,80 L80,80 L75,90 L55,90 Z',
    element: 'all'
  },
  {
    id: 2, numeral: 'II', name: '女祭司', nameEn: 'The High Priestess',
    colors: { primary: '#1565C0', secondary: '#B39DDB', bg: 'linear-gradient(135deg, #0a0e1a, #0d1525)' },
    svgPath: 'M60,20 Q65,15 70,20 Q65,25 60,20 M57,28 L73,28 L73,70 L57,70 Z M50,72 L80,72 L75,78 L55,78 Z M60,35 L70,35 M60,45 L70,45 M65,50 L65,65',
    element: 'water'
  },
  {
    id: 3, numeral: 'III', name: '女皇', nameEn: 'The Empress',
    colors: { primary: '#43A047', secondary: '#F48FB1', bg: 'linear-gradient(135deg, #0a1a0e, #1a0a14)' },
    svgPath: 'M65,18 Q60,22 55,18 Q60,14 65,18 M58,25 Q65,20 72,25 L72,55 Q65,60 58,55 Z M52,58 Q65,65 78,58 L75,90 Q65,95 55,90 Z',
    element: 'earth'
  },
  {
    id: 4, numeral: 'IV', name: '皇帝', nameEn: 'The Emperor',
    colors: { primary: '#D32F2F', secondary: '#FF8F00', bg: 'linear-gradient(135deg, #1a0808, #1a1008)' },
    svgPath: 'M55,20 L65,12 L75,20 L72,22 L65,16 L58,22 Z M58,25 L72,25 L72,55 L58,55 Z M55,58 L75,58 L78,65 L52,65 Z M60,68 L70,68 L70,90 L60,90 Z',
    element: 'fire'
  },
  {
    id: 5, numeral: 'V', name: '教皇', nameEn: 'The Hierophant',
    colors: { primary: '#6A1B9A', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #120a1a, #1a1508)' },
    svgPath: 'M60,15 L65,10 L70,15 M58,18 L72,18 L72,22 L58,22 Z M56,25 L74,25 L74,50 Q65,55 56,50 Z M60,55 L70,55 L70,85 L60,85 Z M55,88 L75,88',
    element: 'earth'
  },
  {
    id: 6, numeral: 'VI', name: '恋人', nameEn: 'The Lovers',
    colors: { primary: '#E91E63', secondary: '#FF8A80', bg: 'linear-gradient(135deg, #1a0a12, #1a1508)' },
    svgPath: 'M50,40 Q55,25 65,35 Q75,25 80,40 Q80,55 65,70 Q50,55 50,40 Z M65,15 L65,30 M55,20 L75,20',
    element: 'air'
  },
  {
    id: 7, numeral: 'VII', name: '战车', nameEn: 'The Chariot',
    colors: { primary: '#37474F', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #0e1215, #1a1508)' },
    svgPath: 'M55,20 L65,12 L75,20 Z M58,22 L72,22 L72,50 L58,50 Z M50,55 L80,55 L82,65 L48,65 Z M52,68 L58,68 L58,85 L52,85 Z M72,68 L78,68 L78,85 L72,85 Z',
    element: 'water'
  },
  {
    id: 8, numeral: 'VIII', name: '力量', nameEn: 'Strength',
    colors: { primary: '#F57F17', secondary: '#E65100', bg: 'linear-gradient(135deg, #1a1508, #1a0e0a)' },
    svgPath: 'M50,50 Q55,35 65,30 Q75,35 80,50 Q75,65 65,70 Q55,65 50,50 Z M55,45 Q60,40 65,42 Q60,48 55,45 M70,45 Q75,42 78,48 M58,55 Q65,62 72,55',
    element: 'fire'
  },
  {
    id: 9, numeral: 'IX', name: '隐士', nameEn: 'The Hermit',
    colors: { primary: '#4E342E', secondary: '#FDD835', bg: 'linear-gradient(135deg, #15120e, #1a1808)' },
    svgPath: 'M60,18 L65,12 L70,18 L67,18 L67,25 L63,25 L63,18 Z M58,28 Q65,22 72,28 L70,65 Q65,68 60,65 Z M55,70 L75,70 L72,90 L58,90 Z',
    element: 'earth'
  },
  {
    id: 10, numeral: 'X', name: '命运之轮', nameEn: 'Wheel of Fortune',
    colors: { primary: '#7B1FA2', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #120a1a, #1a1508)' },
    svgPath: 'M65,50 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0 M65,50 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0 M65,20 L65,30 M65,70 L65,80 M35,50 L45,50 M85,50 L95,50',
    element: 'fire'
  },
  {
    id: 11, numeral: 'XI', name: '正义', nameEn: 'Justice',
    colors: { primary: '#1565C0', secondary: '#F9A825', bg: 'linear-gradient(135deg, #0a1220, #1a1508)' },
    svgPath: 'M65,18 L65,60 M50,30 L80,30 M45,35 Q50,45 50,35 M80,35 Q85,45 85,35 M55,65 L75,65 L72,90 L58,90 Z',
    element: 'air'
  },
  {
    id: 12, numeral: 'XII', name: '倒吊人', nameEn: 'The Hanged Man',
    colors: { primary: '#00838F', secondary: '#B39DDB', bg: 'linear-gradient(135deg, #0a1518, #0e0d15)' },
    svgPath: 'M55,20 L75,20 M65,20 L65,45 M55,45 L60,55 L70,55 L75,45 M60,58 Q65,52 70,58 Q65,64 60,58 M65,64 L65,80 M58,80 L65,90 L72,80',
    element: 'water'
  },
  {
    id: 13, numeral: 'XIII', name: '死神', nameEn: 'Death',
    colors: { primary: '#212121', secondary: '#E0E0E0', bg: 'linear-gradient(135deg, #0a0e12, #15191e)' },
    svgPath: 'M60,20 Q65,15 70,20 Q72,25 70,30 Q65,35 60,30 Q58,25 60,20 M62,22 L63,27 M67,22 L68,27 M62,28 L68,28 M58,35 L72,35 L70,70 L60,70 Z M55,72 L75,72 L72,90 L58,90 Z',
    element: 'water'
  },
  {
    id: 14, numeral: 'XIV', name: '节制', nameEn: 'Temperance',
    colors: { primary: '#00897B', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #0a1510, #1a1508)' },
    svgPath: 'M65,18 Q60,22 55,18 Q60,14 65,18 M58,25 L72,25 L72,45 L58,45 Z M50,35 L55,30 M80,35 L75,30 M50,35 L50,55 M80,35 L80,55 M55,50 Q65,60 75,50 M58,65 L72,65 L70,90 L60,90 Z',
    element: 'fire'
  },
  {
    id: 15, numeral: 'XV', name: '恶魔', nameEn: 'The Devil',
    colors: { primary: '#4A148C', secondary: '#F44336', bg: 'linear-gradient(135deg, #1A0033, #311B45)' },
    svgPath: 'M55,18 L60,10 L65,18 L70,10 L75,18 M58,22 L72,22 L75,50 L55,50 Z M50,55 L65,50 L80,55 M55,58 L60,58 L60,85 L55,85 Z M70,58 L75,58 L75,85 L70,85 Z M60,78 Q65,82 70,78',
    element: 'earth'
  },
  {
    id: 16, numeral: 'XVI', name: '塔', nameEn: 'The Tower',
    colors: { primary: '#BF360C', secondary: '#FFD600', bg: 'linear-gradient(135deg, #1A0A00, #3E2723)' },
    svgPath: 'M58,90 L58,25 Q65,15 72,25 L72,90 Z M55,25 L75,25 M55,22 L65,10 L75,22 M50,35 L55,35 M75,35 L80,35 M48,50 L55,48 M75,48 L82,50 M60,40 L70,40 M60,55 L70,55 M60,70 L70,70',
    element: 'fire'
  },
  {
    id: 17, numeral: 'XVII', name: '星星', nameEn: 'The Star',
    colors: { primary: '#1565C0', secondary: '#FDD835', bg: 'linear-gradient(135deg, #0D1B2A, #1B3A5C)' },
    svgPath: 'M65,20 L67,28 L75,28 L69,33 L71,42 L65,37 L59,42 L61,33 L55,28 L63,28 Z M50,50 L53,54 L50,58 M80,45 L83,49 L80,53 M45,70 L48,74 L45,78 M85,65 L88,69 L85,73',
    element: 'air'
  },
  {
    id: 18, numeral: 'XVIII', name: '月亮', nameEn: 'The Moon',
    colors: { primary: '#283593', secondary: '#C5CAE9', bg: 'linear-gradient(135deg, #0A0E2A, #1A237E)' },
    svgPath: 'M55,30 Q55,15 70,15 Q60,20 60,30 Q60,40 70,45 Q55,45 55,30 Z M45,65 Q50,58 55,65 Q50,72 45,65 M75,65 Q80,58 85,65 Q80,72 75,65 M50,80 Q65,70 80,80 Q65,90 50,80',
    element: 'water'
  },
  {
    id: 19, numeral: 'XIX', name: '太阳', nameEn: 'The Sun',
    colors: { primary: '#FF8F00', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #1a1508, #1a1200)' },
    svgPath: 'M65,45 m-18,0 a18,18 0 1,0 36,0 a18,18 0 1,0 -36,0 M65,18 L65,24 M65,66 L65,72 M38,45 L44,45 M86,45 L92,45 M46,26 L50,30 M80,60 L84,64 M46,64 L50,60 M80,30 L84,26',
    element: 'fire'
  },
  {
    id: 20, numeral: 'XX', name: '审判', nameEn: 'Judgement',
    colors: { primary: '#C62828', secondary: '#FFD54F', bg: 'linear-gradient(135deg, #1a0a0a, #0a1220)' },
    svgPath: 'M60,15 L65,10 L70,15 L68,15 L68,35 L62,35 L62,15 Z M55,38 L75,38 Q78,42 75,46 L55,46 Q52,42 55,38 Z M58,50 L72,50 L72,70 L58,70 Z M50,75 L65,70 L80,75 L75,90 L55,90 Z',
    element: 'fire'
  },
  {
    id: 21, numeral: 'XXI', name: '世界', nameEn: 'The World',
    colors: { primary: '#2E7D32', secondary: '#7B1FA2', bg: 'linear-gradient(135deg, #0a1a0e, #120a1a)' },
    svgPath: 'M65,50 m-28,0 a28,35 0 1,0 56,0 a28,35 0 1,0 -56,0 M65,50 m-15,0 a15,20 0 1,0 30,0 a15,20 0 1,0 -30,0 M45,25 L50,30 M85,25 L80,30 M45,75 L50,70 M85,75 L80,70',
    element: 'earth'
  }
];

// Public showcase meanings use the concise demonstration corpus in this repository.
for (const card of majorArcana) {
  const knowledge = cardKnowledge[card.id];
  card.upright = knowledge.keywords;
  card.reversed = knowledge.keywords;
  card.uprightDesc = knowledge.upright.general;
  card.reversedDesc = knowledge.reversed.general;
  card.knowledge = knowledge;
}
