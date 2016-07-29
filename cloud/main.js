
var kue = require('kue');
// create our job queue
var jobs = kue.createQueue({ redis: process.env.REDIS_URL });



Parse.Cloud.define('alertAllWithPushOn', function(request, response) {
    var query = new Parse.Query(Parse.User); // Query for all users
    // For each user in database
    query.each(function(user) {
        var hasPushOn = user.get('push');
        console.log("Getting Push stuff");
        // Only execute if user has push setting on
        if (hasPushOn === true) {
            console.log(user.get("name") + " has push enabled");
            var hasExpired = [];
            var willExpire = [];
            // Current Date
            var now = new Date();
            // Create Date limit
            var offset = user.get('warning_offset');
            var expireDate = new Date(now);
            expireDate.setDate(expireDate.getDate() + offset);
            var foodQueryHasExpired = new Parse.Query("Food");
            foodQueryHasExpired.equalTo("owner", user);
            foodQueryHasExpired.lessThan("expiration_date", now);

            var foodQueryWillExpire = new Parse.Query("Food");
            foodQueryWillExpire.equalTo("owner", user);
            foodQueryWillExpire.greaterThan("expiration_date", now);
            foodQueryWillExpire.lessThan("expiration_date", expireDate);

            foodQueryHasExpired.find({
                success: function(results) {
                             console.log("" + results.length);
                             for (var i = 0; i < results.length; i++) {
                                 var object = results[i].get("product_name");
                                 console.log(object);
                                 hasExpired.push(object);
                                 console.log("HasExpired Length: " + hasExpired.length);
                             }
                         },
                error: function(error) {
                           // Do nothing
                       }
            });

            foodQueryWillExpire.find({
                success: function(results) {
                             console.log("" + results.length);
                             for (var i = 0; i < results.length; i++) {
                                 var object = results[i].get("product_name");
                                 console.log(object);
                                 willExpire.push(object);
                             }
                         },
                error: function(error) {
                           // Do nothing
                       }
            });
            var message = "";
            if (hasExpired.length > 0) {
                console.log("Adding hasExpired");
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
            console.log("Message: " +  message);
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
    });
    response.success("success");
});



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
