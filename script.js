import h0 from './assets/hero-chunk-0.js';
import h1 from './assets/hero-chunk-1.js';
import h2 from './assets/hero-chunk-2.js';
import h3 from './assets/hero-chunk-3.js';
import l0 from './assets/logo-chunk-0.js';
import l1 from './assets/logo-chunk-1.js';
import l2 from './assets/logo-chunk-2.js';

const heroDataUrl='data:image/webp;base64,'+[h0,h1,h2,h3].join('');
const logoDataUrl='data:image/webp;base64,'+[l0,l1,l2].join('');
document.documentElement.style.setProperty('--hero-image',`url("${heroDataUrl}")`);
document.querySelectorAll('[data-logo]').forEach(img=>{img.src=logoDataUrl});
const root=document.documentElement;
const header=document.querySelector('[data-header]');
const progress=document.querySelector('.page-progress span');
const heroPhoto=document.querySelector('.hero-photo');
const cursor=document.querySelector('.cursor');
const processScenes=[...document.querySelectorAll('[data-scene]')];
const processButtons=[...document.querySelectorAll('[data-go]')];

function onScroll(){
  const y=window.scrollY;
  header.classList.toggle('scrolled',y>28);
  const doc=document.documentElement.scrollHeight-window.innerHeight;
  progress.style.width=(doc?Math.min(100,y/doc*100):0)+'%';
  if(heroPhoto && y<window.innerHeight*1.1){heroPhoto.style.transform=`scale(${1.05+y*0.00006}) translate3d(0,${y*0.035}px,0)`}
}
addEventListener('scroll',onScroll,{passive:true});onScroll();

if(matchMedia('(pointer:fine)').matches){
  addEventListener('pointermove',e=>{
    cursor.style.transform=`translate(${e.clientX-160}px,${e.clientY-160}px)`;
  },{passive:true});
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)*.08;const y=(e.clientY-r.top-r.height/2)*.08;el.style.transform=`translate(${x}px,${y}px)`});
    el.addEventListener('pointerleave',()=>el.style.transform='');
  });
}

function setScene(i){
  processScenes.forEach((s,n)=>s.classList.toggle('is-active',n===i));
  processButtons.forEach((b,n)=>b.classList.toggle('is-active',n===i));
}
processButtons.forEach(btn=>btn.addEventListener('click',()=>setScene(+btn.dataset.go)));

let current=0, timer;
function schedule(){clearInterval(timer);timer=setInterval(()=>{current=(current+1)%processScenes.length;setScene(current)},5200)}
processButtons.forEach((btn,i)=>btn.addEventListener('click',()=>{current=i;schedule()}));
schedule();

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting)e.target.classList.add('in-view');
}),{threshold:.18});
document.querySelectorAll('.project-card,.manifest-copy,.manifest-meta,.process-head').forEach(el=>observer.observe(el));
