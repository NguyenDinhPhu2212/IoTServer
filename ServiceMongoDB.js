const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://127.0.0.1:27017/";
const dbName = "smart_home";

const mq135Collection = "mq135";
const dht11Collection = "dht11";
const lightSensorCollection = "lightSensor";
const getCurrentData = async (dbo, collectionName) => {
    try {
        const response = await dbo
            .collection(collectionName)
            .findOne({ id: -1 }, { sort: { _id: -1 } });
        delete response["_id"];
        return { value: response };
    } catch (error) {
        return { error: error.message };
    }
};
const getDataByQuery = async (
    dbo,
    collectionName,
    idRoom,
    fromDate,
    toDate
) => {
    try {
        const query = {
            date: { $gte: Date.parse(fromDate), $lte: Date.parse(toDate) },
        };
        const response = await dbo
            .collection(collectionName)
            .find(query)
            .toArray();
        const result = {
            success: true,
            id_room: idRoom,
            "from-date": fromDate,
            "to-date": toDate,
            data: [...response],
        };

        return { value: result };
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }
};
exports.getEnvironment = function getEnvironment(
    response,
    idRoom,
    fromDate = null,
    toDate = null
) {
    if (fromDate == null || toDate == null) {
        let failMes = {
            success: false,
            id_room: idRoom,
        };
        MongoClient.connect(url, async function (err, db) {
            if (err) {
                response.send(failMes);
                return;
            }

            const dbo = db.db(dbName);
            // get Data of mq135
            const { error: mq135Error, value: mq135Data } =
                await getCurrentData(dbo, mq135Collection);
            if (mq135Error) {
                response.send(failMes);
                db.close();
                return;
            }
            // get data of dht11
            const { error: dht11Error, value: dht11Data } =
                await getCurrentData(dbo, dht11Collection);
            if (dht11Error) {
                response.send(failMes);
                db.close();
                return;
            }
            // get data of light sensor
            const { error: lightSensorError, value: lightSensorData } =
                await getCurrentData(dbo, lightSensorCollection);
            if (lightSensorError) {
                response.send(failMes);
                db.close();
                return;
            }
            response.send({
                success: true,
                mq135: { ...mq135Data },
                dht11: { ...dht11Data },
                lightSensor: { ...lightSensorData },
            });
            db.close();
        });
    } else {
        let fail = `{
            "success": false,
            "id_room": ${idRoom},
            "from-date": "${fromDate}",
            "to-date": "${toDate}"
        }`;

        var failMes = fail;
        try {
            failMes = JSON.parse(fail);
        } catch {}

        MongoClient.connect(url, async function (err, db) {
            if (err) return;
            var dbo = db.db(dbName);
            // get Data of mq135
            const { error: mq135Error, value: mq135Data } =
                await getDataByQuery(
                    dbo,
                    mq135Collection,
                    idRoom,
                    fromDate,
                    toDate
                );
            if (mq135Error) {
                response.send(failMes);
                db.close();
                return;
            }
            // get data of dht11
            const { error: dht11Error, value: dht11Data } =
                await getDataByQuery(
                    dbo,
                    dht11Collection,
                    idRoom,
                    fromDate,
                    toDate
                );
            if (dht11Error) {
                response.send(failMes);
                db.close();
                return;
            }
            // get data of light sensor
            const { error: lightSensorError, value: lightSensorData } =
                await getDataByQuery(
                    dbo,
                    lightSensorCollection,
                    idRoom,
                    fromDate,
                    toDate
                );
            if (lightSensorError) {
                response.send(failMes);
                db.close();
                return;
            }
            response.send({
                success: true,
                mq135: { ...mq135Data },
                dht11: { ...dht11Data },
                lightSensor: { ...lightSensorData },
            });
            db.close();
        });
    }
};

exports.addRecord = function addRecord(collectionName, dataJson) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbName);

        var record = { ...dataJson, date: Date.now() };

        dbo.collection(collectionName).insertOne(record, function (err, res) {
            if (err) throw err;
            //console.log("1 document inserted");
            db.close();
        });
    });
};

exports.updateRecord = function updateRecord(collectionName, id, jsonValue) {
    MongoClient.connect(url, async function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbName);
        var query = { id: id };
        var newValue = { $set: jsonValue };
        const response = await dbo.collection(collectionName).findOne(query);
        if (response)
            dbo.collection(collectionName).updateOne(
                query,
                newValue,
                function (err, res) {
                    if (err) throw err;

                    db.close();
                }
            );
        else
            dbo.collection(collectionName).insertOne(
                jsonValue,
                function (err, res) {
                    if (err) throw err;
                    //console.log("1 document inserted");
                    db.close();
                }
            );
    });
};
