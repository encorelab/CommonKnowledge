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

        // The problem here was that ev.target referes to a differently deep nested element 
        var $target = jQuery(ev.target);
        if (!$target.is('.list-item')) {
           $target = $target.parents('.list-item').first();
        }

        // Removing background colors, then adding the correct one
        $target.children().first().addClass('selected');
        var contribId = $target.attr('id');

        Sail.app.showDetails(Sail.app.contributionList.get(contribId));        
      },

      'click #new-note-btn': 'new-note'
    },

    initialize: function () {
      console.log("Initializing ContributionListView...");
    },

    'new-note': function () {
      console.log("UI changes for new note");
      // jQuery('#note-body-entry').removeClass('disabled');
      // jQuery('#note-headline-entry').removeClass('disabled');
      // jQuery('#contribution-list .btn-container').addClass('disabled'); // disable the New Note button
      Sail.app.addNote('new');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering ContributionListView!");
      var view = this,
        created_at;

      jQuery('#contribution-list li').remove();

      _.each(view.collection.models, function(contrib) {
        if (contrib.get('published') === true) {
          console.log('headline: ' + contrib.get('headline'));

          //var note = jQuery('li#'+contrib.id);
          var note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
          note += "<br /><i class='icon-chevron-right'></i>";
          note += "<span class='author'></span><span class='date'></span></a></li>";
          note = jQuery(note);

          jQuery('#contribution-list .nav-list').append(note);

          note.find('.headline').text(contrib.get('headline'));

          // functions toLocaleDateString() and toLocaleTimeString() are only defined if created_at is a Date object
          created_at = new Date(contrib.get('created_at'));  // created_at as Date object
          if (typeof created_at !== 'undefined' && created_at !== null) {
            note.find('.date').text(' (' + created_at.toLocaleDateString() + ' ' + created_at.toLocaleTimeString() + ')');
          }

          note.find('.author').text(contrib.get('author'));               
          if (contrib.get('author') === Sail.app.userData.account.login) {
            note.children().first().addClass('own-color');
          }
          // TODO check if this is working, then add for tags as well, then port to where it's actually relevant
          // _.each(contrib.get('build_ons'), function(b) {
          //    if (contrib.get('author') === Sail.app.userData.account.login) {
          //     note.children().first().addClass('own-color');
          //   }
          // });         
        } else {
          console.log(contrib.id, 'is unpublished');
        }

      });
          
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

      //this.model.on('change', this.render);

      //jQuery('#contribution-details-build-on-btn').removeClass('hide');           // probably readd me later
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
      var view = this,
        created_at;

      jQuery('#contribution-details .field').text('');

      // created_at will return undefined, so need to check it exists... (not sure if this will happen in Beta, might be unnecessary)
      if (view.model && view.model.get('created_at')) {
        // TODO - do this with a loop instead of manually
        jQuery('#contribution-details .note-headline').text(view.model.get('headline'));
        jQuery('#contribution-details .note-body').text(view.model.get('content'));
        jQuery('#contribution-details .note-author').text('~'+view.model.get('author'));

        // functions toLocaleDateString() and toLocaleTimeString() are only defined if created_at is a Date object
        created_at = new Date(view.model.get('created_at'));  // created_at as Date object
        if (typeof created_at !== 'undefined' && created_at !== null) {
          jQuery('#contribution-details .note-created-at').text(' (' + created_at.toLocaleDateString() + ' ' + created_at.toLocaleTimeString() + ')');
        }

        var buildOnEl = "<hr /><div>";
        _.each(view.model.get('build_ons'), function(b) {
          var date = new Date(b.created_at);
          buildOnEl += b.content + "<br />~" + b.author;
          buildOnEl += " (" + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ")" +  "<hr />";
        });

        buildOnEl += "</div>";
        buildOnEl = jQuery(buildOnEl);
        jQuery('#contribution-details .note-build-ons').append(buildOnEl);
      } else {
        console.warn("ContributionDetailsView render skipped this contrib because created_at doesn't exist");
      }
    }
  });


  /**
    InputView
  **/
  self.ContributionInputView = Backbone.View.extend({
    events: {
      'change .field': function (ev) {
        var view = this;
        var f;
        if (view.model.get('kind') === 'new') {
          f = jQuery(ev.target);
          console.log("Setting "+f.attr("name")+" to "+f.val());
          view.model.set(f.attr('name'), f.val());          
        } else if (view.model.get('kind') === 'buildOn') {
          // TODO: accessing currentBuildOn is wrong and object is {} -- empty
          console.log('setting build-on values');
          Sail.app.currentBuildOn.content = jQuery('#note-body-entry').val();
          Sail.app.currentBuildOn.author = Sail.app.userData.account.login;
          var d = new Date();
          Sail.app.currentBuildOn.created_at = d;
          console.log(d);
        } else if (view.model.get('kind') === 'synthesis') {
          f = jQuery(ev.target);
          console.log("Setting "+f.attr("name")+" to "+f.val());
          this.model.set(f.attr('name'), f.val());          
        } else {
          console.log('unknown note type');
        }
      },

      'keyup :input': function (ev) {
        var view = this;
        Sail.app.autoSave(view, ev);
      },

      'click #share-note-btn': 'share'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");
    },

    share: function () {
      var view = this;
      // new note
      if (view.model.get('kind') === 'new' || view.model.get('kind') === 'synthesis') {     // don't think this is needed any more
        if (view.model.has('content') && view.model.has('headline')) {

          view.model.set('published', true);
          console.log("Submitting contribution...");
          
          view.model.save(null, {
            complete: function () {
              console.log('New note submitted!');
            },
            success: function () {
              console.log('Model saved');
              Sail.app.sendContribution('newNote', view.model);             // TODO do we still need this?

              jQuery('#contribution-input').hide('slide', {direction: 'up'});
              jQuery().toastmessage('showSuccessToast', "Contribution submitted");

              // I think we need to lock the fields again and force the student to use the new note button
              jQuery('#note-body-entry').addClass('disabled');
              jQuery('#note-headline-entry').addClass('disabled');
              // jQuery('#contribution-list .btn-container').removeClass('disabled'); // enable the New Note button

              // clear the old contribution plus ui fields
              view.model.clear({silent: true});   // I think this is actually enough now, can do away with clearModels
              view.stopListening(view.model);
              //Sail.app.clearModels();
              view.$el.find(".field").val(null);
              //view.model.set('justAdded', false);
              //Sail.app.contributionInputView.render();
              
            },
            failure: function(model, response) {
              console.log('Error submitting: ' + response);
            }
          });
        } else {
          jQuery().toastmessage('showErrorToast', "Please enter both a note and a headline");
        }        
      }

      // build-on note - can we roll this in to the above now?
      // TODO will need a big overhaul to deal with lack of globals now  
      if (view.model.kind === 'buildOn') {
        var tempBuildOnArray = [];
        // this if shouldn't be necessary (the first condition should always be met), but just in case...
        if (Sail.app.contributionDetails.get('build_ons')) {
          tempBuildOnArray = Sail.app.contributionDetails.get('build_ons');
          tempBuildOnArray.push(Sail.app.currentBuildOn);
          Sail.app.contributionDetails.set('build_ons', tempBuildOnArray);          
        } else {
          tempBuildOnArray = [];
          tempBuildOnArray.push(Sail.app.currentBuildOn);
          Sail.app.contributionDetails.set('build_ons', tempBuildOnArray);
        }

        // FIXME: why isn't this already awake??
        //Sail.app.contributionDetails.wake(Sail.app.config.wakeful.url);
        Sail.app.contributionDetails.save(null, {
          complete: function () {
            console.log('Build on submitted!');
          },
          success: function () {
            console.log('Model saved');
            Sail.app.sendContribution('buildOn');

            // clear the old contribution plus ui fields
            //view.model.clear();
            Sail.app.clearModels();
            Sail.app.contributionInputView.$el.find(".field").val(null);
            view.model.set('justAdded', false);
            Sail.app.contributionInputView.render();
            Sail.app.contributionDetailsView.render();

            jQuery().toastmessage('showSuccessToast', "Contribution submitted");
          },
          failure: function(model, response) {
            console.log('Error submitting: ' + response);       // do we want this as an alert instead?
          }
        });
      }
    },

    /**
      Triggers full update of all dynamic elements in the input view
    **/
    render: function () {
      var view = this;
      console.log("rendering ContributionInputView...");
      var contrib = view.model;

      if (typeof contrib !== 'undefined' && contrib !== null) {
        jQuery('#note-body-entry').removeClass('disabled');
        jQuery('#note-headline-entry').removeClass('disabled');
      }

      if (contrib.get('justAdded')) {
        if (contrib.get('kind') === 'new') {
          jQuery('#note-body-label').text('New Note');
        } else if (contrib.kind === 'buildOn') {
          jQuery('#note-body-label').text('Build On Note');
        } else if (contrib.kind === 'synthesis') {
          jQuery('#note-body-label').text('Synthesis Note');
        } else {
          console.log('unknown note type');
        }
      } 
      // jQuery('#note-body-entry').removeClass('disabled'); CAN THIS BE DELETED?
      // jQuery('#note-headline-entry').removeClass('disabled');
      

      // // TODO: make another view for buildon so I don't have to do all this nonsense
      // jQuery('#note-body-entry').val('');
      // jQuery('#note-headline-entry').val('');

      if (contrib.kind === 'buildOn') {
        jQuery('#note-body-entry').val(Sail.app.currentBuildOn.content);
      } else {
        jQuery('#note-body-entry').val(contrib.get('content'));
        jQuery('#note-headline-entry').val(contrib.get('headline'));
      }
      // else {
      //   console.log('trying to render, but unknown note type');
      // }

      //CK.getState('phase', function(s) {                      // TODO - fix me when model is done
        //if (s && s.get('state') === 'done_tagging') {
          //jQuery('#contribution-details-build-on-btn').addClass('hide');
          // TODO - do this right: make sure model is actually syncing with view instead of manually doing this
          // jQuery('#tag-submission-container .tag-btn').removeClass('active');

          // I THINK THIS CAN ALL GO TOO
          // Sail.app.tagList.each(function(tag) {
          //   var tagButton = jQuery('button#note-tag-'+tag.id);
          //   // length avoids duplicating (probably a better way to do this in backbone?)
          //   //if (tagButton.length === 0 && tag.get('name') != "N/A") {
          //   if (tagButton.length === 0) {
          //     tagButton = jQuery('<button id=note-tag-'+tag.id+' type="button" class="btn tag-btn"></button>');
          //     tagButton = jQuery(tagButton);
          //     jQuery('#tag-submission-container').append(tagButton);
          //   }

          //   tagButton.text(tag.get('name'));

          //   // add tagger and store the tag object in the button for later
          //   tag.set('tagger',Sail.app.userData.account.login);
          //   tagButton.data('tag',tag);

          //   // turn button on if previously tagged with this tag
          //   if (Sail.app.currentContribution.hasTag(tag)) {
          //     tagButton.addClass('active');
          //   }
          // });
        //}
      //});


    } // end of render
  });


  /**
    TagListView
  **/
  self.TagListView = Backbone.View.extend({
    events: {
      'click #tag-list-btn-container .tag-btn': function (ev) {
        var chosenTagId = ev.currentTarget.id;
        var chosenTag = jQuery('#'+chosenTagId).text();
        var ok = confirm("Do you want to choose <"+ chosenTag + "> as your specialization?");
        if (ok) {
          Sail.app.choseTagGroup(chosenTag, chosenTagId);
        }
      }
    },

    initialize: function () {
      console.log("Initializing TagListView...");

      jQuery('.brand').text('Common Knowledge - Analysis');
      jQuery('#index-screen').addClass('hide');
      jQuery('#choose-tag-screen').removeClass('hide');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      var view = this;
      console.log("rendering TagListView!");

      // clear all buttons
      // jQuery('.tag-btn').removeClass('active');

      view.collection.each(function(tag) {
        // don't show the N/A tag
        if (tag.get('name') !== "N/A") {
          var tagButton = jQuery('button#'+tag.id);
          // length avoids duplicating (probably a better way to do this in backbone?)
          //if (tagButton.length === 0 && tag.get('name') != "N/A") {
          if (tagButton.length === 0) {
            tagButton = jQuery('<button id='+tag.id+' type="button" class="btn tag-btn"></button>');
            //tagButton = jQuery(tagButton);
            jQuery('#tag-list .tag-btn-group').append(tagButton);
          }

          tagButton.text(tag.get('name'));
        }
      });
    }

  });

  /**
    TaggingView
    This is where the students are presented with contributions out of the bucket (by agent)
    and they have to decide if the contribution should be tagged with the tag of their tag_group
    or not.
  **/
  self.TaggingView = Backbone.View.extend({
    events: {
      'click #yes-btn': function () {
        var view = this;
        Sail.app.tagContribution(view.model.id, true);
        Sail.app.showWaitScreen();
      },
      'click #no-btn': function () {
        var view = this;
        Sail.app.tagContribution(view.model.id, false);
        Sail.app.showWaitScreen();
      }
    },

    initialize: function () {
      console.log("Initializing TaggingView...");

      jQuery('.brand').text('Common Knowledge - Analysis');
      jQuery('#index-screen').addClass('hide');
      jQuery('#choose-tag-screen').addClass('hide');
      jQuery('#tagging-screen').removeClass('hide');
      Sail.app.hideWaitScreen();
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      var view = this;
      console.log("rendering TaggingView!");
      Sail.app.hideWaitScreen();

      CK.getUserState(Sail.app.userData.account.login, function(user_state) {
        var tag_group = user_state.get('analysis').tag_group;
        jQuery('#selected-tag-container .chosen-tag').text(tag_group);
      });

      var headline = view.model.get('headline');
      var content = view.model.get('content');

      jQuery('#note-to-tag-container .container-header').text(headline);
      jQuery('#note-to-tag-body').text(content);
    }

  });



  // WARNING: do not look directly at this code - it will make your eyes bleed
  var proposalDetails;
  var proposalOpenFlag = false;  
  // The blood prevents me from seeing why the vars are declared here ...

  /**
    ProposalView
  **/
  self.ProposalListView = Backbone.View.extend({
    events: {
      'click .list-item': function (ev) {
        // this may be the wrong way to handle it, should maybe be two views (or maybe two renders in same view?)... oddball UI should have been addressed in design

        // The problem here was that ev.target referes to a differently deep nested element 
        var $target = jQuery(ev.target);
        if (!$target.is('.list-item')) {
           $target = $target.parents('.list-item').first();
        }
        var contribId = $target.attr('id');

        proposalDetails = Sail.app.contributionList.get(contribId);
        proposalOpenFlag = true;

        jQuery('#proposal-contribution-list .list').addClass('hide');
        jQuery('#proposal-contribution-list .selected-note').removeClass('hide'); 

        Sail.app.proposalListView.render();       
      },

      'click #group-btn': 'create-group',

      'click #close-btn': 'close-note'
    },


    initialize: function () {
      console.log("Initializing ProposalView...");

      jQuery('.brand').text('Common Knowledge - Propose and Justify');
      jQuery('#index-screen').addClass('hide');
      jQuery('#choose-tag-screen').addClass('hide');
      jQuery('#tagging-screen').addClass('hide');
      jQuery('#proposal-screen').removeClass('hide');
    },

    'create-group': function () {
      jQuery('.row').addClass('disabled');
      jQuery('#grouping-screen').removeClass('hide');
      Sail.app.groupingView.render();
    },

    'close-note': function () {
      proposalOpenFlag = false;
      jQuery('#proposal-contribution-list .selected-note').addClass('hide');
      jQuery('#proposal-contribution-list .list').removeClass('hide');
    },



    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      if (proposalOpenFlag) {
        jQuery('#proposal-contribution-list .field').text('');

        // created_at will return undefined, so need to check it exists... (not sure if this will happen in Beta, might be unnecessary)
        if (proposalDetails && proposalDetails.get('created_at')) {
          jQuery('#proposal-contribution-list .note-headline').text(proposalDetails.get('headline'));
          jQuery('#proposal-contribution-list .note-body').text(proposalDetails.get('content'));
          jQuery('#proposal-contribution-list .note-author').text('~'+proposalDetails.get('author'));
          jQuery('#proposal-contribution-list .note-created-at').text(' (' + proposalDetails.get('created_at').toLocaleDateString() + ' ' + proposalDetails.get('created_at').toLocaleTimeString() + ')');

          var buildOnEl = "<hr /><div>";
          _.each(proposalDetails.get('build_ons'), function(b) {
            var date = new Date(b.created_at);
            buildOnEl += b.content + "<br />~" + b.author;
            buildOnEl += " (" + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ")" +  "<hr />";
          });

          buildOnEl += "</div>";
          buildOnEl = jQuery(buildOnEl);
          jQuery('#proposal-contribution-list .note-build-ons').append(buildOnEl);
        } else {
          console.warn("ContributionDetailsView render skipped this contrib because created_at doesn't exist");
        }
      } else {
        console.log("rendering ProposalListView!");
        var view = this;

        jQuery('#proposal-contribution-list li').remove();

        _.each(view.collection.models, function(contrib) {
          if (contrib.get('published') === true) {
            console.log('headline: ' + contrib.get('headline'));

            var note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
            note += "<br /><i class='icon-chevron-right'></i>";
            note += "<span class='author'></span><span class='date'></span></a></li>";
            note = jQuery(note);

            jQuery('#proposal-contribution-list .nav-list').append(note);

            note.find('.headline').text(contrib.get('headline'));
            note.find('.date').text(' (' + contrib.get('created_at').toLocaleDateString() + ' ' + contrib.get('created_at').toLocaleTimeString() + ')');

            note.find('.author').text(contrib.get('author'));               
            if (contrib.get('author') === Sail.app.userData.account.login) {
              note.children().first().addClass('own-color');
            }
            // TODO check if this is working, then add for tags as well, then port to where it's actually relevant
            // _.each(contrib.get('build_ons'), function(b) {
            //    if (contrib.get('author') === Sail.app.userData.account.login) {
            //     note.children().first().addClass('own-color');
            //   }
            // });         
          } else {
            console.log(contrib.id, 'is unpublished');
          }

        });
      }
    }      

  });

  /**
    ProposalInputView
  **/
  self.ProposalInputView = Backbone.View.extend({
    events: {
      // 'change .field': function (ev) {
      //   var view = this;
      //   var f;
      //   f = jQuery(ev.target);
      //   console.log("Setting "+f.attr("name")+" to "+f.val());
      //   view.model.set(f.attr('name'), f.val());
      // },

      'keyup :input': function (ev) {
        var view = this;
        Sail.app.autoSave(view, ev);
      },

      'click #share-proposal-headline-btn': function() {
        this.model.set('headline_published', true);
        this.model.set('headline', jQuery('#proposal-headline-entry').val());
        Sail.app.checkProposalPublishState();
      },

      'click #share-proposal-body-btn': function() {
        this.model.set('proposal_published', true);
        this.model.set('proposal', jQuery('#proposal-body-entry').val());
        Sail.app.checkProposalPublishState();
      },

      'click #share-justification-body-btn': function() {
        this.model.set('justification_published', true);
        this.model.set('justification', jQuery('#justification-body-entry').val());
        Sail.app.checkProposalPublishState();
      }
    },

    initialize: function () {
      console.log("Initializing ProposalInputView...");
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log('rendering ProposalInputView');
      var view = this;
      // only do this rendering on the first pass (then the flag set to true)
      if (!view.initialRenderComplete) {
        jQuery('#proposal-headline-entry').text(view.model.get('headline'));
        jQuery('#proposal-body-entry').text(view.model.get('proposal'));
        jQuery('#justification-body-entry').text(view.model.get('justification'));
        view.initialRenderComplete = true;
      }

      if (Sail.app.userData.account.login === view.model.get('initiator')) {
        if (view.model.get('headline_published') === false) {
          jQuery('#proposal-headline-entry').removeClass('disabled');
          jQuery('#share-proposal-headline-btn').removeClass('disabled');
        } else {
          jQuery('#proposal-headline-entry').addClass('disabled');
          jQuery('#share-proposal-headline-btn').addClass('disabled');
        }
        if (view.model.get('proposal_published') === false) {
          jQuery('#proposal-body-entry').removeClass('disabled');
          jQuery('#share-proposal-body-btn').removeClass('disabled');
        } else {
          jQuery('#proposal-body-entry').addClass('disabled');
          jQuery('#share-proposal-body-btn').addClass('disabled');
        }
        jQuery('#justification-body-entry').text(view.model.get('justification'));

      } else if (Sail.app.userData.account.login === view.model.get('receiver')) {
        if (view.model.get('justification_published') === false) {
          jQuery('#justification-body-entry').removeClass('disabled');
          jQuery('#share-justification-body-btn').removeClass('disabled');
        } else {
          jQuery('#justification-body-entry').addClass('disabled');
          jQuery('#share-justification-body-btn').addClass('disabled');
        }
        jQuery('#proposal-headline-entry').text(view.model.get('headline'));
        jQuery('#proposal-body-entry').text(view.model.get('proposal'));

      } else {
        console.log('skipping render... somehow not related to this user?!');
      }

      jQuery('#group-label-container').text(view.model.get('author'));

    }

  });

  /**
    GroupingView
  **/
  self.GroupingView = Backbone.View.extend({
    events: {
      'click #create-group-btn': 'create-group',

      'click #close-group-btn': function () {
        jQuery('.row').removeClass('disabled');
        jQuery('#grouping-screen').addClass('hide');
        jQuery('.active').removeClass('active');
      }
    },

    initialize: function () {
      console.log("Initializing GroupingView...");
    },

    'create-group': function () {
      // this is pretty sketch - TODO confirm I work
      if ( jQuery('#grouping-screen .active').val() ) {
        jQuery('.row').removeClass('disabled');
        jQuery('#grouping-screen').addClass('hide');
        jQuery('.active').removeClass('active');
        CK.getUserState(Sail.app.userData.account.login, function(us) {
          Sail.app.createGroup(us.get('analysis').tag_group, us.get('analysis').tag_group_id);
        });        
      } else {
        jQuery().toastmessage('showErrorToast', "Choose one other student to group with");
      }
      
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      var view = this;
      var tagGroupName = "";
      // get this user tag group
      var myUs = view.collection.find(function(us) { return us.get('username') === Sail.app.userData.account.login; });

      if (myUs) {
        tagGroupName = myUs.get('analysis').tag_group;
      } else {
        console.error("No user_state found for ", Sail.app.userData.account.login);
      }

      // get the other members in this users tag group, and then create the button elements for them
      // ugg - why are we storing tag_group in analysis subsection of user_states?!
      view.collection.each(function(us) {
        // TODO - check on id instead? Shouldn't matter
        if (!us.has('analysis') || !us.get('analysis').tag_group) {
          console.error("User_state for user '", us.get('username'), "' is missing analysis.tag_group");
          return;
        }

        // display all users in the same tag_group (other than self)
        if (us.get('analysis').tag_group === tagGroupName && us.get('username') !== Sail.app.userData.account.login) {
          var userButton = jQuery('button#'+us.get('username'));
          if (userButton.length === 0) {
            userButton = jQuery('<button id='+us.get('username')+' type="button" value='+us.get('username')+' name="user_btn" class="btn user-btn btn-success" data-toggle="radio">'+us.get('username')+'</button>');
            jQuery('#grouping-btn-container').append(userButton);
          }
        }
      }); 

    }

  });



  CK.Mobile.View = self;
})(window.CK);