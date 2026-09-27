# TTS Platform

A Text-to-Speech web application powered by **Microsoft Edge TTS** via Next.js 14 App Router.

## Features

- 🎙️ 400+ voices across 100+ locales (Edge TTS)
- 🎛️ Full prosody control — Rate, Pitch, Volume
- 🔊 In-browser audio playback + MP3 download
- 🔍 Searchable voice selector
- ⚡ Edge TTS (no API key required)

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout
│   └── api/tts/
│       └── route.ts      # POST (generate) + GET (voices)
├── components/
│   ├── TTSForm.tsx       # Main form with all controls
│   ├── VoiceSelector.tsx # Searchable voice dropdown
│   └── AudioPlayer.tsx   # Playback + download
├── lib/
│   └── edge-tts.ts       # All Edge TTS logic
└── types/
    └── tts.ts            # Shared TypeScript types
```

---

## API

### `POST /api/tts`

Generate speech from text.

**Request body:**
```json
{
  "text": "Hello, world!",
  "voice": "en-US-AriaNeural",
  "rate": "+0%",
  "pitch": "+0Hz",
  "volume": "+0%"
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "/audio/tts-1234567890-abc123.mp3"
}
```

### `GET /api/tts`

Returns all available voices.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Prosody Format

| Control | Format     | Example        |
|---------|------------|----------------|
| Rate    | `+/-N%`    | `-20%`, `+50%` |
| Pitch   | `+/-NHz`   | `-10Hz`, `+5Hz`|
| Volume  | `+/-N%`    | `+100%`, `-10%`|
