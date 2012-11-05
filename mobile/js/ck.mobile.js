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
    this.contributions = new CK.Model.Contributions();

    this.contributions.on('add', function (contrib) {
      // addTagToList(contrib);
      // addTypeToList(contrib);
      // addAboutToList(contrib);
    });

    this.contributions.on('reset', function (collection) {
      collection.each(function (contrib) {
        // addTagToList(contrib);
        // addTypeToList(contrib);
        // addAboutToList(contrib);
      });
    });

    this.restoreContributions();

    var stateObj = {"type":"phase"};
    app.retrieveState(stateObj, 
      function(data) {
        console.log('Success retrieving state from DB '+data);
        if (data.length >= 1) {                            
          console.log("Current phase: "+data[0].state);
          // app.currentState = data[0];
          if (_.first(data).state === "start_student_tagging") {
            // TODO go to the right position, aka call a function?
            app.startStudentTagging();

            var stateObjContrib = {"type":"tablet","username":Sail.app.userData.account.login,"state":_.first(data).state};
            app.retrieveState(stateObjContrib,
              function(data) {
                console.log('Success retrieving state from DB '+data);
                if (data.length >= 1) {                            
                  console.log("Contribution ID to work on: "+_.first(data).contribution_id);
                  
                  app.contributionDetails.id = _.first(data).contribution_id;
                  app.contributionDetails.fetch({
                    success: function () {
                      app.taggedContribution = app.contributionDetails;
                      //Sail.app.contributionDetailsView.render();            // why do I need to call render here? Already bound to reset
                    }
                  });
                  return true;
                }
                else {
                  console.log("No state found");
                  return true;
                }
              },
              function (data) {
                console.log("Call to Drowsy failed with error: "+data);
                return false;
              }
            );
          }
          return true;
        }
        else {
          console.log("No state found");
          // stateObj.state = "beginning";
          // app.storeState(stateObj);
          return true;
        }
      },
      function (data) {
        console.log("Call to Drowsy failed with error: "+data);
        return false;
      }
    );
  };

  app.restoreContributions = function () {
    this.contributions.fetch({
      data: { 
        selector: JSON.stringify({
          session: app.run.name
        }) 
      },
      success: function (contributions) {
        contributions.each(function (contrib) {
          new CK.Mobile.View.ContributionListView({model: contrib}).render();         // TODO - check me, I'm not right
        });
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
        // do we want to lock down all the screen elements as well
        // TODO - test on tablet... keyboard will make things awkward - maybe use unfocus to solve all these problems? Disabling all fields might work too
      },

      screen_unlock: function(sev) {
        console.log('unfreezing display');

        jQuery('#screen-lock').addClass('hide');
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
        // TODO make sure the state is only stored once per user
        var stateObj = {"type":"phase"};
        app.retrieveState(stateObj,
          function(data) {
            console.log('Success retrieving state from DB '+data);
            if (data.length >= 1) {                            
              console.log("Current state of tablets: "+_.first(data).state);
              // app.currentState = data[0];
              if (_.first(data).state !== "start_student_tagging") {
                _.first(data).state = "start_student_tagging";
                app.storeState(_.first(data));
              }
              return true;
            }
            else {
              console.log("No state found");
              stateObj.state = "start_student_tagging";
              app.storeState(stateObj);
              return true;
            }
          },
          function (data) {
            console.log("Call to Drowsy failed with error: "+data);
            return false;
          }
        );

        app.startStudentTagging();
      },

      contribution_to_tag: function(sev) {
        console.log('contribution_to_tag heard');
        console.log('id: '+sev.payload.contribution_id);
        
        if (sev.payload.recipient === app.userData.account.login) {
          console.log('name: '+sev.payload.recipient);

          app.contributionDetails.id = sev.payload.contribution_id;
          app.contributionDetails.fetch({
            success: function () {
              app.taggedContribution = app.contributionDetails;
            }
          });

          // store contribution_id for restore state
          var stateObj = {"type":"tablet","username":sev.payload.recipient,"state":"start_student_tagging"};
          app.retrieveState(stateObj,
            function(data) {
              console.log('Success retrieving state from DB '+data);
              if (data.length >= 1) {                            
                console.log("Current state of tablets: "+_.first(data).state);
                // app.currentState = data[0];
                _.first(data).contribution_id = sev.payload.contribution_id;
                app.storeState(_.first(data));
                
                return true;
              }
              else {
                console.log("No state found");
                stateObj.contribution_id = sev.payload.contribution_id;
                app.storeState(stateObj);
                return true;
              }
            },
            function (data) {
              console.log("Call to Drowsy failed with error: "+data);
              return false;
            }
          );
        }

      },

      done_tagging: function(sev) {
        console.log('done_tagging event heard');
        if (sev.payload.recipient === app.userData.account.login) {
          // app.currentState.state = "done_tagging";                        // Armin, check me - this is the place to set state?
          app.doneTagging();
        }
      }



    }
  };

  /* Outgoing events */

  app.sendContribution = function(kind) {
    var sev;
    if (kind === 'newNote') {
      sev = new Sail.Event('contribution', app.currentContribution.toJSON());
    } else if (kind === 'buildOn') {
      sev = new Sail.Event('contribution', app.contributionDetails.toJSON());
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

    // clear all the old garbage out of the model, rebind
    app.currentContribution = new CK.Model.Contribution();
    app.contributionInputView.model = app.currentContribution;
    app.contributionInputView.undelegateEvents();
    app.contributionInputView.delegateEvents();

    app.currentContribution.justAdded = true;
    app.currentContribution.kind = kind;

    app.currentContribution.on('change sync', app.contributionInputView.render);

    app.currentContribution.set('author', app.userData.account.login);
    app.currentContribution.set('tags', app.tagArray);
    app.currentContribution.set('build_ons', app.buildOnArray);

    app.contributionInputView.render();
  };


  /* State related function */

  app.startStudentTagging = function() {
    app.taggedContribution = new CK.Model.Contribution();

    app.tagList = new CK.Model.Tags();
    app.tagList.on('change', function(model) { console.log(model.changedAttributes()); });        

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
  };

  app.doneTagging = function() {
    // I don't create a new view for this, right? I just want to go back to the first view, really....
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

  app.storeState = function(stateObj) {
    console.log('Storing state '+stateObj.state+' for tablet');

    jQuery.ajax({
      type: "POST",
      url: Sail.app.config.mongo.url +'/'+ Sail.app.run.name +'/states/',
      data: JSON.stringify(stateObj),
      // handing in the context is very important to fill the
      // right table cell with the corresponding result - async
      // call in loop!!
      context: this,
      success: function(data) {
        console.log('Success storing state in DB');
        return true;
      },
      error: function(data) {
        console.log("Call to Drowsy failed with error: "+data);
        return false;
      }
    }); // end of ajax
  };

  app.retrieveState = function(selector, successCallback, errorCallback) {
    console.log('Retrieving state for tablet');

    jQuery.ajax({
      type: "GET",
      url: Sail.app.config.mongo.url +'/'+ Sail.app.run.name +'/states/?selector='+JSON.stringify(selector),
      // data: JSON.stringify({"username":username, "type":"tablet", "state":state}),
      // handing in the context is very important to fill the
      // right table cell with the corresponding result - async
      // call in loop!!
      context: this,
      success: successCallback,
      error: errorCallback
    }); // end of ajax
  };


};

CK.Mobile.prototype = new Sail.App();

