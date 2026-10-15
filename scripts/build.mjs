import {cpSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
const url=process.env.OBI_SUPABASE_URL||'https://qfllthjpjuaztppvpsrk.supabase.co', key=process.env.OBI_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_IiHzG1Jn2je075uuYVHTAg_dBVAAUf5';
if(/service_role/.test(key)) throw new Error('No uses service_role en el frontend');
if(process.argv.includes('--check')){ readFileSync('src/app.js','utf8'); console.log('ok'); process.exit(0); }
rmSync('dist',{recursive:true,force:true}); mkdirSync('dist');
cpSync('src','dist',{recursive:true}); cpSync('public','dist',{recursive:true});
writeFileSync('dist/config.js','window.OBI_CONFIG='+JSON.stringify({url,key,build:new Date().toISOString()})+';');
console.log('dist listo');