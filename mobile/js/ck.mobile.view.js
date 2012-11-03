/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function(CK) {
  var self = {};

  /**
    ListView
  **/
  self.ContributionListView = Backbone.View.extend({
    events: {
      'click .list-item': function (ev) {
        jQuery('#contribution-list .note').removeClass('selected');
        jQuery(ev.target).addClass('selected');

        var contribId = jQuery(ev.target.parentElement).attr('id');

        Sail.app.contributionDetails = Sail.app.contributionList.get(contribId);
        console.log('Clicked contribution: ' + Sail.app.contributionDetails);
        
        Sail.app.contributionDetailsView.render();
      },

      'click #new-note-btn': 'new-note'
    },

    initialize: function () {
      console.log("Initializing ContributionListView...");

      // this.model.on('change', this.render);
      // Sail.app.contributionList.on('reset', function (collection) {
      //   view.render();
      // });
      // Sail.app.contributionList.fetch();
    },

    'new-note': function () {
      console.log("Creating a new note");
      Sail.app.addNote('new');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering ContributionListView!");

      jQuery('#contribution-list li').remove();

      Sail.app.contributionList.each(function(contrib) {
        console.log('headline: ' + contrib.get('headline'));

        //var note = jQuery('li#'+contrib.id);
        note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
        note += "<br /><i class='icon-chevron-right'></i>";
        note += "<span class='author'></span><span class='date'></span></a></li>";
        note = jQuery(note);

        jQuery('#contribution-list .nav-list').append(note);

        note.find('.headline').text(contrib.get('headline'));
        note.find('.author').text(contrib.get('author'));
        note.find('.date').text(' (' + contrib.get('created_at').toLocaleDateString() + ' ' + contrib.get('created_at').toLocaleTimeString() + ')');
      });        
          


      // var view = Sail.app.contributionInputView;
      // _.each(this.attributes, function (attributeValue, attributeName) {
      //   console.log("Updating "+attributeName+" with val "+attributeValue);
      //   view.$el.find('.field['+attributeName+']').val(attributeValue);
      // });
    }

  });


  /**
    DetailsView
  **/
  self.ContributionDetailsView = Backbone.View.extend({
    events: {
      // for most fields - FIXME
      // 'change .field': function (ev) {
      //   var f = jQuery(ev.target);

      //   console.log("Setting "+f.attr("name")+" to "+f.val());
      //   this.model.set(f.attr('name'), f.val());
      //},

      'click #contribution-details-build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing ContributionDetailsView...");

      this.model.on('change', this.render);
    },

    'build-on': function () {
      console.log("Creating a build-on note");
      Sail.app.addNote('build-on');
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionDetailsView!");

      jQuery('#contribution-details .field').text('');

      jQuery('#contribution-details .note-headline').text(Sail.app.contributionDetails.get('headline'));
      jQuery('#contribution-details .note-body').text(Sail.app.contributionDetails.get('content'));
      jQuery('#contribution-details .note-author').text('~'+Sail.app.contributionDetails.get('author'));
      jQuery('#contribution-details .note-created-at').text(' (' + Sail.app.contributionDetails.get('created_at').toLocaleDateString() + ' ' + Sail.app.contributionDetails.get('created_at').toLocaleTimeString() + ')');

      // var view = Sail.app.contributionDetailsView;
      // _.each(Sail.app.contributionDetails.attributes, function (attributeValue, attributeName) {
      //   console.log("Updating "+attributeName+" with val "+attributeValue);
      //   view.$el.find('.field['+attributeName+']').val(attributeValue);
      // });
    }
  });


  /**
    InputView
  **/
  self.ContributionInputView = Backbone.View.extend({
    events: {
      // for most fields
      'change .field': function (ev) {
        var f = jQuery(ev.target);

        console.log("Setting "+f.attr("name")+" to "+f.val());
        this.model.set(f.attr('name'), f.val());
      },

      'click #share-note-btn': 'share',
      //'click #cancel-note-btn': 'cancel'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");

      this.model.on('change', this.render);
    },

    share: function () {
      if (Sail.app.currentContribution.has('content') && Sail.app.currentContribution.has('headline')) {
        console.log("Submitting contribution...");
        // var self = this;

        Sail.app.currentContribution.save(null, {
          complete: function () {
            console.log('Submitted!');

          },
          success: function () {
            console.log('Model saved');
            Sail.app.sendContribution('newNote');
            //var note = self.model;

            // clear the old contribution plus ui fields
            Sail.app.currentContribution.clear();
            Sail.app.contributionInputView.$el.find(".field").val(null);
            Sail.app.currentContribution.justAdded = false;
            Sail.app.contributionInputView.render();

            alert('Contribution submitted');
          },
          failure: function(model, response) {
            console.log('Error submitting: ' + response);       // do we want this as an alert instead?
          }
        });
      }

      if (Sail.app.taggedContribution.attributes.tags.length > 0) {
        console.log("Submitting tagged contribution...");
        Sail.app.taggedContribution.save(null, {
          complete: function () {
            console.log('Submitted!');
          },
          success: function () {
            console.log('Model saved');
            Sail.app.sendContribution('taggedNote');

            Sail.app.taggedContribution.clear();

            alert('Tagged note submitted');
          },
          failure: function(model, response) {
            console.log('Error submitting: ' + response);
          }
        });
      }

      if (!(Sail.app.currentContribution.has('content') && Sail.app.currentContribution.has('headline')) && (Sail.app.currentContribution.justAdded === true)) {
        alert('Please enter both a note and a headline');           // should we switch these all to the nice toasts that MikeM was using in Washago?
      }
    },

    // cancel: function () {
    //   console.log("Cancelling contribution...");

    //   // clear the old contribution plus ui fields
    //   Sail.app.currentContribution.clear();
    //   Sail.app.contributionInputView.$el.find(".field").val(null);
    //   // enable text entry
    //   jQuery('#note-body-entry').addClass('disabled');
    //   jQuery('#note-headline-entry').addClass('disabled');
    // },

    /**
      Triggers full update of all dynamic elements in the input view
    **/
    render: function () {
      console.log("rendering ContributionInputView...");

      if (Sail.app.currentContribution.justAdded) {
        jQuery('#note-body-entry').removeClass('disabled');
        jQuery('#note-headline-entry').removeClass('disabled');

        if (Sail.app.currentContribution.kind === 'new') {
          jQuery('#note-body-label').text('New Note');

        } else if (Sail.app.currentContribution.kind === 'build-on') {
          jQuery('#note-body-label').text('Build On Note');
          // TODO - make buildons actually build on

        } else {
          console.log('unknown note type');
        }  
      } else {
        jQuery('#note-body-entry').addClass('disabled');
        jQuery('#note-headline-entry').addClass('disabled');
      }

      var view = Sail.app.contributionInputView;
      _.each(this.attributes, function (attributeValue, attributeName) {
        console.log("Updating "+attributeName+" with val "+attributeValue);
        view.$el.find('.field['+attributeName+']').val(attributeValue);
      });
    }
  });


  /**
    TagListView
  **/
  self.TagListView = Backbone.View.extend({
    // FIX THE LIs SO THAT THEY'RE ALL CLICKABLE IN CONTLISTVIEW
    events: {
      'click .tag-btn': function (ev) {
        // console.log('id: '+ev.target.id);

        var tag = jQuery(ev.target).data('tag')
        if (Sail.app.taggedContribution.hasTag(tag)) {
          Sail.app.taggedContribution.removeTag(tag);          
        } else {
          Sail.app.taggedContribution.addTag(tag, Sail.app.userData.account.login);
        }

        if (Sail.app.taggedContribution.attributes.tags.length > 0) {
          jQuery('#share-note-btn').removeClass('disabled');
        } else {
          jQuery('#share-note-btn').addClass('disabled');
        }
          
        //var contribId = jQuery(ev.target.parentElement).attr('id');

        //Sail.app.contributionDetails = Sail.app.contributionList.get(contribId);
        ///console.log('Clicked contribution: ' + Sail.app.contributionDetails);
        
        //Sail.app.contributionDetailsView.render();
        
        // var f = jQuery(ev.target);

        // console.log("Setting "+f.attr("name")+" to "+f.val());
        // this.model.set(f.attr('name'), f.val());
      },

      //'click #tag-list-build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing TagListView...");

    },

    // 'build-on': function () {
    //   console.log("Creating a build-on note");
    //   Sail.app.addNote('build-on');
    // },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering TagListView!");

      // metadata up the N/A button
      var naTag = new CK.Model.Tag();
      naTag.set('name', 'N/A');
      jQuery('#na-btn').data('tag',naTag);


      Sail.app.tagList.each(function(tag) {
        console.log('tag: '+tag.get('tag'));

        var tagButton = jQuery('button#'+tag.id);
        // length avoids duplicating (probably a better way to do this in backbone?)
        if (tagButton.length === 0) {
          tagButton = jQuery('<button id='+tag.id+' type="button" class="btn tag-btn btn-warning"></button>');
          tagButton = jQuery(tagButton);
          jQuery('#tag-list .tag-btn-group').append(tagButton);
        }

        tagButton.text(tag.get('name'));

        // add tagger and store the tag object in the button for later
        tag.set('tagger',Sail.app.userData.account.login);
        tagButton.data('tag',tag);

      });
    }

  });

  /**
    Helper functions
  **/

  // self.addNote = function(type) {
  //   console.log('Preping to add a note...');

  //   Sail.app.currentContribution = new CK.Model.Contribution();
  //   do bindings

  //   // clear the old contribution plus ui fields
  //   Sail.app.currentContribution.clear();
  //   Sail.app.contributionInputView.$el.find(".field").val(null);
  //   // enable text entry
  //   jQuery('#note-body-entry').removeClass('disabled');
  //   jQuery('#note-headline-entry').removeClass('disabled');
    
  //   Sail.app.currentContribution.set('author', Sail.app.userData.account.login);
  //   Sail.app.currentContribution.set('tags', Sail.app.tagArray);
  //   Sail.app.currentContribution.set('build_ons', Sail.app.buildOnArray);    

  //   if (type === 'new') {
  //     jQuery('#note-body-label').text('New Note');

  //   } else if (type === 'build-on') {
  //     jQuery('#note-body-label').text('Build On Note');
  //     // TODO - make buildons actually build on

  //   } else {
  //     console.log('unknown note type');
  //   }
  // };


  CK.Mobile.View = self;
})(window.CK);