import{j as e,S as _,G as N,I as pe,T as R,e as C,n as Ee,o as B,C as H,F as K,p as ss,B as w,q as ts,P as ce,s as Pe,t as ns,u as Ne,v as he,w as as,A as De,x as U,y as os,z as is,D as ls,E as Y,b as I,c as E,d as te,g as ee,H as ze,J as Se,K as be,l as xe,O as z,Q as Z,U as ge,V as rs,W as me,X as Ue,Y as cs,Z as ne,_ as ds,$ as us,a0 as ps,r as f,a1 as hs,a2 as xs,a3 as gs,N as ms,a4 as js,a5 as fs,a6 as ke,a7 as ws,a8 as Ve,a9 as Ss,aa as bs,ab as vs,ac as Cs,ad as ys,ae as ks,k as Ms,af as As,M as Rs,ag as Ls,ah as _s,ai as Os,aj as Ts,i as Is,ak as Es,m as Ps}from"./mantine-B5EjhH7N.js";import{k as S,r as j,o as Be,R as V,B as Ns}from"./react-UC3gAxe5.js";import{u as L,o as je,F as Ds,a as M,b as zs,S as J,l as P,s as Fe,f as Q,g as fe,c as We,n as $e,d as Ge,e as Us,A as ae,h as O,i as q,j as Vs,k as D,m as ve,p as Bs,q as Fs,E as T,r as Ws,t as ie,v as $s,w as Gs,x as Hs,y as He,z as Js,B as qs,C as Ks,D as Ys,G as Qs,H as Xs,I as Zs}from"./main-B31JGIYP.js";import{a as se,b as Je,S as et,O as st,L as de}from"./asset-enablements-DzI5TNlO.js";import"./index-C_hgTfa4.js";const tt="_burger_1y0se_1",nt={burger:tt},at="_workspace_anux8_1",ot="_show_anux8_11",it="_welcome_anux8_20",lt="_icons_anux8_35",oe={workspace:at,"app-container":"_app-container_anux8_7",show:ot,welcome:it,icons:lt},rt="/assets/rmp-logo512-eHekupnf.png";function ct(){const{t:s}=S(),t=L();return e.jsxs(_,{className:oe.welcome,children:[e.jsxs(N,{className:oe.icons,grow:!0,children:[e.jsx(pe,{src:"/logo512.png",title:s("Open")+" "+s("Rail Map Generator"),onClick:()=>t(je({appId:"rmg"}))}),e.jsx(pe,{src:rt,title:s("Open")+" "+s("Rail Map Painter"),onClick:()=>t(je({appId:"rmp"}))})]}),e.jsx(R,{children:s("Welcome to Rail Map Toolkit")}),e.jsx(C,{children:s("Select an app to start your own rail map design!")})]})}function dt(s){const{tab:t,isActive:a}=s,n=j.useMemo(()=>t.url??"/"+t.app+"/",[t.app]);return e.jsx("div",{className:Ee(oe["app-container"],a&&oe.show),children:e.jsx("iframe",{id:Ds+t.id,src:n,loading:"lazy",title:t.app,width:"100%",height:"100%","data-persisted-url":t.url,"data-testid":"app-container-iframe"})})}function ut({alwaysShowWelcome:s}){const{openedTabs:t,activeTab:a}=M(o=>o.app),[,n]=Be();return j.useEffect(()=>{var o;if(a){const l=(o=t.find(r=>r.id===a))==null?void 0:o.app;n(l?{app:l}:{})}else n({})},[a]),e.jsx("div",{className:oe.workspace,children:s||t.length===0?e.jsx(ct,{}):t.map(o=>e.jsx(dt,{tab:o,isActive:a===o.id},o.id))})}const pt="_root_mj6g1_5",ht="_wrapper_mj6g1_31",xt="_alert_mj6g1_42",gt="_header_mj6g1_49",mt="_body_mj6g1_55",jt="_aside_mj6g1_62",ft="_main_mj6g1_75",$={root:pt,"show-menu":"_show-menu_mj6g1_15",wrapper:ht,alert:xt,header:gt,body:mt,aside:jt,main:ft},wt="_card_15zs0_1",Me={card:wt},Ae=(s,t,a)=>{const n=new Blob([a],{type:t});St(s,n)},St=(s,t)=>{const a=window.URL.createObjectURL(t),n=document.createElement("a");n.href=a,n.download=s,document.body.appendChild(n),n.click(),document.body.removeChild(n),window.URL.revokeObjectURL(a)},bt=()=>{const{t:s}=S(),{token:t,refreshToken:a,currentSaveId:n}=M(k=>k.account),{resolveConflictModal:{isOpen:o,lastChangedAtTimeStamp:l,lastUpdatedAtTimeStamp:r,cloudData:d}}=M(k=>k.rmpSave),c=L(),[p,u]=V.useState(!1),h=()=>c(Us()),i=()=>{We(J.RMP,d),$e(),c(Ge(r)),h()},b=()=>{Ae(`RMP_${r}.json`,"application/json",d)},y=async()=>{if(!n||!t||!a)return;u(!0);const k=await zs(n,t,a,J.RMP);if(!k){c(P()),u(!1);return}if(k.status===409){c(Fe()),u(!1);return}k.status===200&&(c(Q()),u(!1),h())},v=async()=>{const{data:k}=await fe(J.RMP);Ae(`RMP_${l}.json`,"application/json",k)};return e.jsxs(B,{opened:o,onClose:()=>{},size:"lg",title:s("Oops! It seems there's a conflict"),withCloseButton:!1,closeOnClickOutside:!1,closeOnEscape:!1,centered:!0,children:[e.jsx(C,{children:s("The local save is newer than the cloud one. Which one would you like to keep?")}),e.jsxs(N,{my:"xs",children:[e.jsx(H,{withBorder:!0,className:Me.card,children:e.jsxs(_,{children:[e.jsxs(K,{children:[e.jsx(ss,{}),e.jsx(C,{span:!0,children:s("Local save")})]}),e.jsxs(C,{span:!0,children:[s("Update at:")," ",new Date(l).toLocaleString()]}),e.jsx(w,{color:"red",loading:p,onClick:()=>y(),children:s("Replace cloud with local")}),e.jsx(w,{onClick:()=>v(),children:s("Download Local save")})]})}),e.jsx(H,{withBorder:!0,className:Me.card,children:e.jsxs(_,{children:[e.jsxs(K,{children:[e.jsx(ts,{}),e.jsx(C,{span:!0,children:s("Cloud save")})]}),e.jsxs(C,{span:!0,children:[s("Update at:")," ",new Date(r).toLocaleString()]}),e.jsx(w,{color:"red",onClick:()=>i(),children:s("Replace local with cloud")}),e.jsx(w,{onClick:()=>b(),children:s("Download Cloud save")})]})})]})]})},vt="_body_yczk0_1",Ct={body:vt};function Re({meets:s,label:t}){return e.jsxs(C,{c:s?"teal":"red",style:{display:"flex",alignItems:"center"},mt:7,size:"sm",children:[s?e.jsx(Ne,{size:14}):e.jsx(he,{size:14}),e.jsx(as,{ml:10,children:t})]})}const we=[{re:/[0-9]/,label:"Includes number"},{re:/[a-zA-Z]/,label:"Includes letter"}];function yt(s){let t=s.length>=8?0:1;return we.forEach(a=>{a.re.test(s)||(t+=1)}),Math.max(100-100/(we.length+1)*t,10)}function Ce({value:s,onChange:t}){const{t:a}=S(),[n,o]=j.useState(!1),l=we.map((c,p)=>e.jsx(Re,{label:c.label,meets:c.re.test(s)},p)),r=yt(s),d=r===100?"teal":r>50?"yellow":"red";return e.jsxs(ce,{opened:n,position:"bottom",width:"target",transitionProps:{transition:"pop"},children:[e.jsx(ce.Target,{children:e.jsx("div",{onFocusCapture:()=>o(!0),onBlurCapture:()=>o(!1),children:e.jsx(Pe,{label:a("Password"),value:s,onChange:c=>t(c.currentTarget.value)})})}),e.jsxs(ce.Dropdown,{children:[e.jsx(ns,{color:d,value:r,size:5,mb:"xs"}),e.jsx(Re,{label:a("Includes at least 8 characters"),meets:s.length>=8}),l]})]})}const kt=()=>{const{t:s}=S(),t=L(),{isLoggedIn:a,email:n,name:o,refreshToken:l}=M(p=>p.account),[r,d]=V.useState(void 0),c=async()=>{a&&(await fetch(ae+O.AUTH_LOGOUT,{method:"POST",headers:{accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({refreshToken:l})}),t(P()))};return e.jsxs(e.Fragment,{children:[e.jsxs(K,{py:"xs",align:"center",wrap:"wrap",children:[e.jsx(De,{size:"lg",name:o,color:"initials"}),e.jsxs(K,{direction:"column",ml:"xs",flex:1,children:[e.jsx(C,{span:!0,fw:"bold",children:o}),e.jsx(C,{span:!0,size:"sm",children:n})]}),e.jsxs(K,{ml:"auto",children:[e.jsx(U,{variant:"subtle",color:"gray",size:"sm",onClick:()=>d("name"),"aria-label":s("Change name"),title:s("Change name"),children:e.jsx(os,{})}),e.jsx(U,{variant:"subtle",color:"gray",size:"sm",onClick:()=>d("password"),"aria-label":s("Change password"),title:s("Change password"),children:e.jsx(is,{})}),e.jsx(U,{variant:"subtle",color:"gray",size:"sm",onClick:c,"aria-label":s("Log out"),title:s("Log out"),children:e.jsx(ls,{})})]})]}),e.jsx(Mt,{infoType:r,onClose:()=>d(void 0)})]})};function Mt(s){const{infoType:t,onClose:a}=s,{t:n}=S(),o=L(),{isLoggedIn:l,id:r,token:d}=M(i=>i.account),[c,p]=V.useState(""),u=i=>o(D({title:n("Unable to update account info"),message:i,type:"error",duration:9e3})),h=async()=>{if(!(!l||!t))try{const i=await q(O.USER+"/"+r,{method:"PATCH",body:JSON.stringify({[t]:c})},d);if(!i){u(n("Login status expired")),o(P());return}if(i.status!==200){u(await i.text());return}if(t==="password"){o(P()),a();return}if(t==="name"){o(Vs(c)),a();return}}catch(i){u(i.message)}};return e.jsxs(B,{opened:!!t,onClose:a,title:n("Update account info"),closeOnEscape:!1,children:[t==="name"&&e.jsx(Y,{label:n("Name"),value:c,onChange:({currentTarget:{value:i}})=>p(i)}),t==="password"&&e.jsx(Ce,{value:c,onChange:i=>p(i)}),e.jsx(N,{mt:"xs",children:e.jsx(w,{ml:"auto",onClick:h,children:n("Change")})})]})}const At=/^\S+@\S+\.\S+$/,le=s=>!!s.match(At),qe=s=>s.length>=8&&!!s.match(/\d/)&&!!s.match(/[a-zA-Z]/),Le=60;function Ke({value:s,onChange:t,onVerify:a,otpSent:n,allowResendOtp:o,...l}){const{t:r}=S(),[d,c]=j.useState(!1),[p,u]=j.useState(Le),h=!!s&&le(s),i=()=>{o&&(c(!0),u(Le)),a()};return j.useEffect(()=>{let b;return d&&p>0?b=window.setTimeout(()=>{u(p-1)},1e3):p===0&&c(!1),()=>clearTimeout(b)},[d,p]),e.jsx(Y,{type:"email",label:r("Email"),value:s,onChange:({currentTarget:{value:b}})=>t(b),error:s&&!le(s),rightSection:n?e.jsx(w,{variant:"transparent",size:"xs",leftSection:e.jsx(Ne,{}),disabled:!0,children:r("Verification code sent")}):e.jsx(w,{variant:"subtle",size:"xs",onClick:i,disabled:!h||d,children:d?`${p}s`:r("Send verification code")}),rightSectionWidth:"fit-content",...l})}const Rt=s=>{const{t}=S(),a=L(),[n,o]=j.useState(""),[l,r]=j.useState(""),[d,c]=j.useState(""),[p,u]=j.useState(""),[h,i]=j.useState(!1),y=!!n&&le(n)&&!!d&&!!l&&qe(l),v=A=>a(D({title:t("Unable to reset your password"),message:A,type:"error",duration:9e3})),k=async()=>{try{const A=await fetch(ae+O.AUTH_SEND_RESET_PASSWORD_EMAIL,{method:"POST",headers:{accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({email:n})});A.status===204?u(n):A.status>400&&u("error")}catch{u("error")}},x=async()=>{i(!0);const A=new URLSearchParams({token:d}),g=`${ae}${O.AUTH_RESET_PASSWORD}?${A.toString()}`;try{const m=await fetch(g,{method:"POST",headers:{accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({password:l})});if(m.status!==204){v(await m.text());return}const{error:F,username:W}=(await a(ve({email:n,password:l}))).payload;F?v(F):a(D({title:t("Welcome ")+W,message:t("Your password has been reset successfully."),type:"success",duration:5e3}))}catch(m){v(m.message)}finally{i(!1)}};return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:3,size:"h5",children:t("Forgot password")})}),e.jsxs(te,{direction:"column",gap:"xs",children:[p==="error"&&e.jsx(ee,{color:"red",icon:e.jsx(ze,{}),title:t("Check your email again!")}),p&&p!=="error"&&e.jsx(ee,{color:"blue",icon:e.jsx(Se,{}),title:t("Email with reset link is sent to")+" "+p}),e.jsx(Ke,{value:n,onChange:o,onVerify:k,otpSent:p}),e.jsx(Y,{label:t("Reset password token"),value:d,onChange:({currentTarget:{value:A}})=>c(A)}),e.jsx(Ce,{value:l,onChange:r}),e.jsx(w,{onClick:x,loading:h,disabled:!y||h,children:t("Reset password")}),e.jsx(w,{variant:"default",onClick:()=>s.setLoginState("login"),disabled:h,children:t("Back to log in")})]})]})},Lt=/^\S+@\S+\.\S+$/,_e=s=>!!s.match(Lt),_t=s=>{const{t}=S(),a=L(),[n,o]=j.useState(""),[l,r]=j.useState(""),[d,c]=j.useState(!1),p=!!n&&_e(n)&&!!l,u=async()=>{c(!0);try{const{error:h,username:i}=(await a(ve({email:n,password:l}))).payload;a(h?D({title:t("Unable to login"),message:h,type:"error",duration:9e3}):D({title:t("Welcome ")+i,message:t("Login success"),type:"success",duration:5e3}))}finally{c(!1)}};return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:3,size:"h5",children:t("Log in")})}),e.jsxs(te,{direction:"column",gap:"xs",children:[e.jsx(Y,{type:"email",label:t("Email"),value:n,onChange:({currentTarget:{value:h}})=>o(h),error:n&&!_e(n)}),e.jsx(Pe,{label:t("Password"),value:l,onChange:({currentTarget:{value:h}})=>r(h)}),e.jsx(be,{component:"button",ml:"auto",onClick:()=>s.setLoginState("forgot-password"),children:t("Forgot password")+"?"}),e.jsx(w,{onClick:u,loading:d,disabled:!p||d,children:t("Log in")}),e.jsx(w,{variant:"default",onClick:()=>s.setLoginState("register"),disabled:d,children:t("Create an account")})]})]})},Ot=s=>{const{t}=S(),a=L(),[n,o]=j.useState(""),[l,r]=j.useState(""),[d,c]=j.useState(""),[p,u]=j.useState(""),[h,i]=j.useState(""),[b,y]=j.useState(!1),v=!!l&&le(l),k=!!n&&v&&!!p&&!!d&&qe(d),x=m=>a(D({title:t("Unable to create your account"),message:m,type:"error",duration:9e3})),A=async()=>{try{const m=await fetch(ae+O.AUTH_SEND_VERIFICATION_EMAIL,{method:"POST",headers:{accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({email:l})});m.status===204?i(l):m.status>400&&i("error")}catch{i("error")}},g=async()=>{y(!0);try{const m=await fetch(ae+O.AUTH_REGISTER,{method:"POST",headers:{accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({name:n,email:l,password:d,emailVerificationToken:Number(p)})});if(m.status!==201){x(await m.text());return}const{error:F,username:W}=(await a(ve({email:l,password:d}))).payload;F?x(F):a(D({title:t("Welcome ")+W,message:t("Your account is created successfully."),type:"success",duration:5e3}))}catch(m){x(m.message)}finally{y(!1)}};return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:3,size:"h5",children:t("Create an account")})}),e.jsxs(te,{direction:"column",gap:"xs",children:[h==="error"&&e.jsx(ee,{color:"red",icon:e.jsx(ze,{}),title:t("The email is not valid!")}),h&&h!=="error"&&e.jsx(ee,{color:"blue",icon:e.jsx(Se,{}),title:t("Verification email is sent to")+" "+h}),e.jsx(Y,{label:t("Name"),description:t("You may always change it later."),value:n,onChange:({currentTarget:{value:m}})=>o(m)}),e.jsx(Ke,{description:t("We'll never share your email."),value:l,onChange:r,onVerify:A,otpSent:h,allowResendOtp:!0}),e.jsx(Y,{label:t("Verification code"),value:p,onChange:({currentTarget:{value:m}})=>u(m)}),e.jsx(Ce,{value:d,onChange:c}),e.jsx(w,{onClick:g,loading:b,disabled:!k||b,children:t("Sign up")}),e.jsx(w,{variant:"default",onClick:()=>s.setLoginState("login"),disabled:b,children:t("Back to log in")})]})]})},Tt=1,It=10,Et=()=>{const{t:s}=S(),t=L(),{isLoggedIn:a,token:n,activeSubscriptions:o,currentSaveId:l,saves:r}=M(g=>g.account),{lastChangedAtTimeStamp:d}=M(g=>g.rmpSave),c=a&&r&&(o.RMP_CLOUD?r.length<It:r.length<Tt),p=Math.min(...(r??[]).map(g=>g.id)),u=g=>!o.RMP_CLOUD&&g!==p,[h,i]=V.useState(void 0),[b,y]=V.useState(void 0),v=g=>t(D({title:s("Unable to sync your save"),message:g,type:"error",duration:9e3})),k=async()=>{const g=await fe(J.RMP);if(!a||!g||!n){v(s("Failed to get the RMP save!"));return}const{data:m,hash:F}=g,W=crypto.randomUUID();try{const G=await q(O.SAVES,{method:"POST",body:JSON.stringify({index:W,data:m,hash:F})},n);if(!G){v(s("Login status expired")),t(P());return}if(G.status!==200){v(await G.text());return}t(Q())}catch(G){v(G.message)}},x=async g=>{if(!(!a||!n)){if(g===l){if(i(l),!l||u(l)){v(s("Can not sync this save!")),i(void 0);return}const m=await t(Q());if(m.meta.requestStatus!=="fulfilled"){v(s("Login status expired")),i(void 0);return}const W=m.payload.saves.filter(es=>es.id===l).at(0);if(!W){v(s("Current save id is not in saveList!")),i(void 0);return}const G=new Date(W.lastUpdateAt);if(new Date(d)<G){xe.warn(`Save id: ${l} is newer in the cloud via local compare.`),t(Fe()),i(void 0);return}const ye=await fe(J.RMP);if(!ye){v(s("Failed to get the RMP save!")),i(void 0);return}const{data:Xe,hash:Ze}=ye,re=await q(O.SAVES+"/"+l,{method:"PATCH",body:JSON.stringify({data:Xe,hash:Ze})},n);if(!re){v(s("Login status expired")),i(void 0),t(P());return}if(re.status!==200){v(await re.text()),i(void 0);return}i(void 0)}else{i(g);const m=await q(O.SAVES+"/"+g,{},n);if(!m){v(s("Login status expired")),i(void 0),t(P());return}if(m.status!==200){v(await m.text()),i(void 0);return}xe.info(`Set ${J.RMP} with save id: ${g}`),We(J.RMP,await m.text()),t(Ge(new Date().valueOf())),$e(),i(void 0)}t(Q())}},A=async g=>{if(!a||!g||!n)return;y(g);const m=await q(O.SAVES+"/"+l,{method:"DELETE"},n);if(!m){v(s("Login status expired")),y(void 0),t(P());return}if(m.status!==200){v(await m.text()),y(void 0);return}t(Q()),y(void 0)};return e.jsxs(I,{children:[e.jsxs(E,{align:"center",children:[e.jsx(R,{order:3,size:"h5",children:s("Synced saves")}),e.jsxs(C,{ml:"auto",size:"sm",children:[s("Maximum save count:")," ",o.RMP_CLOUD?10:1]}),e.jsx(w,{variant:"subtle",size:"xs",ml:"xs",disabled:!c,onClick:k,children:s("Create")})]}),e.jsx(te,{direction:"column",gap:"xs",children:r==null?void 0:r.map(g=>e.jsxs(H,{withBorder:!0,shadow:"sm",style:{flexDirection:"row"},children:[e.jsxs(_,{gap:"xs",flex:1,children:[e.jsx(C,{fw:500,children:g.id===l?s("Current save"):s("Cloud save")}),e.jsxs(C,{children:[s("Last update at:")," ",new Date(g.lastUpdateAt).toLocaleString()]})]}),e.jsxs(_,{gap:"xs",ml:"xs",children:[e.jsx(w,{variant:"filled",color:"red",loading:b===g.id,onClick:()=>A(g.id),children:s("Delete this save")}),e.jsx(w,{variant:"filled",disabled:u(g.id),loading:h===g.id,onClick:()=>x(g.id),children:g.id===l?s("Sync now"):s("Sync this slot")})]})]},g.id))})]})},Pt=s=>{const{t}=S(),{opened:a,onClose:n,getSubscriptions:o}=s,{isLoggedIn:l,token:r}=M(i=>i.account),d=L(),[c,p]=V.useState(""),u=i=>d(D({title:t("Unable to redeem"),message:i,type:"error",duration:9e3})),h=async i=>{if(!l)return;const b=await q(O.SUBSCRIPTION_REDEEM,{method:"POST",body:JSON.stringify({cdkey:i.trim()})},r);if(!b){u(t("Login status expired")),d(P());return}if(b.status!==202){const y=(await b.json()).message;u(t(y));return}await o(),n()};return e.jsxs(B,{opened:a,onClose:n,title:t("Redeem your subscription"),children:[e.jsx(C,{children:t("CDKey could be purchased in the following sites:")}),e.jsx(z,{withPadding:!0,mt:"xs",children:e.jsx(z.Item,{children:e.jsxs(be,{href:"https://afdian.com/item/9c8b220c614311efab2d52540025c377",target:"_blank",children:["爱发电 ",e.jsx(Z,{})]})})}),e.jsxs(N,{align:"flex-end",gap:"sm",mt:"xs",children:[e.jsx(Y,{label:"CDKey",placeholder:t("Enter your CDKey here"),value:c,onChange:({currentTarget:{value:i}})=>p(i),style:{minWidth:240}}),e.jsx(w,{onClick:()=>h(c),children:t("Redeem")})]})]})},Nt=()=>{const{t:s}=S(),{isLoggedIn:t,token:a}=M(u=>u.account),n=L(),[o,l]=V.useState([]),[r,d]=V.useState(!1),c=u=>n(D({title:s("Unable to retrieve your subscriptions"),message:u,type:"error",duration:9e3})),p=async()=>{if(!t)return;const u=await q(O.SUBSCRIPTION,{},a);if(!u){c(s("Login status expired")),n(P());return}if(u.status!==200){c(await u.text());return}const h=(await u.json()).subscriptions;if(!h.map(b=>b.type).includes("RMP_CLOUD"))return;l([{type:"RMP",expires:h[0].expires}]);const i=structuredClone(Bs);for(const b of h){const y=b.type;y in i&&(i[y]=!0)}n(Fs(i))};return V.useEffect(()=>{p()},[]),e.jsxs(I,{children:[e.jsxs(E,{align:"center",children:[e.jsx(R,{order:3,size:"h5",children:s("All subscriptions")}),e.jsx(w,{variant:"subtle",size:"xs",ml:"auto",onClick:()=>d(!0),children:s("Redeem")})]}),e.jsxs(te,{direction:"column",gap:"xs",children:[o.length===0&&e.jsxs(H,{withBorder:!0,shadow:"sm",children:[e.jsx(H.Section,{p:"xs",children:e.jsx(R,{order:4,size:"h3",children:s("Rail Map Painter")})}),e.jsxs(_,{gap:"xs",children:[e.jsx(C,{children:s("With this subscription, the following features are unlocked:")}),e.jsxs(z,{withPadding:!0,children:[e.jsx(z.Item,{children:s("PRO features")}),e.jsx(z.Item,{children:s("Sync 9 more saves")}),e.jsx(z.Item,{children:s("Unlimited master nodes")}),e.jsx(z.Item,{children:s("Unlimited parallel lines")})]}),e.jsxs(C,{children:[s("Expires at:")," ",s("Not applicable")]})]})]}),o.map(u=>e.jsxs(H,{withBorder:!0,shadow:"sm",children:[e.jsx(H.Section,{p:"xs",children:e.jsx(R,{order:4,size:"h3",children:s(u.type==="RMP"?"Rail Map Painter":u.type)})}),e.jsxs(_,{gap:"xs",children:[e.jsxs(C,{children:[s("Expires at:")," ",new Date(u.expires).toLocaleString()]}),e.jsx(w,{color:"blue",onClick:()=>d(!0),children:s("Renew")})]})]},u.type))]}),e.jsx(Pt,{opened:r,onClose:()=>d(!1),getSubscriptions:p})]})},Dt=()=>{const{t:s}=S(),{isLoggedIn:t}=M(o=>o.account),[a,n]=j.useState("login");return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:s("Account")})}),t?e.jsxs(te,{className:Ct.body,children:[e.jsx(kt,{}),e.jsx(ge,{}),e.jsx(Nt,{}),e.jsx(Et,{})]}):a==="login"?e.jsx(_t,{setLoginState:n}):a==="register"?e.jsx(Ot,{setLoginState:n}):e.jsx(Rt,{setLoginState:n})]})},zt="_button_1hzui_1",Ut="_label_1hzui_11",X={button:zt,label:Ut,"sub-label":"_sub-label_1hzui_17"};function Ye(){return rs("(min-width: 36em)")}function Vt(s){var k;const{appId:t,onAboutOpen:a}=s,{t:n}=S(),o=L(),l=Ye(),{activeTab:r,openedTabs:d}=M(x=>x.app),c=se[t],p=c.name.split(" - ").map(x=>n(x)).join(" - "),u=d.some(x=>x.app===t),h=!c.allowMultiInstances&&((k=d.find(x=>x.id===r))==null?void 0:k.app)===t,i=x=>{u||f.event(T.OPEN_APP,{appId:t,isOpenInNew:x}),o(x?Ws(t):je({appId:t})),l||(o(ie()),f.toggleNavMenu(!1))},b=x=>{o($s(x)),l||(o(ie()),f.toggleNavMenu(!1))},y=x=>{o(Gs(x)),f.event(T.CLOSE_APP,{app:t})},v=x=>{o(Hs(x)),f.event(T.CLOSE_APP,{app:x})};return e.jsx(me,{component:"div",role:"button",variant:"filled",label:p,active:h,classNames:{root:X.button,label:X.label},leftSection:u?e.jsx(ps,{title:n("Running")}):void 0,rightSection:e.jsxs(e.Fragment,{children:[c.allowMultiInstances&&e.jsx(U,{"aria-label":n("New tab"),title:n("New tab"),variant:"subtle",color:h?"white":"gray",mr:4,onClick:x=>{x.stopPropagation(),i(!0)},children:e.jsx(cs,{})}),e.jsxs(ne,{children:[e.jsx(ne.Target,{children:e.jsx(U,{variant:"subtle",color:h?"white":"gray",onClick:x=>x.stopPropagation(),children:e.jsx(ds,{})})}),e.jsxs(ne.Dropdown,{children:[u&&e.jsx(ne.Item,{leftSection:e.jsx(he,{}),onClick:x=>{x.stopPropagation(),v(t)},children:c.allowMultiInstances?n("Close all tabs"):n("Close app")}),e.jsx(ne.Item,{leftSection:e.jsx(us,{}),onClick:x=>{x.stopPropagation(),a()},children:n("About")})]})]})]}),disableRightSectionRotation:!0,opened:!0,onClick:()=>i(!1),children:c.allowMultiInstances&&d.filter(x=>x.app===t).map((x,A)=>{const g=x.id===r;return e.jsx(me,{component:"div",role:"button",variant:"filled",active:g,label:e.jsxs(e.Fragment,{children:[e.jsx(Ue,{color:"lightgray",c:"black",mr:"xs",circle:!0,display:"inline-flex",children:A+1}),x.title??n("Tab")+" "+(A+1).toString()+" - "+p]}),classNames:{root:X.button,label:X["sub-label"]},rightSection:e.jsx(U,{variant:"subtle",color:g?"white":"gray","aria-label":n("Close tab"),title:n("Close tab"),onClick:m=>{m.stopPropagation(),y(x.id)},children:e.jsx(he,{})}),onClick:()=>b(x.id)},x.id)})})}const Bt=async s=>{const t=`/${s}/info.json`;try{return(await(await fetch(t)).json()).version}catch(a){return xe.info(`Failed to get version of ${s}`,a),"unknown"}};function Ft(s){var d,c,p;const{appId:t,onClose:a}=s,{t:n}=S(),[o,l]=j.useState("Unknown"),r=t?(p=(c=(d=se[t])==null?void 0:d.url)==null?void 0:c.split("/"))==null?void 0:p[1]:void 0;return j.useEffect(()=>{r?Bt(r).then(u=>l(u)):l("Unknown")},[r]),e.jsx(B,{opened:!!t,onClose:a,size:"xl",title:e.jsxs(e.Fragment,{children:[n("About")+" "+(t?se[t].name.split(" - ").map(u=>n(u)).join(" - "):""),e.jsx(Ue,{color:"gray",radius:"sm",ml:"xs",children:o})]}),children:e.jsx(w,{component:"a",href:"https://github.com/railmapgen/"+r,target:"_blank",children:n("Visit GitHub")})})}function Oe({assetType:s}){const{t}=S(),[a,n]=j.useState(),o=Je(s,f.getEnv(),f.getInstance());return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:t(s==="devtool"?"Devtools":"Apps")})}),e.jsx(K,{direction:"column",children:o.map(l=>e.jsx(Vt,{appId:l,onAboutOpen:()=>n(l)},l))}),e.jsx(Ft,{appId:a,onClose:()=>n(void 0)})]})}function Wt(){const{t:s}=S(),t=Je("link",f.getEnv(),f.getInstance()),a=n=>{f.event(T.OPEN_LINK,{id:n})};return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:s("Useful links")})}),e.jsx(K,{direction:"column",children:t.map(n=>e.jsx(me,{variant:"filled",label:s(se[n].name),classNames:{root:X.button,label:X.label},rightSection:e.jsx(Z,{}),href:se[n].url,target:"_blank",onClick:()=>a(n)},n))})]})}const Te={"textarea-label":"_textarea-label_kau51_1","textarea-input":"_textarea-input_kau51_5"};function $t(s){var c;const{opened:t,onClose:a}=s,{t:n}=S(),[o,l]=j.useState(),r=Object.entries(localStorage),d=()=>{o&&(window.localStorage.removeItem(o),window.location.reload())};return e.jsxs(B,{opened:t,onClose:a,size:"xl",title:n("Local Storage"),children:[e.jsx(_,{gap:"xs",children:r.map(p=>e.jsx(hs,{label:e.jsxs(N,{align:"center",gap:"xs",children:[p[0],e.jsx(U,{variant:"default",size:"xs",title:n("Remove this item"),"aria-label":n("Remove this item"),onClick:()=>l(p[0]),children:e.jsx(xs,{})})]}),value:p[1],readOnly:!0,rows:4,classNames:{label:Te["textarea-label"],input:Te["textarea-input"]}},p[0]))}),e.jsx(N,{pt:"xs",children:e.jsx(w,{ml:"auto",onClick:a,children:n("Go back")})}),o&&e.jsxs(B,{opened:!0,onClose:()=>l(void 0),centered:!0,title:n("Warning"),children:[e.jsxs(C,{children:[n("LocalStorageModal.text1"),e.jsx(gs,{children:o}),n("LocalStorageModal.text2"),e.jsx(C,{span:!0,fw:500,children:n(((c=se[o.split("__")[0]])==null?void 0:c.name)??"Unknown app")}),n("LocalStorageModal.text3"),e.jsx("br",{}),n("LocalStorageModal.text4")]}),e.jsxs(N,{gap:"xs",mt:"xs",children:[e.jsx(w,{variant:"default",ml:"auto",onClick:()=>l(void 0),children:n("Back")}),e.jsx(w,{color:"red",onClick:d,children:n("Delete and reload")})]})]})]})}function Qe(s){const{t}=S(),a=[{group:t("Main languages"),items:et.map(n=>({value:n,label:de[n][n]}))},{group:t("Other languages"),items:st.map(n=>({value:n,label:de[n][n]??de[n].en}))}];return e.jsx(ms,{label:t("Language"),defaultValue:f.getLanguage(),onChange:({currentTarget:{value:n}})=>{const o=n;f.setLanguage(o),f.getI18nInstance().changeLanguage(o),f.event(T.CHANGE_LANGUAGE,{language:o})},data:a,...s})}function Gt(){const{t:s}=S(),{setColorScheme:t}=js(),a=L(),{lastShowDevtools:n,refreshRequired:o}=M(i=>i.app),[l,r]=j.useState(f.isAllowAnalytics()),[d,c]=j.useState(!1),p=He(n),u=i=>{r(i),f.allowAnalytics(i).refreshRequired&&a(Ks())},h=[{value:"light",label:s("Light")},{value:"dark",label:s("Dark")},{value:"system",label:s("System")}];return e.jsxs(I,{children:[o&&e.jsx(ee,{color:"blue",icon:e.jsx(Se,{}),mb:"xs",children:s("Refreshing is required for changes to take effect.")}),e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:s("Settings")})}),e.jsxs(_,{gap:"xs",py:"xs",children:[e.jsx(Qe,{}),e.jsx(fs,{size:"sm",label:s("Appearance"),defaultValue:f.getColourMode(),onChange:i=>{t(i==="system"?"auto":i),f.setColourMode(i)},data:h}),e.jsx(ke,{label:s("Allow cookies to help improve our website"),labelPosition:"left",checked:l,onChange:({currentTarget:{checked:i}})=>u(i),disabled:o,styles:{labelWrapper:{flex:1}}}),e.jsx(ke,{label:s("Show dev tools for 1 day"),labelPosition:"left",checked:p,onChange:({currentTarget:{checked:i}})=>{i?(a(Js()),f.event(T.SHOW_DEVTOOLS)):a(qs())},styles:{labelWrapper:{flex:1}}}),p&&e.jsx(w,{variant:"default",leftSection:e.jsx(ws,{}),onClick:()=>c(!0),children:s("Export Local Storage")})]}),p&&e.jsx($t,{opened:d,onClose:()=>c(!1)})]})}function Ht(){const{t:s}=S(),{remoteFonts:t}=M(a=>a.app);return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:s("Web fonts")})}),e.jsxs(_,{gap:"xs",children:[e.jsxs(C,{fs:"italic",children:[s("FontsSection.text1")," ",s("FontsSection.text2")," ",s("FontsSection.text3")," (",s("FontsSection.safari"),")"]}),Object.entries(t).map(([a,n])=>e.jsx(w,{variant:"default",rightSection:n.url?e.jsx(Z,{}):void 0,disabled:!n.url,onClick:()=>{window.open(n.url,"_blank"),f.event(T.DOWNLOAD_FONT,{family:a})},children:n.displayName?`${n.displayName} (${a})`:a},a))]})]})}const Jt="_bilibili_5ep1h_1",qt={bilibili:Jt};function Kt(s){return Ve({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"M256 32C132.3 32 32 134.9 32 261.7c0 101.5 64.2 187.5 153.2 217.9a17.56 17.56 0 0 0 3.8.4c8.3 0 11.5-6.1 11.5-11.4 0-5.5-.2-19.9-.3-39.1a102.4 102.4 0 0 1-22.6 2.7c-43.1 0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1 1.4-14.1h.1c22.5 2 34.3 23.8 34.3 23.8 11.2 19.6 26.2 25.1 39.6 25.1a63 63 0 0 0 25.6-6c2-14.8 7.8-24.9 14.2-30.7-49.7-5.8-102-25.5-102-113.5 0-25.1 8.7-45.6 23-61.6-2.3-5.8-10-29.2 2.2-60.8a18.64 18.64 0 0 1 5-.5c8.1 0 26.4 3.1 56.6 24.1a208.21 208.21 0 0 1 112.2 0c30.2-21 48.5-24.1 56.6-24.1a18.64 18.64 0 0 1 5 .5c12.2 31.6 4.5 55 2.2 60.8 14.3 16.1 23 36.6 23 61.6 0 88.2-52.4 107.6-102.3 113.3 8 7.1 15.2 21.1 15.2 42.5 0 30.7-.3 55.5-.3 63 0 5.4 3.1 11.5 11.4 11.5a19.35 19.35 0 0 0 4-.4C415.9 449.2 480 363.1 480 261.7 480 134.9 379.7 32 256 32z"},child:[]}]})(s)}function Yt(s){return Ve({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"M126.12 315.1A47.06 47.06 0 1 1 79.06 268h47.06zm23.72 0a47.06 47.06 0 0 1 94.12 0v117.84a47.06 47.06 0 1 1-94.12 0zm47.06-188.98A47.06 47.06 0 1 1 244 79.06v47.06zm0 23.72a47.06 47.06 0 0 1 0 94.12H79.06a47.06 47.06 0 0 1 0-94.12zm188.98 47.06a47.06 47.06 0 1 1 47.06 47.1h-47.06zm-23.72 0a47.06 47.06 0 0 1-94.12 0V79.06a47.06 47.06 0 1 1 94.12 0zM315.1 385.88a47.06 47.06 0 1 1-47.1 47.06v-47.06zm0-23.72a47.06 47.06 0 0 1 0-94.12h117.84a47.06 47.06 0 1 1 0 94.12z"},child:[]}]})(s)}function Qt(){const{t:s}=S();return e.jsxs(I,{children:[e.jsx(E,{children:e.jsx(R,{order:2,size:"h4",children:s("Help & support")})}),e.jsxs(_,{gap:"xs",children:[e.jsx(w,{variant:"default",leftSection:e.jsx(Kt,{}),rightSection:e.jsx(Z,{}),onClick:()=>{window.open("https://github.com/railmapgen/railmapgen.github.io/issues","_blank"),f.event(T.RAISE_ISSUE)},children:s("Raise an Issue on GitHub")}),e.jsx(w,{variant:"default",leftSection:e.jsx(Yt,{}),rightSection:e.jsx(Z,{}),onClick:()=>{window.open("https://join.slack.com/t/railmapgenerator/shared_invite/zt-1odhhta3n-DdZF~fnVwo_q0S0RJmgV8A","_blank"),f.event(T.JOIN_SLACK)},children:s("Join us on Slack")}),e.jsx(w,{variant:"default",leftSection:e.jsx(pe,{className:qt.bilibili,src:"images/bilibili.svg"}),rightSection:e.jsx(Z,{}),onClick:()=>{window.open("https://space.bilibili.com/10124055","_blank"),f.event(T.FOLLOW_BILIBILI)},children:s("Follow us on Bilibili")})]})]})}function Xt(){const{t:s}=S(),{isShowMenu:t,menuView:a,lastShowDevtools:n}=M(h=>h.app),{isLoggedIn:o,name:l}=M(h=>h.account),r=L(),d=Ye(),[c]=Be(),p=(f.getInstance()==="GitLab"?"https://railmapgen.gitlab.io/":"https://railmapgen.github.io/")+"?"+c.toString();j.useEffect(()=>{o&&r(Q())},[o]);const u=[{key:"apps",label:s("Apps"),Icon:e.jsx(Ss,{size:22})},{key:"links",label:s("Useful links"),Icon:e.jsx(bs,{size:22})},{key:"devtools",label:s("Devtools"),Icon:e.jsx(vs,{size:22}),ActionIconProps:{style:{display:He(n)?"inline-flex":"none"}}},{key:"account",label:s("Account"),Icon:e.jsx(De,{variant:"light",name:o?l:void 0,size:"sm",color:"initials"}),ActionIconProps:{mt:"auto"}},{key:"contributors",label:s("Contributors"),Icon:e.jsx(Cs,{size:22}),ActionIconProps:{onClick:()=>{r(Ys("contributors")),d||(r(ie()),f.toggleNavMenu(!1))}}},{key:"support",label:s("Help & support"),Icon:e.jsx(ys,{size:22})},{key:"settings",label:s("Settings"),Icon:e.jsx(ks,{size:22})}];return e.jsx("nav",{className:Ee($.root,t&&$["show-menu"]),children:e.jsxs("div",{className:$.wrapper,children:[e.jsxs(Ms,{className:$.header,children:[e.jsx(R,{children:s("Rail Map Toolkit")}),e.jsx(As,{env:f.getEnv(),ver:f.getAppVersion()})]}),e.jsx(ge,{}),f.getEnv()!=="PRD"&&e.jsxs(ee,{color:"yellow",icon:e.jsx(Rs,{}),className:$.alert,children:[s("You're currently viewing a testing environment.")," ",e.jsx(be,{size:"sm",href:p,target:"_blank",children:s("Back to production environment")})]}),e.jsxs("div",{className:$.body,children:[e.jsx("div",{className:$.aside,children:u.map(({key:h,label:i,Icon:b,ActionIconProps:y})=>e.jsx(Ls,{label:i,position:"right",withArrow:!0,children:e.jsx(U,{variant:a===h?"light":"subtle",color:a===h?void 0:"gray",size:"lg",onClick:()=>r(Qs(h)),...y,children:b})},h))}),e.jsx(ge,{orientation:"vertical"}),e.jsxs("div",{className:$.main,children:[a==="apps"?e.jsx(Oe,{assetType:"app"}):a==="links"?e.jsx(Wt,{}):a==="devtools"?e.jsx(Oe,{assetType:"devtool"}):a==="settings"?e.jsx(Gt,{}):a==="support"?e.jsxs(e.Fragment,{children:[e.jsx(Qt,{}),e.jsx(Ht,{})]}):a==="account"?e.jsx(Dt,{}):e.jsx(e.Fragment,{}),e.jsx(bt,{})]})]})]})})}function Zt(s){const{opened:t,onClose:a}=s,{t:n}=S(),o=()=>{f.allowAnalytics(!0),a()},l=()=>{f.allowAnalytics(!1).refreshRequired?window.location.reload():a()};return e.jsxs(B,{opened:t,onClose:()=>{},title:n("CookiesModal.header"),withCloseButton:!1,closeOnEscape:!1,closeOnClickOutside:!1,centered:!0,children:[e.jsx(N,{children:e.jsx(Qe,{ml:"auto"})}),e.jsxs(_,{gap:"xs",py:"xs",children:[e.jsx(C,{children:n("CookiesModal.text1")}),e.jsx(C,{mt:2,children:n("CookiesModal.text2")}),e.jsx(z,{withPadding:!0,children:e.jsxs(z.Item,{children:[" ",n("CookiesModal.item1")]})}),e.jsx(C,{mt:2,children:n("CookiesModal.text3")})]}),e.jsxs(N,{gap:"sm",children:[e.jsx(w,{variant:"default",ml:"auto",onClick:l,children:n("CookiesModal.reject")}),e.jsx(w,{onClick:o,children:n("CookiesModal.accept")})]})]})}const en=()=>{};function sn(){const{t:s}=S(),[t,a]=j.useState(!1),n=()=>{a(!0),Xs(),setTimeout(()=>{window.location.reload()},1e3)};return e.jsxs(B,{opened:!0,onClose:en,title:s("Rail Map Toolkit is opened in another window"),withCloseButton:!1,closeOnEscape:!1,closeOnClickOutside:!1,centered:!0,children:[e.jsx(C,{children:s("You cannot open multiple Rail Map Toolkit at the same time. Please close this window.")}),e.jsx(N,{mt:"xs",children:e.jsx(w,{variant:"default",onClick:n,loading:t,disabled:t,children:s("Restart RMT in this window")})})]})}const tn=()=>{};function nn(){const{t:s}=S();return e.jsx(B,{opened:!0,onClose:tn,title:s("Rail Map Toolkit is opened in another window"),withCloseButton:!1,closeOnEscape:!1,closeOnClickOutside:!1,centered:!0,children:e.jsx(C,{children:s("Current session has been terminated. Please close this window.")})})}const an="_root_nos1z_1",on={root:an},ln={info:void 0,success:"green",warning:"yellow",error:"red"},ue=200,Ie=400;function rn({notification:s}){const t=L(),[a,n]=j.useState(!1);return j.useEffect(()=>{setTimeout(()=>{n(!0)},ue);const o=setTimeout(()=>{n(!1)},ue+s.duration);return setTimeout(()=>{t(Zs(s.id))},ue+s.duration+Ie),()=>{clearTimeout(o)}},[]),e.jsx(_s,{mounted:a,transition:"slide-left",duration:Ie,timingFunction:"ease",children:o=>e.jsx(Os,{color:ln[s.type],title:s.title,onClose:()=>n(!1),withBorder:!0,style:o,children:s.message})})}function cn(){const{notifications:s}=M(t=>t.notification);return e.jsx(Ts,{children:e.jsx(_,{className:on.root,children:s.map(t=>e.jsx(rn,{notification:t},t.id))})})}function mn(){const{t:s}=S(),t=L(),{isPrimary:a,isTerminated:n,isShowMenu:o}=M(c=>c.app),[l,r]=j.useState(!1);j.useEffect(()=>{f.isAnalyticsQADone()||r(!0)},[]);const d=()=>{f.toggleNavMenu(!o),t(ie()),f.event(T.TOGGLE_NAV_MENU)};return e.jsx(Ns,{basename:"/",children:e.jsxs(Is,{className:o?"show-menu":"",children:[e.jsx(U,{className:nt.burger,variant:o?"subtle":"filled",color:o?"gray":void 0,"aria-label":s("Toggle menu"),title:s("Toggle menu"),onClick:d,children:e.jsx(Es,{})}),e.jsxs(Ps,{direction:"row",children:[e.jsx(Xt,{}),e.jsx(ut,{alwaysShowWelcome:n||a===!1})]}),e.jsx(cn,{}),n&&e.jsx(nn,{}),a===!1&&e.jsx(sn,{}),e.jsx(Zt,{opened:l,onClose:()=>r(!1)})]})})}export{mn as default};
