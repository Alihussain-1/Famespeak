const { EdgeTTS } = require('@andresaya/edge-tts');

async function test() {
  const tts = new EdgeTTS();
  try {
    console.log("Synthesizing...");
    await tts.synthesize("Hello world", "en-US-AriaNeural", {
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%"
    });
    console.log("Synthesize finished. Generating file...");
    await tts.toFile("test-audio3.mp3");
    console.log("Success!");
  } catch (err) {
    console.error("Error caught:");
    console.error(err);
  }
}

test();
