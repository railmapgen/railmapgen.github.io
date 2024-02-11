import{r,c as E,R as N,a as x,b as H}from"./rmg-theme-provider-k3Sj-hzq.js";import{j as m}from"./chakra-lIv7jSEd.js";import{i as j,d as U,e as B,f as W,h as V,u as J,j as Y,k as A,r as P,P as q,I as z}from"./react-ChmrgLrp.js";function jo(){import.meta.url,import("_").catch(()=>1),async function*(){}().next()}const F="modulepreload",K=function(e){return"/"+e},C={},X=function(t,o,s){let i=Promise.resolve();if(o&&o.length>0){const n=document.getElementsByTagName("link");i=Promise.all(o.map(a=>{if(a=K(a),a in C)return;C[a]=!0;const c=a.endsWith(".css"),l=c?'[rel="stylesheet"]':"";if(!!s)for(let b=n.length-1;b>=0;b--){const w=n[b];if(w.href===a&&(!c||w.rel==="stylesheet"))return}else if(document.querySelector('link[href="'.concat(a,'"]').concat(l)))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":F,c||(d.as="script",d.crossOrigin=""),d.href=a,document.head.appendChild(d),c)return new Promise((b,w)=>{d.addEventListener("load",b),d.addEventListener("error",()=>w(new Error("Unable to preload CSS for ".concat(a))))})}))}return i.then(()=>t()).catch(n=>{const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=n,window.dispatchEvent(a),!a.defaultPrevented)throw n})},Q=()=>{document.querySelector('link[rel="canonical"]').setAttribute("href",window.location.origin)};Q();const Z="操作",ee="应用程序",te="黑",oe="取消",se="城市",ae="组件",ne="确定",ie="继续",re="复制",ce="编辑",le="语言/Language",pe="理由",ue="名称",de="下一步",me="打开",ge="调色板",he="上一步",be="删除",Te="重置",we="设置",fe="提交",ke="翻译",Se="上传",Re="白",Ce={Action:Z,Apps:ee,"Back to list":"返回列表","Background colour":"背景色",Black:te,Cancel:oe,City:se,Components:ae,"Configuration file":"配置文件",Confirm:ne,Continue:ie,"Country/Region":"国家/地区",Copy:re,Edit:ce,"Foreground colour":"前景色","Go back":"返回",Language:le,Justification:pe,Name:ue,Next:de,Open:me,Palette:ge,"Please select...":"请选择...",Previous:he,"Rail Map Generator":"铁路线路图生成器","Rail Map Painter":"地铁线路图绘制器","Rail Map Toolkit":"线路图工具包",Remove:be,Reset:Te,"RMG Templates":"RMG 模板","RMP Gallery":"RMP 画廊","Seed Project":"种子项目",Settings:we,Submit:fe,Translate:ke,Upload:Se,White:Re},ve="動作",ye="應用程式",Ae="黑",Pe="取消",$e="城市",Me="元件",Ge="確定",Le="繼續",Ie="複製",Oe="編輯",De="語言/Language",_e="理由",Ee="名稱",Ne="下一步",xe="開啟",He="調色盤",je="上一步",Ue="移除",Be="重設",We="設定",Ve="提交",Je="翻譯",Ye="上載",qe="白",ze={Action:ve,Apps:ye,"Back to list":"返回列表","Background colour":"背景色",Black:Ae,Cancel:Pe,City:$e,Components:Me,"Configuration file":"設定檔",Confirm:Ge,Continue:Le,Copy:Ie,"Country/Region":"國家/地區",Edit:Oe,"Foreground colour":"前景色","Go back":"返回",Language:De,Justification:_e,Name:Ee,Next:Ne,Open:xe,Palette:He,"Please select...":"請選擇...",Previous:je,"Rail Map Generator":"鐵路路綫圖產生器","Rail Map Painter":"地鐵路綫圖繪製器","Rail Map Toolkit":"路綫圖工具組",Remove:Ue,Reset:Be,"RMG Templates":"RMG 範本","RMP Gallery":"RMP 畫廊","Seed Project":"種子項目",Settings:We,Submit:Ve,Translate:Je,Upload:Ye,White:qe},Fe="言語/Language",Ke="パレット",Xe="削除",Qe={Language:Fe,Palette:Ke,"Rail Map Generator":"鉄道路線図ジェネレータ","Rail Map Toolkit":"路線図ツールキット",Remove:Xe,"RMG Templates":"RMG テンプレート"},Ze="조작",et="앱",tt="블랙",ot="취소",st="도시",at="요소",nt="확인",it="복사",rt="편집",ct="언어/Language",lt="이유",pt="명칭",ut="다음",dt="열기",mt="팔레트",gt="나아가",ht="삭제",bt="리셋",Tt="설치",wt="제출",ft="번역",kt="업로드",St="화이트",Rt={Action:Ze,Apps:et,"Back to list":"다시 목록으로","Background colour":"배경색",Black:tt,Cancel:ot,City:st,Components:at,"Configuration file":"환경 설정 파일",Confirm:nt,Copy:it,"Country/Region":"국가/지역",Edit:rt,"Foreground colour":"전경색","Go back":"되돌아가",Language:ct,Justification:lt,Name:pt,Next:ut,Open:dt,Palette:mt,"Please select...":"선택해주세요",Previous:gt,"Rail Map Generator":"철도 노선도 생성기","Rail Map Painter":"지하철 노선도 그리기","Rail Map Toolkit":"노선도 툴킷",Remove:ht,Reset:bt,"RMG Templates":"RMG 템플릿","RMP Gallery":"RMP 갤러리","Seed Project":"종자 프로젝트",Settings:Tt,Submit:wt,Translate:ft,Upload:kt,White:St};var Ct={en:{},"zh-Hans":Ce,"zh-Hant":ze,ja:Qe,ko:Rt};const vt={header:"Cookies on this website",text1:"At RMG we use cookies to help ensure that our website and services are able to function properly. These cookies are necessary and so are set automatically.",text2:"We would also like to use some cookies to:",item1:"improve our website based on how you use it",text3:"These cookies are optional. If you'd like to accept all optional cookies, select 'Accept all cookies'. If you'd like to reject them, select 'Reject'.",accept:"Accept all cookies",reject:"Reject"},yt={CookiesModal:vt},At={header:"本网站的 Cookies",text1:"在 RMG，我们使用 Cookies 来确保本网站及服务可以正常运作。这些 Cookies 是必需的，因此已默认启动。",text2:"我们也会以 Cookies 的方式：",item1:"分析您的使用模式，用来改进本网站",text3:"这些 Cookies 是可选的。如果您想允许所有可选 Cookies，请选择“接受所有 Cookies”。如果您想禁用 Cookies，请选择“拒绝”。",accept:"接受所有 Cookies",reject:"拒绝"},Pt="关于",$t="外观",Mt="贡献者",Gt="深色",Lt="开发者工具",It="捐赠者",Ot="浅色",Dt="更多",_t="正在运行",Et="保存",Nt="切换",xt="跟随系统",Ht="标签页",jt="使用教程",Ut={CookiesModal:At,About:Pt,"Allow cookies to help improve our website":"允许用 Cookies 帮助改进本网站",Appearance:$t,"Back to production environment":"返回生产环境","Close all tabs":"关闭所有标签页","Close app":"关闭应用程序","Close current tab":"关闭当前标签页","Close tab":"关闭标签页","Contribution Wiki":"贡献者指南",Contributors:Mt,"Current session has been terminated. Please close this window.":"当前会话已被终止，请关闭此窗口。",Dark:Gt,"Developer team":"开发者团队",Devtools:Lt,Donators:It,"Download desktop app":"下载桌面应用程序","GitHub Pages mirror":"GitHub Pages 镜像","GitLab Pages mirror":"GitLab Pages 镜像","Gitee Pages mirror":"Gitee (码云) Pages 镜像","Happy Chinese New Year!":"新年快乐！","Help and support":"帮助与支持","Join us on Slack":"加入我们的 Slack 群组",Light:Ot,"Main languages":"主要语言",More:Dt,"More mirrors":"更多镜像","New tab":"新标签页","Notes: Contributors are sorted by number of commits and commit time.":"注：贡献者名单按提交次数和时间排序。","Other languages":"其他语言","Rail Map Toolkit is opened in another window":"线路图工具包已在另一窗口中打开","Raise an Issue on GitHub":"在 GitHub 提交一个 Issue","Refreshing is required for changes to take effect.":"刷新页面后变更才会生效","Resource administrators":"资源管理员","Resource contributors":"资源贡献者","Restart RMT in this window":"在此窗口重新启动工具包",Running:_t,Save:Et,"Select an app to start your own rail map design!":"选择一个应用程序来开始你的线路图设计！","Show dev tools for 1 day":"显示开发者工具 1 天",Switch:Nt,"Switch to":"切换至",System:xt,Tab:Ht,"Terms and conditions":"条款与细则",Tutorial:jt,"Unable to load contributors":"无法加载贡献者名单","Useful links":"实用链接","Visit GitHub":"访问 GitHub","Welcome to Rail Map Toolkit":"欢迎使用线路图工具包","You cannot open multiple Rail Map Toolkit at the same time. Please close this window.":"您不能同时打开多个线路图工具包，请关闭当前窗口。","You're currently viewing a testing environment.":"您正在浏览测试环境。"},Bt={header:"本網站的 Cookies",text1:"在 RMG，我們使用 Cookies 以確保本網站及服務可以正常運作。這些 Cookies 是必需的，因此已預設啟用。",text2:"我們亦會以 Cookies 的方式：",item1:"分析閣下的使用模式，用來改進本網站",text3:"這些 Cookies 是可選的。如果閣下想容許所有可選 Cookies，請選擇「接受所有 Cookies」。如果閣下想禁用 Cookies，請選擇「拒絕」。",accept:"接受所有 Cookies",reject:"拒絕"},Wt="關於",Vt="外觀",Jt="貢獻者",Yt="深色",qt="開發人員工具",zt="捐贈者",Ft="淺色",Kt="更多",Xt="運行中",Qt="儲存",Zt="切換",eo="跟隨系統",to="分頁",oo="使用指南",so={CookiesModal:Bt,About:Wt,"Allow cookies to help improve our website":"容許以 Cookies 幫助改進本網站",Appearance:Vt,"Back to production environment":"返回生產環境","Close all tabs":"關閉所有分頁","Close app":"關閉應用程式","Close current tab":"關閉當前分頁","Close tab":"關閉分頁","Contribution Wiki":"貢獻者指南",Contributors:Jt,"Current session has been terminated. Please close this window.":"當前工作階段已被終止，請關閉該視窗。",Dark:Yt,"Developer team":"開發人員團隊",Devtools:qt,Donators:zt,"Download desktop app":"下載桌面應用程式","GitHub Pages mirror":"GitHub Pages 鏡像","GitLab Pages mirror":"GitLab Pages 鏡像","Gitee Pages mirror":"Gitee (碼雲) Pages 鏡像","Happy Chinese New Year!":"新年快樂！","Help and support":"幫助及支援","Join us on Slack":"加入我們的 Slack 羣組",Light:Ft,"Main languages":"主要語言",More:Kt,"More mirrors":"更多鏡像","New tab":"新分頁","Notes: Contributors are sorted by number of commits and commit time.":"註：貢獻者列表按提交次數及時間排序。","Other languages":"其他語言","Rail Map Toolkit is opened in another window":"路綫圖工具組已於另一視窗中開啟","Raise an Issue on GitHub":"於 GitHub 提交一個 Issue","Refreshing is required for changes to take effect.":"重新整理頁面後變更才會生效","Resource administrators":"資源管理員","Resource contributors":"資源貢獻者","Restart RMT in this window":"於該視窗重新啟動工具組",Running:Xt,Save:Qt,"Select an app to start your own rail map design!":"選擇一個應用程式以開始你的路綫圖設計！","Show dev tools for 1 day":"顯示開發人員工具 1 日",Switch:Zt,"Switch to":"切換至",System:eo,Tab:to,"Terms and conditions":"條款及細則",Tutorial:oo,"Unable to load contributors":"無法載入貢獻者列表","Useful links":"實用連結","Visit GitHub":"造訪 GitHub","Welcome to Rail Map Toolkit":"歡迎使用路綫圖工具組","You cannot open multiple Rail Map Toolkit at the same time. Please close this window.":"你不能同時開啟多個路綫圖工具組，請關閉當前視窗。","You're currently viewing a testing environment.":"你正在檢視測試環境。"},ao="貢献者",no="タブ",io={Contributors:ao,"Happy Chinese New Year!":"旧正月おめでとう！","Main languages":"主要言語",Tab:no,"Welcome to Rail Map Toolkit":"路線図ツールキットへようこそ"},ro={header:"이 웹 사이트의 쿠키",text1:"RMG에서는 쿠키를 사용하여 웹 사이트 및 서비스가 제대로 작동하는지 확인합니다.이러한 쿠키는 필수이므로 기본적으로 시작됩니다.",text2:"저희도 쿠키 방식으로：",item1:"당신의 사용 패턴을 분석하여, 본 사이트를 개선합니다",text3:"이 쿠키들은 선택 사항입니다.모든 선택 가능한 쿠키를 허용하려면 '모든 쿠키 허용'을 선택하십시오.쿠키를 사용하지 않으려면 '거부'를 선택하십시오.",accept:"모든 쿠키 허용",reject:"거부"},co="관한",lo="화면 스타일",po="기여자",uo="다크 모드",mo="라이트 모드",go="저장",ho="시스템 모드",bo={CookiesModal:ro,About:co,"Allow cookies to help improve our website":"쿠키를 사용하여 이 웹 사이트를 개선할 수 있도록 허용",Appearance:lo,"Contribution Wiki":"기여자 안내",Contributors:po,"Core contributors":"핵심 기여자",Dark:uo,"Happy Chinese New Year!":"새해 복 많이 받으세요!",Light:mo,"Refreshing is required for changes to take effect.":"페이지를 새로 고친 후에만 변경 가능","Resource administrators":"자원 관리자","Resource contributors":"자원 기여자",Save:go,"Select an app to start your own rail map design!":"응용 프로그램을 선택하여 노선도 설계를 시작하십시오.","Switch to":"곳으로 전환",System:ho,"Terms and conditions":"조항과 세칙","Visit GitHub":"GitHub 방문하기","Welcome to Rail Map Toolkit":"노선도 툴킷에 오신 것을 환영합니다"},To=new r.I18nBuilder().use(j).withAppName("Rail Map Toolkit").withLng(r.getLanguage()).withDefaultResource(Ct).withResource("en",yt).withResource("zh-Hans",Ut).withResource("zh-Hant",so).withResource("ja",io).withResource("ko",bo).build(),S=e=>e?["app","devtool"]:["app"],wo=()=>{const e="https://mirror.ghproxy.com/https://github.com/railmapgen/railmapgen.github.io/releases/download",t=new Date,o="".concat(t.getFullYear()).concat(String(t.getMonth()+1).padStart(2,"0"),"01"),s="".concat(String(t.getFullYear()).slice(-2),".").concat(t.getMonth()+1,".1"),i=navigator.platform,n=i.includes("Linux")?"amd64.deb":i.includes("Mac")?"x64.dmg":"x64-setup.exe";return e+"/tauri-".concat(o,"/railmapgen_").concat(s,"_").concat(n)},T={rmg:{name:"Rail Map Generator",url:"/rmg/",assetType:"app",allowMultiInstances:!0},rmp:{name:"Rail Map Painter",url:"/rmp/",assetType:"app"},"rmg-palette":{name:"Palette",url:"/rmg-palette/",assetType:"app",showContributors:!0,legacyContributors:"legacy-contributor-list.txt"},"rmg-palette-upload":{name:"Palette - Upload",url:"/rmg-palette/#/new",assetType:"app"},"rmg-templates":{name:"RMG Templates",url:"/rmg-templates/",assetType:"app",showContributors:!0,legacyContributors:"legacy-contributor-list.txt"},"rmg-templates-upload":{name:"RMG Templates - Upload",url:"/rmg-templates/#/new",assetType:"app"},"rmp-gallery":{name:"RMP Gallery",url:"/rmp-gallery/",assetType:"app",showContributors:!0,showDonators:!0},"rmg-components":{name:"Components",url:"/rmg-components/",assetType:"devtool",allowedInstances:["GitHub","GitLab","localhost","unknown"]},"svg-assets":{name:"SVG Assets",url:"/svg-assets/",assetType:"devtool",allowedInstances:["GitHub","GitLab","localhost","unknown"]},"rmg-translate":{name:"Translate",url:"/rmg-translate/",assetType:"devtool",allowedInstances:["GitHub","GitLab","localhost","unknown"]},"seed-project":{name:"Seed Project",url:"/seed-project/",assetType:"devtool",allowedInstances:["GitHub","GitLab","localhost","unknown"]},"runtime-demo":{name:"Runtime Demo",url:"/runtime-demo/",assetType:"devtool",allowedInstances:["GitHub","GitLab","localhost","unknown"]},tutorial:{name:"Tutorial",url:"https://rmttutorial.wordpress.com",assetType:"link"},"github-pages":{name:"GitHub Pages mirror",url:"https://railmapgen.github.io",assetType:"link",allowedInstances:["GitLab","Gitee","localhost","unknown"]},"gitlab-pages":{name:"GitLab Pages mirror",url:"https://railmapgen.gitlab.io",assetType:"link",allowedInstances:["GitHub","Gitee","localhost","unknown"]},"gitee-pages":{name:"Gitee Pages mirror",url:"https://railmapgen.gitee.io",assetType:"link",allowedInstances:["localhost"]},tauri:{name:"Download desktop app",url:wo(),assetType:"link",allowedInstances:["GitHub","GitLab","Gitee","localhost","unknown"]}},$=(e,t,o)=>Object.entries(T).filter(([,s])=>{const i=s.assetType===e,n=!s.allowedEnvs||s.allowedEnvs.includes(t),a=!s.allowedInstances||s.allowedInstances.includes(o);return i&&n&&a}).map(([s])=>s),fo={isShowMenu:!0,menuView:"main",refreshRequired:!1,lastShowDevtools:0,openedTabs:[],activeTab:void 0},M=U({name:"app",initialState:fo,reducers:{setIsPrimary:(e,t)=>{e.isPrimary=t.payload},terminateSession:e=>{e.isTerminated=!0},toggleMenu:e=>{e.isShowMenu=!e.isShowMenu},setMenuView:(e,t)=>{e.menuView=t.payload},requireRefresh:e=>{e.refreshRequired=!0},showDevtools:(e,t)=>{const o=Date.now();t.payload?t.payload<o&&(e.lastShowDevtools=t.payload):e.lastShowDevtools=o},hideDevtools:e=>{e.lastShowDevtools=0},setOpenedTabs:(e,t)=>{e.openedTabs=t.payload},updateTabUrl:(e,t)=>{const{id:o,url:s}=t.payload;e.openedTabs=e.openedTabs.map(i=>i.id===o?{...i,url:s}:i)},setActiveTab:(e,t)=>{e.activeTab=t.payload},openApp:(e,t)=>{const{appId:o,url:s}=t.payload,i=e.openedTabs.find(({id:a})=>a===e.activeTab),n=e.openedTabs.find(({app:a})=>a===o);if((i==null?void 0:i.app)!==o)if(n)e.activeTab=n.id;else{const a=crypto.randomUUID();e.openedTabs.push({id:a,app:o,url:s!=null?s:T[o].url}),e.activeTab=a}},openAppInNew:(e,t)=>{const o=crypto.randomUUID();e.openedTabs.push({id:o,app:t.payload}),e.activeTab=o},closeTab:(e,t)=>{var i;const o=t.payload,s=e.openedTabs.slice().sort((n,a)=>{const c=Object.keys(T);return c.indexOf(n.app)-c.indexOf(a.app)});if(e.openedTabs=e.openedTabs.filter(n=>n.id!==o),e.activeTab===o){const n=s.findIndex(a=>a.id===o);e.activeTab=(i=s.filter(a=>a.id!==o)[Math.max(0,n-1)])==null?void 0:i.id}},closeApp:(e,t)=>{var a,c;const o=t.payload;if(!e.openedTabs.some(l=>l.app===o))return;const s=Object.keys(T).filter(l=>e.openedTabs.some(h=>h.app===l)),i=(a=e.openedTabs.find(l=>l.id===e.activeTab))==null?void 0:a.app,n=e.openedTabs.filter(l=>l.app!==o);if(e.openedTabs=n,i===o){const l=s.findIndex(h=>h===o);e.activeTab=(c=n.find(h=>h.app===s[Math.max(0,l-1)]))==null?void 0:c.id}}}}),R=e=>{const t=Date.now();return e+864e5>=t},{setIsPrimary:ko,terminateSession:So,toggleMenu:Vo,setMenuView:Jo,requireRefresh:Yo,showDevtools:Ro,hideDevtools:qo,setOpenedTabs:Co,updateTabUrl:vo,setActiveTab:v,openApp:k,openAppInNew:zo,closeTab:Fo,closeApp:yo}=M.actions,Ao=M.reducer,Po=B({app:Ao}),G=W(),$o=(e={})=>V({reducer:Po,middleware:t=>t().prepend(G.middleware),preloadedState:e}),p=$o(),Ko=()=>J(),Xo=Y,f=G.startListening;window.rmgStore=p;var g=(e=>(e.OPENED_TABS="rmg-home__openedTabs",e.ACTIVE_TAB="rmg-home__activeTab",e.LAST_SHOW_DEVTOOLS="lastShowDevtools",e))(g||{}),L=(e=>(e.APP_LOAD="APP_LOAD",e.OPEN_APP="OPEN_APP",e.CLOSE_APP="CLOSE_APP",e.OPEN_LINK="OPEN_LINK",e.TOGGLE_NAV_MENU="TOGGLE_NAV_MENU",e.CHANGE_LANGUAGE="CHANGE_LANGUAGE",e.SHOW_DEVTOOLS="SHOW_DEVTOOLS",e.RAISE_ISSUE="RAISE_ISSUE",e.JOIN_SLACK="JOIN_SLACK",e))(L||{});const Mo="rmg-home:frame-",Go=e=>new Promise(t=>{setTimeout(t,e,"Timeout after ".concat(e/1e3," seconds"))}),Lo="rmt-instance-checker",I="ping",O="pong",D="restart",u=new BroadcastChannel(Lo),_=e=>{e.data===I&&(console.log("[rmt] Received ping from another RMT instance."),u.postMessage(O))};u.addEventListener("message",_);u.addEventListener("message",e=>{e.data===D&&(console.log("[rmt] Received restart from another RMT instance. Closing current session..."),u.close(),p.dispatch(So()),p.dispatch(A()))});const Qo=()=>{u.postMessage(D)},Io=async()=>{let e=!0;u.addEventListener("message",o=>{o.data===O&&(console.warn("[rmt] Received pong from another RMT instance. This instance is not primary."),e=!1,u.removeEventListener("message",_))}),u.postMessage(I);let t=5;for(;t--;)if(await Go(500),!e)return!1;return console.log("[rmt] This instance is primary."),!0},Oo=e=>{const t=Number(r.storage.get(g.LAST_SHOW_DEVTOOLS));t&&e.dispatch(Ro(t))},Do=e=>{try{const t=window.localStorage.getItem(g.OPENED_TABS);if(t){const o=JSON.parse(t);if(Array.isArray(o)){const s=S(R(e.getState().app.lastShowDevtools)),i=o.filter(n=>s.includes(T[n.app].assetType));e.dispatch(Co(i))}else console.warn("initOpenedTabs():: Cannot parse invalid opened tabs state from local storage")}}catch(t){console.warn("initOpenedTabs():: cannot parse opened apps state from local storage",t)}},_o=e=>{var s;const t=window.localStorage.getItem(g.ACTIVE_TAB),o=e.getState().app.openedTabs;t&&o.some(({id:i})=>i===t)?e.dispatch(v(t)):e.dispatch(v((s=o[0])==null?void 0:s.id))},Eo=e=>{var n;const o=(n=new URLSearchParams(window.location.search).get("app"))!=null?n:"";console.log("openSearchedApp():: searchParams app=".concat(o)),S(R(e.getState().app.lastShowDevtools)).map(a=>$(a,r.getEnv(),r.getInstance())).flat().includes(o)?e.dispatch(k({appId:o})):console.warn("openSearchedApp():: app ".concat(o," not found"))};function No(e){Oo(e),Do(e),_o(e),f({predicate:(t,o,s)=>o.app.lastShowDevtools!==s.app.lastShowDevtools,effect:(t,o)=>{r.storage.set(g.LAST_SHOW_DEVTOOLS,o.getState().app.lastShowDevtools.toString())}}),f({predicate:(t,o,s)=>JSON.stringify(o.app.openedTabs)!==JSON.stringify(s.app.openedTabs),effect:(t,o)=>{window.localStorage.setItem(g.OPENED_TABS,JSON.stringify(o.getState().app.openedTabs))}}),f({predicate:(t,o,s)=>o.app.activeTab!==s.app.activeTab,effect:(t,o)=>{const s=o.getState().app.activeTab;s!==void 0&&window.localStorage.setItem(g.ACTIVE_TAB,s)}}),Eo(e),Io().then(t=>{e.dispatch(ko(t)),t||e.dispatch(A())})}let y;const xo=P.lazy(()=>X(()=>import("./app-root-iYe1Ta_Q.js"),__vite__mapDeps([0,1,2,3,4,5]))),Ho=()=>{y=E(document.getElementById("root")),y.render(m.jsx(P.StrictMode,{children:m.jsx(q,{store:p,children:m.jsx(z,{i18n:To,children:m.jsx(N,{children:m.jsx(x,{suspenseFallback:m.jsx(H,{isIndeterminate:!0}),allowReset:!0,children:m.jsx(xo,{})})})})})}))};r.ready().then(()=>{No(p),Ho(),r.onAppOpen(e=>{const o=S(R(p.getState().app.lastShowDevtools)).map(s=>$(s,r.getEnv(),r.getInstance())).flat();typeof e=="object"?o.includes(e.appId)&&p.dispatch(k({appId:e.appId,url:e.url})):o.includes(e)&&p.dispatch(k({appId:e}))}),r.onAppClose(e=>{p.dispatch(yo(e))}),r.onUrlUpdate((e,t)=>{if(t){const o=t.slice(Mo.length);console.log("Received URL update for frame=".concat(o,", url=").concat(e)),p.dispatch(vo({id:o,url:e}))}}),r.event(L.APP_LOAD,{openedApps:p.getState().app.openedTabs.map(e=>e.app)})});export{L as E,Mo as F,jo as __vite_legacy_guard,Ko as a,T as b,k as c,Fo as d,yo as e,Jo as f,$ as g,Ro as h,R as i,qo as j,Qo as k,zo as o,Yo as r,v as s,Vo as t,Xo as u};
function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = ["assets/app-root-iYe1Ta_Q.js","assets/chakra-lIv7jSEd.js","assets/react-ChmrgLrp.js","assets/rmg-theme-provider-k3Sj-hzq.js","assets/rmg-theme-provider-W_P3xS0j.css","assets/rmg-fields-4CmOLIYK.js"]
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}
