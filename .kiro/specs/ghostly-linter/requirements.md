# Ghostly Linter - Requirements

## Overview
A global error detection system that analyzes ALL files in the project and provides visual/audio feedback with auto-fix capabilities.

## User Stories

### US-1: Global Error Detection
**As a** developer using Code Necromancer  
**I want** the system to detect errors across ALL files  
**So that** I can see the health of my entire codebase at once

**Acceptance Criteria:**
- [ ] Analyzes all loaded files, not just the active one
- [ ] Detects: unbalanced brackets, `var` usage, `eval()`, `any` types, empty catch blocks
- [ ] Updates automatically when any file changes
- [ ] Shows total error count in header

### US-2: Screaming Alerts
**As a** developer  
**I want** audio feedback when critical errors exist  
**So that** I'm immediately aware of serious issues

**Acceptance Criteria:**
- [ ] Plays looping scream sound for SYNTAX or DANGER errors
- [ ] Stops automatically when all critical errors are fixed
- [ ] Volume is adjustable (default 25%)
- [ ] Visual pulsing animation accompanies audio

### US-3: Error Panel with Actions
**As a** developer  
**I want** to see all errors with navigation and fix options  
**So that** I can quickly resolve issues

**Acceptance Criteria:**
- [ ] Shows file name, line number, and error message
- [ ] "IR" button navigates to the error location
- [ ] "FIX" button auto-corrects the error
- [ ] "FIX ALL" button corrects all errors at once

### US-4: Auto-Fix Capabilities
**As a** developer  
**I want** automatic fixes for common issues  
**So that** I can save time on repetitive corrections

**Acceptance Criteria:**
- [ ] `var` → `let` or `const`
- [ ] `any` → `unknown`
- [ ] `eval()` → commented out with warning
- [ ] Empty catch → adds `console.error()`
- [ ] Unbalanced braces → adds missing closing braces
