---
id: project-open-slides-stack
title: Open Slides — the technical stack and the parts I built myself
topic: project
source: ai-job-search/cv/main_example.tex:102
---

Open Slides runs on Next.js 16 with the App Router, React 19, TypeScript and Tailwind. Styling
is driven by a custom CSS-variable design-token system rather than utility values scattered
through components.

The part I am most opinionated about is the model routing. Instead of calling a model provider
SDK directly, I wrote an in-house proxy called `claude-router` that sits in front of the
provider and routes across Sonnet 4.6, Opus 4.7 and Haiku 4.5. Every model call in the product
goes through it, which means the routing decision is mine and it can change without touching
product code.

The agent loop streams over SSE, and there is a prompt flow with a five-dimension self-critique
gate before output is accepted.
