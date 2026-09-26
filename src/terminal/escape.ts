// src/terminal/escape.ts
// Single home for HTML escaping. Previously duplicated in commands.ts and
// open.ts, where the two copies had to be kept in sync by hand.

export function escHtml(s: string): string {
  // The apostrophe matters now that model output is rendered through this. The
  // old version skipped it, which was survivable while the only interpolated
  // strings were command names, and is not survivable now.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Model output is untrusted and is rendered as text, never as markup. Escaping
// alone would collapse every paragraph break, so newlines are converted to
// elements after the text is inert.
export function escText(s: string): string {
  return escHtml(s)
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 8px;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
