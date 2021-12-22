const mqtt = require("mqtt");
const dbService = require("./ServiceMongoDB.js");

function dateToString(date) {
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();

    month = month < 10 ? `0${month}` : month;
    day = day < 10 ? `0${day}` : day;
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    seconds = seconds < 10 ? `0${seconds}` : seconds;

    return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

class DHT11 {
    constructor(id) {
        this.id = id;
        this.avgTemperature = 0;
        this.avgHumidity = 0;
        this.avgPpm = 0;
        this.numberOfRecords = 0;
    }

    calculateAvg(beforeAvg, numRecords, newValue) {
        return (beforeAvg * numRecords + newValue) / (numRecords + 1);
    }

    update(temperature, humidity, ppm) {
        this.currentTemperature = temperature;
        this.currentHumidity = humidity;
        this.currentPpm = ppm;
        this.avgTemperature = this.calculateAvg(
            this.avgTemperature,
            this.numberOfRecords,
            temperature
        );
        this.avgHumidity = this.calculateAvg(
            this.avgHumidity,
            this.numberOfRecords,
            humidity
        );
        this.avgPpm = this.calculateAvg(this.avgPpm, this.numberOfRecords, ppm);
        this.numberOfRecords++;
        //console.log(this.numberOfRecords);
    }

    toJSON() {
        return {
            id: this.id,
            type: "DHT11Sensor",
            humidity: this.avgHumidity,
            temperature: this.avgTemperature,
            ppm: this.avgPpm,
        };
    }

    toJSONCurrent() {
        return {
            id: -1,
            type: "DHT11Sensor",
            humidity: this.currentHumidity,
            temperature: this.currentTemperature,
            ppm: this.currentPpm,
            date: dateToString(new Date()),
        };
    }
}

const dht11Topic = "/ESP8266/DHT11/1";
const mq135Topic = "/ESP8266/MQ135/2";
const lightSensorTopic = "/ESP8266/LightSensor/3";
const mq135Collection = "mq135";
const fifteenMin = 1000 * 60 * 15;

let dht11 = new DHT11(2);

const client = mqtt.connect("mqtt://localhost:1883", {
    username: "phu",
    password: "phu",
});

client.on("connect", (ack) => {
    console.log("connected!");

    client.subscribe(dht11Topic, (err) => {});

    client.subscribe(mq135Topic, (err) => {});

    client.subscribe(lightSensorTopic, (err) => {});

    client.subscribe("ESP8266/connection/board", (err) => {});

    client.on("message", (topic, message) => {
        // console.log("============== Data From " + topic +" ===============")
        // console.log(message.toString());
        // console.log("===============================================================")
        // console.log()
        // console.log()
        var json = undefined;
        try {
            json = JSON.parse(message.toString());
        } catch {
            console.log("Error");
            return;
        }

        if (json != undefined && !json.success) {
            console.log("Failed!");
            return;
        }
        console.log(topic);
        if (topic == dht11Topic) {
            dht11.update(json["temperature"], json["humidity"], json["ppm"]);
            dbService.updateRecord(mq135Collection, -1, dht11.toJSONCurrent());
            if (mq135.numberOfRecords >= 300) {
                dbService.addRecord(mq135Collection, dht11.toJSON());
                mq135.numberOfRecords = 0;
            }
        } else if (topic == lightSensorTopic) {
            
        }else if(topic == mq135Topic){
            
        }
    });
});

client.on("error", (err) => {
    console.log(err);
});

exports.publish = function publish(topic, id, content) {
    let fixTopic = topic.replace(/{id_device}/g, id);
    console.log(fixTopic);
    client.publish(fixTopic, content);
};
