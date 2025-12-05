# Live Seance - Requirements

## Overview
Real-time voice conversation with AI ghost programmers using Gemini Live API.

## User Stories

### US-1: Voice Chat Activation
**As a** developer  
**I want** to start a voice conversation with the ghost  
**So that** I can discuss code hands-free

**Acceptance Criteria:**
- [ ] "Start Seance" button requests microphone permission
- [ ] Visual indicator shows when seance is active
- [ ] Audio visualizer responds to voice input/output

### US-2: File Context Injection
**As a** developer  
**I want** to send file contents to the ghost during voice chat  
**So that** it can analyze specific code while I talk

**Acceptance Criteria:**
- [ ] Drag files to chat to queue them
- [ ] Files are sent as context before audio
- [ ] Ghost acknowledges receiving the file
- [ ] No hallucination about non-existent files

### US-3: Transcript Display
**As a** developer  
**I want** to see a transcript of the conversation  
**So that** I can review what was discussed

**Acceptance Criteria:**
- [ ] Shows user speech transcription
- [ ] Shows ghost response transcription
- [ ] Auto-scrolls to latest message
- [ ] Distinguishes speakers visually

### US-4: Telemetry Logging
**As a** developer  
**I want** to see connection status and debug info  
**So that** I can troubleshoot issues

**Acceptance Criteria:**
- [ ] Shows connection status
- [ ] Logs context injection events
- [ ] Shows errors with details
- [ ] Timestamps on all entries
