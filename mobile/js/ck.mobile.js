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
    }
  };

  // Global vars - a lot of this stuff can go TODO
  app.userData = null;
  app.currentBuildOn = {};
  app.tagArray = [];
  app.buildOnArray = [];
  app.synthesisFlag = false;
  app.keyCount = 0;
  app.contributionInputView = null;
  app.contributionList = null;
  app.contributionListView = null;

  // app.currentState = {"type":"tablet"};

  // adding view object to global object and instanciate with null
  // this is necessary to ensure view is not created over and over again.
  // having the global pointer at a view allows us to detach a model before we attach a newly created one
  app.inputView = null;
  app.tagListView = null;
  app.taggingView = null;
  app.proposalInputView = null;
  app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);


  app.init = function() {
    Sail.verifyConfig(this.config, this.requiredConfig);
    
    Sail.modules
      // Enable multi-picker login for CommonKnowledge curnit - asking for run (must be linked to curnit)
      .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: 'CommonKnowledge'})
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
    app.hideWaitScreen();
 
    //var stateObj = {"type":"phase"};
    CK.getState("phase", function(s) {
      if (s && s.get('state')) {
        var phase = s.get('state');
        // once phase is retrieved get the user_state
        CK.getUserState(Sail.app.userData.account.login, function(user_state){
          if (phase === 'brainstorm') {
            // check first if we started to work on a contribution and got booted out during work
            // contribution in our name with published false
            var unfinishedContrib = _.find(app.contributionList.models, function(contrib) {
              return contrib.get('author') === Sail.app.userData.account.login && contrib.get('published') === false;
            });

            if (unfinishedContrib) {
              console.log('Unfinished Contribution found');
              app.restoreUnfinishedNote(unfinishedContrib);
            }
          } else if (phase === "analysis") {
            console.log('phase is analysis');
            app.startAnalysis(function (){
              // get the data from user_states stored under the phase key
              var data_for_state = user_state.get(phase);
              
              console.log('Check if contribution left to do or done with tagging');
              // CK.getUserState(Sail.app.userData.account.login, "contribution_to_tag", function(user_state){
              if (data_for_state && data_for_state.contribution_to_tag) {
                // var data_from_state = user_state.get('data');
                if (data_for_state.done_tagging === true) {
                  // go to done tagging
                  app.doneTagging();
                } else if (data_for_state.contribution_to_tag.contribution_id !== "") {
                  console.log('Need to work on contribution with id: '+data_for_state.contribution_to_tag.contribution_id);
                  app.contributionToTag(data_for_state.contribution_to_tag.contribution_id);
                }
              } else {
                console.log('I am on a boat');
              }
            });
          } else if (phase === "proposal") {
            console.log('phase is proposal');
            app.startProposal();            
          } else if (phase === "interpretation") {
            console.log('phase is interpretation');
            app.startInterpretation();
          } else {
            console.log('could not find state for type phase');
          }
        });


  // TODO: This needs much more work
        if (s && s.get('screen_lock') === true){
          console.log('screen lock is active');
          jQuery('#lock-screen').removeClass('hide');
          jQuery('.row').addClass('disabled');
        } else {
          console.log('screen lock is NOT active');
          jQuery('#lock-screen').addClass('hide');
          jQuery('.row').removeClass('disabled');
        }
      } else {
        console.warn("Seems like the state object was invalid which means we are in trouble");
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
          app.trigger('ready');
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

      // Disable logout button
      jQuery('#logout-button').unbind();
      jQuery('#logout-button a').unbind();
      jQuery('#logout-button a').click( function() {
        console.log('reload');
        window.location.reload();
      });

      
      // moved the view init here so that backbone is configured with URLs
      app.initViews();

      app.restoreState();
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

        var contrib = new CK.Model.Contribution(sev.payload);
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
          CK.getUserState(app.userData.account.login, function (user_state){
            // get the analysis value since we should be in analysis state
            var data = user_state.get('analysis');
            data.contribution_to_tag = {'contribution_id': sev.payload.contribution_id};

            user_state.set('analysis', data);
            user_state.save();

            app.contributionToTag(sev.payload.contribution_id);
          });
        }
      },

      done_tagging: function(sev) {
        console.log('done_tagging event heard');
        if (sev.payload.recipient === app.userData.account.login) {
          // store state for restoreState ;)
          CK.getUserState(app.userData.account.login, function (user_state){
            var data = user_state.get('analysis');
            data.done_tagging = true;

            user_state.set('analysis', data);
            user_state.save();

            app.doneTagging();
          });
        }
      },

      start_proposal: function(sev) {
        console.log('start_proposal heard');
        CK.setState("phase", "proposal");
        app.startProposal();
      },

      start_interpretation: function(sev) {
        console.log('start_interpretation heard');
        CK.setState("phase", "interpretation");
        app.startInterpretation();
      }

    }
  };

  /* Outgoing events */

  app.sendContribution = function(kind, model) {
    var sev;
    if (kind === 'newNote' || kind === 'synthesis') {
      sev = new Sail.Event('contribution', model.toJSON());
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
    
    if (app.contributionList === null) {
      // instantiate new contributions collection
      app.contributionList = new CK.Model.Contributions();
      // make collection wakefull (receiving changes form other actors via pub/sub)
      app.contributionList.wake(Sail.app.config.wakeful.url);
    }

    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });

    // check if view already exists
   if (app.contributionListView === null) {
      app.contributionListView = new CK.Mobile.View.ContributionListView({
        el: jQuery('#contribution-list'),
        collection: app.contributionList
      });
    }

    app.contributionList.on('reset add', app.contributionListView.render, app.contributionListView);
    var sort = ['created_at', 'DESC'];
    // var selector = {"author": "matt"};
    app.contributionList.fetch({
      data: { sort: JSON.stringify(sort) }
    });


    // just for testing - do this properly when the view is completed (see also 440)
    jQuery('#like-btn-on').click(function() {
      app.toggleVote();
    });
    jQuery('#like-btn-off').click(function() {
      app.toggleVote();
    });
  };

  app.autoSave = function(view, input_what, user_input, instant_save) {
    //var view = this;
    Sail.app.keyCount++;
    console.log("saving stuff as we go at", Sail.app.keyCount);

    if (instant_save || Sail.app.keyCount > 9) {
      view.model.set(input_what, user_input);
      view.model.save({silent: true});
      Sail.app.keyCount = 0;
    }
  };  

  app.addNote = function(kind) {
    console.log('Creating an inputView');

    var contrib = new CK.Model.Contribution();
    // ensure that models inside the collection are wakeful
    contrib.wake(Sail.app.config.wakeful.url);

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

    contrib.set('justAdded', true);
    contrib.set('author', app.userData.account.login);
    contrib.set('published', false);
    contrib.set('tags', app.tagArray);
    contrib.set('build_ons', app.buildOnArray);
    contrib.set('kind', kind);

    // since we do manual saves, we don't need sync. We don't need both (used to be change and sync)
    contrib.on('change', app.inputView.render, app.inputView);

    contrib.save();

    app.contributionList.add(contrib);
  };

  app.restoreUnfinishedNote = function (contrib) {
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

  app.showDetails = function(contrib) {
    console.log('creating a new Details');

    //var details = new CK.Model.Contribution();      // not sure if we want to create a new model instance here, or just set one view up in initViews and then rebind it to different contribs here...
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

  app.hideAll = function() {
    console.log('hiding all screens');
    jQuery('#wait-screen').addClass('hide');
    jQuery('#lock-screen').addClass('hide');
    jQuery('#index-screen').addClass('hide');
    jQuery('#choose-tag-screen').addClass('hide');
    jQuery('#tagging-screen').addClass('hide');
    jQuery('#proposal-screen').addClass('hide');
  };

  /* State related function */

  app.startAnalysis = function(callback) {
    CK.getUserState(app.userData.account.login, function (user_state){
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
          el: jQuery('#tag-list'),
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
    });
  };

  /* 
    Sends out and event with the tag group the user has chosen and stores the tag_group
    in the states object associated with the student
  */
  app.choseTagGroup = function(tag_name, tag_id) {
    if (typeof tag_name !== 'undefined' && tag_name !== null && tag_name !== '') {
      // create the object that hold the tag_group information
      //var metadata = {"tag_group":tag_name, "tag_group_id":tag_id};
      // save the tag name and id of the chosen tag_group to the student's metadata object
      //CK.setStateForUser("tablet", Sail.app.userData.account.login, "analysis", metadata);
      // WARNING: I don't use setStateForUser here because I only want to send the sail event
      // AFTER the state was written to the MongoDB to avoid problems in the agent
      CK.getUserState(Sail.app.userData.account.login, function (user_state){
        var analysis_obj = user_state.get('analysis');
        analysis_obj.tag_group = tag_name;
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
            Sail.app.groupchat.sendEvent(sev);
            // Show wait screen until agent answers with the contribution to be tagged
            Sail.app.showWaitScreen();
          },
          failure: function(model, response) {
            console.log('Error submitting user_state: ' + response);
          }
        });
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

    if (tagged) {
      CK.getUserState(Sail.app.userData.account.login, function (user_state) {
        var taggedContribution = new CK.Model.Contribution({_id: contributionId});

        function fetchSuccess (contrib) {
          console.log('fetched contribution');
          var data = user_state.get('analysis');
          var new_tag = {'id':data.tag_group_id,'name':data.tag_group,'tagger':app.userData.account.login,'tagged_at':Date()};
          var contrib_tags = taggedContribution.get('tags');
          contrib_tags.push(new_tag);
          taggedContribution.set('tags', contrib_tags);
          taggedContribution.save();

          Sail.app.groupchat.sendEvent(sev);
        }

        function fetchError (err) {
          console.warn('error fetching contribution');
        }

        taggedContribution.fetch({success: fetchSuccess, error: fetchError});
      });
    } else {
      console.log('Contribution: '+contributionId+' not tagged');
      Sail.app.groupchat.sendEvent(sev);
    }
  };

  app.doneTagging = function() {
    app.hideAll();
    app.showWaitScreen();
    // jQuery('#index-screen').removeClass('hide');
    // jQuery('.brand').text('Common Knowledge - Notes');
    // jQuery('#tag-list').addClass('hide');
    // jQuery('#contribution-list').removeClass('hide');
    // jQuery('.row').removeClass('disabled');
    // jQuery('#tag-submission-container .tag-btn').addClass('disabled');
  };

  app.startProposal = function() {
    app.hideWaitScreen();
    // for list view
    CK.setUserState(app.userData.account.login, "proposal", {});     // do we need this?
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
    var proposals = new CK.Model.Proposals();
    proposals.wake(Sail.app.config.wakeful.url);
    proposals.on('add', app.bindProposal);
    proposals.on('reset', function(props) {
      props.each(app.bindProposal);
    });
    proposals.fetch();

    // for grouping view
    var userStates = new CK.Model.UserStates();

    userStates.on('change', function(model) { console.log(model.changedAttributes()); });

    app.groupingView = new CK.Mobile.View.GroupingView({
      el: jQuery('#grouping-screen'),
      collection: userStates
    });
    userStates.on('reset add', app.groupingView.render, app.groupingView);

    function fetchSuccess (m) {
      console.log('fetched user userStates:', userStates);
    }
    function fetchError (err) {
      console.warn('error fetching userStates');
    }

    userStates.fetch({success: fetchSuccess, error: fetchError});
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
      
      prop.on('change:published', function() {
        if (prop.get('published') === true) {
          prop.off();
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
      jQuery().toastmessage('showSuccessToast', "Proposal submitted");
      jQuery('#group-btn').removeClass('disabled');
    } else {
      app.proposalInputView.model.save();
    }
  };

  app.createGroup = function(tagGroupName, tagGroupId) {
    console.log('creating group...');

    var initiator = app.userData.account.login;
    var receiver = jQuery('.user-btn').attr('checked', true).val();

    app.newProposal(initiator, receiver, tagGroupName, tagGroupId);

    // what is the difference between a group and a proposal, really? Each prop has one group, each group has one prop. What about ungrouping?
  };

  app.startInterpretation = function() {

  };

  // TODO - fix me to work properly with views etc (see also initViews section)
  app.toggleVote = function() {
    // set the vote (or whatever) field in the object
    if (jQuery('#like-btn-on').hasClass('hide')) {
      jQuery('#like-btn-on').removeClass('hide');
      jQuery('#like-btn-off').addClass('hide');
    } else {
      jQuery('#like-btn-on').addClass('hide');
      jQuery('#like-btn-off').removeClass('hide');
    }
  };  

};

CK.Mobile.prototype = new Sail.App();

