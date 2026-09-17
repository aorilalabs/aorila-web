#!/usr/bin/env python3
"""Build the aorila-vivet static site. Run: python3 build.py (from this dir)."""
import os, shutil, json

ROOT = os.path.dirname(os.path.abspath(__file__))

CSS = r"""
/* AORILA — Vivet design study. Monochrome, one weight, sharp corners. */
:root{
  --bg:#ffffff; --ink:#000000; --hair:#dfdfdf; --btn-hover:#262626;
  --scrim:rgba(0,0,0,.15);
  --font:"Helvetica Now Text",Helvetica,Arial,"Helvetica Neue",sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-text-size-adjust:100%}
body{font-family:var(--font);font-weight:400;color:var(--ink);background:var(--bg);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-size:13px;line-height:1.6}
h1,h2,h3,h4,h5,h6{font-weight:400}
a{color:var(--ink);text-decoration:none}
button{font-family:var(--font);font-weight:400;background:none;border:0;cursor:pointer;color:var(--ink)}
img{display:block;max-width:100%}
.u{text-transform:uppercase;letter-spacing:.13em;font-size:11px}
::selection{background:#000;color:#fff}

/* ---------- header ---------- */
.header{position:fixed;top:0;left:0;right:0;height:48px;z-index:60;
  display:flex;align-items:center;justify-content:space-between;padding:0 24px;
  transition:transform .28s ease,background-color .2s ease;background:transparent}
.header--hidden{transform:translateY(-100%)}
.header--solid{background:var(--bg)}
.header__nav{display:flex;gap:28px;align-items:center}
.header__link{font-size:11px;letter-spacing:.13em;text-transform:uppercase;padding:6px 0;position:relative}
.header__wordmark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  font-size:14px;letter-spacing:.42em;text-transform:uppercase;text-indent:.42em;white-space:nowrap}
.header__wordmark img{display:block;height:20px;width:auto}
.header__tools{display:flex;gap:24px;align-items:center}
.header__menu-btn{display:none}

/* dropdown */
.scrim{position:fixed;inset:0;background:var(--scrim);opacity:0;pointer-events:none;
  transition:opacity .2s ease;z-index:58}
.scrim--on{opacity:1;pointer-events:auto}
.navdrop{position:fixed;top:48px;left:0;bottom:0;width:480px;max-width:88vw;background:var(--bg);
  z-index:59;padding:28px 32px;transform:translateX(-12px);opacity:0;pointer-events:none;
  transition:transform .2s ease,opacity .2s ease;overflow-y:auto}
.navdrop--on{transform:none;opacity:1;pointer-events:auto}
.navdrop a{display:block;padding:15px 0;font-size:14px;text-transform:uppercase;letter-spacing:.06em;
  color:rgba(0,0,0,.8);border-bottom:1px solid var(--hair)}
.navdrop a:hover{color:#000}
.navdrop a:last-child{border-bottom:0}

/* ---------- hero ---------- */
.stack{position:relative;overflow:clip;height:100svh}
.stack__pin{height:calc(100svh + 300px)}
.stack__word{position:sticky;top:56svh;z-index:2;text-align:center;pointer-events:none}
.stack__word span{font-size:clamp(44px,7.2vw,104px);letter-spacing:.4em;text-indent:.4em;
  text-transform:uppercase;color:#000}
.stack__pad{height:150px}
.stack__media{position:absolute;inset:0;z-index:0}
.stack__media img{width:100%;height:100%;object-fit:cover;will-change:transform}
.stack__shade{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(to top,rgba(0,0,0,.15),rgba(0,0,0,0) 42%)}
.hero-delivery{margin:20px 0 0;font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:600}
.hero-cta{margin-top:18px;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:auto}
.hero-cta .btn{width:min(240px,70vw);text-decoration:none}
.hero-deposit{margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}

/* ---------- footer ---------- */
.footer{border-top:1px solid var(--ink);padding:56px 24px 64px;
  display:grid;grid-template-columns:repeat(3,1fr);gap:32px;max-width:150rem;margin:0 auto}
.fcol__head{display:flex;justify-content:space-between;align-items:center;width:100%;
  padding:0 0 18px;font-size:12px;letter-spacing:.13em;pointer-events:none}
.fcol__head .pm{display:none}
.fcol__body a{display:block;padding:7px 0;font-size:13px;color:rgba(0,0,0,.82)}
.fcol__body a:hover{color:#000}

/* ---------- buttons ---------- */
.btn{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;
  width:100%;height:48px;background:var(--ink);color:#fff;border:0;border-radius:0;
  font-size:13px;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;
  transition:background-color .18s ease}
.btn:hover{background:var(--btn-hover)}
.btn .rl{position:relative;display:block;height:1.35em;line-height:1.35em;overflow:hidden}
.btn .rl i{display:block;font-style:normal;transition:transform .18s cubic-bezier(.25,.46,.45,.94)}
.btn .rl i + i{position:absolute;left:0;right:0;top:0;transform:translateY(100%)}
.btn:hover .rl i{transform:translateY(-100%)}
.btn:hover .rl i + i{transform:translateY(0)}
.btn--outline{background:#fff;color:#000;border:1px solid #000}
.btn--outline:hover{background:#000;color:#fff}
.btn[disabled]{opacity:.45;cursor:default}
.btn[disabled]:hover{background:#000}
.txtbtn{font-size:11px;letter-spacing:.13em;text-transform:uppercase}

/* ---------- collection grid ---------- */
.toolbar{display:flex;justify-content:flex-end;padding:14px 24px;border-bottom:1px solid var(--ink)}
.grid{display:grid;grid-template-columns:repeat(5,1fr);
  border-left:1px solid var(--ink)}
.card{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:block}
.card__media{position:relative;aspect-ratio:3/4;overflow:hidden;background:#fff}
.card__media img,.card__media .tile{width:100%;height:100%;object-fit:cover;
  transition:transform .35s ease}
.card:hover .card__media img{transform:scale(1.03)}
.tile{display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}
.tile span{font-size:12px;letter-spacing:.28em;text-indent:.28em;text-transform:uppercase;line-height:2.2}
.card__qv{position:absolute;left:0;right:0;bottom:0;height:44px;background:#000;color:#fff;
  font-size:11px;letter-spacing:.13em;text-transform:uppercase;
  transform:translateY(100%);transition:transform .2s ease}
.card:hover .card__qv{transform:none}
.card__info{padding:12px 14px 16px}
.card__price{font-size:12px;margin-bottom:4px}
.card__title{font-size:13px;letter-spacing:.06em;text-transform:uppercase}

/* ---------- filter drawer ---------- */
.drawer{position:fixed;top:0;right:0;bottom:0;width:440px;max-width:92vw;background:var(--bg);
  z-index:70;transform:translateX(102%);transition:transform .2s ease;
  display:flex;flex-direction:column}
.drawer--on{transform:none}
.drawer__head{display:flex;justify-content:space-between;align-items:center;
  padding:18px 24px;border-bottom:1px solid var(--hair);font-size:12px;letter-spacing:.13em;text-transform:uppercase}
.drawer__body{flex:1;overflow-y:auto;padding:8px 24px 24px}
.drawer__foot{padding:16px 24px;border-top:1px solid var(--hair)}
.facet{border-bottom:1px solid var(--hair)}
.facet__head{display:flex;justify-content:space-between;align-items:center;width:100%;
  padding:16px 0;font-size:12px;letter-spacing:.13em;text-transform:uppercase}
.facet__body{max-height:0;overflow:hidden;transition:max-height .25s ease}
.facet--open .facet__body{max-height:400px}
.facet__body .opt-row{padding:4px 0 16px;display:flex;flex-direction:column;gap:12px}
.check{display:flex;align-items:center;gap:12px;font-size:13px;cursor:pointer}
.check input{appearance:none;width:16px;height:16px;border:1px solid #000;border-radius:0;cursor:pointer;position:relative;flex:none}
.check input:checked{background:#000}
.radio{display:flex;align-items:center;gap:12px;font-size:13px;cursor:pointer}
.radio input{appearance:none;width:16px;height:16px;border:1px solid #000;border-radius:50%;cursor:pointer;flex:none}
.radio input:checked{background:#000;box-shadow:inset 0 0 0 3px #fff}
.pricerow{display:flex;gap:12px;padding-bottom:16px}
.pricerow input{width:100%;height:40px;border:1px solid #000;border-radius:0;padding:0 12px;
  font-family:var(--font);font-size:13px}

/* ---------- search dialog ---------- */
.search{position:fixed;top:110px;left:50%;transform:translate(-50%,-8px);width:676px;max-width:calc(100vw - 48px);
  max-height:calc(100dvh - 160px);background:var(--bg);z-index:70;opacity:0;pointer-events:none;
  transition:opacity .2s ease,transform .2s ease;display:flex;flex-direction:column}
.search--on{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
.search__bar{display:flex;align-items:center;gap:16px;padding:20px 24px;border-bottom:1px solid var(--hair)}
.search__bar input{flex:1;border:0;outline:0;font-family:var(--font);font-size:14px;letter-spacing:.04em}
.search__list{overflow-y:auto;padding:8px 0}
.search__row{display:flex;align-items:center;gap:18px;padding:10px 24px}
.search__row:hover{background:#f6f6f6}
.search__thumb{width:100px;height:100px;flex:none;border:1px solid var(--hair);
  display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}
.search__thumb span{font-size:9px;letter-spacing:.22em;text-indent:.22em;text-transform:uppercase;line-height:2}
.search__name{font-size:13px;margin-bottom:2px}
.search__price{font-size:12px;color:rgba(0,0,0,.7)}
.search__foot{padding:16px 24px;border-top:1px solid var(--hair)}
.search__empty{padding:32px 24px;font-size:13px;color:rgba(0,0,0,.6)}


/* ---------- product page ---------- */
.product{display:grid;grid-template-columns:1fr 1fr;min-height:calc(100svh - 48px)}
.product__info{padding:72px 56px 96px;max-width:640px}
.product__info h1{font-size:28px;letter-spacing:.06em;text-transform:uppercase;line-height:1.25;margin-bottom:10px}
.product__price{font-size:15px;margin-bottom:26px}
.product__opts{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px}
.opt{min-width:90px;height:48px;padding:0 16px;border:1px solid #000;border-radius:0;
  display:flex;align-items:center;justify-content:center;font-size:12px;letter-spacing:.04em;background:#fff}
.opt--sel{background:#000;color:#fff}
.product__note{font-size:12px;color:rgba(0,0,0,.62);line-height:1.7;margin:18px 0 30px;max-width:420px}
.product__gallery{position:relative;background:#fff;border-left:1px solid var(--ink)}
.gslide{position:absolute;inset:0;display:none}
.gslide--on{display:block}
.gslide img,.gslide .tile{width:100%;height:100%;object-fit:cover}
.gslide--fit img{object-fit:contain;background:#fff}
.gal__arrow{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;
  display:flex;align-items:center;justify-content:center;font-size:20px;z-index:3;background:rgba(255,255,255,.7)}
.gal__arrow--l{left:12px}.gal__arrow--r{right:12px}
.gal__dots{position:absolute;bottom:18px;left:0;right:0;display:flex;gap:8px;justify-content:center;z-index:3}
.gal__dots button{width:8px;height:8px;border-radius:50%;border:1px solid #000;background:transparent;padding:0}
.gal__dots button.on{background:#000}
.acc{border-top:1px solid var(--hair)}
.acc:last-child{border-bottom:1px solid var(--hair)}
.acc__head{display:flex;justify-content:space-between;align-items:center;width:100%;
  padding:18px 0;font-size:12px;letter-spacing:.13em;text-transform:uppercase;text-align:left}
.acc__body{max-height:0;overflow:hidden;transition:max-height .3s ease}
.acc__body p{font-size:13px;line-height:1.7;padding:0 0 22px;max-width:440px;color:rgba(0,0,0,.85)}
.badge{display:inline-block;border:1px solid #000;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;padding:6px 10px;margin-bottom:14px}

/* ---------- policy / simple pages ---------- */
.page{max-width:560px;margin:0 auto;padding:110px 24px 130px}
.page h1{font-size:clamp(40px,6vw,64px);line-height:1.05;margin-bottom:36px;letter-spacing:-.01em}
.page h2{font-size:20px;margin:34px 0 12px}
.page p{font-size:13px;line-height:1.7;margin-bottom:16px;color:rgba(0,0,0,.88)}
.page a{text-decoration:underline;text-underline-offset:3px}
.page--narrow{max-width:480px}
.journal__row{display:block;padding:26px 0;border-bottom:1px solid var(--hair)}
.journal__row h2{font-size:20px;margin:0 0 8px;letter-spacing:.01em}
.journal__row p{font-size:13px;color:rgba(0,0,0,.7);margin:0}
.journal__tag{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,0,0,.55);
  display:block;margin-bottom:8px}

/* ---------- mobile menu ---------- */
.mnav{position:fixed;top:0;left:0;bottom:0;width:min(420px,100vw);background:var(--bg);z-index:70;
  transform:translateX(-102%);transition:transform .2s ease;padding:14px 24px 40px;overflow-y:auto}
.mnav--on{transform:none}
.mnav__top{display:flex;justify-content:space-between;align-items:center;height:34px;margin-bottom:12px}
.mnav a.mlink{display:block;padding:15px 0;font-size:14px;text-transform:uppercase;letter-spacing:.06em;
  border-bottom:1px solid var(--hair)}
.mnav .sub a{display:block;padding:12px 0 12px 16px;font-size:13px;text-transform:uppercase;
  letter-spacing:.06em;color:rgba(0,0,0,.8);border-bottom:1px solid var(--hair)}
.mnav__acc{width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center}
/* ---------- auth pages (standalone, no header/footer) ---------- */
.authpage{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:56px 24px}
.auth-card{width:100%;max-width:400px;border:1px solid var(--ink);background:#fff;padding:40px 36px 34px}
.auth-wordmark{display:block;text-align:center;font-size:15px;letter-spacing:.42em;text-indent:.42em;text-transform:uppercase;margin-bottom:30px}
.auth-card h1{font-size:23px;letter-spacing:.05em;text-transform:uppercase;line-height:1.35;margin-bottom:10px}
.auth-card .lede{font-size:13px;color:rgba(0,0,0,.68);margin-bottom:28px}
.auth-card label{display:block;font-size:11px;letter-spacing:.13em;text-transform:uppercase;margin-bottom:20px}
.auth-card input{display:block;width:100%;height:48px;margin-top:9px;border:1px solid #000;border-radius:0;
  padding:0 14px;font-family:var(--font);font-size:14px;background:#fff}
.auth-card input:focus{outline:2px solid #000;outline-offset:-2px}
.auth-card .btn{margin-top:8px}
.auth-err{display:none;background:#000;color:#fff;font-size:12.5px;letter-spacing:.03em;line-height:1.6;
  padding:13px 15px;margin-bottom:24px}
.auth-err--on{display:block}
.auth-alt{margin-top:24px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(0,0,0,.65)}
.auth-alt a{text-decoration:underline;text-underline-offset:3px}
/* ---------- mobile ---------- */
@media (max-width:900px){
  .header{padding:0 16px}
  .header__nav{display:none}
  .header__menu-btn{display:block;font-size:11px;letter-spacing:.13em;text-transform:uppercase}
  .header__wordmark{font-size:12px}
  .header__wordmark img{height:16px}
  .header__tools{gap:16px}
  .header__account{display:none}
  .grid{grid-template-columns:repeat(2,1fr)}
  .product{grid-template-columns:1fr}
  .product__gallery{border-left:0;border-top:1px solid var(--ink);min-height:80svw;order:-1}
  .product__info{padding:40px 24px 72px}
  .footer{grid-template-columns:1fr;gap:0;padding:40px 24px 56px}
  .fcol{padding-bottom:24px}
  .drawer{width:100vw;max-width:100vw}
}
"""

JS = r"""
/* AORILA storefront interactions */
(function(){
"use strict";
var $=function(s,c){return (c||document).querySelector(s)};
var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

/* ---------- header hide/show + solid on overlay ---------- */
var header=$("#site-header"), lastY=0, overlaysOpen=0;
function paintHeader(){
  header.classList.toggle("header--solid", window.scrollY>24 || overlaysOpen>0);
}
window.addEventListener("scroll",function(){
  var y=window.scrollY;
  if(y>lastY && y>160 && overlaysOpen===0){header.classList.add("header--hidden")}
  else{header.classList.remove("header--hidden")}
  lastY=y; paintHeader();
},{passive:true});
function overlay(on){
  overlaysOpen+=on?1:-1; if(overlaysOpen<0)overlaysOpen=0;
  paintHeader();
}

/* ---------- scrim ---------- */
var scrim=$("#scrim");
function scrimOn(on){scrim.classList.toggle("scrim--on",!!on)}

/* ---------- nav dropdowns ---------- */
var drops=$$(".navdrop"), current=null, dropTimer=null;
function closeDrops(){
  if(current){current.classList.remove("navdrop--on");current=null;scrimOn(false);overlay(false)}
}
function cancelDropClose(){if(dropTimer){clearTimeout(dropTimer);dropTimer=null}}
function scheduleDropClose(){cancelDropClose();dropTimer=setTimeout(closeDrops,180)}
$$("[data-drop]").forEach(function(btn){
  var panel=document.getElementById(btn.getAttribute("data-drop"));
  btn.addEventListener("mouseenter",function(){
    cancelDropClose(); closeDrops(); current=panel; panel.classList.add("navdrop--on");
    scrimOn(true); overlay(true);
  });
});
drops.forEach(function(p){
  p.addEventListener("mouseenter",cancelDropClose);
  p.addEventListener("mouseleave",scheduleDropClose);
});
var navWrap=$("#nav-left");
if(navWrap){navWrap.addEventListener("mouseleave",scheduleDropClose)}
scrim.addEventListener("click",closeDrops);
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closeDrops();closeSearch();closeFilter();closeMenu()}});

/* ---------- mobile menu ---------- */
var mnav=$("#mnav");
function closeMenu(){if(mnav&&mnav.classList.contains("mnav--on")){mnav.classList.remove("mnav--on");scrimOn(false);overlay(false)}}
var mb=$("#menu-btn");
if(mb&&mnav){mb.addEventListener("click",function(){closeDrops();mnav.classList.add("mnav--on");scrimOn(true);overlay(true)});
$("#mnav-close").addEventListener("click",closeMenu);scrim.addEventListener("click",closeMenu)}
$$(".mnav__acc").forEach(function(b){
  b.addEventListener("click",function(){
    var s=b.nextElementSibling, open=b.classList.toggle("open");
    s.style.maxHeight=open?s.scrollHeight+"px":"0";
    b.querySelector(".pm").textContent=open?"−":"+";
  });
});

/* ---------- accordions ---------- */
$$(".acc__head").forEach(function(h){
  var body=h.nextElementSibling;
  if(h.parentElement.classList.contains("acc--open")){body.style.maxHeight=body.scrollHeight+"px"}
  h.addEventListener("click",function(){
    var acc=h.parentElement, open=acc.classList.toggle("acc--open");
    body.style.maxHeight=open?body.scrollHeight+"px":"0";
    h.querySelector(".pm").textContent=open?"−":"+";
  });
});

/* ---------- hero parallax ---------- */
var heroImg=$("#hero-img");
if(heroImg){
  var stack=$("#stack");
  window.addEventListener("scroll",function(){
    var r=stack.getBoundingClientRect(), total=r.height-window.innerHeight;
    if(total<=0)return;
    var p=Math.min(1,Math.max(0,-r.top/total));
    heroImg.style.transform="translateY("+(p*120)+"px) scale(1.08)";
  },{passive:true});
  heroImg.style.transform="scale(1.08)";
}

/* ---------- gallery ---------- */
$$(".product__gallery").forEach(function(g){
  var slides=$$(".gslide",g), dots=$$(".gal__dots button",g), i=0;
  function go(n){i=(n+slides.length)%slides.length;
    slides.forEach(function(s,k){s.classList.toggle("gslide--on",k===i)});
    dots.forEach(function(d,k){d.classList.toggle("on",k===i)});}
  var l=$(".gal__arrow--l",g), r=$(".gal__arrow--r",g);
  if(slides.length<2){if(l)l.style.display="none";if(r)r.style.display="none";
    var dz=$(".gal__dots",g); if(dz)dz.style.display="none"; return;}
  if(l)l.addEventListener("click",function(){go(i-1)});
  if(r)r.addEventListener("click",function(){go(i+1)});
  dots.forEach(function(d,k){d.addEventListener("click",function(){go(k)})});
});

/* ---------- product options ---------- */
$$(".product__opts").forEach(function(wrap){
  var priceEl=document.getElementById(wrap.getAttribute("data-price-for"));
  $$(".opt",wrap).forEach(function(b){
    b.addEventListener("click",function(){
      $$(".opt",wrap).forEach(function(o){o.classList.remove("opt--sel")});
      b.classList.add("opt--sel");
      if(priceEl&&b.getAttribute("data-price"))priceEl.textContent=b.getAttribute("data-price");
      var add=document.getElementById(wrap.getAttribute("data-add-for"));
      if(add)add.setAttribute("data-variant",b.textContent.trim());
    });
  });
});

/* ---------- search ---------- */
var searchBox=$("#search"), searchInput=$("#search-input"), searchList=$("#search-list");
var INDEX=[];
try{INDEX=JSON.parse(document.getElementById("search-index").textContent)}catch(e){}
function tile(t){return '<div class="search__thumb"><span>'+t+'</span></div>'}
function paintSearch(q){
  q=(q||"").trim().toLowerCase();
  var hits=INDEX.filter(function(it){
    return !q||it.title.toLowerCase().indexOf(q)>-1||(it.tags||"").toLowerCase().indexOf(q)>-1;
  }).slice(0,8);
  if(!hits.length){searchList.innerHTML='<div class="search__empty">No results for &ldquo;'+q.replace(/</g,"&lt;")+'&rdquo;</div>';return}
  searchList.innerHTML=(q?"":'<div class="search__empty" style="padding:8px 24px 4px">ALL</div>')+hits.map(function(it){
    return '<a class="search__row" href="'+it.url+'">'+tile(it.title)+
      '<div><div class="search__name">'+it.title+'</div><div class="search__price">'+it.price+'</div></div></a>';
  }).join("");
}
function openSearch(){closeDrops();searchBox.classList.add("search--on");scrimOn(true);overlay(true);
  paintSearch("");setTimeout(function(){searchInput.focus()},60)}
function closeSearch(){if(searchBox.classList.contains("search--on")){searchBox.classList.remove("search--on");scrimOn(false);overlay(false)}}
$$("[data-search-open]").forEach(function(b){b.addEventListener("click",openSearch)});
$("#search-close").addEventListener("click",closeSearch);
scrim.addEventListener("click",closeSearch);
if(searchInput)searchInput.addEventListener("input",function(){paintSearch(searchInput.value)});

/* ---------- filters ---------- */
var filterDrawer=$("#filter");
function openFilter(){filterDrawer.classList.add("drawer--on");scrimOn(true);overlay(true)}
function closeFilter(){if(filterDrawer&&filterDrawer.classList.contains("drawer--on")){filterDrawer.classList.remove("drawer--on");scrimOn(false);overlay(false)}}
var fb=$("#filter-open");
if(fb)fb.addEventListener("click",openFilter);
var fc=$("#filter-close"); if(fc)fc.addEventListener("click",closeFilter);
scrim.addEventListener("click",closeFilter);
$$(".facet__head").forEach(function(h){
  h.addEventListener("click",function(){
    var f=h.parentElement, open=f.classList.toggle("facet--open");
    h.querySelector(".pm").textContent=open?"−":"+";
  });
});
var grid=$("#product-grid");
function applyFilters(){
  if(!grid)return;
  var sort=(document.querySelector('input[name="sort"]:checked')||{}).value||"featured";
  var cats=$$(".fcat:checked").map(function(c){return c.value});
  var lo=parseFloat(($("#f-lo")||{}).value)||0, hi=parseFloat(($("#f-hi")||{}).value)||Infinity;
  var cards=$$(".card",grid).filter(function(card){
    var cat=card.getAttribute("data-cat"), price=parseFloat(card.getAttribute("data-price"));
    if(cats.length&&cats.indexOf(cat)<0)return false;
    if(!isNaN(price)&&(price<lo||price>hi))return false;
    return true;
  });
  cards.sort(function(a,b){
    var pa=parseFloat(a.getAttribute("data-price")), pb=parseFloat(b.getAttribute("data-price"));
    if(sort==="lo"){pa=isNaN(pa)?Infinity:pa;pb=isNaN(pb)?Infinity:pb;return pa-pb}
    if(sort==="hi"){pa=isNaN(pa)?-1:pa;pb=isNaN(pb)?-1:pb;return pb-pa}
    return 0;
  });
  cards.forEach(function(c){grid.appendChild(c)});
  $$(".card",grid).forEach(function(c){c.style.display=cards.indexOf(c)>-1?"":"none"});
  var n=cards.length;
  $("#filter-n").textContent=n;
  $("#see-n").textContent="SEE "+n+(n===1?" ITEM":" ITEMS");
  var fh=$("#filter-count"); if(fh)fh.textContent="FILTER ("+n+")";
}
var seeBtn=$("#see-n");
if(seeBtn)seeBtn.addEventListener("click",function(){applyFilters();closeFilter()});
["change"].forEach(function(ev){
  document.addEventListener(ev,function(e){
    if(e.target.closest&&e.target.closest("#filter"))applyFilters();
  });
});
if(grid)applyFilters();
})();
"""

# ---------------------------------------------------------------- data ---

NAV = [
    {"label": "Robotics", "href": "robots/", "drop": "drop-robots", "children": [
        ("Home Robot", "robots/home-robot/"),
        ("Presale", "https://robotics.aorila.com"),
        ("Journal", "journal/"),
        ("Company", "contact/"),
    ]},
    {"label": "Divisions", "href": "divisions/", "drop": "drop-divisions", "children": [
        ("Aorila", "https://aorila.com/"),
        ("Atraly", "https://atraly.com/"),
        ("Aorila Labs", "https://aorilalabs.com/"),
    ]},
]

# products: id, title, url, price display, numeric price (or None), cat, tile label, kind
PRODUCTS = {
    "home-robot": dict(title="Home Robot", url="robots/home-robot/", price="$4,999",
                     num=4999, cat="Hardware", tile="Home Robot", img="assets/hero.jpg",
                     cta="purchase",
                     presale_url="https://robotics.aorila.com"),
}

COLLECTIONS = {
    "divisions": dict(items=[
        dict(title="Aorila", url="https://aorila.com/", price="The parent company &middot; Robotics", num=None, cat="Company", tile="Aorila"),
        dict(title="Aorila Labs", url="https://aorilalabs.com/", price="Compute &middot; Live now", num=None, cat="Company", tile="Aorila Labs"),
        dict(title="Atraly", url="https://atraly.com/", price="Personal AI &middot; Live now", num=None, cat="Company", tile="Atraly"),
    ]),
    "robots": dict(items=["home-robot"]),
}

SEARCH_INDEX = [
    dict(title="Divisions", price="Aorila · Aorila Labs · Atraly", url="divisions/", tags="divisions company labs atraly robots"),
    dict(title="Home Robot", price="$50 refundable deposit", url="robots/home-robot/", tags="robots home robot presale humanoid reserve deposit"),
    dict(title="Journal", price="Coming soon", url="journal/", tags="journal articles blog"),
    dict(title="Contact", price="info@aorila.com", url="contact/", tags="contact email support company"),
    dict(title="Terms of Service", price="", url="policies/terms.html", tags="terms legal policy"),
    dict(title="Privacy Policy", price="", url="policies/privacy.html", tags="privacy legal policy"),
    dict(title="Website Accessibility", price="", url="policies/accessibility.html", tags="accessibility legal policy"),
]

FOOTER = [
    ("Policies", [("Terms of Service", "policies/terms.html"), ("Privacy Policy", "policies/privacy.html"),
                  ("Website Accessibility", "policies/accessibility.html")]),
    ("Support", [("Contact Us", "contact/"), ("System Status", "https://aorilalabs.com/status"),
                 ("Support", "https://dashboard.aorilalabs.com/support")]),
    ("Divisions", [("Divisions", "divisions/"), ("Robotics", "robots/"), ("Atraly", "https://atraly.com/"), ("Aorila Labs", "https://aorilalabs.com/")]),
]

# ------------------------------------------------------------ templates ---

def header_html(pre):
    links = []
    for n in NAV:
        if n["drop"]:
            links.append('<a class="header__link" href="%s%s" data-drop="%s">%s</a>'
                         % (pre, n["href"], n["drop"], n["label"]))
        else:
            links.append('<a class="header__link" href="%s%s">%s</a>'
                         % ("" if n["href"].startswith("http") else pre, n["href"], n["label"]))
    drops = []
    for n in NAV:
        if n["drop"]:
            kids = "".join('<a href="%s%s">%s</a>' % ("" if u.startswith("http") else pre, u, l)
                           for l, u in n["children"])
            drops.append('<div class="navdrop" id="%s">%s</div>' % (n["drop"], kids))
    msubs = []
    for n in NAV:
        if n["drop"]:
            kids = "".join('<a href="%s%s">%s</a>' % ("" if u.startswith("http") else pre, u, l)
                           for l, u in n["children"])
            msubs.append('<button class="mlink mnav__acc" style="width:100%%;text-align:left;display:flex;justify-content:space-between">%s <span class="pm">+</span></button><div class="sub" style="max-height:0;overflow:hidden;transition:max-height .25s">%s</div>'
                         % (n["label"], kids))
        else:
            msubs.append('<a class="mlink" href="%s%s">%s</a>'
                         % ("" if n["href"].startswith("http") else pre, n["href"], n["label"]))
    return """
<header class="header" id="site-header">
  <button class="header__menu-btn" id="menu-btn">Menu</button>
  <nav class="header__nav" id="nav-left">%s</nav>
  <a class="header__wordmark" href="%s"><img src="%sassets/img/logo.svg" alt="Aorila"></a>
  <div class="header__tools">
    <button class="header__link" data-search-open>Search</button>
    <a class="header__link header__account" href="https://console.aorila.com/account">Account</a>
  </div>
</header>
%s
<div class="mnav" id="mnav">
  <div class="mnav__top"><span class="u">Menu</span><button class="txtbtn" id="mnav-close">Close</button></div>
  %s
  <a class="mlink" href="https://console.aorila.com/account">Account</a>
</div>""" % ("".join(links), pre, pre, "".join(drops), "".join(msubs))


def drawers_html(pre):
    return """
<div class="scrim" id="scrim"></div>

<div class="search" id="search" role="dialog" aria-label="Search">
  <div class="search__bar">
    <input id="search-input" type="text" placeholder="Search" autocomplete="off">
    <button class="txtbtn" id="search-close">Close</button>
  </div>
  <div class="search__list" id="search-list"></div>
  <div class="search__foot"><a class="btn" href="%sdivisions/"><span class="rl"><i>View all</i><i aria-hidden="true">View all</i></span></a></div>
</div>

<aside class="drawer" id="filter" aria-label="Filter">
  <div class="drawer__head"><span id="filter-count">Filter</span><button class="txtbtn" id="filter-close">Close</button></div>
  <div class="drawer__body">
    <div class="facet facet--open"><button class="facet__head">Sort <span class="pm">−</span></button>
      <div class="facet__body"><div class="opt-row">
        <label class="radio"><input type="radio" name="sort" value="featured" checked> Featured</label>
        <label class="radio"><input type="radio" name="sort" value="lo"> Price: low to high</label>
        <label class="radio"><input type="radio" name="sort" value="hi"> Price: high to low</label>
      </div></div></div>
    <div class="facet"><button class="facet__head">Category <span class="pm">+</span></button>
      <div class="facet__body"><div class="opt-row">
        <label class="check"><input type="checkbox" class="fcat" value="Hardware"> Hardware</label>
        <label class="check"><input type="checkbox" class="fcat" value="Service"> Service</label>
                <label class="check"><input type="checkbox" class="fcat" value="Plan"> Plan</label>
        <label class="check"><input type="checkbox" class="fcat" value="Company"> Company</label>
      </div></div></div>
    <div class="facet"><button class="facet__head">Price <span class="pm">+</span></button>
      <div class="facet__body"><div class="pricerow">
        <input id="f-lo" type="number" min="0" placeholder="Low">
        <input id="f-hi" type="number" min="0" placeholder="High">
      </div></div></div>
  </div>
  <div class="drawer__foot"><button class="btn" id="see-n"><span class="rl"><i>See items</i><i aria-hidden="true">See items</i></span></button></div>
</aside>

<script type="application/json" id="search-index">%s</script>
""" % (pre, json.dumps(SEARCH_INDEX).replace("</", "<\\/"))


def footer_html(pre):
    cols = []
    for head, links in FOOTER:
        ls = "".join('<a href="%s%s">%s</a>' % ("" if u.startswith("http") else pre, u, l) for l, u in links)
        cols.append('<div class="fcol"><button class="fcol__head">%s <span class="pm">+</span></button><div class="fcol__body">%s</div></div>'
                    % (head, ls))
    return '<footer class="footer">%s</footer>' % "".join(cols)


def page_shell(pre, title, body, extra_head=""):
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s — Aorila</title>
<link rel="icon" href="%sfavicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="%sassets/css/style.css">
%s</head>
<body>
%s
<main>%s</main>
%s
%s
<script src="%sassets/js/main.js"></script>
</body>
</html>""" % (title, pre, pre, extra_head, header_html(pre), body, footer_html(pre), drawers_html(pre), pre)


def card_html(pre, item):
    href = item["url"] if item["url"].startswith("http") else pre + item["url"]
    media = ('<img src="%s%s" alt="%s" loading="lazy">' % (pre, item["img"], item["title"])) if item.get("img") \
        else '<div class="tile"><span>%s</span></div>' % item["tile"]
    return """<a class="card" href="%s" data-cat="%s" data-price="%s">
  <div class="card__media">%s<button class="card__qv" tabindex="-1">Quick view</button></div>
  <div class="card__info"><div class="card__price">%s</div><div class="card__title">%s</div></div>
</a>""" % (href, item["cat"], item["num"] if item["num"] is not None else "",
           media, item["price"], item["title"])


def collection_body(pre, items):
    cards = "".join(card_html(pre, it if isinstance(it, dict) else PRODUCTS[it]) for it in items)
    return """
<div style="height:48px"></div>
<div class="toolbar"><button class="txtbtn" id="filter-open">Filter <span id="filter-n"></span></button></div>
<div class="grid" id="product-grid">%s</div>""" % cards

# ----------------------------------------------------------------- copy ---

DETAILS = {
    "home-robot": [
        ("Description", True, "The Aorila home robot — a user-friendly humanoid that helps with everyday tasks, with zero setup required. Reserve yours with a $50 refundable deposit."),
        ("Specifications", False, "Our mission: to bring advanced robotics into every home — a user-friendly robot with an intuitive interface that helps people with everyday tasks. Full specifications will be published as the presale progresses."),
        ("Billing & Terms", False, "A $50 refundable deposit reserves your place in the presale. The full price is $4,999 — pay in full or monthly, no subscription, ever. Deposit and presale terms are handled at robotics.aorila.com."),
        ("Delivery", False, "Presale — reserve through the presale page. Delivery timelines will be announced to reservation holders first."),
    ],
}

JOURNAL = [
    ("Why per-minute billing", "Cloud compute bills by the hour. We think the minute is the honest unit.", "Coming soon"),
    ("The trust moat", "Why security and transparency are the product, not the marketing.", "Coming soon"),
    ("Compute that stops at zero", "Your workload stops when your balance does. No overages, no surprises.", "Coming soon"),
]


def product_body(pre, pid):
    p = PRODUCTS[pid]
    badge = '<span class="badge">%s</span>' % p["badge"] if p.get("badge") else ""
    opts = ""
    if p.get("options"):
        btns = "".join('<button class="opt%s" data-price="%s">%s</button>'
                       % (" opt--sel" if i == 0 else "", pr, lb) for i, (lb, pr) in enumerate(p["options"]))
        opts = '<div class="product__opts" data-price-for="p-price" data-add-for="p-add">%s</div>' % btns
    if p["cta"] == "purchase":
        base = p.get("presale_url", "https://robotics.aorila.com")
        cta = ('<a class="btn" href="%s?choice=deposit">'
               '<span class="rl"><i>$50 Refundable Deposit</i><i aria-hidden="true">$50 Refundable Deposit</i></span></a>'
               '<a class="btn btn--outline" href="%s?choice=full" style="margin-top:10px">'
               '<span class="rl"><i>Buy Outright \u2014 $4,999</i><i aria-hidden="true">Buy Outright \u2014 $4,999</i></span></a>'
               '<p class="product__note">No subscription, ever. The deposit reserves your presale place and is fully refundable.</p>'
               % (base, base))
    elif p["cta"] == "view":
        cta = ('<a class="btn" href="%s"><span class="rl"><i>%s</i><i aria-hidden="true">%s</i></span></a>'
               % (p["cta_url"], p["cta_label"], p["cta_label"]))
    else:
        cta = ('<button class="btn" disabled><span class="rl"><i>Coming soon</i><i aria-hidden="true">Coming soon</i></span></button>')
    accs = "".join(
        '<div class="acc%s"><button class="acc__head">%s <span class="pm">%s</span></button><div class="acc__body"><p>%s</p></div></div>'
        % (" acc--open" if op else "", t, "−" if op else "+", c) for t, op, c in DETAILS[pid])
    if p.get("img"):
        slides = '<div class="gslide gslide--on gslide--fit"><img src="%s%s" alt="%s"></div>' % (pre, p["img"], p["title"])
    else:
        slides = '<div class="gslide gslide--on"><div class="tile"><span style="font-size:15px">%s</span></div></div>' % p["tile"]
    return """
<div style="height:48px"></div>
<div class="product">
  <div class="product__info">
    %s
    <h1>%s</h1>
    <div class="product__price" id="p-price">%s</div>
    %s
    %s
    <div class="product__note">Billed honestly. No hidden fees, no fake urgency.</div>
    %s
  </div>
  <div class="product__gallery">
    %s
    <button class="gal__arrow gal__arrow--l" aria-label="Previous">←</button>
    <button class="gal__arrow gal__arrow--r" aria-label="Next">→</button>
    <div class="gal__dots"><button class="on" aria-label="Slide 1"></button></div>
  </div>
</div>""" % (badge, p["title"], p["options"][0][1] if p.get("options") else p["price"], opts, cta, accs, slides)

def auth_shell(title, body):
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s \u2014 Aorila</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<main class="authpage">%s</main>
<script>
(function(){
  "use strict";
  var q = new URLSearchParams(location.search);
  var err = q.get("error"), email = q.get("email"), next = q.get("next");
  if (err) {
    var box = document.getElementById("auth-err");
    box.textContent = err;
    box.classList.add("auth-err--on");
  }
  if (email) {
    var em = document.getElementById("f-email");
    if (em) em.value = email;
  }
  if (next && next.charAt(0) === "/" && next.charAt(1) !== "/") {
    var nx = document.getElementById("f-next");
    if (nx) nx.value = next;
  }
})();
</script>
</body>
</html>""" % (title, body)


def auth_body(mode):
    signup = (mode == "signup")
    action = "https://console.aorila.com/signup" if signup else "https://console.aorila.com/login"
    title = "Create an Aorila account." if signup else "Sign in to Aorila."
    btn = "Create account" if signup else "Sign in"
    name_field = ('<label>Name<input id="f-name" name="name" required autocomplete="name"></label>'
                  if signup else "")
    pw_auto = "new-password" if signup else "current-password"
    alt = ('Already have an account? <a href="../login/">Sign in</a>.' if signup
           else 'No account? <a href="../signup/">Create one</a>.')
    return """
<div class="auth-card">
  <a class="auth-wordmark" href="../">Aorila</a>
  <div class="auth-err" id="auth-err" role="alert"></div>
  <h1>%s</h1>
  <p class="lede">One login for Aorila, Aorila Labs, and Atraly.</p>
  <form method="post" action="%s">
    <input type="hidden" id="f-next" name="next" value="/account">
    %s
    <label>Email<input id="f-email" name="email" type="email" required autocomplete="email"></label>
    <label>Password<input name="password" type="password" required minlength="8" autocomplete="%s"></label>
    <button class="btn" type="submit"><span class="rl"><i>%s</i><i aria-hidden="true">%s</i></span></button>
  </form>
  <p class="auth-alt">%s</p>
</div>""" % (title, action, name_field, pw_auto, btn, btn, alt)


# ------------------------------------------------------------------ main ---

def home_body():
    return """
<section class="stack" id="stack">
  <div class="stack__pin"><div class="stack__word"><span>Aorila</span>
    <p class="hero-delivery">Early 2028 delivery</p>
    <div class="hero-cta">
      <a class="btn" href="https://robotics.aorila.com"><span class="rl"><i>Order Now</i><i aria-hidden="true">Order Now</i></span></a>
      <p class="hero-deposit">$50 refundable deposit</p>
    </div>
  </div></div>
  <div class="stack__pad"></div>
  <div class="stack__media"><img id="hero-img" src="assets/hero.jpg" alt="Aorila home robot"></div>
  <div class="stack__shade"></div>
</section>"""


def journal_body(pre):
    rows = "".join(
        '<div class="journal__row"><span class="journal__tag">%s</span><h2>%s</h2><p>%s</p></div>' % (tag, t, d)
        for t, d, tag in JOURNAL)
    return '<div class="page"><h1>Journal</h1>%s</div>' % rows


def contact_body(pre):
    return """<div class="page page--narrow"><h1>Contact</h1>
<p>For anything about Aorila — the company, the divisions, or the robot — write to <a href="mailto:info@aorila.com">info@aorila.com</a>.</p>
<p>Aorila is headquartered in Columbia, South Carolina.</p>
<h2>Divisions</h2>
<p>Compute: <a href="https://aorilalabs.com">aorilalabs.com</a><br>
Personal AI: <a href="https://atraly.com">atraly.com</a><br>
Robot presale: <a href="https://robotics.aorila.com">robotics.aorila.com</a></p>
<p>Live system status: <a href="https://aorilalabs.com/status">aorilalabs.com/status</a></p></div>"""


def policy_body(title, paras):
    ps = "".join("<p>%s</p>" % x for x in paras)
    return '<div class="page page--narrow"><h1>%s</h1>%s</div>' % (title, ps)


TERMS = [
    "These terms govern your use of this website, which presents Aorila and its divisions: Aorila Labs (compute), Atraly (personal AI), and Aorila Robots.",
    "Accounts, billing, and compute services are provided through the Aorila Labs dashboard at dashboard.aorilalabs.com and are subject to the terms presented there at signup and checkout.",
    "Compute is billed per minute from a prepaid credit balance at 1 credit = $1. Workloads stop automatically when a balance reaches $0; you can never be charged beyond what you have topped up.",
    "Everything on this site is presented honestly. We do not publish statistics, testimonials, or availability claims we cannot verify.",
    "If you have questions about these terms, contact info@aorila.com.",
]
PRIVACY = [
    "This website itself collects the minimum needed to function. We do not sell personal data.",
    "If you create an account on the Aorila Labs dashboard, we store your account email and the records needed to operate your services — usage metering for billing, API keys you issue, and support correspondence.",
    "Analytics, where used, are aggregate and anonymous. We do not use your data to train models without your explicit consent.",
    "To request a copy or deletion of your account data, write to info@aorila.com.",
]
ACCESS = [
    "We want Aorila's websites to be usable by everyone. We aim for clear contrast, keyboard-navigable interfaces, and text alternatives for meaningful imagery.",
    "This is an ongoing effort. If you encounter an accessibility barrier on this site, please tell us at info@aorila.com and we will address it.",
]


def write(path, html):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(html)
    return path


def main():
    # assets
    os.makedirs(os.path.join(ROOT, "assets/css"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "assets/js"), exist_ok=True)
    with open(os.path.join(ROOT, "assets/css/style.css"), "w") as f:
        f.write(CSS)
    with open(os.path.join(ROOT, "assets/js/main.js"), "w") as f:
        f.write(JS)
    with open(os.path.join(ROOT, "favicon.svg"), "w") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#000"/><text x="32" y="45" font-family="Arial,sans-serif" font-size="38" font-weight="bold" fill="#fff" text-anchor="middle">A</text></svg>\n')
    hero_src = os.path.join(ROOT, "assets/media-generation-hero-robot-0-e75cd1e3-94aa-4c9b-9811-54e2c90e6b9d.jpg")
    hero_dst = os.path.join(ROOT, "assets/hero.jpg")
    if os.path.exists(hero_src):
        shutil.copyfile(hero_src, hero_dst)

    pages = []
    # home
    pages.append(write("index.html", page_shell("", "Aorila", home_body())))
    # collections
    pages.append(write("divisions/index.html",
                       page_shell("../", "Divisions", collection_body("../", COLLECTIONS["divisions"]["items"]))))
    pages.append(write("robots/index.html",
                       page_shell("../", "Robots", collection_body("../", COLLECTIONS["robots"]["items"]))))
    # products
    for pid, p in PRODUCTS.items():
        pages.append(write(p["url"] + "index.html",
                           page_shell("../../", p["title"], product_body("../../", pid))))
    # journal / contact / policies
    pages.append(write("journal/index.html", page_shell("../", "Journal", journal_body("../"))))
    pages.append(write("contact/index.html", page_shell("../", "Contact", contact_body("../"))))
    pages.append(write("policies/terms.html", page_shell("../", "Terms of Service", policy_body("Terms of service", TERMS))))
    pages.append(write("policies/privacy.html", page_shell("../", "Privacy Policy", policy_body("Privacy policy", PRIVACY))))
    pages.append(write("policies/accessibility.html", page_shell("../", "Website Accessibility", policy_body("Website accessibility", ACCESS))))
    pages.append(write("signup/index.html", auth_shell("Create account", auth_body("signup"))))
    pages.append(write("login/index.html", auth_shell("Sign in", auth_body("login"))))
    print("wrote %d pages" % len(pages))
    for pth in pages:
        print(" -", pth)


if __name__ == "__main__":
    main()
