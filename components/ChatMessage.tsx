import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from '../types';
import { generateSpeech, getAudioContext, playSpeech } from '../services/ai';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean; // Used to trigger auto-play for the latest message
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLast = false }) => {
  const isModel = message.role === Role.MODEL;
  const [isCopied, setIsCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const hasAutoPlayed = useRef(false);
  const useBrowserTTS = !!process.env.DEEPSEEK_API_KEY && !process.env.API_KEY;

  useEffect(() => {
    // Stop audio when component unmounts
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
    };
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (isModel && isLast && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      handlePlayAudio();
    }
  }, [isModel, isLast, message.text]);

  // Simple formatter to handle bold text (**text**) and newlines
  const formatText = (text: string) => {
    return text.split('\n').map((line, lineIndex) => {
      // Basic bold parsing
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <React.Fragment key={lineIndex}>
          <p className={`min-h-[1.5em] ${lineIndex > 0 ? 'mt-2' : ''}`}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIndex} className="font-bold text-emerald-800">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        </React.Fragment>
      );
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePlayAudio = async () => {
    // Toggle off
    if (isPlaying) {
      try {
        if (useBrowserTTS) {
          window.speechSynthesis.cancel();
        } else if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
        }
      } catch {}
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const cleanText = message.text
        .replace(/\*\*/g, '')
        .replace(/\#/g, '')
        .replace(/^\s*[\-\*]\s/gm, '')
        .replace(/[\(\[\{].*?[\)\]\}]/g, '');

      if (useBrowserTTS) {
        setIsPlaying(true);
        await playSpeech(cleanText);
        setIsPlaying(false);
        return;
      }

      const audioBuffer = await generateSpeech(cleanText);
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio playback failed", error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <div className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} mb-6 animate-fade-in-up group`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xl shadow-sm border border-stone-200 ${isModel ? 'bg-white mr-3' : 'bg-emerald-600 ml-3 text-white'}`}>
          {isModel ? '👨‍🏫' : '👤'}
        </div>

        {/* Bubble & Actions Container */}
        <div className="flex flex-col items-start w-full">
          {/* Audio Loading Indicator (Only visible during auto-play wait) */}
          {isAudioLoading && isModel && (
            <div className="mb-2 ml-1 flex items-center gap-2 text-emerald-600 text-xs font-medium animate-pulse">
               <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               正在準備語音...
            </div>
          )}

          {/* Bubble */}
          <div 
            className={`
              p-5 rounded-2xl shadow-sm border relative
              ${isModel 
                ? 'bg-white border-stone-100 text-stone-700 rounded-tl-none' 
                : 'bg-emerald-600 border-emerald-600 text-white rounded-tr-none'
              }
            `}
          >
            <div className="text-sm md:text-base leading-relaxed">
              {formatText(message.text)}
            </div>
            
            {!isModel && (
              <div className="text-xs mt-2 text-emerald-200 text-right">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Model Actions Toolbar */}
          {isModel && (
            <div className="flex items-center gap-2 mt-1 ml-1">
              <span className="text-xs text-stone-400 mr-2">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              {/* Copy Button */}
              <button 
                onClick={handleCopy}
                className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 rounded-full transition-colors relative"
                title="複製內容"
              >
                {isCopied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>

              {/* Play Audio Button */}
              <button 
                onClick={handlePlayAudio}
                disabled={isAudioLoading}
                className={`
                  p-1.5 rounded-full transition-colors flex items-center gap-1
                  ${isPlaying 
                    ? 'text-emerald-600 bg-emerald-50 ring-1 ring-emerald-100' 
                    : 'text-stone-400 hover:text-emerald-600 hover:bg-stone-100'
                  }
                `}
                title="語音朗讀"
              >
                {isAudioLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isPlaying ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span className="text-xs font-medium">播放中</span>
                  </>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
