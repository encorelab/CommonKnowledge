/*jshint node: true, strict: false, devel: true, debug: true, unused:false, undef:true, loopfunc:true */
// variables to store static data from MongoDB
var users = null;
var states = null;

// grab information from user
var myArgs = require('optimist').argv,
     help = '\nUsage: \n\n    node agents/choreographer.js  <database_name>  \n\n';
if ((myArgs.h)||(myArgs.help)) {
  console.log(help);
  process.exit(0);
}
var DATABASE = myArgs._[0];

// S3 dependencies
var jQuery = require('jquery');
var _ = require('underscore');
// setting up backbone
var Backbone = require('backbone');
Backbone.$ = jQuery;
// setting up Drowsy and Wakeful
var Drowsy = require('Backbone.Drowsy').Drowsy;
var Wakeful = require('Backbone.Drowsy/wakeful').Wakeful;
// read config.json
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));
// read static data from file system

// pull in EvoRoom model
var CK = {};
CK.Model = require('../shared/js/ck.model.js').CK.Model;


// Wakeful connection via EvoRoom.Model that allows to receive change triggers 
CK.Model.init(config.drowsy.url, DATABASE).done(function () {
  states = new CK.Model.States();
  states.wake(config.wakeful.url);

  states.on('change add', updateStateStuff);
  states.on('reset', function () {
    states.each(function (state) {updateStateStuff(state);});
  });

  states.fetch();
});

// reacting to changes in USERS Model
function updateStateStuff(state) {
    console.log("doing stuff for", state.get('entity'));
}