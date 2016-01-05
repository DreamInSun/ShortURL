console.info('/*========== Start ShortURL Service ==========*/');
/*========== Get Command Arguments ==========*/

/*========== Get Environment Configuration==========*/
var conf = {
    port : 17000,
    mongo_conn: process.env.MONGODB_CONN
}

console.info(JSON.stringify(conf));

/*========== Load Library ==========*/
var express = require('express');
var app = express();
var path = require('path');
var url = require('url');
var session = require('express-session');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var short = require('short');

/*========== Connect MongoDB ==========*/
console.info("Connect MongoDB : " + conf.mongo_conn);
short.connect(conf.mongo_conn);
short.connection
    .on('error', function (error) {
        throw new Error(error);
    })
    .on('success', function (info) {
        console.info("Connect MongoDB Success.");
    });

/*========== Start Application ==========*/
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'shortURL',
    key: 'short',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

/*========== Request Handlers ==========*/
app.get('/', function (req, res) {
    // promise to retrieve all shortened URLs
    listURLsPromise = short.list();

    // output all resulting shortened url db docs
    listURLsPromise.then(function (URLsDocument) {
        //console.log('>> listing (%d) Shortened URLS:', URLsDocument.length);
        //console.log(URLsDocument);
        res.render('index', {
            title: '主页',
            docs: URLsDocument,
            error: req.flash('error').toString()
        });
        //process.exit(0);
    }, function (error) {
        if (error) {
            throw new Error(error);
        }
    });
});

app.get('/add', function (req, res) {
    res.render('add', {
        title: '添加短地址',
        doc: null
    });
});

app.post('/add', function (req, res) {
    //添加
    var result = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/.test(req.body.URL);
    var result_2 = /^http/.test(req.body.URL) || /^https/.test(req.body.URL) || /^ftp/.test(req.body.URL);
    console.log('result---->' + result);
    if (result && result_2) {
        var url = req.body.URL;
    } else {
        return res.render('add', {
            title: '网址格式不正确',
            doc: {
                URL: req.body.URL,
                hash: ''
            }
        });
    }
    var shortURLPromise = short.generate({
        URL: url
    });

    shortURLPromise.then(function (mongodbDoc) {
        //console.log('>> created short URL:');
        //console.log(mongodbDoc);
        //console.log('>> retrieving short URL: %s', mongodbDoc.hash);
        short.retrieve(mongodbDoc.hash).then(function (result) {
            //console.log('>> retrieve result:');
            //console.log(result);
            res.render('add', {
                title: '添加成功',
                doc: result
            });
            //process.exit(0);
        }, function (error) {
            if (error) {
                throw new Error(error);
            }
        });
    }, function (error) {
        if (error) {
            throw new Error(error);
        }
    });

});

app.get('/*', function (req, res) {
    var condition = url.parse(req.url).search;
    if (!condition) {
        condition = '';
    }
    console.log('condition: ' + condition);
    var hash = req.url.slice(1, 7);
    //console.log("您本地输入的短地址---->" + hash);
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write("URL not found!");
        res.end();
    }
    else {
        var findAPromise = short.retrieve(hash);
        findAPromise.then(function (shortURLObject) {
            if (shortURLObject && shortURLObject !== null) {
                if (shortURLObject) {
                    var URL = shortURLObject.URL;
                    //console.log(URL);
                    //没条件时：condition=''  ,有条件时：condition='?a=1&b=2'
                    var URLHasConditon = URL.indexOf('?');
                    //console.log(URLHasConditon);
                    if (URLHasConditon > 0) {
                        //URL中含有查询条件，如：http://www.baidu.com/s?ie=utf-8
                        condition = condition.replace('?', '&');
                        //console.log(condition);
                        res.writeHead(301, {
                            "Location": URL + condition
                        });
                    } else {
                        //URL中不含有查询条件，如：http://www.baidu.com/s
                        //var hash = req.url.slice(7);
                        //console.log('111: ' + req.url);
                        if (req.url.length > 8 && req.url.slice(7, 8) == '/') {
                            condition = req.url.slice(7);
                            if (URL[URL.length - 1] == '/') {
                                URL = URL.slice(0, URL.length - 1);
                            }
                        }
                        console.log('Location: ' + URL + condition);
                        res.writeHead(301, {
                            "Location": URL + condition
                        });
                    }
                    res.end();
                } else {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.write("URL not found!");
                    res.end();
                }
            } else {
                if (hash != 'favicon.ico' && hash != 'favico') {
                    req.flash('error', '对不起，找不到这个短地址：' + hash);
                }
                res.redirect('/');
                //console.error("error: don't have the short-url.");
            }
        }, function (error) {
            if (error) {
                console.error(error);
            }
        });
    }
});

/*========== Start Server ==========*/
app.listen(conf.port);
console.log("listening on " + conf.port);
