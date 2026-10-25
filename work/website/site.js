const demos = {
  jobs: {
    kicker: 'TODAY ON THE FLOOR', title: 'Every job has a next step.',
    description: 'See what is moving, what is ready and who is on it.',
    oneLabel: 'In progress', one: '08', oneNote: 'On the floor',
    twoLabel: 'Ready to deliver', two: '03', twoNote: 'Keep customers in the loop',
    icon: '✦', item: 'Service & inspection', sub: 'Maruti Suzuki Swift · Assigned to Arjun', pill: 'In progress'
  },
  inventory: {
    kicker: 'PARTS IN PLAIN SIGHT', title: 'Know what is on the shelf.',
    description: 'Use parts on jobs and spot a shortage before it slows the team.',
    oneLabel: 'Parts available', one: '84', oneNote: 'Across your inventory',
    twoLabel: 'Requests to review', two: '02', twoNote: 'Keep work moving',
    icon: '▦', item: 'Oil filter', sub: 'Current stock · Ready for the next service', pill: 'Available'
  },
  team: {
    kicker: 'PEOPLE MAKE IT WORK', title: 'Your team, on the same page.',
    description: 'See assignments and attendance together in one calm view.',
    oneLabel: 'On the floor', one: '06', oneNote: 'Checked in today',
    twoLabel: 'Awaiting approval', two: '01', twoNote: 'Attendance request',
    icon: '◷', item: 'Arjun Nair', sub: 'Assigned · Service & inspection', pill: 'Working'
  }
};
const demoFields = {
  kicker: 'demo-kicker', title: 'demo-title', description: 'demo-description',
  oneLabel: 'demo-stat-one-label', one: 'demo-stat-one', oneNote: 'demo-stat-one-note',
  twoLabel: 'demo-stat-two-label', two: 'demo-stat-two', twoNote: 'demo-stat-two-note',
  icon: 'demo-icon', item: 'demo-item-title', sub: 'demo-item-subtitle', pill: 'demo-pill'
};
const demoTabs = [...document.querySelectorAll('[data-demo]')];
function setDemo(name) {
  const content = demos[name];
  if (!content) return;
  for (const [key, id] of Object.entries(demoFields)) document.getElementById(id).textContent = content[key];
  for (const tab of demoTabs) {
    const selected = tab.dataset.demo === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  document.querySelector('.board').dataset.mode = name;
}
for (const tab of demoTabs) tab.addEventListener('click', () => setDemo(tab.dataset.demo));

const steps = [
  { eyebrow:'FIRST STOP', symbol:'◎', title:'Start with the full picture.', description:"Save the customer's details and vehicle, then open a job card before the work begins.", note:'Customer → Vehicle → Job card' },
  { eyebrow:'IN THE BAY', symbol:'✳', title:'Give every job an owner.', description:'Assign the right team member and keep the service or repair details close at hand.', note:'Job card → Assigned employee' },
  { eyebrow:'AS WORK MOVES', symbol:'◷', title:'Everyone sees what changed.', description:'Update each service as work progresses. Check parts, requests and attendance in the same place.', note:'Progress → Parts → Team' },
  { eyebrow:'READY TO GO', symbol:'↗', title:'Wrap up with confidence.', description:'Mark the work finished, update the customer and print an estimate or invoice.', note:'Finished → Customer update → Bill' }
];
const flowFields = { eyebrow:'flow-eyebrow', symbol:'flow-symbol', title:'flow-title', description:'flow-description', note:'flow-note' };
const stepTabs = [...document.querySelectorAll('[data-step]')];
function setStep(index) {
  const content = steps[index];
  if (!content) return;
  for (const [key, id] of Object.entries(flowFields)) document.getElementById(id).textContent = content[key];
  document.getElementById('flow-number').textContent = String(index + 1).padStart(2, '0');
  for (const tab of stepTabs) {
    const selected = Number(tab.dataset.step) === index;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
}
for (const tab of stepTabs) tab.addEventListener('click', () => setStep(Number(tab.dataset.step)));

function arrowTabs(tabs, current, setter) {
  const index = tabs.indexOf(current);
  if (index < 0) return;
  return event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next].focus();
    setter(next);
  };
}
for (const tab of demoTabs) tab.addEventListener('keydown', arrowTabs(demoTabs, tab, i => setDemo(demoTabs[i].dataset.demo)));
for (const tab of stepTabs) tab.addEventListener('keydown', arrowTabs(stepTabs, tab, setStep));

setDemo('jobs');
setStep(0);
