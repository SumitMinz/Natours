const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utilities/catchAsync');
const AppError = require('./../utilities/appError');
const User = require('./../models/userModel');
const Email = require('../utilities/email');
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const date_now = new Date();
  date_now.setDate(date_now.getDate() + process.env.JWT_COOKIE_EXPIRES_IN);

  const cookieOptions = {
    expires: date_now,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // const token = signToken(user._id);
  // const cookieOptions = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
  //   ),
  //   httpOnly: true,
  // };
  // if (process.env.NODE_ENV === 'production') {
  //   cookieOptions.secure = true;
  // }

  user.password = undefined;
  // res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    // passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
  // const token = signToken(newUser._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1. CHECK IF EMAIL AND PASSWORD EXISTS
  if (!email || !password) {
    return next(
      new AppError('Please provide email and password! And Try Again', 400),
    );
  }
  //2. CHECK IF USER EXIST AND PASSWORD IS CORRECT
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('INCORRECT EMAIL OR PASSWORD', 401));
  }
  //3. IF EVERYTHING IS OK SEND THE TOKEN TO CLIENT
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  createSendToken(user, 200, res);
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'Loggedout', {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1) GETTING THE TOKEN AND CHECK
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError('YOU ARE NOT AUTHORIZED ⚠️⚠️', 401));
  }

  //2) VALIDATE TOKEN/ VERIFICATION TOKEN
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3) CHECK IF USER STILL EXISTS
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401,
      ),
    );
  }
  //4) CHECK IF USER CHANGED PASSWORD AFTER THE TOKEN IS ISSUED
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed Password ! Please login again.', 401),
    );
  }
  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) GET USER BASED ON POSTED EMAIL
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('THERE IS NO USER WITH EMAIL ADDRESS', 404));
  }
  //2) GENERATE THE RANDOM RESET TOKEN
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) SEND IT TO USER EMAIL
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to E-mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error in sending the email. Please try again later!',
      ),
      500,
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) GET USER BASED ON THE TOKEN
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('TOKEN IS INVALID OR HAS EXPIRED', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)GET USER FROM COLLECTION
  const user = await User.findById(req.user.id).select('+password');
  //2)CHECK IF POSTED CURRENT PASSWORD IS CORRECT
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('YOUR CURRENT PASSWORD IS WRONG.', 401));
  }
  //3)IF SO UPDATE PASSWORD
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4)LOG USER IN, SEND JWT
  createSendToken(user, 200, res);
});

// ONLY FOR RENDER PAGES, NO ERROR
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  //1) GETTING THE TOKEN AND CHECK
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      //3) CHECK IF USER STILL EXISTS
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4) CHECK IF USER CHANGED PASSWORD AFTER THE TOKEN IS ISSUED
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  // GRANT ACCESS TO PROTECTED ROUTE
  next();
});
