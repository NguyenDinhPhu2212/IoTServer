const mqtt = require("mqtt");
const dbService = require("./ServiceMongoDB.js");

class Sensor {
    constructor(id) {
        this.id = id;
    }
    calculateAvg(beforeAvg, numRecords, newValue) {
        return (beforeAvg * numRecords + newValue) / (numRecords + 1);
    }
}
class DHT11 extends Sensor {
    constructor(id) {
        super(id);
        this.avgTemperature = 0;
        this.avgHumidity = 0;
        this.numberOfRecords = 0;
    }
    update(temperature, humidity) {
        this.currentTemperature = temperature;
        this.currentHumidity = humidity;
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
        this.numberOfRecords++;
        //console.log(this.numberOfRecords);
    }

    toJSON() {
        return {
            id: this.id,
            type: "DHT11Sensor",
            humidity: this.avgHumidity,
            temperature: this.avgTemperature,
        };
    }

    toJSONCurrent() {
        return {
            id: -1,
            type: "DHT11Sensor",
            humidity: this.currentHumidity,
            temperature: this.currentTemperature,
            date: Date.now(),
        };
    }
}
class LightSensor extends Sensor {
    constructor(id) {
        super(id);
        this.avgLight = 0;
        this.numberOfRecords = 0;
    }
    update(Light) {
        this.currentLight = Light;
        this.avgLight = this.calculateAvg(
            this.avgLight,
            this.numberOfRecords,
            Light
        );
        this.numberOfRecords++;
        //console.log(this.numberOfRecords);
    }

    toJSON() {
        return {
            id: this.id,
            type: "LightSensor",
            AQI: this.avgLight,
        };
    }

    toJSONCurrent() {
        return {
            id: -1,
            type: "LightSensor",
            AQI: this.avgLight,
            date: Date.now(),
        };
    }
}
class MQ135 extends Sensor {
    constructor(id) {
        super(id);
        this.avgAQI = 0;
        this.numberOfRecords = 0;
    }

    calculateAvg(beforeAvg, numRecords, newValue) {
        return (beforeAvg * numRecords + newValue) / (numRecords + 1);
    }

    update(AQI) {
        this.currentAQI = AQI;
        this.avgAQI = this.calculateAvg(this.avgAQI, this.numberOfRecords, AQI);
        this.numberOfRecords++;
        //console.log(this.numberOfRecords);
    }

    toJSON() {
        return {
            id: this.id,
            type: "MQ135Sensor",
            AQI: this.avgAQI,
        };
    }

    toJSONCurrent() {
        return {
            id: -1,
            type: "MQ135Sensor",
            AQI: this.avgAQI,
            date: Date.now(),
        };
    }
}
const saveData = (collectionName, sensor) => {
    if (sensor.numberOfRecords >= 300) {
        dbService.addRecord(collectionName, sensor.toJSON());
        sensor.numberOfRecords = 0;
    } else dbService.updateRecord(collectionName, -1, sensor.toJSONCurrent());
};
const dht11Topic = "/ESP8266/DHT11/1";
const mq135Topic = "/ESP8266/MQ135/2";
const lightSensorTopic = "/ESP8266/LightSensor/3";
const mq135Collection = "mq135";
const dht11Collection = "dht11";
const lightSensorCollection = "lightSensor";

let dht11 = new DHT11(2);
let lightSensor = new LightSensor(2);
let mq135 = new MQ135(2);

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
        if (topic == dht11Topic) {
            dht11.update(json["temperature"], json["humidity"]);
            saveData(dht11Collection, dht11);
        } else if (topic == lightSensorTopic) {
            lightSensor.update(json.light);
            saveData(lightSensorCollection, lightSensor);
        } else if (topic == mq135Topic) {
            mq135.update(json.AQI);
            saveData(mq135Collection, mq135);
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
