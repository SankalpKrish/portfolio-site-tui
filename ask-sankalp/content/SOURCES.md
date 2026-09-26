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

**Never committed:** the phone number `+91 9741054004`, from `main_example.tex:36`.

**Not restated, only pointed at:** email, LinkedIn and GitHub. These are already public in
`contact.ts` and are deliberately *not* duplicated into corpus prose, so the corpus cannot become
a second, drift-prone copy of contact details. The `contact` chunk routes to `/contact` instead.

## Unresolved conflicts — these will make `/ask` wrong until fixed

Three contradictions between the live site and the resume. Not guessed; each chunk states one
side and needs an operator decision.

| # | Fact                | `main_example.tex`     | Live site                             | Chunk states     |
| - | ------------------- | ---------------------- | ------------------------------------- | ---------------- |
| 1 | B.Tech end date     | Aug 2028 (`:129`)      | Jun 2028 (`about.ts:8`)               | "2028" only, month omitted |
| 2 | IGCSE end date      | May 2022 (`:139`)      | Apr 2022 (`about.ts:13`)              | **resume: May 2022** |
| 3 | Google certs status | in progress (`:150-152`) | completed June 2026 (`skills.ts:50-51`) | **site: June 2026** |

On #3 the site is almost certainly right: commit `ffa81fe` ("Update both certifications to
completed June 2026") is newer than the CV. On #1 and #2 there is no such signal, and the CV
gives explicit month ranges where the site gives its own. **Operator must pick.**

Conflicts 1 and 2 also appear on the live site simultaneously, so `/about` is already
internally inconsistent with `/skills`-era content regardless of what the corpus says.

## Count discrepancies found in the existing site

Not introduced here; recorded because the corpus must not inherit them.

- `skills.ts:6` claims **"Found 36 skills"**. The file contains **32** rows across **9**
  categories. (The implementation plan estimated 31 rows / 8 domains — also wrong.)
- `skills.ts` omits **PyTorch, TensorFlow, Astro, Next.js, React 19, Tailwind and Vitest**, all
  of which the resume names and several of which are central to shipped work. So `/skills`
  under-represents the actual stack.
- `skills.ts:42` rates "Machine Learning" as **learning**, while `main_example.tex:59` claims
  hands-on work with Demucs v4, Basic Pitch and YAMNet. The site under-rates here.
- `help.ts:6` claims **"Found 6 commands"** while listing 8. `TerminalEngine.ts:23-31` omits
  `/clear` from the autocomplete list entirely.

## Unread sources

Two PDFs in `Downloads/Recents` were not read: the resume PDF and the internship certificate.
PDF input is unavailable to the agent authoring this corpus, and extracting the `.docx` was
unnecessary once `main_example.tex` proved to be the more complete source.

**The internship certificate is the most likely gap.** The resume and the site both describe the
Open Computer internship, but neither states its dates, duration, or whether it was a internship
that produced a certificate. The `experience-open-computer` chunk currently says "since May 2026"
from `main_example.tex:80` and nothing more. Worth extracting manually and adding a chunk if
there is more detail.
