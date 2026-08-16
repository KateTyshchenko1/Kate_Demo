const moments = [...document.querySelectorAll('.moment')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const activeYear = document.querySelector('#activeYear');
const activeTitle = document.querySelector('#activeTitle');
const activeCount = document.querySelector('#activeCount');
const progressBar = document.querySelector('#progressBar');

let visibleMoments = moments;

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

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        filterButtons.forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
        moments.forEach((moment) => { moment.hidden = filter !== 'all' && moment.dataset.category !== filter; });
        visibleMoments = moments.filter((moment) => !moment.hidden);
        activate(visibleMoments[0]);
    });
});

activate(moments[0]);
