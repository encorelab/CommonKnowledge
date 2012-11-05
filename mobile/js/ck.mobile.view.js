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
        var note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
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
      Sail.app.addNote('buildOn');
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionDetailsView!");

      jQuery('#contribution-details .field').text('');

      // created_at will return undefined, so need to check it exists...
      if (Sail.app.contributionDetails.get('created_at')) {
        // TODO - do this with a loop instead of manually
        jQuery('#contribution-details-build-on-btn').removeClass('hide');
        jQuery('#contribution-details .note-headline').text(Sail.app.contributionDetails.get('headline'));
        jQuery('#contribution-details .note-body').text(Sail.app.contributionDetails.get('content'));
        jQuery('#contribution-details .note-author').text('~'+Sail.app.contributionDetails.get('author'));
        jQuery('#contribution-details .note-created-at').text(' (' + Sail.app.contributionDetails.get('created_at').toLocaleDateString() + ' ' + Sail.app.contributionDetails.get('created_at').toLocaleTimeString() + ')');

        var buildOnEl = "<hr /><div>";
        _.each(Sail.app.contributionDetails.get('build_ons'), function(o) {
          buildOnEl += o.content + "<br />~" + o.author + " (" + o.created_at + ")" +  "<hr />";
        });

        buildOnEl += "</div>"
        buildOnEl = jQuery(buildOnEl);
        jQuery('#contribution-details .note-build-ons').append(buildOnEl);
      }
    }
  });


  /**
    InputView
  **/
  self.ContributionInputView = Backbone.View.extend({
    events: {
      // for most fields
      'change .field': function (ev) {
        if (Sail.app.currentContribution.kind === 'new') {
          var f = jQuery(ev.target);
          console.log("Setting "+f.attr("name")+" to "+f.val());
          this.model.set(f.attr('name'), f.val());          
        } else if (Sail.app.currentContribution.kind === 'buildOn') {
          console.log('setting build-on values');
          Sail.app.currentBuildOn.content = jQuery('#note-body-entry').val();
          Sail.app.currentBuildOn.author = Sail.app.userData.account.login;
          Sail.app.currentBuildOn.created_at = new Date();
        } else {
          console.log('unknown note type');
        }
      },

      'click .tag-btn': function (ev) {
        var tag = jQuery(ev.target).data('tag');

        // toggle the clicked tag in the model
        if (Sail.app.currentContribution.hasTag(tag)) {
          Sail.app.currentContribution.removeTag(tag);
        } else {
          // due to our deadlines, this is all hideous, and fighting backbone... TODO - fixme when there's more time
          if (tag.get('name') === "N/A") {
            Sail.app.currentContribution.attributes.tags = [];                       // eeeewwwwwwww
            jQuery('.tag-btn').removeClass('active');
          } else {
            var naTag = Sail.app.tagList.find(function(t) { return t.get('name') === "N/A"; } );
            Sail.app.currentContribution.removeTag(naTag);
            jQuery("button:contains('N/A')").removeClass('active');
          }
          Sail.app.currentContribution.addTag(tag, Sail.app.userData.account.login);
        }

        // enable/disable the Share button - dup'd in the render, probably a better way to do this
        if (Sail.app.currentContribution.attributes.tags.length > 0) {
          jQuery('#share-note-btn').removeClass('disabled');
        } else {
          jQuery('#share-note-btn').addClass('disabled');
        }

      },

      'click #share-note-btn': 'share'
      //'click #cancel-note-btn': 'cancel'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");

      this.model.on('change', this.render);
    },

    share: function () {

      // if (!(Sail.app.currentContribution.has('content') && Sail.app.currentContribution.has('headline')) && (Sail.app.currentContribution.justAdded === true)) {
      //   alert('Please enter both a note and a headline');           // should we switch these all to the nice toasts that MikeM was using in Washago?
      // }

      // new note
      if (Sail.app.currentContribution.kind === 'new') {
        if (Sail.app.currentContribution.has('content') && Sail.app.currentContribution.has('headline')) {
          console.log("Submitting contribution...");
          // var self = this;

          Sail.app.currentContribution.save(null, {
            complete: function () {
              console.log('New note submitted!');

            },
            success: function () {
              console.log('Model saved');
              Sail.app.sendContribution('newNote');

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
        } else {
          alert('Please enter both a note and a headline');
        }        
      }
      // tagged contribution - this can only be an else as long as no New Notes on tagging phase
      else if (Sail.app.taggedContribution) {
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
              Sail.app.tagListView.render();
              Sail.app.contributionDetailsView.render();

              alert('Tagged note submitted');
            },
            failure: function(model, response) {
              console.log('Error submitting: ' + response);
            }
          });
        }
      }

      // build-on note
      if (Sail.app.currentContribution.kind === 'buildOn') {
        var buildOnArray = Sail.app.contributionDetails.get('build_ons');
        buildOnArray.push(Sail.app.currentBuildOn);
        //contrib.set('build_ons', buildons)

        Sail.app.contributionDetails.set('build_ons', buildOnArray);
        Sail.app.contributionDetails.save(null, {
          complete: function () {
            console.log('Build on submitted!');
          },
          success: function () {
            console.log('Model saved');
            Sail.app.sendContribution('buildOn');

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

        if (Sail.app.currentContribution.kind === 'new') {
          jQuery('#note-body-label').text('New Note');
          jQuery('#note-body-entry').removeClass('disabled');
          jQuery('#note-headline-entry').removeClass('disabled');          

        } else if (Sail.app.currentContribution.kind === 'buildOn') {
          jQuery('#note-body-label').text('Build On Note');
          jQuery('#note-body-entry').removeClass('disabled');          

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

      // TODO - do this right: make sure model is actually syncing with view instead of manually doing this
      jQuery('#tag-submission-container .tag-btn').removeClass('active');      

      Sail.app.tagList.each(function(tag) {
        var tagButton = jQuery('button#note-tag-'+tag.id);
        // length avoids duplicating (probably a better way to do this in backbone?)
        //if (tagButton.length === 0 && tag.get('name') != "N/A") {
        if (tagButton.length === 0) {
          tagButton = jQuery('<button id=note-tag-'+tag.id+' type="button" class="btn tag-btn btn-warning"></button>');
          tagButton = jQuery(tagButton);
          jQuery('#tag-submission-container').append(tagButton);
        }

        tagButton.text(tag.get('name'));

        // add tagger and store the tag object in the button for later
        tag.set('tagger',Sail.app.userData.account.login);
        tagButton.data('tag',tag);

        // turn button on if previously tagged with this tag
        if (Sail.app.currentContribution.hasTag(tag)) {
          tagButton.addClass('active');
        }
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
        var tag = jQuery(ev.target).data('tag');

        // toggle the clicked tag in the model
        if (Sail.app.taggedContribution.hasTag(tag)) {
          Sail.app.taggedContribution.removeTag(tag);
        } else {
          // due to our deadlines, this is all hideous, and fighting backbone... TODO - fixme when there's more time
          if (tag.get('name') === "N/A") {
            Sail.app.taggedContribution.attributes.tags = [];                       // eeeewwwwwwww
            jQuery('.tag-btn').removeClass('active');
          } else {
            var naTag = Sail.app.tagList.find(function(t) { return t.get('name') === "N/A"; } );
            Sail.app.taggedContribution.removeTag(naTag);
            jQuery("button:contains('N/A')").removeClass('active');
          }
          Sail.app.taggedContribution.addTag(tag, Sail.app.userData.account.login);
        }

        // enable/disable the Share button - dup'd in the render, probably a better way to do this
        if (Sail.app.taggedContribution.attributes.tags.length > 0) {
          jQuery('#share-note-btn').removeClass('disabled');
        } else {
          jQuery('#share-note-btn').addClass('disabled');
        }

      }

      //'click #tag-list-build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing TagListView...");

      // TODO - move this to the render?
      jQuery('.brand').text('Common Knowledge - Tagging');
      jQuery('#contribution-list').addClass('hide');
      jQuery('#tag-list').removeClass('hide');
      jQuery('#share-note-btn').addClass('disabled');      
      
      // metadata up the N/A button if it doesn't already exist, done in init since only want to do it once
      // var naTag = new CK.Model.Tag();
      // naTag.set('name', 'N/A');
      // jQuery('#na-btn').data('tag',naTag);
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

      // clear all buttons
      jQuery('.tag-btn').removeClass('active');

      Sail.app.tagList.each(function(tag) {
        var tagButton = jQuery('button#'+tag.id);
        // length avoids duplicating (probably a better way to do this in backbone?)
        //if (tagButton.length === 0 && tag.get('name') != "N/A") {
        if (tagButton.length === 0) {
          tagButton = jQuery('<button id='+tag.id+' type="button" class="btn tag-btn btn-warning"></button>');
          tagButton = jQuery(tagButton);
          jQuery('#tag-list .tag-btn-group').append(tagButton);
        }

        tagButton.text(tag.get('name'));

        // add tagger and store the tag object in the button for later
        tag.set('tagger',Sail.app.userData.account.login);
        tagButton.data('tag',tag);

        // turn button on if previously tagged with this tag
        if (Sail.app.taggedContribution.hasTag(tag)) {
          tagButton.addClass('active');
        }
      });

      // enable/disable the Share button
      if (Sail.app.taggedContribution.attributes.tags && Sail.app.taggedContribution.attributes.tags.length > 0) {
        jQuery('#share-note-btn').removeClass('disabled');
      } else {
        jQuery('#share-note-btn').addClass('disabled');
      }
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