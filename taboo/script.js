const moments = [...document.querySelectorAll('.moment')];
const activeYear = document.querySelector('#activeYear');
const activeTitle = document.querySelector('#activeTitle');
const activeCount = document.querySelector('#activeCount');
const progressBar = document.querySelector('#progressBar');

const visibleMoments = moments;

function activate(moment) {
    if (!moment || moment.hidden) return;
    moments.forEach((entry) => entry.classList.toggle('is-active', entry === moment));
    const index = visibleMoments.indexOf(moment);
    activeYear.textContent = moment.dataset.year;
    activeTitle.textContent = moment.dataset.title;
    activeCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(visibleMoments.length).padStart(2, '0')}`;
    progressBar.style.transform = `scaleX(${(index + 1) / visibleMoments.length})`;
}

const observer = new IntersectionObserver((entries) => {
    const candidate = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
    if (candidate) activate(candidate.target);
}, { rootMargin: '-18% 0px -55% 0px', threshold: [0, .25, .75] });

moments.forEach((moment) => observer.observe(moment));

activate(moments[0]);
