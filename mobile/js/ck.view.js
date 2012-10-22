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

      'click #submit-report': 'submit',
      'click #cancel-report': 'cancel'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");

      this.model.on('change', this.render);
    },

    submit: function () {
      // var self = this;

      // jQuery.mobile.showPageLoadingMsg();
      // jQuery('.ui-loader h1').text('Submitting...');
      // // use this once we upgrade to jQuery Mobile 1.2
      // //jQuery.mobile.loading( 'show', { theme: "b", text: "Submitting...", textonly: false });

      // self.model.save(null, {
      //   complete: function () {
      //     // replace failure with msg here?
      //     jQuery.mobile.hidePageLoadingMsg();
      //   },
      //   success: function () {
      //     console.log('Model saved');
      //     //var note = self.model;
      //   },
      //   failure: function(model, response) {
      //     console.log('Error submitting: ' + response);
      //     // check for error codes from Matt
      //     // highligh different required fields based on error codes
      //   }        
      // });
    },

    cancel: function () {
      console.log("Cancelling Contribution...");
      // this.clear();
      // delete veos.reportForm;
      // delete veos.currentReport;
      return true; // will now redirect to clicked element's href
    },

    clear: function () {
      console.log("Clearing ...");
    },

    /**
      Triggers full update of all dynamic elements in the report page.
    **/
    render: function () {
      console.log("rendering ContributionInputView!");
      var view = this;
      _.each(this.attributes, function (attributeValue, attributeName) {
        console.log("Updating "+attributeName+" with val "+attributeValue);
        this.$el.find('.field['+attributeName+']').val(attributeValue);
      });
    }
  });

  CK.view = self;
})(window.CK);