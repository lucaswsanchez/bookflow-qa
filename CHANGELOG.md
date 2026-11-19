# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-11-19

### Added

- TC-API-12: automated regression test for bookflow#59 (phone without digits, blank name).
- Generator scripts for the Postman collection and the test case docs (`pnpm generate:postman`,
  `pnpm generate:test-cases`), so both can be rebuilt from source.

### Changed

- Retested the 4 defects after BookFlow fixed them (#57–#60): removed the `test.fail()` marks and the
  color-contrast baseline, and TC-API-11 now checks the new price maximum (10,000,000).
- Test cases: 47 pass, 0 fail, 1 not run (42 automated). Bug reports, summary report and README updated.

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

[1.1.0]: https://github.com/lucaswsanchez/bookflow-qa/releases/tag/v1.1.0
[1.0.0]: https://github.com/lucaswsanchez/bookflow-qa/releases/tag/v1.0.0
