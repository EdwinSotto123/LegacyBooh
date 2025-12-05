# Live Seance - Implementation Tasks

## Phase 1: Connection Setup
- [x] Task 1.1: Create `connectLiveSeance` function in geminiService.ts
- [x] Task 1.2: Configure Gemini Live API with audio modality
- [x] Task 1.3: Set up WebSocket callbacks (onopen, onmessage, onclose, onerror)
- [x] Task 1.4: Implement voice selection based on persona gender

## Phase 2: Audio Input
- [x] Task 2.1: Request microphone permission
- [x] Task 2.2: Create AudioContext for input processing
- [x] Task 2.3: Implement ScriptProcessor for audio capture
- [x] Task 2.4: Create `downsampleNative` function for 16kHz conversion
- [x] Task 2.5: Create `createBlob` function for PCM encoding
- [x] Task 2.6: Implement `sendAudio` method

## Phase 3: Audio Output
- [x] Task 3.1: Decode base64 audio from Gemini
- [x] Task 3.2: Add WAV header for browser compatibility
- [x] Task 3.3: Use decodeAudioData for proper sample rate handling
- [x] Task 3.4: Queue audio buffers for seamless playback
- [x] Task 3.5: Update visualizer on audio output

## Phase 4: Context Injection
- [x] Task 4.1: Send project context on connection open
- [x] Task 4.2: Implement `sendContext` with multiple fallback strategies
- [x] Task 4.3: Create `sendFileContext` for file-specific context
- [x] Task 4.4: Handle `turnComplete` flag correctly
- [x] Task 4.5: Inject pending file context before audio

## Phase 5: Transcription
- [x] Task 5.1: Enable input/output transcription in config
- [x] Task 5.2: Parse transcription from server messages
- [x] Task 5.3: Update transcript state with new text
- [x] Task 5.4: Handle transcript merging for continuous speech

## Phase 6: UI Integration
- [x] Task 6.1: Create "Start Seance" button
- [x] Task 6.2: Build audio visualizer component
- [x] Task 6.3: Create transcript display panel
- [x] Task 6.4: Build telemetry log panel
- [x] Task 6.5: Implement offerings queue UI
- [x] Task 6.6: Add drag & drop support for files
