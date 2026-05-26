class ScrollStateClass {
  progress = 0;

  init() {
    window.addEventListener('scroll', () => {
      const max = document.body.scrollHeight - window.innerHeight;
      this.progress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
  }
}

export const ScrollState = new ScrollStateClass();
