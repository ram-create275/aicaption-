
import React, { useState, useRef } from 'react';
import { generateSpeech, decodeBase64, decodeAudioData } from '../geminiService';

interface AudioControlProps {
  text: string;
  className?: string;
}

export const AudioControl: React.FC<AudioControlProps> = ({ text, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const handlePlay = async () => {
    if (loading || isPlaying) return;
    
    setLoading(true);
    try {
      // Initialize or resume AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      const base64Audio = await generateSpeech(text);
      const bytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(bytes, audioCtxRef.current);
      
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtxRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
      };
      
      setIsPlaying(true);
      source.start();
    } catch (error) {
      console.error("Speech generation or playback failed:", error);
      alert("Voice playback failed. This may be due to browser restrictions or API limitations.");
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={loading}
      title="Play Voice Over"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium disabled:opacity-50 ${
        isPlaying 
          ? "bg-indigo-600 text-white" 
          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      } ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isPlaying ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
      {isPlaying ? "Playing..." : loading ? "Loading..." : "Listen"}
    </button>
  );
};
