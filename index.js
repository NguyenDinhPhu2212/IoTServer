const express = require("express");
const app = express();
app.use(express.json());

var aedes = require("aedes")();

var serverMQTT = require("net").createServer(aedes.handle);
var portMQTT = 1883;

const dbService = require("./ServiceMongoDB.js");
const mqtt = require("./ServiceMQTTBroker");

const BASE_URL = "http://localhost:3000";
// const automaticPublish = "/ESP8266/{id_device}/changeAutomatic"
// const statusPublish = "/ESP8266/{id_device}/changeStatus"

app.get("/api/:id_room/get-environment", (req, res) => {
    let url = new URL(BASE_URL + req.url);
    dbService.getEnvironment(
        res,
        parseInt(req.params.id_room),
        url.searchParams.get("from-date"),
        url.searchParams.get("to-date")
    );
});

// app.get("/api/:id_device/get-status", (req, res) => {
//   dbService.getDeviceStatusAndSend(res, parseInt(req.params.id_device))
// });

// app.post("/api/update/automatic", (req, res) => {
//   console.log("Update automatic " + req.body.automatic);
//   let automatic = req.body.automatic;
//   let id_device = req.body.id_device;

//   if (automatic != undefined && id_device != undefined) {
//     automatic ? mqtt.publish(automaticPublish, id_device, "true") : mqtt.publish(automaticPublish, id_device, "false");
//     res.send({ success: true });
//   } else {
//     res.send({ success: false });
//   }
// });

// app.post("/api/update/update-status-on", (req, res) => {
//   console.log("Update status on " + req.body["is-on-current"]);
//   let isOn = req.body["is-on-current"];
//   let id_device = req.body.id_device;

//   if (isOn != undefined && id_device != undefined) {
//     isOn ? mqtt.publish(statusPublish, id_device, "true") : mqtt.publish(statusPublish, id_device, "false");
//     res.send({ success: true });
//   } else {
//     res.send({ success: false });
//   }
// });

app.listen(3000, () => console.log(`Listening on port 3000....`));
serverMQTT.listen(portMQTT, function () {
    console.log("Server MQTT listening on port", portMQTT);
});
