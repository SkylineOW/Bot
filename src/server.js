/* eslint-disable no-console */
//Hack to allow module importimg from application root.
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

require('babel-polyfill');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const http = require('http');

const redis = require('./data/redis');
const config = require('./config');

const bot = require('./bot');
const ow_api = require('interfaces/ow_api');
const twitch = require('interfaces/twitch');
const twitter = require('interfaces/twitter');

const app = express(http);

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('<div>Server is ok!!</div>');
});

app.get('/profile', (req, res) => {
  ow_api.getAll('oOCKYOo-2410').then((response) => {
    res.send(response.data);
  }).catch((error) => {
    res.send(error);
  });
});

app.get('/channel/:user', (req, res) => {
  twitch.getChannel(req.params.user).then((response) => {
    if(response.status !== 200)
    {
      return res.send(response);
    }

    res.send(response.data);
  });
});

app.get('/stream/:user', (req, res) => {
  twitch.getStream(req.params.user).then((response) => {
    res.send(response.data);
  });
});

app.get('/tweets', (req, res) => {
  twitter.getLatest('skyline_ow', 816086637172105200, (error, tweets) => {
    if(error) {
      res.send(error);
    }

    res.send(tweets);
  });
});

app.use('*', (req, res) => {
  res.send({ message: 'Page does not exist'});
});

// Error handling
app.use((err, req, res) => {
  res.send({ error: err.message });
});

app.listen(3001, () => {
  console.log('The server is running at http://localhost:3001/');
});
