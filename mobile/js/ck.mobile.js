/*jshint browser: true, devel: true, strict: false, unused:false */
/*globals jQuery, _, Sail, CK, Rollcall */

window.CK = window.CK || {};

CK.Mobile = function() {
  var app = this;

  app.name = "CK.Mobile";

  // TODO: copied from washago code
  app.init = function() {
    //Sail.app.groupchatRoom = 'washago@conference.' + Sail.app.xmppDomain;

    // TODO: move this out to config.json
    this.username = "roadshow";
    this.password = "roadshow";

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

    authenticated: function(ev) {
      console.log('Authenticated...');
      // now we call a class function (configure) and hand in the mongo url and the run name so we don't need
      // to do this config again for each model instantiation
      CK.Model.configure(app.config.mongo.url, app.run.name);
      // moved the view init here so that backbone is configured with URLs
      app.initModels();
      app.initViews();
    },

    'ui.initialized': function(ev) {
      console.log('ui.initialized!');
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

      contribution: function (sev) {
        console.log('heard a contribution');

        // contrib = new CK.Model.Contribution(sev.payload);
        // Sail.app.contributionList.add(contrib);

        Sail.app.contributionList.fetch();
      }

    }
  };


  /* setup functions */

  app.initModels = function() {
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
    app.contributionList.fetch();

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


  /* Outgoing events */

  app.submitContribution = function() {
    var sev = new Sail.Event('contribution', {
      //author: data.account.login,
      headline: Sail.app.currentContribution.headline,
      content: Sail.app.currentContribution.content
    });

    Sail.app.groupchat.sendEvent(sev);
  };  




  /* Incoming Sail events */

  // app.events.sail = {
  //   test_event: function (sev) {
  //     alert('heard the event');
  //   },

  //   contribution: function (sev) {
  //     console.log('heard a contribution');

  //     Sail.app.contributionListView.render();
  //   }
  // };




};

CK.Mobile.prototype = new Sail.App();

