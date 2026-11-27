/* UI and scene renderer for the local pixel office. */
(() => {
  const $ = id => document.getElementById(id);
  const sim=OfficeSim, deps=sim.departments;
  const paths={
    building:'<path d="M4 21V6l9-3v18M13 9h6v12M2 21h20M7 8h2m-2 4h2m-2 4h2m6-3h1m-1 3h1"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15m6-12v15"/>',
    replay:'<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
    pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',play:'<path d="m7 4 12 8-12 8z" fill="currentColor" stroke="none"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2c0-6 14-6 14 0v2m0-15a3 3 0 0 1 0 6m3 3q4 1 3 6"/>',
    activity:'<path d="M2 12h5l3-7 4 14 3-7h5"/>',x:'<path d="m6 6 12 12M18 6 6 18"/>',
    briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12q9 5 18 0m-10 1v2h2v-2"/>',
    chevron:'<path d="m6 14 6-6 6 6"/>',ellipsis:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    edit:'<path d="m4 16 12-12 4 4L8 20l-5 1zM14 6l4 4"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    check:'<path d="m4 12 5 5L20 6"/>',checklist:'<path d="m3 6 2 2 3-4m2 3h10M3 14l2 2 3-4m2 3h10"/>',
    alert:'<path d="m12 3 10 18H2zM12 9v5m0 3v.1"/>',coffee:'<path d="M3 8h14v5a7 7 0 0 1-14 0Zm14 0h2a3 3 0 0 1 0 6h-2M2 21h18M7 2v3m5-3v3"/>',
    send:'<path d="m3 3 19 9-19 9 4-9zm4 9h15"/>',chat:'<path d="M3 4h18v13H9l-6 4z"/><path d="M7 9h10M7 13h7"/>'
  };
  const icon=name=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.activity)+'</svg>';
  document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=icon(el.dataset.icon)});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clock=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t)%60).padStart(2,'0');
  const inks={green:'#8cdbb4',gold:'#f4ba78',lilac:'#c1a5ff',violet:'#c1a5ff',blue:'#94bdf0'};
  const map=$('office'),ctx=map.getContext('2d'),floor=document.createElement('canvas');
  floor.width=600;floor.height=360;drawOfficeFloor(floor.getContext('2d'));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let selected='',tab='task',zoom=1,menu=false,version=-1,shownSecond=-1,dialogMode='',toasting=0,lastTime=0;
  const drafts=new Map();
  sim.reset();
  const s=()=>sim.state, active=()=>sim.person(selected);
  const areas=[
    ['Thiết kế','#dc9fc2'],['Kỹ thuật','#8ac6ba'],['Kiểm thử','#aabbed'],['Phòng họp','#e2bb7e'],
    ['Phòng thư giãn','#bca5de'],['Marketing','#dcad8b'],['Nhân sự','#9cbf8d'],['Vận hành','#98bfc9']
  ];
  $('room-labels').innerHTML=areas.map(([name,color],i)=>'<span class="room-label" style="left:'+((i%4)*25+1.3)+'%;top:'+(i<4?2:57.3)+'%;--room:'+color+'"><b></b>'+name+'</span>').join('');
  function portrait(p){return '<canvas width="32" height="32" data-portrait="'+esc(p.id)+'" aria-hidden="true"></canvas>'}
  function renderPortraits(){document.querySelectorAll('[data-portrait]').forEach(el=>{const p=sim.person(el.dataset.portrait);if(p)drawOfficePortrait(el.getContext('2d'),p)})}
  function selectPerson(id,fromRoster=false){
    if(!sim.person(id))return;
    selected=id;menu=false;
    if(!fromRoster){$('people').classList.remove('folded');$('collapse').setAttribute('aria-expanded','true');$('collapse').setAttribute('aria-label','Thu gọn nhân sự')}
    refresh();
    if(fromRoster){const hit=$('map-hits').querySelector('[data-id="'+id+'"]');if(hit){const r=hit.getBoundingClientRect(),v=$('map-scroll').getBoundingClientRect();$('map-scroll').scrollLeft+=r.left+r.width/2-v.left-v.width/2;$('map-scroll').scrollTop+=r.top+r.height/2-v.top-v.height/2}}
  }
  function profile(p){
    if(!p)return '<p class="empty">Văn phòng chưa có nhân sự. Chọn “Thêm” để bắt đầu.</p>';
    return '<div class="profile-top"><div class="portrait-large">'+portrait(p)+'</div><div class="profile-id"><h3>'+esc(p.name)+'</h3><div class="role">'+esc(p.role)+'</div></div></div><div class="status-line"><span class="state" style="--tone:'+inks[sim.color(p)]+'"><i></i>'+sim.status(p)+'</span><span class="dept-chip">'+deps[p.dept].name+'</span></div>';
  }
  function taskView(p){
    const j=p.job||p.last;
    let html='';
    if(p.assist){const owner=sim.person(p.assist.owner);html='<p class="section-label">'+(p.assist.type==='review'?'Đang duyệt cho ':'Đang trao đổi với ')+esc(owner?.name||'đồng nghiệp')+'</p>'}
    if(!j)html+='<p class="empty">Chưa có việc được giao.</p>';
    else{
      const percent=Math.round(j.done/j.steps.length*100);
      html+='<p class="section-label">'+(!p.job?'Việc đã hoàn thành':j.phase==='ready'?'Việc sắp nhận':'Nhiệm vụ hiện tại')+'</p><div class="task-head"><b>'+esc(j.title)+'</b><strong>'+percent+'%</strong></div><div class="progress" role="progressbar" aria-label="Tiến độ" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+percent+'%"></i></div><ul class="checks">'+j.steps.map((v,i)=>'<li><span class="check '+(i<j.done?'done':'')+'">'+(i<j.done?icon('check'):'')+'</span>'+esc(v)+'</li>').join('')+'</ul>';
      if(p.job?.phase==='qc')html+='<div class="review-actions"><button class="button small" id="approve">Duyệt</button><button class="button small" id="revise">Yêu cầu sửa</button></div>';
    }
    if(p.queue.length)html+='<p class="section-label queue">Đang chờ · '+p.queue.length+'</p><ul class="checks">'+p.queue.map(j=>'<li>'+esc(j.title)+'</li>').join('')+'</ul>';
    return html;
  }
  function chatView(p){
    const messages=s().messages.filter(m=>m.people.includes(p.id));
    return (messages.length?'<ul class="messages">'+messages.map(m=>'<li class="message"><b>'+esc(m.sender)+' · '+esc(m.atLabel||clock(m.at))+'</b>'+esc(m.text)+'</li>').join('')+'</ul>':'<p class="empty">Chưa có tin nhắn với '+esc(p.name)+'.</p>')+'<form class="composer" id="composer"><input name="message" aria-label="Nội dung tin nhắn" placeholder="Nhắn cho '+esc(p.name.split(' ')[0])+'…" maxlength="400" required autocomplete="off" value="'+esc(drafts.get(p.id)||'')+'"><button class="icon-btn" aria-label="Gửi tin nhắn">'+icon('send')+'</button></form>';
  }
  function issueView(p){
    const list=s().incidents.filter(i=>i.owner===p.id);
    return list.length?list.slice().reverse().map(i=>'<div class="incident '+(i.resolved?'resolved':'')+'"><b>'+esc(i.title)+'</b><p>'+esc(p.name)+' · Thiết kế landing page</p><p>'+(i.resolved?'Đã xử lý · Đã nhận tiêu đề.':esc(i.action))+'</p></div>').join(''):'<p class="empty">Chưa ghi nhận sự cố.</p>';
  }
  const tabNames={task:'Công việc',chat:'Chat',issues:'Sự cố'};
  function refresh(){
    if(!sim.person(selected)&&s().people.length)selected=s().people[0].id;
    const p=active(),focus=document.activeElement,wrote=focus?.matches('#composer input'),pos=wrote?focus.selectionStart:0,rosterScroll=$('roster').scrollLeft;
    $('total').textContent=s().people.length;
    $('roster').innerHTML=s().people.map(q=>'<button class="portrait-btn '+(q===p?'active':'')+'" data-id="'+q.id+'" aria-label="Chọn '+esc(q.name)+'" title="'+esc(q.name)+' · '+esc(sim.status(q))+'" aria-pressed="'+(q===p)+'">'+portrait(q)+'</button>').join('');
    $('roster').scrollLeft=rosterScroll;
    $('profile').innerHTML=profile(p);
    const count=p?s().incidents.filter(i=>i.owner===p.id&&!i.resolved).length:0;
    $('tabs').innerHTML=p?Object.entries(tabNames).map(([key,label])=>'<button data-tab="'+key+'" class="'+(key===tab?'active':'')+'" aria-pressed="'+(key===tab)+'">'+label+(key==='issues'&&count?'<sup>'+count+'</sup>':'')+'</button>').join(''):'';
    $('details').innerHTML=!p?'':tab==='task'?taskView(p):tab==='chat'?chatView(p):issueView(p);
    if(wrote&&$('composer')){const input=$('composer').elements.message;input.focus({preventScroll:true});input.setSelectionRange(pos,pos)}
    const messages=$('details').querySelector('.messages');if(messages)messages.scrollTop=messages.scrollHeight;
    $('assign').disabled=!p;
    $('events').innerHTML=s().events.slice(0,16).map(e=>'<li class="event"><span class="event-symbol" style="--tone:'+(inks[e.tone]||inks.violet)+'">'+icon(e.icon)+'</span><span>'+esc(e.text)+'</span><time>'+clock(e.at)+'</time></li>').join('');
    $('pause').innerHTML=icon(s().paused?'play':'pause')+(s().paused?'Tiếp tục':'Tạm dừng');
    $('live-indicator').classList.toggle('stopped',s().paused);$('live-indicator').innerHTML='<i></i>'+(s().paused?'Đã tạm dừng':'HQ trực tiếp');
    renderPortraits();
    syncHits();version=s().version;
  }
  function syncHits(){
    const layer=$('map-hits'),ids=s().people.map(p=>p.id).join(',');
    if(layer.dataset.ids!==ids){
      layer.innerHTML=s().people.map(p=>'<button class="map-hit" data-id="'+p.id+'"></button>').join('');
      layer.dataset.ids=ids;
    }
    [...layer.children].forEach((b,i)=>{const p=s().people[i];b.setAttribute('aria-label','Xem '+p.name);b.title=p.name+' · '+sim.status(p);b.setAttribute('aria-pressed',String(p.id===selected))});
  }
  function draw(){
    ctx.imageSmoothingEnabled=false;ctx.drawImage(floor,0,0);
    const heads=$('map-hits').children;
    const actors=s().people.map(p=>{
      if(!reduced.matches||!p.path.length)return p;
      const [x,y]=p.path[p.path.length-1];
      return {...p,x,y,pose:p.arrival,facing:'down'};
    });
    actors.forEach((p,i)=>{if(heads[i]){heads[i].style.left=(p.x/6)+'%';heads[i].style.top=(p.y/3.6)+'%'}});
    const order=actors.sort((a,b)=>a.y-b.y);
    for(const p of order){
      const x=Math.round(p.x),y=Math.round(p.y);
      if(p.id===selected){
        ctx.fillStyle='#49334f';ctx.fillRect(x-13,y+1,26,3);ctx.fillStyle='#e4c6ff';ctx.fillRect(x-11,y,22,2);
        ctx.fillStyle='#b890ff';ctx.fillRect(x-13,y-2,3,4);ctx.fillRect(x+10,y-2,3,4);
      }
      drawOfficeSprite(ctx,p,p.pose,p.facing,reduced.matches?0:s().t+(s().people.indexOf(p)*.37),x,y);
      ctx.fillStyle='#392f44';ctx.fillRect(x+7,y-31,6,6);ctx.fillStyle=inks[sim.color(p)];ctx.fillRect(x+8,y-30,4,4);
      if(p.id===selected){
        const name=p.name.split(' ')[0];ctx.font='bold 8px "Segoe UI",Arial';const w=Math.ceil(ctx.measureText(name).width)+8;
        ctx.fillStyle='#382d49';ctx.fillRect(x-Math.floor(w/2),y+4,w,11);ctx.fillStyle='#f3e6ff';ctx.textAlign='center';ctx.fillText(name,x,y+12);ctx.textAlign='left';
      }
    }
    const speech=s().speech,actor=speech&&sim.person(speech.id),bubble=$('bubble');bubble.hidden=!actor;
    if(actor){bubble.textContent=speech.text;bubble.style.left=actor.x/6+'%';bubble.style.top=(actor.y-34)/3.6+'%'}
  }
  function frame(now){
    const dt=lastTime?Math.min((now-lastTime)/1000,.15):0;lastTime=now;
    if(!$('modal').open&&!document.hidden)sim.tick(dt);
    if(version!==s().version)refresh();
    if(shownSecond!==Math.floor(s().t)){shownSecond=Math.floor(s().t);$('elapsed').textContent=clock(s().t)}
    draw();requestAnimationFrame(frame);
  }
  function setZoom(value){zoom=Math.min(1.75,Math.max(1,value));$('map-stage').style.width=zoom*100+'%';$('map-stage').style.minWidth=window.innerWidth<=760?(470*zoom)+'px':'';$('zoom-readout').textContent=Math.round(zoom*100)+'%';$('zoom-in').disabled=zoom>=1.75;$('zoom-out').disabled=zoom<=1}
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toasting);toasting=setTimeout(()=>$('toast').hidden=true,2600)}
  const field=(label,control)=>'<label class="field">'+label+control+'</label>';
  const option=(value,label,selectedValue)=>'<option value="'+esc(value)+'"'+(String(selectedValue)===String(value)?' selected':'')+'>'+esc(label)+'</option>';
  function openDialog(mode){
    const p=active(),body=$('dialog-body');dialogMode=mode;menu=false;
    $('dialog-title').textContent={add:'Thêm nhân sự',edit:'Sửa nhân sự',delete:'Xóa nhân sự',assign:'Giao việc'}[mode];
    $('confirm').disabled=false;$('confirm').classList.toggle('danger-confirm',mode==='delete');
    $('confirm').textContent={add:'Thêm nhân sự',edit:'Lưu thay đổi',delete:'Xóa nhân sự',assign:'Giao việc'}[mode];
    if(mode==='add'||mode==='edit'){
      const q=mode==='edit'?p:null;
      body.innerHTML=field('Họ tên','<input name="name" maxlength="36" required value="'+esc(q?.name||'')+'" autocomplete="off">')+
        field('Chức danh','<input name="role" maxlength="45" required value="'+esc(q?.role||'')+'">')+
        field('Phòng ban','<select name="dept">'+Object.entries(deps).map(([id,d])=>option(id,d.name,q?.dept)).join('')+'</select>')+
        field('Nhân vật','<select name="style">'+['Áo tím','Áo xanh biển','Áo cam','Áo xanh lá','Áo hồng','Áo vàng','Áo xanh chàm','Áo ô liu'].map((v,i)=>option(i,v,q?.style??(s().people.length%8))).join('')+'</select>');
    }else if(mode==='assign'){body.innerHTML='<p class="field-note">Người nhận · '+esc(p.name)+'</p>'+field('Tên công việc','<input name="title" required maxlength="90" placeholder="Ví dụ: Thiết kế trang giới thiệu">')+(p.job||p.assist?'<p class="field-note">Việc mới sẽ vào hàng chờ của nhân sự này.</p>':'')}
    else{
      const unfinished=!!p.job||p.queue.length>0,others=s().people.filter(q=>q!==p);
      body.innerHTML='<p class="field-note">Xóa '+esc(p.name)+' khỏi sơ đồ và danh sách nhân sự?</p>';
      if(unfinished){body.innerHTML+=others.length?field('Bàn giao việc chưa xong cho','<select name="to" required><option value="">Chọn người nhận</option>'+others.map(q=>option(q.id,q.name,'')).join('')+'</select>'):'<p class="field-note">Hãy thêm người nhận bàn giao hoặc hoàn thành công việc trước khi xóa.</p>';$('confirm').disabled=!others.length}
    }
    refresh();$('modal').showModal();
  }
  $('dialog-form').addEventListener('submit',e=>{
    e.preventDefault();const p=active(),data=new FormData(e.currentTarget),get=k=>String(data.get(k)||'').trim(),mode=dialogMode;
    for(const input of e.currentTarget.querySelectorAll('input[required]')){if(!input.value.trim()){input.setCustomValidity('Vui lòng nhập nội dung.');input.reportValidity();input.setCustomValidity('');return}}
    if(mode==='add'){const q=sim.add(get('name'),get('role'),get('dept'),Number(get('style')));selected=q.id;tab='task'}
    else if(mode==='edit')sim.edit(p,get('name'),get('role'),get('dept'),Number(get('style')));
    else if(mode==='assign'){sim.assign(p,get('title'));tab='task'}
    else if(mode==='delete'){const target=sim.person(get('to'));sim.remove(p,target);selected=target?.id||s().people[0]?.id||'';tab='task'}
    $('modal').close();refresh();toast({add:'Đã thêm nhân sự',edit:'Đã lưu thay đổi',assign:'Đã giao việc',delete:'Đã xóa nhân sự'}[mode]);
  });
  $('close-modal').onclick=$('cancel').onclick=()=>$('modal').close();
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
  $('add').onclick=()=>openDialog('add');$('assign').onclick=()=>openDialog('assign');
  $('collapse').onclick=()=>{const folded=$('people').classList.toggle('folded');$('collapse').setAttribute('aria-expanded',String(!folded));$('collapse').setAttribute('aria-label',folded?'Mở nhân sự':'Thu gọn nhân sự')};
  $('profile').onclick=e=>{const id=e.target.closest('button')?.id;if(id==='manage'){menu=!menu;refresh()}else if(id==='edit'||id==='delete')openDialog(id)};
  document.addEventListener('click',e=>{if(menu&&!e.target.closest('#profile')){menu=false;refresh()}});
  $('tabs').onclick=e=>{const key=e.target.closest('[data-tab]')?.dataset.tab;if(key){tab=key;refresh()}};
  $('roster').onclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(id)selectPerson(id,true)};
  $('map-hits').onclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(id)selectPerson(id)};
  $('details').addEventListener('input',e=>{if(e.target.name==='message')drafts.set(selected,e.target.value)});
  $('details').addEventListener('submit',e=>{if(e.target.id!=='composer')return;e.preventDefault();const text=e.target.elements.message.value.trim();if(!text)return;sim.message(null,[selected],text);drafts.delete(selected);refresh()});
  $('details').onclick=e=>{const id=e.target.closest('button')?.id;if(id==='approve'||id==='revise'){sim.decide(active(),id==='approve');refresh()}};
  $('pause').onclick=()=>{s().paused=!s().paused;refresh()};
  $('replay').onclick=()=>{sim.reset();drafts.clear();selected='';tab='task';menu=false;shownSecond=-1;refresh();toast('Đã tải lại dữ liệu HQ')};
  $('zoom-in').onclick=()=>setZoom(zoom+.25);$('zoom-out').onclick=()=>setZoom(zoom-.25);
  window.addEventListener('resize',()=>setZoom(zoom));
  setZoom(1);refresh();draw();requestAnimationFrame(frame);
})();

