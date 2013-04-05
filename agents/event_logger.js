/*jshint node: true, strict: false, devel: true, debug: true, undef:true, loopfunc:true */

var argv = require('optimist')
  .usage('Usage:\n\t$0 database')
  .demand(1)
  .argv;

var DATABASE = argv._[0];

var jQuery = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.$ = jQuery;

var mongo = require('mongodb');

var Drowsy = require('backbone.drowsy').Drowsy;
var Wakeful = require('backbone.drowsy/wakeful').Wakeful;

var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));

console.log("config.json loaded: ", config);

var CK = {};
CK.Model = require('../shared/js/ck.model.js').CK.Model;


// danger! monkeypatch!
String.prototype.toCamelCase = function(){
  return this.replace(/([\-_][a-z]|^[a-z])/g, function($1){return $1.toUpperCase().replace(/[\-_]/,'');});
};

/*******************************/

// changes to these collections will be logged
var COLLECTIONS = [
  'states',
  'contributions',
  'tags',
  'proposals'
];

var LOG_TO_COLLECTION = 'events';

var mongoClient = new mongo.Db(DATABASE, new mongo.Server('localhost', 27017, {}), {w:0});
var log;
// TODO: wait for open
// TOOD: deal with possible error
// TODO: maybe just switch to mongojs or some other mongo abstraction lib?
mongoClient.open(function (err) {
  mongoClient.collection(LOG_TO_COLLECTION, function (err, collection) {
    log = collection;
    console.log("Logging to collection '"+LOG_TO_COLLECTION+"'...");
  });
});

var staticData = {};
var monitoredColls = {};

// loadStaticData();
setupModel();

console.log("Agent is agenting!");

/*******************************/

// function loadStaticData() {
//   // paths of the static data files we want to load
//   var datafiles = {
//     'phase_definitions': __dirname+'/../assets/static_data/phase_definitions.json'
//   };

//   _.collect(datafiles, function (path, key) {
//     staticData[key] = JSON.parse(fs.readFileSync(path));
//   });
// }

function logEntry(action, doc, data) {
  var entry = {
    action: action,
    doc_id: doc.id,
    collection: doc.collectionName,
    time: new Date(),
    data: doc.parse(data)
  };

  if (doc.has('username')) {
    entry.username = doc.get('username');
  }

  if (log) {
    log.insert(entry, function (err) {
      if (err) {
        console.error("FAILED TO LOG ENTRY!", err, entry);
      } else {
        console.log(entry);
      }
    });
  } else {
    console.error("Log not available to log event!", entry);
  }
}

function setupModel() {
  CK.Model.init(config.drowsy.url, DATABASE).done(function () {
    _.each(COLLECTIONS, function (collName) {
      var coll = new CK.Model[collName.toCamelCase()]();
      coll.wake(config.wakeful.url);

      coll.on('change', function (doc) {
        var changed = doc.changedAttributes();
        changed._id = doc.attributes._id; // need this or Drowsy.Document.parse will crap out
        logEntry('change', doc, changed);
      });

      coll.on('add', function (doc) {
        logEntry('add', doc, doc.toJSON());
      });

      monitoredColls[collName] = coll;
    });

    console.log("Model initialized!");
  });
}