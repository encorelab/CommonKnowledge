/*jshint browser: true, devel: true */
/*globals jQuery, _, Sail */

window.CK = window.CK || {};

(function(CK) {
  var app = _.extend(Sail.App);

  app.prototype.name = "CK.Mobile";

  // TODO: copied from washago code
  app.prototype.init = function() {
    //Sail.app.groupchatRoom = 'washago@conference.' + Sail.app.xmppDomain;

    // TODO: move this out to config.json
    Sail.app.username = "roadshow";
    Sail.app.password = "roadshow";

    Sail.modules
      .load('Strophe.AutoConnector', {mode: 'pseudo-anon'})
      .load('AuthStatusWidget')
      .thenRun(function () {
        Sail.autobindEvents(CK.Mobile);
        jQuery(Sail.app).trigger('initialized');

        //app.createBindings();
        jQuery('#connecting').hide();         // shouldn't this be handled by Sail? This is the wrong place (and maybe the wrong loader)


        return true;
      });

      // do this again after submitting to backend
      this.currentContribution = new CK.Model.Contribution();
  };

  app.prototype.authenticate = function () {
    // TODO: implement me... probalby just copy + modify code from washago?
  };

  // TODO: copied from washago code
  app.prototype.restoreState = function () {
    app.contributions = new app.model.Contributions();

    app.contributions.on('add', function (contrib) {
      // addTagToList(contrib);
      // addTypeToList(contrib);
      // addAboutToList(contrib);
    });

    app.contributions.on('reset', function (collection) {
      collection.each(function (contrib) {
        // addTagToList(contrib);
        // addTypeToList(contrib);
        // addAboutToList(contrib);
      });
    });

    app.restoreContributions();
  };

  app.prototype.restoreContributions = function () {
    this.contributions.fetch({
      data: { 
        selector: JSON.stringify({
          session: app.run.name
        }) 
      },
      success: function (contributions) {
        contributions.each(function (contrib) {
          new app.view.ContributionView({model: contrib})
          .render();
        });
      }
    });
  };

  app.prototype.events = {
    initialized: function (ev) {
      app.authenticate();
    },

    authenticated: function (ev) {
    
    },

    'ui.initialized': function (ev) {
      console.log('ui.initialized! ... creating bindings (whatever that means)');
      this.initViews();
      // this.createBindings();
    },

    connected: function (ev) {
      console.log("Connected...");
      jQuery('#connecting').hide();         // shouldn't this be handled by Sail?

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

  /* non sail code */

  app.prototype.createBindings = function() {
    jQuery('#share-note-button').click(function() {
      console.log('share clicked');
    });

    jQuery('#cancel-note-button').click(function() {
      console.log('cancel clicked');
    });
  };

  app.prototype.initViews = function() {
    self.contributionInputView = new CK.view.ContributionInputView({
      el: jQuery('#contribution-input'),
      model: this.currentContribution
    });
  };

  CK.Mobile = app;
})(window.CK);