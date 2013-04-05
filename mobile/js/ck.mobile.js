/*jshint browser: true, devel: true, debug: true, strict: false, unused:false, undef:true */
/*globals jQuery, _, Sail, CK, Rollcall, Wakeful */

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
    },
    curnit:'string'
  };

  app.runState = null;
  //app.userState = null;?
  app.contribution = null;
  app.contributionList = null;
  app.contributionListView = null;
  app.inputView = null;
  //app.contributionToBuildOn = null;
  app.buildOn = null;

  app.tagList = null;
  app.tagListView = null;
  app.bucketedContribution = null;
  app.bucketTaggingView = null;

  

  // Global vars - a lot of this stuff can go TODO
  app.userData = null;
  app.currentBuildOn = {};
  app.buildOnArray = [];
  app.synthesisFlag = false;
  app.keyCount = 0;
  app.myTagGroup = null;

  // app.currentState = {"type":"tablet"};

  // adding view object to global object and instanciate with null
  // this is necessary to ensure view is not created over and over again.
  // having the global pointer at a view allows us to detach a model before we attach a newly created one
  
  //app.tagListView = null;
  //app.taggingView = null;
  app.proposalInputView = null;

  // these are both used in Interpretation phase
  app.proposalList = null;
  app.interpretationListView = null;

  app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);


  app.init = function() {
    Sail.verifyConfig(this.config, this.requiredConfig);
    
    Sail.modules
      // Enable multi-picker login for CommonKnowledge curnit - asking for run (must be linked to curnit)
      .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: app.config.curnit})
      .load('Wakeful.ConnStatusIndicator')
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
    // TODO: implement me... probably just copy + modify code from washago?

    // TODO: for now we're hard-coding a run name... need to get this from auth
    //this.config.run = {name: "ck-alpha1", id: 12};
    if (!app.run) {
      Rollcall.Authenticator.requestRun();
    } else {
      Rollcall.Authenticator.requestLogin();
    }
  };

  app.restoreState = function () {
    console.log("Going in to restoreState...");
    app.hideWaitScreen();
 
    //ar s = CK.getState("run", "phase");
    var phase = app.runState.get('phase');

    if (phase) {
      if (phase === 'brainstorm') {
        console.log('Entering brainstorm phase...');

        var unfinishedContrib = _.find(app.contributionList.models, function(contrib) {
          return contrib.get('author') === app.userData.account.login && contrib.get('published') === false && contrib.get('content') && contrib.get('headline');
        });

        var unfinishedBuildOn = _.find(app.contributionList.models, function(contrib) {
          return _.find(contrib.get('build_ons'), function(b) {
            return b.author === app.userData.account.login && b.published === false;
          });
        });

        if (unfinishedContrib) {
          console.log('Unfinished Contribution found...');
          app.restoreUnfinishedNote(unfinishedContrib);
        } else if (unfinishedBuildOn) {                       // I guess we want unfinished contribs to trump unfinished buildons?
          console.log('Unfinished BuildOn found...');
          app.restoreUnfinishedBuildOn(unfinishedBuildOn);
        }
      }
      // var phase = s.get('state');
      // // once phase is retrieved get the user_state
      // var user_state = CK.getState(Sail.app.userData.account.login);

      // if (phase === 'brainstorm') {
      //   // check first if we started to work on a contribution and got booted out during work
      //   // contribution in our name with published false
      //   var unfinishedContrib = _.find(app.contributionList.models, function(contrib) {
      //     return contrib.get('author') === Sail.app.userData.account.login && contrib.get('published') === false;
      //   });

      //   if (unfinishedContrib) {
      //     console.log('Unfinished Contribution found');
      //     app.restoreUnfinishedNote(unfinishedContrib);
      //   }
      // } else if (phase === "analysis") {
      //   console.log('phase is analysis');
      //   app.startAnalysis(function (){
      //     // get the data from user_states stored under the phase key
      //     var data_for_state = user_state.get(phase);
          
      //     console.log('Check if contribution left to do or done with tagging');
      //     // CK.getUserState(Sail.app.userData.account.login, "contribution_to_tag", function(user_state){
      //     if (data_for_state && data_for_state.contribution_to_tag) {
      //       // var data_from_state = user_state.get('data');
      //       if (data_for_state.done_tagging === true) {
      //         // go to done tagging
      //         app.doneTagging();
      //       } else if (data_for_state.contribution_to_tag.contribution_id !== "") {
      //         console.log('Need to work on contribution with id: '+data_for_state.contribution_to_tag.contribution_id);
      //         app.contributionToTag(data_for_state.contribution_to_tag.contribution_id);
      //       }
      //     } else {
      //       console.log('I am on a boat');
      //     }
      //   });
      // } else if (phase === "proposal") {
      //   console.log('phase is proposal');

      //   var myState = CK.getState(Sail.app.userData.account.login);

      //   if (myState) {
      //     app.myTagGroup = myState.get('analysis').tag_group;
      //   } else {
      //     console.warn("No user_state found for ", Sail.app.userData.account.login);
      //   }

      //   app.startProposal();

      // } else if (phase === "interpretation") {
      //   console.log('phase is interpretation');
      //   app.startInterpretation();
      // } else {
      //   console.log('could not find state for type phase');
      // }


      // if (s && s.get('screen_lock') === true){
      //   console.log('screen lock is active');
      //   jQuery('#lock-screen').removeClass('hide');
      //   jQuery('.row').addClass('disabled');
      // } else {
      //   console.log('screen lock is NOT active');
      //   jQuery('#lock-screen').addClass('hide');
      //   jQuery('.row').removeClass('disabled');
      // }
    } else {
      console.warn("Seems like the state object was invalid which means we are in trouble");
    }

 
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

      app.userData = Sail.app.session;

      // now we call a class function (configure) and hand in the drowsy url and the run name so we don't need
      // to do this config again for each model instantiation
      CK.Model.init(app.config.drowsy.url, app.run.name)
      .done(function() {
        Wakeful.loadFayeClient(app.config.wakeful.url)
        .done(function() {
          CK.Model.initWakefulCollections(app.config.wakeful.url)
          .done(function() {
            app.trigger('ready');
          });
        });
      });

      //jQuery('#logout-button').addClass('btn btn-warning').html('<a href="#">Logout</a>');
    },

    connected: function(ev) {
      console.log("Connected...");
    },

    ready: function(ev) {
      // TODO: maybe also wait until we're connected?
      //       currently this just waits until CK.Model is initialized
      console.log("Ready!");

      // Disable logout button
      jQuery('#logout-button').unbind();
      jQuery('#logout-button a').unbind();
      jQuery('#logout-button a').click( function() {
        console.log('reload');
        window.location.reload();
      });

      // moved the view init here so that backbone is configured with URLs
      // this will also call restoreState
      app.initModels();
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

      // contribution: function(sev) {
      //   console.log('heard a contribution');

      //   var contrib = new CK.Model.Contribution(sev.payload);
      //   Sail.app.contributionList.add(contrib);
      //   var sort = ['created_at', 'DESC'];
      //   // var selector = {"author": "matt"};
      //   app.contributionList.fetch({
      //     data: {

      //       sort: JSON.stringify(sort)
      //     }
      //   });
      // },

      start_analysis: function(sev) {
        console.log('start_analysis heard, creating TagView');
        app.startAnalysis(function (){
          console.log('startAnalysis completed');
        });
      },

      contribution_to_tag: function(sev) {
        console.log('contribution_to_tag heard');
        console.log('id: '+sev.payload.contribution_id);
        
        if (sev.payload.recipient === app.userData.account.login) {
          console.log('name: '+sev.payload.recipient);
          // This should happen in analysis (alternatively we could get the state from the db but maybe later)
          var user_state = CK.getState(app.userData.account.login);
          // get the analysis value since we should be in analysis state
          var data = user_state.get('analysis');
          data.contribution_to_tag = {'contribution_id': sev.payload.contribution_id};

          user_state.set('analysis', data);
          user_state.save();

          app.contributionToTag(sev.payload.contribution_id);
        }
      },

      done_tagging: function(sev) {
        console.log('done_tagging event heard');
        if (sev.payload.recipient === app.userData.account.login) {
          // store state for restoreState ;)
          var user_state = CK.getState(app.userData.account.login);
          var data = user_state.get('analysis');
          data.done_tagging = true;

          user_state.set('analysis', data);
          user_state.save();

          app.doneTagging();
        }
      },

      start_proposal: function(sev) {
        console.log('start_proposal heard');
        CK.setState("run", {phase: "proposal"});
        app.startProposal();
      },

      start_interpretation: function(sev) {
        console.log('start_interpretation heard');
        CK.setState("run", {phase: "interpretation"});
        app.startInterpretation();
      }

    }
  };

  /* Outgoing events */

  app.sendContribution = function(kind, model) {
    var sev;
    if (kind === 'brainstorm') {
      sev = new Sail.Event('contribution', model.toJSON());
    } else if (kind === 'buildOn') {
      sev = new Sail.Event('build_on', app.contributionDetails.toJSON());
    } else {
      console.error('unknown type of submission, cant send contribution');
      return false;
    }

    //Sail.app.groupchat.sendEvent(sev);
    return true;
  };


  /* Helper functions */


  app.initModels = function() {
    console.log('Initializing models...');      // TODO: MOVE THESE ALL INTO THEIR OWN FUNCTIONS, THINK ABOUT THEIR ORDERING AND SYNC

    // PHASE MODEL
    //app.runState = CK.getState('RUN');
    app.runState = CK.getState('run');
    app.runState.wake(Sail.app.config.wakeful.url);

    // TAGS COLLECTION - used in both BucketTaggingView and ContributionInputView
    app.tagList = CK.Model.awake.tags; //CHECKME, then remove wakeful call and then do for other collections
    if (app.bucketTaggingView === null) {
      app.bucketTaggingView = new CK.Mobile.View.BucketTaggingView({
        el: jQuery('#bucket-tagging'),
        collection: app.tagList
      });
    }    
    app.tagList.on('change', function(model) { console.log(model.changedAttributes()); });
    app.tagList.on('reset add sync', app.bucketTaggingView.render, app.bucketTaggingView);
    //app.tagList.wake(Sail.app.config.wakeful.url); 
    app.tagList.fetch();


    // CONTRIBUTIONS COLLECTION
    // app.contributionList = new CK.Model.Contributions();
    app.contributionList = CK.Model.awake.contributions;
    // check if view already exists
   if (app.contributionListView === null) {
      app.contributionListView = new CK.Mobile.View.ContributionListView({
        el: jQuery('#contribution-list'),
        collection: app.contributionList
      });
    }
    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });
    app.contributionList.on('reset add sync change', app.contributionListView.render, app.contributionListView);
    //app.contributionList.wake(Sail.app.config.wakeful.url);    
    
    var sort = ['created_at', 'DESC'];
    app.contributionList.fetch({
      data: { sort: JSON.stringify(sort) }
    }).done(function() {
      app.restoreState();
    });
  };

  app.createNewContribution = function() {
    console.log("Creating a new brainstorm note");

    app.contribution = new CK.Model.Contribution();
    // ensure that models inside the collection are wakeful
    app.contribution.wake(Sail.app.config.wakeful.url);

    // case: no previous inputView
    if (app.inputView === null) {
      app.inputView = new CK.Mobile.View.ContributionInputView({
        el: jQuery('#contribution-input'),
        model: app.contribution
      });
    // case: already have an inputView with attached model
    } else {
      // detatch that model and attach the current contrib model
      if (typeof app.inputView.model !== 'undefined' && app.inputView.model !== null) {
        app.inputView.stopListening(app.inputView.model);
      }
      app.inputView.model = app.contribution;
    }

    app.inputView.$el.show('slide', {direction: 'up'});

    app.contribution.set('author', app.userData.account.login);
    app.contribution.set('published', false);
    app.contribution.set('tags', []);
    app.contribution.set('build_ons', []);
    app.contribution.set('kind', 'brainstorm');

    app.contribution.save();
    app.inputView.render();
  };

  app.createNewBuildOn = function() {
    console.log("Creating a new buildOn for", Sail.app.contribution);

    if (app.inputView === null) {
      app.inputView = new CK.Mobile.View.ContributionInputView({
        el: jQuery('#contribution-input')
      });
    } else {
      if (typeof app.inputView.model !== 'undefined' && app.inputView.model !== null) {
        app.inputView.stopListening(app.inputView.model);
      }
    }
    app.buildOn = {};
    app.buildOn.kind = "buildOn";
    app.buildOn.content = '';
    app.buildOn.author = app.userData.account.login;
    app.buildOn.published = false;
    app.buildOn.created_at = 'tempDate';

    app.inputView.model = app.buildOn;

    var buildOnArray = app.contribution.get('build_ons');
    buildOnArray.push(app.buildOn);

    app.inputView.$el.show('slide', {direction: 'up'});

    app.contribution.save();
    app.inputView.render();
  };

  app.saveContribution = function(view) {
    console.log("Submitting contribution...");
    
    Sail.app.contribution.save(null, {
      complete: function () {
        console.log("Contribution submitted");
      },
      success: function () {
        console.log("Contribution saved!");

        jQuery('#contribution-input').hide('slide', {direction: 'up'});
        jQuery().toastmessage('showSuccessToast', "Contribution submitted");

        // I think we need to lock the fields again and force the student to use the new note/build on button
        jQuery('#note-body-entry').addClass('disabled');
        jQuery('#note-headline-entry').addClass('disabled');
        jQuery('.tag-btn').removeClass('active');       // TODO: check, do we also need to unselect/refresh the button or something here?

        // clear the old contribution plus ui fields
        view.stopListening(Sail.app.contribution);
        // assign new blank model (placeholder until new note or build on buttons have been clicked)
        view.$el.find(".field").val(null);
      },
      failure: function(model, response) {
        console.log('Error submitting: ' + response);
      }
    });
  };

  app.restoreUnfinishedNote = function(contrib) {
    console.log("Restoring Contribution");
    app.contribution = contrib;
    if (app.inputView === null) {
      app.inputView = new CK.Mobile.View.ContributionInputView({
        el: jQuery('#contribution-input'),
        model: contrib
      });
    } else {
      if (typeof app.inputView.model !== 'undefined' && app.inputView.model !== null) {
        app.inputView.stopListening(app.inputView.model);
      }
      app.inputView.model = contrib;
    }
    app.inputView.$el.show('slide', {direction: 'up'});

    app.inputView.render();
  };

  app.restoreUnfinishedBuildOn = function(contrib) {
    console.log("Restoring BuildOn");
    app.contribution = contrib;
    // gawd, we need a getMyBuildOn helper
    var buildOnArray = app.contribution.get('build_ons');
    app.buildOn = _.find(buildOnArray, function(b) {
      return b.author === app.userData.account.login && b.published === false;
    });

    if (app.inputView === null) {
      app.inputView = new CK.Mobile.View.ContributionInputView({
        el: jQuery('#contribution-input'),
        model: app.buildOn
      });
    } else {
      if (typeof app.inputView.model !== 'undefined' && app.inputView.model !== null) {
        app.inputView.stopListening(app.inputView.model);
      }
      app.inputView.model = app.buildOn;
    }
    app.inputView.$el.show('slide', {direction: 'up'});

    app.inputView.render();    
  };

  app.showDetails = function(contrib) {
    console.log('creating a new Details');

    //var details = new CK.Model.Contribution();      // not sure if we want to create a new model instance here, or just set one view up in initModels and then rebind it to different contribs here...
    var details = contrib;
    details.on('change', function(model) { console.log(model.changedAttributes()); });

    var detailsView = new CK.Mobile.View.ContributionDetailsView({
      el: jQuery('#contribution-details'),
      model: details
    });
    details.on('change', detailsView.render, detailsView);

    // have to call this manually because there are no change events later
    detailsView.render();
  };

  /* State related function */

  app.startAnalysis = function(callback) {

    // THIS ALL NEEDS TO BE REDONE

    var user_state = CK.getState(app.userData.account.login);
    var analysis_obj = user_state.get('analysis');
    if (!analysis_obj || analysis_obj === null || analysis_obj === "") {
      analysis_obj = {};
      user_state.set('analysis', analysis_obj);
    }
    user_state.save();

    var tagList = new CK.Model.Tags();
    tagList.on('change', function(model) { console.log(model.changedAttributes()); });   

    if (app.tagListView === null) {
      app.tagListView = new CK.Mobile.View.TagListView({
        el: jQuery('#bucket-tagging-btn-container'),
        collection: tagList
      });
    } else {
      if (typeof app.tagListView.collection !== 'undefined' && app.tagListView.collection !== null) {
        app.tagListView.stopListening(app.tagListView.collection);
      }
      app.tagListView.collection = tagList;
    }

    tagList.on('reset add', app.tagListView.render, app.tagListView);       // probably unnecessary, maybe even a bad idea?

    var sort = ['created_at', 'ASC'];
    tagList.fetch({
      data: {
        sort: JSON.stringify(sort)
      }
    });
    callback();    
  };

  /* 
    Sends out and event with the tag group the user has chosen and stores the tag_group
    in the states object associated with the student and now also in the myTagGroup var
  */
  app.choseTagGroup = function(tag_name, tag_id) {
    if (typeof tag_name !== 'undefined' && tag_name !== null && tag_name !== '') {
      // create the object that hold the tag_group information
      //var metadata = {"tag_group":tag_name, "tag_group_id":tag_id};
      // save the tag name and id of the chosen tag_group to the student's metadata object
      //CK.setStateForUser("tablet", Sail.app.userData.account.login, "analysis", metadata);
      // WARNING: I don't use setStateForUser here because I only want to send the sail event
      // AFTER the state was written to the MongoDB to avoid problems in the agent
      var user_state = CK.getState(Sail.app.userData.account.login);
      
      var analysis_obj = user_state.get('analysis');
      analysis_obj.tag_group = tag_name;
      
      app.myTagGroup = tag_name;

      analysis_obj.tag_group_id = tag_id;
      user_state.set('analysis', analysis_obj);
      user_state.save(null,
      {
        complete: function () {
          console.log('New user_state submitted!');
        },
        success: function () {
          console.log('State saved');
          // send out and sail event
          var sev = new Sail.Event('chosen_tag_group', analysis_obj);
          //Sail.app.groupchat.sendEvent(sev);
          // Show wait screen until agent answers with the contribution to be tagged
          Sail.app.showWaitScreen();
        },
        failure: function(model, response) {
          console.log('Error submitting user_state: ' + response);
        }
      });
    } else {
      console.warn('choseTagGroup called with empty tag_name');
    }
  };

  /** called via event or restoreState - pulling up the contribution that should be tagged */
  app.contributionToTag = function (contribution_id) {
    // create a new model using an existing ID (get data from backend)
    var contribution_to_tag = new CK.Model.Contribution({_id: contribution_id});
  
    // check if view exists or not
    if (app.taggingView === null) {
      // create the view, attach to DOM and hand in model
      app.taggingView = new CK.Mobile.View.TaggingView({
        el: jQuery('#tagging-screen'),
        model: contribution_to_tag
      });
    } else {
      // check if view has a model
      if (typeof app.taggingView.model !== 'undefined' && app.taggingView.model !== null) {
        // stop listening to event (avoid multiple reactions)
        app.taggingView.stopListening(app.taggingView.model);
      }
      // overwrite the model with the newly created model
      app.taggingView.model = contribution_to_tag;
    }

    // if model changes or syncs render view
    contribution_to_tag.on('change sync', app.taggingView.render, app.taggingView);

    // fetch data
    contribution_to_tag.fetch();
  };

   /** Do the tagging, update DB, send out an sail event */
  app.tagContribution = function (contributionId, tagged) {
    console.log('Contribution <'+contributionId+'> tagged: '+tagged);
    var sail_data = {'contribution_id':contributionId};
    var sev = new Sail.Event('contribution_tagged', sail_data);

    function saveSuccess (m) {
      console.log('contribution saved successfully in tagContribution');
      //Sail.app.groupchat.sendEvent(sev);
    }
    function saveError (err) {
      console.warn('error saving contribution in tagContribution');
    }

    function fetchSuccess (contrib) {
      console.log('fetched contribution');
      var data = user_state.get('analysis');
      var new_tag = {'id':data.tag_group_id,'name':data.tag_group,'tagger':app.userData.account.login,'tagged_at':Date()};
      var contrib_tags = taggedContribution.get('tags');
      contrib_tags.push(new_tag);
      taggedContribution.set('tags', contrib_tags);

      taggedContribution.save(null, {success: saveSuccess, error: saveError});
    }

    function fetchError (err) {
      console.warn('error fetching contribution');
    }

    if (tagged) {
      var user_state = CK.getState(Sail.app.userData.account.login);
      var taggedContribution = new CK.Model.Contribution({_id: contributionId});
      taggedContribution.wake(Sail.app.config.wakeful.url);

      taggedContribution.fetch({success: fetchSuccess, error: fetchError});
    } else {
      console.log('Contribution: '+contributionId+' not tagged');
      //Sail.app.groupchat.sendEvent(sev);
    }
  };

  app.doneTagging = function() {
    app.hideAll();
    app.showWaitScreen();
    // jQuery('#index-screen').removeClass('hide');
    // jQuery('.brand').text('Common Knowledge - Notes');
    // jQuery('#contribution-list').removeClass('hide');
    // jQuery('.row').removeClass('disabled');
    // jQuery('#tag-submission-container .tag-btn').addClass('disabled');
  };

  var proposalsList = null;       // getting late the night before
  app.startProposal = function() {
    app.hideWaitScreen();
    // for list view
    CK.setState(app.userData.account.login, {proposal: {}});     // do we need this?
    console.log('creating ProposalListView');

    if (app.contributionList === null) {
      app.contributionList = new CK.Model.Contributions();
    }

    //app.contributionList.wake(app.config.wakeful.url);
    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });    
    app.proposalListView = new CK.Mobile.View.ProposalListView({
      el: jQuery('#proposal-contribution-list'),
      collection: app.contributionList
    });
    app.contributionList.on('reset add', app.proposalListView.render, app.proposalListView);
    var sort = ['created_at', 'DESC'];
    app.contributionList.fetch({
      data: { sort: JSON.stringify(sort) }
    });

    // for singular proposal
    if (app.proposalInputView === null) {
      app.proposalInputView = new CK.Mobile.View.ProposalInputView({
        el: jQuery('#proposal-justification-container')
      });
    }

    // for proposal collection
    app.proposalsList = new CK.Model.Proposals();
    app.proposalsList.wake(Sail.app.config.wakeful.url);
    app.proposalsList.on('add', app.bindProposal);
    app.proposalsList.on('reset', function(props) {
      props.each(app.bindProposal);
    });
    app.proposalsList.fetch();

    // for grouping view
    var states = CK.Model.awake.states;

    states.on('change', function(model) { console.log(model.changedAttributes()); });

    app.groupingView = new CK.Mobile.View.GroupingView({
      el: jQuery('#grouping-screen'),
      collection: states
    });
    states.on('reset add', app.groupingView.render, app.groupingView);

    function fetchSuccess (m) {
      console.log('fetched user states:', states);
    }
    function fetchError (err) {
      console.warn('error fetching states');
    }

    states.fetch({success: fetchSuccess, error: fetchError});
  };

  app.newProposal = function(initiator, receiver, tagGroupName, tagGroupId) {
    // for proposal entry view
    var proposal = new CK.Model.Proposal();
    proposal.wake(Sail.app.config.wakeful.url);

    proposal.on('change', function(model) { console.log(model.changedAttributes()); });    

    var groupName = initiator + '-' + receiver;
    proposal.set('published', false);
    proposal.set('headline_published', false);
    proposal.set('proposal_published', false);
    proposal.set('justification_published', false);
    proposal.set('author', groupName);
    proposal.set('initiator', initiator);
    proposal.set('receiver', receiver);
    proposal.set('tag_group_id', tagGroupId);
    proposal.set('tag_group_name', tagGroupName);

    proposal.on('reset add', app.proposalInputView.render, app.proposalInputView);

    proposal.save();
  };

  app.bindProposal = function(prop) {
    if (!prop.get('published') && (prop.get('initiator') === Sail.app.userData.account.login || prop.get('receiver') === Sail.app.userData.account.login)) {
      // Something added

      app.proposalInputView.initialRenderComplete = false;
      app.proposalInputView.stopListening(app.proposalInputView.model);
      
      // this is really important - will be the model for how we listen to wakeful events, I think
      prop.on('change:published', function() {
        if (prop.get('published') === true) {
          prop.off();
          jQuery().toastmessage('showSuccessToast', "Proposal submitted");
          jQuery('#group-btn').removeClass('disabled');
          jQuery('#group-label-container').text("");
        }
      });

      prop.wake(Sail.app.config.wakeful.url);
      prop.on('change', app.proposalInputView.render, app.proposalInputView);

      app.proposalInputView.model = prop;
      app.proposalInputView.render();
    }
  };


  app.checkProposalPublishState = function() {
    if (app.proposalInputView.model.get('headline_published') === true && app.proposalInputView.model.get('proposal_published') && app.proposalInputView.model.get('justification_published') === true) {
      console.log('setting proposal published state to true...');
      app.proposalInputView.model.set('published', true);
      app.proposalInputView.model.save();
    } else {
      app.proposalInputView.model.save();
    }
  };

  app.createGroup = function(receiver, tagGroupName, tagGroupId) {
    console.log('creating group...');

    var initiator = app.userData.account.login;
    app.newProposal(initiator, receiver, tagGroupName, tagGroupId);
  };

  // app.startInterpretation = function() {
  //   console.log('creating InterpretationListView');
    
  //   if (app.proposalList === null) {
  //     // instantiate new contributions collection
  //     app.proposalList = new CK.Model.Proposals();
  //     // make collection wakefull (receiving changes form other actors via pub/sub)
  //     app.proposalList.wake(Sail.app.config.wakeful.url);
  //   }

  //   app.proposalList.on('change', function(model) { console.log(model.changedAttributes()); });

  //   // check if view already exists
  //  if (app.interpretationListView === null) {
  //     app.interpretationListView = new CK.Mobile.View.InterpretationListView({
  //       el: jQuery('#contribution-list'),
  //       collection: app.proposalList
  //     });
  //   }

  //   app.proposalList.on('reset add', app.interpretationListView.render, app.interpretationListView);
  //   var sort = ['created_at', 'DESC'];
  //   // var selector = {"author": "matt"};
  //   app.proposalList.fetch({
  //     data: { sort: JSON.stringify(sort) }
  //   });
  // };

  // app.toggleVote = function() {
  //   // set the vote (or whatever) field in the object
  //   if (jQuery('#like-btn-on').hasClass('hide')) {
  //     jQuery('#like-btn-on').removeClass('hide');
  //     jQuery('#like-btn-off').addClass('hide');
  //   } else {
  //     jQuery('#like-btn-on').addClass('hide');
  //     jQuery('#like-btn-off').removeClass('hide');
  //   }
  // };


  // ******** HELPER FUNCTIONS ********* //

  app.showWaitScreen = function() {
    console.log('showing wait screen');

    jQuery('#wait-screen').removeClass('hide');
    jQuery('.row').addClass('disabled');
  };

  app.hideWaitScreen = function() {
    console.log("Hiding wait screen...");

    jQuery('#wait-screen').addClass('hide');
    jQuery('.row').removeClass('disabled');
  };

  app.hideAll = function() {
    console.log('hiding all screens');
    jQuery('#wait-screen').addClass('hide');
    jQuery('#lock-screen').addClass('hide');
    jQuery('#index-screen').addClass('hide');
    jQuery('#choose-tag-screen').addClass('hide');
    jQuery('#tagging-screen').addClass('hide');
    jQuery('#proposal-screen').addClass('hide');
  };

  app.autoSave = function(model, inputKey, inputValue, instantSave) {
    app.keyCount++;
    console.log("saving stuff as we go at", app.keyCount);

    if (model.kind === 'buildOn') {
      if (instantSave || app.keyCount > 9) {
        // save to buildOn model to stay current with view
        app.buildOn = inputValue;
        // save to contribution model so that it actually saves
        var buildOnArray = app.contribution.get('build_ons');
        var buildOnToUpdate = _.find(buildOnArray, function(b) {
          return b.author === app.userData.account.login && b.published === false;
        });
        buildOnToUpdate.content = inputValue;
        app.contribution.set('build_ons',buildOnArray);
        app.contribution.save(null, {silent: true});
        app.keyCount = 0;
      }
    } else {
      if (instantSave || app.keyCount > 9) {
        model.set(inputKey, inputValue);
        model.save(null, {silent: true});
        app.keyCount = 0;
      }
    }
  };

};

CK.Mobile.prototype = new Sail.App();

