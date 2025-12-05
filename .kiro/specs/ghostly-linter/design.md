# Ghostly Linter - Technical Design

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Altar.tsx (Main Component)                │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  - globalErrors: Array<ErrorInfo>                           │
│  - isScreaming: boolean                                     │
│  - showErrorPanel: boolean                                  │
│  - isAutoFixing: string | null                              │
├─────────────────────────────────────────────────────────────┤
│  Functions:                                                  │
│  - analyzeAllFilesForErrors(files) → ErrorInfo[]            │
│  - handleGoToError(error) → void                            │
│  - handleAutoFixError(error) → void                         │
│  - applyAutoFix(content, error) → FixResult                 │
│  - performMassAutoFix() → { totalFixed, fixLog }            │
└─────────────────────────────────────────────────────────────┘
```

## Data Structures

```typescript
interface ErrorInfo {
    type: 'SYNTAX' | 'DANGER' | 'CURSE' | 'DEBT';
    message: string;
    line?: number;
    fileName: string;
    fileIndex: number;
    code?: string;
}

interface FixResult {
    fixed: boolean;
    newContent: string;
    fixDescription: string;
}
```

## Error Detection Rules

| Type | Pattern | Severity |
|------|---------|----------|
| SYNTAX | Unbalanced `{}` or `()` | Critical |
| DANGER | `eval()` usage | Critical |
| DANGER | Empty catch block | Critical |
| CURSE | `var` declaration | Warning |
| CURSE | `any` type annotation | Warning |

## Audio System

```typescript
// Scream loop management
const screamAudioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
    const hasCriticalErrors = globalErrors.some(
        e => e.type === 'SYNTAX' || e.type === 'DANGER'
    );
    
    if (hasCriticalErrors && !isScreaming) {
        const audio = new Audio('/assets/grito.mp3');
        audio.loop = true;
        audio.volume = 0.25;
        audio.play();
        screamAudioRef.current = audio;
        setIsScreaming(true);
    } else if (!hasCriticalErrors && isScreaming) {
        screamAudioRef.current?.pause();
        setIsScreaming(false);
    }
}, [globalErrors]);
```

## UI Components

### Error Indicator (Header)
- Clickable button showing error count
- Pulsing animation when screaming
- Opens/closes error panel

### Error Panel
- Max height 200px with scroll
- Each error shows: icon, filename, line, message
- Action buttons: 📍 IR, 🔧 FIX
- Header has 🔧 FIX ALL button
