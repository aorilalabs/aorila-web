
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
document.addEventListener("keydown",function(e){if(e.key==="Escape"){closeDrops();closeSearch();closeBag();closeFilter();closeMenu()}});

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

/* ---------- footer disclosures (mobile) ---------- */
$$(".fcol__head").forEach(function(h){
  h.addEventListener("click",function(){
    var c=h.parentElement, open=c.classList.toggle("fcol--open");
    h.querySelector(".pm").textContent=open?"−":"+";
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

/* ---------- bag ---------- */
var BAG_KEY="aorila_bag_v1";
function bagGet(){try{return JSON.parse(localStorage.getItem(BAG_KEY))||[]}catch(e){return[]}}
function bagSet(b){localStorage.setItem(BAG_KEY,JSON.stringify(b));bagPaint()}
function bagCount(){return bagGet().reduce(function(n,i){return n+i.qty},0)}
function bagTotal(){return bagGet().reduce(function(n,i){return n+i.qty*i.price},0)}
var bagDrawer=$("#bag"), bagItems=$("#bag-items"), bagFoot=$("#bag-foot"), bagN=$("#bag-n");
function bagPaint(){
  var b=bagGet();
  bagN.textContent=bagCount()>0?" ("+bagCount()+")":"";
  if(!b.length){
    bagItems.innerHTML='<div class="bag__empty">Your bag is empty</div><button class="btn" id="bag-empty-x"><span class="rl"><i>Continue browsing</i><i aria-hidden="true">Continue browsing</i></span></button>';
    bagFoot.style.display="none";
    var bx=$("#bag-empty-x"); if(bx)bx.addEventListener("click",closeBag);
    return;
  }
  bagFoot.style.display="block";
  bagItems.innerHTML=b.map(function(it,idx){
    return '<div class="bagitem"><div class="bagitem__thumb"><span>'+it.title+'</span></div>'+
    '<div class="bagitem__info"><div class="bagitem__title">'+it.title+'</div>'+
    '<div class="bagitem__var">'+it.variant+'</div>'+
    '<div class="bagitem__row"><span class="qty"><button data-a="dec" data-i="'+idx+'">−</button><span>'+it.qty+'</span><button data-a="inc" data-i="'+idx+'">+</button></span>'+
    '<span class="bagitem__price">$'+(it.price*it.qty).toFixed(2)+'</span></div>'+
    '<button class="bagitem__rm" data-a="rm" data-i="'+idx+'">Remove</button></div></div>';
  }).join("");
  $("#bag-total").textContent="$"+bagTotal().toFixed(2)+" USD";
  $$("#bag-items [data-a]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var bb=bagGet(), i=+btn.getAttribute("data-i"), a=btn.getAttribute("data-a");
      if(a==="inc")bb[i].qty++;
      if(a==="dec")bb[i].qty=Math.max(1,bb[i].qty-1);
      if(a==="rm")bb.splice(i,1);
      bagSet(bb);
    });
  });
}
function openBag(){closeDrops();bagDrawer.classList.add("drawer--on");scrimOn(true);overlay(true);bagPaint()}
function closeBag(){if(bagDrawer.classList.contains("drawer--on")){bagDrawer.classList.remove("drawer--on");scrimOn(false);overlay(false)}}
$("#bag-open").addEventListener("click",openBag);
$("#bag-close").addEventListener("click",closeBag);
$("#bag-continue").addEventListener("click",closeBag);
scrim.addEventListener("click",closeBag);
$$("[data-add]").forEach(function(btn){
  btn.addEventListener("click",function(){
    var b=bagGet(), id=btn.getAttribute("data-add");
    var priceEl=document.getElementById(btn.getAttribute("data-price-for")||"p-price");
    var price=parseFloat((priceEl.textContent||"").replace(/[^0-9.]/g,""))||0;
    var variant=btn.getAttribute("data-variant")||"Standard";
    var found=null;
    b.forEach(function(it){if(it.id===id&&it.variant===variant)found=it});
    if(found)found.qty++; else b.push({id:id,title:btn.getAttribute("data-title"),variant:variant,price:price,qty:1});
    bagSet(b); openBag();
  });
});
bagPaint();

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
