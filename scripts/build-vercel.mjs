import fs from 'node:fs/promises';
for(const name of ['public/index.html','public/app.js','data/toilets.json','server/runtime.mjs'])await fs.access(name);
console.log('Vercel frontend and serverless API source validated.');
