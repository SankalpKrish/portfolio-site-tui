// src/terminal/commands/projects.ts
import type { CommandHandler } from '../commands';

export const projects: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x23FA;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(projects/**)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 3 projects</span></div>
  <div class="cc-output-block" style="display:flex;flex-direction:column;gap:10px;">

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; MIDI.ai</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/midi-ai/ &middot; 2024 &middot; Solo</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">A truly AI-powered audio track to MIDI file pipeline.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(137,180,250,0.4);color:var(--blue);border-radius:3px;">Python</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(203,166,247,0.4);color:var(--mauve);border-radius:3px;">AI/ML</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open midi.ai &mdash; open on GitHub</div>
    </div>

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; OpenComputer</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/opencomputer/ &middot; 2024 &middot; Collab</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">Building the frontend + native AI skill/plugin curiosity and discoverability.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(137,180,250,0.4);color:var(--blue);border-radius:3px;">TypeScript</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(148,226,213,0.4);color:var(--teal);border-radius:3px;">Bun</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(203,166,247,0.4);color:var(--mauve);border-radius:3px;">AI</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open opencomputer &mdash; open on GitHub</div>
    </div>

    <div style="border:1px solid rgba(180,190,254,0.10);border-radius:4px;padding:12px 14px;">
      <div style="color:var(--lavender);font-weight:600;font-size:13px;">&#x2B21; The Procrastination Engine</div>
      <div style="color:var(--overlay1);font-size:11px;margin:2px 0;">projects/procrastination-engine/ &middot; 2023 &middot; For fun</div>
      <div style="color:var(--subtext0);font-size:12px;margin:4px 0 8px;">A clock made of several tiny clocks. It&apos;s time&hellip; within a time&hellip; within a time.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(249,226,175,0.4);color:var(--yellow);border-radius:3px;">JavaScript</span>
        <span style="font-size:10px;padding:1px 8px;border:1px solid rgba(250,179,135,0.4);color:var(--peach);border-radius:3px;">Canvas</span>
      </div>
      <div style="font-size:11px;color:var(--overlay0);">&#x2B0F; /open procrastination-engine &mdash; open on GitHub</div>
    </div>

  </div>
` });
