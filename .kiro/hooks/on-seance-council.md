---
name: Séance Council Mode
description: Enables multi-agent collaboration with multiple ghosts
trigger: manual
---

# Séance Council Mode Hook

Activates a special mode where multiple ghost agents discuss the code together, providing diverse perspectives.

## Trigger

Manual trigger via "Summon Council" button (future feature).

## Configuration

```typescript
interface CouncilConfig {
    ghosts: GhostPersona[];  // 2-3 selected ghosts
    topic: string;           // Code or question to discuss
    mode: 'debate' | 'consensus' | 'review';
}
```

## Discussion Modes

### Debate Mode
- Ghosts argue from their perspectives
- Adrian vs Marcus on architecture vs security
- Entertaining and educational

### Consensus Mode
- Ghosts try to agree on best approach
- Each contributes their expertise
- Final summary with recommendations

### Review Mode
- Sequential analysis by each ghost
- Architecture → Security → Testing
- Comprehensive code review

## Turn-Based Flow

```
1. User submits code/question
2. Ghost 1 analyzes from their specialty
3. Ghost 2 responds, may agree/disagree
4. Ghost 3 adds their perspective
5. Moderator (system) summarizes
```

## Example Output

```
🏛️ ADRIAN: "The architecture here is solid, but those 
   singleton patterns are giving me flashbacks to my death..."

💀 MARCUS: "Adrian's right about structure, but I'm seeing 
   3 SQL injection vectors. Did anyone review this?"

🐛 SOFIA: "I found 12 untested edge cases. No wonder 
   Marcus found vulnerabilities - there are no tests!"

📊 COUNCIL SUMMARY:
- Architecture: ✅ Approved (Adrian)
- Security: ⚠️ 3 issues found (Marcus)  
- Testing: ❌ Coverage needed (Sofia)
```

## Future Implementation

This hook documents the planned multi-agent collaboration feature for future development.
