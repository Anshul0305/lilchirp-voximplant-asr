const app = require('express')();
const http = require('http').createServer(app);
const WebSocket = require('ws');
const fs = require('fs');

const wss = new WebSocket.Server({
    server: http
});

function toArrayBuffer(buf) {
    const ab = new ArrayBuffer(buf.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

// import the Deepgram client library
const { Deepgram } = require('@deepgram/sdk');

/** Your Deepgram API Key*/
const deepgramApiKey = '8ee4f81999ffcb7f3b47ea8a2eadf8f6cafda483';

// set the parameters
const config = {
    encoding: 'MULAW',
    sampleRateHertz: 8000,
    languageCode: 'en-US',
};

const request = {
    config,
    interimResults: true,
};

let audioInput = [];
let recognizeStream = null;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

app.get('/', function(req, res) {
    res.send('<h1>Hello world</h1>');
});

wss.on('connection', (ws) => {
    // create a client
    const deepgram = new Deepgram(deepgramApiKey);
    /** Create a websocket connection to Deepgram */
    const deepgramSocket = deepgram.transcription.live({ punctuate: true });
    // create a writable stream
    var wstream = fs.createWriteStream('myAudioFile.mp3');
    // clear the current audioInput
    audioInput = [];
    // initiate stream recognizing
    /** Listen for the connection to open and begin sending */
    deepgramSocket.addListener('open', () => {
        console.log("Deepgram Connection opened!");

        // const fs = require('fs');
        // const contents = fs.readFileSync('demo2.wav');
      
        /** Send the audio to the Deepgram API in chunks of 1000 bytes */
        // const chunk_size = 1000;
        // for (i = 0; i < contents.length; i+= chunk_size) {
        //   const slice = contents.slice(i, i + chunk_size);
        //   console.log("Sending chunk: " + slice);
        //   deepgramSocket.send(slice);
        // }
        
       
    
        ws.on('close', (message) => {
            ws.send("Socket Connection closed!");
            console.log('Closing connection');
            deepgramSocket.finish()
        })
        // connection is up, let's add a simple event
        ws.on('message', (message) => {
            try {
                let data = JSON.parse(message)
                console.log("data", JSON.stringify(data))
                console.log("message", message)

                if (data.event == "media") {
                    let b64data = data.media.payload;
                    let buff = new Buffer.from(b64data, 'base64');
                    // recognizeStream.write(buff);
                    wstream.write(buff);
                    // console.log("JSON", JSON.stringify(data))
                    // console.log("message", message)
                    // console.log("buff", buff)
                    // console.log("b64data", b64data)
                    // var mp3Blob = new Blob(buff, {type: 'audio/mp3'});
                    // var abuf = toArrayBuffer(buff);
                    // console.log("abuf", abuf)
                    // const context = new AudioContext();
                    // const audioBuf =  context.decodeAudioData(abuf)
                    // const chunk =  base64decode(b64data)
                    // console.log("buff",buff)
                    // deepgramSocket.send(buff);
                }
            } catch (err) {
                console.log("error: " + err);
                // console.log(message)
            }
        });
        deepgramSocket.finish()
    });
     
     

    deepgramSocket.addListener('close', () => {
        deepgramSocket.finish()
        console.log('Deepgram Connection closed.');
    })

    deepgramSocket.addListener("transcriptReceived", (transcription) => {
        console.log("Deepgram: " + transcription);
        ws.send(transcription.data);
    });

    // send a notification  
    ws.send('Hello New Client');
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});