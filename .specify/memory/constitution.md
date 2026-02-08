<!--
  Sync Impact Report
  ===================
  Version change: N/A → 1.0.0
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (5 principles)
    - Content & Documentation Standards
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ compatible (no changes needed)
    - .specify/templates/spec-template.md — ✅ compatible (no changes needed)
    - .specify/templates/tasks-template.md — ✅ compatible (no changes needed)
    - .specify/templates/checklist-template.md — ✅ compatible (no changes needed)
    - .specify/templates/agent-file-template.md — ✅ compatible (no changes needed)
  Follow-up TODOs: None
-->

# Hugr Documentation Site Constitution

## Core Principles

### I. Documentation Accuracy

All documentation MUST accurately reflect the current state of the
Hugr Data Mesh platform. Content MUST be reviewed for technical
correctness before publication. Outdated information MUST be updated
or removed promptly when the platform evolves.

- Every documented feature, API, or configuration option MUST
  correspond to actual platform behavior.
- Code examples and GraphQL queries MUST be tested and functional
  against the described platform version.
- When a feature is in development, it MUST be clearly marked with
  a status indicator (e.g., "(dev)", "(beta)").

**Rationale**: As the primary reference for Hugr platform users,
inaccurate documentation erodes trust and causes integration failures.

### II. User-Centric Structure

Documentation MUST be organized around user goals and workflows,
not internal architecture. Navigation MUST enable users to find
answers within three clicks from the documentation root.

- Content MUST follow the hierarchy: Overview → Concepts →
  Getting Started → Configuration → API Reference → Examples.
- Each documentation page MUST include frontmatter with `title`,
  `sidebar_position`, and `description`.
- File naming MUST use numeric prefixes for ordering
  (e.g., `1-overview.md`, `2-concept.md`).
- Cross-references between pages MUST use relative links.

**Rationale**: Users come to documentation with specific tasks;
structure MUST minimize time-to-answer.

### III. Consistency & Style

All content MUST follow a unified writing style, visual design,
and component usage pattern across the entire site.

- Markdown MUST use H2 (`##`) for main sections and H3 (`###`)
  for subsections within a page.
- Code blocks MUST specify the language for syntax highlighting
  (e.g., `graphql`, `yaml`, `sql`).
- Custom React components MUST be placed in `src/components/`
  using PascalCase directory names with `index.tsx` entry points.
- CSS MUST use CSS Modules (`styles.module.css`) scoped to
  components. Global styles MUST use CSS custom properties
  defined in `:root`.
- The Quicksand font and primary color `#1c7d78` MUST be
  maintained across all pages.

**Rationale**: Consistency reduces cognitive load and builds a
professional, trustworthy documentation experience.

### IV. Comprehensive Examples

Every feature and configuration option MUST include at least one
working code example. Complex features MUST include multiple
examples covering common use cases.

- Examples MUST use realistic data scenarios (e.g., the Northwind
  database for getting started guides).
- GraphQL query examples MUST show both the query and expected
  response structure.
- Configuration examples MUST include inline comments explaining
  each option.
- The `docs/9-examples/` directory MUST contain end-to-end
  examples for each supported data source type.

**Rationale**: Working examples are the most effective learning
tool; they bridge the gap between concepts and implementation.

### V. Accessible & Searchable Content

Documentation MUST be accessible to users of varying technical
backgrounds and MUST be optimized for discoverability through
search engines and in-site navigation.

- Page descriptions and titles MUST be descriptive and include
  relevant keywords (Data Mesh, GraphQL, data source types).
- Mermaid diagrams MUST be used for architectural and flow
  visualizations where they aid understanding.
- FAQ sections MUST address common setup and usage questions
  with direct links to relevant documentation pages.
- Content MUST NOT assume familiarity with Hugr-specific
  terminology without first defining it in the Concepts page.

**Rationale**: The documentation serves as the primary onboarding
path; accessibility directly impacts platform adoption.

## Content & Documentation Standards

- **Supported data sources** MUST each have a dedicated example
  in `docs/9-examples/`: PostgreSQL, DuckDB, MySQL, REST API,
  and spatial data sources at minimum.
- **Schema Definition Language (SDL)** documentation in
  `docs/4-engine-configuration/3-schema-definition/` MUST cover
  all directives listed in `docs/8-references/`.
- **Security documentation** (`docs/4-engine-configuration/5-access-control.md`)
  MUST document OAuth2/OIDC integration, field-level security,
  and row-level security with examples.
- **Deployment documentation** (`docs/7-deployment/`) MUST cover
  single-instance, clustered, and containerized deployments.
- Links in the footer navigation and sidebar MUST be validated
  to prevent broken references.
- All images and static assets MUST reside in `static/` with
  descriptive filenames.

## Development Workflow

- **Technology stack**: Docusaurus 3.x, React 19.x, TypeScript,
  CSS Modules, MDX.
- **Local development**: `yarn start` for development server;
  `yarn build` to validate production build before committing.
- **Build validation**: Every change MUST pass `yarn build`
  without errors or warnings before merging.
- **Link integrity**: Broken links detected during build MUST
  be fixed before merging. Docusaurus broken link detection
  MUST remain enabled.
- **Component development**: New UI components MUST follow the
  existing pattern in `src/components/` — PascalCase directory
  with `index.tsx` and `styles.module.css`.
- **Sidebar management**: The auto-generated sidebar
  (`sidebars.ts`) MUST be used; manual overrides are permitted
  only when auto-generation cannot express the desired structure.
- **Commit messages**: MUST follow conventional commits format
  (e.g., `docs:`, `feat:`, `fix:`).

## Governance

- This constitution supersedes ad-hoc documentation practices.
  All contributions to the documentation site MUST comply with
  these principles.
- **Amendments**: Changes to this constitution MUST be documented
  with a version bump, rationale, and updated `LAST_AMENDED_DATE`.
  Amendments follow semantic versioning:
  - MAJOR: Principle removal or backward-incompatible redefinition.
  - MINOR: New principle or materially expanded guidance.
  - PATCH: Clarifications, wording, or non-semantic refinements.
- **Compliance review**: Pull requests MUST be reviewed against
  the principles in this constitution. Reviewers SHOULD use the
  Constitution Check section in `plan-template.md` to verify
  alignment.
- **Guidance file**: The `agent-file-template.md` serves as the
  runtime development guidance reference for AI-assisted
  development workflows.

**Version**: 1.0.0 | **Ratified**: 2026-02-08 | **Last Amended**: 2026-02-08
