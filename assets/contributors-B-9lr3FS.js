import{c as z}from"./index-C_hgTfa4.js";import{j as t,b as x,c as j,T as c,d as b,C as R,A as f,F as S,e as g,G as y,f as p,l as L,L as P,g as B,M as D,h as $,B as H,R as G,i as W,k as F,m as q,r as M}from"./mantine-B5EjhH7N.js";import{k as h,r as l,I as V}from"./react-UC3gAxe5.js";import{a as A,i as Y}from"./asset-enablements-DzI5TNlO.js";const J="_body_aglsa_1",m={body:J,"dev-section-body":"_dev-section-body_aglsa_11","dev-card":"_dev-card_aglsa_17"};function K(){const{t:e}=h();return t.jsxs(x,{children:[t.jsx(j,{children:t.jsx(c,{order:2,size:"h4",children:e("Developer team")})}),t.jsxs(b,{className:m["dev-section-body"],children:[t.jsxs(R,{component:"a",className:m["dev-card"],href:"https://github.com/wongchito",target:"_blank",withBorder:!0,children:[t.jsx(f,{src:"https://github.com/wongchito.png",size:"lg"}),t.jsxs(S,{children:[t.jsx(c,{order:3,children:"Chito Wong"}),t.jsx(g,{span:!0,children:"Author of Rail Map Toolkit platform"}),t.jsx(g,{span:!0,children:"Author of Rail Map Generator"})]})]}),t.jsxs(R,{component:"a",className:m["dev-card"],href:"https://github.com/thekingofcity",target:"_blank",withBorder:!0,children:[t.jsx(f,{src:"https://github.com/thekingofcity.png",size:"lg"}),t.jsxs(S,{children:[t.jsx(c,{order:3,children:"thekingofcity"}),t.jsx(g,{span:!0,children:"Author of Rail Map Painter"}),t.jsx(g,{span:!0,children:"Author of RMG (Shanghai Metro style)"})]})]}),t.jsxs(R,{component:"a",className:m["dev-card"],href:"https://github.com/langonginc",target:"_blank",withBorder:!0,children:[t.jsx(f,{src:"https://github.com/langonginc.png",size:"lg"}),t.jsxs(S,{children:[t.jsx(c,{order:3,children:"langonginc"}),t.jsx(g,{span:!0,children:"Author of Rail Map Painter"})]})]})]})]})}function E(e){const{login:s,urlRepo:n,...r}=e,o=n?`https://github.com/railmapgen/${n}/issues?q=is:issue+author:${s}`:`https://github.com/${s}`;return t.jsx(f,{component:"a",name:s,title:s,src:`https://github.com/${s}.png`,alt:s,href:o,target:"_blank",color:"initials",...r})}const Q=["Swiftiecott","linchen1965","28yfang","Windows-Taskmgr"];function X(){const{t:e}=h();return t.jsxs(x,{children:[t.jsx(j,{children:t.jsx(c,{order:2,size:"h4",children:e("Resource administrators")})}),t.jsx(y,{gap:"xs",children:Q.map(s=>t.jsx(E,{login:s,size:"lg"},s))})]})}const O="https://api.github.com/repos/railmapgen",w={},N=async(e,s)=>{if(e in w)return w[e];const r=await(await fetch(e,s)).json();return w[e]=r,r},I=async(e,...s)=>{const n=[];let r=0;for(;++r;){const o=await e(r,...s);if(n.push(...o),o.length<100)break}return n},Z=async(e,s)=>{const n=`${O}/${s}/contributors`,r=new URLSearchParams({per_page:"100",page:e.toString()});return(await N(n+"?"+r.toString())).map(a=>a.login)},C=e=>I(Z,e),tt={"rmg-palette":p(()=>C("rmg-palette")),"rmg-templates":p(()=>C("rmg-templates")),"rmp-gallery":p(()=>C("rmp-gallery"))},et=async(e,s)=>{const n=`${O}/${s}/issues`,r=new URLSearchParams({state:"closed",labels:"donation",per_page:"100",page:e.toString()});return(await N(n+"?"+r.toString())).filter(a=>a.state_reason==="completed").map(a=>{var i;return(i=a.user)==null?void 0:i.login})},st=e=>I(et,e),rt={"rmp-gallery":p(()=>st("rmp-gallery"))},T=async(e,s)=>{const n=`/${e}/legacy-contributor-list.txt`;return(await(await fetch(n,{signal:s})).text()).split(`
`)},nt={"rmg-palette":p(()=>T("rmg-palette")),"rmg-templates":p(()=>T("rmg-templates"))};function U(e){const[s,n]=l.useState([]);return[s,o=>{n(a=>{const i=new Set(a?a.concat(o):o);return Array.from(i)})}]}const ot=["","wongchito","thekingofcity","github-actions[bot]"],v=e=>!ot.includes(e);function at(e){const[s,n]=U(),[r,o]=l.useState(!0),[a,i]=l.useState(!1);return l.useEffect(()=>(tt[e]().then(d=>n(d.filter(v))).then(()=>A[e].legacyContributors?nt[e]():[]).then(d=>n(d.filter(v))).catch(d=>{L.error("unable to fetch contributors for:",e,d),i(!0)}).finally(()=>o(!1)),()=>{o(!0),i(!1)}),[e]),{contributors:s,isLoading:r,isError:a}}function it(e){const{appId:s}=e,{t:n}=h(),{contributors:r,isLoading:o,isError:a}=at(s);return t.jsxs(b,{children:[t.jsx(P,{visible:o}),a&&t.jsx(B,{color:"yellow",icon:t.jsx(D,{}),title:n("Unable to load contributors"),flex:1}),!a&&r&&t.jsx(y,{gap:"xs",children:r==null?void 0:r.map(i=>t.jsx(E,{login:i,urlRepo:s},i))})]})}function ct(){const{t:e}=h();return t.jsxs(x,{children:[t.jsx(j,{children:t.jsx(c,{order:2,size:"h4",children:e("Resource contributors")})}),t.jsxs(b,{direction:"column",gap:"xs",children:[Object.entries(A).filter(([,s])=>s.showContributors).map(([s,n])=>t.jsxs(x,{children:[t.jsx(j,{children:t.jsx(c,{order:3,size:"h5",children:e(n.name)})}),t.jsx(it,{appId:s},s)]},s)),t.jsx(g,{fs:"italic",children:e("Notes: Contributors are sorted by number of commits and commit time.")})]})]})}function lt(){const[e,s]=U(),[n,r]=l.useState(!0),[o,a]=l.useState(!1),i=async()=>{const d=Object.entries(A).filter(([,u])=>u.showDonators).map(([u])=>u);for(const u of d)try{s(await rt[u]())}catch(_){throw L.error("unable to fetch donators for:",u,_),_}};return l.useEffect(()=>(i().catch(()=>a(!0)).finally(()=>r(!1)),()=>{r(!0),a(!1)}),[]),{donators:e,isLoading:n,isError:o}}function dt(){const{t:e}=h(),{donators:s,isLoading:n,isError:r}=lt();return t.jsxs(x,{children:[t.jsx(j,{children:t.jsx(c,{order:2,size:"h4",children:"❤️ "+e("Donators")})}),t.jsxs(b,{children:[t.jsx(P,{visible:n}),r&&t.jsx(B,{color:"yellow",icon:t.jsx(D,{}),title:e("Unable to load donators"),flex:1}),!r&&s&&t.jsx(y,{gap:"xs",children:s==null?void 0:s.map(o=>t.jsx(E,{login:o},o))})]})]})}function ht(){const{t:e}=h();return t.jsxs($,{className:m.body,children:[t.jsx(K,{}),t.jsx(dt,{}),t.jsx(X,{}),t.jsx(ct,{}),t.jsx(y,{children:t.jsx(H,{component:"a",href:"https://github.com/railmapgen/rmg/wiki/How-to-add-color-palette-and-line-templates",target:"_blank",children:e("Contribution Wiki")})})]})}function ut(){const{t:e}=h();return t.jsx(G,{children:t.jsxs(W,{children:[t.jsx(F,{children:t.jsx(c,{children:e("Contributors")})}),t.jsx(q,{w:{base:"100%",sm:600},style:{alignSelf:"center"},children:t.jsx(ht,{})})]})})}let k;const gt=()=>{k=z.createRoot(document.getElementById("root")),k.render(t.jsx(l.StrictMode,{children:t.jsx(V,{i18n:Y,children:t.jsx(ut,{})})}))};M.ready().then(()=>{gt(),M.injectUITools()});
