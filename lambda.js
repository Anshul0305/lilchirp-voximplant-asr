const WebSocket = require("ws");
const WaveFile = require("wavefile").WaveFile;

exports.handler = async (event) => {
    console.log("event", event)
    const route = event.requestContext.routeKey
    const connectionId = event.requestContext.connectionId
    let chunks = [];
    let assembly = new WebSocket(
        "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000",
        { headers: { authorization: '0a74bbbe22744194815c4520ad4aaa6d' } }
    );
    
    switch(route){
        case '$connect':{
            console.info("New Connection Initiated");
        } break;
        case '$disconnect': {
            console.log('client disconnected')
        } break;
        case 'sendMessage':{
            console.log('message recived', message)
            if (!assembly) return console.error("AssemblyAI's WebSocket must be initialized.");
            const msg = JSON.parse(message);
            assembly.onmessage = (assemblyMsg) => {
                const res = JSON.parse(assemblyMsg.data);
                if(res.message_type === "FinalTranscript") {
                    console.log("sending..", res.text, "at", new Date().toISOString());
                }
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
                  const data = msg.media.payload;
                  let wav = new WaveFile();
                  wav.fromScratch(1, 8000, "8m", Buffer.from(data, "base64"));
                  wav.fromMuLaw();
                  const base64Encoded = wav.toDataURI().split("base64,")[1];
                  const audioBuffer = Buffer.from(base64Encoded, "base64");
                  chunks.push(audioBuffer.slice(44));
                  if (chunks.length >= 5) {
                    const audioBuffer = Buffer.concat(chunks);
                    const encodedAudio = audioBuffer.toString("base64");
                    assembly.send(JSON.stringify({ audio_data: encodedAudio }));
                    chunks = [];
                  }
                  break;
          
                case "stop":
                  console.info("Call has ended");
                  assembly.send(JSON.stringify({ terminate_session: true }));
                  break;
            }

        } break;
        default:{
            console.log('unknown route hit', route)
        }
    }
    
    const response = {
        statusCode: 200
    };
    return response;
};