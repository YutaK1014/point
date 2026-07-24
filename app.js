const STORAGE_KEY='point-keeper-v1';
const $=s=>document.querySelector(s);
let data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"points":[]}');
let activePointId=null;

const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
const fmt=n=>Number(n||0).toLocaleString('ja-JP');
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);
const daysUntil=date=>Math.ceil((new Date(date+'T23:59:59')-new Date())/86400000);

function render(){
  const grid=$('#pointGrid'); grid.innerHTML='';
  $('#serviceCount').textContent=data.points.length;
  $('#totalPoints').textContent=fmt(data.points.reduce((a,p)=>a+Number(p.balance||0),0));
  $('#expiringSoon').textContent=data.points.reduce((a,p)=>a+(p.expiries||[]).filter(e=>daysUntil(e.date)>=0&&daysUntil(e.date)<=30).length,0);
  $('#emptyState').classList.toggle('hidden',data.points.length>0);
  grid.classList.toggle('hidden',data.points.length===0);
  data.points.forEach(p=>grid.appendChild(makeCard(p)));
}

function makeCard(p){
  const node=$('#pointCardTemplate').content.firstElementChild.cloneNode(true);
  node.style.setProperty('--accent',p.color||'#5b66e8');
  node.querySelector('h3').textContent=p.name;
  const mark=node.querySelector('.brand-mark'); mark.textContent=p.name.slice(0,1); mark.style.color='#fff'; mark.style.display='grid'; mark.style.placeItems='center'; mark.style.fontWeight='900';
  const input=node.querySelector('.balance-input'); input.value=p.balance;
  const diff=Number(p.balance)-Number(p.prevBalance||0); const change=node.querySelector('.change');
  change.textContent=`前月比 ${diff>0?'+':''}${fmt(diff)} pt`; change.classList.add(diff>0?'plus':diff<0?'minus':'zero');
  const future=(p.expiries||[]).filter(e=>daysUntil(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date));
  node.querySelector('.expiry-summary').textContent=future[0]?`次回失効 ${future[0].date}・${fmt(future[0].amount)}pt`:'有効期限の登録なし';
  input.addEventListener('change',()=>{p.balance=Math.max(0,Number(input.value||0));save();render()});
  node.querySelector('.detail-btn').addEventListener('click',()=>openDetail(p.id));
  node.querySelector('.menu-btn').addEventListener('click',()=>openPointDialog(p));
  return node;
}

function openPointDialog(p=null){
  $('#pointDialogTitle').textContent=p?'ポイントを編集':'ポイントを追加';
  $('#pointId').value=p?.id||''; $('#pointName').value=p?.name||''; $('#pointBalance').value=p?.balance??''; $('#pointPrevBalance').value=p?.prevBalance??''; $('#pointColor').value=p?.color||'#5b66e8';
  $('#pointDialog').showModal();
}

$('#pointForm').addEventListener('submit',e=>{
  e.preventDefault(); const id=$('#pointId').value;
  const payload={name:$('#pointName').value.trim(),balance:Number($('#pointBalance').value),prevBalance:Number($('#pointPrevBalance').value),color:$('#pointColor').value};
  if(id){Object.assign(data.points.find(p=>p.id===id),payload)} else data.points.push({id:uid(),...payload,histories:[],expiries:[]});
  save();render();$('#pointDialog').close();
});

document.querySelectorAll('.close').forEach(b=>b.addEventListener('click',()=>$('#pointDialog').close()));
$('#addPointBtn').addEventListener('click',()=>openPointDialog()); $('#emptyAddBtn').addEventListener('click',()=>openPointDialog());

function openDetail(id){activePointId=id;const p=data.points.find(x=>x.id===id);$('#detailTitle').textContent=p.name;$('#historyDate').value=today();$('#expiryDate').value=today();renderDetail();$('#detailDialog').showModal()}
$('.detail-close').addEventListener('click',()=>$('#detailDialog').close());
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));tab.classList.add('active');$('#'+tab.dataset.tab+'Tab').classList.add('active')}));

function renderDetail(){
  const p=data.points.find(x=>x.id===activePointId); if(!p)return;
  const h=$('#historyList');h.innerHTML='';(p.histories||[]).sort((a,b)=>b.date.localeCompare(a.date)).forEach(item=>h.appendChild(listItem(item,'history')));if(!(p.histories||[]).length)h.innerHTML='<p class="no-data">獲得履歴はまだありません</p>';
  const x=$('#expiryList');x.innerHTML='';(p.expiries||[]).sort((a,b)=>a.date.localeCompare(b.date)).forEach(item=>x.appendChild(listItem(item,'expiry')));if(!(p.expiries||[]).length)x.innerHTML='<p class="no-data">有効期限はまだ登録されていません</p>';
}
function listItem(item,type){const el=document.createElement('div');el.className='list-item';const amount=Number(item.amount);el.innerHTML=`<span>${item.date}</span><span class="muted">${item.memo||'メモなし'}</span><span class="amount ${type==='history'?(amount>=0?'plus':'minus'):''}">${amount>0&&type==='history'?'+':''}${fmt(amount)} pt</span><button class="delete-btn">削除</button>`;el.querySelector('button').onclick=()=>{const p=data.points.find(x=>x.id===activePointId);const key=type==='history'?'histories':'expiries';p[key]=p[key].filter(x=>x.id!==item.id);save();renderDetail();render()};return el}

$('#historyForm').addEventListener('submit',e=>{e.preventDefault();const p=data.points.find(x=>x.id===activePointId);p.histories.push({id:uid(),date:$('#historyDate').value,amount:Number($('#historyAmount').value),memo:$('#historyMemo').value.trim()});$('#historyAmount').value='';$('#historyMemo').value='';save();renderDetail()});
$('#expiryForm').addEventListener('submit',e=>{e.preventDefault();const p=data.points.find(x=>x.id===activePointId);p.expiries.push({id:uid(),date:$('#expiryDate').value,amount:Number($('#expiryAmount').value),memo:$('#expiryMemo').value.trim()});$('#expiryAmount').value='';$('#expiryMemo').value='';save();renderDetail();render()});
render();
