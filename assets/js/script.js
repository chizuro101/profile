// ─── Project Cards: slide-in / slide-out on scroll ───
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('in-view', entry.isIntersecting);
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.project-card').forEach(card => {
  revealObserver.observe(card);
});