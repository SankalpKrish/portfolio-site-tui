// src/terminal/commands/skills.ts
import type { CommandHandler } from '../commands';

type Level = 1 | 2 | 3 | 4 | 5;

type Skill = {
  name: string;
  level: Level;
  label: string;
  cert?: boolean;
};

type Group = {
  name: string;
  color: string;
  skills: Skill[];
};

// The reported count is derived from this array rather than written by hand. It
// previously claimed 36 while listing 32, which is exactly the drift that
// happens when prose and data are maintained separately.
const GROUPS: Group[] = [
  {
    name: 'spoken-languages',
    color: 'teal',
    skills: [
      { name: 'English', level: 5, label: 'native' },
      { name: 'French', level: 4, label: 'fluent' },
      { name: 'Kannada', level: 3, label: 'conversational' },
      { name: 'Hindi', level: 2, label: 'basic' },
      { name: 'Mandarin', level: 1, label: 'understand only' },
      { name: 'German', level: 2, label: 'basic' },
      { name: 'Tamil', level: 1, label: 'understand only' },
    ],
  },
  {
    name: 'languages',
    color: 'blue',
    skills: [
      { name: 'JavaScript', level: 3, label: 'average' },
      { name: 'TypeScript', level: 3, label: 'average' },
      { name: 'Python', level: 3, label: 'average' },
      { name: 'Java', level: 3, label: 'average' },
      { name: 'Rust', level: 1, label: 'learning' },
    ],
  },
  {
    name: 'frontend',
    color: 'mauve',
    skills: [
      { name: 'React.js', level: 3, label: 'average' },
      { name: 'Next.js', level: 3, label: 'average' },
      { name: 'Tailwind CSS', level: 3, label: 'average' },
      { name: 'Astro', level: 3, label: 'average' },
    ],
  },
  {
    name: 'backend',
    color: 'green',
    skills: [
      { name: 'Node.js', level: 3, label: 'average' },
      { name: 'Express', level: 3, label: 'average' },
      { name: 'Bun', level: 1, label: 'learning' },
    ],
  },
  {
    name: 'ai-ml',
    color: 'sky',
    skills: [
      { name: 'Machine Learning', level: 3, label: 'average' },
      { name: 'PyTorch', level: 3, label: 'average' },
      { name: 'Librosa', level: 3, label: 'average' },
      { name: 'TensorFlow', level: 2, label: 'learning' },
    ],
  },
  {
    name: 'cloud',
    color: 'peach',
    skills: [
      { name: 'AWS', level: 3, label: 'average' },
      { name: 'Microsoft Azure', level: 3, label: 'average' },
      { name: 'Google Cloud', level: 3, label: 'average' },
    ],
  },
  {
    name: 'data',
    color: 'sapphire',
    skills: [
      { name: 'PostgreSQL', level: 3, label: 'average' },
      { name: 'MongoDB', level: 3, label: 'average' },
      { name: 'SQL', level: 3, label: 'average' },
    ],
  },
  {
    name: 'engineering',
    color: 'lavender',
    skills: [
      { name: 'Git', level: 3, label: 'average' },
      { name: 'Object-Oriented', level: 3, label: 'average' },
      { name: 'Computer Networks', level: 3, label: 'average' },
      { name: 'Vitest', level: 2, label: 'learning' },
    ],
  },
  {
    name: 'certifications',
    color: 'red',
    skills: [
      { name: 'Google Project Management', level: 5, label: 'completed June 2026', cert: true },
      { name: 'Google AI Essentials', level: 5, label: 'completed June 2026', cert: true },
    ],
  },
  {
    name: 'soft-skills',
    color: 'yellow',
    skills: [
      { name: 'Project Management', level: 1, label: 'learning' },
      { name: 'Problem Solving', level: 4, label: 'intermediate' },
      { name: 'Team Collaboration', level: 5, label: 'expert' },
      { name: 'Leadership', level: 5, label: 'expert' },
    ],
  },
];

const BRANCH = '&#x251C;&#x2500;&#x2500;';
const LAST_BRANCH = '&#x2514;&#x2500;&#x2500;';
const TREE_PIPE = '&#x2502;&nbsp;&nbsp;&nbsp;';

function bar(level: Level, color: string): string {
  const filled = '<span class="segment filled"></span>'.repeat(level);
  const empty = '<span class="segment"></span>'.repeat(5 - level);
  return `<div class="skill-bar-segmented" style="--skill-color:var(${color});">${filled}${empty}</div>`;
}

function renderGroup(group: Group, isLast: boolean): string {
  const rows = group.skills.map((skill, i) => {
    const branch = i === group.skills.length - 1 ? LAST_BRANCH : BRANCH;
    const badge = skill.cert ? '<span class="skill-cert-badge">professional certificate</span>' : '';
    return `<div class="skill-row"><span class="skill-tree-line">${TREE_PIPE}${branch}</span><span class="skill-name">${skill.name}</span>${bar(skill.level, group.color)}<span class="skill-label">${skill.label}</span>${badge}</div>`;
  }).join('\n    ');

  return `<div style="color:var(${group.color});margin-bottom:2px;">${isLast ? LAST_BRANCH : BRANCH} <strong>${group.name}/</strong></div>
    ${rows}`;
}

export const skills: CommandHandler = () => {
  const total = GROUPS.reduce((sum, group) => sum + group.skills.length, 0);
  const tree = GROUPS.map((group, i) => renderGroup(group, i === GROUPS.length - 1)).join('\n    ');

  return { html: `
  <div class="cc-tool-use"><span class="cc-tool-dot">&#x25CF;</span><span class="cc-tool-name">Glob</span><span class="cc-tool-args">(skills/**)</span></div>
  <div class="cc-tool-result"><span class="cc-tool-result-sym">&#x2B0F;</span><span class="cc-tool-result-text">Found ${total} skills</span></div>
  <div class="cc-output-block" style="font-size:12px;line-height:2;">
    ${tree}
  </div>
` };
};
