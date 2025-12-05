---
name: File Drop Handler
description: Processes files dropped into the Ouija Chat
trigger: onDrop
filePattern: "**/*"
---

# File Drop Handler Hook

When files are dropped into the Ouija Chat panel, this hook processes them and adds them to the offerings queue for the ghost to analyze.

## Trigger

- Drag & drop files from file explorer
- Drag & drop from Code Necromancer's file tree sidebar

## Actions

1. **Validate File**
   - Check if file is readable text
   - Detect language from extension

2. **Create Offering**
   ```typescript
   {
       id: uuidv4(),
       text: fileContent,
       intent: 'explain', // or 'refactor' for external drops
       fileName: file.name,
       timestamp: Date.now()
   }
   ```

3. **Add to Queue**
   - Display in offerings panel
   - Show file name and size
   - Allow removal before sending

4. **Inject Context**
   - When user sends message, inject file content
   - Use `sendFileContext()` for Live API
   - Include clear instructions for ghost

## Live API Integration

For voice chat sessions:
```typescript
// Send file context before audio
liveSession.sendFileContext(fileName, content);

// Then send user's instruction
liveSession.sendContext(instruction);
```
