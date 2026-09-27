// Voice metadata returned from Edge TTS
export interface EdgeVoice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
}

// Request body sent from frontend to POST /api/tts
export interface TTSRequest {
  text: string;
  voice: string;
  rate?: string;   // e.g. "+0%", "-20%", "+50%"
  pitch?: string;  // e.g. "+0Hz", "-10Hz", "+5Hz"
  volume?: string; // e.g. "+0%", "-10%", "+100%"
}

// Successful TTS response
export interface TTSResponse {
  success: true;
  audioUrl: string;
  duration?: number;
}

// Error response
export interface TTSErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// Union type for all API responses
export type TTSApiResponse = TTSResponse | TTSErrorResponse;

// Voice selector option (simplified for UI)
export interface VoiceOption {
  value: string;       // ShortName used in API call
  label: string;       // FriendlyName shown in UI
  locale: string;
  localeName?: string; // e.g., "English (United States)"
  gender: string;
}
