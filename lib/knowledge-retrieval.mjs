export const TOPICS = ['love', 'career', 'spiritual'];
const LABELS = { general:'通用', love:'爱情', career:'事业', spiritual:'精神' };
export function validateRequest(body) {
  if (!body || !Array.isArray(body.cards) || !body.cards.length || body.cards.length > 22) throw new Error('请提供实际牌面 cards，每张包含 id 和 isReversed。');
  const ids=new Set();
  for (const card of body.cards) {
    if(!Number.isInteger(card.id)||card.id<0||card.id>21||typeof card.isReversed!=='boolean'||ids.has(card.id))throw new Error('牌面 ID、正逆位或重复牌无效。');
    ids.add(card.id);
  }
  if(body.topics!==undefined && (!Array.isArray(body.topics)||body.topics.some(t=>!TOPICS.includes(t))))throw new Error('topics 仅支持 love、career、spiritual。');
  if(body.semantic!==undefined && typeof body.semantic!=='boolean')throw new Error('semantic 必须是布尔值。');
  if(body.semantic && (typeof body.query!=='string'||!body.query.trim()||body.query.length>4000))throw new Error('语义补充需要有效 query。');
}
export function retrieveExact(knowledge, cards, topics = []) {
  const results=[];
  for (const selected of cards) {
    const card=knowledge.cards.find(c=>c.id===selected.id);
    if (!card) throw new Error('Knowledge card missing');
    const orientation=selected.isReversed?'reversed':'upright';
    // Unknown category: retain all subcategories in this orientation, never the opposite one.
    const sections=['general',...(topics.length?[...new Set(topics)]:TOPICS)];
    const entry=(id,topic,text)=>({chunk_id:`${card.id.toString().padStart(2,'0')}:${id}`,card_id:card.id,card_name:card.name,card_name_en:card.nameEn,position:selected.position??'',orientation,topic,text,source:card.source,version:knowledge.version,method:'exact'});
    results.push(entry('symbolism','牌面与象征',`核心关键词：${card.keywords}\n牌面：${card.symbolism}`));
    results.push(entry(orientation,selected.isReversed?'逆位牌义':'正位牌义',sections.map(t=>`${LABELS[t]}：${card[orientation][t]}`).join('\n')));
    results.push(entry('wisdom','智慧指引',card.wisdom));
  }
  return results;
}
export function cosine(a,b){
  if(a.length!==b.length||!a.length||!a.every(Number.isFinite)||!b.every(Number.isFinite))throw new Error('Invalid embedding dimensions');
  let dot=0,na=0,nb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
  if(!na||!nb)throw new Error('Zero embedding');
  return dot/Math.sqrt(na*nb);
}
export function retrieveSemantic(index, queryVector, cards, minimumScore=.45) {
  const allowed=new Map(cards.map(c=>[c.id,c.isReversed?'reversed':'upright']));
  return index.chunks.filter(c=>allowed.has(c.card_id)&&(c.orientation==='neutral'||c.orientation===allowed.get(c.card_id)))
    .map(c=>({...c,score:cosine(queryVector,c.embedding)})).filter(c=>c.score>=minimumScore)
    .sort((a,b)=>b.score-a.score).slice(0,4)
    .map(({embedding,embedding_text,...chunk})=>({...chunk,method:'semantic'}));
}
