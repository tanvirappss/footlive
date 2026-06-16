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
  Gauge
} from 'lucide-react';

interface PremiumPlayerProps {
  url: string;
  onError?: (errorMsg: string) => void;
  onPlaying?: () => void;
}

export default function PremiumPlayer({ url, onError, onPlaying }: PremiumPlayerProps) {
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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Custom visibility controls state for mobile/touch compatibility
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedMenu(false);
      setShowQualityMenu(false);
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

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

  const skip = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    let newTime = video.currentTime + amount;
    if (newTime < 0) newTime = 0;
    if (newTime > video.duration) newTime = video.duration;
    
    video.currentTime = newTime;
    resetControlsTimeout();
  };

  // HLS Qualities
  const [qualities, setQualities] = useState<{ id: number; height: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashPlayerRef.current) {
      dashPlayerRef.current.destroy();
      dashPlayerRef.current = null;
    }

    setQualities([]);
    setCurrentQuality(-1);

    const isDASH = url.toLowerCase().includes('.mpd');
    
    if (isDASH) {
      // DASH playback
      loadDashJs().then((dashjs) => {
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, url, true);
        
        // Fast start adjustments
        player.updateSettings({
          streaming: {
            lowLatencyEnabled: true,
            liveDelay: 3,
            fastSwitchEnabled: true
          }
        });
        
        dashPlayerRef.current = player;
        
        player.on('playbackStarted', () => {
          setIsPlaying(true);
          if (onPlaying) onPlaying();
        });
        
        player.on('error', (e: any) => {
          console.error('Dash error:', e);
          if (onError) onError('DASH Stream Error');
        });
      }).catch((err) => {
        console.error(err);
        if (onError) onError('Failed to load DASH player');
      });
    } else if (Hls.isSupported()) {
      // HLS playback
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1500,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1500,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
        xhrSetup: function (xhr) {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = hls.levels;
        const mappedQualities = levels.map((lvl, idx) => ({
          id: idx,
          height: lvl.height,
          label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`
        }));
        
        // Filter unique heights & sort descending
        const uniqueQualities = mappedQualities.filter(
          (q, i, self) => self.findIndex(t => t.height === q.height) === i
        ).sort((a, b) => b.height - a.height);
        
        setQualities(uniqueQualities);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              if (onError) onError(`HLS Network Error: ${data.details}`);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (onError) onError(`Fatal playback error: ${data.details}`);
              break;
          }
        }
      });
      
      video.play().catch(() => {});
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS Native HLS
      video.src = url;
      video.addEventListener('error', () => {
        if (onError) onError('Browser stream load failed');
      });
    }

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

  // Track playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  // Time update for loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let playTimeout = setTimeout(() => {
      if (video.currentTime === 0 && !isMuted) {
        if (onError) onError('Stream buffer timeout');
      }
    }, 4500);

    const handlePlaying = () => {
      clearTimeout(playTimeout);
      if (onPlaying) onPlaying();
    };

    video.addEventListener('playing', handlePlaying);

    return () => {
      clearTimeout(playTimeout);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [url]);

  // Controls Actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
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

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);
    }
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
      }
      return;
    }

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        }
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video !== document.pictureInPictureElement) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black relative flex items-center justify-center rounded-2xl overflow-hidden border border-card-border group"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
          resetControlsTimeout();
        }}
      />

      {/* Premium Glassmorphic Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 flex flex-col gap-3 z-30 select-none ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        
        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Left Controls */}
          <div className="flex items-center gap-3.5">
            {/* 10s Backward */}
            <button 
              onClick={(e) => { e.stopPropagation(); skip(-10); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center justify-center relative"
              title="Backward 10s"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="absolute text-[8px] font-black top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[1px]">10</span>
            </button>

            {/* Play/Pause */}
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white hover:fill-emerald-accent" />}
            </button>

            {/* 10s Forward */}
            <button 
              onClick={(e) => { e.stopPropagation(); skip(10); }} 
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center justify-center relative"
              title="Forward 10s"
            >
              <RotateCw className="h-5 w-5" />
              <span className="absolute text-[8px] font-black top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-[1px]">10</span>
            </button>

            {/* Mute/Volume */}
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
                className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => { e.stopPropagation(); handleVolumeChange(e); }}
                className="w-14 sm:w-16 h-1 rounded-lg appearance-none bg-slate-800 accent-emerald-accent cursor-pointer overflow-hidden"
              />
            </div>
            
            {/* Live Badge */}
            <span className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              LIVE
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            
            {/* PiP */}
            <button 
              onClick={handlePiP}
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <Tv className="h-5 w-5" />
            </button>

            {/* Quality Selector (HLS only) */}
            {qualities.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className={`text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-black uppercase tracking-wider ${showQualityMenu ? 'text-emerald-accent' : ''}`}
                  title="Video Quality"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {currentQuality === -1 ? 'Auto' : qualities.find(q => q.id === currentQuality)?.label}
                  </span>
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 py-1.5 w-32 bg-slate-950/90 border border-card-border rounded-xl backdrop-blur-xl shadow-2xl flex flex-col z-50">
                    <button 
                      onClick={() => handleQualityChange(-1)}
                      className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${currentQuality === -1 ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button 
                        key={q.id}
                        onClick={() => handleQualityChange(q.id)}
                        className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${currentQuality === q.id ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Playback Speed */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className={`text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-black uppercase tracking-wider ${showSpeedMenu ? 'text-emerald-accent' : ''}`}
                title="Playback Speed"
              >
                <Gauge className="h-5 w-5" />
                <span className="hidden sm:inline">{playbackSpeed}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 w-28 bg-slate-950/90 border border-card-border rounded-xl backdrop-blur-xl shadow-2xl flex flex-col z-50">
                  {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                    <button 
                      key={sp}
                      onClick={() => handleSpeedChange(sp)}
                      className={`px-3 py-1.5 text-left text-xs uppercase tracking-wide hover:bg-slate-900 transition-colors ${playbackSpeed === sp ? 'text-emerald-accent font-black' : 'text-slate-400 font-bold'}`}
                    >
                      {sp === 1 ? 'Normal' : `${sp}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button 
              onClick={toggleFullscreen}
              className="text-white hover:text-emerald-accent p-1.5 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
