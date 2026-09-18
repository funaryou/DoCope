# Design System: DoCope — Signal Atlas

## Design premise

DoCope is a local index for developers who keep AI conversation logs, study notes, and implementation documents inside separate project folders. Its job is to make those project roots and their files quickly discoverable in a browser. The required items are: project name, root path, description, dates, project icon, folder tree, file name/path, file contents, and register/edit/delete actions.

This document intentionally does not inherit visual decisions from previous project documents. It defines a new direction from the functional model only.

## Brand Mark Direction

DoCope's mark is a viewing instrument for documents: a bold scope or telescope lens containing a restrained folded-page silhouette. The circular lens represents `scope`—discovering and inspecting documents—while the page shape keeps the product purpose legible. Prefer a compact geometric symbol that remains recognizable at 24px, with the DoCope wordmark set separately rather than embedded inside the mark.

- **Primary mark:** scope ring + subtle document/page edge
- **Accent:** Primary Signal Vermilion (`#E06445`)
- **Support colors:** Deep Charcoal (`#111315`) and Warm Off-White (`#F2F0EA`)
- **Avoid:** literal star-gazing imagery, planets, generic folder icons, gradients, glossy 3D treatment, and text inside the icon

## 1. Visual Theme & Atmosphere

**Signal Atlas** is a dark, high-contrast local indexing terminal: part field instrument, part map legend, part developer workbench. It should feel precise and energetic, not cozy or archival. The home screen is a large index with rows that feel like map coordinates. The workspace is a navigation instrument: a narrow project strip, a tree column, and a reading viewport.

Density is **Cockpit Dense** (8/10), variance is **Offset Asymmetric** (7/10), and motion is **Fluid CSS** (5/10). The visual identity comes from a charcoal canvas, hairline grid rules, numbered metadata, compact typography, one warm vermilion signal color, and occasional project-color markers. It must not look like a card gallery or an IDE clone.

## 2. Color Palette & Roles

- **Night Canvas** (`#111315`) — global background and the empty space around content.
- **Panel Graphite** (`#181B1E`) — side rails, index header, modal surface.
- **Raised Slate** (`#20252A`) — project rows, inputs, selected content wells.
- **Line Graphite** (`#343A40`) — grid rules, separators, and inactive borders.
- **Primary Signal** (`#E06445`) — the only accent: primary actions, active route, focus, and current file marker.
- **Signal Deep** (`#B94831`) — pressed and destructive-adjacent emphasis.
- **Signal Tint** (`#3A2520`) — selected row background, never a glow.
- **White Ink** (`#F2F0EA`) — headings and essential content.
- **Cool Ink** (`#B8BEC2`) — descriptions and regular UI text.
- **Dim Ink** (`#737B82`) — paths, dates, helper copy, and inactive metadata.
- **Warning Red** (`#D46A61`) — validation errors and deletion only.

Use only this neutral family plus Primary Signal. Stored project colors are identity data, not decoration: render them as a 4px vertical marker or a 20px dot. Never tint an entire project row.

## 3. Typography Rules

- **Display/UI:** `Satoshi`, `Avenir Next`, `Noto Sans JP`, sans-serif. Compact, technical, and weight-led. Headings are never oversized; use `clamp(1.5rem, 3vw, 2.8rem)`.
- **Body:** `Noto Sans JP`, `Hiragino Sans`, `Yu Gothic`, sans-serif, 1rem minimum, 1.65 line-height.
- **Index/meta:** `JetBrains Mono`, `SFMono-Regular`, `Menlo`, monospace. All dates, paths, extensions, counts, row indices, and file metadata use mono.

No serif is used. The product should read as a precise tool, not an editorial archive. Use uppercase micro-labels sparingly with `0.12em` tracking. Never rely on font size alone; pair size with ink brightness and rule placement.

## 4. Component Stylings

- **Top command strip:** a 56px horizontal band with a wordmark at left, current context in the middle, and one primary action at right. On the home screen it becomes an index header, not a centered hero.
- **Project index rows:** replace equal cards with a numbered, two-zone list. Each row has a marker, project name/path, description, dates, and a right-aligned route affordance. Rows are separated by hairlines and may use a shallow two-column grid on wide screens.
- **Project rail:** workspace projects are 52px square tiles in a narrow vertical rail. Selected state is a vermilion side bar plus a dark signal-tint well. Unselected icons use strong light ink and never disappear into the rail.
- **Tree:** a dense catalog with 30px rows, explicit indentation, monospaced file extensions, and a red left rule for the selected file. Folder expansion is shown by a rotated chevron.
- **Viewer:** the largest zone is a dark reading viewport. Its header shows a file index, full path, and render/code modes. Code and raw content use a slightly raised slate well, not a white paper sheet.
- **Buttons:** 6px radius, squared corners with a tiny 2px notch-like visual edge, no gradients or glow. Primary is vermilion with dark text; secondary is transparent with a graphite border. Active state moves down 1px.
- **Inputs:** graphite fill, 1px line border, 6px radius, label above, clear focus ring in Primary Signal, helper text below. No floating labels.
- **Modal:** compact terminal dialog in Panel Graphite, strong top rule, clear action row. Destructive action uses Warning Red and explicit text.
- **Empty/error states:** use a coordinate-like symbol, short explanatory copy, and one action. No emoji, generic spinner, or decorative illustration.

## 5. Layout & Item Placement

Home uses a full-height shell with a 56px command strip and a centered index region capped at 1280px. The project index occupies the main width; the register button sits in the command strip. Rows are not floating cards. On large screens, metadata and the route affordance occupy a stable right rail.

Workspace uses three explicit columns: `52px project rail / minmax(220px, 280px) tree / minmax(0, 1fr) viewer`. The tree and viewer have a 16px gap on desktop and 12px vertical breathing room from the shell. The viewer must remain the dominant area. On mobile, the rail becomes a 56px horizontal strip, then the tree and viewer stack in one column.

Use CSS Grid, `min-height: 100dvh`, fixed minimum touch targets of 44px, and no overlapping content. Below 768px all multi-column content collapses to one column; no horizontal page scroll is allowed.

## 6. Motion & Interaction

Use `180ms cubic-bezier(.22,1,.36,1)` for hover/focus and a `stiffness: 100, damping: 20` spring feel for route changes. Project rows reveal with a 25ms stagger; workspace content swaps with opacity and a 4px transform only. Never animate layout dimensions, shadows, or positions across large distances. Respect reduced motion.

## 7. NEVER DO

- Never reuse the previous beige paper, corkboard, sticky-note, pinboard, or Quiet Archive vocabulary.
- Never use white cards floating on a warm background as the main home layout.
- Never use a teal/green accent, pastel palette, purple/blue neon, or gradient glow.
- Never use a serif font, emoji icon, generic 3-column card grid, oversized centered hero, or fake dashboard statistics.
- Never hide project identity in low-contrast icons; unselected rail icons must remain clearly visible.
- Never let stored project colors fill a row or panel.
- Never use “Elevate”, “Seamless”, “Unleash”, “Next-Gen”, or other generic AI marketing copy.
