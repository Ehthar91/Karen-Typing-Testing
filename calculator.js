const navCalculator=document.querySelector('#navCalculator');
const calculatorView=document.querySelector('#calculatorView');
const calculatorPanel=document.querySelector('#calculatorPanel');
const converterPanel=document.querySelector('#converterPanel');
const wheelPanel=document.querySelector('#wheelPanel');
const showCalculators=document.querySelector('#showCalculators');
const showConverter=document.querySelector('#showConverter');
const showWheel=document.querySelector('#showWheel');
const calculatorTitle=document.querySelector('#calculator-title');
const calculatorHint=document.querySelector('#calculatorHint');
const converterCategory=document.querySelector('#converterCategory');
const converterInput=document.querySelector('#converterInput');
const converterFrom=document.querySelector('#converterFrom');
const converterTo=document.querySelector('#converterTo');
const converterOutput=document.querySelector('#converterOutput');
const converterEquation=document.querySelector('#converterEquation');
const unitGroups={
  weight:{label:'Weight',base:'kg',units:{lb:['Pounds (lb)',0.45359237],kg:['Kilograms (kg)',1],oz:['Ounces (oz)',0.028349523125],g:['Grams (g)',0.001]}},
  temperature:{label:'Temperature',units:{F:['Fahrenheit (°F)'],C:['Celsius (°C)'],K:['Kelvin (K)']}},
  length:{label:'Length',base:'m',units:{in:['Inches (in)',0.0254],ft:['Feet (ft)',0.3048],yd:['Yards (yd)',0.9144],mi:['Miles (mi)',1609.344],mm:['Millimeters (mm)',0.001],cm:['Centimeters (cm)',0.01],m:['Meters (m)',1],km:['Kilometers (km)',1000]}},
  volume:{label:'Volume',base:'L',units:{cup:['US Cups',0.2365882365],pt:['US Pints',0.473176473],qt:['US Quarts',0.946352946],gal:['US Gallons',3.785411784],mL:['Milliliters (mL)',0.001],L:['Liters (L)',1]}},
  area:{label:'Area',base:'m²',units:{sqin:['Square inches',0.00064516],sqft:['Square feet',0.09290304],sqyd:['Square yards',0.83612736],acre:['Acres',4046.8564224],sqcm:['Square centimeters',0.0001],sqm:['Square meters',1],ha:['Hectares',10000]}},
  speed:{label:'Speed',base:'m/s',units:{mph:['Miles per hour (mph)',0.44704],kmh:['Kilometers per hour (km/h)',0.2777777777777778],ms:['Meters per second (m/s)',1]}},
  time:{label:'Time',base:'seconds',units:{sec:['Seconds',1],min:['Minutes',60],hr:['Hours',3600],day:['Days',86400]}}
};
const defaultUnits={weight:['lb','kg'],temperature:['F','C'],length:['in','cm'],volume:['gal','L'],area:['sqft','sqm'],speed:['mph','kmh'],time:['min','hr']};
function setCalculatorMode(mode){
  const converter=mode==='converter';
  const wheel=mode==='wheel';
  calculatorPanel.hidden=converter||wheel;
  converterPanel.hidden=!converter;
  wheelPanel.hidden=!wheel;
  showCalculators.classList.toggle('active',!converter&&!wheel);
  showConverter.classList.toggle('active',converter);
  showWheel.classList.toggle('active',wheel);
  calculatorTitle.textContent=wheel?'Random Wheel':converter?'Unit Converter':'Graphing & Scientific Calculator';
  calculatorHint.textContent=wheel?'Paste a list, spin, and select someone or something at random.':converter?'Convert common measurements instantly.':'Choose GLN TI-84 or GLN TI-30XS inside the calculator.';
  if(converter)setTimeout(()=>converterInput.focus(),0);
  if(wheel)setTimeout(drawWheel,0);
}
function fillUnitMenus(){
  const group=unitGroups[converterCategory.value];
  const options=Object.entries(group.units).map(([value,[label]])=>`<option value="${value}">${label}</option>`).join('');
  converterFrom.innerHTML=options;
  converterTo.innerHTML=options;
  [converterFrom.value,converterTo.value]=defaultUnits[converterCategory.value];
  updateConversion();
}
function temperatureToC(value,unit){return unit==='F'?(value-32)*5/9:unit==='K'?value-273.15:value}
function cToTemperature(value,unit){return unit==='F'?value*9/5+32:unit==='K'?value+273.15:value}
function formatConverted(value){
  if(!Number.isFinite(value))return '—';
  const magnitude=Math.abs(value);
  if(magnitude!==0&&(magnitude>=1e9||magnitude<1e-7))return value.toExponential(6);
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(value);
}
function updateConversion(){
  const value=Number(converterInput.value);
  if(converterInput.value===''||!Number.isFinite(value)){converterOutput.textContent='—';converterEquation.textContent='Enter a number to convert.';return}
  const group=unitGroups[converterCategory.value];
  let result;
  if(converterCategory.value==='temperature')result=cToTemperature(temperatureToC(value,converterFrom.value),converterTo.value);
  else result=value*group.units[converterFrom.value][1]/group.units[converterTo.value][1];
  const formatted=formatConverted(result);
  converterOutput.textContent=formatted;
  converterEquation.textContent=`${formatConverted(value)} ${converterFrom.value} = ${formatted} ${converterTo.value}`;
}
Object.entries(unitGroups).forEach(([value,group])=>converterCategory.add(new Option(group.label,value)));
fillUnitMenus();
showCalculators.onclick=()=>setCalculatorMode('calculator');
showConverter.onclick=()=>setCalculatorMode('converter');
showWheel.onclick=()=>setCalculatorMode('wheel');
converterCategory.onchange=fillUnitMenus;
converterInput.oninput=updateConversion;
converterFrom.onchange=updateConversion;
converterTo.onchange=updateConversion;
document.querySelector('#converterSwap').onclick=()=>{const from=converterFrom.value;converterFrom.value=converterTo.value;converterTo.value=from;updateConversion()};
const wheelCanvas=document.querySelector('#randomWheel');
const wheelContext=wheelCanvas.getContext('2d');
const wheelEntries=document.querySelector('#wheelEntries');
const wheelResults=document.querySelector('#wheelResults');
const wheelWinner=document.querySelector('#wheelWinner');
const wheelWinnerName=document.querySelector('#wheelWinnerName');
const wheelColors=['#2563eb','#ef476f','#06b6d4','#f59e0b','#8b5cf6','#22c55e','#f97316','#ec4899','#0ea5e9','#14b8a6','#6366f1','#eab308'];
let wheelRotation=0,wheelSpinning=false,lastWheelWinner='',wheelHistory=[];
const savedWheelEntries=localStorage.getItem('glnWheelEntries');
if(savedWheelEntries)wheelEntries.value=savedWheelEntries;
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
  const winnerIndex=randomWheelIndex(entries.length),arc=Math.PI*2/entries.length,target=-(winnerIndex+.5)*arc,twoPi=Math.PI*2,current=((wheelRotation%twoPi)+twoPi)%twoPi,normalizedTarget=((target%twoPi)+twoPi)%twoPi,delta=(normalizedTarget-current+twoPi)%twoPi,start=wheelRotation,end=start+twoPi*(6+randomWheelIndex(3))+delta,duration=4300,startTime=performance.now();
  function animate(now){const progress=Math.min(1,(now-startTime)/duration),eased=1-Math.pow(1-progress,4);wheelRotation=start+(end-start)*eased;drawWheel();if(progress<1)requestAnimationFrame(animate);else{wheelRotation=end%twoPi;wheelSpinning=false;document.querySelector('#spinWheel').disabled=false;showWheelResult(entries[winnerIndex])}}
  requestAnimationFrame(animate);
}
function saveAndDrawWheel(){localStorage.setItem('glnWheelEntries',wheelEntries.value);drawWheel()}
document.querySelector('#spinWheel').onclick=spinRandomWheel;
wheelCanvas.onclick=spinRandomWheel;
wheelEntries.oninput=saveAndDrawWheel;
document.querySelector('#wheelNoDuplicates').onchange=drawWheel;
document.querySelector('#shuffleWheel').onclick=()=>{const entries=currentWheelEntries();for(let i=entries.length-1;i>0;i--){const j=randomWheelIndex(i+1);[entries[i],entries[j]]=[entries[j],entries[i]]}wheelEntries.value=entries.join('\n');saveAndDrawWheel()};
document.querySelector('#clearWheel').onclick=()=>{wheelEntries.value='';saveAndDrawWheel();wheelEntries.focus()};
document.querySelector('#clearWheelResults').onclick=()=>{wheelHistory=[];renderWheelHistory()};
document.querySelector('#keepWheelWinner').onclick=()=>{wheelWinner.hidden=true};
document.querySelector('#removeWheelWinner').onclick=()=>{const entries=wheelEntries.value.split(/\r?\n/),index=entries.findIndex(item=>item.trim()===lastWheelWinner);if(index>=0)entries.splice(index,1);wheelEntries.value=entries.join('\n').replace(/^\s+|\s+$/g,'');saveAndDrawWheel();wheelWinner.hidden=true};
document.querySelector('#wheelFullscreen').onclick=()=>{if(!document.fullscreenElement)wheelPanel.requestFullscreen?.();else document.exitFullscreen?.()};
window.addEventListener('resize',()=>{if(!wheelPanel.hidden)drawWheel()});
drawWheel();
function closeCalculator(){
  calculatorView.hidden=true;
  navCalculator.classList.remove('active');
  document.body.classList.remove('calculator-open');
}
function openCalculator(){
  typeView.hidden=true;
  practiceView.hidden=true;
  gamesView.hidden=true;
  quizView.hidden=true;
  calculatorView.hidden=false;
  navType.classList.remove('active');
  navPractice.classList.remove('active');
  navGames.classList.remove('active');
  navQuiz.classList.remove('active');
  navCalculator.classList.add('active');
  document.body.classList.add('calculator-open');
  if(typeof stopGame==='function')stopGame();
  if(typeof closeRace==='function')closeRace();
  window.scrollTo({top:0,behavior:'smooth'});
}
navCalculator.onclick=openCalculator;
navType.addEventListener('click',closeCalculator);
navPractice.addEventListener('click',closeCalculator);
navGames.addEventListener('click',closeCalculator);
navQuiz.addEventListener('click',closeCalculator);
