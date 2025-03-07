const catchAsync = require('./../utilities/catchAsync');
const AppError = require('../utilities/appError');
const { Model } = require('mongoose');
const APIFeatures = require('./../utilities/apiFeatures');
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('NO DOCUMENT FOUND WITH THIS ID', 404));
    }
    res.status(204).json({
      status: 'SUCCESS',
      data: null,
    });
  });
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('NO DOCUMENT FOUND WITH THIS ID', 404));
    }
    res.status(200).json({
      status: 'SUCCESS',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'SUCCESS',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOption) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOption) {
      query = query.populate(popOption);
    }
    const doc = await query;
    if (!doc) {
      return next(new AppError('NO DOCUMENT FOUND WITH THIS ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // TO ALLOW FOR NESTED GET REVIEW ON TOUR
    let filter = {};
    if (req.params.tourId) {
      filter = { tour: req.params.tourId };
    }
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitField()
      .paginate();

    const doc = await features.query;
    // const doc = await features.query.explain();
    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });
