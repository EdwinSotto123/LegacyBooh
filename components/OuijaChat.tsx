
import React, { useRef, useEffect, useState } from 'react';
import { Message, Sender, CodeFile, RitualConfig, StagedContext, LiveTranscriptItem } from '../types';
import { Typewriter } from './Typewriter';
import { generateGhostVoice, connectLiveSeance, playPCM } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface OuijaChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isSummoned: boolean;
  files: CodeFile[]; // Need files for Live context
  activeCodeContext: { text: string; intent: string; timestamp: number; id?: string, fileName?: string } | null;
  ritualConfig: RitualConfig | null;
}

export const OuijaChat: React.FC<OuijaChatProps> = ({ 
    messages, 
    onSendMessage, 
    isLoading, 
    isSummoned, 
    files,
    activeCodeContext,
    ritualConfig
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // TTS State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Live Seance State
  const [isSeanceActive, setIsSeanceActive] = useState(false);
  const [visualizerVolume, setVisualizerVolume] = useState(0); // 0 to 100
  const [isTransmittingContext, setIsTransmittingContext] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptItem[]>([]);
  
  const liveSessionRef = useRef<{ sendAudio: (data: Float32Array) => void, sendContext: (text: string) => void, sendFileContext: (fileName: string, content: string) => void, close: () => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Telemetry Logs (New)
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Queue System
  const [offerings, setOfferings] = useState<StagedContext[]>([]);
  const lastProcessedContextId = useRef<string | null>(null);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telemetryLogs]);

  useEffect(() => {
    if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveTranscript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle "Code Telepathy" - Queueing Context
  useEffect(() => {
      if (activeCodeContext && activeCodeContext.id !== lastProcessedContextId.current) {
          lastProcessedContextId.current = activeCodeContext.id || null;
          
          const msg = `[OUIJA QUEUE] Offer Received: ${activeCodeContext.fileName}`;
          console.log(msg);
          setTelemetryLogs(prev => [...prev, msg]);
          
           // Add to offerings queue
           setOfferings(prev => [...prev, {
               id: activeCodeContext.id || uuidv4(),
               text: activeCodeContext.text,
               intent: activeCodeContext.intent,
               fileName: activeCodeContext.fileName || 'Unknown Scroll',
               timestamp: activeCodeContext.timestamp
           }]);
      }
  }, [activeCodeContext]);

  // Handle TTS Playback
  const playGhostTTS = async (messageId: string, text: string) => {
      if (playingAudioId === messageId) return; // Prevent double click

      setPlayingAudioId(messageId);
      const base64Audio = await generateGhostVoice(text);
      
      if (base64Audio) {
          await playPCM(base64Audio);
      }
      setPlayingAudioId(null);
  };

  // Handle Live Seance Start
  const startLiveSeance = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (isSeanceActive) return;
    if (!ritualConfig) {
        console.error("No ritual config found");
        return;
    }
    
    // Safety Cleanup
    if (liveSessionRef.current) {
        liveSessionRef.current.close();
    }
    
    setIsSeanceActive(true);
    setTelemetryLogs(["Initializing Seance Protocol..."]);
    setLiveTranscript([]); // Reset visual transcript
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Use default sample rate from browser to avoid hardware errors
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        
        // Input processing
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        
        const playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        let nextStartTime = 0;

        const session = await connectLiveSeance(
            files,
            ritualConfig,
            (audioBuffer) => {
                const source = playbackCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(playbackCtx.destination);
                
                const now = playbackCtx.currentTime;
                const start = Math.max(now, nextStartTime);
                source.start(start);
                nextStartTime = start + audioBuffer.duration;

                // Visualizer effect for Output
                setVisualizerVolume(Math.random() * 50 + 40);
                setTimeout(() => setVisualizerVolume(Math.random() * 10), audioBuffer.duration * 1000);

                // AUDIO EVENT FOR TRANSCRIPT
                setLiveTranscript(prev => {
                    const last = prev[prev.length -1];
                    if (last && last.sender === 'SPIRIT' && last.type === 'AUDIO' && Date.now() - last.timestamp < 2000) {
                        return prev;
                    }
                    if (last && last.sender === 'SPIRIT' && last.type === 'TEXT') {
                         return prev;
                    }

                    return [...prev, {
                        id: uuidv4(),
                        sender: 'SPIRIT',
                        type: 'AUDIO',
                        timestamp: Date.now()
                    }];
                });
            },
            () => {
                stopLiveSeance();
            },
            (logMessage) => {
                // TELEMETRY CALLBACK
                setTelemetryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessage}`]);
            },
            (sender, text) => {
                // TRANSCRIPT CALLBACK
                setLiveTranscript(prev => {
                    // Update the existing placeholder or add new text
                    const last = prev[prev.length -1];
                    
                    // If we have a Spirit AUDIO placeholder, replace it with TEXT
                    if (sender === 'SPIRIT' && last && last.sender === 'SPIRIT' && last.type === 'AUDIO') {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            ...last,
                            type: 'TEXT',
                            content: (last.content || "") + text
                        };
                        return updated;
                    }

                    // Append to existing text bubble if same sender
                    if (last && last.sender === sender && last.type === 'TEXT') {
                         const updated = [...prev];
                         updated[updated.length - 1] = {
                             ...last,
                             content: (last.content || "") + text
                         };
                         return updated;
                    }

                    // New entry
                    return [...prev, {
                        id: uuidv4(),
                        sender: sender,
                        type: 'TEXT',
                        content: text,
                        timestamp: Date.now()
                    }];
                });
            }
        );

        liveSessionRef.current = session;

        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate RMS for Visualizer (User Input)
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            
            // Only update visualizer if ghost isn't speaking (simple priority)
            if (visualizerVolume < 20) {
                 setVisualizerVolume(rms * 800); 
            }

            session.sendAudio(inputData);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination); 

    } catch (err: any) {
        console.error("Mic Error:", err);
        setTelemetryLogs(prev => [...prev, `CRITICAL ERROR: ${err.message}`]);
        // Don't stop immediately to let user see error
    }
  };

  const stopLiveSeance = () => {
      liveSessionRef.current?.close();
      
      // Safety check for AudioContext to prevent "Cannot close a closed AudioContext"
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(e => console.warn("Error closing audio context", e));
      }
      
      setIsSeanceActive(false);
      setVisualizerVolume(0);
      setOfferings([]); 
      setTelemetryLogs([]);
  };

  const removeOffering = (id: string) => {
      setOfferings(prev => prev.filter(o => o.id !== id));
  };

  // DRAG AND DROP HANDLERS
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!isSummoned) return;
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!isSummoned) return;

      // Check for internal file drag (from sidebar)
      const internalData = e.dataTransfer.getData('application/x-code-file');
      if (internalData) {
          try {
              const fileData = JSON.parse(internalData);
              const newOffering: StagedContext = {
                  id: uuidv4(),
                  text: fileData.content,
                  intent: 'explain', // Default intent for dragged files
                  fileName: fileData.fileName,
                  timestamp: Date.now()
              };
              setOfferings(prev => [...prev, newOffering]);
              setTelemetryLogs(prev => [...prev, `[INTERNAL DROP] ${fileData.fileName} added to offerings`]);
              return;
          } catch(err) {
              console.error("Failed to parse internal file data", err);
          }
      }

      // Handle external file drops
      const items = Array.from(e.dataTransfer.files);
      if (items.length === 0) return;

      setTelemetryLogs(prev => [...prev, `[DROP EVENT] Processing ${items.length} files...`]);

      for (const file of items) {
          try {
              const text = await file.text();
              const newOffering: StagedContext = {
                  id: uuidv4(),
                  text: text,
                  intent: 'refactor', // Default intent for dropped files is often to fix/refactor
                  fileName: file.name,
                  timestamp: Date.now()
              };
              setOfferings(prev => [...prev, newOffering]);
              setTelemetryLogs(prev => [...prev, `[OFFERING ADDED] ${file.name}`]);
          } catch(err) {
              console.error("Failed to read dropped file", err);
          }
      }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[OUIJA DEBUG] Transmit button clicked / Form Submitted");
    
    // In Live Mode, we can send text AND the queued offerings
    if (isSeanceActive && liveSessionRef.current) {
         if (!input.trim() && offerings.length === 0) return;

         let transcriptText = "";
         
         // IMPROVED: Send file context FIRST using dedicated method
         // This ensures the model has the code BEFORE processing the user's question
         if (offerings.length > 0) {
             setTelemetryLogs(prev => [...prev, `[FILE CONTEXT] Injecting ${offerings.length} file(s) into context...`]);
             
             // Send each file's context using the dedicated method
             offerings.forEach((off, idx) => {
                 // Use sendFileContext for proper text+audio handling
                 liveSessionRef.current?.sendFileContext(off.fileName, off.text);
                 setTelemetryLogs(prev => [...prev, `[FILE ${idx + 1}] ${off.fileName} injected (${off.text.length} chars)`]);
             });
             
             transcriptText += `[📄 ${offerings.map(o => o.fileName).join(', ')}] `;
         }
         
         // Build the user's question/instruction
         let finalPrompt = "";
         
         if (offerings.length > 0) {
             // DIRECT AND CLEAR instruction after file context is sent
             const lang = ritualConfig?.spokenLanguage || 'es';
             const fileNames = offerings.map(o => o.fileName).join(', ');
             const intents = offerings.map(o => o.intent).join(', ');
             
             finalPrompt += lang === 'es'
                 ? `[INSTRUCTION]\nI just sent you ${offerings.length} file(s): ${fileNames}\nI want you to: ${intents.toUpperCase()}\n`
                 : `[INSTRUCTION]\nI just sent you ${offerings.length} file(s): ${fileNames}\nI want you to: ${intents.toUpperCase()}\n`;
             
             finalPrompt += lang === 'es'
                 ? `RULES:\n1. Mention the REAL file name: "${fileNames}"\n2. Explain what the code does in 1-2 sentences.\n3. Add a sarcastic ghost comment.\n4. Do NOT say you can't see the file - I ALREADY SENT IT.\n`
                 : `RULES:\n1. Mention the REAL file name: "${fileNames}"\n2. Explain what the code does in 1-2 sentences.\n3. Add a sarcastic ghost comment.\n4. Do NOT say you can't see the file - I ALREADY SENT IT.\n`;
         }
         
         if (input.trim()) {
             finalPrompt += `\n${input}\n`;
             transcriptText += input;
         } else if (offerings.length > 0) {
             const lang = ritualConfig?.spokenLanguage || 'es';
             finalPrompt += lang === 'es'
                 ? `\nAnalyze the code I sent and comment with your sarcastic ghost style.\n`
                 : `\nAnalyze the code I sent and comment with your sarcastic ghost style.\n`;
         }
         
         // Add to Visual Transcript (Manual User Entry)
         setLiveTranscript(prev => [...prev, {
             id: uuidv4(),
             sender: 'USER',
             type: 'TEXT',
             content: transcriptText || input,
             timestamp: Date.now()
         }]);

         setTelemetryLogs(prev => [...prev, `[TRANSMIT] Sending instruction payload...`]);

         // Transmit the instruction (this completes the turn and triggers response)
         setIsTransmittingContext(true);
         liveSessionRef.current.sendContext(finalPrompt);
         
         // Cleanup
         setOfferings([]);
         setInput('');
         
         // Animation
         setVisualizerVolume(95); // Higher spike to visualize transmit
         setTimeout(() => {
             setVisualizerVolume(0);
             setIsTransmittingContext(false);
         }, 800);

    } else if (!isLoading && (input.trim() || offerings.length > 0)) {
          // Normal Chat
          let fullMessage = input;
          if (offerings.length > 0) {
              fullMessage += "\n\n--- STAGED CODE OFFERINGS ---\n";
              offerings.forEach(off => {
                  fullMessage += `\nFILE: ${off.fileName} [Intent: ${off.intent}]\n\`\`\`\n${off.text}\n\`\`\`\n`;
              });
              fullMessage += "\nINSTRUCTION: Analyze these specific snippets based on their intents.";
          }

          onSendMessage(fullMessage);
          setInput('');
          setOfferings([]);
    }
  };

  if (!isSummoned) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050505] p-10 text-center relative overflow-hidden">
         {/* CUSTOM START BACKGROUND (GIF) */}
         <div className="absolute inset-0 opacity-40 flex items-center justify-center pointer-events-none z-0" style={{
            backgroundImage: `url('/assets/fondo_inicio.gif')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'contrast(120%) brightness(0.6)'
         }}>
         </div>
         
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-0 pointer-events-none"></div>

        <h3 className="text-6xl font-creep text-red-600 mb-4 z-10 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] tracking-widest animate-pulse">THE VOID</h3>
        <pre className="text-red-900/30 font-mono text-sm leading-none mb-6 z-10 select-none pointer-events-none">
{`
      .-.
     (o o)
     | O |
     |   |
     '~~~'
`}
        </pre>
        <p className="text-gray-400 font-old max-w-md z-10 text-xl text-center shadow-black drop-shadow-md">
          The planchette sits still. The air is cold. 
          <br/><br/>
          Provide the code on the altar to begin the séance.
        </p>
      </div>
    );
  }

  return (
    <div 
        className={`h-full flex flex-col relative bg-[#1c1208] overflow-hidden transition-all duration-300 ${isDragging ? 'ring-4 ring-green-500 shadow-[inset_0_0_50px_rgba(34,197,94,0.3)]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
       {isDragging && (
           <div className="absolute inset-0 z-[60] bg-green-900/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
               <div className="text-green-500 font-creep text-4xl animate-bounce drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
                   OFFER THE SCROLL
               </div>
           </div>
       )}
       
       {/* SEANCE OVERLAY (LIVE API) */}
       {isSeanceActive && (
           <div className="absolute inset-0 z-50 bg-black/95 animate-in fade-in duration-700 grid grid-cols-12 overflow-hidden">
               
               {/* --- LEFT PANEL: SYSTEM STATUS (Col 4) --- */}
               <div className="col-span-4 border-r border-green-900/30 flex flex-col bg-[#050a05]">
                   {/* Visualizer Area - OJOS GIF FULLSCREEN */}
                   <div className="h-1/3 flex flex-col items-center justify-center relative border-b border-green-900/30 overflow-hidden">
                        {/* OJOS GIF - FONDO COMPLETO */}
                        <div className="absolute inset-0 z-0">
                            <img 
                                src="/assets/ojos.gif" 
                                alt="Spirit Eyes" 
                                className="w-full h-full object-cover"
                                style={{
                                    filter: `brightness(${0.7 + visualizerVolume/150}) contrast(1.3) saturate(1.2)`,
                                    transform: `scale(${1 + visualizerVolume/300})`,
                                    transition: 'filter 0.1s ease-out, transform 0.1s ease-out'
                                }}
                            />
                        </div>
                        
                        {/* Overlay oscuro para legibilidad del texto */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-10 pointer-events-none"></div>
                        
                        {/* Efecto de glow verde reactivo al volumen */}
                        <div 
                            className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-100"
                            style={{
                                background: `radial-gradient(circle, rgba(34,197,94,${Math.min(visualizerVolume/80, 0.4)}) 0%, transparent 70%)`,
                                opacity: visualizerVolume > 5 ? 1 : 0
                            }}
                        ></div>
                        
                        {isTransmittingContext && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <div className="w-full h-full border-4 border-red-500 animate-ping opacity-75"></div>
                                <div className="absolute bottom-4 text-red-500 font-creep tracking-widest text-xs animate-bounce glitch-hover drop-shadow-[0_0_10px_black]">
                                    INJECTING THOUGHTS...
                                </div>
                            </div>
                        )}
                        <h2 className="absolute top-4 text-xl font-creep text-green-500 tracking-widest animate-pulse z-20 drop-shadow-[0_0_10px_black]">CHANNEL OPEN</h2>
                        
                        {/* LISTENING INDICATOR */}
                        {visualizerVolume > 10 && (
                            <div className="absolute bottom-2 text-[10px] text-green-400 font-mono border border-green-500/50 px-2 py-0.5 rounded bg-green-900/80 animate-pulse z-20">
                                ● MICROPHONE ACTIVE
                            </div>
                        )}
                   </div>

                   {/* Telemetry Terminal */}
                   <div className="flex-grow flex flex-col p-4 bg-black overflow-hidden relative">
                       <div className="text-[10px] text-green-700 font-mono border-b border-green-900/50 mb-2 pb-1 flex justify-between">
                           <span>SPECTRAL TELEMETRY</span>
                           <span className="animate-pulse">● REC</span>
                       </div>
                       <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-green-900/50 font-mono text-[9px] text-green-500/80 space-y-1 select-text">
                           {telemetryLogs.map((log, i) => (
                               <div key={i} className="break-words border-l border-green-900/30 pl-2 hover:bg-green-900/10">
                                   {log}
                               </div>
                           ))}
                           <div ref={logsEndRef}></div>
                       </div>
                   </div>

                   {/* Controls */}
                   <div className="p-4 border-t border-green-900/30 bg-[#0a100a]">
                        <button 
                            onClick={stopLiveSeance}
                            className="w-full border border-red-900/80 text-red-600 py-3 font-mono hover:bg-red-950/40 hover:text-red-400 transition-colors uppercase tracking-widest text-xs"
                        >
                            Sever Connection
                        </button>
                   </div>
               </div>

               {/* --- RIGHT PANEL: INTERACTION (Col 8) --- */}
               <div className="col-span-8 flex flex-col bg-[#0a0505] relative overflow-hidden">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-20 pointer-events-none"></div>

                   {/* Top: Pending Offerings - COMPACT HORIZONTAL SCROLL */}
                   <div className="flex-shrink-0 p-3 border-b border-red-900/30 bg-[#0a0505]" style={{ maxHeight: '100px' }}>
                       <div className="flex justify-between items-center mb-2">
                            <span className="text-red-500 font-creep text-xs tracking-widest">PENDING SACRIFICES</span>
                            <span className="text-[9px] text-gray-500 font-mono bg-red-950/30 px-2 py-0.5 rounded">{offerings.length} STAGED</span>
                       </div>
                       
                       {offerings.length > 0 ? (
                           <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-red-900/50">
                               {offerings.map(off => (
                                   <div key={off.id} className="flex-shrink-0 flex items-center gap-2 bg-red-950/20 border border-red-900/40 px-2 py-1.5 rounded">
                                       <span className="text-[10px] text-red-300 font-mono truncate max-w-[100px]">{off.fileName}</span>
                                       <span className="text-[8px] text-gray-500 uppercase">{off.intent}</span>
                                       <button onClick={() => removeOffering(off.id)} className="text-red-800 hover:text-red-400 text-sm">×</button>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="flex items-center justify-center opacity-40 py-2">
                               <span className="text-xl mr-2">📜</span>
                               <p className="font-mono text-xs text-gray-500">Drag files here</p>
                           </div>
                       )}
                   </div>

                   {/* Bottom: Psychophonic Transcript - MAIN SCROLL AREA */}
                   <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0">
                       <div className="flex-shrink-0 text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">Psychophonic Transcript</div>
                       
                       <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-800 min-h-0">
                           {liveTranscript.length === 0 && (
                               <div className="text-center text-gray-700 italic text-xs mt-10">
                                   The channel is open. Speak now...
                               </div>
                           )}
                           {liveTranscript.map((item) => (
                               <div key={item.id} className={`flex ${item.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                   {item.sender === 'USER' ? (
                                       <div className="bg-gray-900/80 border border-gray-700/50 rounded p-3 max-w-[80%]">
                                           <div className="text-[9px] text-gray-500 mb-1 font-bold">YOU</div>
                                           <p className="text-gray-300 font-old text-sm">{item.content}</p>
                                       </div>
                                   ) : (
                                       <div className="bg-green-950/20 border border-green-900/30 rounded p-3 max-w-[80%] flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                                           <div className="text-2xl mt-1">💀</div>
                                           <div className="flex flex-col">
                                               <div className="text-[9px] text-green-700 mb-1 font-bold">SPIRIT VOICE</div>
                                               
                                               {item.type === 'TEXT' ? (
                                                   // TEXT CONTENT (TRANSCRIPTION)
                                                   <p className="text-green-400 font-mono text-sm leading-relaxed drop-shadow-[0_0_2px_rgba(74,222,128,0.5)]">
                                                       {item.content}
                                                   </p>
                                               ) : (
                                                   // RAW AUDIO VISUALIZATION
                                                   <div className="flex gap-1 items-end h-4 mt-1">
                                                       {[...Array(5)].map((_, i) => (
                                                           <div key={i} className="w-1 bg-green-500/50 animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                                                       ))}
                                                   </div>
                                               )}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           ))}
                           <div ref={transcriptEndRef} />
                       </div>

                       {/* Controls at bottom right */}
                       <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500 font-mono">
                           <span>INPUT: MIC / TEXT</span>
                           <span className={isTransmittingContext ? "text-red-500 animate-pulse" : "text-green-900"}>
                               {isTransmittingContext ? "TRANSMITTING DATA..." : "LINK STABLE"}
                           </span>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* HEADER with Live Button */}
       <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-40 pointer-events-auto">
           {/* Left Header - OUIJA */}
           <div className="opacity-40 font-old text-3xl tracking-[0.5em] text-[#150d03] drop-shadow-md select-none pointer-events-none glitch-hover">
               OUIJA
           </div>
           
           {/* Right Header - Live Button */}
           <div className="flex items-center gap-4">
               <button 
                  onClick={startLiveSeance}
                  disabled={isSeanceActive}
                  className="group relative overflow-hidden bg-red-950/20 backdrop-blur-sm border border-red-900/50 hover:bg-red-950/60 text-red-500 px-4 py-2 font-creep tracking-widest transition-all duration-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-2"
               >
                   <span className="animate-pulse text-lg">🎙️</span> 
                   <span className="group-hover:text-red-300">INVOKE SPIRIT</span>
               </button>
           </div>
       </div>

        {/* GHOST PORTRAIT PLACEHOLDER */}
        <div className="absolute top-20 right-6 w-24 h-32 border border-[#2b1d0e] bg-[#0f0a05] shadow-[0_0_15px_rgba(0,0,0,0.8)] z-10 hidden md:block opacity-90 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] opacity-50"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-20 bg-gradient-to-t from-gray-900 via-gray-800 to-transparent rounded-[50%] blur-sm animate-ghost-breathe opacity-60"></div>
            </div>
            <div className="absolute top-1/3 left-1/4 w-full h-full animate-spectral-float opacity-40">
                 <div className="absolute top-3 left-5 w-1 h-1 bg-red-900/80 rounded-full shadow-[0_0_4px_red]"></div>
                 <div className="absolute top-3 right-12 w-1 h-1 bg-red-900/80 rounded-full shadow-[0_0_4px_red]"></div>
            </div>
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[200%] w-full animate-scanline opacity-10 pointer-events-none"></div>
            <div className="absolute bottom-0 w-full bg-[#1a1208] text-[8px] text-center text-[#5c3a10] font-mono py-0.5 border-t border-[#2b1d0e] tracking-wider">
                MANIFESTATION
            </div>
       </div>

       {/* STANDARD CHAT LAYERS */}
       <div className="absolute inset-0 pointer-events-none z-0 bg-black/50">
          <div className="w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
       </div>

       <div className="absolute inset-0 pointer-events-none z-0" style={{
          background: `
            linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8)),
            repeating-linear-gradient(45deg, #2b1d0e 0px, #2b1d0e 2px, #3a2814 2px, #3a2814 6px)
          `,
       }}></div>

       {/* MOON GIF OVERLAY (Ambience) */}
       <div className="absolute top-20 left-10 pointer-events-none z-0 opacity-30 mix-blend-screen animate-pulse">
           <img src="/assets/luna_sangre.gif" className="w-64 h-64 object-contain opacity-80" alt="Blood Moon" />
       </div>

       <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.95)_120%)]"></div>

       {/* Ouija Board Markings Background */}
       <div className="absolute inset-0 pointer-events-none z-0 flex flex-col justify-between py-8 px-4 text-[#150d03] opacity-40 select-none overflow-hidden mix-blend-multiply">
          <div className="flex justify-center text-5xl font-old tracking-[0.5em] leading-loose px-10 scale-x-110 drop-shadow-sm mt-16">
              A B C D E F G H I J K L M
          </div>
          <div className="flex justify-center text-5xl font-old tracking-[0.5em] leading-loose px-10 scale-x-110 drop-shadow-sm">
              N O P Q R S T U V W X Y Z
          </div>
          <div className="text-center pb-24">
             <div className="text-6xl font-old tracking-[0.2em] uppercase transform scale-y-150 drop-shadow-md">Good Bye</div>
          </div>
       </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-6 pt-20 space-y-6 z-20 relative scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent pb-32">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] p-5 rounded-sm shadow-2xl backdrop-blur-md border relative flex flex-col gap-2
                ${msg.sender === Sender.USER 
                  ? 'bg-black/70 border-gray-700/50 text-gray-200' 
                  : 'bg-[#0a0f0a]/85 border-green-900/60 text-green-400 shadow-[0_0_30px_rgba(20,83,45,0.15)]'
                }
              `}
            >
              <div className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] flex items-center justify-between border-b border-white/10 pb-1">
                {msg.sender === Sender.USER ? (
                    <span>YOU</span>
                ) : (
                    <div className="flex items-center gap-2 w-full">
                        <span>💀 SPIRIT</span>
                        <button 
                            onClick={() => playGhostTTS(msg.id, msg.text)}
                            className={`ml-auto px-2 py-1 border text-[10px] uppercase font-mono tracking-wider transition-all duration-300 z-50 pointer-events-auto
                                ${playingAudioId === msg.id 
                                    ? 'border-green-400 bg-green-900/50 text-white animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]' 
                                    : 'border-green-800 bg-black/50 text-green-700 hover:text-green-400 hover:border-green-500'
                                }`}
                        >
                           {playingAudioId === msg.id ? '🔊 LISTENING...' : '🔈 HEAR VOICE'}
                        </button>
                    </div>
                )}
              </div>
              
              {msg.sender === Sender.GHOST ? (
                <Typewriter text={msg.text} className="font-mono text-lg leading-relaxed drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" />
              ) : (
                <p className="font-old text-xl leading-relaxed drop-shadow-[0_2px_2px_rgba(0,0,0,1)] text-[#d4b483] whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-[#0a0f0a]/80 border border-green-900/30 p-4 text-green-700 font-mono animate-pulse rounded">
                *The planchette moves violently across the letters...*
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0a0500]/95 border-t border-[#3d260a] z-30 shadow-[0_-5px_30px_rgba(0,0,0,1)] relative flex flex-col">
        
        {/* Staging Area for Text Chat */}
        {!isSeanceActive && offerings.length > 0 && (
           <div className="max-w-5xl mx-auto w-full mb-2 bg-red-950/20 border border-red-900/50 p-2 rounded flex flex-col gap-2 backdrop-blur-sm animate-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center px-2">
                   <span className="text-[10px] text-red-400 font-mono tracking-widest uppercase">PENDING SACRIFICES ({offerings.length})</span>
                   <button onClick={() => setOfferings([])} className="text-[10px] text-red-500 hover:text-white font-mono">CLEAR ALL</button>
               </div>
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-red-900">
                   {offerings.map(off => (
                       <div key={off.id} className="flex-shrink-0 bg-black/60 border border-red-900/30 px-2 py-1 rounded text-xs text-gray-400 font-mono flex items-center gap-2">
                           <span>📄 {off.fileName}</span>
                           <span className="text-[9px] uppercase bg-red-900/20 px-1 text-red-500">{off.intent}</span>
                           <button onClick={() => removeOffering(off.id)} className="hover:text-white ml-1">×</button>
                       </div>
                   ))}
               </div>
           </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-4 max-w-5xl mx-auto w-full">
          <div className="relative flex-grow group">
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder={isSeanceActive ? "Speak or type to offer these scrolls..." : (offerings.length > 0 ? "Ask about these offerings..." : "Drag files here to offer them to the spirit...")}
                className="w-full bg-[#1a1208] border border-[#3d260a] text-[#e5e5e5] p-4 pl-6 font-old text-xl focus:outline-none focus:border-red-900 focus:bg-[#24190b] transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] placeholder:text-white/20"
            />
          </div>

          <button
            type="submit"
            disabled={(isLoading && !isSeanceActive) || (!input.trim() && offerings.length === 0)}
            className="bg-[#2e1e0a] hover:bg-[#3d260a] text-[#d4b483] border border-[#5c3a10] px-8 font-old text-xl tracking-[0.2em] uppercase transition-all disabled:opacity-30 disabled:grayscale hover:shadow-[0_0_20px_rgba(212,180,131,0.1)] active:translate-y-1"
          >
            {isSeanceActive && offerings.length > 0 ? "TRANSMIT" : (offerings.length > 0 ? "OFFER" : "ASK")}
          </button>
        </form>
      </div>
    </div>
  );
};
