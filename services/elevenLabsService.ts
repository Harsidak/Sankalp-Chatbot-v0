// NOTE: Hardcoding API keys in frontend code is a major security risk.
// This key is for demonstration purposes and was provided by the user.
// It may have limitations or be invalid. For production, use a secure backend or environment variables.
const ELEVENLABS_API_KEY = '132b3a6f1981b89c64f51d3bbe7729ba526908e1661539c0f19705593bc03315';

const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // A common voice, Rachel
const STREAM_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`;

let currentAudio: HTMLAudioElement | null = null;
let abortController: AbortController | null = null;

export const speakText = async (text: string): Promise<void> => {
  if (!ELEVENLABS_API_KEY) {
    console.error("ElevenLabs API key is missing.");
    throw new Error("AI voice feature is not configured.");
  }

  // Abort any ongoing speech synthesis
  stopSpeaking();
  abortController = new AbortController();

  const headers = {
    'Accept': 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': ELEVENLABS_API_KEY,
  };

  const body = JSON.stringify({
    text: text,
    model_id: 'eleven_multilingual_v2', // Use multilingual for better language support
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true,
    },
  });

  try {
    const response = await fetch(STREAM_API_URL, {
      method: 'POST',
      headers: headers,
      body: body,
      signal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail?.message || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.src = URL.createObjectURL(mediaSource);
    currentAudio = audio;

    audio.play().catch(e => { 
        if ((e as Error).name !== 'AbortError') {
            console.error("Audio play failed:", e);
        }
    });

    return new Promise((resolve, reject) => {
      const handleSourceOpen = () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const chunkQueue: ArrayBuffer[] = [];
        let isAppending = false;

        const appendNextChunk = () => {
          if (!isAppending && chunkQueue.length > 0 && sourceBuffer.updating === false) {
            isAppending = true;
            const chunk = chunkQueue.shift();
            if (chunk) {
              try {
                sourceBuffer.appendBuffer(chunk);
              } catch (e) {
                console.error("Error appending buffer:", e);
                isAppending = false;
              }
            } else {
              isAppending = false;
            }
          }
        };

        sourceBuffer.addEventListener('updateend', () => {
          isAppending = false;
          appendNextChunk();
        });

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                const endStream = () => {
                  if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
                    try { mediaSource.endOfStream(); } catch(e) {}
                  }
                };
                // Wait for all chunks to be appended before ending the stream
                const checkQueueInterval = setInterval(() => {
                  if (chunkQueue.length === 0 && !isAppending) {
                    clearInterval(checkQueueInterval);
                    endStream();
                  }
                }, 50);
                break;
              }
              chunkQueue.push(value.buffer);
              appendNextChunk();
            }
          } catch (error) {
            if ((error as Error).name !== 'AbortError') {
              console.error('Error reading stream:', error);
              reject(error);
            }
          }
        };

        readStream();
      };
      
      mediaSource.addEventListener('sourceopen', handleSourceOpen, { once: true });

      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(audio.src);
        console.error('Audio element error:', e);
        currentAudio = null;
        reject(e);
      };

      abortController?.signal.addEventListener('abort', () => {
        if (mediaSource.readyState === 'open') {
          try { mediaSource.endOfStream(); } catch (e) {}
        }
        URL.revokeObjectURL(audio.src);
        reject(new Error("Playback aborted"));
      });
    });

  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error with ElevenLabs API:', error);
    }
    throw error;
  }
};

export const stopSpeaking = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    if (currentAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudio.src);
    }
    currentAudio = null;
  }
};
