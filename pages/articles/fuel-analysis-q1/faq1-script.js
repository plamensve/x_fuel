let currentFuel = 'benzine';
let currentGroup = '1-4';

let allData = [];

fetch('data.json')
  .then(res => res.json())
  .then(data => {
      allData = data;
      renderTable();
  });

function getColor(value, max) {
    let intensity = value / max;
    return `rgba(0, 123, 255, ${0.1 + intensity * 0.9})`;
}

function getTextColor(value, max) {
    let intensity = value / max;
    return intensity > 0.5 ? '#fff' : '#222';
}

function renderTable() {

    let tbody = document.querySelector('#fuelTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    let filtered = allData.filter(x =>
        x.fuel === currentFuel &&
        x.group === currentGroup
    );

    if (filtered.length === 0) return;

    let values = [];
    filtered.forEach(r => values.push(r.I, r.II, r.III));

    let max = Math.max(...values);

    filtered.forEach(row => {

        let tr = document.createElement('tr');

        let td1 = document.createElement('td');
        td1.textContent = row.region;

        let td2 = document.createElement('td');
        let td3 = document.createElement('td');
        let td4 = document.createElement('td');

        td2.textContent = row.I;
        td3.textContent = row.II;
        td4.textContent = row.III;

        [td2, td3, td4].forEach(td => {
            let val = parseFloat(td.textContent);

            td.style.backgroundColor = getColor(val, max);
            td.style.color = getTextColor(val, max);
        });

        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);

        tbody.appendChild(tr);
    });
}

function setFuel(fuel) {
    currentFuel = fuel;
    renderTable();
}

function setGroup(group) {
    currentGroup = group;
    renderTable();
}

function updateActiveButtons(containerId, value, type) {

    let buttons = document.querySelectorAll(`#${containerId} button`);

    buttons.forEach(btn => {
        btn.classList.remove('active');

        if (btn.textContent.toLowerCase().includes(value)) {
            btn.classList.add('active');
        }
    });
}

function setFuel(fuel) {
    currentFuel = fuel;
    updateActiveButtons('fuelButtons', fuel === 'benzine' ? 'бензин' : fuel === 'diesel' ? 'дизел' : 'пропан');
    renderTable();
}

function setGroup(group) {
    currentGroup = group;
    updateActiveButtons('groupButtons', group);
    renderTable();
}