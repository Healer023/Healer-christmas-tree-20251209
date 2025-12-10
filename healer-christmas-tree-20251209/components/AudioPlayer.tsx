import React, { useEffect, useRef, useState } from 'react';
import { AppState } from '../types';

interface AudioPlayerProps {
  appState: AppState;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ appState }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const christmasAudioRef = useRef<HTMLAudioElement>(null);
  const birthdayAudioRef = useRef<HTMLAudioElement>(null);
  
  // 保存两个音频的播放进度
  const christmasProgressRef = useRef<number>(0);
  const birthdayProgressRef = useRef<number>(0);

  // 根据状态获取当前应该播放的音频
  const getCurrentAudio = () => {
    return appState === AppState.TEXT_SHAPE ? birthdayAudioRef.current : christmasAudioRef.current;
  };

  const getOtherAudio = () => {
    return appState === AppState.TEXT_SHAPE ? christmasAudioRef.current : birthdayAudioRef.current;
  };

  // 使用 ref 跟踪上一个状态，以便在状态改变时保存旧音频的进度
  const prevAppStateRef = useRef<AppState>(appState);

  // 切换音乐 - 只在 appState 改变时执行
  useEffect(() => {
    // 跳过首次渲染（此时 prevAppStateRef.current 和 appState 相同）
    if (prevAppStateRef.current === appState) return;
    
    const currentAudio = getCurrentAudio();
    const otherAudio = getOtherAudio();
    
    if (!currentAudio || !otherAudio) return;

    // 保存上一个状态的音频进度（在暂停之前保存）
    const prevState = prevAppStateRef.current;
    const wasPlaying = isPlaying; // 保存播放状态
    
    if (prevState === AppState.TEXT_SHAPE) {
      // 之前是生日状态，保存生日音频进度
      if (birthdayAudioRef.current) {
        birthdayProgressRef.current = birthdayAudioRef.current.currentTime;
      }
    } else {
      // 之前是圣诞状态，保存圣诞音频进度
      if (christmasAudioRef.current) {
        christmasProgressRef.current = christmasAudioRef.current.currentTime;
      }
    }
    
    // 暂停另一个音频
    otherAudio.pause();
    
    // 恢复当前音频的进度
    const progress = appState === AppState.TEXT_SHAPE 
      ? birthdayProgressRef.current 
      : christmasProgressRef.current;
    
    // 设置音量和进度
    currentAudio.volume = 0.5;
    
    // 确保音频加载完成后再设置进度和播放
    const switchAudio = async () => {
      try {
        // 如果音频还没加载，等待加载完成
        if (currentAudio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (currentAudio.readyState >= 2) {
              resolve();
              return;
            }
            const onCanPlay = () => {
              currentAudio.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            currentAudio.addEventListener('canplay', onCanPlay);
          });
        }
        
        // 设置进度
        currentAudio.currentTime = progress;
        
        // 如果之前正在播放，继续播放当前音频
        if (wasPlaying) {
          await currentAudio.play();
        }
      } catch (e) {
        console.log("Audio switch failed", e);
        // 如果播放失败，更新状态
        if (wasPlaying) {
          setIsPlaying(false);
        }
      }
    };
    
    switchAudio();
    
    // 更新上一个状态
    prevAppStateRef.current = appState;
  }, [appState, isPlaying]);

  // 监听音频时间更新，实时保存进度
  useEffect(() => {
    const currentAudio = getCurrentAudio();
    if (!currentAudio) return;

    const updateProgress = () => {
      if (appState === AppState.TEXT_SHAPE) {
        birthdayProgressRef.current = currentAudio.currentTime;
      } else {
        christmasProgressRef.current = currentAudio.currentTime;
      }
    };

    currentAudio.addEventListener('timeupdate', updateProgress);
    return () => {
      currentAudio.removeEventListener('timeupdate', updateProgress);
    };
  }, [appState, isPlaying]);

  const togglePlay = async () => {
    const currentAudio = getCurrentAudio();
    if (!currentAudio) return;
    
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      try {
        // 确保音频已加载
        if (currentAudio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (currentAudio.readyState >= 2) {
              resolve();
              return;
            }
            const onCanPlay = () => {
              currentAudio.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            currentAudio.addEventListener('canplay', onCanPlay);
          });
        }
        
        await currentAudio.play();
        setIsPlaying(true);
      } catch (e) {
        console.log("Audio play failed", e);
      }
    }
  };

  // 默认自动播放 Merry Christmas.mp3
  useEffect(() => {
    const attemptPlay = async () => {
      const christmasAudio = christmasAudioRef.current;
      if (!christmasAudio) return;
      
      try {
        // 设置音量
        christmasAudio.volume = 0.5;
        
        // 等待音频加载完成
        if (christmasAudio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (christmasAudio.readyState >= 2) {
              resolve();
              return;
            }
            const onCanPlay = () => {
              christmasAudio.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            christmasAudio.addEventListener('canplay', onCanPlay);
            // 设置超时，避免无限等待
            setTimeout(() => resolve(), 3000);
          });
        }
        
        // 尝试播放
        await christmasAudio.play();
        setIsPlaying(true);
      } catch (err) {
        // Autoplay blocked, 尝试通过用户交互解锁
        console.log("Autoplay blocked, waiting for user interaction");
        
        // 添加一次性点击监听器，在用户第一次点击页面时自动播放
        const unlockAudio = async () => {
          try {
            await christmasAudio.play();
            setIsPlaying(true);
            // 移除监听器
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          } catch (e) {
            console.log("Audio unlock failed", e);
          }
        };
        
        // 监听用户交互
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
      }
    };
    
    // 延迟一点时间，确保 DOM 完全加载
    const timer = setTimeout(() => {
      attemptPlay();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed top-6 right-6 z-50">
      {/* 圣诞音乐 */}
      <audio 
        ref={christmasAudioRef} 
        src="/Merry Christmas.mp3" 
        loop 
        preload="auto"
        playsInline
      />
      {/* 生日音乐 */}
      <audio 
        ref={birthdayAudioRef} 
        src="/Happy Birthday.mp3" 
        loop 
        preload="auto"
        playsInline
      />
      <button 
        onClick={togglePlay}
        className={`w-12 h-12 rounded-full border border-emerald-500/30 flex items-center justify-center backdrop-blur-md transition-all duration-300 ${isPlaying ? 'bg-emerald-900/40 text-emerald-200' : 'bg-black/40 text-emerald-500/50 hover:bg-emerald-900/60 hover:text-emerald-200'}`}
        title={isPlaying ? "Mute Music" : "Play Music"}
      >
        {isPlaying ? (
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
           </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
           </svg>
        )}
      </button>
    </div>
  );
};