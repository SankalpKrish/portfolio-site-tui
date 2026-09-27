# Corpus provenance

Every chunk in `content/` declares its own `source` in front-matter. This file is the index,
plus the conflicts that are still unresolved.

## Sources used

| Source                                                       | What it is                                    | Authority  |
| ------------------------------------------------------------ | --------------------------------------------- | ---------- |
| `src/terminal/commands/*.ts`                                  | The live site. Hard-coded HTML string literals. | **Authoritative** where it states something |
| `src/layouts/Base.astro` (JSON-LD)                            | Full legal name                                | Authoritative |
| `ai-job-search/cv/main_example.tex`                            | Self-described "master reference" CV          | Authoritative only where the site is silent |
| `Downloads/Recents/Sankalp_Krishnamurthy_Resume.pdf`           | Not read — see "Unread sources" below          | —          |
| `Downloads/Recents/Sankalp Internship Certificate.pdf`         | Not read — see "Unread sources" below          | —          |

**Rule applied:** where the live site and the resume disagree, the site wins. It is running in
production; the `.tex` is a local file that has already drifted once (see conflicts).

## PII deliberately excluded

Decision 15 is that raw sources are never committed, and the operator additionally directed that
PII be stripped from committed chunks even where a source contains it.

**Never committed:** the phone number in `main_example.tex:36`. The literal is redacted here too —
this file is tracked, and the repository is public, so writing the number down in a note that claims
the number was never written down is self-refuting. Recover it from the source file if it is ever
needed.

**Not restated, only pointed at:** email, LinkedIn and GitHub. These are already public in
`contact.ts` and are deliberately *not* duplicated into corpus prose, so the corpus cannot become
a second, drift-prone copy of contact details. The `contact` chunk routes to `/contact` instead.

## Resolved conflicts — decided by the operator 2026-09-26

Three contradictions existed between the live site and the resume. The operator has now ruled on
all three, and the site has been corrected to match. Recorded here because the site was the one
carrying the error in every case.

| # | Fact            | `main_example.tex` | Was on live site | Now           | Ruled          |
| - | --------------- | ------------------ | ---------------- | ------------- | -------------- |
| 1 | B.Tech end date | Aug 2028 (`:129`)  | Jun 2028         | **Aug 2028**  | resume correct |
| 2 | IGCSE end date  | May 2022 (`:139`)  | Apr 2022         | **May 2022**  | resume correct |
| 3 | Google certs    | in progress        | completed Jun 2026 | completed Jun 2026 | site already correct |

The corpus and `about.ts` now both state August 2028 and May 2022. `certifications.md` already
stated June 2026 and needed no change.

## Superseded count and coverage claims — fixed

`skills.ts` claimed **"Found 36 skills"** while listing **32** rows across **9** categories, and
omitted PyTorch, TensorFlow, Astro, Next.js, Tailwind and Vitest. The operator directed a
site-wide correction, so `skills.ts` is now data-driven with the count derived from the array.

It renders **39 skills across 10 categories**:

- new `ai-ml/` group carrying Machine Learning, PyTorch, Librosa and TensorFlow
- `frontend/` extended with Next.js, Tailwind CSS and Astro
- `engineering/` extended with Vitest
- "Machine Learning" upgraded from **learning** to **average**, since the resume documents
  hands-on work with Demucs v4, Basic Pitch and YAMNet and the site was under-rating it

The count can no longer drift, because nothing states it twice.

Also corrected:

- `help.ts` claimed **"Found 6 commands"** while listing 8. Now 8.
- `TerminalEngine.ts` omitted **`/clear`** from the autocomplete list entirely, so tab-completing
  a cleared terminal could not reach the command that clears it. Now present.

## Still outstanding

`help.ts` and `TerminalEngine.ts` each keep their own hard-coded command list. They agree today,
and they will drift the moment `/ask` is added, because the plan requires registering a command
in four separate places. The proper fix is a single registry that all four read from; that lands
with Phase 6, when there is a second command to keep in sync.


## Unread sources

Two PDFs in `Downloads/Recents` were not read: the resume PDF and the internship certificate.
PDF input is unavailable to the agent authoring this corpus, and extracting the `.docx` was
unnecessary once `main_example.tex` proved to be the more complete source.

**The internship certificate is the most likely gap.** The resume and the site both describe the
Open Computer internship, but neither states its dates, duration, or whether it was a internship
that produced a certificate. The `experience-open-computer` chunk currently says "since May 2026"
from `main_example.tex:80` and nothing more. Worth extracting manually and adding a chunk if
there is more detail.
