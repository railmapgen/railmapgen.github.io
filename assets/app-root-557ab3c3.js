import{j as e,V as te,U as ne,W as F,X as v,l as x,Y as I,Z as g,x as pe,N as me,_ as $,n as m,z as S,$ as xe,a0 as ge,a1 as je,a2 as q,B as se,a3 as M,M as _,a4 as w,h as H,i as P,k as C,m as y,y as j,a5 as T,a6 as ae,a7 as oe,q as E,r as O,a8 as Y,a9 as Q,aa as fe,ab as ve,ac as A,L,t as ze,ad as be,ae as ke}from"./chakra-5cff37da.js";import{u as p,r as u,j as ie,B as Me}from"./react-ff6b7134.js";import{F as we,u as N,a as re,b as k,r as l,E as b,o as He,c as Ce,t as B,s as ye,d as Ae,e as Se,g as Re,f as Ie,R,m as _e,h as le,i as Te,j as Le,k as Be,l as J,n as Pe}from"./index-660b0d23.js";var Ee=["en","zh-Hans","zh-Hant"],Oe=["ko"],X={ar:{ar:"العربية",en:"Arabic",ko:"아랍어","zh-Hans":"阿拉伯文","zh-Hant":"阿拉伯文"},az:{az:"Azərbaycanca",en:"Azerbaijani",ko:"아제르바이잔어","zh-Hans":"阿塞拜疆文","zh-Hant":"阿塞拜疆文"},ca:{ca:"Català",en:"Catalan",ko:"카탈루냐어","zh-Hans":"加泰罗尼亚文","zh-Hant":"加泰隆尼亞文"},da:{da:"Dansk",en:"Danish",ko:"덴마크어","zh-Hans":"丹麦文","zh-Hant":"丹麥文"},de:{de:"Deutsch",en:"German",ko:"독일어","zh-Hans":"德文","zh-Hant":"德文"},el:{el:"Ελληνικά",en:"Greek",ko:"그리스어","zh-Hans":"希腊文","zh-Hant":"希臘文"},en:{en:"English",ko:"영어","zh-Hans":"英文","zh-Hant":"英文"},es:{en:"Spanish",es:"Español",ko:"스페인어","zh-Hans":"西班牙文","zh-Hant":"西班牙文"},fa:{en:"Persian",fa:"فارسی",ko:"페르시아어","zh-Hans":"波斯文","zh-Hant":"波斯文"},fr:{en:"French",fr:"Français",ko:"프랑스어","zh-Hans":"法文","zh-Hant":"法文"},ga:{en:"Irish",ga:"Gaeilge",ko:"아일랜드어","zh-Hans":"爱尔兰文","zh-Hant":"愛爾蘭文"},gd:{en:"Scottish Gaelic",gd:"Gàidhlig",ko:"스코틀랜드 게일어","zh-Hans":"苏格兰盖尔文","zh-Hant":"蘇格蘭蓋爾文"},hi:{en:"Hindi",hi:"हिन्दी",ko:"힌디어","zh-Hans":"印地文","zh-Hant":"印地文"},hu:{en:"Hungarian",hu:"Magyar",ko:"헝가리어","zh-Hans":"匈牙利文","zh-Hant":"匈牙利文"},id:{en:"Indoesian",id:"Bahasa Indonesia",ko:"인도네시아어","zh-Hans":"印尼文","zh-Hant":"印尼文"},it:{en:"Italian",it:"Italiano",ko:"이탈리아어","zh-Hans":"意大利文","zh-Hant":"意大利文"},ja:{en:"Japanese",ja:"日本語",ko:"일본어","zh-Hans":"日文","zh-Hant":"日文"},ko:{en:"Korean",ko:"한국어","zh-Hans":"韩文","zh-Hant":"韓文"},ms:{en:"Malay",ko:"말레이어",ms:"Bahasa Melayu","zh-Hans":"马来文","zh-Hant":"馬來文"},no:{en:"Norwegian",ko:"노르웨이어",no:"Norsk","zh-Hans":"挪威文","zh-Hant":"挪威文"},pl:{en:"Polish",ko:"폴란드어",pl:"Polski","zh-Hans":"波兰文","zh-Hant":"波蘭文"},pt:{en:"Portuguese",ko:"포르투갈어",pt:"Português","zh-Hans":"葡萄牙文","zh-Hant":"葡萄牙文"},ro:{en:"Romanian",ko:"루마니아어",ro:"Română","zh-Hans":"罗马尼亚文","zh-Hant":"羅馬尼亞文"},ru:{en:"Russian",ko:"러시아어",ru:"Русский","zh-Hans":"俄文","zh-Hant":"俄文"},sv:{en:"Swedish",ko:"스웨덴어",sv:"Svenska","zh-Hans":"瑞典文","zh-Hant":"瑞典文"},th:{en:"Thai",ko:"태국어",th:"ภาษาไทย","zh-Hans":"泰文","zh-Hant":"泰文"},tr:{en:"Turkish",ko:"튀르키예어",tr:"Türkçe","zh-Hans":"土耳其文","zh-Hant":"土耳其文"},ur:{en:"Urdo",ko:"우르두어",ur:"اردو","zh-Hans":"乌尔都文","zh-Hant":"烏爾都文"},uz:{en:"Uzbek",ko:"우즈베크어",uz:"Oʻzbekcha","zh-Hans":"乌兹别克文","zh-Hant":"烏茲別克文"},vi:{en:"Vietnamese",ko:"베트남어",vi:"Tiếng Việt","zh-Hans":"越南文","zh-Hant":"越南文"},"zh-Hans":{en:"Simplified Chinese",ko:"중국어 간체자","zh-Hans":"简体中文","zh-Hant":"簡體中文"},"zh-Hant":{en:"Traditional Chinese",ko:"중국어 정체자","zh-Hans":"繁体中文","zh-Hant":"繁體中文"}};const Ne="/assets/rmp-logo512-652b509a.png",De={flex:1,justifyContent:"center",mb:10,"& > div":{mb:3},"& img":{w:120,p:2,backgroundColor:"white",borderRadius:12}};function Ge(){const{t}=p();return e.jsxs(te,{sx:De,children:[e.jsxs(ne,{spacing:3,children:[e.jsx(F,{src:"/logo512.png"}),e.jsx(F,{src:Ne,backgroundColor:"white"})]}),e.jsx(v,{children:t("Welcome to Rail Map Toolkit")}),e.jsx(x,{fontSize:"lg",textAlign:"center",children:t("Select an app to start your own rail map design!")})]})}function Ve(t){var a;const{tab:s,isActive:o}=t,[n]=u.useState((a=s.url)!=null?a:"/"+s.app+"/");return e.jsx(I,{display:o?"block":"none",flex:1,children:e.jsx("iframe",{id:we+s.id,src:n,loading:"lazy",title:s.app,width:"100%",height:"100%"})})}function Ue(){const{openedTabs:t,activeTab:s}=N(a=>a.app),[o,n]=ie();return u.useEffect(()=>{var a;if(s){const r=(a=t.find(h=>h.id===s))==null?void 0:a.app;n(r?{app:r}:{})}else n({})},[s]),t.length===0?e.jsx(Ge,{}):e.jsx(e.Fragment,{children:t.map(a=>e.jsx(Ve,{tab:a,isActive:s===a.id},a.id))})}function We(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0V0z"}},{tag:"path",attr:{d:"M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"}}]})(t)}function Fe(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"}}]})(t)}function $e(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"}}]})(t)}function qe(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0V0z"}},{tag:"path",attr:{d:"M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"}}]})(t)}function Z(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"}}]})(t)}function Ye(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"}}]})(t)}function Qe(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"}}]})(t)}function Je(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"}}]})(t)}function Xe(t){return g({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"}}]})(t)}const K={"& button:first-of-type":{w:"100%",overflow:"hidden",justifyContent:"flex-start",textOverflow:"ellipsis",textAlign:"start","& span.chakra-button__icon":{ml:-1,color:"orange.300",'[data-theme="dark"] &':{color:"orange.200"}}},'&[aria-current="true"] > button':{bg:"primary.50",_hover:{bg:"primary.100"},'[data-theme="dark"] &':{bg:"primary.700",_hover:{bg:"primary.600"}}}};function Ze(t){var V;const{appId:s,onAboutOpen:o}=t,{t:n}=p(),a=re(),r=pe(`(min-width: ${me.breakpoints.sm})`),{activeTab:h,openedTabs:i}=N(c=>c.app),d=k[s],z=d.name.split(" - ").map(c=>n(c)).join(" - "),f=i.some(c=>c.app===s),D=!d.allowMultiInstances&&((V=i.find(c=>c.id===h))==null?void 0:V.app)===s,G=c=>{f||l.event(b.OPEN_APP,{appId:s,isOpenInNew:c}),a(c?He(s):Ce({appId:s})),r[0]||(a(B()),l.toggleNavMenu(!1))},he=c=>{a(ye(c)),r[0]||(a(B()),l.toggleNavMenu(!1))},de=c=>{a(Ae(c)),l.event(b.CLOSE_APP,{app:s})},ue=c=>{a(Se(c)),l.event(b.CLOSE_APP,{app:c})};return e.jsxs(e.Fragment,{children:[e.jsxs($,{variant:D?"solid":"ghost",size:"md",isAttached:!0,"aria-current":D,sx:K,children:[e.jsx(m,{onClick:()=>G(!1),leftIcon:f?e.jsx(qe,{title:n("Running")}):e.jsx(I,{w:4}),children:z}),d.allowMultiInstances&&e.jsx(S,{"aria-label":n("New tab"),title:n("New tab"),icon:e.jsx($e,{}),onClick:()=>G(!0)}),e.jsxs(xe,{children:[e.jsx(ge,{as:S,icon:e.jsx(Qe,{}),"aria-label":n("More"),title:n("More")}),e.jsxs(je,{children:[f&&e.jsx(q,{icon:e.jsx(Z,{}),onClick:()=>ue(s),children:d.allowMultiInstances?n("Close all tabs"):n("Close app")}),e.jsx(q,{icon:e.jsx(We,{}),onClick:o,children:n("About")})]})]})]}),d.allowMultiInstances&&i.filter(c=>c.app===s).map((c,U)=>{const W=c.id===h;return e.jsxs($,{variant:W?"solid":"ghost",size:"sm",ml:8,mr:1,isAttached:!0,"aria-current":W,sx:K,children:[e.jsxs(m,{onClick:()=>he(c.id),children:[e.jsx(se,{mr:2,children:U+1}),n("Tab")+" "+(U+1).toString()+" - "+z]}),e.jsx(S,{"aria-label":n("Close tab"),title:n("Close tab"),icon:e.jsx(Z,{}),onClick:()=>de(c.id)})]},c.id)})]})}const Ke=async t=>{const s=`/${t}/info.json`;try{return(await(await fetch(s)).json()).version}catch(o){return console.log(`Failed to get version for ${t}`),"unknown"}},et=async t=>{const s=`/${t}/legacy-contributor-list.txt`;return(await(await fetch(s)).text()).split(`
`)};function tt(t){var i,d,z;const{appId:s,onClose:o}=t,{t:n}=p(),[a,r]=u.useState("Unknown"),h=s?(z=(d=(i=k[s])==null?void 0:i.url)==null?void 0:d.split("/"))==null?void 0:z[1]:void 0;return u.useEffect(()=>{h?Ke(h).then(f=>r(f)):r("Unknown")},[h]),e.jsxs(M,{isOpen:!!s,onClose:o,size:"xl",scrollBehavior:"inside",children:[e.jsx(_,{}),e.jsxs(w,{children:[e.jsxs(H,{children:[n("About")+" "+(s?k[s].name.split(" - ").map(f=>n(f)).join(" - "):""),e.jsx(se,{ml:1,children:a})]}),e.jsx(P,{}),e.jsx(C,{}),e.jsx(y,{children:e.jsx(m,{colorScheme:"primary",onClick:()=>window.open("https://github.com/railmapgen/"+h,"_blank"),children:n("Visit GitHub")})})]})]})}const nt={flexDirection:"column","& h4":{mx:3,my:2},"& > div":{flexDirection:"column"}};function st(){const{t}=p(),[s,o]=u.useState(),n=Re(l.getEnv());return e.jsxs(j,{sx:nt,children:[e.jsx(v,{as:"h4",size:"md",children:t("Apps")}),e.jsx(j,{children:n.map(a=>e.jsx(Ze,{appId:a,onAboutOpen:()=>o(a)},a))}),e.jsx(tt,{appId:s,onClose:()=>o(void 0)})]})}const at={flexDirection:"column",py:1,"& h4":{mx:3,my:2},"& > div":{px:2}};function ot(){const{t}=p(),{setColourMode:s}=Ie(),o={light:t("Light"),dark:t("Dark"),system:t("System")},a=l.getInstance()===R.GITHUB?R.GITLAB:R.GITHUB,r=()=>{const i=Te(a,l.getEnv());window.open(i,"_blank"),l.event(b.SWITCH_MIRROR,{mirrorUrl:i})},h=[{type:"select",label:t("Language"),value:l.getLanguage(),options:{[t("Main languages")]:Ee.reduce((i,d)=>({...i,[d]:X[d][d]}),{}),[t("Other languages")]:Oe.reduce((i,d)=>({...i,[d]:X[d][d]}),{})},onChange:i=>{const d=i;l.setLanguage(d),l.getI18nInstance().changeLanguage(d),l.event(b.CHANGE_LANGUAGE,{language:d})}},{type:"select",label:t("Appearance"),value:l.getColourMode(),options:o,onChange:i=>s(i)},{type:"custom",label:t("Switch to")+" "+_e[a],component:e.jsx(m,{size:"xs",onClick:r,children:t("Switch")}),minW:"full",oneLine:!0}];return e.jsxs(j,{sx:at,children:[e.jsx(v,{as:"h4",size:"md",children:t("Settings")}),e.jsx(I,{children:e.jsx(le,{fields:h})})]})}const it=async t=>{const s=`https://api.github.com/repos/railmapgen/${t}/contributors`;return(await(await fetch(s)).json()).map(a=>a.login)},rt=["","wongchito","thekingofcity","github-actions[bot]"],lt=async t=>{const{showContributors:s,legacyContributors:o}=k[t];if(!s)return[];const n=[it(t)];o&&n.push(et(t));try{const a=await Promise.all(n),r=new Set(a.flat());return Array.from(r).filter(h=>!rt.includes(h))}catch(a){console.error("[rmt] unable to fetch contributors for:",t);return}};function ce(t){const{login:s,urlRepo:o,...n}=t,a=o?`https://github.com/railmapgen/${o}/issues?q=is:issue+author:${s}`:`https://github.com/${s}`;return e.jsx(T,{name:s,title:s,src:`https://github.com/${s}.png`,loading:"lazy",onClick:()=>window.open(a,"_blank"),cursor:"pointer",...n})}const ct={position:"relative",minH:20,"& .chakra-alert":{flexDirection:"column"},"& .chakra-alert__icon":{boxSize:7,mr:0,mb:1}};function ht(t){const{appId:s}=t,{t:o}=p(),[n,a]=u.useState(),[r,h]=u.useState(!0);return u.useEffect(()=>{lt(s).then(a).finally(()=>{h(!1)})},[]),e.jsx(j,{sx:ct,children:r?e.jsx(Le,{isIndeterminate:!0}):n?e.jsx(ae,{spacing:1.5,children:n.map(i=>e.jsx(oe,{children:e.jsx(ce,{login:i,urlRepo:s,size:"sm"})},i))}):e.jsxs(E,{status:"warning",children:[e.jsx(O,{}),o("Unable to load contributors")]})})}const dt=["52PD","linchen1965"],ut={"& h5":{mt:6,mb:4,"&:first-of-type":{mt:0}},"& h6":{mt:5,mb:2,"&:first-of-type":{mt:0}},"& .dev-team-stack":{"& > span":{minW:"75%",borderRadius:"lg",cursor:"pointer","& > span:last-of-type":{display:"block"},"& p":{fontSize:"sm","&:first-of-type":{fontSize:"lg",fontWeight:"bold",mb:1}}},"& .chakra-avatar":{ml:1,mr:3,my:4}},"& i":{mt:3,fontSize:"xs"}};function pt(t){const{isOpen:s,onClose:o}=t,{t:n}=p();return e.jsxs(M,{isOpen:s,onClose:o,size:"xl",scrollBehavior:"inside",children:[e.jsx(_,{}),e.jsxs(w,{children:[e.jsx(H,{children:n("Contributors")}),e.jsx(P,{}),e.jsxs(C,{sx:ut,children:[e.jsx(v,{as:"h5",size:"sm",children:n("Developer team")}),e.jsxs(te,{className:"dev-team-stack",children:[e.jsxs(Y,{size:"lg",onClick:()=>window.open("https://github.com/wongchito","_blank"),children:[e.jsx(T,{src:"https://github.com/wongchito.png",size:"lg"}),e.jsxs(Q,{children:[e.jsx(x,{children:"Chito Wong"}),e.jsx(x,{children:"Author of Rail Map Toolkit platform"}),e.jsx(x,{children:"Author of Rail Map Generator"})]})]}),e.jsxs(Y,{size:"lg",onClick:()=>window.open("https://github.com/thekingofcity","_blank"),children:[e.jsx(T,{src:"https://github.com/thekingofcity.png",size:"lg"}),e.jsxs(Q,{children:[e.jsx(x,{children:"thekingofcity"}),e.jsx(x,{children:"Author of Rail Map Painter"}),e.jsx(x,{children:"Author of RMG (Shanghai Metro style)"})]})]})]}),e.jsx(v,{as:"h5",size:"sm",children:n("Resource administrators")}),e.jsx(ae,{spacing:1.5,children:dt.map(a=>e.jsx(oe,{children:e.jsx(ce,{login:a,size:"md"})},a))}),e.jsx(v,{as:"h5",size:"sm",children:n("Resource contributors")}),Object.entries(k).filter(([a,r])=>r.showContributors).map(([a,r])=>e.jsxs(u.Fragment,{children:[e.jsx(v,{as:"h6",size:"xs",mt:5,mb:2,children:n(r.name)}),e.jsx(ht,{appId:a},a)]},a)),e.jsx(x,{as:"i",children:n("Notes: Contributors are sorted by number of commits and commit time.")})]}),e.jsx(y,{children:e.jsx(m,{colorScheme:"primary",onClick:()=>window.open("https://github.com/railmapgen/rmg/wiki/How-to-add-color-palette-and-line-templates","_blank"),children:n("Contribution Wiki")})})]})]})}function mt(t){const{isOpen:s,onClose:o}=t,{t:n}=p(),[a,r]=u.useState(l.isAllowAnalytics()),[h,i]=u.useState();u.useEffect(()=>{s||i(void 0)},[s]);const d=[{type:"switch",label:n("Allow cookies to help improve our website"),isChecked:a,onChange:r,oneLine:!0}],z=()=>{l.allowAnalytics(a).refreshRequired?i("Refreshing is required for changes to take effect."):o()};return e.jsxs(M,{isOpen:s,onClose:o,children:[e.jsx(_,{}),e.jsxs(w,{children:[h&&e.jsxs(E,{status:"info",variant:"solid",size:"xs",children:[e.jsx(O,{}),n(h)]}),e.jsxs(I,{position:"relative",children:[e.jsx(H,{children:n("Privacy settings")}),e.jsx(P,{})]}),e.jsx(C,{children:e.jsx(le,{fields:d})}),e.jsx(y,{children:e.jsx(m,{colorScheme:"primary",isDisabled:!!h,onClick:z,children:n("Save")})})]})]})}function xt(t){return g({tag:"svg",attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"M126.12 315.1A47.06 47.06 0 1179.06 268h47.06zm23.72 0a47.06 47.06 0 0194.12 0v117.84a47.06 47.06 0 11-94.12 0zm47.06-188.98A47.06 47.06 0 11244 79.06v47.06zm0 23.72a47.06 47.06 0 010 94.12H79.06a47.06 47.06 0 010-94.12zm188.98 47.06a47.06 47.06 0 1147.06 47.1h-47.06zm-23.72 0a47.06 47.06 0 01-94.12 0V79.06a47.06 47.06 0 1194.12 0zM315.1 385.88a47.06 47.06 0 11-47.1 47.06v-47.06zm0-23.72a47.06 47.06 0 010-94.12h117.84a47.06 47.06 0 110 94.12z"}}]})(t)}function gt(){const{t}=p(),[s,o]=u.useState(!1),[n,a]=u.useState(!1);return e.jsxs(j,{direction:"column",children:[e.jsx(fe,{}),e.jsxs(ve,{templateColumns:"repeat(4, auto)",children:[e.jsx(A,{children:e.jsx(m,{as:L,variant:"ghost",size:"sm",w:"100%",leftIcon:e.jsx(xt,{}),target:"_blank",href:"https://join.slack.com/t/railmapgenerator/shared_invite/zt-1odhhta3n-DdZF~fnVwo_q0S0RJmgV8A",children:"Slack"})}),e.jsx(A,{children:e.jsx(m,{variant:"ghost",size:"sm",w:"100%",leftIcon:e.jsx(Je,{}),onClick:()=>o(!0),children:t("Contributors")})}),e.jsx(A,{children:e.jsx(m,{variant:"ghost",size:"sm",w:"100%",leftIcon:e.jsx(Fe,{}),onClick:()=>a(!0),children:t("Privacy")})}),e.jsx(A,{children:e.jsx(m,{as:L,variant:"ghost",size:"sm",w:"100%",leftIcon:e.jsx(Xe,{}),target:"_blank",href:"https://rmttutorial.wordpress.com",children:t("Tutorial")})})]}),e.jsx(pt,{isOpen:s,onClose:()=>o(!1)}),e.jsx(mt,{isOpen:n,onClose:()=>a(!1)})]})}const ee=420,jt={flexShrink:0,flexDirection:"column",overflow:"hidden",alignItems:"flex-end",transition:"0.3s ease-in-out",maxW:0,visibility:"hidden",boxShadow:"lg",zIndex:100,".show-menu &":{maxW:{base:"100%",md:ee},w:{base:"100%",md:"unset"},visibility:"initial"},"& > div":{flexDirection:"column",h:"100%",w:{base:"100vw",md:ee},"& .nav-menu__header":{flex:0,flexDirection:"row",alignItems:"center",minHeight:10,pl:12},"& .nav-menu__body":{flexDirection:"column",flex:1,overflow:"hidden","& > div:first-of-type":{flex:1,overflowY:"auto"}}},"& .chakra-alert":{flexGrow:0,pl:3,pr:2,py:2,"& a":{fontWeight:"bold",textDecoration:"underline","&:hover, &:focus":{textDecoration:"none"}}}};function ft(){const{t}=p(),[s]=ie(),o=(l.getInstance()===R.GITLAB?"https://railmapgen.gitlab.io/":"https://railmapgen.github.io/")+"?"+s.toString();return e.jsx(j,{as:"section",sx:jt,children:e.jsxs(j,{children:[e.jsxs(j,{className:"nav-menu__header",children:[e.jsx(v,{as:"h4",size:"md",children:t("Rail Map Toolkit")}),e.jsx(Be,{environment:l.getEnv(),version:l.getAppVersion()})]}),l.getEnv()!=="PRD"&&e.jsxs(E,{status:"warning",children:[e.jsx(O,{}),e.jsxs(ze,{children:[t("You're currently viewing a testing environment.")," ",e.jsx(L,{href:o,isExternal:!0,children:t("Back to production environment")})]})]}),e.jsxs(j,{className:"nav-menu__body",children:[e.jsx(st,{}),e.jsx(ot,{})]}),e.jsx(gt,{})]})})}function vt(t){const{isOpen:s,onClose:o}=t,{t:n}=p(),a=u.useRef(null),r=()=>{l.allowAnalytics(!0),o()},h=()=>{l.allowAnalytics(!1).refreshRequired?window.location.reload():o()};return e.jsxs(M,{initialFocusRef:a,isOpen:s,onClose:()=>{},children:[e.jsx(_,{}),e.jsxs(w,{children:[e.jsx(H,{children:n("CookiesModal.header")}),e.jsxs(C,{children:[e.jsx(x,{children:n("CookiesModal.text1")}),e.jsx(x,{mt:2,children:n("CookiesModal.text2")}),e.jsx(be,{children:e.jsxs(ke,{children:[" ",n("CookiesModal.item1")]})}),e.jsx(x,{mt:2,children:n("CookiesModal.text3")})]}),e.jsx(y,{children:e.jsxs(ne,{children:[e.jsx(m,{variant:"ghost",onClick:h,children:n("CookiesModal.reject")}),e.jsx(m,{ref:a,colorScheme:"primary",onClick:r,children:n("CookiesModal.accept")})]})})]})]})}const zt=()=>{};function bt(){const{t}=p();return e.jsx(M,{isOpen:!0,onClose:zt,children:e.jsxs(w,{children:[e.jsx(H,{children:t("Rail Map Toolkit is opened in another window")}),e.jsx(C,{children:t("You cannot open multiple Rail Map Toolkit at the same time. Please close this window.")}),e.jsx(y,{})]})})}function Ht(){const{t}=p(),s=re(),{isPrimary:o,isShowMenu:n}=N(i=>i.app),[a,r]=u.useState(!1);u.useEffect(()=>{l.isAnalyticsQADone()||r(!0)},[]);const h=()=>{l.toggleNavMenu(!n),s(B()),l.event(b.TOGGLE_NAV_MENU,{})};return o===!1?e.jsx(J,{children:e.jsx(bt,{})}):e.jsx(Me,{basename:"/",children:e.jsxs(J,{className:n?"show-menu":"",children:[e.jsx(S,{variant:n?"ghost":"solid",colorScheme:n?void 0:"primary",size:"md","aria-label":t("Toggle menu"),title:t("Toggle menu"),icon:e.jsx(Ye,{}),position:"absolute",zIndex:110,borderRadius:0,onClick:h}),e.jsxs(Pe,{sx:{flexDirection:"row"},children:[e.jsx(ft,{}),e.jsx(Ue,{})]}),e.jsx(vt,{isOpen:a,onClose:()=>r(!1)})]})})}export{Ht as default};
