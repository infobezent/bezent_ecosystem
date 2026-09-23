# CLAUDE.md — Claude Code Agent Guidance for BEZENT

> **PRIMARY OPERATIONAL RULEBOOK:**
>
> **[AGENTS.md](AGENTS.md) is the BEZENT Engineering Constitution & Operational Rulebook. It is the primary, authoritative, and mandatory operational instruction set for all coding agents working in this repository.**
>
> Task prompts may add narrower requirements, but must **never** silently override repository architecture, safety, ownership, Git rules, or Design System invariants defined in `AGENTS.md`. If a task instruction conflicts with `AGENTS.md`, **STOP and report the conflict immediately.**

---

## 1. Strict Deference to AGENTS.md

All coding agents operating via Claude Code must strictly follow `AGENTS.md` for:

- **Architecture Boundaries & Canonical Layers:** See `AGENTS.md`, Articles 3 & 5.
- **Global Design System & Zero Application CSS Rule:** See `AGENTS.md`, Articles 7 & 8. (Zero `.css` in `applications/**`, zero inline styling).
- **Domain vs. Platform Boundaries:** See `AGENTS.md`, Articles 9, 11 & 12.
- **Backend Architecture & Database Rules:** See `AGENTS.md`, Articles 13, 14 & 15. (Layered separation, MySQL + Drizzle authoritative, no in-memory fallbacks).
- **Identity & Role Invariants:** See `AGENTS.md`, Articles 16 & 17. (`User ≠ Employee ≠ Candidate`).
- **Developer Ownership & Coordination:** See `AGENTS.md`, Article 20. (Dev1: Backend/Settings/Repo; Dev2: HRMS Business Frontend; Dev3: Global UI/Design System/AppShell).
- **Git & Protected Branch Workflow:** See `AGENTS.md`, Articles 21–28. (Protected `main` & `develop`; one task = one branch = one PR; squash merge only; no force pushes or destructive Git commands).
- **Validation Gates & CI:** See `AGENTS.md`, Article 29. (Pass `typecheck`, `lint`, `format:check`, `test`, `build`; required check is `verify`).
- **Agent Stop Conditions & Audit Checklist:** See `AGENTS.md`, Articles 30 & 31.

---

## 2. Claude Code Operational Quick Reference

- **Safe Start Procedure:**
  ```bash
  git status                      # Must be clean
  git fetch origin
  git switch develop
  git pull --ff-only origin develop
  git switch -c <type>/<task-name>
  ```
- **PR Target:** PRs must **ALWAYS** target `develop`. Never create feature PRs against `main`.
- **Search Before Create:** Always inspect existing components, APIs, and Design System tokens before implementing new code (`AGENTS.md`, Article 24).
- **No Speculative Scaffolding:** Never create empty folders, dummy packages, or unneeded abstractions (`AGENTS.md`, Article 33).
- **No Silent Architecture Changes:** Any change to stacks, dependencies, layers, or conventions requires justification, an ADR, and explicit approval (`AGENTS.md`, Article 4).
