const AppError = require('../utilities/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `INVALID INPUT DATA ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = (err) =>
  new AppError('INVALID TOKEN. PLEASE LOGIN AGAIN!!', 401);
const handleJWTExpiredError = (err) =>
  new AppError('TOKEN Expired. PLEASE LOGIN AGAIN!!', 401);
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!!',
      msg: err.message,
    });
  }
};
const sendErrorPro = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error('ERROR 💥💥💥💥💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'something went wrong',
    });
  }
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!!',
      msg: err.message,
    });
  }
  console.error('ERROR 💥💥💥💥💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!!',
    msg: 'Please try Again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);
    sendErrorPro(error, req, res);
  }
};
