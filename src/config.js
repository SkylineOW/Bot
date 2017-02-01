module.exports = {
  port: process.env.PORT || 3001,
  prefix: process.env.BOT_PREFIX || '~',

  discord: {
    token: process.env.DISCORD_TOKEN || 'MjY1NTI5NTI4MTI0ODMzODAy.C3OUAA.whk99DbdVoNAK8Htcv_l2eONEWE',
  },

  twitch: {
    client_id: process.env.TWITCH_CLIENT_ID || 'client_id',
  },

  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY || 'consumer_key',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'consumer_secret',
    access_token_key: process.env.TWITTER_TOKEN_KEY || 'token_key',
    access_token_secret: process.env.TWITTER_TOKEN_SECRET || 'token_secret',
  },

  mongoose: {
    database_url: process.env.MONGODB_URI || 'mongodb://localhost:27017/zenbot',
  },

  redis: {
    url: process.env.REDISCLOUD_URL || 'redis://10.0.0.6:6379'
  }
};
