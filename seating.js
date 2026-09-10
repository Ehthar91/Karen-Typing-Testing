const seatingClassName=document.querySelector('#seatingClassName');
const seatingRoster=document.querySelector('#seatingRoster');
const seatingRows=document.querySelector('#seatingRows');
const seatingColumns=document.querySelector('#seatingColumns');
const seatingGrid=document.querySelector('#seatingGrid');
const seatingBoard=document.querySelector('#seatingBoard');
const seatingChartName=document.querySelector('#seatingChartName');
const seatingLocalMode=document.querySelector('#seatingLocalMode');
const seatingGoogleMode=document.querySelector('#seatingGoogleMode');
const seatingGoogleSignIn=document.querySelector('#seatingGoogleSignIn');
const seatingStorageStatus=document.querySelector('#seatingStorageStatus');
let seatingState={className:'My Class',roster:[],rows:5,columns:6,seats:[],locked:[],flipped:false};
let seatingStorageMode=localStorage.getItem('glnSeatingStorageMode')||'local';
let seatingSaveTimer=null,seatingDraggedIndex=null;
for(let value=2;value<=10;value++){seatingRows.add(new Option(String(value),String(value)));seatingColumns.add(new Option(String(value),String(value)))}
function seatingRosterNames(){return seatingRoster.value.split(/\r?\n/).map(name=>name.trim()).filter(Boolean).slice(0,100)}
function seatingPayload(){return{className:seatingClassName.value.trim()||'My Class',roster:seatingRosterNames(),rows:Number(seatingRows.value)||5,columns:Number(seatingColumns.value)||6,seats:seatingState.seats,locked:seatingState.locked,flipped:seatingState.flipped,updatedAt:Date.now()}}
function applySeatingState(data){
  if(!data||typeof data!=='object')return;
  seatingState={className:String(data.className||'My Class').slice(0,50),roster:Array.isArray(data.roster)?data.roster.slice(0,100):[],rows:Math.max(2,Math.min(10,Number(data.rows)||5)),columns:Math.max(2,Math.min(10,Number(data.columns)||6)),seats:Array.isArray(data.seats)?data.seats:[],locked:Array.isArray(data.locked)?data.locked:[],flipped:Boolean(data.flipped)};
  seatingClassName.value=seatingState.className;seatingRoster.value=seatingState.roster.join('\n');seatingRows.value=String(seatingState.rows);seatingColumns.value=String(seatingState.columns);renderSeatingChart();
}
function saveSeatingLocal(){const data=seatingPayload();localStorage.setItem('glnSeatingChart',JSON.stringify(data));seatingStorageStatus.textContent='Saved locally on this device';seatingStorageStatus.classList.add('synced')}
async function saveSeatingCloud(){
  if(seatingStorageMode!=='google'||!currentUser||currentUser.isAnonymous)return;
  try{await fb.set(fb.ref(db,`seatingCharts/${currentUser.uid}/current`),seatingPayload());seatingStorageStatus.textContent=`Synced with ${currentUser.email||'Google account'}`;seatingStorageStatus.classList.add('synced')}catch(error){seatingStorageStatus.textContent='Could not sync. Your local copy is still saved.';seatingStorageStatus.classList.remove('synced')}
}
function queueSeatingSave(){saveSeatingLocal();clearTimeout(seatingSaveTimer);if(seatingStorageMode==='google')seatingSaveTimer=setTimeout(saveSeatingCloud,600)}
function shuffledSeating(items){const list=[...items];for(let index=list.length-1;index>0;index--){const other=Math.floor(Math.random()*(index+1));[list[index],list[other]]=[list[other],list[index]]}return list}
function buildSeatingChart(){
  seatingState.rows=Number(seatingRows.value)||5;seatingState.columns=Number(seatingColumns.value)||6;seatingState.roster=seatingRosterNames();seatingState.className=seatingClassName.value.trim()||'My Class';
  const count=seatingState.rows*seatingState.columns;if(seatingState.roster.length>count)showToast(`Add more seats for ${seatingState.roster.length-count} students`);
  seatingState.seats=seatingState.roster.slice(0,count);while(seatingState.seats.length<count)seatingState.seats.push(null);seatingState.locked=Array(count).fill(false);renderSeatingChart();queueSeatingSave();
}
function renderSeatingChart(){
  const count=seatingState.rows*seatingState.columns;seatingState.seats=seatingState.seats.slice(0,count);while(seatingState.seats.length<count)seatingState.seats.push(null);seatingState.locked=seatingState.locked.slice(0,count);while(seatingState.locked.length<count)seatingState.locked.push(false);
  seatingChartName.textContent=seatingClassName.value.trim()||seatingState.className||'My Class';seatingBoard.classList.toggle('flipped',seatingState.flipped);seatingGrid.style.gridTemplateColumns=`repeat(${seatingState.columns},minmax(88px,1fr))`;seatingGrid.innerHTML='';
  const rowOrder=Array.from({length:seatingState.rows},(_,index)=>index);if(seatingState.flipped)rowOrder.reverse();
  rowOrder.forEach(row=>{for(let column=0;column<seatingState.columns;column++){const index=row*seatingState.columns+column,name=seatingState.seats[index];const seat=document.createElement('article');seat.className=`student-seat${name?'':' empty'}${seatingState.locked[index]?' locked':''}`;seat.dataset.index=String(index);seat.draggable=Boolean(name&&!seatingState.locked[index]);const number=document.createElement('span');number.className='seat-number';number.textContent=String(index+1);seat.appendChild(number);const label=document.createElement('span');label.textContent=name||'Empty';seat.appendChild(label);if(name){const lock=document.createElement('button');lock.type='button';lock.className='seat-lock';lock.textContent=seatingState.locked[index]?'🔒':'🔓';lock.title=seatingState.locked[index]?'Unlock seat':'Lock seat';lock.onclick=event=>{event.stopPropagation();seatingState.locked[index]=!seatingState.locked[index];renderSeatingChart();queueSeatingSave()};seat.appendChild(lock)}seat.ondragstart=()=>{seatingDraggedIndex=index;seat.classList.add('dragging')};seat.ondragend=()=>{seatingDraggedIndex=null;seat.classList.remove('dragging')};seat.ondragover=event=>{if(seatingDraggedIndex!==null&&!seatingState.locked[index]){event.preventDefault();seat.classList.add('drag-over')}};seat.ondragleave=()=>seat.classList.remove('drag-over');seat.ondrop=event=>{event.preventDefault();seat.classList.remove('drag-over');if(seatingDraggedIndex===null||seatingState.locked[index]||seatingState.locked[seatingDraggedIndex])return;[seatingState.seats[index],seatingState.seats[seatingDraggedIndex]]=[seatingState.seats[seatingDraggedIndex],seatingState.seats[index]];renderSeatingChart();queueSeatingSave()};seatingGrid.appendChild(seat)}});
}
function shuffleSeatingChart(){const openIndexes=seatingState.seats.map((_,index)=>index).filter(index=>!seatingState.locked[index]),names=shuffledSeating(openIndexes.map(index=>seatingState.seats[index]));openIndexes.forEach((index,position)=>seatingState.seats[index]=names[position]);renderSeatingChart();queueSeatingSave()}
function setSeatingStorageMode(mode){seatingStorageMode=mode;localStorage.setItem('glnSeatingStorageMode',mode);seatingLocalMode.classList.toggle('active',mode==='local');seatingGoogleMode.classList.toggle('active',mode==='google');const signedIn=Boolean(currentUser&&!currentUser.isAnonymous);seatingGoogleSignIn.hidden=mode!=='google'||signedIn;if(mode==='local'){seatingStorageStatus.textContent='Saved locally on this device';saveSeatingLocal()}else if(signedIn){seatingStorageStatus.textContent=`Connected to ${currentUser.email||'Google account'}`;loadSeatingCloud()}else{seatingStorageStatus.textContent='Checking for a connected Google account…';initializeSeatingAccount()}}
async function initializeSeatingAccount(){try{await initRaceFirebase();if(currentUser&&!currentUser.isAnonymous){seatingGoogleSignIn.hidden=true;await loadSeatingCloud()}else{seatingGoogleSignIn.hidden=false;seatingStorageStatus.textContent='Sign in to sync this chart across devices'}}catch{seatingGoogleSignIn.hidden=false;seatingStorageStatus.textContent='Google sync is not configured yet.'}}
async function signInSeatingGoogle(){
  seatingGoogleSignIn.disabled=true;seatingStorageStatus.textContent='Opening Google sign-in…';
  try{await initRaceFirebase();const provider=new fb.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});const credential=await fb.signInWithPopup(auth,provider);currentUser=credential.user;seatingGoogleSignIn.hidden=true;seatingStorageStatus.textContent=`Connected to ${currentUser.email||'Google account'}`;await loadSeatingCloud()}catch(error){seatingStorageStatus.textContent=error?.code==='auth/popup-blocked'?'Allow pop-ups, then try again.':'Google sign-in was not completed.'}finally{seatingGoogleSignIn.disabled=false}
}
async function loadSeatingCloud(){
  if(!currentUser||currentUser.isAnonymous)return;
  try{const snapshot=await fb.get(fb.ref(db,`seatingCharts/${currentUser.uid}/current`));if(snapshot.exists())applySeatingState(snapshot.val());else await saveSeatingCloud();seatingStorageStatus.textContent=`Synced with ${currentUser.email||'Google account'}`;seatingStorageStatus.classList.add('synced')}catch(error){seatingStorageStatus.textContent='Could not load the cloud copy.'}
}
const savedSeating=localStorage.getItem('glnSeatingChart');if(savedSeating){try{applySeatingState(JSON.parse(savedSeating))}catch{buildSeatingChart()}}else{seatingRows.value='5';seatingColumns.value='6';buildSeatingChart()}
document.querySelector('#buildSeating').onclick=buildSeatingChart;document.querySelector('#shuffleSeating').onclick=shuffleSeatingChart;document.querySelector('#flipSeating').onclick=()=>{seatingState.flipped=!seatingState.flipped;renderSeatingChart();queueSeatingSave()};
seatingClassName.oninput=()=>{seatingState.className=seatingClassName.value;seatingChartName.textContent=seatingClassName.value||'My Class';queueSeatingSave()};seatingRoster.oninput=queueSeatingSave;seatingRows.onchange=queueSeatingSave;seatingColumns.onchange=queueSeatingSave;
seatingLocalMode.onclick=()=>setSeatingStorageMode('local');seatingGoogleMode.onclick=()=>setSeatingStorageMode('google');seatingGoogleSignIn.onclick=signInSeatingGoogle;
document.querySelector('#seatingFullscreen').onclick=()=>{if(!document.fullscreenElement)seatingPanel.requestFullscreen?.();else document.exitFullscreen?.()};document.querySelector('#printSeating').onclick=()=>{document.body.classList.add('print-seating');window.print()};window.addEventListener('afterprint',()=>document.body.classList.remove('print-seating'));
setSeatingStorageMode(seatingStorageMode);window.renderSeatingChart=renderSeatingChart;
