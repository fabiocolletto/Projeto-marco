# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Governance guardrails for the miniApp-base branch, including CODEOWNERS, PR/issue templates and CI workflows.
- Operational playbooks (`docs/OPERATIONS.md`) and checklists for i18n, registry updates, schema evolution and releases.
- Schema validation tooling with AJV and i18n parity checks integrated into `schema-check.yml`.
- Docs linting pipeline (`docs-check.yml`) covering spelling, link validation and anchor checks.
- Release automation using Conventional Commits with `release.yml` and GitHub Pages deployment pipeline.

## [3.0.0] - 2023-??-??
### Added
- Modo single-miniapp com auto-load e catálogo oculto por configuração.
- Integração de licenciamento/assinaturas (Mercado Pago) via Worker.
- MiniApp PB Consignado (MVP) com guard de licença + paywall/subscribe.
- Temas, múltiplos usuários e tela cheia mantidos e testados.
