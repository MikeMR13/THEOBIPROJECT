// Vistas públicas con la identidad visual de El Obi del Lector: Inicio, Catálogo y Ficha de serie.
// Géneros/etiquetas que el lector ocultó en Preferencias › Contenido.
const hidS = s => { const H = window.__obiUI?.hide; if (!H?.length) return false; const S = new Set(H.map(x => String(x).toLowerCase())); return [...(s.genres || []), ...(Array.isArray(s.tags) ? s.tags : [])].some(g => S.has(String(g).toLowerCase())); };
const CSS = `
.ui-wrap{display:grid;gap:56px}
.ui-h2{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 18px}.ui-h2 h2{margin:0;font-size:30px}.ui-h2 a{font-size:13px;font-weight:600}
.ui-lbl{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
.ui-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(200px,.7fr);gap:clamp(24px,5vw,64px);align-items:center;min-height:440px;padding:clamp(24px,4vw,48px);background:#14120d;border-top:6px solid var(--c,var(--gold));overflow:hidden}
.ui-hero::before{content:'';position:absolute;inset:0;background:var(--bg) center/cover;opacity:.16;filter:blur(18px) saturate(1.2);transform:scale(1.1)}
.ui-hero>*{position:relative}
.ui-hero h1{font-size:clamp(34px,5vw,60px);line-height:1.05;margin:10px 0 14px;text-wrap:balance}
.ui-hero p.syn{font-family:Literata,serif;font-size:17px;line-height:1.65;color:#e3dccb;max-width:60ch;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.ui-hero .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.ui-dots{position:absolute;left:clamp(24px,4vw,48px);bottom:18px;display:flex;gap:6px}.ui-dots button{width:26px;height:4px;border:none;background:#3d3628;cursor:pointer;padding:0}.ui-dots button.on{background:var(--gold)}
.ui-book{position:relative;aspect-ratio:3/4;width:100%;max-width:300px;justify-self:center;background:#1c1a14 center/cover;box-shadow:0 30px 60px rgba(0,0,0,.55),inset 6px 0 10px rgba(0,0,0,.35);transform:rotate(2deg);transition:transform .5s}
.ui-hero:hover .ui-book{transform:rotate(0) translateY(-6px)}
.ui-obi{position:absolute;left:0;right:0;bottom:16%;padding:10px 12px;background:var(--c,var(--gold));color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:15px;line-height:1.2;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.ui-obi small{display:block;font-family:'IBM Plex Mono',monospace;font-weight:400;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.ui-chips{display:flex;gap:6px;flex-wrap:wrap}.ui-chip{font-size:12px;font-weight:600;padding:4px 10px;border:1px solid #3d3628;color:#cfc6b0;background:none;cursor:pointer;font-family:inherit}.ui-chip.on{background:var(--gold);color:#0d0c0a;border-color:var(--gold)}
.ui-pill{font-family:'IBM Plex Mono',monospace;font-size:11px;padding:3px 8px;border:1px solid currentColor}
.ui-cont{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
.ui-ccard{display:grid;grid-template-columns:64px minmax(0,1fr);gap:14px;align-items:center;padding:12px;background:#16140f;color:var(--paper);text-decoration:none;border-left:4px solid var(--c,var(--gold));transition:background .2s}.ui-ccard:hover{background:#1c1a14;color:var(--paper)}
.ui-ccard .th{aspect-ratio:3/4;background:#1c1a14 center/cover}.ui-bar{height:4px;background:#2f2a20;margin-top:8px}.ui-bar i{display:block;height:100%;background:var(--c,var(--gold))}
.ui-upd{display:grid;gap:12px}
.ui-urow{display:grid;grid-template-columns:72px minmax(0,1fr);gap:18px;padding:14px 0;border-bottom:1px solid var(--line)}
.ui-urow .th{aspect-ratio:3/4;background:#1c1a14 center/cover;display:block}
.ui-urow h3{margin:0 0 8px;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:20px}.ui-urow h3 a{color:var(--paper);text-decoration:none}
.ui-urow ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}.ui-urow li{display:flex;justify-content:space-between;gap:12px;font-size:14px}.ui-urow li a{color:#e3dccb;text-decoration:none}.ui-urow li a:hover{color:var(--gold)}
.ui-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:28px 22px}
.ui-card{display:grid;gap:10px;color:var(--paper);text-decoration:none}
.ui-card .ui-book{max-width:none;transform:none}.ui-card:hover .ui-book{transform:translateY(-10px) rotate(-1deg)}.ui-card:hover{color:var(--paper)}
.ui-card h3{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px;line-height:1.25;text-wrap:pretty}
.ui-card .meta{font-size:12px;color:var(--mute);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ui-filters{display:grid;gap:12px;padding:18px;background:#14120d;border:1px solid var(--line);margin-bottom:28px}
.ui-filters input{max-width:420px}
.ui-sh{position:relative;display:grid;grid-template-columns:minmax(180px,260px) minmax(0,1fr);gap:clamp(24px,4vw,48px);padding:clamp(24px,4vw,44px);background:#14120d;border-top:6px solid var(--c,var(--gold));overflow:hidden}
.ui-sh::before{content:'';position:absolute;inset:0;background:var(--bg) center/cover;opacity:.12;filter:blur(22px)}.ui-sh>*{position:relative}
.ui-sh h1{font-size:clamp(30px,4.5vw,52px);line-height:1.08;margin:8px 0 6px}
.ui-sh .orig{font-family:'Shippori Mincho B1',serif;color:var(--mute);font-size:18px;margin:0 0 16px}
.ui-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.ui-facts div{display:grid;gap:2px}.ui-facts b{font-weight:600;font-size:14px}
.ui-syn{font-family:Literata,serif;font-size:17px;line-height:1.7;color:#e3dccb;max-width:68ch;white-space:pre-line}
.ui-vols{display:grid;gap:14px}
.ui-vol{display:grid;grid-template-columns:96px minmax(0,1fr);gap:20px;padding:16px;background:#16140f;border:1px solid var(--line)}
.ui-vol .th{aspect-ratio:3/4;background:#1c1a14 center/cover}
.ui-vol h3{margin:0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px}
.ui-chl{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:2px 18px}
.ui-chl a{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #221f18;color:#e3dccb;text-decoration:none;font-size:14px}.ui-chl a:hover{color:var(--gold)}.ui-chl a.read{color:#8c846f}.ui-chl a .n{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute);min-width:28px;padding-top:2px}
.ui-chl a.read .n::after{content:' ✓';color:#a9d18e}
@media(max-width:720px){.ui-hero,.ui-sh{grid-template-columns:1fr}.ui-hero .ui-book{max-width:200px;order:-1}.ui-sh .ui-book{max-width:200px}.ui-vol{grid-template-columns:64px minmax(0,1fr)}}
.ui-chip.out{border-color:#f59e7a;color:#f59e7a;text-decoration:line-through}
.ui-card{position:relative}.ui-st{position:absolute;top:10px;left:10px;z-index:2;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;padding:4px 8px;background:#0d0c0a;color:var(--paper);border:1px solid #3d3628;box-shadow:0 4px 10px rgba(0,0,0,.4)}.ui-st.new{background:var(--gold);color:#0d0c0a;border-color:var(--gold)}.ui-st.reading{border-color:#a9d18e;color:#a9d18e}
.ui-frow{display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center}.ui-frow .ui-lbl{min-width:84px}.ui-fbar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}.ui-tog{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:600;cursor:pointer}
.ui-card .last{font-size:12px;color:#cfc6b0}
.ui-obi{overflow-wrap:anywhere}.ui-obi.slim{bottom:8%;padding:5px 10px}.ui-obi.slim small{font-size:10px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ui-tog{white-space:nowrap}
.ui-fdet>summary{list-style:none;cursor:pointer;display:none;font-weight:700;font-size:14px;padding:10px 0;min-height:44px;align-items:center;gap:8px}.ui-fdet>summary::-webkit-details-marker{display:none}.ui-fdet:not([open])>summary{display:flex}.ui-fdet>summary b{background:var(--gold);color:#0d0c0a;font-size:12px;padding:1px 7px}.ui-fbody{display:grid;gap:12px}
@media(max-width:720px){.ui-fdet>summary{display:flex}.ui-fdet[open]>summary{border-bottom:1px solid var(--line);margin-bottom:10px}.ui-filters input{max-width:none;width:100%}}
.ui-empty{display:grid;gap:12px;padding:28px;border:1px dashed #3d3628;grid-column:1/-1}.ui-empty p{margin:0}
.ui-qv{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.6)}.ui-qv[hidden]{display:none}
.ui-qvc{position:relative;width:100%;max-width:760px;max-height:90vh;overflow:auto;display:grid;grid-template-columns:200px minmax(0,1fr);gap:26px;padding:26px;background:#14120d;border-top:6px solid var(--c,var(--gold));box-shadow:0 30px 70px rgba(0,0,0,.6)}
.ui-qvc .ui-book{transform:none;max-width:200px}.ui-qvc h2{margin:6px 0 4px;font-size:clamp(24px,3.5vw,34px);line-height:1.1;padding-right:44px}.ui-qvc .orig{font-family:'Shippori Mincho B1',serif;color:var(--mute);margin:0 0 12px}
.ui-qvc .syn{font-family:Literata,serif;font-size:16px;line-height:1.65;color:#e3dccb;margin:14px 0;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.ui-qvc .acts{display:flex;gap:10px;flex-wrap:wrap}.ui-qx{position:absolute;top:12px;right:12px;width:44px;height:44px;background:none;border:1px solid #3d3628;color:var(--paper);font-size:20px;cursor:pointer}
@media(max-width:720px){.ui-qv{align-items:flex-end;padding:0}.ui-qvc{grid-template-columns:96px minmax(0,1fr);gap:16px;padding:20px;max-height:85vh}.ui-qvc .syn{-webkit-line-clamp:5}}
.ui-cath{position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:0 0 30px;flex-wrap:wrap}.ui-cath h1{font-size:clamp(40px,6vw,64px);font-weight:400;margin:0 0 8px;line-height:1}.ui-cath p{color:#a89f8a;margin:0;font-size:15px}.ui-cath .kj{font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:clamp(48px,7vw,96px);line-height:1;color:transparent;-webkit-text-stroke:1px var(--gold);letter-spacing:.1em}
.ui-filters{background:#16140f;border-color:#2f2a20;margin-bottom:36px}.ui-fcols{display:flex;gap:18px 32px;flex-wrap:wrap}.ui-fcol{display:grid;gap:6px;align-content:start}.ui-fcol>.ui-lbl{color:#8c846f;letter-spacing:.1em}.ui-filters .ui-chips{gap:4px}.ui-filters .ui-chip{padding:6px 10px}
.ui-fend{display:flex;justify-content:space-between;align-items:center;gap:10px 18px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #2f2a20}.ui-fend .r{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.ui-fend .cnt{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--gold)}.ui-lnk{background:none;border:none;color:#cfc6b0;font:inherit;font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:0}.ui-tog{color:#cfc6b0;font-weight:400}
.ui-fich{display:flex;flex-direction:column;padding-top:8px}
.ui-fc{position:relative;display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:24px;padding:22px 20px;margin-top:-8px;background:#f3ecd9;color:#0d0c0a;background-image:repeating-linear-gradient(transparent 0 27px,#ddd2b8 27px 28px);border-top:6px solid var(--c,var(--gold));box-shadow:0 -6px 18px rgba(0,0,0,.45);text-decoration:none;transition:transform .3s cubic-bezier(.2,.8,.2,1);animation:obCard .6s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:var(--d,0s)}
.ui-fc:hover,.ui-fc:focus-visible{transform:translateY(-14px);color:#0d0c0a;z-index:2}.ui-fc:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.ui-fc .cv{aspect-ratio:3/4;background:#1c1a14 center/cover;border:2px solid #0d0c0a}.ui-fc .cv:not([style*=url]){background-image:repeating-linear-gradient(135deg,#1c1a14 0 8px,#24211a 8px 16px)}
.ui-fc .bd{display:flex;flex-direction:column;gap:8px;min-width:0}.ui-fc .t{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:24px;line-height:1.1;text-wrap:pretty}.ui-fc .o{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5a5244}
.ui-fc .sy{font-family:Literata,'Shippori Mincho B1',serif;font-size:15px;line-height:1.55;color:#2a261e;margin:0;max-width:70ch;text-wrap:pretty;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ui-fc .m{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;color:#0d0c0a}.ui-fc .m .x{color:#b3261e}
.ui-fc .side{display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:12px}.ui-fc .jp{font-family:'Shippori Mincho B1',serif;font-weight:700;font-size:14px;writing-mode:vertical-rl;letter-spacing:.2em;color:#5a5244}
.ui-seal{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:4px 7px;border:3px double #8a5f00;color:#8a5f00;transform:rotate(-6deg);white-space:nowrap}.ui-seal.new{border-color:#b3261e;color:#b3261e}.ui-seal.reading{border-color:#2e6b3a;color:#2e6b3a}
.ui-fich .ui-empty{border-color:#3d3628}
@media(max-width:640px){.ui-fc{grid-template-columns:72px minmax(0,1fr);gap:14px;padding:18px 14px}.ui-fc .side{grid-column:1/-1;flex-direction:row;justify-content:flex-start;align-items:center}.ui-fc .jp{writing-mode:horizontal-tb;letter-spacing:.1em}.ui-fc .t{font-size:20px}.ui-fc .sy{-webkit-line-clamp:2}.ui-cath .kj{display:none}}
@media(prefers-reduced-motion:reduce){.ui-fc{animation:none;transition:none}}
.ui-rbar{display:flex;gap:6px 18px;flex-wrap:wrap;align-items:center;margin-bottom:32px}.ui-rbar .ui-chip{padding:8px 14px;font-size:13px;border:2px solid var(--gold);color:var(--paper)}.ui-rbar .ui-chip.on{color:#0d0c0a}
.ui-rday{display:flex;align-items:baseline;gap:10px;margin:36px 0 14px;font-size:26px;font-weight:400}.ui-rday:first-of-type{margin-top:0}.ui-rday span{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}
.ui-rlist{display:flex;flex-direction:column;gap:14px}
.ui-rl{display:grid;grid-template-columns:84px minmax(0,1fr);gap:20px;padding:18px;background:#16140f;border:2px solid #2f2a20;border-top:4px solid var(--c,var(--gold));animation:obCard .6s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:var(--d,0s)}
.ui-rl .cv{aspect-ratio:3/4;background:var(--c) center/cover;box-shadow:inset -6px 0 10px rgba(0,0,0,.3)}.ui-rl .bd{display:flex;flex-direction:column;gap:8px;min-width:0}
.ui-rl .t{font-family:'Shippori Mincho B1',serif;font-size:22px;line-height:1.15;color:var(--paper);text-decoration:none}.ui-rl .t:hover{color:var(--c)}.ui-rl .mt{font-size:13px;color:#a89f8a}.ui-rl .mt b{color:var(--c);font-weight:600}
.ui-rl .its{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.ui-rl .it{position:relative;display:grid;gap:2px;padding:8px 12px;min-height:44px;background:#0d0c0a;border:1px solid #3d3628;color:var(--paper);text-decoration:none;transition:border-color .2s}.ui-rl .it:hover{border-color:var(--c);color:var(--paper)}
.ui-rl .it b{font-size:13px}.ui-rl .it small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}.ui-rl .it.read b{color:#8c846f}.ui-rl .it.read b::after{content:' ✓';color:#a9d18e}
.ui-rl .it.new::before{content:'';position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 2px #16140f}.ui-rl .it.vol{border-color:var(--c)}
.ui-more{margin:28px auto 0;display:block}
.ui-rlist.dense{gap:6px}.ui-rc{display:grid;grid-template-columns:4px minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:8px 14px 8px 0;min-height:56px;background:#16140f;border:1px solid #2f2a20}.ui-rc::before{content:'';align-self:stretch;background:var(--c,var(--gold))}
.ui-rc .bd{display:grid;gap:2px;min-width:0}.ui-rc .t{font-family:'Shippori Mincho B1',serif;font-size:17px;color:var(--paper);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ui-rc .t:hover{color:var(--c)}.ui-rc .mt{font-size:12px;color:#a89f8a}.ui-rc .pend{color:var(--gold);font-weight:600}
.ui-rc .w{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#a89f8a;white-space:nowrap}.ui-rc .btn{padding:8px 12px;font-size:13px;min-height:40px;white-space:nowrap}
.ui-rbar select{background:#0d0c0a;color:var(--paper);border:1px solid #3d3628;padding:8px 10px;font:inherit;font-size:13px;min-height:40px}
.ui-mlist{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;margin:-16px 0 28px;border:1px dashed #3d3628}.ui-mlist[hidden]{display:none}
@media(max-width:640px){.ui-rc{grid-template-columns:4px minmax(0,1fr) auto}.ui-rc .w{display:none}}
.ui-rl .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.ui-rl .acts .btn{padding:8px 12px;font-size:13px;min-height:40px}.ui-rl .pend{color:var(--gold);font-weight:600}.ui-rl a.cv{cursor:zoom-in}
.ob-nav a .bdg{display:inline-block;margin-left:6px;padding:1px 6px;background:var(--gold);color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;line-height:1.4;vertical-align:1px}
@media(max-width:640px){.ui-rl{grid-template-columns:60px minmax(0,1fr);gap:14px;padding:14px}.ui-rl .t{font-size:19px}}
@media(prefers-reduced-motion:reduce){.ui-rl{animation:none}}
@media(prefers-reduced-motion:reduce){.ui-book,.ui-card .ui-book{transition:none}}
`;
const CSS2 = ".ob-h1a{color:inherit;text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 2px no-repeat;transition:background-size .3s}.ob-h1a:hover,.ob-h1a:focus-visible{color:inherit;background-size:100% 2px}\n.top{display:flex!important;flex-wrap:nowrap;justify-content:flex-start!important;align-items:center;gap:12px 28px;padding:10px clamp(16px,4vw,48px)!important;position:sticky;top:0;z-index:50;background:rgba(13,12,10,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);transition:padding .25s}.top.ob-min{padding-top:5px!important;padding-bottom:5px!important}\n.ob-brand{display:flex;align-items:center;gap:10px;flex:none;text-decoration:none;color:var(--paper)}.ob-word b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px;line-height:1;white-space:nowrap}\n.ob-seal{width:30px;height:30px;border:2px solid var(--gold);border-radius:5px;color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:16px;transform:rotate(-6deg)}\n.ob-nav{display:flex;flex-wrap:nowrap!important;align-items:center;gap:clamp(12px,1.4vw,22px);flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none}.ob-nav::-webkit-scrollbar{display:none}.ob-nav a{color:var(--paper);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap;padding:8px 0}.ob-nav a.on{color:var(--gold);box-shadow:inset 0 -2px 0 var(--gold)}\n.ob-nav .ob-sup{flex:none;margin-left:auto;border:1px solid var(--gold);color:var(--gold);padding:6px 12px;font-size:13px}\n.ob-tools{display:flex;align-items:center;gap:10px;flex:none}.ob-search{width:clamp(150px,13vw,240px);height:38px;box-sizing:border-box;padding:0 12px;background:#16140f;border:1px solid #2f2a20;color:var(--paper);font:inherit;font-size:13px;transition:width .25s,border-color .2s}.ob-search:focus{width:clamp(200px,20vw,320px);border-color:var(--gold);outline:none}\n.ob-user{position:relative}.ob-user>summary{list-style:none;display:flex;align-items:center;cursor:pointer;padding:3px;border:1px solid transparent}.ob-user>summary::-webkit-details-marker{display:none}.ob-user[open]>summary,.ob-user>summary:hover{border-color:var(--gold)}\n.ob-av{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--gold);color:#0d0c0a;font-weight:700;overflow:hidden}.ob-av img{width:100%;height:100%;object-fit:cover}\n.ob-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:230px;background:#16140f;border:1px solid #3d3628;border-top:3px solid var(--gold);display:grid;padding:6px;box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:60}.ob-menu .who2{padding:8px 10px 10px;border-bottom:1px solid var(--line);margin-bottom:4px;display:grid;gap:3px}.ob-menu .who2 small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}\n.ob-menu a,.ob-menu button{display:block;text-align:left;background:none;border:none;color:var(--paper);font:inherit;font-size:14px;padding:9px 10px;text-decoration:none;cursor:pointer}.ob-menu a:hover,.ob-menu button:hover{background:#221f17;color:var(--gold)}\nmain:has(>.ob-page){padding-top:0}.ob-mast{display:flex;justify-content:space-between;gap:4px 16px;flex-wrap:wrap;align-items:baseline;padding:10px 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase}.ob-mast b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:15px;letter-spacing:.25em;color:#cfc6b0;text-transform:none}\n@media(max-width:1200px){.top{flex-wrap:wrap!important}.ob-tools{margin-left:auto}.ob-nav{order:3;flex-basis:100%}}\n@media(max-width:640px){.ob-tools{order:2;flex:1 1 100%}.ob-search,.ob-search:focus{width:auto;flex:1;min-width:0}.ob-word b{font-size:19px}}\n#session{display:flex;gap:8px;align-items:center}\n.ob-tick{position:relative;overflow:hidden;background:var(--gold);color:#0d0c0a;margin:0 calc(-1 * clamp(16px,4vw,56px));border-top:2px solid #0d0c0a;border-bottom:2px solid #0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:9px 0}.ob-track{display:flex;width:max-content;animation:obTicker 32s linear infinite;will-change:transform}.ob-track>span{display:flex;flex:none;gap:48px;padding-right:48px;white-space:nowrap}.ob-tick:hover .ob-track{animation-play-state:paused}\n@keyframes obTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes obIn{from{opacity:0;transform:perspective(1800px) rotateY(-14deg) translateX(40px);transform-origin:left center;filter:brightness(.5)}to{opacity:1;transform:none;filter:none}}@keyframes obCard{from{opacity:0;transform:perspective(900px) rotateX(-60deg) translateY(24px);transform-origin:center bottom}to{opacity:1;transform:none}}@keyframes obSpine{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}@keyframes obSeal{0%{opacity:0;transform:scale(1.8) rotate(-18deg)}60%{opacity:1;transform:scale(.94) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}@keyframes obSlide{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}@keyframes obCover{from{opacity:0;transform:perspective(1200px) rotateY(28deg) translateX(-30px)}to{opacity:1;transform:none}}.ob-page{animation:obIn .75s cubic-bezier(.2,.8,.2,1) both}.ob-seal{animation:obSeal .6s .4s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*{animation:obCard .6s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*:nth-child(2){animation-delay:.06s}.ob-anim>*:nth-child(3){animation-delay:.12s}.ob-anim>*:nth-child(4){animation-delay:.18s}.ob-anim>*:nth-child(5){animation-delay:.24s}.ob-anim>*:nth-child(6){animation-delay:.3s}.ob-anim>*:nth-child(n+7){animation-delay:.36s}.ob-shelf>.ob-spine{animation:obSpine .7s cubic-bezier(.2,.8,.2,1) both}.ob-shelf>.ob-spine:nth-child(2){animation-delay:.07s}.ob-shelf>.ob-spine:nth-child(3){animation-delay:.14s}.ob-shelf>.ob-spine:nth-child(4){animation-delay:.21s}.ob-shelf>.ob-spine:nth-child(n+5){animation-delay:.28s}.ob-hero .ob-cov{animation:obCover .7s cubic-bezier(.2,.8,.2,1) both}.ob-hero .ob-txt{animation:obSlide .6s .1s cubic-bezier(.2,.8,.2,1) both}.ob-urow{transition:background .2s,padding-left .25s}.ob-urow:hover{padding-left:18px}.ob-ritem .n{transition:transform .3s}.ob-ritem:hover .n{transform:scale(1.12) rotate(-4deg)}.ob-acts .a1,.ob-acts .a2{transition:transform .2s,filter .2s}.ob-acts .a1:hover,.ob-acts .a2:hover{transform:translateY(-2px);filter:brightness(1.08)}\n.ob-hero{position:relative;margin:0 calc(-1 * clamp(16px,4vw,56px));padding:clamp(24px,3vw,44px) clamp(16px,4vw,56px) 56px;display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:clamp(28px,6vw,80px);align-items:center;overflow:hidden;\n background-color:#0d0c0a;background-image:radial-gradient(circle at 100% 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 0 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 50% 100%,#1a170f 10%,#0d0c0a 11%,#0d0c0a 23%,#1a170f 24%,#1a170f 30%,#0d0c0a 31%,#0d0c0a 43%,#1a170f 44%,#1a170f 50%,#0d0c0a 51%);background-size:52px 26px}\n.ob-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0d0c0a 0%,rgba(13,12,10,.6) 45%,rgba(13,12,10,.2) 100%);pointer-events:none}.ob-hero>*{position:relative;z-index:1}\n.ob-vk{position:absolute;right:clamp(10px,2vw,30px);top:40px;writing-mode:vertical-rl;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:clamp(40px,5vw,60px);color:transparent;-webkit-text-stroke:1.5px #6b5a24;letter-spacing:.05em;z-index:1}\n.ob-cov{position:relative;padding-bottom:14px}.ob-cov .f{aspect-ratio:3/4;border:3px solid #f3ecd9;background:#1c1a14 center/cover;box-shadow:0 30px 60px rgba(0,0,0,.6)}.ob-cov .f:not([style*=url])::before{content:'';position:absolute;inset:3px;background:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-cov .code{position:absolute;top:14px;right:14px;background:#f3ecd9;color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:4px 8px}\n.ob-cov::after{content:'';position:absolute;left:-24px;right:-24px;bottom:0;height:12px;background:#2f2a20;border-top:3px solid var(--gold)}\n.ob-kick{font-family:'Shippori Mincho B1',serif;color:var(--gold);letter-spacing:.3em;font-size:15px}\n.ob-badge{display:inline-block;margin:16px 0 18px;background:var(--gold);color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.12em;padding:6px 12px}\n.ob-hero h1{margin:0;font-size:clamp(40px,6vw,76px);line-height:1.02;text-wrap:balance}\n.ob-tag{font-family:Literata,serif;font-style:italic;color:#d9a441;font-size:20px;margin:14px 0}\n.ob-syn{font-family:Literata,serif;font-size:18px;line-height:1.6;color:#e3dccb;max-width:44ch;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}\n.ob-acts{display:flex;gap:14px;flex-wrap:wrap;margin-top:26px}.ob-acts .a1{background:#d9922b;color:#0d0c0a;padding:15px 26px;font-weight:700;text-decoration:none}.ob-acts .a2{border:2px solid #f3ecd9;color:#f3ecd9;padding:13px 24px;font-weight:700;text-decoration:none}\n.ob-pager{position:absolute;bottom:22px;left:clamp(16px,4vw,56px);display:flex;gap:8px;z-index:2}.ob-pager button{min-width:44px;height:36px;background:#16140f;border:1px solid #3d3628;color:#8c846f;font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;padding:0 10px}.ob-pager button.on{background:#d9922b;color:#0d0c0a;border-color:#d9922b;min-width:130px;text-align:left}\n.ob-sec{padding:60px 0;border-top:1px solid var(--line)}\n.ob-st{display:flex;align-items:center;gap:16px;margin-bottom:28px}.ob-st .k{background:var(--gold);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:15px;line-height:1.1;width:26px;padding:4px 0;text-align:center;writing-mode:vertical-rl}.ob-st h2{margin:0;font-size:36px}.ob-st .r{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}.ob-st a.r{color:var(--gold);font-family:inherit;font-weight:700;font-size:14px}\n.ob-upd{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:0 40px}\n.ob-urow{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:20px;align-items:center;padding:16px 10px;border-top:1px solid var(--line);color:var(--paper);text-decoration:none}.ob-urow:hover{background:#14120d;color:var(--paper)}\n.ob-urow i{width:10px;height:10px}.ob-urow b{display:block;font-size:14px}.ob-urow span.t{font-family:Literata,serif;font-size:16px;color:#e3dccb}.ob-urow time{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}\n.ob-rank{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:40px 30px}\n.ob-ritem{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px;color:var(--paper);text-decoration:none}.ob-ritem .n{font-family:'Shippori Mincho B1',serif;font-size:72px;line-height:.8;color:var(--gold);align-self:start;margin-top:-6px}.ob-ritem:nth-child(n+3) .n{color:#d9922b}\n.ob-ritem .c{aspect-ratio:4/3;background:#1c1a14 center/cover;border:1px solid #2f2a20;transition:transform .3s}.ob-ritem:hover .c{transform:translateY(-6px)}.ob-ritem .c:not([style*=url]){background-image:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-ritem b{grid-column:2;font-size:15px;margin-top:10px}.ob-ritem small{grid-column:2;font-family:'IBM Plex Mono',monospace;color:#d9a441;font-size:12px}\n.ob-shelf{display:flex;align-items:flex-end;gap:6px;padding:0 18px;border-bottom:8px solid #2f2a20;box-shadow:0 3px 0 var(--gold);min-height:320px;overflow-x:auto}\n.ob-spine{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px 0 10px;color:#0d0c0a;text-decoration:none;box-shadow:inset -6px 0 10px rgba(0,0,0,.18),inset 3px 0 0 rgba(255,255,255,.25);transition:transform .3s}.ob-spine:hover{transform:translateY(-14px);color:#0d0c0a}\n.ob-spine::before,.ob-spine::after{content:'';width:70%;height:2px;background:rgba(0,0,0,.35)}.ob-spine span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'Shippori Mincho B1',serif;font-size:19px;line-height:1.15;flex:1;padding:12px 0;overflow:hidden}.ob-spine em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;background:#f3ecd9;padding:2px 6px;margin:8px 0}\n.ob-tick,.ob-hero{margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important}.ob-hero{padding-left:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px));padding-right:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px))}.ob-hero .ob-pager{left:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px))}.ob-vk{right:max(20px,calc((100vw - var(--wrap))/2))}body{overflow-x:hidden}.ob-cov{max-width:360px}\n@media(max-width:820px){.ob-hero{grid-template-columns:1fr}.ob-cov{max-width:260px}.ob-vk{display:none}}\n@media(prefers-reduced-motion:reduce){.ob-page,.ob-anim>*,.ob-shelf>.ob-spine,.ob-hero .ob-cov,.ob-hero .ob-txt,.ob-seal{animation:none}.ob-track{animation-duration:90s}}\n";
const LEN = { short: ['Cortas · menos de 20 cap.', n => n < 20], long: ['Largas · 20 cap. o más', n => n >= 20] };
const FK = [['tl', 'tl'], ['orig', 'original'], ['type', 'tipo'], ['len', 'largo']];
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const readF = () => { const u = new URLSearchParams(location.search), l = k => (u.get(k) || '').split(',').map(decodeURIComponent).filter(Boolean); const f = { q: u.get('q') || '', gin: l('g'), gout: l('sin'), adult: u.get('adulto') !== '0', sort: u.get('orden') || 'popular', top: u.get('top') === '1' }; FK.forEach(([k, p]) => f[k] = u.get(p) || ''); return f; };
const writeF = f => { const u = new URLSearchParams(); if (f.q.trim()) u.set('q', f.q.trim()); if (f.gin.length) u.set('g', f.gin.join(',')); if (f.gout.length) u.set('sin', f.gout.join(',')); FK.forEach(([k, p]) => f[k] && u.set(p, f[k])); if (!f.adult) u.set('adulto', '0'); if (f.top) u.set('top', '1'); if (f.sort !== 'popular') u.set('orden', f.sort); const qs = u.toString(); history.replaceState({}, '', '/catalogo' + (qs ? '?' + qs : '')); };
const TL = { active: ['En traducción', '#a9d18e'], paused: ['En pausa', '#f2c230'], completed: ['Traducción completa', '#8cc3f2'], abandoned: ['Abandonada', '#f59e7a'], withdrawn: ['Retirada', '#f59e7a'] };
const OR = { publishing: 'En publicación', completed: 'Completada', paused: 'En pausa', cancelled: 'Cancelada' };
const SQ = { waiting: 'En espera de secuela', none: 'Sin secuela confirmada', announced: 'Secuela anunciada', publishing: 'Secuela en publicación', completed: 'Secuela completada' };

const RK_L = { leidas: 'Más leídas', tendencia: 'Tendencia', calificadas: 'Mejor calificadas', terminadas: 'Más terminadas', novedades: 'Novedades en ascenso' };
const RK_P = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes', anio: 'Año', historico: 'Histórico' };
const RK_PF = { hoy: 'de hoy', semana: 'de la semana', mes: 'del mes', anio: 'del año', historico: 'de todos los tiempos' };
const RK_OK = { tendencia: ['hoy', 'semana', 'mes'], novedades: ['hoy', 'semana', 'mes'] };
const RK_D = { leidas: 'Lectores distintos: cada persona cuenta una vez al día por obra.', tendencia: 'Las que más lecturas ganaron frente al periodo anterior.', calificadas: 'Promedio de estrellas. Solo entran obras con 25 votos o más en el periodo.', terminadas: 'Lectores que llegaron al último capítulo publicado.', novedades: 'Obras con su primer capítulo publicado hace 30 días o menos.' };
const RK_E = { calificadas: 'Todavía ninguna obra llega a 25 votos en este periodo. Califica las que leas desde su ficha.', tendencia: 'Ninguna obra ganó lecturas frente al periodo anterior.', novedades: 'No hay obras nuevas con lecturas en este periodo.' };
const RK_CSS = `
.rk-bar{display:grid;gap:12px;margin:0 0 26px}.rk-row{display:flex;gap:12px 18px;flex-wrap:wrap;align-items:center}
.rk-seg{display:inline-flex;flex-wrap:wrap;border:1px solid #3d3628}.rk-seg button{min-height:40px;padding:0 14px;background:none;border:0;border-right:1px solid #3d3628;color:#cfc6b0;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.rk-seg button:last-child{border-right:0}.rk-seg button.on{background:var(--gold);color:#0d0c0a}.rk-seg button:disabled{opacity:.35;cursor:not-allowed}
.rk-sel{display:flex;gap:8px;align-items:center}.rk-sel select{min-height:40px;font-size:13px}
.rk-desc{margin:0;font-size:12px;color:#a89f8a;line-height:1.5}
.rk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,168px),1fr));gap:30px 20px}
.rk-c{position:relative;display:grid;gap:10px;align-content:start;color:var(--paper);text-decoration:none}.rk-c .ui-book{transition:transform .2s}.rk-c:hover .ui-book{transform:translateY(-4px)}.rk-c:hover b{color:var(--gold)}
.rk-n{position:absolute;z-index:2;top:-10px;left:-8px;min-width:44px;height:44px;padding:0 8px;display:flex;align-items:center;justify-content:center;background:#0d0c0a;border:2px solid var(--c);font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:22px;line-height:1;color:var(--paper);box-shadow:0 4px 12px rgba(0,0,0,.45)}
.rk-c.top .rk-n{min-width:56px;height:56px;font-size:30px;background:var(--gold);border-color:var(--gold);color:#0d0c0a}
.rk-b{display:grid;gap:3px}.rk-b b{font-size:15px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rk-b small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}
.rk-s{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#cfc6b0}
.rk-mv{font-weight:600;font-size:11px;padding:1px 5px;border:1px solid currentColor;line-height:1.4}.rk-mv.up{color:#a9d18e}.rk-mv.dn{color:#f59e7a}.rk-mv.eq{color:#7d745f;border-color:transparent}.rk-mv.new{color:var(--gold)}
.rk-upd{margin:28px 0 0;font-size:12px;color:#7d745f}
.rk-bdgs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 0}.rk-bdgs:empty{display:none}.rk-bdg{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px 0 0;background:#16140f;border:1px solid var(--gold);color:var(--paper)!important;font-size:13px;font-weight:600;text-decoration:none}.rk-bdg b{display:flex;align-items:center;align-self:stretch;padding:0 9px;background:var(--gold);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-size:16px}.rk-bdg:hover{background:#1f1c14}
.rk-rate{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0}.rk-stars{display:inline-flex}.rk-stars button{width:36px;height:40px;padding:0;background:none;border:0;font-size:24px;line-height:1;color:#3d3628;cursor:pointer}.rk-stars button.avg{color:#b5a27a}.rk-stars button.on{color:var(--gold)}.rk-stars:hover button{color:var(--gold)}.rk-stars button:hover~button{color:#3d3628}.rk-rate .mono{font-size:12px}
.tp2-rkl{display:grid}.tp2-rki{display:grid;grid-template-columns:52px 40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ln);color:var(--fg)!important;text-decoration:none}.tp2-rki .n{font-family:var(--tf);font-weight:800;font-size:26px;color:var(--act);text-align:center}.tp2-rki .cv{width:40px;aspect-ratio:2/3;background:var(--sf) center/cover;border:1px solid var(--ln)}.tp2-rki b{font-weight:600}.tp2-rki .m{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mu)}.tp2-rk .tp2-sh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}.tp2-rk .tp2-sh a{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--act)}
@media(max-width:560px){.rk-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 14px}.rk-n{font-size:18px;min-width:38px;height:38px}.rk-c.top .rk-n{min-width:46px;height:46px;font-size:24px}}
`;
const SR_CSS = `
.sr-pop{position:absolute;top:calc(100% + 8px);left:0;right:0;min-width:min(420px,92vw);max-height:70vh;overflow:auto;z-index:70;background:#14120d;border:1px solid #3d3628;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.sr-g{display:grid;padding:6px 0;border-bottom:1px solid #221f18}.sr-h{padding:6px 14px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a89f8a}
.sr-g a{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;align-items:center;padding:8px 14px;color:var(--paper);text-decoration:none}.sr-g a:hover,.sr-g a:focus-visible{background:#1c1a14;color:var(--paper)}
.sr-g b{display:block;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sr-g small{display:block;font-size:12px;color:#a89f8a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sr-cv{width:34px;height:48px;background:center/cover no-repeat}.sr-ic{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #3d3628;font-family:'Shippori Mincho B1',serif;color:var(--gold)}
.sr-all{display:block;padding:12px 14px;font-size:13px;color:var(--gold);text-decoration:none}.sr-all:hover{background:#1c1a14}.sr-none{margin:0;padding:14px;font-size:13px;color:#a89f8a}
.sr-big{width:100%;padding:16px 18px;margin:0 0 22px;background:#16140f;border:1px solid #3d3628;color:var(--paper);font:inherit;font-size:18px}.sr-big:focus{outline:none;border-color:var(--gold)}
.sr-page{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:18px;align-items:start}.sr-page .sr-g{border:1px solid #2f2a20;background:#14120d}
.ob-tab{display:none}
@media(max-width:760px){.ob-tab{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:80;background:rgba(13,12,10,.97);border-top:1px solid #2f2a20;padding-bottom:env(safe-area-inset-bottom);backdrop-filter:blur(8px)}
.ob-tab a{display:grid;justify-items:center;gap:2px;min-height:56px;padding:8px 2px 6px;font-size:11px;color:#a89f8a;text-decoration:none}.ob-tab a span{font-family:'Shippori Mincho B1',serif;font-size:19px;line-height:1}.ob-tab a.on{color:var(--gold)}
body:not(.no-tab){padding-bottom:calc(64px + env(safe-area-inset-bottom))}body.no-tab .ob-tab{display:none}.ob-nav{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}.sr-pop{position:fixed;top:auto;left:8px;right:8px;min-width:0;margin-top:8px}}
.fx-prog{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;margin-left:auto}.fx-bar{width:120px;height:4px;background:#2f2a20}.fx-bar i{display:block;height:100%;background:#a9d18e}
.fx-tag{margin-left:auto;align-self:center;padding:1px 6px;font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;background:var(--gold);color:#0d0c0a}.fx-tag.here{background:none;color:var(--gold);border:1px solid var(--gold)}
.ui-chl a.here{color:var(--gold)}.fx-hide .ui-chl li.is-read{display:none}
`;
const srCss = () => { if (document.getElementById('sr-css')) return; const s = document.createElement('style'); s.id = 'sr-css'; s.textContent = SR_CSS; document.head.appendChild(s); };
const fxCss = srCss;
const RV_CSS = `
.rv-form{display:grid;gap:8px;max-width:760px;margin:0 0 22px}.rv-form textarea{width:100%;padding:12px 14px;background:#16140f;border:1px solid #3d3628;color:var(--paper);font:inherit;font-size:15px;line-height:1.55;resize:vertical}.rv-form textarea:focus{outline:none;border-color:var(--gold)}
.rv-fr{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.rv-fr .mono,.rv-form small{font-size:12px;color:#a89f8a}
.rv-list{display:grid;gap:12px;max-width:760px}.rv-it{display:grid;gap:8px;padding:16px;border:1px solid #2f2a20;background:#16140f;max-width:760px}.rv-it.me{border-color:var(--gold);margin:0 0 14px}
.rv-it header{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.rv-it header>span:nth-child(2){display:grid;font-size:14px}.rv-it header a{color:var(--paper);font-weight:600}.rv-it header small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}
.rv-av{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;background:#2f2a20;font-weight:700}.rv-av img{width:100%;height:100%;object-fit:cover}
.rv-st{margin-left:auto;color:var(--gold);letter-spacing:1px}.rv-st i{font-style:normal;color:#3d3628}.rv-it p{margin:0;font-size:15px;line-height:1.6;text-wrap:pretty}.rv-acts{display:flex;gap:14px}.rv-rep{display:grid;gap:8px;width:100%;max-width:460px}.rv-rep select,.rv-rep input{width:100%;padding:9px 10px;margin-top:4px;background:#0d0c0a;border:1px solid #3d3628;color:var(--paper);font:inherit;font-size:14px}.rv-login{font-size:14px}
`;
const rvCss = () => { if (document.getElementById('rv-css')) return; const s = document.createElement('style'); s.id = 'rv-css'; s.textContent = RV_CSS; document.head.appendChild(s); };
const rkCss = () => { if (document.getElementById('rk-css')) return; const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = RK_CSS; document.head.appendChild(s); };
export function createUI({ sb, app, $, esc, toast, go, getUser, url }){
  if (!document.getElementById('ui-css')) { const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.appendChild(s); const s2 = document.createElement('style'); s2.textContent = CSS2; document.head.appendChild(s2); }
  chrome();
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const thumb = s => media(s?.cover_thumb_path || s?.cover_path);
  const color = s => s?.theme?.color || s?.teams?.color || '#f2c230';
  const ago = d => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return 'hace ' + Math.max(1, Math.round(s / 60)) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; if (s < 2592000) return 'hace ' + Math.round(s / 86400) + ' d'; return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const book = (s, sub, slim) => `<div class="ui-book" style="--c:${esc(color(s))};background-image:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"><div class="ui-obi${slim ? ' slim' : ''}"><small>${esc(sub || s.teams?.name || 'El Obi del Lector')}</small>${slim ? '' : esc(s.short || s.title)}</div></div>`;
  const pill = st => { const [l, c] = TL[st] || TL.active; return `<span class="ui-pill" style="color:${c}">${l}</span>`; };
  const SERIES = 'id,slug,title,short,original,author,illustrator,publisher,synopsis,genres,tags,theme,cover_path,cover_thumb_path,adult,work_type,demographic,translation_status,original_status,sequel_status,views,teams(name,slug,color),chapters(count),volumes(count)';
  function chrome(){
    const top = document.querySelector('header.top'); if (!top || top.dataset.ob) return; top.dataset.ob = '1';
    const ses = document.getElementById('session');
    top.innerHTML = `<a href="/" class="ob-brand"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a>
      <nav class="ob-nav">${[['/','Inicio'],['/catalogo','Catálogo'],['/lanzamientos','Lanzamientos'],['/biblioteca','Mi biblioteca'],['/calendario','Calendario'],['/ranking','Ranking']].map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}<a href="/apoyar" class="ob-sup">援 Apoyar</a></nav>
      <div class="ob-tools"><input class="ob-search" id="ob-q" type="search" placeholder="Buscar títulos, autores…" aria-label="Buscar"></div>`;
    addEventListener('scroll', () => top.classList.toggle('ob-min', scrollY > 40), { passive: true });
    top.querySelector('.ob-tools').appendChild(ses);
    srCss(); const q = top.querySelector('#ob-q'), tools = top.querySelector('.ob-tools'); tools.style.position = 'relative';
    const pop = document.createElement('div'); pop.className = 'sr-pop'; pop.hidden = true; tools.appendChild(pop);
    let qt, qn = 0; const close = () => { pop.hidden = true; };
    q.oninput = () => { clearTimeout(qt); const v = q.value.trim(); if (v.length < 2) return close(); qt = setTimeout(async () => { const my = ++qn, html = await searchHTML(v, 4); if (my !== qn || q.value.trim() !== v) return; pop.innerHTML = html + `<a class="sr-all" href="/buscar?q=${encodeURIComponent(v)}">Ver todos los resultados →</a>`; pop.hidden = false; }, 180); };
    q.onkeydown = e => { if (e.key === 'Enter') { const v = q.value.trim(); close(); go('/buscar' + (v ? '?q=' + encodeURIComponent(v) : '')); } if (e.key === 'Escape') close(); };
    q.onfocus = () => { if (pop.innerHTML && q.value.trim().length >= 2) pop.hidden = false; };
    document.addEventListener('click', e => { if (!e.target.closest('.ob-tools')) close(); else if (e.target.closest('.sr-pop a')) { close(); q.value = ''; } });
    const tab = document.createElement('nav'); tab.className = 'ob-tab'; tab.setAttribute('aria-label', 'Navegación');
    tab.innerHTML = [['/', '家', 'Inicio'], ['/catalogo', '目', 'Catálogo'], ['/biblioteca', '書', 'Biblioteca'], ['/buscar', '探', 'Buscar'], ['/perfil', '人', 'Perfil']].map(([h, k, l]) => `<a href="${h}"><span aria-hidden="true">${k}</span>${l}</a>`).join('');
    document.body.appendChild(tab);
    const mark = () => { const p = location.pathname; top.querySelectorAll('.ob-nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === p || (a.textContent === 'Catálogo' && p.startsWith('/serie'))));
      tab.querySelectorAll('a').forEach(a => { const h = a.getAttribute('href'); a.classList.toggle('on', h === '/' ? p === '/' : p.startsWith(h) || (h === '/catalogo' && p.startsWith('/serie')) || (h === '/perfil' && p.startsWith('/lector/'))); });
      document.body.classList.toggle('no-tab', /^\/(leer|estudio)\b/.test(p)); };
    addEventListener('popstate', mark); document.addEventListener('click', () => setTimeout(mark, 0)); mark();
  }
  let SIDX = null;
  const searchIndex = () => SIDX ||= (async () => { const u = getUser();
    const [{ data: ss }, { data: ts }, pr] = await Promise.all([sb.from('series').select('id,slug,title,short,original,author,illustrator,genres,tags,adult,cover_path,translation_status,theme,teams(name,slug,color),chapters(count)').eq('published', true),
      sb.from('teams').select('slug,name,avatar_path,status'), u ? sb.from('profiles').select('adult_ok').eq('id', u.id).maybeSingle() : { data: null }]);
    const ok = !!pr?.data?.adult_ok; return { series: (ss || []).filter(x => x.translation_status !== 'withdrawn' && (!x.adult || ok)), teams: (ts || []).filter(t => !t.status || t.status === 'active') }; })().catch(e => { SIDX = null; throw e; });
  async function searchData(q, lim){
    const I0 = await searchIndex(), I = { ...I0, series: I0.series.filter(x => !hidS(x)) }, n = norm(q), has = t => norm(t).includes(n), byId = Object.fromEntries(I.series.map(x => [x.id, x]));
    const works = I.series.filter(x => has([x.title, x.short, x.original].join(' '))).slice(0, lim);
    const am = new Map(); I.series.forEach(x => [x.author, x.illustrator].filter(Boolean).forEach(a => { if (has(a)) { const k = a.trim(); am.set(k, (am.get(k) || 0) + 1); } }));
    const authors = [...am].sort((a, b) => b[1] - a[1]).slice(0, lim);
    const teams = I.teams.filter(t => has(t.name)).slice(0, lim);
    const tm = new Map(); I.series.forEach(x => [...(x.genres || []).map(g => ['g', g]), ...(Array.isArray(x.tags) ? x.tags : []).map(t => ['t', t])].forEach(([k, v]) => { if (has(v)) { const key = k + '|' + v; tm.set(key, (tm.get(key) || 0) + 1); } }));
    const tags = [...tm].sort((a, b) => b[1] - a[1]).slice(0, lim).map(([k, c]) => { const [t, v] = k.split('|'); return { t, v, c }; });
    const like = q.replace(/[%_,()\\]/g, ' ').trim();
    const { data: ch } = like.length >= 2 ? await sb.from('chapters').select('num,title,series_id').eq('status', 'published').is('deleted_at', null).ilike('title', '%' + like + '%').limit(lim * 3) : { data: [] };
    const chapters = (ch || []).filter(c => byId[c.series_id]).slice(0, lim).map(c => ({ ...c, s: byId[c.series_id] }));
    const { data: rd } = like.length >= 2 ? await sb.rpc('search_readers', { p_q: like }) : { data: [] };
    return { works, authors, teams, tags, chapters, readers: (rd || []).slice(0, lim) };
  }
  async function searchHTML(q, lim){
    let R; try { R = await searchData(q, lim); } catch { return '<p class="sr-none">No se pudo buscar. Intenta de nuevo.</p>'; }
    const grp = (t, items) => items.length ? `<div class="sr-g"><span class="sr-h">${t}</span>${items.join('')}</div>` : '';
    const cv = x => `<span class="sr-cv" style="${x.cover_path ? `background-image:url('${esc(thumb(x))}')` : `background:${esc(color(x))}`}"></span>`;
    const html = grp('Obras', R.works.map(x => `<a href="/serie/${x.slug}">${cv(x)}<span><b>${esc(x.title)}</b><small>${esc([x.author, x.teams?.name].filter(Boolean).join(' · '))}</small></span></a>`))
      + grp('Autores', R.authors.map(([a, c]) => `<a href="/catalogo?q=${encodeURIComponent(a)}"><span class="sr-ic">著</span><span><b>${esc(a)}</b><small>${c} ${c === 1 ? 'obra' : 'obras'}</small></span></a>`))
      + grp('Equipos', R.teams.map(t => `<a href="/equipo/${esc(t.slug)}"><span class="sr-ic">訳</span><span><b>${esc(t.name)}</b><small>Equipo traductor</small></span></a>`))
      + grp('Géneros y etiquetas', R.tags.map(t => `<a href="/catalogo?${t.t === 'g' ? 'g=' + encodeURIComponent(t.v) : 'q=' + encodeURIComponent(t.v)}"><span class="sr-ic">${t.t === 'g' ? '類' : '#'}</span><span><b>${esc(t.v)}</b><small>${t.t === 'g' ? 'Género' : 'Etiqueta'} · ${t.c} ${t.c === 1 ? 'obra' : 'obras'}</small></span></a>`))
      + grp('Lectores', (R.readers || []).map(r => `<a href="/lector/${encodeURIComponent(r.username)}"><span class="sr-ic" style="${r.avatar_url ? `background:center/cover url('${esc(r.avatar_url)}');color:transparent` : ''}">${esc(r.kanji || '読')}</span><span><b>${esc(r.username)}</b><small>Lector</small></span></a>`))
      + grp('Capítulos', R.chapters.map(c => `<a href="/leer/${c.s.slug}/${c.num}"><span class="sr-ic">章</span><span><b>${esc(c.title || 'Capítulo ' + c.num)}</b><small>${esc(c.s.title)} · Cap. ${c.num}</small></span></a>`));
    return html || `<p class="sr-none">Nada coincide con «${esc(q)}».</p>`;
  }
  async function search(){
    srCss(); const q0 = new URLSearchParams(location.search).get('q') || '';
    app.innerHTML = `<div class="ui-cath"><div><h1>Buscar</h1><p>Obras, autores, equipos, géneros, etiquetas y capítulos.</p></div><span class="kj" aria-hidden="true">検索</span></div>
      <input id="sr-q" class="sr-big" type="search" placeholder="Escribe al menos 2 letras…" value="${esc(q0)}" aria-label="Buscar" autocomplete="off"><div id="sr-res" class="sr-page"></div>`;
    const inp = $('#sr-q'), box = $('#sr-res'); let t, n = 0;
    const run = async () => { const v = inp.value.trim(); history.replaceState({}, '', '/buscar' + (v ? '?q=' + encodeURIComponent(v) : '')); if (v.length < 2) { box.innerHTML = ''; return; } const my = ++n; box.innerHTML = '<p class="mono">Buscando…</p>'; const h = await searchHTML(v, 12); if (my === n && document.body.contains(box)) box.innerHTML = h; };
    inp.oninput = () => { clearTimeout(t); t = setTimeout(run, 200); }; if (!matchMedia('(hover:none)').matches || !q0) inp.focus(); run();
  }
  const KN = n => { const d = '〇一二三四五六七八九'; if (n < 10) return d[n]; if (n < 20) return '十' + (n % 10 ? d[n % 10] : ''); if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : ''); return String(n); };
  const SPINES = ['#f2c230', '#efe6d2', '#d9822b', '#e0a526', '#b5a27a'];
  async function pendingMap(prog){
    const u = getUser(); if (!u) return {};
    const rc = await sb.rpc('unread_counts'); if (!rc.error && rc.data && typeof rc.data === 'object') return rc.data;
    prog ||= await progressMap();
    const [{ data: f }, { data: rd }] = await Promise.all([sb.from('follows').select('series_id').eq('user_id', u.id), sb.from('read_chapters').select('chapter_id').eq('user_id', u.id)]);
    const ids = (f || []).map(x => x.series_id).filter(id => prog[id]); if (!ids.length) return {};
    const { data: chs } = await sb.from('chapters').select('id,num,series_id').in('series_id', ids).eq('status', 'published').is('deleted_at', null).limit(2000);
    const read = new Set((rd || []).map(r => r.chapter_id)), out = {};
    (chs || []).forEach(c => { if (c.num > prog[c.series_id].chapter_num && !read.has(c.id)) out[c.series_id] = (out[c.series_id] || 0) + 1; });
    return out;
  }
  async function refreshBadge(){
    const a = document.querySelector('.ob-nav a[href="/lanzamientos"]'); if (!a) return;
    const n = getUser() ? Object.values(await pendingMap()).reduce((x, y) => x + y, 0) : 0;
    a.querySelector('.bdg')?.remove();
    if (n) a.insertAdjacentHTML('beforeend', `<span class="bdg" title="${n} capítulos nuevos en series que sigues">${n > 99 ? '99+' : n}</span>`);
  }
  // vista rápida compartida
  let gqFrom = null;
  const gqClose = () => { const q = document.querySelector('.ui-qv.g'); if (!q || q.hidden) return; q.hidden = true; document.body.style.overflow = ''; gqFrom?.focus({ preventScroll: true }); };
  addEventListener('keydown', e => { if (e.key === 'Escape') gqClose(); });
  async function quickView(s, o){
    let q = document.querySelector('.ui-qv.g');
    if (!q) { q = document.createElement('div'); q.className = 'ui-qv g'; q.hidden = true; document.body.appendChild(q); q.addEventListener('click', e => { if (e.target === q) gqClose(); }); }
    gqFrom = o.from; const p = o.p, lc = o.lc;
    const paint = (first, following) => {
      const n = p ? (p.pct > 0.95 ? p.chapter_num + 1 : p.chapter_num) : first;
      q.innerHTML = `<div class="ui-qvc" role="dialog" aria-modal="true" aria-labelledby="gq-t" style="--c:${esc(color(s))}">
        <button class="ui-qx" aria-label="Cerrar">×</button>${book(s)}
        <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}</span>
          <h2 id="gq-t">${esc(s.title)}</h2>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).slice(0, 6).map(g => `<span class="ui-chip" style="cursor:default">${esc(g)}</span>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          ${s.synopsis ? `<p class="syn">${esc(s.synopsis)}</p>` : '<p class="mono" style="margin:14px 0">Sin sinopsis todavía.</p>'}
          <p class="mono" style="margin:0 0 16px">${s.chapters?.[0]?.count ?? 0} capítulos${lc ? ' · último: cap. ' + lc.num + ' · ' + ago(lc.publish_at) : ''}</p>
          <div class="acts">${n ? `<a class="btn" href="/leer/${s.slug}/${n}">${p ? 'Continuar · cap. ' + n : 'Empezar a leer'}</a>` : ''}<button class="btn ghost" data-gqf>${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/serie/${s.slug}">Ver ficha completa</a></div>
        </div></div>`;
      q.querySelector('.ui-qx').onclick = gqClose;
      q.querySelectorAll('.ui-qvc a').forEach(a => a.addEventListener('click', () => { q.hidden = true; document.body.style.overflow = ''; }));
      q.querySelector('[data-gqf]').onclick = async e => { const b = e.currentTarget; b.disabled = true; const now = await o.onFollow(); b.disabled = false; if (now !== undefined) paint(first, now); };
    };
    paint(null, o.following()); q.hidden = false; document.body.style.overflow = 'hidden'; q.querySelector('.ui-qx').focus({ preventScroll: true });
    if (!p) { const { data: f } = await sb.from('chapters').select('num').eq('series_id', s.id).eq('status', 'published').is('deleted_at', null).order('num').limit(1); if (!q.hidden) { paint(f?.[0]?.num || null, o.following()); q.querySelector('.ui-qx').focus({ preventScroll: true }); } }
  }
  async function progressMap(){ const u = getUser(); if (!u) return {}; const { data } = await sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at').eq('user_id', u.id); return Object.fromEntries((data || []).map(r => [r.series_id, r])); }

  // ---------- Inicio ----------
  let heroT;
  const HOME_CSS = `
.ob-fest{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:22px 0 0;padding:12px 16px;border:1px solid var(--fc);border-left:4px solid var(--fc);background:color-mix(in srgb,var(--fc) 9%,#16140f);color:var(--paper);text-decoration:none}
.ob-fest:hover{color:var(--paper);background:color-mix(in srgb,var(--fc) 15%,#16140f)}.ob-fest b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px}.ob-fest span{font-size:13px;color:var(--mute)}.ob-fest em{margin-left:auto;font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--fc)}
.ob-tick a:hover{text-decoration:underline!important;text-underline-offset:3px}.ob-tick:hover .ob-track{animation-play-state:paused}
.ob-hi{display:flex;align-items:center;gap:14px 24px;flex-wrap:wrap;margin:28px 0 0;padding:20px 22px;border:1px solid var(--line);background:#16140f}.ob-hi p{margin:0;flex:1 1 320px;font-size:15px;line-height:1.55;text-wrap:pretty}.ob-hi div{display:flex;gap:10px;flex-wrap:wrap}
.ob-hi a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;font-weight:600;text-decoration:none;border:1px solid var(--gold)}.ob-hi .a1{background:var(--gold);color:#0d0c0a}.ob-hi .a2{color:var(--paper)}
.ob-next{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.ob-nx{display:grid;gap:4px;padding:16px;border:1px solid var(--line);border-top:3px solid var(--gold);background:#16140f;color:var(--paper);text-decoration:none}.ob-nx:hover{border-color:var(--gold);color:var(--paper)}
.ob-nx .w{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--gold)}.ob-nx b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px}.ob-nx small{font-size:13px;color:var(--mute)}
.ob-carw{position:relative}.ob-car{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(132px,16vw,172px);gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 14px;scrollbar-width:thin;scrollbar-color:#3d3628 transparent}
.ob-cc{scroll-snap-align:start;display:grid;gap:8px;align-content:start;color:var(--paper);text-decoration:none}.ob-cc:hover{color:var(--paper)}
.ob-cc .cv{position:relative;aspect-ratio:2/3;background:#1c1a14 center/cover no-repeat;border:1px solid var(--line);transition:transform .25s,box-shadow .25s}.ob-cc:hover .cv{transform:translateY(-4px);box-shadow:0 12px 26px rgba(0,0,0,.45)}
.ob-cc .cv.no{display:flex;align-items:flex-end;padding:10px;font-family:'Shippori Mincho B1',serif;font-size:15px;line-height:1.25;background:linear-gradient(160deg,var(--c),#16140f)}
.ob-cc .cv i{position:absolute;top:8px;left:0;padding:3px 8px;background:var(--gold);color:#0d0c0a;font:700 11px/1.3 'IBM Plex Mono',monospace;font-style:normal;letter-spacing:.04em}
.ob-cc b{font-size:14px;font-weight:600;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.ob-cc small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}
.ob-cc.all .cv{display:flex;align-items:center;justify-content:center;border-style:dashed;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gold)}
.ob-arr{display:flex;gap:8px;margin-left:auto}.ob-arr button{width:44px;height:44px;background:#16140f;border:1px solid var(--line);color:var(--paper);font-size:20px;cursor:pointer}.ob-arr button:hover{border-color:var(--gold);color:var(--gold)}.ob-arr button:disabled{opacity:.35;cursor:default}
.ob-st .r2{display:flex;align-items:center;gap:16px;margin-left:auto}
.ob-sec{content-visibility:auto;contain-intrinsic-size:auto 520px}
.sk{background:linear-gradient(90deg,#16140f 0%,#211e17 50%,#16140f 100%);background-size:200% 100%;animation:skP 1.4s ease-in-out infinite}@keyframes skP{0%{background-position:100% 0}100%{background-position:-100% 0}}@media(prefers-reduced-motion:reduce){.sk{animation:none}}
.sk-hero{height:clamp(280px,42vw,460px);margin:28px 0 40px}.sk-h{height:28px;width:260px;margin:0 0 20px}.sk-row{display:grid;gap:14px;margin:0 0 44px}.sk-ln{height:44px}.sk-row.c{grid-auto-flow:column;grid-auto-columns:clamp(132px,16vw,172px);overflow:hidden}.sk-cv{aspect-ratio:2/3}
.ob-gen{display:flex;gap:8px;overflow-x:auto;padding:4px 0 2px;margin:24px 0 0;scrollbar-width:none}.ob-gen a{flex:none;display:flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid var(--line);background:#16140f;color:var(--paper);text-decoration:none;font-size:14px}.ob-gen a:hover{border-color:var(--gold);color:var(--gold)}.ob-gen small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}
.ob-minis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:20px 40px}.ob-mh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 6px}.ob-mh h3{margin:0;font-size:18px;font-weight:600}.ob-mh .r{font-size:13px}
.ob-mini>a{display:grid;grid-template-columns:28px 40px minmax(0,1fr);gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line);color:var(--paper);text-decoration:none}.ob-mini>a:hover b{color:var(--gold)}.ob-mini .n{font-family:'Shippori Mincho B1',serif;font-size:22px;color:var(--gold);text-align:center}.ob-mini .c{width:40px;height:56px;background:center/cover no-repeat}.ob-mini b{display:block;font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ob-mini small{font-size:12px;color:var(--mute)}
.ob-car{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(132px,16vw,172px);gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 14px;scrollbar-width:thin;scrollbar-color:#3d3628 transparent}
.ob-anns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.ob-ann{display:grid;gap:6px;align-content:start;padding:18px;border:1px solid var(--line);border-top:3px solid var(--tc);background:#16140f}.ob-ann .tm{font-weight:600;color:var(--tc);text-decoration:none}.ob-ann .mono{font-size:11px;color:var(--mute)}.ob-ann h3{margin:4px 0 0;font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:19px}.ob-ann p{margin:0;font-size:14px;line-height:1.55;text-wrap:pretty}.ob-ann .go{margin-top:6px;font-size:13px;color:var(--gold)}
.ob-revs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px}.ob-rev{display:grid;grid-template-columns:56px minmax(0,1fr);gap:14px;padding:16px;border:1px solid var(--line);background:#16140f;color:var(--paper);text-decoration:none}.ob-rev:hover{border-color:var(--gold);color:var(--paper)}.ob-rev .c{width:56px;height:80px;background:#1c1a14 center/cover no-repeat}.ob-rev b{display:block;font-size:15px}.ob-rev .st{color:var(--gold);font-size:13px;letter-spacing:1px}.ob-rev .st i{font-style:normal;color:#3d3628}.ob-rev q{display:block;margin:6px 0;font-size:14px;line-height:1.5;quotes:'«' '»';display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.ob-rev small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}
.ob-tms{display:grid;gap:34px}.ob-tmh{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin:0 0 14px}.ob-tmh a{display:flex;align-items:center;gap:10px;color:var(--paper);text-decoration:none}.ob-tmh a::before{content:'';width:12px;height:12px;background:var(--tc)}.ob-tmh a b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:20px}.ob-tmh a:hover b{color:var(--gold)}.ob-tmh .mono{font-size:12px;color:var(--mute)}
@media(max-width:560px){.ob-arr{display:none}.ob-fest em{margin-left:0}}
`;
  const SKEL = `<div class="ob-page ob-skel" aria-busy="true" aria-label="Cargando la biblioteca"><div class="ob-mast"><b>翻訳図書館</b><span>Biblioteca de novelas ligeras · Español latino</span></div><div class="sk sk-hero"></div><div class="sk sk-h"></div><div class="sk-row">${'<div class="sk sk-ln"></div>'.repeat(4)}</div><div class="sk sk-h"></div><div class="sk-row c">${'<div class="sk sk-cv"></div>'.repeat(6)}</div></div>`;
  async function home(){
    rkCss(); if (!document.getElementById('ob2-css')) { const st = document.createElement('style'); st.id = 'ob2-css'; st.textContent = HOME_CSS; document.head.appendChild(st); }
    app.innerHTML = SKEL;
    const u = getUser(), now = new Date();
    // Fase 1: lo que se ve primero. home_feed trae todo lo público en una consulta; si falla, las consultas de siempre.
    const legacy = () => Promise.all([
      sb.from('series').select(SERIES).eq('published', true).order('views', { ascending: false }),
      sb.from('chapters').select('num,title,publish_at,series_id').eq('status', 'published').is('deleted_at', null).or('publish_at.is.null,publish_at.lte.' + now.toISOString()).order('publish_at', { ascending: false, nullsFirst: false }).limit(80),
      sb.rpc('ranking_list', { p_list: 'leidas', p_period: 'semana', p_limit: 100 }),
      sb.rpc('ranking_list', { p_list: 'leidas', p_period: 'historico', p_limit: 6 }),
      sb.from('rankings').select('series_id,pos,list').eq('period', 'semana').lte('pos', 10),
      sb.from('schedule').select('label,at,kind,series_id,series(title,slug,cover_path)').gte('at', now.toISOString()).order('at').limit(12),
      sb.from('platform_settings').select('featured').eq('id', 1).maybeSingle()]).then(([a, b, c, d, e, f, g]) => ({ series: a.data, latest: b.data, rkW: c.data, rkH: d.data, top10: e.data, nextRel: f.data, featured: g.data?.featured }));
    const feed = () => { const pre = window.OBI_HOME; window.OBI_HOME = null;
      return (pre || sb.rpc('home_feed').then(({ data, error }) => error ? null : data)).then(d => Array.isArray(d?.series) ? d : legacy(), legacy); };
    const [FD, prog, pr, festKey, AN] = await Promise.all([
      feed(), progressMap(),
      u ? sb.from('profiles').select('adult_ok').eq('id', u.id).maybeSingle() : { data: null },
      import('/season.js?v=3').then(S => S.load(sb).then(() => S.platformKey())).catch(() => null),
      import('/anim.js?v=8').catch(() => null)]);
    const { series, latest, rkW, rkH, top10 } = FD, ps = { featured: FD.featured }, nextRel = (FD.nextRel || []).filter(e => new Date(e.at) > Date.now());
    if (location.pathname !== '/') return;
    const adultOk = !!pr?.data?.adult_ok;
    const list = (series || []).filter(s => !['abandoned', 'withdrawn'].includes(s.translation_status) && (!s.adult || adultOk) && !hidS(s)), byId = Object.fromEntries(list.map(s => [s.id, s]));
    const lastCh = {}; (latest || []).forEach(c => { lastCh[c.series_id] ||= c; });
    const picks = (Array.isArray(ps?.featured) ? ps.featured : []).map(id => byId[id]).filter(Boolean);
    const feat = picks.length ? picks.slice(0, 5) : [...list].sort((a, b) => new Date(lastCh[b.id]?.publish_at || 0) - new Date(lastCh[a.id]?.publish_at || 0)).slice(0, 5);
    const cont = Object.values(prog).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).filter(p => byId[p.series_id]).slice(0, 6);
    const grp = []; for (const c of (latest || []).filter(c => byId[c.series_id])) { let g = grp.find(x => x.id === c.series_id); if (!g) { if (grp.length >= 6) continue; grp.push(g = { id: c.series_id, chs: [] }); } if (g.chs.length < 20) g.chs.push(c); }
    const caps = chs => { const n = [...new Set(chs.map(c => c.num))].sort((a, b) => a - b); if (n.length === 1) return 'Cap. ' + n[0]; const run = n.every((x, i) => !i || x - n[i - 1] === 1); return 'Caps. ' + (run ? n[0] + '–' + n[n.length - 1] : n.slice(0, 4).join(', ') + (n.length > 4 ? '…' : '')); };
    const top = {}; (top10 || []).forEach(r => { if (!top[r.series_id] || r.pos < top[r.series_id]) top[r.series_id] = r.pos; });
    const rkWv = (rkW || []).filter(r => byId[r.series_id]);
    const rkUse = rkWv.length ? { rows: rkWv, per: 'semana', lbl: 'lectores distintos · esta semana' } : { rows: (rkH || []).filter(r => byId[r.series_id]), per: 'historico', lbl: 'vistas · de todos los tiempos' };
    const rk = rkUse.rows.slice(0, 6);
    const nx = (nextRel || []).filter(e => e.series && (!e.series_id || byId[e.series_id])).slice(0, 3);
    const until = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
    const fs = festKey && AN?.SEASONS?.[festKey]; const fest = fs && fs.g !== 'est' ? fs : null;
    const shelf = list.slice(0, 24);
    const gc = new Map(); list.forEach(x => (x.genres || []).forEach(g => gc.set(g, (gc.get(g) || 0) + 1)));
    const genres = [...gc].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const tmap = new Map(); rkWv.forEach(r => { const x = byId[r.series_id], t = x?.teams; if (!t?.slug) return; let g = tmap.get(t.slug); if (!g) tmap.set(t.slug, g = { t, sum: 0, rows: [] }); g.sum += +r.score || 0; g.rows.push({ s: x, n: +r.score || 0 }); });
    const teamsTop = [...tmap.values()].sort((a, b) => b.sum - a.sum).slice(0, 6);
    const done = list.filter(x => x.translation_status === 'completed').sort((a, b) => new Date(lastCh[b.id]?.publish_at || 0) - new Date(lastCh[a.id]?.publish_at || 0) || (b.views || 0) - (a.views || 0)).slice(0, 15);
    const cover = (s, tag) => { const t = tag || (top[s.id] ? 'TOP ' + top[s.id] : ''); return s.cover_path ? `<span class="cv" style="background-image:url('${esc(thumb(s))}')">${t ? `<i>${t}</i>` : ''}</span>` : `<span class="cv no" style="--c:${esc(color(s))}">${t ? `<i>${t}</i>` : ''}${esc(s.short || s.title)}</span>`; };
    const cc = (s, sub, tag) => `<a class="ob-cc" href="/serie/${s.slug}">${cover(s, tag)}<b>${esc(s.title)}</b><small>${sub}</small></a>`;
    const arrows = id => `<span class="ob-arr"><button type="button" data-cs="${id}" data-d="-1" aria-label="Anteriores">‹</button><button type="button" data-cs="${id}" data-d="1" aria-label="Siguientes">›</button></span>`;
    const head = (k, t, right = '') => `<div class="ob-st"><span class="k">${k}</span><h2>${t}</h2>${right}</div>`;
    const tcar = (g, i) => `<div class="ob-tm"><div class="ob-tmh"><a href="/equipo/${esc(g.t.slug)}" style="--tc:${esc(g.t.color || '#f2c230')}"><b>${esc(g.t.name)}</b></a><span class="mono">${Math.round(g.sum).toLocaleString('es-MX')} lectores esta semana</span>${arrows('ob-tcar-' + i)}</div>
      <div class="ob-car" id="ob-tcar-${i}">${g.rows.slice(0, 15).map((r, j) => cc(r.s, Math.round(r.n).toLocaleString('es-MX') + ' lectores', '#' + (j + 1))).join('')}</div></div>`;
    app.innerHTML = `<div class="ob-page">
      <div class="ob-mast"><b>翻訳図書館</b><span>Biblioteca de novelas ligeras · Español latino</span></div>
      ${grp.length ? `<div class="ob-tick" aria-label="Novedades"><div class="ob-track">${[0, 1].map(k => `<span${k ? ' aria-hidden="true"' : ''}>${[...grp, ...grp].slice(0, Math.max(6, grp.length)).map((g, i) => `<a href="/leer/${byId[g.id].slug}/${g.chs[0].num}"${k ? ' tabindex="-1"' : ''} style="color:inherit;text-decoration:none">${i === 0 ? 'NUEVO · ' : '★ '}${esc(byId[g.id].title)} · ${caps(g.chs)}</a>`).join('')}</span>`).join('')}</div></div>` : ''}
      ${fest ? `<a class="ob-fest" href="/calendario" style="--fc:${esc(fest.ac)}"><b>${esc(fest.l)}</b><span>El sitio se viste de temporada.</span><em>Ver en el calendario →</em></a>` : ''}
      ${feat.length ? '<section class="ob-hero" id="hero"></section>' : ''}
      ${genres.length ? `<nav class="ob-gen" aria-label="Géneros">${genres.map(([g, n]) => `<a href="/catalogo?g=${encodeURIComponent(g)}">${esc(g)}<small>${n}</small></a>`).join('')}</nav>` : ''}
      ${u ? '' : `<div class="ob-hi"><p><strong>Bienvenido a El Obi del Lector.</strong> Novelas ligeras traducidas al español por grupos de fans. Crea una cuenta para guardar tu progreso, seguir obras y recibir avisos de capítulos nuevos.</p><div><a class="a1" href="/entrar">Crear cuenta</a><a class="a2" href="/catalogo">Explorar el catálogo</a></div></div>`}
      ${cont.length ? `<section class="ob-sec">${head('続読', 'Continuar leyendo', '<a class="r" href="/biblioteca">Mi biblioteca →</a>')}<div class="ui-cont ob-anim">${cont.map(p => { const s = byId[p.series_id]; return `<a class="ui-ccard" href="/leer/${s.slug}/${p.chapter_num}" style="--c:${esc(color(s))}"><span class="th" style="background-image:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}"></span><span><span class="ui-lbl">Capítulo ${p.chapter_num} · ${ago(p.updated_at)}</span><br><strong>${esc(s.title)}</strong><span class="ui-bar"><i style="width:${Math.round((p.pct || 0) * 100)}%"></i></span></span></a>`; }).join('')}</div></section>` : ''}
      <div id="ob-s-pend"></div><div id="ob-s-foryou"></div>
      <section class="ob-sec">${head('新着', 'Últimas actualizaciones', '<a class="r" href="/lanzamientos">Todos los lanzamientos →</a>')}
        <div class="ob-upd ob-anim">${grp.map(g => { const s = byId[g.id], c = g.chs[0]; return `<a class="ob-urow" href="/leer/${s.slug}/${c.num}"><i style="background:${esc(color(s))}"></i><span><b>${esc(s.title)}</b><span class="t">${caps(g.chs)}${g.chs.length === 1 && c.title ? ' — ' + esc(c.title) : ''}</span></span><time>${ago(c.publish_at)}</time></a>`; }).join('') || '<p class="mono">Aún no hay capítulos publicados.</p>'}</div></section>
      ${nx.length ? `<section class="ob-sec">${head('予定', 'Próximos lanzamientos', '<a class="r" href="/calendario">Calendario →</a>')}
        <div class="ob-next ob-anim">${nx.map(e => `<a class="ob-nx" href="/serie/${esc(e.series.slug)}"><span class="w">${until(e.at)} · ${new Date(e.at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><b>${esc(e.series.title)}</b><small>${e.kind === 'volume' ? 'Volumen completo · ' : ''}${esc(e.label || '')}</small></a>`).join('')}</div></section>` : ''}
      ${rk.length ? `<section class="ob-sec">${head('人気', 'Más leídas', `<span class="r2"><span class="mono" style="font-size:12px">${rkUse.lbl}</span><a class="r" href="/ranking?lista=leidas&periodo=${rkUse.per}">Ver ranking →</a></span>`)}
        <div class="ob-rank ob-anim">${rk.map((r, i) => { const s = byId[r.series_id]; return `<a class="ob-ritem" href="/serie/${s.slug}"><span class="n">${i + 1}</span><span class="c" style="background-image:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}"></span><b>${esc(s.title)}</b><small>${Math.round(+r.score || 0).toLocaleString('es-MX')} ${rkUse.per === 'semana' ? 'lectores' : 'vistas'} · ${s.chapters?.[0]?.count || 0} cap.</small></a>`; }).join('')}</div></section>` : ''}
      <div id="ob-s-trend"></div><div id="ob-s-rated"></div>
      ${teamsTop.length ? `<section class="ob-sec">${head('訳者', 'Lo más visto de cada equipo', '<span class="r2"><span class="mono" style="font-size:12px">esta semana</span></span>')}<div class="ob-tms">${teamsTop.map(tcar).join('')}</div></section>` : ''}
      ${done.length ? `<section class="ob-sec">${head('完結', 'Traducciones terminadas', `<span class="r2"><a class="r" href="/catalogo?tl=completed">Ver todas →</a>${arrows('ob-car-done')}</span>`)}<div class="ob-car" id="ob-car-done">${done.map(x => cc(x, (x.chapters?.[0]?.count || 0) + ' capítulos', 'COMPLETA')).join('')}</div></section>` : ''}
      <div id="ob-s-ann"></div><div id="ob-s-rev"></div>
      ${shelf.length ? `<section class="ob-sec">${head('書架', 'Series', `<span class="r2"><a class="r" href="/catalogo">Ver todas →</a>${arrows('ob-car')}</span>`)}
        <div class="ob-car" id="ob-car">${shelf.map(x => cc(x, (x.chapters?.[0]?.count || 0) + ' cap. · ' + (TL[x.translation_status] || TL.active)[0])).join('')}${list.length > shelf.length ? `<a class="ob-cc all" href="/catalogo"><span class="cv">Ver las ${list.length} →</span></a>` : ''}</div></section>` : ''}</div>`;
    const bindCars = root => root.querySelectorAll('[data-cs]').forEach(bt => { const c = document.getElementById(bt.dataset.cs); if (!c) return; bt.onclick = () => c.scrollBy({ left: +bt.dataset.d * c.clientWidth * .85, behavior: 'smooth' });
      const upd = () => { const [l, r] = root.querySelectorAll(`[data-cs="${bt.dataset.cs}"]`); if (l) l.disabled = c.scrollLeft < 4; if (r) r.disabled = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4; }; c.addEventListener('scroll', upd, { passive: true }); upd(); });
    bindCars(app);
    if (feat.length) heroSlide(feat, 0, prog, lastCh, top);
    // Fase 2: secciones secundarias, sin bloquear lo anterior.
    const fill = (id, html) => { const el = document.getElementById(id); if (!el || !html) return; el.outerHTML = html; const sec = document.querySelector('[data-from="' + id + '"]'); if (sec) bindCars(sec); };
    const seen = new Set([...Object.keys(prog)]);
    const mini = (title, k, rows, unit, per, lst) => rows.length ? `<div class="ob-mini"><div class="ob-mh"><h3>${title}</h3><a class="r" href="/ranking?lista=${lst}&periodo=${per}">Ver →</a></div>${rows.map((r, i) => { const x = byId[r.series_id]; return `<a href="/serie/${x.slug}"><span class="n">${i + 1}</span><span class="c" style="${x.cover_path ? `background-image:url('${esc(thumb(x))}')` : `background:${esc(color(x))}`}"></span><span><b>${esc(x.title)}</b><small>${unit(r)}</small></span></a>`; }).join('')}</div>` : '';
    Promise.all([
      ...(FD.trend ? [FD.trend, FD.novedades, FD.rated, FD.ann, FD.reviews].map(d => ({ data: d })) : [
      sb.rpc('ranking_list', { p_list: 'tendencia', p_period: 'semana', p_limit: 10 }),
      sb.rpc('ranking_list', { p_list: 'novedades', p_period: 'semana', p_limit: 10 }),
      sb.rpc('ranking_list', { p_list: 'calificadas', p_period: 'historico', p_limit: 12 }),
      sb.from('teams').select('slug,name,color,ann:design->announce').not('design->announce', 'is', null),
      sb.rpc('home_reviews', { p_limit: 6 })]),
      u ? sb.rpc('reader_stats') : { data: null },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id).limit(60) : { data: [] },
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] }
    ].map(p => Promise.resolve(p).catch(() => ({ data: null })))).then(async ([{ data: tr }, { data: nv }, { data: rt }, { data: an }, { data: rv }, { data: st }, { data: fo }, { data: rc }]) => {
      if (location.pathname !== '/') return;
      const T = (tr || []).filter(r => byId[r.series_id] && +r.score > 0).slice(0, 5), N = (nv || []).filter(r => byId[r.series_id]).slice(0, 5);
      if (T.length || N.length) fill('ob-s-trend', `<section class="ob-sec" data-from="ob-s-trend">${head('勢い', 'En movimiento', '<span class="r2"><span class="mono" style="font-size:12px">esta semana</span></span>')}<div class="ob-minis">${mini('Tendencia', 't', T, r => '+' + Math.round(+r.score).toLocaleString('es-MX') + ' lectores vs. semana pasada', 'semana', 'tendencia')}${mini('Novedades en ascenso', 'n', N, r => Math.round(+r.score).toLocaleString('es-MX') + ' lectores · menos de 30 días', 'semana', 'novedades')}</div></section>`);
      const R = (rt || []).filter(r => byId[r.series_id]).slice(0, 12);
      if (R.length) fill('ob-s-rated', `<section class="ob-sec" data-from="ob-s-rated">${head('評価', 'Mejor calificadas', `<span class="r2"><a class="r" href="/ranking?lista=calificadas&periodo=historico">Ver ranking →</a>${arrows('ob-car-rt')}</span>`)}<div class="ob-car" id="ob-car-rt">${R.map(r => cc(byId[r.series_id], '★ ' + (+r.score).toFixed(1) + ' · ' + r.votes + ' votos', '★ ' + (+r.score).toFixed(1))).join('')}</div></section>`);
      const today = new Date().toISOString().slice(0, 10);
      const A = (an || []).filter(t => t.ann && (t.ann.title || t.ann.text) && (!t.ann.until || t.ann.until >= today)).sort((a, b) => new Date(b.ann.at || 0) - new Date(a.ann.at || 0)).slice(0, 4);
      if (A.length) fill('ob-s-ann', `<section class="ob-sec" data-from="ob-s-ann">${head('告知', 'Anuncios de los equipos')}<div class="ob-anns">${A.map(t => `<article class="ob-ann" style="--tc:${esc(t.color || '#f2c230')}"><a class="tm" href="/equipo/${esc(t.slug)}">${esc(t.name)}</a>${t.ann.at ? `<span class="mono">${ago(t.ann.at)}</span>` : ''}${t.ann.title ? `<h3>${esc(t.ann.title)}</h3>` : ''}${t.ann.text ? `<p>${esc(t.ann.text)}</p>` : ''}${t.ann.url && /^(https:\/\/|\/)/.test(t.ann.url) ? `<a class="go" href="${esc(t.ann.url)}"${t.ann.url.startsWith('/') ? '' : ' target="_blank" rel="noopener"'}>${esc(t.ann.label || 'Ver más')} →</a>` : `<a class="go" href="/equipo/${esc(t.slug)}">Ir a la página del equipo →</a>`}</article>`).join('')}</div></section>`);
      const BU = new Set([...(window.__obiBlocks?.values() || [])].map(b => b.username)), V = (Array.isArray(rv) ? rv : []).filter(r => byId[r.series_id] && !(r.username && BU.has(r.username))).slice(0, 6);
      if (V.length) fill('ob-s-rev', `<section class="ob-sec" data-from="ob-s-rev">${head('書評', 'Reseñas recientes')}<div class="ob-revs">${V.map(r => `<a class="ob-rev" href="/serie/${esc(r.slug)}"><span class="c" style="${r.cover_path ? `background-image:url('${esc(thumb(r))}')` : ''}"></span><span><b>${esc(r.title)}</b>${r.score ? `<span class="st" aria-label="${r.score} de 5">${'★'.repeat(r.score)}<i>${'★'.repeat(5 - r.score)}</i></span>` : ''}<q>${esc(r.body)}</q><small>${esc(r.anon ? 'Lector anónimo' : r.username || 'Lector')} · ${ago(r.at)}</small></span></a>`).join('')}</div></section>`);
      if (!u) return;
      const fol = (fo || []).map(r => r.series_id).filter(id => byId[id]); fol.forEach(id => seen.add(id));
      if (fol.length) { const read = new Set((rc || []).map(r => r.chapter_id));
        const { data: chs } = await sb.from('chapters').select('id,num,series_id').eq('status', 'published').is('deleted_at', null).or('publish_at.is.null,publish_at.lte.' + new Date().toISOString()).in('series_id', fol).order('num');
        const P = fol.map(id => { const l = (chs || []).filter(c => c.series_id === id), un = l.filter(c => !read.has(c.id)); return { s: byId[id], un: un.length, next: un[0], last: lastCh[id]?.publish_at }; }).filter(x => x.un > 0 && !(x.s.translation_status === 'completed' && !prog[x.s.id])).sort((a, b) => new Date(b.last || 0) - new Date(a.last || 0)).slice(0, 12);
        if (P.length && location.pathname === '/') fill('ob-s-pend', `<section class="ob-sec" data-from="ob-s-pend">${head('未読', 'Pendientes', `<span class="r2"><a class="r" href="/biblioteca?t=pendientes">Ver todas →</a>${arrows('ob-car-pend')}</span>`)}<div class="ob-car" id="ob-car-pend">${P.map(x => `<a class="ob-cc" href="/leer/${x.s.slug}/${x.next.num}">${cover(x.s, x.un + ' sin leer')}<b>${esc(x.s.title)}</b><small>Sigue en el cap. ${x.next.num}</small></a>`).join('')}</div></section>`); }
      const fav = (st?.genres || []).map(g => g.g);
      if (fav.length) { const wk = Object.fromEntries(rkWv.map(r => [r.series_id, +r.score]));
        const score = x => (x.genres || []).reduce((n, g) => n + (fav.length - Math.max(0, fav.indexOf(g))) * (fav.includes(g) ? 1 : 0), 0);
        const F = list.filter(x => !seen.has(x.id) && score(x) > 0).sort((a, b) => score(b) - score(a) || (wk[b.id] || 0) - (wk[a.id] || 0) || (b.views || 0) - (a.views || 0)).slice(0, 15);
        if (F.length) fill('ob-s-foryou', `<section class="ob-sec" data-from="ob-s-foryou">${head('推薦', 'Para ti', `<span class="r2"><span class="mono" style="font-size:12px">porque lees ${esc(fav.slice(0, 2).join(' y '))}</span>${arrows('ob-car-fy')}</span>`)}<div class="ob-car" id="ob-car-fy">${F.map(x => cc(x, esc((x.genres || []).filter(g => fav.includes(g)).slice(0, 2).join(' · ')))).join('')}</div></section>`); }
    });
  }
  function heroSlide(feat, i, prog, lastCh, top = {}){
    clearTimeout(heroT); const el = $('#hero'); if (!el) return;
    const s = feat[i], p = prog[s.id], lc = lastCh[s.id], n = p?.chapter_num || lc?.num || 1; const fresh = lc && Date.now() - new Date(lc.publish_at) < 7 * 864e5;
    const tag = (s.synopsis || '').split(/(?<=[.!?…])\s/)[0].slice(0, 90);
    el.innerHTML = `<span class="ob-vk" aria-hidden="true">新刊案内</span>
      <div class="ob-cov"><div class="f" style="${s.cover_path ? `background-image:url('${esc(matchMedia('(max-width: 700px)').matches ? thumb(s) : media(s.cover_path))}')` : ''}"></div></div>
      <div class="ob-txt"><span class="ob-kick">第${KN(lc?.num || 1)}章${fresh ? ' · 新刊' : ''}</span><br><span class="ob-badge">${fresh ? 'NUEVO · CAP. ' + (lc?.num || 1) : 'CAP. ' + (lc?.num || 1) + (lc ? ' · ' + ago(lc.publish_at).toUpperCase() : '')}</span>${top[s.id] ? `<a class="rk-bdg" href="/ranking" style="margin:0 0 0 10px;vertical-align:middle"><b>#${top[s.id]}</b>Top de la semana</a>` : ''}
        <h1><a class="ob-h1a" href="/serie/${s.slug}">${esc(s.title)}</a></h1>${tag ? `<p class="ob-tag">${esc(tag)}</p>` : ''}<p class="ob-syn">${esc(s.synopsis ? ((s.synopsis || '').slice(tag.length).trim() || s.synopsis) : [s.author && ('De ' + s.author), s.teams?.name && ('traducida por ' + s.teams.name), (s.chapters?.[0]?.count || 0) + ' capítulos en español'].filter(Boolean).join(' · ') + '.')}</p>
        <div class="ob-acts"><a class="a1" href="/leer/${s.slug}/${n}">${p ? 'Continuar capítulo ' + n : 'Leer capítulo ' + (lc?.num || 1)}</a><a class="a2" href="/serie/${s.slug}">Ver la serie</a></div></div>
      ${feat.length > 1 ? `<div class="ob-pager">${feat.map((f, j) => `<button data-j="${j}" class="${j === i ? 'on' : ''}">${String(j + 1).padStart(2, '0')}${j === i ? ' · ' + esc(f.short || f.title).slice(0, 14) : ''}</button>`).join('')}<button data-j="${(i + 1) % feat.length}" aria-label="Siguiente">›</button></div>` : ''}`;
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => heroSlide(feat, +b.dataset.j, prog, lastCh, top));
    if (feat.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) heroT = setTimeout(() => { if (document.body.contains(el)) heroSlide(feat, el.matches(':hover') ? i : (i + 1) % feat.length, prog, lastCh, top); }, 8000);
  }
  const card = (s, st, lc) => `<a class="ui-card" href="/serie/${s.slug}" data-id="${s.id}">${st ? `<span class="ui-st ${st[1]}">${esc(st[0])}</span>` : ''}${book(s, null, true)}<h3>${esc(s.title)}</h3><span class="meta">${pill(s.translation_status)}<span>${s.chapters?.[0]?.count ?? 0} cap.</span>${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</span>${lc ? `<span class="last">Último: cap. ${lc.num} · ${ago(lc.publish_at)}</span>` : ''}</a>`;

  const ficha = (s, st, lc, i) => `<a class="ui-fc" href="/serie/${s.slug}" data-id="${s.id}" style="--c:${esc(color(s))};--d:${Math.min(i, 8) * 0.05}s">
      <span class="cv" style="${s.cover_path ? `background-image:url('${esc(thumb(s))}')` : ''}"></span>
      <span class="bd"><span class="t">${esc(s.title)}</span>${s.original || s.author ? `<span class="o">${esc([s.original, s.author].filter(Boolean).join(' · '))}</span>` : ''}${s.synopsis ? `<span class="sy">${esc(s.synopsis)}</span>` : ''}
        <span class="m">${s.chapters?.[0]?.count ?? 0} cap. · ${(TL[s.translation_status] || TL.active)[0]}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}${lc ? ' · último: cap. ' + lc.num + ', ' + ago(lc.publish_at) : ''}${s.adult ? ' · <span class="x">+18</span>' : ''}</span></span>
      <span class="side">${st ? `<span class="ui-seal ${st[1]}">${esc(st[0])}</span>` : '<span></span>'}<span class="jp">第${KN(i + 1)}号</span></span></a>`;

  // ---------- Catálogo ----------
  
  async function catalog(){
    app.innerHTML = '<p class="mono">Cargando el catálogo…</p>';
    const u = getUser(), F = readF();
    const lastQ = () => sb.from('chapters').select('num,publish_at,series_id').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).limit(500);
    const [{ data }, { data: latest }, prog, folR, { data: rkw }, { data: rkh }] = await Promise.all([
      sb.from('series').select(SERIES),
      sb.from('series_last').select('series_id,num,publish_at').then(r => r.error ? lastQ() : r, lastQ),
      progressMap(),
      u ? sb.from('follows').select('series_id').eq('user_id', u.id) : { data: [] },
      sb.from('rankings').select('series_id,pos').eq('list', 'leidas').eq('period', 'semana'), sb.from('rankings').select('series_id,pos').eq('list', 'leidas').eq('period', 'historico')]);
    const rkRows = (rkw || []).length ? rkw : (rkh || []), RK = Object.fromEntries(rkRows.map(r => [r.series_id, r.pos])), rkLbl = (rkw || []).length ? 'de la semana' : 'histórico';
    const all = (data || []).filter(s => !['abandoned', 'withdrawn'].includes(s.translation_status) && (!hidS(s) || F.gin.some(g => (s.genres || []).includes(g))));
    const last = {}; (latest || []).forEach(c => { last[c.series_id] ||= c; });
    const fol = new Set((folR.data || []).map(r => r.series_id)), nCh = s => s.chapters?.[0]?.count || 0;
    const status = s => { const p = prog[s.id], lc = last[s.id];
      if (p && lc && lc.num > p.chapter_num && new Date(lc.publish_at) > new Date(p.updated_at)) return ['Nuevo · cap. ' + lc.num, 'new'];
      if (p) return ['Leyendo · cap. ' + p.chapter_num, 'reading'];
      if (fol.has(s.id)) return ['Siguiendo', 'follow'];
      return null; };
    const SORT = { popular: ['Más leídas', (a, b) => (b.views || 0) - (a.views || 0)], ranking: ['Ranking ' + rkLbl, (a, b) => (RK[a.id] ?? 1e9) - (RK[b.id] ?? 1e9) || (b.views || 0) - (a.views || 0)], recent: ['Actualizadas', (a, b) => new Date(last[b.id]?.publish_at || 0) - new Date(last[a.id]?.publish_at || 0)], az: ['Título A–Z', (a, b) => a.title.localeCompare(b.title, 'es')], chapters: ['Más capítulos', (a, b) => nCh(b) - nCh(a)] };
    const genres = [...new Set(all.flatMap(s => s.genres || []))].sort((a, b) => a.localeCompare(b, 'es'));
    const types = [...new Set(all.map(s => s.work_type || 'Novela ligera'))].sort();
    const origs = Object.keys(OR).filter(k => all.some(s => s.original_status === k));
    const row = (label, f, opts, all = 'Todas') => `<div class="ui-frow"><span class="ui-lbl">${label}</span><div class="ui-chips"><button class="ui-chip" data-f="${f}" data-v="">${all}</button>${opts.map(([v, l]) => `<button class="ui-chip" data-f="${f}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`;
    let view = localStorage.getItem('obi-cat-view') === 'portadas' ? 'portadas' : 'fichero';
    const col = (label, f, opts, all = 'Todas') => `<div class="ui-fcol"><span class="ui-lbl">${label}</span><div class="ui-chips"><button class="ui-chip" data-f="${f}" data-v="">${all}</button>${opts.map(([v, l]) => `<button class="ui-chip" data-f="${f}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`;
    app.innerHTML = `<div class="ui-cath"><div><h1>Catálogo</h1><p>Fichero completo de la biblioteca OBI.</p></div><span class="kj" aria-hidden="true">目録</span></div>
      <div class="ui-filters">
        <input id="cat-q" type="search" placeholder="Buscar por título, título original, autor o etiqueta" value="${esc(F.q)}">
        <details class="ui-fdet" ${matchMedia('(max-width:720px)').matches ? '' : 'open'}><summary>Filtros <b id="cat-nf" hidden></b></summary><div class="ui-fbody">
          <div class="ui-fcols">
            ${col('Traducción', 'tl', ['active', 'paused', 'completed'].map(k => [k, TL[k][0]]))}
            ${origs.length ? col('Obra original', 'orig', origs.map(k => [k, OR[k]])) : ''}
            ${types.length > 1 ? col('Tipo de obra', 'type', types.map(t => [t, t]), 'Todos') : ''}
            ${col('Extensión', 'len', Object.entries(LEN).map(([k, [l]]) => [k, l]))}
            <div class="ui-fcol"><span class="ui-lbl">Ordenar por</span><div class="ui-chips">${Object.entries(SORT).map(([k, [l]]) => `<button class="ui-chip" data-sort="${k}">${l}</button>`).join('')}</div></div>
          </div>
          <div class="ui-fcol"><span class="ui-lbl">Géneros · un toque incluye, dos excluyen</span><div class="ui-chips">${genres.map(g => `<button class="ui-chip" data-g="${esc(g)}" title="Toca para incluir · otra vez para excluir · otra más para quitar">${esc(g)}</button>`).join('') || '<span class="mono">Sin géneros</span>'}</div></div>
        </div></details>
        <div class="ui-fend"><span style="display:flex;gap:8px 18px;flex-wrap:wrap"><label class="ui-tog"><input type="checkbox" id="cat-adult" ${F.adult ? '' : 'checked'}> Ocultar series +18</label><label class="ui-tog"><input type="checkbox" id="cat-top" ${F.top ? 'checked' : ''}> Solo Top 10 ${rkLbl}</label></span>
          <div class="r"><span class="ui-chips" role="group" aria-label="Vista"><button class="ui-chip" data-view="fichero">Fichero</button><button class="ui-chip" data-view="portadas">Portadas</button></span><span class="cnt" id="cat-count"></span><button class="ui-lnk" id="cat-clear" hidden>Limpiar filtros</button></div></div>
      </div>
      <div id="cat-grid"></div>
      <div class="ui-qv" hidden></div>`;
    const pass = f => { const q = norm(f.q.trim()); return s => { const g = s.genres || [];
      return (!q || norm([s.title, s.short, s.original, s.author, ...(Array.isArray(s.tags) ? s.tags : [])].join(' ')).includes(q))
        && f.gin.every(x => g.includes(x)) && !f.gout.some(x => g.includes(x))
        && (!f.tl || s.translation_status === f.tl) && (!f.orig || s.original_status === f.orig)
        && (!f.type || (s.work_type || 'Novela ligera') === f.type) && (!f.len || LEN[f.len]?.[1](nCh(s))) && (f.adult || !s.adult) && (!f.top || (RK[s.id] || 99) <= 10); }; };
    const actives = () => [
      ...(F.q.trim() ? [['la búsqueda «' + F.q.trim() + '»', f => { f.q = ''; }]] : []),
      ...F.gin.map(g => ['solo ' + g, f => { f.gin = f.gin.filter(x => x !== g); }]),
      ...F.gout.map(g => ['sin ' + g, f => { f.gout = f.gout.filter(x => x !== g); }]),
      ...(F.tl ? [[TL[F.tl]?.[0] || F.tl, f => { f.tl = ''; }]] : []),
      ...(F.orig ? [['original ' + (OR[F.orig] || F.orig).toLowerCase(), f => { f.orig = ''; }]] : []),
      ...(F.type ? [[F.type, f => { f.type = ''; }]] : []),
      ...(F.len ? [[LEN[F.len]?.[0] || F.len, f => { f.len = ''; }]] : []),
      ...(!F.adult ? [['ocultar +18', f => { f.adult = true; }]] : []),
      ...(F.top ? [['solo Top 10', f => { f.top = false; }]] : [])];
    const clone = () => ({ ...F, gin: [...F.gin], gout: [...F.gout] });
    const draw = () => {
      const list = all.filter(pass(F)).sort((SORT[F.sort] || SORT.popular)[1]), act = actives();
      const grid = $('#cat-grid'); grid.className = view === 'fichero' ? 'ui-fich' : 'ui-grid ob-anim';
      document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('on', b.dataset.view === view); b.setAttribute('aria-pressed', b.dataset.view === view); });
      if (list.length) grid.innerHTML = list.map((s, i) => view === 'fichero' ? ficha(s, status(s), last[s.id], i) : card(s, status(s), last[s.id])).join('');
      else {
        const tips = act.map(([label, undo], i) => { const f = clone(); undo(f); return { i, label, n: all.filter(pass(f)).length }; }).filter(t => t.n).sort((x, y) => y.n - x.n).slice(0, 4);
        $('#cat-grid').innerHTML = `<div class="ui-empty"><p><strong>Ninguna obra coincide con estos filtros.</strong></p>${tips.length ? `<div class="ui-chips">${tips.map(t => `<button class="ui-chip" data-undo="${t.i}">Quitar ${esc(t.label)} · ${t.n} ${t.n === 1 ? 'obra' : 'obras'}</button>`).join('')}</div>` : '<p class="mono">Prueba con otra búsqueda.</p>'}<button class="ui-chip" data-undo="all" style="justify-self:start">Limpiar todos los filtros</button></div>`;
        $('#cat-grid').querySelectorAll('[data-undo]').forEach(btn => btn.onclick = () => { if (btn.dataset.undo === 'all') return $('#cat-clear').click(); act[+btn.dataset.undo][1](F); if (!F.q) $('#cat-q').value = ''; $('#cat-adult').checked = !F.adult; draw(); });
      }
      $('#cat-count').textContent = `${list.length} de ${all.length} obras`;
      document.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', F[b.dataset.f] === b.dataset.v));
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('on', F.sort === b.dataset.sort));
      document.querySelectorAll('[data-g]').forEach(b => { const g = b.dataset.g, i = F.gin.includes(g), o = F.gout.includes(g); b.classList.toggle('on', i); b.classList.toggle('out', o); b.setAttribute('aria-pressed', i ? 'true' : o ? 'mixed' : 'false'); });
      const nf = act.filter(([l]) => !l.startsWith('la búsqueda')).length; $('#cat-nf').hidden = !nf; $('#cat-nf').textContent = nf;
      $('#cat-clear').hidden = !act.length;
      writeF(F);
    };
    // vista rápida
    let qvFrom = null;
    const closeQV = () => { const qv = $('.ui-qv'); if (!qv || qv.hidden) return; qv.hidden = true; document.body.style.overflow = ''; qvFrom?.focus({ preventScroll: true }); };
    async function openQV(id, from){
      const s = all.find(x => x.id === id); if (!s) return; qvFrom = from;
      const qv = $('.ui-qv'), p = prog[s.id], lc = last[s.id], st = status(s);
      const paint = (first, following) => {
        const n = p?.chapter_num || first;
        qv.innerHTML = `<div class="ui-qvc" role="dialog" aria-modal="true" aria-labelledby="qv-t" style="--c:${esc(color(s))}">
          <button class="ui-qx" aria-label="Cerrar">×</button>
          ${book(s)}
          <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}</span>
            <h2 id="qv-t">${esc(s.title)}</h2>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
            <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).slice(0, 6).map(g => `<span class="ui-chip" style="cursor:default">${esc(g)}</span>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
            ${s.synopsis ? `<p class="syn">${esc(s.synopsis)}</p>` : '<p class="mono" style="margin:14px 0">Sin sinopsis todavía.</p>'}
            <p class="mono" style="margin:0 0 16px">${nCh(s)} capítulos${lc ? ' · último: cap. ' + lc.num + ' · ' + ago(lc.publish_at) : ''}${st ? ' · ' + esc(st[0]) : ''}</p>
            <div class="acts">${n ? `<a class="btn" href="/leer/${s.slug}/${n}">${p ? 'Continuar · cap. ' + p.chapter_num : 'Empezar a leer'}</a>` : ''}<button class="btn ghost" id="qv-follow">${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/serie/${s.slug}">Ver ficha completa</a></div>
          </div></div>`;
        qv.querySelector('.ui-qx').onclick = closeQV;
        qv.querySelectorAll('.ui-qvc a').forEach(a => a.addEventListener('click', () => { qv.hidden = true; document.body.style.overflow = ''; }));
        qv.querySelector('#qv-follow').onclick = async e => {
          if (!getUser()) { closeQV(); return go('/entrar'); }
          const b = e.currentTarget; b.disabled = true; const on = fol.has(s.id);
          const r = on ? await sb.from('follows').delete().eq('user_id', getUser().id).eq('series_id', s.id) : await sb.from('follows').upsert({ series_id: s.id, user_id: getUser().id });
          b.disabled = false; if (r.error) return toast(r.error.message);
          on ? fol.delete(s.id) : fol.add(s.id); toast(on ? 'Ya no sigues esta serie' : 'Siguiendo · te avisaremos de cada volumen');
          paint(first, !on); draw();
        };
      };
      paint(null, fol.has(s.id)); qv.hidden = false; document.body.style.overflow = 'hidden'; qv.querySelector('.ui-qx').focus({ preventScroll: true });
      if (!p) { const { data: f } = await sb.from('chapters').select('num').eq('series_id', s.id).eq('status', 'published').is('deleted_at', null).order('num').limit(1); if (!qv.hidden) { paint(f?.[0]?.num || null, fol.has(s.id)); qv.querySelector('.ui-qx').focus({ preventScroll: true }); } }
    }
    $('#cat-grid').addEventListener('click', e => { const a = e.target.closest('a.ui-card, a.ui-fc'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return; e.preventDefault(); e.stopPropagation(); openQV(a.dataset.id, a); });
    const mq = matchMedia('(max-width:720px)'), det = $('.ui-fdet'), onMq = e => { if (!e.matches && det && document.body.contains(det)) det.open = true; else if (!document.body.contains(det)) mq.removeEventListener('change', onMq); };
    mq.addEventListener('change', onMq);
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; localStorage.setItem('obi-cat-view', view); draw(); });
    $('.ui-qv').addEventListener('click', e => { if (e.target.classList.contains('ui-qv')) closeQV(); });
    const onKey = e => { if (!document.body.contains($('.ui-qv'))) return removeEventListener('keydown', onKey); if (e.key === 'Escape') closeQV(); };
    addEventListener('keydown', onKey);
    let qt; $('#cat-q').oninput = e => { F.q = e.target.value; clearTimeout(qt); qt = setTimeout(draw, 150); };
    $('#cat-adult').onchange = e => { F.adult = !e.target.checked; draw(); };
    $('#cat-top').onchange = e => { F.top = e.target.checked; if (F.top && F.sort === 'popular') F.sort = 'ranking'; draw(); };
    $('#cat-clear').onclick = () => { Object.assign(F, { q: '', gin: [], gout: [], adult: true, top: false }); $('#cat-top').checked = false; FK.forEach(([k]) => F[k] = ''); $('#cat-q').value = ''; $('#cat-adult').checked = false; draw(); };
    document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { F[b.dataset.f] = b.dataset.v; draw(); });
    document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { F.sort = b.dataset.sort; draw(); });
    document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g;
      if (F.gin.includes(g)) { F.gin = F.gin.filter(x => x !== g); F.gout.push(g); }
      else if (F.gout.includes(g)) F.gout = F.gout.filter(x => x !== g);
      else F.gin.push(g); draw(); });
    draw();
  }

  // ---------- Lanzamientos ----------
  async function releases(){
    app.innerHTML = '<p class="mono">Cargando lanzamientos…</p>';
    const u = getUser(), qs = new URLSearchParams(location.search);
    const R = { team: qs.get('equipo') || '', hide: qs.get('pendientes') === '1', dense: localStorage.getItem('obi-rel-dense') === '1', showMuted: false, type: qs.get('tipo') || '', mine: qs.get('sigo') === '1', shown: 20, by: qs.get('ver') === 'volumen' ? 'vol' : qs.get('ver') === 'capitulo' ? 'cap' : (localStorage.getItem('obi-rel-by') === 'vol' ? 'vol' : 'cap') };
    const prog = await progressMap();
    const [{ data: chs }, { data: ser }, readR, folR, pend] = await Promise.all([
      sb.from('chapters').select('id,num,vol,volume_id,title,publish_at,series_id,volumes(num)').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).order('num', { ascending: false }).limit(400),
      sb.from('series').select(SERIES),
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id) : { data: [] },
      pendingMap(prog)]);
    const byId = Object.fromEntries((ser || []).map(s => [s.id, s])), read = new Set((readR.data || []).map(r => r.chapter_id)), fol = new Set((folR.data || []).map(r => r.series_id));
    const seenKey = 'obi-rel-seen', seen = +localStorage.getItem(seenKey) || 0;
    const groups = []; const gi = {};
    (chs || []).forEach(c => { const s = byId[c.series_id]; if (!s || ['withdrawn'].includes(s.translation_status)) return; if (!gi[s.id]) { gi[s.id] = { s, list: [] }; groups.push(gi[s.id]); } gi[s.id].list.push(c); });
    groups.forEach(g => g.list.sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at) || b.num - a.num));
    groups.sort((a, b) => new Date(b.list[0].publish_at) - new Date(a.list[0].publish_at));
    const vnum = c => c.volumes?.num ?? c.vol, sameV = (a, b) => a.volume_id && b.volume_id ? a.volume_id === b.volume_id : a.vol === b.vol;
    const types = [...new Set(groups.map(g => g.s.work_type || 'Novela ligera'))].sort();
    const teams = [...new Set(groups.map(g => g.s.teams?.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    let muted; try { muted = new Set(JSON.parse(localStorage.getItem('obi-rel-muted') || '[]')); } catch { muted = new Set(); }
    const saveMuted = () => localStorage.setItem('obi-rel-muted', JSON.stringify([...muted]));
    const DAY = 864e5, startOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return +x; }, today = startOf(Date.now());
    const bucket = d => { const t = startOf(d); return t >= today ? 'Hoy' : t >= today - DAY ? 'Ayer' : t >= today - 6 * DAY ? 'Esta semana' : 'Antes'; };
    app.innerHTML = `<div class="ui-cath"><div><h1>Lanzamientos</h1><p>Lo último de cada serie, agrupado por obra.</p></div><span class="kj" aria-hidden="true">新刊</span></div>
      <div class="ui-rbar"><div class="ui-chips"><button class="ui-chip" data-rt="">Todos</button>${types.map(t => `<button class="ui-chip" data-rt="${esc(t)}">${esc(t)}</button>`).join('')}</div><div class="ui-chips" role="group" aria-label="Mostrar"><button class="ui-chip" data-by="cap">Por capítulo</button><button class="ui-chip" data-by="vol">Por volumen</button></div>${u ? '<label class="ui-tog"><input type="checkbox" id="rel-mine"> Solo las que sigo</label>' : ''}${teams.length > 1 ? `<select id="rel-team" aria-label="Equipo de traducción"><option value="">Todos los equipos</option>${teams.map(t => `<option ${t === R.team ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}${u ? '<label class="ui-tog"><input type="checkbox" id="rel-hide"> Ocultar lo leído</label>' : ''}<button class="ui-chip" id="rel-dense">Vista compacta</button><button class="ui-lnk" id="rel-muted" hidden></button><span class="mono" style="margin-left:auto"><a href="/calendario">Próximos lanzamientos →</a></span></div>
      <div class="ui-mlist" id="rel-mlist" hidden></div><div id="rel"></div>`;
    const item = (s, c) => `<a class="it${read.has(c.id) ? ' read' : ''}${new Date(c.publish_at) > seen && seen && !read.has(c.id) ? ' new' : ''}" href="/leer/${s.slug}/${c.num}" title="${esc(c.title)}"><b>Cap. ${c.num}</b><small>${ago(c.publish_at)}</small></a>`;
    const nextOf = s => { const p = prog[s.id]; if (!p) return null; const n = p.pct > 0.95 ? p.chapter_num + 1 : p.chapter_num; return gi[s.id].list.some(c => c.num >= n) ? n : null; };
    const acts = g => { const s = g.s, n = nextOf(s), unread = g.list.filter(c => !read.has(c.id)).length;
      return `<div class="acts">${n ? `<a class="btn" href="/leer/${s.slug}/${n}">Continuar · cap. ${n}</a>` : ''}<button class="btn ghost" data-fol="${s.id}">${fol.has(s.id) ? '✓ Siguiendo' : 'Seguir'}</button>${u && unread ? `<button class="btn ghost" data-rd="${s.id}">Marcar ${unread === 1 ? 'como leído' : unread + ' como leídos'}</button>` : ''}<button class="btn ghost" data-mute="${s.id}" title="No mostrar esta serie en Lanzamientos">Silenciar</button></div>`; };
    const setPend = async () => { const np = await pendingMap(prog); Object.keys(pend).forEach(k => delete pend[k]); Object.assign(pend, np); };
    const toggleFollow = async s => {
      if (!getUser()) { go('/entrar'); return; }
      const on = fol.has(s.id);
      const r = on ? await sb.from('follows').delete().eq('user_id', u.id).eq('series_id', s.id) : await sb.from('follows').upsert({ series_id: s.id, user_id: u.id });
      if (r.error) { toast(r.error.message); return; }
      on ? fol.delete(s.id) : fol.add(s.id); toast(on ? 'Ya no sigues esta serie' : 'Siguiendo · te avisaremos de cada volumen');
      await setPend(); draw(); refreshBadge(); return !on;
    };
    const volGroups = () => { const out = []; groups.forEach(g => { const m = {}; g.list.forEach(c => { const k = c.volume_id || 'v' + (c.vol ?? 0); (m[k] ||= { s: g.s, list: [], key: k }).list.push(c); }); out.push(...Object.values(m)); }); return out.sort((a, b) => new Date(b.list[0].publish_at) - new Date(a.list[0].publish_at)); };
    const volCard = (g, i) => { const s = g.s, top = g.list[0], nums = g.list.map(c => c.num), lo = Math.min(...nums), hi = Math.max(...nums), n = g.list.length;
      const unread = g.list.filter(c => !read.has(c.id)).sort((a, b) => a.num - b.num), vl = vnum(top) != null ? 'Vol. ' + vnum(top) : 'Capítulos sueltos';
      return `<article class="ui-rl" style="--c:${esc(color(s))};--d:${Math.min(i, 8) * 0.04}s">
        <a class="cv" href="/serie/${s.slug}" data-id="${s.id}" aria-label="Vista rápida de ${esc(s.title)}" style="${s.cover_path ? `background-image:url('${esc(thumb(s))}')` : ''}"></a>
        <div class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a>
          <span class="mt"><b>${vl}</b> · ${n === 1 ? '1 capítulo' : n + ' capítulos'} (cap. ${lo === hi ? lo : lo + '–' + hi}) · ${ago(top.publish_at)}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}</span>
          <div class="acts">${unread.length ? `<a class="btn" href="/leer/${s.slug}/${unread[0].num}">${unread.length === n ? 'Leer ' + vl.toLowerCase() : 'Seguir en cap. ' + unread[0].num}</a>` : '<span class="mono" style="align-self:center">✓ Ya lo leíste</span>'}<button class="btn ghost" data-fol="${s.id}">${fol.has(s.id) ? '✓ Siguiendo' : 'Seguir'}</button>${u && unread.length ? `<button class="btn ghost" data-rd="${s.id}" data-vk="${esc(g.key)}">Marcar volumen como leído</button>` : ''}<button class="btn ghost" data-mute="${s.id}" title="No mostrar esta serie en Lanzamientos">Silenciar</button></div></div></article>`; };
    const rowCard = (g, i) => { const s = g.s, top = g.list[0], nums = g.list.map(c => c.num), unread = g.list.filter(c => !read.has(c.id)).sort((a, b) => a.num - b.num);
      const what = R.by === 'vol' ? `${vnum(top) != null ? 'Vol. ' + vnum(top) : 'Capítulos sueltos'} · cap. ${Math.min(...nums) === Math.max(...nums) ? nums[0] : Math.min(...nums) + '–' + Math.max(...nums)}` : g.list.slice(0, 3).map(c => 'cap. ' + c.num + (read.has(c.id) ? ' ✓' : '')).join(', ');
      const n = R.by === 'vol' ? unread[0]?.num : (nextOf(s) ?? unread[0]?.num);
      return `<article class="ui-rc" style="--c:${esc(color(s))}"><span class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a><span class="mt">${what}${pend[s.id] ? ` · <span class="pend">te ${pend[s.id] === 1 ? 'falta 1' : 'faltan ' + pend[s.id]}</span>` : ''}</span></span><span class="w">${ago(top.publish_at)}</span>${n ? `<a class="btn" href="/leer/${s.slug}/${n}">Leer cap. ${n}</a>` : '<span class="mono">✓ Leído</span>'}</article>`; };
    const draw = () => {
      const unit = n => R.by === 'vol' ? (n === 1 ? 'volumen' : 'volúmenes') : (n === 1 ? 'serie' : 'series');
      const list = (R.by === 'vol' ? volGroups() : groups).filter(g => (!R.type || (g.s.work_type || 'Novela ligera') === R.type) && (!R.mine || fol.has(g.s.id)) && (!R.team || g.s.teams?.name === R.team) && !muted.has(g.s.id) && (!R.hide || g.list.some(c => !read.has(c.id))));
      const vis = list.slice(0, R.shown); let html = '', last = '';
      vis.forEach((g, i) => {
        const b = bucket(g.list[0].publish_at);
        if (b !== last) { const n = list.filter(x => bucket(x.list[0].publish_at) === b).length; html += `<h2 class="ui-rday">${b}<span>· ${n} ${unit(n)}</span></h2>`; last = b; }
        if (R.dense) { html += rowCard(g, i); return; }
        if (R.by === 'vol') { html += volCard(g, i); return; }
        const s = g.s, top = g.list[0], sameVol = g.list.filter(c => sameV(c, top) && new Date(top.publish_at) - new Date(c.publish_at) < DAY).length;
        html += `<article class="ui-rl" style="--c:${esc(color(s))};--d:${Math.min(i, 8) * 0.04}s">
          <a class="cv" href="/serie/${s.slug}" data-id="${s.id}" aria-label="Vista rápida de ${esc(s.title)}" style="${s.cover_path ? `background-image:url('${esc(thumb(s))}')` : ''}"></a>
          <div class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a><span class="mt">${esc(s.work_type || 'Novela ligera')}${s.teams?.name ? ` · <b>${esc(s.teams.name)}</b>` : ''}${fol.has(s.id) ? ' · Siguiendo' : ''}${pend[s.id] ? ` · <span class="pend">te ${pend[s.id] === 1 ? 'falta 1 capítulo' : 'faltan ' + pend[s.id] + ' capítulos'}</span>` : ''}</span>
            <div class="its">${g.list.slice(0, 3).map(c => item(s, c)).join('')}${sameVol >= 3 ? `<a class="it vol" href="/serie/${s.slug}"><b>Vol. ${vnum(top)} completo</b><small>${sameVol} capítulos</small></a>` : ''}</div>${acts(g)}</div></article>`;
      });
      $('#rel').innerHTML = (html ? `<div class="ui-rlist${R.dense ? ' dense' : ''}">${html}</div>` : `<p class="mono">${R.mine ? 'Las series que sigues aún no tienen capítulos publicados.' : (R.hide ? 'Ya leíste todo lo publicado aquí. ' : '') + 'No hay lanzamientos con estos filtros.'}</p>`) + (list.length > R.shown ? `<button class="btn ghost ui-more" id="rel-more">Ver más · ${list.length - R.shown} ${unit(list.length - R.shown)}</button>` : '');
      $('#rel').querySelectorAll('.ui-rlist > .ui-rday').forEach(x => x.style.margin = ''); 
      $('#rel-more')?.addEventListener('click', () => { R.shown += 20; draw(); });
      $('#rel').querySelectorAll('[data-mute]').forEach(b => b.onclick = () => { const s = byId[b.dataset.mute]; muted.add(s.id); saveMuted(); toast('«' + s.title + '» silenciada · la recuperas en «Silenciadas»'); draw(); });
      const mb = $('#rel-muted'), ml = $('#rel-mlist'), ms = [...muted].map(id => byId[id]).filter(Boolean);
      mb.hidden = !ms.length; mb.textContent = (R.showMuted ? 'Ocultar silenciadas' : 'Silenciadas') + ' (' + ms.length + ')';
      ml.hidden = !R.showMuted || !ms.length;
      ml.innerHTML = '<span class="mono">Toca una serie para volver a mostrarla:</span>' + ms.map(s => `<button class="ui-chip" data-unmute="${s.id}">${esc(s.title)} ×</button>`).join('');
      ml.querySelectorAll('[data-unmute]').forEach(b => b.onclick = () => { muted.delete(b.dataset.unmute); saveMuted(); if (!muted.size) R.showMuted = false; draw(); });
      $('#rel-dense').classList.toggle('on', R.dense); $('#rel-dense').setAttribute('aria-pressed', R.dense);
      $('#rel').querySelectorAll('[data-fol]').forEach(b => b.onclick = async () => { b.disabled = true; await toggleFollow(byId[b.dataset.fol]); });
      $('#rel').querySelectorAll('[data-rd]').forEach(b => b.onclick = async () => {
        const g = b.dataset.vk ? volGroups().find(v => v.s.id === b.dataset.rd && v.key === b.dataset.vk) : gi[b.dataset.rd], ids = g.list.filter(c => !read.has(c.id)).map(c => c.id); b.disabled = true;
        const { error } = await sb.from('read_chapters').upsert(ids.map(chapter_id => ({ user_id: u.id, chapter_id })), { onConflict: 'user_id,chapter_id', ignoreDuplicates: true });
        if (error) { b.disabled = false; return toast(error.message); }
        ids.forEach(id => read.add(id)); await setPend();
        toast(ids.length === 1 ? 'Capítulo marcado como leído' : ids.length + ' capítulos marcados como leídos'); draw(); refreshBadge();
      });
      $('#rel').querySelectorAll('a.cv').forEach(a => a.onclick = e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); e.stopPropagation(); const s = byId[a.dataset.id]; quickView(s, { from: a, p: prog[s.id], lc: gi[s.id].list[0], following: () => fol.has(s.id), onFollow: () => toggleFollow(s) }); });
      document.querySelectorAll('[data-rt]').forEach(b => b.classList.toggle('on', b.dataset.rt === R.type));
      document.querySelectorAll('[data-by]').forEach(b => { b.classList.toggle('on', b.dataset.by === R.by); b.setAttribute('aria-pressed', b.dataset.by === R.by); });
      const p = new URLSearchParams(); if (R.type) p.set('tipo', R.type); if (R.mine) p.set('sigo', '1'); if (R.by === 'vol') p.set('ver', 'volumen'); if (R.team) p.set('equipo', R.team); if (R.hide) p.set('pendientes', '1'); history.replaceState({}, '', '/lanzamientos' + (p.toString() ? '?' + p : ''));
    };
    document.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { R.type = b.dataset.rt; R.shown = 20; draw(); });
    $('#rel-team')?.addEventListener('change', e => { R.team = e.target.value; R.shown = 20; draw(); });
    const hide = $('#rel-hide'); if (hide) { hide.checked = R.hide; hide.onchange = () => { R.hide = hide.checked; R.shown = 20; draw(); }; }
    $('#rel-dense').onclick = () => { R.dense = !R.dense; localStorage.setItem('obi-rel-dense', R.dense ? '1' : '0'); draw(); };
    $('#rel-muted').onclick = () => { R.showMuted = !R.showMuted; draw(); };
    document.querySelectorAll('[data-by]').forEach(b => b.onclick = () => { R.by = b.dataset.by; R.shown = 20; localStorage.setItem('obi-rel-by', R.by); draw(); });
    const mine = $('#rel-mine'); if (mine) { mine.checked = R.mine; mine.onchange = () => { R.mine = mine.checked; R.shown = 20; draw(); }; }
    draw();
    localStorage.setItem(seenKey, String(Date.now())); refreshBadge();
  }

  // ---------- Ficha de serie ----------
  async function series(slug){
    const { data: s } = await sb.from('series').select(SERIES).eq('slug', slug).maybeSingle();
    if (!s) { app.innerHTML = '<h1>Esta serie no está en el estante</h1><p><a href="/catalogo">Volver al catálogo</a></p>'; return; }
    const u = getUser();
    const [{ data: vols }, { data: chs }, prog, readR, folR, { data: dls }, { data: buys }] = await Promise.all([
      sb.from('volumes').select('id,num,title,cover_path,synopsis,status,external_url,external_site,external_only').eq('series_id', s.id).is('deleted_at', null).order('num'),
      sb.from('chapters').select('id,num,vol,volume_id,title,section_type,publish_at').eq('series_id', s.id).is('deleted_at', null).order('num'),
      progressMap(),
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id).eq('series_id', s.id) : { data: [] },
      sb.rpc('series_downloads', { p_series: s.id }),
      sb.from('purchase_links').select('id,volume_id,vol,store,region,fmt').eq('series_id', s.id).eq('verified', true).order('vol').order('id')]);
    const buyOf = v => (buys || []).filter(b => b.volume_id === v.id || (!b.volume_id && b.vol === v.num));
    const dlOf = v => (dls || []).filter(d => d.volume_id === v.id || (!d.volume_id && d.vol === v.num));
    const read = new Set((readR.data || []).map(r => r.chapter_id)), p = prog[s.id], following = !!(folR.data || []).length;
    const first = (chs || [])[0], allCh = chs || [], nRead = allCh.filter(c => read.has(c.id)).length;
    const pIdx = p ? allCh.findIndex(c => c.num === p.chapter_num) : -1;
    const nextUnread = allCh.slice(Math.max(0, pIdx)).find(c => !read.has(c.id) && c.num !== p?.chapter_num) || allCh.find(c => !read.has(c.id));
    const isNew = c => c.publish_at && Date.now() - new Date(c.publish_at) < 7 * 864e5 && !read.has(c.id);
    const hideRead = localStorage.getItem('obi-hide-read') === '1';
    fxCss();
    app.innerHTML = `<div class="ui-wrap">
      <section class="ui-sh" style="--c:${esc(color(s))};--bg:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}">
        ${book(s)}
        <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.demographic ? ' · ' + esc(s.demographic) : ''}</span>
          <h1>${esc(s.title)}</h1>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).map(g => `<a class="ui-chip" href="/catalogo?g=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          <div class="rk-bdgs" id="rk-bdg"></div><div class="rk-rate" id="rk-rate"></div>
          <div class="ui-facts">
            ${s.author ? `<div><span class="ui-lbl">Autor</span><b>${esc(s.author)}</b></div>` : ''}
            ${s.illustrator ? `<div><span class="ui-lbl">Ilustración</span><b>${esc(s.illustrator)}</b></div>` : ''}
            <div><span class="ui-lbl">Traducción</span><b>${s.teams?.slug ? `<a href="/equipo/${esc(s.teams.slug)}">${esc(s.teams.name)}</a>` : esc(s.teams?.name || '—')}</b></div>
            ${s.original_status ? `<div><span class="ui-lbl">Obra original</span><b>${OR[s.original_status]}</b></div>` : ''}
            ${s.sequel_status ? `<div><span class="ui-lbl">Secuela</span><b>${SQ[s.sequel_status]}</b></div>` : ''}
            <div><span class="ui-lbl">Contenido</span><b>${(vols || []).length} vol. · ${(chs || []).length} cap.</b></div>
          </div>
          <div class="acts" style="display:flex;gap:10px;flex-wrap:wrap">${first ? `<a class="btn" href="/leer/${s.slug}/${p?.chapter_num || first.num}">${p ? 'Seguir donde ibas · Cap. ' + p.chapter_num + (p.pct > .02 && p.pct < .95 ? ' · ' + Math.round(p.pct * 100) + '%' : '') : 'Empezar a leer'}</a>` : ''}${p && nextUnread && nextUnread.num !== p.chapter_num ? `<a class="btn ghost" href="/leer/${s.slug}/${nextUnread.num}">Siguiente sin leer · Cap. ${nextUnread.num}</a>` : ''}<button class="btn ghost" id="follow">${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/anotaciones/${esc(s.slug)}">Mis anotaciones</a></div>
        </div>
      </section>
      ${s.synopsis ? `<section><div class="ui-h2"><h2>Sinopsis</h2></div><p class="ui-syn">${esc(s.synopsis)}</p></section>` : ''}
      <section id="rv-sec"><div class="ui-h2"><h2>Reseñas</h2><span class="mono" id="rv-n"></span></div><div id="rv-box"><p class="mono">Cargando reseñas…</p></div></section>
      <section><div class="ui-h2"><h2>Volúmenes</h2>${u && allCh.length ? `<span class="fx-prog"><span class="mono">${nRead} de ${allCh.length} leídos</span><span class="fx-bar"><i style="width:${Math.round(nRead / allCh.length * 100)}%"></i></span>${nRead ? `<label class="ui-tog"><input type="checkbox" id="fx-hide" ${hideRead ? 'checked' : ''}> Ocultar leídos</label>` : ''}</span>` : ''}</div><div class="ui-vols${hideRead && nRead ? ' fx-hide' : ''}" id="fx-vols">
        ${(vols || []).map(v => { const list = (chs || []).filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num)); return `<article class="ui-vol"><span class="th" style="background-image:${v.cover_path ? `url('${esc(thumb(v))}')` : s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}"></span><div><span class="ui-lbl">Volumen ${v.num} · ${v.external_only && v.external_url && !list.length ? 'en el sitio del traductor' : list.length + ' capítulos'}</span><h3>${esc(v.title && v.title !== String(v.num) && v.title.length > 2 ? v.title : 'Volumen ' + v.num)}</h3>${v.synopsis ? `<p class="mono" style="margin:6px 0 0;font-size:13px;line-height:1.5">${esc(v.synopsis)}</p>` : ''}
          ${v.external_url ? `<div class="ui-dl ui-ext"><span class="ui-lbl">${v.external_only ? 'Este volumen se lee en el sitio del equipo traductor' : 'También disponible en el sitio del traductor'}</span><a class="ui-dlb ext" href="${esc(v.external_url)}" target="_blank" rel="noopener">Leer en ${esc(v.external_site || s.teams?.name || 'el sitio del traductor')} ↗<small>${esc((() => { try { return new URL(v.external_url).hostname.replace(/^www\./, ''); } catch { return ''; } })())}</small></a></div>` : ''}
          <ul class="ui-chl">${list.map(c => `<li class="${read.has(c.id) ? 'is-read' : ''}"><a href="/leer/${s.slug}/${c.num}" class="${read.has(c.id) ? 'read' : ''}${p?.chapter_num === c.num ? ' here' : ''}"><span class="n">${c.num}</span><span>${esc(c.title)}</span>${p?.chapter_num === c.num ? '<em class="fx-tag here">Aquí vas</em>' : isNew(c) ? '<em class="fx-tag">Nuevo</em>' : ''}</a></li>`).join('')}</ul>${buyOf(v).length ? `<div class="ui-dl ui-buy"><span class="ui-lbl">Compra la edición oficial</span>${buyOf(v).map(b => `<button class="ui-dlb buy" data-buy="${b.id}">${esc(b.store)}<small>${esc([b.fmt, b.region].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>` : ''}${dlOf(v).length ? `<div class="ui-dl"><span class="ui-lbl">Descargar</span>${dlOf(v).map(d => d.locked ? `<a class="ui-dlb lock" href="/apoyar" title="Solo para donadores">援 ${esc(d.fmt)}<small>${esc(d.label || d.provider || '')} · donadores</small></a>` : `<button class="ui-dlb" data-dl="${d.id}">↓ ${esc(d.fmt)}<small>${esc(d.label || d.provider || '')}</small></button>`).join('')}</div>` : ''}</div></article>`; }).join('') || '<p class="mono">Aún no hay volúmenes publicados.</p>'}
      </div></section></div>`;
    app.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { const w = window.open('about:blank', '_blank'); const { data } = await sb.rpc('purchase_open', { p_id: +b.dataset.buy }); if (data && w) { w.opener = null; w.location = data; } else w?.close(); });
    app.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { b.disabled = true; const w = window.open('about:blank', '_blank'); const { data, error } = await sb.rpc('download_open', { p_id: +b.dataset.dl }); b.disabled = false; if (error || !data) { w?.close(); return toast(error?.hint || error?.message || 'Enlace no disponible'); } if (w) { w.opener = null; w.location = data; } else location.href = data; });
    rkCss(); seriesRank(s); reviews(s);
    $('#fx-hide')?.addEventListener('change', e => { localStorage.setItem('obi-hide-read', e.target.checked ? '1' : '0'); $('#fx-vols').classList.toggle('fx-hide', e.target.checked); });
    $('#follow').onclick = async e => {
      if (!getUser()) return go('/entrar');
      const b = e.currentTarget; b.disabled = true;
      const r = following ? await sb.from('follows').delete().eq('user_id', getUser().id).eq('series_id', s.id) : await sb.from('follows').upsert({ series_id: s.id, user_id: getUser().id });
      b.disabled = false; if (r.error) return toast(r.error.message);
      toast(following ? 'Ya no sigues esta serie' : 'Siguiendo · te avisaremos de cada capítulo nuevo'); series(slug);
    };
  }
  // ---------- Ranking ----------
  const fmtN = n => Number(n).toLocaleString('es-MX');
  async function seriesRank(s){
    const [{ data: rb }, { data: rt }] = await Promise.all([sb.from('rankings').select('list,period,pos').eq('series_id', s.id).lte('pos', 10), sb.rpc('series_rating', { p_series: s.id })]);
    const bx = $('#rk-bdg'); if (bx && rb?.length) {
      const PO = ['semana', 'mes', 'hoy', 'anio', 'historico'], seen = new Set();
      const best = rb.sort((a, b) => PO.indexOf(a.period) - PO.indexOf(b.period) || a.pos - b.pos).filter(r => !seen.has(r.list) && seen.add(r.list)).slice(0, 2);
      bx.innerHTML = best.map(r => `<a class="rk-bdg" href="/ranking?lista=${r.list}&periodo=${r.period}"><b>#${r.pos}</b>${RK_L[r.list]} ${RK_PF[r.period]}</a>`).join('');
    }
    const el = $('#rk-rate'); if (!el) return;
    const r = rt || {}, mine = r.mine || 0, u = getUser(), shown = mine || Math.round(+r.avg || 0);
    el.innerHTML = `<span class="rk-stars" role="group" aria-label="Calificar">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-star="${v}" aria-label="${v} estrella${v > 1 ? 's' : ''}" aria-pressed="${v === mine}" class="${v <= shown ? (mine ? 'on' : 'avg') : ''}">★</button>`).join('')}</span><span class="mono">${r.n ? (+r.avg).toFixed(1) + ' · ' + r.n + (r.n === 1 ? ' voto' : ' votos') : 'Sin votos todavía'}${mine ? ' · tu voto: ' + mine + ' (tócalo otra vez para quitarlo)' : u ? '' : ' · entra para calificar'}</span>`;
    el.querySelectorAll('[data-star]').forEach(b => b.onclick = async () => {
      if (!getUser()) return go('/entrar');
      const v = +b.dataset.star, uid = getUser().id;
      const { error } = v === mine ? await sb.from('series_ratings').delete().eq('series_id', s.id).eq('user_id', uid) : await sb.from('series_ratings').upsert({ series_id: s.id, user_id: uid, score: v, updated_at: new Date().toISOString() });
      if (error) return toast(error.message);
      toast(v === mine ? 'Quitaste tu voto' : 'Calificaste con ' + v + (v === 1 ? ' estrella' : ' estrellas')); seriesRank(s);
    });
  }
  async function reviews(s){
    const box = $('#rv-box'); if (!box) return; rvCss();
    const { data, error } = await sb.rpc('series_reviews_list', { p_series: s.id, p_limit: 30 });
    if (!document.body.contains(box)) return;
    if (error) { box.innerHTML = '<p class="mono">No se pudieron cargar las reseñas.</p>'; return; }
    const L = data || [], mine = L.find(r => r.mine), others = L.filter(r => !r.mine && !window.__obiBlocks?.has(r.uid)), u = getUser();
    $('#rv-n').textContent = L.length ? L.length + (L.length === 1 ? ' reseña' : ' reseñas') : '';
    const stars = n => n ? `<span class="rv-st" aria-label="${n} de 5 estrellas">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>` : '';
    const item = r => `<article class="rv-it${r.mine ? ' me' : ''}"><header><span class="rv-av">${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="">` : esc((r.username || '?')[0].toUpperCase())}</span><span>${r.username && !r.anon ? `<a href="/lector/${encodeURIComponent(r.username)}">${esc(r.username)}</a>` : r.anon ? 'Lector anónimo' : 'Lector'}${r.mine ? ' · <b>tu reseña</b>' + (r.anon ? ' · anónima' : '') : ''}<small>${ago(r.at)}${r.at !== r.created_at ? ' · editada' : ''}</small></span>${stars(r.score)}</header><p>${esc(r.body).replace(/\n/g, '<br>')}</p>${r.mine ? '<div class="rv-acts"><button class="ui-lnk" data-rv="edit">Editar</button><button class="ui-lnk" data-rv="del">Borrar</button></div>' : r.ref ? `<div class="rv-acts"><button class="ui-lnk" data-rep="${esc(r.ref)}" style="color:#a89f8a;font-size:12px">Reportar</button></div>` : ''}</article>`;
    const form = (txt = '') => `<form class="rv-form" id="rv-form"><label for="rv-t" class="ui-lbl">${mine ? 'Edita tu reseña' : 'Escribe una reseña'}</label><textarea id="rv-t" rows="5" maxlength="1500" placeholder="¿Qué te pareció? Evita spoilers importantes.">${esc(txt)}</textarea><div class="rv-fr"><span class="mono" id="rv-c">${txt.length} / 1500 · mínimo 30</span><span style="display:flex;gap:8px">${mine ? '<button type="button" class="btn ghost" data-rv="cancel">Cancelar</button>' : ''}<button class="btn" type="submit">${mine ? 'Guardar cambios' : 'Publicar reseña'}</button></span></div><label class="ui-tog" style="min-height:44px"><input type="checkbox" id="rv-anon" ${mine?.anon ? 'checked' : ''}> Publicar como «Lector anónimo»</label><small class="mono">Tu calificación con estrellas se muestra junto a tu reseña. Si es anónima, no aparece tu nombre ni sale en tu carnet.</small></form>`;
    const draw = editing => {
      box.innerHTML = (u ? (mine && !editing ? item(mine) : form(mine?.body || '')) : `<p class="rv-login"><a href="/entrar">Entra</a> para escribir una reseña.</p>`)
        + (others.length ? `<div class="rv-list">${others.map(item).join('')}</div>` : (!mine ? '<p class="mono">Aún no hay reseñas. ¡Sé la primera persona en opinar!</p>' : ''));
      const t = $('#rv-t'); if (t) t.oninput = () => { $('#rv-c').textContent = t.value.length + ' / 1500 · mínimo 30'; };
      box.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => { if (!u) return go('/entrar'); const wrap = b.parentElement;
        wrap.innerHTML = `<form class="rv-rep"><label class="ui-lbl">¿Por qué reportas esta reseña?<select name="r"><option value="spoiler">Tiene spoilers sin aviso</option><option value="ofensiva">Es ofensiva o acosa a alguien</option><option value="spam">Es spam o publicidad</option><option value="otra">Otro motivo</option></select></label><input name="n" maxlength="300" placeholder="Detalle opcional"><span style="display:flex;gap:8px"><button class="btn ghost" type="button" data-x>Cancelar</button><button class="btn" type="submit">Enviar reporte</button></span></form>`;
        const fm = wrap.querySelector('form'); fm.querySelector('[data-x]').onclick = () => draw(false);
        fm.onsubmit = async e => { e.preventDefault(); const { error } = await sb.rpc('report_review', { p_series: s.id, p_ref: b.dataset.rep, p_reason: fm.r.value, p_note: fm.n.value.trim() || null });
          if (error && error.code !== '23505') return toast(error.message); wrap.innerHTML = '<span class="mono" style="font-size:12px">Gracias, el Bibliotecario lo revisará.</span>'; }; });
      box.querySelector('[data-rv="edit"]')?.addEventListener('click', () => draw(true));
      box.querySelector('[data-rv="cancel"]')?.addEventListener('click', () => draw(false));
      box.querySelector('[data-rv="del"]')?.addEventListener('click', async () => { if (!confirm('¿Borrar tu reseña?')) return; const { error } = await sb.from('series_reviews').delete().eq('series_id', s.id).eq('user_id', u.id); if (error) return toast(error.message); toast('Reseña borrada'); reviews(s); });
      const fm = $('#rv-form'); if (fm) fm.onsubmit = async e => { e.preventDefault(); const v = t.value.trim(); if (v.length < 30) return toast('La reseña necesita al menos 30 caracteres');
        const btn = fm.querySelector('[type="submit"]'); btn.disabled = true;
        const { error } = await sb.from('series_reviews').upsert({ series_id: s.id, user_id: u.id, body: v, anonymous: !!$('#rv-anon')?.checked, updated_at: new Date().toISOString() }); btn.disabled = false;
        if (error) return toast(error.message); toast(mine ? 'Reseña actualizada' : 'Reseña publicada'); reviews(s); };
    };
    draw(false);
  }
  async function ranking(){
    rkCss();
    const qs = new URLSearchParams(location.search);
    const R = { list: RK_L[qs.get('lista')] ? qs.get('lista') : 'leidas', period: RK_P[qs.get('periodo')] ? qs.get('periodo') : 'semana', genre: qs.get('genero') || '', status: ['en_curso', 'terminada'].includes(qs.get('estado')) ? qs.get('estado') : '' };
    app.innerHTML = '<p class="mono">Cargando el ranking…</p>';
    let autoHist = false;
    if (!qs.get('periodo')) { const { count } = await sb.from('rankings').select('series_id', { count: 'exact', head: true }).eq('list', R.list).eq('period', 'semana'); if (!count) { R.period = RK_OK[R.list] ? R.period : 'historico'; autoHist = R.period === 'historico'; } }
    const { data: gs } = await sb.from('series').select('genres').eq('published', true);
    const genres = [...new Set((gs || []).flatMap(x => x.genres || []))].sort((a, b) => a.localeCompare(b, 'es'));
    if (R.genre && !genres.includes(R.genre)) R.genre = '';
    app.innerHTML = `<div class="ui-cath"><div><h1>Ranking</h1><p>Las obras que más se leen, más suben y más gustan.</p></div><span class="kj" aria-hidden="true">番付</span></div>${autoHist ? '<p class="mono" id="rk-autoh" style="margin:-6px 0 18px;font-size:13px">Esta semana todavía no hay suficientes lecturas: te mostramos el ranking de todos los tiempos.</p>' : ''}
      <div class="rk-bar">
        <div class="ui-chips" role="group" aria-label="Lista">${Object.entries(RK_L).map(([k, l]) => `<button class="ui-chip" data-rl="${k}">${l}</button>`).join('')}</div>
        <div class="rk-row"><div class="rk-seg" role="group" aria-label="Periodo">${Object.entries(RK_P).map(([k, l]) => `<button type="button" data-rp="${k}">${l}</button>`).join('')}</div>
          <label class="rk-sel"><span class="ui-lbl">Género</span><select id="rk-g"><option value="">Todos</option>${genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select></label>
          <div class="rk-seg" role="group" aria-label="Estado">${[['', 'Todas'], ['en_curso', 'En curso'], ['terminada', 'Terminadas']].map(([k, l]) => `<button type="button" data-rs="${k}">${l}</button>`).join('')}</div></div>
        <p class="mono rk-desc" id="rk-desc"></p>
      </div><div id="rk"></div>`;
    $('#rk-g').value = R.genre;
    const sync = () => {
      const ok = RK_OK[R.list]; if (ok && !ok.includes(R.period)) R.period = 'semana';
      const q = new URLSearchParams(); if (R.list !== 'leidas') q.set('lista', R.list); if (R.period !== 'semana') q.set('periodo', R.period); if (R.genre) q.set('genero', R.genre); if (R.status) q.set('estado', R.status);
      history.replaceState({}, '', '/ranking' + (q.toString() ? '?' + q : ''));
      app.querySelectorAll('[data-rl]').forEach(b => { b.classList.toggle('on', b.dataset.rl === R.list); b.setAttribute('aria-pressed', b.dataset.rl === R.list); });
      app.querySelectorAll('[data-rp]').forEach(b => { b.classList.toggle('on', b.dataset.rp === R.period); b.disabled = !!ok && !ok.includes(b.dataset.rp); b.setAttribute('aria-pressed', b.dataset.rp === R.period); });
      app.querySelectorAll('[data-rs]').forEach(b => { b.classList.toggle('on', b.dataset.rs === R.status); b.setAttribute('aria-pressed', b.dataset.rs === R.status); });
      $('#rk-desc').textContent = RK_D[R.list];
    };
    let tk = 0;
    const draw = async () => {
      sync(); const my = ++tk, box = $('#rk'); box.innerHTML = '<p class="mono">Cargando…</p>';
      const { data, error } = await sb.rpc('ranking_list', { p_list: R.list, p_period: R.period, p_genre: R.genre || null, p_status: R.status || null, p_limit: 20 });
      if (my !== tk || !document.body.contains(box)) return;
      if (error) { box.innerHTML = `<p style="color:#f59e7a">No se pudo cargar el ranking: ${esc(error.message)}</p>`; return; }
      if (!data?.length) { box.innerHTML = `<div class="ui-empty"><p><strong>${R.genre || R.status ? 'Ninguna obra con estos filtros entra en esta lista.' : RK_E[R.list] || 'Aún no hay lecturas en este periodo.'}</strong></p></div>`; return; }
      const { data: ss } = await sb.from('series').select(SERIES).in('id', data.map(r => r.series_id));
      if (my !== tk) return;
      const by = Object.fromEntries((ss || []).map(s => [s.id, s])), filtered = !!(R.genre || R.status), anyPrev = data.some(r => r.prev_pos != null);
      const mv = r => filtered ? '' : r.prev_pos == null ? (anyPrev ? '<span class="rk-mv new">Nuevo</span>' : '') : r.prev_pos > r.gpos ? `<span class="rk-mv up" title="Subió ${r.prev_pos - r.gpos} desde la última actualización">▲${r.prev_pos - r.gpos}</span>` : r.prev_pos < r.gpos ? `<span class="rk-mv dn" title="Bajó ${r.gpos - r.prev_pos} desde la última actualización">▼${r.gpos - r.prev_pos}</span>` : '<span class="rk-mv eq" title="Sin cambios">=</span>';
      const sc = r => ({ leidas: fmtN(r.score) + ' lecturas', tendencia: '+' + fmtN(r.score) + ' lecturas', calificadas: (+r.score).toFixed(1) + ' ★ · ' + r.votes + ' votos', terminadas: fmtN(r.score) + (+r.score === 1 ? ' lector' : ' lectores') + ' al día', novedades: fmtN(r.score) + ' lecturas' })[R.list];
      box.innerHTML = `<div class="rk-grid">${data.filter(r => by[r.series_id]).map(r => { const s = by[r.series_id]; return `<a class="rk-c${r.pos <= 3 ? ' top' : ''}" href="/serie/${esc(s.slug)}" style="--c:${esc(color(s))}"><span class="rk-n" aria-label="Puesto ${r.pos}">${r.pos}</span>${book(s, null, true)}<span class="rk-b"><b>${esc(s.title)}</b>${s.teams?.name ? `<small>${esc(s.teams.name)}</small>` : ''}<span class="rk-s">${sc(r)}${mv(r)}</span></span></a>`; }).join('')}</div>
        <p class="mono rk-upd">Actualizado ${ago(data[0].computed_at)} · se recalcula cada 6 horas${filtered ? ' · con filtros no se muestra el movimiento' : ''}</p>`;
    };
    app.querySelectorAll('[data-rl]').forEach(b => b.onclick = () => { R.list = b.dataset.rl; draw(); });
    app.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { R.period = b.dataset.rp; draw(); });
    app.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { R.status = b.dataset.rs; draw(); });
    $('#rk-g').onchange = e => { R.genre = e.target.value; draw(); };
    draw();
  }
  async function teamRank(root, teamId){
    const { data: tw } = await sb.from('series').select('id,slug,title,cover_path').eq('team_id', teamId).eq('published', true);
    if (!tw?.length) return;
    const { data: tr } = await sb.from('rankings').select('series_id,pos').eq('list', 'leidas').eq('period', 'semana').lte('pos', 50).in('series_id', tw.map(w => w.id)).order('pos');
    const box = root.querySelector('.tp2-in'); if (!tr?.length || !box || !document.body.contains(root)) return;
    rkCss(); const by = Object.fromEntries(tw.map(w => [w.id, w]));
    box.insertAdjacentHTML('beforeend', `<section class="tp2-sec tp2-rk"><div class="tp2-sh"><h2>En el ranking</h2><a href="/ranking">Más leídas de la semana →</a></div><div class="tp2-rkl">${tr.map(r => { const w = by[r.series_id]; return `<a class="tp2-rki" href="/serie/${esc(w.slug)}"><span class="n">#${r.pos}</span><span class="cv" style="${w.cover_path ? `background-image:url('${esc(thumb(w))}')` : ''}"></span><b>${esc(w.title)}</b><span class="m">de 50</span></a>`; }).join('')}</div></section>`);
  }
  // ---------- página pública del equipo (diseño en teampage.js) ----------
  async function team(slug){
    const [TP, AN] = await Promise.all([import('/teampage.js?v=12'), import('/anim.js?v=8')]); TP.ensureFonts();
    app.innerHTML = '<p class="mono">Abriendo la página del equipo…</p>';
    const D = await TP.loadTeamData(sb, slug);
    if (!D) { app.innerHTML = '<h1>Este equipo no está en el estante</h1><p><a href="/catalogo">Ir al catálogo</a></p>'; return; }
    const tok = new URLSearchParams(location.search).get('vista');
    let design = D.t.design, draft = false;
    if (tok && /^[0-9a-f-]{36}$/i.test(tok)) { const { data } = await sb.rpc('team_design_preview', { p_slug: slug, p_token: tok }); if (data) { design = data; draft = true; } }
    let canEdit = false; const u2 = (await sb.auth.getUser()).data.user;
    if (u2) { const { data: p } = await sb.rpc('my_team_permissions', { t: D.t.id }); canEdit = !!p?.profile; }
    TP.ensureFonts([TP.normalize(design, D.t.color).font]);
    document.title = D.t.name + ' · El Obi del Lector';
    let md = document.querySelector('meta[name=description]'); if (!md) { md = document.createElement('meta'); md.name = 'description'; document.head.appendChild(md); } md.content = (TP.normalize(design).motto || D.t.bio || 'Grupo traductor en El Obi del Lector').slice(0, 160);
    const top = (canEdit ? '<div class="tp2-top"><a class="tp2-edit" href="/estudio/preferencias">⚙ Personalizar</a></div>' : '') + (draft ? '<div class="tp2-draft"><b>Vista previa del borrador</b><span>Así se verá la página cuando el equipo publique los cambios.</span></div>' : '');
    app.innerHTML = `<div class="tp2-page">${TP.render(D, design, { esc, media, top })}</div>`;
    const root = app.querySelector('.tp2'); TP.bind(root); if (!draft) teamRank(root, D.t.id);
    team.stop?.(); team.stop = AN.animate(root, TP.effective(design, D.t.color));
    const off = () => { if (!document.body.contains(root)) { team.stop?.(); team.stop = null; removeEventListener('popstate', off); } }; addEventListener('popstate', off); document.addEventListener('click', function cl(e){ if (e.target.closest('a[href^="/"]')) { setTimeout(() => { if (!document.body.contains(root)) { team.stop?.(); team.stop = null; document.removeEventListener('click', cl, true); } }, 50); } }, true);
    let following = false, n = 0;
    const [{ data: cnt }, fr] = await Promise.all([sb.rpc('team_followers', { p_team: D.t.id }), u2 ? sb.from('team_follows').select('team_id').eq('team_id', D.t.id).eq('user_id', u2.id) : { data: [] }]);
    n = cnt || 0; following = !!fr.data?.length; TP.fillFollow(root, following, n);
    root.addEventListener('click', async e => { const b = e.target.closest('[data-follow]'); if (!b) return; if (!u2) return go('/entrar'); b.disabled = true;
      const { error } = following ? await sb.from('team_follows').delete().eq('team_id', D.t.id).eq('user_id', u2.id) : await sb.from('team_follows').insert({ team_id: D.t.id, user_id: u2.id });
      b.disabled = false; if (error) return toast(error.message); following = !following; n += following ? 1 : -1; TP.fillFollow(root, following, n); toast(following ? 'Ahora sigues a ' + D.t.name : 'Dejaste de seguir a ' + D.t.name); });
  }
  return { home, catalog, series, releases, refreshBadge, team, ranking, search };
}
