"use client";

import { useState, useEffect } from 'react';
import CallToAction from '@/components/CallToAction';
import { useStressDetection } from '@/hooks/useStressDetection';

export default function ListeningSession() {
  const [sessionId, setSessionId] = useState<string>('');
  const [userId] = useState<string>('demo-user-123'); // Replace with actual auth
  const [isListening, setIsListening] = useState(false);
  const [interventionCount, setInterventionCount] = useState(0);

  // Initialize stress detection
  const { stressLevel, lastDetection, isAnalyzing } = useStressDetection({
    sessionId,
    userId,
    enabled: isListening,
    checkIntervalMs: 5000 // Check every 5 seconds
  });

  // Create new session when listening starts
  const startListening = async () => {
    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);
      setIsListening(true);

    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // End session
  const stopListening = async () => {
    if (!sessionId) return;

    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      });

      setIsListening(false);
      setSessionId('');

    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Handle intervention completions
  const handleInterventionComplete = (type: string) => {
    setInterventionCount(prev => prev + 1);
    
    // Log for dashboard
    console.log(`Intervention completed: ${type}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a2818] to-[#051410] p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">
            Whisper Lite
          </h1>
          <p className="text-green-100/60 text-sm">
            Quiet courage, powered by AI
          </p>
        </div>

        {/* Main Control */}
        <div className="bg-white/5 rounded-3xl p-8 border border-green-500/10 backdrop-blur-sm">
          {!isListening ? (
            <div className="text-center space-y-6">
              <div className="text-white/80 text-lg font-light">
                Ready to start your session?
              </div>
              
              <button
                onClick={startListening}
                className="px-8 py-4 bg-green-500/20 hover:bg-green-500/30 text-white rounded-full text-lg transition-all transform hover:scale-105"
              >
                Start Listening
              </button>

              <p className="text-green-100/40 text-xs max-w-sm mx-auto">
                I'll listen for context clues and support you quietly. 
                Only you will know I'm here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Live Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-white/80 text-sm">Listening</span>
                </div>

                <button
                  onClick={stopListening}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-full text-sm transition-colors"
                >
                  End Session
                </button>
              </div>

              {/* Stress Indicator */}
              <div className="bg-black/20 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Environment</span>
                  {isAnalyzing && (
                    <span className="text-green-400/60 text-xs">Analyzing...</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    stressLevel === 'calm' ? 'bg-green-400' :
                    stressLevel === 'mild' ? 'bg-yellow-400' :
                    stressLevel === 'moderate' ? 'bg-orange-400' :
                    'bg-red-400'
                  }`} />
                  <span className="text-white/90 capitalize">{stressLevel}</span>
                </div>

                {lastDetection && lastDetection.triggers.length > 0 && (
                  <div className="text-green-100/50 text-xs space-y-1">
                    {lastDetection.triggers.map((trigger, idx) => (
                      <div key={idx}>• {trigger}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-green-400 text-2xl font-light">
                    {interventionCount}
                  </div>
                  <div className="text-white/50 text-xs">
                    Interventions
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                  <div className="text-green-400 text-2xl font-light">
                    {lastDetection?.confidence 
                      ? Math.round(lastDetection.confidence * 100) 
                      : 0}%
                  </div>
                  <div className="text-white/50 text-xs">
                    Confidence
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Cards */}
        {isListening && (
          <div className="mt-6 grid gap-3">
            <div className="bg-white/5 rounded-2xl p-4 border border-green-500/5">
              <div className="text-white/70 text-sm">
                💚 I'm here with you, listening quietly
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-green-500/5">
              <div className="text-white/70 text-sm">
                🔒 Your audio stays private — I only analyze patterns
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call to Action Component */}
      {isListening && (
        <CallToAction
          userId={userId}
          sessionId={sessionId}
          stressLevel={stressLevel}
          onInterventionComplete={handleInterventionComplete}
        />
      )}
    </div>
  );
}
