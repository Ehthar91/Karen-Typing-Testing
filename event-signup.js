/* Event Sign Up — shareable time slots linked to Schedule Timer Special Schedules */
const EVENT_SIGNUP_IDS_KEY='glnEventSignupEventIdsV1';
const eventSignupList=document.querySelector('#eventSignupList');
const eventSignupStatus=document.querySelector('#eventSignupStatus');
const eventSignupForm=document.querySelector('#eventSignupForm');
const eventSignupEditorTitle=document.querySelector('#eventSignupEditorTitle');
const eventSignupName=document.querySelector('#eventSignupName');
const eventSignupDate=document.querySelector('#eventSignupDate');
const eventSignupDescription=document.querySelector('#eventSignupDescription');
const eventSignupLinkSchedule=document.querySelector('#eventSignupLinkSchedule');
const eventSignupOpen=document.querySelector('#eventSignupOpen');
const eventSignupAllowMultiple=document.querySelector('#eventSignupAllowMultiple');
const eventSignupActivityMode=document.querySelector('#eventSignupActivityMode');
const eventSignupSlotEditor=document.querySelector('#eventSignupSlotEditor');
const addEventSignupSlot=document.querySelector('#addEventSignupSlot');
const eventSlotGeneratorStart=document.querySelector('#eventSlotGeneratorStart');
const eventSlotGeneratorDuration=document.querySelector('#eventSlotGeneratorDuration');
const eventSlotGeneratorCount=document.querySelector('#eventSlotGeneratorCount');
const eventSlotGeneratorCapacity=document.querySelector('#eventSlotGeneratorCapacity');
const eventSlotGeneratorLabel=document.querySelector('#eventSlotGeneratorLabel');
const generateEventSignupSlots=document.querySelector('#generateEventSignupSlots');
const eventSlotGeneratorPreview=document.querySelector('#eventSlotGeneratorPreview');
const saveEventSignup=document.querySelector('#saveEventSignup');
const clearEventSignupForm=document.querySelector('#clearEventSignupForm');
const cancelEventSignupEdit=document.querySelector('#cancelEventSignupEdit');
const newEventSignup=document.querySelector('#newEventSignup');
const refreshEventSignups=document.querySelector('#refreshEventSignups');
const eventSignupTeacherView=document.querySelector('#eventSignupTeacherView');
const eventSignupPublicView=document.querySelector('#eventSignupPublicView');
const eventPublicTitle=document.querySelector('#eventPublicTitle');
const eventPublicDate=document.querySelector('#eventPublicDate');
const eventPublicDescription=document.querySelector('#eventPublicDescription');
const eventPublicMessage=document.querySelector('#eventPublicMessage');
const eventPublicSlots=document.querySelector('#eventPublicSlots');
const eventPublicForm=document.querySelector('#eventPublicForm');
const eventPublicSelectedSlot=document.querySelector('#eventPublicSelectedSlot');
const eventPublicParentName=document.querySelector('#eventPublicParentName');
const eventPublicEmail=document.querySelector('#eventPublicEmail');
const eventPublicPhone=document.querySelector('#eventPublicPhone');
const eventPublicSelectionList=document.querySelector('#eventPublicSelectionList');
const eventPublicSubmit=document.querySelector('#eventPublicSubmit');
const eventPublicCancelSignup=document.querySelector('#eventPublicCancelSignup');
let eventSignupIds=[];
let eventSignupCache=new Map();
let eventSignupWatchers=new Map();
let eventSignupEditorSlots=[];
let editingEventSignupId='';
let publicEventSignupId='';
let publicSelectedSlotIds=new Set();
let publicDraftStudentNames=new Map();
let publicSelectionInitialized=false;
let publicEventData=null;
let publicEventUnsubscribe=null;
let publicOwnSignups=new Map();
function eventSignupId(){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text='';
  if(window.crypto?.getRandomValues){const bytes=new Uint8Array(10);crypto.getRandomValues(bytes);for(const byte of bytes)text+=alphabet[byte%alphabet.length]}
  else for(let i=0;i<10;i++)text+=alphabet[Math.floor(Math.random()*alphabet.length)];
  return text;
}
function eventSlotId(){return `slot-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function eventSpotId(){return `spot-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}
function defaultEventSlot(){return{id:eventSlotId(),label:'',time:'',duration:15,capacity:1}}
function eventTimeToMinutes(value){const match=/^(\d{1,2}):(\d{2})$/.exec(String(value||''));if(!match)return null;const hour=Number(match[1]),minute=Number(match[2]);if(hour<0||hour>23||minute<0||minute>59)return null;return hour*60+minute}
function eventMinutesToTime(value){const minutes=Math.max(0,Math.min(1439,Math.floor(Number(value)||0)));return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`}
function eventTimePlusMinutes(time,minutes){const start=eventTimeToMinutes(time);if(start===null)return'';const next=start+Math.max(1,Number(minutes)||15);return next>=1440?'':eventMinutesToTime(next)}
function nextEventSlot(){
  const next=defaultEventSlot();const existing=[...eventSignupEditorSlots].filter(slot=>slot.time).sort((a,b)=>a.time.localeCompare(b.time));const last=existing.at(-1);if(!last)return next;
  next.label=last.label||'';next.duration=Math.max(1,Math.min(480,Number(last.duration)||15));next.capacity=Math.max(1,Math.min(100,Number(last.capacity)||1));next.time=eventTimePlusMinutes(last.time,next.duration);return next;
}
function updateEventSlotGeneratorPreview(){
  if(!eventSlotGeneratorPreview)return;const start=eventSlotGeneratorStart?.value||'';const duration=Math.max(1,Math.min(480,Number(eventSlotGeneratorDuration?.value)||15));const count=Math.max(1,Math.min(96,Number(eventSlotGeneratorCount?.value)||1));const capacity=Math.max(1,Math.min(100,Number(eventSlotGeneratorCapacity?.value)||1));const startMinutes=eventTimeToMinutes(start);
  if(startMinutes===null){eventSlotGeneratorPreview.textContent='Choose a first start time to preview the schedule.';return}
  const lastStart=startMinutes+(count-1)*duration;const end=lastStart+duration;if(end>1440){eventSlotGeneratorPreview.textContent='This batch would run past midnight. Reduce the slot count or length.';return}
  eventSlotGeneratorPreview.textContent=`${count} slot${count===1?'':'s'} · ${formatScheduleTime(start)}–${formatScheduleTime(eventMinutesToTime(end%1440||0))} · ${duration} min · max ${capacity} per slot`;
}
function generateEventSlotsFromBuilder(){
  const start=eventSlotGeneratorStart?.value||'';const duration=Math.max(1,Math.min(480,Number(eventSlotGeneratorDuration?.value)||15));const count=Math.max(1,Math.min(96,Number(eventSlotGeneratorCount?.value)||1));const capacity=Math.max(1,Math.min(100,Number(eventSlotGeneratorCapacity?.value)||1));const label=String(eventSlotGeneratorLabel?.value||'').trim().slice(0,50);const startMinutes=eventTimeToMinutes(start);
  if(startMinutes===null){alert('Choose the first start time.');eventSlotGeneratorStart?.focus();return}
  if(startMinutes+count*duration>1440){alert('Those slots would run past midnight. Reduce the number of slots or the slot length.');return}
  const current=eventSignupEditorSlots.filter(slot=>slot.time||String(slot.label||'').trim());const existingTimes=new Set(current.filter(slot=>slot.time).map(slot=>slot.time));const generated=[];let skipped=0;
  for(let i=0;i<count;i++){const time=eventMinutesToTime(startMinutes+i*duration);if(existingTimes.has(time)){skipped++;continue}generated.push({id:eventSlotId(),label,time,duration,capacity});existingTimes.add(time)}
  if(!generated.length){alert('Those start times are already in the slot list.');return}
  eventSignupEditorSlots=[...current,...generated];renderEventSlotEditor();updateEventSlotGeneratorPreview();showToast(`${generated.length} slot${generated.length===1?'':'s'} generated${skipped?` · ${skipped} duplicate${skipped===1?'':'s'} skipped`:''}`);
}
function safeEventIds(value){return [...new Set((Array.isArray(value)?value:[]).map(v=>String(v||'').trim()).filter(Boolean))].slice(0,100)}
function loadEventSignupIds(){try{eventSignupIds=safeEventIds(JSON.parse(localStorage.getItem(EVENT_SIGNUP_IDS_KEY)||'[]'))}catch{eventSignupIds=[]}}
function saveEventSignupIds(){localStorage.setItem(EVENT_SIGNUP_IDS_KEY,JSON.stringify(eventSignupIds));if(!window.__classroomToolsApplyingCloud)window.queueClassroomToolsCloudSync?.()}
function setEventStatus(text,type=''){if(!eventSignupStatus)return;eventSignupStatus.textContent=text;eventSignupStatus.classList.toggle('is-error',type==='error');eventSignupStatus.classList.toggle('is-ok',type==='ok')}
function eventDateText(value){const date=parseScheduleDateKey?.(value);return date?date.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:'numeric'}):String(value||'')}
function eventPublicLink(id){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('signup',id);return url.toString()}
function eventSlotsArray(event){return Object.values(event?.slots||{}).filter(slot=>slot&&slot.id&&slot.time).sort((a,b)=>a.time.localeCompare(b.time))}
function eventSpotIds(slot){return Object.keys(slot?.spots||{}).filter(id=>slot.spots[id]===true)}
function eventClaimsForSlot(event,slotId){return Object.entries(event?.claims?.[slotId]||{}).filter(([,uid])=>typeof uid==='string'&&uid).map(([spotId,uid])=>({spotId,uid}))}
function modernReservationsForSlot(event,slotId){
  const results=[];
  for(const userSlots of Object.values(event?.reservations||{})){const item=userSlots?.[slotId];if(item)results.push(item)}
  return results.sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
}
function legacySignupsForSlot(event,slotId){return Object.values(event?.signups?.[slotId]||{}).filter(Boolean).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0))}
function eventSignupsForSlot(event,slotId){const modern=modernReservationsForSlot(event,slotId);return modern.length||event?.claims?.[slotId]?modern:legacySignupsForSlot(event,slotId)}
function eventFilledCount(event,slotId){const claims=eventClaimsForSlot(event,slotId);return claims.length||(!event?.claims?.[slotId]?legacySignupsForSlot(event,slotId).length:0)}
function eventSignupCount(event){return eventSlotsArray(event).reduce((sum,slot)=>sum+eventFilledCount(event,slot.id),0)}
function currentParticipantSignups(event,uid){
  const own=event?.reservations?.[uid]||{};
  return eventSlotsArray(event).map(slot=>({slot,signup:own?.[slot.id]})).filter(item=>item.signup);
}
function publicCurrentSignups(){return eventSlotsArray(publicEventData).map(slot=>({slot,signup:publicOwnSignups.get(slot.id)})).filter(item=>item.signup)}
function signupStudentName(item){return String(item?.studentName||item?.name||'').trim()}
function buildSlotSpots(slot,existingEvent){
  const capacity=Math.max(1,Math.min(100,Number(slot.capacity)||1));
  const claimed=eventClaimsForSlot(existingEvent,slot.id).map(item=>item.spotId);
  const legacy=legacySignupsForSlot(existingEvent,slot.id);
  if(claimed.length+legacy.length>capacity)throw new Error(`${formatScheduleTime(slot.time)} already has ${claimed.length+legacy.length} signup${claimed.length+legacy.length===1?'':'s'}. Its maximum cannot be reduced below that number.`);
  const ids=[];
  const add=id=>{if(id&&!ids.includes(id)&&ids.length<capacity)ids.push(id)};
  claimed.forEach(add);
  eventSpotIds(existingEvent?.slots?.[slot.id]).forEach(add);
  while(ids.length<capacity)add(eventSpotId());
  return Object.fromEntries(ids.map(id=>[id,true]));
}
function normalizeExistingSignupData(existing,slotMap){
  const claims={};const reservations={};
  for(const [slotId,slot] of Object.entries(slotMap)){
    const allowedSpots=new Set(eventSpotIds(slot));
    const sourceClaims=existing?.claims?.[slotId]||{};
    for(const [spotId,uid] of Object.entries(sourceClaims)){if(allowedSpots.has(spotId)&&typeof uid==='string'&&uid){claims[slotId]??={};claims[slotId][spotId]=uid}}
  }
  for(const [uid,userSlots] of Object.entries(existing?.reservations||{})){
    for(const [slotId,item] of Object.entries(userSlots||{})){
      if(!slotMap[slotId]||!item)continue;const spotId=String(item.spotId||'');
      if(!spotId||claims?.[slotId]?.[spotId]!==uid)continue;
      reservations[uid]??={};reservations[uid][slotId]={...item,uid,slotId,spotId};
    }
  }
  for(const [slotId,legacyMap] of Object.entries(existing?.signups||{})){
    if(!slotMap[slotId])continue;
    const free=eventSpotIds(slotMap[slotId]).filter(spotId=>!claims?.[slotId]?.[spotId]);
    for(const [uid,item] of Object.entries(legacyMap||{})){
      if(!item||reservations?.[uid]?.[slotId])continue;const spotId=free.shift();if(!spotId)throw new Error(`${formatScheduleTime(slotMap[slotId].time)} has more existing signups than available spots.`);
      claims[slotId]??={};claims[slotId][spotId]=uid;reservations[uid]??={};reservations[uid][slotId]={...item,uid,slotId,spotId};
    }
  }
  return{claims,reservations};
}
function activityNameForEvent(event,participants){
  const names=participants.map(signupStudentName).filter(Boolean);
  if(event.activityMode==='event')return event.title||'Event';
  if(event.activityMode==='event-participant')return names.length?`${event.title||'Event'} – ${names.join(', ')}`:(event.title||'Event');
  return names.join(', ')||(event.title||'Event');
}
function syncEventToSpecialSchedule(id,event){
  if(!event||!event.date)return;
  const owned=Boolean(currentUser&&event.ownerUid===currentUser.uid);
  if(!owned)return;
  const existingIndex=classroomSchedules.findIndex(item=>item.linkedEventId===id);
  if(!event.linkedSchedule){if(existingIndex>=0){classroomSchedules.splice(existingIndex,1);saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock()}return}
  const slots=eventSlotsArray(event).map(slot=>{
    const participants=eventSignupsForSlot(event,slot.id);
    if(!participants.length)return null;
    return{id:`event-${id}-${slot.id}`,name:activityNameForEvent(event,participants),time:slot.time,duration:Math.max(1,Math.min(480,Number(slot.duration)||15))};
  }).filter(Boolean);
  if(!slots.length){if(existingIndex>=0){classroomSchedules.splice(existingIndex,1);saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock()}return}
  const next={id:existingIndex>=0?classroomSchedules[existingIndex].id:`event-special-${id}`,type:'special',source:'event-signup',linkedEventId:id,name:String(event.title||'Event Sign Up'),date:event.date,enabled:true,slots:slots.sort((a,b)=>a.time.localeCompare(b.time))};
  const previous=existingIndex>=0?classroomSchedules[existingIndex]:null;
  if(previous&&JSON.stringify(previous)===JSON.stringify(next))return;
  if(existingIndex>=0)classroomSchedules[existingIndex]=next;else classroomSchedules.push(next);
  saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock();
}
function removeLinkedEventSchedule(id){const before=classroomSchedules.length;classroomSchedules=classroomSchedules.filter(item=>item.linkedEventId!==id);if(classroomSchedules.length!==before){saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock()}}
function renderEventSlotEditor(){
  if(!eventSignupSlotEditor)return;eventSignupSlotEditor.innerHTML='';
  eventSignupEditorSlots.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  eventSignupEditorSlots.forEach((slot,index)=>{
    const row=document.createElement('div');row.className='event-slot-editor';row.dataset.slotId=slot.id;
    const labelField=document.createElement('label');labelField.innerHTML='<span>Label (optional)</span>';const label=document.createElement('input');label.type='text';label.maxLength=50;label.placeholder='Conference';label.value=slot.label||'';label.addEventListener('input',()=>slot.label=label.value);labelField.append(label);
    const timeField=document.createElement('label');timeField.innerHTML='<span>Start</span>';const time=document.createElement('input');time.type='time';time.required=true;time.value=slot.time||'';time.addEventListener('change',()=>{slot.time=time.value;renderEventSlotEditor()});timeField.append(time);
    const durationField=document.createElement('label');durationField.innerHTML='<span>Minutes</span>';const duration=document.createElement('input');duration.type='number';duration.min='1';duration.max='480';duration.value=slot.duration||15;duration.addEventListener('input',()=>slot.duration=Math.max(1,Math.min(480,Number(duration.value)||15)));durationField.append(duration);
    const capField=document.createElement('label');capField.innerHTML='<span>Max signups</span>';const cap=document.createElement('input');cap.type='number';cap.min='1';cap.max='100';cap.value=slot.capacity||1;cap.addEventListener('input',()=>slot.capacity=Math.max(1,Math.min(100,Number(cap.value)||1)));capField.append(cap);
    const remove=document.createElement('button');remove.type='button';remove.className='event-slot-editor-remove';remove.setAttribute('aria-label',`Remove time slot ${index+1}`);remove.textContent='×';remove.disabled=eventSignupEditorSlots.length===1;remove.addEventListener('click',()=>{eventSignupEditorSlots=eventSignupEditorSlots.filter(item=>item.id!==slot.id);renderEventSlotEditor()});
    row.append(labelField,timeField,durationField,capField,remove);eventSignupSlotEditor.append(row);
  });
}
function resetEventSignupEditor(){
  editingEventSignupId='';eventSignupEditorTitle.textContent='Create Event';cancelEventSignupEdit.hidden=true;saveEventSignup.textContent='Create Event';eventSignupForm.reset();eventSignupLinkSchedule.checked=true;eventSignupOpen.checked=true;if(eventSignupAllowMultiple)eventSignupAllowMultiple.checked=true;eventSignupActivityMode.value='participant';eventSignupDate.value=localScheduleDateKey(new Date());eventSignupEditorSlots=[defaultEventSlot()];if(eventSlotGeneratorStart)eventSlotGeneratorStart.value='';if(eventSlotGeneratorDuration)eventSlotGeneratorDuration.value='15';if(eventSlotGeneratorCount)eventSlotGeneratorCount.value='8';if(eventSlotGeneratorCapacity)eventSlotGeneratorCapacity.value='1';if(eventSlotGeneratorLabel)eventSlotGeneratorLabel.value='';renderEventSlotEditor();updateEventSlotGeneratorPreview();
}
function editEventSignup(id){
  const event=eventSignupCache.get(id);if(!event)return;
  editingEventSignupId=id;eventSignupEditorTitle.textContent='Edit Event';cancelEventSignupEdit.hidden=false;saveEventSignup.textContent='Update Event';eventSignupName.value=event.title||'';eventSignupDate.value=event.date||'';eventSignupDescription.value=event.description||'';eventSignupLinkSchedule.checked=event.linkedSchedule!==false;eventSignupOpen.checked=event.status!=='closed';if(eventSignupAllowMultiple)eventSignupAllowMultiple.checked=event.allowMultiple!==false;eventSignupActivityMode.value=event.activityMode||'participant';eventSignupEditorSlots=eventSlotsArray(event).map(slot=>({...slot}));if(!eventSignupEditorSlots.length)eventSignupEditorSlots=[defaultEventSlot()];const firstSlot=eventSignupEditorSlots.find(slot=>slot.time)||eventSignupEditorSlots[0];if(eventSlotGeneratorStart)eventSlotGeneratorStart.value=firstSlot?.time||'';if(eventSlotGeneratorDuration)eventSlotGeneratorDuration.value=String(firstSlot?.duration||15);if(eventSlotGeneratorCapacity)eventSlotGeneratorCapacity.value=String(firstSlot?.capacity||1);if(eventSlotGeneratorLabel)eventSlotGeneratorLabel.value=firstSlot?.label||'';updateEventSlotGeneratorPreview();renderEventSlotEditor();eventSignupName.focus();
}
function copyEventLink(id){const link=eventPublicLink(id);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link).then(()=>showToast('Signup link copied')).catch(()=>window.prompt('Copy this signup link:',link));else window.prompt('Copy this signup link:',link)}
function openEventLink(id){window.open(eventPublicLink(id),'_blank','noopener')}
function renderEventSignupList(){
  if(!eventSignupList)return;eventSignupList.innerHTML='';
  const events=eventSignupIds.map(id=>[id,eventSignupCache.get(id)]).filter(([,event])=>event).sort((a,b)=>`${a[1].date||''}:${a[1].title||''}`.localeCompare(`${b[1].date||''}:${b[1].title||''}`));
  if(!events.length){eventSignupList.innerHTML='<p class="event-signup-empty">No events yet. Create your first event.</p>';return}
  for(const [id,event] of events){
    const card=document.createElement('article');card.className=`event-card${event.status==='closed'?' is-closed':''}`;
    const head=document.createElement('div');head.className='event-card-head';const copy=document.createElement('div');const title=document.createElement('div');title.className='event-card-title';const name=document.createElement('strong');name.textContent=event.title||'Untitled Event';const status=document.createElement('span');status.className=`event-badge${event.status==='closed'?' is-closed':''}`;status.textContent=event.status==='closed'?'Closed':'Open';title.append(name,status);if(event.linkedSchedule){const linked=document.createElement('span');linked.className='event-badge is-linked';linked.textContent='Schedule linked';title.append(linked)}const meta=document.createElement('small');meta.textContent=`${eventDateText(event.date)} · ${eventSlotsArray(event).length} slots · ${eventSignupCount(event)} signup${eventSignupCount(event)===1?'':'s'}`;copy.append(title,meta);
    const actions=document.createElement('div');actions.className='event-card-actions';const share=document.createElement('button');share.type='button';share.className='primary';share.textContent='Copy link';share.addEventListener('click',()=>copyEventLink(id));const open=document.createElement('button');open.type='button';open.textContent='Open signup';open.addEventListener('click',()=>openEventLink(id));const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>editEventSignup(id));const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='Delete';del.addEventListener('click',()=>deleteEventSignup(id,event));actions.append(share,open,edit,del);head.append(copy,actions);
    const slots=document.createElement('div');slots.className='event-slot-summary';for(const slot of eventSlotsArray(event)){const signups=eventSignupsForSlot(event,slot.id);const row=document.createElement('div');row.className='event-slot-row';const time=document.createElement('strong');time.textContent=formatScheduleTime(slot.time);const slotCopy=document.createElement('div');slotCopy.className='event-slot-copy';const label=document.createElement('b');label.textContent=slot.label||`${slot.duration||15} min slot`;const people=document.createElement('small');people.textContent=signups.length?signups.map(item=>{const student=signupStudentName(item)||'Unnamed';const parent=String(item.parentName||'').trim();return parent&&parent!==student?`${student} — ${parent}`:student}).join(', '):'No one signed up yet';slotCopy.append(label,people);const filled=eventFilledCount(event,slot.id);const availability=document.createElement('span');availability.className=`event-slot-availability${filled>=Number(slot.capacity||1)?' full':''}`;availability.textContent=`${filled}/${slot.capacity||1} filled`;row.append(time,slotCopy,availability);slots.append(row)}
    card.append(head,slots);eventSignupList.append(card);
  }
}
function subscribeTeacherEvent(id){
  if(eventSignupWatchers.has(id)||!fb||!db)return;
  const unsub=fb.onValue(fb.ref(db,`eventSignups/${id}`),snapshot=>{
    if(!snapshot.exists()){eventSignupCache.delete(id);eventSignupIds=eventSignupIds.filter(item=>item!==id);saveEventSignupIds();removeLinkedEventSchedule(id);eventSignupWatchers.get(id)?.();eventSignupWatchers.delete(id);renderEventSignupList();return}
    const event=snapshot.val();eventSignupCache.set(id,event);renderEventSignupList();syncEventToSpecialSchedule(id,event);
  },error=>setEventStatus(error?.code==='PERMISSION_DENIED'?'Event Sign Up needs the included Firebase database rules before shared events can load.':(error?.message||'Could not load Event Sign Up.'),'error'));
  eventSignupWatchers.set(id,unsub);
}
async function refreshEventSignupManager(){
  if(publicEventSignupId)return;
  try{await initRaceFirebase();eventSignupIds.forEach(subscribeTeacherEvent);setEventStatus(eventSignupIds.length?'Events are live. Signup changes will appear automatically.':'Ready. Create an event to get a public signup link.','ok');renderEventSignupList()}
  catch(error){setEventStatus(error?.message||'Could not connect to Event Sign Up.','error')}
}
async function saveEventFromForm(event){
  event.preventDefault();
  const title=eventSignupName.value.trim();const date=eventSignupDate.value;const description=eventSignupDescription.value.trim();
  const slots=eventSignupEditorSlots.map(slot=>({...slot,label:String(slot.label||'').trim(),duration:Math.max(1,Math.min(480,Number(slot.duration)||15)),capacity:Math.max(1,Math.min(100,Number(slot.capacity)||1))})).filter(slot=>slot.time);
  if(!title||!date){alert('Enter an event name and date.');return}
  if(!slots.length||slots.length!==eventSignupEditorSlots.length){alert('Add a start time for every signup slot.');return}
  try{
    await initRaceFirebase();const id=editingEventSignupId||eventSignupId();const ref=fb.ref(db,`eventSignups/${id}`);let existing={};
    if(editingEventSignupId){const snap=await fb.get(ref);if(snap.exists())existing=snap.val()}
    const slotMap={};for(const slot of slots){slot.spots=buildSlotSpots(slot,existing);slotMap[slot.id]=slot}
    const migrated=normalizeExistingSignupData(existing,slotMap);
    const data={ownerUid:existing.ownerUid||currentUser.uid,title,date,description,status:eventSignupOpen.checked?'open':'closed',linkedSchedule:eventSignupLinkSchedule.checked,allowMultiple:eventSignupAllowMultiple?eventSignupAllowMultiple.checked:true,activityMode:eventSignupActivityMode.value||'participant',slots:slotMap,claims:migrated.claims,reservations:migrated.reservations,createdAt:existing.createdAt||Date.now(),updatedAt:Date.now(),capacityModel:'claimable-spots-v1'};
    await fb.set(ref,data);
    if(!eventSignupIds.includes(id)){eventSignupIds.push(id);saveEventSignupIds()}
    eventSignupCache.set(id,data);subscribeTeacherEvent(id);syncEventToSpecialSchedule(id,data);renderEventSignupList();resetEventSignupEditor();setEventStatus(`Saved “${title}”. Capacity is protected with claimable spots.`,'ok');showToast('Event saved');
  }catch(error){setEventStatus(error?.code==='PERMISSION_DENIED'?'Firebase blocked Event Sign Up. Publish the updated Realtime Database rules included with this build.':(error?.message||'Could not save the event.'),'error')}
}
async function deleteEventSignup(id,event){
  if(!confirm(`Delete ${event.title||'this event'} and all of its signups?`))return;
  try{await initRaceFirebase();await fb.remove(fb.ref(db,`eventSignups/${id}`));eventSignupIds=eventSignupIds.filter(item=>item!==id);saveEventSignupIds();eventSignupCache.delete(id);eventSignupWatchers.get(id)?.();eventSignupWatchers.delete(id);removeLinkedEventSchedule(id);renderEventSignupList();if(editingEventSignupId===id)resetEventSignupEditor();showToast('Event deleted')}
  catch(error){setEventStatus(error?.message||'Could not delete the event.','error')}
}
function publicMessage(text,type=''){eventPublicMessage.textContent=text;eventPublicMessage.classList.toggle('is-ok',type==='ok');eventPublicMessage.classList.toggle('is-error',type==='error')}
function initializePublicSelection(){
  if(publicSelectionInitialized)return;
  publicSelectedSlotIds=new Set(publicOwnSignups.keys());
  publicDraftStudentNames=new Map();
  for(const [slotId,signup] of publicOwnSignups)publicDraftStudentNames.set(slotId,signupStudentName(signup));
  const first=publicOwnSignups.values().next().value;
  if(first){eventPublicParentName.value=first.parentName||'';eventPublicEmail.value=first.email||'';eventPublicPhone.value=first.phone||''}
  publicSelectionInitialized=true;
}
function renderPublicSelection(){
  if(!eventPublicSelectionList)return;eventPublicSelectionList.innerHTML='';
  const slots=eventSlotsArray(publicEventData).filter(slot=>publicSelectedSlotIds.has(slot.id));
  eventPublicSelectedSlot.textContent=slots.length?`${slots.length} appointment${slots.length===1?'':'s'} selected. Enter the student name for each time.`:'Choose a time slot above.';
  for(const slot of slots){
    const item=document.createElement('div');item.className='event-public-selection-item';item.dataset.slotId=slot.id;
    const timeWrap=document.createElement('div');timeWrap.className='event-public-selection-time';const eyebrow=document.createElement('span');eyebrow.textContent='SELECTED TIME';const time=document.createElement('strong');time.textContent=formatScheduleTime(slot.time);const details=document.createElement('small');details.textContent=`${slot.duration||15} minutes${slot.label?` · ${slot.label}`:''}`;timeWrap.append(eyebrow,time,details);
    const studentLabel=document.createElement('label');studentLabel.innerHTML='<span>Student Name for this slot</span>';const student=document.createElement('input');student.type='text';student.maxLength=60;student.required=true;student.autocomplete='off';student.placeholder='Student name';student.value=publicDraftStudentNames.get(slot.id)||signupStudentName(publicOwnSignups.get(slot.id));student.addEventListener('input',()=>publicDraftStudentNames.set(slot.id,student.value));studentLabel.append(student);
    const remove=document.createElement('button');remove.type='button';remove.className='event-public-selection-remove';remove.textContent=publicOwnSignups.has(slot.id)?'Remove':'×';remove.setAttribute('aria-label',`Remove ${formatScheduleTime(slot.time)} appointment`);remove.addEventListener('click',()=>{publicDraftStudentNames.set(slot.id,student.value);publicSelectedSlotIds.delete(slot.id);renderPublicEvent()});
    item.append(timeWrap,studentLabel,remove);eventPublicSelectionList.append(item);
  }
  if(eventPublicSubmit){eventPublicSubmit.textContent=slots.length>1?`Save ${slots.length} signups`:'Save signup';eventPublicSubmit.disabled=!slots.length}
}
function renderPublicEvent(){
  const event=publicEventData;if(!event)return;initializePublicSelection();eventPublicTitle.textContent=event.title||'Event Sign Up';eventPublicDate.textContent=eventDateText(event.date);eventPublicDescription.textContent=event.description||'Choose an available time slot below.';eventPublicSlots.innerHTML='';
  const own=publicCurrentSignups();eventPublicCancelSignup.hidden=!own.length;
  if(event.status==='closed')publicMessage('This event is closed for new signups. Existing appointments can still be reviewed.','error');else if(own.length)publicMessage(`You currently have ${own.length} saved appointment${own.length===1?'':'s'}. You can update the selections below.`,'ok');else publicMessage(event.allowMultiple===false?'Choose one time slot, then enter the parent/guardian and student information.':'Choose one or more time slots. Parent/guardian information is entered once; each time gets its own student name.');
  for(const slot of eventSlotsArray(event)){
    const selected=publicSelectedSlotIds.has(slot.id);const mine=publicOwnSignups.has(slot.id);const spotIds=eventSpotIds(slot);const filled=eventClaimsForSlot(event,slot.id).length;const capacity=spotIds.length||Number(slot.capacity||1);const full=capacity>0&&filled>=capacity&&!mine;const needsUpgrade=!spotIds.length;
    const row=document.createElement('div');row.className=`event-public-slot${selected?' is-selected':''}${full?' is-full':''}`;const time=document.createElement('strong');time.textContent=formatScheduleTime(slot.time);const copy=document.createElement('div');const label=document.createElement('b');label.textContent=slot.label||`${slot.duration||15} minute appointment`;const availability=document.createElement('small');
    if(needsUpgrade)availability.textContent='Organizer must update this event before new signups can be accepted';else if(mine)availability.textContent=`${filled}/${capacity} filled · Your signup`;else if(full)availability.textContent=`${filled}/${capacity} filled · FULL`;else availability.textContent=`${filled}/${capacity} filled · ${capacity-filled} spot${capacity-filled===1?'':'s'} left`;
    copy.append(label,availability);const choose=document.createElement('button');choose.type='button';choose.textContent=selected?'Selected':full?'Full':'Choose';choose.disabled=(event.status==='closed'&&!mine)||full||needsUpgrade;choose.addEventListener('click',()=>{if(selected){publicSelectedSlotIds.delete(slot.id)}else{if(event.allowMultiple===false)publicSelectedSlotIds.clear();publicSelectedSlotIds.add(slot.id)}renderPublicEvent();if(!selected)setTimeout(()=>eventPublicSelectionList?.querySelector(`[data-slot-id="${slot.id}"] input`)?.focus(),0)});row.append(time,copy,choose);eventPublicSlots.append(row)
  }
  const hasSelection=publicSelectedSlotIds.size>0;eventPublicForm.hidden=!(hasSelection||own.length);if(hasSelection||own.length)renderPublicSelection();else if(eventPublicSelectionList)eventPublicSelectionList.innerHTML='';
}
async function claimEventSpot(slot){
  const uid=currentUser.uid;const spotIds=eventSpotIds(slot);if(!spotIds.length)throw new Error('This event needs to be updated by the organizer before it can accept new signups.');
  for(const spotId of spotIds){
    try{
      const ref=fb.ref(db,`eventSignups/${publicEventSignupId}/claims/${slot.id}/${spotId}`);
      const result=await fb.runTransaction(ref,current=>current==null?uid:undefined,{applyLocally:false});
      if(result.committed&&result.snapshot.val()===uid)return spotId;
    }catch(error){if(error?.code==='PERMISSION_DENIED')throw error}
  }
  const error=new Error(`${formatScheduleTime(slot.time)} is full.`);error.code='SLOT_FULL';throw error;
}
async function releaseClaim(slotId,spotId){
  if(!slotId||!spotId||!currentUser)return;
  try{await fb.runTransaction(fb.ref(db,`eventSignups/${publicEventSignupId}/claims/${slotId}/${spotId}`),current=>current===currentUser.uid?null:undefined,{applyLocally:false})}catch{}
}
async function savePublicSignup(event){
  event.preventDefault();if(!publicEventData||!publicSelectedSlotIds.size)return;
  const parentName=eventPublicParentName.value.trim().replace(/\s+/g,' ').slice(0,60);const email=eventPublicEmail.value.trim().toLowerCase().slice(0,120);const phone=eventPublicPhone.value.trim().replace(/\s+/g,' ').slice(0,30);
  if(!parentName){eventPublicParentName.focus();return}if(!email||!eventPublicEmail.checkValidity()){eventPublicEmail.focus();return}
  const selectedSlots=eventSlotsArray(publicEventData).filter(slot=>publicSelectedSlotIds.has(slot.id));if(!selectedSlots.length)return;
  const students=new Map();for(const slot of selectedSlots){const raw=String(publicDraftStudentNames.get(slot.id)||signupStudentName(publicOwnSignups.get(slot.id))).trim().replace(/\s+/g,' ').slice(0,60);if(!raw){const input=eventPublicSelectionList.querySelector(`[data-slot-id="${slot.id}"] input`);input?.focus();publicMessage(`Enter the student name for ${formatScheduleTime(slot.time)}.`,'error');return}students.set(slot.id,raw)}
  const newlyClaimed=[];
  try{
    await initRaceFirebase();const uid=currentUser.uid;const now=Date.now();const claimedBySlot=new Map();
    for(const slot of selectedSlots){const previous=publicOwnSignups.get(slot.id);if(previous?.spotId){claimedBySlot.set(slot.id,previous.spotId);continue}const spotId=await claimEventSpot(slot);claimedBySlot.set(slot.id,spotId);newlyClaimed.push({slotId:slot.id,spotId})}
    const updates={};
    for(const [slotId,previous] of publicOwnSignups){if(publicSelectedSlotIds.has(slotId))continue;updates[`reservations/${uid}/${slotId}`]=null;if(previous?.spotId&&publicEventData?.claims?.[slotId]?.[previous.spotId]===uid)updates[`claims/${slotId}/${previous.spotId}`]=null}
    for(const slot of selectedSlots){const previous=publicOwnSignups.get(slot.id);const studentName=students.get(slot.id);const spotId=claimedBySlot.get(slot.id);updates[`reservations/${uid}/${slot.id}`]={uid,slotId,spotId,name:studentName,studentName,parentName,email,phone,createdAt:previous?.createdAt||now,updatedAt:now}}
    await fb.update(fb.ref(db,`eventSignups/${publicEventSignupId}`),updates);
    publicOwnSignups=new Map();for(const slot of selectedSlots)publicOwnSignups.set(slot.id,updates[`reservations/${uid}/${slot.id}`]);publicSelectionInitialized=false;initializePublicSelection();renderPublicEvent();publicMessage(`Saved ${selectedSlots.length} appointment${selectedSlots.length===1?'':'s'} for ${parentName}.`,'ok');
  }catch(error){for(const item of newlyClaimed)await releaseClaim(item.slotId,item.spotId);const message=error?.code==='SLOT_FULL'?'One of the selected times was just taken. Choose another available time and try again.':error?.code==='PERMISSION_DENIED'?'Firebase blocked the reservation. Publish the updated Event Sign Up database rules, or the event may have just closed.':(error?.message||'Could not save your signup.');publicMessage(message,'error')}
}
async function cancelPublicSignup(){
  const existing=publicCurrentSignups();if(!existing.length||!confirm(`Cancel ${existing.length===1?'your signup':`all ${existing.length} of your signups`}?`))return;
  try{
    const uid=currentUser.uid;const updates={};for(const item of existing){updates[`reservations/${uid}/${item.slot.id}`]=null;if(item.signup?.spotId&&publicEventData?.claims?.[item.slot.id]?.[item.signup.spotId]===uid)updates[`claims/${item.slot.id}/${item.signup.spotId}`]=null}
    await fb.update(fb.ref(db,`eventSignups/${publicEventSignupId}`),updates);publicOwnSignups.clear();publicSelectedSlotIds.clear();publicDraftStudentNames.clear();publicSelectionInitialized=true;eventPublicParentName.value='';eventPublicEmail.value='';eventPublicPhone.value='';renderPublicEvent();publicMessage('Your signup was cancelled and the spot is available again.','ok');
  }catch(error){publicMessage(error?.message||'Could not cancel your signup.','error')}
}
async function loadPublicOwnSignups(id,event){
  publicOwnSignups=new Map();if(!currentUser)return;
  try{const snap=await fb.get(fb.ref(db,`eventSignups/${id}/reservations/${currentUser.uid}`));if(snap.exists())for(const [slotId,item] of Object.entries(snap.val()||{}))if(item&&event?.slots?.[slotId])publicOwnSignups.set(slotId,item)}catch{}
}
async function openPublicEvent(id){
  publicEventSignupId=id;publicSelectedSlotIds=new Set();publicDraftStudentNames=new Map();publicSelectionInitialized=false;document.body.classList.add('event-signup-public-mode');openCalculator('event-signup');eventSignupTeacherView.hidden=true;eventSignupPublicView.hidden=false;
  try{
    await initRaceFirebase();
    const base=`eventSignups/${id}`;
    const [titleSnap,dateSnap,descriptionSnap,statusSnap,allowMultipleSnap,slotsSnap,claimsSnap]=await Promise.all([
      fb.get(fb.ref(db,`${base}/title`)),fb.get(fb.ref(db,`${base}/date`)),fb.get(fb.ref(db,`${base}/description`)),fb.get(fb.ref(db,`${base}/status`)),fb.get(fb.ref(db,`${base}/allowMultiple`)),fb.get(fb.ref(db,`${base}/slots`)),fb.get(fb.ref(db,`${base}/claims`))
    ]);
    if(!titleSnap.exists()){eventPublicTitle.textContent='Event not found';eventPublicSlots.innerHTML='';publicMessage('This signup link is no longer available.','error');return}
    publicEventData={title:titleSnap.val(),date:dateSnap.val(),description:descriptionSnap.val()||'',status:statusSnap.val()||'open',allowMultiple:allowMultipleSnap.exists()?allowMultipleSnap.val():true,slots:slotsSnap.val()||{},claims:claimsSnap.val()||{}};
    await loadPublicOwnSignups(id,publicEventData);renderPublicEvent();
    if(publicEventUnsubscribe)publicEventUnsubscribe();
    const unsubTitle=fb.onValue(fb.ref(db,`${base}/title`),snap=>{publicEventData.title=snap.val()||'Event Sign Up';renderPublicEvent()});
    const unsubDate=fb.onValue(fb.ref(db,`${base}/date`),snap=>{publicEventData.date=snap.val()||'';renderPublicEvent()});
    const unsubDescription=fb.onValue(fb.ref(db,`${base}/description`),snap=>{publicEventData.description=snap.val()||'';renderPublicEvent()});
    const unsubStatus=fb.onValue(fb.ref(db,`${base}/status`),snap=>{publicEventData.status=snap.val()||'open';renderPublicEvent()});
    const unsubAllowMultiple=fb.onValue(fb.ref(db,`${base}/allowMultiple`),snap=>{publicEventData.allowMultiple=snap.exists()?snap.val():true;if(publicEventData.allowMultiple===false&&publicSelectedSlotIds.size>1){const keep=publicSelectedSlotIds.values().next().value;publicSelectedSlotIds=new Set(keep?[keep]:[])}renderPublicEvent()});
    const unsubSlots=fb.onValue(fb.ref(db,`${base}/slots`),snap=>{publicEventData.slots=snap.val()||{};renderPublicEvent()});
    const unsubClaims=fb.onValue(fb.ref(db,`${base}/claims`),snap=>{publicEventData.claims=snap.val()||{};renderPublicEvent()});
    const unsubOwn=fb.onValue(fb.ref(db,`${base}/reservations/${currentUser.uid}`),snap=>{publicOwnSignups=new Map();if(snap.exists())for(const [slotId,item] of Object.entries(snap.val()||{}))if(item&&publicEventData?.slots?.[slotId])publicOwnSignups.set(slotId,item);publicSelectionInitialized=false;initializePublicSelection();renderPublicEvent()});
    publicEventUnsubscribe=()=>{unsubTitle();unsubDate();unsubDescription();unsubStatus();unsubAllowMultiple();unsubSlots();unsubClaims();unsubOwn()};
  }catch(error){publicMessage(error?.code==='PERMISSION_DENIED'?'This Event Sign Up needs the updated Firebase database rules before the public link can open.':(error?.message||'Could not load this event.'),'error')}
}
window.openEventSignupById=id=>{setCalculatorMode('event-signup');setTimeout(()=>{editEventSignup(id);document.querySelector('#eventSignupPanel')?.scrollIntoView({behavior:'smooth',block:'start'})},0)};
window.refreshEventSignupManager=refreshEventSignupManager;
if(addEventSignupSlot)addEventSignupSlot.addEventListener('click',()=>{eventSignupEditorSlots.push(nextEventSlot());renderEventSlotEditor()});
if(generateEventSignupSlots)generateEventSignupSlots.addEventListener('click',generateEventSlotsFromBuilder);
[eventSlotGeneratorStart,eventSlotGeneratorDuration,eventSlotGeneratorCount,eventSlotGeneratorCapacity].forEach(input=>{input?.addEventListener('input',updateEventSlotGeneratorPreview);input?.addEventListener('change',updateEventSlotGeneratorPreview)});
if(eventSignupForm)eventSignupForm.addEventListener('submit',saveEventFromForm);
if(clearEventSignupForm)clearEventSignupForm.addEventListener('click',resetEventSignupEditor);
if(cancelEventSignupEdit)cancelEventSignupEdit.addEventListener('click',resetEventSignupEditor);
if(newEventSignup)newEventSignup.addEventListener('click',()=>{resetEventSignupEditor();eventSignupName.focus()});
if(refreshEventSignups)refreshEventSignups.addEventListener('click',refreshEventSignupManager);
if(eventPublicForm)eventPublicForm.addEventListener('submit',savePublicSignup);
if(eventPublicCancelSignup)eventPublicCancelSignup.addEventListener('click',cancelPublicSignup);
loadEventSignupIds();resetEventSignupEditor();renderEventSignupList();
// Add Event Sign Up references to the shared Classroom Tools Google-sync payload.
const previousGetClassroomToolsSyncData=window.getClassroomToolsSyncData;
window.getClassroomToolsSyncData=()=>{const base=previousGetClassroomToolsSyncData?previousGetClassroomToolsSyncData():{};return{...base,eventSignup:{eventIds:[...eventSignupIds]}}};
const previousApplyClassroomToolsSyncData=window.applyClassroomToolsSyncData;
window.applyClassroomToolsSyncData=data=>{previousApplyClassroomToolsSyncData?.(data);if(data?.eventSignup&&Array.isArray(data.eventSignup.eventIds)){eventSignupIds=safeEventIds(data.eventSignup.eventIds);localStorage.setItem(EVENT_SIGNUP_IDS_KEY,JSON.stringify(eventSignupIds));if(!publicEventSignupId)refreshEventSignupManager()}};
const signupParam=new URLSearchParams(location.search).get('signup');
if(signupParam&&/^[A-Z2-9]{6,20}$/i.test(signupParam))setTimeout(()=>openPublicEvent(signupParam.toUpperCase()),0);else if(eventSignupIds.length)setTimeout(refreshEventSignupManager,350);
