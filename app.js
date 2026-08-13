
(function(){
  var _injectedScripts = [];
  function showErr(m, detail){
    var b=document.getElementById('errBanner');
    if(!b){ b=document.createElement('div'); b.id='errBanner';
      b.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#ff3b30;color:#fff;font:12px/1.4 -apple-system,sans-serif;padding:8px 12px;white-space:pre-wrap;max-height:50%;overflow:auto';
      document.body.appendChild(b); }
    var extra='';
    try{
      var scripts=[];
      for(var i=0;i<document.scripts.length;i++){ var s=document.scripts[i]; if(s.src) scripts.push(s.src); }
      if(scripts.length) extra+='\n当前脚本: '+scripts.join(', ');
      if(_injectedScripts.length) extra+='\n动态加载: '+_injectedScripts.join(', ');
    }catch(e){}
    b.textContent='⚠️ 运行错误（请截图发我）：\n'+m+(detail?'\n---\n'+detail:'')+extra;
  }
  function safeStr(x,n){ try{ var s=String(x); return s.length>(n||500)?s.slice(0,n||500)+'…':s; }catch(e){ return '[unstringable]'; } }
  function ctx(){
    var parts=[];
    try{
      if(window.__lastClick) parts.push('最后点击: '+window.__lastClick);
      if(typeof S!=='undefined' && S.current){ parts.push('题: '+S.current.id+' '+safeStr(S.current.stem,40)); parts.push('type:'+S.current.type); }
      if(typeof S!=='undefined' && S.subject) parts.push('科目:'+S.subject);
      if(typeof S!=='undefined' && S.session) parts.push('练习中 idx:'+S.session.idx+'/'+S.session.queue.length);
    }catch(e){}
    return parts.join('\n');
  }
  function withCtx(err, title){
    var detail=ctx();
    if(err && err.stack) detail=(err.stack||'')+'\n'+detail;
    showErr(title+'\n'+safeStr(err && err.message? err.message : err, 300), detail);
  }
  window.addEventListener('error', function(e){
    var m = e.message || 'error';
    // iOS 独立模式（加到桌面的网页）会把同源报错也抹成无文件名/行号的 "Script error."，这类无法定位、也非我们能修，仅记录不弹红条
    if(m === 'Script error.' && !e.filename && !e.lineno){ console.warn('[已忽略的 Script error · 跨域/独立模式噪音]', e); return; }
    var detail=ctx(); if(e.error && e.error.stack) detail=(e.error.stack||'')+'\n'+detail; showErr(m+'\n@ '+(e.filename||'')+':'+(e.lineno||''), detail);
  });
  window.addEventListener('unhandledrejection', function(e){ var detail=ctx(); if(e.reason && e.reason.stack) detail=(e.reason.stack||'')+'\n'+detail; showErr('Promise: '+safeStr(e.reason && e.reason.message?e.reason.message:e.reason), detail); });
  window.onerror = function(msg, url, line, col, err){
    if(msg === 'Script error.' && !url && !line){ console.warn('[已忽略的 Script error · 跨域/独立模式噪音]', err); return true; }
    var detail=ctx(); if(err && err.stack) detail=(err.stack||'')+'\n'+detail; showErr(msg+'\n@ '+(url||'')+':'+(line||'')+':'+(col||''), detail); return true;
  };
  var lastEvt = function(e){ try{ var t=e.target; window.__lastClick=(t.tagName||'')+(t.id?'#'+t.id:'')+(t.className?'.'+String(t.className).split(/\s+/).filter(Boolean).slice(0,2).join('.'):'')+' text="'+safeStr(t.textContent,30)+'"'; }catch(_){} };
  document.addEventListener('click', lastEvt, true);
  document.addEventListener('touchstart', lastEvt, true);
  // 包装 addEventListener，让事件处理器里的错误也能带上下文暴露出来
  var orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts){
    if(typeof fn !== 'function') return orig.call(this, type, fn, opts);
    var self=this;
    var wrap = function(e){
      try { return fn.call(self, e); }
      catch(err){ withCtx(err, '事件 '+type+' 出错'); throw err; }
    };
    wrap._orig = fn;
    return orig.call(this, type, wrap, opts);
  };
  // 拦截动态脚本加载/注入，用于诊断跨域 Script error 来源
  try{
    var origCreate = document.createElement;
    document.createElement = function(tag){
      var el = origCreate.call(document, tag);
      if(String(tag).toLowerCase() === 'script'){
        try{
          var src0 = el.getAttribute('src');
          Object.defineProperty(el, 'src', {
            get: function(){ return el.getAttribute('src') || src0 || ''; },
            set: function(v){ try{ _injectedScripts.push('create:'+String(v)); }catch(_){} el.setAttribute('src', v); return v; }
          });
        }catch(_){}
      }
      return el;
    };
  }catch(_){}
  if(window.MutationObserver){
    var mo = new MutationObserver(function(list){
      list.forEach(function(rec){
        if(!rec.addedNodes) return;
        rec.addedNodes.forEach(function(node){
          if(node.tagName === 'SCRIPT'){
            _injectedScripts.push('dom:'+(node.src||'[inline]'));
          }
        });
      });
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }
  window.__showErr = showErr;
  window.__errCtx = ctx;
})();
const SUBJECTS = window.SUBJECTS;;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v==null? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ /* 隐私模式 / 桌面图标 standalone 模式可能禁用 localStorage，忽略即可，本次会话内仍可用内存态 */ } },
  remove(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const DEFAULT_SETTINGS = {apiBase:'https://ark.cn-beijing.volces.com/api/v3', apiKey:'', model:'deepseek-v4-flash-260425', name:'高大上的注册会计师'};
const S = {
  subject: store.get('cpa_subject', 'acc'),
  settings: Object.assign({}, DEFAULT_SETTINGS, store.get('cpa_settings', {})),
  wrong: {}, stats: {}, marks: {}, draftByQ: {}, fav: {}, notes: {}, session: null,
  current: null, sel: new Set(), qStart: 0, timer: null
};
/* 当前科目题库（选择题/章节都从这里取，保证会计与经济法完全隔离） */
function D(){ return SUBJECTS[S.subject]; }
/* 知识点：取报告标签首项，无标签则回退到章名（作为最小分析单位） */
function kpOf(q){ const t=(q&&q.report&&q.report.tags)||[]; return t.length?t[0]:('第'+(q?q.chapterIndex:'?')+'章'); }
/* 稳定设备标识：持久化在 localStorage，用于跨设备导入去重 */
function deviceId(){ let d=store.get('cpa_device_id',''); if(!d){ d='dev-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); store.set('cpa_device_id',d); } return d; }
/* 答题记录去重主键：设备+题号+作答时间戳，保证同一记录重复导入不会重复 */
function ridOf(qid, ts){ return deviceId()+':'+qid+':'+ts; }
/* 由统一历史重算 S.stats（根治导入累计重复：导入后重算而非累加） */
function recomputeStats(){
  const k=S.subject;
  const st={answered:0, correct:0, timeMs:0, perChapter:{}, perQuestion:{}};
  (S.history||[]).forEach(r=>{
    if(r.correct===null||r.correct===undefined) return; // 跳过仅记录掌握、未作答的迁移记录
    st.answered++; if(r.correct) st.correct++; st.timeMs+=(r.timeMs||0);
    const pq=st.perQuestion[r.qid]||(st.perQuestion[r.qid]={attempts:0,correct:0,timeMs:0});
    pq.attempts++; if(r.correct) pq.correct++; pq.timeMs+=(r.timeMs||0);
    const pc=st.perChapter[r.ci]||(st.perChapter[r.ci]={name:qById(r.qid)?qById(r.qid).chapter:'',answered:0,correct:0,timeMs:0});
    pc.answered++; if(r.correct) pc.correct++; pc.timeMs+=(r.timeMs||0);
  });
  S.stats=st; save();
}
/* 按当前科目从 localStorage 载入该科目的错题/收藏/统计/草稿/进度 */
function loadSubjectState(){
  const k = S.subject;
  S.wrong = store.get('cpa_'+k+'_wrong', {});
  S.stats = store.get('cpa_'+k+'_stats', {answered:0, correct:0, timeMs:0, perChapter:{}, perQuestion:{}});
  S.marks = store.get('cpa_'+k+'_marks', {});
  S.draftByQ = store.get('cpa_'+k+'_draftByQ', {});
  S.fav = store.get('cpa_'+k+'_fav', {});
  S.notes = store.get('cpa_'+k+'_notes', {});
  S.mastery = store.get('cpa_'+k+'_mastery', {});
  S.history = store.get('cpa_'+k+'_history', []) || [];
  S.session = store.get('cpa_'+k+'_session', null);
  // 旧版数据迁移：把历史作答(S.stats.perQuestion)与掌握记录(S.mastery)合成为统一历史轨迹
  if(!S.history.length && ((S.stats.perQuestion && Object.keys(S.stats.perQuestion).length) || (S.mastery && Object.keys(S.mastery).length))){
    const now=Date.now(); let i=0;
    const add=(rec)=>{ S.history.push(rec); i++; };
    // 1) 历史作答（来自旧的累计统计）：用于章节练习/问题比例
    const pq=S.stats.perQuestion||{};
    Object.keys(pq).forEach(id=>{
      const r=pq[id]; if(!r) return; const q=qById(Number(id));
      add({ rid:deviceId()+':'+id+':p'+(r.ts||now)+i, qid:Number(id), ci:q?q.chapterIndex:0, kp:q?kpOf(q):'第?章', type:q?q.type:'single', ts:(r.ts||now)-i*1000, dev:deviceId(), userAns:[], correctAns:q?(q.answer||[]):[], correct:((r.correct||0)>0), timeMs:r.timeMs||0, mastery:null });
    });
    // 2) 掌握情况记录（来自旧的 mastery）：用于主要原因/知识点/趋势
    const mrec=S.mastery||{};
    Object.keys(mrec).forEach(id=>{
      const rec=mrec[id]; if(!rec) return; const q=qById(Number(id)); const rs=rec.reasons||[];
      add({ rid:deviceId()+':'+id+':m'+(rec.ts||now)+i, qid:Number(id), ci:q?q.chapterIndex:0, kp:q?kpOf(q):'第?章', type:q?q.type:'single', ts:rec.ts||now, dev:deviceId(), userAns:[], correctAns:q?(q.answer||[]):[], correct:null, mastery:{reasons:rs, main:(rs.length===1?rs[0]:''), other:rec.other_note||''} });
    });
    if(i) store.set('cpa_'+k+'_history', S.history);
  }
}
/* 切换科目：先保存当前科目，再切换并重建界面 */
function switchSubject(s){
  if(s===S.subject) return;
  save();
  S.subject = s; store.set('cpa_subject', s);
  S.current=null; S.sel=new Set(); S.qStart=0;
  if(S.timer){ clearInterval(S.timer); S.timer=null; }
  loadSubjectState();
  syncSubjUI();
  showView('home');
}
function syncSubjUI(){
  $$('#subjSeg .subj-btn').forEach(b=> b.classList.toggle('on', b.dataset.s===S.subject));
  const m=$('#subjMeta'); if(m) m.textContent = `${D().chapters.length} 章 · ${D().questions.filter(q=>q.type==='single'||q.type==='multiple').length} 道选择题`;
}
/* 首次升级兼容：把旧的全局错题/收藏/进度迁移到「会计」科目下，避免历史记录丢失 */
(function migrate(){
  if(store.get('cpa_acc_wrong', null)===null && store.get('cpa_wrong', null)!==null){
    ['wrong','stats','marks','draftByQ','fav','session'].forEach(k=>{ const v=store.get('cpa_'+k, null); if(v!==null) store.set('cpa_acc_'+k, v); });
    ['wrong','stats','marks','draftByQ','fav','session'].forEach(k=> store.remove('cpa_'+k));
  }
})();
loadSubjectState();
const TYPE_LABEL = {single:'单选题', multiple:'多选题', calc:'计算题', comprehensive:'综合题', unknown:'未分类'};

function save(){ const k=S.subject; store.set('cpa_settings', S.settings); store.set('cpa_'+k+'_wrong', S.wrong); store.set('cpa_'+k+'_stats', S.stats); store.set('cpa_'+k+'_marks', S.marks); store.set('cpa_'+k+'_draftByQ', S.draftByQ); store.set('cpa_'+k+'_fav', S.fav); store.set('cpa_'+k+'_notes', S.notes); store.set('cpa_'+k+'_mastery', S.mastery); store.set('cpa_'+k+'_history', S.history); if(S.session) store.set('cpa_'+k+'_session', S.session); }
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),1800); }

/* ---------- navigation ---------- */
$$('.nav-item').forEach(n=>{
  n.addEventListener('click', ()=> showView(n.dataset.view));
});
// 双击「练习」导航按钮刷新页面（替代易误触的下拉刷新）
(function(){
  const homeNav = document.querySelector('.nav-item[data-view="home"]');
  if(!homeNav) return;
  let lastTap = 0;
  homeNav.addEventListener('click', ()=>{
    const now = Date.now();
    if(now - lastTap < 350){ try{ sessionStorage.setItem('cpa_just_refreshed','1'); }catch(e){} location.reload(); return; }
    lastTap = now;
  });
})();
function showView(v){
  if(v!=='practice') stopTimer();
  $$('.nav-item').forEach(n=> n.classList.toggle('active', n.dataset.view===v));
  $$('.view').forEach(s=> s.classList.toggle('active', s.id==='view-'+v));
  if(v==='wrong') renderReview();
  if(v==='stats') renderStats();
  if(v==='chat') renderChatReady();
  if(v==='home') initHome();
  window.scrollTo(0,0);
}

/* ---------- home setup ---------- */
let chosenMode = null;
let lastQueueMsg = '';
let homeBound = false;
function initHome(){
  $('#totalQ').textContent = D().questions.filter(q=>q.type==='single'||q.type==='multiple').length;
  $('#totalCh').textContent = D().chapters.length;
  $('#wrongCnt').textContent = Object.keys(S.wrong).length;
  $('#favCnt').textContent = Object.keys(S.fav).length;
  const cs = $('#chapterSel'); cs.innerHTML='';
  { const o=document.createElement('option'); o.value=0; o.textContent='全部章节（'+D().questions.filter(q=>q.type==='single'||q.type==='multiple').length+'题）'; cs.appendChild(o); }
  D().chapters.forEach(c=>{
    const mc = D().questions.filter(q=>q.chapterIndex===c.index && (q.type==='single'||q.type==='multiple')).length;
    if(mc>0){ const o=document.createElement('option'); o.value=c.index; o.textContent=`第${c.index}章 ${c.name}（${mc}题）`; cs.appendChild(o); }
  });
  // 事件只绑定一次：initHome 每次回首页都会执行，若重复 addEventListener 会导致
  // 手风琴切换被触发两次（开→关），表现为"点击随机练习没反应"。
  if(!homeBound){
    $$('.mode-head').forEach(h=> h.addEventListener('click', ()=> toggleMode(h.closest('.mode').dataset.mode)));
    $('#typeSeg').querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> segPick('#typeSeg', b)));
    $('#rangeSeg').querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> segPick('#rangeSeg', b)));
    $('#chapterQtyPresets').querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=>{
      $('#chapterQtyPresets').querySelectorAll('button').forEach(x=> x.classList.remove('on'));
      b.classList.add('on');
      $('#chapterNum').value = b.dataset.n;
    }));
    $('#chapterNum').addEventListener('input', ()=>{
      const v = $('#chapterNum').value;
      $('#chapterQtyPresets').querySelectorAll('button').forEach(x=> x.classList.toggle('on', x.dataset.n === v));
    });
    $('#practiceStart').addEventListener('click', ()=> startMode('practice'));
    $('#comboWrong').addEventListener('click', ()=> startMode('wrong'));
    $('#comboFav').addEventListener('click', ()=> startMode('fav'));
    homeBound = true;
  }
  // 默认展开「练习」，让没用过的人一眼看到选择入口
  const chCard = $('.mode[data-mode="practice"]'); chCard.classList.add('open'); $('#body-practice').classList.remove('hide');
  syncSubjUI();
  refreshResumeCard();
}
function startMode(mode){
  if(mode==='wrong' && Object.keys(S.wrong).length===0){ toast('暂无错题可练'); return; }
  if(mode==='fav' && Object.keys(S.fav).length===0){ toast('暂无收藏可练'); return; }
  chosenMode = mode;
  startSession();
}
function segPick(sel, btn){ $(sel).querySelectorAll('button').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
function toggleMode(mode){
  const card = $('.mode[data-mode="'+mode+'"]');
  if(!card) return;
  const body = $('#body-'+mode);
  const opening = body.classList.contains('hide');
  $$('.mode').forEach(c=>{ c.classList.remove('open'); const b=c.querySelector('.mode-body'); if(b) b.classList.add('hide'); });
  if(opening){ card.classList.add('open'); body.classList.remove('hide'); }
}

/* ---------- session ---------- */
function doneSet(){ return new Set((S.history||[]).map(r=>r.qid)); }
function shuffle(arr){ arr=arr.slice(); for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function buildQueue(){
  let ids=[];
  lastQueueMsg='';
  if(chosenMode==='practice'){
    const ci = parseInt($('#chapterSel').value,10); // 0 = 全部章节
    const t = $('#typeSeg').querySelector('.on').dataset.t;
    const r = $('#rangeSeg').querySelector('.on').dataset.r; // all / undone / done
    const raw = $('#chapterNum').value;
    const n = (raw===''||raw==null) ? 0 : parseInt(raw,10);
    const total = (isNaN(n) || n<=0) ? Infinity : n;
    const done = doneSet();
    // 基础题库：全部选择题
    let qs = D().questions.filter(q=> q.type==='single'||q.type==='multiple');
    if(ci>0) qs = qs.filter(q=> q.chapterIndex===ci);
    if(t!=='all') qs = qs.filter(q=> q.type===t);
    if(r==='undone'){
      // 严格只抽未做过的题
      const sel = shuffle(qs.filter(q=> !done.has(q.id))).slice(0, total);
      if(total!==Infinity && sel.length < total) lastQueueMsg = '未做过的题仅剩 '+sel.length+' 道，已全部纳入';
      ids = sel.map(q=>q.id);
    } else if(r==='done'){
      // 严格只抽做过的题
      const sel = shuffle(qs.filter(q=> done.has(q.id))).slice(0, total);
      if(total!==Infinity && sel.length < total) lastQueueMsg = '做过的题仅剩 '+sel.length+' 道，已全部纳入';
      ids = sel.map(q=>q.id);
    } else {
      // 全部：优先未做过的题，不足数量时用做过的题补足
      const undone = shuffle(qs.filter(q=> !done.has(q.id)));
      const doneQs = shuffle(qs.filter(q=> done.has(q.id)));
      let sel = undone.slice(0, total);
      if(sel.length < total) sel = sel.concat(doneQs.slice(0, total - sel.length));
      if(total!==Infinity && undone.length < total && undone.length < qs.length){
        lastQueueMsg = '本范围未做过的题仅剩 '+undone.length+' 道，已用做过的题补足到 '+total+' 道';
      }
      ids = sel.map(q=>q.id);
    }
  } else if(chosenMode==='wrong'){
    ids = Object.keys(S.wrong).filter(id=>qById(id)).map(Number);
  } else if(chosenMode==='fav'){
    ids = Object.keys(S.fav).filter(id=>qById(id)).map(Number);
  }
  return ids;
}
function newSession(queue, mode){ return {mode: mode, queue: queue.slice(), idx: 0, results: [], answers: [], times: []}; }
function startSession(){
  const ids = buildQueue();
  if(!ids.length){ toast('没有可练习的题目'); return; }
  S.session = newSession(ids, chosenMode);
  showView('practice');
  renderQuestion();
  if(lastQueueMsg) toast(lastQueueMsg);
}
function qById(id){ return D().questions.find(q=>q.id===Number(id)); }
function resumeSession(autoShow){
  const s = store.get('cpa_'+S.subject+'_session', null);
  if(s && s.queue && s.queue.length){ S.session = s; if(autoShow!==false){ showView('practice'); renderQuestion(); } return true; }
  return false;
}
function refreshResumeCard(){
  const s = S.session || store.get('cpa_'+S.subject+'_session', null);
  const card = $('#resumeCard'); if(!card) return;
  if(s && s.queue && s.queue.length){
    const done = (s.results||[]).filter(r=>r!==undefined).length;
    const q = (s.queue[s.idx]!=null)? qById(s.queue[s.idx]) : null;
    $('#resumeInfo').textContent = `第 ${s.idx+1} / ${s.queue.length} 题` + (q? ' · 第'+q.chapterIndex+'章' : '') + ` · 已完成 ${done} 题`;
    card.style.display = 'flex';
  } else {
    card.style.display = 'none';
  }
}

function renderQuestionContent(){
  try{
    const q=S.current;
    const m = S.marks[q.id];
    if(m && typeof m === 'object' && m!==null && typeof m.stem==='string' && typeof m.opts==='string'){
      $('#pStem').innerHTML = m.stem;
      $('#pOpts').innerHTML = m.opts;
    } else {
      $('#pStem').textContent = q.stem;
      $('#pOpts').innerHTML = (q.options||[]).map(o=>`<div class="opt" data-k="${o.key}"><div class="k">${o.key}</div><div class="t">${escapeHtml(o.text)}</div></div>`).join('');
    }
    $$('#pOpts .opt').forEach(el=> el.classList.toggle('sel', S.sel.has(el.dataset.k)));
  }catch(e){ if(window.__showErr) window.__showErr('渲染题目内容出错:\n'+e.message, window.__errCtx?window.__errCtx():''); throw e; }
}
function renderQuestion(){
  try{
    const sess = S.session;
    S.current = qById(sess.queue[sess.idx]);
    const q = S.current;
    if($('#askAiBtn')) $('#askAiBtn')._q = null;
    S.sel = new Set(sess.answers[sess.idx] || []);
    // 切题时清空上一题的计算器，避免带入本题
    $('#calcInput').value=''; $('#calcRes').textContent='结果会显示在这里'; $('#calcRes').classList.remove('err');
    if(!$('#draftPanel').classList.contains('hide')){
      if(!$('#noteView').classList.contains('hide')){ if(S.current) $('#noteArea').value=S.notes[S.current.id]||''; }
      else { $('#scratchArea').value=''; }
    }
    $('#favTab').classList.toggle('on', !!S.fav[q.id]);
    $('#favTab').textContent = S.fav[q.id] ? '已收藏' : '收藏';
    $('#pCh').textContent = `第${q.chapterIndex}章 ${q.chapter}`;
    $('#pType').textContent = TYPE_LABEL[q.type]||'选择题';
    $('#pIdx').textContent = `第 ${sess.idx+1} / ${sess.queue.length} 题`;
    $('#pBar').style.width = ((sess.idx)/sess.queue.length*100)+'%';
    renderQuestionContent();
  $('#prevBtn').disabled = sess.idx===0;
  const answered = sess.results[sess.idx] !== undefined;
  if(answered){
    // 已做过：保留做题结果，不再计时，显示当时用时
    const dt = sess.times[sess.idx] || 0;
    const mm=String(Math.floor(dt/60000)).padStart(2,'0'); const ss=String(Math.floor(dt/1000)%60).padStart(2,'0');
    $('#pTime').textContent = `${mm}:${ss}`;
    showAnswered(q, sess.results[sess.idx], dt);
  } else {
    $('#pOpts').classList.remove('locked');
    $('#pResult').innerHTML='';
    $('#submitBtn').classList.remove('hide');
    $('#skipBtn').classList.remove('hide');
    $('#nextBtn').classList.add('hide');
    $('#askAiBtn').classList.add('hide');
    $('#masteryBtn').classList.add('hide');
    startTimer();
  }
  save();
  }catch(e){ if(window.__showErr) window.__showErr('渲染题目出错:\n'+e.message, window.__errCtx?window.__errCtx():''); throw e; }
}
function toggleOpt(key){
  if($('#pOpts').classList.contains('locked')) return;
  const q = S.current;
  if(q.type==='single'){ S.sel = new Set([key]); }
  else { if(S.sel.has(key)) S.sel.delete(key); else S.sel.add(key); }
  $$('#pOpts .opt').forEach(el=> el.classList.toggle('sel', S.sel.has(el.dataset.k)));
}
$('#pContent').addEventListener('click', e=>{ const el=e.target.closest('.opt'); if(!el) return; toggleOpt(el.dataset.k); });
function startTimer(){
  S.qStart = Date.now();
  if(S.timer) clearInterval(S.timer);
  const tick=()=>{ try{ const s=Math.floor((Date.now()-S.qStart)/1000); const mm=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); $('#pTime').textContent=`${mm}:${ss}`; }catch(e){ console.warn('tick',e); } };
  tick(); S.timer=setInterval(tick,1000);
}
function stopTimer(){ if(S.timer){ clearInterval(S.timer); S.timer=null; } return Date.now()-S.qStart; }

function submitAnswer(){
  if(!S.sel.size){
    const q=S.current;
    if(q.options && q.options.length){ toast('请先选择答案'); return; }
    skipQuestion(); return;   // 综合题无选项：直接看答案，避免卡死
  }
  const q = S.current;
  const dt = stopTimer();
  const correct = isCorrect(q, S.sel);
  // lock & color
  $('#pOpts').classList.add('locked');
  $$('#pOpts .opt').forEach(el=>{
    const k = el.dataset.k;
    const isAns = (q.answer||[]).includes(k);
    if(isAns) el.classList.add('right');
    if(S.sel.has(k) && !isAns) el.classList.add('wrong');
    if(q.type==='multiple' && !S.sel.has(k) && isAns) el.classList.add('right');
  });
  // stats
  const st = S.stats;
  st.answered++; if(correct) st.correct++; st.timeMs += dt;
  const pq = st.perQuestion[q.id] || (st.perQuestion[q.id]={attempts:0,correct:0,timeMs:0});
  pq.attempts++; if(correct) pq.correct++; pq.timeMs += dt;
  const pc = st.perChapter[q.chapterIndex] || (st.perChapter[q.chapterIndex]={name:q.chapter,answered:0,correct:0,timeMs:0});
  pc.answered++; if(correct) pc.correct++; pc.timeMs += dt;
  if(!correct){
    S.wrong[q.id] = {id:q.id, type:q.type, chapter:q.chapter, chapterIndex:q.chapterIndex, attempts:(S.wrong[q.id]?.attempts||0)+1, lastWrongTs:Date.now()};
  }
  // 历史答题记录：每条作答追加一条，不覆盖旧数据（统一分析 / 跨设备去重的基础）
  const now = Date.now();
  S.history.push({ rid:ridOf(q.id, now), qid:q.id, ci:q.chapterIndex, kp:kpOf(q), type:q.type, ts:now, dev:deviceId(), userAns:[...S.sel], correctAns:[...(q.answer||[])], correct:correct, timeMs:dt, mastery:null });
  S.session.results[S.session.idx] = correct;
  S.session.answers[S.session.idx] = [...S.sel];
  S.session.times[S.session.idx] = dt;
  save();
  showAnswered(q, correct, dt);
}
function splitReportBody(text){
  if(!text) return '';
  const para = s=>'<p>'+escapeHtml(s)+'</p>';
  const stepRe = /第[一二三四五六七八九十百\d]+步[：:]?/g;
  const topicRe = /(^|。|；|;)([一-龥A-Za-z0-9（）()]{1,8}[：:])/g;
  const out=[];
  String(text).split('\n').forEach(raw=>{
    let block=raw.trim(); if(!block) return;
    block = block.replace(stepRe, m=>'\n'+m);
    block.split('\n').map(c=>c.trim()).filter(Boolean).forEach(chunk=>{
      if(/^第[一二三四五六七八九十百\d]+步[：:]?/.test(chunk)){ out.push(para(chunk)); return; }
      let s = chunk.replace(topicRe, (m,p,label)=> (p? p+' ' : '') + '\n' + label);
      s.split('\n').map(x=>x.trim()).filter(Boolean).forEach(p=> out.push(para(p)));
    });
  });
  return out.join('');
}
function renderReport(q, correct){
  if(!q.report) return null;
  const r=q.report;
  const wrap=document.createElement('div'); wrap.className='report';
  const head=document.createElement('div'); head.className='rhead'; head.textContent='📊 题目学习分析报告';
  wrap.appendChild(head);
  const diag=document.createElement('div'); diag.className='rdiag';
  diag.innerHTML='<b>一句话诊断：</b>'+escapeHtml(r.diag);
  wrap.appendChild(diag);
  const sec=(num,title,bodyHtml,open)=>{
    const d=document.createElement('details'); if(open) d.open=true;
    const s=document.createElement('summary');
    s.innerHTML='<span class="num">'+num+'</span>'+escapeHtml(title)+'<span class="ar">▶</span>';
    const b=document.createElement('div'); b.className='rbody'; b.innerHTML=bodyHtml;
    d.appendChild(s); d.appendChild(b); wrap.appendChild(d);
  };
  const aw=!correct;
  sec('一','你容易错在哪', splitReportBody(r.errors), aw);
  sec('二','正确思维方式', splitReportBody(r.correct), aw);
  sec('三','解题思路', splitReportBody(r.solution), aw);
  sec('四','核心考察点', splitReportBody(r.exam), !aw);
  sec('五','知识框架定位', '<div class="fw">'+r.framework.map((f,i)=>escapeHtml(f)+(i<r.framework.length-1?'<span class="sep">›</span>':'')).join('')+'</div>', !aw);
  sec('六','关联讲义位置', splitReportBody(r.lecture), !aw);
  const tags=document.createElement('div'); tags.className='tags';
  (r.tags||[]).forEach(t=>{const sp=document.createElement('span'); sp.textContent=t; tags.appendChild(sp);});
  wrap.appendChild(tags);
  return wrap;
}
function showAnswered(q, correct, dt, skip){
  const mm=String(Math.floor(dt/60000)).padStart(2,'0'); const ss=String(Math.floor(dt/1000)%60).padStart(2,'0');
  $('#pOpts').classList.add('locked');
  $$('#pOpts .opt').forEach(el=>{
    const k = el.dataset.k;
    const isAns = (q.answer||[]).includes(k);
    if(isAns) el.classList.add('right');
    if(!skip && S.sel.has(k) && !isAns) el.classList.add('wrong');
    if(q.type==='multiple' && !S.sel.has(k) && isAns) el.classList.add('right');
  });
  const banner = document.createElement('div');
  if(skip){ banner.className='banner skip'; banner.innerHTML='⏭ 已跳过，看解析　·　用时 '+mm+':'+ss; }
  else { banner.className = 'banner ' + (correct?'ok':'no'); banner.innerHTML = (correct? '✓ 回答正确' : '✗ 回答错误') + `　·　用时 ${mm}:${ss}` + (q.type==='multiple' && !correct ? '　·　多选须全部选对' : ''); }
  const ctx=document.createElement('div'); ctx.className='qctx'; ctx.textContent='📌 本题：第'+q.chapterIndex+'章 '+q.chapter+' · '+q.stem.slice(0,22)+(q.stem.length>22?'…':'');
  const exp = document.createElement('div'); exp.className='exp';
  exp.innerHTML = formatExp(q.explanation);
  const r = $('#pResult'); r.innerHTML=''; r.appendChild(banner); r.appendChild(ctx); r.appendChild(exp);
  const rep=renderReport(q, correct); if(rep) r.appendChild(rep);
  $('#submitBtn').classList.add('hide');
  $('#skipBtn').classList.add('hide');
  const last = S.session.idx===S.session.queue.length-1;
  $('#nextBtn').textContent = last? '完成 ✦' : '下一题 →';
  $('#nextBtn').classList.remove('hide');
  $('#askAiBtn').classList.remove('hide');
  $('#askAiBtn')._q = q;
  const mb = $('#masteryBtn');
  if(q.type==='single' || q.type==='multiple'){
    mb.classList.remove('hide'); mb._q = q;
    const rec = S.mastery[q.id];
    mb.textContent = rec ? '掌握情况已记录 ✎' : '记录本题掌握情况';
  } else { mb.classList.add('hide'); mb._q = null; }
}
function skipQuestion(){
  const q=S.current; const dt=stopTimer();
  showAnswered(q, false, dt, true);   // 跳过=显示答案/解析，不计统计、不进错题本
}
function isCorrect(q, sel){
  if(q.type==='single') return sel.size===1 && sel.has((q.answer||[])[0]);
  if(q.type==='multiple'){ if(sel.size!==(q.answer||[]).length) return false; for(const a of (q.answer||[])) if(!sel.has(a)) return false; return true; }
  return false;
}
function nextQuestion(){
  const sess = S.session;
  if(sess.idx < sess.queue.length-1){ sess.idx++; renderQuestion(); }
  else finishSession();
}
function finishSession(){
  const st = S.session; const tot = st.queue.length;
  const correct = (st.results||[]).filter(Boolean).length;
  // 整个章节提交后，自动清除本章所有标注，避免影响下次做题
  (st.queue||[]).forEach(id=>{ delete S.marks[id]; });
  S.session = null; store.remove('cpa_'+S.subject+'_session');
  save();
  showSummary(tot, correct);
}
function showSummary(tot, correct){
  const acc = tot? Math.round(correct/tot*100):0;
  const r = $('#pResult');
  $('#pStem').textContent = '本组练习完成 🎉';
  $('#pOpts').innerHTML=''; $('#pOpts').classList.remove('locked');
  r.innerHTML = `<div class="banner ok">本组共 ${tot} 题　·　全对 ${correct} 题　·　正确率 ${acc}%</div>
    <div class="pfoot" style="margin-top:16px;"><button class="btn" id="backHome">返回首页</button><button class="btn sec" id="again">再来一组</button></div>`;
  $('#submitBtn').classList.add('hide'); $('#nextBtn').classList.add('hide'); $('#askAiBtn').classList.add('hide'); $('#masteryBtn').classList.add('hide'); $('#prevBtn').disabled=true;
  $('#backHome').addEventListener('click', ()=>{ S.session=null; showView('home'); initHome(); });
  $('#again').addEventListener('click', ()=>{ if(chosenMode) startSession(); });
}

$('#submitBtn').addEventListener('click', submitAnswer);
$('#skipBtn').addEventListener('click', skipQuestion);
$('#nextBtn').addEventListener('click', nextQuestion);
$('#prevBtn').addEventListener('click', ()=>{ if(S.session && S.session.idx>0){ S.session.idx--; renderQuestion(); }});
$('#exitBtn').addEventListener('click', ()=>{ if(S.session){ showView('home'); initHome(); } });
$('#resumeBtn').addEventListener('click', resumeSession);

/* ---------- wrong ---------- */
function renderReview(){
  const wrongIds = Object.keys(S.wrong).map(Number);
  const favIds = Object.keys(S.fav).map(Number);
  $('#wCount').textContent = wrongIds.length;
  $('#fCount').textContent = favIds.length;
  const filter = ($('#reviewSeg') && $('#reviewSeg').querySelector('.on') && $('#reviewSeg').querySelector('.on').dataset.f) || 'all';
  const set = new Set();
  if(filter==='all' || filter==='wrong') wrongIds.forEach(id=>set.add(id));
  if(filter==='all' || filter==='fav') favIds.forEach(id=>set.add(id));
  const ids = [...set].filter(id=>qById(id)).sort((a,b)=> (S.wrong[b]?S.wrong[b].lastWrongTs:0) - (S.wrong[a]?S.wrong[a].lastWrongTs:0));
  const list = $('#wList');
  if(!ids.length){
    const label = filter==='fav'?'收藏':filter==='wrong'?'错题':'记录';
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg><div>还没有${label}，继续加油！</div></div>`;
    return;
  }
  list.innerHTML='';
  ids.forEach(id=>{
    const isWrong = !!S.wrong[id];
    const isFav = !!S.fav[id];
    const w = S.wrong[id] || {};
    const q = qById(id);
    const stem = (w.snap && w.snap.stem) || (q && q.stem) || '（题目内容不可用）';
    const chap = (w.snap && w.snap.chapter) || (q && q.chapter) || '';
    const ci = (w.snap && w.snap.chapterIndex) || (q && q.chapterIndex) || 0;
    const type = w.type || (q && q.type) || 'unknown';
    const el = document.createElement('div'); el.className='item';
    let badges='';
    if(isWrong) badges += `<span class="badge bad">错 ${w.attempts||0} 次</span>`;
    if(isFav) badges += `<span class="badge fav">收藏</span>`;
    const noteTxt = S.notes[id] || (S.wrong[id] && S.wrong[id].note) || (typeof S.fav[id]==='object' && S.fav[id].note) || '';
    el.innerHTML = `<div class="grow"><div class="meta">第${ci}章 ${chap} · ${TYPE_LABEL[type]||'题'}${badges}</div><div class="q">${escapeHtml(String(stem).slice(0,80))}</div>${noteTxt? `<div class="note">💭 ${escapeHtml(noteTxt)}</div>`:''}</div>`;
    const redo = document.createElement('button'); redo.className='btn sec'; redo.textContent='重做';
    redo.addEventListener('click', ()=>{ S.session=newSession([id], isWrong?'wrong':'fav'); showView('practice'); renderQuestion(); });
    const del = document.createElement('button'); del.className='btn ghost'; del.textContent='移除';
    del.addEventListener('click', ()=>{ if(isWrong) delete S.wrong[id]; if(isFav) delete S.fav[id]; save(); renderReview(); toast('已移除'); });
    el.appendChild(redo); el.appendChild(del); list.appendChild(el);
  });
}
$('#wRedo').addEventListener('click', ()=>{
  const ids = [...new Set([...Object.keys(S.wrong).map(Number), ...Object.keys(S.fav).map(Number)])].filter(id=>qById(id));
  if(!ids.length){ toast('暂无可重练的题目'); return; }
  S.session=newSession(ids, 'wrong'); showView('practice'); renderQuestion();
});
$$('#reviewSeg button').forEach(b=> b.addEventListener('click', ()=>{ segPick('#reviewSeg', b); renderReview(); }));
$('#wClear').addEventListener('click', ()=>{ if(confirm('确定清空错题本？')){ S.wrong={}; save(); renderReview(); toast('已清空'); } });
$('#wExport').addEventListener('click', ()=> download('cpa_records.json', JSON.stringify({wrong:S.wrong, fav:S.fav, notes:S.notes})));
$('#wImport').addEventListener('click', ()=> $('#wFile').click());
$('#wFile').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{ try{
    const obj=JSON.parse(rd.result);
    let wrongSrc=[], favSrc=[], notesSrc={};
    if(obj && !Array.isArray(obj) && (obj.wrong||obj.fav||obj.notes)){ wrongSrc=obj.wrong?Object.values(obj.wrong):[]; favSrc=obj.fav?Object.values(obj.fav):[]; notesSrc=obj.notes||{}; }
    else { wrongSrc = Array.isArray(obj)? obj : (obj && typeof obj==='object'? Object.values(obj) : []); }
    let n=0;
    const mergeRec=(map, it)=>{ if(!it || it.id==null) return; const cur=map[it.id]||{}; map[it.id]={id:it.id, type:it.type||cur.type, chapter:it.chapter||cur.chapter, chapterIndex:it.chapterIndex||cur.chapterIndex, attempts:Math.max(it.attempts||0,cur.attempts||0), lastWrongTs:it.lastWrongTs||cur.lastWrongTs||Date.now(), snap:it.snap||cur.snap, note:(it.note!==undefined?it.note:cur.note)}; n++; };
    wrongSrc.forEach(it=> mergeRec(S.wrong, it));
    favSrc.forEach(it=> mergeRec(S.fav, it));
    Object.keys(notesSrc).forEach(k=>{ S.notes[Number(k)] = notesSrc[k]; });
    save(); renderReview(); toast('已导入 '+n+' 道记录');
  }catch(err){ toast('文件格式错误'); } };
  rd.readAsText(f); e.target.value='';
});

/* ---------- stats ---------- */
let statTab = store.get('cpa_stat_tab', 'stats');
function renderStats(){
  const st = S.stats;
  $('#sAns').textContent = st.answered;
  $('#sAcc').textContent = st.answered? Math.round(st.correct/st.answered*100)+'%' : '0%';
  $('#sTime').textContent = st.answered? (Math.round(st.timeMs/st.answered/1000))+'s' : '0s';
  $('#sWrong').textContent = Object.keys(S.wrong).length;
  const bars = $('#sBars'); bars.innerHTML='';
  const arr = Object.values(st.perChapter).filter(c=>c.answered>0).sort((a,b)=>b.answered-a.answered);
  if(!arr.length){ bars.innerHTML='<p class="md" style="color:var(--ink2)">还没有做题记录，去练习吧。</p>'; }
  else {
    arr.forEach(c=>{
      const acc = Math.round(c.correct/c.answered*100);
      const el=document.createElement('div'); el.className='barrow';
      el.innerHTML = `<div class="nm" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div><div class="track"><i style="width:${acc}%"></i></div><div class="pc">${acc}% · ${c.answered}题</div>`;
      bars.appendChild(el);
    });
  }
  renderMasteryOverview();
  renderDiagnosis();
  applyStatTab();
}
function renderMasteryOverview(){
  const hist = S.history || [];
  const byQid = {};
  hist.forEach(r=>{ (byQid[r.qid] || (byQid[r.qid]=[])).push(r); });
  let rec=0, weak=0, stable=0, unstable=0;
  const WEAK = {'不会/没学过':1,'不确定，靠猜或排除':1,'知识点记混了':1};
  Object.keys(byQid).forEach(qid=>{
    const recs = byQid[qid];
    let m=null;
    for(let i=recs.length-1;i>=0;i--){ const x=recs[i].mastery; if(x && (x.main || (x.reasons && x.reasons.length))){ m=x; break; } }
    if(!m) return;
    rec++;
    const everCorrect = recs.some(r=>r.correct===true);
    const main = m.main;
    if(main && WEAK[main]) weak++;
    else if(main==='理解了，会分析'){ if(everCorrect) stable++; }
    else if(everCorrect) unstable++;
  });
  $('#mRec').textContent = rec;
  $('#mWeak').textContent = weak;
  $('#mStable').textContent = stable;
  $('#mUnstable').textContent = unstable;
}
function applyStatTab(){
  const showStats = statTab==='stats';
  $('#statPanelStats').classList.toggle('hide', !showStats);
  $('#statPanelDiag').classList.toggle('hide', showStats);
  $$('#statSeg button').forEach(x=> x.classList.toggle('on', x.dataset.tab===statTab));
}

/* ---------- 章节掌握分析 ---------- */
function renderDiagnosis(){
  const SUB = D();
  const REASONS = [
    {key:'不会/没学过',      color:'#ff3b30'},
    {key:'不确定，靠猜或排除', color:'#ff9500'},
    {key:'知识点记混了',      color:'#af52de'},
    {key:'理解了，会分析',    color:'#34c759'},
    {key:'粗心/审题问题',     color:'#0071e3'},
    {key:'其他',             color:'#8e8e93'}
  ];
  const hist = S.history || [];
  const byQid = {};
  hist.forEach(r=>{ (byQid[r.qid] || (byQid[r.qid]=[])).push(r); });

  /* 模块一：我的主要问题分布（仅统计每题最新主要原因，合计 100%） */
  const mainCount = {}; REASONS.forEach(r=>mainCount[r.key]=0);
  let mainTotal=0;
  Object.keys(byQid).forEach(qid=>{
    let last=null;
    for(let i=byQid[qid].length-1;i>=0;i--){ if(byQid[qid][i].mastery && byQid[qid][i].mastery.main){ last=byQid[qid][i].mastery; break; } }
    if(last && last.main){ mainCount[last.main]++; mainTotal++; }
  });
  const d1=$('#dMod1'); d1.innerHTML='';
  if(!mainTotal){ d1.innerHTML='<p class="md" style="color:var(--ink2)">还没有记录「主要原因」。提交题目后点「记录本题掌握情况」，勾选原因并指定主要原因，这里会生成你的主要问题分布（合计 100%）。</p>'; }
  else {
    REASONS.forEach(r=>{
      const c=mainCount[r.key]; if(!c) return;
      const pct=Math.round(c/mainTotal*100);
      const el=document.createElement('div'); el.className='barrow';
      el.innerHTML='<div class="nm" style="width:150px;flex-basis:150px;color:var(--ink);font-weight:500;" title="'+escapeHtml(r.key)+'">'+escapeHtml(r.key)+'</div><div class="track"><i style="width:'+pct+'%;background:'+r.color+'"></i></div><div class="pc" style="width:120px;flex-basis:120px;">'+pct+'% · '+c+'题</div>';
      d1.appendChild(el);
    });
    const tot=document.createElement('div'); tot.className='dtotal'; tot.textContent='合计 100% · 共 '+mainTotal+' 题含主要原因'; d1.appendChild(tot);
  }

  /* 模块二：章节掌握情况（问题题数 ÷ 练习题数，薄弱优先） */
  const d2=$('#dMod2'); d2.innerHTML='';
  const chMap={};
  hist.forEach(r=>{
    if(r.correct===null||r.correct===undefined) return;
    const ci=r.ci; if(!chMap[ci]) chMap[ci]={practice:new Set(),problem:new Set(),name:(qById(r.qid)?qById(r.qid).chapter:'第'+ci+'章')};
    chMap[ci].practice.add(r.qid);
    if(!r.correct) chMap[ci].problem.add(r.qid);
  });
  const chRows=Object.keys(chMap).map(ci=>({ci:Number(ci),name:chMap[ci].name,practice:chMap[ci].practice.size,problem:chMap[ci].problem.size})).filter(x=>x.practice>0);
  chRows.sort((a,b)=> (b.problem/b.practice)-(a.problem/a.practice) || b.practice-a.practice);
  if(!chRows.length){ d2.innerHTML='<p class="md" style="color:var(--ink2)">还没有做题记录，去练习后这里会按章节展示薄弱情况。</p>'; }
  else {
    chRows.forEach(x=>{
      const pct=Math.round(x.problem/x.practice*100);
      const el=document.createElement('div'); el.className='barrow';
      el.innerHTML='<div class="nm" style="width:200px;flex-basis:200px;color:var(--ink);font-weight:500;" title="'+escapeHtml(x.name)+'">第'+x.ci+'章 '+escapeHtml(x.name)+'</div><div class="track"><i style="width:'+pct+'%;background:'+(pct>=50?'#ff3b30':pct>=30?'#ff9500':'#34c759')+';"></i></div><div class="pc" style="width:170px;flex-basis:170px;">问题比例 '+pct+'% · 练习'+x.practice+'题</div>';
      d2.appendChild(el);
    });
  }

  /* 模块三：知识点漏洞地图（以知识点为最小单位，使用全部原因记录） */
  const d3=$('#dMod3'); d3.innerHTML='';
  const kpMap={};
  hist.forEach(r=>{
    if(!r.mastery || !r.mastery.reasons || !r.mastery.reasons.length) return;
    const kp=r.kp||'未分类';
    if(!kpMap[kp]) kpMap[kp]={count:0,recs:[]};
    kpMap[kp].count++;
    kpMap[kp].recs.push({ts:r.ts,reasons:r.mastery.reasons,main:r.mastery.main});
  });
  const kpKeys=Object.keys(kpMap).sort((a,b)=>kpMap[b].count-kpMap[a].count);
  if(!kpKeys.length){ d3.innerHTML='<p class="md" style="color:var(--ink2)">还没有记录掌握情况，无法生成知识点漏洞地图。</p>'; }
  else {
    kpKeys.slice(0,40).forEach(kp=>{
      const o=kpMap[kp];
      const card=document.createElement('div'); card.className='kpcard';
      let html='<h3>'+escapeHtml(kp)+' <span class="pill">练习 '+o.count+' 次</span></h3>';
      const recs=o.recs.slice().sort((a,b)=>a.ts-b.ts).slice(-6);
      html+='<div class="kphist">';
      recs.forEach(rc=>{
        const d=new Date(rc.ts); const ds=(d.getMonth()+1)+'/'+d.getDate();
        const tags=rc.reasons.map(rk=>'<span class="kptag kp-'+reasonClass(rk)+'">'+escapeHtml(rk)+'</span>').join('');
        html+='<div class="khrow"><span class="khdate">'+ds+'</span>'+tags+'</div>';
      });
      html+='</div>';
      card.innerHTML=html; d3.appendChild(card);
    });
  }

  /* 模块四：掌握变化趋势（按时间，观察从不会→理解） */
  const d4=$('#dMod4'); d4.innerHTML='';
  const trendRecs=hist.filter(r=>r.mastery&&r.mastery.main).map(r=>({ts:r.ts, main:r.mastery.main}));
  if(!trendRecs.length){ d4.innerHTML='<p class="md" style="color:var(--ink2)">还没有「主要原因」记录，无法展示趋势。记录掌握情况后这里会显示你从「不会」到「理解，会分析」的进步轨迹。</p>'; }
  else {
    trendRecs.sort((a,b)=>a.ts-b.ts);
    const BUCKET=8;
    const buckets=[];
    for(let i=0;i<trendRecs.length;i+=BUCKET) buckets.push(trendRecs.slice(i,i+BUCKET));
    let html='<div class="trend">';
    buckets.forEach((b,n)=>{
      const understood=b.filter(x=>x.main==='理解了，会分析').length;
      const pct=Math.round(understood/b.length*100);
      const label = n===0?'前期':(n===buckets.length-1?'近期':'');
      html+='<div class="tcol"><div class="tbar" style="height:'+Math.max(pct,4)+'%"><span class="tval">'+pct+'%</span></div><div class="tlbl">'+(label||('第'+(n+1)+'段'))+'</div></div>';
    });
    html+='</div>';
    const first=trendRecs[0].main, last=trendRecs[trendRecs.length-1].main;
    const LEVEL={'不会/没学过':0,'知识点记混了':1,'不确定，靠猜或排除':2,'理解了，会分析':3,'粗心/审题问题':2,'其他':2};
    const improved=(LEVEL[last]||0)>(LEVEL[first]||0);
    html+='<p class="md" style="color:var(--ink2);margin-top:10px;">最早记录主因为「'+escapeHtml(first)+'」，最近一次为「'+escapeHtml(last)+'」——'+(improved?'整体呈进步趋势 ✅':'继续加油，保持复盘 💪')+'。柱高为「理解了，会分析」占比。</p>';
    d4.innerHTML=html;
  }
}
function reasonClass(k){ return ({'不会/没学过':'r0','不确定，靠猜或排除':'r1','知识点记混了':'r2','理解了，会分析':'r3','粗心/审题问题':'r4','其他':'r5'})[k]||'r5'; }
function masteryTip(weakCounts, understood, mcount){
  const entries = Object.entries(weakCounts).sort((a,b)=>b[1]-a[1]);
  if(entries.length){
    const top = entries[0][0], n = entries[0][1];
    const SUG = {
      '不会/没学过':'建议补充基础知识，回归教材对应小节再练。',
      '不确定，靠猜或排除':'属于潜在薄弱题，建议重做并独立推导答案，不要依赖排除法。',
      '知识点记混了':'建议做知识点对比表，区分易混情形与适用条件。',
      '粗心/审题问题':'提醒加强考试执行训练：圈画关键词、看清要求再作答。'
    };
    return '<b>薄弱点提示：</b>出现最多的是「'+escapeHtml(top)+'」（'+n+' 次）。'+(SUG[top]||'');
  }
  if(understood && understood/mcount >= 0.6){
    return '<b>整体掌握较好：</b>本章复盘里「理解了，会分析」占多数，可适当降低复习频率，主攻其他薄弱章。';
  }
  return '';
}

/* ---------- chat ---------- */
let chatMsgs = store.get('cpa_chat', []);
let chatFav = store.get('cpa_chat_fav', []);
let chatShowFav = false;
let curAiCtx = '';
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function mdInline(t){
  t=escapeHtml(t);
  t=t.replace(/`([^`]+)`/g,'<code>$1</code>');
  t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*([^\s*][^*\n]*[^\s*]|[^\s*])\*/g,'<em>$1</em>');
  t=t.replace(/_([^\s_][^_\n]*[^\s_]|[^\s_])_/g,'<em>$1</em>');
  return t;
}
function mdToHtml(src){
  if(src==null) return '';
  const lines=String(src).split('\n');
  let html='',inUl=false,inOl=false,inP=false,inBq=false,inCode=false,codeBuf=[];
  const closeLists=()=>{ if(inUl){html+='</ul>';inUl=false;} if(inOl){html+='</ol>';inOl=false;} };
  const closeP=()=>{ if(inP){html+='</p>';inP=false;} };
  const closeBq=()=>{ if(inBq){html+='</blockquote>';inBq=false;} };
  const flushCode=()=>{ if(inCode){ html+='<pre><code>'+escapeHtml(codeBuf.join('\n'))+'</code></pre>'; inCode=false; codeBuf=[]; } };
  const closeAll=()=>{ flushCode(); closeLists(); closeP(); closeBq(); };
  for(let line of lines){
    const fence=line.match(/^```(.*)$/);
    if(fence){ if(inCode){ flushCode(); } else { closeAll(); inCode=true; codeBuf=[]; } continue; }
    if(inCode){ codeBuf.push(line); continue; }
    const bq=line.match(/^>\s?(.*)$/);
    if(bq){ if(!inBq){ closeLists(); closeP(); html+='<blockquote class="mdq">'; inBq=true; } else { html+='<br>'; } html+=mdInline(bq[1]); continue; }
    closeBq();
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){ closeLists(); closeP(); const lv=h[1].length; html+='<h'+lv+' class="mdh">'+mdInline(h[2])+'</h'+lv+'>'; continue; }
    const ul=line.match(/^\s*[-*]\s+(.*)$/);
    if(ul){ closeP(); if(inOl){html+='</ol>';inOl=false;} if(!inUl){html+='<ul>';inUl=true;} html+='<li>'+mdInline(ul[1])+'</li>'; continue; }
    const ol=line.match(/^\s*\d+\.\s+(.*)$/);
    if(ol){ closeP(); if(inUl){html+='</ul>';inUl=false;} if(!inOl){html+='<ol>';inOl=true;} html+='<li>'+mdInline(ol[1])+'</li>'; continue; }
    if(line.trim()===''){ closeLists(); closeP(); continue; }
    if(!inP){html+='<p>';inP=true;} else {html+='<br>';}
    html+=mdInline(line);
  }
  closeAll();
  return html;
}
function copyText(t){
  const done=()=>toast('已复制');
  const fail=()=>toast('复制失败，请手动选择');
  if(navigator.clipboard && window.isSecureContext){ navigator.clipboard.writeText(t).then(done,()=>fallbackCopy(t,done,fail)); }
  else fallbackCopy(t,done,fail);
}
function fallbackCopy(t,done,fail){ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.top='-9999px'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{ document.execCommand('copy'); if(done)done(); }catch(e){ if(fail)fail(); } ta.remove(); }
function autoGrow(ta,max){ if(!ta) return; ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,(max||160))+'px'; }
function updateChatFavBtn(){
  const b=$('#chatFavBtn'); if(!b) return;
  b.textContent = chatShowFav? '← 返回对话' : '★ 收藏('+chatFav.length+')';
}
function renderChatReady(){
  const ok = !!(S.settings.apiKey && S.settings.apiBase);
  $('#apiState').textContent = ok? '已连接' : '未配置接口';
  $('#apiState').className = 'pill ' + (ok?'g':'am');
  $('#apiBanner').classList.toggle('hide', ok);
  updateChatFavBtn();
  const body=$('#chatBody'); body.innerHTML='';
  if(chatShowFav){
    if(!chatFav.length){ const s=document.createElement('div'); s.className='msg sys'; s.textContent='你还没有收藏任何对话。长按对话气泡可「收藏」。'; body.appendChild(s); }
    chatFav.forEach(f=> addMsg(f.role, f.text, false, f, true));
    body.scrollTop = body.scrollHeight; return;
  }
  if(!chatMsgs.length){ const s=document.createElement('div'); s.className='msg sys'; s.textContent='你好，我是你的 CPA AI 助教。遇到不理解的知识点或题目，随时问我。'; body.appendChild(s); }
  chatMsgs.forEach(m=> addMsg(m.role, m.text, false, m, false));
  body.scrollTop = body.scrollHeight;
}
function addMsg(role, text, saveIt, msgObj, isFav, ctxArg){
  const body=$('#chatBody');
  const m=document.createElement('div'); m.className='msg '+role;
  if(role==='sys' && ((msgObj&&msgObj.divider) || (typeof text==='string' && text.indexOf('—— 当前题目')===0))){ m.classList.add('divider'); }
  const ctx = ctxArg || (msgObj && msgObj.qctx) || '';
  if(ctx){ const tag=document.createElement('div'); tag.className='qtag'; tag.textContent='📌 '+ctx; m.appendChild(tag); }
  if(role!=='sys'){ const w=document.createElement('div'); w.className='who'; w.textContent= role==='user'? (S.settings.name||'我') : 'AI 助教'; m.appendChild(w); }
  const c=document.createElement('div'); c.className='bubble';
  if(role==='sys'){ c.textContent=text; } else { c.innerHTML=mdToHtml(text); }
  m.appendChild(c);
  if(role!=='sys'){
    const acts=document.createElement('div'); acts.className='msg-acts';
    const cp=document.createElement('button'); cp.className='minibtn'; cp.type='button'; cp.textContent='复制';
    cp.onclick=()=> copyText(text);
    acts.appendChild(cp); m.appendChild(acts);
  }
  body.appendChild(m); body.scrollTop=body.scrollHeight;
  if(saveIt){ const obj={role, text}; if(ctx) obj.qctx=ctx; chatMsgs.push(obj); store.set('cpa_chat', chatMsgs); m._msg=obj; }
  else if(msgObj){ if(isFav) m._fav=msgObj; else m._msg=msgObj; }
  if((m._msg || m._fav) && role!=='sys') attachLongPress(m);
  return m;
}
function attachLongPress(el){
  let timer=null, sx=0, sy=0;
  const start=(e)=>{ sx=e.clientX; sy=e.clientY; if(timer) clearTimeout(timer); timer=setTimeout(()=>{ timer=null; showMsgMenu(el); }, 450); };
  const cancel=()=>{ if(timer){ clearTimeout(timer); timer=null; } };
  const move=(e)=>{ if(Math.abs(e.clientX-sx)>10 || Math.abs(e.clientY-sy)>10) cancel(); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', e=> e.preventDefault());
}
let msgMenu=null;
function showMsgMenu(el){
  hideMsgMenu();
  const menu=document.createElement('div'); menu.className='msg-menu';
  const bDel=document.createElement('button'); bDel.className='danger'; bDel.textContent='删除';
  bDel.onclick=()=>{ deleteMsg(el); hideMsgMenu(); };
  const bFav=document.createElement('button'); bFav.textContent= el._fav? '取消收藏' : '收藏';
  bFav.onclick=()=>{ toggleFavMsg(el); hideMsgMenu(); };
  menu.appendChild(bDel); menu.appendChild(bFav);
  document.body.appendChild(menu);
  msgMenu=menu;
  const r=el.getBoundingClientRect();
  menu.style.top=(r.bottom+6)+'px'; menu.style.left=r.left+'px';
  requestAnimationFrame(()=>{
    const mr=menu.getBoundingClientRect();
    if(mr.right>window.innerWidth-8) menu.style.left=(window.innerWidth-mr.width-8)+'px';
    if(mr.bottom>window.innerHeight-8) menu.style.top=(r.top-menu.offsetHeight-6)+'px';
  });
  setTimeout(()=> document.addEventListener('pointerdown', outsideMenu, {once:true}), 0);
}
function outsideMenu(e){ if(msgMenu && !msgMenu.contains(e.target)) hideMsgMenu(); }
function hideMsgMenu(){ if(msgMenu){ msgMenu.remove(); msgMenu=null; document.removeEventListener('pointerdown', outsideMenu); } }
function deleteMsg(el){
  if(el._fav){ const i=chatFav.indexOf(el._fav); if(i>=0){ chatFav.splice(i,1); store.set('cpa_chat_fav', chatFav); updateChatFavBtn(); } toast('已取消收藏'); }
  else if(el._msg){ const i=chatMsgs.indexOf(el._msg); if(i>=0){ chatMsgs.splice(i,1); store.set('cpa_chat', chatMsgs); } toast('已删除该条对话'); }
  renderChatReady();
}
function toggleFavMsg(el){
  if(el._fav){ const i=chatFav.indexOf(el._fav); if(i>=0){ chatFav.splice(i,1); store.set('cpa_chat_fav', chatFav); updateChatFavBtn(); } toast('已取消收藏'); }
  else if(el._msg){ if(chatFav.some(f=> f.text===el._msg.text && f.role===el._msg.role)){ toast('已在收藏中'); return; } chatFav.push({role:el._msg.role, text:el._msg.text, ts:Date.now()}); store.set('cpa_chat_fav', chatFav); updateChatFavBtn(); toast('已收藏对话'); }
  renderChatReady();
}
async function chatSend(){
  const ta=$('#chatText'); const text=ta.value.trim(); if(!text) return;
  addMsg('user', text, true, null, false, curAiCtx); ta.value=''; autoGrow(ta);
  if(!(S.settings.apiKey && S.settings.apiBase)){ addMsg('sys','请先在「设置」中配置 AI 接口。', false); return; }
  // placeholder streaming msg
  const body=$('#chatBody');
  const m=document.createElement('div'); m.className='msg ai';
  if(curAiCtx){ const tag=document.createElement('div'); tag.className='qtag'; tag.textContent='📌 '+curAiCtx; m.appendChild(tag); }
  const w=document.createElement('div'); w.className='who'; w.textContent='AI 助教'; m.appendChild(w);
  const c=document.createElement('div'); c.className='bubble'; c.innerHTML='<span class="typing"><i></i><i></i><i></i></span>'; m.appendChild(c);
  body.appendChild(m); body.scrollTop=body.scrollHeight;
  const messages = chatMsgs.map(x=>({role:x.role==='sys'?'system':x.role, content:x.text})).filter(x=>x.role!=='system' || true);
  // system prompt
  const subjName = (SUBJECTS[S.subject] && SUBJECTS[S.subject].name) || '会计';
  let sysContent='你是一位严谨、耐心、善于用中文讲解的注册会计师(CPA)'+subjName+'考试辅导老师。结合'+subjName+'考试的知识点和例题，帮助学生理解知识点。回答要简明、有条理。';
  const diag=buildDiagnosisSummary();
  if(diag && (S.history||[]).length) sysContent+='\n\n以下是该学生在本机/跨设备统一学习数据库中的离线诊断摘要（真实做题与掌握情况记录，非示例），可用于针对性给出薄弱章节与复习建议：\n'+diag;
  const sys = {role:'system', content:sysContent};
  const payload = {model:S.settings.model||'gpt-4o-mini', messages:[sys, ...messages.filter(x=>x.role!=='system')], stream:true, temperature:0.6};
  try{
    const resp = await fetch(S.settings.apiBase.replace(/\/$/,'')+'/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.settings.apiKey}, body:JSON.stringify(payload)
    });
    if(!resp.ok){ c.textContent='接口返回错误：'+resp.status; return; }
    const reader = resp.body.getReader(); const dec=new TextDecoder(); let buf=''; let full='';
    while(true){ const {done,value}=await reader.read(); if(done) break; buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n'); buf=lines.pop();
      for(const line of lines){ const t=line.trim(); if(!t.startsWith('data:')) continue; const d=t.slice(5).trim(); if(d==='[DONE]') continue;
        try{ const j=JSON.parse(d); const tok=j.choices?.[0]?.delta?.content||''; if(tok){ full+=tok; c.innerHTML=mdToHtml(full); body.scrollTop=body.scrollHeight; } }catch(e){} }
    }
    const saved={role:'ai', text:full, qctx:curAiCtx}; chatMsgs.push(saved); store.set('cpa_chat', chatMsgs); m._msg=saved; attachLongPress(m);
  }catch(err){ c.textContent='请求失败：'+err.message; }
}
$('#chatSend').addEventListener('click', chatSend);
$('#chatText').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); chatSend(); } });
$('#chatFavBtn').addEventListener('click', ()=>{ chatShowFav=!chatShowFav; renderChatReady(); });
$('#chatClearBtn').addEventListener('click', ()=>{ if(confirm('清空当前 AI 助教对话记录？此操作不可撤销。')){ chatMsgs=[]; store.set('cpa_chat', []); renderChatReady(); toast('已清空对话'); } });
$('#askAiBtn').addEventListener('click', ()=>{
  const btn = $('#askAiBtn');
  const q = btn._q || S.current || (S.session && qById(S.session.queue[S.session.idx]));
  if(!q) return;
  const ctx = `第${q.chapterIndex}章 ${q.chapter} · ${q.stem.slice(0,20)}${q.stem.length>20?'…':''}`;
  const divider = `—— 正在询问的题目：第${q.chapterIndex}章 ${q.chapter} · ${q.stem.slice(0,60)}${q.stem.length>60?'...':''} ——`;
  const prompt = `我在做一道${TYPE_LABEL[q.type]}，题目如下：\n${q.stem}\n选项：\n${(q.options||[]).map(o=>o.key+'. '+o.text).join('\n')}\n正确答案：${(q.answer||[]).join('、')}\n解析：${q.explanation||''}\n请用通俗、易懂的方式帮我讲解这个知识点，并指出容易踩坑的地方。`;
  chatShowFav=false; showView('chat'); renderChatReady();
  addMsg('sys', divider, true);
  curAiCtx = ctx;
  $('#chatText').value=prompt; $('#chatText').focus();
});

$('#chatText').addEventListener('input', e=>autoGrow(e.target));
$('#chatCopyAll').addEventListener('click', ()=>{
  if(!chatMsgs.length){ toast('还没有对话可复制'); return; }
  const txt=chatMsgs.map(m=>{ const who=m.role==='user'?(S.settings.name||'我'):(m.role==='sys'?'——':'AI 助教'); return who+'：\n'+m.text; }).join('\n\n');
  copyText(txt);
});
$('#chatExpandBtn').addEventListener('click', ()=>{ $('#cemText').value=$('#chatText').value; $('#chatExpandModal').classList.remove('hide'); setTimeout(()=>$('#cemText').focus(),50); });
$('#cemClose').addEventListener('click', ()=>{ $('#chatText').value=$('#cemText').value; $('#chatExpandModal').classList.add('hide'); autoGrow($('#chatText')); });
$('#cemMask').addEventListener('click', ()=>{ $('#chatText').value=$('#cemText').value; $('#chatExpandModal').classList.add('hide'); autoGrow($('#chatText')); });
$('#cemSend').addEventListener('click', ()=>{ $('#chatText').value=$('#cemText').value; $('#chatExpandModal').classList.add('hide'); autoGrow($('#chatText')); chatSend(); });

/* ---------- 记录本题掌握情况 ---------- */
const MASTERY_OPTS = [
  {key:'理解了，会分析', desc:'真正理解该知识点，能解释为什么选该答案、其他选项为什么错。'},
  {key:'不会/没学过', desc:'这个知识点我没有掌握，或者已经忘记规则。'},
  {key:'不确定，靠猜或排除', desc:'答案选对了，但自己没有明确依据；靠感觉或排除法碰巧做对。'},
  {key:'知识点记混了', desc:'知道相关知识，但不同知识点、规则或条件混淆。'},
  {key:'粗心/审题问题', desc:'知识点和解题方法基本掌握，但因执行错误（漏看关键词/看错要求/算错）导致错误。'},
  {key:'其他', desc:'用户自定义补充原因。', other:true}
];
function closeMastery(){ const m=document.getElementById('masteryMask'); if(m) m.remove(); }
function openMastery(q){
  closeMastery();
  const rec = S.mastery[q.id] || {reasons:[], main:'', other_note:''};
  const sel = new Set(rec.reasons||[]);
  let mainSel = rec.main||'';
  const mask = document.createElement('div'); mask.className='mask'; mask.id='masteryMask';
  const sub = '第'+q.chapterIndex+'章 '+q.chapter+' · '+escapeHtml(q.stem.slice(0,30))+(q.stem.length>30?'…':'');
  const optsHtml = MASTERY_OPTS.map((o,i)=>{
    const on = sel.has(o.key);
    return '<div class="mopt'+(on?' on':'')+'" data-i="'+i+'"'+(o.other?' data-other="1"':'')+'>'
      +'<div class="box">'+(on?'✓':'')+'</div>'
      +'<div class="grow"><div class="ot">'+escapeHtml(o.key)+'</div><div class="od">'+escapeHtml(o.desc)+'</div></div>'
      +'</div>';
  }).join('');
  mask.innerHTML = '<div class="mdialog">'
    +'<div class="mhead"><span>记录本题掌握情况</span><button class="x" id="mClose" title="关闭">×</button></div>'
    +'<div class="msub"><b>'+sub+'</b><br>用于复盘你的真实掌握程度：不仅记录错题，也记录做对的题。不强制，可多选，也可一项都不选直接保存。</div>'
    +'<div class="mfoot mfoot-top"><span class="mhint">已选 <b id="mCount">'+sel.size+'</b> 项</span><button class="btn" id="mSave">保存</button></div>'
    +'<div id="mOpts">'+optsHtml+'</div>'
    +'<div class="msec" id="mMainWrap"><div class="msech">主要原因（多选后，点选其一作为主因；只选一项则自动作为主因）</div><div id="mMain"></div></div>'
    +'<div class="mother hide" id="mOther"><textarea id="mOtherArea" placeholder="请输入其他原因"></textarea></div>'
    +'<div class="mfoot"><button class="btn sec" id="mCancel">取消</button></div>'
    +'</div>';
  document.body.appendChild(mask);
  const otherWrap = mask.querySelector('#mOther');
  const otherArea = mask.querySelector('#mOtherArea');
  if(sel.has('其他')){ otherWrap.classList.remove('hide'); otherArea.value = rec.other_note||''; }
  const mMain = mask.querySelector('#mMain');
  const renderMain = ()=>{
    const arr=[...sel];
    if(arr.length===0){ mMain.innerHTML='<p class="md" style="color:var(--ink3);font-size:12px;">未选择原因，则无主要原因。</p>'; mainSel=''; return; }
    if(arr.length===1){ mainSel=arr[0]; mMain.innerHTML='<p class="md" style="color:var(--ink3);font-size:12px;">仅选 1 项，自动作为主要原因：<b>'+escapeHtml(mainSel)+'</b></p>'; return; }
    mMain.innerHTML = arr.map(k=>'<div class="mradio'+(mainSel===k?' on':'')+'" data-k="'+escapeHtml(k)+'"><div class="rbox">'+(mainSel===k?'●':'')+'</div><div class="rt">'+escapeHtml(k)+'</div></div>').join('');
    mMain.querySelectorAll('.mradio').forEach(el=> el.addEventListener('click', ()=>{ mainSel=el.dataset.k; mMain.querySelectorAll('.mradio').forEach(x=>{ const on=x.dataset.k===mainSel; x.classList.toggle('on',on); x.querySelector('.rbox').textContent=on?'●':''; }); }));
  };
  const refresh = ()=>{
    let n=0;
    mask.querySelectorAll('.mopt').forEach(el=>{ if(el.classList.contains('on')) n++; });
    mask.querySelector('#mCount').textContent = n;
    const otherOpt = mask.querySelector('.mopt[data-other="1"]');
    const showOther = !!otherOpt && otherOpt.classList.contains('on');
    otherWrap.classList.toggle('hide', !showOther);
    if(mainSel && !sel.has(mainSel)) mainSel='';
    renderMain();
  };
  mask.querySelectorAll('.mopt').forEach(el=>{
    el.addEventListener('click', ()=>{ const on=!el.classList.contains('on'); el.classList.toggle('on',on); el.querySelector('.box').textContent=on?'✓':''; if(on) sel.add(MASTERY_OPTS[+el.dataset.i].key); else sel.delete(MASTERY_OPTS[+el.dataset.i].key); refresh(); });
  });
  mask.querySelector('#mClose').addEventListener('click', closeMastery);
  mask.querySelector('#mCancel').addEventListener('click', closeMastery);
  mask.addEventListener('click', e=>{ if(e.target===mask) closeMastery(); });
  mask.querySelector('#mSave').addEventListener('click', ()=>{
    const reasons=[...sel];
    const otherVal = reasons.includes('其他') ? (otherArea.value||'').trim() : '';
    const main = (reasons.length===1)? reasons[0] : (mainSel||'');
    const rec2 = {reasons:reasons, main:main, other_note:otherVal, ts:Date.now()};
    S.mastery[q.id] = rec2;
    // 回写该 qid 最新一条历史记录的掌握情况（保留完整成长轨迹）
    for(let i=S.history.length-1;i>=0;i--){ if(S.history[i].qid===q.id){ S.history[i].mastery={reasons:reasons, main:main, other:otherVal}; break; } }
    save();
    closeMastery();
    const mb=$('#masteryBtn'); if(mb && mb._q && mb._q.id===q.id){ mb.textContent='掌握情况已记录 ✎'; }
    toast(reasons.length? '已记录掌握情况' : '已保存（未选择任何原因）');
  });
}
$('#masteryBtn').addEventListener('click', ()=>{ const q=$('#masteryBtn')._q; if(q) openMastery(q); });
/* ---------- settings ---------- */
const DEF_NAME = '高大上的注册会计师';
function initSettings(){
  $('#setBase').value=S.settings.apiBase||'';
  $('#setKey').value=S.settings.apiKey||'';
  $('#setModel').value=S.settings.model||'';
  $('#setName').value=S.settings.name||DEF_NAME;
}
$('#saveSet').addEventListener('click', ()=>{
  S.settings.apiBase=$('#setBase').value.trim(); S.settings.apiKey=$('#setKey').value.trim();
  S.settings.model=$('#setModel').value.trim(); S.settings.name=$('#setName').value.trim()||DEF_NAME;
  save(); toast('已保存'); renderChatReady();
});
function cleanTok(s){ return (s||'').replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g,''); }
function parseApiInfo(text){
  const r={base:'',key:'',model:''};
  const urlM=text.match(/https?:\/\/[^\s"'<>]+/); if(urlM) r.base=urlM[0].replace(/\/+$/,'');
  let km=text.match(/(?:api[_-]?key|api[_-]?密钥|密钥|key)\s*[:：=]\s*(\S+)/i);
  if(km) r.key=km[1]; else { const sk=text.match(/\b(?:sk|pk|eyJ|AKIA|AIza)[A-Za-z0-9_-]{8,}\b/); if(sk) r.key=sk[0]; }
  let mm=text.match(/(?:model|模型)\s*[:：=]\s*(\S+)/i);
  if(mm) r.model=mm[1];
  else { const known=text.match(/\b(gpt-[\w.-]+|deepseek-[\w.-]+|claude-[\w.-]+|qwen-[\w.-]+|glm-[\w.-]+|moonshot[\w.-]*|ernie-[\w.-]+|Baichuan-[\w.-]+|abab[\w.-]+|doubao-[\w.-]+)\b/i); if(known) r.model=known[0]; }
  r.base=cleanTok(r.base); r.key=cleanTok(r.key); r.model=cleanTok(r.model);
  return r;
}
$('#apiParse').addEventListener('click', ()=>{
  const t=$('#apiPaste').value.trim();
  if(!t){ toast('请先粘贴接口信息'); return; }
  const r=parseApiInfo(t);
  let n=0;
  if(r.base){ $('#setBase').value=r.base; n++; }
  if(r.key){ $('#setKey').value=r.key; n++; }
  if(r.model){ $('#setModel').value=r.model; n++; }
  const info=$('#apiParseInfo');
  if(n===0){ info.textContent='未识别到地址/Key/模型，请检查粘贴内容格式。'; info.style.color='var(--red)'; }
  else { info.textContent='已识别 '+n+' 项，请核对下方无误后点「保存」。'; info.style.color='var(--blue)'; }
});
function buildAnalysis(){
  const hist=S.history||[];
  const chapters={};
  hist.forEach(r=>{ if(r.correct===null||r.correct===undefined) return; const ci=r.ci; if(!chapters[ci]) chapters[ci]={practice:new Set(),problem:new Set()}; chapters[ci].practice.add(r.qid); if(!r.correct) chapters[ci].problem.add(r.qid); });
  const ch=Object.keys(chapters).map(ci=>({ci:Number(ci),practice:chapters[ci].practice.size,problem:chapters[ci].problem.size}));
  const kp={};
  hist.forEach(r=>{ if(!r.mastery||!r.mastery.reasons||!r.mastery.reasons.length) return; const k=r.kp||'未分类'; kp[k]=(kp[k]||0)+1; });
  const trend=hist.filter(r=>r.mastery&&r.mastery.main).map(r=>({ts:r.ts,main:r.mastery.main})).sort((a,b)=>a.ts-b.ts);
  return {chapters:ch, knowledgePoints:kp, trend:trend};
}
function buildDiagnosisSummary(){
  const a=buildAnalysis(); const hist=S.history||[];
  let s='【本地学习诊断（完全离线统计，非 AI 生成）】\n';
  s+='总作答次数：'+hist.filter(r=>r.correct!==null&&r.correct!==undefined).length+' 次\n';
  const mc={}; hist.forEach(r=>{ if(r.mastery&&r.mastery.main) mc[r.mastery.main]=(mc[r.mastery.main]||0)+1; });
  const tot=Object.values(mc).reduce((x,y)=>x+y,0);
  if(tot) s+='主要问题分布：'+Object.entries(mc).sort((p,q)=>q[1]-p[1]).map(([k,v])=>k+' '+(Math.round(v/tot*100))+'%').join('、')+'\n';
  const weak=a.chapters.map(c=>({ci:c.ci,p:c.practice,pn:c.problem,r:c.practice?Math.round(c.problem/c.practice*100):0})).sort((x,y)=>y.r-x.r).slice(0,3);
  if(weak.length) s+='最薄弱章节（问题比例）：'+weak.map(w=>'第'+w.ci+'章 '+w.r+'%('+w.pn+'/'+w.p+')').join('、')+'\n';
  return s;
}
$('#expAll').addEventListener('click', ()=> download('cpa_alldata.json', JSON.stringify({settings:S.settings, wrong:S.wrong, stats:S.stats, marks:S.marks, fav:S.fav, draftByQ:S.draftByQ, mastery:S.mastery, chat:chatMsgs, deviceId:deviceId(), history:S.history, analysis:buildAnalysis()})));
/* 导入全部数据：与「导出全部数据」严格一对。合并而非覆盖——本地已有记录优先，文件仅补充缺失项。 */
$('#impAll').addEventListener('click', ()=> $('#impAllFile').click());
$('#impAllFile').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{ try{
    const obj=JSON.parse(rd.result);
    if(!obj || typeof obj!=='object' || Array.isArray(obj)) throw 0;
    if(!confirm('将把文件中的数据【合并】进当前设备（'+((SUBJECTS[S.subject]&&SUBJECTS[S.subject].name)||'会计')+'），已有错题/收藏/草稿/统计不会被覆盖，确定？')) return;
    // 键值型字段：以本地为准合并（本地优先，文件补缺失），绝不覆盖本地已有项
    const mergeMap=(cur, src)=>{ const m=Object.assign({}, src||{}); for(const k in cur) m[k]=cur[k]; return m; };
    let nWrong=0,nFav=0,nMarks=0,nDraft=0,nMastery=0,nHist=0;
    if(obj.wrong){ const m=mergeMap(S.wrong, obj.wrong); nWrong=Object.keys(m).length-Object.keys(S.wrong).length; S.wrong=m; }
    if(obj.fav){ const m=mergeMap(S.fav, obj.fav); nFav=Object.keys(m).length-Object.keys(S.fav).length; S.fav=m; }
    if(obj.marks){ const m=mergeMap(S.marks, obj.marks); nMarks=Object.keys(m).length-Object.keys(S.marks).length; S.marks=m; }
    if(obj.draftByQ){ const m=mergeMap(S.draftByQ, obj.draftByQ); nDraft=Object.keys(m).length-Object.keys(S.draftByQ).length; S.draftByQ=m; }
    if(obj.mastery){ const m=mergeMap(S.mastery, obj.mastery); nMastery=Object.keys(m).length-Object.keys(S.mastery).length; S.mastery=m; }
    // 设置：本地优先
    if(obj.settings && typeof obj.settings==='object') S.settings=Object.assign({}, obj.settings, S.settings);
    // 答题历史：按 rid 去重合并（不覆盖、保留完整时间线，根治跨设备循环导入重复）
    if(Array.isArray(obj.history) && obj.history.length){
      const seen=new Set((S.history||[]).map(r=>r.rid));
      obj.history.forEach(r=>{ if(r && r.rid && !seen.has(r.rid)){ seen.add(r.rid); S.history.push(r); nHist++; } });
      if(nHist) recomputeStats();
    } else if(obj.stats && typeof obj.stats==='object'){ // 旧版文件（无 history）兼容：沿用累加
      const s=obj.stats;
      S.stats.answered=(S.stats.answered||0)+(s.answered||0);
      S.stats.correct=(S.stats.correct||0)+(s.correct||0);
      S.stats.timeMs=(S.stats.timeMs||0)+(s.timeMs||0);
      const pc=S.stats.perChapter||(S.stats.perChapter={}), pq=S.stats.perQuestion||(S.stats.perQuestion={});
      const fpc=s.perChapter||{}, fpq=s.perQuestion||{};
      for(const k in fpc) pc[k]=(pc[k]||0)+fpc[k];
      for(const k in fpq) pq[k]=(pq[k]||0)+fpq[k];
    }
    // 对话：追加去重
    if(Array.isArray(obj.chat) && obj.chat.length){ const seen=new Set(chatMsgs.map(m=>JSON.stringify(m))); let added=0; obj.chat.forEach(m=>{ const k=JSON.stringify(m); if(!seen.has(k)){ seen.add(k); chatMsgs.push(m); added++; } }); if(added) store.set('cpa_chat', chatMsgs); }
    save(); renderReview(); renderStats();
    toast('已合并导入 ✔ 错题+'+nWrong+' 收藏+'+nFav+' 标记+'+nMarks+' 草稿+'+nDraft+' 掌握情况+'+nMastery+' 历史作答+'+nHist+(obj.chat&&obj.chat.length?' 对话已合并':''));
  }catch(err){ toast('文件格式错误：请选择「导出全部数据」生成的 cpa_alldata.json'); } };
  rd.readAsText(f); e.target.value='';
});
$('#resetAll').addEventListener('click', ()=>{ if(confirm('将清空【'+(SUBJECTS[S.subject]&&SUBJECTS[S.subject].name||'会计')+'】科目的全部做题/错题/统计/历史作答记录，确定？')){ S.wrong={}; S.marks={}; S.fav={}; S.draftByQ={}; S.stats={answered:0,correct:0,timeMs:0,perChapter:{},perQuestion:{}}; S.history=[]; S.session=null; store.remove('cpa_'+S.subject+'_session'); chatMsgs=[]; save(); store.set('cpa_chat',[]); initHome(); renderStats(); toast('已重置'); } });

/* ---------- utils ---------- */
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// 解析分段清洗：PDF 抽取会把同一句话在换行处断开成多段，这里把"未以句末标点结尾的续行"合并，
// 并以句号 / 选项X / 列表项(1) / 注意 / 【提示】等作为真正的段落边界；同时丢弃"刷X题"等泄漏进来的页眉噪声。
function formatExp(raw){
  const head='<h4>答案解析</h4>';
  if(!raw || !raw.trim()) return head+'<p>（无解析）</p>';
  const NOISE=/^(刷[一二三四五六七八九十]?[、.．]?[一-龥]{0,6}题|答案速查|本章答案|刷本章)$/;
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean).filter(l=>!NOISE.test(l));
  const isTerm=s=>/[。！？；：.]$/.test(s)||/[」』）]$/.test(s);
  const newBlock=s=>/^(选项|[（(]\d|注意|【|注：|综上|因此，?|所以，?)/.test(s);
  const paras=[];
  for(const l of lines){
    if(!paras.length){ paras.push(l); continue; }
    if(isTerm(paras[paras.length-1]) || newBlock(l)) paras.push(l);
    else paras[paras.length-1]+=l;
  }
  return head+paras.map(p=>'<p>'+escapeHtml(p)+'</p>').join('');
}
function download(name, content){ const b=new Blob([content],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click(); URL.revokeObjectURL(a.href); }

/* ---------- draft / 笔记（题目下方内联） ---------- */
function setTool(which){ /* 'calc' | 'draft' | null —— 保证标签高亮与面板一致 */
  const pairs=[['calc','#calcPanel','#calcTab'],['draft','#draftPanel','#draftTab']];
  pairs.forEach(([k,panel,tab])=>{
    const show = k===which;
    $(panel).classList.toggle('hide', !show);
    $(tab).classList.toggle('on', show);
  });
  if(which==='calc') $('#calcInput').focus();
}
function openDraft(mode){ /* mode: 'scratch' 空白草稿(单击) | 'note' 笔记(双击，保存) */
  setTool('draft');
  $('#scratchView').classList.toggle('hide', mode!=='scratch');
  $('#noteView').classList.toggle('hide', mode!=='note');
  if(mode==='scratch'){ $('#scratchArea').value=''; $('#scratchArea').focus(); }
  else { if(S.current) $('#noteArea').value=S.notes[S.current.id]||''; $('#noteArea').focus(); const ni=$('#noteInfo'); if(ni) ni.textContent=''; }
}
$('#calcTab').addEventListener('click', ()=> setTool($('#calcPanel').classList.contains('hide') ? 'calc' : null));
$('#draftTab').addEventListener('click', ()=> openDraft('scratch'));
$('#draftTab').addEventListener('dblclick', ()=> openDraft('note'));
$('#draftClear').addEventListener('click', ()=>{ $('#scratchArea').value=''; toast('已清空草稿'); });
$('#draftCopy').addEventListener('click', ()=>{ const ta=$('#scratchArea'); ta.select(); if(navigator.clipboard){ navigator.clipboard.writeText(ta.value).catch(()=>{}); } else { try{ document.execCommand('copy'); }catch(e){} } toast('已复制全部'); });
$('#favTab').addEventListener('click', ()=>{ if(!S.current) return; const id=S.current.id; if(S.fav[id]){ delete S.fav[id]; $('#favTab').classList.remove('on'); $('#favTab').textContent='收藏'; toast('已取消收藏'); } else { S.fav[id]=true; $('#favTab').classList.add('on'); $('#favTab').textContent='已收藏'; toast('已收藏'); } if(S.notes[id]) setNote(id, S.notes[id]); save(); const fc=$('#favCnt'); if(fc) fc.textContent=Object.keys(S.fav).length; });
function setNote(id, text){
  text=(text||'').trim();
  if(text){ S.notes[id]=text; if(S.wrong[id]) S.wrong[id].note=text; if(S.fav[id]){ const f=(typeof S.fav[id]==='object')?S.fav[id]:{id:id}; f.note=text; S.fav[id]=f; } }
  else { delete S.notes[id]; if(S.wrong[id]) delete S.wrong[id].note; if(S.fav[id] && typeof S.fav[id]==='object') delete S.fav[id].note; }
  save();
}
$('#noteArea').addEventListener('input', e=>{ if(!S.current) return; setNote(S.current.id, e.target.value); const ni=$('#noteInfo'); if(ni) ni.textContent=e.target.value.trim()?'已保存':''; });
$('#noteClear').addEventListener('click', ()=>{ if(!S.current) return; setNote(S.current.id, ''); $('#noteArea').value=''; const ni=$('#noteInfo'); if(ni) ni.textContent=''; toast('已清空笔记'); });

/* ---------- calculator (题目下方内联，Excel 式) ---------- */
function calcTokenize(s){
  const toks=[]; let i=0;
  while(i<s.length){
    const c=s[i];
    if(c===' '){ i++; continue; }
    if(c==='π'){ toks.push({t:'num',v:Math.PI}); i++; continue; }
    if(c>='0'&&c<='9'||c==='.'){ let num=''; while(i<s.length&&((s[i]>='0'&&s[i]<='9')||s[i]==='.')) num+=s[i++]; toks.push({t:'num',v:parseFloat(num)}); continue; }
    if(s.substr(i,4)==='sqrt'){ toks.push({t:'func',v:'sqrt'}); i+=4; continue; }
    if(s.substr(i,2)==='**'){ toks.push({t:'op',v:'**'}); i+=2; continue; }
    if(c==='('||c===')'){ toks.push({t:'paren',v:c}); i++; continue; }
    if(c==='+'){ toks.push({t:'op',v:'+'}); i++; continue; }
    if(c==='*'){ toks.push({t:'op',v:'*'}); i++; continue; }
    if(c==='/'){ toks.push({t:'op',v:'/'}); i++; continue; }
    if(c==='-'){
      const prev=toks.length?toks[toks.length-1]:null;
      const unary=!prev||prev.t==='op'||prev.t==='func'||prev.v==='(';
      if(unary){ toks.push({t:'uop',v:'neg'}); i++; continue; }
      toks.push({t:'op',v:'-'}); i++; continue;
    }
    i++;
  }
  return toks;
}
const CALC_PREC={'uop':4,'func':5,'**':3,'*':2,'/':2,'+':1,'-':1};
const CALC_RA={'**':true,'uop':true,'func':true};
function calcToRPN(toks){
  const out=[],st=[];
  for(const tk of toks){
    if(tk.t==='num') out.push(tk);
    else if(tk.t==='func'||tk.t==='uop') st.push(tk);
    else if(tk.t==='op'){
      while(st.length){
        const top=st[st.length-1];
        if(top.t==='op'){ const tp=CALC_PREC[top.v], cp=CALC_PREC[tk.v]; if(tp>cp || (tp===cp && !CALC_RA[tk.v])){ out.push(st.pop()); continue; } }
        else if(top.t==='uop'||top.t==='func'){ out.push(st.pop()); continue; }
        break;
      }
      st.push(tk);
    }
    else if(tk.v==='(') st.push(tk);
    else if(tk.v===')'){
      while(st.length && st[st.length-1].v!=='(') out.push(st.pop());
      if(st.length && st[st.length-1].v==='(') st.pop();
      if(st.length && st[st.length-1].t==='func') out.push(st.pop());
    }
  }
  while(st.length) out.push(st.pop());
  return out;
}
function calcEvalRPN(rpn){
  const st=[];
  for(const tk of rpn){
    if(tk.t==='num') st.push(tk.v);
    else if(tk.t==='uop') st.push(-st.pop());
    else if(tk.t==='func'){ const a=st.pop(); if(tk.v==='sqrt') st.push(Math.sqrt(a)); }
    else if(tk.t==='op'){
      const b=st.pop(), a=st.pop();
      if(tk.v==='+') st.push(a+b);
      else if(tk.v==='-') st.push(a-b);
      else if(tk.v==='*') st.push(a*b);
      else if(tk.v==='/') st.push(a/b);
      else if(tk.v==='**') st.push(Math.pow(a,b));
    }
  }
  return st[0];
}
function calcCompute(expr){
  try{
    let e=String(expr==null?'':expr).replace(/\^/g,'**').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
    if(!e.trim()) return null;
    const opens=(e.match(/\(/g)||[]).length, closes=(e.match(/\)/g)||[]).length;
    e += ')'.repeat(Math.max(0,opens-closes));
    const r=calcEvalRPN(calcToRPN(calcTokenize(e)));
    if(r===undefined || !isFinite(r) || isNaN(r)) return null;
    return Math.round(r*1e10)/1e10;
  }catch(err){ return null; }
}
let calcJustComputed=false;
function calcRun(){
  const inp=$('#calcInput'); const r=calcCompute(inp.value); const res=$('#calcRes');
  if(r===null){ res.textContent='⚠ 算式有误'; res.classList.add('err'); calcJustComputed=false; }
  else { res.textContent='= '+r; res.classList.remove('err'); const s=String(r); inp.value = s.length>14? r.toPrecision(12) : s; calcJustComputed=true; }
}
function calcChip(c){
  const inp=$('#calcInput');
  if(c==='C'){ inp.value=''; $('#calcRes').textContent='结果会显示在这里'; $('#calcRes').classList.remove('err'); calcJustComputed=false; inp.focus(); return; }
  if(calcJustComputed && /[0-9.]/.test(c)) inp.value='';   // 计算后接着输入数字/小数点，自动另起新算式
  calcJustComputed=false;
  if(c==='±'){                                            // 加减号合并：按一下 +，再按一下切换为 −
    const v=inp.value;
    if(v.endsWith('+')) inp.value=v.slice(0,-1)+'−';
    else if(v.endsWith('−')) inp.value=v.slice(0,-1)+'+';
    else inp.value+='+';
    inp.focus(); return;
  }
  if(inp.value==='' && c==='.') inp.value='0';             // 单独输入小数点时补前导 0
  inp.value += c;
  inp.focus();
}
$('#calcEqual').addEventListener('click', ()=>{ calcRun(); $('#calcInput').focus(); });
$('#calcInput').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); calcRun(); } });
$('#calcInput').addEventListener('input', ()=>{ calcJustComputed=false; });  // 用户手动改输入框时取消"刚算完"状态
$$('.chip[data-c]').forEach(b=> b.addEventListener('click', ()=> calcChip(b.dataset.c)));
/* 括号键：单击插入 () 且光标停在括号中间（若已选中文字则自动包裹） */
$('#parenChip').addEventListener('click', ()=>{
  const inp=$('#calcInput'); calcJustComputed=false;
  const s=inp.selectionStart!=null?inp.selectionStart:inp.value.length, e=inp.selectionEnd!=null?inp.selectionEnd:inp.value.length;
  const sel=inp.value.slice(s,e);
  if(sel){ inp.value = inp.value.slice(0,s)+'('+sel+')'+inp.value.slice(e); const pos=e+2; inp.focus(); inp.setSelectionRange(pos,pos); }
  else { inp.value = inp.value.slice(0,s)+'()'+inp.value.slice(e); const pos=s+1; inp.focus(); inp.setSelectionRange(pos,pos); }
});

/* ---------- marking ---------- */
function applyMark(type){
  const sel=window.getSelection();
  if(!sel || sel.rangeCount===0 || sel.isCollapsed){ toast('请先选中题目里的文字'); return; }
  const range=sel.getRangeAt(0);
  const stem=$('#pStem'), opts=$('#pOpts');
  if(!stem.contains(range.commonAncestorContainer) && !opts.contains(range.commonAncestorContainer)){ toast('只能在题目或选项区域内标注'); return; }
  if(!S.current){ return; }
  const node=document.createElement(type==='hl'?'mark':'u');
  try{
    node.appendChild(range.extractContents());
    range.insertNode(node);
    sel.removeAllRanges();
  }catch(e){ toast('标注失败，请换一段文字试试'); return; }
  S.marks[S.current.id] = { stem: $('#pStem').innerHTML, opts: $('#pOpts').innerHTML };
  save();
  toast(type==='hl'?'已高亮':'已加下划线');
}
function clearMarks(){
  if(!S.current) return;
  delete S.marks[S.current.id];
  save();
  renderQuestionContent();
  toast('已清除本题标注');
}
$$('#markBar button[data-mk]').forEach(b=>{
  b.addEventListener('mousedown', e=> e.preventDefault());
  b.addEventListener('click', ()=>{ const mk=b.dataset.mk; if(mk==='clear') clearMarks(); else applyMark(mk); });
});

/* ---------- boot ---------- */
// 双击「练习」刷新后：检测到重载标记再弹「已刷新 ✅」确认提示
(function(){
  try{ if(sessionStorage.getItem('cpa_just_refreshed')==='1'){ sessionStorage.removeItem('cpa_just_refreshed'); toast('已刷新 ✅'); } }catch(e){}
})();
function bootStep(name, fn){ try{ fn(); }catch(e){ console.error('['+name+']', e); var b=document.getElementById('errBanner'); if(b) b.textContent+='\n['+name+'] '+(e&&e.message?e.message:e); } }
bootStep('initHome', initHome);
bootStep('initSettings', initSettings);
// 打开先回首页：仅载入上次进度用于「继续练习」卡片，不直接跳进做题页（避免旧进度题渲染报错）
bootStep('resumeSession', ()=>resumeSession(false));
// 科目切换器：点击切换并整体换题库/错题/收藏/统计/进度
$$('#subjSeg .subj-btn').forEach(b=> b.addEventListener('click', ()=> switchSubject(b.dataset.s)));
$$('#statSeg button').forEach(b=> b.addEventListener('click', ()=>{
  statTab = b.dataset.tab;
  store.set('cpa_stat_tab', statTab);
  applyStatTab();
}));
syncSubjUI();
