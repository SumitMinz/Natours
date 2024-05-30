const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION 💣💣 SHUTTING DOWN !!!');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log('DB connection successfull  !!!');
  });
const server = app.listen(process.env.PORT, () => {
  console.log('App is running on port 3000');
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION 💣💣 SHUTTING DOWN !!!');
  server.close(() => {
    process.exit(1);
  });
});
