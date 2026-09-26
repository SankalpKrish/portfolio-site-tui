---
id: project-midi-ai-pipeline
title: MIDI.ai — the five-stage pipeline
topic: project
source: ai-job-search/cv/main_example.tex:113
---

MIDI.ai runs as a divide-and-conquer pipeline of five stages.

One, stem isolation with a Hybrid Transformer Demucs v4 in PyTorch, which splits the mix into
separate sources. Two, Librosa MIR analysis for tempo, key and tuning. Three, YAMNet for timbre
classification. Four, Spotify Basic Pitch for the actual note transcription. Five, PrettyMIDI
for post-processing into a clean, playable file.

Every stage is chosen to do the one thing it is good at. Nothing is asked to be good at two
things, which is why the stages are separate processes rather than one fused model.
