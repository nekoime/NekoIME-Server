express = require('express');
app = express();

jwt = require('jwt-simple');
hat = require('hat');

CLIENT_ID = '362756643098-jh5ovot4djj7el5qlav93toefgv54a8b.apps.googleusercontent.com';
CLIENT_SECRET = 'pbrbdjVfZc9F8K2NhD6C1siO';
REDIRECT_URL = 'http://localhost:5285/login_callback';

googleapis = require("googleapis")
OAuth2Client = googleapis.OAuth2Client;

MongoClient = require('mongodb').MongoClient
MongoClient.connect 'mongodb://127.0.0.1:27017/nekoime', (err, db)->
  throw err if err

  app.get '/login', (req, res)->
    oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
    url = oauth2Client.generateAuthUrl
      access_type: 'offline', # will return a refresh token
      scope: 'https://www.googleapis.com/auth/plus.me'
      approval_prompt: 'force'
    res.redirect url

  app.get '/login_callback', (req, res)->
    oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
    oauth2Client.getToken req.query.code, (err, tokens)->
      return res.send 500, err.toString() if err
      oauth2Client.setCredentials(tokens)
      id = parseInt jwt.decode(tokens.id_token, "", true).id
      db.collection('users').update {
        _id: id
      }, {
        tokens: tokens
      }, {
        upsert: true
      }, (err)->
        return res.send 500, err.toString() if err
        token = hat()
        db.collection('tokens').insert
          _id: token
          user: id
        , (err)->
          return res.send 500, err.toString() if err
          res.redirect "http://localhost:3000/login_callback?token=#{token}"

  app.get '/profile', (req, res)->
    db.collection('tokens').findOne
      _id: req.query.token
    , (err, doc)->
        return res.send 500, err.toString() if err
        return res.send 403, 'inavilid token' if !doc
        db.collection('users').findOne
          _id: doc.user
        , (err, doc)->
          return res.send 500, err.toString() if err
          oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
          oauth2Client.setCredentials(doc.tokens)
          googleapis
          .discover('plus', 'v1')
          .execute (err, client)->
              return res.send 500, err.toString() if err
              client
              .plus.people.get({ userId: 'me' })
              .withAuthClient(oauth2Client)
              .execute (err, profile)->
                return res.send 500, err.toString() if err
                res.send profile

  server = app.listen 5285, '::', ()->
    console.log('Listening on port %d', server.address().port);
