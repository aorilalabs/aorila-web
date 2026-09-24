
/* AORILA storefront interactions */
/* build 2026-09-17: search removed, press added */
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
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closeDrops();closeFilter();closeMenu()}});

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


})();
