const express = require("express");

const WebSocket = require("ws");
const WaveFile = require("wavefile").WaveFile;

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

let assembly = new WebSocket(
  "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000",
  { headers: { authorization: '0a74bbbe22744194815c4520ad4aaa6d' } }
);

let chunks = [];
const PORT = process.env.PORT || 3000;

wss.on("connection", (ws) => {
  console.info("New Connection Initiated");

  ws.on("close", () => {
    console.log("Connection Closed")
    assembly.send(JSON.stringify({ terminate_session: true }));
  });

  ws.on("message", (message) => {
    if (!assembly)
      return console.error("AssemblyAI's WebSocket must be initialized.");

    const msg = JSON.parse(message);

    assembly.onmessage = (assemblyMsg) => {
      const res = JSON.parse(assemblyMsg.data);
      console.log(`${res.text} ( confidence: ${res.confidence}) message type: ${res.message_type}`);
      // if(res.message_type === "FinalTranscript") {
        console.log("sending..", res.text, "at", new Date().toISOString());
        ws.send(res.text);
      // }
    };

    switch (msg.event) {
      case "connected":
        console.info("A new call has started.");
        assembly.onerror = console.error;
        const texts = {};
        break;

      case "start":
        console.info("Starting media stream at...", new Date().toISOString());
        break;

      case "media":       
        const twilioData = msg.media.payload;

        // Here are the current options explored using the WaveFile lib:

        // We build the wav file from scratch since it comes in as raw data
        let wav = new WaveFile();

        // Twilio uses MuLaw so we have to encode for that
        wav.fromScratch(1, 8000, "8m", Buffer.from(twilioData, "base64"));

        // This library has a handy method to decode MuLaw straight to 16-bit PCM
        wav.fromMuLaw();

        // Here we get the raw audio data in base64
        const twilio64Encoded = wav.toDataURI().split("base64,")[1];

        // Create our audio buffer
        const twilioAudioBuffer = Buffer.from(twilio64Encoded, "base64");

        // We send data starting at byte 44 to remove wav headers so our model sees only audio data
        chunks.push(twilioAudioBuffer.slice(44));

        // We have to chunk data b/c twilio sends audio durations of ~20ms and AAI needs a min of 100ms
        if (chunks.length >= 5) {
          // Here we want to concat our buffer to create one single buffer
          const audioBuffer = Buffer.concat(chunks);

          // Re-encode to base64
          const encodedAudio = audioBuffer.toString("base64");

          // Finally send to assembly and clear chunks
          assembly.send(JSON.stringify({ audio_data: encodedAudio }));
          chunks = [];
        }

        break;

      case "stop":
        console.info("Audio stream has ended");
        break;
    }
  });
});

app.get("/", (_, res) => res.send("Twilio Live Stream App"));

app.post("/", async (req, res) => {
  assembly = new WebSocket(
    "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000",
    { headers: { authorization: '0a74bbbe22744194815c4520ad4aaa6d' } }
  );

  res.set("Content-Type", "text/xml");
  res.send(
    `<Response>
       <Start>
         <Stream url='wss://${req.headers.host}' />
       </Start>
       <Say>
         Start speaking to see your audio transcribed in the console
       </Say>
       <Pause length='60' />
     </Response>`
  );
});

console.log("Listening on Port " + PORT);
server.listen(PORT);