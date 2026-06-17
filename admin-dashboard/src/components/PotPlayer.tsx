'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  ChevronUp, 
  Tv, 
  RotateCw,
  RotateCcw,
  Gauge,
  Activity
} from 'lucide-react';

interface PotPlayerProps {
  url: string;
  onError?: (errorMsg: string) => void;
  onPlaying?: () => void;
}

export default function PotPlayer({ url, onError, onPlaying }: PotPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashPlayerRef = useRef<any>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Status feedback overlay state (for PotPlayer-like transient notifications)
  const [statusOverlayText, setStatusOverlayText] = useState<string | null>(null);
  const statusTimeoutRef = useRef<any>(null);

  // Controls overlay auto-hide
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Menu dropdowns
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [streamFormat, setStreamFormat] = useState<'HLS' | 'DASH' | 'DIRECT'>('DIRECT');

  const triggerStatusOverlay = (text: string) => {
    setStatusOverlayText(text);
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setStatusOverlayText(null);
    }, 1200);
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedMenu(false);
    }, 3000);
  };

  // Fullscreen toggle helper
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        triggerStatusOverlay('[ Fullscreen ]');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        triggerStatusOverlay('[ Window Mode ]');
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
    resetControlsTimeout();
  };

  // Synchronize fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture when container is hovered or active
      if (!containerRef.current) return;
      const isHovered = containerRef.current.matches(':hover');
      const isFocused = containerRef.current.contains(document.activeElement);
      if (!isHovered && !isFocused) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          triggerStatusOverlay(`[ Seek: -5s ]`);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          triggerStatusOverlay(`[ Seek: +5s ]`);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newVolUp = Math.min(1, video.volume + 0.1);
          video.volume = newVolUp;
          setVolume(newVolUp);
          setIsMuted(false);
          video.muted = false;
          triggerStatusOverlay(`[ Volume: ${Math.round(newVolUp * 100)}% ]`);
          break;
        case 'ArrowDown':
          e.preventDefault();
          const newVolDown = Math.max(0, video.volume - 0.1);
          video.volume = newVolDown;
          setVolume(newVolDown);
          if (newVolDown === 0) {
            setIsMuted(true);
            video.muted = true;
          }
          triggerStatusOverlay(`[ Volume: ${Math.round(newVolDown * 100)}% ]`);
          break;
        case 'KeyM':
          e.preventDefault();
          const nextMute = !video.muted;
          video.muted = nextMute;
          setIsMuted(nextMute);
          triggerStatusOverlay(nextMute ? '[ Mute ]' : '[ Unmute ]');
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [volume, isMuted]);

  // Load DashJS dynamically if needed
  const loadDashJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).dashjs) {
        resolve((window as any).dashjs);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.1/dash.all.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).dashjs);
      script.onerror = () => reject(new Error('Failed to load Dash.js'));
      document.head.appendChild(script);
    });
  };

  // Video source loading & initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous engines
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashPlayerRef.current) {
      dashPlayerRef.current.destroy();
      dashPlayerRef.current = null;
    }

    const isDASH = url.toLowerCase().includes('.mpd');
    const isHLS = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('manifest');

    if (isDASH) {
      setStreamFormat('DASH');
      loadDashJs().then((dashjs) => {
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, url, true);
        
        // Optimize for ultra speed / low latency
        player.updateSettings({
          streaming: {
            lowLatencyEnabled: true,
            liveDelay: 2,
            fastSwitchEnabled: true,
            bufferTimeAtTopQuality: 8,
            stableBufferTime: 12
          }
        });
        
        dashPlayerRef.current = player;
        
        player.on('playbackStarted', () => {
          setIsPlaying(true);
          if (onPlaying) onPlaying();
        });
        
        player.on('error', (e: any) => {
          console.error('Dash error:', e);
          if (onError) onError('DASH Stream Connection Failed');
        });
      }).catch((err) => {
        console.error(err);
        if (onError) onError('Failed to initialize DASH player');
      });
    } else if (isHLS && Hls.isSupported()) {
      setStreamFormat('HLS');
      // Set high-speed streaming configurations
      const hls = new Hls({
        maxMaxBufferLength: 20,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferLength: 15,
        manifestLoadingMaxRetry: 8,
        manifestLoadingRetryDelay: 1000,
        xhrSetup: function (xhr) {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Autoplay blocked:', e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (onError) onError('HLS Stream Fatal Error');
              break;
          }
        }
      });
    } else {
      // Fallback for native files (mp4, webm) or iOS native HLS Safari
      setStreamFormat('DIRECT');
      video.src = url;
      video.load();
      video.play().catch(e => console.log('Autoplay blocked:', e));
      
      video.addEventListener('error', () => {
        if (onError) onError('Direct Stream Playback Error');
      });
    }

    // Set initial values
    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackSpeed;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashPlayerRef.current) {
        dashPlayerRef.current.destroy();
        dashPlayerRef.current = null;
      }
    };
  }, [url]);

  // Sync state with HTML5 video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let checkTimeout: NodeJS.Timeout | null = null;
    let hasPlayingFired = false;

    const handlePlay = () => {
      setIsPlaying(true);
      triggerStatusOverlay('[ PLAY ]');
    };

    const handlePause = () => {
      setIsPlaying(false);
      triggerStatusOverlay('[ PAUSE ]');
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleRateChange = () => {
      setPlaybackSpeed(video.playbackRate);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (video.currentTime > 0 && !hasPlayingFired) {
        hasPlayingFired = true;
        if (onPlaying) onPlaying();
        if (checkTimeout) {
          clearTimeout(checkTimeout);
          checkTimeout = null;
        }
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    // Timeout fallback if stream fails to start playing in 3s
    checkTimeout = setTimeout(() => {
      if (!hasPlayingFired) {
        console.warn('Playback check timed out.');
        if (onError) onError('Stream buffer timeout: failing to receive chunks');
      }
    }, 3000);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [url, onPlaying, onError]);

  // Video UI Event handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    resetControlsTimeout();
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    triggerStatusOverlay(video.muted ? '[ Mute ]' : '[ Unmute ]');
    resetControlsTimeout();
  };

  const handleVolumeBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const value = parseFloat(e.target.value);
    video.volume = value;
    setVolume(value);
    if (value > 0) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    triggerStatusOverlay(`[ Volume: ${Math.round(value * 100)}% ]`);
    resetControlsTimeout();
  };

  const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const pct = parseFloat(e.target.value);
    const newTime = (pct / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimeout();
  };

  const handleSpeedSelect = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    triggerStatusOverlay(`[ Speed: ${speed.toFixed(2)}x ]`);
    resetControlsTimeout();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(false)}
      className="w-full h-full bg-[#0c0d12] relative flex items-center justify-center rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl select-none group focus:outline-none"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={handlePlayPause}
        onDoubleClick={toggleFullscreen}
      />

      {/* PotPlayer Watermark Logo (When paused or loading) */}
      {!isPlaying && (
        <div className="absolute top-8 left-8 flex items-center gap-2 bg-[#171923]/95 border border-[#3e4256] rounded-xl px-4 py-2 pointer-events-none transition-opacity duration-300">
          <Activity className="h-4.5 w-4.5 text-[#ff8c00] animate-pulse" />
          <span className="text-xs font-black text-white tracking-widest uppercase">POTPLAYER CLONE</span>
        </div>
      )}

      {/* Transient Status Overlay in Top-Left (Signature PotPlayer Feature) */}
      {statusOverlayText && (
        <div className="absolute top-12 left-12 bg-black/85 text-[#ff8c00] font-black text-sm px-4 py-2 border border-[#ff8c00]/30 rounded-lg pointer-events-none animate-fade-in-out font-mono tracking-wider shadow-lg">
          {statusOverlayText}
        </div>
      )}

      {/* Loading Overlay */}
      {duration === 0 && isPlaying && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-slate-700/50 border-t-[#ff8c00] rounded-full animate-spin"></div>
            <Activity className="absolute h-5 w-5 text-[#ff8c00]" />
          </div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">POTPLAYER // CACHING STREAM FEED</span>
        </div>
      )}

      {/* Custom styled control bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-10 flex flex-col gap-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek Progress bar */}
        <div className="w-full flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={duration ? (currentTime / duration) * 100 : 0}
            onChange={handleSeekBarChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#ff8c00] hover:h-2 transition-all duration-150"
          />
        </div>

        {/* Control bar buttons */}
        <div className="flex items-center justify-between">
          
          {/* Left Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-white hover:text-[#ff8c00] transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-current" />}
            </button>

            {/* Time display */}
            <span className="text-[11px] font-bold text-slate-300 font-mono tracking-wider">
              {formatTime(currentTime)} <span className="text-slate-600">/</span> {duration ? formatTime(duration) : 'LIVE'}
            </span>

            {/* Format indicator */}
            <div className="px-2 py-0.5 bg-[#ff8c00]/10 border border-[#ff8c00]/25 rounded-md text-[#ff8c00] font-black text-[9px] uppercase font-mono tracking-wider">
              ⚡ {streamFormat} FEED
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 relative">
            
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-extrabold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Gauge className="h-3.5 w-3.5" />
                {playbackSpeed.toFixed(2)}x
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-[#0d0f14] border border-slate-800 p-1 rounded-xl shadow-xl flex flex-col gap-1 w-24 z-50">
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedSelect(s)}
                      className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        playbackSpeed === s 
                          ? 'bg-[#ff8c00]/10 text-[#ff8c00]' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {s.toFixed(2)}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={handleMuteToggle}
                className="p-2 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-white hover:text-[#ff8c00] transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="h-4.5 w-4.5 text-red-500" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeBarChange}
                className="w-16 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-[#ff8c00] group-hover/volume:w-20 transition-all duration-300"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl text-white hover:text-[#ff8c00] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
