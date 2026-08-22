const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reduced) reveals.forEach((el) => el.classList.add('visible'));
else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  reveals.forEach((el) => observer.observe(el));
}

const ufo = document.querySelector('.ufo');
if (ufo && matchMedia('(pointer: fine)').matches) {
  let x = -80, y = -80, tx = x, ty = y;
  addEventListener('pointermove', (event) => { tx = event.clientX; ty = event.clientY; }, { passive: true });
  const fly = () => {
    x += (tx - x) * .2; y += (ty - y) * .2;
    const tilt = Math.max(-12, Math.min(12, (tx - x) * .65));
    ufo.style.transform = `translate3d(${x - 17}px,${y - 7}px,0) rotate(${tilt}deg)`;
    requestAnimationFrame(fly);
  };
  requestAnimationFrame(fly);
}

if (!reduced) {
  const hero = document.querySelector('.hero-orbit');
  addEventListener('pointermove', (event) => {
    if (!hero) return;
    hero.style.marginLeft = `${(event.clientX / innerWidth - .5) * 14}px`;
    hero.style.marginTop = `${(event.clientY / innerHeight - .5) * 10}px`;
  }, { passive: true });
}
