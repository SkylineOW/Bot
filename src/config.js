module.exports = {
  port: process.env.PORT || 3001,
  prefix: process.env.BOT_PREFIX || '~',

  discord: {
    token: process.env.DISCORD_TOKEN || 'MjY1NTI5NTI4MTI0ODMzODAy.C2TImg.w3CTommLaQKPumCHyj25o4V3C0U',
  },

  twitch: {
    client_id: process.env.TWITCH_CLIENT_ID || 'tb4tkbhogiillkwsno93ldp0180rsb',
  },

  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY || '5FLefjvv3dNLySqaZuWlBEDh6',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'UJjHsIgVW5vGmOL4crD6RvZs2zZAgdwJok90RBbrm4RhrCkELL',
    access_token_key: process.env.TWITTER_TOKEN_KEY || '863737477-QwDffPYtttSZ41OaOvCSVCJpPfMuTpPp5Z6eXvse',
    access_token_secret: process.env.TWITTER_TOKEN_SECRET || 'wS2HH7d5649RAz2P47BaYsmyVC9rueULHF7V0nCL7kxPG',
  },

  mongoose: {
    database_url: process.env.MONGODB_URI || 'mongodb://localhost/skybot',
  },

  redis: {
    url: process.env.REDISCLOUD_URL || 'redis://10.0.0.6:6379' //redis://rediscloud:o7DYQyT91Ep6YnQz@redis-18541.c3.eu-west-1-2.ec2.cloud.redislabs.com:18541'
  }

};
