/*jshint node: true, strict: false, devel: true, debug: true, unused:false, undef:true, loopfunc:true */
// variables to store static data from MongoDB
var states = null,
  contributions = null,
  present_students = null;

// grab information from user
var argv = require('optimist')
  .usage('Usage:\n\t$0 database')
  .demand(1)
  .argv;

var DATABASE = argv._[0];

// S3 dependencies
var jQuery = require('jquery');
var _ = require('underscore');
// setting up backbone
var Backbone = require('backbone');
Backbone.$ = jQuery;
// setting up Drowsy and Wakeful
var Drowsy = require('backbone.drowsy').Drowsy;
var Wakeful = require('backbone.drowsy/wakeful').Wakeful;
// read config.json
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json'));
// read static data from file system

// pull in EvoRoom model
var CK = {};
CK.Model = require('../shared/js/ck.model.js').CK.Model;


// Wakeful connection via EvoRoom.Model that allows to receive change triggers 
CK.Model.init(config.drowsy.url, DATABASE).done(function () {
  CK.Model.initWakefulCollections(config.wakeful.url).done(function() {
    contributions = CK.Model.awake.contributions;
    console.log('We have '+contributions.length+' contributions ...');

    states = CK.Model.awake.states;
    states.on('change add', updateStateStuff);
  });
});

function assign_observation_for_tagging(user_state) {
  // retrieve contributions that are
  // a) published
  // b) have an empty tag array
  // c) have not assigned_tagger or and empty string
  var contrib_to_tag = contributions.find(function(con) {
    var at = con.get('assigned_tagger');
    if (con.get('tags').length < 1 && con.get('published') && (typeof at === 'undefined' || at === null || at === '')) {
      return con;
    }
  });
  if (contrib_to_tag) {
    // found a contribution so assing it and inform user
    console.log('Found contribution: ' + contrib_to_tag.id);

    // make object wakeful so clients here changes
    contrib_to_tag.wake(config.wakeful.url);

    // mark contribution as assigned
    contrib_to_tag.set('assigned_tagger', user_state.get('entity'));
    console.log('Assign to user: ' + user_state.get('entity'));
    contrib_to_tag.save().done(function () {
      // write contribution id to user state and set tagging_status to assigned
      user_state.set('contribution_to_tag', contrib_to_tag.id);
      user_state.set('tagging_status', 'assigned');
      user_state.save();
    });
  } else {
    // no contribution found so we must be done. Inform user
    console.log('No contribution found so we must be done. Inform user: ' + user_state.get('entity'));
    user_state.set('tagging_status', 'done');
    user_state.save();
  }
}

// reacting to changes in USERS Model
function updateStateStuff(state) {
  var entity = state.get('entity');
  var phase = state.get('phase');

  if (state.get('type') === "user" && state.get('tagging_status') === "waiting") {
    console.log('Tagging started, agent is assigning students an observation to tag');
    // immediatelly setting user into tagging_status processing to avoid problems when state events are double triggered
    state.set('tagging_status', 'processing');
    state.save();
    // user waiting for a tag - assing tag or let user know that s/he is done
    assign_observation_for_tagging(state);
  } else {
    console.log('Saw state change');
    console.log(state);
  }
}