# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-19

### Added

- Test plan (simplified IEEE 829 / ISO 29119-3) with a feature map, risks and a traceability matrix.
- 48 test cases (Markdown and CSV) with equivalence partitioning, boundary value analysis, a decision table for
  slot availability and state transitions.
- Playwright + TypeScript suite with the Page Object Model: 28 E2E tests, 3 accessibility scans (axe-core) and
  11 API tests, on Chromium, Firefox and Mobile Chrome.
- Session pool fixture that respects the login rate limit and refresh token rotation.
- Postman collection (36 requests, 161 assertions) with live and local environments, run by Newman.
- GitHub Actions: lint, format and typecheck on every PR; E2E and Newman against the live demo on push, daily
  and on demand, with a Render warm-up step; reports published to GitHub Pages.
- Four bug reports filed in the BookFlow repository, bug report template, suggested improvements and the test
  summary report.
- Local-only k6 load example.

### Fixed

- Session pool deadlock when several workers ran admin tests in parallel.

[1.0.0]: https://github.com/lucaswsanchez/bookflow-qa/releases/tag/v1.0.0
