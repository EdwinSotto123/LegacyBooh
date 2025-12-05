---
name: Ghost Agent Switch
description: Handles switching between ghost agents during a session
trigger: manual
---

# Ghost Agent Switch Hook

When the user switches to a different ghost agent during an active session, this hook ensures smooth transition of context and personality.

## Trigger

Manual trigger when user clicks on a different ghost persona card.

## Actions

1. **Save Current Context**
   - Store conversation history
   - Save analyzed files list
   - Preserve user preferences

2. **Update System Prompt**
   - Load new ghost's identity
   - Apply specialized expertise
   - Set personality traits

3. **Configure Voice**
   ```typescript
   setCurrentPersonaGender(newGhost.gender);
   // Male ghosts → 'Puck'
   // Female ghosts → 'Aoede'
   ```

4. **Reconnect Live Session** (if active)
   - Close existing WebSocket
   - Create new session with updated config
   - Re-inject project context

5. **Play Transition Effect**
   - Fade out current ghost
   - Play summoning sound
   - Fade in new ghost with intro

## Agent Handoff Message

When switching agents, the new ghost acknowledges the handoff:

```
"*materializes from the shadows* Ah, I see ${previousGhost.name} couldn't 
handle this one. I'm ${newGhost.name}. Let me take a look at what you've 
got here..."
```

## Context Preservation

The following is passed to the new agent:
- List of files in project
- Current file being viewed
- Recent conversation summary
- Any pending offerings in queue
