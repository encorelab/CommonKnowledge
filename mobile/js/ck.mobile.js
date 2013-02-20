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

  // Global vars
  app.userData = null;
  app.currentBuildOn = {};
  app.tagArray = [];
  app.buildOnArray = [];
  app.synthesisFlag = false;
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
      if (s && s.get('state') === "start_student_tagging"){
        console.log('phase is start_student_tagging');
        app.startStudentTagging();

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
        app.startStudentTagging();

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

      // Colin there is already data about the user available
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
      app.initModels();
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

        // contrib = new CK.Model.Contribution(sev.payload);
        // Sail.app.contributionList.add(contrib);
        var sort = ['created_at', 'DESC'];
        // var selector = {"author": "matt"};
        app.contributionList.fetch({
          data: {
            sort: JSON.stringify(sort)
          }
        });
      },

      start_student_tagging: function(sev) {
        console.log('start_student_tagging heard, creating TagView');
        app.startStudentTagging();
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

  app.sendContribution = function(kind) {
    var sev;
    if (kind === 'newNote' || kind === 'synthesis') {
      sev = new Sail.Event('contribution', app.currentContribution.toJSON());
    } else if (kind === 'buildOn') {
      sev = new Sail.Event('build_on', app.contributionDetails.toJSON());
    } else if (kind === 'taggedNote') {
      sev = new Sail.Event('contribution_tagged', app.taggedContribution.toJSON());
    } else {
      console('unknown type of submission, cant send contribution');
      return false;
    }

    Sail.app.groupchat.sendEvent(sev);
    return true;
  };


  /* Helper functions */

  app.initModels = function() {
    console.log('creating Models');
    app.currentContribution = new CK.Model.Contribution();
    app.currentContribution.wake(app.config.wakeful.url);
    app.currentContribution.on('change', function(model) { console.log(model.changedAttributes()); });
    app.currentContribution.on('all', function() { console.log(arguments) });

    app.contributionList = new CK.Model.Contributions();
    //app.contributionList.wake(app.config.wakeful.url);
    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });

    app.contributionDetails = new CK.Model.Contribution();
    //app.contributionDetails.wake(app.config.wakeful.url);
    app.contributionDetails.on('change', function(model) { console.log(model.changedAttributes()); });

    app.tagList = new CK.Model.Tags();
    //app.tagList.wake(app.config.wakeful.url);
    app.tagList.on('change', function(model) { console.log(model.changedAttributes()); });    
  };

  app.initViews = function() {
    console.log('creating ListView');
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

    console.log('creating DetailsView');
    app.contributionDetailsView = new CK.Mobile.View.ContributionDetailsView({
      el: jQuery('#contribution-details'),
      model: app.contributionDetails
    });
    app.contributionDetails.on('reset add', app.contributionDetailsView.render);
    
    console.log('creating InputView');
    app.contributionInputView = new CK.Mobile.View.ContributionInputView({
      el: jQuery('#contribution-input'),
      model: app.currentContribution
    });
    console.log("Views ARE GO!");
  };

  app.addNote = function(kind) {
    console.log('Preping to add a note...');

    // just in case
    app.clearModels();

    app.currentContribution.justAdded = true;

    // if (app.synthesisFlag) {
    //   app.currentContribution.kind = 'synthesis';
    //   app.currentContribution.set('kind','synthesis');             // sloppy - fix me (.kind is the key for a lot of the view)
    // } else {
    //   app.currentContribution.kind = kind;
    // }

    app.currentContribution.set('author', app.userData.account.login);
    app.currentContribution.set('published', false);
    app.currentContribution.set('tags', app.tagArray);
    app.currentContribution.set('build_ons', app.buildOnArray);
    app.currentContribution.set('kind', kind);

    app.currentContribution.on('change sync', app.contributionInputView.render);

    app.currentContribution.save(null, {
      complete: function () {
        console.log('New note submitted!');
      },
      success: function () {
        console.log('Model saved');
      },
      failure: function(model, response) {
        console.log('Error submitting: ' + response);
      }
      // !!!
    });

    app.contributionList.add(app.currentContribution);

    //app.contributionInputView.render();
  };

  app.clearModels = function() {
    // clear all the old garbage out of the model, rebind
    app.currentContribution = new CK.Model.Contribution();
    app.currentContribution.wake(app.config.wakeful.url);
    app.contributionInputView.model = app.currentContribution;
    app.contributionInputView.undelegateEvents();
    app.contributionInputView.delegateEvents();

    app.currentBuildOn = {};
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

  app.startStudentTagging = function() {
    app.taggedContribution = new CK.Model.Contribution();
    //app.taggedContribution.wake(app.config.wakeful.url);

    app.tagListView = new CK.Mobile.View.TagListView({
      el: jQuery('#tag-list'),
      collection: app.tagList
    });
    app.tagList.on('reset add', app.tagListView.render);       // probably unnecessary, maybe even a bad idea?

    var sort = ['created_at', 'ASC'];
    app.tagList.fetch({
      data: {
        sort: JSON.stringify(sort)
      }
      // },
      // success: function() {
      //   app.flag = true;
      // }
    });

    app.contributionInputView.render();
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

