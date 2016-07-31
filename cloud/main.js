
var kue = require('kue');
// create our job queue
var jobs = kue.createQueue({ redis: process.env.REDIS_URL });

Parse.Cloud.define('alertAllWithPushOn', function(request, response) {
    // Query for all users
    var query = new Parse.Query(Parse.User);
    // Only want users with push enabled
    query.equalTo("push", true);
    // Setup Arrays to hold information
    var hasExpired = [];
    var willExpire = [];
    // For each user in database
    query.each(function(user) {
        console.log(user.get("name") + " has push enabled. ");
        // We want to do two promises in parallel
        var promises = [];
        var promiseHas = Parse.Promise.as();
        promiseHas = promiseHas.then(function() {
            // return a promise that will be resolved
            console.log("Has promise execute");
            var now = new Date();
            var hasExpiredQuery = new Parse.Query("Food");
            hasExpiredQuery.equalTo("owner", user);
            hasExpiredQuery.lessThan("expiration_date", now);
            return hasExpiredQuery.find();
        }).then(function(foods) {
            _.each(foods, function(food) {
                var object = food.get("product_name");
                console.log("Added product to hasExpired");
                hasExpired.push(object);
            });
            var now = new Date();
            var offset = user.get("warning_offset");
            var expireDate = new Date(now);
            expireDate.setDate(expireDate.getDate() + offset);
            var willExpireQuery = new Parse.Query("Food");
            willExpireQuery.equalTo("owner", user);
            willExpireQuery.greaterThan("expiration_date", now);
            willExpireQuery.lessThan("expiration_date", expireDate);
            return willExpireQuery.find();
        }).then(function(foods) {
            console.log("Will promise execute");
            _.each(foods, function(food) {
                var object = food.get("product_name");
                console.log("added product to willExpire");
                willExpire.push(object);
            });
            var promiseToPush = Parse.Promise.as();
            promiseToPush = promiseToPush.then(function() {
                console.log("Got to promise to push body");
            })
            return promiseToPush;
        }).then(function() {
            console.log("promises fulfilled");
        });
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
