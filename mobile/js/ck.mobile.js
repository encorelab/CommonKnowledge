/*jshint browser: true, devel: true */
/*globals jQuery, _, Sail, CK */

window.CK = window.CK || {};

CK.Mobile = function () {
  var app = this;

  app.name = "CK.Mobile";

  // TODO: copied from washago code
  app.init = function() {
    //Sail.app.groupchatRoom = 'washago@conference.' + Sail.app.xmppDomain;

    // TODO: move this out to config.json
    this.username = "roadshow";
    this.password = "roadshow";

    Sail.modules
      .load('Strophe.AutoConnector', {mode: 'pseudo-anon'})
      .load('AuthStatusWidget')
      .thenRun(function () {
        Sail.autobindEvents(app);
        app.trigger('initialized');

        jQuery('#connecting').hide();         // shouldn't this be handled by Sail? This is the wrong place (and maybe the wrong loader)


        return true;
      });

      // do this again after submitting to backend
      app.currentContribution = new CK.Model.Contribution();
      // get some feedback in the console log about the view chaning the model
      app.currentContribution.on('change', function(model) { console.log(model.changedAttributes()) });
  };

  app.authenticate = function () {
    // TODO: implement me... probalby just copy + modify code from washago?

    // TODO: for now we're hard-coding a run name... need to get this from auth
    this.config.run = {name: "ck-alpha1"};
  };

  // TODO: copied from washago code
  app.restoreState = function () {
    this.contributions = new this.model.Contributions();

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
          session: CK.Mobile.run.name
        }) 
      },
      success: function (contributions) {
        contributions.each(function (contrib) {
          new CK.Mobile.view.ContributionView({model: contrib})
          .render();
        });
      }
    });
  };

  app.events = {
    initialized: function (ev) {
      app.authenticate();

      CK.Model.setup(app.config);
    },

    authenticated: function (ev) {
    
    },

    'ui.initialized': function (ev) {
      console.log('ui.initialized!');
      jQuery('#connecting').hide();         // shouldn't this be handled by Sail?

      app.initViews();
    },

    connected: function (ev) {
      console.log("Connected...");

      app.restoreState();

    },

    sail: {
      contribution: function (sev) {
        var contrib = new app.model.Contribution({
          author: sev.payload.author,
          text: sev.payload.text,
          tags: sev.payload.tags,
          about: sev.payload.about,
          discourse: sev.payload.discourse,
          timestamp: sev.timestamp,
          id: sev.payload.id,
          session: app.run.name
        });

        app.contributions.add(contrib);

        new app.view.ContributionView({model: contrib}).render();


        //addTagToList(new_contribution);
        //addAboutToList(new_contribution);                
        //addTypeToList(new_contribution);
        //writeToDB(new_contribution);
        //storeTags(new_contribution.tags);
      }
    }
  };

  /* ck.mobile stuff */

  app.initViews = function() {
    app.contributionInputView = new CK.view.ContributionInputView({
      el: jQuery('#contribution-input'),
      model: app.currentContribution
    });
  };
};

CK.Mobile.prototype = new Sail.App();

