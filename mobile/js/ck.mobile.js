/*jshint browser: true, devel: true, strict: false, unused:false */
/*globals jQuery, _, Sail, CK, Rollcall */

window.CK = window.CK || {};

CK.Mobile = function() {
  var app = this;

  app.name = "CK.Mobile";

  // Global vars
  app.userData = null;
  app.tagArray = [];
  app.buildOnArray = [];  

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

      // I need to do this call, right? There's no easier way to grab username?
      // Sail.app.rollcall.request(Sail.app.rollcall.url + "/users/"+Sail.app.session.account.login+".json", "GET", {}, function(data) {
      //   console.log("Authenticated user is: ", data);

      //   app.userData = data;
      // });

      // Colin there is already data about the user available
      app.userData = Sail.app.session;

      // moved the view init here so that backbone is configured with URLs
      app.initModels();
      app.initViews();

      // jQuery('#screen-lock').addClass('hide');
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

      toggle_screen_lock: function(sev) {
        console.log('freezing display');

        jQuery('#screen-lock').toggle();
        // do we want to lock down all the screen elements as well
        // TODO - test on tablet... keyboard will make things awkward - maybe use unfocus to solve all these problems? Disabling all fields might work too
      },

      contribution: function(sev) {
        console.log('heard a contribution');

        // contrib = new CK.Model.Contribution(sev.payload);
        // Sail.app.contributionList.add(contrib);
        var sort = ['created_at', 'DESC'];
        // var selector = {"author": "matt"};
        app.contributionList.fetch({
          data: { sort: JSON.stringify(sort) }
        });
      },

      start_student_tagging: function(sev) {
        // console.log('UI: tagging-selection appears');
        console.log('creating TagView');

        // app.tagList = new CK.Model.Tags();
        // app.tagList.on('change', function(model) { console.log(model.changedAttributes()); });        

        // app.contributionList.on('reset add', app.tagListView.render);       // probably unnecessary, maybe even a bad idea?

        //app.contributionList.fetch({
          // data: { 
          //   selector: JSON.stringify({
          //     session: app.run.name
          //   }) 
          // },
          //success: function (tags) {
          // app.tagList = tags; // unlikely to work right - clone?
          // app.tagListView = new CK.Mobile.View.tagListView({
          //   el: jQuery('#tag-list'),
          //   collection: app.tagList
          // });
          //}
        //});

        jQuery('#contribution-list').addClass('hide');
        jQuery('#tag-list').removeClass('hide');
      }

    }
  };

  /* Outgoing events */

  app.sendContribution = function() {
    var sev = new Sail.Event('contribution', app.currentContribution)
    Sail.app.groupchat.sendEvent(sev);
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
    app.contributionList.on('reset add', app.contributionListView.render);        // TODO - damned backbone being too sneak and efficient
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
    
    console.log('creating InputView');
    app.contributionInputView = new CK.Mobile.View.ContributionInputView({
      el: jQuery('#contribution-input'),
      model: app.currentContribution
    });
  };


};

CK.Mobile.prototype = new Sail.App();

