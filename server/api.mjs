import { ranked, routeUrl } from '../public/geo.mjs';
import { interpretQuery } from './groq.mjs';

const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Public dataset only; exact user coordinates are never written to storage or logs.
export async function handleApi(request,dataset,interpret=interpretQuery){
 const {pathname}=new URL(request.url);
 if(pathname==='/api/health')return request.method==='GET'?json({status:'ok',records:dataset.rows.length}):json({error:'GET 요청만 지원합니다.'},405);
 if(pathname==='/api/toilets')return request.method==='GET'?json(dataset):json({error:'GET 요청만 지원합니다.'},405);
 if(!['/api/nearest','/api/search','/api/chat'].includes(pathname))return json({error:'API를 찾을 수 없습니다.'},404);
 if(request.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON 형식으로 요청해 주세요.'},415);
 let input;
 try{const reader=request.body?.getReader();if(!reader)throw Error();const chunks=[];let length=0;while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>8192){await reader.cancel();return json({error:'요청이 너무 큽니다.'},413);}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}input=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'올바른 JSON 요청이 필요합니다.'},400);}
 const {lat,lng}=input??{};
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat > 90||lng < -180||lng > 180)return json({error:'유효한 위도와 경도가 필요합니다.'},400);
 let candidates=dataset.rows,filters=null;
 if(pathname==='/api/search'||pathname==='/api/chat'){
  const messages=pathname==='/api/chat'?input.messages:[{role:'user',content:input.query}];
  if(!Array.isArray(messages)||!messages.length||messages.length>8||messages.some(m=>!['user','assistant'].includes(m?.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>300))return json({error:'대화 내용을 확인해 주세요.'},400);
  try{filters=await interpret(messages);}catch(e){return json({error:e.message==='AI_NOT_CONFIGURED'?'대화 기능 연결 설정이 필요합니다. 기본 가까운 화장실 찾기는 이용할 수 있어요.':e.message==='AI_RATE_LIMIT'?'요청이 많습니다. 잠시 후 다시 말씀해 주세요.':'대화 처리에 실패했습니다. 잠시 후 다시 말씀해 주세요.'},503);}
  if(filters.search&&!filters.unsupported){const keyword=filters.keyword.replace(/24\s*시간|화장실|찾아주세요|알려주세요|찾아줘|알려줘|가능한|이용|가능|근처|가까운|곳/g,' ').replace(/\s+/g,' ').trim();filters={...filters,keyword};candidates=candidates.filter(t=>(!filters.open24h||t.hours.includes('24시간'))&&(!keyword||(t.name+' '+t.address).toLowerCase().includes(keyword.toLowerCase())));}
  else return json({rows:[],filters,searched:false,reply:filters.reply,retrievedAt:dataset.retrievedAt});
 }
 const origin={lat,lng};const nearest=ranked(candidates,origin).slice(0,6);
 const searchSummary=filters?.keyword?filters.open24h?`${filters.keyword}에서 24시간 운영으로 등록된 화장실을 찾아봤어요.`:`${filters.keyword} 주변 화장실을 찾아봤어요.`:filters?.open24h?'24시간 운영으로 등록된 화장실을 찾아봤어요.':'가까운 화장실을 찾아봤어요.';
 const reply=filters?nearest.length?`${searchSummary} 가까운 순으로 ${nearest.length}곳을 보여드릴게요.`:`${searchSummary} 조건에 맞는 화장실은 찾지 못했어요.`:undefined;
 return json({coverage:!!nearest.length&&nearest[0].distance<=10000,rows:nearest.map(t=>({...t,routeUrl:routeUrl(origin,t)})),filters,searched:!!filters,reply,distanceMethod:'straight-line',retrievedAt:dataset.retrievedAt});
}
