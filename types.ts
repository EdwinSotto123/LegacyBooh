
export enum Sender {
  USER = 'USER',
  GHOST = 'GHOST'
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  audioData?: string; // Base64 audio for TTS
}

export interface CodeFile {
  name: string;
  content: string;
  language: string;
}

export type Intent = 'explain' | 'risk' | 'migrate' | 'roast' | 'refactor';

export interface TechSin {
  id: string;
  language: string;
  version: string;
  goal: string;
}

export interface GhostPersona {
  id: string;
  name: string;
  role: string;
  deathCause: string;
  quote: string;
  gender: 'male' | 'female';
  emoji: string; // Avatar emoji
  specialty: string; // What they're best at analyzing
  image?: string; // Path to character image
}

export interface RitualConfig {
  techStack: TechSin[];
  spokenLanguage: 'es' | 'en'; // Human Language
  persona: GhostPersona;
}

export interface NecromancerState {
  files: CodeFile[];
  activeFileIndex: number;
  isSummoned: boolean;
  isLoading: boolean;
  messages: Message[];
}

export interface SeanceState {
  isActive: boolean;
  isSpeaking: boolean; // Ghost is speaking
  isListening: boolean; // User is speaking
  volume: number; // For visualizer
}

export enum SymbolType {
  TRUTH = 'TRUTH',       // Constants (Immutable)
  ARTIFACT = 'ARTIFACT', // Variables (Mutable)
  RITUAL = 'RITUAL',     // Functions / Methods
  PACT = 'PACT'          // Imports / Libraries
}

export interface CodeSymbol {
  id: string;
  name: string;
  type: SymbolType;
  line: number;
  content: string;
  references?: string[]; // List of other files using this symbol
  dependencies?: string[]; // List of functions called by this function (Intra-file)
  tags?: string[]; // e.g., 'Async', 'Generator', 'Exported'
}

export interface StagedContext {
  id: string;
  text: string;
  intent: string;
  fileName: string;
  timestamp: number;
}

export interface LiveTranscriptItem {
    id: string;
    sender: 'USER' | 'SPIRIT';
    content?: string; // For text inputs
    type: 'AUDIO' | 'TEXT';
    timestamp: number;
}
