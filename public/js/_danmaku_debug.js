// Simulate browser environment minimally
const { JSDOM } = require('jsdom');
const http = require('http');

async function test() {
  // Fetch the page
  const html = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
  
  // Fetch the CSS
  const css = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/css/style.css?v=11', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  // Fetch the JS
  const js = await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/js/app.js?v=11', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  // Create JSDOM
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  
  const document = dom.window.document;
  
  // Check if danmaku bar exists
  const bar = document.getElementById('homeDanmakuBar');
  console.log('homeDanmakuBar exists:', !!bar);
  console.log('homeDanmakuBar classes:', bar ? bar.className : 'N/A');
  
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Check computed styles (approximate)
  const secOpening = document.getElementById('secOpening');
  console.log('secOpening exists:', !!secOpening);
  console.log('secOpening classes:', secOpening ? secOpening.className : 'N/A');
  
  // Check if JS has the functions
  console.log('JS has startHomeDanmaku:', js.includes('function startHomeDanmaku'));
  console.log('JS has spawnDanmakuItem:', js.includes('function spawnDanmakuItem'));
  console.log('JS has loadBlessings:', js.includes('function loadBlessings'));
  console.log('JS has DOMContentLoaded:', js.includes('DOMContentLoaded'));
  
  // Check CSS animation
  const hasKeyframes = css.includes('@keyframes danmakuScroll');
  const hasAnimation = css.includes('animation: danmakuScroll');
  console.log('CSS has @keyframes danmakuScroll:', hasKeyframes);
  console.log('CSS has animation: danmakuScroll:', hasAnimation);
  
  // Check if danmaku items would be visible
  const danmakuItemCSS = css.match(/\.danmaku-item\s*\{[^}]+\}/g);
  if (danmakuItemCSS) {
    danmakuItemCSS.forEach((rule, i) => {
      console.log('danmaku-item rule ' + i + ':', rule.substring(0, 100));
    });
  }
  
  // Check for overflow:hidden on sec-opening
  const secOpeningCSS = css.match(/\.sec-opening\s*\{[^}]+\}/);
  if (secOpeningCSS) {
    console.log('sec-opening CSS:', secOpeningCSS[0].substring(0, 150));
    console.log('Has overflow:hidden:', secOpeningCSS[0].includes('overflow: hidden') || secOpeningCSS[0].includes('overflow:hidden'));
  }
  
  dom.window.close();
}

test().catch(e => console.error(e));
