"use strict";
const mongoose = require("mongoose");
const hm = require("./history-model");
const async = require("async");

module.exports = function historyPlugin(schema, options) {
  const customCollectionName = options && options.customCollectionName;

  // Clear all history collection from Schema
  schema.statics.historyModel = function() {
    return hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options);
  };

  // // Save data
  // schema.post("init", function() {
  //   if (diffOnly) {
  //     this._ = this.toObject();
  //   }
  // });

  // Create a copy when insert or update, or a diff log
  schema.pre("save", function(next) {
    const mongoObject = this.toObject();
    const operation = this.isNew ? "create" : "update";
    const historyDoc = createHistoryDoc(mongoObject, operation);

    saveHistoryModel(mongoObject, historyDoc, this.collection.name, next);
  });

  // Listen on update
  schema.pre("update", function(next) {
    processUpdate.call(this, next);
  });

  // Listen on updateOne
  schema.pre("updateOne", function(next) {
    processUpdate.call(this, next);
  });

  // Listen on findOneAndUpdate
  schema.pre("findOneAndUpdate", function(next) {
    processUpdate.call(this, next);
  });

  // Create a copy on remove
  schema.pre("remove", function(next) {
    let mongoObject = this.toObject();
    let historyDoc = createHistoryDoc(mongoObject, "remove");

    saveHistoryModel(this.toObject(), mongoObject, historyDoc, this.collection.name, next);
  });

  // Create a copy on findOneAndRemove
  schema.post("findOneAndRemove", function(doc, next) {
    processRemove.call(this, doc, next);
  });

  function createHistoryDoc(mongoObject, operation, collection) {
    mongoObject.__v = undefined;
    console.log(collection);
    let historyDoc = {};
    historyDoc["timeStamp"] = new Date();
    historyDoc["operation"] = operation;
    historyDoc["d"] = mongoObject;

    return historyDoc;
  }

  function saveHistoryModel(mongoObject, historyDoc, collectionName, next) {
    let history = new hm.HistoryModel(hm.historyCollectionName(collectionName, customCollectionName), options)(historyDoc);
    history.save(next);
  }

  function processUpdate(next) {
    let mongoObject = this._update.$set || this._update;
    let historyDoc = createHistoryDoc(mongoObject, "update");

    saveHistoryModel(this.toObject, mongoObject, historyDoc, this.mongooseCollection.collectionName, next);
  }

  function processRemove(doc, next) {
    let mongoObject = doc.toObject();
    let historyDoc = createHistoryDoc(mongoObject, "remove");

    saveHistoryModel(this.toObject, mongoObject, historyDoc, this.mongooseCollection.collectionName, next);
  }
};
