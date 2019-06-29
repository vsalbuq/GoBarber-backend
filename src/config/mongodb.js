require('dotenv').config();

module.exports = {
  dbhost: `mongodb://${process.env.DB_HOST_MONGO}:27017/gobarber`,
  options: { useNewUrlParser: true, useFindAndModify: true },
};
