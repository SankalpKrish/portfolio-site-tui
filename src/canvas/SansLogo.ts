// src/canvas/SansLogo.ts

const QUIPS = [
  'your mouse is no good here.',
  'try using your keyboard.',
  'heh. you really thought clicking me would do something?',
  '* sans is judging your mouse usage.',
  'wrong input device, pal.',
];

let bubble: HTMLDivElement | null = null;
let textSpan: HTMLSpanElement | null = null;

function getBubble(): HTMLDivElement {
  if (bubble) return bubble;
  bubble = document.createElement('div');
  bubble.id = 'sans-speech-bubble';
  bubble.style.cssText = `
    position: fixed;
    background: #fff;
    border: 2px solid #000;
    border-radius: 0;
    padding: 6px 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #000;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 100;
  `;
  const span = document.createElement('span');
  textSpan = span;
  bubble.appendChild(span);
  
  // Triangle tail (downward-left)
  const tail = document.createElement('div');
  tail.style.cssText = `
    position: absolute;
    bottom: -8px;
    left: 10px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid #000;
  `;
  const tailInner = document.createElement('div');
  tailInner.style.cssText = `
    position: absolute;
    bottom: 2px;
    left: -4px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #fff;
  `;
  tail.appendChild(tailInner);
  bubble.appendChild(tail);
  document.body.appendChild(bubble);
  return bubble;
}

export const SansLogo = {
  async render(selector: string): Promise<void> {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(selector);
    if (canvases.length === 0) return;
    const img = new Image();
    img.src = '/sans.png';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load sans.png'));
    });
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });
  },

  initHover(): void {
    const hideBubble = () => {
      if (bubble) bubble.style.opacity = '0';
    };

    // Event delegation on document to dynamically support loaded "#sans-logo"
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.id === 'sans-logo') {
        const b = getBubble();
        if (textSpan) textSpan.textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];
        
        const rect = target.getBoundingClientRect();
        
        // Render bubble styled block temporarily to get accurate offsetHeight/Width
        b.style.display = 'block';
        const bWidth = b.offsetWidth || 150;
        const bHeight = b.offsetHeight || 30;
        
        // Align the bubble tail (at left: 10px) to point near the center of the 80x80 canvas (at rect.left + 40px)
        // So bubble left = rect.left + 40px - 10px = rect.left + 30px
        b.style.left = (rect.left + 30) + 'px';
        b.style.top  = (rect.top - bHeight - 12) + 'px';
        b.style.opacity = '1';
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.id === 'sans-logo') {
        hideBubble();
      }
    });

    // Automatically hide bubble when scrolling the terminal body
    const outputEl = document.getElementById('terminal-output');
    if (outputEl) {
      outputEl.addEventListener('scroll', hideBubble, { passive: true });
    }
  },
};
