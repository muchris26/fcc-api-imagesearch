// https://itunes.apple.com/search?term=jack+johnson&limit=25
var request = require('request');
var getty_api = require('gettyimages-api');



// request(url, function(err, res, body) {
//     console.log(body);
//     });

var express = require('express');
var nunjucks = require('nunjucks');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();

// Env Variables
// process.env.MONGODB_URI = fs.readFileSync('env_vars/mongodb.txt', 'utf-8');
// process.env.GETTY_API_KEY = fs.readFileSync('env_vars/api_key.txt', 'utf-8');
// process.env.GETTY_API_SECRET = fs.readFileSync('env_vars/api_secret.txt', 'utf-8');
// process.env.GETTY_API_USERNAME = fs.readFileSync('env_vars/api_username.txt', 'utf-8');
// process.env.GETTY_API_PASSWORD = fs.readFileSync('env_vars/api_password.txt', 'utf-8');

var getty_api_creds = {apiKey: process.env.GETTY_API_KEY, 
                       apiSecret: process.env.GETTY_API_SECRET,
                       username: process.env.GETTY_API_USERNAME,
                       password: process.env.GETTY_API_PASSWORD};

var db = process.env.MONGODB_URI; 

var port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// Configure nunjucks
nunjucks.configure( "views", {
    autoescape: true,
    express: app
} ) ;

// ROUTES

// Route - Home Page
app.get("/", function(req, res) {
    return res.render('index.html');
});

// Route - Read JSON
app.get("/api", function(req, res) {
    var search_var = req.query.search;
    var search_offset = req.query.offset;
    var getty_client = new getty_api(getty_api_creds);
    var page_num = req.query.page_num;
    getty_client.search().images().withPage(1).withPageSize(20).withPhrase(search_var)
        .execute(function(err, response) {
            MongoClient.connect(db,function(err, data) {
                data.collection('imageSearch').insertOne({'search_term': search_var});
                console.log("record added to db.imageSearch - {'search_term': " + search_var + "}")
            })
            
            if (page_num === undefined) {
                page_num = '1';
            }
            var images = response.images;
            if (search_offset === '2') {
                if (page_num === '1') {
                    images = images.slice(0,10);
                }
                else if (page_num === '2') {
                    images = images.slice(10,20);
                }
                pages = [1,2];
            }
            else {
                pages = [1];
                search_offset = '1';
                page_num = '1';
            }
            return res.render('api.html', {"search_term": search_var,
                                           data:images,
                                           page_num: page_num,
                                           pages: pages,
                                           offset: search_offset});
        })    
})

// ROUTE - History Page
app.get('/history', function(req, res) {
    MongoClient.connect(db, function(err, data) {
        data.collection('imageSearch').find({}).toArray(function(err, docs) {
            docs.reverse();
            var recent_docs = docs.splice(0,10)
            res.render('history.html', {'records': recent_docs});
        });
    });
});

// ROUTE - New Search Page
app.get('/new', function(req, res) {
        res.render('new.html');
});

app.post("/new", function(req, res) {
    console.log('You just posted ' + req.body.search_terms)
    var checked_box = req.body.search_offset;
    if (checked_box === 'TRUE') {
        console.log('true');
    }
    else {
        console.log('false');
    }
    return res.redirect(301, '/api?search=' + req.body.search_terms);
});

// ROUTE - Admin Page
app.get('/admin', function(req, res) {
    MongoClient.connect(db, function(err, data) {
        data.collection('imageSearch').find({}).toArray(function(err, docs) {
            res.render('admin.html', {'records': docs});
        });
    });
});

// ROUTE - Delete Records
app.get("/del", function(req, res) {
    var record_id = req.query.id;
    MongoClient.connect(db, function(err, data) {
        data.collection('imageSearch').remove({"_id": mongodb.ObjectID(record_id)});
        console.log("record deleted..." + record_id);
    });
    res.redirect(301, '/admin')
});

// Initialize app
app.listen(port, function() {
    console.log("Hello, World");
});

