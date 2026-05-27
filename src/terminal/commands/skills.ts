// src/terminal/commands/skills.ts
import type { CommandHandler } from '../commands';

export const skills: CommandHandler = () => ({ html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x25CF;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(skills/**)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found 34 skills</span></div>
  <div class="cc-output-block" style="font-size:12px;line-height:2;">

    <div style="color:var(--teal);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>spoken-languages/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">English</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--teal);"></div></div><span class="skill-label">native</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">French</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--teal);"></div></div><span class="skill-label">native</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Kannada</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--teal);"></div></div><span class="skill-label">conversational</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Hindi</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span class="skill-label">basic</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Mandarin</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span class="skill-label">basic</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">German</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--teal);"></div></div><span class="skill-label">basic</span></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Tamil</span><div class="skill-bar-bg"><div class="skill-bar" style="width:20%;background:var(--teal);"></div></div><span class="skill-label">understand only</span></div>

    <div style="color:var(--blue);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>languages/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">JavaScript</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--blue);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">TypeScript</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--blue);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Python</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--blue);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Java</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--blue);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Rust</span><div class="skill-bar-bg"><div class="skill-bar" style="width:20%;background:var(--blue);"></div></div><span class="skill-label">learning</span></div>

    <div style="color:var(--mauve);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>frontend/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">React.js</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--mauve);"></div></div></div>

    <div style="color:var(--green);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>backend/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Node.js</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--green);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Express</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--green);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Bun</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--green);"></div></div></div>

    <div style="color:var(--peach);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>cloud/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">AWS</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Microsoft Azure</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Google Cloud</span><div class="skill-bar-bg"><div class="skill-bar" style="width:50%;background:var(--peach);"></div></div></div>

    <div style="color:var(--sapphire);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>data/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">PostgreSQL</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--sapphire);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">MongoDB</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--sapphire);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">SQL</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--sapphire);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Machine Learning</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--sapphire);"></div></div><span class="skill-label">learning</span></div>

    <div style="color:var(--lavender);margin-bottom:2px;">&#x251C;&#x2500;&#x2500; <strong>engineering/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Git</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--lavender);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Object-Oriented</span><div class="skill-bar-bg"><div class="skill-bar" style="width:70%;background:var(--lavender);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&#x2502;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Computer Networks</span><div class="skill-bar-bg"><div class="skill-bar" style="width:60%;background:var(--lavender);"></div></div></div>

    <div style="color:var(--yellow);margin-bottom:2px;">&#x2514;&#x2500;&#x2500; <strong>soft-skills/</strong></div>
    <div class="skill-row"><span class="skill-tree-line">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Project Management</span><div class="skill-bar-bg"><div class="skill-bar" style="width:40%;background:var(--yellow);"></div></div><span class="skill-label">learning</span></div>
    <div class="skill-row"><span class="skill-tree-line">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Problem Solving</span><div class="skill-bar-bg"><div class="skill-bar" style="width:80%;background:var(--yellow);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&nbsp;&nbsp;&nbsp;&nbsp;&#x251C;&#x2500;&#x2500;</span><span class="skill-name">Team Collaboration</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--yellow);"></div></div></div>
    <div class="skill-row"><span class="skill-tree-line">&nbsp;&nbsp;&nbsp;&nbsp;&#x2514;&#x2500;&#x2500;</span><span class="skill-name">Leadership</span><div class="skill-bar-bg"><div class="skill-bar" style="width:100%;background:var(--yellow);"></div></div></div>

  </div>
` });
