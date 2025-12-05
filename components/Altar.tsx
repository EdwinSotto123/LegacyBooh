
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import mermaid from 'mermaid';
import { CodeFile, Intent, RitualConfig, TechSin, GhostPersona, CodeSymbol, SymbolType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { generateSpiritGraph, exorciseCode, exorciseCodeWithDetails, narrateExorcism, analyzeProject, playGlitchSound, playExorcismSound, playPCM, ProjectAnalysisResult, setCurrentPersonaGender, startBackgroundMusic, startLoopAudio, stopLoopAudio, playSoundEffect, autoFixErrorWithAI, massAutoFixWithAI } from '../services/geminiService';

interface AltarProps {
    files: CodeFile[];
    setFiles: (files: CodeFile[]) => void;
    onSummon: (config: RitualConfig) => void;
    onCodeSelect: (selection: string, fileName: string, intent: Intent) => void;
    onActiveFileChange?: (index: number) => void;
    isLoading: boolean;
    isSummoned: boolean;
}

const PERSONAS: GhostPersona[] = [
    {
        id: 'adrian',
        name: 'ADRIAN "THE ARCHITECT"',
        role: 'Senior Backend Engineer',
        deathCause: 'Cardiac arrest waiting for a Pull Request approval',
        quote: 'My patterns are perfect. Your understanding is flawed.',
        gender: 'male',
        emoji: '🏛️',
        specialty: 'Design Patterns & Architecture',
        image: '/assets/Adrian.jpg'
    },
    {
        id: 'marcus',
        name: 'MARCUS "THE HACKER"',
        role: 'Security Consultant',
        deathCause: 'Caffeine overdose during a 72-hour CTF',
        quote: 'Optimization is a myth. Security is a lie. Sleep is for the weak.',
        gender: 'male',
        emoji: '💀',
        specialty: 'Security & Performance',
        image: '/assets/Marcus.jpg'
    },
    {
        id: 'beatrice',
        name: 'BEATRICE "ROOT"',
        role: 'SysAdmin / DevOps',
        deathCause: 'Untangling a recursive symlink in a server fire',
        quote: 'It works on my machine because my machine is the altar.',
        gender: 'female',
        emoji: '🖥️',
        specialty: 'Infrastructure & Deployment',
        image: '/assets/Beatrice.jpg'
    },
    {
        id: 'elena',
        name: 'ELENA "THE ORACLE"',
        role: 'Data Scientist / ML Engineer',
        deathCause: 'Lost in an infinite loop of hyperparameter tuning',
        quote: 'The model predicted this would happen. You just didn\'t listen.',
        gender: 'female',
        emoji: '🔮',
        specialty: 'Data & Machine Learning',
        image: '/assets/Elena.jpg'
    },
    {
        id: 'carlos',
        name: 'CARLOS "LEGACY"',
        role: 'COBOL Maintainer',
        deathCause: 'Y2K bug finally caught up with him in 2038',
        quote: 'This code ran banks before you were born. Show some respect.',
        gender: 'male',
        emoji: '📟',
        specialty: 'Legacy Systems & Mainframes',
        image: '/assets/Carlos.jpg'
    },
    {
        id: 'sofia',
        name: 'SOFIA "THE DEBUGGER"',
        role: 'QA Lead / Test Engineer',
        deathCause: 'Found a bug in production that no one believed existed',
        quote: 'I told them it would break. They deployed anyway.',
        gender: 'female',
        emoji: '🐛',
        specialty: 'Testing & Quality Assurance',
        image: '/assets/Sofia.jpg'
    }
];

// --- HOOKS ---

// History Hook for Time Travel (Undo/Redo) - FIXED VERSION
function useHistory(initialState: string) {
    const historyRef = useRef<string[]>([initialState]);
    const indexRef = useRef(0);
    const [, forceUpdate] = useState(0);

    const push = useCallback((newState: string) => {
        const currentHistory = historyRef.current;
        const currentIndex = indexRef.current;

        // Don't push if same as current
        if (currentHistory[currentIndex] === newState) return;

        // Truncate future history and add new state
        const newHistory = currentHistory.slice(0, currentIndex + 1);
        newHistory.push(newState);
        historyRef.current = newHistory;
        indexRef.current = newHistory.length - 1;
        forceUpdate(n => n + 1);
    }, []);

    const undo = useCallback(() => {
        if (indexRef.current > 0) {
            indexRef.current -= 1;
            forceUpdate(n => n + 1);
            return historyRef.current[indexRef.current];
        }
        return null;
    }, []);

    const redo = useCallback(() => {
        if (indexRef.current < historyRef.current.length - 1) {
            indexRef.current += 1;
            forceUpdate(n => n + 1);
            return historyRef.current[indexRef.current];
        }
        return null;
    }, []);

    const reset = useCallback((state: string) => {
        historyRef.current = [state];
        indexRef.current = 0;
        forceUpdate(n => n + 1);
    }, []);

    return {
        push,
        undo,
        redo,
        canUndo: indexRef.current > 0,
        canRedo: indexRef.current < historyRef.current.length - 1,
        reset,
        currentIndex: indexRef.current,
        historyLength: historyRef.current.length
    };
}

// --- HELPER COMPONENTS ---

const MermaidViewer = ({ chart, onExpand }: { chart: string, onExpand?: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            fontFamily: 'monospace',
            themeVariables: {
                primaryColor: '#1a0505',
                primaryTextColor: '#ef4444',
                lineColor: '#ef4444',
                mainBkg: '#0a0505',
                nodeBorder: '#7f1d1d'
            }
        });
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (chart && ref.current) {
                try {
                    const id = `mermaid-${uuidv4().replace(/-/g, '')}`; // Ensure valid ID
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                } catch (error) {
                    console.error("Mermaid Render Error", error);
                    setSvg('<div class="text-red-500 text-xs p-2">Failed to manifest spirit web. The logic is too twisted.</div>');
                }
            }
        };
        renderChart();
    }, [chart]);

    return (
        <div className="relative group">
            <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="w-full overflow-x-auto p-2 bg-black/40 border border-red-900/20 min-h-[100px]" />
            {onExpand && (
                <button
                    onClick={onExpand}
                    className="absolute top-2 right-2 bg-black/80 text-red-500 border border-red-900 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900 hover:text-white"
                    title="Expand Projection"
                >
                    ⛶
                </button>
            )}
        </div>
    );
};

// --- FILE TREE LOGIC ---

interface TreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: Record<string, TreeNode>;
    fileIndex?: number;
}

const buildFileTree = (files: CodeFile[]) => {
    const root: TreeNode = { name: 'root', path: '', isFile: false, children: {} };

    files.forEach((file, index) => {
        const parts = file.name.split('/');
        let current = root;

        parts.forEach((part, partIndex) => {
            if (!current.children[part]) {
                const isFile = partIndex === parts.length - 1;
                current.children[part] = {
                    name: part,
                    path: parts.slice(0, partIndex + 1).join('/'),
                    isFile,
                    children: {},
                    fileIndex: isFile ? index : undefined
                };
            }
            current = current.children[part];
        });
    });
    return root;
};

const FileTreeItem = ({ node, activeIndex, onSelect, depth = 0, files }: { node: TreeNode, activeIndex: number, onSelect: (idx: number) => void, depth?: number, files?: CodeFile[] }) => {
    const [isOpen, setIsOpen] = useState(true); // Default open for better visibility

    const handleDragStart = (e: React.DragEvent) => {
        if (node.fileIndex !== undefined && files && files[node.fileIndex]) {
            const file = files[node.fileIndex];
            // Set custom data for internal drag
            e.dataTransfer.setData('application/x-code-file', JSON.stringify({
                fileName: file.name,
                content: file.content,
                language: file.language
            }));
            e.dataTransfer.effectAllowed = 'copy';
        }
    };

    if (node.isFile) {
        return (
            <div
                draggable
                onDragStart={handleDragStart}
                onClick={() => node.fileIndex !== undefined && onSelect(node.fileIndex)}
                className={`w-full text-left px-2 py-1 text-xs font-mono truncate transition-colors border-l-2 ml-1 flex items-center gap-2 cursor-grab active:cursor-grabbing
                    ${activeIndex === node.fileIndex
                        ? 'text-red-300 bg-red-900/20 border-red-500'
                        : 'text-gray-500 border-transparent hover:text-red-400 hover:bg-red-900/5'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                title="Drag to right panel to send to the spirit"
            >
                <span className="opacity-70">📄</span> {node.name}
                <span className="ml-auto opacity-0 group-hover:opacity-50 text-[8px]">⇢</span>
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-2 py-1 text-xs font-mono text-gray-400 hover:text-red-300 flex items-center gap-1 select-none"
                style={{ paddingLeft: `${depth * 12}px` }}
            >
                <span className="text-[10px] transform transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span className="text-amber-700">📁</span> {node.name}
            </button>
            {isOpen && (
                <div className="border-l border-red-900/10 ml-2">
                    {Object.values(node.children).map((child) => (
                        <FileTreeItem key={child.path} node={child} activeIndex={activeIndex} onSelect={onSelect} depth={depth + 1} files={files} />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- CUSTOM HIGHLIGHTER ---
const highlightCode = (code: string, language: string) => {
    let html = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lang = language.toLowerCase();

    // JSON-specific highlighting
    if (lang === 'json') {
        html = html.replace(/"([^"\\]|\\.)*"/g, (m) => '<span class="token-string">' + m + '</span>');
        html = html.replace(/\b(-?\d+\.?\d*)\b/g, '<span class="token-number">$1</span>');
        html = html.replace(/\b(true|false|null)\b/g, '<span class="token-keyword">$1</span>');
        return html;
    }

    // Placeholder strategy to avoid nested tags
    const tokens: string[] = [];
    const saveToken = (str: string, type: string) => {
        tokens.push(`<span class="token-${type}">${str}</span>`);
        return `___TOKEN${tokens.length - 1}___`;
    };

    // 1. Extract Strings and Comments (Order matters! Strings usually take precedence if they start first)
    // We use a combined regex to consume the text from left to right
    // Regex for strings: (["'])(?:\\.|[^\\])*?\2
    // Regex for comments: (\/\/.*|\/\*[\s\S]*?\*\/|#.*)
    
    html = html.replace(/((["'])(?:\\.|[^\\])*?\2)|(\/\/.*|\/\*[\s\S]*?\*\/|#.*)/g, (match, stringMatch, quote, commentMatch) => {
        if (stringMatch) {
            return saveToken(match, 'string');
        } else {
            return saveToken(match, 'comment');
        }
    });

    // 2. Highlight Keywords
    const keywords = /\b(const|let|var|function|class|import|from|return|if|else|for|while|await|async|export|default|try|catch|new|this|interface|type|enum|extends|implements|void|int|char|double|float|struct|define|include)\b/g;
    html = html.replace(keywords, '<span class="token-keyword">$1</span>');

    // 3. Highlight Functions
    html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, '<span class="token-function">$1</span>');

    // 4. Highlight Numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');

    // 5. Restore Tokens
    html = html.replace(/___TOKEN(\d+)___/g, (_, index) => tokens[parseInt(index)]);

    return html;
};

// --- DEPENDENCY ANALYZER ---
const analyzeDependencies = (content: string, symbols: CodeSymbol[], lang: string): CodeSymbol[] => {
    const rituals = symbols.filter(s => s.type === SymbolType.RITUAL);
    const updatedSymbols = [...symbols];

    rituals.forEach(ritual => {
        let body = "";
        const lines = content.split('\n');

        if (lang.match(/(js|ts|java|c|php)/)) {
            let startLine = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(ritual.name)) {
                    startLine = i;
                    break;
                }
            }

            if (startLine !== -1) {
                let brackets = 0;
                let started = false;
                for (let i = startLine; i < lines.length; i++) {
                    const line = lines[i];
                    body += line + "\n";
                    const open = (line.match(/{/g) || []).length;
                    const close = (line.match(/}/g) || []).length;
                    if (open > 0) started = true;
                    brackets += open - close;
                    if (started && brackets <= 0) break;
                }
            }
        }
        if (body.length > 0) {
            const deps: string[] = [];
            rituals.forEach(other => {
                if (other.name !== ritual.name) {
                    if (body.match(new RegExp(`\\b${other.name}\\s*\\(`))) {
                        deps.push(other.name);
                    }
                }
            });
            const idx = updatedSymbols.findIndex(s => s.id === ritual.id);
            if (idx !== -1) {
                updatedSymbols[idx] = { ...updatedSymbols[idx], dependencies: deps };
            }
        }
    });

    return updatedSymbols;
};

// --- MAIN COMPONENT ---

export const Altar: React.FC<AltarProps> = ({ files, setFiles, onSummon, onCodeSelect, onActiveFileChange, isLoading, isSummoned }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeFileIndex, setActiveFileIndexInternal] = useState<number>(-1);

    // Wrapper to notify parent when active file changes
    const setActiveFileIndex = (index: number) => {
        setActiveFileIndexInternal(index);
        onActiveFileChange?.(index);
    };
    const [processingFile, setProcessingFile] = useState(false);
    const [selection, setSelection] = useState<{ text: string, x: number, y: number } | null>(null);
    const codeContainerRef = useRef<HTMLDivElement>(null);
    const [showIntro, setShowIntro] = useState(true); // Intro screen state
    const [selectedPersona, setSelectedPersona] = useState<GhostPersona | null>(null);
    const [copied, setCopied] = useState(false);

    // Editor State
    const [editorContent, setEditorContent] = useState('');
    const history = useHistory(''); // Init history hook
    const [historyFeedback, setHistoryFeedback] = useState<string | null>(null);

    // Animation States
    const [isBurning, setIsBurning] = useState(false);
    const [isJumpscareActive, setIsJumpscareActive] = useState(false);
    const [isExorcising, setIsExorcising] = useState(false);
    const [isWritingTestament, setIsWritingTestament] = useState(false);
    const [showDemon, setShowDemon] = useState(false); // For Exorcism Jumpscare

    // PROJECT ANALYSIS (Testament) State
    const [showProjectAnalysis, setShowProjectAnalysis] = useState(false);
    const [isAnalyzingProject, setIsAnalyzingProject] = useState(false);
    const [projectAnalysis, setProjectAnalysis] = useState<{
        summary: string;
        purpose: string;
        obsoleteCode: string[];
        migrationSuggestions: string[];
        techDebt: string[];
        recommendations: string[];
        currentVersion: string;
        targetVersion: string;
    } | null>(null);

    // Tabs for the Side Panel
    const [activeTab, setActiveTab] = useState<'scrolls' | 'glyphs'>('scrolls');
    const [extractedSymbols, setExtractedSymbols] = useState<CodeSymbol[]>([]);
    const [curseReport, setCurseReport] = useState<string | null>(null);

    // Spirit Web (Graph) & Persistence
    const [graphCache, setGraphCache] = useState<Record<string, string>>({});
    const [analysisCache, setAnalysisCache] = useState<Record<string, CodeSymbol[]>>({});
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [expandedGraph, setExpandedGraph] = useState<string | null>(null);

    // Tree View
    const fileTree = useMemo(() => buildFileTree(files), [files]);

    // Updated Ritual Config State
    const [spokenLanguage, setSpokenLanguage] = useState<'es' | 'en'>('es');
    const [primarySin, setPrimarySin] = useState<TechSin>({ id: uuidv4(), language: '', version: '', goal: '' });

    // EXORCISMO MASIVO (Mass Migration) State
    const [showMassExorcism, setShowMassExorcism] = useState(false);
    const [migrationFrom, setMigrationFrom] = useState('');
    const [migrationTo, setMigrationTo] = useState('');
    const [isMassExorcising, setIsMassExorcising] = useState(false);
    const [massExorcismProgress, setMassExorcismProgress] = useState(0);
    const [massExorcismLog, setMassExorcismLog] = useState<string[]>([]);

    // Mass Exorcism LIVE Preview State
    const [currentExorcismFile, setCurrentExorcismFile] = useState<string>('');
    const [currentExorcismBefore, setCurrentExorcismBefore] = useState<string>('');
    const [currentExorcismAfter, setCurrentExorcismAfter] = useState<string>('');
    const [currentExorcismChanges, setCurrentExorcismChanges] = useState<string[]>([]);
    const [totalFilesProcessed, setTotalFilesProcessed] = useState(0);
    const [totalChangesCount, setTotalChangesCount] = useState(0);
    const [exorcismComplete, setExorcismComplete] = useState(false);

    // EXORCISM DEBUG State (Single file with details)
    const [showExorcismDebug, setShowExorcismDebug] = useState(false);
    const [exorcismChanges, setExorcismChanges] = useState<string[]>([]);
    const [exorcismSummary, setExorcismSummary] = useState<string>('');
    const [exorcismOldCode, setExorcismOldCode] = useState<string>('');
    const [exorcismNewCode, setExorcismNewCode] = useState<string>('');

    // GHOSTLY LINTER - GLOBAL Error Detection State
    const [globalErrors, setGlobalErrors] = useState<{
        type: string;
        message: string;
        line?: number;
        fileName: string;
        fileIndex: number;
        code?: string; // The problematic code snippet
    }[]>([]);
    const [isScreaming, setIsScreaming] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Mute state for error screams
    const [showErrorPanel, setShowErrorPanel] = useState(false);
    const screamAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isAutoFixing, setIsAutoFixing] = useState<string | null>(null); // Track which error is being fixed

    // Track last active file to detect file switches vs content updates
    const lastActiveFileRef = useRef<number>(-1);
    const lastContentRef = useRef<string>('');

    // Sync Editor when file changes
    useEffect(() => {
        if (activeFileIndex !== -1 && files[activeFileIndex]) {
            const content = files[activeFileIndex].content;

            // Only reset history if we switched to a DIFFERENT file
            if (lastActiveFileRef.current !== activeFileIndex) {
                setEditorContent(content);
                history.reset(content);
                lastActiveFileRef.current = activeFileIndex;
                lastContentRef.current = content;
            }
            // If same file but content changed externally (e.g., from agent), push to history
            else if (lastContentRef.current !== content) {
                setEditorContent(content);
                history.push(content); // Push instead of reset to preserve undo
                lastContentRef.current = content;
            }
        }
    }, [activeFileIndex, files]);

    // Update voice gender when persona changes
    useEffect(() => {
        if (selectedPersona) {
            setCurrentPersonaGender(selectedPersona.gender);
        }
    }, [selectedPersona]);

    // Keyboard Shortcuts (Undo/Redo) - Using refs for stable callbacks
    const historyRef = useRef(history);
    historyRef.current = history;

    const updateEditorContentRef = useRef<(content: string, feedback: string) => void>();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && isSummoned && activeFileIndex !== -1) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    const prev = historyRef.current.undo();
                    if (prev !== null && updateEditorContentRef.current) {
                        updateEditorContentRef.current(prev, "⏪ RESURRECTING...");
                    }
                } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                    e.preventDefault();
                    e.stopPropagation();
                    const next = historyRef.current.redo();
                    if (next !== null && updateEditorContentRef.current) {
                        updateEditorContentRef.current(next, "⏩ FAST FORWARDING...");
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isSummoned, activeFileIndex]);

    const updateEditorContent = useCallback((content: string, feedback: string) => {
        setEditorContent(content);
        lastContentRef.current = content; // Update ref to prevent sync loop

        const newFiles = [...files];
        if (activeFileIndex >= 0 && activeFileIndex < newFiles.length) {
            newFiles[activeFileIndex] = { ...newFiles[activeFileIndex], content: content };
            setFiles(newFiles);
        }
        setHistoryFeedback(feedback);
        setTimeout(() => setHistoryFeedback(null), 1000);

        // Trigger resurrection animation
        if (codeContainerRef.current) {
            codeContainerRef.current.classList.add('animate-resurrect');
            setTimeout(() => codeContainerRef.current?.classList.remove('animate-resurrect'), 300);
        }
    }, [files, activeFileIndex, setFiles]);

    // Keep ref updated
    updateEditorContentRef.current = updateEditorContent;

    // JUMPSCARE LINTER logic
    const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCode = e.target.value;
        setEditorContent(newCode);
        history.push(newCode); // Save to history
        lastContentRef.current = newCode; // Update ref to prevent double-push

        const newFiles = [...files];
        newFiles[activeFileIndex] = { ...newFiles[activeFileIndex], content: newCode };
        setFiles(newFiles);

        const cursedPatterns = /\b(var|eval|any)\b|console\.log/g;
        const prevMatches = (files[activeFileIndex].content.match(cursedPatterns) || []).length;
        const currMatches = (newCode.match(cursedPatterns) || []).length;

        if (currMatches > prevMatches) {
            triggerJumpscare();
        }
    };

    const triggerJumpscare = () => {
        setIsJumpscareActive(true);
        playGlitchSound();
        playSoundEffect('bug', 0.5); // Bug sound on bad code detection
        setTimeout(() => setIsJumpscareActive(false), 500);
    };

    // GHOSTLY LINTER - Analyze ALL files for errors (GLOBAL)
    const analyzeAllFilesForErrors = useCallback((allFiles: CodeFile[]) => {
        const allErrors: typeof globalErrors = [];

        allFiles.forEach((file, fileIndex) => {
            const lines = file.content.split('\n');
            const lang = file.language.toLowerCase();

            // 1. Check for unbalanced brackets/parentheses
            const openBrackets = (file.content.match(/\{/g) || []).length;
            const closeBrackets = (file.content.match(/\}/g) || []).length;
            if (openBrackets !== closeBrackets) {
                allErrors.push({
                    type: 'SYNTAX',
                    message: `Unbalanced braces: ${openBrackets} open, ${closeBrackets} closed`,
                    fileName: file.name,
                    fileIndex
                });
            }

            const openParens = (file.content.match(/\(/g) || []).length;
            const closeParens = (file.content.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                allErrors.push({
                    type: 'SYNTAX',
                    message: `Unbalanced parentheses: ${openParens} open, ${closeParens} closed`,
                    fileName: file.name,
                    fileIndex
                });
            }

            // 2. Check for cursed patterns line by line
            lines.forEach((line, idx) => {
                // var usage
                if (/\bvar\s+\w/.test(line)) {
                    allErrors.push({
                        type: 'CURSE',
                        message: `"var" detected - use "const" or "let"`,
                        line: idx + 1,
                        fileName: file.name,
                        fileIndex,
                        code: line.trim()
                    });
                }
                // eval usage
                if (/\beval\s*\(/.test(line)) {
                    allErrors.push({
                        type: 'DANGER',
                        message: `"eval()" is dangerous!`,
                        line: idx + 1,
                        fileName: file.name,
                        fileIndex,
                        code: line.trim()
                    });
                }
                // any type in TypeScript
                if (/:\s*any\b/.test(line) && (lang === 'ts' || lang === 'tsx')) {
                    allErrors.push({
                        type: 'CURSE',
                        message: `"any" type detected`,
                        line: idx + 1,
                        fileName: file.name,
                        fileIndex,
                        code: line.trim()
                    });
                }
                // Empty catch blocks
                if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
                    allErrors.push({
                        type: 'DANGER',
                        message: `Empty catch block detected`,
                        line: idx + 1,
                        fileName: file.name,
                        fileIndex,
                        code: line.trim()
                    });
                }
            });
        });

        return allErrors;
    }, []);

    // GLOBAL SCREAM LOOP - Continuous while errors exist
    useEffect(() => {
        const hasCriticalErrors = globalErrors.some(e => e.type === 'SYNTAX' || e.type === 'DANGER');

        if (hasCriticalErrors && isSummoned && !isMuted) {
            // Start screaming if not already
            if (!screamAudioRef.current) {
                setIsScreaming(true);
                const audio = new Audio('/assets/grito.mp3');
                audio.loop = true;
                audio.volume = 0.3;
                audio.play().catch(e => console.warn("Scream blocked", e));
                screamAudioRef.current = audio;
                console.log("🔊 Started scream loop - critical errors detected");
            }
        } else {
            // Stop screaming when no critical errors OR muted
            if (screamAudioRef.current) {
                screamAudioRef.current.pause();
                screamAudioRef.current.currentTime = 0;
                screamAudioRef.current = null;
                setIsScreaming(false);
                console.log("🔇 Stopped scream loop - errors resolved or muted");
            }
        }
    }, [globalErrors, isSummoned, isMuted]);

    // Cleanup scream audio on unmount
    useEffect(() => {
        return () => {
            if (screamAudioRef.current) {
                screamAudioRef.current.pause();
                screamAudioRef.current = null;
            }
        };
    }, []);

    // Analyze ALL files when any file changes
    useEffect(() => {
        if (files.length > 0 && isSummoned) {
            const errors = analyzeAllFilesForErrors(files);
            setGlobalErrors(errors);
        } else {
            setGlobalErrors([]);
        }
    }, [files, isSummoned, analyzeAllFilesForErrors]);

    // AUTO-FIX ERROR - Navigate to file and fix the error
    const handleGoToError = (error: typeof globalErrors[0]) => {
        setActiveFileIndex(error.fileIndex);
        setShowErrorPanel(false);
        // Scroll to line would require more complex implementation
    };

    const handleAutoFixError = async (error: typeof globalErrors[0]) => {
        const errorId = `${error.fileName}-${error.line}-${error.type}`;
        setIsAutoFixing(errorId);

        const file = files[error.fileIndex];
        if (!file) return;

        // Use AI to fix the error
        const result = await autoFixErrorWithAI(
            file.content,
            file.name,
            file.language,
            error.type,
            error.message,
            error.line,
            error.code
        );

        if (result && result.success && result.fixedCode) {
            // Update the file with AI-fixed code
            const newFiles = [...files];
            newFiles[error.fileIndex] = { ...file, content: result.fixedCode };
            setFiles(newFiles);

            // If this is the active file, update editor
            if (error.fileIndex === activeFileIndex) {
                setEditorContent(result.fixedCode);
                history.push(result.fixedCode);
            }

            playSoundEffect('pisada', 0.5);
            console.log(`🔧 AI Fix applied: ${result.fixApplied}`);
        } else {
            // Play error sound if couldn't fix
            playSoundEffect('bug', 0.3);
            console.warn(`❌ AI couldn't fix: ${result?.explanation || 'Unknown error'}`);
        }

        setTimeout(() => setIsAutoFixing(null), 500);
    };

    // MASS AUTO-FIX ALL ERRORS WITH AI
    const [isMassFixing, setIsMassFixing] = useState(false);

    const handleMassAutoFix = async () => {
        if (globalErrors.length === 0 || isMassFixing) return;

        setIsMassFixing(true);
        playSoundEffect('exorcismo', 0.5);

        // Group errors by file for efficient processing
        const errorsByFile = globalErrors.reduce((acc, error) => {
            if (!acc[error.fileIndex]) {
                acc[error.fileIndex] = [];
            }
            acc[error.fileIndex].push(error);
            return acc;
        }, {} as Record<number, typeof globalErrors>);

        const newFiles = [...files];
        let totalFixed = 0;

        // Process each file with its errors
        for (const [fileIndexStr, fileErrors] of Object.entries(errorsByFile)) {
            const fileIndex = parseInt(fileIndexStr);
            const file = files[fileIndex];
            if (!file) continue;

            // Use mass AI fix for this file
            const result = await massAutoFixWithAI(
                file.content,
                file.name,
                file.language,
                fileErrors.map(e => ({
                    type: e.type,
                    message: e.message,
                    line: e.line,
                    code: e.code
                }))
            );

            if (result && result.success && result.fixedCode) {
                newFiles[fileIndex] = { ...file, content: result.fixedCode };
                totalFixed += fileErrors.length;
                console.log(`🔧 AI Mass Fix for ${file.name}: ${result.fixApplied}`);
            }
        }

        // Update all files at once
        setFiles(newFiles);

        // Update editor if active file was modified
        if (errorsByFile[activeFileIndex] && newFiles[activeFileIndex]) {
            setEditorContent(newFiles[activeFileIndex].content);
            history.push(newFiles[activeFileIndex].content);
        }

        playSoundEffect('grito', 0.4);
        console.log(`✅ Mass AI Fix complete: ${totalFixed} errors fixed`);

        setIsMassFixing(false);
    };

    // EXORCISM (REFACTOR) LOGIC
    const handleExorcise = async () => {
        if (activeFileIndex === -1) return;
        setIsExorcising(true);

        const container = codeContainerRef.current;
        if (container) container.classList.add('animate-shake');

        const file = files[activeFileIndex];
        let codeToRefactor = file.content;
        let isSelection = false;

        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && codeContainerRef.current?.contains(sel.anchorNode)) {
            codeToRefactor = sel.toString();
            isSelection = true;
        }

        // Use enhanced exorcism with details
        const result = await exorciseCodeWithDetails(codeToRefactor, file.language, isSelection ? "selection" : undefined);

        if (container) container.classList.remove('animate-shake');

        if (result && result.code) {
            // Store debug info
            setExorcismOldCode(codeToRefactor);
            setExorcismNewCode(result.code);
            setExorcismSummary(result.summary);
            setExorcismChanges(result.changes);

            // Trigger Exorcism Visuals
            setIsBurning(true);
            setShowDemon(true);
            playExorcismSound();

            // Generate and play TTS narration
            narrateExorcism(result.summary, result.changes, spokenLanguage).then(audioData => {
                if (audioData) {
                    playPCM(audioData);
                }
            });

            setTimeout(() => {
                let newFullCode = file.content;
                if (isSelection) {
                    newFullCode = file.content.replace(codeToRefactor, result.code);
                    sel?.removeAllRanges();
                    setSelection(null);
                } else {
                    newFullCode = result.code;
                }

                updateEditorContent(newFullCode, "🔥 EXORCISM COMPLETE");
                history.push(newFullCode);

                setIsBurning(false);
                setTimeout(() => setShowDemon(false), 800);

                // Show debug panel after animation
                setShowExorcismDebug(true);
            }, 1500);
        }
        setIsExorcising(false);
    };

    // PROJECT ANALYSIS - Generates comprehensive DETAIL.md analysis
    const handleProjectAnalysis = async () => {
        if (files.length === 0) return;

        setShowProjectAnalysis(true);
        setIsAnalyzingProject(true);
        setProjectAnalysis(null);

        // Start testament audio loop
        startLoopAudio('/assets/testamento.mp3', 0.3);

        const result = await analyzeProject(files, {
            language: primarySin.language,
            version: primarySin.version,
            goal: primarySin.goal
        });

        if (result) {
            setProjectAnalysis(result);
        }

        // Stop testament audio when done
        stopLoopAudio();
        setIsAnalyzingProject(false);
    };

    // Generate DETAIL.md file from analysis and add to project
    const generateDetailMd = (downloadOnly: boolean = false) => {
        if (!projectAnalysis) return;

        const md = `# 📜 PROJECT TESTAMENT - Code Necromancer Analysis
> Generated: ${new Date().toLocaleString()}
> Analyzed by: ${selectedPersona?.name || 'Unknown Spirit'}

## 🔮 Summary
${projectAnalysis.summary}

## 📖 Purpose
${projectAnalysis.purpose}

## ⚡ Migration Path
| From | To |
|------|-----|
| ${projectAnalysis.currentVersion} | ${projectAnalysis.targetVersion} |

## ☠️ Obsolete Code Found
${projectAnalysis.obsoleteCode.map(item => `- ⚠️ ${item}`).join('\n') || '- ✅ None detected'}

## 🔧 Migration Suggestions
${projectAnalysis.migrationSuggestions.map((item, i) => `${i + 1}. ${item}`).join('\n') || '- None'}

## 💀 Technical Debt
${projectAnalysis.techDebt.map(item => `- 🔴 ${item}`).join('\n') || '- ✅ None detected'}

## ✨ Recommendations
${projectAnalysis.recommendations.map(item => `- ✓ ${item}`).join('\n') || '- None'}

---
*🔮 Generated by Code Necromancer - The spirits have spoken.*
*👻 May your code rest in peace... or pieces.*
`;

        if (downloadOnly) {
            // Download as file
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DETAIL.md';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // Add to project files
            const newFile: CodeFile = {
                name: 'DETAIL.md',
                content: md,
                language: 'md'
            };
            setFiles(prev => [...prev.filter(f => f.name !== 'DETAIL.md'), newFile]);
            playSoundEffect('pisada', 0.4);
        }
    };

    // Auto-save DETAIL.md when analysis completes
    useEffect(() => {
        if (projectAnalysis && !isAnalyzingProject) {
            // Auto-save to project
            generateDetailMd(false);
        }
    }, [projectAnalysis, isAnalyzingProject]);

    // Generate CHANGES.md from mass exorcism and add to project
    const generateChangesMd = (logs: string[], filesProcessed: number, changesCount: number) => {
        const md = `# 🔥 EXORCISM CHANGES LOG - Code Necromancer
> Generated: ${new Date().toLocaleString()}
> Exorcist: ${selectedPersona?.name || 'Unknown Spirit'}
> Migration: ${migrationFrom} → ${migrationTo}

## 📊 Summary
| Metric | Value |
|--------|-------|
| 📁 Files Processed | ${filesProcessed} |
| 🔧 Total Changes | ${changesCount} |
| ⚡ Migration | ${migrationFrom} → ${migrationTo} |
| ✅ Status | Completed |

## 🔮 What Was Transformed
The following transformations were applied to modernize your codebase:
- Updated syntax from ${migrationFrom} to ${migrationTo}
- Refactored deprecated patterns
- Applied modern best practices
- Cleaned up technical debt

## 📝 Detailed Exorcism Log
\`\`\`
${logs.join('\n')}
\`\`\`

## ⚠️ Post-Exorcism Checklist
- [ ] Review all changed files
- [ ] Run your test suite
- [ ] Check for any breaking changes
- [ ] Update dependencies if needed
- [ ] Commit changes to version control

---
*🔥 Exorcised by Code Necromancer*
*☠️ ${changesCount} demons of technical debt have been banished.*
*👻 The spirits recommend a code review before deployment.*
`;

        // Add to project files
        const newFile: CodeFile = {
            name: 'CHANGES.md',
            content: md,
            language: 'md'
        };
        setFiles(prev => [...prev.filter(f => f.name !== 'CHANGES.md'), newFile]);
        playSoundEffect('pisada', 0.4);
    };

    // Download entire project as ZIP
    const downloadProjectAsZip = async () => {
        if (files.length === 0) return;

        playSoundEffect('pisada', 0.5);

        const zip = new JSZip();

        // Add all files to zip
        files.forEach(file => {
            zip.file(file.name, file.content);
        });

        // Generate zip
        const content = await zip.generateAsync({ type: 'blob' });

        // Download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `necromancer_project_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // MASS EXORCISM (MIGRATION) - Transforms all files from one version to another
    const handleMassExorcism = async () => {
        if (!migrationFrom.trim() || !migrationTo.trim() || files.length === 0) return;

        setIsMassExorcising(true);
        setMassExorcismProgress(0);
        setTotalFilesProcessed(0);
        setTotalChangesCount(0);
        setCurrentExorcismFile('');
        setCurrentExorcismBefore('');
        setCurrentExorcismAfter('');
        setCurrentExorcismChanges([]);
        setMassExorcismLog([
            `🔮 MIGRATION RITUAL STARTED`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `📜 Files to transform: ${files.length}`,
            `⚡ Migration: ${migrationFrom} → ${migrationTo}`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            ``
        ]);

        playExorcismSound();

        // Start exorcism audio loop
        startLoopAudio('/assets/exorcismo.mp3', 0.25);

        const updatedFiles = [...files];
        let changesTotal = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = Math.round(((i + 1) / files.length) * 100);
            setMassExorcismProgress(progress);
            setCurrentExorcismFile(file.name);
            setCurrentExorcismBefore(file.content.substring(0, 2000));
            setCurrentExorcismAfter(''); // Clear while processing
            setCurrentExorcismChanges([]);
            setMassExorcismLog(prev => [...prev, `🔥 [${i + 1}/${files.length}] Exorcising: ${file.name}...`]);

            try {
                const migrationPrompt = `MIGRATION TASK: Convert this code from ${migrationFrom} to ${migrationTo}. 
              Maintain the same logic but update syntax, APIs, and patterns to the target version.
              If it's already compatible or doesn't need changes, return it as-is with minor improvements.`;

                const result = await exorciseCodeWithDetails(file.content, file.language, migrationPrompt);

                if (result && result.code) {
                    updatedFiles[i] = { ...file, content: result.code };

                    // Update live preview
                    setCurrentExorcismAfter(result.code.substring(0, 2000));
                    setCurrentExorcismChanges(result.changes);
                    changesTotal += result.changes.length;
                    setTotalChangesCount(changesTotal);
                    setTotalFilesProcessed(i + 1);

                    setMassExorcismLog(prev => [
                        ...prev,
                        `   ✅ Purified - ${result.changes.length} changes`,
                        ...result.changes.slice(0, 3).map(c => `      • ${c}`)
                    ]);

                    // Play sound for each file
                    if (i % 3 === 0) playGlitchSound();
                } else {
                    setMassExorcismLog(prev => [...prev, `   ⚠️ No changes needed`]);
                }
            } catch (err) {
                setMassExorcismLog(prev => [...prev, `   ❌ Exorcism error`]);
            }

            // Delay for visual effect
            await new Promise(r => setTimeout(r, 500));
        }

        setFiles(updatedFiles);
        setMassExorcismLog(prev => [
            ...prev,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎉 MASS EXORCISM COMPLETE!`,
            `📊 ${files.length} files processed`,
            `🔧 ${changesTotal} demons expelled`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        ]);

        // Stop exorcism loop and play final sound
        stopLoopAudio();
        playExorcismSound();
        playSoundEffect('grito', 0.6); // Victory scream!

        // Mark as complete
        setExorcismComplete(true);

        // Generate CHANGES.md and add to project with final values
        const finalLog = [
            ...massExorcismLog,
            ``,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎉 MASS EXORCISM COMPLETE!`,
            `📊 ${files.length} files processed`,
            `🔧 ${changesTotal} demons expelled`,
            `✅ CHANGES.md saved to project`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        ];

        // Auto-save CHANGES.md to project
        setTimeout(() => {
            generateChangesMd(finalLog, files.length, changesTotal);
        }, 500);

        // Keep modal open for 6 seconds to see results, then close
        setTimeout(() => {
            setIsMassExorcising(false);
            setShowMassExorcism(false);
            setMassExorcismProgress(0);
            setMassExorcismLog([]);
            setCurrentExorcismFile('');
            setCurrentExorcismBefore('');
            setCurrentExorcismAfter('');
            setCurrentExorcismChanges([]);
            setExorcismComplete(false);
        }, 6000);
    };

    // Handle Text Selection in the "IDE"
    useEffect(() => {
        const handleSelection = () => {
            const sel = window.getSelection();
            if (sel && sel.toString().trim().length > 0 && codeContainerRef.current?.contains(sel.anchorNode)) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                let y = rect.bottom + 10;
                let x = rect.left;

                if (y + 150 > window.innerHeight) {
                    y = rect.top - 10;
                }

                setSelection({
                    text: sel.toString(),
                    x: x,
                    y: y
                });
            } else {
                setSelection(null);
            }
        };

        document.addEventListener('selectionchange', handleSelection);
        return () => document.removeEventListener('selectionchange', handleSelection);
    }, []);

    // ANALYZE CODE SYMBOLS (ANATOMY OF DECAY)
    useEffect(() => {
        setIsGraphLoading(false);

        if (activeFileIndex !== -1 && files[activeFileIndex]) {
            const file = files[activeFileIndex];

            if (analysisCache[file.name]) {
                setExtractedSymbols(analysisCache[file.name]);
                setCurseReport(null);
                return;
            }

            let symbols: CodeSymbol[] = [];
            const content = file.content;

            const addSymbol = (name: string, type: SymbolType, line: number, content: string, tags: string[] = []) => {
                const references: string[] = [];
                files.forEach(f => {
                    if (f.name !== file.name && f.content.includes(name)) {
                        references.push(f.name);
                    }
                });

                symbols.push({
                    id: uuidv4(),
                    name: name.trim(),
                    type,
                    line,
                    content,
                    tags,
                    references: references.length > 0 ? references : undefined
                });
            };

            const importRegex = /^(?:import|from|require|include|using)\s+.*$/gm;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                addSymbol(match[0].substring(0, 30) + '...', SymbolType.PACT, 0, match[0]);
            }

            const lang = file.language.toLowerCase();

            if (lang.match(/(js|ts|jsx|tsx)/)) {
                const genRegex = /function\s*\*\s*([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
                while ((match = genRegex.exec(content)) !== null) {
                    addSymbol(match[1] + "*", SymbolType.RITUAL, 0, match[0], ['Generator']);
                }
                const asyncFuncRegex = /(?:async\s+function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)|(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*async\s*(?:\([^)]*\)|[a-zA-Z_$][0-9a-zA-Z_$]*)\s*=>)/g;
                while ((match = asyncFuncRegex.exec(content)) !== null) {
                    const name = match[1] || match[2];
                    if (name) addSymbol(name + "()", SymbolType.RITUAL, 0, match[0], ['Async']);
                }
                const funcRegex = /(?:function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)|(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][0-9a-zA-Z_$]*)\s*=>)/g;
                while ((match = funcRegex.exec(content)) !== null) {
                    const name = match[1] || match[2];
                    if (name && !symbols.find(s => s.name.startsWith(name))) {
                        addSymbol(name + "()", SymbolType.RITUAL, 0, match[0]);
                    }
                }
                const classRegex = /class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
                while ((match = classRegex.exec(content)) !== null) {
                    addSymbol("Class " + match[1], SymbolType.RITUAL, 0, match[0]);
                }
                const constRegex = /(?:const)\s+([A-Z_][A-Z0-9_]*)\s*=/g;
                while ((match = constRegex.exec(content)) !== null) {
                    if (match[1].length > 2) addSymbol(match[1], SymbolType.TRUTH, 0, match[0]);
                }
                const varRegex = /(?:let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
                while ((match = varRegex.exec(content)) !== null) {
                    addSymbol(match[1], SymbolType.ARTIFACT, 0, match[0]);
                }
                const defRegex = /(?:export\s+)?(interface|type|enum)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g;
                while ((match = defRegex.exec(content)) !== null) {
                    const type = match[1];
                    const name = match[2];
                    addSymbol(name, SymbolType.TRUTH, 0, match[0], [type]);
                }
            }
            else if (lang.match(/(py)/)) {
                const defRegex = /(?:async\s+)?def\s+([a-zA-Z_][0-9a-zA-Z_]*)/g;
                while ((match = defRegex.exec(content)) !== null) {
                    const isAsync = match[0].includes('async');
                    addSymbol(match[1] + "()", SymbolType.RITUAL, 0, match[0], isAsync ? ['Async'] : []);
                }
                const classRegex = /class\s+([a-zA-Z_][0-9a-zA-Z_]*)/g;
                while ((match = classRegex.exec(content)) !== null) {
                    addSymbol("Class " + match[1], SymbolType.RITUAL, 0, match[0]);
                }
                const globalRegex = /^([A-Z_][A-Z0-9_]*)\s*=/gm;
                while ((match = globalRegex.exec(content)) !== null) {
                    if (match[1].length > 2) addSymbol(match[1], SymbolType.TRUTH, 0, match[0]);
                }
            }
            else if (lang.match(/(java|php|cs|cpp|c|h)/)) {
                const methodRegex = /(?:public|private|protected|static)\s+(?:\w+[<>\[\]]*\s+)+(\w+)\s*\(/g;
                while ((match = methodRegex.exec(content)) !== null) {
                    addSymbol(match[1] + "()", SymbolType.RITUAL, 0, match[0]);
                }
            }

            const todoRegex = /(\/\/|#|\/\*)\s*(TODO|FIXME|HACK):?\s*(.*)$/gmi;
            while ((match = todoRegex.exec(content)) !== null) {
                addSymbol("Broken Oath: " + (match[3] || "Empty Promise").substring(0, 15) + "...", SymbolType.ARTIFACT, 0, match[0]);
            }

            const logRegex = /(console\.(log|warn|error)|print\s*\(|System\.out\.print)/g;
            let logCount = 0;
            while ((match = logRegex.exec(content)) !== null) {
                logCount++;
            }
            if (logCount > 0) {
                addSymbol(`${logCount} Screams into Void`, SymbolType.ARTIFACT, 0, "Log statements");
            }

            symbols = analyzeDependencies(content, symbols, lang);

            setExtractedSymbols(symbols);
            setAnalysisCache(prev => ({ ...prev, [file.name]: symbols }));

            if (symbols.length === 0) {
                const lines = content.split('\n').length;
                const size = (content.length / 1024).toFixed(1);
                setCurseReport(`Analyzed ${size}KB Monolith containing ${lines} lines of pure despair. No distinct spiritual artifacts found.`);
            } else {
                setCurseReport(null);
            }
        }
    }, [activeFileIndex, files, analysisCache]);

    const handleManifestGraph = async () => {
        if (activeFileIndex === -1 || !files[activeFileIndex]) return;
        const fileName = files[activeFileIndex].name;
        if (graphCache[fileName]) return;

        setIsGraphLoading(true);
        const graph = await generateSpiritGraph(files[activeFileIndex].content);
        if (graph) {
            setGraphCache(prev => ({ ...prev, [fileName]: graph }));
        }
        setIsGraphLoading(false);
    };

    const handleIntentSelection = (intent: Intent) => {
        if (selection && activeFileIndex !== -1) {
            if (intent === 'refactor') {
                handleExorcise(); // Delegate to main function to reuse burn logic
            } else {
                onCodeSelect(selection.text, files[activeFileIndex].name, intent);
            }
            window.getSelection()?.removeAllRanges();
            setSelection(null);
        }
    };

    const handleSymbolClick = (symbol: CodeSymbol) => {
        onCodeSelect(symbol.content, files[activeFileIndex].name, 'explain');
    };

    const inferLanguage = (files: CodeFile[]) => {
        const counts: Record<string, number> = {};
        files.forEach(f => {
            const ext = f.name.split('.').pop() || 'unknown';
            counts[ext] = (counts[ext] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            const topExt = sorted[0][0];
            const map: Record<string, string> = {
                'js': 'JavaScript', 'ts': 'TypeScript', 'py': 'Python', 'java': 'Java', 'php': 'PHP', 'cpp': 'C++', 'c': 'C', 'rb': 'Ruby', 'go': 'Go', 'cs': 'C#'
            };
            const detected = map[topExt] || topExt.toUpperCase();
            setPrimarySin(prev => ({ ...prev, language: detected }));
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessingFile(true);
        const newFiles: CodeFile[] = [];

        try {
            if (file.name.endsWith('.zip')) {
                const zip = new JSZip();
                await zip.loadAsync(file);
                const promises: Promise<void>[] = [];

                zip.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir && !zipEntry.name.match(/(__MACOSX|\.DS_Store|node_modules|.git|package-lock.json)/)) {
                        if (relativePath.match(/\.(js|ts|jsx|tsx|py|php|html|css|json|java|c|cpp|rb|go|rs|txt|md|sql|cs)$/i)) {
                            promises.push(
                                zipEntry.async("string").then((content) => {
                                    newFiles.push({
                                        name: relativePath,
                                        content: content,
                                        language: relativePath.split('.').pop() || 'text'
                                    });
                                })
                            );
                        }
                    }
                });
                await Promise.all(promises);
            } else {
                const content = await file.text();
                newFiles.push({
                    name: file.name,
                    content: content,
                    language: file.name.split('.').pop() || 'text'
                });
            }

            if (newFiles.length > 0) {
                setFiles(newFiles);
                setActiveFileIndex(0);
                inferLanguage(newFiles);
            }
        } catch (error) {
            console.error("Error reading offering:", error);
        } finally {
            setProcessingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const updateSin = (field: keyof TechSin, value: string) => {
        setPrimarySin(prev => ({ ...prev, [field]: value }));
    };

    const handleStartRitual = () => {
        if (!selectedPersona) return;
        if (primarySin.language.trim() === '') return;
        onSummon({
            techStack: [primarySin],
            spokenLanguage: spokenLanguage,
            persona: selectedPersona
        });
    };

    const copyCode = () => {
        if (activeFileIndex !== -1) {
            navigator.clipboard.writeText(files[activeFileIndex].content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const commonStacks = ["Java", "PHP", "Python", "JavaScript", "C#", "C++", "Ruby", "Cobol"];

    const calculateCurseLevel = () => {
        if (activeFileIndex === -1 || !files[activeFileIndex]) return 0;
        const lines = files[activeFileIndex].content.split('\n').length;
        if (lines < 50) return 1;
        if (lines < 200) return 2;
        return 3;
    };

    const currentGraph = (activeFileIndex !== -1 && files[activeFileIndex])
        ? graphCache[files[activeFileIndex].name]
        : null;

    const truths = extractedSymbols.filter(s => s.type === SymbolType.TRUTH);
    const artifacts = extractedSymbols.filter(s => s.type === SymbolType.ARTIFACT);
    const rituals = extractedSymbols.filter(s => s.type === SymbolType.RITUAL);
    const pacts = extractedSymbols.filter(s => s.type === SymbolType.PACT);

    const renderSymbolButton = (s: CodeSymbol, colorClass: string, hoverBg: string) => (
        <button key={s.id} onClick={() => handleSymbolClick(s)} className={`block w-full text-left px-2 py-1 text-[10px] ${colorClass} ${hoverBg} font-mono flex flex-col items-start gap-1 group border-l-2 border-transparent hover:border-red-500/50 transition-all`}>
            <div className="flex justify-between w-full">
                <span className="truncate">{s.name}</span>
                {s.tags && s.tags.length > 0 && (
                    <span className="flex gap-1">
                        {s.tags.map(tag => (
                            <span key={tag} className="text-[8px] bg-white/10 px-1 rounded text-gray-400">{tag}</span>
                        ))}
                    </span>
                )}
            </div>

            {/* METADATA ROW */}
            <div className="flex gap-2 w-full overflow-hidden">
                {s.references && (
                    <span className="text-[8px] opacity-50 text-gray-400">
                        Linked in {s.references.length}
                    </span>
                )}
                {s.dependencies && s.dependencies.length > 0 && (
                    <span className="text-[8px] opacity-70 text-amber-500/80 truncate">
                        Calls: {s.dependencies.join(', ')}
                    </span>
                )}
            </div>
        </button>
    );

    return (
        <div className="flex flex-col h-full border-r-4 border-double border-red-900 bg-[#0a0a0a] relative overflow-hidden">
            {/* JUMPSCARE OVERLAY */}
            {isJumpscareActive && <div className="animate-blood-flash"></div>}

            {/* BLOOD OVERLAY (DURING EXORCISM) */}
            {isBurning && (
                <div className="absolute inset-0 z-50 pointer-events-none opacity-80 mix-blend-multiply">
                    <img src="/assets/sangre_escurriendo.gif" alt="bleeding" className="w-full h-full object-cover" />
                </div>
            )}

            {/* EXORCISM DEMON OVERLAY */}
            {showDemon && (
                <div className="absolute inset-0 z-[99] flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="animate-soul-scream text-9xl text-white drop-shadow-[0_0_50px_rgba(255,0,0,0.8)] filter grayscale contrast-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-96 h-96">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C14.21 4 16.21 4.9 17.66 6.34L12 12L6.34 6.34C7.79 4.9 9.79 4 12 4ZM4 12C4 9.79 4.9 7.79 6.34 6.34L12 12L17.66 17.66C16.21 19.1 14.21 20 12 20C9.79 20 7.79 19.1 6.34 17.66C4.9 16.21 4 14.21 4 12ZM17.66 17.66L12 12L17.66 6.34C19.1 7.79 20 9.79 20 12C20 14.21 19.1 16.21 17.66 17.66Z" />
                            <path d="M12 0L15 5L21 6L17 11L18 17L12 14L6 17L7 11L3 6L9 5L12 0Z" className="opacity-0" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-800 opacity-50 pointer-events-none"></div>

            <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-felt.png')]">
            </div>

            {/* HEADER */}
            <header className="p-4 border-b border-red-900/40 bg-[#0f0505] flex justify-between items-center shadow-lg z-20 relative">
                <div className="flex items-center gap-4">
                    {/* HOYO NEGRO GIF */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                        <img
                            src="/assets/hoyo_negro.gif"
                            alt="Black Hole"
                            className="w-full h-full object-contain opacity-80 drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]"
                            style={{ filter: 'hue-rotate(340deg) saturate(1.5)' }}
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl text-red-600 font-creep tracking-widest drop-shadow-[0_0_5px_rgba(220,38,38,0.5)] glitch-hover cursor-default">
                            THE GRIMOIRE
                        </h2>
                        <p className="text-gray-500 font-old text-xs italic">
                            {files.length > 0 ? `${files.length} cursed scrolls loaded` : 'Awaiting vessel...'}
                        </p>
                    </div>
                </div>

                {selectedPersona && (
                    <div className="flex gap-2 items-center">
                        {files.length > 0 && isSummoned && (
                            <>
                                {/* TESTAMENT BUTTON - Enhanced */}
                                <button
                                    onClick={handleProjectAnalysis}
                                    disabled={isAnalyzingProject}
                                    className="group relative text-xs font-mono border-2 border-amber-700 text-amber-400 px-4 py-2 hover:bg-amber-900/30 hover:shadow-[0_0_20px_rgba(217,119,6,0.5)] hover:border-amber-500 disabled:opacity-50 transition-all duration-300 overflow-hidden"
                                    title="Analyze entire project - Generate DETAIL.md"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900/0 via-amber-900/20 to-amber-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    <span className="relative flex items-center gap-2">
                                        <span className={`text-lg ${isAnalyzingProject ? 'animate-spin' : 'group-hover:animate-bounce'}`}>
                                            {isAnalyzingProject ? '🔮' : '📜'}
                                        </span>
                                        <span className="font-creep tracking-wider">{isAnalyzingProject ? 'ANALYZING...' : 'TESTAMENT'}</span>
                                    </span>
                                </button>

                                {/* EXORCISM BUTTON - Enhanced */}
                                <button
                                    onClick={() => setShowMassExorcism(true)}
                                    className="group relative text-xs font-mono border-2 border-purple-700 text-purple-400 px-4 py-2 hover:bg-purple-900/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:border-purple-500 transition-all duration-300 overflow-hidden"
                                    title="Mass Migration - Transform all files"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/0 via-purple-900/20 to-purple-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    <span className="relative flex items-center gap-2">
                                        <span className="text-lg group-hover:animate-shake">⚰️</span>
                                        <span className="font-creep tracking-wider">EXORCISM</span>
                                    </span>
                                </button>

                                {/* DOWNLOAD BUTTON - Enhanced */}
                                <button
                                    onClick={downloadProjectAsZip}
                                    className="group relative text-xs font-mono border-2 border-green-700 text-green-400 px-4 py-2 hover:bg-green-900/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:border-green-500 transition-all duration-300 overflow-hidden"
                                    title="Download project as ZIP with all generated files"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-900/0 via-green-900/20 to-green-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    <span className="relative flex items-center gap-2">
                                        <span className="text-lg group-hover:animate-bounce">📦</span>
                                        <span className="font-creep tracking-wider">DOWNLOAD</span>
                                    </span>
                                </button>
                            </>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".zip,.js,.py,.html,.css,.txt,.ts,.tsx,.php,.json,.java,.cs"
                            className="hidden"
                        />
                        <button
                            onClick={triggerFileUpload}
                            disabled={isLoading || processingFile || isSummoned}
                            className="group relative text-xs font-mono border-2 border-red-700 text-red-400 px-4 py-2 hover:bg-red-900/30 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:border-red-500 disabled:opacity-50 transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-900/0 via-red-900/20 to-red-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <span className="relative flex items-center gap-2">
                                <span className="text-lg">{processingFile ? '⏳' : '📁'}</span>
                                <span className="font-creep tracking-wider">{processingFile ? 'EXTRACTING...' : (files.length > 0 ? 'CHANGE' : 'UPLOAD ZIP')}</span>
                            </span>
                        </button>
                    </div>
                )}
            </header>

            {/* MAIN IDE AREA */}
            <div className="flex flex-grow overflow-hidden relative z-10">

                {/* SIDEBAR (File List & Symbols) */}
                <div className={`w-1/3 min-w-[200px] max-w-[300px] border-r border-red-900/30 bg-[#050000] flex flex-col z-20 ${files.length === 0 ? 'hidden' : 'block'}`}>

                    {/* TABS */}
                    <div className="flex border-b border-red-900/30 bg-[#0f0505]">
                        <button
                            onClick={() => setActiveTab('scrolls')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'scrolls' ? 'bg-red-900/20 text-red-500' : 'text-gray-600 hover:text-red-400'}`}
                        >
                            📜 Scrolls
                        </button>
                        <button
                            onClick={() => setActiveTab('glyphs')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'glyphs' ? 'bg-red-900/20 text-red-500' : 'text-gray-600 hover:text-red-400'}`}
                        >
                            🔮 Glyphs
                        </button>
                    </div>

                    {/* CONTENT LIST */}
                    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-red-900/50 p-2">
                        {activeTab === 'scrolls' ? (
                            // FILE TREE
                            <div>
                                {Object.values(fileTree.children).map((child) => (
                                    <FileTreeItem key={child.path} node={child} activeIndex={activeFileIndex} onSelect={setActiveFileIndex} files={files} />
                                ))}
                            </div>
                        ) : (
                            // SYMBOL LIST (ANATOMY OF DECAY) - ENHANCED
                            <div className="space-y-3">

                                {/* STATS SUMMARY */}
                                <div className="bg-gradient-to-r from-red-950/40 to-transparent p-3 border-l-2 border-red-600">
                                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400">📦</span>
                                            <span className="text-gray-400">Imports:</span>
                                            <span className="text-purple-300 font-bold">{pacts.length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-400">💎</span>
                                            <span className="text-gray-400">Consts:</span>
                                            <span className="text-blue-300 font-bold">{truths.length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-amber-400">⚗️</span>
                                            <span className="text-gray-400">Vars:</span>
                                            <span className="text-amber-300 font-bold">{artifacts.length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400">⚡</span>
                                            <span className="text-gray-400">Funcs:</span>
                                            <span className="text-red-300 font-bold">{rituals.length}</span>
                                        </div>
                                    </div>
                                    {globalErrors.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-red-900/30 flex items-center gap-2">
                                            <span className={`${isScreaming ? 'animate-pulse' : ''}`}>💀</span>
                                            <span className="text-gray-400 text-[9px]">Errors:</span>
                                            <span className={`font-bold text-[9px] ${isScreaming ? 'text-red-400' : 'text-amber-400'}`}>
                                                {globalErrors.length} {isScreaming ? '(SCREAMING!)' : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* SPIRIT WEB GENERATOR */}
                                <div className="pb-3 border-b border-red-900/30">
                                    <h4 className="text-[9px] text-red-500 uppercase tracking-widest mb-2 pl-2 flex items-center gap-2">
                                        <span>🕸️</span> Spectral Logic Web
                                    </h4>
                                    {!currentGraph && !isGraphLoading && (
                                        <button
                                            onClick={handleManifestGraph}
                                            className="w-full py-2 bg-red-950/30 border border-dashed border-red-800/50 text-[10px] text-red-400 hover:bg-red-900/30 hover:border-red-500 font-mono transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="animate-pulse">🔮</span> MANIFEST FLOW GRAPH
                                        </button>
                                    )}
                                    {isGraphLoading && (
                                        <div className="text-[10px] text-gray-500 font-mono animate-pulse text-center py-2">
                                            ⏳ Tracing spectral lines...
                                        </div>
                                    )}
                                    {currentGraph && (
                                        <MermaidViewer chart={currentGraph} onExpand={() => setExpandedGraph(currentGraph)} />
                                    )}
                                </div>

                                {/* Pacts (Imports) */}
                                {pacts.length > 0 && (
                                    <div className="bg-purple-950/10 rounded p-2">
                                        <h4 className="text-[9px] text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span>📦</span> Dark Pacts ({pacts.length})
                                        </h4>
                                        <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900/50">
                                            {pacts.map(s => renderSymbolButton(s, "text-purple-300", "hover:bg-purple-900/30"))}
                                        </div>
                                    </div>
                                )}

                                {/* Immutable Truths (Consts/Types) */}
                                {truths.length > 0 && (
                                    <div className="bg-blue-950/10 rounded p-2">
                                        <h4 className="text-[9px] text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span>💎</span> Immutable Truths ({truths.length})
                                        </h4>
                                        <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-900/50">
                                            {truths.map(s => renderSymbolButton(s, "text-blue-300", "hover:bg-blue-900/30"))}
                                        </div>
                                    </div>
                                )}

                                {/* Artifacts (Vars) */}
                                {artifacts.length > 0 && (
                                    <div className="bg-amber-950/10 rounded p-2">
                                        <h4 className="text-[9px] text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span>⚗️</span> Cursed Artifacts ({artifacts.length})
                                        </h4>
                                        <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/50">
                                            {artifacts.map(s => renderSymbolButton(s, "text-amber-300", "hover:bg-amber-900/30"))}
                                        </div>
                                    </div>
                                )}

                                {/* Rituals (Functions) */}
                                {rituals.length > 0 && (
                                    <div className="bg-red-950/10 rounded p-2">
                                        <h4 className="text-[9px] text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <span>⚡</span> Eternal Rituals ({rituals.length})
                                        </h4>
                                        <div className="space-y-1 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-900/50">
                                            {rituals.map(s => renderSymbolButton(s, "text-red-300", "hover:bg-red-900/30"))}
                                        </div>
                                    </div>
                                )}

                                {/* FALLBACK REPORT */}
                                {extractedSymbols.length === 0 && (
                                    <div className="text-gray-600 text-xs p-4 italic border border-gray-800 bg-black/40">
                                        {curseReport ? (
                                            <>
                                                <div className="text-red-900 mb-2 font-bold uppercase">Void Analysis</div>
                                                <p>{curseReport}</p>
                                                <p className="mt-2 text-[9px] text-red-400">Try manifesting the Flow Graph above to see the hidden currents.</p>
                                            </>
                                        ) : (
                                            "No spiritual artifacts detected in this scroll."
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CODE EDITOR VIEW (GHOST EDITOR) */}
                <div
                    className={`flex-grow bg-[#0c0c0c] relative flex flex-col z-10 overflow-hidden ${isBurning ? 'animate-burn-out' : 'animate-burn-in'}`}
                    ref={codeContainerRef}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        if (activeFileIndex === -1) return;
                        const file = e.dataTransfer.files[0];
                        if (file) {
                            const text = await file.text();
                            updateEditorContent(text, "📜 SCROLL REPLACED");
                            history.push(text);
                        }
                    }}
                >
                    {/* HISTORY FEEDBACK TOAST */}
                    {historyFeedback && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                            <div className="bg-black/80 border border-red-500 text-red-500 font-creep text-4xl px-8 py-4 rounded animate-bounce drop-shadow-[0_0_15px_red]">
                                {historyFeedback}
                            </div>
                        </div>
                    )}

                    {files.length > 0 && activeFileIndex !== -1 ? (
                        <>
                            {/* Breadcrumbs & Tools */}
                            <div className="bg-[#151515] text-gray-400 text-xs font-mono py-1 px-4 border-b border-white/5 flex items-center justify-between flex-shrink-0 z-20 relative select-none">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-red-500">📄</span>
                                    <span className="text-gray-500">{files[activeFileIndex].name.replace(/\//g, ' > ')}</span>
                                    <span className="opacity-50 text-[10px] border border-gray-800 px-1 rounded ml-2">
                                        {files[activeFileIndex].language.toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* GHOSTLY LINTER - GLOBAL Error Indicator */}
                                    {globalErrors.length > 0 && (
                                        <button
                                            onClick={() => setShowErrorPanel(!showErrorPanel)}
                                            className={`flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer hover:scale-105 transition-transform ${isScreaming ? 'bg-red-900/50 animate-pulse border border-red-500' : 'bg-amber-900/30 border border-amber-800/50'}`}
                                        >
                                            <span className={`text-lg ${isScreaming ? 'animate-bounce' : ''}`}>
                                                {isScreaming ? '💀' : '⚠️'}
                                            </span>
                                            <span className={`text-[9px] font-mono ${isScreaming ? 'text-red-400' : 'text-amber-400'}`}>
                                                {globalErrors.length} {isScreaming ? 'ERRORS!' : 'warnings'}
                                            </span>
                                        </button>
                                    )}

                                    {/* Copy Button */}
                                    <button
                                        onClick={copyCode}
                                        className={`text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors ${copied ? 'text-green-500' : 'text-gray-500 hover:text-red-400'}`}
                                    >
                                        {copied ? 'ARTIFACT STOLEN' : 'STEAL ARTIFACT'}
                                    </button>

                                    {/* MUTE BUTTON */}
                                    <button 
                                        onClick={() => setIsMuted(!isMuted)}
                                        className={`p-1 rounded hover:bg-red-900/20 transition-colors ${isMuted ? 'text-red-500' : 'text-gray-500'}`}
                                        title={isMuted ? "Unmute Screams" : "Mute Error Screams"}
                                    >
                                        {isMuted ? "🔇" : "🔊"}
                                    </button>

                                    {/* CURSE LEVEL METER */}
                                    <div className="flex items-center gap-2" title="Curse Level (Technical Debt)">
                                        <span className="text-[9px] uppercase tracking-wider text-red-900">Curse Lvl:</span>
                                        <div className="flex gap-0.5">
                                            <div className={`w-2 h-3 ${calculateCurseLevel() >= 1 ? 'bg-green-700' : 'bg-gray-800'}`}></div>
                                            <div className={`w-2 h-3 ${calculateCurseLevel() >= 2 ? 'bg-amber-700' : 'bg-gray-800'}`}></div>
                                            <div className={`w-2 h-3 ${calculateCurseLevel() >= 3 ? 'bg-red-600 animate-pulse shadow-[0_0_5px_red]' : 'bg-gray-800'}`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GHOST EDITOR: Layered Textarea + Pre */}
                            <div className="flex flex-grow relative overflow-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-black bg-[#0c0c0c]">
                                {/* Line Numbers */}
                                <div className="bg-[#0f0505] text-gray-700 text-right pr-2 pt-4 select-none font-code text-xs border-r border-gray-800/50 min-w-[3rem] opacity-50 h-full sticky left-0 z-20">
                                    {editorContent.split('\n').map((_, i) => (
                                        <div key={i} className="leading-relaxed">{i + 1}</div>
                                    ))}
                                </div>

                                {/* CONTAINER FOR LAYERS */}
                                <div className="grid flex-grow min-w-full min-h-full">

                                    {/* LAYER 1: SYNTAX HIGHLIGHTING (BOTTOM) */}
                                    <pre className={`
                                col-start-1 row-start-1 min-h-full w-full p-4 font-code text-sm leading-relaxed tab-4 m-0 pointer-events-none whitespace-pre
                                ${isSummoned ? 'text-amber-100/90' : 'text-gray-300'}
                            `} style={{ zIndex: 0 }}>
                                        <code
                                            dangerouslySetInnerHTML={{
                                                __html: highlightCode(editorContent, files[activeFileIndex].language) + '<br/>' // Extra break for sync
                                            }}
                                        />
                                    </pre>

                                    {/* LAYER 2: TEXTAREA (TOP) */}
                                    <textarea
                                        value={editorContent}
                                        onChange={handleEditorChange}
                                        spellCheck={false}
                                        className="col-start-1 row-start-1 w-full h-full p-4 font-code text-sm leading-relaxed tab-4 bg-transparent text-transparent caret-red-500 resize-none outline-none whitespace-pre overflow-hidden"
                                        style={{ zIndex: 1 }}
                                    />
                                </div>

                                <div className="scanline-bar"></div>
                            </div>

                            {/* GHOSTLY LINTER - GLOBAL Error Panel */}
                            {globalErrors.length > 0 && (
                                <div className={`flex-shrink-0 border-t ${isScreaming ? 'border-red-500 bg-red-950/30' : 'border-amber-900/50 bg-amber-950/20'} max-h-[200px] overflow-y-auto`}>
                                    <div className="p-3">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-xs font-creep tracking-widest ${isScreaming ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                                                {isScreaming ? '💀 SPECTRAL ERRORS DETECTED' : '⚠️ GHOSTLY WARNINGS'}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] text-gray-500 font-mono">{globalErrors.length} issues in {new Set(globalErrors.map(e => e.fileName)).size} files</span>
                                                <button
                                                    onClick={handleMassAutoFix}
                                                    disabled={isMassFixing}
                                                    className={`px-2 py-1 rounded text-[9px] font-mono transition-colors ${isMassFixing
                                                        ? 'bg-gray-700 text-gray-500 cursor-wait'
                                                        : 'bg-green-900/50 text-green-300 hover:bg-green-800/50'
                                                        }`}
                                                    title="AI Auto-fix all errors"
                                                >
                                                    {isMassFixing ? '⏳ FIXING...' : '🤖 AI FIX ALL'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {globalErrors.map((err, i) => {
                                                const errorId = `${err.fileName}-${err.line}-${err.type}`;
                                                const isFixing = isAutoFixing === errorId;
                                                return (
                                                    <div key={i} className={`text-[10px] font-mono px-3 py-2 rounded flex items-center justify-between gap-2 ${err.type === 'SYNTAX' ? 'bg-red-900/40 text-red-300 border-l-2 border-red-500' :
                                                        err.type === 'DANGER' ? 'bg-red-900/30 text-red-400 border-l-2 border-red-600' :
                                                            err.type === 'CURSE' ? 'bg-amber-900/30 text-amber-300 border-l-2 border-amber-500' :
                                                                'bg-gray-900/30 text-gray-400 border-l-2 border-gray-600'
                                                        }`}>
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span>{err.type === 'SYNTAX' ? '💀' : err.type === 'DANGER' ? '☠️' : err.type === 'CURSE' ? '🔮' : '📜'}</span>
                                                            <span className="text-blue-400 font-bold truncate">{err.fileName}</span>
                                                            {err.line && <span className="text-gray-500 flex-shrink-0">L{err.line}:</span>}
                                                            <span className="truncate flex-1">{err.message}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => handleGoToError(err)}
                                                                className="px-2 py-1 bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 rounded text-[8px] transition-colors"
                                                                title="Go to error"
                                                            >
                                                                📍 GO
                                                            </button>
                                                            <button
                                                                onClick={() => handleAutoFixError(err)}
                                                                disabled={isFixing}
                                                                className={`px-2 py-1 rounded text-[8px] transition-colors ${isFixing
                                                                    ? 'bg-gray-700 text-gray-500'
                                                                    : 'bg-green-900/50 text-green-300 hover:bg-green-800/50'
                                                                    }`}
                                                                title="Auto-fix error"
                                                            >
                                                                {isFixing ? '⏳' : '🔧'} FIX
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RITUAL CONTEXT MENU */}
                            {selection && !isLoading && (
                                <div
                                    style={{
                                        position: 'fixed',
                                        left: Math.min(Math.max(selection.x, 220), window.innerWidth - 200), // Clamp horizontally
                                        top: selection.y, // Logic already handles flip
                                        zIndex: 100
                                    }}
                                    className="flex flex-col items-start animate-in fade-in zoom-in duration-200"
                                >
                                    {/* Connector Arrow */}
                                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-red-600 ml-4 mb-[-1px]"></div>

                                    <div className="bg-[#0f0000] border border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.6)] rounded-sm p-1 flex flex-col gap-1 w-48 backdrop-blur-md">
                                        <div className="text-[10px] text-red-500 text-center font-creep tracking-widest border-b border-red-900/50 pb-1 mb-1 bg-red-950/20">
                                            SPELLBOOK: CAST ON SELECTION
                                        </div>

                                        <button onClick={() => handleIntentSelection('explain')} className="text-left px-3 py-2 text-xs text-amber-100 hover:bg-red-900/60 transition-colors flex items-center gap-3 font-mono group border border-transparent hover:border-red-800/50">
                                            <span className="text-lg group-hover:scale-125 transition-transform">🔮</span>
                                            <span className="group-hover:text-red-300">Reveal Mysteries</span>
                                        </button>

                                        <button onClick={() => handleIntentSelection('risk')} className="text-left px-3 py-2 text-xs text-amber-100 hover:bg-red-900/60 transition-colors flex items-center gap-3 font-mono group border border-transparent hover:border-red-800/50">
                                            <span className="text-lg group-hover:scale-125 transition-transform">⚠️</span>
                                            <span className="group-hover:text-red-300">Risk Alteration</span>
                                        </button>

                                        <button onClick={() => handleIntentSelection('refactor')} className="text-left px-3 py-2 text-xs text-amber-100 hover:bg-red-900/60 transition-colors flex items-center gap-3 font-mono group border border-transparent hover:border-red-800/50">
                                            <span className="text-lg group-hover:scale-125 transition-transform">🛠️</span>
                                            <span className="group-hover:text-red-300">Clean Selection</span>
                                        </button>

                                        <button onClick={() => handleIntentSelection('migrate')} className="text-left px-3 py-2 text-xs text-amber-100 hover:bg-red-900/60 transition-colors flex items-center gap-3 font-mono group border border-transparent hover:border-red-800/50">
                                            <span className="text-lg group-hover:scale-125 transition-transform">⚰️</span>
                                            <span className="group-hover:text-red-300">Exorcise (Migrate)</span>
                                        </button>

                                        <button onClick={() => handleIntentSelection('roast')} className="text-left px-3 py-2 text-xs text-amber-100 hover:bg-red-900/60 transition-colors flex items-center gap-3 font-mono group border border-transparent hover:border-red-800/50">
                                            <span className="text-lg group-hover:scale-125 transition-transform">🔥</span>
                                            <span className="group-hover:text-red-300">Roast</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-gray-600 p-8 text-center opacity-50 select-none">
                            {selectedPersona && !processingFile && (
                                <>
                                    <div className="text-6xl mb-4 opacity-20">📜</div>
                                    <p className="font-old text-lg">The altar is ready for {selectedPersona.name}.</p>
                                    <p className="font-mono text-xs mt-2">Upload the ZIP file to begin the analysis.</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* MANIFESTATION OVERLAY (Loading) - CON GIF DE OUIJA */}
                    {isLoading && !isSummoned && (
                        <div className="absolute inset-0 z-[60] bg-[#050000] flex flex-col items-center justify-center overflow-hidden">
                            {/* BACKGROUND GIF - OUIJA INVOCATION */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    src="/assets/ouija_invocar.gif"
                                    alt="Ouija Invocation"
                                    className="w-full h-full object-cover opacity-40"
                                    style={{ filter: 'brightness(0.6) contrast(1.2) saturate(0.8)' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black"></div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="text-6xl mb-6 animate-bounce text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                                    💀
                                </div>

                                <div className="w-64 h-2 bg-red-950 rounded-full overflow-hidden mb-4 border border-red-900 relative">
                                    <div className="absolute top-0 left-0 h-full bg-red-600 animate-[width_2s_ease-in-out_infinite]" style={{ width: '30%', animationName: 'pulse-width' }}></div>
                                    <style>{`
                                @keyframes pulse-width {
                                    0% { width: 10%; }
                                    50% { width: 80%; }
                                    100% { width: 100%; }
                                }
                            `}</style>
                                </div>

                                <h3 className="text-red-500 font-creep text-2xl tracking-widest animate-pulse text-center drop-shadow-[0_0_10px_black]">
                                    SUMMONING {selectedPersona?.name}...
                                </h3>
                                <p className="text-gray-400 font-mono text-xs mt-2 drop-shadow-[0_0_5px_black]">
                                    Connecting with the beyond...
                                </p>
                                <p className="text-red-900/60 font-old text-[10px] mt-4 italic max-w-xs text-center">
                                    "The dead don't rest... especially those who left undocumented code"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 0: INTRO SCREEN - ENHANCED HORROR UI */}
                    {showIntro && !selectedPersona && (
                        <div className="absolute inset-0 z-50 bg-[#030303] flex flex-col items-center justify-center p-8 overflow-hidden">
                            {/* Background GIF - Luna Sangre */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    src="/assets/luna_sangre.gif"
                                    alt="Blood Moon"
                                    className="w-full h-full object-cover opacity-30"
                                    style={{ filter: 'brightness(0.4) saturate(1.5) hue-rotate(-10deg)' }}
                                />
                                <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/70 to-black"></div>
                            </div>

                            {/* Animated Fog Effect */}
                            <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-red-950/20 via-transparent to-transparent animate-pulse"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-red-900/10 to-transparent"></div>
                            </div>

                            {/* Floating Symbols - Enhanced */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {['💀', '⚰️', '🔮', '☠️', '👻', '🕯️', '🦇', '🕸️', '⛧', '🩸'].map((emoji, i) => (
                                    <span
                                        key={i}
                                        className="absolute text-3xl opacity-20 animate-float"
                                        style={{
                                            left: `${5 + (i * 10) % 90}%`,
                                            top: `${10 + (i * 13) % 80}%`,
                                            animationDelay: `${i * 0.7}s`,
                                            animationDuration: `${4 + i % 3}s`,
                                            transform: `rotate(${i * 25}deg)`
                                        }}
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>

                            {/* Candle Flicker Effect - Corners */}
                            <div className="absolute top-10 left-10 text-5xl opacity-60 animate-flicker">🕯️</div>
                            <div className="absolute top-10 right-10 text-5xl opacity-60 animate-flicker" style={{ animationDelay: '0.3s' }}>🕯️</div>
                            <div className="absolute bottom-10 left-10 text-5xl opacity-60 animate-flicker" style={{ animationDelay: '0.6s' }}>🕯️</div>
                            <div className="absolute bottom-10 right-10 text-5xl opacity-60 animate-flicker" style={{ animationDelay: '0.9s' }}>🕯️</div>

                            {/* Main Content */}
                            <div className="relative z-10 max-w-2xl text-center">
                                {/* CALAVERA GIF - Enhanced */}
                                <div className="mb-6 flex justify-center relative">
                                    <div className="absolute inset-0 bg-red-600/20 rounded-full blur-3xl animate-pulse"></div>
                                    <img
                                        src="/assets/calavera.gif"
                                        alt="Skull"
                                        className="w-48 h-48 object-contain drop-shadow-[0_0_40px_rgba(220,38,38,0.9)] animate-float relative z-10"
                                        style={{ filter: 'drop-shadow(0 0 30px rgba(220,38,38,0.7))' }}
                                    />
                                    {/* Glowing Eyes Effect */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <img
                                            src="/assets/ojos.gif"
                                            alt="Eyes"
                                            className="w-20 h-20 object-contain opacity-0 hover:opacity-80 transition-opacity duration-1000"
                                        />
                                    </div>
                                </div>

                                <h1 className="text-6xl font-creep text-red-600 mb-2 tracking-widest drop-shadow-[0_0_30px_rgba(220,38,38,0.9)] animate-glow-pulse">
                                    CODE NECROMANCER
                                </h1>
                                <p className="text-red-900/60 font-old text-sm mb-6 tracking-[0.3em] uppercase">
                                    ~ Resurrecting code from beyond the grave ~
                                </p>

                                <div className="bg-black/70 border-2 border-red-900/50 p-6 rounded-lg mb-8 backdrop-blur-md shadow-[inset_0_0_30px_rgba(220,38,38,0.1)] relative overflow-hidden group hover:border-red-700/70 transition-all duration-500">
                                    {/* Blood drip effect on hover */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <p className="text-gray-200 font-old text-lg leading-relaxed mb-4">
                                        <span className="text-red-500 font-bold text-xl">Inherited legacy code without documentation?</span>
                                        <br /><br />
                                        We understand your pain. The original programmer may no longer be in this world...
                                        or simply didn't leave a single useful comment.
                                    </p>
                                    <p className="text-gray-300 font-old text-base leading-relaxed mb-4">
                                        <span className="text-amber-400 font-bold">Don't worry.</span> We'll use...
                                        <span className="italic text-red-400 font-bold"> unconventional methods</span> to revive it.
                                    </p>
                                    <p className="text-gray-400 font-mono text-sm border-t border-red-900/30 pt-4 mt-4">
                                        🔮 We'll summon the spirit of the original developer to explain
                                        their code, help you migrate it, and tell you why they made those...
                                        <span className="text-red-400">questionable decisions</span>.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        startBackgroundMusic(0.12);
                                        playSoundEffect('pisada', 0.5);
                                        setShowIntro(false);
                                    }}
                                    className="group relative px-10 py-5 bg-gradient-to-b from-red-950 to-red-900 text-red-100 font-creep text-2xl tracking-widest border-2 border-red-700 hover:from-red-900 hover:to-red-800 hover:shadow-[0_0_50px_rgba(220,38,38,0.8),inset_0_0_20px_rgba(220,38,38,0.3)] hover:scale-110 transition-all duration-500 overflow-hidden"
                                >
                                    {/* Button glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="absolute -inset-1 bg-red-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <span className="relative z-10 flex items-center gap-3">
                                        <span className="text-3xl animate-pulse">⚡</span>
                                        BEGIN THE RITUAL
                                        <span className="text-3xl animate-pulse">⚡</span>
                                    </span>

                                    {/* Animated border */}
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>
                                </button>

                                <p className="text-gray-600 text-xs mt-8 font-mono opacity-60 hover:opacity-100 transition-opacity">
                                    ☠️ No developers were harmed in the creation of this tool ☠️
                                </p>
                            </div>

                            {/* Bottom Pentagram Decoration */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-red-900/20 text-6xl">
                                ⛧
                            </div>
                        </div>
                    )}

                    {/* STEP 1: GHOST SELECTION SCREEN - ENHANCED */}
                    {!showIntro && !selectedPersona && (
                        <div className="absolute inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 overflow-y-auto">
                            {/* Background with GIF */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    src="/assets/fondo_inicio.gif"
                                    alt=""
                                    className="w-full h-full object-cover opacity-15"
                                    style={{ filter: 'brightness(0.3) saturate(1.2)' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
                            </div>

                            {/* Floating candles */}
                            <div className="absolute top-20 left-20 text-4xl opacity-40 animate-flicker">🕯️</div>
                            <div className="absolute top-20 right-20 text-4xl opacity-40 animate-flicker" style={{ animationDelay: '0.5s' }}>🕯️</div>

                            <div className="relative z-10 w-full max-w-5xl">
                                <div className="text-center mb-10">
                                    {/* Eye GIF instead of ghost emoji */}
                                    <div className="mb-4 flex justify-center">
                                        <img
                                            src="/assets/eye.gif"
                                            alt="Mystical Eye"
                                            className="w-24 h-24 object-contain animate-float drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]"
                                            style={{ filter: 'drop-shadow(0 0 15px rgba(220,38,38,0.6))' }}
                                        />
                                    </div>
                                    <h3 className="text-5xl text-red-600 font-creep tracking-widest drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] mb-3 animate-glow-pulse">
                                        CHOOSE YOUR SPIRIT
                                    </h3>
                                    <p className="text-gray-400 font-old text-base max-w-lg mx-auto">
                                        Which soul shall we disturb today? Each spirit has their unique specialty and personality...
                                    </p>
                                </div>

                                {/* Grid de Personajes - Enhanced */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {PERSONAS.map((p, index) => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                playSoundEffect('pisada', 0.4);
                                                setSelectedPersona(p);
                                            }}
                                            className="group relative border-2 border-red-900/40 bg-gradient-to-b from-[#150808] to-[#0a0505] p-5 text-left hover:border-red-500 hover:from-red-950/40 hover:to-[#0a0505] transition-all duration-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:scale-[1.03] rounded-lg overflow-hidden"
                                            style={{ animationDelay: `${index * 0.1}s` }}
                                        >
                                            {/* Animated border glow */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                                            </div>

                                            {/* Glow Effect on Hover */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-red-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            {/* Header with Image and Name */}
                                            <div className="relative flex items-start gap-3 mb-3">
                                                {/* Character Image */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-900/50 group-hover:border-red-500 transition-all duration-300 shadow-[0_0_15px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]">
                                                        {p.image ? (
                                                            <img
                                                                src={p.image}
                                                                alt={p.name}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                style={{ filter: 'grayscale(30%) contrast(1.1)' }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-red-950/50 text-4xl">
                                                                {p.emoji}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Emoji badge */}
                                                    <div className="absolute -bottom-1 -right-1 text-xl bg-black/80 rounded-full p-0.5 border border-red-900/50">
                                                        {p.emoji}
                                                    </div>
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="text-red-500 font-bold font-creep text-base tracking-wider group-hover:text-red-400 group-hover:drop-shadow-[0_0_5px_red] truncate transition-all">
                                                        {p.name}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 font-mono">
                                                        {p.role}
                                                    </div>
                                                </div>
                                                {/* Gender Indicator */}
                                                <div className={`text-sm px-2 py-1 rounded-full ${p.gender === 'female' ? 'bg-pink-900/40 text-pink-400 border border-pink-800/50' : 'bg-blue-900/40 text-blue-400 border border-blue-800/50'} group-hover:scale-110 transition-transform`}>
                                                    {p.gender === 'female' ? '♀' : '♂'}
                                                </div>
                                            </div>

                                            {/* Quote */}
                                            <div className="relative text-gray-300 text-xs italic mb-3 border-l-2 border-red-700/50 pl-3 py-2 bg-black/40 rounded-r group-hover:border-red-500 transition-colors">
                                                "{p.quote}"
                                            </div>

                                            {/* Specialty Badge */}
                                            <div className="relative flex items-center gap-2 mb-3 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                                                <span className="text-amber-500">⚡</span>
                                                <span className="text-[10px] text-amber-300 font-mono">{p.specialty}</span>
                                            </div>

                                            {/* Death Cause */}
                                            <div className="relative text-[10px] text-gray-500 font-mono border-t border-red-900/30 pt-2 mt-2">
                                                <span className="text-red-800">☠️ CAUSE OF DEATH:</span>
                                                <br />
                                                <span className="text-gray-400">{p.deathCause}</span>
                                            </div>

                                            {/* Select Indicator - Enhanced */}
                                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                <span className="text-red-500 text-sm font-creep tracking-wider bg-red-950/50 px-3 py-1 rounded border border-red-800/50 flex items-center gap-2">
                                                    <span className="animate-pulse">🔮</span> SUMMON
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Back Button - Enhanced */}
                                <div className="text-center mt-8">
                                    <button
                                        onClick={() => setShowIntro(true)}
                                        className="group text-gray-500 hover:text-red-400 text-sm font-mono transition-all flex items-center gap-2 mx-auto px-4 py-2 border border-transparent hover:border-red-900/50 rounded"
                                    >
                                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                                        Back to introduction
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: INSCRIPTION OF ORIGIN (SINGLETON CONFIG) - ENHANCED */}
                    {selectedPersona && files.length > 0 && !isSummoned && !isLoading && (
                        <div className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl flex items-center justify-center p-4">
                            {/* Background Effect */}
                            <div className="absolute inset-0 opacity-15 pointer-events-none">
                                <img src="/assets/ojos.gif" alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.3)' }} />
                            </div>

                            <div className="relative bg-gradient-to-b from-[#150808] to-[#0a0505] border-2 border-red-800 p-8 max-w-lg w-full shadow-[0_0_80px_rgba(220,38,38,0.5)] flex flex-col rounded-lg">
                                {/* Decorative corners */}
                                <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-red-600"></div>
                                <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-red-600"></div>
                                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-red-600"></div>
                                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-red-600"></div>

                                {/* Header Badge */}
                                <div className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-2 border-red-700 px-6 py-2 text-red-400 font-creep tracking-widest text-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] whitespace-nowrap rounded flex items-center gap-2">
                                    <span className="animate-pulse">⚡</span> INSCRIPTION OF ORIGIN <span className="animate-pulse">⚡</span>
                                </div>

                                <div className="flex-grow flex flex-col gap-6 mt-4">
                                    {/* Spoken Language Selector */}
                                    <div>
                                        <label className="block text-red-900 mb-2 text-xs uppercase tracking-widest text-center">Ritual Tongue (Language)</label>
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => setSpokenLanguage('es')}
                                                className={`px-4 py-2 border transition-all ${spokenLanguage === 'es' ? 'bg-red-900/40 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-black border-red-900/30 text-gray-500 hover:bg-red-900/10'}`}
                                            >
                                                🇪🇸 SPANISH
                                            </button>
                                            <button
                                                onClick={() => setSpokenLanguage('en')}
                                                className={`px-4 py-2 border transition-all ${spokenLanguage === 'en' ? 'bg-red-900/40 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-black border-red-900/30 text-gray-500 hover:bg-red-900/10'}`}
                                            >
                                                🇺🇸 ENGLISH
                                            </button>
                                        </div>
                                    </div>

                                    {/* SINGLE TECH CONFIG */}
                                    <div className="bg-black/50 border border-red-900/30 p-5 relative group transition-colors">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-[10px] text-red-500/80 uppercase block mb-1 tracking-wider">Primary Language</label>
                                                <input
                                                    type="text"
                                                    value={primarySin.language}
                                                    onChange={(e) => updateSin('language', e.target.value)}
                                                    className="w-full bg-[#0a0505] border border-red-900/50 text-red-100 p-2 text-sm focus:border-red-500 focus:outline-none placeholder:text-gray-700 font-mono"
                                                    placeholder="e.g. Java, Python..."
                                                />
                                                <div className="flex flex-wrap gap-1.5 mt-2 justify-center opacity-80">
                                                    {commonStacks.map(stack => (
                                                        <button
                                                            key={stack}
                                                            onClick={() => updateSin('language', stack)}
                                                            className={`text-[9px] px-2 py-0.5 border transition-colors ${primarySin.language === stack ? 'bg-red-900 text-white border-red-500' : 'bg-red-950/20 text-red-500/60 border-red-900/20 hover:text-red-300 hover:border-red-500'}`}
                                                        >
                                                            {stack}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-red-500/80 uppercase block mb-1 tracking-wider">Ancient Version</label>
                                                <input
                                                    type="text"
                                                    value={primarySin.version}
                                                    onChange={(e) => updateSin('version', e.target.value)}
                                                    className="w-full bg-[#0a0505] border border-red-900/50 text-red-100 p-2 text-sm focus:border-red-500 focus:outline-none placeholder:text-gray-700 font-mono"
                                                    placeholder="e.g. 1.5, 5.3, 2.7"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-red-500/80 uppercase block mb-1 tracking-wider">The Cursed Goal</label>
                                                <input
                                                    type="text"
                                                    value={primarySin.goal}
                                                    onChange={(e) => updateSin('goal', e.target.value)}
                                                    className="w-full bg-[#0a0505] border border-red-900/50 text-red-100 p-2 text-sm focus:border-red-500 focus:outline-none placeholder:text-gray-700 font-mono"
                                                    placeholder="e.g. Migrate to Cloud, Refactor..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 text-center text-xs text-gray-500 italic flex-shrink-0">
                                    *The spirit of {selectedPersona.name} awaits your confession.*
                                </div>

                                {/* SUMMON BUTTON AREA */}
                                <div className="mt-4 pt-4 border-t border-red-900/30 flex-shrink-0">
                                    <button
                                        onClick={handleStartRitual}
                                        disabled={primarySin.language.trim() === ''}
                                        className={`
                                w-full py-4 bg-red-950 text-red-100 font-old text-2xl tracking-[0.2em] border border-red-800
                                hover:bg-red-900 hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:scale-[1.02]
                                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                relative overflow-hidden group
                                `}
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            <span className="text-red-500">⚡</span> BEGIN RITUAL <span className="text-red-500">⚡</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPANDED GRAPH MODAL */}
                    {expandedGraph && (
                        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md p-6 flex flex-col animate-in zoom-in duration-300">
                            <div className="flex justify-between items-center mb-4 border-b border-red-900 pb-2">
                                <h3 className="text-xl font-creep text-red-500 tracking-widest">SPECTRAL PROJECTION</h3>
                                <button onClick={() => setExpandedGraph(null)} className="text-red-500 hover:text-white font-mono text-xl">✕</button>
                            </div>
                            <div className="flex-grow overflow-auto bg-[#0a0505] border border-red-900/30 p-4 rounded shadow-2xl">
                                <MermaidViewer chart={expandedGraph} />
                            </div>
                            <div className="text-center text-gray-500 font-mono text-xs mt-2">
                                Fig. 1: The architecture of your doom
                            </div>
                        </div>
                    )}

                    {/* MASS EXORCISM MODAL */}
                    {showMassExorcism && (
                        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                            <div className="relative bg-[#0a0505] border-2 border-purple-900 p-6 max-w-xl w-full shadow-[0_0_60px_rgba(168,85,247,0.3)] rounded">

                                {/* Header */}
                                <div className="flex justify-between items-center mb-6 border-b border-purple-900/50 pb-4">
                                    <div>
                                        <h3 className="text-2xl font-creep text-purple-400 tracking-widest flex items-center gap-3">
                                            <span className="text-3xl">⚰️</span> MASS EXORCISM
                                        </h3>
                                        <p className="text-gray-500 text-xs mt-1">Transform all files from one version to another</p>
                                    </div>
                                    <button
                                        onClick={() => setShowMassExorcism(false)}
                                        disabled={isMassExorcising}
                                        className="text-purple-500 hover:text-white font-mono text-xl disabled:opacity-30"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {!isMassExorcising ? (
                                    <>
                                        {/* Migration Config */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-purple-400 uppercase block mb-2 tracking-wider">
                                                        🔮 FROM (Current Version)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={migrationFrom}
                                                        onChange={(e) => setMigrationFrom(e.target.value)}
                                                        className="w-full bg-black border border-purple-900/50 text-purple-100 p-3 text-sm focus:border-purple-500 focus:outline-none placeholder:text-gray-700 font-mono"
                                                        placeholder="e.g: React 15, Python 2.7, Java 8"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-purple-400 uppercase block mb-2 tracking-wider">
                                                        ⚡ TO (Target Version)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={migrationTo}
                                                        onChange={(e) => setMigrationTo(e.target.value)}
                                                        className="w-full bg-black border border-purple-900/50 text-purple-100 p-3 text-sm focus:border-purple-500 focus:outline-none placeholder:text-gray-700 font-mono"
                                                        placeholder="e.g: React 18, Python 3.11, Java 17"
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            <div>
                                                <label className="text-[10px] text-gray-500 uppercase block mb-2 tracking-wider">
                                                    Common Migrations
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { from: 'React 16', to: 'React 18' },
                                                        { from: 'Python 2.7', to: 'Python 3.11' },
                                                        { from: 'Java 8', to: 'Java 17' },
                                                        { from: 'Angular.js', to: 'Angular 17' },
                                                        { from: 'jQuery', to: 'Vanilla JS' },
                                                        { from: 'Class Components', to: 'Hooks' },
                                                    ].map((preset, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => { setMigrationFrom(preset.from); setMigrationTo(preset.to); }}
                                                            className="text-[9px] px-2 py-1 border border-purple-900/30 text-purple-400/60 hover:bg-purple-900/20 hover:text-purple-300 transition-colors"
                                                        >
                                                            {preset.from} → {preset.to}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Warning */}
                                            <div className="bg-red-950/20 border border-red-900/30 p-3 text-xs text-red-400">
                                                <span className="font-bold">⚠️ WARNING:</span> This ritual will modify ALL {files.length} loaded files.
                                                Make sure you have a backup. The spirits are not responsible for lost code.
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="mt-6 pt-4 border-t border-purple-900/30">
                                            <button
                                                onClick={handleMassExorcism}
                                                disabled={!migrationFrom.trim() || !migrationTo.trim()}
                                                className="w-full py-4 bg-purple-950 text-purple-100 font-creep text-xl tracking-widest border border-purple-800 hover:bg-purple-900 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                                            >
                                                <span>🔥</span> START MASS EXORCISM <span>🔥</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* ENHANCED Progress View - Full Screen Grid */
                                    null
                                )}
                            </div>
                        </div>
                    )}

                    {/* MASS EXORCISM FULLSCREEN PROGRESS */}
                    {isMassExorcising && (
                        <div className="absolute inset-0 z-[110] bg-black overflow-hidden animate-in fade-in duration-500">
                            {/* Background GIF */}
                            <div className="absolute inset-0 z-0 opacity-20">
                                <img src="/assets/sangre_escurriendo.gif" alt="blood" className="w-full h-full object-cover" style={{ filter: 'hue-rotate(270deg) saturate(2)' }} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-950/50 via-black/80 to-black z-10"></div>

                            {/* Main Grid Layout */}
                            <div className="relative z-20 h-full grid grid-cols-12 gap-0">

                                {/* LEFT PANEL - Progress & Log (4 cols) */}
                                <div className="col-span-4 border-r border-purple-900/30 flex flex-col bg-black/60 backdrop-blur-sm">

                                    {/* Header Stats */}
                                    <div className={`p-4 border-b border-purple-900/30 ${exorcismComplete ? 'bg-green-950/30' : 'bg-purple-950/20'} transition-colors duration-500`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`text-4xl ${exorcismComplete ? 'animate-bounce' : 'animate-pulse'}`}>
                                                {exorcismComplete ? '✅' : '⚰️'}
                                            </div>
                                            <div>
                                                <h3 className={`font-creep text-lg tracking-widest ${exorcismComplete ? 'text-green-400' : 'text-purple-400'}`}>
                                                    {exorcismComplete ? 'EXORCISM COMPLETE!' : 'MASS EXORCISM'}
                                                </h3>
                                                <p className="text-[10px] text-gray-500">{migrationFrom} → {migrationTo}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-2 bg-purple-950 rounded-full overflow-hidden border border-purple-900 mb-2">
                                            <div
                                                className={`h-full transition-all duration-300 ${exorcismComplete ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-purple-600 via-red-500 to-orange-500 animate-pulse'}`}
                                                style={{ width: `${massExorcismProgress}%` }}
                                            ></div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className={`bg-black/50 p-2 rounded border ${exorcismComplete ? 'border-green-900/50' : 'border-purple-900/20'}`}>
                                                <div className={`text-xl font-bold ${exorcismComplete ? 'text-green-400' : 'text-purple-400'}`}>{massExorcismProgress}%</div>
                                                <div className="text-[8px] text-gray-500 uppercase">Progress</div>
                                            </div>
                                            <div className={`bg-black/50 p-2 rounded border ${exorcismComplete ? 'border-green-900/50' : 'border-purple-900/20'}`}>
                                                <div className="text-xl font-bold text-green-400">{totalFilesProcessed}/{files.length}</div>
                                                <div className="text-[8px] text-gray-500 uppercase">Files</div>
                                            </div>
                                            <div className={`bg-black/50 p-2 rounded border ${exorcismComplete ? 'border-green-900/50' : 'border-purple-900/20'}`}>
                                                <div className="text-xl font-bold text-red-400">{totalChangesCount}</div>
                                                <div className="text-[8px] text-gray-500 uppercase">Changes</div>
                                            </div>
                                        </div>

                                        {/* CHANGES.md Saved Indicator */}
                                        {exorcismComplete && (
                                            <div className="mt-3 p-2 bg-green-950/30 border border-green-800/50 rounded flex items-center gap-2 animate-in fade-in duration-500">
                                                <span className="text-green-500">📁</span>
                                                <div>
                                                    <p className="text-green-400 text-xs font-mono">CHANGES.md saved automatically</p>
                                                    <p className="text-gray-600 text-[9px]">Closing in a few seconds...</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Current File Indicator */}
                                    {currentExorcismFile && (
                                        <div className="px-4 py-2 bg-red-950/30 border-b border-red-900/30 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                            <span className="text-[10px] text-red-400 font-mono truncate">🔥 {currentExorcismFile}</span>
                                        </div>
                                    )}

                                    {/* Log Terminal */}
                                    <div className="flex-grow overflow-y-auto p-3 font-mono text-[9px] space-y-0.5 scrollbar-thin scrollbar-thumb-purple-900/50">
                                        {massExorcismLog.map((log, i) => (
                                            <div
                                                key={i}
                                                className={`py-0.5 ${log.includes('✅') ? 'text-green-500' :
                                                    log.includes('❌') ? 'text-red-500' :
                                                        log.includes('🎉') ? 'text-yellow-400 font-bold text-sm' :
                                                            log.includes('━') ? 'text-purple-700' :
                                                                log.includes('•') ? 'text-gray-600 pl-4' :
                                                                    'text-purple-400/80'
                                                    }`}
                                            >
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RIGHT PANEL - Live Code Preview (8 cols) */}
                                <div className="col-span-8 flex flex-col bg-[#0a0505]/80 backdrop-blur-sm">

                                    {/* Preview Header */}
                                    <div className="p-3 border-b border-purple-900/30 bg-black/50 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <span className="text-purple-400 font-creep tracking-widest">LIVE TRANSFORMATION</span>
                                            {currentExorcismFile && (
                                                <span className="text-[10px] text-gray-500 font-mono bg-black/50 px-2 py-1 rounded border border-purple-900/30">
                                                    📄 {currentExorcismFile}
                                                </span>
                                            )}
                                        </div>
                                        {currentExorcismChanges.length > 0 && (
                                            <div className="flex gap-1">
                                                {currentExorcismChanges.slice(0, 3).map((c, i) => (
                                                    <span key={i} className="text-[8px] bg-green-950/50 text-green-400 px-2 py-0.5 rounded border border-green-900/30">
                                                        {c.substring(0, 20)}...
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Code Diff Grid */}
                                    <div className="flex-grow grid grid-cols-2 gap-0 overflow-hidden">
                                        {/* BEFORE */}
                                        <div className="flex flex-col border-r border-red-900/30 overflow-hidden">
                                            <div className="px-3 py-2 bg-red-950/30 border-b border-red-900/30 flex items-center gap-2">
                                                <span className="text-red-500">☠️</span>
                                                <span className="text-[10px] text-red-400 uppercase tracking-widest">Cursed Code</span>
                                            </div>
                                            <div className="flex-grow overflow-auto p-3 bg-red-950/5">
                                                <pre className="font-mono text-[9px] text-red-300/60 whitespace-pre-wrap break-all">
                                                    {currentExorcismBefore || 'Waiting for file...'}
                                                </pre>
                                            </div>
                                        </div>

                                        {/* AFTER */}
                                        <div className="flex flex-col overflow-hidden">
                                            <div className="px-3 py-2 bg-green-950/30 border-b border-green-900/30 flex items-center gap-2">
                                                <span className="text-green-500">✨</span>
                                                <span className="text-[10px] text-green-400 uppercase tracking-widest">Purified Code</span>
                                            </div>
                                            <div className="flex-grow overflow-auto p-3 bg-green-950/5">
                                                <pre className="font-mono text-[9px] text-green-300/60 whitespace-pre-wrap break-all animate-pulse">
                                                    {currentExorcismAfter || 'Processing...'}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXORCISM DEBUG MODAL - ENHANCED */}
                    {showExorcismDebug && (
                        <div className="absolute inset-0 z-[100] bg-black/98 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            {/* Background Effect */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <img src="/assets/sangre_escurriendo.gif" alt="" className="w-full h-full object-cover" style={{ filter: 'hue-rotate(-20deg)' }} />
                            </div>

                            <div className="relative bg-[#0a0505] border-2 border-red-800 p-6 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_80px_rgba(220,38,38,0.4)] rounded-lg">
                                {/* Decorative corners */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-600"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-600"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-600"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-600"></div>

                                {/* Header */}
                                <div className="flex justify-between items-center mb-4 border-b border-red-900/50 pb-4 flex-shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="text-5xl animate-bounce">🔥</div>
                                        <div>
                                            <h3 className="text-3xl font-creep text-red-500 tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                                                EXORCISM REPORT
                                            </h3>
                                            <p className="text-gray-400 text-sm mt-1">{exorcismSummary}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowExorcismDebug(false)}
                                        className="text-red-500 hover:text-white hover:bg-red-900/30 font-mono text-xl p-2 rounded transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Changes List - Enhanced */}
                                {exorcismChanges.length > 0 && (
                                    <div className="mb-4 flex-shrink-0 bg-red-950/20 p-3 rounded border border-red-900/30">
                                        <h4 className="text-xs text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span>☠️</span> Demons Expelled ({exorcismChanges.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {exorcismChanges.map((change, i) => (
                                                <span key={i} className="text-[11px] bg-green-950/40 border border-green-800/50 text-green-300 px-3 py-1.5 rounded flex items-center gap-2">
                                                    <span className="text-green-500">✓</span> {change}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Code Diff - Enhanced */}
                                <div className="flex-grow grid grid-cols-2 gap-4 overflow-hidden">
                                    {/* Old Code */}
                                    <div className="flex flex-col overflow-hidden rounded border border-red-900/30">
                                        <div className="bg-red-950/30 px-3 py-2 border-b border-red-900/30 flex items-center gap-2">
                                            <span className="text-red-500 text-lg">☠️</span>
                                            <span className="text-xs text-red-400 uppercase tracking-widest">Cursed Code (Before)</span>
                                        </div>
                                        <div className="flex-grow bg-red-950/10 p-3 overflow-auto font-mono text-[11px] text-red-300/80 whitespace-pre">
                                            {exorcismOldCode}
                                        </div>
                                    </div>

                                    {/* New Code */}
                                    <div className="flex flex-col overflow-hidden rounded border border-green-900/30">
                                        <div className="bg-green-950/30 px-3 py-2 border-b border-green-900/30 flex items-center gap-2">
                                            <span className="text-green-500 text-lg">✨</span>
                                            <span className="text-xs text-green-400 uppercase tracking-widest">Purified Code (After)</span>
                                        </div>
                                        <div className="flex-grow bg-green-950/10 p-3 overflow-auto font-mono text-[11px] text-green-300/80 whitespace-pre">
                                            {exorcismNewCode}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer - Enhanced */}
                                <div className="mt-4 pt-4 border-t border-red-900/30 flex justify-between items-center flex-shrink-0 bg-black/30 -mx-6 -mb-6 px-6 py-4">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                                        <span>💡</span>
                                        <span>The code has been updated in the editor</span>
                                    </div>
                                    <button
                                        onClick={() => setShowExorcismDebug(false)}
                                        className="group px-6 py-2 bg-red-950 text-red-100 font-creep text-sm tracking-wider border-2 border-red-700 hover:bg-red-900 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:border-red-500 transition-all flex items-center gap-2"
                                    >
                                        <span className="group-hover:animate-pulse">✓</span> CLOSE REPORT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROJECT ANALYSIS MODAL - ENHANCED */}
                    {showProjectAnalysis && (
                        <div className="absolute inset-0 z-[100] bg-black/98 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                            {/* Background Effect */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <img src="/assets/luna_sangre.gif" alt="" className="w-full h-full object-cover" style={{ filter: 'hue-rotate(30deg) saturate(0.5)' }} />
                            </div>

                            <div className="relative bg-[#0a0505] border-2 border-amber-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_80px_rgba(217,119,6,0.4)] rounded-lg">
                                {/* Decorative corners */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-600"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-600"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-600"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-600"></div>

                                {/* Header */}
                                <div className="flex justify-between items-center mb-4 border-b border-amber-900/50 pb-4 flex-shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="text-5xl animate-float">📜</div>
                                        <div>
                                            <h3 className="text-3xl font-creep text-amber-500 tracking-widest drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]">
                                                PROJECT TESTAMENT
                                            </h3>
                                            <p className="text-gray-500 text-xs mt-1">
                                                🔮 Complete project analysis - {files.length} files analyzed
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowProjectAnalysis(false)}
                                        className="text-amber-500 hover:text-white hover:bg-amber-900/30 font-mono text-xl p-2 rounded transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {isAnalyzingProject ? (
                                    /* Loading State - Enhanced */
                                    <div className="flex-grow flex flex-col items-center justify-center py-12">
                                        <div className="relative">
                                            <div className="text-8xl mb-6 animate-float">🔮</div>
                                            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                                        </div>
                                        <h4 className="text-amber-400 font-creep text-2xl tracking-widest animate-glow-pulse">
                                            CONSULTING THE SPIRITS...
                                        </h4>
                                        <p className="text-gray-400 text-sm mt-3">The ghosts are reading your code line by line</p>
                                        <div className="mt-6 flex gap-4">
                                            {['📄', '🔍', '💀', '✨', '⚰️', '🕯️'].map((emoji, i) => (
                                                <span
                                                    key={i}
                                                    className="text-3xl animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }}
                                                >
                                                    {emoji}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-6 w-64 h-1 bg-amber-950 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-600 via-red-500 to-amber-600 animate-pulse" style={{ width: '60%' }}></div>
                                        </div>
                                    </div>
                                ) : projectAnalysis ? (
                                    /* Analysis Results */
                                    <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-amber-900/50">

                                        {/* Summary */}
                                        <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded">
                                            <h4 className="text-amber-400 font-creep text-sm tracking-widest mb-2">🔮 SUMMARY</h4>
                                            <p className="text-gray-300 text-sm">{projectAnalysis.summary}</p>
                                        </div>

                                        {/* Migration Path */}
                                        <div className="bg-purple-950/20 border border-purple-900/30 p-4 rounded">
                                            <h4 className="text-purple-400 font-creep text-sm tracking-widest mb-2">⚡ MIGRATION PATH</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-950/30 px-4 py-2 rounded border border-red-900/30">
                                                    <div className="text-[10px] text-gray-500 uppercase">Current Version</div>
                                                    <div className="text-red-400 font-mono">{projectAnalysis.currentVersion}</div>
                                                </div>
                                                <span className="text-2xl text-purple-500">→</span>
                                                <div className="bg-green-950/30 px-4 py-2 rounded border border-green-900/30">
                                                    <div className="text-[10px] text-gray-500 uppercase">Target Version</div>
                                                    <div className="text-green-400 font-mono">{projectAnalysis.targetVersion}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Purpose */}
                                        <div className="bg-black/30 border border-gray-800 p-4 rounded">
                                            <h4 className="text-gray-400 font-creep text-sm tracking-widest mb-2">📖 PURPOSE</h4>
                                            <p className="text-gray-400 text-sm">{projectAnalysis.purpose}</p>
                                        </div>

                                        {/* Grid for lists */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Obsolete Code */}
                                            <div className="bg-red-950/10 border border-red-900/30 p-4 rounded">
                                                <h4 className="text-red-400 font-creep text-sm tracking-widest mb-2">☠️ OBSOLETE CODE</h4>
                                                <ul className="space-y-1">
                                                    {projectAnalysis.obsoleteCode.length > 0 ? (
                                                        projectAnalysis.obsoleteCode.map((item, i) => (
                                                            <li key={i} className="text-[11px] text-red-300/70 flex items-start gap-2">
                                                                <span className="text-red-500">•</span> {item}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-[11px] text-gray-500 italic">None detected</li>
                                                    )}
                                                </ul>
                                            </div>

                                            {/* Tech Debt */}
                                            <div className="bg-amber-950/10 border border-amber-900/30 p-4 rounded">
                                                <h4 className="text-amber-400 font-creep text-sm tracking-widest mb-2">💀 TECHNICAL DEBT</h4>
                                                <ul className="space-y-1">
                                                    {projectAnalysis.techDebt.length > 0 ? (
                                                        projectAnalysis.techDebt.map((item, i) => (
                                                            <li key={i} className="text-[11px] text-amber-300/70 flex items-start gap-2">
                                                                <span className="text-amber-500">•</span> {item}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-[11px] text-gray-500 italic">Ninguna detectada</li>
                                                    )}
                                                </ul>
                                            </div>

                                            {/* Migration Suggestions */}
                                            <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded">
                                                <h4 className="text-purple-400 font-creep text-sm tracking-widest mb-2">🔧 MIGRATION STEPS</h4>
                                                <ul className="space-y-1">
                                                    {projectAnalysis.migrationSuggestions.length > 0 ? (
                                                        projectAnalysis.migrationSuggestions.map((item, i) => (
                                                            <li key={i} className="text-[11px] text-purple-300/70 flex items-start gap-2">
                                                                <span className="text-purple-500">{i + 1}.</span> {item}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-[11px] text-gray-500 italic">None suggested</li>
                                                    )}
                                                </ul>
                                            </div>

                                            {/* Recommendations */}
                                            <div className="bg-green-950/10 border border-green-900/30 p-4 rounded">
                                                <h4 className="text-green-400 font-creep text-sm tracking-widest mb-2">✨ RECOMMENDATIONS</h4>
                                                <ul className="space-y-1">
                                                    {projectAnalysis.recommendations.length > 0 ? (
                                                        projectAnalysis.recommendations.map((item, i) => (
                                                            <li key={i} className="text-[11px] text-green-300/70 flex items-start gap-2">
                                                                <span className="text-green-500">✓</span> {item}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-[11px] text-gray-500 italic">Ninguna</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow flex items-center justify-center text-gray-500">
                                        Error analyzing the project
                                    </div>
                                )}

                                {/* Footer - Enhanced */}
                                <div className="mt-4 pt-4 border-t border-amber-900/30 flex justify-between items-center flex-shrink-0 bg-black/30 -mx-6 -mb-6 px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-500 text-lg">✅</span>
                                        <div>
                                            <p className="text-green-400 text-xs font-mono">DETAIL.md saved automatically</p>
                                            <p className="text-gray-600 text-[10px]">The file is available in your project</p>
                                        </div>
                                    </div>
                                    {projectAnalysis && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => generateDetailMd(true)}
                                                className="group px-5 py-2 bg-amber-950 text-amber-100 font-mono text-sm border-2 border-amber-700 hover:bg-amber-900 hover:shadow-[0_0_20px_rgba(217,119,6,0.4)] hover:border-amber-500 transition-all flex items-center gap-2"
                                            >
                                                <span className="group-hover:animate-bounce">📥</span>
                                                <span className="font-creep tracking-wider">DOWNLOAD .MD</span>
                                            </button>
                                            <button
                                                onClick={() => setShowProjectAnalysis(false)}
                                                className="px-5 py-2 bg-red-950 text-red-100 font-mono text-sm border-2 border-red-800 hover:bg-red-900 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all font-creep tracking-wider"
                                            >
                                                CLOSE
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sealed Overlay when summoned */}
                    {isSummoned && (
                        <div className="absolute top-2 right-2 pointer-events-none opacity-50 z-30">
                            <div className="border border-red-500/30 p-1 bg-black/50 backdrop-blur-sm flex items-center gap-2">
                                <span className="text-[10px] text-red-500 font-creep">LINKED TO {selectedPersona?.name}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
