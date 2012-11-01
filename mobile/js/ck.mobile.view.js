/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function(CK) {
  var self = {};

  /**
    ListView
  **/
  self.ContributionListView = Backbone.View.extend({
    events: {
      // for most fields
      'click .list-item': function (ev) {
        jQuery('#contribution-list .note').removeClass('selected');
        jQuery(ev.target).addClass('selected');

        var contribId = jQuery(ev.target.parentElement).attr('id');

        Sail.app.contributionDetails = Sail.app.contributionList.get(contribId);
        console.log('Clicked contribution: ' + Sail.app.contributionDetails);
        
        Sail.app.contributionDetailsView.render();
        
        // var f = jQuery(ev.target);

        // console.log("Setting "+f.attr("name")+" to "+f.val());
        // this.model.set(f.attr('name'), f.val());
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
      console.log("Time for a new note!");

      jQuery('#note-body-label').text('New Note');

      // clear the old contribution plus ui fields
      Sail.app.currentContribution.clear();
      Sail.app.contributionInputView.$el.find(".field").val(null);
      // enable text entry
      jQuery('#note-body-entry').removeClass('disabled');
      jQuery('#note-headline-entry').removeClass('disabled');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering ContributionListView!");

      //this.collection.each(function(contrib) {
      Sail.app.contributionList.each(function(contrib) {
        console.log('headline: '+contrib.get('headline'));

        var note = jQuery('li#'+contrib.id);
        if (note.length === 0) {
          note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
          note += "<br /><i class='icon-chevron-right'></i>";
          note += "<span class='author'>temp author</span><span class='date'> (temp date)</span></a></li>";
          note = jQuery(note);

          jQuery('#contribution-list .nav-list').append(note);
        }

        note.find('.headline').text(contrib.get('headline'));
        // ...
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

      'click .build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing ContributionDetailsView...");

      this.model.on('change', this.render);
    },

    'build-on': function () {
      console.log("Creating a build-on note");

      jQuery('#note-body-label').text('Build On Note');

      // clear the old contribution plus ui fields
      Sail.app.currentContribution.clear();
      Sail.app.contributionInputView.$el.find(".field").val(null);
      // enable text entry
      jQuery('#note-body-entry').removeClass('disabled');
      jQuery('#note-headline-entry').removeClass('disabled');
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionDetailsView!");

      jQuery('#contribution-details .note-headline').text('');
      jQuery('#contribution-details .note-body').text('');

      jQuery('#contribution-details .note-headline').text(Sail.app.contributionDetails.get('headline'));
      jQuery('#contribution-details .note-body').text(Sail.app.contributionDetails.get('content'));

      // var headline = Sail.app.contributionDetailsView.$el.find('#contribution-details .note-headline');
      // var content = Sail.app.contributionDetailsView.$el.find('#contribution-details .note-body');

      // // clearing fields
      // headline.text('');
      // content.text('');

      // // note that if there are blank fields (which should never happen outside of testing), the previous title stays
      // headline.text(Sail.app.contributionDetails.get('headline'));
      // content.text(Sail.app.contributionDetails.get('content'));

      // var view = Sail.app.contributionInputView;
      // _.each(this.model.attributes, function (attributeValue, attributeName) {
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

      // 'click #share-note-btn': this.share,
      // 'click #cancel-note-btn': this.cancel
      // OR CK.Mobile.View.cancel?
      'click #share-note-btn': 'share',
      'click #cancel-note-btn': 'cancel'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");


      this.model.on('change', this.render);
    },

    share: function () {
      // TODO: Could such a validation be done differently?? (armin asking)
      // [C] - right, maybe it's better to check the model instead of what's on the screen
      if (jQuery('#note-body-entry').val() !== '' && jQuery('#note-headline-entry').val() !== '') {
        console.log("Submitting contribution...");
        // var self = this;

        // adding the author and timestamp - do I need to do some kind of manual thing to add the timestamp TODO
        var timestamp = new Date();
        this.model.set('author', Sail.app.userData.account.login);
        this.model.set('timestamp', timestamp);
        this.model.set('tags', Sail.app.tagArray);
        this.model.set('build_ons', Sail.app.buildOnArray);

        Sail.app.currentContribution.save(null, {
          complete: function () {
            console.log('Submitted!');

          },
          success: function () {
            console.log('Model saved');
            Sail.app.submitContribution();
            //var note = self.model;

            // clear the old contribution plus ui fields
            Sail.app.currentContribution.clear();
            Sail.app.contributionInputView.$el.find(".field").val(null);
            // enable text entry
            jQuery('#note-body-entry').addClass('disabled');
            jQuery('#note-headline-entry').addClass('disabled');
            alert('Contribution submitted');
          },
          failure: function(model, response) {
            console.log('Error submitting: ' + response);       // do we want this as an alert instead?
          }
        });
      } else {
        alert('Please enter both a note and a headline');           // should we switch these all to the nice toasts that MikeM was using in Washago?
      }
    },

    cancel: function () {
      console.log("Cancelling contribution...");

      // clear the old contribution plus ui fields
      Sail.app.currentContribution.clear();
      Sail.app.contributionInputView.$el.find(".field").val(null);
      // enable text entry
      jQuery('#note-body-entry').addClass('disabled');
      jQuery('#note-headline-entry').addClass('disabled');
    },

    /**
      Triggers full update of all dynamic elements in the input view
    **/
    render: function () {
      console.log("rendering ContributionInputView...");
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
    events: {
      // for most fields
      // 'click .list-item': function (ev) {
      //   jQuery('#contribution-list .note').removeClass('selected');
      //   jQuery(ev.target).addClass('selected');

      //   var contribId = jQuery(ev.target.parentElement).attr('id');

      //   Sail.app.contributionDetails = Sail.app.contributionList.get(contribId);
      //   console.log('Clicked contribution: ' + Sail.app.contributionDetails);
        
      //   Sail.app.contributionDetailsView.render();
        
      //   // var f = jQuery(ev.target);

      //   // console.log("Setting "+f.attr("name")+" to "+f.val());
      //   // this.model.set(f.attr('name'), f.val());
      // },

      'click .build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing TagListView...");

      // this.model.on('change', this.render);
      // Sail.app.contributionList.on('reset', function (collection) {
      //   view.render();
      // });
      // Sail.app.contributionList.fetch();
    },

    'build-on': function () {
      // TODO - not nearly finished
      console.log("Creating a build-on note");

      jQuery('#note-body-label').text('Build On Note');

      // clear the old contribution plus ui fields
      Sail.app.currentContribution.clear();
      Sail.app.contributionInputView.$el.find(".field").val(null);
      // enable text entry
      jQuery('#note-body-entry').removeClass('disabled');
      jQuery('#note-headline-entry').removeClass('disabled');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering TagListView!");

      //this.collection.each(function(contrib) {
      Sail.app.tagList.each(function(tag) {
        console.log('tag: '+tag.get('tag'));

        var tag = jQuery('<button type="button" class="btn tag-btn btn-warning"></button>');
        if (tag.length === 0) {
          tag.addClass('tag-'+tag.get('name'));     // may be superfluous, potentially dangerous?
          tag = jQuery(tag);                // can cut this?

          jQuery('#tag-list .tag-btn-group').append(tag);
        }

        tag.text(tag.get('name'));

      });
    }

  });


  CK.Mobile.View = self;
})(window.CK);