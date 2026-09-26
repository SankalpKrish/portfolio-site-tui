---
id: project-midi-ai-contributions
title: MIDI.ai — the parts Sankalp wrote himself
topic: project
source: ai-job-search/cv/main_example.tex:115
---

The models in the pipeline are off the shelf. The code that makes them a pipeline is mine.

I wrote the orchestrator that sequences the five stages and passes data between them, the
YAMNet-to-General-MIDI program mapper — a 40-entry lookup translating what the timbre classifier
calls a sound into the GM program number a DAW expects — the post-processor that cleans up the
transcription into something playable, and the CLI wrapper.

So the model selection is borrowed and well-informed, but the thing that makes the stages
compose into a usable result is original.
