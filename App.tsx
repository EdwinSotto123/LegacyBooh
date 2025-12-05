
import React, { useState } from 'react';
import { Altar } from './components/Altar';
import { OuijaChat } from './components/OuijaChat';
import { summonSpirit, talkToGhost, manifestSpiritIntro, playPCM, warmUpAudio } from './services/geminiService';
import { Message, Sender, CodeFile, Intent, RitualConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [isSummoned, setIsSummoned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ritualConfig, setRitualConfig] = useState<RitualConfig | null>(null);
  
  // Track the active file index from Altar
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
  
  // Bridge State: Stores the latest code selected in Altar to be sent to Live Chat
  const [activeCodeContext, setActiveCodeContext] = useState<{
      text: string; 
      intent: string; 
      timestamp: number;
      id?: string;
      fileName?: string;
  } | null>(null);

  const handleSummon = async (config: RitualConfig) => {
    if (files.length === 0) return;
    
    // CRITICAL: Warm up audio context immediately on user gesture
    warmUpAudio();

    setRitualConfig(config);
    setIsLoading(true);
    
    // Play invocation sound effect immediately
    const invocationAudio = new Audio('/assets/exorcismo.mp3');
    invocationAudio.volume = 0.5;
    invocationAudio.play().catch(e => console.warn("Invocation sound blocked", e));
    
    // 1. MANIFESTATION INTRO (Voice)
    // The Ghost introduces itself based on the specific version provided
    try {
        const audioData = await manifestSpiritIntro(config);
        
        if (audioData) {
            // Play the intro audio. await execution so it finishes BEFORE chat appears
            await playPCM(audioData);
        } else {
            // Fallback: Play a local sound if TTS fails
            console.warn("TTS failed, playing fallback sound");
            const fallbackAudio = new Audio('/assets/grito.mp3');
            fallbackAudio.volume = 0.4;
            await new Promise<void>((resolve) => {
                fallbackAudio.onended = () => resolve();
                fallbackAudio.play().catch(() => resolve());
                // Timeout fallback
                setTimeout(resolve, 3000);
            });
        }
    } catch (e) {
        console.error("Manifestation intro failed:", e);
        // Play fallback sound on error
        const fallbackAudio = new Audio('/assets/grito.mp3');
        fallbackAudio.volume = 0.4;
        fallbackAudio.play().catch(() => {});
    }
    
    // 2. TEXT SUMMONING (Background)
    const ghostResponseText = await summonSpirit(files, config);
    
    const ghostMessage: Message = {
        id: uuidv4(),
        sender: Sender.GHOST,
        text: ghostResponseText,
        timestamp: new Date(),
    };
    
    setMessages([ghostMessage]);
    setIsSummoned(true);
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string, contextSelection?: string, intent: Intent = 'explain') => {
    const userMessage: Message = {
      id: uuidv4(),
      sender: Sender.USER,
      text: contextSelection ? `(Pointing at code) ${text}` : text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Get the active file context to send to the ghost
    const activeFile = activeFileIndex >= 0 && activeFileIndex < files.length 
        ? { name: files[activeFileIndex].name, content: files[activeFileIndex].content }
        : undefined;

    const ghostResponseText = await talkToGhost(text, contextSelection, intent, activeFile);

    const ghostMessage: Message = {
      id: uuidv4(),
      sender: Sender.GHOST,
      text: ghostResponseText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, ghostMessage]);
    setIsLoading(false);
  };

  // Callback when user selects code in Altar and clicks a spell action
  const handleCodeSelection = (selection: string, fileName: string, intent: Intent) => {
      // 1. Update the bridge state for Live API (telepathy)
      setActiveCodeContext({
          id: uuidv4(), // Unique ID for queue detection
          text: selection,
          intent: intent,
          fileName: fileName,
          timestamp: Date.now()
      });

      // 2. Also trigger standard text chat if needed (Only if NOT in Live mode, handled by OuijaChat logic)
      // OuijaChat will decide whether to consume this for Live Queue or trigger text chat.
      // But we need to support the legacy text flow too.
      // The OuijaChat component will ignore this update for text chat purposes if Live is active.
      
      const context = `File: ${fileName}\nCode:\n${selection}`;
      let query = "What does this do?";
      switch (intent) {
          case 'risk': query = "What happens if I change or delete this?"; break;
          case 'migrate': query = "How do I rewrite this in a modern framework?"; break;
          case 'roast': query = "Roast this code snippet."; break;
          case 'explain': 
          default: query = "Explain the logic here."; break;
      }

      // We ONLY trigger the text chat directly if we assume Live isn't active. 
      // However, App.tsx doesn't know if Live is active. OuijaChat does.
      // So we will let OuijaChat handle the "Trigger" logic. 
      // But wait, handleSendMessage is here.
      // Refactor: We will EXPOSE handleSendMessage to OuijaChat, and OuijaChat will call it when needed.
      // App.tsx just passes data.
      
      // For legacy text chat (when Live is OFF), we need to trigger it. 
      // But we don't know here if Live is off. 
      // Solution: We'll just pass the context. OuijaChat will auto-trigger text chat if Live is OFF.
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-black text-white selection:bg-red-900 selection:text-white">
      {/* Left Panel: The Altar (IDE) */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col">
        <Altar 
          files={files} 
          setFiles={setFiles} 
          onSummon={handleSummon}
          onCodeSelect={handleCodeSelection}
          onActiveFileChange={setActiveFileIndex}
          isLoading={isLoading}
          isSummoned={isSummoned}
        />
      </div>

      {/* Right Panel: The Séance (Chat) */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full">
        <OuijaChat 
          messages={messages}
          onSendMessage={(text) => handleSendMessage(text)} // Classic Chat Trigger
          isLoading={isLoading}
          isSummoned={isSummoned}
          files={files}
          activeCodeContext={activeCodeContext}
          ritualConfig={ritualConfig}
        />
      </div>
    </div>
  );
};

export default App;
