---
name: Ghostly Linter Check
description: Analyzes saved files for cursed code patterns
trigger: onSave
filePattern: "**/*.{ts,tsx,js,jsx}"
---

# Ghostly Linter Hook

When a TypeScript or JavaScript file is saved, this hook triggers the Ghostly Linter to check for cursed code patterns.

## Patterns Detected

1. **SYNTAX Errors** (Critical - triggers screaming)
   - Unbalanced brackets `{}`
   - Unbalanced parentheses `()`

2. **DANGER Errors** (Critical - triggers screaming)
   - `eval()` usage
   - Empty catch blocks `catch(e) {}`

3. **CURSE Warnings**
   - `var` declarations (should use `let` or `const`)
   - `any` type annotations in TypeScript

## Actions

- If critical errors found: Play scream loop, show red pulsing indicator
- If only warnings: Show amber indicator
- Update global error count in header
- Log to telemetry panel

## Auto-Fix Available

The hook can suggest auto-fixes for:
- `var` → `let`
- `any` → `unknown`
- `eval()` → Comment out with warning
- Empty catch → Add `console.error()`
