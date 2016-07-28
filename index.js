// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var S3Adapter = require('parse-server-s3-adapter');
var ParseCloud = reqiure('parse-cloud-express');
var Parse = ParseCloud.Parse;
require('./cloud/main.js'); // After this, ParseCloud.app will be configured in Express app
var kue = require('kue'); // Node package for queueing jobs

// I'm bad a javascript so lol here I go
function GetEnvironmentVar(varname, defaultvalue) {
    var result = process.env[varname];
    if(result!=undefined)
        return result;
    else
        return defaultvalue;
}

var s3Adapter = new S3Adapter(
        GetEnvironmentVar("S3_ACCESS_KEY", "DEFAULT_ACCESS"),
        GetEnvironmentVar("S3_SECRET_KEY", "DEFUALT_SECRET"),
        GetEnvironmentVar("S3_BUCKET", "DEFAULT_BUCKET"), {
            region: 'us-west-1',
            bucketPrefix: '',
            directAccess: true
            }
        );


var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var pushConfig = {}

if (process.env.GCM_SENDER_ID && process.env.GCM_API_KEY) {
    pushConfig['android'] = { senderId: process.env.GCM_SENDER_ID || '', // Sender ID of GCM
                              apiKey: process.env.GCM_API_KEY || '' // Server API key of GCM
                            };
}

if (process.env.APNS_ENABLE) {
    pushConfig['ios'] = [
      {
        // reference https://github.com/codepath/parse-server-example/blob/master/index.js#L15-L26
        // and https://github.com/ParsePlatform/Parse-Server/wiki/Push
        pfx: '', // The filename of private key and certificate in PFX or PKCS12 format from disk
        passphrase: '', // optional password to your p12
        cert: '', // If not using the .p12 format, the path to the certificate PEM to load from disk
        key: '', // If not using the .p12 format, the path to the private key PEM to load from disk
        bundleId: '', // The bundle identifier associate with your app
        production: false // Specifies which environment to connect to: Production (if true) or Sandbox
      }
    ]
}


var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
  push: pushConfig,
  filesAdapter: s3Adapter,
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// TODO: Delete this function after done testing
Parse.Cloud.define('hello', function(req, res) {
    res.success('Hello from Clode Code on Node.');
});

// Mount the Cloud Code routes on the main Express app at /webhooks/
app.use('/webhooks', ParseCloud.app);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website. Full of food.');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
