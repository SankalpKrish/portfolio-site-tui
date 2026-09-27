---
id: skills-backend
title: Backend and runtime skills
topic: skill
source: src/terminal/commands/skills.ts:28 + ai-job-search/cv/main_example.tex:63
---

On the backend I use Node.js with Express, and I have been getting into Bun.

The work I do here is usually not heavy API plumbing. It is the layer that sits between a model
and a user: proxying and routing model calls, streaming responses, and holding the state of an
agent loop while it runs. On Open Slides that is the `claude-router` proxy I wrote, which routes
across three Claude models and streams over SSE.

For hosting I have shipped to Vercel and to a VPS, and I run a `pdf-server` on a VPS for the
heavier document export work in Open Slides.
