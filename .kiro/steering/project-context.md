# Code Necromancer - Project Context

## Project Overview
Code Necromancer is a horror-themed legacy code analysis and migration tool built with React, TypeScript, and the Gemini API. It allows developers to "summon ghost programmers" who analyze, roast, and help migrate legacy codebases.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS with custom horror theme
- **AI**: Google Gemini API (2.5 Flash, Live API, TTS)
- **Audio**: Web Audio API for real-time voice processing
- **Visualization**: Mermaid.js for code flow diagrams

## Key Features
1. **Ghost Personas**: 6 unique developer ghosts with different specialties
2. **Live Seance**: Real-time voice chat with AI using Gemini Live API
3. **Ghostly Linter**: Global error detection with screaming alerts
4. **Mass Exorcism**: Batch code migration with auto-fix
5. **Testament**: AI-powered project analysis and documentation

## File Structure
```
/components
  - Altar.tsx       # Main IDE component with editor and tools
  - OuijaChat.tsx   # Voice/text chat interface
  - Typewriter.tsx  # Animated text effect
/services
  - geminiService.ts # All Gemini API integrations
/types
  - index.ts        # TypeScript interfaces
```

## Coding Standards
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use TailwindCSS for styling (horror theme: reds, blacks, ambers)
- Keep functions small and focused
- Add sarcastic comments in ghost persona style
