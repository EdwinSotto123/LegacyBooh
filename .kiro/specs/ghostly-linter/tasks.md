# Ghostly Linter - Implementation Tasks

## Phase 1: Core Detection
- [x] Task 1.1: Add global error state to Altar.tsx
- [x] Task 1.2: Create `analyzeAllFilesForErrors` function
- [x] Task 1.3: Add useEffect to analyze files on change
- [x] Task 1.4: Implement error type classification

## Phase 2: Audio Feedback
- [x] Task 2.1: Add scream audio ref and state
- [x] Task 2.2: Create useEffect for scream loop management
- [x] Task 2.3: Implement volume control (25% default)
- [x] Task 2.4: Add cleanup on component unmount

## Phase 3: UI Components
- [x] Task 3.1: Create error indicator button in header
- [x] Task 3.2: Build expandable error panel
- [x] Task 3.3: Style errors by type (colors, icons)
- [x] Task 3.4: Add pulsing animation for critical state

## Phase 4: Navigation & Actions
- [x] Task 4.1: Implement `handleGoToError` function
- [x] Task 4.2: Create "IR" button for each error
- [x] Task 4.3: Switch to correct file on navigation

## Phase 5: Auto-Fix System
- [x] Task 5.1: Create `applyAutoFix` function
- [x] Task 5.2: Implement fix for `var` → `let`
- [x] Task 5.3: Implement fix for `any` → `unknown`
- [x] Task 5.4: Implement fix for `eval()` (comment out)
- [x] Task 5.5: Implement fix for empty catch
- [x] Task 5.6: Implement fix for unbalanced braces
- [x] Task 5.7: Create `handleAutoFixError` for single fix
- [x] Task 5.8: Create `performMassAutoFix` for batch fix
- [x] Task 5.9: Add "FIX" button per error
- [x] Task 5.10: Add "FIX ALL" button in panel header

## Phase 6: Integration
- [x] Task 6.1: Integrate with Mass Exorcism feature
- [x] Task 6.2: Add error stats to Testament analysis
- [x] Task 6.3: Update CHANGES.md generation with fix log
