import React, { useState, useEffect, useRef } from 'react';
import { parse } from 'marked';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 10,
  onComplete,
  className = ""
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [renderedHtml, setRenderedHtml] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset when text changes significantly (new message)
    setDisplayedText('');
    setRenderedHtml('');
    indexRef.current = 0;

    const typeChar = async () => {
      if (indexRef.current < text.length) {
        // We type raw markdown characters
        const nextChar = text.charAt(indexRef.current);
        const currentText = text.substring(0, indexRef.current + 1);

        setDisplayedText(currentText);

        // Render current partial markdown to HTML
        try {
          // marked.parse can be async or sync depending on version, handle as promise for safety
          const html = await parse(currentText);
          setRenderedHtml(html);
        } catch (e) {
          setRenderedHtml(currentText); // Fallback
        }

        indexRef.current++;
        // Vary the speed slightly for a "human/ghost" feel
        const randomVariance = Math.random() * 15;
        timeoutRef.current = setTimeout(typeChar, speed + randomVariance);
      } else {
        // Ensure final render is complete and accurate
        try {
          const html = await parse(text);
          setRenderedHtml(html);
        } catch (e) {
          setRenderedHtml(text);
        }
        if (onComplete) onComplete();
      }
    };

    typeChar();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className={className}>
      <div
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
        className="markdown-content inline"
      />
      <span className="animate-pulse inline-block w-2 h-4 bg-green-500 ml-1 align-middle"></span>
      <style>{`
        .markdown-content p { display: inline; }
        .markdown-content strong { color: #ef4444; font-weight: bold; } /* Red bold */
        .markdown-content em { font-style: italic; color: #d4b483; } /* Gold italic */
        .markdown-content code { background: #1a0505; color: #fca5a5; padding: 2px 4px; border-radius: 2px; font-family: monospace; border: 1px solid #7f1d1d; }
        .markdown-content pre { display: block; background: #0c0505; border: 1px solid #450a0a; padding: 10px; margin: 10px 0; overflow-x: auto; }
        .markdown-content pre code { background: transparent; color: #fecaca; border: none; padding: 0; }
        .markdown-content ul { list-style-type: disc; padding-left: 20px; display: block; margin: 5px 0; }
        .markdown-content li { margin-bottom: 2px; display: list-item; }
      `}</style>
    </div>
  );
};