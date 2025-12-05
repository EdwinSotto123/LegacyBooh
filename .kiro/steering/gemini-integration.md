# Gemini API Integration Guidelines

## Models Used
- `gemini-2.5-flash` - Text generation, code analysis
- `gemini-2.5-flash-preview-tts` - Text-to-speech for ghost voices
- `gemini-2.5-flash-native-audio-preview-09-2025` - Live API for real-time voice

## Live API Best Practices

### Sending Text + Audio Together
According to Gemini Live API docs, text and audio should be sent sequentially:

```typescript
// 1. Send file context FIRST (don't complete turn)
session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: fileContent }] }],
    turnComplete: false
});

// 2. Send instruction (complete turn to trigger response)
session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: "Analyze this" }] }],
    turnComplete: true
});

// 3. Audio streams via sendRealtimeInput
session.sendRealtimeInput({ media: audioBlob });
```

### Audio Format
- Input: PCM 16-bit, 16kHz mono
- Output: PCM 16-bit, 24kHz mono
- Always add WAV header for browser decoding

### Voice Configuration
- Male voices: Puck, Charon, Fenrir
- Female voices: Kore, Aoede
- Set via `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`

## Error Handling
- Always wrap API calls in try/catch
- Provide fallback responses for failed generations
- Log errors to telemetry panel in UI
