if(!self.define){let e,n={};const i=(i,r)=>(i=new URL(i+".js",r).href,n[i]||new Promise((n=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=n,document.head.appendChild(e)}else e=i,importScripts(i),n()})).then((()=>{let e=n[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(r,d)=>{const l=e||("document"in self?document.currentScript.src:"")||location.href;if(n[l])return;let s={};const o=e=>i(e,l),a={module:{uri:l},exports:s,require:o};n[l]=Promise.all(r.map((e=>a[e]||o(e)))).then((e=>(d(...e),s)))}}define(["./workbox-5b279812"],(function(e){"use strict";self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"CNAME",revision:"6506c74db3d994afc105a9ddf360c62b"},{url:"browserconfig.7927688f269d4412ddfee6cb011a48a9.xml",revision:null},{url:"icon_maskable_rounded.b1302718deb3da69c990431fe643704a.ico",revision:null},{url:"icon_maskable_rounded_16.8d95a299063eec64083101d944907ce0.png",revision:null},{url:"icon_maskable_rounded_32.7a049051e69e531ab7e9c5a75d46ff64.png",revision:null},{url:"main.3bda7cdd6ead3cabe35f.js",revision:null},{url:"main.3bda7cdd6ead3cabe35f.js.LICENSE.txt",revision:"38a0597b3e2b86d99c36ea0fac45fa4d"},{url:"open_graph_image.3111954bb3145b4471e2baedd36b7d27.png",revision:null},{url:"safari-pinned-tab.d3b788368801948798336e1a0d944e23.svg",revision:null},{url:"style.05315524c6bcf1897cb4.css",revision:null}],{})}));
