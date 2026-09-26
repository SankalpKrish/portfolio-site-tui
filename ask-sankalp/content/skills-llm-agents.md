---
id: skills-llm-agents
title: LLM agent design experience
topic: skill
source: ai-job-search/cv/main_example.tex:61
---

I design LLM agents, and I have shipped two quite different kinds.

Open Slides is a chat-driven agent loop that builds and edits artefacts in real time — slides,
documents, sheets, websites — with a self-critique gate before output is accepted.

Open Computer is the opposite problem: not generating, but deciding what to go and look at. I
designed the workflow that governs how that agent exercises curiosity and discoverability, which
is an agent-design problem with no generation step in it at all.

I also wrote `claude-router`, an in-house proxy that routes across Sonnet 4.6, Opus 4.7 and
Haiku 4.5, so I have direct experience of multi-model routing as a design problem rather than a
config file.
