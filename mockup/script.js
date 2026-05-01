const tabs = document.querySelectorAll('.tab');
const gridRect = document.querySelector('.grid-rect');
const canvas = document.querySelector('.canvas');
const toggle = document.getElementById('persistence');
const indicator = document.getElementById('cloud-indicator');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const grid = tab.dataset.grid;
    canvas.dataset.grid = grid;
    if (grid === 'none') {
      gridRect.setAttribute('fill', 'transparent');
    } else {
      gridRect.setAttribute('fill', `url(#p-${grid})`);
    }
  });
});

function syncToggle() {
  if (toggle.checked) {
    indicator.textContent = 'Cloud on';
    indicator.classList.add('on');
  } else {
    indicator.textContent = 'Cloud off';
    indicator.classList.remove('on');
  }
}

toggle.addEventListener('change', syncToggle);
syncToggle();
