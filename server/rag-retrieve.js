import { validateRequest, retrieveExact, retrieveSemantic } from '../lib/knowledge-retrieval.mjs';
export const config = { runtime: 'edge' };
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
export default async function handler(req) {
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  let body;
  try {body=await req.json();validateRequest(body);}catch(error){return json({error:error.message},400);}
  try {
    const base=new URL(req.url).origin;
    const source=await fetch(`${base}/data/knowledge-v2.json`);
    if(!source.ok)throw new Error('Knowledge unavailable');
    const knowledge=await source.json();
    const results=retrieveExact(knowledge,body.cards,body.topics);
    if(!body.semantic)return json({version:knowledge.version,results,semanticStatus:'not_requested'});
    // Exact evidence remains available even if the optional semantic service fails.
    try {
      const response=await fetch(`${base}/data/embeddings-v2.json`);
      if(!response.ok)throw new Error('Index unavailable');
      const index=await response.json();
      if(index.version!==knowledge.version||index.model!=='jina-embeddings-v3'||index.dimensions!==256||index.task!=='retrieval.passage'||index.chunks?.length!==88)throw new Error('Incompatible index');
      const apiKey=process.env.JINA_API_KEY;
      if(!apiKey)throw new Error('Missing key');
      const embedded=await fetch('https://api.jina.ai/v1/embeddings',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
        body:JSON.stringify({model:index.model,dimensions:index.dimensions,task:'retrieval.query',input:[body.query]}),signal:AbortSignal.timeout(15000)
      });
      if(!embedded.ok)throw new Error('Embedding failed');
      const vector=(await embedded.json()).data?.[0]?.embedding;
      if(!Array.isArray(vector)||vector.length!==index.dimensions)throw new Error('Invalid vector');
      const supplement=retrieveSemantic(index,vector,body.cards);
      // A matched orientation chunk expands its precise subcategory evidence; don't repeat it.
      for(const chunk of supplement){
        const existing=results.find(r=>r.chunk_id===chunk.chunk_id);
        if(existing && ['upright','reversed'].includes(chunk.section)) {
          existing.text=chunk.text;existing.method='exact+semantic';existing.score=chunk.score;
        }
      }
      return json({version:knowledge.version,results,semanticStatus:supplement.length?'complete':'no_relevant_match',semanticMatches:supplement.map(c=>({chunk_id:c.chunk_id,score:c.score}))});
    } catch {return json({version:knowledge.version,results,semanticStatus:'unavailable',warning:'语义补充暂不可用，已保留完整的精确检索资料。'});}
  } catch {return json({error:'新知识库暂不可用，请稍后重试。'},503);}
}
