import fs from 'node:fs/promises';
let cached=null,expires=0;
export async function getDataset(env=process.env,fetcher=fetch){
 const useLocal=env.DATA_SOURCE==='local'||(!env.VERCEL&&!env.SUPABASE_URL&&env.DATA_SOURCE!=='supabase');
 if(useLocal){const data=JSON.parse(await fs.readFile(new URL('../data/toilets.json',import.meta.url),'utf8'));return {...data,dataSource:'local'};}
 const base=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)throw new Error('DATABASE_NOT_CONFIGURED');
 const url=new URL(base);if(url.protocol!=='https:')throw new Error('DATABASE_NOT_CONFIGURED');
 if(cached&&Date.now()<expires)return cached;
 const fetchPage=async offset=>{const target=new URL('/rest/v1/toilets',url);target.searchParams.set('select','id,name,lat,lng,address,hours,type,retrieved_at');target.searchParams.set('order','id.asc');target.searchParams.set('offset',String(offset));target.searchParams.set('limit','1000');const response=await fetcher(target,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('DATABASE_UNAVAILABLE');const page=await response.json();if(!Array.isArray(page))throw new Error('DATABASE_UNAVAILABLE');return page;};
 const rows=[];let retrievedAt='';
 for(let start=0;start<20000;start+=5000){const pages=await Promise.all(Array.from({length:5},(_,index)=>fetchPage(start+index*1000)));for(const page of pages){for(const t of page){if(Number.isFinite(t.lat)&&Number.isFinite(t.lng)){const {retrieved_at,...row}=t;rows.push(row);if(retrieved_at>retrievedAt)retrievedAt=retrieved_at;}}}if(pages.some(page=>page.length<1000))break;}
 if(!rows.length)throw new Error('DATABASE_EMPTY');
 cached={rows,retrievedAt,dataSource:'supabase',source:'https://data.seoul.go.kr/dataList/OA-22586/S/1/datasetView.do'};expires=Date.now()+300000;return cached;
}
