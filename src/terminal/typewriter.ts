// Note: html parameter contains only trusted, pre-escaped HTML strings authored in commands.ts.
// No user input is ever passed here; innerHTML usage is intentional for typed-HTML animation.
export function typewriter(
  container: HTMLElement,
  html: string,
  speed = 4,
): Promise<void> {
  return new Promise(resolve => {
    const text = html;
    let i = 0;
    container.innerHTML = '';
    function tick() {
      if (i >= text.length) { resolve(); return; }
      if (text[i] === '<') {
        const end = text.indexOf('>', i);
        i = end + 1;
      } else {
        i++;
      }
      container.innerHTML = text.slice(0, i);
      setTimeout(tick, speed);
    }
    tick();
  });
}
