System.register(["./index-legacy-BX7Tuuzx.js","./chakra-legacy-CCpLRiQ_.js","./react-legacy-hXNwZbhN.js","./rmg-fields-legacy-BWv4HeAO.js"],(function(e,t){"use strict";var s,n,a,i,r,c,d,l,o,h,u,j,x,p,m,f,w;return{setters:[e=>{s=e.d,n=e.r,a=e.e,i=e.f,r=e.R,c=e.g,d=e.h,l=e.c},e=>{o=e.j,h=e.H,u=e.B,j=e.c,x=e.a,p=e.T,m=e.b},e=>{f=e.a},e=>{w=e.R}],execute:function(){function e(){return o.jsx(s,{children:o.jsx(h,{as:"h4",size:"md",children:"Runtime Demo"})})}function t(e){return o.jsxs(u,{...e,children:[o.jsx("p",{children:"All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood."}),o.jsx("p",{children:"人皆生而自由；在尊嚴及權利上均各平等。人各賦有理性良知，誠應和睦相處，情同手足。"}),o.jsx("p",{children:"人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。"})]})}function g(){const[e,s]=f.useState({}),[r,c]=f.useState();f.useEffect((()=>{n.getAllFonts().then(s)}),[]);const d=Object.entries(e).reduce(((e,t)=>({...e,[t[0]]:t[1].displayName??t[0]})),{"":"Default"}),l=[{type:"select",label:"Display font",options:d,value:r,onChange:e=>(async e=>{e&&await n.loadFont(e),c(e)})(e)},{type:"output",label:"Preview",value:o.jsx(t,{fontFamily:r||void 0})}];return o.jsxs(a,{children:[o.jsx(i,{children:o.jsx(h,{as:"h5",size:"sm",children:"Fonts"})}),o.jsx(j.div,{px:1,children:o.jsx(w,{fields:l,minW:"full"})})]})}function y(){const[e,t]=f.useState(0),[s,r]=f.useState(),[c,d]=f.useState(),[l,u]=f.useState();f.useEffect((()=>{const e=setTimeout((()=>{r(window.frameElement?.getAttribute("src")),d(window.location.href),u(window.frameElement?.getAttribute("data-persisted-url"))}),200);return()=>{clearTimeout(e)}}),[e]);const j=()=>{const e=Math.ceil(100*Math.random());return t(e),e};return o.jsxs(a,{children:[o.jsx(i,{children:o.jsx(h,{as:"h5",size:"sm",children:"Metadata"})}),o.jsxs(x,{wrap:"wrap",px:1,children:[o.jsxs(p,{w:"100%",children:["iframe src: ",s]}),o.jsxs(p,{w:"100%",children:["Document location: ",c]}),o.jsxs(p,{w:"100%",children:["Persisted URL: ",l]}),o.jsx(m,{size:"sm",onClick:()=>{n.updateAppMetadata({title:`Runtime Demo (${j()})`})},children:"Update title"}),o.jsx(m,{size:"sm",onClick:()=>{n.updateAppMetadata({search:`count=${j()}`})},children:"Update search"}),o.jsx(m,{size:"sm",onClick:()=>{t(0),n.updateAppMetadata({search:""})},children:"Reset search"}),o.jsx(m,{size:"sm",onClick:()=>{n.updateAppMetadata({hash:`/${j()}`})},children:"Update hash"}),o.jsx(m,{size:"sm",onClick:()=>{t(0),n.updateAppMetadata({hash:""})},children:"Reset hash"})]})]})}function b(){return o.jsx(r,{children:o.jsxs(c,{children:[o.jsx(e,{}),o.jsxs(d,{alignSelf:"center",sx:{width:{base:"100%",md:520}},children:[o.jsx(g,{}),o.jsx(y,{})]})]})})}let A;n.ready().then((()=>{A=l.createRoot(document.getElementById("root")),A.render(o.jsx(f.StrictMode,{children:o.jsx(b,{})})),n.injectUITools()}))}}}));
