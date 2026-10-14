'use strict';
let selectedAttendanceEmployee='';
const ATTENDANCE_TYPES=['Present','Leave','LOP','Holiday'];
function attendanceRecord(employeeId,date){return state.attendance.find(a=>a.employee===employeeId&&a.date===date)}
function attendanceStatus(record){return record?.status==='Pending'?'Awaiting approval':record?.status||'Not marked'}
function pendingAttendance(){return state.attendance.filter(a=>a.status==='Pending')}
function approvalBanner(){const pending=pendingAttendance();return `<div class="approval-banner ${pending.length?'has-pending':''}"><span class="approval-icon">${icon('clock')}</span><div><strong>${pending.length?`${pending.length} check-in approval request${pending.length===1?'':'s'}`:'Check-in approvals'}</strong><p>${pending.length?'Your team is waiting. Attendance counts only after your approval.':'No pending requests. New employee check-ins will appear here.'}</p></div>${btn(pending.length?'Review requests':'View attendance','go-attendance','arrow','small')}</div>`}
function attendanceSummary(employeeId,month=today.slice(0,7)){
 const records=state.attendance.filter(a=>a.employee===employeeId&&a.date.startsWith(month));
 return Object.fromEntries([...ATTENDANCE_TYPES,'Pending'].map(status=>[status,records.filter(a=>a.status===status).length]));
}
function calendarEmployee(){return role==='employee'?currentEmployee():state.employees.some(e=>e.id===selectedAttendanceEmployee)?selectedAttendanceEmployee:state.employees.find(e=>e.active!==false)?.id||state.employees[0]?.id}
function attendancePage(){
 const id=calendarEmployee(),e=employee(id),summary=attendanceSummary(id),monthLabel=new Date(today+'T12:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
 return heading(role==='employer'?'Attendance, with a clear record.':'Your month at a glance.',role==='employer'?'Approve check-ins and manage present days, leave, LOP and holidays.':'Check in, wait for approval, and see your confirmed attendance here.',role==='employer'?btn('Mark a day','add-attendance','plus','primary'):'')+
 `<div class="attendance-toolbar"><div><span class="label">CURRENT MONTH</span><h2>${monthLabel}</h2></div>${role==='employer'?`<div class="attendance-employee"><label for="attendance-employee">Employee</label><select id="attendance-employee">${state.employees.map(e=>`<option value="${e.id}" ${e.id===id?'selected':''}>${esc(e.name)}</option>`).join('')}</select></div>`:`<span class="tag">${esc(e.name)}</span>`}</div>
 <div class="attendance-summary">${ATTENDANCE_TYPES.map((status,i)=>`<div class="attendance-stat ${status.toLowerCase()}"><span>${status==='LOP'?'LOP · loss of pay':status}</span><strong>${summary[status]}<small> ${summary[status]===1?'day':'days'}</small></strong><p>${['Approved attendance','Approved leave','Marked by employer','Marked by employer'][i]}</p></div>`).join('')}</div>
 <div class="attendance-layout"><section class="panel attendance-calendar"><div class="panel-head"><div><h2>${esc(e.name)}’s calendar</h2><p>${summary.Pending} awaiting approval · Blank days are not marked, not automatically LOP.</p></div><span class="tag">${monthLabel}</span></div>${attendanceCalendar(id)}<div class="calendar-legend">${ATTENDANCE_TYPES.map(s=>`<span><i class="${s.toLowerCase()}"></i>${s}</span>`).join('')}<span><i class="pending"></i>Pending</span></div><p class="calendar-help">${role==='employer'?'Select a date to review or mark its status. Sundays are not automatically holidays.':'Select a date to view details. Pending or rejected check-ins do not count as attendance.'}</p></section>
 <div class="attendance-side">${role==='employer'?attendanceApprovals():`<section class="panel"><div class="panel-head"><h2>Today’s check-in</h2>${badge(attendanceStatus(attendanceRecord(id,today)))}</div>${clockPanel()}</section>`}<section class="panel"><div class="panel-head"><h2>How attendance works</h2></div><div class="panel-body attendance-guide"><p><b>01</b> Employee submits a check-in request.</p><p><b>02</b> Employer approves or rejects it.</p><p><b>03</b> Only approved check-ins become present days.</p><div class="info">Leave, LOP and holidays are marked by the employer. No automatic deductions or payroll calculations.</div></div></section></div></div>
 <section class="panel" style="margin-top:22px"><div class="panel-head"><h2>${role==='employer'?'Today’s team register':'Today’s attendance'}</h2><span class="tag">${today}</span></div><div class="table-wrap">${attendanceTable(today)}</div></section>`;
}
function attendanceCalendar(employeeId){
 const [year,month]=today.split('-').map(Number),count=new Date(year,month,0).getDate(),offset=(new Date(year,month-1,1).getDay()+6)%7;
 const pads=Array.from({length:offset},()=>'<span class="calendar-pad" aria-hidden="true"></span>').join('');
 return `<div class="calendar-weekdays">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-days">${pads}${Array.from({length:count},(_,i)=>{
 const date=`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,a=attendanceRecord(employeeId,date),status=a?.status||'unmarked';
 return `<button type="button" class="calendar-day ${status.toLowerCase()} ${date===today?'is-today':''}" data-action="attendance-day" data-date="${date}" data-employee="${employeeId}" aria-label="${date}, ${attendanceStatus(a)}" ${date===today?'aria-current="date"':''}><span>${i+1}</span><small>${a?(status==='Pending'?'Pending':status):date===today?'Today':'—'}</small>${a?.in?`<time>${esc(a.in)}</time>`:''}</button>`;
 }).join('')}</div>`;
}
function attendanceApprovals(){const pending=pendingAttendance();return `<section class="panel"><div class="panel-head"><div><h2>Approval requests</h2><p>Check-ins awaiting your decision.</p></div><span class="approval-count">${pending.length}</span></div><div class="panel-body">${pending.map(a=>`<div class="checkin-request"><div class="rowperson">${avatar(employee(a.employee).name)}<div><strong>${esc(employee(a.employee).name)}</strong><small>${a.date} · ${esc(a.in)} IST</small></div></div><div class="actions">${btn('Approve','approve-attendance','check','small primary',`data-id="${a.id}"`)}${btn('Reject','reject-attendance','close','small',`data-id="${a.id}"`)}</div></div>`).join('')||`<div class="empty">${icon('check')}All caught up.<br>New check-ins will appear here.</div>`}</div></section>`}
function attendanceTable(date){return `<table><thead><tr><th>Employee</th><th>Check in</th><th>Check out</th><th>Status</th><th>Approval</th></tr></thead><tbody>${state.employees.filter(e=>role==='employer'?e.active!==false:e.id===currentEmployee()).map(e=>{const a=attendanceRecord(e.id,date);return `<tr><td><strong>${esc(e.name)}</strong><small>${esc(a?.note||e.job)}</small></td><td>${esc(a?.in||'—')}</td><td>${esc(a?.out||'—')}</td><td>${badge(attendanceStatus(a))}</td><td>${a?.status==='Pending'?'Awaiting employer':a?.status==='Rejected'?'Rejected':a?'Confirmed by employer':'—'}</td></tr>`}).join('')}</tbody></table>`}
function clockPanel(){
 const a=attendanceRecord(currentEmployee(),today),pending=a?.status==='Pending',present=a?.status==='Present',closed=present&&!!a.out,marked=a&&['Leave','LOP','Holiday'].includes(a.status);
 const label=pending?'Awaiting approval':closed?'Day completed':marked?a.status:present?'Check out':a?.status==='Rejected'?'Request check-in again':'Request check-in';
 const description=pending?`Requested at ${a.in}. Your employer needs to approve this check-in.`:closed?`Checked out at ${a.out}. Attendance is confirmed.`:marked?`Today is marked ${a.status} by your employer.`:present?`Approved · checked in at ${a.in}`:a?.status==='Rejected'?'Your check-in was rejected. You may submit a new request.':'Check in to send an approval request to your employer.';
 return `<div class="clock-card"><span class="label">${fullDate()}</span><div class="clock-time">${clock()}</div><p>${esc(description)}</p>${btn(label,'clock','clock','primary',pending||closed||marked?'disabled':'')}<p class="notice-inline" style="margin:12px 0 0">India Standard Time · Approval required</p></div>`;
}
function requestCheckinOrCheckout(){
 if(role!=='employee')return;
 const id=currentEmployee(),a=attendanceRecord(id,today);
 if(!state.employees.some(e=>e.id===id))return;
 if(a?.status==='Present'&&!a.out){a.out=clock();render();toast('Checked out. Your approved attendance is retained.');return;}
 if(a&&a.status!=='Rejected')return;
 const request={id:`ATT-${Date.now()}`,employee:id,date:today,in:clock(),out:'',note:'',status:'Pending',requestedAt:new Date().toISOString()};
 if(a)Object.assign(a,request);else state.attendance.push(request);
 render();toast('Check-in sent to employer for approval. Not counted as attendance yet.');
}
function decideAttendance(id,decision){
 if(role!=='employer'||!session?.admin)return;
 const a=state.attendance.find(a=>a.id===id);
 if(!a||a.status!=='Pending')return toast('This request has already been reviewed.');
 a.status=decision;a.reviewedAt=new Date().toISOString();a.reviewedBy='admin';
 render();toast(decision==='Present'?'Check-in approved. Attendance and calendar updated.':'Check-in rejected. It is not counted as attendance.');
}
function addAttendance(date=today,employeeId=calendarEmployee()){
 if(role!=='employer'||!session?.admin)return;
 const a=attendanceRecord(employeeId,date),options=[...state.employees.filter(e=>e.active!==false||e.id===employeeId).map(e=>[e.id,e.name]),['all','All employees (holiday only)']];
 formModal('Mark attendance day',`<div class="form-grid">${selectField('Employee','employee',options,employeeId,true)}${field('Date','date',date,'date',true)}${selectField('Day status','status',ATTENDANCE_TYPES,ATTENDANCE_TYPES.includes(a?.status)?a.status:'Present')}${field('Check-in time','in',a?.in?timeInput(a.in):'','time')}${field('Check-out time (optional)','out',a?.out?timeInput(a.out):'','time')}${field('Note','note',a?.note||'','textarea',false,true)}</div><div class="info" style="margin-top:18px;margin-bottom:0">Only the employer can confirm a day. Present requires a check-in time. For Leave, LOP or Holiday, time fields are ignored. Existing status for this employee and date will be replaced.</div>`,'attendance',false,'Present · Leave · LOP (loss of pay) · Holiday');
 updateAttendanceTimeFields();
}
function timeInput(value){if(/^\d{2}:\d{2}$/.test(value))return value;const match=value.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);if(!match)return '';let hour=Number(match[1])%12;if(match[3].toLowerCase()==='pm')hour+=12;return `${String(hour).padStart(2,'0')}:${match[2]}`}
function updateAttendanceTimeFields(){const f=$('#modal-form');if(f?.dataset.submit!=='attendance')return;const present=$('[name=status]',f).value==='Present';for(const name of ['in','out']){const el=$(`[name="${name}"]`,f);el.disabled=!present;el.required=present&&name==='in';}}
function saveAttendanceForm(d){
 if(role!=='employer'||!session?.admin)return false;
 if(!ATTENDANCE_TYPES.includes(d.status))return error('Choose a day status.'),false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||new Date(d.date+'T12:00:00').toISOString().slice(0,10)!==d.date)return error('Choose a valid date.'),false;
 if(d.employee==='all'&&d.status!=='Holiday')return error('All employees can only be selected for a holiday.'),false;
 if(d.employee!=='all'&&!state.employees.some(e=>e.id===d.employee))return error('Choose an employee.'),false;
 if(d.status==='Present'&&(d.date>today||!/^\d{2}:\d{2}$/.test(d.in||'')))return error('Present requires a check-in time and cannot be recorded in the future.'),false;
 if(d.status==='Present'&&d.out&&d.out<d.in)return error('Check-out must be after check-in on the same day.'),false;
 const ids=d.employee==='all'?state.employees.filter(e=>e.active!==false).map(e=>e.id):[d.employee];
 ids.forEach(id=>{const old=attendanceRecord(id,d.date),record={id:old?.id||`ATT-${id}-${d.date}`,employee:id,date:d.date,status:d.status,in:d.status==='Present'?d.in:'',out:d.status==='Present'?d.out||'':'',note:d.note||'',reviewedBy:'admin',reviewedAt:new Date().toISOString()};if(old)Object.assign(old,record);else state.attendance.push(record)});
 return true;
}
function viewAttendanceDay(date,id){
 if(role==='employer')return addAttendance(date,id);
 if(id!==currentEmployee())return;
 const a=attendanceRecord(id,date);
 openModal(new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}),`<div class="info">${badge(attendanceStatus(a))}<p style="margin-top:12px">${a?.status==='Pending'?'Waiting for employer approval. Not included in present-day totals.':a?.status==='Rejected'?'The employer rejected this request. It does not count as attendance.':a?'Confirmed by your employer.':'No attendance has been recorded. This day is not automatically counted as leave or LOP.'}</p></div><div class="detail-info"><div><small>Check in</small>${esc(a?.in||'—')}</div><div><small>Check out</small>${esc(a?.out||'—')}</div><div><small>Note</small>${esc(a?.note||'—')}</div></div>`,btn('Done','close','','primary'));
}
function clearForm(formId){
 const form=document.getElementById(formId);if(!form)return;
 // Hidden record IDs and document type are context, not editable form values.
 $$('input,textarea,select',form).forEach(el=>{
  if(el.type==='hidden'||el.readOnly)return;
  if(el.type==='checkbox'||el.type==='radio')el.checked=false;
  else if(el.tagName==='SELECT'){if(![...el.options].some(o=>o.value===''))el.insertAdjacentHTML('afterbegin','<option value="" disabled>Choose…</option>');el.value='';}
  else el.value='';
 });
 if($('#service-lines',form))$('#service-lines',form).innerHTML=serviceLine();
 if($('#bill-lines',form)){$('#bill-lines',form).innerHTML=billLine('',1,0);$('[name=discount]',form).value=0;$('[name=tax]',form).value=0;updateBillTotal();}
 if($('#models'))$('#models').innerHTML='';
 for(const id of ['form-error','login-error','admin-profile-error']){const el=document.getElementById(id);if(el){el.textContent='';el.className='';}}
 if(formId==='settings-form'){pendingLogo='';const file=$('#logo-file');if(file)file.value='';$('#logo-preview').innerHTML=icon('wrench');}
 if(formId==='login-form'){const p=$('#login-password');p.type='password';const b=$('[data-action=toggle-password]');b.textContent='Show';b.setAttribute('aria-label','Show password');}
 updateAttendanceTimeFields();
 const first=$$('input,textarea,select',form).find(el=>el.type!=='hidden'&&!el.disabled);first?.focus();
 toast('Form cleared. Existing records have not changed.');
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b)return;
 switch(b.dataset.action){
 case'clear-form':clearForm(b.dataset.form);break;
 case'clear-message':$('#whatsapp-message').value='';$('#whatsapp-message').focus();break;
 case'clear-search':query='';render();$('#search')?.focus();break;
 case'approve-attendance':decideAttendance(b.dataset.id,'Present');break;
 case'reject-attendance':decideAttendance(b.dataset.id,'Rejected');break;
 case'attendance-day':viewAttendanceDay(b.dataset.date,b.dataset.employee);break;
 }
});
document.addEventListener('change',event=>{
 if(event.target.id==='attendance-employee'){selectedAttendanceEmployee=event.target.value;render();}
 if(event.target.name==='status'&&event.target.closest('#modal-form')?.dataset.submit==='attendance')updateAttendanceTimeFields();
});
