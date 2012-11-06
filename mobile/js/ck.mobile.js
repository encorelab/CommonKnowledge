/*jshint browser: true, devel: true, strict: false, unused:false */
/*globals jQuery, _, Sail, CK, Rollcall */

window.CK = window.CK || {};

CK.Mobile = function() {
  var app = this;

  app.name = "CK.Mobile";

  // Global vars
  app.userData = null;
  app.currentBuildOn = {};
  app.tagArray = [];
  app.buildOnArray = [];
  app.synthesisFlag = false;
  // app.currentState = {"type":"tablet"};

  // TODO: copied from washago code
  app.init = function() {
    Sail.modules
      // Enable multi-picker login for CommonKnowledge curnit - asking for run (must be linked to curnit)
      .load('Rollcall.Authenticator', {mode: 'multi-picker', askForRun: true, curnit: 'CommonKnowledge'})
      .load('Strophe.AutoConnector')
      .load('AuthStatusWidget')
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

  // TODO: copied from washago code
  app.restoreState = function () {
 
    //var stateObj = {"type":"phase"};
    CK.getState("phase", function(s){
      if (s && s.get('state') === "start_student_tagging"){
        console.log('phase is start_student_tagging');
        app.startStudentTagging();

        console.log('Check if contribution left to do or done with tagging');
        CK.getStateForUser("tablet", Sail.app.userData.account.login, "contribution_to_tag", function(user_state){
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
        });
      } if (s && s.get('state') === "start_synthesis") {
        console.log('phase is start_synthesis');
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
      // now we call a class function (configure) and hand in the mongo url and the run name so we don't need
      // to do this config again for each model instantiation
      CK.Model.configure(app.config.mongo.url, app.run.name);

      // Colin there is already data about the user available
      app.userData = Sail.app.session;

      // moved the view init here so that backbone is configured with URLs
      app.initModels();
      app.initViews();
    },

    connected: function(ev) {
      console.log("Connected...");

      app.restoreState();

    },

    sail: {
      // contribution: function(sev) {
      //   console.log('I thought we werent doing it this way');

      //   var contrib = new CK.Model.Contribution({
      //     author: sev.payload.author,
      //     text: sev.payload.text,
      //     tags: sev.payload.tags,
      //     about: sev.payload.about,
      //     discourse: sev.payload.discourse,
      //     timestamp: sev.timestamp,
      //     id: sev.payload.id,
      //     session: app.run.name
      //   });

      //   app.contributions.add(contrib);

      //   // new app.view.ContributionView({model: contrib}).render();
      //   // new CK.Mobile.View.ContributionView({model: contrib}).render();     // am I right?


      //   //addTagToList(new_contribution);
      //   //addAboutToList(new_contribution);                
      //   //addTypeToList(new_contribution);
      //   //writeToDB(new_contribution);
      //   //storeTags(new_contribution.tags);
      // },

      screen_lock: function(sev) {
        console.log('freezing display');

        jQuery('#screen-lock').removeClass('hide');
        jQuery('.row').addClass('disabled');
      },

      screen_unlock: function(sev) {
        console.log('unfreezing display');

        jQuery('#screen-lock').addClass('hide');
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
    app.currentContribution.on('change', function(model) { console.log(model.changedAttributes()); });
    
    app.contributionList = new CK.Model.Contributions();
    app.contributionList.on('change', function(model) { console.log(model.changedAttributes()); });

    app.contributionDetails = new CK.Model.Contribution();
    app.contributionDetails.on('change', function(model) { console.log(model.changedAttributes()); });

    app.tagList = new CK.Model.Tags();
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
  };

  app.addNote = function(kind) {
    console.log('Preping to add a note...');

    // just in case
    app.clearModels();

    app.currentContribution.justAdded = true;

    if (app.synthesisFlag) {
      app.currentContribution.kind = 'synthesis';
      app.currentContribution.set('kind','synthesis');             // sloppy - fix me (.kind is the key for a lot of the view)
    } else {
      app.currentContribution.kind = kind;
    }

    app.currentContribution.on('change sync', app.contributionInputView.render);

    app.currentContribution.set('author', app.userData.account.login);
    app.currentContribution.set('tags', app.tagArray);
    app.currentContribution.set('build_ons', app.buildOnArray);

    app.contributionInputView.render();
  };

  app.clearModels = function() {
    // clear all the old garbage out of the model, rebind
    app.currentContribution = new CK.Model.Contribution();
    app.contributionInputView.model = app.currentContribution;
    app.contributionInputView.undelegateEvents();
    app.contributionInputView.delegateEvents();

    app.currentBuildOn = {};
  };


  /* State related function */

  app.startStudentTagging = function() {
    app.taggedContribution = new CK.Model.Contribution();

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
    app.contributionDetails.id = contribution_id;
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

    //app.contributionDetails = new CK.Model.Contribution();
    //app.contributionDetailsView.model = app.contributionDetails;
    //app.contributionDetailsView.undelegateEvents();
    //app.contributionDetailsView.delegateEvents();    
    //app.contributionDetailsView.render();
  };

  app.startSynthesis = function() {
    // TODO - set done_tagging just in case
    app.synthesisFlag = true;
    jQuery('.brand').text('Common Knowledge - Synthesis');
    Sail.app.contributionInputView.render();                  // do I need to do fetch? 
  };

  // app.storeState = function(stateObj) {
  //   console.log('Storing state '+stateObj.state+' for tablet');

  //   jQuery.ajax({
  //     type: "POST",
  //     url: Sail.app.config.mongo.url +'/'+ Sail.app.run.name +'/states/',
  //     data: JSON.stringify(stateObj),
  //     // handing in the context is very important to fill the
  //     // right table cell with the corresponding result - async
  //     // call in loop!!
  //     context: this,
  //     success: function(data) {
  //       console.log('Success storing state in DB');
  //       return true;
  //     },
  //     error: function(data) {
  //       console.log("Call to Drowsy failed with error: "+data);
  //       return false;
  //     }
  //   }); // end of ajax
  // };

  // app.retrieveState = function(selector, successCallback, errorCallback) {
  //   console.log('Retrieving state for tablet');

  //   // jQuery.ajax({
  //   //   type: "GET",
  //   //   url: Sail.app.config.mongo.url +'/'+ Sail.app.run.name +'/states/?selector='+JSON.stringify(selector),
  //   //   // data: JSON.stringify({"username":username, "type":"tablet", "state":state}),
  //   //   // handing in the context is very important to fill the
  //   //   // right table cell with the corresponding result - async
  //   //   // call in loop!!
  //   //   context: this,
  //   //   success: successCallback,
  //   //   error: errorCallback
  //   // }); // end of ajax
  //   // type = selector.type;
  //   //CK.getState(type, successCallback);
  // };


};

CK.Mobile.prototype = new Sail.App();

