
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://127.0.0.1:27017/";
const dbName = "smart_home"; 

const mq135Collection = "mq135"; 
// const deviceCollection = "device"; 
// const roomCollection = "room";

// function stringToDate(dateString) {
//     let regex = /(\d{4}-\d{1,2}-\d{1,2}) (\d{1,2}:\d{1,2}:\d{1,2})/g
//     return new Date(dateString.replace(regex, '$1T$2Z'))
// }

// function dateToString(date) {
//     return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
// }


exports.getAirQualityAndSend = function getAirQualityAndSend(response, idRoom, fromDate = null, toDate = null) {
    
    if (fromDate == null || toDate == null) {
        let failMes = {
            success: false,
            id_room: idRoom,
            type: "MQ135",
        };
        MongoClient.connect(url, async function (err, db) {
            
            if (err) {
                response.send(failMes)
                return;
            }

            var dbo = db.db(dbName);
            dbo
            .collection(mq135Collection).find()
            .findOne( {id : -1} , { sort: { _id: -1 } }, function (err, result) {
                if (err || !result) {
                    response.send(failMes)
                    db.close();
                    return;
                }
                delete result["_id"];
                response.send({ success: true, ...result });

                db.close();
                return;
            });
        });
    } else {
        console.log("In here");
        let fail =`{
            "success": false,
            "id_room": ${idRoom},
            "type": "MQ135",
            "from-date": "${fromDate}",
            "to-date": "${toDate}"
        }`;

        var failMes = fail;
        try {
            failMes = JSON.parse(fail);
        } catch {}

        MongoClient.connect(url, function (err, db) {
            if (err) return;
            var dbo = db.db(dbName);
            var query = { date: { $gte: Date.parse(fromDate), $lte: Date.parse(toDate) } };
            dbo
            .collection(mq135Collection)
            .find(query)
            .toArray(function (err, results) {

                if (err) {
                    response.send(failMes);
                    db.close();
                    return;
                }
                let data = ""
               
                for (let i = 0; i < results.length; i++) {
                    
                    data += `{
                        "humidity": ${results[i]['humidity']},
                        "temperature": ${results[i]['temperature']},
                        "ppm": ${results[i]['ppm']}
                    },`;
                    // if ( i >= 10) break;
                }
               
            
                data = data.slice(0, -1);
                let rs =`{
                    "success": true,
                    "id_room": ${idRoom},
                    "from-date": "${fromDate}",
                    "to-date": "${toDate}",
                    "data": [${data}]
                }`;
        
                var rsJson = rs;
                try {
                    rsJson = JSON.parse(rs);
                } catch {}

                response.send(rsJson);

                db.close();

                return;
            });
        });
    }

}


// exports.getDeviceStatusAndSend = function getDeviceStatusAndSend(response, idDevice) {
//     MongoClient.connect(url, function (err, db) {
        
//         let failMes ={ success: false, id: idDevice };

//         if (err) {
//             response.send(failMes);
//             return;
//         }
//         var dbo = db.db(dbName);
//         dbo
//           .collection(deviceCollection)
//           .findOne(
//             { id: idDevice },
//             function (err, result) {
//                 if (err || !result) {
//                     response.send(failMes);
//                     db.close();
//                     return;
//                 }
//                 delete result["_id"];
//                 let rs = `{ 
//                     "success": true, 
//                     "id": ${idDevice},
// 	                "type": "${result["type"]}",
// 	                "is-on-current": ${result["is-on-current"]},
//                     "automatic": ${result["automatic"]}
//                 }`;

//                 let rsJson = rs;
//                 try {
//                     rsJson = JSON.parse(rs);
//                 } catch { console.log("Error"); }
//                 response.send(rsJson);
//                 db.close();
//                 return;
//             }
//           );
//       });
// }


exports.addRecord = function addRecord(collectionName, dataJson) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbName);
        
        var record = { ...dataJson, "date": new Date() };

        dbo.collection(collectionName).insertOne(record, function (err, res) {
          if (err) throw err;
          //console.log("1 document inserted");
          db.close();
        });
      });
}

exports.updateRecord = function updateRecord(collectionName, id, jsonValue) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbName);
        var query = { id: id };
        var newValue = { $set: jsonValue };
        if (collectionName == mq135Collection) {
            newValue = { $set: jsonValue };
        }
        dbo
          .collection(collectionName)
          .updateOne(query, newValue, function (err, res) {
            if (err) throw err;
            //console.log("1 document updated");
            db.close();
          });
      });
}