---
name: Post-Exorcism Documentation
description: Generates CHANGES.md after mass exorcism
trigger: manual
---

# Post-Exorcism Documentation Hook

After a Mass Exorcism (batch code migration) is completed, this hook generates comprehensive documentation of all changes made.

## Trigger

Manual trigger via the "COMENZAR EXORCISMO MASIVO" button in the Mass Exorcism modal.

## Actions

1. **Phase 1: Auto-Fix Errors**
   - Run `performMassAutoFix()` on all files
   - Log each fix applied with file name and line number
   - Count total errors corrected

2. **Phase 2: Code Migration**
   - Process each file for migration changes
   - Apply refactoring based on migration rules
   - Track changes per file

3. **Phase 3: Generate Documentation**
   - Create `CHANGES.md` with:
     - Timestamp
     - Files processed count
     - Auto-fixes applied
     - Migration changes
     - Summary statistics

## Output Format

```markdown
# 🔥 EXORCISM REPORT
> Generated: [timestamp]
> Processed: [X] files

## 🔧 Auto-Fixes Applied
- [filename] L[line]: [fix description]

## ⚡ Migration Changes
- [filename]: [changes applied]

## 📊 Summary
- Total files: X
- Errors fixed: Y
- Migration changes: Z
```
