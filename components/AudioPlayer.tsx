
import React, { useState, useEffect, useRef } from 'react';
import { decode, decodeAudioData } from '../utils/audio';

interface AudioPlayerProps {
  audioData: string;
  playNarrationText: string;
  loadingAudioText: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, playNarrationText, loadingAudioText }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Initialize AudioContext
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    // Decode audio data when the component receives it
    const processAudio = async () => {
        if (audioData && audioContextRef.current) {
            try {
                setIsReady(false);
                const decodedBytes = decode(audioData);
                const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
                audioBufferRef.current = buffer;
                setIsReady(true);
            } catch (error) {
                console.error("Failed to decode audio data", error);
            }
        }
    };
    processAudio();
    
    // Cleanup function
    return () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }
    };
  }, [audioData]);

  const handlePlayPause = () => {
    if (!isReady || !audioContextRef.current || !audioBufferRef.current) return;

    if (isPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
      };
      source.start();
      audioSourceRef.current = source;
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-full shadow-inner w-full max-w-xs">
        <button 
            onClick={handlePlayPause} 
            disabled={!isReady}
            className="p-3 bg-blue-600 text-white rounded-full disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all"
            aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
        >
            {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd"></path></svg>
            ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
            )}
        </button>
        <span className="ml-4 font-semibold text-gray-700 dark:text-gray-200">
            {isReady ? playNarrationText : loadingAudioText}
        </span>
    </div>
  );
};

export default AudioPlayer;