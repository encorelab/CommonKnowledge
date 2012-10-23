/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true */
/*global Backbone, _, jQuery */

(function(CK) {
  var self = {};

  /**
    NoteView
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
      'click #share-note-btn': 'share',
      'click #cancel-note-btn': 'cancel'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");

      this.model.on('change', this.render);
    },

    share: function () {
      console.log("Submitting contribution...");
      // var self = this;


      Sail.app.currentContribution.save(null, {
        complete: function () {
          console.log('Submitted!');
        },
        success: function () {
          console.log('Model saved');
          //var note = self.model;
        },
        failure: function(model, response) {
          console.log('Error submitting: ' + response);
        }
      });
    },

    cancel: function () {
      console.log("Cancelling contribution...");

      Sail.app.currentContribution.clear();
      Sail.app.contributionInputView.$el.find(".field").val(null);      // need these to clear fields, render is not sufficient the way it's currently set up
    },

    /**
      Triggers full update of all dynamic elements in the report page.
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