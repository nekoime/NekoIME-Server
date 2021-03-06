// Generated by CoffeeScript 1.7.1
(function() {
  var CLIENT_ID, CLIENT_SECRET, MongoClient, OAuth2Client, REDIRECT_URL, app, express, googleapis, hat, jwt;

  express = require('express');

  app = express();

  jwt = require('jwt-simple');

  hat = require('hat');

  CLIENT_ID = '362756643098-jh5ovot4djj7el5qlav93toefgv54a8b.apps.googleusercontent.com';

  CLIENT_SECRET = 'pbrbdjVfZc9F8K2NhD6C1siO';

  REDIRECT_URL = 'http://localhost:5285/login_callback';

  googleapis = require("googleapis");

  OAuth2Client = googleapis.OAuth2Client;

  MongoClient = require('mongodb').MongoClient;

  MongoClient.connect('mongodb://127.0.0.1:27017/nekoime', function(err, db) {
    var server;
    if (err) {
      throw err;
    }
    app.get('/login', function(req, res) {
      var oauth2Client, url;
      oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
      url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/plus.me',
        approval_prompt: 'force'
      });
      return res.redirect(url);
    });
    app.get('/login_callback', function(req, res) {
      var oauth2Client;
      oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
      return oauth2Client.getToken(req.query.code, function(err, tokens) {
        var id;
        if (err) {
          return res.send(500, err.toString());
        }
        oauth2Client.setCredentials(tokens);
        id = parseInt(jwt.decode(tokens.id_token, "", true).id);
        return db.collection('users').update({
          _id: id
        }, {
          tokens: tokens
        }, {
          upsert: true
        }, function(err) {
          var token;
          if (err) {
            return res.send(500, err.toString());
          }
          token = hat();
          return db.collection('tokens').insert({
            _id: token,
            user: id
          }, function(err) {
            if (err) {
              return res.send(500, err.toString());
            }
            return res.redirect("http://localhost:3000/login_callback?token=" + token);
          });
        });
      });
    });
    app.get('/profile', function(req, res) {
      return db.collection('tokens').findOne({
        _id: req.query.token
      }, function(err, doc) {
        if (err) {
          return res.send(500, err.toString());
        }
        if (!doc) {
          return res.send(403, 'inavilid token');
        }
        return db.collection('users').findOne({
          _id: doc.user
        }, function(err, doc) {
          var oauth2Client;
          if (err) {
            return res.send(500, err.toString());
          }
          oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
          oauth2Client.setCredentials(doc.tokens);
          return googleapis.discover('plus', 'v1').execute(function(err, client) {
            if (err) {
              return res.send(500, err.toString());
            }
            return client.plus.people.get({
              userId: 'me'
            }).withAuthClient(oauth2Client).execute(function(err, profile) {
              if (err) {
                return res.send(500, err.toString());
              }
              return res.send(profile);
            });
          });
        });
      });
    });
    return server = app.listen(5285, '::', function() {
      return console.log('Listening on port %d', server.address().port);
    });
  });

}).call(this);

//# sourceMappingURL=app.map
