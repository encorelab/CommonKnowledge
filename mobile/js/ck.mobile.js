/*jshint browser: true, devel: true */
/*globals jQuery, _, Sail */

window.CK = window.CK || {};

(function(CK) {
    var app = {};

    app.name = "CK.Mobile";

    // TODO: copied from washago code
    app.init = function() {
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

                // TODO: add click bindings here?

                return true;
            });
    };

    app.authenticate = function () {
        // TODO: implement me... probalby just copy + modify code from washago?
    };

    // TODO: copied from washago code
    app.restoreState = function () {
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

    app.restoreContributions = function () {
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

    app.events = {
        initialized: function (ev) {
            app.authenticate();
        },

        authenticated: function (ev) {
        },

        'ui.initialized': function (ev) {
            
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

                new app.view.ContributionView({model: contrib})
                        .render();


                //addTagToList(new_contribution);
                //addAboutToList(new_contribution);                
                //addTypeToList(new_contribution);
                //writeToDB(new_contribution);
                //storeTags(new_contribution.tags);
            }
        }
    };

    /* code goes here... */

    CK.Mobile = app;
})(window.CK);