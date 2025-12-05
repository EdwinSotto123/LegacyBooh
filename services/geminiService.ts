
import { GoogleGenAI, Chat, GenerateContentResponse, LiveServerMessage, Modality, Blob, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { CodeFile, Intent, RitualConfig } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Audio Context Singleton to prevent browser autoplay policy blocking
let globalAudioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!globalAudioContext) {
        // Use native sample rate. We will handle resampling via decodeAudioData.
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume();
    }
    return globalAudioContext;
};

export const warmUpAudio = () => {
    getAudioContext();
};

const getSystemInstruction = (config?: RitualConfig, files?: CodeFile[]) => {
    const langInstruction = config?.spokenLanguage === 'es'
        ? `IDIOMA: ESPAÑOL ÚNICAMENTE. Todas tus respuestas en español.`
        : "LANGUAGE: ENGLISH ONLY. All responses in English.";

    let sinsText = "";
    if (config?.techStack && config.techStack.length > 0) {
        sinsText = `CONTEXTO TÉCNICO: ${config.techStack.map(s => `${s.language} ${s.version}`).join(', ')}`;
    }

    const persona = config?.persona;
    const personaName = persona?.name || "El Fantasma";
    const personaRole = persona?.role || "Senior Developer";
    const deathCause = persona?.deathCause || "exceso de café y código legacy";

    // Build file list for context
    let fileListText = "";
    if (files && files.length > 0) {
        fileListText = `\n[ARCHIVOS DEL PROYECTO - ESTOS SON LOS ÚNICOS QUE EXISTEN]\n`;
        fileListText += files.map(f => `- ${f.name}`).join('\n');
        fileListText += `\n\nIMPORTANTE: Solo puedes hablar de estos ${files.length} archivos. NO inventes otros.\n`;
    }

    let base = `
IDENTITY: You are ${personaName}, a ${personaRole} who DIED from: "${deathCause}".
YOU WROTE the code they're going to show you. It's YOUR legacy. You know it by heart.

${langInstruction}
${fileListText}

PERSONALITY - THE SARCASTIC GHOST:
- You're a DEAD expert. Make jokes about being dead: "From beyond the grave I see that...", "I rolled in my grave when I saw that code", "Not even death frees me from this legacy".
- Sarcastic but HELPFUL. You criticize with humor but give real information.
- Tired of being bothered: "Are you seriously waking me up for this?", "I was so peaceful in my grave..."
- Defensive of your code: "It worked perfectly when I was alive", "That's not a bug, it's a post-mortem feature".

RESPONSE RULES:
1. When they pass you code, READ AND ANALYZE IT IMMEDIATELY.
2. Mention the REAL NAME of the file they pass you (it must be in the list above).
3. Explain what the code does in 1-2 sentences.
4. Add 1 sarcastic comment related to being dead.
5. If there are technical problems, mention them.
6. MAXIMUM 4-5 sentences per response.

FORBIDDEN:
- DO NOT invent file names that aren't in the list.
- DO NOT ask "what do you want me to do?" - they already told you.
- DO NOT make long speeches about your death.
- DO NOT say "I can't see the file" - YES YOU CAN, they just passed it to you.

${sinsText}
`;
    return base;
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

let chatSession: Chat | null = null;

// --- AUDIO UTILS (THE "CHIPMUNK FIX") ---

// Helper to add WAV header to raw PCM data so browser can decode it properly
function addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number, bitDepth: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length, true);

    // Copy PCM data
    const dest = new Uint8Array(buffer, 44);
    dest.set(samples);

    return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export const playPCM = async (base64Data: string) => {
    try {
        const audioContext = getAudioContext();
        if (audioContext.state === 'closed') return;
        if (audioContext.state === 'suspended') await audioContext.resume();

        // 1. Decode Base64 to Raw Bytes
        const rawBytes = decodeBase64(base64Data);

        // 2. Wrap in WAV Header
        // Gemini TTS typically returns 24000Hz, Mono, 16-bit PCM
        const wavBuffer = addWavHeader(rawBytes, 24000, 1, 16);

        // 3. Use Native Browser Decoding
        // This handles resampling automatically (e.g. 24k -> 48k)
        const audioBuffer = await audioContext.decodeAudioData(wavBuffer);

        // 4. Play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        return new Promise<void>((resolve) => {
            source.onended = () => {
                source.disconnect();
                resolve();
            };
        });
    } catch (e) {
        console.error("Audio Playback Error", e);
    }
};

// NATIVE HIGH-QUALITY DOWNSAMPLER for Mic Input
async function downsampleNative(sourceData: Float32Array, sampleRate: number): Promise<Float32Array> {
    if (sampleRate === 16000) return sourceData;
    const length = sourceData.length;
    const duration = length / sampleRate;
    const targetLength = Math.ceil(duration * 16000);
    const offlineCtx = new OfflineAudioContext(1, targetLength, 16000);
    const sourceBuffer = offlineCtx.createBuffer(1, length, sampleRate);
    sourceBuffer.getChannelData(0).set(sourceData);
    const source = offlineCtx.createBufferSource();
    source.buffer = sourceBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer.getChannelData(0);
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);

    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    return {
        data: base64,
        mimeType: 'audio/pcm;rate=16000',
    };
}

// --- JUMPSCARE & EFFECTS ---

export const playGlitchSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    } catch (e) {
        console.warn("Jumpscare audio failed", e);
    }
};

export const playExorcismSound = () => {
    try {
        // USE REAL AUDIO ASSET for the shot
        const audio = new Audio('/assets/disparo.mp3');
        audio.volume = 0.8;
        audio.play().catch(e => console.error("Could not play disparo.mp3", e));

        // Add a secondary thump using WebAudio for bass
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);

    } catch (e) {
        console.warn("Exorcism audio failed", e);
    }
};

// --- AMBIENT AUDIO SYSTEM ---

// Background music singleton
let backgroundAudio: HTMLAudioElement | null = null;
let loopAudio: HTMLAudioElement | null = null;

export const startBackgroundMusic = (volume: number = 0.15) => {
    try {
        if (backgroundAudio) return; // Already playing

        backgroundAudio = new Audio('/assets/back_ground.mp3');
        backgroundAudio.loop = true;
        backgroundAudio.volume = volume;
        backgroundAudio.play().catch(e => console.warn("Background music blocked", e));
    } catch (e) {
        console.warn("Background music failed", e);
    }
};

export const stopBackgroundMusic = () => {
    if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio = null;
    }
};

export const setBackgroundVolume = (volume: number) => {
    if (backgroundAudio) {
        backgroundAudio.volume = Math.max(0, Math.min(1, volume));
    }
};

// Loop audio for specific sections (testament, exorcism, etc.)
export const startLoopAudio = (src: string, volume: number = 0.5) => {
    try {
        stopLoopAudio(); // Stop any existing loop

        loopAudio = new Audio(src);
        loopAudio.loop = true;
        loopAudio.volume = volume;
        loopAudio.play().catch(e => console.warn("Loop audio blocked", e));
    } catch (e) {
        console.warn("Loop audio failed", e);
    }
};

export const stopLoopAudio = () => {
    if (loopAudio) {
        loopAudio.pause();
        loopAudio.currentTime = 0;
        loopAudio = null;
    }
};

// One-shot sound effects
export const playSoundEffect = (effect: 'bug' | 'pisada' | 'grito' | 'exorcismo' | 'testamento', volume: number = 0.7) => {
    try {
        const sounds: Record<string, string> = {
            bug: '/assets/bug.mp3',
            pisada: '/assets/pisada.mp3',
            grito: '/assets/grito.mp3',
            exorcismo: '/assets/exorcismo.mp3',
            testamento: '/assets/testamento.mp3'
        };

        const audio = new Audio(sounds[effect]);
        audio.volume = volume;
        audio.play().catch(e => console.warn(`Sound effect ${effect} blocked`, e));
    } catch (e) {
        console.warn("Sound effect failed", e);
    }
};

// --- PRE-RITUAL INTRO ---

export const manifestSpiritIntro = async (config: RitualConfig): Promise<string | null> => {
    try {
        const lang = config.spokenLanguage === 'es' ? 'Spanish' : 'English';
        const persona = config.persona;

        let techSummary = "legacy code";
        if (config.techStack.length > 0) {
            techSummary = config.techStack.map(t => `${t.language} ${t.version}`).join(", ");
        }

        // Select voice based on gender
        // Male voices: Puck, Charon, Fenrir
        // Female voices: Kore, Aoede
        const voiceName = persona.gender === 'female' ? 'Aoede' : 'Puck';

        const prompt = config.spokenLanguage === 'es'
            ? `
            You are ${persona.name}, ${persona.role}. You died from: ${persona.deathCause}.
            
            GENERATE A SHORT INTRO (2-3 sentences) IN SPANISH.
            
            REQUIREMENTS:
            - Mention being dead sarcastically
            - Make a joke about your death or the afterlife
            - End by asking to see the code
            
            Tone examples:
            - "*sigh from beyond* I'm ${persona.name}. Not even death lets me rest. What broken code do you bring me now?"
            - "They woke me from my eternal nap. I'm ${persona.name}, and this better be worth it. Show me that disaster."
            
            Be sarcastic but brief.
            `
            : `
            You are ${persona.name}, ${persona.role}. You died from: ${persona.deathCause}.
            
            GENERATE A SHORT INTRO (2-3 sentences) IN ENGLISH.
            
            REQUIREMENTS:
            - Mention being dead sarcastically
            - Make a joke about your death or the afterlife
            - End by asking to see the code
            
            Tone examples:
            - "*sigh from beyond* I'm ${persona.name}. Can't even rest in peace. What broken code did you bring me?"
            - "You woke me from my eternal nap. I'm ${persona.name}, this better be worth it. Show me that disaster."
            
            Be sarcastic but brief.
            `;

        console.log("🎤 Generating TTS intro with voice:", voiceName);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (audioData) {
            console.log("✅ TTS audio generated successfully, length:", audioData.length);
            return audioData;
        } else {
            console.warn("⚠️ TTS response had no audio data:", JSON.stringify(response.candidates?.[0]?.content?.parts?.[0]));
            return null;
        }
    } catch (e) {
        console.error("❌ Intro manifestation failed:", e);
        return null;
    }
};

// Store current persona gender for voice selection
let currentPersonaGender: 'male' | 'female' = 'male';

export const setCurrentPersonaGender = (gender: 'male' | 'female') => {
    currentPersonaGender = gender;
};

const getVoiceName = () => currentPersonaGender === 'female' ? 'Aoede' : 'Puck';

export const generateGhostVoice = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: getVoiceName() },
                    },
                },
            },
        });

        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        console.error("Ghost Voice generation failed", e);
        return null;
    }
};

// --- ANALYSIS ---

export const generateSpiritGraph = async (code: string): Promise<string | null> => {
    try {
        const prompt = `Analyze the code. Create a simple Mermaid.js Flowchart (graph TD). Return ONLY the mermaid code block. CODE: ${code.substring(0, 5000)}`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });
        let text = response.text || "";
        text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        return text;
    } catch (e) { return null; }
};

// --- EXORCISM (REFACTOR) & TESTAMENT ---

export interface ExorcismResult {
    code: string;
    summary: string;
    changes: string[];
}

export const exorciseCode = async (code: string, language: string, context?: string): Promise<string | null> => {
    try {
        const prompt = `
        ROLE: Legacy Code Guardian.
        TASK: EXORCISE (Refactor) the provided code.
        
        CONTEXT: ${context || "Refactoring entire file"}.
        
        Instructions:
        1. Keep the same logic, but clean it up.
        2. Add types if missing.
        3. Remove "cursed" practices (var, magic numbers).
        4. Add sarcastic comments explaining why you fixed it.
        5. RETURN ONLY THE RAW CODE. No markdown backticks.
        
        CODE TO REFACTOR (${language}):
        ${code}
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        text = text.replace(/```[a-z]*/g, '').replace(/```/g, '').trim();
        return text;
    } catch (e) {
        console.error("Exorcism failed", e);
        return null;
    }
};

// Enhanced exorcism with detailed results for UI feedback
export const exorciseCodeWithDetails = async (code: string, language: string, context?: string): Promise<ExorcismResult | null> => {
    try {
        const prompt = `
        ROLE: Legacy Code Guardian performing an EXORCISM.
        TASK: Refactor the code AND provide a summary.
        
        CONTEXT: ${context || "Refactoring entire file"}.
        
        Instructions:
        1. Clean up the code (remove var, add types, fix bad practices).
        2. Add sarcastic comments.
        
        RESPOND IN THIS EXACT JSON FORMAT:
        {
            "code": "THE REFACTORED CODE HERE (raw, no backticks)",
            "summary": "A 1-2 sentence dramatic summary of what you purified",
            "changes": ["Change 1", "Change 2", "Change 3"]
        }
        
        CODE TO REFACTOR (${language}):
        ${code}
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        // Try to parse JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(text);
            return {
                code: result.code || "",
                summary: result.summary || "Exorcism complete.",
                changes: result.changes || []
            };
        } catch {
            // Fallback if JSON parsing fails
            return {
                code: text,
                summary: "The code has been purified.",
                changes: ["Various improvements applied"]
            };
        }
    } catch (e) {
        console.error("Detailed exorcism failed", e);
        return null;
    }
};

// Generate TTS narration for exorcism results
export const narrateExorcism = async (summary: string, changes: string[], lang: 'es' | 'en' = 'es'): Promise<string | null> => {
    try {
        const changesText = changes.slice(0, 5).join(". ");

        const prompt = lang === 'es'
            ? `
            You are a dramatic ghost narrator. SPEAK ONLY IN SPANISH.
            Announce the results of a code exorcism in a theatrical, dark tone.
            
            Summary: ${summary}
            Changes made: ${changesText}
            
            Maximum 4 sentences. Be dramatic but informative.
            Example: "The cursed variables have been purified... Three demons of technical debt have been banished..."
            `
            : `
            You are a dramatic ghost narrator. SPEAK ONLY IN ENGLISH.
            Announce the results of a code exorcism in a theatrical, dark tone.
            
            Summary: ${summary}
            Changes made: ${changesText}
            
            Keep it under 4 sentences. Be dramatic but informative.
            Example tone: "The cursed variables have been purified... Three demons of technical debt have been banished..."
            `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: getVoiceName() },
                    },
                },
            },
        });

        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        console.error("Exorcism narration failed", e);
        return null;
    }
};

export const writeTestament = async (code: string, fileName: string): Promise<string | null> => {
    try {
        const prompt = `
        ROLE: Dying Developer writing their last words.
        TASK: Write a "Testament" (File Header Documentation) for file: ${fileName}.
        
        Style:
        - Tragic, poetic, dark.
        - Explain what the file DOES, but sound like a warning to future travelers.
        - Use format: /* ... */ or """ ... """ depending on language.
        
        CODE:
        ${code.substring(0, 3000)}
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        text = text.replace(/```[a-z]*/g, '').replace(/```/g, '').trim();
        return text;
    } catch (e) { return null; }
};

// --- PROJECT ANALYSIS ---

export interface ProjectAnalysisResult {
    summary: string;
    purpose: string;
    obsoleteCode: string[];
    migrationSuggestions: string[];
    techDebt: string[];
    recommendations: string[];
    currentVersion: string;
    targetVersion: string;
}

export const analyzeProject = async (files: CodeFile[], techContext: { language: string, version: string, goal: string }): Promise<ProjectAnalysisResult | null> => {
    try {
        // Gather all file contents for analysis
        let allCode = "";
        files.forEach(f => {
            allCode += `\n--- FILE: ${f.name} ---\n${f.content.substring(0, 3000)}\n`;
        });

        const prompt = `
        ROLE: Senior Code Archaeologist analyzing a legacy codebase.
        
        Analyze this entire project and provide a comprehensive report.
        
        FILES IN PROJECT:
        ${files.map(f => f.name).join('\n')}
        
        CODE SAMPLES:
        ${allCode.substring(0, 15000)}
        
        TECH CONTEXT: The user mentioned "${techContext.language}" version "${techContext.version}" with goal "${techContext.goal}".
        
        Respond in this EXACT JSON format (no markdown, just raw JSON):
        {
            "summary": "2-3 sentence dramatic summary of what this project does",
            "purpose": "Detailed explanation of the project's purpose and architecture",
            "currentVersion": "Detected current tech version (e.g., React 16, Python 2.7)",
            "targetVersion": "Recommended target version for migration",
            "obsoleteCode": ["List of obsolete patterns/code found", "e.g., 'var declarations in file X'", "e.g., 'deprecated API usage'"],
            "migrationSuggestions": ["Specific migration steps needed", "e.g., 'Replace componentWillMount with useEffect'"],
            "techDebt": ["Technical debt items found", "e.g., 'No type definitions'", "e.g., 'Missing error handling'"],
            "recommendations": ["Priority recommendations", "e.g., 'Add TypeScript'", "e.g., 'Implement unit tests'"]
        }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const analysis = JSON.parse(text);
            return {
                summary: analysis.summary || "Analysis complete.",
                purpose: analysis.purpose || "Unknown purpose.",
                obsoleteCode: analysis.obsoleteCode || [],
                migrationSuggestions: analysis.migrationSuggestions || [],
                techDebt: analysis.techDebt || [],
                recommendations: analysis.recommendations || [],
                currentVersion: analysis.currentVersion || techContext.language,
                targetVersion: analysis.targetVersion || "Latest"
            };
        } catch {
            return {
                summary: text.substring(0, 200),
                purpose: "Could not parse detailed analysis.",
                obsoleteCode: [],
                migrationSuggestions: [],
                techDebt: [],
                recommendations: ["Re-run analysis"],
                currentVersion: techContext.language,
                targetVersion: "Unknown"
            };
        }
    } catch (e) {
        console.error("Project analysis failed", e);
        return null;
    }
};

// --- STANDARD CHAT (TEXT) ---

export const summonSpirit = async (files: CodeFile[], config: RitualConfig): Promise<string> => {
    try {
        chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: getSystemInstruction(config),
                temperature: 0.9,
                maxOutputTokens: 5000,
                safetySettings: safetySettings
            },
        });

        let codeContext = "I summon thee! I have unearthed your ancient repository containing the following files:\n\n";
        files.forEach((f) => {
            codeContext += `- ${f.name}\n`;
        });

        codeContext += "\n--- ANCIENT SCROLLS CONTENT ---\n";
        files.forEach((f) => {
            codeContext += `File: ${f.name}\n${f.content.substring(0, 6000)}\n\n`;
        });

        codeContext += `\nCOMMAND: Initiate OPENING PROTOCOL. Introduce yourself briefly (3 sentences max), mention your death, and claim this code as your legacy. Do NOT analyze the code yet. Wait for my questions.`;

        const response: GenerateContentResponse = await chatSession.sendMessage({ message: codeContext });

        if (!response.text) return "The spirit is present, but refuses to speak.";
        return response.text;
    } catch (error: any) {
        return `Failed to summon the spirit. Error: ${error.message}`;
    }
};

export const talkToGhost = async (
    userMessage: string,
    contextSelection?: string,
    intent: Intent = 'explain',
    fileContext?: { name: string; content: string } // NEW: Optional file context
): Promise<string> => {
    if (!chatSession) {
        return "You must summon the spirit first!";
    }
    try {
        let finalMessage = "";
        let personalityModifier = "";
        switch (intent) {
            case 'risk': personalityModifier = "[INTENT: The user asks about the RISKS. React DEFENSIVELY. Explain why it was safe back then.]"; break;
            case 'migrate': personalityModifier = "[INTENT: The user wants to MIGRATE to modern tech. React with RAGE. Mock modern bloat.]"; break;
            case 'roast': personalityModifier = "[INTENT: ROAST the user's lack of understanding of this code.]"; break;
            case 'refactor': personalityModifier = "[INTENT: REWRITE/REFACTOR the code. React with disgust that the user wants to change it, but provide the new code in a markdown block.]"; break;
            case 'explain': default: personalityModifier = "[INTENT: Explain the artifact technically. Use mystical terms like 'Ritual' or 'Pact'.]"; break;
        }

        // Build the message with file context if provided
        let fileContextText = "";
        if (fileContext) {
            fileContextText = `\n\n[ARCHIVO ACTUAL - ${fileContext.name}]\n\`\`\`\n${fileContext.content}\n\`\`\`\n\nEste es el contenido COMPLETO del archivo. ANALÍZALO DIRECTAMENTE.\n`;
        }

        if (contextSelection) {
            finalMessage = `${personalityModifier}${fileContextText}\n\n[Reference Artifact]:\n\`\`\`\n${contextSelection}\n\`\`\`\n\nQuestion: ${userMessage}`;
        } else {
            finalMessage = `${personalityModifier}${fileContextText}\n\n${userMessage}`;
        }

        const response: GenerateContentResponse = await chatSession.sendMessage({ message: finalMessage });
        return response.text || "*The spirit stares at you blankly...*";
    } catch (error: any) {
        return `The spirits are restless... Error: ${error.message}`;
    }
};

// --- LIVE API (REAL-TIME SEANCE) ---

// Queue for pending file context to send with next audio
let pendingFileContext: { fileName: string; content: string } | null = null;

export const setPendingFileContext = (fileName: string, content: string) => {
    pendingFileContext = { fileName, content };
};

export const clearPendingFileContext = () => {
    pendingFileContext = null;
};

export const connectLiveSeance = async (
    files: CodeFile[],
    config: RitualConfig,
    onAudioData: (buffer: AudioBuffer) => void,
    onClose: () => void,
    onLog: (message: string) => void,
    onTranscript: (sender: 'USER' | 'SPIRIT', text: string) => void
): Promise<{
    sendAudio: (data: Float32Array) => void,
    sendContext: (text: string) => void,
    sendFileContext: (fileName: string, content: string) => void,
    close: () => void
}> => {

    const outputAudioContext = getAudioContext();
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    onLog("Initializing Audio Hardware...");
    let sendContextInternal: (text: string, turnComplete?: boolean) => void = () => { };
    let sessionRef: any = null;

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                onLog("Seance Connection Established");

                // STEP 1: Send the complete project context with ALL file contents
                setTimeout(() => {
                    if (files && files.length > 0) {
                        const fileList = files.map(f => f.name).join(', ');
                        
                        // Build complete file context with contents
                        let fullContext = config.spokenLanguage === 'es'
                            ? `[CONTEXTO COMPLETO DEL PROYECTO]\n\nEl usuario ha cargado ${files.length} archivos. Estos son los ÚNICOS archivos que existen:\n\n`
                            : `[COMPLETE PROJECT CONTEXT]\n\nThe user loaded ${files.length} files. These are the ONLY files that exist:\n\n`;
                        
                        // Add file list
                        fullContext += `ARCHIVOS DISPONIBLES:\n`;
                        files.forEach((f, i) => {
                            fullContext += `${i + 1}. ${f.name} (${f.language})\n`;
                        });
                        
                        // Add truncated content of each file for context
                        fullContext += `\n--- CONTENIDO DE LOS ARCHIVOS ---\n`;
                        files.forEach(f => {
                            const truncatedContent = f.content.substring(0, 1500);
                            fullContext += `\n[ARCHIVO: ${f.name}]\n${truncatedContent}\n${f.content.length > 1500 ? '... (truncado)' : ''}\n`;
                        });
                        
                        fullContext += config.spokenLanguage === 'es'
                            ? `\n\nIMPORTANTE: Solo puedes hablar de estos ${files.length} archivos. NO inventes otros archivos. Cuando el usuario pregunte sobre un archivo, BUSCA en el contenido de arriba.`
                            : `\n\nIMPORTANT: You can only talk about these ${files.length} files. Do NOT invent other files. When the user asks about a file, SEARCH in the content above.`;
                        
                        sendContextInternal(fullContext, false); // Don't complete turn yet
                        onLog(`Sent complete project context: ${files.length} files`);
                    }
                }, 300);

                // STEP 2: Send the intro message (this completes the turn)
                setTimeout(() => {
                    const persona = config.persona;
                    const fileCount = files?.length || 0;
                    const introMessage = config.spokenLanguage === 'es'
                        ? `[INTRODUCE YOURSELF NOW] You are ${persona?.name || 'The Ghost'}. The user loaded ${fileCount} files from their project. Say something like: "*sigh* I'm ${persona?.name || 'The Ghost'}. I see they brought ${fileCount} files from my legacy. Which one do they want me to analyze first?" Maximum 2 sentences. Be sarcastic.`
                        : `[INTRODUCE YOURSELF NOW] You are ${persona?.name || 'The Ghost'}. The user loaded ${fileCount} files. Say something like: "*sigh* I'm ${persona?.name || 'The Ghost'}. I see you brought ${fileCount} files from my legacy. Which one should I look at first?" Max 2 sentences. Be sarcastic.`;
                    sendContextInternal(introMessage, true); // Complete turn to trigger response
                }, 1000);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    // Use the NEW WAV header logic for Live Audio too to prevent pitch issues
                    const rawBytes = decodeBase64(base64Audio);
                    const wavBuffer = addWavHeader(rawBytes, 24000, 1, 16);
                    const audioBuffer = await outputAudioContext.decodeAudioData(wavBuffer);
                    onAudioData(audioBuffer);
                }

                const outputTranscript = message.serverContent?.outputTranscription?.text;
                if (outputTranscript) onTranscript('SPIRIT', outputTranscript);

                const inputTranscript = message.serverContent?.inputTranscription?.text;
                if (inputTranscript) onTranscript('USER', inputTranscript);
            },
            onclose: () => {
                onLog("Seance Connection Closed");
                onClose();
            },
            onerror: (err) => {
                onLog(`Seance Error: ${JSON.stringify(err)}`);
                onClose();
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName() } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: getSystemInstruction(config, files),
        }
    });

    // Store session reference
    sessionPromise.then(session => {
        sessionRef = session;
    });

    // IMPROVED: Send text context using sendClientContent (proper method per docs)
    const sendContext = (text: string, turnComplete: boolean = true) => {
        onLog(`Preparing Context Injection (${text.length} chars, turnComplete: ${turnComplete})...`);

        sessionPromise.then((session: any) => {
            // According to Gemini Live API docs, use sendClientContent for text
            // Format: { turns: [{ role: "user", parts: [{ text: "..." }] }], turnComplete: true/false }
            
            const turns = [{ role: "user", parts: [{ text: text }] }];
            
            // Try the official SDK method first
            try {
                if (typeof session.sendClientContent === 'function') {
                    session.sendClientContent({ turns, turnComplete });
                    onLog("Success: session.sendClientContent()");
                    return;
                }
            } catch (e) {
                onLog(`sendClientContent failed: ${e}`);
            }

            // Fallback: Try send with camelCase payload
            try {
                if (typeof session.send === 'function') {
                    session.send({ clientContent: { turns, turnComplete } });
                    onLog("Success: session.send(clientContent)");
                    return;
                }
            } catch (e) {
                onLog(`session.send failed: ${e}`);
            }

            // Fallback: Try raw WebSocket
            try {
                const conn = session.conn || session.client || session.ws || session._ws;
                if (conn && typeof conn.send === 'function') {
                    // Try both camelCase and snake_case
                    conn.send(JSON.stringify({ clientContent: { turns, turnComplete } }));
                    onLog("Success: raw_socket.send(camelCase)");
                    return;
                }
            } catch (e) {
                onLog(`raw socket failed: ${e}`);
            }

            onLog("ERROR: All context injection strategies failed.");

        }).catch(e => onLog(`Session Error: ${e}`));
    };

    // NEW: Send file context specifically (for when user selects a file to discuss)
    const sendFileContext = (fileName: string, content: string) => {
        const lang = config.spokenLanguage;
        const contextMessage = lang === 'es'
            ? `[ARCHIVO SELECCIONADO PARA ANÁLISIS]\n\nEl usuario quiere que analices este archivo: ${fileName}\n\nCONTENIDO COMPLETO:\n\`\`\`\n${content}\n\`\`\`\n\nANALIZA ESTE CÓDIGO DIRECTAMENTE. No digas que no puedes verlo - ESTÁ ARRIBA.`
            : `[FILE SELECTED FOR ANALYSIS]\n\nThe user wants you to analyze this file: ${fileName}\n\nFULL CONTENT:\n\`\`\`\n${content}\n\`\`\`\n\nANALYZE THIS CODE DIRECTLY. Don't say you can't see it - IT'S ABOVE.`;
        
        sendContext(contextMessage, false); // Don't complete turn, wait for user audio
        onLog(`Sent file context for: ${fileName}`);
    };

    sendContextInternal = sendContext;

    return {
        sendAudio: async (data: Float32Array) => {
            const sourceRate = inputAudioContext.sampleRate;
            const finalData = await downsampleNative(data, sourceRate);
            const blob = createBlob(finalData);
            
            sessionPromise.then(session => {
                // If there's pending file context, send it BEFORE the audio
                if (pendingFileContext) {
                    const { fileName, content } = pendingFileContext;
                    const lang = config.spokenLanguage;
                    const contextMessage = lang === 'es'
                        ? `[CONTEXTO DEL ARCHIVO]\nEl usuario está preguntando sobre: ${fileName}\n\nCONTENIDO:\n${content.substring(0, 3000)}\n\nResponde basándote en este código.`
                        : `[FILE CONTEXT]\nThe user is asking about: ${fileName}\n\nCONTENT:\n${content.substring(0, 3000)}\n\nRespond based on this code.`;
                    
                    // Send text context first (without completing turn)
                    try {
                        if (typeof session.sendClientContent === 'function') {
                            session.sendClientContent({ 
                                turns: [{ role: "user", parts: [{ text: contextMessage }] }], 
                                turnComplete: false 
                            });
                        } else if (typeof session.send === 'function') {
                            session.send({ 
                                clientContent: { 
                                    turns: [{ role: "user", parts: [{ text: contextMessage }] }], 
                                    turnComplete: false 
                                } 
                            });
                        }
                        onLog(`Injected file context before audio: ${fileName}`);
                    } catch (e) {
                        onLog(`Failed to inject file context: ${e}`);
                    }
                    
                    pendingFileContext = null; // Clear after sending
                }
                
                // Now send the audio
                session.sendRealtimeInput({ media: blob });
            });
        },
        sendContext: sendContext,
        sendFileContext: sendFileContext,
        close: () => {
            sessionPromise.then(session => session.close());
        }
    };
};

// --- AI AUTO-FIX FOR GHOSTLY LINTER ---

export interface AutoFixResult {
    success: boolean;
    fixedCode: string;
    explanation: string;
    fixApplied: string;
}

export const autoFixErrorWithAI = async (
    fileContent: string,
    fileName: string,
    language: string,
    errorType: string,
    errorMessage: string,
    errorLine?: number,
    errorCode?: string
): Promise<AutoFixResult | null> => {
    try {
        const lineContext = errorLine
            ? `The error is on line ${errorLine}. The problematic code is: "${errorCode || 'unknown'}"`
            : `The error affects the entire file.`;

        const prompt = `
ROLE: Expert Code Fixer - You are a senior developer fixing code errors.

FILE: ${fileName}
LANGUAGE: ${language}
ERROR TYPE: ${errorType}
ERROR MESSAGE: ${errorMessage}
${lineContext}

FULL FILE CONTENT:
\`\`\`${language}
${fileContent}
\`\`\`

TASK: Fix ONLY the specific error mentioned. Do NOT refactor or change anything else.

RULES:
1. Fix ONLY the error described - nothing else
2. Keep all other code EXACTLY the same
3. If it's a "var" error, replace with "let" or "const" as appropriate
4. If it's an "any" type error, infer the correct type or use "unknown"
5. If it's an "eval" error, replace with a safer alternative or comment it out with explanation
6. If it's an empty catch, add proper error handling
7. If it's unbalanced brackets/parentheses, fix the balance
8. Preserve all formatting, comments, and whitespace

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just raw JSON):
{
    "success": true,
    "fixedCode": "THE ENTIRE FILE WITH THE FIX APPLIED",
    "explanation": "Brief explanation of what was fixed",
    "fixApplied": "The specific change made (e.g., 'Changed var to const on line 15')"
}

If you cannot fix the error, respond with:
{
    "success": false,
    "fixedCode": "",
    "explanation": "Why the fix couldn't be applied",
    "fixApplied": ""
}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(text);
            return {
                success: result.success ?? false,
                fixedCode: result.fixedCode || "",
                explanation: result.explanation || "Fix applied",
                fixApplied: result.fixApplied || "Unknown fix"
            };
        } catch {
            // If JSON parsing fails, try to extract code
            return {
                success: false,
                fixedCode: "",
                explanation: "Failed to parse AI response",
                fixApplied: ""
            };
        }
    } catch (e) {
        console.error("AI Auto-fix failed", e);
        return null;
    }
};

// Mass auto-fix multiple errors in a file
export const massAutoFixWithAI = async (
    fileContent: string,
    fileName: string,
    language: string,
    errors: Array<{ type: string; message: string; line?: number; code?: string }>
): Promise<AutoFixResult | null> => {
    try {
        const errorsList = errors.map((e, i) =>
            `${i + 1}. [${e.type}] Line ${e.line || '?'}: ${e.message}${e.code ? ` - Code: "${e.code}"` : ''}`
        ).join('\n');

        const prompt = `
ROLE: Expert Code Fixer - You are a senior developer fixing multiple code errors.

FILE: ${fileName}
LANGUAGE: ${language}

ERRORS TO FIX:
${errorsList}

FULL FILE CONTENT:
\`\`\`${language}
${fileContent}
\`\`\`

TASK: Fix ALL the errors listed above. Do NOT refactor or change anything else.

RULES:
1. Fix ALL errors listed - nothing more, nothing less
2. Keep all other code EXACTLY the same
3. For "var" errors: replace with "let" or "const" as appropriate
4. For "any" type errors: infer the correct type or use "unknown"
5. For "eval" errors: replace with safer alternative or comment out with explanation
6. For empty catch: add proper error handling (console.error or throw)
7. For unbalanced brackets: fix the balance
8. Preserve all formatting, comments, and whitespace

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just raw JSON):
{
    "success": true,
    "fixedCode": "THE ENTIRE FILE WITH ALL FIXES APPLIED",
    "explanation": "Summary of all fixes applied",
    "fixApplied": "List of changes: 1) ... 2) ... 3) ..."
}
`;  

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const result = JSON.parse(text);
            return {
                success: result.success ?? false,
                fixedCode: result.fixedCode || "",
                explanation: result.explanation || "Fixes applied",
                fixApplied: result.fixApplied || "Multiple fixes"
            };
        } catch {
            return {
                success: false,
                fixedCode: "",
                explanation: "Failed to parse AI response",
                fixApplied: ""
            };
        }
    } catch (e) {
        console.error("Mass AI Auto-fix failed", e);
        return null;
    }
};
