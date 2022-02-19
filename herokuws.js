const WebSocket = require("ws");

let herokuws = new WebSocket("wss://lilchirp-voximplant-asr.herokuapp.com:20340");

herokuws.onopen = function () { 
    herokuws.send("hello");
};

