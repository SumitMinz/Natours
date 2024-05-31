const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');

const AppError = require('./utilities/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoute');
const viewRouter = require('./routes/viewRoute');
const bookingRouter = require('./routes/bookingRoute');

const globalErrorHandler = require('./controllers/errorController');
const app = express();
app.use(cors());
// app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

//Global MIDDLEWARE
// set http request

const scriptSrcUrls = ['https://unpkg.com/', 'https://tile.openstreetmap.org'];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = ['https://unpkg.com', 'https://tile.openstreetmap.org'];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// //set security http headers
app.use(helmet());
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   }),
// );

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https://js.stripe.com/v3/'],
      baseUri: ["'self'"],
      connectSrc: [
        "'self'",
        ...connectSrcUrls,
        "'self'",
        // 'http://localhost:3000/api/v1/users/login',
        // 'ws://localhost:52782/',
        // 'ws://localhost:50424/',
        // 'ws://localhost:50016/',
        // 'ws://localhost:62287/',
        // 'http://localhost:3000/api/v1/booking/checkout-session/',
      ],
      scriptSrc: [
        "'self'",
        ...scriptSrcUrls,
        "'self'",
        'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
        "'self'",
        'https://js.stripe.com/v3/',
      ],
      // styleSrc: ["'self'", 'https:', 'unsafe-inline', ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:', ...fontSrcUrls],
    },
  }),
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// limit request
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, Please try again in an hour!',
});
app.use('/api', limiter);
// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());
// PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingQuantity',
      'ratingAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);
// for serving static file
// app.use(express.static(`${__dirname}/public`));
app.use(compression());

//TEST MIDDLEWARE
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log('HELLO FROM MIDDLEWARE');
  // console.log(req.cookies);
  next();
});

//MOUNTING THE ROUTER
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

app.all('*', (req, res, next) => {
  next(
    new AppError(`Cant find ${req.originalUrl} on this server!!😭😭😭`, 404),
  );
});

app.use(globalErrorHandler);

// SERVER

module.exports = app;
