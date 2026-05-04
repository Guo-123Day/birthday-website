/* ============================================
   时光纪念册 v6 — 核心交互逻辑
   ============================================ */

/* ===== 可配置变量 ===== */
var BIRTH_DATE = new Date(2000, 4, 31); // 出生日期 2000-05-31
function calcCurrentAge() {
  var now = new Date();
  return now.getFullYear() - BIRTH_DATE.getFullYear();
}
var currentMainAge = calcCurrentAge();
var ageList = [];
for (var _ageI = 1; _ageI <= currentMainAge; _ageI++) ageList.push(_ageI);
var petList = [
  { group: '猫咪家族', pets: [
    { id: 'laifu', name: '来福', emoji: '🐱' },
    { id: 'wangcai', name: '旺财', emoji: '🐱' },
    { id: 'duofu', name: '多福', emoji: '🐱' }
  ]},
  { group: '蜜袋鼯家族', pets: [
    { id: 'yuanbao', name: '元宝', emoji: '🐹' },
    { id: 'zhaocai', name: '招财', emoji: '🐹' },
    { id: 'jinbao', name: '进宝', emoji: '🐹' }
  ]}
];
var anniversaryList = [
  { key: 'anni1', label: '初见', date: '2023年02月08日', sub: '故事的开始' },
  { key: 'anni2', label: '相恋', date: '2023年02月24日', sub: '心动的官宣' },
  { key: 'anni3', label: '余生', date: '2025年09月17日', sub: '合法的陪伴' }
];

/* ===== 全局状态 ===== */
var albumPhotos = [];
var albumIndex = 0;
var currentYearAge = null;
var currentPetId = null;
var danmakuOn = true;
var danmakuTimer = null;
var homeDanmakuTimer = null;

/* ===== 工具函数 ===== */
function scrollToSection(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
function compressImage(file, maxW, maxH, q, cb) {
  maxW=maxW||1200; maxH=maxH||1200; q=q||0.8;
  var r = new FileReader();
  r.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w=img.width, h=img.height;
      if (w>maxW){h=h*maxW/w;w=maxW;} if (h>maxH){w=w*maxH/h;h=maxH;}
      var c = document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      c.toBlob(function(b){cb(b);},'image/jpeg',q);
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(file);
}
function validateImage(file) {
  var allowed = ['image/jpeg','image/png','image/gif','image/webp'];
  if (!allowed.includes(file.type)) {
    alert('只支持 jpg/png/gif/webp 格式'); return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('图片不能超过 10MB'); return false;
  }
  return true;
}
function fmtDate(d) {
  var dt=new Date(d), m=dt.getMonth()+1, dy=dt.getDate(), h=dt.getHours(), mn=dt.getMinutes();
  return dt.getFullYear()+'年'+(m<10?'0':'')+m+'月'+(dy<10?'0':'')+dy+'日 '+(h<10?'0':'')+h+':'+(mn<10?'0':'')+mn;
}

/* ===== 开场动画 ===== */
function initOpening() {
  currentMainAge = calcCurrentAge();
  var t=document.getElementById('openTitle'); if(t) t.textContent=currentMainAge+'岁 · 生日快乐';
  var a=document.getElementById('currentAgeText'); if(a) a.textContent=currentMainAge;
  var ct=document.getElementById('currentTitle'); if(ct) ct.textContent=currentMainAge+'岁 · 限定美好';
  function upd() {
    var now=new Date(), diff=now-BIRTH_DATE;
    var d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    var el=function(i){return document.getElementById(i);};
    if(el('ocDays'))el('ocDays').textContent=d;
    if(el('ocHours'))el('ocHours').textContent=h;
    if(el('ocMins'))el('ocMins').textContent=m;
    if(el('ocSecs'))el('ocSecs').textContent=s;
  }
  upd(); setInterval(upd,1000);
  var el=document.getElementById('currentCountdown');
  if(el){
    var now=new Date(), yr=now.getFullYear(), bd=new Date(yr,4,31);
    if(now>bd) bd=new Date(yr+1,4,31);
    var nextAge=bd.getFullYear()-BIRTH_DATE.getFullYear();
    var diff=Math.ceil((bd-now)/86400000);
    if(now.getMonth()===4&&now.getDate()===31) {
      el.innerHTML='<div class="countdown-label">🎂 今天是她的生日！</div><div class="countdown-days">生日快乐</div>';
    } else {
      el.innerHTML='<div class="countdown-label">距离'+nextAge+'岁生日</div><div class="countdown-days">'+diff+'</div><div class="countdown-unit">天</div>';
    }
  }
}

/* ===== 纪念日板块 ===== */
function renderAnniversary() {
  var c=document.getElementById('anniScroll'); if(!c)return; c.innerHTML='';
  fetch('/api/anniversary').then(function(r){return r.json();}).then(function(anniData){
    anniversaryList.forEach(function(item){
      var photos=anniData[item.key]||[];
      var coverHtml=photos.length?'<img src="'+photos[0].url+'" alt="'+item.label+'">':'<div class="anni-placeholder">📷</div>';
      var card=document.createElement('div');
      card.className='anni-card';
      card.innerHTML='<div class="anni-card-photo">'+coverHtml+'</div><div class="anni-card-body"><p class="anni-label">'+item.label+'</p><p class="anni-date">'+item.date+'</p><p class="anni-sub">'+item.sub+'</p></div>';
      card.onclick=function(){openAnniversaryDetail(item.key,item.label);};
      c.appendChild(card);
    });
  });
}

function openAnniversaryDetail(key,label) {
  fetch('/api/anniversary').then(function(r){return r.json();}).then(function(data){
    var photos=data[key]||[];
    albumPhotos=photos.map(function(p){return p.url;});
    if(!albumPhotos.length){albumPhotos=['data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#F8F6F4" width="400" height="300"/><text fill="#D4B996" x="200" y="150" text-anchor="middle" font-size="18">暂无照片</text></svg>')];}
    albumIndex=0;
    var modal=document.getElementById('albumModal');
    var filters=document.getElementById('albumFilters');
    if(filters)filters.style.display='none';
    if(modal){modal.classList.add('active');document.body.style.overflow='hidden';}
    renderAlbumSlide();
  });
}

/* ===== 年龄网格 ===== */
function renderYearGrid() {
  var c=document.getElementById('yearGrid'); if(!c)return; c.innerHTML='';
  Promise.all(ageList.map(function(age){
    return fetch('/api/year/'+age).then(function(r){return r.json();}).catch(function(){return {};});
  })).then(function(results){
    ageList.forEach(function(age,i){
      var data=results[i]||{};
      var card=document.createElement('div');
      card.className='year-card'+(age===currentMainAge?' highlight':'');
      if(data.cover){
        card.innerHTML='<img src="'+data.cover+'" alt="'+age+'岁"><div class="year-overlay">'+age+'岁</div>';
      } else {
        card.innerHTML='<span class="year-num">'+age+'</span><span class="year-label">岁</span>';
      }
      card.onclick=function(){openYearModal(age);};
      c.appendChild(card);
    });
  });
}

/* ===== 宠物板块 ===== */
function renderPets() {
  var c=document.getElementById('petsContainer'); if(!c)return; c.innerHTML='';
  fetch('/api/pets').then(function(r){return r.json();}).then(function(data){
    petList.forEach(function(group){
      var html='<p class="pets-group-title">'+group.group+'</p><div class="pets-grid">';
      group.pets.forEach(function(pet){
        var photo=data[pet.id];
        var imgHtml=photo?'<img src="'+photo.url+'" alt="'+pet.name+'">':'<span>'+pet.emoji+'</span>';
        html+='<div class="pet-card" onclick="openPetModal(\''+pet.id+'\',\''+pet.name+'\')"><div class="pet-photo">'+imgHtml+'</div><p class="pet-name">'+pet.name+'</p></div>';
      });
      html+='</div>';
      c.innerHTML+=html;
    });
  });
}

/* ===== 祝福墙 + 弹幕 ===== */
function loadBlessings() {
  fetch('/api/blessings').then(function(r){return r.json();}).then(function(list){
    var wall=document.getElementById('blessWall'); if(!wall)return;
    wall.innerHTML='';
    list.slice().reverse().forEach(function(b,i){
      var card=document.createElement('div');
      card.className='bless-card';
      card.style.animationDelay=(i*0.08)+'s';
      card.innerHTML='<p class="bless-name">'+b.name+'</p><p class="bless-msg">'+b.message+'</p><p class="bless-time">'+fmtDate(b.time)+'</p>';
      wall.appendChild(card);
    });
    var snap=list.slice();
    startHomeDanmaku(snap);
    startBlessDanmaku(snap);
  });
}

function spawnDanmakuItem(bar,b){
  var item=document.createElement('div');
  item.className='danmaku-item';
  item.textContent=b.name+'：'+b.message;
  item.style.top=(Math.random()*60)+'px';
  item.style.animationDuration=(10+Math.random()*4)+'s';
  bar.appendChild(item);
  setTimeout(function(){if(item.parentNode)item.remove();},15000);
}

function startHomeDanmaku(list) {
  var bar=document.getElementById('homeDanmakuBar'); if(!bar)return;
  if(homeDanmakuTimer) clearInterval(homeDanmakuTimer);
  if(!danmakuOn||!list.length) return;
  var idx=0;
  for(var i=0;i<Math.min(3,list.length);i++) spawnDanmakuItem(bar,list[i]);
  idx=Math.min(3,list.length);
  homeDanmakuTimer=setInterval(function(){
    if(!danmakuOn||!list.length)return;
    spawnDanmakuItem(bar,list[idx%list.length]);
    idx++;
  },1800);
}

function startBlessDanmaku(list) {
  var bar=document.getElementById('danmakuBar'); if(!bar)return;
  if(danmakuTimer) clearInterval(danmakuTimer);
  if(!danmakuOn||!list.length) return;
  var idx=0;
  for(var i=0;i<Math.min(3,list.length);i++) spawnDanmakuItem(bar,list[i]);
  idx=Math.min(3,list.length);
  danmakuTimer=setInterval(function(){
    if(!danmakuOn||!list.length)return;
    spawnDanmakuItem(bar,list[idx%list.length]);
    idx++;
  },1800);
}

function toggleDanmaku() {
  danmakuOn=!danmakuOn;
  updateDanmakuBtns();
  if(!danmakuOn&&danmakuTimer){clearInterval(danmakuTimer);danmakuTimer=null;}
  if(!danmakuOn&&homeDanmakuTimer){clearInterval(homeDanmakuTimer);homeDanmakuTimer=null;}
  if(danmakuOn) loadBlessings();
}

function toggleHomeDanmaku() {
  danmakuOn=!danmakuOn;
  updateDanmakuBtns();
  if(!danmakuOn&&danmakuTimer){clearInterval(danmakuTimer);danmakuTimer=null;}
  if(!danmakuOn&&homeDanmakuTimer){clearInterval(homeDanmakuTimer);homeDanmakuTimer=null;}
  if(danmakuOn) loadBlessings();
}

function updateDanmakuBtns(){
  var homeBtn=document.getElementById('homeDanmakuToggle');
  if(homeBtn) homeBtn.textContent=danmakuOn?'弹幕':'弹幕(关)';
  var wallBtn=document.querySelector('#secBlessings .danmaku-toggle');
  if(wallBtn) wallBtn.textContent=danmakuOn?'弹幕':'弹幕(关)';
}

function submitBlessing() {
  var name=document.getElementById('blessName').value.trim();
  var msg=document.getElementById('blessMsg').value.trim();
  if(!name||!msg) return alert('请填写昵称和祝福');
  var fd=new FormData();
  fd.append('name',name); fd.append('message',msg); fd.append('type','blessing');
  fetch('/api/pending',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(res){
    if(res.ok){
      document.getElementById('blessName').value='';
      document.getElementById('blessMsg').value='';
      alert('祝福已提交，等待管理员审核后展示 ❤️');
    }
  }).catch(function(){alert('提交失败，请重试');});
}

/* ===== 当年照片上传 ===== */
function uploadCurrentPhoto(input) {
  if(!input.files[0])return;
  if(!validateImage(input.files[0])){input.value='';return;}
  compressImage(input.files[0],1200,1200,0.8,function(blob){
    var fd=new FormData();
    fd.append('photo',blob,'photo.jpg');
    fd.append('key','age'+currentMainAge);
    fetch('/api/photos?key=covers',{method:'POST',body:fd}).then(function(){
      loadCurrentGallery();
      renderYearGrid();
      input.value='';
    });
  });
}

function loadCurrentGallery() {
  fetch('/api/photos').then(function(r){return r.json();}).then(function(data){
    var g=document.getElementById('currentGallery'); if(!g)return;
    var photos=data['age'+currentMainAge]||[];
    g.innerHTML='';
    photos.forEach(function(p){
      var item=document.createElement('div');
      item.className='gallery-item';
      item.innerHTML='<img src="'+p.url+'" alt="photo">';
      item.onclick=function(){openLightbox(p.url);};
      g.appendChild(item);
    });
  });
}

/* ===== 朋友上传 ===== */
function initUploadAge() {
  var sel=document.getElementById('uploadAge'); if(!sel)return;
  sel.innerHTML='<option value="">选择对应年龄</option>';
  ageList.forEach(function(age){sel.innerHTML+='<option value="'+age+'">'+age+'岁</option>';});
}

function previewUpload(input) {
  if(!input.files[0])return;
  var thumb=document.getElementById('uploadThumb');
  var hint=document.getElementById('uploadHint');
  if(thumb&&hint){thumb.src=URL.createObjectURL(input.files[0]);thumb.classList.remove('hidden');hint.classList.add('hidden');}
}

function submitFriend(e) {
  e.preventDefault();
  var age=document.getElementById('uploadAge').value;
  var name=document.getElementById('uploadName').value.trim();
  var msg=document.getElementById('uploadMsg').value.trim();
  var file=document.getElementById('uploadFile').files[0];
  if(!age||!name) return alert('请填写年龄和昵称');
  if(file&&!validateImage(file)){return false;}
  var fd=new FormData();
  fd.append('name',name); fd.append('age',age); fd.append('message',msg); fd.append('type','year-content');
  if(file){compressImage(file,1200,1200,0.8,function(blob){fd.append('photo',blob,'photo.jpg');doSubmitFriend(fd);});}
  else doSubmitFriend(fd);
  return false;
}

function doSubmitFriend(fd) {
  fetch('/api/pending?type=covers',{method:'POST',body:fd}).then(function(){
    alert('提交成功！等待管理员审核后展示');
    document.getElementById('uploadForm').reset();
    var thumb=document.getElementById('uploadThumb'),hint=document.getElementById('uploadHint');
    if(thumb)thumb.classList.add('hidden');if(hint)hint.classList.remove('hidden');
  });
}

/* ===== 全屏时光相册 ===== */
function openAlbum(cat) {
  cat=cat||'all';
  albumPhotos=[]; albumIndex=0;
  fetch('/api/album?cat='+cat).then(function(r){return r.json();}).then(function(photos){
    albumPhotos=photos.map(function(p){return p.url;});
    if(!albumPhotos.length){albumPhotos=['data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#F8F6F4" width="400" height="300"/><text fill="#D4B996" x="200" y="150" text-anchor="middle" font-size="18">暂无照片</text></svg>')];}
    var filters=document.getElementById('albumFilters');
    if(filters)filters.style.display='flex';
    document.querySelectorAll('.album-filter').forEach(function(b){b.classList.toggle('active',b.dataset.cat===cat);});
    var modal=document.getElementById('albumModal');
    if(modal){modal.classList.add('active');document.body.style.overflow='hidden';}
    renderAlbumSlide();
  });
}

function filterAlbum(cat) {
  document.querySelectorAll('.album-filter').forEach(function(b){b.classList.toggle('active',b.dataset.cat===cat);});
  fetch('/api/album?cat='+cat).then(function(r){return r.json();}).then(function(photos){
    albumPhotos=photos.map(function(p){return p.url;});
    if(!albumPhotos.length){albumPhotos=['data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#F8F6F4" width="400" height="300"/><text fill="#D4B996" x="200" y="150" text-anchor="middle" font-size="18">暂无照片</text></svg>')];}
    albumIndex=0; renderAlbumSlide();
  });
}

function closeAlbum() {
  var modal=document.getElementById('albumModal');
  if(modal)modal.classList.remove('active');
  document.body.style.overflow='';
}
function renderAlbumSlide() {
  var stage=document.getElementById('albumStage'),counter=document.getElementById('albumCounter');
  if(!stage)return;
  stage.innerHTML='<img src="'+albumPhotos[albumIndex]+'" alt="photo">';
  if(counter)counter.textContent=(albumIndex+1)+' / '+albumPhotos.length;
}
function albumPrev(){albumIndex=(albumIndex-1+albumPhotos.length)%albumPhotos.length;renderAlbumSlide();}
function albumNext(){albumIndex=(albumIndex+1)%albumPhotos.length;renderAlbumSlide();}

// 手势
(function(){var sx=0,sy=0,sw=false;
document.addEventListener('touchstart',function(e){var m=document.getElementById('albumModal');if(!m||!m.classList.contains('active'))return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;sw=true;});
document.addEventListener('touchend',function(e){if(!sw)return;sw=false;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>50){if(dx>0)albumPrev();else albumNext();}});
})();

/* ===== 年龄详情弹窗 ===== */
var yearCarouselIndex = 0;
var yearCarouselPhotos = [];

function openYearModal(age) {
  currentYearAge=age;
  yearCarouselIndex=0; yearCarouselPhotos=[];
  var modal=document.getElementById('yearModal');
  var title=document.getElementById('yearModalTitle');
  var carousel=document.getElementById('yearModalCarousel');
  var stories=document.getElementById('yearModalStories');
  var comments=document.getElementById('yearModalComments');
  if(!modal)return;
  if(title)title.textContent=age+'岁的独家记忆';
  modal.classList.add('active'); document.body.style.overflow='hidden';
  fetch('/api/year/'+age).then(function(r){return r.json();}).then(function(data){
    if(carousel){
      carousel.innerHTML='';
      var photos=data.photos||[];
      if(data.cover)photos.unshift({url:data.cover});
      yearCarouselPhotos=photos;
      if(!photos.length){carousel.innerHTML='<div style="width:80%;aspect-ratio:4/3;background:var(--card);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--text-light);">暂无照片</div>';}
      else{
        photos.forEach(function(p,i){
          var img=document.createElement('img');
          img.src=typeof p==='string'?p:p.url;
          img.style.opacity=i===0?'1':'0.4';
          img.style.transition='opacity 0.3s';
          img.onclick=function(){openLightbox(img.src);};
          carousel.appendChild(img);
        });
        initYearCarouselSwipe(carousel);
      }
    }
    if(stories){
      stories.innerHTML='<h3 class="form-subtitle">故事记录</h3>';
      if(!data.stories||!data.stories.length){stories.innerHTML+='<p style="color:var(--text-light);font-size:14px;">暂无故事</p>';}
      else{data.stories.slice().reverse().forEach(function(s){
        var card=document.createElement('div');card.className='year-story-card';
        card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start"><p class="story-name">'+s.name+'</p><button onclick="deleteYearStory('+age+','+s.id+')" style="font-size:11px;color:#a33;border:1px solid rgba(170,51,51,0.3);background:rgba(170,51,51,0.06);border-radius:6px;padding:3px 10px;cursor:pointer;flex-shrink:0;margin-left:8px;">删除</button></div><p class="story-content">'+s.content+'</p><p class="story-time">'+fmtDate(s.time)+'</p>';
        stories.appendChild(card);
      });}
    }
    if(comments){
      comments.innerHTML='<h3 class="form-subtitle">留言互动</h3>';
      var cmts=data.comments||[];
      if(!cmts.length){comments.innerHTML+='<p style="color:var(--text-light);font-size:14px;">暂无评论</p>';}
      else{cmts.slice().reverse().forEach(function(c){
        var card=document.createElement('div');card.className='year-comment-card';
        card.innerHTML='<p class="comment-name">'+c.name+'</p><p class="comment-content">'+c.content+'</p><p class="comment-time">'+fmtDate(c.time)+'</p>';
        comments.appendChild(card);
      });}
    }
  });
}

function initYearCarouselSwipe(el) {
  var sx=0, sy=0;
  el.addEventListener('touchstart', function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;}, {passive:true});
  el.addEventListener('touchend', function(e){
    var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40){
      if(dx>0) yearCarouselPrev(); else yearCarouselNext();
    }
  }, {passive:true});
}
function yearCarouselPrev() {
  if(!yearCarouselPhotos.length)return;
  yearCarouselIndex=(yearCarouselIndex-1+yearCarouselPhotos.length)%yearCarouselPhotos.length;
  updateYearCarousel();
}
function yearCarouselNext() {
  if(!yearCarouselPhotos.length)return;
  yearCarouselIndex=(yearCarouselIndex+1)%yearCarouselPhotos.length;
  updateYearCarousel();
}
function updateYearCarousel() {
  var carousel=document.getElementById('yearModalCarousel');
  if(!carousel)return;
  var imgs=carousel.querySelectorAll('img');
  imgs.forEach(function(img,i){img.style.opacity=i===yearCarouselIndex?'1':'0.4';});
  if(imgs[yearCarouselIndex]) imgs[yearCarouselIndex].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
}

function closeYearModal(){var m=document.getElementById('yearModal');if(m)m.classList.remove('active');document.body.style.overflow='';}

function deleteYearStory(age,storyId){
  if(!confirm('确定删除这条故事记录？'))return;
  fetch('/api/year/'+age+'/story/'+storyId,{method:'DELETE'}).then(function(r){return r.json();}).then(function(){
    openYearModal(age);
  });
}

function submitYearStory(e){
  e.preventDefault();
  var name=document.getElementById('yearStoryName').value.trim();
  var content=document.getElementById('yearStoryContent').value.trim();
  if(!name||!content) return alert('请填写昵称和故事');
  var fd=new FormData();
  fd.append('name',name);fd.append('content',content);fd.append('type','year-content');
  doSubmitYearStory(fd);
  return false;
}

function doSubmitYearStory(fd){
  fetch('/api/pending',{method:'POST',body:fd}).then(function(){
    alert('提交成功！等待管理员审核后展示');
    document.getElementById('yearStoryName').value='';
    document.getElementById('yearStoryContent').value='';
  });
}

function submitYearComment(e){
  e.preventDefault();
  var name=document.getElementById('yearCommentName').value.trim();
  var content=document.getElementById('yearCommentContent').value.trim();
  if(!name||!content) return alert('请填写昵称和评论');
  fetch('/api/year/'+currentYearAge+'/comment',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:name,content:content})
  }).then(function(){
    document.getElementById('yearCommentName').value='';
    document.getElementById('yearCommentContent').value='';
    openYearModal(currentYearAge);
  });
  return false;
}

function uploadYearPhoto(input){
  if(!input.files[0]||!currentYearAge)return;
  if(!validateImage(input.files[0])){input.value='';return;}
  compressImage(input.files[0],1200,1200,0.8,function(blob){
    var fd=new FormData();fd.append('photo',blob,'photo.jpg');
    fetch('/api/year/'+currentYearAge+'/photo',{method:'POST',body:fd}).then(function(){
      openYearModal(currentYearAge);input.value='';
    });
  });
}

/* ===== 宠物详情弹窗 ===== */
function openPetModal(id,name){
  currentPetId=id;
  var modal=document.getElementById('petModal');
  var title=document.getElementById('petModalTitle');
  var photos=document.getElementById('petModalPhotos');
  if(!modal)return;
  if(title)title.textContent=name;
  modal.classList.add('active');document.body.style.overflow='hidden';
  fetch('/api/pets').then(function(r){return r.json();}).then(function(data){
    if(photos){
      photos.innerHTML='';
      var p=data[id];
      if(p&&p.url){photos.innerHTML='<img src="'+p.url+'" alt="'+name+'" onclick="openLightbox(\''+p.url+'\')">';}
      else{photos.innerHTML='<p style="color:var(--text-light);text-align:center;grid-column:1/-1;">暂无照片</p>';}
    }
  });
}

function closePetModal(){var m=document.getElementById('petModal');if(m)m.classList.remove('active');document.body.style.overflow='';}

/* ===== 图片放大 ===== */
function openLightbox(url){
  var lb=document.getElementById('lightbox'),img=document.getElementById('lightboxImg');
  if(lb&&img){img.src=url;lb.classList.add('active');document.body.style.overflow='hidden';}
}
function closeLightbox(){var lb=document.getElementById('lightbox');if(lb)lb.classList.remove('active');document.body.style.overflow='';}

/* ===== 粒子背景 ===== */
function initParticles(){
  var canvas=document.getElementById('particleCanvas');if(!canvas)return;
  var ctx=canvas.getContext('2d'),particles=[],w,h;
  function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  function P(){this.x=Math.random()*w;this.y=Math.random()*h;this.vx=(Math.random()-0.5)*0.3;this.vy=-Math.random()*0.5-0.1;this.size=Math.random()*2+0.5;this.opacity=Math.random()*0.4+0.1;this.color=Math.random()>0.5?'212,185,150':'242,237,232';}
  for(var i=0;i<50;i++)particles.push(new P());
  function anim(){
    ctx.clearRect(0,0,w,h);
    particles.forEach(function(p){
      p.x+=p.vx;p.y+=p.vy;
      if(p.y<-10){p.y=h+10;p.x=Math.random()*w;}
      if(p.x<-10)p.x=w+10;if(p.x>w+10)p.x=-10;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
      ctx.fillStyle='rgba('+p.color+','+p.opacity+')';ctx.fill();
    });
    requestAnimationFrame(anim);
  }
  anim();
}

/* ===== 音乐 ===== */
var audio=null;
function toggleMusic(){
  var btn=document.getElementById('btnMusic');
  if(!audio){audio=new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');audio.loop=true;}
  if(audio.paused){audio.play().then(function(){if(btn)btn.classList.add('playing');}).catch(function(){});}
  else{audio.pause();if(btn)btn.classList.remove('playing');}
}

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded',function(){
  initOpening();
  renderAnniversary();
  renderYearGrid();
  renderPets();
  loadBlessings();
  loadCurrentGallery();
  initUploadAge();
  initParticles();
  /* 首屏弹幕显隐 */
  var homeBar=document.getElementById('homeDanmakuBar');
  if(homeBar){
    var checkHomeDanmaku=function(){
      var sec=document.getElementById('secOpening');
      if(!sec)return;
      var rect=sec.getBoundingClientRect();
      if(rect.bottom<100){homeBar.classList.add('hidden');}
      else{homeBar.classList.remove('hidden');}
    };
    window.addEventListener('scroll',checkHomeDanmaku,{passive:true});
    checkHomeDanmaku();
  }
});
