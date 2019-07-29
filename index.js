var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var bodyParser = require('body-parser');
var ParseDashboard = require('parse-dashboard');

// SETTING UP PARSE-SERVER
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
var serverUrl = 'http://localhost:1337/parse'
var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/fuel',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'fuel',
  clientKey: process.env.JAVASCRIPT_KEY || 'jsclient',
  masterKey: process.env.MASTER_KEY || 'glenn', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || serverUrl,  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
});

// SETTING UP PARSE-DASHBOARD
var dashboard = new ParseDashboard({
  "apps": [{
      "serverURL": "http://localhost:1337/parse",
      "appId": "fuel",
      "masterKey": "glenn",
      "appName": "Fuel Management Database"
  }],
  "users": [
    {
      "user":"master",
      "pass":"fuel"
    }
  ],
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

// Declaring main app
var app = express();

// app settings
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// routes import
const indexR = require('./routes/index.js')
const serviceR = require('./routes/service')
const customerR = require('./routes/customer')

// setting URLS files

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, '/public')));
app.use('/dashboard', dashboard)
app.use('/', indexR)
app.use('/service', serviceR)
app.use('/customer', customerR)

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
  console.log('parse-server-example running at http://localhost:1337.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
