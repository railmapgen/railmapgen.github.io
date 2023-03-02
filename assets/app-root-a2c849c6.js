import{o as f,p as o,V as Q,H as D,j as e,q as $,s as A,T as v,g,B as N,t as oe,v as ie,w as re,x as se,r as h,y as M,z as ae,A as le,D as ce,E as C,M as he,F as de,G as S,J as ue,K as F,L as T,N as E,O,Q as I,S as me,U as j,W as R,X as B,Y as w,Z as pe,_ as ge,$ as J,a0 as X,a1 as fe,a2 as y,a3 as u,a4 as m,a5 as P,a6 as G,a7 as k,a8 as ve,a9 as we,f as V,aa as be,ab as ye,ac as Me,ad as Ce,ae as xe,af as ke}from"./vendor-68f51f68.js";import{F as ze,u as W,a as K,s as Ae,b as z,c as Se,E as _,o as Te,d as Ee,t as Z,g as Oe,m as Y,e as Ie}from"./index-cfc0f2ac.js";const Re="/assets/rmp-logo512-652b509a.png",Be={flex:1,justifyContent:"center",mb:10,"& > div":{mb:3},"& img":{w:120,p:2,backgroundColor:"white",borderRadius:12}};function _e(){const{t}=f();return o(Q,{sx:Be,children:[o(D,{spacing:3,children:[e($,{src:"/logo512.png"}),e($,{src:Re,backgroundColor:"white"})]}),e(A,{children:t("Welcome to Rail Map Toolkit")}),e(v,{fontSize:"lg",textAlign:"center",children:t("Select an app to start your own rail map design!")})]})}function He(t){var i;const{tab:r,isActive:s}=t,[n]=g.useState((i=r.url)!=null?i:"/"+r.app+"/");return e(N,{display:s?"block":"none",flex:1,children:e("iframe",{id:ze+r.id,src:n,loading:"lazy",title:r.app,width:"100%",height:"100%"})})}const Pe={display:"flex",flex:1,flexDirection:"column",overflow:"hidden","& .chakra-tabs__tablist":{whiteSpace:"nowrap",overflowX:"auto",overflowY:"hidden",ml:10,transition:"0.3s ease-in-out",".show-menu &":{ml:0}},"& .chakra-tabs__tab":{"& button":{ml:1}}};function Ge(){const{t}=f(),r=W(),{openedTabs:s,activeTab:n}=K(a=>a.app),i=n?s.findIndex(a=>a.id===n):-1,l=(a,d,p)=>{a.stopPropagation(),r(Se(d)),h.event(_.CLOSE_APP,{app:p})};return s.length===0?e(_e,{}):o(oe,{as:"section",variant:"enclosed",colorScheme:"primary",index:i,sx:Pe,children:[e(ie,{children:s.map(({id:a,app:d})=>o(re,{as:N,onClick:()=>r(Ae(a)),cursor:"pointer",children:[t(z[d].name),e(se,{size:"sm",onClick:p=>l(p,a,d),title:t("Close")})]},a))}),s.map(a=>e(He,{tab:a,isActive:n===a.id},a.id))]})}var ee={color:void 0,size:void 0,className:void 0,style:void 0,attr:void 0},q=M.createContext&&M.createContext(ee),b=globalThis&&globalThis.__assign||function(){return b=Object.assign||function(t){for(var r,s=1,n=arguments.length;s<n;s++){r=arguments[s];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(t[i]=r[i])}return t},b.apply(this,arguments)},Ne=globalThis&&globalThis.__rest||function(t,r){var s={};for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&r.indexOf(n)<0&&(s[n]=t[n]);if(t!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,n=Object.getOwnPropertySymbols(t);i<n.length;i++)r.indexOf(n[i])<0&&Object.prototype.propertyIsEnumerable.call(t,n[i])&&(s[n[i]]=t[n[i]]);return s};function te(t){return t&&t.map(function(r,s){return M.createElement(r.tag,b({key:s},r.attr),te(r.child))})}function x(t){return function(r){return M.createElement(je,b({attr:b({},t.attr)},r),te(t.child))}}function je(t){var r=function(s){var n=t.attr,i=t.size,l=t.title,a=Ne(t,["attr","size","title"]),d=i||s.size||"1em",p;return s.className&&(p=s.className),t.className&&(p=(p?p+" ":"")+t.className),M.createElement("svg",b({stroke:"currentColor",fill:"currentColor",strokeWidth:"0"},s.attr,n,a,{className:p,style:b(b({color:t.color||s.color},s.style),t.style),height:d,width:d,xmlns:"http://www.w3.org/2000/svg"}),l&&M.createElement("title",null,l),t.children)};return q!==void 0?M.createElement(q.Consumer,null,function(s){return r(s)}):r(ee)}function Le(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"}}]})(t)}function Ve(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0V0z"}},{tag:"path",attr:{d:"M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"}}]})(t)}function c(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"}}]})(t)}function De(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"}}]})(t)}function We(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"}}]})(t)}function Ue(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"}}]})(t)}function $e(t){return x({tag:"svg",attr:{viewBox:"0 0 24 24"},child:[{tag:"path",attr:{fill:"none",d:"M0 0h24v24H0z"}},{tag:"path",attr:{d:"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"}}]})(t)}const Fe={w:"100%",overflow:"hidden",justifyContent:"flex-start",textOverflow:"ellipsis",textAlign:"start"};function Ye(t){const{appId:r,onAboutOpen:s}=t,{t:n}=f(),i=W(),l=ae(`(min-width: ${le.breakpoints.sm})`),a=d=>{i(d?Te(r):Ee(r)),l[0]||i(Z()),h.event(_.OPEN_APP,{appId:r,isOpenInNew:d})};return o(ce,{variant:"ghost",size:"md",isAttached:!0,children:[e(C,{onClick:()=>a(!1),title:n(z[r].name),sx:Fe,children:n(z[r].name)}),o(he,{children:[e(de,{as:S,icon:e(Ue,{}),"aria-label":n("More"),title:n("More")}),o(ue,{children:[z[r].allowMultiInstances&&e(F,{icon:e(c,{}),onClick:()=>a(!0),children:n("Open in new Workspace")}),e(F,{icon:e(Ve,{}),onClick:s,children:n("About")+" "+n(z[r].name)})]})]})]})}const qe=async t=>{const r=`/${t}/info.json`;try{return(await(await fetch(r)).json()).version}catch(s){return console.log(`Failed to get version for ${t}`),"unknown"}};function Qe(t){const{appId:r,onClose:s}=t,{t:n}=f(),[i,l]=g.useState("Unknown");return g.useEffect(()=>{r?qe(r).then(a=>l(a)):l("Unknown")},[r]),o(T,{isOpen:!!r,onClose:s,size:"xl",scrollBehavior:"inside",children:[e(E,{}),o(O,{children:[o(I,{children:[n("About")+" "+(r?n(z[r].name):""),e(me,{ml:1,children:i})]}),e(j,{}),e(R,{}),e(B,{children:e(C,{colorScheme:"primary",onClick:()=>window.open("https://github.com/railmapgen/"+r,"_blank"),children:n("Visit GitHub")})})]})]})}const Je={flexDirection:"column","& h5":{mx:1,my:2},"& > div":{flexDirection:"column"}};function Xe(){const{t}=f(),[r,s]=g.useState(),n=Oe(h.getEnv());return o(w,{sx:Je,children:[e(A,{as:"h5",size:"sm",children:t("Apps")}),e(w,{children:n.map(i=>e(Ye,{appId:i,onAboutOpen:()=>s(i)},i))}),e(Qe,{appId:r,onClose:()=>s(void 0)})]})}const Ke={flexDirection:"column","& h5":{mx:1,my:2},"& > div":{px:2}};function Ze(){const{t}=f(),r=[{type:"select",label:t("Language"),value:h.getLanguage(),options:pe.reduce((s,n)=>({...s,[n]:ge[n][n]}),{}),onChange:s=>{const n=s;h.setLanguage(n),h.getI18nInstance().changeLanguage(n),h.event(_.CHANGE_LANGUAGE,{language:n})}}];return o(w,{sx:Ke,children:[e(A,{as:"h5",size:"sm",children:t("Settings")}),e(N,{children:e(J,{fields:r})})]})}function et(t){const{isOpen:r,onClose:s}=t,{t:n}=f(),i=X("primary.500","primary.300");return o(T,{isOpen:r,onClose:s,size:"xl",scrollBehavior:"inside",children:[e(E,{}),o(O,{children:[e(I,{children:n("Terms and conditions")}),e(j,{}),e(R,{children:o(fe,{children:[o(y,{children:["The layout of the elements on the signage or rail map, is designed by"," ",o(u,{color:i,href:"https://www.gzmtr.com/",isExternal:!0,children:["Guangzhou Metro Group ",e(m,{as:c})]}),", ",o(u,{color:i,href:"https://www.mtr.com.hk/",isExternal:!0,children:["MTR Corporation ",e(m,{as:c})]})," or ",o(u,{color:i,href:"https://www.shmetro.com/",isExternal:!0,children:["Shanghai Shentong Metro Group ",e(m,{as:c})]}),", depending on your selection. You shall grant appropriate permit or license from the relevant company above before using the generated images for commercial purposes, if it is required to do so.",e("br",{}),"標誌版或路線圖之元素之佈局，基於你所選擇之風格，為",o(u,{color:i,href:"https://www.gzmtr.com/",isExternal:!0,children:["廣州地鐵集團公司 ",e(m,{as:c})]}),"，",o(u,{color:i,href:"https://www.mtr.com.hk/",isExternal:!0,children:["港鐵公司 ",e(m,{as:c})]}),"或",o(u,{color:i,href:"https://www.shmetro.com/",isExternal:!0,children:["上海申通地鐵集團 ",e(m,{as:c})]}),"所設計。在產生之圖像用作商業用途前，你應向相關公司取得適當之許可證或授權。"]}),o(y,{children:["The elements including shapes and lines on the image are drawn by"," ",o(u,{color:i,href:"https://www.github.com/wongchito",isExternal:!0,children:["Chito Wong ",e(m,{as:c})]})," and ",o(u,{color:i,href:"https://www.github.com/thekingofcity",isExternal:!0,children:["thekingofcity ",e(m,{as:c})]}),", based on the design standards or rules of the companies listed above. You may use them for any purposes, but it is recommended to state the name and the link of software alongside.",e("br",{}),"圖像之元素，包括圖形及線條，均由",o(u,{color:i,href:"https://www.github.com/wongchito",isExternal:!0,children:["Chito Wong ",e(m,{as:c})]}),"及",o(u,{color:i,href:"https://www.github.com/thekingofcity",isExternal:!0,children:["thekingofcity ",e(m,{as:c})]}),"基於上述公司之設計標準或準則繪製。你可將其用於任何目的，但我們建議你於使用同時附以我們之名字以及該軟件之連結。"]}),o(y,{children:["Due to copyright, licensing and other legal restrictions, Rail Map Generator uses"," ",o(u,{color:i,href:"https://github.com/ButTaiwan/genyo-font",isExternal:!0,children:["GenYoMin provided by ButTaiwan ",e(m,{as:c})]}),", and Vegur instead of MTRSung and Myriad Pro respectively to display and generate MTR-style signage. You shall grant appropriate permit or license from the manufacturers before using those generated images for commercial purposes.",e("br",{}),"由於著作權及其他法律限制，鐵路路線圖產生器使用",o(u,{color:i,href:"https://github.com/ButTaiwan/genyo-font",isExternal:!0,children:["由ButTaiwan提供之源樣明體 ",e(m,{as:c})]}),"，以及Vegur，以代替港鐵樣式標誌牌所使用之地鐵宋及Myriad Pro。在產生之圖像用作商業用途前，你應向字型生產廠商取得適當之許可證或授權。"]}),o(y,{children:["The exported images in PNG or SVG format may be modified, published, or used for other purposes, under the conditions above.",e("br",{}),"輸出之PNG或SVG種類之圖像可基於上述條款，用於修改、發行或其他用途。"]}),o(y,{children:["All flag emojis shown on Windows platforms are designed by"," ",o(u,{color:i,href:"https://openmoji.org/",isExternal:!0,children:["OpenMoji ",e(m,{as:c})]})," ","– the open-source emoji and icon project. License:",o(u,{color:i,href:"https://creativecommons.org/licenses/by-sa/4.0/",isExternal:!0,children:["CC BY-SA 4.0 ",e(m,{as:c})]}),e("br",{}),"於Windows作業系統上顯示之旗幟Emoji為",o(u,{color:i,href:"https://openmoji.org/",isExternal:!0,children:["OpenMoji ",e(m,{as:c})]}),"所設計。許可證：",o(u,{color:i,href:"https://creativecommons.org/licenses/by-sa/4.0/",isExternal:!0,children:["CC BY-SA 4.0 ",e(m,{as:c})]})]}),o(y,{children:["We reserve the rights, without prior notice, to modify, add, or remove these terms. The Chinese translation is for reference only. In case of any discrepancy between the English version and the Chinese version, the English version shall prevail.",e("br",{}),"我們保留修改、新增或移除上述條款之權利，而無需另行通知。中文譯本僅供參考，文義如與英文有歧異，概以英文本為準。"]})]})}),e(B,{children:e(C,{colorScheme:"teal",onClick:()=>window.open("https://github.com/railmapgen/rmg","_blank"),children:n("Visit GitHub")})})]})]})}const tt=["52PD","linchen1965"],nt=["jealousyge","Jay20081229","clearng-kly","Dingdong2334","C1P918R","AnDanJuneUnderline","GrassRabbit1410","xiany114514","Andy1782010","Thomastzc","Tianxiu11111"];function ot(t){const{isOpen:r,onClose:s}=t,{t:n}=f();return o(T,{isOpen:r,onClose:s,size:"xl",scrollBehavior:"inside",children:[e(E,{}),o(O,{children:[e(I,{children:n("Contributors")}),e(j,{}),o(R,{children:[e(A,{as:"h6",size:"xs",my:1,children:n("Core contributors")}),o(Q,{children:[o(P,{size:"lg",minW:"80%",onClick:()=>window.open("https://github.com/wongchito","_blank"),cursor:"pointer",children:[e(G,{src:"https://github.com/wongchito.png",size:"lg",my:2,ml:-1,mr:2}),o(k,{display:"block",children:[e(v,{fontSize:"lg",fontWeight:"bold",mb:1,children:"Chito Wong"}),e(v,{fontSize:"sm",children:"Project initiator"}),e(v,{fontSize:"sm",children:"Author of MTR and Guangzhou Metro styles"})]})]}),o(P,{size:"lg",minW:"80%",onClick:()=>window.open("https://github.com/thekingofcity","_blank"),cursor:"pointer",children:[e(G,{src:"https://github.com/thekingofcity.png",size:"lg",my:2,ml:-1,mr:2}),o(k,{display:"block",children:[e(v,{fontSize:"lg",fontWeight:"bold",mb:1,children:"thekingofcity"}),e(v,{fontSize:"sm",children:"Author of Shanghai Metro style"}),e(v,{fontSize:"sm",children:"Desktop version (Electron) maintainer"})]})]})]}),e(A,{as:"h6",size:"xs",my:1,children:n("Resource contributors")}),o(w,{wrap:"wrap",children:[tt.map(i=>o(P,{size:"lg",mb:1,mr:1,flex:"100%",onClick:()=>window.open(`https://github.com/railmapgen/rmg/issues?q=is:issue+author:${i}`,"_blank"),cursor:"pointer",children:[e(G,{src:`https://github.com/${i}.png`,size:"xs",ml:-1,mr:2}),e(k,{children:i}),e(k,{flexGrow:1}),e(k,{children:e(v,{fontSize:"sm",children:n("Resource Administrator")})})]},i)),nt.map(i=>o(P,{size:"lg",mb:1,mr:1,onClick:()=>window.open(`https://github.com/railmapgen/rmg/issues?q=is:issue+author:${i}`,"_blank"),cursor:"pointer",children:[e(G,{src:`https://github.com/${i}.png`,size:"xs",ml:-1,mr:2}),e(k,{children:i})]},i))]})]}),e(B,{children:e(C,{colorScheme:"primary",onClick:()=>window.open("https://github.com/railmapgen/rmg/wiki/How-to-add-color-palette-and-line-templates","_blank"),children:n("Contribution Wiki")})})]})]})}function it(t){const{isOpen:r,onClose:s}=t,{t:n}=f(),[i,l]=g.useState(h.isAllowAnalytics()),[a,d]=g.useState();g.useEffect(()=>{r||d(void 0)},[r]);const p=[{type:"switch",label:n("Allow cookies to help improve our website"),isChecked:i,onChange:l,oneLine:!0}],H=()=>{h.allowAnalytics(i).refreshRequired?d("Refreshing is required for changes to take effect."):s()};return o(T,{isOpen:r,onClose:s,children:[e(E,{}),o(O,{children:[a&&o(ve,{status:"info",variant:"solid",size:"xs",children:[e(we,{}),n(a)]}),o(N,{position:"relative",children:[e(I,{children:n("Privacy settings")}),e(j,{})]}),e(R,{children:e(J,{fields:p})}),e(B,{children:e(C,{colorScheme:"primary",isDisabled:!!a,onClick:H,children:n("Save")})})]})]})}function rt(){const{t}=f(),r=X("primary.500","primary.300"),[s,n]=g.useState(!1),[i,l]=g.useState(!1),[a,d]=g.useState(!1),p=h.getInstance(),H=p===V.GITHUB?V.GITLAB:V.GITHUB,L=Y[p],ne=()=>{const U=Ie(H,h.getEnv());window.open(U,"_blank"),h.event(_.SWITCH_MIRROR,{mirrorUrl:U})};return o(w,{direction:"column",children:[o(v,{fontSize:"sm",textAlign:"center",width:"100%",children:[o(be,{i18nKey:"NavMenuFooter.currentMirror",mirror:L,children:["You're on ",{mirror:L}," mirror"]}),e("br",{}),t("Switch to")+" ",o(u,{color:r,onClick:ne,children:[Y[H]," ",e(m,{as:c})]})]}),e(ye,{}),o(D,{justifyContent:"center",children:[e(S,{variant:"ghost",size:"sm","aria-label":t("Contributor"),title:t("Contributor"),icon:e($e,{}),onClick:()=>n(!0)}),e(S,{variant:"ghost",size:"sm","aria-label":t("Terms and conditions"),title:t("Terms and conditions"),icon:e(Le,{}),onClick:()=>l(!0)}),e(S,{variant:"ghost",size:"sm","aria-label":t("Privacy settings"),title:t("Privacy settings"),icon:e(De,{}),onClick:()=>d(!0)})]}),e(ot,{isOpen:s,onClose:()=>n(!1)}),e(et,{isOpen:i,onClose:()=>l(!1)}),e(it,{isOpen:a,onClose:()=>d(!1)})]})}const st={flexShrink:0,flexDirection:"column",overflow:"hidden",alignItems:"flex-end",transition:"0.3s ease-in-out",maxW:0,visibility:"hidden",boxShadow:"lg",zIndex:100,".show-menu &":{maxW:{base:"100%",sm:320},w:{base:"100%",sm:"unset"},visibility:"initial"},"& > div":{flexDirection:"column",h:"100%",w:{base:"100vw",sm:320},"& > div:nth-of-type(1)":{flex:0,flexDirection:"row",alignItems:"center",minHeight:10,pl:12},"& > div:nth-of-type(2)":{flexDirection:"column",flex:1,overflowY:"auto"}}};function at(){const{t}=f();return e(w,{as:"section",sx:st,children:o(w,{children:[o(w,{children:[e(A,{as:"h4",size:"md",children:t("Rail Map Toolkit")}),e(Me,{environment:h.getEnv(),version:h.getAppVersion()})]}),o(w,{children:[e(Xe,{}),e(Ze,{})]}),e(rt,{})]})})}function lt(t){const{isOpen:r,onClose:s}=t,{t:n}=f(),i=g.useRef(null),l=()=>{h.allowAnalytics(!0),s()},a=()=>{h.allowAnalytics(!1).refreshRequired?window.location.reload():s()};return o(T,{initialFocusRef:i,isOpen:r,onClose:()=>{},children:[e(E,{}),o(O,{children:[e(I,{children:n("CookiesModal.header")}),o(R,{children:[e(v,{children:n("CookiesModal.text1")}),e(v,{mt:2,children:n("CookiesModal.text2")}),e(Ce,{children:o(y,{children:[" ",n("CookiesModal.item1")]})}),e(v,{mt:2,children:n("CookiesModal.text3")})]}),e(B,{children:o(D,{children:[e(C,{variant:"ghost",onClick:a,children:n("CookiesModal.reject")}),e(C,{ref:i,colorScheme:"primary",onClick:l,children:n("CookiesModal.accept")})]})})]})]})}function dt(){const{t}=f(),r=W(),s=K(a=>a.app.isShowMenu),[n,i]=g.useState(!1);g.useEffect(()=>{h.isAnalyticsQADone()||i(!0)},[]);const l=()=>{r(Z()),h.event(_.TOGGLE_NAV_MENU,{})};return o(xe,{className:s?"show-menu":"",children:[e(S,{variant:"ghost",size:"md","aria-label":t("Toggle menu"),title:t("Toggle menu"),icon:e(We,{}),position:"absolute",zIndex:110,onClick:l}),o(ke,{sx:{flexDirection:"row"},children:[e(at,{}),e(Ge,{})]}),e(lt,{isOpen:n,onClose:()=>i(!1)})]})}export{dt as default};
