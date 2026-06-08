# Dash.fi Internal Product Brand System

Last updated: May 29, 2026

## Purpose

This document defines a reusable visual and UX brand system for Dash.fi internal tools, knowledge surfaces, learning experiences, dashboards, enablement hubs, and operational workflows.

The goal is to make Dash.fi software feel like one coherent operating system: premium, practical, fast to scan, and built for people doing real work.

This guide is intentionally generic. It can apply to the KB Home page, Learning Hub, sales enablement surfaces, internal dashboards, coaching tools, admin workflows, reporting views, and future product-adjacent internal apps.

## Brand Position

Dash.fi internal software should feel like a focused operating cockpit.

It should be:

- Clear before clever.
- Premium without feeling precious.
- Operational, not decorative.
- Dense enough for work, calm enough for repeated daily use.
- Helpful without over-explaining itself.
- Branded without becoming a marketing page.

## Core UX Promise

Every Dash.fi internal surface should answer at least one of these questions quickly:

- What needs my attention?
- Where should I go next?
- What changed?
- What am I responsible for?
- What can I do from here?
- What is the current state?

If a screen does not answer one of those questions, it is probably just decoration or navigation debt.

## Design Principles

### 1. Build App Surfaces, Not Static Pages

Dash.fi internal tools should feel interactive and useful. A page should not be a passive list unless the list itself is the workflow.

Use app-surface patterns for:

- Dashboards
- Learning hubs
- Home pages
- Training modules
- Analytics views
- Workflow launchers
- Admin tools

### 2. Make Navigation Obvious

The first viewport should make the user's next move clear.

Good navigation surfaces include:

- Start here
- Continue
- Recently updated
- Popular
- Assigned
- Needs review
- Team spaces
- Reports
- Coming soon

Avoid vague buckets like "Resources" or "More" unless the contents are obvious.

### 3. Use Density With Discipline

Dash.fi users are usually trying to complete a task, coach a rep, find a document, review data, or prepare for a conversation. Interfaces should be scannable and compact without becoming cramped.

Use whitespace for grouping and hierarchy, not empty decoration.

### 4. Prefer Real Data Over Decorative UI

Cards, panels, badges, charts, and widgets should represent real state or real actions.

Use existing data first:

- Recent activity
- Assigned work
- Completion state
- Popularity
- Ownership
- Status
- Collection/team context
- Scores or outcomes

Avoid fake metrics, empty widgets, or algorithmic recommendations unless the underlying data model is ready.

### 5. Make Future Features Honest

If something is planned but not active, label it clearly as "Coming soon."

Do not make inactive features look clickable.

## Visual Language

The visual system combines a soft operational background, dark high-signal panels, precise metadata, and sharp Dash.fi blue actions.

The feeling should be:

- Calm base
- Strong focal points
- Crisp metadata
- Clear actions
- Minimal decoration

## Color System

These values are based on the live Learning Hub implementation and can be reused across Dash.fi internal app surfaces.

| Token           | Hex       | Use                                         |
| --------------- | --------- | ------------------------------------------- |
| Paper           | `#f7f5ef` | App background for branded surfaces         |
| Surface         | `#fffcf5` | Cards, panels, elevated sections            |
| Rule            | `#dedad1` | Borders, dividers, soft structure           |
| Ink             | `#20302d` | Primary text                                |
| Muted           | `#777a73` | Secondary text, descriptions, metadata      |
| Dark            | `#1c2018` | Hero/status panels, primary dark actions    |
| Dark Soft       | `#25283a` | Secondary dark accents                      |
| Dash Blue       | `#354cef` | Primary action, links, selected states      |
| Lime            | `#edff3d` | Completion, achievement, high-energy accent |
| Lavender        | `#ececff` | Soft selected/pill surface                  |
| Success Surface | `#e9f8f1` | Success/completed background                |
| Success Text    | `#26724d` | Success/completed text                      |
| Warning Surface | `#fff7e6` | Warning/designing background                |
| Warning Text    | `#8a5a00` | Warning/designing text                      |

## Color Rules

### Dash Blue

Use for primary actions, selected navigation, links, and the most important action in a section.

Do not use Dash Blue everywhere. It should point the user toward the next action.

### Dark Panels

Use dark panels for high-signal areas:

- Status summaries
- Primary workflow headers
- Important command surfaces
- Featured module areas

Dark panels should contain real utility. Do not use them only as decoration.

### Lime

Use lime sparingly for:

- Completed state
- Progress highlights
- Achievement
- Certification/pass indicators

Lime should feel earned, not ornamental.

### Paper And Surface

Use Paper as the branded page background. Use Surface for cards and panels.

Avoid pure white as the dominant background on custom surfaces unless the surrounding product shell requires it.

## Typography

### Headings

Headings should be distinctive but not theatrical.

Use larger expressive headings only when the section is truly a primary screen header. Inside dashboards, cards, sidebars, and compact panels, use tighter smaller headings.

### Metadata

Use monospaced metadata for operational labels, statuses, counters, and section markers.

Recommended stack:

```css
"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace
```

Metadata can use uppercase and moderate letter spacing when it improves scanability.

### Body Copy

Body copy should be short and specific.

Good:

- "Practice discovery-first positioning against SoFi with checkpoint questions."
- "A scored path for discovery, positioning, objection handling, and follow-up discipline."
- "Recently updated docs from your team spaces."

Avoid:

- "Use this section to access helpful resources."
- "Click the button below to get started."
- "Welcome to your centralized dashboard experience."

## Layout System

### Desktop

Use the full available app canvas when the surface is navigational, analytical, or dashboard-like.

Recommended patterns:

- Full-width app page with constrained inner content.
- Responsive grids using `auto-fit` and `minmax`.
- Clear section bands.
- Compact cards for repeated items.
- High-signal summary area near the top.

Avoid narrow document columns for dashboard surfaces.

### Mobile

Mobile layouts should stack cleanly and remain useful.

Requirements:

- No horizontal overflow.
- No text overlap.
- Touch targets remain usable.
- Important actions appear before secondary lists.
- Cards do not require hover behavior.

## Component Guidance

### Cards

Use cards for repeated or contained functional units:

- Modules
- Documents
- Reports
- Team spaces
- Workflow shortcuts
- Analytics summaries
- Coming soon features

Recommended treatment:

- Border radius: 8px or less.
- Border: subtle Rule color.
- Background: Surface.
- Shadow: minimal.
- Padding: enough for scanning, not display-card drama.

Avoid cards inside cards.

### Panels

Use panels for grouped context or high-signal summaries.

Good panel uses:

- "This week"
- "First rollout"
- "Open coaching items"
- "Training progress"
- "Pipeline health"

Panels should not become decorative hero blocks unless they are anchoring a true first-screen experience.

### Buttons

Buttons should name concrete commands:

- Continue
- Review
- Start module
- Browse modules
- New doc
- Open report
- View collection
- Export

Use primary button styling for the main action only. Use quieter secondary styles for supporting actions.

### Status Pills

Use status pills to communicate state.

Common states:

- Completed
- In progress
- Not started
- Needs review
- Draft
- Designing
- Coming soon
- Blocked

Status should be readable without relying on color alone.

### Progress

Progress should show both state and amount when possible.

Good:

- `45%`
- `4 of 6 complete`
- `80% pass`
- `3 tasks remaining`

Avoid vague progress labels like "Almost there" unless paired with real numbers.

## Common Surface Patterns

### Navigation Cockpit

Use for home pages, hubs, and start screens.

Recommended sections:

- Search or command area
- Start here
- Continue
- Recently updated
- Popular
- Team spaces
- Shortcuts

### Learning Cockpit

Use for LMS, onboarding, certification, and enablement.

Recommended sections:

- Assigned modules
- Progress state
- Role tracks
- Practice modules
- Certification
- Coming soon surfaces

### Analytics Cockpit

Use for dashboards and reporting.

Recommended sections:

- High-signal summary
- Trend or comparison
- Exceptions
- Team/member breakdown
- Next actions
- Export/share

### Workflow Cockpit

Use for tools that help a user execute a process.

Recommended sections:

- Current step
- Required inputs
- Output preview
- Review state
- Submit/export action
- History or recent runs

## Copy And Voice

Dash.fi product copy should be direct and operational.

Use:

- Short labels.
- Specific nouns.
- Active verbs.
- Clear state.
- Minimal explanation.

Avoid:

- Marketing claims.
- Abstract benefit statements.
- Long instructional copy.
- Cute empty states.
- In-app explanations of obvious UI.

## Accessibility Requirements

Every branded surface should preserve:

- Keyboard navigation.
- Semantic links and buttons.
- Visible focus states.
- Sufficient color contrast.
- Non-color state indicators.
- Accessible names for icon-only controls.
- Clear labels for progress and status.

## Responsive QA Checklist

Before shipping:

- Desktop screenshot reviewed.
- Mobile screenshot reviewed.
- No horizontal overflow.
- No incoherent text overlap.
- Buttons and cards remain stable across viewport sizes.
- Main action is visible without hunting.
- Console has no relevant errors.
- Existing routes still work.
- `yarn lint:changed` passes.
- `yarn tsc` passes.
- `yarn vite:build` passes for larger changes.

## Implementation Rules

When implementing this system:

- Reuse existing product primitives first.
- Keep changes scoped to the surface being redesigned.
- Avoid new global design abstractions until at least two surfaces need them.
- Use real data where available.
- Label inactive features as "Coming soon."
- Do not add a new backend model just to make a page feel richer.

## Example Applications

### KB Home

Home should be a navigation cockpit:

- Search
- Start Here
- Continue Reading
- What Changed
- Popular Answers
- Team Spaces

### Learning Hub

Learning should be a training cockpit:

- Assigned modules
- Progress
- Role tracks
- Practice
- Certification
- Future surfaces marked Coming soon

### My Progress

My Progress should be a learner profile:

- Completed modules
- In-progress modules
- Assigned but not started
- Scores
- Badges or certifications
- Coaching follow-up

### Leaderboard

Leaderboard should be a gamification surface:

- Completion rankings
- Score rankings
- Badges
- Team-level progress
- Time-to-completion

This should remain a future surface until the scoring model and behavior incentives are validated.

## Reference Files

- Learning Hub implementation: `outline/app/scenes/Learning.tsx`
- Home implementation: `outline/app/scenes/Home.tsx`
- Learning Hub desktop screenshot: `brand-reference/learning-hub-wide-desktop-final-2.png`
- Learning Hub mobile screenshot: `brand-reference/learning-hub-wide-mobile-final.png`
