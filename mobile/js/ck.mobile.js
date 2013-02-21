/*jshint browser: true, devel: true, strict: false, unused:false */
/*globals jQuery, _, Sail, CK, Rollcall */

window.CK = window.CK || {};

CK.Mobile = function() {
  var app = this;

  app.name = "CK.Mobile";

  app.requiredConfig = {
    xmpp: {
      domain: 'string',
      port: 'number',
      url: 'string'
    },
    rollcall: {
      url: 'string'
    },
    drowsy: {
      url: 'string'
    },
    wakeful: {
      url: 'string'
    }
  };

  // Global vars - a lot of this stuff can go TODO
  app.userData = null;
  app.currentBuildOn = {};
  app.tagArray = [];
  app.buildOnArray = [];
  app.synthesisFlag = false;
  app.keyCount = 0;
  // app.currentState = {"type":"tablet"};


  app.init = function() {
    Sail.verifyConfig(this.config, this.requiredConfig);
    
    Sail.modules
      // Enable multi-picker login for CommonKnowledge curnit - asking for run (must be linked to curnit)
      .load('Rollcall.Authenticator', {mode: 'multi-picker', askForRun: true, curnit: 'CommonKnowledge'})
      .load('Strophe.AutoConnector')
      .load('AuthStatusWidget', {indicatorContainer: '#logout-container'})
      .thenRun(function () {
        Sail.autobindEvents(app);
        app.trigger('initialized');

        return true;
      });

    // Create a Rollcall instance so that sail.app has access to it later on
    app.rollcall = new Rollcall.Client(app.config.rollcall.url);

    // configure the toasts
    jQuery().toastmessage({
      position : 'middle-center'
    });

  };

  app.authenticate = function() {
    // TODO: implement me... probalby just copy + modify code from washago?

    // TODO: for now we're hard-coding a run name... need to get this from auth
    //this.config.run = {name: "ck-alpha1", id: 12};
    if (!app.run) {
      Rollcall.Authenticator.requestRun();
    } else {
      Rollcall.Authenticator.requestLogin();
    }

    
  };

  app.restoreState = function () {
 
    //var stateObj = {"type":"phase"};
    CK.getState("phase", function(s){
      if (s && s.get('state') === "start_analysis"){
        console.log('phase is start_analysis');
        app.startAnalysis();

        console.log('Check if contribution left to do or done with tagging');
        CK.getStateForUser("tablet", Sail.app.userData.account.login, "contribution_to_tag", function(user_state){
          if (user_state) {
            var data_from_state = user_state.get('data');
            if (data_from_state.done_tagging === true) {
              CK.getStateForUser("tablet", Sail.app.userData.account.login, "done_tagging", function(s3) {
                // go to done tagging
                app.doneTagging();
              });
            } else if (data_from_state.contribution_id !== "") {
              console.log('Need to work on contribution with id: '+data_from_state.contribution_id);
              app.contributionToTag(data_from_state.contribution_id);
            }
          } else {
            console.log('I am on a boat');
          }
        });
      } if (s && s.get('state') === "start_synthesis") {
        console.log('phase is start_synthesis');
        app.startAnalysis();

        CK.getStateForUser("tablet", Sail.app.userData.account.login, "contribution_to_tag", function(user_state){
          if (user_state) {
            var data_from_state = user_state.get('data');
            if (data_from_state.done_tagging === true) {
              CK.getStateForUser("tablet", Sail.app.userData.account.login, "done_tagging", function(s3) {
                console.log('state is start_synthesis and we are done_tagging so call doneTagging and startSynthesis');
  // TODO for Colin: Figure out the side effects that are necessary to have everything in place for this restore to work.
                
                Sail.app.doneTagging();
                Sail.app.startSynthesis();
              });
            } else if (data_from_state.contribution_id !== "") {
              console.log('state is start_synthesis buy we need to work on contribution with id: '+data_from_state.contribution_id);
              app.contributionToTag(data_from_state.contribution_id);
            }
          } else {
            console.log('I am on a boat');
          }
        });
        
      } else {
        console.log('could not find state for type phase');
      }
    });
 
  };

  app.events = {
    initialized: function(ev) {
      app.authenticate();
    },

    'ui.initialized': function(ev) {
      console.log('ui.initialized!');
    },    

    authenticated: function(ev) {
      console.log('Authenticated...');
      // now we call a class function (configure) and hand in the drowsy url and the run name so we don't need
      // to do this config again for each model instantiation
      CK.Model.init(app.config.drowsy.url, this.run.name)
      .done(function () {
        Wakeful.loadFayeClient(app.config.wakeful.url).done(function () {
          app.trigger('ready')
        });
      });

      app.userData = Sail.app.session;

      //jQuery('#logout-button').addClass('btn btn-warning').html('<a href="#">Logout</a>');
    },

    connected: function(ev) {
      console.log("Connected...");
    },

    ready: function(ev) {
      // TODO: maybe also wait until we're connected?
      //       currently this just waits until CK.Model is initialized
      console.log("Ready!");

      app.restoreState();
      // moved the view init here so that backbone is configured with URLs
      app.initViews();
    },

    'unauthenticated': function(ev) {
      app.authenticate();
    },

    sail: {
      screen_lock: function(sev) {
        console.log('freezing display');

        jQuery('#lock-screen').removeClass('hide');
        jQuery('.row').addClass('disabled');
      },

      screen_unlock: function(sev) {
        console.log('unfreezing display');

        jQuery('#lock-screen').addClass('hide');
        jQuery('.row').removeClass('disabled');
      },

      contribution: function(sev) {
        console.log('heard a contribution');

        contrib = new CK.Model.Contribution(sev.payload);
        Sail.app.contributionList.add(contrib);
        var sort = ['created_at', 'DESC'];
        // var selector = {"author": "matt"};
        app.contributionList.fetch({
          data: {

            sort: JSON.stringify(sort)
          }
        });
      },

      start_analysis: function(sev) {
        console.log('start_analysis heard, creating TagView');
        app.startAnalysis();
      },

      contribution_to_tag: function(sev) {
        console.log('contribution_to_tag heard');
        console.log('id: '+sev.payload.contribution_id);
        
        if (sev.payload.recipient === app.userData.account.login) {
          console.log('name: '+sev.payload.recipient);


          app.contributionToTag(sev.payload.contribution_id);          

          var dataObj = {"contribution_id":sev.payload.contribution_id};
          CK.setStateForUser ("tablet", app.userData.account.login, "contribution_to_tag", dataObj);

        }

      },

      done_tagging: function(sev) {
        console.log('done_tagging event heard');
        if (sev.payload.recipient === app.userData.account.login) {
          // CK.setStateForUser('tablet', Sail.app.userData.account.login, 'done_tagging');     TODO - implement me once the model is done
          app.doneTagging();
        }

        // store state for restoreState ;)
        var dataObj = {'done_tagging':true};
        CK.setStateForUser ("tablet", app.userData.account.login, "contribution_to_tag", dataObj);
      },

      start_synthesis: function(sev) {
        console.log('start_synthesis heard');
        app.startSynthesis();
      }

    }
  };

  /* Outgoing events */

  app.sendContribution = function(kind, model) {
    var sev;
    if (kind === 'newNote' || kind === 'synthesis') {
      sev = new Sail.Event('contribution', JSON.stringify(model.toJSON()));
    } else if (kind === 'buildOn') {
      sev = new Sail.Event('build_on', app.contributionDetails.toJSON());
    } else {
      console('unknown type of submission, cant send contribution');
      return false;
    }

    Sail.app.groupchat.sendEvent(sev);
    return true;
  };


  /* Helper functions */


  app.initViews = function() {
    console.log('creating ListView');
    // FIX MY NAMESPACING
    app.contributionList = new CK.Model.Contributions();
    //app.contributionList.wake(app.config.wakeful.url);
    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });    
    app.contributionListView = new CK.Mobile.View.ContributionListView({
      el: jQuery('#contribution-list'),
      collection: app.contributionList
    });
    app.contributionList.on('reset add', app.contributionListView.render);
    var sort = ['created_at', 'DESC'];
    // var selector = {"author": "matt"};
    app.contributionList.fetch({
      data: { sort: JSON.stringify(sort) }
    });
    
  };

  app.autoSave = function(view, ev) {
    //var view = this;
    Sail.app.keyCount++;
    console.log("saving stuff as we go at", Sail.app.keyCount);

    if (Sail.app.keyCount > 9) {

      view.model.set(ev.target.name, jQuery('#'+ev.target.id).val())
      view.model.save();
      Sail.app.keyCount = 0;
    }

  };  

  app.addNote = function(kind) {
    console.log('Creating an inputView');

    var contrib = new CK.Model.Contribution();

    var inputView = new CK.Mobile.View.ContributionInputView({
      el: jQuery('#contribution-input'),
      model: contrib
    });

    // just in case
    //app.clearModels();

    contrib.set('justAdded', true);

    contrib.set('author', app.userData.account.login);
    contrib.set('published', false);
    contrib.set('tags', app.tagArray);
    contrib.set('build_ons', app.buildOnArray);
    contrib.set('kind', kind);

    // since we do manual saves, we don't need sync. We don't need both (used to be change and sync)
    contrib.on('change', inputView.render, inputView);

    contrib.save();

    app.contributionList.add(contrib);
  };

  app.showDetails = function(contrib) {
    console.log('creating a new Details');

    details = new CK.Model.Contribution();      // not sure if we want to create a new model instance here, or just set one view up in initViews and then rebind it to different contribs here...
    details = contrib;
    details.on('change', function(model) { console.log(model.changedAttributes()); });

    detailsView = new CK.Mobile.View.ContributionDetailsView({
      el: jQuery('#contribution-details'),
      model: details
    });
    details.on('change', detailsView.render, detailsView);

    // have to call this manually because there are no change events later
    detailsView.render();
  };

  app.Models = function() {
    // clear all the old garbage out of the model, rebind
    // app.currentContribution = new CK.Model.Contribution();
    // app.currentContribution.wake(app.config.wakeful.url);
    // app.contributionInputView.model = app.currentContribution;
    // app.contributionInputView.undelegateEvents();
    // app.contributionInputView.delegateEvents();

    // app.currentBuildOn = {};
  };

  app.showWaitScreen = function() {
    console.log('showing wait screen');

    jQuery('#wait-screen').removeClass('hide');
    jQuery('.row').addClass('disabled');
  };

  app.hideWaitScreen = function() {
    console.log('hiding wait screen');

    jQuery('#wait-screen').addClass('hide');
    jQuery('.row').removeClass('disabled');
  };

  /* State related function */

  app.startAnalysis = function() {
    tagList = new CK.Model.Tags();
    tagList.on('change', function(model) { console.log(model.changedAttributes()); });   

    //app.taggedContribution.wake(app.config.wakeful.url);

    tagListView = new CK.Mobile.View.TagListView({
      el: jQuery('#tag-list'),
      collection: tagList
    });
    app.tagList.on('reset add', app.tagListView.render);       // probably unnecessary, maybe even a bad idea?

    var sort = ['created_at', 'ASC'];
    app.tagList.fetch({
      data: {
        sort: JSON.stringify(sort)
      }
    });
  };

  app.contributionToTag = function (contribution_id) {
    app.contributionDetails.set('_id', contribution_id);
    app.contributionDetails.fetch({
      success: function () {
        app.taggedContribution = app.contributionDetails;
      }
    });
  };

  app.doneTagging = function() {
    jQuery('.brand').text('Common Knowledge - Notes');
    jQuery('#tag-list').addClass('hide');
    jQuery('#contribution-list').removeClass('hide');

    app.contributionInputView.render();
    jQuery('#tag-submission-container .tag-btn').addClass('disabled');

    //app.contributionDetails = new CK.Model.Contribution();
    //app.contributionDetailsView.model = app.contributionDetails;
    //app.contributionDetailsView.undelegateEvents();
    //app.contributionDetailsView.delegateEvents();    
    //app.contributionDetailsView.render();
  };

  app.startSynthesis = function() {
    // setting done_tagging just in case we missed it
    var dataObj = {'done_tagging':true};
    CK.setStateForUser ("tablet", app.userData.account.login, "contribution_to_tag", dataObj);    
    app.doneTagging();
    
    jQuery('#contribution-details-build-on-btn').addClass('hide');    
    app.synthesisFlag = true;
    jQuery('.brand').text('Common Knowledge - Synthesis');
    Sail.app.contributionInputView.render();
    jQuery('#tag-submission-container .tag-btn').addClass('disabled');
  };

};

CK.Mobile.prototype = new Sail.App();

