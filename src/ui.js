// Vistas públicas con la identidad visual de El Obi del Lector: Inicio, Catálogo y Ficha de serie.
import { publicationDate, publicationAge, publicationDay } from './publication-dates.js?v=1';
import { homeReleaseOverview } from './home-releases.js?v=1';
import { attachPublicCredits, creditTeams, creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
import { homeFeaturedSelection, homeDayKey } from './home-featured.js?v=1';
import { createHeroRotationClock } from './home-hero-rotation.js?v=1';
import { createHomeMetrics, homeMetricCategory } from './home-metrics.js?v=1';
import { initSeriesOrganization, volumeProgress } from './series-organization.js?v=1';
import { initSeriesTabs } from './series-tabs.js?v=1';
import { chooseActiveEditorial } from './editorial-announcements.js?v=1';
// Géneros/etiquetas que el lector ocultó en Preferencias › Contenido.
const hidS = s => { const H = window.__obiUI?.hide; if (!H?.length) return false; const S = new Set(H.map(x => String(x).toLowerCase())); return [...(s.genres || []), ...(Array.isArray(s.tags) ? s.tags : [])].some(g => S.has(String(g).toLowerCase())); };
const CSS = `
.ui-wrap{display:grid;gap:56px}.ui-wrap>div:empty{display:none}
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
html[data-season] .ui-sh{border-top-color:var(--sea)}
.ui-chl a>span:not(.n){min-width:0;flex:1;overflow-wrap:anywhere}.ui-chl .fx-tag{flex:none}.ui-vol>*{min-width:0}
@media(max-width:480px){.ui-vol{grid-template-columns:1fr!important}.ui-vol>.th{width:96px}}
@media(max-width:600px){.gl-nav{display:none!important}#gl-track{grid-auto-columns:clamp(140px,42vw,230px)!important}.gl-wrap{grid-template-columns:minmax(0,1fr)!important}}
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
.ui-chl a[data-lock] .n::before{content:"🔒︎ ";font-size:11px}.ui-chl a[data-lock]{color:#a89f8a}
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
.ui-fc .side{display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:12px;max-width:150px;min-width:0}.ui-fc .side .ui-seal{white-space:normal;text-align:center;line-height:1.35}.ui-fc .jp{font-family:'Shippori Mincho B1',serif;font-weight:700;font-size:14px;writing-mode:vertical-rl;letter-spacing:.2em;color:#5a5244}
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

/* Fase editorial 3: conservar el obi sin cubrir las ilustraciones originales. */
.ui-book.has-art{background-repeat:no-repeat;background-position:center;background-size:cover;overflow:hidden}
.ui-book.has-art .ui-obi,.ui-book.has-art .ui-obi.slim{bottom:0;left:0;right:0;padding:7px 9px;background:rgba(13,12,10,.86);color:#f3ecd9;border-top:2px solid var(--c,var(--gold));box-shadow:0 -3px 12px rgba(0,0,0,.12)}
.ui-book.has-art .ui-obi small{font-size:10px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.ui-book.no-art{background-image:repeating-linear-gradient(135deg,#1c1a14 0 12px,#24211a 12px 24px)!important;overflow:hidden}
.ui-book.no-art .ui-obi,.ui-book.no-art .ui-obi.slim{bottom:12%;padding:10px 12px;display:grid;gap:4px;max-height:65%;overflow:hidden;font-size:clamp(12px,1.3vw,16px);line-height:1.25;overflow-wrap:anywhere}
.ui-book.no-art .ui-obi small{font-size:9px;line-height:1.25;letter-spacing:.06em;color:#0d0c0a;white-space:normal}
.ui-card{min-width:0;align-content:start}
.ui-card .ui-book{isolation:isolate}
.ui-card h3{overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ui-card .meta{min-height:28px;align-content:start}
.ui-card:focus-visible{outline:3px solid var(--gold);outline-offset:4px}
.ui-card:focus-visible .ui-book{box-shadow:0 20px 45px rgba(0,0,0,.6),0 0 0 2px var(--gold)}
.ui-fc .t,.ui-vol h3{overflow-wrap:anywhere}
.ui-vol{min-width:0}
.ui-vol>:last-child{min-width:0}
@media(max-width:600px){
 .ui-card h3{font-size:16px;line-height:1.3}
 .ui-card .meta{gap:5px}
 .ui-book.has-art .ui-obi{padding:6px 7px}
 .ui-book.no-art .ui-obi{font-size:12px}
}
`;
const CSS2 = ".ob-h1a{color:inherit;text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 2px no-repeat;transition:background-size .3s}.ob-h1a:hover,.ob-h1a:focus-visible{color:inherit;background-size:100% 2px}\n.top{display:flex!important;flex-wrap:nowrap;justify-content:flex-start!important;align-items:center;gap:12px 28px;padding:10px clamp(16px,4vw,48px)!important;position:sticky;top:0;z-index:50;background:rgba(13,12,10,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);transition:padding .25s}.top.ob-min{padding-top:5px!important;padding-bottom:5px!important}\n.ob-brand{display:flex;align-items:center;gap:10px;flex:none;text-decoration:none;color:var(--paper)}.ob-word b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:22px;line-height:1;white-space:nowrap}\n.ob-seal{width:30px;height:30px;border:2px solid var(--gold);border-radius:5px;color:var(--gold);display:flex;align-items:center;justify-content:center;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:16px;transform:rotate(-6deg)}\n.ob-nav{display:flex;flex-wrap:nowrap!important;align-items:center;gap:clamp(12px,1.4vw,22px);flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none}.ob-nav::-webkit-scrollbar{display:none}.ob-nav a{color:var(--paper);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap;padding:8px 0}.ob-nav a.on{color:var(--gold);box-shadow:inset 0 -2px 0 var(--gold)}\n.ob-nav .ob-sup{flex:none;margin-left:auto;border:1px solid var(--gold);color:var(--gold);padding:6px 12px;font-size:13px}\n.ob-tools{display:flex;align-items:center;gap:10px;flex:none}.ob-search{width:clamp(150px,13vw,240px);height:38px;box-sizing:border-box;padding:0 12px;background:#16140f;border:1px solid #2f2a20;color:var(--paper);font:inherit;font-size:13px;transition:width .25s,border-color .2s}.ob-search:focus{width:clamp(200px,20vw,320px);border-color:var(--gold);outline:none}\n.ob-user{position:relative}.ob-user>summary{list-style:none;display:flex;align-items:center;cursor:pointer;padding:3px;border:1px solid transparent}.ob-user>summary::-webkit-details-marker{display:none}.ob-user[open]>summary,.ob-user>summary:hover{border-color:var(--gold)}\n.ob-av{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--gold);color:#0d0c0a;font-weight:700;overflow:hidden}.ob-av img{width:100%;height:100%;object-fit:cover}\n.ob-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:230px;background:#16140f;border:1px solid #3d3628;border-top:3px solid var(--gold);display:grid;padding:6px;box-shadow:0 20px 40px rgba(0,0,0,.5);z-index:60}.ob-menu .who2{padding:8px 10px 10px;border-bottom:1px solid var(--line);margin-bottom:4px;display:grid;gap:3px}.ob-menu .who2 small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--mute)}\n.ob-menu a,.ob-menu button{display:block;text-align:left;background:none;border:none;color:var(--paper);font:inherit;font-size:14px;padding:9px 10px;text-decoration:none;cursor:pointer}.ob-menu a:hover,.ob-menu button:hover{background:#221f17;color:var(--gold)}\nmain:has(>.ob-page){padding-top:0}.ob-mast{display:flex;justify-content:space-between;gap:4px 16px;flex-wrap:wrap;align-items:baseline;padding:10px 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase}.ob-mast b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:15px;letter-spacing:.25em;color:#cfc6b0;text-transform:none}\n@media(max-width:1200px){.top{flex-wrap:wrap!important}.ob-tools{margin-left:auto}.ob-nav{order:3;flex-basis:100%}}\n.ob-mbtn{display:none}@media(max-width:760px){.top{flex-wrap:wrap!important;gap:8px 10px!important;padding:8px 14px!important}.ob-mbtn{display:inline-flex;align-items:center;justify-content:center;order:3;width:44px;height:44px;flex:none;background:none;border:1px solid var(--line);color:var(--paper);font-size:20px;cursor:pointer}.ob-brand{order:1;margin-right:auto}.ob-tools{order:2;flex:0 1 auto!important;margin-left:0!important}.ob-tools .ob-search{display:none}.ob-nav{display:none!important;order:4;flex-basis:100%}.top.ob-open .ob-nav{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px;padding:6px 0 10px}.top.ob-open .ob-nav a{padding:12px 10px;border:1px solid var(--line)}.top.ob-open .ob-tools{order:5;flex:1 1 100%!important}.top.ob-open .ob-tools .ob-search{display:block;flex:1;width:auto;min-width:0}.ob-word b{font-size:17px}}\n@media(max-width:640px){.ob-tools{order:2;flex:1 1 100%}.ob-search,.ob-search:focus{width:auto;flex:1;min-width:0}.ob-word b{font-size:19px}}\n#session{display:flex;gap:8px;align-items:center}\n.ob-tick{position:relative;overflow:hidden;background:var(--gold);color:#0d0c0a;margin:0 calc(-1 * clamp(16px,4vw,56px));border-top:2px solid #0d0c0a;border-bottom:2px solid #0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:9px 0}.ob-track{display:flex;width:max-content;animation:obTicker 32s linear infinite;will-change:transform}.ob-track>span{display:flex;flex:none;gap:48px;padding-right:48px;white-space:nowrap}.ob-tick:hover .ob-track{animation-play-state:paused}\n@keyframes obTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes obIn{from{opacity:0;transform:perspective(1800px) rotateY(-14deg) translateX(40px);transform-origin:left center;filter:brightness(.5)}to{opacity:1;transform:none;filter:none}}@keyframes obCard{from{opacity:0;transform:perspective(900px) rotateX(-60deg) translateY(24px);transform-origin:center bottom}to{opacity:1;transform:none}}@keyframes obSpine{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}@keyframes obSeal{0%{opacity:0;transform:scale(1.8) rotate(-18deg)}60%{opacity:1;transform:scale(.94) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}@keyframes obSlide{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}@keyframes obCover{from{opacity:0;transform:perspective(1200px) rotateY(28deg) translateX(-30px)}to{opacity:1;transform:none}}.ob-page{animation:obIn .75s cubic-bezier(.2,.8,.2,1) both}.ob-seal{animation:obSeal .6s .4s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*{animation:obCard .6s cubic-bezier(.2,.8,.2,1) both}.ob-anim>*:nth-child(2){animation-delay:.06s}.ob-anim>*:nth-child(3){animation-delay:.12s}.ob-anim>*:nth-child(4){animation-delay:.18s}.ob-anim>*:nth-child(5){animation-delay:.24s}.ob-anim>*:nth-child(6){animation-delay:.3s}.ob-anim>*:nth-child(n+7){animation-delay:.36s}.ob-shelf>.ob-spine{animation:obSpine .7s cubic-bezier(.2,.8,.2,1) both}.ob-shelf>.ob-spine:nth-child(2){animation-delay:.07s}.ob-shelf>.ob-spine:nth-child(3){animation-delay:.14s}.ob-shelf>.ob-spine:nth-child(4){animation-delay:.21s}.ob-shelf>.ob-spine:nth-child(n+5){animation-delay:.28s}.ob-hero .ob-cov{animation:obCover .7s cubic-bezier(.2,.8,.2,1) both}.ob-hero .ob-txt{animation:obSlide .6s .1s cubic-bezier(.2,.8,.2,1) both}.ob-urow{transition:background .2s,padding-left .25s}.ob-urow:hover{padding-left:18px}.ob-ritem .n{transition:transform .3s}.ob-ritem:hover .n{transform:scale(1.12) rotate(-4deg)}.ob-acts .a1,.ob-acts .a2{transition:transform .2s,filter .2s}.ob-acts .a1:hover,.ob-acts .a2:hover{transform:translateY(-2px);filter:brightness(1.08)}\n.ob-hero{position:relative;margin:0 calc(-1 * clamp(16px,4vw,56px));padding:clamp(24px,3vw,44px) clamp(16px,4vw,56px) 56px;display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:clamp(28px,6vw,80px);align-items:center;overflow:hidden;\n background-color:#0d0c0a;background-image:radial-gradient(circle at 100% 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 0 150%,#0d0c0a 24%,#1a170f 25%,#1a170f 28%,#0d0c0a 29%,#0d0c0a 36%,#1a170f 37%,#1a170f 40%,transparent 41%),radial-gradient(circle at 50% 100%,#1a170f 10%,#0d0c0a 11%,#0d0c0a 23%,#1a170f 24%,#1a170f 30%,#0d0c0a 31%,#0d0c0a 43%,#1a170f 44%,#1a170f 50%,#0d0c0a 51%);background-size:52px 26px}\n.ob-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0d0c0a 0%,rgba(13,12,10,.6) 45%,rgba(13,12,10,.2) 100%);pointer-events:none}.ob-hero>*{position:relative;z-index:1}\n.ob-vk{position:absolute;right:clamp(10px,2vw,30px);top:40px;writing-mode:vertical-rl;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:clamp(40px,5vw,60px);color:transparent;-webkit-text-stroke:1.5px #6b5a24;letter-spacing:.05em;z-index:1}\n.ob-cov{position:relative;padding-bottom:14px}.ob-cov .f{aspect-ratio:3/4;border:3px solid #f3ecd9;background:#1c1a14 center/cover;box-shadow:0 30px 60px rgba(0,0,0,.6)}.ob-cov .f:not([style*=url])::before{content:'';position:absolute;inset:3px;background:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-cov .code{position:absolute;top:14px;right:14px;background:#f3ecd9;color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:4px 8px}\n.ob-cov::after{content:'';position:absolute;left:-24px;right:-24px;bottom:0;height:12px;background:#2f2a20;border-top:3px solid var(--gold)}\n.ob-kick{font-family:'Shippori Mincho B1',serif;color:var(--gold);letter-spacing:.3em;font-size:15px}\n.ob-badge{display:inline-block;margin:16px 0 18px;background:var(--gold);color:#0d0c0a;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.12em;padding:6px 12px}\n.ob-hero h1{margin:0;font-size:clamp(34px,6vw,76px);}.ob-hero h1[data-len=l]{font-size:clamp(32px,4.6vw,60px)}.ob-hero h1[data-len=xl]{font-size:clamp(28px,3.6vw,48px)}.ob-hero h1{line-height:1.02;text-wrap:balance}\n.ob-tag{font-family:Literata,serif;font-style:italic;color:#d9a441;font-size:clamp(17px,1.4vw,21px);max-width:72ch;margin:14px 0}\n.ob-syn{font-family:Literata,serif;font-size:clamp(16px,1.15vw,19px);line-height:1.6;color:#e3dccb;max-width:min(72ch,100%);display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}\n.ob-acts{display:flex;gap:14px;flex-wrap:wrap;margin-top:26px}.ob-acts .a1{background:#d9922b;color:#0d0c0a;padding:15px 26px;font-weight:700;text-decoration:none}.ob-acts .a2{border:2px solid #f3ecd9;color:#f3ecd9;padding:13px 24px;font-weight:700;text-decoration:none}\n.ob-pager{position:absolute;bottom:22px;left:clamp(16px,4vw,56px);display:flex;gap:8px;z-index:2}.ob-pager button{min-width:44px;height:36px;background:#16140f;border:1px solid #3d3628;color:#8c846f;font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer;padding:0 10px}.ob-pager button.on{background:#d9922b;color:#0d0c0a;border-color:#d9922b;min-width:130px;text-align:left}\n.ob-sec{padding:60px 0;border-top:1px solid var(--line)}\n.ob-st{display:flex;align-items:center;gap:16px;margin-bottom:28px}.ob-st .k{background:var(--gold);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:15px;line-height:1.1;width:26px;padding:4px 0;text-align:center;writing-mode:vertical-rl}.ob-st h2{margin:0;font-size:36px}.ob-st .r{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}.ob-st a.r{color:var(--gold);font-family:inherit;font-weight:700;font-size:14px}\n.ob-upd{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:0 40px}\n.ob-urow{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:20px;align-items:center;padding:16px 10px;border-top:1px solid var(--line);color:var(--paper);text-decoration:none}.ob-urow:has(>span[aria-hidden]){grid-template-columns:10px 34px minmax(0,1fr) auto;gap:14px 16px}.ob-urow:hover{background:#14120d;color:var(--paper)}\n.ob-urow i{width:10px;height:10px}.ob-urow b{display:block;font-size:14px}.ob-urow span.t{font-family:Literata,serif;font-size:16px;color:#e3dccb}.ob-urow time{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mute)}\n.ob-rank{display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 90px)/4);gap:30px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-inline:2px;scrollbar-width:thin;scrollbar-color:#3d3628 transparent;padding:8px 2px 18px}\n.ob-ritem{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px;color:var(--paper);text-decoration:none}.ob-ritem .n{font-family:'Shippori Mincho B1',serif;font-size:72px;line-height:.8;color:var(--gold);align-self:start;margin-top:-6px}.ob-ritem:nth-child(n+3) .n{color:#d9922b}\n.ob-ritem .c{aspect-ratio:4/3;background:#1c1a14 center/cover;border:1px solid #2f2a20;transition:transform .3s}.ob-ritem:hover .c{transform:translateY(-6px)}.ob-ritem .c:not([style*=url]){background-image:repeating-linear-gradient(135deg,#1c1a14 0 10px,#24211a 10px 20px)}\n.ob-ritem b{grid-column:2;font-size:15px;margin-top:10px}.ob-ritem small{grid-column:2;font-family:'IBM Plex Mono',monospace;color:#d9a441;font-size:12px}\n.ob-rank .ob-ritem{scroll-snap-align:start;min-width:0;align-content:start}\n.ob-rank:focus-visible,.ob-rank-section .ob-arr button:focus-visible{outline:2px solid var(--gold);outline-offset:3px}\n.ob-rank-count{margin-top:4px;text-align:right;color:var(--mute);font-size:12px;min-height:18px}\n@media(max-width:1280px){.ob-rank{grid-auto-columns:calc((100% - 48px)/3);gap:24px}}\n@media(max-width:920px){.ob-rank{grid-auto-columns:calc((100% - 22px)/2);gap:22px}}\n@media(max-width:600px){.ob-rank{grid-auto-columns:84%;gap:14px}.ob-rank .ob-ritem .n{font-size:clamp(50px,15vw,66px)}.ob-rank-section .ob-st{flex-wrap:wrap}.ob-rank-section .ob-st .r2{width:100%;margin-left:0;flex-wrap:wrap;gap:10px}.ob-rank-section .ob-st .ob-arr{margin-left:auto}}\n.ob-shelf{display:flex;align-items:flex-end;gap:6px;padding:0 18px;border-bottom:8px solid #2f2a20;box-shadow:0 3px 0 var(--gold);min-height:320px;overflow-x:auto}\n.ob-spine{flex:none;width:72px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px 0 10px;color:#0d0c0a;text-decoration:none;box-shadow:inset -6px 0 10px rgba(0,0,0,.18),inset 3px 0 0 rgba(255,255,255,.25);transition:transform .3s}.ob-spine:hover{transform:translateY(-14px);color:#0d0c0a}\n.ob-spine::before,.ob-spine::after{content:'';width:70%;height:2px;background:rgba(0,0,0,.35)}.ob-spine span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:'Shippori Mincho B1',serif;font-size:19px;line-height:1.15;flex:1;padding:12px 0;overflow:hidden}.ob-spine em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;background:#f3ecd9;padding:2px 6px;margin:8px 0}\n.ob-tick,.ob-hero{margin-left:calc(50% - 50vw)!important;margin-right:calc(50% - 50vw)!important}.ob-hero{padding-left:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px));padding-right:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px))}.ob-hero .ob-pager{left:max(clamp(16px,4vw,56px),calc((100vw - var(--wrap))/2 + 56px))}.ob-vk{right:max(20px,calc((100vw - var(--wrap))/2))}body{overflow-x:hidden}.ob-cov{max-width:360px}\n@media(max-width:820px){.ob-hero{grid-template-columns:1fr}.ob-cov{max-width:260px}.ob-vk{display:none}}\n@media(prefers-reduced-motion:reduce){.ob-page,.ob-anim>*,.ob-shelf>.ob-spine,.ob-hero .ob-cov,.ob-hero .ob-txt,.ob-seal{animation:none}.ob-track{animation-duration:90s}}\n";
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
.rk-desc{margin:0;font-size:12px;color:#a89f8a;line-height:1.5}\n#rk-filters[hidden],#rk[hidden],#rk-teams[hidden],#rk-autoh[hidden]{display:none!important}\n.rk-team-panel{display:grid;gap:20px;padding:22px;border:1px solid var(--line);border-top:3px solid var(--gold);background:#14120e}\n.rk-team-header{display:flex;align-items:end;justify-content:space-between;flex-wrap:wrap;gap:14px}\n.rk-team-header h2{margin:0;font-size:clamp(23px,3vw,32px)}\n.rk-team-select{display:grid;gap:7px;min-width:min(100%,240px);font:600 13px 'IBM Plex Sans',sans-serif}\n.rk-team-select select{min-height:44px;width:100%;max-width:380px}\n.rk-team-note{font:12px/1.5 'IBM Plex Mono',monospace;color:var(--mute);margin:0}\n.rk-team-panel .rk-grid{margin-top:8px}\n@media(max-width:600px){.rk-team-panel{padding:14px}.rk-team-select{width:100%}}
.rk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,168px),1fr));gap:30px 20px}
.rk-overview[hidden]{display:none!important}
.rk-overview{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;max-width:100%;box-sizing:border-box;gap:30px;margin:42px 0 0;padding-top:28px;border-top:1px solid var(--line)}
.rk-overview-top h2{margin:0 0 8px;font-size:clamp(24px,3vw,32px);font-family:'Shippori Mincho B1',serif;font-weight:500}
.rk-overview-top p{margin:0;color:var(--mute);font-size:13px;line-height:1.5}
.rk-preview{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;max-width:100%;gap:17px;padding:0 0 26px;border-bottom:1px solid var(--line)}
.rk-preview-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px}
.rk-preview-head h3{font-size:22px;font-family:'Shippori Mincho B1',serif;font-weight:500;margin:0}
.rk-preview-head a,.rk-preview-team a{font-size:13px;font-weight:600;white-space:normal}
.rk-preview-body{min-width:0;min-height:75px}
.rk-preview-state{margin:0;color:var(--mute);font-size:13px;line-height:1.6}
.rk-preview-grid{min-width:0;max-width:100%;width:100%;box-sizing:border-box;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px}
.rk-preview-grid .rk-c{min-width:0}
.rk-preview-grid .ui-book{max-width:none;transform:none}
.rk-preview-grid .rk-n,.rk-preview-grid .rk-c.rk-podium .rk-n{min-width:37px;height:37px;font-size:18px;top:-7px;left:-5px;padding:0 5px}
.rk-preview-grid .rk-b b{font-size:14px}
.rk-preview-team{display:grid;gap:10px;padding:21px 24px;background:#16140f;border:1px solid var(--line);border-left:4px solid var(--gold)}
.rk-preview-team h3{font-family:'Shippori Mincho B1',serif;font-size:21px;font-weight:500;margin:0}
.rk-preview-team p{margin:0;color:var(--mute);font-size:13px}
@media(max-width:680px){.rk-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 14px}.rk-overview{margin-top:30px;gap:26px}.rk-preview-team{padding:16px}}
.rk-c{position:relative;display:grid;gap:10px;align-content:start;color:var(--paper);text-decoration:none}.rk-c .ui-book{transition:transform .2s}.rk-c:hover .ui-book{transform:translateY(-4px)}.rk-c:hover b{color:var(--gold)}
.rk-n{position:absolute;z-index:2;top:-10px;left:-8px;min-width:44px;height:44px;padding:0 8px;display:flex;align-items:center;justify-content:center;background:#0d0c0a;border:2px solid var(--c);font-family:'Shippori Mincho B1',serif;font-weight:800;font-size:22px;line-height:1;color:var(--paper);box-shadow:0 4px 12px rgba(0,0,0,.45)}
.rk-c.rk-podium .rk-n{min-width:56px;height:56px;font-size:30px;background:var(--gold);border-color:var(--gold);color:#0d0c0a}
.rk-b{display:grid;gap:3px}.rk-b b{font-size:15px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rk-b small{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a89f8a}
.rk-s{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#cfc6b0}
.rk-mv{font-weight:600;font-size:11px;padding:1px 5px;border:1px solid currentColor;line-height:1.4}.rk-mv.up{color:#a9d18e}.rk-mv.dn{color:#f59e7a}.rk-mv.eq{color:#7d745f;border-color:transparent}.rk-mv.new{color:var(--gold)}
.rk-upd{margin:28px 0 0;font-size:12px;color:#7d745f}
.rk-bdgs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 0}.rk-bdgs:empty{display:none}.rk-bdg{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:0 12px 0 0;background:#16140f;border:1px solid var(--gold);color:var(--paper)!important;font-size:13px;font-weight:600;text-decoration:none}.rk-bdg b{display:flex;align-items:center;align-self:stretch;padding:0 9px;background:var(--gold);color:#0d0c0a;font-family:'Shippori Mincho B1',serif;font-size:16px}.rk-bdg:hover{background:#1f1c14}
.rk-rate{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0}.rk-stars{display:inline-flex}.rk-stars button{width:36px;height:40px;padding:0;background:none;border:0;font-size:24px;line-height:1;color:#3d3628;cursor:pointer}.rk-stars button.avg{color:#b5a27a}.rk-stars button.on{color:var(--gold)}.rk-stars:hover button{color:var(--gold)}.rk-stars button:hover~button{color:#3d3628}.rk-rate .mono{font-size:12px}
.tp2-rkl{display:grid}.tp2-rki{display:grid;grid-template-columns:52px 40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ln);color:var(--fg)!important;text-decoration:none}.tp2-rki .n{font-family:var(--tf);font-weight:800;font-size:26px;color:var(--act);text-align:center}.tp2-rki .cv{width:40px;aspect-ratio:2/3;background:var(--sf) center/cover;border:1px solid var(--ln)}.tp2-rki b{font-weight:600}.tp2-rki .m{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--mu)}.tp2-rk .tp2-sh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}.tp2-rk .tp2-sh a{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--act)}
@media(max-width:560px){.rk-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 14px}.rk-n{font-size:18px;min-width:38px;height:38px}.rk-c.rk-podium .rk-n{min-width:46px;height:46px;font-size:24px}}
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
  installCreditImageFallback();
  const homeMetrics = createHomeMetrics(sb);
  let firstHomeVisit = true;
  if (!document.getElementById('ui-css')) { const s = document.createElement('style'); s.id = 'ui-css'; s.textContent = CSS; document.head.appendChild(s); const s2 = document.createElement('style'); s2.textContent = CSS2; document.head.appendChild(s2); }
  chrome();
  const media = p => p ? (/^https?:/.test(p) ? p : `${url}/storage/v1/object/public/obi-media/${encodeURI(p)}`) : '';
  const thumb = s => media(s?.cover_thumb_path || s?.cover_path);
  // aviso resaltado que el equipo configura en la ficha (series.theme.update_tag)
  const UTAG_INK = c => { const m = /^#?([\da-f]{6})$/i.exec(c || ''); if (!m) return '#0d0c0a'; const n = parseInt(m[1], 16), l = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; return l > 0.55 ? '#0d0c0a' : '#fbf8f1'; };
  const utagOn = t => !!(t && t.on && (t.text || '').trim() && (!t.until || new Date(t.until + 'T23:59:59') >= new Date()));
  const utagHTML = t => { const c0 = /^#[\da-f]{6}$/i.test(t.color || '') ? t.color : '#f2c230', c = t.season ? `var(--sea,${c0})` : c0, ink = t.season ? '#0d0c0a' : UTAG_INK(c0), solid = t.style !== 'outline'; return `<span class="ob-utag" style="display:inline-flex;align-items:center;margin-left:8px;padding:2px 8px;font:600 11px/1.5 'IBM Plex Mono',monospace;letter-spacing:.04em;text-transform:uppercase;vertical-align:2px;max-width:100%;white-space:normal;overflow-wrap:anywhere;${solid ? `background:${c};color:${ink};border:1px solid ${c}` : `background:transparent;color:${c};border:1px solid ${c}`}">${esc(t.text.trim().slice(0, 40))}</span>`; };
  const currentNotice = s => chooseActiveEditorial(s?.theme);
  const utag = s => { const t=currentNotice(s); return t ? utagHTML(t) : ''; };
  const tickerNotice = s => { const t=currentNotice(s); if(!t)return ''; const c=/^#[\da-f]{6}$/i.test(t.color||'')?t.color:'#f2c230';return '<b style="color:'+esc(t.season?'var(--sea,'+c+')':c)+'">'+esc(t.text.trim().slice(0,40).toUpperCase())+'</b> · '; };
  // en la portada destacada el aviso va grande, en su propia línea, antes de «Nuevo · Cap.»
  const heroTag = s => { const t = currentNotice(s); if (!t) return ''; const c0 = /^#[\da-f]{6}$/i.test(t.color || '') ? t.color : '#f2c230', c = t.season ? `var(--sea,${c0})` : c0, ink = t.season ? '#0d0c0a' : UTAG_INK(c0), solid = t.style !== 'outline';
    return `<span class="ob-utag-hero" style="${solid ? `background:${c};color:${ink};border:2px solid ${c}` : `background:rgba(13,12,10,.6);color:${c};border:2px solid ${c}`}">${esc(t.text.trim().slice(0, 40))}</span>`; };
  const color = s => s?.theme?.color || s?.teams?.color || '#f2c230';
  const ago = d => publicationAge(d);
  const ageTag = (d, prefix = ' · ') => { const label = ago(d); return label ? prefix + label : ''; };
  const book = (s, sub, slim) => `<div class="ui-book ${s.cover_path ? 'has-art' : 'no-art'}" style="--c:${esc(color(s))};background-image:${s.cover_path ? `url('${esc(media(s.cover_path))}')` : 'none'}"><div class="ui-obi${slim || s.cover_path ? ' slim' : ''}"><small>${esc(sub || s.teams?.name || 'El Obi del Lector')}</small>${s.cover_path ? '' : esc(s.short || s.title)}</div></div>`;
  const pill = st => { const [l, c] = TL[st] || TL.active; return `<span class="ui-pill" style="color:${c}">${l}</span>`; };
  const SERIES = 'id,team_id,slug,title,short,original,author,illustrator,publisher,synopsis,genres,tags,theme,cover_path,cover_thumb_path,adult,work_type,demographic,translation_status,original_status,sequel_status,views,teams(name,slug,color,avatar_path),chapters(count),volumes(count)';
  function chrome(){
    const top = document.querySelector('header.top'); if (!top || top.dataset.ob) return; top.dataset.ob = '1';
    let topQ = 0; const topH = () => { if (topQ) return; topQ = requestAnimationFrame(() => { topQ = 0; document.documentElement.style.setProperty('--top-h', Math.ceil(top.getBoundingClientRect().height) + 'px'); }); }; topH(); const topRO = window.ResizeObserver ? new ResizeObserver(topH) : null; topRO?.observe(top, { box: 'border-box' }); top.addEventListener('transitionend', topH); top.addEventListener('transitionrun', () => { const t0 = performance.now(), f = () => { topQ = 0; document.documentElement.style.setProperty('--top-h', Math.ceil(top.getBoundingClientRect().height) + 'px'); if (performance.now() - t0 < 400) requestAnimationFrame(f); }; requestAnimationFrame(f); }); addEventListener('resize', topH); addEventListener('orientationchange', topH); new MutationObserver(() => { topH(); if (topRO) [...top.children].forEach(c => topRO.observe(c)); }).observe(top, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    { let bar = null; const ro = window.ResizeObserver ? new ResizeObserver(() => bar && document.documentElement.style.setProperty('--rd-h', Math.ceil(bar.getBoundingClientRect().height) + 'px')) : null; const look = () => { topH(); const b = document.querySelector('.rd-bar'); if (b === bar) return; if (bar && ro) ro.unobserve(bar); bar = b; if (b) { document.documentElement.style.setProperty('--rd-h', Math.ceil(b.getBoundingClientRect().height) + 'px'); ro?.observe(b); } }; new MutationObserver(look).observe(document.getElementById('app') || document.body, { childList: true, subtree: true }); look(); }
    const ses = document.getElementById('session');
    top.innerHTML = `<a href="/" class="ob-brand"><span class="ob-seal">帯</span><span class="ob-word"><b>El Obi del Lector</b></span></a>
      <nav class="ob-nav" id="ob-nav-m">${[['/','Inicio'],['/catalogo','Catálogo'],['/biblioteca','Mi biblioteca'],['/calendario','Calendario'],['/ranking','Ranking']].map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}<a href="/apoyar" class="ob-sup">援 Apoyar</a></nav>
      <button type="button" class="ob-mbtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="ob-nav-m">☰</button>
      <div class="ob-tools"><input class="ob-search" id="ob-q" type="search" placeholder="Buscar títulos, autores…" aria-label="Buscar"></div>`;
    addEventListener('scroll', () => top.classList.toggle('ob-min', scrollY > 40), { passive: true });
    { const mb = top.querySelector('.ob-mbtn'), set = on => { top.classList.toggle('ob-open', on); mb.setAttribute('aria-expanded', on); mb.textContent = on ? '×' : '☰'; mb.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú'); };
      mb.onclick = () => set(!top.classList.contains('ob-open')); top.querySelector('.ob-nav').addEventListener('click', e => { if (e.target.closest('a')) set(false); });
      addEventListener('popstate', () => set(false)); addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('ob-open')) { set(false); mb.focus(); } });
      document.addEventListener('click', e => { if (top.classList.contains('ob-open') && !top.contains(e.target)) set(false); }); }
    // El encabezado no necesita solicitar configuración pública al funcionar offline.
    if (navigator.onLine) sb.from('platform_settings').select('support').eq('id', 1).maybeSingle().then(({ data }) => { const c = data?.support || {}, b = top.querySelector('.ob-sup'); if (!b) return; if (c.show === false) b.hidden = true; if (c.label) b.textContent = c.label.slice(0, 24); if (c.mode === 'external' && /^https:\/\//.test(c.url || '')) { b.href = c.url; b.target = '_blank'; b.rel = 'noopener'; } }, () => {});
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
    const mark = () => { const p = location.pathname; top.querySelectorAll('.ob-nav a').forEach(a => { const current = a.getAttribute('href') === p || (a.textContent === 'Catálogo' && p.startsWith('/serie')); a.classList.toggle('on', current); if (current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      tab.querySelectorAll('a').forEach(a => { const h = a.getAttribute('href'), current = h === '/' ? p === '/' : p.startsWith(h) || (h === '/catalogo' && p.startsWith('/serie')) || (h === '/perfil' && p.startsWith('/lector/')); a.classList.toggle('on', current); if (current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      document.body.classList.toggle('no-tab', /^\/(leer|estudio)\b/.test(p)); };
    addEventListener('popstate', mark); document.addEventListener('click', () => setTimeout(mark, 0)); mark();
  }
  let SIDX = null;
  const searchIndex = () => SIDX ||= (async () => { const u = getUser();
    const [{ data: ss }, { data: ts }, pr] = await Promise.all([sb.from('series').select('id,slug,title,short,original,author,illustrator,genres,tags,adult,cover_path,translation_status,theme,teams(name,slug,color),chapters(count)').eq('published', true),
      sb.from('teams').select('slug,name,avatar_path,status'), u ? sb.rpc('my_adult_ok') : { data: null }]);
    const ok = pr?.data === true; return { series: (ss || []).filter(x => x.translation_status !== 'withdrawn' && (!x.adult || ok)), teams: (ts || []).filter(t => !t.status || /^(active|activo)$/i.test(t.status)) }; })().catch(e => { SIDX = null; throw e; });
  async function searchData(q, lim){
    const I0 = await searchIndex(), I = { ...I0, series: I0.series.filter(x => !hidS(x)) }, n = norm(q), has = t => norm(t).includes(n), byId = Object.fromEntries(I.series.map(x => [x.id, x]));
    const works = I.series.filter(x => has([x.title, x.short, x.original].join(' '))).slice(0, lim);
    await attachPublicCredits(sb, works);
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
    let R, prog = {}; try { [R, prog] = await Promise.all([searchData(q, lim), progressMap().catch(() => ({}))]); } catch { return '<p class="sr-none">No se pudo buscar. Intenta de nuevo.</p>'; }
    const grp = (t, items) => items.length ? `<div class="sr-g"><span class="sr-h">${t}</span>${items.join('')}</div>` : '';
    const cv = x => `<span class="sr-cv" style="${x.cover_path ? `background-image:url('${esc(thumb(x))}')` : `background:${esc(color(x))}`}"></span>`;
    const html = grp('Obras', R.works.map(x => { const p = prog[x.id]; return p ? `<a href="/leer/${x.slug}/${p.chapter_num}" title="Continuar donde te quedaste">${cv(x)}<span><b>${esc(x.title)}</b><small class="sr-cont">Continuar · cap. ${p.chapter_num}${p.pct > 0.02 && p.pct < 0.98 ? ' · ' + Math.round(p.pct * 100) + ' %' : ''}</small>${creditsHTML(x, { esc, media, mode: 'carousel' })}</span></a>` : `<a href="/serie/${x.slug}">${cv(x)}<span><b>${esc(x.title)}</b><small>${esc([x.author, x.teams?.name].filter(Boolean).join(' · '))}</small>${creditsHTML(x, { esc, media, mode: 'carousel' })}</span></a>`; }))
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
  // el conteo ya no va en la barra superior: se muestra en cada obra como «Capítulos sin leer»
  function refreshBadge(){ document.querySelectorAll('.ob-nav .bdg').forEach(b => b.remove()); }
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
          <h2 id="gq-t">${esc(s.title)}</h2>${creditsHTML(s, { esc, media, mode: 'detail' })}${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).slice(0, 6).map(g => `<span class="ui-chip" style="cursor:default">${esc(g)}</span>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          ${s.synopsis ? `<p class="syn">${esc(s.synopsis)}</p>` : '<p class="mono" style="margin:14px 0">Sin sinopsis todavía.</p>'}
          <p class="mono" style="margin:0 0 16px">${s.chapters?.[0]?.count ?? 0} capítulos${lc ? ' · último: cap. ' + lc.num + ageTag(lc.publish_at) : ''}</p>
          <div class="acts">${n ? `<a class="btn" href="/leer/${s.slug}/${n}">${p ? 'Continuar · cap. ' + n : 'Empezar a leer'}</a>` : ''}<button class="btn ghost" data-gqf>${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/serie/${s.slug}">Ver ficha completa</a></div>
        </div></div>`;
      q.querySelector('.ui-qx').onclick = gqClose;
      q.querySelectorAll('.ui-qvc a').forEach(a => a.addEventListener('click', () => { q.hidden = true; document.body.style.overflow = ''; }));
      q.querySelector('[data-gqf]').onclick = async e => { const b = e.currentTarget; b.disabled = true; const now = await o.onFollow(); b.disabled = false; if (now !== undefined) paint(first, now); };
    };
    paint(null, o.following()); q.hidden = false; document.body.style.overflow = 'hidden'; q.querySelector('.ui-qx').focus({ preventScroll: true });
    if (!p) { const { data: f } = await sb.from('chapters').select('num').eq('series_id', s.id).eq('status', 'published').is('deleted_at', null).order('num').limit(1); if (!q.hidden) { paint(f?.[0]?.num || null, o.following()); q.querySelector('.ui-qx').focus({ preventScroll: true }); } }
  }
  // progreso del servidor + el de este dispositivo (sirve sin cuenta y si el servidor va atrasado)
  function localProgressMap(base = {}){
    const m = { ...base };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k?.startsWith('obi-pos-')) continue;
      const l = JSON.parse(localStorage.getItem(k)), id = k.slice(8), cur = m[id]; if (!l?.num) continue;
      if (!cur || (l.at && new Date(l.at) > new Date(cur.updated_at || 0))) m[id] = { series_id: id, chapter_num: l.num, pct: l.pct || 0, updated_at: l.at || cur?.updated_at || new Date(0).toISOString() }; } } catch {}
    return m;
  }
  // Solo las vistas que necesitan los datos completos deben esperar la consulta.
  async function progressMap(){
    const u = getUser(); let rows = [];
    if (u) { const { data } = await sb.from('reading_progress').select('series_id,chapter_num,pct,updated_at').eq('user_id', u.id); rows = data || []; }
    return localProgressMap(Object.fromEntries(rows.map(r => [r.series_id, r])));
  }

  // ---------- Inicio ----------
  let homeRotationTimer, heroClock = null, heroClockEl = null;
  const HOME_CSS = `
/* Logo del equipo en una columna propia: el anuncio editorial configurado al
   publicar/programar y el ranking permanecen juntos sin solaparse. */
.ob-hero .ob-hero-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;column-gap:clamp(10px,1.4vw,18px);min-width:0;max-width:100%}
.ob-hero .ob-hero-meta{min-width:0;max-width:100%}
.ob-hero .ob-hero-head:not(:has(.ob-hero-team-logo)){display:block}
.ob-hero .ob-hero-team-logo{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0;width:clamp(82px,7vw,100px);color:var(--paper);text-align:center;text-decoration:none}
.ob-hero .ob-hero-team-logo img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain;border:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,.55))}
.ob-hero .ob-hero-team-logo.is-text{width:clamp(82px,7vw,100px);min-height:44px;justify-content:center;padding:8px 6px;border:1px solid var(--line);background:rgba(13,12,10,.42)}
.ob-hero .ob-hero-team-logo.is-text span{display:block;width:100%;max-width:100%;font:600 12px/1.4 'IBM Plex Mono',monospace;overflow-wrap:anywhere;text-wrap:balance}
.ob-hero .ob-hero-team-logo:hover,.ob-hero .ob-hero-team-logo:focus-visible{color:var(--gold)}
.ob-hero .ob-hero-team-logo:focus-visible{outline:2px solid var(--gold);outline-offset:4px}
.ob-hero .ob-hero-head+h1{margin-top:clamp(16px,1.5vw,20px)}
@media(max-width:600px){
 .ob-hero .ob-hero-head{column-gap:10px}
 .ob-hero .ob-hero-team-logo{width:80px}
 .ob-hero .ob-hero-team-logo img{width:100%}
 .ob-hero .ob-hero-team-logo.is-text{width:clamp(78px,22vw,104px);padding:6px 4px}
 .ob-hero .ob-hero-team-logo.is-text span{font-size:10px}
}
@media(max-width:380px){
 .ob-hero .ob-hero-team-logo{width:64px}
 .ob-hero .ob-hero-team-logo img{width:100%}
 .ob-hero .ob-hero-team-logo.is-text{width:76px}
 .ob-hero .ob-hero-team-logo.is-text span{font-size:9px}
}
@media(min-width:601px) and (max-width:1100px){
 .ob-hero .ob-hero-team-logo{width:clamp(78px,8vw,94px)}
}
.ob-fest{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:22px 0 0;padding:12px 16px;border:1px solid var(--fc);border-left:4px solid var(--fc);background:color-mix(in srgb,var(--fc) 9%,#16140f);color:var(--paper);text-decoration:none}
.ob-fest:hover{color:var(--paper);background:color-mix(in srgb,var(--fc) 15%,#16140f)}.ob-fest b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px}.ob-fest span{font-size:13px;color:var(--mute)}.ob-fest em{margin-left:auto;font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--fc)}
.ob-tick a:hover{text-decoration:underline!important;text-underline-offset:3px}.ob-tick:hover .ob-track{animation-play-state:paused}
.ob-hi{display:flex;align-items:center;gap:14px 24px;flex-wrap:wrap;margin:28px 0 0;padding:20px 22px;border:1px solid var(--line);background:#16140f}.ob-hi p{margin:0;flex:1 1 320px;font-size:15px;line-height:1.55;text-wrap:pretty}.ob-hi div{display:flex;gap:10px;flex-wrap:wrap}
.ob-hi a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;font-weight:600;text-decoration:none;border:1px solid var(--gold)}.ob-hi .a1{background:var(--gold);color:#0d0c0a}.ob-hi .a2{color:var(--paper)}
.ob-next{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.ob-nx{display:grid;gap:4px;padding:16px;border:1px solid var(--line);border-top:3px solid var(--gold);background:#16140f;color:var(--paper);text-decoration:none}.ob-nx:hover{border-color:var(--gold);color:var(--paper)}
.ob-nx .w{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--gold)}.ob-nx b{font-family:'Shippori Mincho B1',serif;font-weight:500;font-size:18px}.ob-nx small{font-size:13px;color:var(--mute)}
.ob-carw{position:relative}@keyframes obHp{to{transform:scaleX(1)}}@media(max-width:600px){.ob-car{grid-auto-columns:40vw!important;padding-right:16px}}
.ob-car{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(132px,16vw,172px);gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 14px;scrollbar-width:thin;scrollbar-color:#3d3628 transparent}
.ob-cc{scroll-snap-align:start;display:grid;gap:8px;align-content:start;color:var(--paper);text-decoration:none}.ob-cc:hover{color:var(--paper)}
/* Lanzamientos: las mismas dimensiones que los demás carruseles .ob-car/.ob-cc. */
.ob-releases .ob-st{flex-wrap:wrap}
.ob-releases .ob-st .r2{display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:100%}
.ob-releases .ob-st .ob-arr{display:flex;margin-left:auto}
.ob-releases{min-width:0;max-width:100%}
.ob-release-car{width:100%;max-width:100%;min-width:0;box-sizing:border-box}
.ob-release-car:focus-visible,.ob-releases .ob-arr button:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.ob-release-card{min-width:0}
.ob-release-card .cv{overflow:hidden;isolation:isolate;box-sizing:border-box}
.ob-release-card .cv img{display:block;width:100%;height:100%;object-fit:cover}
.ob-release-card .cv i{z-index:1}
.ob-release-card.is-volume .cv{border-color:var(--gold)}
.ob-release-type{font:700 11px/1.4 'IBM Plex Mono',monospace;letter-spacing:.04em;color:var(--mute)}
.ob-release-card.is-volume .ob-release-type{color:var(--gold)}
.ob-release-card b{min-height:2.7em}
.ob-release-card .ob-release-detail{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.5;overflow-wrap:anywhere;color:#cfc6b0}
.ob-release-card time{display:block;font:11px/1.5 'IBM Plex Mono',monospace;color:var(--mute)}
@media(max-width:600px){.ob-releases .ob-st .r2{width:100%;gap:10px}.ob-releases .ob-st .ob-arr{margin-left:auto}}
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


/* Fase 6.1 — Mantener controles, indicadores y animaciones; ampliar el objetivo táctil solo en móvil. */
@media(max-width:760px){
 .ob-hero{width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-inline:0!important;padding-bottom:max(136px,calc(110px + env(safe-area-inset-bottom)))}
 .ob-pager2{display:flex;flex-wrap:wrap;justify-content:center;column-gap:6px!important;row-gap:0!important;bottom:8px!important;max-width:calc(100vw - 32px)}
 .ob-pager2>button[data-j],.ob-pager2>button[data-hp]{min-width:44px;min-height:44px;flex:none}
 .ob-pager2>button[data-hp]{font-size:0!important;padding:0!important}
 .ob-pager2>button[data-hp][aria-label="Pausar"]::after{content:'Ⅱ';font-size:20px}
 .ob-pager2>button[data-hp][aria-label="Reanudar"]::after{content:'▶';font-size:18px}
 .ob-pager2>span{order:5;flex:1 0 100%!important;height:44px;min-width:0;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--gold) transparent;overscroll-behavior-x:contain;justify-content:safe center}
 .ob-pager2>span button[data-j]{height:44px!important;min-width:44px!important;flex:0 0 44px!important;background:transparent!important;overflow:visible!important}
 .ob-pager2>span button[data-j]::before{content:'';position:absolute;left:4px;right:4px;top:17px;height:10px;border-radius:2px;background:#5a5244}
 .ob-pager2>span button[data-j][aria-current="true"]::before{background:#3d3628}
 .ob-pager2>span button[data-j] .ob-hp{inset:auto 4px!important;top:17px!important;height:10px!important;border-radius:2px}
 .ob-pager2 :is(button[data-j],button[data-hp]):focus-visible{outline:3px solid var(--gold);outline-offset:-3px}
}

/* Refinamiento progresivo: la cinta, los carruseles y los anuncios permanecen operativos. */
.ob-tick:focus-within .ob-track{animation-play-state:paused}
.ob-tick a:focus-visible{outline:2px solid #0d0c0a;outline-offset:3px;text-decoration:underline;text-underline-offset:3px}
.ob-cc{min-width:0}
.ob-cc:focus-visible{outline:3px solid var(--gold);outline-offset:3px}
.ob-cc .cv{background-position:center;background-size:cover;overflow:hidden}
.ob-cc .cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ob-cc b{overflow-wrap:anywhere;line-height:1.35}
.ob-ann{min-width:0;transition:border-color .18s,background .18s}
.ob-ann:hover,.ob-ann:focus-within{border-color:var(--tc,var(--gold));background:#1c1a14}
.ob-ann h3,.ob-ann p{overflow-wrap:anywhere}
.ob-ann a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.ob-car{overscroll-behavior-x:contain;scroll-padding-inline:4px}
@media(max-width:600px){
 .ob-ann{padding:15px}
 .ob-car{gap:12px}
 .ob-cc b{font-size:13px}
}
@media(prefers-reduced-motion:reduce){.ob-ann,.ob-cc .cv{transition:none}}
.ob-upd>h3{grid-column:1/-1}
.ob-urow .ob-ucover{width:34px;height:48px;flex:none;background:#1c1a14 center/cover}
.ob-urow.is-volume{grid-column:1/-1;grid-template-columns:4px minmax(0,1fr) auto;gap:12px;padding:18px 20px;border:1px solid var(--gold);border-left:5px solid var(--gold);background:linear-gradient(105deg,#272010,#16140f);min-width:0}
.ob-urow.is-volume:has(.ob-ucover){grid-template-columns:64px minmax(0,1fr) auto}
.ob-urow.is-volume>i{display:none}
.ob-urow.is-volume .ob-ucover{width:64px;height:88px;box-shadow:inset 4px 0 8px #0006}
.ob-urow .ob-u-info{display:grid;gap:5px;min-width:0}
.ob-urow.is-volume .ob-u-info>b{font-family:'Shippori Mincho B1',serif;font-size:clamp(19px,2.4vw,26px);font-weight:600;line-height:1.25;overflow-wrap:anywhere}
.ob-urow .ob-u-kind{font:700 12px/1.5 'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.11em;color:var(--gold)}
.ob-urow.is-volume time{align-self:start}
.ob-hero .ob-badge-vol{display:inline-block;background:var(--gold);color:#0d0c0a;font-weight:800;font-size:clamp(14px,1.5vw,18px);letter-spacing:.07em;padding:8px 13px;margin-bottom:8px}
/* Inicio — jerarquía de lanzamientos: volumen, aviso opcional y ranking. */
/* Alinear la cubierta y el anuncio desde arriba, sin centrar la portada respecto a títulos extensos. */
.ob-hero{align-items:start;column-gap:clamp(28px,3vw,48px);row-gap:clamp(20px,2.6vw,32px);padding-bottom:clamp(90px,8vw,112px)}
.ob-hero .ob-cov{align-self:start}
.ob-hero .ob-txt{min-width:0;max-width:860px;padding-inline-end:clamp(0px,2vw,24px)}
.ob-hero .ob-txt .ob-kick{display:block;margin:0 0 9px;font-size:clamp(13px,1.15vw,16px);line-height:1.5}
.ob-hero .ob-hero-flags{display:flex;flex-direction:column;align-items:flex-start;gap:9px;max-width:100%;margin:0;min-width:0}
.ob-hero .ob-hero-flags .ob-badge{display:inline-flex;align-items:center;max-width:100%;min-width:0;box-sizing:border-box;margin:0;padding:8px 13px;font-size:clamp(12px,1.1vw,16px);line-height:1.3;letter-spacing:.055em;white-space:normal;overflow-wrap:anywhere}
.ob-hero .ob-hero-flags .ob-badge-vol{font-weight:800;background:var(--gold);color:#0d0c0a}
.ob-hero .ob-hero-flags .ob-utag-hero{display:inline-flex;align-items:center;align-self:flex-start;max-width:100%;min-width:0;box-sizing:border-box;padding:6px 11px;font:700 clamp(12px,1vw,15px)/1.35 'IBM Plex Mono',monospace;letter-spacing:.04em;text-transform:uppercase;white-space:normal;overflow-wrap:anywhere}
.ob-hero .ob-hero-rank{display:flex;align-items:center;min-width:0;margin:14px 0 0}
.ob-hero .ob-hero-rank .rk-bdg{margin:0;min-height:30px;font-size:12px}
.ob-hero .ob-hero-flags+h1,.ob-hero .ob-hero-rank+h1{margin-top:clamp(18px,2.2vw,28px)}
.ob-hero .ob-txt h1{max-width:100%;font-size:clamp(30px,3.4vw,50px);line-height:1.13;text-wrap:balance;overflow-wrap:break-word}
.ob-hero .ob-txt h1[data-len=l]{font-size:clamp(28px,3.4vw,45px)}
.ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(26px,2.8vw,38px)}
.ob-hero .ob-txt .ob-tag{margin:12px 0 0;line-height:1.4}
.ob-hero .ob-txt .ob-syn{margin:14px 0 0;max-width:64ch;-webkit-line-clamp:4}
.ob-hero .ob-txt .ob-acts{margin-top:20px}
@media(max-width:760px){.ob-hero{padding-bottom:max(136px,calc(110px + env(safe-area-inset-bottom)))}}
@media(max-width:820px){
 .ob-hero{width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-inline:0!important}
 .ob-hero .ob-txt{max-width:100%;padding-inline-end:0}
 .ob-hero .ob-txt h1{font-size:clamp(30px,6vw,46px)}
 .ob-hero .ob-txt h1[data-len=l]{font-size:clamp(28px,5.4vw,40px)}
 .ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(26px,4.7vw,36px)}
}
@media(max-width:480px){
 .ob-hero .ob-hero-flags{gap:10px}
 .ob-hero .ob-hero-flags .ob-badge{letter-spacing:.02em}
 .ob-hero .ob-txt h1{font-size:clamp(29px,8vw,36px);line-height:1.15}
 .ob-hero .ob-txt h1[data-len=l]{font-size:clamp(27px,7vw,33px)}
 .ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(25px,6.5vw,30px)}
 .ob-hero .ob-txt .ob-syn{-webkit-line-clamp:3}
 .ob-hero .ob-txt .ob-acts{gap:10px}
}
@media(max-width:600px){.ob-urow.is-volume,.ob-urow.is-volume:has(.ob-ucover){grid-template-columns:54px minmax(0,1fr);gap:12px;padding:14px}.ob-urow.is-volume .ob-ucover{width:54px;height:76px}.ob-urow.is-volume time{grid-column:2}.ob-urow.is-volume:not(:has(.ob-ucover)){grid-template-columns:minmax(0,1fr)}.ob-urow.is-volume:not(:has(.ob-ucover)) time{grid-column:1}}
@media(prefers-reduced-motion:reduce){.ob-urow.is-volume{transition:none}}

/* Inicio compacto: portada editorial completa, vista breve y CTA siempre visible.
   El titulo/sinopsis permanecen integrales en el DOM y se leen en la ficha. */
.ob-hero{
  grid-template-columns:minmax(180px,290px) minmax(0,1fr);
  column-gap:clamp(24px,3vw,44px);
  height:clamp(480px,36vw,540px);
  min-height:0;
  box-sizing:border-box;
  padding-top:clamp(18px,2vw,26px);
  padding-bottom:76px;
}
.ob-hero .ob-cov{width:100%;max-width:290px;align-self:start}
.ob-hero .ob-txt{display:flex;flex-direction:column;min-width:0;min-height:0;height:100%;max-width:none;padding-inline-end:0;overflow:hidden}
.ob-hero .ob-hero-copy{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.ob-hero .ob-hero-footer{flex:none;margin-top:auto;padding-top:8px;position:relative;z-index:2}
.ob-hero .ob-txt .ob-kick{font-size:clamp(12px,1vw,14px);letter-spacing:.16em;margin-bottom:7px}
.ob-hero .ob-hero-flags{gap:6px}
.ob-hero .ob-hero-flags .ob-badge{font-size:clamp(11px,.9vw,13px);padding:6px 10px;margin:0;letter-spacing:.03em}
.ob-hero .ob-hero-flags .ob-utag-hero{font-size:clamp(11px,.9vw,13px);padding:5px 9px}
.ob-hero .ob-hero-rank{margin-top:7px}
.ob-hero .ob-hero-rank .rk-bdg{font-size:11px;min-height:26px}
.ob-hero .ob-hero-head+h1{margin-top:10px}
.ob-hero .ob-txt h1,.ob-hero .ob-txt h1[data-len=l],.ob-hero .ob-txt h1[data-len=xl]{
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;
  overflow:hidden;line-height:1.14;max-width:58ch;text-wrap:balance;
}
.ob-hero .ob-txt h1{font-size:clamp(27px,2.3vw,38px)}
.ob-hero .ob-txt h1[data-len=l]{font-size:clamp(26px,2.15vw,35px)}
.ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(24px,2.05vw,34px)}
.ob-hero .ob-txt .ob-tag{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:8px 0 0;font-size:clamp(14px,1vw,17px);line-height:1.33}
.ob-hero .ob-txt .ob-syn{flex:0 1 auto;-webkit-line-clamp:2;overflow:hidden;margin:8px 0 0;max-width:62ch;font-size:clamp(13px,.95vw,16px);line-height:1.42}
.ob-hero .ob-hero-partners{display:block;max-height:30px;overflow:hidden}
.ob-hero .ob-hero-partners img{max-height:26px;max-width:100px;object-fit:contain}
.ob-hero .ob-prelaunch-timer{margin:0 0 8px!important;line-height:1.35;font-size:12px!important}
.ob-hero .ob-txt .ob-acts{margin-top:0;gap:9px}
.ob-hero .ob-acts .a1,.ob-hero .ob-acts .a2{display:inline-flex;align-items:center;justify-content:center;min-height:44px;box-sizing:border-box;padding:9px 15px;font-size:13px;line-height:1.25}
@media(min-width:701px) and (max-width:820px){
  .ob-hero{grid-template-columns:minmax(165px,220px) minmax(0,1fr)}
  .ob-hero .ob-cov{max-width:220px}
}
@media(max-width:700px){
  .ob-hero{grid-template-columns:minmax(0,1fr);height:auto;min-height:0;max-height:none;row-gap:clamp(14px,4vw,24px);padding-top:18px;padding-bottom:max(136px,calc(110px + env(safe-area-inset-bottom)))}
  .ob-hero .ob-cov{width:clamp(132px,40vw,184px);max-width:184px;justify-self:center}
  .ob-hero .ob-txt{height:auto;min-height:0;overflow:visible}
  .ob-hero .ob-hero-copy{overflow:visible}
  .ob-hero .ob-hero-footer{margin-top:0;padding-top:12px}
  .ob-hero .ob-txt h1{font-size:clamp(25px,5.8vw,34px)}
  .ob-hero .ob-txt h1[data-len=l]{font-size:clamp(24px,5.5vw,32px)}
  .ob-hero .ob-txt h1[data-len=xl]{font-size:clamp(22px,5.1vw,29px)}
  .ob-hero .ob-txt .ob-syn{-webkit-line-clamp:2}
}
@media(max-width:380px){
  .ob-hero .ob-acts .a1,.ob-hero .ob-acts .a2{padding:8px 11px;font-size:12px}
}
`;
  const SKEL = `<div class="ob-page ob-skel" aria-busy="true" aria-label="Cargando la biblioteca"><div class="ob-mast"><b>翻訳図書館</b><span>Biblioteca de novelas ligeras · Español latino</span></div><div class="sk sk-hero"></div><div class="sk sk-h"></div><div class="sk-row">${'<div class="sk sk-ln"></div>'.repeat(4)}</div><div class="sk sk-h"></div><div class="sk-row c">${'<div class="sk sk-cv"></div>'.repeat(6)}</div></div>`;
  async function home(){
    const navigation = performance.getEntriesByType('navigation')[0];
    const initial = firstHomeVisit && navigation && new URL(navigation.name).pathname === '/';
    const startedAt = initial ? 0 : performance.now();
    firstHomeVisit = false;
    homeMetrics.startVisit();
    clearInterval(homeRotationTimer);
    heroClock?.dispose(); heroClock = null; heroClockEl = null;
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
    // home_feed y la consulta de respaldo ya incluyen series.theme. Evitamos
    // pedir todas las obras otra vez y reutilizamos SEASONS del módulo de temporada.
    // Festividades: son contenido complementario. No detener la primera
    // representación mientras llegan fechas/configuración desde Supabase.
    const festival = import('/season.js?v=4').then(S => S.load(sb).then(() => {
      const k = S.platformKey(), fs = k && S.SEASONS[k];
      return fs && fs.g !== 'est' ? fs : null;
    })).catch(() => null);
    // Lectura paginada: ningún equipo se descarta por exceder 3, 8 o 100 obras.
    const teamHighlights = () => import('/paging.js?v=1').then(({readPages}) =>
      readPages((from,to)=>sb.from('team_featured_series')
        .select('team_id,series_id,updated_at').order('team_id').range(from,to),{size:250}));
    // Tendencias y destacados de equipos complementan la rotación,
    // pero una consulta paginada lenta no debe detener toda la portada.
    const trendRequest = sb.from('rankings').select('series_id,list,period,score,pos')
      .eq('list','tendencia').in('period',['hoy','semana']).order('pos').limit(30)
      .then(r => r, () => ({ data: [] }));
    const teamRequest = teamHighlights().then(r => r, () => ({ data: [] }));
    // El progreso del lector es complementario: nunca retener la portada mientras
    // responde esa consulta. Mostrar primero el progreso guardado en el dispositivo.
    const prog = localProgressMap();
    const progressRequest = u ? progressMap().catch(() => null) : null;
    const [FD, pr, VR] = await Promise.all([
      feed(),
      // Esperar la validación +18 antes de representar cualquier título restringido.
      u ? sb.rpc('my_adult_ok') : { data: null },
      // Datos frescos del volumen: imprescindibles para «Nuevo lanzamiento».
      sb.from('volumes').select('id,series_id,num,title,cover_path,status,published_at,announced_at,is_final')
        .is('deleted_at', null).eq('status', 'published').then(r => r, () => ({ data: [] }))
    ]);
    { const vc = {}, firstAt = {};
      (VR?.data || []).forEach(v => {
        const t=Date.parse(v.published_at || '');
        if (Number.isFinite(t) && (!firstAt[v.series_id] || t < firstAt[v.series_id])) firstAt[v.series_id]=t;
        if (v.cover_path && (!vc[v.series_id] || v.num > vc[v.series_id].num)) vc[v.series_id]=v;
      });
      (FD?.series || []).forEach(s => {
        if (firstAt[s.id]) s.firstPublishedAt = new Date(firstAt[s.id]).toISOString();
        const v=vc[s.id]; if (v && v.cover_path !== s.cover_path) { s.cover_path=v.cover_path; s.cover_thumb_path=null; }
      }); }
    const { series, latest, rkW, rkH, top10 } = FD, ps = { featured: FD.featured }, nextRel = (FD.nextRel || []).filter(e => new Date(e.at) > Date.now());
    if (location.pathname !== '/') return;
    const adultOk = pr?.data === true;
    const list = (series || []).filter(s => !['abandoned', 'withdrawn'].includes(s.translation_status) && (!s.adult || adultOk) && !hidS(s));
    await attachPublicCredits(sb, list);
    const byId = Object.fromEntries(list.map(s => [s.id, s]));
    const lastCh = {}; (latest || []).forEach(c => { lastCh[c.series_id] ||= c; });
    // Las publicaciones completas se anuncian como volumen, no como capítulos sueltos.
    const news = homeReleaseOverview(latest || [], VR?.data || [], list);
    const newsBySeries = news.bySeries;
    const featured = homeFeaturedSelection({ series:list, news, weekly:rkW||[], historic:rkH||[], trends:[], editorial:Array.isArray(ps.featured)?ps.featured:[], teams:[], now });
    const feat = featured.entries.map(x => byId[x.id]);
    const teamSignature = rows => (rows||[]).map(x=>[x.team_id,x.series_id,x.updated_at].join('/')).sort().join('|');
    let loadedTeamSignature = teamSignature([]);
    const featReasons = featured.bySeries;
    const cont = Object.values(prog).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).filter(p => byId[p.series_id]).slice(0, 6);
    const grp = news.entries.slice(0, 10);
    const caps = chs => { const n = [...new Set(chs.map(c => c.num))].sort((a, b) => a - b); if (n.length === 1) return 'Cap. ' + n[0]; const run = n.every((x, i) => !i || x - n[i - 1] === 1); return 'Caps. ' + (run ? n[0] + '–' + n[n.length - 1] : n.slice(0, 4).join(', ') + (n.length > 4 ? '…' : '')); };
    const top = {}; (top10 || []).forEach(r => { if (!top[r.series_id] || r.pos < top[r.series_id]) top[r.series_id] = r.pos; });
    const rkWv = (rkW || []).filter(r => byId[r.series_id]);
    const rkUse = rkWv.length ? { rows: rkWv, per: 'semana', lbl: 'lectores distintos · esta semana' } : { rows: (rkH || []).filter(r => byId[r.series_id]), per: 'historico', lbl: 'vistas · de todos los tiempos' };
    const rk = rkUse.rows.slice(0, 6);
    const nx = (nextRel || []).filter(e => e.kind !== 'volume' && e.series && (!e.series_id || byId[e.series_id])).slice(0, 3);
    const until = d => { const m = Math.round((new Date(d) - Date.now()) / 60000); if (m < 60) return 'en ' + Math.max(1, m) + ' min'; if (m < 1440) return 'en ' + Math.round(m / 60) + ' h'; const n = Math.round(m / 1440); return n === 1 ? 'mañana' : 'en ' + n + ' días'; };
    const shelf = list.slice(0, 24);
    const gc = new Map(); list.forEach(x => (x.genres || []).forEach(g => gc.set(g, (gc.get(g) || 0) + 1)));
    const genres = [...gc].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 6);
    const done = list.filter(x => x.translation_status === 'completed').sort((a, b) => new Date(lastCh[b.id]?.publish_at || 0) - new Date(lastCh[a.id]?.publish_at || 0) || (b.views || 0) - (a.views || 0)).slice(0, 15);
    const cover = (s, tag) => { const t = tag || (top[s.id] ? 'TOP ' + top[s.id] : ''); return s.cover_path ? `<span class="cv"><img src="${esc(thumb(s))}" alt="" loading="lazy" decoding="async">${t ? `<i>${t}</i>` : ''}</span>` : `<span class="cv no" style="--c:${esc(color(s))}">${t ? `<i>${t}</i>` : ''}${esc(s.short || s.title)}</span>`; };
    const cc = (s, sub, tag) => `<a class="ob-cc" href="/serie/${s.slug}">${cover(s, tag)}<b>${esc(s.title)}</b><small>${sub}</small>${creditsHTML(s, { esc, media, mode: 'carousel' })}</a>`;
    const arrows = id => `<span class="ob-arr"><button type="button" data-cs="${id}" data-d="-1" aria-controls="${id}" aria-label="Anteriores">‹</button><button type="button" data-cs="${id}" data-d="1" aria-controls="${id}" aria-label="Siguientes">›</button></span>`;
    const head = (k, t, right = '') => `<div class="ob-st"><span class="k">${k}</span><h2>${t}</h2>${right}</div>`;
    const continueHTML = rows => `
      ${rows.length ? `<div class="ob-band" style="display:flex;align-items:baseline;gap:14px;margin:56px 0 0;padding-bottom:10px;border-bottom:2px solid var(--gold)"><span aria-hidden="true" style="font-family:'Shippori Mincho B1',serif;font-size:28px;color:var(--gold)">君</span><h2 style="margin:0;font-size:clamp(26px,3vw,40px);font-family:'Shippori Mincho B1',serif;font-weight:500">Para ti</h2></div>` : ''}
${rows.length ? `<section class="ob-sec" style="border-top:none">${head('続読', 'Continuar leyendo', '<a class="r" href="/biblioteca">Mi biblioteca →</a>')}<div class="ui-cont ob-anim">${rows.map(p => { const s = byId[p.series_id]; return `<a class="ui-ccard" href="/leer/${s.slug}/${p.chapter_num}" style="--c:${esc(color(s))}"><span class="th" style="background-image:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}"></span><span><span class="ui-lbl">Cap. ${p.chapter_num}${s.chapters?.[0]?.count ? ' de ' + s.chapters[0].count : ''} · ${Math.round((p.pct || 0) * 100)}% · ${ago(p.updated_at)}</span><br><strong>${esc(s.title)}</strong><span class="ui-bar"><i style="width:${Math.round((p.pct || 0) * 100)}%"></i></span></span></a>`; }).join('')}</div></section>` : ''}
    `;

    setTimeout(() => import('/agenda.js?v=1').then(A => A.openToday({ sb, esc }, document.getElementById('ob-open-today'))).catch(() => {}), 0);
    app.innerHTML = `<div class="ob-page">
      <div class="ob-mast"><b>翻訳図書館</b><span>Biblioteca de novelas ligeras · Español latino</span></div>
      ${grp.length ? `<div class="ob-tick" aria-label="Novedades"><div class="ob-track">${[0, 1].map(k => `<span${k ? ' aria-hidden="true"' : ''}>${[...grp, ...grp].slice(0, Math.max(6, grp.length)).map((g, i) => `<a href="${g.kind === 'volume' ? '/serie/' + byId[g.id].slug : '/leer/' + byId[g.id].slug + '/' + g.chs[0].num}"${k ? ' tabindex="-1"' : ''} style="color:inherit;text-decoration:none">${g.kind === 'volume' ? '<b>NUEVO VOLUMEN</b> · ' : tickerNotice(byId[g.id]) || (i === 0 ? 'NUEVO · ' : '★ ')}${esc(byId[g.id].title)}${g.kind === 'volume' ? ' — Volumen ' + esc(g.volume.num) : ' · ' + caps(g.chs)}</a>`).join('')}</span>`).join('')}</div></div>` : ''}
      <div id="ob-fest-slot"></div>
      <section class="ob-hero" id="hero" ${feat.length ? '' : 'style="display:none"'}></section><div id="ob-open-today"></div><div id="ob-team-recs"></div>
      ${grp.length ? `<section class="ob-sec ob-releases" style="border-top:none;padding-top:32px">${head('新着', 'Nuevos volúmenes y capítulos', `<span class="r2"><a class="r" href="/lanzamientos">Todos los lanzamientos →</a>${arrows('ob-release-car')}</span>`)}
        <div class="ob-car ob-release-car ob-anim" id="ob-release-car" role="region" aria-roledescription="carrusel" aria-label="Lanzamientos recientes" tabindex="0">${grp.map(g => {
          const s = byId[g.id], c = g.chs[0] || {}, v = g.kind === 'volume' ? g.volume : null;
          const coverPath = v?.cover_path || s.cover_thumb_path || s.cover_path;
          const coverUrl = v?.cover_path && v.cover_path !== s.cover_path ? media(v.cover_path) : thumb(s);
          const detail = v
            ? 'Volumen ' + esc(v.num) + (v.title && v.title.trim() && v.title.trim() !== String(v.num) && !/^volumen\s*\d+$/i.test(v.title.trim()) ? ' · ' + esc(v.title) : '')
            : caps(g.chs) + (g.chs.length === 1 && c.title ? ' · ' + esc(c.title) : '');
          const href = v ? '/serie/' + s.slug : '/leer/' + s.slug + '/' + c.num;
          return `<a class="ob-cc ob-release-card${v ? ' is-volume' : ''}" href="${esc(href)}" style="--c:${esc(color(s))}">
            <span class="cv${coverPath ? '' : ' no'}">${coverPath ? `<img src="${esc(coverUrl)}" alt="" loading="lazy" decoding="async">` : esc(s.short || s.title)}<i>${v ? 'VOLUMEN' : 'CAPÍTULO'}</i></span>
            <span class="ob-release-type">${v ? '¡Nuevo volumen!' : 'Nuevo capítulo'}</span>
            <b>${esc(s.title)}</b>
            <small class="ob-release-detail">${detail}</small>
            ${publicationDate(g.at) ? `<time datetime="${esc(g.at)}">${ago(g.at)}</time>` : ''}
          </a>`;
        }).join('')}</div></section>` : ''}
      ${u ? '' : `<div class="ob-hi" style="display:grid;gap:18px"><p style="flex:none"><strong>Bienvenido a El Obi del Lector.</strong> Novelas ligeras traducidas al español por grupos de fans.</p>
        <ol style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px"><li style="display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:start"><span aria-hidden="true" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);color:var(--gold);font-family:'Shippori Mincho B1',serif;font-size:20px">探</span><span><b style="display:block;font-size:15px">Descubre</b><span style="font-size:13px;line-height:1.5;color:#cfc6b0">Busca por género o mira lo más leído de la semana.</span></span></li><li style="display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:start"><span aria-hidden="true" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);color:var(--gold);font-family:'Shippori Mincho B1',serif;font-size:20px">追</span><span><b style="display:block;font-size:15px">Sigue una obra</b><span style="font-size:13px;line-height:1.5;color:#cfc6b0">Recibe novedades de volúmenes completos y capítulos individuales.</span></span></li><li style="display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:start"><span aria-hidden="true" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);color:var(--gold);font-family:'Shippori Mincho B1',serif;font-size:20px">続</span><span><b style="display:block;font-size:15px">Lee sin perderte</b><span style="font-size:13px;line-height:1.5;color:#cfc6b0">Tu progreso se guarda en todos tus dispositivos.</span></span></li></ol>
        <div><a class="a1" href="/entrar">Crear cuenta gratis</a><a class="a2" href="/catalogo" style="border-color:transparent">o explora el catálogo →</a></div></div>`}
      <div id="ob-continue-slot">${continueHTML(cont)}</div>
      <div id="ob-s-pend"></div><div id="ob-s-foryou"></div>
      ${nx.length ? `<section class="ob-sec">${head('予定', 'Próximos lanzamientos', '<a class="r" href="/calendario">Calendario →</a>')}
        <div class="ob-next ob-anim">${nx.map(e => `<a class="ob-nx" href="/serie/${esc(e.series.slug)}"><span class="w">${until(e.at)} · ${new Date(e.at).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><b>${esc(e.series.title)}</b><small>${e.kind === 'volume' ? 'Volumen completo · ' : ''}${esc(e.label || '')}</small></a>`).join('')}</div></section>` : ''}
      <div class="ob-band" style="display:flex;align-items:baseline;gap:14px;margin:56px 0 0;padding-bottom:10px;border-bottom:2px solid var(--gold)"><span aria-hidden="true" style="font-family:'Shippori Mincho B1',serif;font-size:28px;color:var(--gold)">探</span><h2 style="margin:0;font-size:clamp(26px,3vw,40px);font-family:'Shippori Mincho B1',serif;font-weight:500">Explora</h2></div>
      ${genres.length ? `<section class="ob-sec" style="border-top:none">${head('類', 'Géneros', '<a class="r" href="/catalogo">Catálogo completo →</a>')}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr));gap:14px">${genres.slice(0, 8).map(([g, n]) => { const x = list.find(s => (s.genres || []).includes(g) && s.cover_path); return `<a href="/catalogo?g=${encodeURIComponent(g)}" style="position:relative;display:flex;align-items:flex-end;min-height:120px;padding:14px;color:#fbf8f1;text-decoration:none;border:1px solid var(--line);background:#16140f ${x ? `url('${esc(thumb(x))}') center 25%/cover` : ''};overflow:hidden"><span aria-hidden="true" style="position:absolute;inset:0;background:linear-gradient(transparent 20%,rgba(13,12,10,.92))"></span><span style="position:relative;display:grid;gap:2px"><b style="font-size:17px">${esc(g)}</b><small class="mono" style="font-size:11px;color:#cfc6b0">${n} ${n === 1 ? 'obra' : 'obras'}</small></span></a>`; }).join('')}</div></section>` : ''}
      ${rk.length ? `<section class="ob-sec ob-rank-section">${head('人気', 'Más leídas', `<span class="r2"><span class="mono" style="font-size:12px">${rkUse.lbl}</span><a class="r" href="/ranking?lista=leidas&periodo=${rkUse.per}">Ver ranking →</a>${arrows('ob-rank-car')}</span>`)}
        <div class="ob-rank ob-anim" id="ob-rank-car" tabindex="0" role="region" aria-roledescription="carrusel" aria-label="Novelas más leídas">${rk.map((r, i) => { const s = byId[r.series_id]; return `<a class="ob-ritem" href="/serie/${s.slug}"><span class="n">${i + 1}</span><span class="c" style="background-image:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}"></span><b>${esc(s.title)}</b><small>${Math.round(+r.score || 0).toLocaleString('es-MX')} ${rkUse.per === 'semana' ? 'lectores' : 'vistas'} · ${s.chapters?.[0]?.count || 0} cap.</small></a>`; }).join('')}</div><div class="ob-rank-count mono" data-rank-status aria-live="off"></div></section>` : ''}
      ${done.length ? `<section class="ob-sec">${head('完結', 'Traducciones terminadas', `<span class="r2"><a class="r" href="/catalogo?tl=completed">Ver todas →</a>${arrows('ob-car-done')}</span>`)}<div class="ob-car" id="ob-car-done">${done.map(x => cc(x, (x.chapters?.[0]?.count || 0) + ' capítulos', 'COMPLETA')).join('')}</div></section>` : ''}
      <div id="ob-s-ann"></div><div id="ob-s-rev"></div>
      ${shelf.length ? `<section class="ob-sec">${head('書架', 'Series', `<span class="r2"><a class="r" href="/catalogo">Ver todas →</a>${arrows('ob-car')}</span>`)}
        <div class="ob-car" id="ob-car">${shelf.map(x => cc(x, (x.chapters?.[0]?.count || 0) + ' cap. · ' + (TL[x.translation_status] || TL.active)[0])).join('')}${list.length > shelf.length ? `<a class="ob-cc all" href="/catalogo"><span class="cv">Ver las ${list.length} →</span></a>` : ''}</div></section>` : ''}</div>`;
    // Insertar el aviso de temporada sin volver a pintar el Home completo.
    // El nodo está vinculado a esta navegación: nunca actualizar una vista vieja.
    const festSlot = app.querySelector('#ob-fest-slot');
    festival.then(fest => {
      const slot = festSlot;
      if (!slot || !slot.isConnected || location.pathname !== '/') return;
      if (!fest) return slot.remove();
      slot.outerHTML = `<a class="ob-fest" href="/calendario" style="--fc:${esc(fest.ac)}"><b>${esc(fest.l)}</b><span>El sitio se viste de temporada.</span><em>Ver en el calendario →</em></a>`;
    });
    const bindCars = root => root.querySelectorAll('[data-cs]').forEach(bt => { const c = document.getElementById(bt.dataset.cs); if (!c) return; bt.onclick = () => c.scrollBy({ left: +bt.dataset.d * c.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      const upd = () => { const [l, r] = root.querySelectorAll(`[data-cs="${bt.dataset.cs}"]`); if (l) l.disabled = c.scrollLeft < 4; if (r) r.disabled = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4; }; c.addEventListener('scroll', upd, { passive: true }); upd(); });
    bindCars(app);
    // Actualizar únicamente la sección personal cuando llegue el progreso remoto.
    // No sustituir el Inicio ni reiniciar el carrusel durante la lectura.
    const myContinueSlot = app.querySelector('#ob-continue-slot');
    if (progressRequest) progressRequest.then(remote => {
      if (!remote || !myContinueSlot?.isConnected || app.querySelector('#ob-continue-slot') !== myContinueSlot || location.pathname !== '/') return;
      Object.assign(prog, remote);
      const nextCont = Object.values(prog)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .filter(p => byId[p.series_id]).slice(0, 6);
      myContinueSlot.innerHTML = continueHTML(nextCont);
    });

    // Mantener navegación horizontal por teclado además de flechas y gesto táctil.
    const releaseCar = app.querySelector('#ob-release-car');
    releaseCar?.addEventListener('keydown', e => {
      if (e.target !== releaseCar || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      releaseCar.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * releaseCar.clientWidth * .85,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    // El ranking usa el carrusel existente; actualizamos solo su contador visible y navegación de teclado.
    const rankCar = app.querySelector('#ob-rank-car');
    if (rankCar) {
      const rankCount = rankCar.parentElement.querySelector('[data-rank-status]');
      const updateRank = () => {
        const bounds = rankCar.getBoundingClientRect();
        const cards = [...rankCar.children];
        const visible = cards.map((card, i) => ({ i, rect: card.getBoundingClientRect() }))
          .filter(({ rect }) => Math.max(0, Math.min(bounds.right, rect.right) - Math.max(bounds.left, rect.left)) >= rect.width * .75);
        if (visible.length && rankCount) rankCount.textContent = `${String(visible[0].i + 1).padStart(2, '0')}–${String(visible[visible.length - 1].i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      };
      rankCar.addEventListener('scroll', updateRank, { passive: true });
      rankCar.addEventListener('keydown', e => {
        if (e.target !== rankCar || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        rankCar.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * rankCar.clientWidth * .85,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => { if (!rankCar.isConnected) return ro.disconnect(); updateRank(); });
        ro.observe(rankCar);
      }
      requestAnimationFrame(updateRank);
    }
    if (feat.length) heroSlide(feat, 0, prog, lastCh, top, newsBySeries, featReasons);
    // Tiempo hasta que Inicio y su carrusel están listos para mostrarse, medido
    // en el dispositivo real y agrupado por móvil/escritorio; no se envía el ms.
    requestAnimationFrame(() => {
      if (location.pathname === '/' && app.querySelector('#hero')) homeMetrics.paint(performance.now() - startedAt);
    });

    // Incluir los preestrenos autorizados en el mismo carrusel, sin sumar secciones a Inicio.
    // Máximo dos diapositivas para mantener el protagonismo de las publicaciones actuales.
    const heroEl = app.querySelector('#hero');
    sb.rpc('prelaunch_calendar', {
      p_from: now.toISOString(),
      p_to: new Date(Date.now() + 60 * 864e5).toISOString()
    }).then(async ({ data, error }) => {
      if (!heroEl?.isConnected || app.querySelector('#hero') !== heroEl || location.pathname !== '/') return;
      if (error) { console.warn('prelaunch_calendar', error.message); return; }
      const announced = (data || [])
        .filter(x => new Date(x.at) > new Date() && (adultOk || !x.adult) && !hidS(x))
        // Inicio prioriza los siguientes 14 días; calendario conserva los 60.
        .sort((a,b)=>Number(new Date(b.at)-now <= 14*864e5)-Number(new Date(a.at)-now <= 14*864e5)
          || new Date(a.at)-new Date(b.at))
        .filter((x, i, rows) => rows.findIndex(r => r.series_id === x.series_id) === i)
        .slice(0, 2);
      if (!announced.length) return;
      const previews = await Promise.all(announced.map(async x => {
        // La RPC expone exclusivamente información editorial permitida del anuncio.
        const { data: details } = await sb.rpc('prelaunch_series', { p_slug: x.slug });
        const editorial = details?.series || {}, current = byId[x.series_id] || {};
        const v = details?.volumes?.find(v => v.id === x.volume_id);
        const art = x.vcover || v?.cover_path || editorial.cover_path || current.cover_path || x.cover_path;
        return {
          ...current, ...editorial, id: x.series_id, slug: x.slug, title: x.title,
          cover_path: art, cover_thumb_path: null,
          synopsis: editorial.synopsis || current.synopsis || '',
          teams: current.teams || { name: x.team_name, slug: x.team_slug },
          __prelaunch: { at: x.at, vnum: x.vnum, volume_id: x.volume_id, cover_path: art }
        };
      }));
      await attachPublicCredits(sb, previews);
      if (!heroEl.isConnected || app.querySelector('#hero') !== heroEl || location.pathname !== '/') return;
      // Mantener el estreno ya publicado como portada y mostrar el adelanto a
      // continuación, sin obligar a esperar toda la rotación para descubrirlo.
      const previewIds = new Set(previews.map(s => s.id));
      const published = feat.filter(s => !previewIds.has(s.id));
      feat.splice(0, feat.length, ...published.slice(0, 1), ...previews, ...published.slice(1));
      heroEl.style.display = '';
      const active = heroEl.dataset.heroKey;
      const selected = feat.findIndex(item => heroKey(item) === active);
      refreshHeroKeepingActive(feat, Math.max(0, selected), prog, lastCh, top, newsBySeries, featReasons);
    }).catch(e => console.warn('prelaunch carousel', e));

    // Completar la rotación editorial cuando lleguen los datos auxiliares,
    // conservando la portada visible y los preestrenos ya incorporados.
    Promise.all([trendRequest, teamRequest]).then(([trends, teamResult]) => {
      if (!heroEl?.isConnected || app.querySelector('#hero') !== heroEl || location.pathname !== '/') return;
      loadedTeamSignature = teamSignature(teamResult?.data);
      const extra = homeFeaturedSelection({
        series:list, news, weekly:rkW||[], historic:rkH||[],
        trends:trends?.data||[], editorial:Array.isArray(ps.featured)?ps.featured:[],
        teams:teamResult?.data||[], now
      });
      const covers = extra.entries.map(x => byId[x.id]).filter(Boolean);
      const teamSlot = app.querySelector('#ob-team-recs');
      // Hero compacto, recomendaciones de todos los equipos visibles sin límite.
      if (teamSlot && extra.teamRecommendations.length > 1) {
        const allTeams = extra.teamRecommendations.map(x => ({
          reason:x, book:byId[x.id]
        })).filter(x => x.book);
        teamSlot.outerHTML = `<section class="ob-sec" data-from="ob-team-recs" style="border-top:1px solid var(--line);padding-top:24px">
          ${head('推薦', 'Recomendaciones de los equipos', `<span class="r2"><span class="mono" style="font-size:12px">${allTeams.length} equipos · 7 días</span>${arrows('ob-team-car')}</span>`)}
          <div class="ob-car" id="ob-team-car" role="region" aria-roledescription="carrusel" aria-label="Recomendaciones de todos los equipos" tabindex="0">
            ${allTeams.map(({book,reason})=>`<a class="ob-cc" href="/serie/${esc(book.slug)}">
              ${cover(book)}<b>${esc(book.title)}</b><small>${esc(reason.label)}</small></a>`).join('')}</div></section>`;
        const section=app.querySelector('[data-from="ob-team-recs"]');
        if(section) bindCars(section);
      } else teamSlot?.remove();
      const previews = feat.filter(x => x.__prelaunch);
      const lead = feat.find(x => !x.__prelaunch);
      const unique = new Set();
      const updated = [lead, ...previews, ...covers].filter(x => x && !unique.has(x.id) && unique.add(x.id));
      if (!updated.length) return;
      const changed = updated.length !== feat.length || updated.some((x, i) => x.id !== feat[i]?.id);
      Object.assign(featReasons, extra.bySeries);
      if (!changed) return;
      feat.splice(0, feat.length, ...updated);
      // Recalcular el paginador sin devolver al lector a la primera diapositiva.
      const active = heroEl.dataset.heroKey;
      const selected = feat.findIndex(item => heroKey(item) === active);
      refreshHeroKeepingActive(feat, Math.max(0, selected), prog, lastCh, top, newsBySeries, featReasons);
    }).catch(e => console.warn('destacados inicio', e));

    // El día editorial rota en Monterrey. Los lanzamientos completos nuevos
    // rompen la rotación en la sesión abierta; no dependen de un cron nocturno.
    let checkingNewRelease = false;
    const currentAnnouncement = Math.max(0,...(VR?.data||[]).map(v=>Date.parse(v.announced_at||v.published_at)||0));
    homeRotationTimer = setInterval(async () => {
      if(location.pathname !== '/' || !app.querySelector('.ob-page')) {clearInterval(homeRotationTimer);return;}
      if(document.hidden || checkingNewRelease)return;
      if(homeDayKey() !== featured.day){clearInterval(homeRotationTimer);home();return;}
      checkingNewRelease=true;
      try {
        const [releaseResult,teamResult]=await Promise.all([
          sb.from('volumes').select('announced_at,published_at')
            .eq('status','published').is('deleted_at',null)
            .order('announced_at',{ascending:false,nullsFirst:false}).limit(1),
          teamHighlights().then(r=>r,()=>({data:null,error:true}))
        ]);
        // La recomendación añadida, sustituida o vencida se refleja en una
        // pestaña abierta en menos de un minuto, incluso sin cambio de día.
        const changedTeam = Array.isArray(teamResult?.data)
          && teamSignature(teamResult.data)!==loadedTeamSignature;
        const changedRelease=!releaseResult.error
          && (Date.parse(releaseResult.data?.[0]?.announced_at||releaseResult.data?.[0]?.published_at)||0)>currentAnnouncement;
        if(changedTeam||changedRelease){clearInterval(homeRotationTimer);home();}
      } finally {checkingNewRelease=false;}
    }, 60000);
    // Fase 2: secciones secundarias, sin bloquear lo anterior.
    const fill = (id, html) => { const el = document.getElementById(id); if (!el || !html) return; el.outerHTML = html; const sec = document.querySelector('[data-from="' + id + '"]'); if (sec) bindCars(sec); };
    const seen = new Set([...Object.keys(prog)]);
    Promise.all([
      ...(FD.ann !== undefined && FD.reviews !== undefined ? [FD.ann, FD.reviews].map(d => ({ data: d })) : [
      sb.from('teams').select('slug,name,color,ann:design->announce').not('design->announce', 'is', null),
      sb.rpc('home_reviews', { p_limit: 6 })]),
      u ? sb.rpc('reader_stats') : { data: null },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id).limit(60) : { data: [] },
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] }
    ].map(p => Promise.resolve(p).catch(() => ({ data: null })))).then(async ([{ data: an }, { data: rv }, { data: st }, { data: fo }, { data: rc }]) => {
      if (location.pathname !== '/') return;
      const today = new Date().toISOString().slice(0, 10);
      const A = (an || []).filter(t => t.ann && (t.ann.title || t.ann.text) && (!t.ann.until || t.ann.until >= today)).sort((a, b) => new Date(b.ann.at || 0) - new Date(a.ann.at || 0)).slice(0, 4);
      if (A.length) fill('ob-s-ann', `<section class="ob-sec" data-from="ob-s-ann">${head('告知', 'Anuncios de los equipos')}<div class="ob-anns">${A.map(t => `<article class="ob-ann" style="--tc:${esc(t.color || '#f2c230')}"><a class="tm" href="/equipo/${esc(t.slug)}">${esc(t.name)}</a>${t.ann.at && ago(t.ann.at) ? `<span class="mono">${ago(t.ann.at)}</span>` : ''}${t.ann.title ? `<h3>${esc(t.ann.title)}</h3>` : ''}${t.ann.text ? `<p>${esc(t.ann.text)}</p>` : ''}${t.ann.url && /^(https:\/\/|\/)/.test(t.ann.url) ? `<a class="go" href="${esc(t.ann.url)}"${t.ann.url.startsWith('/') ? '' : ' target="_blank" rel="noopener"'}>${esc(t.ann.label || 'Ver más')} →</a>` : `<a class="go" href="/equipo/${esc(t.slug)}">Ir a la página del equipo →</a>`}</article>`).join('')}</div></section>`);
      const BU = new Set([...(window.__obiBlocks?.values() || [])].map(b => b.username)), V = (Array.isArray(rv) ? rv : []).filter(r => byId[r.series_id] && !(r.username && BU.has(r.username))).slice(0, 6);
      if (V.length) fill('ob-s-rev', `<section class="ob-sec" data-from="ob-s-rev">${head('書評', 'Reseñas recientes')}<div class="ob-revs">${V.map(r => `<a class="ob-rev" href="/serie/${esc(r.slug)}"><span class="c" style="${r.cover_path ? `background-image:url('${esc(thumb(r))}')` : ''}"></span><span><b>${esc(r.title)}</b>${r.score ? `<span class="st" aria-label="${r.score} de 5">${'★'.repeat(r.score)}<i>${'★'.repeat(5 - r.score)}</i></span>` : ''}<q>${esc(r.body)}</q><small>${esc(r.anon ? 'Lector anónimo' : r.username || 'Lector')} · ${ago(r.at)}</small></span></a>`).join('')}</div></section>`);
      if (!u) return;
      const fol = (fo || []).map(r => r.series_id).filter(id => byId[id]); fol.forEach(id => seen.add(id));
      if (fol.length) { const read = new Set((rc || []).map(r => r.chapter_id));
        const { data: chs } = await sb.from('chapters').select('id,num,series_id').eq('status', 'published').is('deleted_at', null).or('publish_at.is.null,publish_at.lte.' + new Date().toISOString()).in('series_id', fol).order('num');
        const P = fol.map(id => { const l = (chs || []).filter(c => c.series_id === id), un = l.filter(c => !read.has(c.id)); return { s: byId[id], un: un.length, next: un[0], last: lastCh[id]?.publish_at }; }).filter(x => x.un > 0 && !(x.s.translation_status === 'completed' && !prog[x.s.id])).sort((a, b) => new Date(b.last || 0) - new Date(a.last || 0)).slice(0, 12);
        if (P.length && location.pathname === '/') fill('ob-s-pend', `<section class="ob-sec" data-from="ob-s-pend">${head('未読', 'Pendientes', `<span class="r2"><a class="r" href="/biblioteca?t=pendientes">Ver todas →</a>${arrows('ob-car-pend')}</span>`)}<div class="ob-car" id="ob-car-pend">${P.map(x => `<a class="ob-cc" href="/leer/${x.s.slug}/${x.next.num}">${cover(x.s, x.un + ' sin leer')}<b>${esc(x.s.title)}</b><small>Sigue en el cap. ${x.next.num}</small>${creditsHTML(x.s, { esc, media, mode: 'carousel' })}</a>`).join('')}</div></section>`); }
      const fav = (st?.genres || []).map(g => g.g);
      if (fav.length) { const wk = Object.fromEntries(rkWv.map(r => [r.series_id, +r.score]));
        const score = x => (x.genres || []).reduce((n, g) => n + (fav.length - Math.max(0, fav.indexOf(g))) * (fav.includes(g) ? 1 : 0), 0);
        const F = list.filter(x => !seen.has(x.id) && score(x) > 0).sort((a, b) => score(b) - score(a) || (wk[b.id] || 0) - (wk[a.id] || 0) || (b.views || 0) - (a.views || 0)).slice(0, 15);
        if (F.length) fill('ob-s-foryou', `<section class="ob-sec" data-from="ob-s-foryou">${head('推薦', 'Para ti', `<span class="r2"><span class="mono" style="font-size:12px">porque lees ${esc(fav.slice(0, 2).join(' y '))}</span>${arrows('ob-car-fy')}</span>`)}<div class="ob-car" id="ob-car-fy">${F.map(x => cc(x, esc((x.genres || []).filter(g => fav.includes(g)).slice(0, 2).join(' · ')))).join('')}</div></section>`); }
    });
  }
  let heroPaused = false;
  const heroKey = item => item?.__prelaunch ? 'pre:'+item.__prelaunch.volume_id : 'pub:'+item?.id;
  // Las consultas auxiliares pueden reordenar la lista sin cambiar la portada visible:
  // no reiniciar su imagen, progreso ni temporizador al llegar tarde.
  function refreshHeroKeepingActive(feat, i, prog, lastCh, top, newsBySeries, featReasons) {
    const el = $('#hero'), active = el?.dataset.heroKey;
    if (active && feat.some(item => heroKey(item) === active)
      && Boolean(el.querySelector('.ob-pager2')) === (feat.length > 1)) return;
    heroSlide(feat, i, prog, lastCh, top, newsBySeries, featReasons);
  }
  function heroSlide(feat, i, prog, lastCh, top = {}, newsBySeries = {}, featReasons = {}){
    const el = $('#hero'); if (!el || !feat[i]) return;
    el.dataset.heroKey = heroKey(feat[i]);
    const s = feat[i], pre = s.__prelaunch || null, reason = featReasons[s.id], p = pre ? null : prog[s.id], lc = pre ? null : lastCh[s.id], n = p?.chapter_num || lc?.num || 1; const pub = pre ? null : newsBySeries[s.id], v = pre ? { num: pre.vnum, cover_path: pre.cover_path } : pub?.kind === 'volume' ? pub.volume : null, art = v?.cover_path || s.cover_path; const heroCover = art && s.cover_thumb_path && art === s.cover_path ? thumb(s) : media(art); const freshDate = publicationDate(pub?.at || lc?.publish_at), fresh = !!freshDate && Date.now() - freshDate.getTime() < 7 * 864e5;
    const preAt = pre && new Date(pre.at), preWhen = preAt ? preAt.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: window.obiTZ?.() || undefined }) : '';
    const preTime = preAt ? Math.max(0, preAt - Date.now()) : 0, preDays = Math.ceil(preTime / 864e5), preHours = Math.ceil(preTime / 36e5), preLeft = preTime > 864e5 ? preDays + (preDays === 1 ? ' día' : ' días') : preTime > 36e5 ? preHours + (preHours === 1 ? ' hora' : ' horas') : Math.max(1, Math.ceil(preTime / 6e4)) + ' min';
    const dateInTZ=d=>new Intl.DateTimeFormat('en-CA',{timeZone:window.obiTZ?.()||'America/Monterrey',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
    const preTomorrow=!!pre && preTime>0 && preTime<=864e5 && dateInTZ(preAt)!==dateInTZ(new Date());
    // frase de gancho: la primera oración completa (acepta comillas de cierre); si es larga o no hay más texto, no se separa
    const synT = (s.synopsis || '').replace(/\r/g, '').trim(), lines = synT.split(/\n+/), sents = lines[0].split(/(?<=[.!?…]["”»'’)]*)\s+/);
    let tag = lines.length > 1 && lines[0].length <= 140 ? lines[0] : sents.length > 1 && sents[0].length <= 110 ? sents[0] : '';
    // Identidad excluyente: con logo, solo imagen; sin logo, solo nombre.
    // Ambas variantes usan exactamente el mismo enlace al perfil del equipo.
    const hasTeamImage = !!s.teams?.avatar_path;
    const teamLogo = s.teams?.slug
      ? `<a class="ob-hero-team-logo${hasTeamImage ? '' : ' is-text'}" href="/equipo/${encodeURIComponent(s.teams.slug)}" aria-label="Visitar el equipo ${esc(s.teams.name || 'traductor')}">
          ${hasTeamImage
            ? `<img src="${esc(media(s.teams.avatar_path))}" alt="" width="140" height="140" loading="lazy" decoding="async">`
            : `<span>${esc(s.teams.name || 'Equipo traductor')}</span>`}</a>`
      : '';
    el.innerHTML = `<span class="ob-vk" aria-hidden="true">${pre ? "予告" : "新刊案内"}</span>
      <div class="ob-cov"><div class="f" style="${art ? `background-image:url('${esc(heroCover)}')` : ''}"></div></div>
      <div class="ob-txt"><div class="ob-hero-copy"><div class="ob-hero-head"><div class="ob-hero-meta"><span class="ob-kick">${pre ? 'ESTRENO · ' + preWhen : v ? '第' + KN(v.num) + '巻 · 新刊' : '第' + KN(lc?.num || 1) + '章' + (fresh ? ' · 新刊' : '')}</span><div class="ob-hero-flags"><span class="ob-badge${pre ? ' ob-badge-vol' : v ? ' ob-badge-vol' : ''}" ${pre ? 'style="background:#8cc3f2;color:#0d0c0a"' : ''}>${pre ? (preTomorrow ? 'ESTRENO MAÑANA · VOL. ' : 'PRÓXIMO ESTRENO · VOL. ') + pre.vnum : reason?.kind !== 'release' ? esc(reason?.label || 'Destacado') : reason?.label === 'Nuevo lanzamiento' ? '¡NUEVO LANZAMIENTO! · VOL. ' + v?.num : reason?.urgent ? '¡NOVELA COMPLETA! · VOL. ' + v.num : v ? (fresh ? '¡NUEVO VOLUMEN! · VOL. ' : 'VOLUMEN DISPONIBLE · VOL. ') + v.num : currentNotice(s)?.kind === 'chapter' ? 'CAPÍTULO PUBLICADO' : fresh ? 'NUEVO · CAP. ' + (lc?.num || 1) : 'CAP. ' + (lc?.num || 1) + (lc ? ' · ' + ago(lc.publish_at).toUpperCase() : '')}</span>${pre ? '' : heroTag(s)}</div>${!pre && top[s.id] ? `<div class="ob-hero-rank"><a class="rk-bdg" href="/ranking"><b>#${top[s.id]}</b>Top de la semana</a></div>` : ''}</div>${teamLogo}</div>${s.publicCredits?.some(c => !c.is_primary) ? `<span class="ob-hero-partners">${creditsHTML({publicCredits:s.publicCredits.filter(c=>!c.is_primary)}, {esc,media,mode:'hero'})}</span>` : ''}
        <h1 data-len="${(s.title.length + (v ? 12 + String(v.num).length : 0)) > 70 ? 'xl' : (s.title.length + (v ? 12 + String(v.num).length : 0)) > 40 ? 'l' : ''}"><a class="ob-h1a" href="/serie/${s.slug}" title="${esc(s.title + (v ? ' — Volumen ' + v.num : ''))}">${esc(s.title)}${v ? ' — Volumen ' + esc(v.num) : ''}</a></h1>${tag ? `<p class="ob-tag">${esc(tag)}</p>` : ''}<p class="ob-syn" style="white-space:pre-line">${esc(s.synopsis ? (synT.slice(tag.length).replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n') || synT) : pre ? 'Conoce la historia antes de su estreno. Los capítulos permanecen bloqueados hasta la fecha indicada.' : [s.author && ('De ' + s.author), s.teams?.name && ('traducida por ' + s.teams.name), (s.chapters?.[0]?.count || 0) + ' capítulos en español'].filter(Boolean).join(' · ') + '.')}</p></div><div class="ob-hero-footer">
        ${pre ? `<p class="ob-prelaunch-timer" style="margin:8px 0;color:#8cc3f2;font-size:13px">🔒 Lectura bloqueada · Estreno: ${esc(preWhen)} · Faltan ${esc(preLeft)}</p><div class="ob-acts"><a class="a1" href="/serie/${encodeURIComponent(s.slug)}">Ver primer vistazo →</a><a class="a2" href="/calendario?f=prog">Ver en el calendario</a></div>` : `<div class="ob-acts"><a class="a1" href="${v ? '/serie/' + s.slug : '/leer/' + s.slug + '/' + n}">${v ? 'Ver volumen ' + v.num : p ? 'Continuar capítulo ' + n : 'Leer capítulo ' + (lc?.num || 1)}</a>${v && (p || lc) ? `<a class="a2" href="/leer/${s.slug}/${n}">${p ? 'Continuar lectura' : 'Empezar a leer'}</a>` : `<a class="a2" href="/serie/${s.slug}">Ver la serie</a>`}</div>`}</div></div>
      ${feat.length > 1 ? `<div class="ob-pager2" style="position:absolute;left:clamp(16px,4vw,56px);right:clamp(16px,4vw,56px);bottom:14px;z-index:2;display:flex;align-items:center;gap:10px"><button data-dir="-1" aria-label="Anterior" style="width:40px;height:40px;background:#16140f;border:1px solid #3d3628;color:var(--paper);font-size:18px;cursor:pointer">‹</button><span style="display:flex;gap:6px;align-items:center;flex:1;min-width:0">${feat.length > 10 ? `<span class="mono" aria-label="Diapositiva ${i+1} de ${feat.length}" style="min-width:70px;text-align:center;font:600 12px 'IBM Plex Mono',monospace;color:var(--paper)">${i+1} / ${feat.length}</span>` : feat.map((f, j) => `<button data-j="${j}" data-hero-target="${esc(heroKey(f))}" aria-label="${esc(f.title)}" aria-current="${j === i}" style="height:10px;flex:${j === i ? '0 1 160px' : '0 0 10px'};min-width:10px;padding:0;border:none;cursor:pointer;position:relative;overflow:hidden;background:${j === i ? '#3d3628' : '#5a5244'}">${j === i ? `<i class="ob-hp" style="position:absolute;inset:0;background:var(--gold);transform-origin:left;transform:scaleX(${heroPaused ? 1 : 0});${heroPaused || matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : 'animation:obHp 8s linear forwards'}"></i>` : ''}</button>`).join('')}</span><button data-hp aria-label="${heroPaused ? 'Reanudar' : 'Pausar'}" style="height:40px;padding:0 12px;background:#16140f;border:1px solid #3d3628;color:var(--paper);font-family:'IBM Plex Mono',monospace;font-size:12px;cursor:pointer">${heroPaused ? '▶ Reanudar' : 'Ⅱ Pausar'}</button><button data-dir="1" aria-label="Siguiente" style="width:40px;height:40px;background:#16140f;border:1px solid #3d3628;color:var(--paper);font-size:18px;cursor:pointer">›</button></div>` : ''}`;
    // Si el recurso deja de existir, convertirlo en nombre sin perder el enlace.
    el.querySelector('.ob-hero-team-logo img')?.addEventListener('error', event => {
      const img = event.currentTarget, anchor = img.closest('.ob-hero-team-logo');
      if (!anchor) return;
      const fallback = document.createElement('span');
      fallback.textContent = s.teams?.name || 'Equipo traductor';
      anchor.classList.add('is-text');
      img.replaceWith(fallback);
    });
    const metricCategory=homeMetricCategory(reason,!!pre);
    homeMetrics.shown(heroKey(s),metricCategory);
    el.querySelectorAll('.ob-txt a[href^="/"]:not(.ob-hero-team-logo)').forEach(a =>
      a.addEventListener('click', () => homeMetrics.clicked(s.slug,metricCategory)));
    el.querySelectorAll('[data-j], [data-dir]').forEach(b => b.onclick = () => {
      // La lista puede cambiar al llegar recomendaciones/preestrenos: calcular flechas
      // a partir de la obra VISIBLE, no del índice previo al refresco asíncrono.
      const current = feat.findIndex(item => heroKey(item) === el.dataset.heroKey);
      const target = b.hasAttribute('data-dir')
        ? (Math.max(0, current) + Number(b.dataset.dir) + feat.length) % feat.length
        : Math.max(0, feat.findIndex(item => heroKey(item) === b.dataset.heroTarget));
      heroSlide(feat, target, prog, lastCh, top, newsBySeries, featReasons);
    });
    el.querySelector('[data-hp]')?.addEventListener('click', () => { heroPaused = !heroPaused; heroSlide(feat, i, prog, lastCh, top, newsBySeries, featReasons); });
    if (heroClockEl !== el) {
      heroClock?.dispose();
      heroClockEl = el;
      const clock = createHeroRotationClock();
      heroClock = clock;
      el.addEventListener('mouseenter', () => clock.hover(true));
      el.addEventListener('mouseleave', () => clock.hover(false));
    }
    heroClock.show({
      next: () => {
        if (!document.body.contains(el)) return;
        const current = feat.findIndex(item => heroKey(item) === el.dataset.heroKey);
        heroSlide(feat, (Math.max(0, current) + 1) % feat.length,
          prog, lastCh, top, newsBySeries, featReasons);
      },
      canRotate: feat.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches,
      isPaused: heroPaused,
      isHovered: matchMedia('(hover: hover)').matches && el.matches(':hover'),
      stateChanged: blocked => {
        const progress = el.querySelector('.ob-hp');
        if (progress) progress.style.animationPlayState = blocked ? 'paused' : 'running';
      }
    });
  }
  const card = (s, st, lc, p) => `<a class="ui-card" href="/serie/${s.slug}" data-id="${s.id}">${st ? `<span class="ui-st ${st[1]}">${esc(st[0])}</span>` : ''}${book(s, null, true)}${progBar(s, p)}<h3>${esc(s.title)}</h3>${creditsHTML(s, { esc, media, mode: 'carousel' })}<span class="meta">${pill(s.translation_status)}<span>${s.chapters?.[0]?.count ?? 0} cap.</span>${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</span>${lc ? `<span class="last">Último: cap. ${lc.num}${ageTag(lc.publish_at)}</span>` : ''}</a>`;

  // franja de avance en la serie: capítulo donde vas / capítulos publicados
  const progBar = (s, p) => { const t = s.chapters?.[0]?.count || 0; if (!p || !t) return ''; const f = Math.min(1, Math.max(0.02, (p.chapter_num - 1 + (p.pct || 0)) / t)); return `<span class="ui-prog" role="img" aria-label="Vas en el capítulo ${p.chapter_num} de ${t}"><i style="width:${(f * 100).toFixed(1)}%"></i></span>`; };
  const ficha = (s, st, lc, i, p) => `<a class="ui-fc" href="/serie/${s.slug}" data-id="${s.id}" style="--c:${esc(color(s))};--d:${Math.min(i, 8) * 0.05}s">
      <span class="cv" style="${s.cover_path ? `background-image:url('${esc(thumb(s))}')` : ''}"></span>
      <span class="bd"><span class="t">${esc(s.title)}</span>${s.original || s.author ? `<span class="o">${esc([s.original, s.author].filter(Boolean).join(' · '))}</span>` : ''}${s.synopsis ? `<span class="sy">${esc(s.synopsis)}</span>` : ''}
        <span class="m">${s.chapters?.[0]?.count ?? 0} cap. · ${(TL[s.translation_status] || TL.active)[0]}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}${lc ? ' · último: cap. ' + lc.num + ageTag(lc.publish_at, ', ') : ''}${s.adult ? ' · <span class="x">+18</span>' : ''}</span>${creditsHTML(s, { esc, media, mode: 'carousel' })}${progBar(s, p)}</span>
      <span class="side">${st ? `<span class="ui-seal ${st[1]}">${esc(st[0])}</span>` : '<span></span>'}<span class="jp">第${KN(i + 1)}号</span></span></a>`;

  // ---------- Catálogo ----------
  // La vista series_last usa RLS. Reutilizamos la misma respuesta durante una
  // navegación breve sin compartir datos entre usuarios ni almacenar capítulos.
  let recentCache = null;
  const catalogRecent = () => {
    const who = getUser()?.id || 'anon', now = Date.now();
    if (recentCache?.who === who && now - recentCache.at < 20000) return recentCache.promise;
    const fallback = () => sb.from('chapters').select('num,publish_at,series_id').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).limit(500);
    const promise = sb.from('series_last').select('series_id,num,publish_at').then(r => r.error ? fallback() : r, fallback);
    recentCache = { who, at: now, promise };
    promise.then(r => { if (r?.error && recentCache?.promise === promise) recentCache = null; },
      () => { if (recentCache?.promise === promise) recentCache = null; });
    return promise;
  };

  async function catalog(){
    app.innerHTML = '<p class="mono">Cargando el catálogo…</p>';
    const u = getUser(), F = readF();
    // Página por rangos en PostgREST: se conservan TODOS los resultados para
    // filtros/ordenamientos globales y se evita el límite de 1000 filas.
    const listAll = import('/paging.js?v=1').then(({ readPages }) =>
      readPages((from, to) => sb.from('series').select(SERIES).order('id').range(from, to), { size: 250 }));
    const [{ data }, { data: latest }, prog, folR, { data: rkw }, { data: rkh }] = await Promise.all([
      listAll,
      catalogRecent(),
      progressMap(),
      u ? sb.from('follows').select('series_id').eq('user_id', u.id) : { data: [] },
      sb.from('rankings').select('series_id,pos').eq('list', 'leidas').eq('period', 'semana'), sb.from('rankings').select('series_id,pos').eq('list', 'leidas').eq('period', 'historico')]);
    const rkRows = (rkw || []).length ? rkw : (rkh || []), RK = Object.fromEntries(rkRows.map(r => [r.series_id, r.pos])), rkLbl = (rkw || []).length ? 'de la semana' : 'histórico';
    const all = (data || []).filter(s => !['abandoned', 'withdrawn'].includes(s.translation_status) && (!hidS(s) || F.gin.some(g => (s.genres || []).includes(g))));
    await attachPublicCredits(sb, all);
    const last = {}; (latest || []).forEach(c => { last[c.series_id] ||= c; });
    const fol = new Set((folR.data || []).map(r => r.series_id)), nCh = s => s.chapters?.[0]?.count || 0;
    const status = s => { const p = prog[s.id], lc = last[s.id];
      if (p && lc && lc.num > p.chapter_num && new Date(lc.publish_at) > new Date(p.updated_at)) return ['Nuevo · cap. ' + lc.num, 'new'];
      if (p) return ['Leyendo · cap. ' + p.chapter_num + (p.pct > 0.02 && p.pct < 0.98 ? ' · ' + Math.round(p.pct * 100) + ' %' : ''), 'reading'];
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
      <nav id="cat-pages" aria-label="Paginación del catálogo" style="display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin:22px 0"></nav>
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
    const PAGE_SIZE = 24;
    let currentPage = 1, lastFilterKey = '';
    const draw = () => {
      const filterKey = JSON.stringify({ F, view });
      if (filterKey !== lastFilterKey) { currentPage = 1; lastFilterKey = filterKey; }
      const list = all.filter(pass(F)).sort((SORT[F.sort] || SORT.popular)[1]), act = actives();
      const pageTotal = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      currentPage = Math.min(currentPage, pageTotal);
      const pageStart = (currentPage - 1) * PAGE_SIZE;
      const grid = $('#cat-grid'); grid.className = view === 'fichero' ? 'ui-fich' : 'ui-grid ob-anim';
      document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('on', b.dataset.view === view); b.setAttribute('aria-pressed', b.dataset.view === view); });
      if (list.length) grid.innerHTML = list.slice(pageStart, pageStart + PAGE_SIZE).map((s, i) => view === 'fichero' ? ficha(s, status(s), last[s.id], pageStart + i, prog[s.id]) : card(s, status(s), last[s.id], prog[s.id])).join('');
      else {
        const tips = act.map(([label, undo], i) => { const f = clone(); undo(f); return { i, label, n: all.filter(pass(f)).length }; }).filter(t => t.n).sort((x, y) => y.n - x.n).slice(0, 4);
        $('#cat-grid').innerHTML = `<div class="ui-empty"><p><strong>Ninguna obra coincide con estos filtros.</strong></p>${tips.length ? `<div class="ui-chips">${tips.map(t => `<button class="ui-chip" data-undo="${t.i}">Quitar ${esc(t.label)} · ${t.n} ${t.n === 1 ? 'obra' : 'obras'}</button>`).join('')}</div>` : '<p class="mono">Prueba con otra búsqueda.</p>'}<button class="ui-chip" data-undo="all" style="justify-self:start">Limpiar todos los filtros</button></div>`;
        $('#cat-grid').querySelectorAll('[data-undo]').forEach(btn => btn.onclick = () => { if (btn.dataset.undo === 'all') return $('#cat-clear').click(); act[+btn.dataset.undo][1](F); if (!F.q) $('#cat-q').value = ''; $('#cat-adult').checked = !F.adult; draw(); });
      }
      const nav = $('#cat-pages');
      nav.innerHTML = pageTotal > 1 ? `<button type="button" class="ui-chip" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>← Anterior</button><span class="mono" aria-live="polite">Página ${currentPage} de ${pageTotal}</span><button type="button" class="ui-chip" data-page="next" ${currentPage === pageTotal ? 'disabled' : ''}>Siguiente →</button>` : '';
      nav.querySelectorAll('[data-page]').forEach(b => b.onclick = () => {
        currentPage += b.dataset.page === 'prev' ? -1 : 1;
        draw();
        document.getElementById('cat-grid')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
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
            <h2 id="qv-t">${esc(s.title)}</h2>${creditsHTML(s, { esc, media, mode: 'detail' })}${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
            <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).slice(0, 6).map(g => `<span class="ui-chip" style="cursor:default">${esc(g)}</span>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
            ${s.synopsis ? `<p class="syn">${esc(s.synopsis)}</p>` : '<p class="mono" style="margin:14px 0">Sin sinopsis todavía.</p>'}
            <p class="mono" style="margin:0 0 16px">${nCh(s)} capítulos${lc ? ' · último: cap. ' + lc.num + ageTag(lc.publish_at) : ''}${st ? ' · ' + esc(st[0]) : ''}</p>
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
    const [{ data: chs0 }, { data: ser }, readR, folR, pend, { data: LK }] = await Promise.all([
      sb.from('chapters').select('id,num,vol,volume_id,title,publish_at,series_id,volumes(num,cover_path,deleted_at)').eq('status', 'published').is('deleted_at', null).order('publish_at', { ascending: false }).order('num', { ascending: false }).limit(400),
      sb.from('series').select(SERIES),
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id) : { data: [] },
      pendingMap(prog), sb.rpc('release_locks', { p_limit: 300 }).then(r => { if (r.error) console.warn('release_locks', r.error.message); return r; }, () => ({ data: [] }))]);
    const { data: UNL } = await sb.rpc('release_unlocks', { p_days: 30 }).then(r => { if (r.error) console.warn('release_unlocks', r.error.message); return r; }, () => ({ data: [] }));
    // Mecenas: capítulos «Solo mecenas» (aunque el lector no pueda abrirlos) y «Lanzamiento general» cuando se abren a todos.
    const chs = [...(chs0 || [])], have = new Map(chs.map(c => [c.id, c]));
    (Array.isArray(LK) ? LK : []).forEach(l => { let c = have.get(l.id); if (!c) { c = { id: l.id, num: +l.num, vol: l.vol, volume_id: l.volume_id, title: l.title, publish_at: l.publish_at, series_id: l.series_id, volumes: l.vnum != null ? { num: +l.vnum, cover_path: l.vcover, deleted_at: null } : null }; chs.push(c); have.set(c.id, c); }
      c.pat = !!l.patron_only; c.locked = !l.can_read; if (!l.patron_only && l.open_at) { c.gen = true; c.early_at = c.publish_at; c.publish_at = l.open_at; } });
    await attachPublicCredits(sb, ser || []);
    const byId = Object.fromEntries((ser || []).map(s => [s.id, s])), read = new Set((readR.data || []).map(r => r.chapter_id)), fol = new Set((folR.data || []).map(r => r.series_id));
    const seenKey = 'obi-rel-seen', seen = +localStorage.getItem(seenKey) || 0;
    const groups = []; const gi = {};
    (chs || []).forEach(c => { const s = byId[c.series_id]; if (!s || ['withdrawn'].includes(s.translation_status)) return; if (!gi[s.id]) { gi[s.id] = { s, list: [] }; groups.push(gi[s.id]); } gi[s.id].list.push(c); });
    groups.forEach(g => g.list.sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at) || b.num - a.num));
    groups.sort((a, b) => new Date(b.list[0].publish_at) - new Date(a.list[0].publish_at));
    // portada de una actualización: la del volumen más reciente con portada entre sus capítulos; si no, la de la obra
    const ucov = g => { const c = g.list.filter(x => x.volumes?.cover_path && !x.volumes.deleted_at).sort((a, b) => (b.volumes.num ?? 0) - (a.volumes.num ?? 0))[0]; return c ? media(c.volumes.cover_path) : g.s.cover_path ? thumb(g.s) : ''; };
    const vnum = c => c.volumes?.num ?? c.vol, sameV = (a, b) => a.volume_id && b.volume_id ? a.volume_id === b.volume_id : a.vol === b.vol;
    const types = [...new Set(groups.map(g => g.s.work_type || 'Novela ligera'))].sort();
    const teams = [...new Set(groups.flatMap(g => creditTeams(g.s).map(t => t.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    let muted; try { muted = new Set(JSON.parse(localStorage.getItem('obi-rel-muted') || '[]')); } catch { muted = new Set(); }
    const saveMuted = () => localStorage.setItem('obi-rel-muted', JSON.stringify([...muted]));
    const DAY = 864e5, startOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return +x; }, today = startOf(Date.now());
    const bucket = d => { const t = startOf(d); return t >= today ? 'Hoy' : t >= today - DAY ? 'Ayer' : t >= today - 6 * DAY ? 'Esta semana' : 'Antes'; };
    app.innerHTML = `<div class="ui-cath"><div><h1>Lanzamientos</h1><p>Lo último de cada serie, agrupado por obra.</p></div><span class="kj" aria-hidden="true">新刊</span></div>
      <div class="ui-rbar"><div class="ui-chips"><button class="ui-chip" data-rt="">Todos</button>${types.map(t => `<button class="ui-chip" data-rt="${esc(t)}">${esc(t)}</button>`).join('')}</div><div class="ui-chips" role="group" aria-label="Mostrar"><button class="ui-chip" data-by="cap">Por capítulo</button><button class="ui-chip" data-by="vol">Por volumen</button></div>${u ? '<label class="ui-tog"><input type="checkbox" id="rel-mine"> Solo las que sigo</label>' : ''}${teams.length > 1 ? `<select id="rel-team" aria-label="Equipo de traducción"><option value="">Todos los equipos</option>${teams.map(t => `<option ${t === R.team ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}${u ? '<label class="ui-tog"><input type="checkbox" id="rel-hide"> Ocultar lo leído</label>' : ''}<button class="ui-chip" id="rel-dense">Vista compacta</button><button class="ui-lnk" id="rel-muted" hidden></button><span class="mono" style="margin-left:auto"><a href="/calendario">Próximos lanzamientos →</a></span></div>
      <div class="ui-mlist" id="rel-mlist" hidden></div>${(UNL || []).length ? `<section style="margin:18px 0 26px;padding:14px 16px;border:1px solid #3d3628;display:grid;gap:8px"><h2 style="margin:0;font-size:17px">Próximamente</h2>${(UNL || []).slice(0, 12).map(e => { const d = new Date(e.at), m = Math.round((d - Date.now()) / 6e4), w = m < 60 ? 'en ' + Math.max(1, m) + ' min' : m < 1440 ? 'en ' + Math.round(m / 60) + ' h' : Math.round(m / 1440) === 1 ? 'mañana' : 'en ' + Math.round(m / 1440) + ' días', nn = (e.nums || []).map(Number), cap = nn.length > 1 ? 'Caps. ' + nn[0] + '–' + nn[nn.length - 1] : 'Cap. ' + nn[0]; return `<a href="/serie/${esc(e.slug)}" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;color:inherit;text-decoration:none"><span style="font-weight:600;color:${e.kind === 'general' ? '#a9d18e' : '#f96854'}">${e.kind === 'general' ? 'Se abre a todo público' : '🔒︎ Solo mecenas'}</span><b>${esc(e.stitle)}</b><span class="mono">${e.vnum != null ? 'Vol. ' + (+e.vnum) + ' · ' : ''}${cap} · ${w} · ${d.toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></a>`; }).join('')}</section>` : ''}<div id="rel"></div>`;
    const item = (s, c) => `<a class="it${read.has(c.id) ? ' read' : ''}${new Date(c.publish_at) > seen && seen && !read.has(c.id) ? ' new' : ''}" href="/leer/${s.slug}/${c.num}" title="${esc(c.title)}${c.pat ? ' · Solo mecenas' : c.gen ? ' · Lanzamiento general' : ''}"><b>${c.locked ? '🔒︎ ' : ''}Cap. ${c.num}</b><small>${c.pat ? '<span style="color:#f96854;font-weight:600">Solo mecenas</span> · ' : c.gen ? '<span style="color:#a9d18e;font-weight:600">General</span> · ' : ''}${ago(c.publish_at)}</small></a>`;
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
        <a class="cv" href="/serie/${s.slug}" data-id="${s.id}" aria-label="Vista rápida de ${esc(s.title)}" style="${ucov(g) ? `background-image:url('${esc(ucov(g))}')` : ''}"></a>
        <div class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a>${utag(s)}
          ${creditsHTML(s, { esc, media, mode: 'carousel' })}<span class="mt"><b>${vl}</b> · ${n === 1 ? '1 capítulo' : n + ' capítulos'} (cap. ${lo === hi ? lo : lo + '–' + hi}) · ${ago(top.publish_at)}${g.list.some(c => c.pat) ? ' · <span style="color:#f96854;font-weight:600">Solo mecenas</span>' : g.list.some(c => c.gen) ? ' · <span style="color:#a9d18e;font-weight:600">Lanzamiento general</span>' : ''}${s.teams?.name ? ' · ' + esc(s.teams.name) : ''}</span>
          <div class="acts">${unread.length ? `<a class="btn" href="/leer/${s.slug}/${unread[0].num}">${unread.length === n ? 'Leer ' + vl.toLowerCase() : 'Seguir en cap. ' + unread[0].num}</a>` : '<span class="mono" style="align-self:center">✓ Ya lo leíste</span>'}<button class="btn ghost" data-fol="${s.id}">${fol.has(s.id) ? '✓ Siguiendo' : 'Seguir'}</button>${u && unread.length ? `<button class="btn ghost" data-rd="${s.id}" data-vk="${esc(g.key)}">Marcar volumen como leído</button>` : ''}<button class="btn ghost" data-mute="${s.id}" title="No mostrar esta serie en Lanzamientos">Silenciar</button></div></div></article>`; };
    const rowCard = (g, i) => { const s = g.s, top = g.list[0], nums = g.list.map(c => c.num), unread = g.list.filter(c => !read.has(c.id)).sort((a, b) => a.num - b.num);
      const what = R.by === 'vol' ? `${vnum(top) != null ? 'Vol. ' + vnum(top) : 'Capítulos sueltos'} · cap. ${Math.min(...nums) === Math.max(...nums) ? nums[0] : Math.min(...nums) + '–' + Math.max(...nums)}` : g.list.slice(0, 3).map(c => 'cap. ' + c.num + (read.has(c.id) ? ' ✓' : '')).join(', ');
      const n = R.by === 'vol' ? unread[0]?.num : (nextOf(s) ?? unread[0]?.num);
      return `<article class="ui-rc" style="--c:${esc(color(s))}"><span class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a>${utag(s)}${creditsHTML(s, { esc, media, mode: 'carousel' })}<span class="mt">${what}${pend[s.id] ? ` · <span class="pend">te ${pend[s.id] === 1 ? 'falta 1' : 'faltan ' + pend[s.id]}</span>` : ''}</span></span><span class="w">${ago(top.publish_at)}</span>${n ? `<a class="btn" href="/leer/${s.slug}/${n}">Leer cap. ${n}</a>` : '<span class="mono">✓ Leído</span>'}</article>`; };
    const draw = () => {
      const unit = n => R.by === 'vol' ? (n === 1 ? 'volumen' : 'volúmenes') : (n === 1 ? 'serie' : 'series');
      const list = (R.by === 'vol' ? volGroups() : groups).filter(g => (!R.type || (g.s.work_type || 'Novela ligera') === R.type) && (!R.mine || fol.has(g.s.id)) && (!R.team || creditTeams(g.s).some(t => t.name === R.team)) && !muted.has(g.s.id) && (!R.hide || g.list.some(c => !read.has(c.id))));
      const vis = list.slice(0, R.shown); let html = '', last = '';
      vis.forEach((g, i) => {
        const b = bucket(g.list[0].publish_at);
        if (b !== last) { const n = list.filter(x => bucket(x.list[0].publish_at) === b).length; html += `<h2 class="ui-rday">${b}<span>· ${n} ${unit(n)}</span></h2>`; last = b; }
        if (R.dense) { html += rowCard(g, i); return; }
        if (R.by === 'vol') { html += volCard(g, i); return; }
        const s = g.s, top = g.list[0], sameVol = g.list.filter(c => sameV(c, top) && new Date(top.publish_at) - new Date(c.publish_at) < DAY).length;
        html += `<article class="ui-rl" style="--c:${esc(color(s))};--d:${Math.min(i, 8) * 0.04}s">
          <a class="cv" href="/serie/${s.slug}" data-id="${s.id}" aria-label="Vista rápida de ${esc(s.title)}" style="${ucov(g) ? `background-image:url('${esc(ucov(g))}')` : ''}"></a>
          <div class="bd"><a class="t" href="/serie/${s.slug}">${esc(s.title)}</a>${utag(s)}<span class="mt">${esc(s.work_type || 'Novela ligera')}${s.teams?.name ? ` · <b>${esc(s.teams.name)}</b>` : ''}${fol.has(s.id) ? ' · Siguiendo' : ''}${pend[s.id] ? ` · <span class="pend">te ${pend[s.id] === 1 ? 'falta 1 capítulo' : 'faltan ' + pend[s.id] + ' capítulos'}</span>` : ''}</span>${creditsHTML(s, { esc, media, mode: 'carousel' })}
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
  // Mantener brevemente la ficha pública precargada cuando el lector señala un enlace.
  // Solo se guarda en memoria y se descarta tras unos segundos o si hubo un error.
  let seriesSeq = 0;
  const seriesCache = new Map();
  const seriesMeta = slug => {
    const hit = seriesCache.get(slug);
    if (hit && Date.now() - hit.at < 15000) return hit.promise;
    seriesCache.delete(slug);
    const promise = Promise.resolve(sb.from('series').select(SERIES).eq('slug', slug).maybeSingle())
      .then(r => { if (r.error) seriesCache.delete(slug); return r; })
      .catch(error => { seriesCache.delete(slug); return { data: null, error }; });
    seriesCache.set(slug, { at: Date.now(), promise });
    if (seriesCache.size > 8) seriesCache.delete(seriesCache.keys().next().value);
    return promise;
  };
  const prefetchSeries = slug => { if (/^[\w-]+$/.test(slug)) seriesMeta(slug); };
  async function series(slug){
    const seq = ++seriesSeq, targetPath = '/serie/' + slug;
    const stillHere = () => seq === seriesSeq && location.pathname === targetPath;
    // Cambiar de vista al instante: no dejar visible la pantalla anterior.
    app.innerHTML = '<div class="ui-wrap ui-series-page"><p class="mono" role="status">Cargando ficha de la novela…</p></div>';
    // Preestrenos se consultan en paralelo pero no retienen el primer render.
    const preQuery = Promise.resolve(sb.rpc('prelaunch_series', { p_slug: slug }))
      .catch(error => ({ data: null, error }));
    const { data: s, error: seriesError } = await seriesMeta(slug);
    if (!stillHere()) return;
    if (seriesError) {
      app.innerHTML = '<p class="mono" role="alert">No pudimos cargar esta novela. <a href="' + esc(targetPath) + '">Reintentar →</a></p>';
      return;
    }
    if (!s) {
      const { data: pre, error: preError } = await preQuery;
      if (!stillHere()) return;
      if (preError) console.warn('prelaunch_series', preError.message);
      const PRE = pre?.volumes?.length ? await import('./prelaunch.js?v=1') : null;
      if (!stillHere()) return;
      if (PRE) { await attachPublicCredits(sb, [pre.series]); if (!stillHere()) return; PRE.landing(pre, app, esc, media); PRE.bind(pre, app, sb, getUser, go, toast); return; }
      app.innerHTML = '<h1>Esta serie no está en el estante</h1><p><a href="/catalogo">Volver al catálogo</a></p>'; return;
    }
    // Primer contenido útil: título, portada, género y ficha editorial mientras
    // siguen cargándose capítulos, accesos, volúmenes y descargas en paralelo.
    fxCss();
    app.innerHTML = `<div class="ui-wrap ui-series-page" aria-busy="true">
      <section class="ui-sh ui-series-hero" id="serie-portada" style="--c:${esc(color(s))};--bg:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}">
        ${book(s)}
        <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.demographic ? ' · ' + esc(s.demographic) : ''}</span>
          <h1>${esc(s.title)}</h1>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).map(g => `<a class="ui-chip" href="/catalogo?g=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          <p class="mono" id="serie-loading-status" role="status" style="margin:20px 0;color:var(--mute)">Preparando capítulos, volúmenes y descargas…</p>
        </div>
      </section></div>`;
    await attachPublicCredits(sb, [s]);
    if (!stillHere()) return;
    const u = getUser();
    const details = await Promise.all([
      preQuery,
      sb.from('volumes').select('id,num,title,cover_path,synopsis,status,external_url,external_site,external_only').eq('series_id', s.id).eq('status', 'published').is('deleted_at', null).order('num', { ascending: false }),
      sb.rpc('series_toc', { p_series: s.id }).then(x => x.error ? sb.from('chapters').select('id,num,vol,volume_id,title,section_type,publish_at').eq('series_id', s.id).is('deleted_at', null).order('num') : x),
      progressMap(),
      u ? sb.from('read_chapters').select('chapter_id').eq('user_id', u.id) : { data: [] },
      u ? sb.from('follows').select('series_id').eq('user_id', u.id).eq('series_id', s.id) : { data: [] },
      sb.rpc('series_downloads_v2', { p_series: s.id }).then(r => r.error?.code === 'PGRST202' ? sb.rpc('series_downloads', { p_series: s.id }) : r),
      sb.from('purchase_links').select('id,volume_id,vol,store,region,fmt').eq('series_id', s.id).eq('verified', true).order('vol').order('id'),
      sb.from('patreon_public').select('url').eq('owner', s.team_id).maybeSingle()
    ]).catch(error => {
      if (stillHere()) {
        const status = app.querySelector('#serie-loading-status');
        if (status) status.innerHTML = 'No pudimos cargar los capítulos y volúmenes. <a href="' + esc(targetPath) + '">Reintentar →</a>';
        console.warn('series loading', error);
      }
      return null;
    });
    if (!details || !stillHere()) return;
    const [{ data: pre, error: preError }, { data: vols }, { data: chs }, prog, readR, folR, { data: dls, error: dlError }, { data: buys }, { data: pt }] = details;
    if (preError) console.warn('prelaunch_series', preError.message);
    const PRE = pre?.volumes?.length ? await import('./prelaunch.js?v=1') : null;
    if (!stillHere()) return;
    (vols || []).sort((a, b) => (parseFloat(b.num) || 0) - (parseFloat(a.num) || 0));
    const buyOf = v => (buys || []).filter(b => b.volume_id === v.id || (!b.volume_id && b.vol === v.num));
    // capítulos sin leer de ESTA obra (solo con sesión): publicados, no marcados como leídos y después de donde vas
    const unread = u ? (() => { const rs = new Set((readR?.data || []).map(x => x.chapter_id)), at = prog?.[s.id]?.chapter_num ?? -Infinity, now = Date.now(); return (chs || []).filter(c => (!c.publish_at || new Date(c.publish_at) <= now) && !rs.has(c.id) && c.num > at).length; })() : null;
    const dlOf = v => (dls || []).filter(d => d.volume_id === v.id || (!d.volume_id && d.vol === v.num));
    const patronLink = (() => { const fallback = s.teams?.slug ? '/equipo/' + encodeURIComponent(s.teams.slug) : '/serie/' + encodeURIComponent(s.slug); try { const u = new URL(pt?.url); return u.protocol === 'https:' && /(^|\.)patreon\.com$/i.test(u.hostname) ? u.toString() : fallback; } catch { return fallback; } })();
    const read = new Set((readR.data || []).map(r => r.chapter_id)), p = prog[s.id], following = !!(folR.data || []).length;
    const first = (chs || [])[0], allCh = chs || [], nRead = allCh.filter(c => read.has(c.id)).length;
    const pIdx = p ? allCh.findIndex(c => c.num === p.chapter_num) : -1;
    const nextUnread = allCh.slice(Math.max(0, pIdx)).find(c => !read.has(c.id) && c.num !== p?.chapter_num) || allCh.find(c => !read.has(c.id));
    const isNew = c => c.publish_at && Date.now() - new Date(c.publish_at) < 7 * 864e5 && !read.has(c.id);
    const hideRead = localStorage.getItem('obi-hide-read') === '1';
    const volumeView = localStorage.getItem('obi-serie-vol-view') === 'lista' ? 'lista' : 'galeria';
    const volumeOrder = localStorage.getItem('obi-serie-vol-order') === 'asc' ? 'asc' : 'desc';
    fxCss();
    app.innerHTML = `<div class="ui-wrap ui-series-page">
      <section class="ui-sh ui-series-hero" id="serie-portada" style="--c:${esc(color(s))};--bg:${s.cover_path ? `url('${esc(thumb(s))}')` : 'none'}">
        ${book(s)}
        <div><span class="ui-lbl">${esc(s.work_type || 'Novela ligera')}${s.demographic ? ' · ' + esc(s.demographic) : ''}</span>
          <h1>${esc(s.title)}</h1>${s.original ? `<p class="orig">${esc(s.original)}</p>` : ''}
          <div class="ui-chips">${pill(s.translation_status)}${(s.genres || []).map(g => `<a class="ui-chip" href="/catalogo?g=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}${s.adult ? '<span class="ui-pill" style="color:#f59e7a">+18</span>' : ''}</div>
          <div class="rk-bdgs" id="rk-bdg"></div><div class="rk-rate" id="rk-rate"></div>
          <div class="acts ui-series-actions" style="display:flex;gap:10px;flex-wrap:wrap">${first ? `<a class="btn" href="/leer/${s.slug}/${p?.chapter_num || first.num}">${p ? 'Seguir donde ibas · Cap. ' + p.chapter_num + (p.pct > .02 && p.pct < .95 ? ' · ' + Math.round(p.pct * 100) + '%' : '') : (first.locked ? '🔒︎ Empezar a leer · solo mecenas' : 'Empezar a leer')}</a>` : ''}${p && nextUnread && nextUnread.num !== p.chapter_num ? `<a class="btn ghost" href="/leer/${s.slug}/${nextUnread.num}">Siguiente sin leer · Cap. ${nextUnread.num}</a>` : ''}<button class="btn ghost" id="follow">${following ? '✓ Siguiendo' : 'Seguir serie'}</button><a class="btn ghost" href="/anotaciones/${esc(s.slug)}">Mis anotaciones</a><a class="btn ghost ui-jump" href="#serie-vols">Explorar volúmenes ↓</a></div>
        </div>
      </section>
      <nav class="ui-series-nav" role="tablist" aria-label="Secciones de la obra">
        <a href="#serie-info" id="serie-tab-info" role="tab" aria-controls="serie-info" aria-selected="true" tabindex="0">Ficha</a>
        ${s.synopsis ? '<a href="#serie-sinopsis" id="serie-tab-sinopsis" role="tab" aria-controls="serie-sinopsis" aria-selected="false" tabindex="-1">Sinopsis</a>' : ''}
        <a href="#serie-vols" id="serie-tab-vols" role="tab" aria-controls="serie-vols" aria-selected="false" tabindex="-1">Volúmenes</a>
        <a href="#serie-descargas" id="serie-tab-descargas" role="tab" aria-controls="serie-descargas" aria-selected="false" tabindex="-1">Descargas</a>
        <a href="#rv-sec" id="serie-tab-reviews" role="tab" aria-controls="rv-sec" aria-selected="false" tabindex="-1">Reseñas</a>
      </nav>
      <section id="serie-info" class="ui-series-panel ui-series-ficha" role="tabpanel" aria-labelledby="serie-tab-info" tabindex="0">
        <div class="ui-h2"><h2>Ficha editorial</h2></div>
          <div class="ui-facts">
            ${s.author ? `<div><span class="ui-lbl">Autor</span><b>${esc(s.author)}</b></div>` : ''}
            ${s.illustrator ? `<div><span class="ui-lbl">Ilustración</span><b>${esc(s.illustrator)}</b></div>` : ''}
            ${s.publisher ? `<div><span class="ui-lbl">Editorial</span><b>${esc(s.publisher)}</b></div>` : ''}
            <div><span class="ui-lbl">Traducción</span>${creditsHTML(s, { esc, media, mode: 'detail' })}</div>
            ${s.original_status ? `<div><span class="ui-lbl">Obra original</span><b>${OR[s.original_status]}</b></div>` : ''}
            ${s.sequel_status ? `<div><span class="ui-lbl">Secuela</span><b>${SQ[s.sequel_status]}</b></div>` : ''}
            <div><span class="ui-lbl">Contenido</span><b>${(vols || []).length} vol. · ${(chs || []).length} cap.</b></div>
            ${unread != null ? `<div><span class="ui-lbl">Capítulos sin leer</span><b${unread ? ' style="color:var(--gold)"' : ''}>${unread || 'Al día'}</b></div>` : ''}
          </div>
        <div id="lock-sec"></div><div id="media-sec"></div><div id="rel-sec"></div>
      </section>
      ${s.synopsis ? `<section id="serie-sinopsis" class="ui-series-panel ui-series-synopsis" role="tabpanel" aria-labelledby="serie-tab-sinopsis" tabindex="0" hidden><div class="ui-h2"><h2>Sinopsis</h2></div><p class="ui-syn">${esc(s.synopsis)}</p></section>` : ''}
      <section id="serie-vols" class="ui-series-panel ui-series-library" role="tabpanel" aria-labelledby="serie-tab-vols" tabindex="0" hidden><div class="ui-h2"><h2>Volúmenes</h2>${u && allCh.length ? `<span class="fx-prog"><span class="mono">${nRead} de ${allCh.length} leídos</span><span class="fx-bar"><i style="width:${Math.round(nRead / allCh.length * 100)}%"></i></span>${nRead ? `<label class="ui-tog"><input type="checkbox" id="fx-hide" ${hideRead ? 'checked' : ''}> Ocultar leídos</label>` : ''}</span>` : ''}</div><div class="ui-series-tools" role="search" aria-label="Explorar capítulos"><label for="ui-series-search">Buscar capítulo<input id="ui-series-search" type="search" autocomplete="off" spellcheck="false" placeholder="Título o número del capítulo"></label><label for="ui-series-state">Estado<select id="ui-series-state"><option value="all">Todos los capítulos</option>${u ? '<option value="unread">Sin leer</option><option value="read">Leídos</option>' : ''}<option value="new">Novedades</option></select></label><label for="ui-series-order">Orden de volúmenes<select id="ui-series-order"><option value="desc" ${volumeOrder === 'desc' ? 'selected' : ''}>Más recientes primero</option><option value="asc" ${volumeOrder === 'asc' ? 'selected' : ''}>Desde el volumen 1</option></select></label><button type="button" class="ui-series-clear" id="ui-series-clear" disabled>Limpiar filtros</button></div><p class="mono ui-series-results" id="ui-series-result" role="status" aria-live="polite" aria-atomic="true"></p><div class="ui-series-shelfbar"><span class="mono">Colección de ${(vols || []).length} ${(vols || []).length === 1 ? 'libro' : 'libros'}</span><div class="ui-series-views" role="group" aria-label="Vista de volúmenes"><button type="button" data-series-view="galeria" aria-pressed="${volumeView === 'galeria'}">▦ Galería</button><button type="button" data-series-view="lista" aria-pressed="${volumeView === 'lista'}">☷ Lista</button></div></div><div class="ui-vols is-${volumeView}${hideRead && nRead ? ' fx-hide' : ''}" id="fx-vols">
        ${(vols || []).map(v => {
          const list = (chs || []).filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num));
          const vLk = list.length > 0 && list.every(c => c.locked);
          const firstVol = list[0], hereVol = list.find(c => p?.chapter_num === c.num);
          const volumeReading = u && list.length ? volumeProgress(list, read) : null;
          const named = v.title && v.title !== String(v.num) && v.title.length > 2 && !/^volumen\s*\d+$/i.test(v.title.trim());
          const cover = v.cover_path ? thumb(v) : s.cover_path ? thumb(s) : '';
          return `<article class="ui-vol ui-vol-book" data-vol-num="${esc(v.num)}"${vLk ? ' data-lock="1"' : ''}>
            <span class="th ui-v-cover ${cover ? 'has-cover' : 'no-cover'}" role="img" aria-label="Portada del volumen ${esc(v.num)}">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" fetchpriority="low" width="240" height="360">` : ''}<span class="ui-v-spine" aria-hidden="true"></span>${!cover ? `<span class="ui-v-placeholder">帯<small>VOLUMEN ${esc(v.num)}</small></span>` : ''}</span>
            <div class="ui-v-content">
              <div class="ui-v-heading"><span class="ui-lbl">LIBRO ${esc(v.num)} · ${v.external_only && v.external_url && !list.length ? 'en el sitio del traductor' : list.length + (list.length === 1 ? ' capítulo' : ' capítulos')}${vLk ? ' · Solo mecenas' : ''}</span><h3>${esc(named ? v.title : 'Volumen ' + v.num)}</h3>${v.synopsis ? `<p class="ui-v-syn">${esc(v.synopsis)}</p>` : ''}</div>
              ${volumeReading ? `<div class="ui-volume-progress" aria-label="Progreso del volumen ${esc(v.num)}: ${volumeReading.read} de ${volumeReading.total} capítulos leídos"><span>${volumeReading.read} de ${volumeReading.total} leídos</span><b>${volumeReading.pct}%</b><div class="ui-volume-progress-track"><i style="width:${volumeReading.pct}%"></i></div></div>` : ''}
              ${v.external_url ? `<div class="ui-dl ui-ext"><span class="ui-lbl">${v.external_only ? 'Este volumen se lee en el sitio del equipo traductor' : 'También disponible en el sitio del traductor'}</span><a class="ui-dlb ext" href="${esc(v.external_url)}" target="_blank" rel="noopener noreferrer">Leer en ${esc(v.external_site || s.teams?.name || 'el sitio del traductor')} ↗<small>${esc((() => { try { return new URL(v.external_url).hostname.replace(/^www\./, ''); } catch { return ''; } })())}</small></a></div>` : ''}
              ${dlOf(v).length ? `<a class="ui-v-download-jump" href="#serie-descargas" aria-label="Ver las ${dlOf(v).length} descargas del volumen ${esc(v.num)}">↓ ${dlOf(v).length} ${dlOf(v).length === 1 ? 'formato disponible' : 'formatos disponibles'} · Ver descargas</a>` : ''}
              ${firstVol ? `<div class="ui-v-actions"><a class="btn ${hereVol ? 'gold' : 'ghost'}" href="/leer/${esc(s.slug)}/${hereVol?.num || firstVol.num}">${hereVol ? 'Continuar leyendo' : vLk ? '🔒 Leer con acceso' : 'Leer volumen'} →</a></div>` : ''}
              ${list.length ? `<details class="ui-v-index"><summary>Índice de capítulos <span class="mono">${list.length} · desplegar <span aria-hidden="true">⌄</span></span></summary><ul class="ui-chl">${list.map(c => `<li data-chapter-num="${esc(c.num)}" data-chapter-title="${esc(c.title || '')}" data-chapter-type="${esc(c.section_type || 'Capítulo')}" data-chapter-read="${read.has(c.id)}" data-chapter-new="${!!isNew(c)}" class="${read.has(c.id) ? 'is-read' : ''}"><a href="/leer/${esc(s.slug)}/${c.num}" ${c.locked ? 'title="Solo para mecenas" data-lock="1"' : ''} class="${read.has(c.id) ? 'read' : ''}${p?.chapter_num === c.num ? ' here' : ''}"><span class="n">${c.num}</span><span>${c.section_type && c.section_type !== 'Capítulo' ? `<small class="ui-ch-type">${esc(c.section_type)}</small> ` : ''}${esc(c.title)}</span>${p?.chapter_num === c.num ? '<em class="fx-tag here">Aquí vas</em>' : isNew(c) ? '<em class="fx-tag">Nuevo</em>' : ''}</a></li>`).join('')}</ul></details>` : ''}
              ${buyOf(v).length ? `<div class="ui-dl ui-buy"><span class="ui-lbl">Compra la edición oficial</span>${buyOf(v).map(b => `<button class="ui-dlb buy" data-buy="${b.id}">${esc(b.store)}<small>${esc([b.fmt, b.region].filter(Boolean).join(' · '))}</small></button>`).join('')}</div>` : ''}
            </div></article>`;
        }).join('') || '<p class="mono">Aún no hay volúmenes publicados.</p>'}
      </div>${PRE ? PRE.cards(pre, esc, media) : ''}<p id="ui-series-empty" class="ui-series-empty" role="status" hidden>No encontramos capítulos con estos filtros. Prueba otra búsqueda.</p></section>
      <section id="serie-descargas" class="ui-series-panel ui-series-downloads" role="tabpanel" aria-labelledby="serie-tab-descargas" tabindex="0" hidden>
        <div class="ui-h2"><h2>Descargas</h2><span class="mono">${dlError ? 'Enlaces no disponibles' : (vols || []).reduce((n, v) => n + dlOf(v).length, 0) + ' enlaces disponibles'}</span></div>
        <p class="ui-dl-intro">Selecciona el volumen y el formato que deseas descargar. Los enlaces disponibles pertenecen al equipo traductor de esta obra.</p>
        ${dlError ? '<p class="ui-dl-empty" role="alert">No pudimos consultar los enlaces de descarga. Intenta recargar la página.</p>' : (vols || []).length ? `<div class="ui-dl-library">${(vols || []).map(v => {
          const list = (chs || []).filter(c => c.volume_id === v.id || (!c.volume_id && c.vol === v.num));
          const vLk = list.length > 0 && list.every(c => c.locked);
          const dl = dlOf(v), name = v.title && v.title !== String(v.num) && v.title.length > 2 ? v.title : 'Volumen ' + v.num;
          return `<article class="ui-dl-volume" id="descarga-vol-${esc(v.num)}"><div class="ui-dl-volume-head"><div><span class="ui-lbl">Volumen ${esc(v.num)}</span><h3>${esc(name)}</h3></div><span class="ui-dl-count">${dl.length ? dl.length + (dl.length === 1 ? ' formato' : ' formatos') : 'Sin descargas'}</span></div>${dl.length ? `<div class="ui-dl ui-dl-featured" role="group" aria-label="Descargas del volumen ${v.num}"><span class="ui-lbl ui-dl-title">↓ Descargar Volumen ${v.num}</span>${dl.map(d => d.locked || vLk ? `<a class="ui-dlb lock" href="${esc(patronLink)}" ${patronLink.startsWith('https://') ? 'target="_blank" rel="noopener noreferrer"' : ''} title="Solo para mecenas del Patreon del equipo">🔒 ${esc(d.fmt)}<small>${esc(d.label || d.provider || '')} · Patreon del equipo</small></a>` : `<button type="button" class="ui-dlb ui-dlb-dl" data-dl="${d.id}" aria-label="Descargar volumen ${v.num} en ${esc(d.fmt)}">↓ ${esc(d.fmt)}<small>${esc(d.label || d.provider || '')}${d.patreon_only ? ' · Patreon del equipo' : ''}</small></button>`).join('')}</div>` : '<p class="ui-dl-unavailable">Aún no hay enlaces de descarga para este volumen.</p>'}</article>`;
        }).join('')}</div>` : '<p class="ui-dl-empty">No hay volúmenes publicados para descargar.</p>'}
      </section>
      <section id="rv-sec" class="ui-series-panel" role="tabpanel" aria-labelledby="serie-tab-reviews" tabindex="0" hidden><div class="ui-h2"><h2>Reseñas</h2><span class="mono" id="rv-n"></span></div><div id="rv-box"><p class="mono">Cargando reseñas…</p></div></section></div>`;
    initSeriesOrganization(app);
    initSeriesTabs(app);
    const shelf = app.querySelector('#fx-vols');
    app.querySelectorAll('[data-series-view]').forEach(b => b.onclick = () => {
      const view = b.dataset.seriesView;
      if (view !== 'galeria' && view !== 'lista') return;
      shelf.classList.toggle('is-galeria', view === 'galeria');
      shelf.classList.toggle('is-lista', view === 'lista');
      app.querySelectorAll('[data-series-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      localStorage.setItem('obi-serie-vol-view', view);
    });
    if (PRE) PRE.bind(pre, app, sb, getUser, go, toast);
    app.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { const w = window.open('about:blank', '_blank'); const { data } = await sb.rpc('purchase_open', { p_id: +b.dataset.buy }); if (data && w) { w.opener = null; w.location = data; } else w?.close(); });
    app.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { b.disabled = true; const w = window.open('about:blank', '_blank'); const { data, error } = await sb.rpc('download_open', { p_id: +b.dataset.dl }); b.disabled = false; if (error || !data) { w?.close(); return toast(error?.hint || error?.message || 'Enlace no disponible'); } if (w) { w.opener = null; w.location = data; } else location.href = data; });
    rkCss(); seriesRank(s); reviews(s);
    // relaciones en ambos sentidos: las que puso esta obra + las de otras obras que apuntan a esta (con el sentido invertido: precuela ↔ secuela)
    Promise.all([sb.from('series').select('relations').eq('id', s.id).maybeSingle(), sb.from('series').select('id,relations').filter('relations', 'cs', JSON.stringify([{ id: s.id }])).eq('published', true)]).then(([{ data: rr }, { data: inv }]) => {
      const INV = { precuela: 'secuela', secuela: 'precuela', adaptacion: 'original', original: 'adaptacion' };
      const RL = (Array.isArray(rr?.relations) ? rr.relations : []).filter(r => r?.id && r.id !== s.id);
      for (const o of inv || []) { if (o.id === s.id || RL.some(r => r.id === o.id)) continue; const k = (o.relations || []).find(r => r?.id === s.id)?.kind || 'otra'; RL.push({ id: o.id, kind: INV[k] || k }); }
      const KN = Object.fromEntries([['precuela','Precuela'],['secuela','Secuela'],['spinoff','Spin-off'],['universo','Mismo universo'],['paralela','Historia paralela'],['adaptacion','Adaptación'],['original','Obra original'],['alterna','Versión alternativa'],['otra','Relacionada']]);
      if (RL.length) sb.from('series').select('id,slug,title,cover_path,cover_thumb_path,theme,teams(name)').in('id', RL.map(r => r.id)).eq('published', true).then(({ data }) => { const by = Object.fromEntries((data || []).map(x => [x.id, x])), it = RL.filter(r => by[r.id]); const box = document.getElementById('rel-sec'); if (!box || !it.length) return;
        box.innerHTML = `<section><div class="ui-h2"><h2>Obras relacionadas</h2></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px">${it.map(r => { const x = by[r.id]; return `<a href="/serie/${esc(x.slug)}" style="display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:center;padding:10px;background:#16140f;border:1px solid var(--line);border-left:4px solid ${esc(color(x))};color:var(--paper);text-decoration:none"><span style="aspect-ratio:2/3;background:#1c1a14 center/cover;${x.cover_path ? `background-image:url('${esc(thumb(x))}')` : ''}"></span><span style="display:grid;gap:3px"><span class="mono" style="font-size:11px;letter-spacing:.12em;color:${esc(color(x))}">${esc((KN[r.kind] || 'Relacionada').toUpperCase())}</span><b>${esc(x.title)}</b>${x.teams?.name ? `<small class="mono" style="font-size:11px">${esc(x.teams.name)}</small>` : ''}</span></a>`; }).join('')}</div></section>`; }); }, () => {});
    sb.from('series').select('access,access_min_price,access_until').eq('id', s.id).maybeSingle().then(async ({ data: A }) => { if (!A || A.access === 'public' || (A.access_until && new Date(A.access_until) <= new Date())) return; const box = document.getElementById('lock-sec'); if (!box) return;
      const { data: pp } = await sb.from('patreon_public').select('url').eq('owner', s.team_id || '').maybeSingle(); const purl = pp?.url ? (u => { try { const x = new URL(u); if (!/(^|\.)patreon\.com$/.test(x.hostname) || x.searchParams.has('u') || /\/(membership|join|checkout)(\/|$)/.test(x.pathname)) return u; x.pathname = (x.pathname === '/user' ? '/user' : x.pathname.replace(/\/+$/, '')) + '/membership'; return x.toString(); } catch { return u; } })(pp.url) : '';
      box.innerHTML = `<section style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:16px 20px;border:1px solid var(--gold);background:#16140f"><span style="display:grid;gap:4px"><b style="font-size:17px">🔒︎ Esta obra solo está disponible para mecenas de ${esc(s.teams?.name || 'el equipo')}${A.access === 'tier' ? ' desde US$' + (+A.access_min_price).toFixed(2) : ''}</b>${A.access_until ? `<span class="mono" style="font-size:12px">Se abre para todos el ${new Date(A.access_until).toLocaleDateString('es-MX', { dateStyle: 'long' })}</span>` : ''}</span>${purl ? `<a class="btn" href="${esc(purl)}" target="_blank" rel="noopener">Hazte mecenas ↗</a>` : ''}</section>`; }, () => {});
    sb.from('series').select('media').eq('id', s.id).maybeSingle().then(({ data: md }) => { const m = md?.media || {}, box = document.getElementById('media-sec'); if (!box) return; const ytId = u => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/) || [])[1] || null; const PL = Object.fromEntries([['crunchyroll','Crunchyroll','#f59e7a'],['netflix','Netflix','#f29bb0'],['prime','Prime Video','#8cc3f2'],['disney','Disney+','#8cc3f2'],['hidive','HIDIVE','#a9d18e'],['youtube','YouTube','#f29bb0'],['max','Max','#c9a8f2'],['otro','Otro','#a9d18e']].map(p => [p[0], p])), VKN = Object.fromEntries([['opening','Opening'],['ending','Ending'],['trailer','Tráiler'],['avance','Avance'],['pv','PV'],['ost','Música'],['otro','Video']]);
      const an = (m.anime || []).filter(a => /^https:\/\//.test(a.url || '')), vs = (m.videos || []).filter(v => /^https:\/\//.test(v.url || '')), gl = (m.gallery || []).filter(g => g.path); let h = '';
      const vcard = v => { const id = ytId(v.url), k = VKN[v.kind] || 'Video'; return id ? `<figure style="margin:0;display:grid;gap:6px;width:100%"><button type="button" data-yt="${id}" aria-label="Reproducir ${esc(v.title || k)}" style="position:relative;padding:0;border:1px solid var(--line);aspect-ratio:16/9;background:#0d0c0a url('https://i.ytimg.com/vi/${id}/hqdefault.jpg') center/cover;cursor:pointer"><span aria-hidden="true" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:58px;display:flex;align-items:center;justify-content:center;background:rgba(13,12,10,.75);border:2px solid #fbf8f1;color:#fbf8f1;font-size:20px">▶</span></button><figcaption><span class="mono" style="font-size:11px;letter-spacing:.12em;color:var(--gold)">${esc(k.toUpperCase())}</span><br><b style="font-size:14px">${esc(v.title || '')}</b></figcaption></figure>` : `<a href="${esc(v.url)}" target="_blank" rel="noopener" style="display:grid;align-content:center;gap:4px;aspect-ratio:16/9;width:100%;padding:16px;background:#16140f;border:1px solid var(--line);color:var(--paper);text-decoration:none"><span class="mono" style="font-size:11px;color:var(--gold)">${esc(k.toUpperCase())}</span><b>${esc(v.title || 'Ver video')} ↗</b></a>`; };
      const anH = an.length ? `<div style="flex:1 1 240px;min-width:0;display:grid;gap:10px;align-content:start"><div class="ui-h2" style="margin:0"><h2>Ver el anime</h2></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:10px">${an.map(a => { const [, l, c] = PL[a.platform] || PL.otro; return `<a href="${esc(a.url)}" target="_blank" rel="noopener" style="display:grid;gap:2px;padding:12px 16px;background:#16140f;border:1px solid var(--line);border-top:3px solid ${c};color:var(--paper);text-decoration:none"><b>${esc(l)} ↗</b>${a.label ? `<small class="mono" style="font-size:11px">${esc(a.label)}</small>` : ''}</a>`; }).join('')}</div></div>` : '';
      const vsH = vs.length ? `<div style="flex:0 1 calc(48vh * 16 / 9);min-width:min(100%,340px);display:grid;gap:14px;align-content:start"><div class="ui-h2" style="margin:0"><h2>Videos</h2><span class="mono">${vs.length}</span></div>${vcard(vs[0])}${vs.length > 1 ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:12px">${vs.slice(1).map(vcard).join('')}</div>` : ''}</div>` : '';
      if (anH || vsH) h += `<section style="display:flex;flex-wrap:wrap;gap:24px clamp(20px,3vw,40px);align-items:flex-start">${vsH}${anH}</section>`;
      if (gl.length) h += `<section><div class="ui-h2"><h2>Galería</h2><span class="mono">${gl.length}</span></div><div class="gl-wrap" style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center"><button type="button" class="gl-nav" data-gs="-1" aria-label="Anteriores" style="width:44px;height:44px;background:#16140f;border:1px solid var(--line);color:var(--paper);font-size:20px;cursor:pointer">‹</button><div id="gl-track" style="display:grid;grid-auto-flow:column;grid-auto-columns:clamp(150px,18vw,230px);gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:thin;padding-bottom:6px">${gl.map((g, i) => `<button type="button" data-gi="${i}" aria-label="Ver imagen ${i + 1}${g.caption ? ': ' + esc(g.caption) : ''}" style="scroll-snap-align:start;padding:0;border:1px solid var(--line);aspect-ratio:3/4;background:#16140f url('${esc(media(g.path))}') center/cover;cursor:zoom-in"></button>`).join('')}</div><button type="button" class="gl-nav" data-gs="1" aria-label="Siguientes" style="width:44px;height:44px;background:#16140f;border:1px solid var(--line);color:var(--paper);font-size:20px;cursor:pointer">›</button></div></section>`;
      if (!h) return; box.innerHTML = h;
      box.querySelectorAll('[data-yt]').forEach(bt => bt.onclick = () => { const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + bt.dataset.yt + '?autoplay=1&rel=0'; f.title = bt.getAttribute('aria-label'); f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; f.style.cssText = 'width:100%;aspect-ratio:16/9;border:1px solid var(--line);display:block'; bt.replaceWith(f); });
      const lb = i => { const g = gl[i]; let d = document.getElementById('gl-lb'); if (!d) { d = document.createElement('div'); d.id = 'gl-lb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(13,12,10,.94);display:grid;grid-template-rows:minmax(0,1fr) auto;gap:10px;padding:clamp(12px,3vw,32px)'; document.body.appendChild(d); }
        d.innerHTML = `<img src="${esc(media(g.path))}" alt="${esc(g.caption || '')}" style="width:100%;height:100%;object-fit:contain"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;color:#fbf8f1"><button type="button" data-lb="-1" style="min-width:44px;height:44px;background:#16140f;border:1px solid #3d3628;color:#fbf8f1;font-size:20px;cursor:pointer" aria-label="Anterior">‹</button><span style="flex:1;text-align:center;font-size:14px">${esc(g.caption || '')} <span class="mono" style="font-size:12px;color:#a89f8a">${i + 1} / ${gl.length}</span></span><button type="button" data-lb="1" style="min-width:44px;height:44px;background:#16140f;border:1px solid #3d3628;color:#fbf8f1;font-size:20px;cursor:pointer" aria-label="Siguiente">›</button><button type="button" data-lb="x" style="min-width:44px;height:44px;background:#16140f;border:1px solid #3d3628;color:#fbf8f1;font-size:18px;cursor:pointer" aria-label="Cerrar">×</button></div>`;
        const close = () => { d.remove(); removeEventListener('keydown', key); }, key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { removeEventListener('keydown', key); lb((i + 1) % gl.length); } if (e.key === 'ArrowLeft') { removeEventListener('keydown', key); lb((i - 1 + gl.length) % gl.length); } };
        addEventListener('keydown', key); d.onclick = e => { const v = e.target.closest('[data-lb]')?.dataset.lb; if (v === 'x' || e.target === d) close(); else if (v) { removeEventListener('keydown', key); lb((i + +v + gl.length) % gl.length); } }; d.querySelector('[data-lb="x"]').focus(); };
      box.querySelectorAll('[data-gi]').forEach(bt => bt.onclick = () => lb(+bt.dataset.gi));
      { const tr = box.querySelector('#gl-track'); if (tr) { const sync = () => box.querySelectorAll('[data-gs]').forEach(x => { const end = +x.dataset.gs > 0 ? tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 4 : tr.scrollLeft <= 4; x.disabled = end; x.style.opacity = end ? .35 : 1; }); box.querySelectorAll('[data-gs]').forEach(x => x.onclick = () => tr.scrollBy({ left: +x.dataset.gs * tr.clientWidth * .9 })); tr.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync(); } } }, () => {});
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
    // Preferir miniaturas en las tarjetas del ranking: no descargar portadas originales grandes.
    const rankBook = s => book({ ...s, cover_path: s.cover_thumb_path || s.cover_path }, null, true);
    const qs = new URLSearchParams(location.search);
    const R = { list: RK_L[qs.get('lista')] ? qs.get('lista') : 'leidas', period: RK_P[qs.get('periodo')] ? qs.get('periodo') : 'semana', genre: qs.get('genero') || '', status: ['en_curso', 'terminada'].includes(qs.get('estado')) ? qs.get('estado') : '', teamView: qs.get('vista') === 'equipos' || !!qs.get('equipo'), team: qs.get('equipo') || '' };
    app.innerHTML = '<p class="mono">Cargando el ranking…</p>';
    // Los metadatos auxiliares no deben retrasar el primer resultado del ranking.
    let genres = [], teams = [], teamRows = [], teamPromise, autoHist = false;
    const firstList = R.list;
    const weeklyCheck = !qs.get('periodo') && !R.teamView
      ? sb.from('rankings').select('series_id', { count: 'exact', head: true }).eq('list', R.list).eq('period', 'semana')
      : null;
    const loadTeams = () => teamPromise ||= sb.from('series')
      .select('id,team_id,teams(name,slug,color)').eq('published', true)
      .then(({ data, error }) => {
        if (error) throw error;
        teamRows = data || [];
        teams = [...new Map(teamRows.filter(s => s.teams?.slug).map(s => [s.teams.slug, s.teams])).values()]
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        if (!teams.some(t => t.slug === R.team)) R.team = teams[0]?.slug || '';
        const picker = app.querySelector('#rk-team-sel');
        if (picker) { picker.innerHTML = teams.map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join(''); picker.value = R.team; }
        return teamRows;
      }).catch(e => { teamPromise = null; throw e; });

    // La vista general conserva Más leídas como ranking principal y ofrece
    // adelantos de las demás clasificaciones sin cargarlos antes de tiempo.
    const previewLists = ['tendencia', 'novedades', 'calificadas', 'terminadas'];
    const overviewMarkup = `<div id="rk-overview" class="rk-overview" hidden>
      <div class="rk-overview-top"><h2>Explora otros rankings</h2>
        <p>Un vistazo a las clasificaciones de esta semana. Selecciona «Ver ranking completo» para explorar cada categoría.</p></div>
      ${previewLists.map(key => `<section class="rk-preview" data-rk-preview="${key}" aria-labelledby="rk-preview-title-${key}">
        <div class="rk-preview-head"><h3 id="rk-preview-title-${key}">${RK_L[key]}</h3>
          <a href="/ranking?lista=${key}">Ver ranking completo →</a></div>
        <div class="rk-preview-body" aria-live="polite"><p class="mono rk-preview-state">La clasificación se cargará al llegar aquí.</p></div>
      </section>`).join('')}
      <section class="rk-preview-team" aria-labelledby="rk-preview-team-title"><h3 id="rk-preview-team-title">Lo más leído por equipo</h3>
        <p>Explora las novelas favoritas de cada grupo traductor.</p><a href="/ranking?vista=equipos">Consultar ranking por equipo →</a>
      </section>
    </div>`;
    app.innerHTML = `<div class="ui-cath"><div><h1>Ranking</h1><p>Las obras que más se leen, más suben y más gustan.</p></div><span class="kj" aria-hidden="true">番付</span></div><p class="mono" id="rk-autoh" hidden style="margin:-6px 0 18px;font-size:13px">Esta semana todavía no hay suficientes lecturas: te mostramos el ranking de todos los tiempos.</p>
      <div class="rk-bar">
        <div class="ui-chips" role="group" aria-label="Lista">${Object.entries(RK_L).map(([k, l]) => `<button class="ui-chip" type="button" data-rl="${k}">${l}</button>`).join('')}<button class="ui-chip" type="button" id="rk-team-tab" aria-controls="rk-teams">Por equipo</button></div>
        <div id="rk-filters"><div class="rk-row"><div class="rk-seg" role="group" aria-label="Periodo">${Object.entries(RK_P).map(([k, l]) => `<button type="button" data-rp="${k}">${l}</button>`).join('')}</div>
          <label class="rk-sel"><span class="ui-lbl">Género</span><select id="rk-g"><option value="">Todos</option></select></label>
          <div class="rk-seg" role="group" aria-label="Estado">${[['', 'Todas'], ['en_curso', 'En curso'], ['terminada', 'Terminadas']].map(([k, l]) => `<button type="button" data-rs="${k}">${l}</button>`).join('')}</div></div>
        <p class="mono rk-desc" id="rk-desc"></p></div>
      </div><div id="rk"></div>
      <section id="rk-teams" class="rk-team-panel" aria-labelledby="rk-teams-title" hidden>
        <div class="rk-team-header"><div><h2 id="rk-teams-title">Lo más visto de cada equipo</h2>
          <p class="rk-team-note">Novelas ordenadas por lectores distintos de esta semana.</p></div>
          <label class="rk-team-select" for="rk-team-sel">Equipo
            <select id="rk-team-sel" aria-label="Seleccionar equipo"><option value="">Cargando equipos…</option></select>
          </label></div>
        <div id="rk-team-results" aria-live="polite"></div>
      </section>${overviewMarkup}`;
    $('#rk-g').value = R.genre;
    // Géneros en segundo plano, sin retener la primera clasificación.
    sb.from('series').select('genres').eq('published', true).then(({ data, error }) => {
      if (error || !app.querySelector('#rk-g')) return;
      genres = [...new Set((data || []).flatMap(x => x.genres || []))].sort((a, b) => a.localeCompare(b, 'es'));
      const select = app.querySelector('#rk-g');
      select.innerHTML = '<option value="">Todos</option>' + genres.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
      if (R.genre && !genres.includes(R.genre)) { R.genre = ''; if (!R.teamView) draw(); }
      select.value = R.genre;
    }).catch(() => {});
    const sync = () => {
      const ok = RK_OK[R.list]; if (ok && !ok.includes(R.period)) R.period = 'semana';
      const q = new URLSearchParams();
      if (R.teamView) { q.set('vista', 'equipos'); if (R.team) q.set('equipo', R.team); }
      else { if (R.list !== 'leidas') q.set('lista', R.list); if (R.period !== 'semana') q.set('periodo', R.period); if (R.genre) q.set('genero', R.genre); if (R.status) q.set('estado', R.status); }
      history.replaceState({}, '', '/ranking' + (q.toString() ? '?' + q : ''));
      app.querySelectorAll('[data-rl]').forEach(b => { b.classList.toggle('on', !R.teamView && b.dataset.rl === R.list); b.setAttribute('aria-pressed', String(!R.teamView && b.dataset.rl === R.list)); });
      app.querySelectorAll('[data-rp]').forEach(b => { b.classList.toggle('on', b.dataset.rp === R.period); b.disabled = !!ok && !ok.includes(b.dataset.rp); b.setAttribute('aria-pressed', b.dataset.rp === R.period); });
      app.querySelectorAll('[data-rs]').forEach(b => { b.classList.toggle('on', b.dataset.rs === R.status); b.setAttribute('aria-pressed', b.dataset.rs === R.status); });
      $('#rk-desc').textContent = RK_D[R.list];
      $('#rk-team-tab').classList.toggle('on', R.teamView); $('#rk-team-tab').setAttribute('aria-pressed', String(R.teamView));
      $('#rk-filters').hidden = R.teamView; $('#rk').hidden = R.teamView; $('#rk-teams').hidden = !R.teamView;
      if ($('#rk-autoh')) $('#rk-autoh').hidden = R.teamView || !autoHist || R.period !== 'historico' || R.list !== firstList;
      if ($('#rk-team-sel') && R.team) $('#rk-team-sel').value = R.team;
    };
    let tk = 0;

    const overview = $('#rk-overview'), previewStates = new Map();
    const overviewEnabled = () => location.pathname === '/ranking' && !R.teamView &&
      R.list === 'leidas' && R.period === 'semana' && !R.genre && !R.status;
    const previewScore = (key, r) => ({
      tendencia: '+' + fmtN(+r.score) + ' lecturas',
      novedades: fmtN(+r.score) + ' lecturas',
      calificadas: (+r.score).toFixed(1) + ' ★ · ' + fmtN(+(r.votes || 0)) + ' votos',
      terminadas: fmtN(+r.score) + (+r.score === 1 ? ' lector' : ' lectores') + ' al día'
    })[key] || '';
    const loadPreview = async key => {
      if (previewStates.has(key) || !overviewEnabled() || overview.hidden || !overview.isConnected) return;
      const section = overview.querySelector('[data-rk-preview="' + key + '"]');
      if (!section) return;
      const body = section.querySelector('.rk-preview-body');
      previewStates.set(key, 'loading');
      body.innerHTML = '<p class="mono rk-preview-state">Cargando clasificación…</p>';
      try {
        const { data, error } = await sb.rpc('ranking_list', { p_list: key, p_period: 'semana', p_limit: 4 });
        if (!body.isConnected) return;
        if (error) throw error;
        if (!data?.length) {
          body.innerHTML = `<p class="mono rk-preview-state">${esc(RK_E[key] || 'Todavía no hay obras clasificadas en esta categoría esta semana.')}</p>`;
          previewStates.set(key, 'done');
          return;
        }
        const { data: novels, error: novelError } = await sb.from('series')
          .select('id,slug,title,cover_path,cover_thumb_path,theme,teams(name,color)')
          .eq('published', true).in('id', data.map(r => r.series_id));
        if (!body.isConnected) return;
        if (novelError) throw novelError;
        const byId = Object.fromEntries((novels || []).map(s => [s.id, s]));
        const entries = data.filter(r => byId[r.series_id]);
        if (!entries.length) {
          body.innerHTML = '<p class="mono rk-preview-state">No hay novelas públicas clasificadas todavía.</p>';
        } else {
          body.innerHTML = `<div class="rk-grid rk-preview-grid">${entries.map(r => {
            const s = byId[r.series_id];
            return `<a class="rk-c${r.pos <= 3 ? ' rk-podium' : ''}" href="/serie/${esc(s.slug)}" style="--c:${esc(color(s))}">
              <span class="rk-n" aria-label="Puesto ${r.pos}">${r.pos}</span>${rankBook(s)}
              <span class="rk-b"><b>${esc(s.title)}</b>${s.teams?.name ? `<small>${esc(s.teams.name)}</small>` : ''}
                <span class="rk-s">${previewScore(key, r)}</span></span></a>`;
          }).join('')}</div>`;
        }
        previewStates.set(key, 'done');
      } catch (error) {
        if (!body.isConnected) return;
        body.innerHTML = `<p class="mono rk-preview-state" role="alert">No se pudo cargar esta clasificación. <a href="/ranking?lista=${key}">Abrir ranking completo →</a></p>`;
        previewStates.delete(key);
        console.warn('ranking preview', key, error);
      }
    };
    const previewObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !overviewEnabled() || overview.hidden) continue;
          const key = entry.target.dataset.rkPreview;
          if (key) { previewObserver.unobserve(entry.target); loadPreview(key); }
        }
      }, { rootMargin: '120px 0px' }) : null;
    const revealOverview = () => {
      if (!overviewEnabled() || !overview.isConnected) return;
      overview.hidden = false;
      if (previewObserver) overview.querySelectorAll('[data-rk-preview]').forEach(section => {
        if (!previewStates.has(section.dataset.rkPreview)) previewObserver.observe(section);
      });
      else previewLists.forEach(loadPreview);
    };
    const drawTeam = async my => {
      const box = $('#rk-team-results');
      box.innerHTML = '<p class="mono">Cargando las obras del equipo…</p>';
      try { await loadTeams(); } catch (e) {
        if (my === tk && box.isConnected) box.innerHTML = '<p class="mono" role="alert">No se pudo cargar la lista de equipos.</p>';
        return;
      }
      if (my !== tk || !box.isConnected) return;
      const team = teams.find(t => t.slug === R.team);
      if (!team) { box.innerHTML = '<p class="mono">Aún no hay equipos con obras publicadas.</p>'; return; }
      const ids = teamRows.filter(s => s.teams?.slug === team.slug).map(s => s.id);
      if (!ids.length) { box.innerHTML = '<p class="mono">Este equipo no tiene obras publicadas.</p>'; return; }
      const { data, error } = await sb.from('rankings').select('series_id,score,pos').eq('list', 'leidas').eq('period', 'semana').in('series_id', ids).order('score', { ascending: false }).limit(50);
      if (my !== tk || !box.isConnected) return;
      if (error) { box.innerHTML = `<p class="mono" role="alert">No se pudo cargar el ranking del equipo: ${esc(error.message)}</p>`; return; }
      const rows = (data || []).filter(r => +r.score > 0);
      if (!rows.length) { box.innerHTML = `<p class="mono">Este equipo todavía no registra lecturas en la clasificación semanal. <a href="/equipo/${esc(team.slug)}">Ver su página →</a></p>`; return; }
      const { data: ss, error: se } = await sb.from('series').select(SERIES).eq('published', true).in('id', rows.map(r => r.series_id));
      if (my !== tk || !box.isConnected) return;
      if (se) { box.innerHTML = `<p class="mono" role="alert">No se pudieron cargar las obras: ${esc(se.message)}</p>`; return; }
      await attachPublicCredits(sb, ss || []);
      if (my !== tk || !box.isConnected) return;
      const by = Object.fromEntries((ss || []).map(s => [s.id, s]));
      const entries = rows.filter(r => by[r.series_id]);
      box.innerHTML = `<p class="rk-team-note"><a href="/equipo/${esc(team.slug)}">${esc(team.name)} →</a> · ${entries.length} ${entries.length === 1 ? 'novela clasificada' : 'novelas clasificadas'}</p>` +
        `<div class="rk-grid">${entries.map((r, i) => { const s = by[r.series_id]; return `<a class="rk-c${i < 3 ? ' rk-podium' : ''}" href="/serie/${esc(s.slug)}" style="--c:${esc(color(s))}"><span class="rk-n" aria-label="Puesto ${i + 1} del equipo">${i + 1}</span>${rankBook(s)}<span class="rk-b"><b>${esc(s.title)}</b>${creditsHTML(s, { esc, media, mode: 'carousel' })}<small>${fmtN(+r.score)} ${+r.score === 1 ? 'lector' : 'lectores'} · esta semana</small><span class="rk-s">${r.pos ? '#' + r.pos + ' general' : ''}</span></span></a>`; }).join('')}</div>`;
    };
    const draw = async () => {
      sync(); const my = ++tk, box = $('#rk'); overview.hidden = true; if (R.teamView) return drawTeam(my); box.innerHTML = '<p class="mono">Cargando…</p>';
      const { data, error } = await sb.rpc('ranking_list', { p_list: R.list, p_period: R.period, p_genre: R.genre || null, p_status: R.status || null, p_limit: 20 });
      if (my !== tk || !document.body.contains(box)) return;
      if (error) { box.innerHTML = `<p style="color:#f59e7a">No se pudo cargar el ranking: ${esc(error.message)}</p>`; return; }
      if (!data?.length) { box.innerHTML = `<div class="ui-empty"><p><strong>${R.genre || R.status ? 'Ninguna obra con estos filtros entra en esta lista.' : RK_E[R.list] || 'Aún no hay lecturas en este periodo.'}</strong></p></div>`; revealOverview(); return; }
      const { data: ss } = await sb.from('series').select(SERIES).in('id', data.map(r => r.series_id));
      if (my !== tk) return;
      await attachPublicCredits(sb, ss || []);
      if (my !== tk) return;
      const by = Object.fromEntries((ss || []).map(s => [s.id, s])), filtered = !!(R.genre || R.status), anyPrev = data.some(r => r.prev_pos != null);
      const mv = r => filtered ? '' : r.prev_pos == null ? (anyPrev ? '<span class="rk-mv new">Nuevo</span>' : '') : r.prev_pos > r.gpos ? `<span class="rk-mv up" title="Subió ${r.prev_pos - r.gpos} desde la última actualización">▲${r.prev_pos - r.gpos}</span>` : r.prev_pos < r.gpos ? `<span class="rk-mv dn" title="Bajó ${r.gpos - r.prev_pos} desde la última actualización">▼${r.gpos - r.prev_pos}</span>` : '<span class="rk-mv eq" title="Sin cambios">=</span>';
      const sc = r => ({ leidas: fmtN(r.score) + ' lecturas', tendencia: '+' + fmtN(r.score) + ' lecturas', calificadas: (+r.score).toFixed(1) + ' ★ · ' + r.votes + ' votos', terminadas: fmtN(r.score) + (+r.score === 1 ? ' lector' : ' lectores') + ' al día', novedades: fmtN(r.score) + ' lecturas' })[R.list];
      box.innerHTML = `<div class="rk-grid">${data.filter(r => by[r.series_id]).map(r => { const s = by[r.series_id]; return `<a class="rk-c${r.pos <= 3 ? ' rk-podium' : ''}" href="/serie/${esc(s.slug)}" style="--c:${esc(color(s))}"><span class="rk-n" aria-label="Puesto ${r.pos}">${r.pos}</span>${rankBook(s)}<span class="rk-b"><b>${esc(s.title)}</b>${creditsHTML(s, { esc, media, mode: 'carousel' })}${s.teams?.name ? `<small>${esc(s.teams.name)}</small>` : ''}<span class="rk-s">${sc(r)}${mv(r)}</span></span></a>`; }).join('')}</div>
        <p class="mono rk-upd">Actualizado ${ago(data[0].computed_at)} · se recalcula cada 6 horas${filtered ? ' · con filtros no se muestra el movimiento' : ''}</p>`;
      revealOverview();
    };
    app.querySelectorAll('[data-rl]').forEach(b => b.onclick = () => { R.teamView = false; R.list = b.dataset.rl; draw(); });
    $('#rk-team-tab').onclick = () => { R.teamView = true; draw(); };
    $('#rk-team-sel').onchange = e => { R.team = e.target.value; if (R.teamView) draw(); };
    app.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { R.period = b.dataset.rp; draw(); });
    app.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { R.status = b.dataset.rs; draw(); });
    $('#rk-g').onchange = e => { R.genre = e.target.value; draw(); };
    draw();
    // El respaldo histórico solo se activa cuando no hay ranking semanal.
    // Comprobarlo en paralelo evita bloquear la portada del ranking.
    if (weeklyCheck) weeklyCheck.then(({ count, error }) => {
      if (error || count || !app.querySelector('#rk') || R.teamView || R.list !== firstList || R.period !== 'semana') return;
      if (!RK_OK[R.list]) {
        R.period = 'historico';
        autoHist = true;
        app.querySelector('#rk-autoh').hidden = false;
        draw();
      }
    }).catch(() => {});
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
    const [TP, AN] = await Promise.all([import('/teampage.js?v=19'), import('/anim.js?v=8')]); TP.ensureFonts();
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
    const publicSeasonOff = (() => { try { return localStorage.getItem('obi-season') === 'off'; } catch { return false; } })();
    const top = (canEdit ? '<div class="tp2-top"><a class="tp2-edit" href="/estudio/preferencias">⚙ Personalizar</a></div>' : '') + (draft ? '<div class="tp2-draft"><b>Vista previa del borrador</b><span>Así se verá la página cuando el equipo publique los cambios.</span></div>' : '');
    app.innerHTML = `<div class="tp2-page">${TP.render(D, design, { esc, media, top, sim: publicSeasonOff ? '' : undefined })}</div>`;
    const root = app.querySelector('.tp2'); TP.bind(root); if (!draft) teamRank(root, D.t.id);
    // Sello de aniversario: solo ese día (fecha del equipo o, si no hay, la de creación).
    sb.from('teams').select('anniversary,anniversary_msg,created_at').eq('id', D.t.id).maybeSingle().then(({ data: a }) => { if (!a || !document.body.contains(root)) return; const b = a.anniversary || (a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: window.obiTZ() }) : ''); const k = new Date().toLocaleDateString('en-CA', { timeZone: window.obiTZ() }); if (!b || b.slice(5) !== k.slice(5)) return; const y = +k.slice(0, 4) - +b.slice(0, 4); if (y < 1) return;
      const el = document.createElement('div'); el.setAttribute('role', 'note'); el.style.cssText = 'display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;padding:12px 16px;background:#16140f;border-bottom:2px solid #efe6d2;color:#f3ecd9;text-align:left';
      el.innerHTML = `<span aria-hidden="true" style="display:grid;place-items:center;width:44px;height:44px;border:2px solid #c8402e;color:#c8402e;font-size:24px;transform:rotate(-6deg);font-family:serif">祝</span><span style="display:grid;gap:2px"><b style="font-size:17px">${esc((a.anniversary_msg || '').trim() || y + (y === 1 ? ' año de ' : ' años de ') + D.t.name)}</b><small class="mono">Hoy ${esc(D.t.name)} cumple ${y} ${y === 1 ? 'año' : 'años'} en el Obi</small></span>`; root.prepend(el); }, () => {});
    team.stop?.(); team.stop = AN.animate(root, TP.effective(design, D.t.color, publicSeasonOff ? '' : undefined));
    const off = () => { if (!document.body.contains(root)) { team.stop?.(); team.stop = null; removeEventListener('popstate', off); } }; addEventListener('popstate', off); document.addEventListener('click', function cl(e){ if (e.target.closest('a[href^="/"]')) { setTimeout(() => { if (!document.body.contains(root)) { team.stop?.(); team.stop = null; document.removeEventListener('click', cl, true); } }, 50); } }, true);
    let following = false, n = 0;
    const [{ data: cnt }, fr] = await Promise.all([sb.rpc('team_followers', { p_team: D.t.id }), u2 ? sb.from('team_follows').select('team_id').eq('team_id', D.t.id).eq('user_id', u2.id) : { data: [] }]);
    n = cnt || 0; following = !!fr.data?.length; TP.fillFollow(root, following, n);
    root.addEventListener('click', async e => { const b = e.target.closest('[data-follow]'); if (!b) return; if (!u2) return go('/entrar'); b.disabled = true;
      const { error } = following ? await sb.from('team_follows').delete().eq('team_id', D.t.id).eq('user_id', u2.id) : await sb.from('team_follows').insert({ team_id: D.t.id, user_id: u2.id });
      b.disabled = false; if (error) return toast(error.message); following = !following; n += following ? 1 : -1; TP.fillFollow(root, following, n); toast(following ? 'Ahora sigues a ' + D.t.name : 'Dejaste de seguir a ' + D.t.name); });
  }
  return { home, catalog, series, prefetchSeries, releases, refreshBadge, team, ranking, search };
}
