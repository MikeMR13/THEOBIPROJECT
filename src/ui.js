// Vistas públicas con la identidad visual de El Obi del Lector: Inicio, Catálogo y Ficha de serie.
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
@media(prefers-reduced-motion:reduce){.ui-book,.ui-card .ui-book{transition:none}}
`;
const CSS2 = "\n.top{display:flex!important;align-items:center;gap:12px 28px;padding:10px clamp(16px,4vw,48px)!important;position:sticky;top:0;z-index:50;background:rgba(13,12,10,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);transition:padding .25s}.top.ob-min{padding-top:5px!important;padding-bottom:5px!important}\n.ob-brand{display:flex;align-items:center;gap:10px;flex:none;text-decoration:none;color:var(--paper)}.ob-word b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px;line-height:1;white-space:nowrap}\n.ob-seal{width:30px;height:30px;border:2px solid var(--gold);border-radius:5px;color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:16px;transform:rotate(-6deg)}\n.ob-nav{display:flex;align-items:center;gap:22px;flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none}.ob-nav::-webkit-scrollbar{display:none}.ob-nav a{color:var(--paper);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap;padding:8px 0}.ob-nav a.on{color:var(--gold);box-shadow:inset 0 -2px 0 var(--gold)}\n.ob-nav .ob-sup{margin-left:auto;border:1px solid var(--gold);color:var(--gold);padding:6px 12px;font-size:13px}\n.ob-tools{display:flex;align-items:center;gap:10px;flex:none}.ob-search{width:200px;padding:8px 12px;background:#16140f;border:1px solid #2f2a20;color:var(--paper);font:inherit;font-size:13px;transition:width .25s,border-color .2s}.ob-search:focus{width:300px;border-color:var(--gold);outline:none}\n.ob-user{position:relative}.ob-user>summary{list-style:none;display:flex;align-items:center;cursor:pointer;padding:3px;border:1px solid transparent}.ob-user>summary::-webkit-details-marker{display:none}.ob-user[open]>summary,.ob-user>summary:hover{border-color:var(--gold)}\n.ob-av{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--gold);color:#0d0c0a;font-weight:700;overflow:hidden}.ob-av img{width:100%;height:100%;object-fit:cover}\n.ob-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:230px;background:#16140f;border:1px solid #3d3628;border-top:3px solid var(--gold);display:grid;padding:6px;box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:60}.ob-menu .who2{padding:8px 10px 10px;border-bottom:1px solid var(--line);margin-bottom:4px;display:grid;gap:3px}.ob-menu .who2 small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}\n.ob-menu a,.ob-menu button{display:block;text-align:left;background:none;border:none;color:var(--paper);font:inherit;font-size:14px;padding:9px 10px;text-decoration:none;cursor:pointer}.ob-menu a:hover,.ob-menu button:hover{background:#221f17;color:var(--gold)}\nmain:has(>.ob-page){padding-top:0}.ob-mast{display:flex;justify-content:space-between;gap:4px 16px;flex-wrap:wrap;align-items:baseline;padding:10px 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase}.ob-mast b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:15px;letter-spacing:.25em;color:#cfc6b0;text-transform:none}\n@media(max-width:1100px){.top{flex-wrap:wrap}.ob-tools{margin-left:auto}.ob-nav{order:3;flex-basis:100%}}\n@media(max-width:640px){.ob-tools{order:2;flex:1 1 100%}.ob-search,.ob-search:focus{width:auto;flex:1;min-width:0}.ob-word b{font-size:19px}}\n#session{display:flex;gap:8px;align-items:center}\n.ob-tick{position:relative;overflow:hidden;background:var(--gold);color:#0d0c0a;margin:0 calc(-1 * clamp(16px,4vw,56px));border-top:2px solid #0d0c0a;border-bottom:2px solid #0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:9px 0}.ob-track{display:flex;width:max-content;animation:obTicker 32s linear infinite;will-change:transform}.ob-track>span{display:flex;flex:none;gap:48px;padding-right:48px;white-space:nowrap}.ob-tick:hover .ob-track{animation-play-state:paused}\n@keyframes obTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes obIn{from{opacity:0;transform:perspective(1800px) rotateY(-14deg) translateX(40px);transform-origin:left center;filter:brightness(.5)}to{opacity:1;transform:none;filter:none}}@keyframes obCard{from{opacity:0;transform:perspective(900px) rotateX(-60deg) translateY(24px);transform-origin:center bottom}to{opacity:1;transform:none}}@keyframes obSpine{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}@keyframes obSeal{0%{opacity:0;transform:scale(1.8) rotate(-18deg)}60%{opacity:1;transform:scale(.94) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}@keyframes obSlide{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}@keyframes obCover{from{opacity:0;transform:perspective(1200px) rotateY(28deg) translateX(-30px)}to{opacity:1;transform:none}}.ob-page{animation:obIn .75s cubic-bezier(.2,.8,.2,1) both}.ob-seal{animation:obSeal .6s .4s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*{animation:obCard .6s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*:nth-child(2){animation-delay:.06s}.ob-anim>*:nth-child(3){animation-delay:.12s}.ob-anim>*:nth-child(4){animation-delay:.18s}.ob-anim>*:nth-child(5){animation-delay:.24s}.ob-anim>*:nth-child(6){animation-delay:.3s}.ob-anim>*:nth-child(n+7){animation-delay:.36s}.ob-shelf>.ob-spine{animation:obSpine .7s cubic-bezier(.2,.8,.2,1) both}.ob-shelf>.ob-spine:nth-child(2){animation-delay:.07s}.ob-shelf>.ob-spine:nth-child(3){animation-delay:.14s}.ob-shelf>.ob-spine:nth-child(4){animation-delay:.21s}.ob-shelf>.ob-spine:nth-child(n+5){animation-delay:.28s}.ob-hero .ob-cov{animation:obCover .7s cubic-bezier(.2,.8,.2,1) both}.ob-hero .ob-txt{animation:obSlide .6s .1s cubic-bezier(.2,.8,.2,1) both}.ob-urow{transition:background .2s,padding-left .25s}.ob-urow:hover{padding-left:18px}.ob-ritem .n{transition:transform .3s}.ob-ritem:hover .n{transform:scale(1.12) rotate(-4deg)}.ob-acts .a1,.ob-acts .a2{transition:transform .2s,filter .2s}.ob-acts .a1:hover,.ob-acts .a2:hover{transform:translateY(-2px);filter:brightness(1.08)}\n.ob-hero{position:relative;margin:0 calc(-1 * clamp(16px,4vw,56px));padding:clamp(40px,6vw,90px) clamp(16px,4vw,56px) 70px;display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:clamp(28px,6vw,80px);align-items:center;overflow:hidden;\n background-color:#0d0c0a;background-image:radial-gradient(circle at 100% 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 0 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 50% 100%,#1a170f 10%,#0d0c0a 11%,#0d0c0a 23%,#1a170f 24%,#1a170f 30%,#0d0c0a 31%,#0d0c0a 43%,#1a170f 44%,#1a170f 50%,#0d0c0a 51%);background-size:52px 26px}\n.ob-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0d0c0a 0%,rgba(13,12,10,.6) 45%,rgba(13,12,10,.2) 100%);pointer-events:none}.ob-hero>*{position:relative;z-index:1}\n.ob-vk{position:absolute;right:clamp(10px,2vw,30px);top:40px;writing-mode:vertical-rl;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:clamp(40px,5vw,60px);color:transparent;-webkit-text-stroke:1.5px #6b5a24;letter-spacing:.05em;z-index:1}\n.ob-cov{position:relative;padding-bottom:14px}.ob-cov .f{aspect-ratio:3/4;border:3px solid #f3ecd9;background:#1c1a14 center/cover;box-shadow:0 30px 60px rgba(0,0,0,.6)}.ob-cov .f:not([style*=url])::before{content:'';position:absolute;inset:3px;background:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-cov .code{position:absolute;top:14px;right:14px;background:#f3ecd9;color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:4px 8px}\n.ob-cov::after{content:'';position:absolute;left:-24px;right:-24px;bottom:0;height:12px;background:#2f2a20;border-top:3px solid var(--gold)}\n.ob-kick{font-family:'Shippori Mincho B1',serif;color:var(--gold);letter-spacing:.3em;font-size:15px}\n.ob-badge{display:inline-block;margin:16px 0 18px;background:var(--gold);color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.12em;padding:6px 12px}\n.ob-hero h1{margin:0;font-size:clamp(40px,6vw,76px);line-height:1.02;text-wrap:balance}\n.ob-tag{font-family:Literata,serif;font-style:italic;color:#d9a441;font-size:20px;margin:14px 0}\n.ob-syn{font-family:Literata,serif;font-size:18px;line-height:1.6;color:#e3dccb;max-width:44ch;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}\n.ob-acts{display:flex;gap:14px;flex-wrap:wrap;margin-top:26px}.ob-acts .a1{background:#d9922b;color:#0d0c0a;padding:15px 26px;font-weight:700;text-decoration:none}.ob-acts .a2{border:2px solid #f3ecd9;color:#f3ecd9;padding:13px 24px;font-weight:700;text-decoration:none}\n.ob-pager{position:absolute;bottom:22px;left:clamp(16px,4vw,56px);display:flex;gap:8px;z-index:2}.ob-pager button{min-width:44px;height:36px;background:#16140f;border:1px solid #3d3628;color:#8c846f;font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;padding:0 10px}.ob-pager button.on{background:#d9922b;color:#0d0c0a;border-color:#d9922b;min-width:130px;text-align:left}\n.ob-sec{padding:60px 0;border-top:1px solid var(--line)}\n.ob-st{display:flex;align-items:center;gap:16px;margin-bottom:28px}.ob-st .k{background:var(--gold);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:15px;line-height:1.1;width:26px;padding:4px 0;text-align:center;writing-mode:vertical-rl}.ob-st h2{margin:0;font-size:36px}.ob-st .r{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}.ob-st a.r{color:var(--gold);font-family:inherit;font-weight:700;font-size:14px}\n.ob-upd{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:0 40px}\n.ob-urow{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:20px;align-items:center;padding:16px 10px;border-top:1px solid var(--line);color:var(--paper);text-decoration:none}.ob-urow:hover{background:#14120d;color:var(--paper)}\n.ob-urow i{width:10px;height:10px}.ob-urow b{display:block;font-size:14px}.ob-urow span.t{font-family:Literata,serif;font-size:16px;color:#e3dccb}.ob-urow time{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}\n.ob-rank{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:40px 30px}\n.ob-ritem{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px;color:var(--paper);text-decoration:none}.ob-ritem .n{font-family:'Shippori Mincho B1',serif;font-size:72px;line-height:.8;color:var(--gold);align-self:start;margin-top:-6px}.ob-ritem:nth-child(n+3) .n{color:#d9922b}\n.ob-ritem .c{aspect-ratio:4/3;background:#1c1a14 center/cover;border:1px solid #2f2a20;transition:transform .3s}.ob-ritem:hover .c{transform:translateY(-6px)}.ob-ritem .c:not([style*=url]){background-image:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-ritem b{grid-column:2;font-size:15px;margin-top:10px}.ob-ritem small{grid-column:2;font-family:'IBM Plex Mono',monospace;color:#d9a441;font-size:12px}\n.ob-shelf{display:flex;align-items:flex-end;gap:6px;padding:0 18px;border-bottom:8px solid #2f2a20;box-shadow:0 3px 0 var(--gold);min-height:320px;overflow-x:auto}\n.ob-spine{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px 0 10px;color:#0d0c0a;text-decoration:none;box-shadow:inset -6px 0 10px rgba(0,0,0,.18),inset 3px 0 0 rgba(255,255,255,.25);transition:transform .3s}.ob-spine:hover{transform:translateY(-14px);color:#0d0c0a}\n.ob-spine::before,.ob-spine::after{content:'';width:70%;height:2px;background:rgba(0,0,0,.35)}.ob-spine span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'Shippori Mincho B1',serif;font-size:19px;line-height:1.15;flex:1;padding:12px 0;overflow:hidden}.ob-spine em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;background:#f3ecd9;padding:2px 6px;margin:8px 0}\n.ob-tick,.ob-hero{margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important}.ob-hero{padding-left:max(clamp(16px,4vw,56px),calc((100vw - 1240px)/2 + 56px));padding-right:max(clamp(16px,4vw,56px),calc((100vw - 1240px)/2 + 56px))}.ob-hero .ob-pager{left:max(clamp(16px,4vw,56px),calc((100vw - 1240px)/2 + 56px))}.ob-vk{right:max(20px,calc((100vw - 1240px)/2))}body{overflow-x:hidden}.ob-cov{max-width:360px}\n@media(max-width:820px){.ob-hero{grid-template-columns:1fr}.ob-cov{max-width:260px}.ob-vk{display:none}}\n@media(prefers-reduced-motion:reduce){.ob-page,.ob-anim>*,.ob-shelf>.ob-spine,.ob-hero .ob-cov,.ob-hero .ob-txt,.ob-seal{animation:none}.ob-track{animation-duration:90s}}\n";
const LEN = { short: ['Cortas · menos de 20 cap.', n => n < 20], long: ['Largas · 20 cap. o más', n => n >= 20] };
const FK = [['tl', 'tl'], ['orig', 'original'], ['type', 'tipo'], ['len', 'largo']];
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const readF = () => { const u = new URLSearchParams(location.search), l = k => (u.get(k) || '').split(',').map(decodeURIComponent).filter(Boolean); const f = { q: u.get('q') || '', gin: l('g'), gout: l('sin'), adult: u.get('adulto') !== '0', sort: u.get('orden') || 'popular' }; FK.forEach(([k, p]) => f[k] = u.get(p) || ''); return f; };
const writeF = f => { const u = new URLSearchParams(); if (f.q.trim()) u.set('q', f.q.trim()); if (f.gin.length) u.set('g', f.gin.join(',')); if (f.gout.length) u.set('sin', f.gout.join(',')); FK.forEach(([k, p]) => f[k] && u.set(p, f[k])); if (!f.adult) u.set('adulto', '0'); if (f.sort !== 'popular') u.set('orden', f.sort); const qs = u.toString(); history.replaceState({}, '', '/catalogo' + (qs ? '?' + qs : '')); };
const TL = { active: ['En traducción', '#a9d18e'], paused: ['En pausa', '#f2c230'], completed: ['Traducción completa', '#8cc3f2'], abandoned: ['Abandonada', '#f59e7a'], withdrawn: ['Retirada', '#f59e7a'] };
const OR = { publishing: 'En publicación', completed: 'Completada', paused: 'En pausa', cancelled: 'Cancelada' };
const SQ = { waiting: 'En espera de secuela', none: 'Sin secuela confirmada', announced: 'Secuela anunciada', publishing: 'Secuela en publicación', completed: 'Secuela completada' };

export function createUI({ sb, app, $, esc, toast, go, getUser, url }){
  if (!document.getElementById('ui-css')) { const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.appendChild(s); const s2 = document.createElement('style'); s2.textContent = CSS2; document.head.appendChild(s2); }
  chrome();
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const color = s => s?.theme?.color || s?.teams?.color || '#f2c230';
  const ago = d => { if (!d) return ''; const s = (Date.now() - new Date(d)) / 1000; if (s < 3600) return 'hace ' + Math.max(1, Math.round(s / 60)) + ' min'; if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h'; if (s < 2592000) return 'hace ' + Math.round(s / 86400) + ' d'; return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const book = (s, sub) => `<div class="ui-book" style="--c:${esc(color(s))};background-image:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"><div class="ui-obi"><small>${esc(sub || s.teams?.name || 'El Obi del Lector')}</small>${esc(s.short || s.title)}</div></div>`;
  const pill = st => { const [l, c] = TL[st] || TL.active; return `<span class="ui-pill" style="color:${c}">${l}</span>`; };
  const SERIES = 'id,slug,title,short,original,author,illustrator,publisher,synopsis,genres,tags,theme,cover_path,adult,work_type,demographic,translation_status,original_status,sequel_status,views,teams(name,slug,color),chapters(count),volumes(count)';
  function chrome(){
    const top = document.querySelector('header.top'); if (!top || top.dataset.ob) return; top.dataset.ob = '1';
    const ses = document.getElementById('session');
    top.innerHTML = `<a href="/" class="ob-brand"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a>
      <nav class="ob-nav">${[['/','Inicio'],['/catalogo','Catálogo'],['/calendario','Lanzamientos'],['/biblioteca','Mi biblioteca'],['/calendario','Calendario'],['/catalogo?orden=popular','Ranking']].map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}<a href="/apoyar" class="ob-sup">援 Apoyar</a></nav>
      <div class="ob-tools"><input class="ob-search" id="ob-q" type="search" placeholder="Buscar títulos, autores…" aria-label="Buscar"></div>`;
    addEventListener('scroll', () => top.classList.toggle('ob-min', scrollY > 40), { passive: true });
    top.querySelector('.ob-tools').appendChild(ses);
    top.querySelector('#ob-q').onkeydown = e => { if (e.key === 'Enter') { const q = e.target.value.trim(); go('/catalogo' + (q ? '?q=' + encodeURIComponent(q) : '')); } };
    const mark = () => top.querySelectorAll('.ob-nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === location.pathname || (a.textContent === 'Catálogo' && location.pathname.startsWith('/serie'))));
    addEventListener('popstate', mark); document.addEventListener('click', () => setTimeout(mark, 0)); mark();
  }
  const KN = n => { const d = '〇一二三四五六七八九'; if (n < 10) return d[n]; if (n < 20) return '十' + (n % 10 ? d[n % 10] : ''); if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : ''); return String(n); };
  const code = s => 'LN-' + (s.slug || 'obi').replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() + '-' + String((s.views || 0) % 1000).padStart(3, '0');
  const SPINES = ['#f2c230', '#efe6d2', '#d9822b', '#e0a526', '#b5a27a'];
  async function progressMap(){ const u = getUser(); if (!u) return {}; const { data } = await sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at').eq('user_id', u.id); return Object.fromEntries((data || []).map(r => [r.series_id, r])); }

  // ---------- Inicio ----------
  let heroT;
  async function home(){
    app.innerHTML = '<p class="mono">Cargando la biblioteca…</p>';
    const [{ data: series }, { data: latest }, prog] = await Promise.all([
      sb.from('series').select(SERIES).order('views', { ascending: false }),
      sb.from('chapters').select('num,title,publish_at,series_id').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).limit(40),
      progressMap()]);
    const list = series || [], byId = Object.fromEntries(list.map(s => [s.id, s]));
    const lastCh = {}; (latest || []).forEach(c => { lastCh[c.series_id] ||= c; });
    const feat = [...list].sort((a, b) => new Date(lastCh[b.id]?.publish_at || 0) - new Date(lastCh[a.id]?.publish_at || 0)).slice(0, 5);
    const cont = Object.values(prog).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).filter(p => byId[p.series_id]).slice(0, 6);
    const upd = (latest || []).filter(c => byId[c.series_id]).slice(0, 6);
    app.innerHTML = `<div class="ob-page">
      <div class="ob-mast"><b>翻訳図書館</b><span>Biblioteca de novelas ligeras · Español latino</span></div>
      ${upd.length ? `<div class="ob-tick" aria-label="Novedades"><div class="ob-track">${[0, 1].map(k => `<span${k ? ' aria-hidden="true"' : ''}>${[...upd, ...upd].slice(0, Math.max(6, upd.length)).map((c, i) => `<span>${i === 0 ? 'NUEVO · ' : '★ '}${esc(byId[c.series_id].title)} · Cap. ${c.num}</span>`).join('')}</span>`).join('')}</div></div>` : ''}
      ${feat.length ? '<section class="ob-hero" id="hero"></section>' : ''}
      ${cont.length ? `<section class="ob-sec"><div class="ob-st"><span class="k">続読</span><h2>Continuar leyendo</h2><a class="r" href="/biblioteca">Mi biblioteca →</a></div><div class="ui-cont ob-anim">${cont.map(p => { const s = byId[p.series_id]; return `<a class="ui-ccard" href="/leer/${s.slug}/${p.chapter_num}" style="--c:${esc(color(s))}"><span class="th" style="background-image:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"></span><span><span class="ui-lbl">Capítulo ${p.chapter_num} · ${ago(p.updated_at)}</span><br><strong>${esc(s.title)}</strong><span class="ui-bar"><i style="width:${Math.round((p.pct || 0) * 100)}%"></i></span></span></a>`; }).join('')}</div></section>` : ''}
      <section class="ob-sec"><div class="ob-st"><span class="k">新着</span><h2>Últimas actualizaciones</h2><a class="r" href="/calendario">Calendario →</a></div>
        <div class="ob-upd ob-anim">${upd.map(c => { const s = byId[c.series_id]; return `<a class="ob-urow" href="/leer/${s.slug}/${c.num}"><i style="background:${esc(color(s))}"></i><span><b>${esc(s.title)}</b><span class="t">Cap. ${c.num} — ${esc(c.title)}</span></span><time>${ago(c.publish_at)}</time></a>`; }).join('') || '<p class="mono">Aún no hay capítulos publicados.</p>'}</div></section>
      <section class="ob-sec"><div class="ob-st"><span class="k">人気</span><h2>Más leídas</h2><span class="r">por vistas · últimos 30 días</span></div>
        <div class="ob-rank ob-anim">${list.slice(0, 6).map((s, i) => `<a class="ob-ritem" href="/serie/${s.slug}"><span class="n">${i + 1}</span><span class="c" style="background-image:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"></span><b>${esc(s.title)}</b><small>${(s.views || 0).toLocaleString('es-MX')} vistas · ${s.chapters?.[0]?.count || 0} cap.</small></a>`).join('')}</div></section>
      <section class="ob-sec"><div class="ob-st"><span class="k">書架</span><h2>Series</h2><a class="r" href="/catalogo">Ver todas →</a></div>
        <div class="ob-shelf">${list.map((s, i) => `<a class="ob-spine" href="/serie/${s.slug}" style="background:${esc(s.theme?.spine || SPINES[i % SPINES.length])};height:${250 + ((s.chapters?.[0]?.count || 0) % 5) * 14}px"><span>${esc(s.title)}</span><em>${esc((s.slug || '').replace(/[^a-z]/g, '').slice(0, 3).toUpperCase())}</em></a>`).join('')}</div></section></div>`;
    if (feat.length) heroSlide(feat, 0, prog, lastCh);
  }
  function heroSlide(feat, i, prog, lastCh){
    clearTimeout(heroT); const el = $('#hero'); if (!el) return;
    const s = feat[i], p = prog[s.id], lc = lastCh[s.id], n = p?.chapter_num || lc?.num || 1;
    const tag = (s.synopsis || '').split(/(?<=[.!?…])\s/)[0].slice(0, 90);
    el.innerHTML = `<span class="ob-vk" aria-hidden="true">新刊案内</span>
      <div class="ob-cov"><div class="f" style="${s.cover_path ? `background-image:url('${esc(media(s.cover_path))}')` : ''}"></div></div>
      <div class="ob-txt"><span class="ob-kick">第${KN(lc?.num || 1)}章 · 新刊</span><br><span class="ob-badge">NUEVO · CAP. ${lc?.num || 1}</span>
        <h1>${esc(s.title)}</h1>${tag ? `<p class="ob-tag">${esc(tag)}</p>` : ''}<p class="ob-syn">${esc(s.synopsis ? ((s.synopsis || '').slice(tag.length).trim() || s.synopsis) : [s.author && ('De ' + s.author), s.teams?.name && ('traducida por ' + s.teams.name), (s.chapters?.[0]?.count || 0) + ' capítulos en español'].filter(Boolean).join(' · ') + '.')}</p>
        <div class="ob-acts"><a class="a1" href="/leer/${s.slug}/${n}">${p ? 'Continuar capítulo ' + n : 'Leer capítulo ' + (lc?.num || 1)}</a><a class="a2" href="/serie/${s.slug}">Ver la serie</a></div></div>
      ${feat.length > 1 ? `<div class="ob-pager">${feat.map((f, j) => `<button data-j="${j}" class="${j === i ? 'on' : ''}">${String(j + 1).padStart(2, '0')}${j === i ? ' · ' + esc(f.short || f.title).slice(0, 14) : ''}</button>`).join('')}<button data-j="${(i + 1) % feat.length}" aria-label="Siguiente">›</button></div>` : ''}`;
    el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => heroSlide(feat, +b.dataset.j, prog, lastCh));
    if (feat.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) heroT = setTimeout(() => { if (document.body.contains(el)) heroSlide(feat, el.matches(':hover') ? i : (i + 1) % feat.length, prog, lastCh); }, 8000);
  }
  const card = (s, st) => `<a class="ui-card" href="/serie/${s.slug}">${st ? `<span class="ui-st ${st[1]}">${esc(st[0])}</span>` : ''}${book(s)}<h3>${esc(s.title)}</h3><span class="meta">${pill(s.translation_status)}<span>${s.chapters?.[0]?.count ?? 0} cap.</span>${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</span></a>`;

  // ---------- Catálogo ----------
  
  async function catalog(){
    app.innerHTML = '<p class="mono">Cargando el catálogo…</p>';
    const u = getUser(), F = readF();
    const [{ data }, { data: latest }, prog, folR] = await Promise.all([
      sb.from('series').select(SERIES),
      sb.from('chapters').select('num,publish_at,series_id').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).limit(500),
      progressMap(),
      u ? sb.from('follows').select('series_id').eq('user_id', u.id) : { data: [] }]);
    const all = (data || []).filter(s => !['abandoned', 'withdrawn'].includes(s.translation_status));
    const last = {}; (latest || []).forEach(c => { last[c.series_id] ||= c; });
    const fol = new Set((folR.data || []).map(r => r.series_id)), nCh = s => s.chapters?.[0]?.count || 0;
    const status = s => { const p = prog[s.id], lc = last[s.id];
      if (p && lc && lc.num > p.chapter_num && new Date(lc.publish_at) > new Date(p.updated_at)) return ['Nuevo · cap. ' + lc.num, 'new'];
      if (p) return ['Leyendo · cap. ' + p.chapter_num, 'reading'];
      if (fol.has(s.id)) return ['Siguiendo', 'follow'];
      return null; };
    const SORT = { popular: ['Más leídas', (a, b) => (b.views || 0) - (a.views || 0)], recent: ['Actualizadas', (a, b) => new Date(last[b.id]?.publish_at || 0) - new Date(last[a.id]?.publish_at || 0)], az: ['Título A–Z', (a, b) => a.title.localeCompare(b.title, 'es')], chapters: ['Más capítulos', (a, b) => nCh(b) - nCh(a)] };
    const genres = [...new Set(all.flatMap(s => s.genres || []))].sort((a, b) => a.localeCompare(b, 'es'));
    const types = [...new Set(all.map(s => s.work_type || 'Novela ligera'))].sort();
    const origs = Object.keys(OR).filter(k => all.some(s => s.original_status === k));
    const row = (label, f, opts, all = 'Todas') => `<div class="ui-frow"><span class="ui-lbl">${label}</span><div class="ui-chips"><button class="ui-chip" data-f="${f}" data-v="">${all}</button>${opts.map(([v, l]) => `<button class="ui-chip" data-f="${f}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`;
    app.innerHTML = `<div class="ui-h2"><h1 style="margin:0">Catálogo</h1><span class="mono" id="cat-count"></span></div>
      <div class="ui-filters">
        <div class="ui-fbar"><input id="cat-q" type="search" placeholder="Buscar por título, título original, autor o etiqueta" value="${esc(F.q)}"><span class="ui-chips"><label class="ui-tog"><input type="checkbox" id="cat-adult" ${F.adult ? '' : 'checked'}> Ocultar +18</label><button class="ui-chip" id="cat-clear" hidden>Limpiar filtros</button></span></div>
        <div class="ui-frow"><span class="ui-lbl">Género</span><div class="ui-chips">${genres.map(g => `<button class="ui-chip" data-g="${esc(g)}" title="Toca para incluir · otra vez para excluir · otra más para quitar">${esc(g)}</button>`).join('') || '<span class="mono">Sin géneros</span>'}</div></div>
        <p class="mono" style="margin:0;font-size:11px">Toca un género para incluirlo; otra vez, para excluirlo.</p>
        ${row('Traducción', 'tl', ['active', 'paused', 'completed'].map(k => [k, TL[k][0]]))}
        ${origs.length ? row('Original', 'orig', origs.map(k => [k, OR[k]])) : ''}
        ${types.length > 1 ? row('Tipo', 'type', types.map(t => [t, t]), 'Todos') : ''}
        ${row('Longitud', 'len', Object.entries(LEN).map(([k, [l]]) => [k, l]))}
        <div class="ui-frow"><span class="ui-lbl">Orden</span><div class="ui-chips">${Object.entries(SORT).map(([k, [l]]) => `<button class="ui-chip" data-sort="${k}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="ui-grid ob-anim" id="cat-grid"></div>`;
    const draw = () => {
      const q = norm(F.q.trim());
      const list = all.filter(s => { const g = s.genres || [];
        return (!q || norm([s.title, s.short, s.original, s.author, ...(Array.isArray(s.tags) ? s.tags : [])].join(' ')).includes(q))
          && F.gin.every(x => g.includes(x)) && !F.gout.some(x => g.includes(x))
          && (!F.tl || s.translation_status === F.tl) && (!F.orig || s.original_status === F.orig)
          && (!F.type || (s.work_type || 'Novela ligera') === F.type) && (!F.len || LEN[F.len]?.[1](nCh(s))) && (F.adult || !s.adult); })
        .sort((SORT[F.sort] || SORT.popular)[1]);
      $('#cat-grid').innerHTML = list.map(s => card(s, status(s))).join('') || '<p class="mono">Ninguna obra coincide con estos filtros.</p>';
      $('#cat-count').textContent = `${list.length} de ${all.length} obras`;
      document.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', F[b.dataset.f] === b.dataset.v));
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.toggle('on', F.sort === b.dataset.sort));
      document.querySelectorAll('[data-g]').forEach(b => { const g = b.dataset.g, i = F.gin.includes(g), o = F.gout.includes(g); b.classList.toggle('on', i); b.classList.toggle('out', o); b.setAttribute('aria-pressed', i ? 'true' : o ? 'mixed' : 'false'); });
      $('#cat-clear').hidden = !(F.q || F.gin.length || F.gout.length || FK.some(([k]) => F[k]) || !F.adult);
      writeF(F);
    };
    let qt; $('#cat-q').oninput = e => { F.q = e.target.value; clearTimeout(qt); qt = setTimeout(draw, 150); };
    $('#cat-adult').onchange = e => { F.adult = !e.target.checked; draw(); };
    $('#cat-clear').onclick = () => { Object.assign(F, { q: '', gin: [], gout: [], adult: true }); FK.forEach(([k]) => F[k] = ''); $('#cat-q').value = ''; $('#cat-adult').checked = false; draw(); };
    document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { F[b.dataset.f] = b.dataset.v; draw(); });
    document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { F.sort = b.dataset.sort; draw(); });
    document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g;
      if (F.gin.includes(g)) { F.gin = F.gin.filter(x => x !== g); F.gout.push(g); }
      else if (F.gout.includes(g)) F.gout = F.gout.filter(x => x !== g);
      else F.gin.push(g); draw(); });
    draw();
  }

  // ---------- Ficha de serie ----------
  async function series(slug){
    const { data: s } = await sb.from('series').select(SERIES).eq('slug', slug).maybeSingle();
    if (!s) { app.innerHTML = '<h1>Esta serie no está en el estante</h1><p><a href="/catalogo">Volver al catálogo</a></p>'; return; }
    const u = getUser();
    const [{ data: vols }, { data: chs }, prog, readR, folR] = await Promise.all([
      sb.from('volumes').select('id,num,title,cover_path,synopsis,status').eq('series_id', s.id).is('deleted_at', null).order('num'),
      sb.from('chapters').select('id,num,vol,volume_id,title,section_type,publish_at').eq('series_id', s.id).is('deleted_at', null).order('num'),
      progressMap(),
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id).eq('series_id', s.id) : { data: [] }]);
    const read = new Set((readR.data || []).map(r => r.chapter_id)), p = prog[s.id], following = !!(folR.data || []).length;
    const first = (chs || [])[0];
    app.innerHTML = `<div class="ui-wrap">
      <section class="ui-sh" style="--c:${esc(color(s))};--bg:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}">
        ${book(s)}
        <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.demographic ? ' · ' + esc(s.demographic) : ''}</span>
          <h1>${esc(s.title)}</h1>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).map(g => `<a class="ui-chip" href="/catalogo?g=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          <div class="ui-facts">
            ${s.author ? `<div><span class="ui-lbl">Autor</span><b>${esc(s.author)}</b></div>` : ''}
            ${s.illustrator ? `<div><span class="ui-lbl">Ilustración</span><b>${esc(s.illustrator)}</b></div>` : ''}
            <div><span class="ui-lbl">Traducción</span><b>${esc(s.teams?.name || '—')}</b></div>
            ${s.original_status ? `<div><span class="ui-lbl">Obra original</span><b>${OR[s.original_status]}</b></div>` : ''}
            ${s.sequel_status ? `<div><span class="ui-lbl">Secuela</span><b>${SQ[s.sequel_status]}</b></div>` : ''}
            <div><span class="ui-lbl">Contenido</span><b>${(vols || []).length} vol. · ${(chs || []).length} cap.</b></div>
          </div>
          <div class="acts" style="display:flex;gap:10px;flex-wrap:wrap">${first ? `<a class="btn" href="/leer/${s.slug}/${p?.chapter_num || first.num}">${p ? 'Continuar · Cap. ' + p.chapter_num : 'Empezar a leer'}</a>` : ''}<button class="btn ghost" id="follow">${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/anotaciones/${esc(s.slug)}">Mis anotaciones</a></div>
        </div>
      </section>
      ${s.synopsis ? `<section><div class="ui-h2"><h2>Sinopsis</h2></div><p class="ui-syn">${esc(s.synopsis)}</p></section>` : ''}
      <section><div class="ui-h2"><h2>Volúmenes</h2><span class="mono">${read.size ? [...read].filter(id => (chs || []).some(c => c.id === id)).length + ' leídos' : ''}</span></div><div class="ui-vols">
        ${(vols || []).map(v => { const list = (chs || []).filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num)); return `<article class="ui-vol"><span class="th" style="background-image:${v.cover_path ? `url('${esc(media(v.cover_path))}')` : s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"></span><div><span class="ui-lbl">Volumen ${v.num} · ${list.length} capítulos</span><h3>${esc(v.title && v.title !== String(v.num) && v.title.length > 2 ? v.title : 'Volumen ' + v.num)}</h3>${v.synopsis ? `<p class="mono" style="margin:6px 0 0;font-size:13px;line-height:1.5">${esc(v.synopsis)}</p>` : ''}
          <ul class="ui-chl">${list.map(c => `<li><a href="/leer/${s.slug}/${c.num}" class="${read.has(c.id) ? 'read' : ''}"><span class="n">${c.num}</span><span>${esc(c.title)}</span></a></li>`).join('')}</ul></div></article>`; }).join('') || '<p class="mono">Aún no hay volúmenes publicados.</p>'}
      </div></section></div>`;
    $('#follow').onclick = async e => {
      if (!getUser()) return go('/entrar');
      const b = e.currentTarget; b.disabled = true;
      const r = following ? await sb.from('follows').delete().eq('user_id', getUser().id).eq('series_id', s.id) : await sb.from('follows').upsert({ series_id: s.id, user_id: getUser().id });
      b.disabled = false; if (r.error) return toast(r.error.message);
      toast(following ? 'Ya no sigues esta serie' : 'Siguiendo · te avisaremos de cada volumen'); series(slug);
    };
  }
  return { home, catalog, series };
}
