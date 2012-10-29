/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true */
/*global Backbone, _, jQuery */

(function(CK) {
  var self = {};

  /**
    ListView
  **/
  self.ContributionListView = Backbone.View.extend({
    events: {
      // for most fields
      'click .note': function (ev) {
        jQuery('#contribution-list .note').removeClass('selected');         // TODO - am I fighting backbone here?
        jQuery('#'+ev.target.id).addClass('selected');

        Sail.app.contributionDetails = Sail.app.contributionList.get(ev.target.id);
        console.log('Clicked contribution: ' + Sail.app.contributionDetails);
        Sail.app.contributionDetailsView.render();
        
        // var f = jQuery(ev.target);

        // console.log("Setting "+f.attr("name")+" to "+f.val());
        // this.model.set(f.attr('name'), f.val());
      },

      'click #new-note-btn': 'new'
    },

    initialize: function () {
      console.log("Initializing ContributionListView...");
      var view = this;

      // this.model.on('change', this.render);
      Sail.app.contributionList.on('reset', function (collection) {
        view.render();
      });
      Sail.app.contributionList.fetch();
    },

    new: function () {
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


      // TODO - do I really need to attach the id to everything? Can I have the li or a be the only clickable thing?
      Sail.app.contributionList.each(function(contrib) {
        console.log('headline: '+contrib.get('headline'));

        note = "<li><a class='note' id=" + contrib.id + "><span class='headline'>" + contrib.get('headline') + "</span>";
        note += "<br /><i class='icon-chevron-right'></i>";
        note += "<span class='author'>temp author</span><span class='date'> (temp date)</span></a></li>";
        note = jQuery(note);
        jQuery('#contribution-list .nav-list').append(note);
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

      'click #build-on-btn': 'build-on',
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
      
      var headline = Sail.app.contributionDetailsView.$el.find('.note-headline');
      var content = Sail.app.contributionDetailsView.$el.find('.note-body');

      // clearing fields
      headline.text('');
      content.text('');

      // note that if there are blank fields (which should never happen outside of testing), the previous title stays
      headline.text(Sail.app.contributionDetails.get('headline'));
      content.text(Sail.app.contributionDetails.get('content'));

      // var view = Sail.app.contributionInputView;
      // _.each(this.attributes, function (attributeValue, attributeName) {
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
      if (jQuery('#note-body-entry').val() != '' && jQuery('#note-headline-entry').val() != '') {
        console.log("Submitting contribution...");
        // var self = this;

        Sail.app.currentContribution.save(null, {
          complete: function () {
            console.log('Submitted!');
          },
          success: function () {
            console.log('Model saved');
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
      console.log("rendering ContributionInputView!");
      var view = Sail.app.contributionInputView;
      _.each(this.attributes, function (attributeValue, attributeName) {
        console.log("Updating "+attributeName+" with val "+attributeValue);
        view.$el.find('.field['+attributeName+']').val(attributeValue);
      });
    }
  });

  CK.Mobile.View = self;
})(window.CK);