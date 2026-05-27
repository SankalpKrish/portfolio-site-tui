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
    
    // Process characters in small chunks to counter browser setTimeout clamping (4ms min).
    // This allows typing to feel fluid and fast even with large HTML blocks.
    const chunkSize = 4;

    function tick() {
      if (i >= text.length) { resolve(); return; }
      
      let steps = 0;
      while (i < text.length && steps < chunkSize) {
        if (text[i] === '<') {
          const end = text.indexOf('>', i);
          if (end !== -1) {
            i = end + 1;
          } else {
            i++;
          }
          // Break on tags so the full tag structure is parsed/rendered at once
          break;
        } else {
          i++;
          steps++;
        }
      }
      
      container.innerHTML = text.slice(0, i);
      setTimeout(tick, speed);
    }
    tick();
  });
}
