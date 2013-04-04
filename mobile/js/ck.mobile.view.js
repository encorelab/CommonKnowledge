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

        var selectedContrib = Sail.app.contributionList.get(contribId);

        // DetailsView
        Sail.app.showDetails(selectedContrib);
        // preparing for buildOns, if clicked
        Sail.app.contribution = selectedContrib;
      },

      'click #new-note-btn': 'new-note'
    },

    initialize: function () {
      console.log("Initializing ContributionListView...");
    },

    'new-note': function () {
      console.log("UI changes for new note");
      jQuery('#note-body-entry').removeClass('disabled');
      jQuery('#note-headline-entry').removeClass('disabled');
      // jQuery('#contribution-list .btn-container').addClass('disabled'); // disable the New Note button
      Sail.app.createNewContribution();
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering ContributionListView!");
      var createdAt;

      jQuery('#contribution-list li').remove();

      // TODO: order this by published (in mobile.js?)
      Sail.app.contributionList.each(function(contrib) {
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
          createdAt = new Date(contrib.get('created_at'));  // createdAt as Date object
          if (typeof createdAt !== 'undefined' && createdAt !== null) {
            note.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
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
      'click #build-on-btn': 'build-on'
    },

    initialize: function () {
      console.log("Initializing ContributionDetailsView...");
      jQuery('#build-on-btn-container').removeClass('hide');
    },

    'build-on': function () {
      jQuery('#note-body-entry').removeClass('disabled');
      jQuery('#note-headline-entry').addClass('disabled');     
      Sail.app.createNewBuildOn();
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionDetailsView!");
      var view = this,
        created_at;

      jQuery('#contribution-details .field').text('');

      // created_at will return undefined, so need to check it exists...
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

        // add the buildOns (if they are published)
        var buildOnEl = '<hr /><div>';
        _.each(view.model.get('build_ons'), function(b) {
          if (b.published === true) {
            var date = new Date(b.created_at);
            buildOnEl += b.content;
            buildOnEl += '<br /><span class="build-on-metadata">~' + b.author;
            buildOnEl += ' (' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ')' +  '</span><hr />';            
          }
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
        // TODO - this probably all wants to go now (it's handled by autosave)
        // var view = this;
        // var f;
        // if (view.model.get('kind') === 'brainstorm') {
        //   f = jQuery(ev.target);
        //   console.log("Setting "+f.attr("name")+" to "+f.val());
        //   view.model.set(f.attr('name'), f.val());
        // } else if (view.model.get('kind') === 'buildOn') {
        //   // TODO: accessing currentBuildOn is wrong and object is {} -- empty
        //   console.log('setting build-on values');
        //   Sail.app.currentBuildOn.content = jQuery('#note-body-entry').val();
        //   Sail.app.currentBuildOn.author = Sail.app.userData.account.login;
        //   var d = new Date();
        //   Sail.app.currentBuildOn.created_at = d;
        //   console.log(d);
        // } else {
        //   console.log('unknown note type');
        // }
      },

      'click #tag-submission-container .tag-btn': function (ev) {
        // var view = this;
        var tag = jQuery(ev.target).data('tag');
        var jqButtonSelector = "button:contains("+tag.get('name')+")";          // the jQuery selector for the button that was clicked

        // case: unselect a tag
        if (Sail.app.contribution.hasTag(tag)) {
          jQuery(jqButtonSelector).removeClass('active'); 
          Sail.app.contribution.removeTag(tag);
        // case: select a tag
        } else {
          jQuery(jqButtonSelector).addClass('active');
          Sail.app.contribution.addTag(tag);
          // add tagger, other?  ie tag.set('tagger',Sail.app.userData.account.login);
        }

        Sail.app.contribution.save();

        // TODO: do we need to deal with N/A?
        // else {
        //   // case: N/A tag selected
        //   // add "N/A"ness - but do we want to actually be explicit here?
        //   if (tag.get('name') === "N/A") {
        //     Sail.app.contribution.set('tags',[]);
        //     jQuery('.tag-btn').removeClass('active');
        //   // remove "N/A"
        //   } else {
        //     var naTag = Sail.app.tagList.find(function(t) { return t.get('name') === "N/A"; } );
        //     Sail.app.contribution.removeTag(naTag);
        //     jQuery("button:contains('N/A')").removeClass('active');
        //   }
        // }

        // enable/disable the Share button
        if (Sail.app.tagList.length > 1) {
           if (Sail.app.contribution.get('tags').length > 0) {
            jQuery('#share-note-btn').removeClass('disabled');
          } else {
            jQuery('#share-note-btn').addClass('disabled');
          }
        }

      },      

      'keyup :input': function (ev) {
        var view = this,
          inputKey = ev.target.name,
          userValue = jQuery('#'+ev.target.id).val();
        // If we hit a key clear intervals so that during typing intervals don't kick in
        window.clearTimeout(Sail.app.autoSaveTimer);

        // save after 10 keystrokes
        Sail.app.autoSave(view.model, inputKey, userValue, false);

        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        Sail.app.autoSaveTimer = setTimeout( function(){
          console.log('Autosave data for: '+inputKey);
          Sail.app.autoSave(view.model, inputKey, userValue, true);
        }, 5000);
      },

      'click #share-note-btn': 'share'
    },

    initialize: function () {
      console.log("Initializing ContributionInputView...");
      // disable the share button if there are tags in the tags collection
      if (Sail.app.tagList.models.length) {
        jQuery('#share-note-btn').addClass('disabled');
      } else {
        jQuery('#share-note-btn').removeClass('disabled');
      }
    },

    share: function () {
      var view = this;
      // avoid weird entries showing up in the model
      window.clearTimeout(Sail.app.autoSaveTimer);

      if (view.model.kind && view.model.kind === 'buildOn') {
        // grab the buildOns and then choose the one for this user
        var buildOnArray = Sail.app.contribution.get('build_ons');
        var buildOnToUpdate = _.find(buildOnArray, function(b) {
          return b.author === Sail.app.userData.account.login && b.published === false;
        });
        buildOnToUpdate.content = jQuery('#note-body-entry').val();
        if (buildOnToUpdate.content !== "") {
          buildOnToUpdate.published = true;
          Sail.app.contribution.set('build_ons',buildOnArray);
          Sail.app.saveContribution(view);
        } else {
          jQuery().toastmessage('showErrorToast', "Please enter content for your build on");
        }
      } else {    // for brainstorm
        Sail.app.contribution.set('content',jQuery('#note-body-entry').val());
        Sail.app.contribution.set('headline',jQuery('#note-headline-entry').val());
        // is this check doing what we think it's doing?
        if (Sail.app.contribution.has('content') && Sail.app.contribution.has('headline')) {
          Sail.app.contribution.set('published', true);
          Sail.app.saveContribution(view);
        } else {
          jQuery().toastmessage('showErrorToast', "Please enter both a note and a headline");
        }
      }
    },

    /**
      Triggers full update of all dynamic elements in the input view
    **/
    render: function () {
      var view = this;
      console.log("rendering ContributionInputView...");
      
      if (view.model.kind && view.model.kind === 'buildOn') {
        jQuery('#note-body-label').text('Build On');                // TODO: make these pop way more
        jQuery('#note-body-entry').removeClass('disabled');
        jQuery('#note-body-entry').val(view.model.content);

      } else {      // for brainstorm
        var contrib = Sail.app.contribution;
        jQuery('#note-body-label').text('New Note');

        jQuery('#note-body-entry').val(contrib.get('content'));
        jQuery('#note-headline-entry').val(contrib.get('headline'));

        if (typeof contrib !== 'undefined' && contrib !== null) {
          jQuery('#note-body-entry').removeClass('disabled');
          jQuery('#note-headline-entry').removeClass('disabled');
        }

        // add the tags   
        Sail.app.tagList.each(function(tag) {
          // TODO: what are we doing with the N/A tag
          if (tag.get('name') !== "N/A") {
            var tagButton = jQuery('button#'+tag.id);
            //if (tagButton.length === 0 && tag.get('name') != "N/A") {
            if (tagButton.length === 0) {
              tagButton = jQuery('<button id='+tag.id+' type="button" class="btn tag-btn"></button>');
              tagButton.text(tag.get('name'));
              tagButton.data('tag',tag);
              jQuery('#tag-submission-container').append(tagButton);          
            }
          }
        });        
      }


    }
  });


  /**
    BucketTaggingView
  **/
  self.BucketTaggingView = Backbone.View.extend({
    events: {
      // 'click #bucket-tagging-btn-container .tag-btn': function (ev) {
      //   // console.log('id: '+ev.target.id);
      //   var tag = jQuery(ev.target).data('tag');

      //   // toggle the clicked tag in the model
      //   if (Sail.app.taggedContribution.hasTag(tag)) {
      //     Sail.app.taggedContribution.removeTag(tag);
      //   } else {
      //     // due to our deadlines, this is all hideous, and fighting backbone... TODO - fixme when there's more time
      //     if (tag.get('name') === "N/A") {
      //       Sail.app.taggedContribution.attributes.tags = [];                       // eeeewwwwwwww
      //       jQuery('.tag-btn').removeClass('active');
      //     } else {
      //       var naTag = Sail.app.tagList.find(function(t) { return t.get('name') === "N/A"; } );
      //       Sail.app.taggedContribution.removeTag(naTag);
      //       jQuery("button:contains('N/A')").removeClass('active');
      //     }
      //     Sail.app.taggedContribution.addTag(tag, Sail.app.userData.account.login);
      //   }

      //   // enable/disable the Share button - dup'd in the render, probably a better way to do this
      //   if (Sail.app.taggedContribution.attributes.tags.length > 0) {
      //     jQuery('#share-note-btn').removeClass('disabled');
      //   } else {
      //     jQuery('#share-note-btn').addClass('disabled');
      //   }

      // },

      // 'click #none-button': function(ev) {
      //   // define none button behaviour
      // }
    },

    initialize: function () {
      console.log("Initializing TagListView...");

      // jQuery('.brand').text('Common Knowledge - Tagging');
      // jQuery('#contribution-list').addClass('hide');
      // jQuery('#bucket-tagging').removeClass('hide');
      // jQuery('#share-note-btn').addClass('disabled');
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering BucketTaggingView...");

      // clear all buttons TODO
      jQuery('.tag-btn').removeClass('active');

      Sail.app.tagList.each(function(tag) {
        var tagButton = jQuery('button#bucket'+tag.id);
        if (tagButton.length === 0) {
          tagButton = jQuery('<button id="bucket'+tag.id+'" type="button" class="btn tag-btn"></button>');
          tagButton = jQuery(tagButton);
          jQuery('#bucket-tagging-btn-container').append(tagButton);
        }

        tagButton.text(tag.get('name'));

        // add tagger and store the tag object in the button for later
        tag.set('tagger',Sail.app.userData.account.login);
        tagButton.data('tag',tag);

        // turn button on if previously tagged with this tag
        if (Sail.app.bucketedContribution && Sail.app.bucketedContribution.hasTag(tag)) {
          tagButton.addClass('active');
        }
      });
      var noneButton = jQuery('#none-button');
      if (noneButton.length === 0) {
        jQuery('#bucket-tagging-btn-container').append(noneButton);
      }      

      // enable/disable the Share button - TODO: set me to Tag it! or something
      // if (Sail.app.bucketedContribution && Sail.app.bucketedContribution.get('tags').length > 0) {
      //   jQuery('#share-note-btn').removeClass('disabled');
      // } else {
      //   jQuery('#share-note-btn').addClass('disabled');
      // }
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
      jQuery('#group-btn').addClass('disabled');
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
          var hasMyTagGroup = _.any(contrib.get('tags'), function(t) { return t.name === Sail.app.myTagGroup; });

          if (contrib.get('published') === true && hasMyTagGroup) {
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

      'keyup :input': function (ev) {
        var view = this,
          inputKey = ev.target.name,
          userValue = jQuery('#'+ev.target.id).val();
        // If we hit a key clear intervals so that during typing intervals don't kick in - TODO: this can go right? But only if we're not rendering this field constantly (fix that too)
        window.clearTimeout(Sail.app.autoSaveTimer);

        // save after 10 keystrokes
        Sail.app.autoSave(view, inputKey, userValue, false);      // NOTE THAT autoSave has been switched to use the model, not the view

        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        Sail.app.autoSaveTimer = setTimeout( function(){
          console.log('Autosave data for: '+inputKey);
          Sail.app.autoSave(view, inputKey, userValue, true);
        }, 5000);
      },

      'click #share-proposal-headline-btn': function() {
        // if Done is hit I clear my timers
        // TODO I could be specific which timers to clear
        window.clearTimeout(Sail.app.autoSaveTimer);

        this.model.set('headline_published', true);
        this.model.set('headline', jQuery('#proposal-headline-entry').val());
        Sail.app.checkProposalPublishState();
      },

      'click #share-proposal-body-btn': function() {
        // if Done is hit I clear my timers
        // TODO I could be specific which timers to clear
        window.clearTimeout(Sail.app.autoSaveTimer);

        this.model.set('proposal_published', true);
        this.model.set('proposal', jQuery('#proposal-body-entry').val());
        Sail.app.checkProposalPublishState();
      },

      'click #share-justification-body-btn': function() {
        // if Done is hit I clear my timers
        // TODO I could be specific which timers to clear
        window.clearTimeout(Sail.app.autoSaveTimer);

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
      var view = this;      

      if (view.model.get('published') !== true) {
        console.log('rendering ProposalInputView');
        // prevent them from joining a new group randomly
        jQuery('#group-btn').addClass('disabled');

        // only do this rendering on the first pass (then the flag set to true)
        if (!view.initialRenderComplete) {
          jQuery('#proposal-headline-entry').val(view.model.get('headline'));
          jQuery('#proposal-body-entry').val(view.model.get('proposal'));
          jQuery('#justification-body-entry').val(view.model.get('justification'));
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
          jQuery('#justification-body-entry').val(view.model.get('justification'));

        } else if (Sail.app.userData.account.login === view.model.get('receiver')) {
          if (view.model.get('justification_published') === false) {
            jQuery('#justification-body-entry').removeClass('disabled');
            jQuery('#share-justification-body-btn').removeClass('disabled');
          } else {
            jQuery('#justification-body-entry').addClass('disabled');
            jQuery('#share-justification-body-btn').addClass('disabled');
          }
          jQuery('#proposal-headline-entry').val(view.model.get('headline'));
          jQuery('#proposal-body-entry').val(view.model.get('proposal'));

        } else {
          console.log('skipping render... somehow not related to this user?!');
        }

        jQuery('#group-label-container').text('Current group: ['+view.model.get('author')+']');        
      }

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
        jQuery('.active').removeClass('active');
        jQuery('#grouping-screen').addClass('hide');
        jQuery('#group-btn').removeClass('disabled');
      }
    },

    initialize: function () {
      console.log("Initializing GroupingView...");
    },

    'create-group': function () {
      // this is pretty sketch - TODO confirm I work
      var receiver = jQuery('#grouping-screen .active').val();
      if (receiver) {
        // UI stuff 
        jQuery('.row').removeClass('disabled');
        jQuery('#grouping-screen').addClass('hide');
        jQuery('.active').removeClass('active');
        // create the group
        CK.getUserState(Sail.app.userData.account.login, function(us) {
          Sail.app.createGroup(receiver, us.get('analysis').tag_group, us.get('analysis').tag_group_id);
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

      jQuery('#grouping-btn-container').empty();

      // get this user tag group - TODO move this all to mobile.js
      // var myUs = view.collection.find(function(us) { return us.get('username') === Sail.app.userData.account.login; });

      // if (myUs) {
      //   Sail.app.tagGroupName = myUs.get('analysis').tag_group;
      // } else {
      //   console.error("No user_state found for ", Sail.app.userData.account.login);
      // }

      // get the other members in this users tag group, and then create the button elements for them
      // ugg - why are we storing tag_group in analysis subsection of user_states?!
      view.collection.each(function(us) {
        // TODO - check on id instead? Shouldn't matter
        if (!us.has('analysis') || !us.get('analysis').tag_group) {
          console.error("User_state for user '", us.get('username'), "' is missing analysis.tag_group");
          return;
        }

        var username = us.get('username');
        var prop = Sail.app.proposalsList.find(function(p) {
          var val = ((p.get('initiator') === username || p.get('receiver') === username) && p.get('published') === false);
          return val;
        });
        
        // check if the user is already in another group
        if (prop) {
          console.log('user already in a group');
        } else {
          // display all users in the same tag_group (other than self) - code from before here
          if (us.get('analysis').tag_group === Sail.app.myTagGroup && us.get('username') !== Sail.app.userData.account.login) {
            var userButton = jQuery('button#'+us.get('username'));
            if (userButton.length === 0) {
              userButton = jQuery('<button id='+us.get('username')+' type="button" value='+us.get('username')+' name="user_btn" class="btn user-btn btn-success" data-toggle="radio">'+us.get('username')+'</button>');
              jQuery('#grouping-btn-container').append(userButton);
            }
          }            
        }


      }); 

    }

  });


  // /**
  //   ListView
  // **/
  // self.InterpretationListView = Backbone.View.extend({
  //   events: {
  //     'click .list-item': function (ev) {
  //       jQuery('#proposal-list .proposal').removeClass('selected');

  //       // The problem here was that ev.target referes to a differently deep nested element 
  //       var $target = jQuery(ev.target);
  //       if (!$target.is('.list-item')) {
  //          $target = $target.parents('.list-item').first();
  //       }

  //       // Removing background colors, then adding the correct one
  //       $target.children().first().addClass('selected');
  //       var proposalId = $target.attr('id');

  //       // Sail.app.showProposalDetails(Sail.app.proposalList.get(proposalId));        
  //     },

  //     'click #like-btn-on': function() {

  //     },

  //     'click #like-btn-off': function() {

  //     }
  //   },




  //   // jQuery('#like-btn-on').click(function() {
  //   //   app.toggleVote();
  //   // });
  //   // jQuery('#like-btn-off').click(function() {
  //   //   app.toggleVote();
  //   // });
  //   // },

  //   initialize: function () {
  //     console.log("Initializing InterpretationListView...");
  //   },

  //   /**
  //     Triggers full update of all dynamic elements in the list view
  //   **/
  //   render: function () {
  //     console.log("rendering InterpretationListView!");
  //     var view = this,
  //       created_at;

  //     jQuery('#proposal-list li').remove();

  //     _.each(view.collection.models, function(prop) {
  //       if (prop.get('published') === true) {
  //         console.log('headline: ' + prop.get('headline'));

  //         //var note = jQuery('li#'+prop.id);
  //         var note = "<li id=" + prop.id + " class='list-item'><a class='note'><span class='headline'></span>";
  //         note += "<br /><i class='icon-chevron-right'></i>";
  //         note += "<span class='author'></span><span class='date'></span></a></li>";
  //         note = jQuery(note);

  //         jQuery('#proposal-list .nav-list').append(note);

  //         note.find('.headline').text(prop.get('headline'));

  //         // functions toLocaleDateString() and toLocaleTimeString() are only defined if created_at is a Date object
  //         created_at = new Date(prop.get('created_at'));  // created_at as Date object
  //         if (typeof created_at !== 'undefined' && created_at !== null) {
  //           note.find('.date').text(' (' + created_at.toLocaleDateString() + ' ' + created_at.toLocaleTimeString() + ')');
  //         }

  //         note.find('.author').text(prop.get('author'));               
  //         if (prop.get('author') === Sail.app.userData.account.login) {
  //           note.children().first().addClass('own-color');
  //         }
  //         // TODO check if this is working, then add for tags as well, then port to where it's actually relevant
  //         // _.each(prop.get('build_ons'), function(b) {
  //         //    if (prop.get('author') === Sail.app.userData.account.login) {
  //         //     note.children().first().addClass('own-color');
  //         //   }
  //         // });         
  //       } else {
  //         console.log(prop.id, 'is unpublished');
  //       }

  //     });
          
  //   }

  // });



  CK.Mobile.View = self;
})(window.CK);