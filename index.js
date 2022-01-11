const express = require("express");
const app = express();
app.use(express.json());

var aedes = require("aedes")();

var serverMQTT = require("net").createServer(aedes.handle);
var portMQTT = 1883;

const dbService = require("./ServiceMongoDB.js");
const mqtt = require("./ServiceMQTTBroker");

const BASE_URL = "http://localhost:3000";

app.get("/api/:id_room/get-environment", (req, res) => {
    let url = new URL(BASE_URL + req.url);
    dbService.getEnvironment(
        res,
        parseInt(req.params.id_room),
        url.searchParams.get("from-date"),
        url.searchParams.get("to-date")
    );
});

app.listen(3000, () => console.log(`Listening on port 3000....`));
serverMQTT.listen(portMQTT, function () {
    console.log("Server MQTT listening on port", portMQTT);
});
