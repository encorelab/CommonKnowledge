/*jshint node: true, strict: false, devel: true, debug: true, unused:false, undef:true, loopfunc:true */
// variables to store static data from MongoDB
var states = null,
  contributions = null,
  present_students = null,
  doingStuffForUser = {};

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
    // grab awake contributions collection
    contributions = CK.Model.awake.contributions;
    console.log('We have '+contributions.length+' contributions ...');

    // grab awake states collection
    states = CK.Model.awake.states;
    // go over all user states and preset the doingStuffForUser object
    // which is later used to lock user to avoid problems of double triggered events
    states.each(function(state){
      if (state.get('type') === "user") {
        doingStuffForUser[state.get('entity')] = false;
      }
    });

    // register change and add events to trigger function assigning tag bucket items
    states.on('change add', updateStateStuff);

    // when starting up check all state object if any of them requires the agent to perfom an action
    states.each(updateStateStuff);
  });
});

function assign_observation_for_tagging(user_state) {
  var contrib_to_tag = retrieve_contribution_for_tagging(contributions);

  if (contrib_to_tag) {
    // found a contribution so assing it and inform user
    console.log('Found contribution: ' + contrib_to_tag.id);

    // make object wakeful so clients here changes
    user_state.wake(config.wakeful.url);

    // mark contribution as assigned
    contrib_to_tag.set('assigned_tagger', user_state.get('entity'));
    console.log('Assign to user: ' + user_state.get('entity'));
    contrib_to_tag.save().done(function () {
      // write contribution id to user state and set tagging_status to assigned
      user_state.set('contribution_to_tag', contrib_to_tag.id);
      user_state.set('tagging_status', 'assigned');
      user_state.save().done(function (){
        // unlocking this user
        doingStuffForUser[user_state.get('entity')] = false;
      });
    });
  } else {
    // no contribution found so we must be done. Inform user
    console.log('No contribution found so we must be done. Inform user: ' + user_state.get('entity'));
    user_state.set('tagging_status', 'done');
    user_state.save().done(function() {
      // unlocking this user
      doingStuffForUser[user_state.get('entity')] = false;
    });
  }
}

// reacting to changes in USERS Model
function updateStateStuff(state) {
  var userLock = doingStuffForUser[state.get('entity')];
  if ((typeof userLock === 'undefined' || userLock === null) && state.get('type') === "user" ) {
    doingStuffForUser[state.get('entity')] = false;
  }

  if (state.get('type') === "user" && state.get('tagging_status') === "waiting" && doingStuffForUser[state.get('entity')] === false) {
    console.log('Tagging started, agent is assigning students an observation to tag');

    // locking this user so that we don't assign two contributions for tagging in short order
    doingStuffForUser[state.get('entity')] = true;

    // user waiting for a tag - assing tag or let user know that s/he is done
    assign_observation_for_tagging(state);
  } else {
    console.log('Saw state change of entity '+state.get('entity'));
  }
}

function retrieve_contribution_for_tagging (contribs) {
  // retrieve contributions that are
  // a) published
  // b) have an empty tag array
  // c) have not assigned_tagger or and empty string
  var contrib_to_tag = contribs.find(function(con) {
    var at = con.get('assigned_tagger');
    if (con.has('tags') && con.get('tags').length < 1 && con.get('published') && (typeof at === 'undefined' || at === null || at === '')) {
      return con;
    }
  });

  return contrib_to_tag;
}