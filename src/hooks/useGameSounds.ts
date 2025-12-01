import { useCallback, useRef } from "react";

export function useGameSounds() {
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const celebrationSoundRef = useRef<HTMLAudioElement | null>(null);

  const playCorrect = useCallback(() => {
    if (!correctSoundRef.current) {
      correctSoundRef.current = new Audio("/sounds/correct.mp3");
      correctSoundRef.current.volume = 0.5;
    }
    correctSoundRef.current.currentTime = 0;
    correctSoundRef.current.play().catch(() => {});
  }, []);

  const playCelebration = useCallback(() => {
    if (!celebrationSoundRef.current) {
      celebrationSoundRef.current = new Audio("/sounds/celebration.mp3");
      celebrationSoundRef.current.volume = 0.6;
    }
    celebrationSoundRef.current.currentTime = 0;
    celebrationSoundRef.current.play().catch(() => {});
  }, []);

  const playClick = useCallback(() => {
    const audio = new Audio("/sounds/click.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  return { playCorrect, playCelebration, playClick };
}
