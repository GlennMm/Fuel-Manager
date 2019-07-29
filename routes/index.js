var express = require('express');
var router = express.Router();
const Parse = require('parse/node');

Parse.initialize("fuel", null,"glenn");
Parse.serverURL = 'http://localhost:1337/parse'

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('welcome')
});

module.exports = router;