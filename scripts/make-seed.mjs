import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('data/toilets.json','utf8'));
const q=value=>value==null?'null':`'${String(value).replaceAll("'","''")}'`;
const chunks=[];
for(let i=0;i<data.rows.length;i+=250){const values=data.rows.slice(i,i+250).map(t=>`(${q(t.id)},${q(t.name)},${t.lat},${t.lng},${q(t.address||'')},${q(t.hours||'')},${q(t.type||'')},${q(data.retrievedAt)})`).join(',\n');chunks.push(`insert into public.toilets (id,name,lat,lng,address,hours,type,retrieved_at) values\n${values}\non conflict (id) do update set name=excluded.name,lat=excluded.lat,lng=excluded.lng,address=excluded.address,hours=excluded.hours,type=excluded.type,retrieved_at=excluded.retrieved_at;`);}
await fs.writeFile('supabase/seed.sql',`-- Generated from data/toilets.json. Safe to rerun.\n${chunks.join('\n\n')}\n`);
console.log(`Generated ${data.rows.length} rows in ${chunks.length} batches.`);
