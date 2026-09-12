const navTools=document.querySelector('#navTools');
const calculatorView=document.querySelector('#calculatorView');
const calculatorPanel=document.querySelector('#calculatorPanel');
const numberGeneratorPanel=document.querySelector('#numberGeneratorPanel');
const wheelPanel=document.querySelector('#wheelPanel');
const seatingPanel=document.querySelector('#seatingPanel');
const showCalculator=document.querySelector('#showCalculator');
const showNumberGenerator=document.querySelector('#showNumberGenerator');
const showWheel=document.querySelector('#showWheel');
const showSeating=document.querySelector('#showSeating');
const calculatorTitle=document.querySelector('#calculator-title');
const calculatorHint=document.querySelector('#calculatorHint');
const calculatorEyebrow=document.querySelector('#calculatorEyebrow');
function setCalculatorMode(mode){
  const calculator=mode==='calculator';
  const numberGenerator=mode==='number-generator';
  const wheel=mode==='wheel';
  const seating=mode==='seating';
  calculatorPanel.hidden=!calculator;
  numberGeneratorPanel.hidden=!numberGenerator;
  wheelPanel.hidden=!wheel;
  seatingPanel.hidden=!seating;
  showCalculator.classList.toggle('active',calculator);
  showNumberGenerator.classList.toggle('active',numberGenerator);
  showWheel.classList.toggle('active',wheel);
  showSeating.classList.toggle('active',seating);
  calculatorTitle.textContent=seating?'Seating Chart':wheel?'Random Wheel':numberGenerator?'Number Generator':'Graphing & Scientific Calculator';
  calculatorHint.textContent=seating?'Create, arrange, and print a classroom seating plan.':wheel?'Paste a list, spin, and select someone or something at random.':numberGenerator?'Generate classroom numbers from any range, with an optional no-repeat mode.':'Choose GLN TI-84 or GLN TI-30XS inside the calculator.';
  if(numberGenerator)setTimeout(()=>{numberGeneratorMin.focus();queueFitNumberGeneratorResult()},0);
  if(wheel)setTimeout(()=>{refreshWheelSeatingClasses();drawWheel()},0);
  if(seating)setTimeout(()=>window.renderSeatingChart?.(),0);
}
showCalculator.onclick=()=>setCalculatorMode('calculator');
showNumberGenerator.onclick=()=>setCalculatorMode('number-generator');
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
