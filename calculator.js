const navTools=document.querySelector('#navTools');
const calculatorView=document.querySelector('#calculatorView');
const calculatorPanel=document.querySelector('#calculatorPanel');
const numberGeneratorPanel=document.querySelector('#numberGeneratorPanel');
const scheduleTimerPanel=document.querySelector('#scheduleTimerPanel');
const wheelPanel=document.querySelector('#wheelPanel');
const seatingPanel=document.querySelector('#seatingPanel');
const showCalculator=document.querySelector('#showCalculator');
const showNumberGenerator=document.querySelector('#showNumberGenerator');
const showScheduleTimer=document.querySelector('#showScheduleTimer');
const showWheel=document.querySelector('#showWheel');
const showSeating=document.querySelector('#showSeating');
const calculatorTitle=document.querySelector('#calculator-title');
const calculatorHint=document.querySelector('#calculatorHint');
const calculatorEyebrow=document.querySelector('#calculatorEyebrow');
function setCalculatorMode(mode){
  const calculator=mode==='calculator';
  const numberGenerator=mode==='number-generator';
  const scheduleTimer=mode==='schedule-timer';
  const wheel=mode==='wheel';
  const seating=mode==='seating';
  calculatorPanel.hidden=!calculator;
  numberGeneratorPanel.hidden=!numberGenerator;
  scheduleTimerPanel.hidden=!scheduleTimer;
  wheelPanel.hidden=!wheel;
  seatingPanel.hidden=!seating;
  showCalculator.classList.toggle('active',calculator);
  showNumberGenerator.classList.toggle('active',numberGenerator);
  showScheduleTimer.classList.toggle('active',scheduleTimer);
  showWheel.classList.toggle('active',wheel);
  showSeating.classList.toggle('active',seating);
  calculatorTitle.textContent=seating?'Seating Chart':wheel?'Random Wheel':scheduleTimer?'Schedule Timer':numberGenerator?'Number Generator':'Graphing & Scientific Calculator';
  calculatorHint.textContent=seating?'Create, arrange, and print a classroom seating plan.':wheel?'Paste a list, spin, and select someone or something at random.':scheduleTimer?'Create multiple timers that start automatically at their scheduled times.':numberGenerator?'Generate classroom numbers from any range, with an optional no-repeat mode.':'Choose GLN TI-84 or GLN TI-30XS inside the calculator.';
  if(numberGenerator)setTimeout(()=>{numberGeneratorMin.focus();queueFitNumberGeneratorResult()},0);
  if(scheduleTimer)setTimeout(()=>{renderScheduleTimers();updateScheduleTimerClock()},0);
  if(wheel)setTimeout(()=>{refreshWheelSeatingClasses();drawWheel()},0);
  if(seating)setTimeout(()=>window.renderSeatingChart?.(),0);
}
showCalculator.onclick=()=>setCalculatorMode('calculator');
showNumberGenerator.onclick=()=>setCalculatorMode('number-generator');
showScheduleTimer.onclick=()=>setCalculatorMode('schedule-timer');
showWheel.onclick=()=>setCalculatorMode('wheel');
showSeating.onclick=()=>setCalculatorMode('seating');

const numberGeneratorMin=document.querySelector('#numberGeneratorMin');
const numberGeneratorMax=document.querySelector('#numberGeneratorMax');
const numberGeneratorResult=document.querySelector('#numberGeneratorResult');
const numberGeneratorStatus=document.querySelector('#numberGeneratorStatus');
const numberGeneratorHistory=document.querySelector('#numberGeneratorHistory');
const numberNoRepeats=document.querySelector('#numberNoRepeats');
const numberUseCommas=document.querySelector('#numberUseCommas');
const NUMBER_GENERATOR_LIMIT=9999999999;
const MAX_SAFE_RANDOM_RANGE=9007199254740992;
let generatedNumberHistory=[];
let numberNoRepeatSignature='';
let numberNoRepeatRemaining=0;
let numberNoRepeatSwaps=new Map();
function parseGeneratorInteger(value,fallback){
  const cleaned=String(value??'').replace(/,/g,'').trim();
  if(!cleaned)return fallback;
  const parsed=Number(cleaned);
  return Number.isFinite(parsed)?Math.trunc(parsed):fallback;
}
function formatGeneratorNumber(value){
  const integer=Math.trunc(Number(value));
  if(!Number.isFinite(integer))return '—';
  return numberUseCommas?.checked?integer.toLocaleString('en-US'):String(integer);
}
function normalizedNumberRange(){
  let min=parseGeneratorInteger(numberGeneratorMin.value,1),max=parseGeneratorInteger(numberGeneratorMax.value,30);
  min=Math.max(-NUMBER_GENERATOR_LIMIT,Math.min(NUMBER_GENERATOR_LIMIT,min));
  max=Math.max(-NUMBER_GENERATOR_LIMIT,Math.min(NUMBER_GENERATOR_LIMIT,max));
  if(min>max)[min,max]=[max,min];
  numberGeneratorMin.value=formatGeneratorNumber(min);numberGeneratorMax.value=formatGeneratorNumber(max);
  return{min,max,size:max-min+1};
}
function secureRandomOffset(range){
  if(range<=1)return 0;
  if(range>MAX_SAFE_RANDOM_RANGE)throw new Error('Range is too large.');
  if(window.crypto?.getRandomValues){
    const values=new Uint32Array(2);
    const limit=Math.floor(MAX_SAFE_RANDOM_RANGE/range)*range;
    let value;
    do{
      window.crypto.getRandomValues(values);
      value=(values[0]&0x1fffff)*4294967296+values[1];
    }while(value>=limit);
    return value%range;
  }
  return Math.floor(Math.random()*range);
}
function secureRandomInt(min,max){return min+secureRandomOffset(max-min+1)}
function resetNumberPool(){numberNoRepeatSignature='';numberNoRepeatRemaining=0;numberNoRepeatSwaps=new Map()}
function prepareNoRepeatSampler(min,max){
  const signature=`${min}:${max}`;
  const size=max-min+1;
  if(numberNoRepeatSignature===signature&&numberNoRepeatRemaining>0)return;
  numberNoRepeatSignature=signature;
  numberNoRepeatRemaining=size;
  numberNoRepeatSwaps=new Map();
}
function takeNoRepeatNumber(min,max){
  prepareNoRepeatSampler(min,max);
  if(numberNoRepeatRemaining<=0){resetNumberPool();prepareNoRepeatSampler(min,max)}
  const pickIndex=secureRandomOffset(numberNoRepeatRemaining);
  const lastIndex=numberNoRepeatRemaining-1;
  const chosenOffset=numberNoRepeatSwaps.has(pickIndex)?numberNoRepeatSwaps.get(pickIndex):pickIndex;
  const lastOffset=numberNoRepeatSwaps.has(lastIndex)?numberNoRepeatSwaps.get(lastIndex):lastIndex;
  if(pickIndex!==lastIndex)numberNoRepeatSwaps.set(pickIndex,lastOffset);
  else numberNoRepeatSwaps.delete(pickIndex);
  numberNoRepeatSwaps.delete(lastIndex);
  numberNoRepeatRemaining--;
  return min+chosenOffset;
}
function renderNumberHistory(){
  numberGeneratorHistory.innerHTML='';
  if(!generatedNumberHistory.length){const li=document.createElement('li');li.textContent='No numbers yet';numberGeneratorHistory.append(li);return}
  generatedNumberHistory.forEach(value=>{const li=document.createElement('li');li.textContent=formatGeneratorNumber(value);numberGeneratorHistory.append(li)});
}
function fitNumberGeneratorResult(){
  if(!numberGeneratorResult)return;
  const el=numberGeneratorResult;
  el.classList.add('number-result-fitted');
  el.style.fontSize='';
  const minSize=28;
  const maxWidth=Math.max(0, el.clientWidth-4);
  if(!maxWidth)return;
  let current=parseFloat(getComputedStyle(el).fontSize)||72;
  let measured=el.scrollWidth;
  if(!measured)return;
  if(measured>maxWidth){
    let next=Math.max(minSize, Math.floor(current*((maxWidth)/measured)));
    el.style.fontSize=`${next}px`;
    current=next;
    measured=el.scrollWidth;
    let guard=0;
    while(measured>maxWidth && current>minSize && guard<8){
      current=Math.max(minSize,current-2);
      el.style.fontSize=`${current}px`;
      measured=el.scrollWidth;
      guard++;
    }
  }
}
const queueFitNumberGeneratorResult=(()=>{
  let raf=0;
  return()=>{
    if(raf)cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{raf=0;fitNumberGeneratorResult()});
  };
})();
function generateClassroomNumber(){
  const{min,max,size}=normalizedNumberRange();
  if(size<1)return;
  let result;
  if(numberNoRepeats.checked){
    result=takeNoRepeatNumber(min,max);
    const left=numberNoRepeatRemaining;
    numberGeneratorStatus.textContent=left?`${formatGeneratorNumber(left)} number${left===1?'':'s'} remaining before reset.`:'All numbers in this range have now been used. The next Generate starts a new round.';
  }else{
    result=secureRandomInt(min,max);
    numberGeneratorStatus.textContent=`Generated from ${formatGeneratorNumber(min)} to ${formatGeneratorNumber(max)}.`;
  }
  numberGeneratorResult.textContent=formatGeneratorNumber(result);
  queueFitNumberGeneratorResult();
  generatedNumberHistory.unshift(result);generatedNumberHistory=generatedNumberHistory.slice(0,100);renderNumberHistory();
  numberGeneratorPanel.classList.remove('number-pop');void numberGeneratorPanel.offsetWidth;numberGeneratorPanel.classList.add('number-pop');
}
function resetNumberGenerator(){
  numberGeneratorMin.value='1';numberGeneratorMax.value='30';numberNoRepeats.checked=false;numberUseCommas.checked=true;numberGeneratorResult.textContent='—';numberGeneratorStatus.textContent='Choose a range, then generate a number.';generatedNumberHistory=[];renderNumberHistory();resetNumberPool();queueFitNumberGeneratorResult();
}
document.querySelector('#generateNumber').onclick=generateClassroomNumber;
document.querySelector('#resetNumberGenerator').onclick=resetNumberGenerator;
document.querySelector('#clearNumberHistory').onclick=()=>{generatedNumberHistory=[];renderNumberHistory()};
numberNoRepeats.onchange=()=>{resetNumberPool();numberGeneratorStatus.textContent=numberNoRepeats.checked?'No Repeats is on. Each number will be used once per round.':'Repeats are allowed.'};
numberUseCommas.onchange=()=>{
  const currentResult=generatedNumberHistory[0];
  const min=parseGeneratorInteger(numberGeneratorMin.value,1),max=parseGeneratorInteger(numberGeneratorMax.value,30);
  numberGeneratorMin.value=formatGeneratorNumber(Math.max(-NUMBER_GENERATOR_LIMIT,Math.min(NUMBER_GENERATOR_LIMIT,min)));
  numberGeneratorMax.value=formatGeneratorNumber(Math.max(-NUMBER_GENERATOR_LIMIT,Math.min(NUMBER_GENERATOR_LIMIT,max)));
  numberGeneratorResult.textContent=currentResult===undefined?'—':formatGeneratorNumber(currentResult);
  renderNumberHistory();
  queueFitNumberGeneratorResult();
};
[numberGeneratorMin,numberGeneratorMax].forEach(input=>{
  input.addEventListener('focus',()=>input.select());
  input.addEventListener('change',()=>{normalizedNumberRange();resetNumberPool()});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();generateClassroomNumber()}})
});
document.querySelectorAll('[data-number-max]').forEach(button=>button.addEventListener('click',()=>{
  const max=Number(button.dataset.numberMax);
  numberGeneratorMin.value=formatGeneratorNumber(1);numberGeneratorMax.value=formatGeneratorNumber(max);resetNumberPool();numberGeneratorResult.textContent='—';numberGeneratorStatus.textContent=`Quick range set to ${formatGeneratorNumber(1)}–${formatGeneratorNumber(max)}. Press Generate when ready.`;queueFitNumberGeneratorResult();
}));
window.addEventListener('resize',queueFitNumberGeneratorResult);
renderNumberHistory();
queueFitNumberGeneratorResult();

// Scheduled Classroom Timer
const SCHEDULE_TIMER_STORAGE_KEY='glnScheduleTimersV1';
const scheduleClock=document.querySelector('#scheduleClock');
const scheduleActiveState=document.querySelector('#scheduleActiveState');
const scheduleActiveName=document.querySelector('#scheduleActiveName');
const scheduleCountdown=document.querySelector('#scheduleCountdown');
const scheduleActiveRange=document.querySelector('#scheduleActiveRange');
const scheduleProgress=document.querySelector('#scheduleProgress');
const scheduleNext=document.querySelector('#scheduleNext');
const scheduleSpecialDay=document.querySelector('#scheduleSpecialDay');
const stopScheduleTimer=document.querySelector('#stopScheduleTimer');
const scheduleTimerForm=document.querySelector('#scheduleTimerForm');
const scheduleName=document.querySelector('#scheduleName');
const scheduleStartTime=document.querySelector('#scheduleStartTime');
const scheduleDuration=document.querySelector('#scheduleDuration');
const scheduleEnabled=document.querySelector('#scheduleEnabled');
const scheduleTimerList=document.querySelector('#scheduleTimerList');
const scheduleEditorTitle=document.querySelector('#scheduleEditorTitle');
const saveScheduleTimer=document.querySelector('#saveScheduleTimer');
const cancelScheduleEdit=document.querySelector('#cancelScheduleEdit');
const clearScheduleTimers=document.querySelector('#clearScheduleTimers');
const scheduleTypeWeekly=document.querySelector('#scheduleTypeWeekly');
const scheduleTypeOneDay=document.querySelector('#scheduleTypeOneDay');
const scheduleTypeHelp=document.querySelector('#scheduleTypeHelp');
const scheduleWeeklyFields=document.querySelector('#scheduleWeeklyFields');
const scheduleOneDayFields=document.querySelector('#scheduleOneDayFields');
const scheduleCustomDate=document.querySelector('#scheduleCustomDate');
let classroomSchedules=[];
let editingScheduleId='';
let scheduleEditorType='weekly';
let manualTimer=null;
const dismissedScheduleOccurrences=new Set();
function localScheduleDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function parseScheduleDateKey(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!match)return null;
  const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
  return Number.isNaN(date.getTime())?null:date;
}
function formatScheduleDate(value){
  const date=parseScheduleDateKey(value);return date?date.toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}):'Choose a date';
}
function normalizeStoredSchedule(item){
  if(!item||!item.id||!item.time||!item.duration)return null;
  const type=item.type==='one-day'&&item.date?'one-day':'weekly';
  return{...item,type,days:type==='weekly'?(Array.isArray(item.days)?item.days:[]):undefined,date:type==='one-day'?item.date:undefined,enabled:item.enabled!==false};
}
function loadClassroomSchedules(){
  try{
    const saved=JSON.parse(localStorage.getItem(SCHEDULE_TIMER_STORAGE_KEY)||'[]');
    classroomSchedules=Array.isArray(saved)?saved.map(normalizeStoredSchedule).filter(Boolean):[];
  }catch{classroomSchedules=[]}
  deactivateExpiredOneDaySchedules();
}
function saveClassroomSchedules(){localStorage.setItem(SCHEDULE_TIMER_STORAGE_KEY,JSON.stringify(classroomSchedules))}
function deactivateExpiredOneDaySchedules(now=new Date()){
  const today=localScheduleDateKey(now);let changed=false;
  classroomSchedules.forEach(entry=>{if(entry.type==='one-day'&&entry.enabled&&entry.date<today){entry.enabled=false;changed=true}});
  if(changed)saveClassroomSchedules();
  return changed;
}
function scheduleDayChecks(){return [...document.querySelectorAll('.schedule-days input[type="checkbox"]')]}
function selectedScheduleDays(){return scheduleDayChecks().filter(input=>input.checked).map(input=>Number(input.value))}
function scheduleDayText(days){
  const normalized=[...new Set(days||[])].sort((a,b)=>a-b);
  const weekdays=[1,2,3,4,5];
  if(weekdays.every(day=>normalized.includes(day))&&normalized.length===5)return 'Mon–Fri';
  if(normalized.length===7)return 'Every day';
  const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return normalized.map(day=>names[day]).join(', ');
}
function formatScheduleTime(time){
  const [hourText,minuteText]=String(time||'00:00').split(':');
  let hour=Number(hourText)||0;const minute=Number(minuteText)||0;const suffix=hour>=12?'PM':'AM';hour=hour%12||12;
  return `${hour}:${String(minute).padStart(2,'0')} ${suffix}`;
}
function formatScheduleClock(date=new Date()){
  return date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'});
}
function formatTimerRemaining(ms){
  const total=Math.max(0,Math.ceil(ms/1000));
  const hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
  return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function occurrenceForSchedule(entry,date){
  if(!entry.enabled)return null;
  const dateKey=localScheduleDateKey(date);
  if(entry.type==='one-day'){
    if(entry.date!==dateKey)return null;
  }else if(!(entry.days||[]).includes(date.getDay()))return null;
  const [hour,minute]=entry.time.split(':').map(Number);
  const start=new Date(date);start.setHours(hour||0,minute||0,0,0);
  const end=new Date(start.getTime()+Number(entry.duration)*60000);
  const key=`${entry.id}:${dateKey}`;
  return{entry,start,end,key,type:entry.type||'weekly'};
}
function allOccurrencesForDate(date){
  return classroomSchedules.map(entry=>occurrenceForSchedule(entry,date)).filter(Boolean);
}
function getUpcomingSchedule(now=new Date()){
  const candidates=[];
  for(let add=0;add<8;add++){
    const date=new Date(now);date.setDate(now.getDate()+add);
    classroomSchedules.filter(entry=>entry.type!=='one-day').forEach(entry=>{
      const occurrence=occurrenceForSchedule(entry,date);
      if(occurrence&&occurrence.start>now&&!dismissedScheduleOccurrences.has(occurrence.key))candidates.push(occurrence);
    });
  }
  classroomSchedules.filter(entry=>entry.type==='one-day'&&entry.enabled).forEach(entry=>{
    const date=parseScheduleDateKey(entry.date);if(!date)return;
    const occurrence=occurrenceForSchedule(entry,date);
    if(occurrence&&occurrence.start>now&&!dismissedScheduleOccurrences.has(occurrence.key))candidates.push(occurrence);
  });
  return candidates.sort((a,b)=>a.start-b.start||(a.type==='one-day'?-1:1))[0]||null;
}
function getActiveScheduledOccurrence(now=new Date()){
  const active=allOccurrencesForDate(now).filter(item=>now>=item.start&&now<item.end&&!dismissedScheduleOccurrences.has(item.key));
  const custom=active.filter(item=>item.type==='one-day').sort((a,b)=>a.start-b.start)[0];
  if(custom)return custom;
  return active.filter(item=>item.type!=='one-day').sort((a,b)=>a.start-b.start)[0]||null;
}
function setScheduleEditorType(type,{keepDate=false}={}){
  scheduleEditorType=type==='one-day'?'one-day':'weekly';
  const oneDay=scheduleEditorType==='one-day';
  scheduleTypeWeekly?.classList.toggle('active',!oneDay);scheduleTypeWeekly?.setAttribute('aria-pressed',String(!oneDay));
  scheduleTypeOneDay?.classList.toggle('active',oneDay);scheduleTypeOneDay?.setAttribute('aria-pressed',String(oneDay));
  if(scheduleWeeklyFields)scheduleWeeklyFields.hidden=oneDay;
  if(scheduleOneDayFields)scheduleOneDayFields.hidden=!oneDay;
  if(scheduleCustomDate){scheduleCustomDate.required=oneDay;if(oneDay&&!keepDate&&!scheduleCustomDate.value)scheduleCustomDate.value=localScheduleDateKey(new Date())}
  if(scheduleTypeHelp)scheduleTypeHelp.textContent=oneDay?'Run this timer only on one specific calendar date. One-Day timers take priority over weekly timers when they overlap.':'Repeat this timer on selected weekdays.';
}
function resetScheduleEditor(){
  editingScheduleId='';scheduleEditorTitle.textContent='Add schedule';saveScheduleTimer.textContent='Add schedule';cancelScheduleEdit.hidden=true;scheduleTimerForm.reset();scheduleDuration.value='5';scheduleEnabled.checked=true;scheduleDayChecks().forEach(input=>input.checked=['1','2','3','4','5'].includes(input.value));setScheduleEditorType('weekly');scheduleName.focus();
}
function editClassroomSchedule(id){
  const entry=classroomSchedules.find(item=>item.id===id);if(!entry)return;
  editingScheduleId=id;scheduleEditorTitle.textContent='Edit schedule';saveScheduleTimer.textContent='Update schedule';cancelScheduleEdit.hidden=false;scheduleName.value=entry.name;scheduleStartTime.value=entry.time;scheduleDuration.value=entry.duration;scheduleEnabled.checked=entry.enabled;
  if(entry.type==='one-day'){
    scheduleCustomDate.value=entry.date||localScheduleDateKey(new Date());setScheduleEditorType('one-day',{keepDate:true});
  }else{
    scheduleDayChecks().forEach(input=>input.checked=(entry.days||[]).includes(Number(input.value)));setScheduleEditorType('weekly');
  }
  scheduleName.focus();
}
function scheduleSortValue(entry){return entry.type==='one-day'?`0:${entry.date}:${entry.time}`:`1:${entry.time}:${entry.name}`}
function renderScheduleTimers(){
  if(!scheduleTimerList)return;
  scheduleTimerList.innerHTML='';
  const sorted=[...classroomSchedules].sort((a,b)=>scheduleSortValue(a).localeCompare(scheduleSortValue(b)));
  if(!sorted.length){scheduleTimerList.innerHTML='<p class="schedule-empty">No schedules yet. Add a weekly or one-day automatic timer.</p>';return}
  const today=localScheduleDateKey(new Date());
  sorted.forEach(entry=>{
    const expired=entry.type==='one-day'&&entry.date<today;
    const row=document.createElement('article');row.className=`schedule-row${entry.enabled?'':' is-disabled'}${entry.type==='one-day'?' is-one-day':''}`;
    const main=document.createElement('div');main.className='schedule-row-main';
    const time=document.createElement('strong');time.className='schedule-row-time';time.textContent=formatScheduleTime(entry.time);
    const copy=document.createElement('div');const titleLine=document.createElement('div');titleLine.className='schedule-row-title';const name=document.createElement('strong');name.textContent=entry.name;titleLine.append(name);
    if(entry.type==='one-day'){const badge=document.createElement('span');badge.className='schedule-type-badge';badge.textContent='One Day';titleLine.append(badge)}
    const meta=document.createElement('small');meta.textContent=entry.type==='one-day'?`${entry.duration} min · ${formatScheduleDate(entry.date)}${expired?' · Past date':''}`:`${entry.duration} min · ${scheduleDayText(entry.days)}`;copy.append(titleLine,meta);main.append(time,copy);
    const actions=document.createElement('div');actions.className='schedule-row-actions';
    const enabled=document.createElement('label');enabled.className='schedule-row-toggle';const check=document.createElement('input');check.type='checkbox';check.checked=entry.enabled;const text=document.createElement('span');text.textContent=entry.enabled?'On':'Off';check.addEventListener('change',()=>{entry.enabled=check.checked;saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock()});enabled.append(check,text);
    const run=document.createElement('button');run.type='button';run.textContent='Run now';run.addEventListener('click',()=>runScheduleNow(entry));
    const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>editClassroomSchedule(entry.id));
    const del=document.createElement('button');del.type='button';del.textContent='Delete';del.className='danger';del.addEventListener('click',()=>{classroomSchedules=classroomSchedules.filter(item=>item.id!==entry.id);saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock()});
    actions.append(enabled,run,edit,del);row.append(main,actions);scheduleTimerList.append(row);
  });
}
function runScheduleNow(entry){
  const start=new Date();manualTimer={entry,start,end:new Date(start.getTime()+Number(entry.duration)*60000),key:`manual:${entry.id}:${Date.now()}`};updateScheduleTimerClock();
}
function activeTimerOccurrence(now){
  if(manualTimer&&now<manualTimer.end)return manualTimer;
  if(manualTimer&&now>=manualTimer.end)manualTimer=null;
  return getActiveScheduledOccurrence(now);
}
function oneDayScheduleExistsToday(now=new Date()){
  const today=localScheduleDateKey(now);return classroomSchedules.some(entry=>entry.type==='one-day'&&entry.enabled&&entry.date===today);
}
function formatUpcomingSchedule(occurrence){
  if(!occurrence)return 'No upcoming schedule';
  const entry=occurrence.entry;
  return entry.type==='one-day'?`${entry.name} · ${formatScheduleTime(entry.time)} · ${formatScheduleDate(entry.date)} · One Day`:`${entry.name} · ${formatScheduleTime(entry.time)} · ${scheduleDayText(entry.days)}`;
}
function updateScheduleTimerClock(){
  if(!scheduleClock)return;
  const now=new Date();scheduleClock.textContent=formatScheduleClock(now);
  if(deactivateExpiredOneDaySchedules(now))renderScheduleTimers();
  const specialToday=oneDayScheduleExistsToday(now);
  if(scheduleSpecialDay){scheduleSpecialDay.hidden=!specialToday;scheduleSpecialDay.textContent=specialToday?`Special one-day schedule active today · ${formatScheduleDate(localScheduleDateKey(now))}`:''}
  const active=activeTimerOccurrence(now);
  if(active){
    const remaining=active.end-now;const total=Math.max(1,active.end-active.start);const elapsed=Math.max(0,now-active.start);const pct=Math.min(100,Math.max(0,elapsed/total*100));const remainingText=formatTimerRemaining(remaining);
    scheduleActiveState.textContent=String(active.key).startsWith('manual:')?'RUNNING NOW':active.entry.type==='one-day'?'ONE-DAY SCHEDULE':'RUNNING AUTOMATICALLY';scheduleActiveName.textContent=active.entry.name;scheduleCountdown.textContent=remainingText;scheduleActiveRange.textContent=`${formatScheduleTime(`${String(active.start.getHours()).padStart(2,'0')}:${String(active.start.getMinutes()).padStart(2,'0')}`)} – ${formatScheduleTime(`${String(active.end.getHours()).padStart(2,'0')}:${String(active.end.getMinutes()).padStart(2,'0')}`)}${active.entry.type==='one-day'?` · ${formatScheduleDate(active.entry.date)}`:''}`;scheduleProgress.style.width=`${pct}%`;stopScheduleTimer.hidden=false;showScheduleTimer.textContent=`Schedule Timer · ${remainingText}`;
  }else{
    scheduleActiveState.textContent=specialToday?'SPECIAL SCHEDULE TODAY':'WAITING';scheduleActiveName.textContent='No timer is running';scheduleCountdown.textContent='--:--';scheduleActiveRange.textContent='The next enabled schedule will start automatically.';scheduleProgress.style.width='0%';stopScheduleTimer.hidden=true;showScheduleTimer.textContent='Schedule Timer';
  }
  scheduleNext.textContent=formatUpcomingSchedule(getUpcomingSchedule(now));
}
if(scheduleTypeWeekly)scheduleTypeWeekly.addEventListener('click',()=>setScheduleEditorType('weekly'));
if(scheduleTypeOneDay)scheduleTypeOneDay.addEventListener('click',()=>setScheduleEditorType('one-day'));
if(scheduleTimerForm)scheduleTimerForm.addEventListener('submit',event=>{
  event.preventDefault();
  const name=scheduleName.value.trim();const time=scheduleStartTime.value;const duration=Math.max(1,Math.min(480,Number(scheduleDuration.value)||1));
  if(!name||!time)return;
  let scheduleData;
  if(scheduleEditorType==='one-day'){
    const date=scheduleCustomDate.value;
    if(!date){alert('Choose a date for this one-day schedule.');return}
    if(date<localScheduleDateKey(new Date())){alert('Choose today or a future date for a one-day schedule.');return}
    scheduleData={type:'one-day',name,time,duration,date,enabled:scheduleEnabled.checked};
  }else{
    const days=selectedScheduleDays();if(!days.length){alert('Choose at least one day for this weekly schedule.');return}
    scheduleData={type:'weekly',name,time,duration,days,enabled:scheduleEnabled.checked};
  }
  if(editingScheduleId){
    const entry=classroomSchedules.find(item=>item.id===editingScheduleId);if(entry){const id=entry.id;Object.keys(entry).forEach(key=>delete entry[key]);Object.assign(entry,{id,...scheduleData})}
  }else classroomSchedules.push({id:`schedule-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,...scheduleData});
  saveClassroomSchedules();renderScheduleTimers();updateScheduleTimerClock();resetScheduleEditor();
});
if(cancelScheduleEdit)cancelScheduleEdit.addEventListener('click',resetScheduleEditor);
if(clearScheduleTimers)clearScheduleTimers.addEventListener('click',()=>{if(!classroomSchedules.length)return;if(confirm('Clear all saved weekly and one-day schedules?')){classroomSchedules=[];manualTimer=null;saveClassroomSchedules();renderScheduleTimers();resetScheduleEditor();updateScheduleTimerClock()}});
if(stopScheduleTimer)stopScheduleTimer.addEventListener('click',()=>{
  const now=new Date();
  if(manualTimer&&now<manualTimer.end){manualTimer=null}else{
    const active=getActiveScheduledOccurrence(now);
    if(active){
      dismissedScheduleOccurrences.add(active.key);
      if(active.entry.type==='one-day'){
        allOccurrencesForDate(now).filter(item=>item.type!=='one-day'&&now>=item.start&&now<item.end).forEach(item=>dismissedScheduleOccurrences.add(item.key));
      }
    }
  }
  updateScheduleTimerClock();
});
loadClassroomSchedules();setScheduleEditorType('weekly');renderScheduleTimers();updateScheduleTimerClock();setInterval(updateScheduleTimerClock,500);

const wheelCanvas=document.querySelector('#randomWheel');
const wheelContext=wheelCanvas.getContext('2d');
const wheelEntries=document.querySelector('#wheelEntries');
const wheelResults=document.querySelector('#wheelResults');
const wheelWinner=document.querySelector('#wheelWinner');
const wheelWinnerName=document.querySelector('#wheelWinnerName');
const wheelSpinTime=document.querySelector('#wheelSpinTime');
const wheelSeatingClass=document.querySelector('#wheelSeatingClass');
const loadWheelSeatingClass=document.querySelector('#loadWheelSeatingClass');
const wheelClassSourceStatus=document.querySelector('#wheelClassSourceStatus');
const wheelColors=['#2563eb','#ef476f','#06b6d4','#f59e0b','#8b5cf6','#22c55e','#f97316','#ec4899','#0ea5e9','#14b8a6','#6366f1','#eab308'];
let wheelRotation=0,wheelSpinning=false,lastWheelWinner='',wheelHistory=[];
const legacyWheelSample=['Alex','Maria','Saw Htoo','Naw Paw','Jordan','Taylor'].join('\n');
const savedWheelEntries=localStorage.getItem('glnWheelEntries');
if(savedWheelEntries===legacyWheelSample){localStorage.removeItem('glnWheelEntries');wheelEntries.value=''}
else if(savedWheelEntries)wheelEntries.value=savedWheelEntries;
const savedWheelSpinTime=localStorage.getItem('glnWheelSpinTime');
if(savedWheelSpinTime&&wheelSpinTime.querySelector(`option[value="${savedWheelSpinTime}"]`))wheelSpinTime.value=savedWheelSpinTime;
function seatingClassListsForWheel(){
  if(typeof window.getSeatingClassLists==='function'){
    try{return window.getSeatingClassLists()}catch{}
  }
  try{
    const saved=JSON.parse(localStorage.getItem('glnSeatingClasses')||'null');
    return Array.isArray(saved?.classes)?saved.classes.map(item=>({id:String(item.id||''),className:String(item.className||'My Class'),roster:Array.isArray(item.roster)?item.roster:[]})):[];
  }catch{return []}
}
function refreshWheelSeatingClasses(){
  if(!wheelSeatingClass)return;
  const previous=wheelSeatingClass.value||localStorage.getItem('glnWheelSeatingClass')||'';
  const classes=seatingClassListsForWheel().filter(item=>item?.id&&Array.isArray(item.roster));
  wheelSeatingClass.innerHTML='<option value="">Choose a class…</option>';
  classes.forEach(item=>{
    const option=new Option(`${item.className} (${item.roster.length})`,item.id);
    wheelSeatingClass.add(option);
  });
  if(classes.some(item=>item.id===previous))wheelSeatingClass.value=previous;
  loadWheelSeatingClass.disabled=!classes.length;
  if(!classes.length)wheelClassSourceStatus.textContent='No saved Seating Chart classes yet. Create a class in Seating Chart first.';
  else if(!wheelSeatingClass.value)wheelClassSourceStatus.textContent=`${classes.length} saved class${classes.length===1?'':'es'} available.`;
  else{
    const selected=classes.find(item=>item.id===wheelSeatingClass.value);
    wheelClassSourceStatus.textContent=selected?`${selected.roster.length} student${selected.roster.length===1?'':'s'} in ${selected.className}.`:`${classes.length} saved classes available.`;
  }
}
function loadSelectedSeatingClassToWheel(){
  const classes=seatingClassListsForWheel(),selected=classes.find(item=>item.id===wheelSeatingClass.value);
  if(!selected){showToast('Choose a Seating Chart class first');return}
  const names=selected.roster.map(name=>String(name||'').trim()).filter(Boolean).slice(0,100);
  if(!names.length){showToast(`${selected.className} has no student names yet`);return}
  wheelEntries.value=names.join('\n');
  localStorage.setItem('glnWheelSeatingClass',selected.id);
  saveAndDrawWheel();
  wheelHistory=[];renderWheelHistory();
  wheelClassSourceStatus.textContent=`Loaded ${names.length} student${names.length===1?'':'s'} from ${selected.className}.`;
  showToast(`Loaded ${selected.className} onto the wheel`);
}
function currentWheelEntries(){
  let entries=wheelEntries.value.split(/\r?\n/).map(item=>item.trim()).filter(Boolean).slice(0,100);
  if(document.querySelector('#wheelNoDuplicates').checked)entries=[...new Set(entries)];
  return entries;
}
function shortenedWheelText(text){const points=Array.from(text);return points.length>18?`${points.slice(0,17).join('')}…`:text}
function drawWheel(){
  const size=Math.max(280,Math.min(640,wheelCanvas.clientWidth||640));
  const ratio=Math.min(window.devicePixelRatio||1,2);
  wheelCanvas.width=Math.round(size*ratio);wheelCanvas.height=Math.round(size*ratio);
  wheelContext.setTransform(ratio,0,0,ratio,0,0);
  const center=size/2,radius=center-12,entries=currentWheelEntries();
  wheelContext.clearRect(0,0,size,size);
  if(!entries.length){wheelContext.beginPath();wheelContext.arc(center,center,radius,0,Math.PI*2);wheelContext.fillStyle='#dfe8f3';wheelContext.fill();wheelContext.fillStyle='#526075';wheelContext.font='800 18px Inter, sans-serif';wheelContext.textAlign='center';wheelContext.fillText('Add items to begin',center,center);return}
  const arc=Math.PI*2/entries.length;
  wheelContext.save();wheelContext.translate(center,center);wheelContext.rotate(wheelRotation);
  entries.forEach((entry,index)=>{
    const start=index*arc,end=start+arc;
    wheelContext.beginPath();wheelContext.moveTo(0,0);wheelContext.arc(0,0,radius,start,end);wheelContext.closePath();wheelContext.fillStyle=wheelColors[index%wheelColors.length];wheelContext.fill();wheelContext.strokeStyle='rgba(255,255,255,.78)';wheelContext.lineWidth=2;wheelContext.stroke();
    wheelContext.save();wheelContext.rotate(start+arc/2);wheelContext.fillStyle='#fff';wheelContext.font=`800 ${entries.length>20?11:entries.length>12?13:16}px Inter, "Noto Sans Myanmar", sans-serif`;wheelContext.textAlign='right';wheelContext.textBaseline='middle';wheelContext.shadowColor='rgba(0,0,0,.28)';wheelContext.shadowBlur=2;wheelContext.fillText(shortenedWheelText(entry),radius-20,0);wheelContext.restore();
  });
  wheelContext.restore();
  wheelContext.beginPath();wheelContext.arc(center,center,58,0,Math.PI*2);wheelContext.fillStyle='#fff';wheelContext.fill();
}
function randomWheelIndex(max){if(window.crypto?.getRandomValues){const values=new Uint32Array(1);window.crypto.getRandomValues(values);return values[0]%max}return Math.floor(Math.random()*max)}
function showWheelResult(name){
  lastWheelWinner=name;wheelWinnerName.textContent=name;wheelWinner.hidden=false;
  wheelHistory.unshift(name);wheelHistory=wheelHistory.slice(0,50);renderWheelHistory();
  const colors=wheelColors;document.querySelector('#wheelConfetti').innerHTML=Array.from({length:42},(_,index)=>`<i style="--left:${(index*37)%101}%;--delay:-${(index%9)*.17}s;--duration:${2.4+(index%7)*.2}s;--turn:${index*29}deg;--confetti:${colors[index%colors.length]}"></i>`).join('');
}
function renderWheelHistory(){
  wheelResults.innerHTML='';
  if(!wheelHistory.length){const item=document.createElement('li');item.textContent='No results yet';wheelResults.appendChild(item);return}
  wheelHistory.forEach(name=>{const item=document.createElement('li');item.textContent=name;wheelResults.appendChild(item)});
}
function spinRandomWheel(){
  const entries=currentWheelEntries();if(!entries.length||wheelSpinning){if(!entries.length)showToast('Add at least one item');return}
  wheelSpinning=true;document.querySelector('#spinWheel').disabled=true;
  const spinSeconds=Math.max(1,Math.min(10,Number(wheelSpinTime.value)||1)),winnerIndex=randomWheelIndex(entries.length),arc=Math.PI*2/entries.length,target=-(winnerIndex+.5)*arc,twoPi=Math.PI*2,current=((wheelRotation%twoPi)+twoPi)%twoPi,normalizedTarget=((target%twoPi)+twoPi)%twoPi,delta=(normalizedTarget-current+twoPi)%twoPi,start=wheelRotation,end=start+twoPi*(4+Math.ceil(spinSeconds*.8)+randomWheelIndex(2))+delta,duration=spinSeconds*1000,startTime=performance.now();
  function animate(now){const progress=Math.min(1,(now-startTime)/duration),eased=1-Math.pow(1-progress,4);wheelRotation=start+(end-start)*eased;drawWheel();if(progress<1)requestAnimationFrame(animate);else{wheelRotation=end%twoPi;wheelSpinning=false;document.querySelector('#spinWheel').disabled=false;showWheelResult(entries[winnerIndex])}}
  requestAnimationFrame(animate);
}
function saveAndDrawWheel(){localStorage.setItem('glnWheelEntries',wheelEntries.value);drawWheel()}
document.querySelector('#spinWheel').onclick=spinRandomWheel;
loadWheelSeatingClass.onclick=loadSelectedSeatingClassToWheel;
wheelSeatingClass.onchange=()=>{localStorage.setItem('glnWheelSeatingClass',wheelSeatingClass.value);refreshWheelSeatingClasses()};
window.addEventListener('gln:seating-classes-updated',refreshWheelSeatingClasses);
wheelCanvas.onclick=spinRandomWheel;
wheelEntries.oninput=saveAndDrawWheel;
document.querySelector('#wheelNoDuplicates').onchange=drawWheel;
wheelSpinTime.onchange=()=>localStorage.setItem('glnWheelSpinTime',wheelSpinTime.value);
document.querySelector('#shuffleWheel').onclick=()=>{const entries=currentWheelEntries();for(let i=entries.length-1;i>0;i--){const j=randomWheelIndex(i+1);[entries[i],entries[j]]=[entries[j],entries[i]]}wheelEntries.value=entries.join('\n');saveAndDrawWheel()};
document.querySelector('#clearWheel').onclick=()=>{wheelEntries.value='';saveAndDrawWheel();wheelEntries.focus()};
document.querySelector('#clearWheelResults').onclick=()=>{wheelHistory=[];renderWheelHistory()};
document.querySelector('#keepWheelWinner').onclick=()=>{wheelWinner.hidden=true};
document.querySelector('#removeWheelWinner').onclick=()=>{const entries=wheelEntries.value.split(/\r?\n/),index=entries.findIndex(item=>item.trim()===lastWheelWinner);if(index>=0)entries.splice(index,1);wheelEntries.value=entries.join('\n').replace(/^\s+|\s+$/g,'');saveAndDrawWheel();wheelWinner.hidden=true};
document.querySelector('#wheelFullscreen').onclick=()=>{if(!document.fullscreenElement)wheelPanel.requestFullscreen?.();else document.exitFullscreen?.()};
window.addEventListener('resize',()=>{if(!wheelPanel.hidden)drawWheel()});
refreshWheelSeatingClasses();
drawWheel();
function closeCalculator(){
  calculatorView.hidden=true;
  navTools.classList.remove('active');
  document.body.classList.remove('calculator-open');
}
function openCalculator(mode='wheel'){
  typeView.hidden=true;
  practiceView.hidden=true;
  gamesView.hidden=true;
  quizView.hidden=true;
  calculatorView.hidden=false;
  navType.classList.remove('active');
  navPractice.classList.remove('active');
  navGames.classList.remove('active');
  navQuiz.classList.remove('active');
  navTools.classList.add('active');
  document.querySelector('#classroomToolSwitch').hidden=false;
  calculatorEyebrow.textContent='GLN CLASSROOM TOOLS';
  setCalculatorMode(mode);
  document.body.classList.add('calculator-open');
  if(typeof stopGame==='function')stopGame();
  if(typeof closeRace==='function')closeRace();
  window.scrollTo({top:0,behavior:'smooth'});
}
navTools.onclick=()=>openCalculator('wheel');
navType.addEventListener('click',closeCalculator);
navPractice.addEventListener('click',closeCalculator);
navGames.addEventListener('click',closeCalculator);
navQuiz.addEventListener('click',closeCalculator);
