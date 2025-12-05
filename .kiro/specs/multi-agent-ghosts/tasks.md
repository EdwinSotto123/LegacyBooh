# Multi-Agent Ghost System - Implementation Tasks

## Phase 1: Persona Registry
- [x] Task 1.1: Define GhostPersona interface in types.ts
- [x] Task 1.2: Create PERSONAS array with 6 ghosts
- [x] Task 1.3: Add specialty field to each persona
- [x] Task 1.4: Add gender field for voice selection
- [x] Task 1.5: Add emoji and quote fields

## Phase 2: Selection UI
- [x] Task 2.1: Create persona selection grid in Altar.tsx
- [x] Task 2.2: Design ghost cards with horror theme
- [x] Task 2.3: Add hover effects showing death cause
- [x] Task 2.4: Implement selection glow animation
- [x] Task 2.5: Store selected persona in state

## Phase 3: System Prompt Integration
- [x] Task 3.1: Create getSystemInstruction function
- [x] Task 3.2: Include persona identity in prompt
- [x] Task 3.3: Add personality traits based on specialty
- [x] Task 3.4: Include file context in prompt
- [x] Task 3.5: Add response rules and prohibitions

## Phase 4: Voice Differentiation
- [x] Task 4.1: Create setCurrentPersonaGender function
- [x] Task 4.2: Create getVoiceName function
- [x] Task 4.3: Apply voice to TTS generation
- [x] Task 4.4: Apply voice to Live API config
- [x] Task 4.5: Update voice on persona change

## Phase 5: Specialized Responses
- [x] Task 5.1: Adrian emphasizes architecture patterns
- [x] Task 5.2: Marcus focuses on security issues
- [x] Task 5.3: Beatrice discusses infrastructure
- [x] Task 5.4: Elena analyzes data/ML aspects
- [x] Task 5.5: Carlos references legacy knowledge
- [x] Task 5.6: Sofia hunts for bugs and test gaps

## Phase 6: Intro Manifestation
- [x] Task 6.1: Create manifestSpiritIntro function
- [x] Task 6.2: Generate unique intro per persona
- [x] Task 6.3: Include death reference in intro
- [x] Task 6.4: Play TTS audio on summon
- [x] Task 6.5: Show loading animation during generation

## Phase 7: Multi-Agent Collaboration (Future)
- [ ] Task 7.1: Design Séance Council UI
- [ ] Task 7.2: Allow selecting 2-3 ghosts
- [ ] Task 7.3: Implement turn-based discussion
- [ ] Task 7.4: Create agreement/disagreement logic
- [ ] Task 7.5: Generate council summary
- [ ] Task 7.6: Add ghost-to-ghost banter
