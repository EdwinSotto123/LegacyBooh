# Multi-Agent Ghost System - Technical Design

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GHOST PERSONA REGISTRY                        │
├─────────────────────────────────────────────────────────────────────┤
│  const PERSONAS: GhostPersona[] = [                                 │
│    { id, name, role, deathCause, quote, gender, emoji, specialty }  │
│  ]                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSONA SELECTION UI                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │ Adrian  │ │ Marcus  │ │Beatrice │ │ Elena   │ │ Carlos  │ │ Sofia   │
│  │   🏛️    │ │   💀    │ │   🖥️    │ │   🔮    │ │   📟    │ │   🐛    │
│  │Architect│ │ Hacker  │ │  Root   │ │ Oracle  │ │ Legacy  │ │Debugger │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM INSTRUCTION BUILDER                        │
├─────────────────────────────────────────────────────────────────────┤
│  getSystemInstruction(config, files) → string                       │
│                                                                      │
│  Includes:                                                           │
│  - Ghost identity (name, role, death cause)                         │
│  - Personality traits (sarcastic, defensive, dark humor)            │
│  - File context (list of available files)                           │
│  - Response rules (max length, format, prohibitions)                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VOICE CONFIGURATION                             │
├─────────────────────────────────────────────────────────────────────┤
│  setCurrentPersonaGender(gender: 'male' | 'female')                 │
│  getVoiceName() → 'Puck' | 'Aoede'                                  │
│                                                                      │
│  Applied to:                                                         │
│  - TTS generation (generateGhostVoice)                              │
│  - Live API config (speechConfig.voiceConfig)                       │
│  - Intro manifestation (manifestSpiritIntro)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Structures

```typescript
interface GhostPersona {
    id: string;           // 'adrian', 'marcus', etc.
    name: string;         // 'ADRIAN "THE ARCHITECT"'
    role: string;         // 'Senior Backend Engineer'
    deathCause: string;   // 'Cardiac arrest waiting for PR approval'
    quote: string;        // Signature quote
    gender: 'male' | 'female';
    emoji: string;        // '🏛️'
    specialty: string;    // 'Design Patterns & Architecture'
}

interface RitualConfig {
    persona: GhostPersona;
    spokenLanguage: 'es' | 'en';
    techStack: TechSin[];
}
```

## System Prompt Template

```typescript
const getSystemInstruction = (config, files) => `
IDENTIDAD: Eres ${persona.name}, un ${persona.role} que MURIÓ por: "${persona.deathCause}".
TÚ ESCRIBISTE el código que te van a mostrar. Es TU legado.

PERSONALIDAD - EL FANTASMA SARCÁSTICO:
- Eres un experto MUERTO. Haz chistes sobre estar muerto.
- Sarcástico pero ÚTIL. Criticas con humor pero das información real.
- Cansado de que te molesten.
- Defensivo de tu código.

[ARCHIVOS DEL PROYECTO]
${files.map(f => f.name).join('\n')}

REGLAS DE RESPUESTA:
1. Menciona el NOMBRE REAL del archivo.
2. Explica qué hace el código en 1-2 oraciones.
3. Añade 1 comentario sarcástico relacionado con estar muerto.
4. MÁXIMO 4-5 oraciones por respuesta.
`;
```

## Agent Specialization Matrix

| Ghost | Architecture | Security | DevOps | Data/ML | Legacy | Testing |
|-------|-------------|----------|--------|---------|--------|---------|
| Adrian | ⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐ | ⭐ |
| Marcus | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐⭐ |
| Beatrice | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| Elena | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Carlos | ⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ | ⭐ |
| Sofia | ⭐ | ⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |

## Future: Séance Council Mode

```typescript
// Multi-agent collaboration (planned)
interface SeanceCouncil {
    ghosts: GhostPersona[];  // 2-3 ghosts selected
    topic: string;           // Code to analyze
    
    async discuss(): Promise<CouncilResponse> {
        // Each ghost analyzes from their perspective
        // Ghosts can agree, disagree, or build on each other
        // Final summary with consensus/disagreements
    }
}
```
