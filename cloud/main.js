
var kue = require('kue');
// create our job queue
var jobs = kue.createQueue({ redis: process.env.REDIS_URL });

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
