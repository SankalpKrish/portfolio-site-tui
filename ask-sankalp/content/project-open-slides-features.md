---
id: project-open-slides-features
title: Open Slides — features I owned, and the honest limitation
topic: project
source: ai-job-search/cv/main_example.tex:103
---

On Open Slides I owned the Template Gallery end to end: the schema behind it, the server-rendered
browse page, and the `UsePromptModal` including its fork path. I also did the home-page work —
a rose-particle hero, accessibility, and responsive layout.

Export goes to PDF as vector and to PPTX rasterised, both through the `pdf-server` on the VPS.

The honest limitation: the StackBlitz WebContainer integration only works in desktop Chromium.
It does not run on mobile browsers. That was a deliberate trade — a real in-browser runtime was
worth more than mobile reach for the people who actually use it.

Testing discipline is Vitest plus `tsc --noEmit` on every change.
