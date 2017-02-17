var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var PORT = process.env.PORT || 8080;

var moment = require('moment');
var ko = require('knockout');
var request = require("request");
var asyncForEach = require('async-foreach').forEach;
var cheerio = require('cheerio');
var fs = require('fs');
var jsonfile = require('jsonfile');
var _ = require('underscore');

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.set('view engine', 'ejs');
var itemSearch = "★ Karambit | Marble Fade (Factory New)";
var knifeMinPrice = 360;
var ifERROR = false;
var refreshTime = 12000;
var knifes = [];
var startTime = 6;

io.on('connection', function (socket) {
    socket.send("connect");
    socket.on('disconnect', function () {
    });
});

var refresh = setInterval(function () {
    if (((moment().seconds() < 10 ? '0' : '') + moment().seconds()).substring(1) == startTime) {
        refreshFunction()
        clearInterval(refresh);
    }
}, 100);

function refreshFunction() {
    asyncForEach([1], function () {
        getOneItemPrice(itemSearch);
        var done = this.async();
        setTimeout(done, refreshTime);
    }, function done() {
        if (ifERROR) {
            refreshFunction();
        }
        else {
            refreshFunction();
        }
    });
};

function getOneItemPrice(name) {
    request({
        url: "http://steamcommunity.com/market/listings/730/" + encodeURIComponent(name) + "/render?start=0&count=2&currency=3&language=english&format=json",
        json: true
    }, function (error, response, body) {
        io.emit('alert', "ok: " + startTime);
        console.log('ok');
        if (!error && response.statusCode === 200 && !_.isEmpty(body.listinginfo)) {
            var keys = Object.keys(body.listinginfo);
            if (!isNaN(body.listinginfo[keys[0]].converted_price_per_unit)) {
                var param = {
                    listingid: body.listinginfo[keys[0]].listingid,
                    subtotal: body.listinginfo[keys[0]].converted_price_per_unit,
                    fee: body.listinginfo[keys[0]].converted_fee_per_unit,
                    total: parseInt(body.listinginfo[keys[0]].converted_price_per_unit) + parseInt(body.listinginfo[keys[0]].converted_fee_per_unit)
                }
                if (param.total * 0.01 <= 360) {
                    saveStatus(param);
                    saveJson(name, param, true);
                }
                else {
                    saveJson(name, param, false);
                }
            }
        }
        if(response.statusCode !== 200){
            console.log(response.statusCode);
        }
        if (error) {
            io.emit('alert', "error: " + startTime);
            console.log(error);
        }
    });
}

function saveJson(name, param, tobuy) {
  request({ url: 'https://api.myjson.com/bins/9elit', method: 'PUT', json: { item: name, time: moment().format('MMMM Do YYYY, h:mm:ss a'), price: param.subtotal * 0.01 + 'e', tobuy: tobuy, param: param } }, function () { })
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

function saveStatus(param) {
    console.log(param);
    io.emit('buyItem', param);
}

http.listen(PORT, function () {
    console.log('listen', PORT);
})
