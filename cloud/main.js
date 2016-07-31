
// Define _
var _ = require("underscore");
// Define kue
var kue = require('kue-scheduler');
// create our job queue
var jobs = kue.createQueue({ redis: process.env.REDISCLOUD_URL });

// Scheduled using kue-scheduler
var job = jobs.createJob("foodAlert", {})
              .attempts(3)
              .backoff( {delay: 60*1000, type:"fixed"})
              .priority("high")
              .unique("foodAlert");

jobs.every("1 minute", job);

Parse.Cloud.define('alertPush', function(request, response) {
    // Query for all users
    var query = new Parse.Query(Parse.User);
    // Only want users with push enabled
    query.equalTo("push", true);
    var promises = [];
    // For each user in database
    query.each(function(user) {
        console.log(user.get("name") + " has push enabled. ");

        // Setup Arrays to hold information
        var hasExpired = [];
        var willExpire = [];

        // Define the dates here
        var now = new Date();
        var offset = user.get("warning_offset");
        var expireDate = new Date(now);
        expireDate.setDate(expireDate.getDate() + offset);
        // Define the Queries here
        var hasExpiredQuery = new Parse.Query("Food");
        hasExpiredQuery.equalTo("owner", user);
        hasExpiredQuery.lessThan("expiration_date", now);

        var willExpireQuery = new Parse.Query("Food");
        willExpireQuery.equalTo("owner", user);
        willExpireQuery.greaterThan("expiration_date", now);
        willExpireQuery.lessThan("expiration_date", expireDate);

        // Execute queries as promises
        promises.push(hasExpiredQuery.find().then(function(foods) {
                _.each(foods, function(food) {
                    var object = food.get("product_name");
                    hasExpired.push(object);
                });
                return willExpireQuery.find();
            }, function(error) {
                console.log("Error at Has Expired Promise: " + error.message);
            }).then(function(foods) {
                _.each(foods, function(food) {
                    var object = food.get("product_name");
                    willExpire.push(object);
                });
                return Parse.Promise.as();
            }, function(error) {
                console.log("Error at Will Expire Promise: " + error.message);
            }).then(function() {
                var message = formatPush(hasExpired, willExpire);
                sendPush(user, message);
            })
        );
        return Parse.Promise.when(promises);
    }).then(function() {
        response.success("success");
    });
});

jobs.process("foodAlert", function(job, done) {
    console.log("Triggered foodAlert");
    Parse.Cloud.run("alertPush", {}).then(function(result) {
        console.log(result);
    }, function(error) {
        console.log("ERROR AT SCHEDULED JOB: " + error.message);
    });
    done();
})


function sendPush(user, message) {
    if (message !== "") {
        console.log("BEGIN SENDING PUSH");
        var pushQuery = new Parse.Query(Parse.Installation);
        pushQuery.equalTo("deviceType", "android");
        pushQuery.equalTo("user", user);
        Parse.Push.send({
            where: pushQuery,
            data: {
                alert: message
            }
        }, { success: function() {
              console.log("PUSH OK");
        }, error: function(error) {
              console.log("PUSH ERROR: " + error.message);
        }, useMasterKey: true});
    }
}

function formatPush(hasExpired, willExpire) {
    var message = "";
    if (hasExpired.length > 0) {
        message = message + "Expired: ";
        for (var i = 0; i < hasExpired.length - 1; i++) {
            message = message + hasExpired[i] + ", ";
        }
        if (hasExpired.length > 1) {
          message = message + "and ";
        }
        message = message + hasExpired[hasExpired.length - 1] + ". ";
    }
    if (willExpire.length > 0) {
        message = message + "Expiring Soon: ";
        for (var i = 0; i < willExpire.length - 1; i++) {
            message = message + willExpire[i] + ", ";
        }
        if (willExpire.length > 1) {
            message = message + "and ";
        }
        message = message + willExpire[willExpire.length - 1] + ". ";
    }
    return message;
}


// Push with promises
Parse.Cloud.define('androidPushTest', function(request, response) {
    // request has 2 parameters: params passed by the client and the authorized user
    var params = request.params;
    var user = request.user;

    // Our "Message" class has a "text" key with the body of the message itself
    var messageText = params.text;

    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo("deviceType", "android");

    Parse.Push.send({
        where: pushQuery,
        data: {
            alert: "Message: " + messageText
        }
    }, { success: function() {
        console.log("PUSH OK");
    }, error: function(error) {
        console.log("PUSH ERROR: " + error.message);
    }, useMasterKey: true});

    response.success('success');
});

Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});
