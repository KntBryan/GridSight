---
name: Responsive Layout and Theme Contrast
description: Audit and improve a web app so its layouts fit small through large screens without collisions and its text remains readable in light and dark themes.
argument-hint: "[routes, components, or screen sizes to prioritize]"
agent: agent
---

Make the web system responsive across screen sizes and fix text or controls that become difficult to see in either light or dark mode. Prioritize: $ARGUMENTS

If no routes or components are specified, inspect the main user flows and shared layout first, then check the other routes that reuse those components.

## Workflow

1. Inspect the existing framework, design system, breakpoints, theme implementation, shared navigation, forms, dialogs, tables, and relevant tests before editing. Search for existing responsive or theme-aware patterns and reuse them.
2. Reproduce the problem at representative viewport widths, including narrow phones (320–375px), larger phones, tablet widths, and desktop. Include widths around every breakpoint, not only the breakpoint values. Check both light and dark themes.
3. Find the underlying cause of each overlap, clipping, horizontal overflow, or low-contrast text. Make focused changes using existing components and styling conventions; do not hide meaningful content or apply broad CSS overrides as a substitute for fixing layout constraints.
4. Make layouts resilient to long labels, user-provided content, localization, and browser zoom. Allow appropriate wrapping or scrolling for content such as tables and navigation; keep dialogs within the viewport and their contents reachable.
5. Ensure theme-specific text, icons, placeholders, borders, controls, empty states, and hover/focus states have sufficient contrast against their actual backgrounds. Avoid hard-coded light text on light surfaces or dark text on dark surfaces. Use complete statically discoverable utility classes when the project relies on utility-class generation.
6. Add or update targeted tests when the project has suitable coverage. Verify the changed routes and responsive breakpoints with the project’s existing checks and, when available, browser automation. Confirm there is no unintended page-level horizontal overflow, clipping, or element collision at the tested sizes.

## Constraints

- Preserve the current visual language and behavior except where changes are needed to meet the requirements.
- Keep fixes small and scoped to the components or styles that cause the problem.
- Do not add dependencies or restructure unrelated code.
- Report the files changed, the viewports/themes checked, the validation run, and any remaining limitations.
