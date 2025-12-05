# Live Seance - Technical Design

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  OuijaChat.tsx Component                     │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  - isSeanceActive: boolean                                  │
│  - visualizerVolume: number (0-100)                         │
│  - liveTranscript: LiveTranscriptItem[]                     │
│  - telemetryLogs: string[]                                  │
│  - offerings: StagedContext[]                               │
├─────────────────────────────────────────────────────────────┤
│  Refs:                                                       │
│  - liveSessionRef: LiveSession                              │
│  - audioContextRef: AudioContext                            │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              geminiService.ts - connectLiveSeance            │
├─────────────────────────────────────────────────────────────┤
│  Returns:                                                    │
│  - sendAudio(data: Float32Array)                            │
│  - sendContext(text: string)                                │
│  - sendFileContext(fileName: string, content: string)       │
│  - close()                                                  │
├─────────────────────────────────────────────────────────────┤
│  Callbacks:                                                  │
│  - onAudioData(buffer: AudioBuffer)                         │
│  - onClose()                                                │
│  - onLog(message: string)                                   │
│  - onTranscript(sender, text)                               │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Gemini Live API (WebSocket)                     │
├─────────────────────────────────────────────────────────────┤
│  Model: gemini-2.5-flash-native-audio-preview-09-2025       │
│  Config:                                                     │
│  - responseModalities: [AUDIO]                              │
│  - inputAudioTranscription: {}                              │
│  - outputAudioTranscription: {}                             │
│  - systemInstruction: Ghost persona prompt                  │
└─────────────────────────────────────────────────────────────┘
```

## Audio Pipeline

### Input (User → Gemini)
```
Microphone → MediaStream → ScriptProcessor → Downsample to 16kHz → PCM → Base64 → sendRealtimeInput
```

### Output (Gemini → User)
```
Base64 → Decode → Add WAV Header → decodeAudioData → AudioBuffer → BufferSource → Speakers
```

## Context Injection Flow

```
1. User drops file → Added to offerings[]
2. User clicks "Transmit"
3. For each offering:
   - sendFileContext(fileName, content)  // turnComplete: false
4. Send instruction:
   - sendContext(prompt)  // turnComplete: true
5. Gemini processes text + awaits audio
6. User speaks → sendRealtimeInput(audio)
7. Gemini responds with audio
```

## Voice Selection

```typescript
const getVoiceName = () => 
    currentPersonaGender === 'female' ? 'Aoede' : 'Puck';
```
