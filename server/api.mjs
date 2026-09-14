import { ranked, routeUrl } from '../public/geo.mjs';
import { interpretQuery } from './groq.mjs';

const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Public dataset only; exact user coordinates are never written to storage or logs.
export async function handleApi(request,dataset,interpret=interpretQuery){
 const {pathname}=new URL(request.url);
 if(pathname==='/api/health')return request.method==='GET'?json({status:'ok',records:dataset.rows.length}):json({error:'GET 요청만 지원합니다.'},405);
 if(pathname==='/api/toilets')return request.method==='GET'?json(dataset):json({error:'GET 요청만 지원합니다.'},405);
 if(!['/api/nearest','/api/search'].includes(pathname))return json({error:'API를 찾을 수 없습니다.'},404);
 if(request.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON 형식으로 요청해 주세요.'},415);
 let input;
 try{const reader=request.body?.getReader();if(!reader)throw Error();const chunks=[];let length=0;while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>2048){await reader.cancel();return json({error:'요청이 너무 큽니다.'},413);}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}input=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'올바른 JSON 요청이 필요합니다.'},400);}
 const {lat,lng}=input??{};
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat > 90||lng < -180||lng > 180)return json({error:'유효한 위도와 경도가 필요합니다.'},400);
 let candidates=dataset.rows,filters=null;
 if(pathname==='/api/search'){
  if(typeof input.query!=='string'||!input.query.trim()||input.query.length>200)return json({error:'검색 문장은 1~200자로 입력해 주세요.'},400);
  try{filters=await interpret(input.query.trim());}catch(e){return json({error:e.message==='AI_NOT_CONFIGURED'?'AI 검색 연결 설정이 필요합니다. 기본 가까운 화장실 찾기는 이용할 수 있어요.':e.message==='AI_RATE_LIMIT'?'AI 요청이 많습니다. 잠시 후 다시 시도해 주세요.':'AI 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'},503);}
  if(filters.unsupported)return json({error:'24시간 운영 여부 또는 장소 이름으로 검색해 주세요. 현재 영업 여부나 시설 상태는 확인할 수 없어요.'},422);
  candidates=candidates.filter(t=>(!filters.open24h||t.hours.includes('24시간'))&&(!filters.keyword||(t.name+' '+t.address).toLowerCase().includes(filters.keyword.toLowerCase())));
 }
 const origin={lat,lng};const nearest=ranked(candidates,origin).slice(0,6);
 return json({coverage:!!nearest.length&&nearest[0].distance<=10000,rows:nearest.map(t=>({...t,routeUrl:routeUrl(origin,t)})),filters,distanceMethod:'straight-line',retrievedAt:dataset.retrievedAt});
}
