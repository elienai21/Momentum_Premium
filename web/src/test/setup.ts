// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock básico para o ambiente jsdom
if (typeof window !== "undefined") {
  if (!window.speechSynthesis) {
    // @ts-expect-error - mock de speechSynthesis
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      paused: false,
      pending: false,
      speaking: false,
      onvoiceschanged: null,
    };
  }

  // Mock do áudio
  // @ts-expect-error
  if (!window.Audio) {
    // @ts-expect-error
    class FakeAudio {
      src = "";
      autoplay = false;
      loop = false;
      paused = true;
      play = vi.fn(async () => {
        this.paused = false;
      });
      pause = vi.fn(() => {
        this.paused = true;
      });
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      load = vi.fn();
    }
    // @ts-expect-error
    window.Audio = FakeAudio;
  }
}
