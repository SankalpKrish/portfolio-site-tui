---
id: project-midi-ai
title: MIDI.ai — what it is and why it exists
topic: project
source: ai-job-search/cv/main_example.tex:111 + src/terminal/commands/projects.ts:10
---

MIDI.ai is a pipeline that turns polyphonic audio into a MIDI file. I started it in December 2025
and have been building it solo.

The problem it solves is that converting a finished music track into editable MIDI is genuinely
hard when more than one instrument is playing. A single-note transcription model will happily
output something, but the result is a flat smear that is not usable in a DAW. MIDI.ai is built
around the assumption that you have to separate the track before you can transcribe it, and that
the separation step is where most of the quality is won or lost.

It is written in Python and is modular, so each stage can be run, inspected, and replaced on its
own.
