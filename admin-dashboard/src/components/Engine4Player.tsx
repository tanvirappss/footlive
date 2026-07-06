'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useBlackScreenDetector } from './useBlackScreenDetector';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  RotateCcw, Settings, Info, AlertTriangle, Activity 
} from 'lucide-react';

interface Engine4PlayerProps {
  url: string;
  onError?: (errorMsg: string) => void;
  onPlaying?: () => void;
}

export default function Engine4Player({ url, onError, onPlaying }: Engine4PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  useBlackScreenDetector(videoRef, url, onError);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [qualities, setQualities] = useState<{ id: number; label: string }[]>([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Helper to add logs to the debugging console
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hlsInstance: Hls | null = null;
    let currentUseCredentials = false;

    // Cross-origin and compatibility settings on native video
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    // Autoplay helper matching PremiumPlayer
    const attemptPlay = (el: HTMLVideoElement) => {
      addLog('Attempting autoplay...');
      el.play().then(() => {
        setIsPlaying(true);
        if (onPlaying) onPlaying();
        addLog('Playback started successfully.');
      }).catch((err) => {
        addLog('Unmuted autoplay blocked. Muting stream and retrying...');
        el.muted = true;
        setIsMuted(true);
        el.play().then(() => {
          setIsPlaying(true);
          if (onPlaying) onPlaying();
          addLog('Muted autoplay started successfully.');
        }).catch((playErr) => {
          addLog(`Critical: Autoplay failed. Click play manually. Error: ${playErr.message}`);
        });
      });
    };

    const initPlayer = (withCreds: boolean) => {
      addLog(`Initializing HLS client (Credentials: ${withCreds})`);
      
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 20,
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 10,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 10,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 12,
          fragLoadingRetryDelay: 1000,
          xhrSetup: (xhr, requestUrl) => {
            xhr.withCredentials = withCreds;
            addLog(`Requesting: ${requestUrl.substring(0, 60)}...`);
          }
        });

        hlsInstance = hls;
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          addLog(`Manifest parsed. Found ${data.levels.length} quality levels.`);
          const mappedQualities = data.levels.map((level, index) => ({
            id: index,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`
          }));
          setQualities([{ id: -1, label: 'Auto' }, ...mappedQualities]);
          attemptPlay(video);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const levelIndex = data.level;
          if (levelIndex === -1) {
            setCurrentQuality('Auto');
          } else {
            const matched = hls.levels[levelIndex];
            setCurrentQuality(matched?.height ? `${matched.height}p` : `Level ${levelIndex + 1}`);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          const errorType = data.type;
          const errorDetails = data.details;
          const errorFatal = data.fatal;

          addLog(`[HLS Error] ${errorDetails} (Fatal: ${errorFatal})`);

          if (errorDetails === 'manifestLoadError' || errorDetails === 'levelLoadError') {
            const responseCode = (data.response as any)?.status;
            addLog(`HTTP status: ${responseCode || 'unknown'}`);

            if ((responseCode === 403 || responseCode === 401 || responseCode === 0) && !withCreds) {
              addLog('Authorization/CORS error detected. Switching credentials mode to TRUE and retrying...');
              currentUseCredentials = true;
              initPlayer(true);
              return;
            }
          }

          if (errorFatal) {
            switch (errorType) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                addLog('Fatal network error. Retrying startLoad...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                addLog('Fatal media error. Recovering media...');
                hls.recoverMediaError();
                break;
              default:
                addLog('Fatal error. Re-initializing player...');
                initPlayer(currentUseCredentials);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        addLog('Using native iOS Safari HLS player.');
        video.src = url;
        attemptPlay(video);
      } else {
        addLog('HLS not supported in this browser.');
        if (onError) onError('HLS playback is not supported by your browser.');
      }
    };

    initPlayer(currentUseCredentials);

    // Fullscreen orientation lock listener
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement || !!(document as any).webkitIsFullScreen;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          try {
            (screen.orientation as any).unlock();
          } catch (e) {}
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [url]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        addLog('Playback resumed.');
      });
    } else {
      video.pause();
      setIsPlaying(false);
      addLog('Playback paused.');
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    addLog(video.muted ? 'Audio muted.' : 'Audio unmuted.');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    video.muted = val === 0;
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      }).catch(err => {
        addLog(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleQualityChange = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      addLog(`Manually switched quality to: ${levelId === -1 ? 'Auto' : qualities.find(q => q.id === levelId)?.label}`);
    }
    setShowSettingsMenu(false);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
    addLog(`Playback speed changed to: ${speed}x`);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none border border-slate-900 shadow-2xl"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
        autoPlay
        muted
        crossOrigin="anonymous"
      />

      {/* Control Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top bar: Stats and logs toggle */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
              <Activity className="h-3 w-3 animate-pulse" />
              Engine-4 Active
            </span>
            <span className="text-[10px] text-slate-300 font-semibold bg-slate-950/60 px-2 py-1 rounded-md border border-slate-900">
              Q: {currentQuality}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="p-1.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-lg text-slate-300 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              title="Toggle Console logs"
            >
              <Info className="h-3.5 w-3.5" />
              Logs
            </button>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="space-y-3 pointer-events-auto">
          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-900/60 p-2.5 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-white transition-all"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-white transition-all"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Settings Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-white transition-all"
                >
                  <Settings className="h-5 w-5" />
                </button>

                {showSettingsMenu && (
                  <div className="absolute bottom-10 right-0 w-48 bg-slate-950 border border-slate-900 p-2.5 rounded-xl shadow-2xl space-y-2 z-50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">Quality</span>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 border-b border-slate-900 pb-2">
                      {qualities.map(q => (
                        <button
                          key={q.id}
                          onClick={() => handleQualityChange(q.id)}
                          className="w-full text-left text-[10px] text-slate-300 hover:bg-slate-900 px-2 py-1 rounded font-semibold transition-all flex justify-between"
                        >
                          <span>{q.label}</span>
                          {currentQuality === q.label && <span className="text-emerald-400">✓</span>}
                        </button>
                      ))}
                    </div>

                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">Speed</span>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`text-[9px] font-bold py-1 rounded transition-all ${
                            playbackSpeed === speed 
                              ? 'bg-emerald-500 text-black' 
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-white transition-all"
              >
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Logs Panel */}
      {showLogs && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 p-4 font-mono text-[9px] text-slate-300 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
            <span className="text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              Engine-4 Diagnostics Console
            </span>
            <button 
              onClick={() => setLogs([])}
              className="text-[8px] font-extrabold text-slate-500 hover:text-white uppercase tracking-widest border border-slate-900 px-2 py-0.5 rounded bg-slate-950"
            >
              Clear Logs
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-slate-600">No active events logged yet.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border-l border-slate-900 pl-2 leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-900 pt-2 mt-2 flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Retries: {retryCount}</span>
            <span>Player Mode: HLS.js Client</span>
          </div>
        </div>
      )}
    </div>
  );
}
