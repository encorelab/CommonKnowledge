/*jshint browser: true, devel: true, debug: true, strict: false, unused:false, undef:true */
/*globals jQuery, _, Sail, CK, Rollcall, Wakeful */

window.CK = window.CK || {};

CK.Mobile = function() {
  var app = this;

  app.name = "CK.Mobile";

  app.requiredConfig = {
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
  app.userState = null;
  app.userData = null;
  app.keyCount = 0;
  app.contribution = null;
  app.inputView = null;
  app.detailsView = null;
  app.contributionList = null;
  app.contributionListView = null;
  app.buildOn = null;
  app.tagList = null;
  app.tagListView = null;
  app.contributionToTagView = null;
  app.bucketedContribution = null;
  app.bucketTaggingView = null;
  app.interestGroupListView = null;
  app.proposalListView = null;
  app.proposal = null;
  app.proposalInputView = null;
  app.proposalDetailsView = null;

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

    // Configure the toasts
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

  app.updateRunState = function() {
    // checking phase status
    app.hideWaitScreen();
    app.hideAll();
    var p = app.runState.get('phase');
    if (p === 'brainstorm') {
      // BRAINSTORM PHASE
      console.log('Switching to brainstorm phase...');
      jQuery('.brand').text('Common Knowledge - Brainstorm');
      jQuery('#index-screen').removeClass('hide');
      app.contributionListView.render();

      // restoring unfinished contribs/buildons
      // will return the first unfinished contrib it finds
      var unfinishedContrib = _.find(app.contributionList.models, function(contrib) {
        return contrib.get('author') === app.userData.account.login && contrib.get('published') === false && (contrib.get('content') || contrib.get('headline'));
      });
      var unfinishedBuildOn = _.find(app.contributionList.models, function(contrib) {
        return _.find(contrib.get('build_ons'), function(b) {
          return b.author === app.userData.account.login && b.published === false && b.content !== "";
        });
      });

      // if there are both unfinished contribs and unfinished buildons, contrib wins (right?)
      if (unfinishedContrib) {
        console.log('Unfinished Contribution found...');
        app.restoreUnfinishedNote(unfinishedContrib);
      } else if (unfinishedBuildOn) {
        console.log('Unfinished BuildOn found...');
        app.restoreUnfinishedBuildOn(unfinishedBuildOn);
      }

    } else if (p === 'tagging') {
      // TAGGING PHASE
      console.log('Entering tagging phase...');
      jQuery('.brand').text('Common Knowledge - Tagging');
      jQuery('#bucket-tagging-screen').removeClass('hide');
      
      //this should happen only on the first pass through (when teacher hits Tagging button)
      var status = app.userState.get('tagging_status');
      if (status === '') {
        app.userState.set('tagging_status','waiting');
        app.userState.save();
      }
      app.updateUserState();
      app.bucketTaggingView.render();

    } else if (p === 'exploration') {

    } else if (p === 'propose') {
      // PROPOSAL PHASE
      console.log('Entering propose phase...');
      jQuery('.brand').text('Common Knowledge - Propose');

      // PROPOSAL VIEW
      if (app.proposalListView === null) {
        app.proposalListView = new CK.Mobile.View.ProposalListView({
          el: jQuery('#proposal-list'),
          collection: app.contributionList
        });
      } else {
        if (typeof app.proposalListView.collection !== 'undefined' && app.proposalListView.collection !== null) {
          app.proposalListView.stopListening(app.proposalListView.collection);
        }
        app.proposalListView.collection = app.contributionList;
      }

      app.updateUserState();
      app.interestGroupListView.render();

    } else {
      console.log("Unknown state...");
    }

    // checking paused status
    if (app.runState.get('paused') === true) {
      console.log('Locking screen...');
      jQuery('#lock-screen').removeClass('hide');
      jQuery('.row').addClass('disabled');      
    } else if (app.runState.get('paused') === false) {
      console.log('Unlocking screen...');
      jQuery('#lock-screen').addClass('hide');
      jQuery('.row').removeClass('disabled');      
    }    
  };

  app.updateUserState = function() {
    console.log('Updating user state...');
    app.hideAll();
    app.hideWaitScreen();

    if (app.runState.get('phase') === 'tagging') {
      var status = app.userState.get('tagging_status');
      if (status === 'waiting' || status === '') {
        // app.userState.set('tagging_status','waiting');
        // app.userState.save();
        app.showWaitScreen();
      } else if (status === 'assigned') {
        jQuery('.brand').text('Common Knowledge - Tagging');
        jQuery('#bucket-tagging-screen').removeClass('hide');
        jQuery('#contribution-to-tag-screen').removeClass('hide');
        app.contributionToTag(app.userState.get('contribution_to_tag'));
      } else if (status === 'done') {
        app.userState.set('tagging_status','done');         // going full retard here - but it works to fix the issue with the agent (by effectively inserting a delay)
        app.userState.save()
          .done(function() {
            jQuery('.brand').text('Common Knowledge - Explore');
            jQuery('#index-screen').removeClass('hide');
            app.contributionListView.render();          
          });
      } else {
        console.error('Unknown tagging status...');
      }
    } else if (app.runState.get('phase') === 'propose') {
      jQuery('#choose-interest-group-screen').removeClass('hide');
      
      // if (!app.userState.get('tag_group') || app.userState.get('tag_group') === '') {
      //   // if user still needs to choose a tag
      //   jQuery('#choose-interest-group-screen').removeClass('hide');
      //   app.interestGroupListView.render();
      // } else {
      //   // if user has already chosen a tag
      //   jQuery('#proposal-screen').removeClass('hide');
      //   app.proposalListView.render();
      // }
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
    }
  };


  app.initModels = function() {
    console.log('Initializing models...');      // TODO: MOVE THESE ALL INTO THEIR OWN FUNCTIONS, THINK ABOUT THEIR ORDERING AND SYNC

    // STATE MODELS
    app.runState = CK.getState('RUN');
    app.runState.wake(Sail.app.config.wakeful.url);
    app.runState.on('change', app.updateRunState);

    app.userState = CK.getState(app.userData.account.login);
    if (!app.userState) {
      app.userState = new CK.Model.State();
      app.userState.set('entity',app.userData.account.login);
      app.userState.set('type','user');
      app.userState.set('tagging_status','');
      app.userState.set('contribution_to_tag','');
      app.userState.save();
    }
    app.userState.wake(Sail.app.config.wakeful.url);
    app.userState.on('change', app.updateUserState);

    // TAGS COLLECTION - used in both BucketTaggingView and ContributionInputView
    app.tagList = CK.Model.awake.tags;
    if (app.bucketTaggingView === null) {
      app.bucketTaggingView = new CK.Mobile.View.BucketTaggingView({
        el: jQuery('#bucket-tagging-screen'),
        collection: app.tagList
      });
    }
    //app.tagList.on('add sync', app.bucketTaggingView.render, app.bucketTaggingView);

    // CHOOSE INTEREST GROUP VIEW
    // case: no previous interestGroupListView
    if (app.interestGroupListView === null) {
      app.interestGroupListView = new CK.Mobile.View.InterestGroupListView({
        el: jQuery('#choose-interest-group-screen'),
        collection: app.tagList
      });
    // case: already have a interestGroupListView with attached model
    } else {
      // detatch that model and attach the current contrib model
      if (typeof app.interestGroupListView.collection !== 'undefined' && app.interestGroupListView.collection !== null) {
        app.interestGroupListView.stopListening(app.interestGroupListView.collection);
      }
      app.interestGroupListView.collection = app.tagList;
    }    

    // CONTRIBUTIONS COLLECTION
    app.contributionList = CK.Model.awake.contributions;
    if (app.contributionListView === null) {
      app.contributionListView = new CK.Mobile.View.ContributionListView({
        el: jQuery('#contribution-list'),
        collection: app.contributionList
      });
    }
    // sort the contributions by reverse created_at
    var sorter = function(contrib) {
      if (contrib.has('created_at')) {
        return -contrib.get('created_at').getTime();
      } else {
        return 0; // this shouldn't happen, but just in case...
      }
    };
    app.contributionList.comparator = sorter;
    app.contributionList.on('add sync change', app.contributionListView.render, app.contributionListView);
    app.contributionList.sortBy(sorter);      // TODO - figure out why the sort doesn't happen before the first render
    app.contributionListView.render();
    
    app.updateRunState();
  };

  app.createNewContribution = function() {
    console.log("Creating a new brainstorm note");

    app.contribution = new CK.Model.Contribution();
    // ensure that models inside the collection are wakeful
    app.contribution.wake(Sail.app.config.wakeful.url);
    app.contribution.on('all',function() { console.log(arguments); });

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

    var d = new Date();
    app.contribution.set('created_at',d);
    app.contribution.set('author', app.userData.account.login);
    app.contribution.set('published', false);
    app.contribution.set('tags', []);
    app.contribution.set('build_ons', []);
    app.contribution.set('kind', 'brainstorm');

    app.contribution.save();
    app.inputView.render();
  };

  app.createNewBuildOn = function() {
    console.log("Creating a new buildOn for", app.contribution);

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
    app.buildOn.created_at = new Date();

    app.inputView.model = app.buildOn;

    var buildOnArray = app.contribution.get('build_ons');
    buildOnArray.push(app.buildOn);

    app.inputView.$el.show('slide', {direction: 'up'});

    app.contribution.save();
    app.inputView.render();
  };

  app.saveContribution = function(view) {
    console.log("Submitting contribution...");
    Sail.app.contribution.wake(Sail.app.config.wakeful.url);
    Sail.app.contribution.save()            //patch:true,    // does this want to switch to patch?
      .done( function() {
        console.log("Contribution saved!");

        jQuery('#contribution-input').hide('slide', {direction: 'up'});
        jQuery().toastmessage('showSuccessToast', "Contribution submitted");

        // I think we need to lock the fields again and force the student to use the new note/build on button
        jQuery('#note-body-entry').addClass('disabled');
        jQuery('#note-headline-entry').addClass('disabled');
        jQuery('.tag-btn').removeClass('active');

        // clear the old contribution plus ui fields
        view.stopListening(Sail.app.contribution);
        // assign new blank model (placeholder until new note or build on buttons have been clicked)
        view.$el.find(".field").val(null);
      })
      .fail( function() {
        console.log('Error submitting');
      });
  };

  app.showDetails = function(contrib) {
    console.log('Creating a new Details...');
    var details = contrib;
    if (app.detailsView === null) {
      app.detailsView = new CK.Mobile.View.ContributionDetailsView({
        el: jQuery('#contribution-details'),
        model: details
      });
    } else {
      if (typeof app.detailsView.model !== 'undefined' && app.detailsView.model !== null) {
        app.detailsView.stopListening(app.detailsView.model);
      }
      app.detailsView.model = details;
    }
    details.on('change', app.detailsView.render, app.detailsView);
    // have to call this manually because there are no change events later
    app.detailsView.render();
  };

  app.restoreUnfinishedNote = function(contrib) {
    console.log("Restoring Contribution");
    app.contribution = contrib;
    app.contribution.set('tags',[]);            // remove all tags to sync up with UI (cheap and easy, but probably not ideal)
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
    // gawd, we need a getMyBuildOn helper TODO
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

  app.contributionToTag = function (contributionId) {
    app.bucketedContribution = Sail.app.contributionList.get(contributionId);
    app.bucketedContribution.wake(Sail.app.config.wakeful.url);
    // check if view exists or not
    if (app.contributionToTagView === null) {
      // create the view, attach to DOM and hand in model
      app.contributionToTagView = new CK.Mobile.View.ContributionToTagView({
        el: jQuery('#contribution-to-tag-screen'),
        model: app.bucketedContribution
      });
    } else {
      // check if view has a model
      if (typeof app.contributionToTagView.model !== 'undefined' && app.contributionToTagView.model !== null) {
        // stop listening to event (avoid multiple reactions)
        app.contributionToTagView.stopListening(app.contributionToTagView.model);
      }
      // overwrite the model with the newly created model
      app.contributionToTagView.model = app.bucketedContribution;
    }
    app.bucketTaggingView.render();
    app.contributionToTagView.render();
  };

  app.saveBucketedContribution = function() {
    console.log("Saving bucketed contribution...");
    // add tags to an array, then set that array to the bucketedContrib
    if (jQuery('#none-btn').hasClass('active')) {
      console.log("No tags to add");
    } else {
      _.each(jQuery('#bucket-tagging-btn-container .active'), function(b) {
        // TODO: do we still have a concept of tagger? Does addTag not do that? So manually?
        app.bucketedContribution.addTag(jQuery(b).data('tag'));          // tag object is embedded in the button
        //console.log(jQuery(b).data('tag').get('name'));
      });
    }
    // re-add the assigned_tagger (since it's not in bucketedContribution)
    app.bucketedContribution.set('assigned_tagger',app.userData.account.login);
    // save the bucketedContrib
    app.bucketedContribution.save();     //null, {patch:true}
    // set status to waiting
    app.userState.set('tagging_status','waiting');
    app.userState.save();
    // clear the fields (there's no real way to do this in the view without stepping on the render)
    jQuery('#bucket-tagging-btn-container .active').removeClass('active');
  };

  app.chooseInterestGroup = function(chosenTagName) {
    console.log('Interest group chosen...');
    app.userState.set('tag_group',chosenTagName);
    app.userState.save();
  };

  app.createNewProposal = function() {
    console.log("Creating a new proposal note...");

    app.proposal = new CK.Model.Proposal();
    // ensure that models inside the collection are wakeful
    app.proposal.wake(Sail.app.config.wakeful.url);
    app.proposal.on('all',function() { console.log(arguments); });

    // case: no previous proposalInputView
    if (app.proposalInputView === null) {
      app.proposalInputView = new CK.Mobile.View.ProposalInputView({
        el: jQuery('#proposal-justification-input'),
        model: app.proposal
      });
    // case: already have an proposalInputView with attached model
    } else {
      // detatch that model and attach the current contrib model
      if (typeof app.proposalInputView.model !== 'undefined' && app.proposalInputView.model !== null) {
        app.proposalInputView.stopListening(app.proposalInputView.model);
      }
      app.proposalInputView.model = app.proposal;
    }

    app.proposalInputView.$el.show('slide', {direction: 'up'});

    var d = new Date();
    var myTag = Sail.app.tagList.find(function(t) { return t.get('name') === app.userState.get('tag_group') });      // TODO: abstract this?
    app.proposal.set('created_at',d);
    app.proposal.set('author', app.userData.account.login);             // change this to some kind of 'team' authorship?
    app.proposal.set('published', false);
    app.proposal.set('headline','');
    app.proposal.set('proposal','');
    app.proposal.set('justification','');
    app.proposal.set('votes',0);
    app.proposal.set('type',null);
    app.proposal.set('tag_group_id',myTag.id);
    app.proposal.set('tag_group_name',myTag.get('name'));

    app.proposal.save();
    app.proposalInputView.render();
  };  

  app.saveProposal = function(view) {
    console.log("Submitting proposal...");
    Sail.app.proposal.wake(Sail.app.config.wakeful.url);      // just in case
    Sail.app.proposal.save()            //patch:true,    // does this want to switch to patch?
      .done( function() {
        console.log("Proposal saved!");

        jQuery('#proposal-justification-input').hide('slide', {direction: 'up'});
        jQuery().toastmessage('showSuccessToast', "Proposal submitted");

        // I think we need to lock the fields again and force the student to use the new note/build on button
        // jQuery('#note-body-entry').addClass('disabled');
        // jQuery('#note-headline-entry').addClass('disabled');

        // clear the old proposal plus ui fields
        view.stopListening(Sail.app.proposal);
        // clear fields
        view.$el.find(".field").val(null);
        jQuery('#proposal-type-btn-container .btn').removeClass('active');
      })
      .fail( function() {
        console.log('Error submitting');
      });
  };

  app.showProposalDetails = function(contrib) {
    console.log('Creating a new Details...');
    // if (contribType === 'brainstorm') {

    // } else if (contribType === 'proposal') {

    // } else {
    //   console.error("Unknown contribution type...")
    // }
    var details = contrib;
    if (app.proposalDetailsView === null) {
      app.proposalDetailsView = new CK.Mobile.View.ProposalDetailsView({
        el: jQuery('#proposal-details'),
        model: details
      });
    } else {
      if (typeof app.proposalDetailsView.model !== 'undefined' && app.proposalDetailsView.model !== null) {
        app.proposalDetailsView.stopListening(app.proposalDetailsView.model);
      }
      app.proposalDetailsView.model = details;
    }
    details.on('change', app.proposalDetailsView.render, app.proposalDetailsView);
    // have to call this manually because there are no change events later
    app.proposalDetailsView.render();
  };

  



  // var proposalsList = null;       // getting late the night before
  // app.startProposal = function() {
  //   app.hideWaitScreen();
  //   // for list view
  //   CK.setState(app.userData.account.login, {proposal: {}});     // do we need this?
  //   console.log('creating ProposalListView');

  //   if (app.contributionList === null) {
  //     app.contributionList = new CK.Model.Contributions();
  //   }

  //   //app.contributionList.wake(app.config.wakeful.url);
  //   app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });    
  //   app.proposalListView = new CK.Mobile.View.ProposalListView({
  //     el: jQuery('#proposal-contribution-list'),
  //     collection: app.contributionList
  //   });
  //   app.contributionList.on('reset add', app.proposalListView.render, app.proposalListView);
  //   var sort = ['created_at', 'DESC'];
  //   app.contributionList.fetch({
  //     data: { sort: JSON.stringify(sort) }
  //   });

  //   // for singular proposal
  //   if (app.proposalInputView === null) {
  //     app.proposalInputView = new CK.Mobile.View.ProposalInputView({
  //       el: jQuery('#proposal-justification-container')
  //     });
  //   }

  //   // for proposal collection
  //   app.proposalsList = new CK.Model.Proposals();
  //   app.proposalsList.wake(Sail.app.config.wakeful.url);
  //   app.proposalsList.on('add', app.bindProposal);
  //   app.proposalsList.on('reset', function(props) {
  //     props.each(app.bindProposal);
  //   });
  //   app.proposalsList.fetch();

  //   // for grouping view
  //   var states = CK.Model.awake.states;

  //   states.on('change', function(model) { console.log(model.changedAttributes()); });

  //   app.groupingView = new CK.Mobile.View.GroupingView({
  //     el: jQuery('#grouping-screen'),
  //     collection: states
  //   });
  //   states.on('reset add', app.groupingView.render, app.groupingView);

  //   function fetchSuccess (m) {
  //     console.log('fetched user states:', states);
  //   }
  //   function fetchError (err) {
  //     console.warn('error fetching states');
  //   }

  //   states.fetch({success: fetchSuccess, error: fetchError});       // this will no longer work with drowsy 0.2.0
  // };

  // app.newProposal = function(initiator, receiver, tagGroupName, tagGroupId) {
  //   // for proposal entry view
  //   var proposal = new CK.Model.Proposal();
  //   proposal.wake(Sail.app.config.wakeful.url);

  //   proposal.on('change', function(model) { console.log(model.changedAttributes()); });    

  //   var groupName = initiator + '-' + receiver;
  //   proposal.set('published', false);
  //   proposal.set('headline_published', false);
  //   proposal.set('proposal_published', false);
  //   proposal.set('justification_published', false);
  //   proposal.set('author', groupName);
  //   proposal.set('initiator', initiator);
  //   proposal.set('receiver', receiver);
  //   proposal.set('tag_group_id', tagGroupId);
  //   proposal.set('tag_group_name', tagGroupName);

  //   proposal.on('reset add', app.proposalInputView.render, app.proposalInputView);

  //   proposal.save();
  // };

  // app.bindProposal = function(prop) {
  //   if (!prop.get('published') && (prop.get('initiator') === Sail.app.userData.account.login || prop.get('receiver') === Sail.app.userData.account.login)) {
  //     // Something added

  //     app.proposalInputView.initialRenderComplete = false;
  //     app.proposalInputView.stopListening(app.proposalInputView.model);
      
  //     // this is really important - will be the model for how we listen to wakeful events, I think
  //     prop.on('change:published', function() {
  //       if (prop.get('published') === true) {
  //         prop.off();
  //         jQuery().toastmessage('showSuccessToast', "Proposal submitted");
  //         jQuery('#group-btn').removeClass('disabled');
  //         jQuery('#group-label-container').text("");
  //       }
  //     });

  //     prop.wake(Sail.app.config.wakeful.url);
  //     prop.on('change', app.proposalInputView.render, app.proposalInputView);

  //     app.proposalInputView.model = prop;
  //     app.proposalInputView.render();
  //   }
  // };


  // app.checkProposalPublishState = function() {
  //   if (app.proposalInputView.model.get('headline_published') === true && app.proposalInputView.model.get('proposal_published') && app.proposalInputView.model.get('justification_published') === true) {
  //     console.log('setting proposal published state to true...');
  //     app.proposalInputView.model.set('published', true);
  //     app.proposalInputView.model.save();
  //   } else {
  //     app.proposalInputView.model.save();
  //   }
  // };

  // app.createGroup = function(receiver, tagGroupName, tagGroupId) {
  //   console.log('creating group...');

  //   var initiator = app.userData.account.login;
  //   app.newProposal(initiator, receiver, tagGroupName, tagGroupId);
  // };

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
    console.log("Showing wait screen...");
    jQuery('#wait-screen').removeClass('hide');
    jQuery('.row').addClass('disabled');
  };

  app.hideWaitScreen = function() {
    console.log("Hiding wait screen...");
    jQuery('#wait-screen').addClass('hide');
    jQuery('.row').removeClass('disabled');
  };

  app.hideAll = function() {
    console.log("Hiding all screens...");
    jQuery('#wait-screen').addClass('hide');
    jQuery('#lock-screen').addClass('hide');
    jQuery('#index-screen').addClass('hide');
    jQuery('#contribution-to-tag-screen').addClass('hide');
    jQuery('#bucket-tagging-screen').addClass('hide');
    jQuery('#choose-interest-group-screen').addClass('hide');
    jQuery('#proposal-screen').addClass('hide');
    jQuery('#proposal-justification-input').addClass('hide');
  };

  app.autoSave = function(model, inputKey, inputValue, instantSave) {
    app.keyCount++;
    //console.log("saving stuff as we go at", app.keyCount);

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
        app.contribution.save(null, {silent:true});
        app.keyCount = 0;
      }
    } else {
      if (instantSave || app.keyCount > 9) {
        model.set(inputKey, inputValue);
        model.save(null, {silent:true});
        app.keyCount = 0;
      }
    }
  };

};

CK.Mobile.prototype = new Sail.App();

