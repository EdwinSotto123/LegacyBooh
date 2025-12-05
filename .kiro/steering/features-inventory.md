# Code Necromancer - Features Inventory

## Complete Feature List (Verified from Code)

### 🎨 UI/UX Features

#### Dark Mode / Horror Theme
- **Background**: Deep blacks (#0a0505, #0c0c0c, #0f0505)
- **Primary**: Blood red (#ef4444, #dc2626)
- **Secondary**: Amber/gold (#f59e0b)
- **Accent**: Purple for mystical (#7c3aed)
- **Selection**: `selection:bg-red-900 selection:text-white`

#### Animations
- `animate-burn-in` / `animate-burn-out` - Fire effects
- `animate-shake` - Error/exorcism shake
- `animate-pulse` - Pulsing alerts
- `animate-bounce` - Bouncing icons
- `animate-resurrect` - Undo/redo feedback
- Scanline effects on code editor

#### GIFs & Images
- `/assets/ouija_invocar.gif` - Ouija board animation during loading
- `/assets/Adrian.jpg`, `/assets/Marcus.jpg`, etc. - Ghost persona images
- Demon overlay during exorcism

### 🤖 Multi-Agent System (6 Ghosts)

| Agent | Specialty | Gender | Image |
|-------|-----------|--------|-------|
| Adrian | Architecture | Male | Adrian.jpg |
| Marcus | Security | Male | Marcus.jpg |
| Beatrice | DevOps | Female | Beatrice.jpg |
| Elena | ML/Data | Female | Elena.jpg |
| Carlos | Legacy | Male | Carlos.jpg |
| Sofia | Testing | Female | Sofia.jpg |

### 📝 Code Editor Features

#### Syntax Highlighting
- Custom `highlightCode()` function
- Token classes: `.token-comment`, `.token-string`, `.token-keyword`, `.token-function`, `.token-number`
- Language detection from file extension

#### Undo/Redo (Time Travel)
- Custom `useHistory` hook with refs
- `Ctrl+Z` for undo ("⏪ RESURRECTING...")
- `Ctrl+Shift+Z` or `Ctrl+Y` for redo ("⏩ FAST FORWARDING...")
- Visual feedback toast on action
- History preserved per file

#### Editor Layers
- Layer 1: Syntax highlighting (`<pre>` with highlighted code)
- Layer 2: Transparent textarea for editing
- Line numbers column
- Caret color: red (`caret-red-500`)

### 🔊 Sound System

#### Sound Effects (MP3)
- `/assets/grito.mp3` - Scream (errors, jumpscares)
- `/assets/disparo.mp3` - Gunshot (exorcism)
- `/assets/exorcismo.mp3` - Exorcism ritual
- `/assets/back_ground.mp3` - Ambient horror music
- `/assets/bug.mp3` - Bug detection
- `/assets/pisada.mp3` - Footstep navigation
- `/assets/testamento.mp3` - Testament writing

#### Audio Functions
- `playGlitchSound()` - WebAudio noise generator
- `playExorcismSound()` - Gunshot + bass thump
- `playSoundEffect(effect, volume)` - Generic player
- `startBackgroundMusic(volume)` - Looping ambient
- `startLoopAudio(src, volume)` - Custom loop
- `stopLoopAudio()` - Stop loop

#### Scream Loop System
- Continuous scream while critical errors exist
- `audio.loop = true` with 25% volume
- Auto-stops when errors fixed

### 💀 Ghostly Linter

#### Error Detection
- Unbalanced `{}` brackets
- Unbalanced `()` parentheses
- `var` declarations
- `eval()` usage
- `any` type annotations
- Empty catch blocks

#### Auto-Fix System
- `var` → `let`
- `any` → `unknown`
- `eval()` → Comment out
- Empty catch → `console.error()`
- Unbalanced braces → Add missing `}`

#### UI Components
- Global error indicator in header
- Expandable error panel
- Per-error "📍 IR" and "🔧 FIX" buttons
- "🔧 FIX ALL" batch button

### 🎤 Live Seance (Voice Chat)

#### Gemini Live API
- Model: `gemini-2.5-flash-native-audio-preview-09-2025`
- Real-time audio streaming
- Input/output transcription
- Gender-specific voices (Puck/Aoede)

#### Audio Processing
- Input: 16kHz PCM mono
- Output: 24kHz PCM mono
- WAV header injection for browser decoding
- Native downsampling via OfflineAudioContext

#### Features
- Microphone capture
- Audio visualizer
- Live transcript display
- Telemetry logging
- File context injection
- Offerings queue (drag & drop)

### ⚰️ Mass Exorcism

#### Migration System
- Batch processing all files
- Progress bar with percentage
- Live preview (before/after)
- Change log per file
- CHANGES.md generation

#### Phases
1. Auto-fix all errors
2. Apply migration rules
3. Generate documentation

### 📜 Testament (Project Analysis)

#### AI Analysis
- Project summary
- Purpose detection
- Tech stack identification
- Obsolete code detection
- Migration suggestions
- Technical debt list
- Recommendations

#### Output
- Modal with analysis results
- DETAIL.md generation
- Download option

### 🗂️ File Management

#### ZIP Upload
- JSZip for extraction
- Recursive folder support
- Language detection
- File tree visualization

#### File Tree
- Collapsible folders
- File icons
- Active file highlighting
- Drag & drop to chat

### 🔮 Spirit Web (Mermaid)

#### Code Visualization
- Mermaid.js flowcharts
- Dark theme configuration
- Expand to fullscreen
- Cache for performance

### 🎭 Context Menu (Spellbook)

#### Actions on Selection
- 🔮 Reveal Mysteries (explain)
- ⚠️ Risk Alteration (risk)
- 🛠️ Clean Selection (refactor)
- ⚰️ Exorcise (migrate)
- 🔥 Roast

### 📊 Curse Level Meter

- 3-bar indicator
- Green → Amber → Red
- Based on code quality metrics
- Pulsing animation at max level
