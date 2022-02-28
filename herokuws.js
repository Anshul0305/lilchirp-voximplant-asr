const WebSocket = require("ws");

// let ws = new WebSocket("wss://lilchirp-voximplant-asr.herokuapp.com:43951");
let ws = new WebSocket("wss://3xb6hkgjsj.execute-api.us-east-1.amazonaws.com/production");

ws.on('open', function open() {
    console.log("connected");
    // ws.send({"action": "connect", "sendMessage": "Hello World"});
  });
  
  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });



