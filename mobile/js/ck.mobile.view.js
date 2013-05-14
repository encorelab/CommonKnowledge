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
      var createdAt;
      // clear out the list

      Sail.app.contributionList.each(function(contrib) {
        if (contrib.hasChanged() || jQuery('li#'+contrib.id).length === 0) {
          // if this contrib has changed
          jQuery('#contribution-list li#'+contrib.id).remove();
        } else {
          // else break out
          return;
        }
        if (contrib.get('published') === true) {
          var note = "<li id=" + contrib.id + " class='list-item'><a class='note'><span class='headline'></span>";
          note += "<br /><i class='icon-chevron-right'></i>";
          note += "<span class='author'></span><span class='date'></span></a></li>";
          note = jQuery(note);

          jQuery('#contribution-list .nav-list').append(note);

          note.find('.headline').text(contrib.get('headline'));

          // functions toLocaleDateString() and toLocaleTimeString() are only defined if created_at is a Date object
          createdAt = contrib.get('created_at');
          if (createdAt) {
            note.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
          }

          note.find('.author').text(contrib.get('author'));               

          var buildOnArray = contrib.get('build_ons');
          var myBuildOn = _.find(buildOnArray, function(b) {
            return b.author === Sail.app.userData.account.login && b.published === true;
          });
          if (myBuildOn || contrib.get('author') === Sail.app.userData.account.login) {
            note.children().first().addClass('own-color');
          }
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
      jQuery('#contribution-input .field').val('');
      Sail.app.createNewBuildOn();
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionDetailsView!");
      var view = this;

      jQuery('#contribution-details .field').text('');

      // created_at will return undefined, so need to check it exists...
      if (view.model && view.model.get('created_at')) {
        jQuery('#contribution-details .note-headline').text(view.model.get('headline'));
        jQuery('#contribution-details .note-body').text(view.model.get('content'));
        jQuery('#contribution-details .note-author').text('~'+view.model.get('author'));

        var createdAt = view.model.get('created_at');
        if (createdAt) {
          jQuery('#contribution-details .note-created-at').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
        }

        // add the tags
        var tagsEl = '<div><i>';
        _.each(view.model.get('tags'), function(t) {
          tagsEl += ' ';
          tagsEl += t.name;
        });
        tagsEl += '</i></div>';
        tagsEl = jQuery(tagsEl);
        jQuery('#contribution-details .note-tags').append(tagsEl);

        // add the buildOns (if they are published)
        var buildOnEl = '<div>';
        _.each(view.model.get('build_ons'), function(b) {
          if (b.published === true) {
            buildOnEl += '<hr />';
            buildOnEl += b.content;
            buildOnEl += '<br /><span class="build-on-metadata">~' + b.author;
            buildOnEl += ' (' + b.created_at.toLocaleDateString() + ' ' + b.created_at.toLocaleTimeString() + ')' +  '</span>';            
          }
        });
        buildOnEl += '</div>';
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
      'click #tag-submission-container .tag-btn': function (ev) {
        // var view = this;
        var tag = jQuery(ev.target).data('tag');
        var jqButtonSelector = "button:contains("+tag.get('name')+")";          // the jQuery selector for the button that was clicked

        // case: unselect a tag
        if (Sail.app.contribution.hasTag(tag)) {
          jQuery(jqButtonSelector).removeClass('active'); 
          Sail.app.contribution.removeTag(tag, Sail.app.userData.account.login);
        // case: select a tag
        } else {
          jQuery(jqButtonSelector).addClass('active');
          Sail.app.contribution.addTag(tag, Sail.app.userData.account.login);
          // add tagger, other?  ie tag.set('tagger',Sail.app.userData.account.login);
        }

        Sail.app.contribution.save();     // TODO probably needs a patch here

        // enable/disable the Share button
        if (Sail.app.tagList.models.length > 0) {
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
        if (!_.isEmpty(buildOnToUpdate.content)) {
          buildOnToUpdate.published = true;
          Sail.app.contribution.set('build_ons',buildOnArray);
          Sail.app.saveContribution(view);
        } else {
          jQuery().toastmessage('showErrorToast', "Please enter content for your build on");
        }
      } else {    // for brainstorm
        Sail.app.contribution.set('content',jQuery('#note-body-entry').val());
        Sail.app.contribution.set('headline',jQuery('#note-headline-entry').val());
        // if content and headline are not empty
        if (!_.isEmpty(Sail.app.contribution.get('content')) && !_.isEmpty(Sail.app.contribution.get('headline'))) {
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

      // enable/disable the share button based on context (view.model.kind will be buildOn or undefined here)
      if (Sail.app.tagList.models.length > 0 && view.model.kind !== 'buildOn') {
         if (Sail.app.contribution.get('tags').length > 0) {
          jQuery('#share-note-btn').removeClass('disabled');
        } else {
          jQuery('#share-note-btn').addClass('disabled');
        }
      } else {
        jQuery('#share-note-btn').removeClass('disabled');
      }
// for buildOn
      if (view.model.kind && view.model.kind === 'buildOn') {
        jQuery('#note-body-label').text('Build On');
        jQuery('#note-body-label').effect("highlight", {}, 1500);
        jQuery('#note-body-entry').removeClass('disabled');
        jQuery('#note-body-entry').val(view.model.content);
        jQuery('.tag-btn').addClass('disabled');
// for brainstorm
      } else {
        var contrib = Sail.app.contribution;
        jQuery('#note-body-label').text('New Note');
        jQuery('#note-body-label').effect("highlight", {}, 1500);
        jQuery('#note-body-entry').val(contrib.get('content'));
        jQuery('#note-headline-entry').val(contrib.get('headline'));
        jQuery('.tag-btn').removeClass('disabled');
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
    ContributionToTagView
  **/
  self.ContributionToTagView = Backbone.View.extend({
    events: {

    },

    initialize: function () {
      console.log("Initializing ContributionToTagView...");
    },

    /**
      Triggers full update of all dynamic elements in the details view
    **/
    render: function () {
      console.log("rendering ContributionToTagView!");
      var view = this;

      jQuery('#contribution-to-tag-screen .field').text('');

      // created_at will return undefined, so need to check it exists...
      if (view.model && view.model.get('created_at')) {
        jQuery('#contribution-to-tag-screen .note-headline').text(view.model.get('headline'));
        jQuery('#contribution-to-tag-screen .note-body').text(view.model.get('content'));
        jQuery('#contribution-to-tag-screen .note-author').text('~'+view.model.get('author'));

        var createdAt = view.model.get('created_at');
        if (createdAt) {
          jQuery('#contribution-to-tag-screen .note-created-at').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
        }

        // add the buildOns (if they are published)
        var buildOnEl = '<hr /><div>';
        _.each(view.model.get('build_ons'), function(b) {
          if (b.published === true) {
            buildOnEl += b.content;
            buildOnEl += '<br /><span class="build-on-metadata">~' + b.author;
            buildOnEl += ' (' + b.created_at.toLocaleDateString() + ' ' + b.created_at.toLocaleTimeString() + ')' +  '</span>';            
          }
        });

        buildOnEl += "</div>";
        buildOnEl = jQuery(buildOnEl);
        jQuery('#contribution-to-tag-screen .note-build-ons').append(buildOnEl);
      } else {
        console.warn("ContributionToTagView render skipped this contrib because created_at doesn't exist");
      }
    }
  });


  /**
    BucketTaggingView
  **/
  self.BucketTaggingView = Backbone.View.extend({
    events: {
      'click #bucket-tagging-btn-container .tag-choosable': function() {
        jQuery('#none-btn').removeClass('active');
      },

      'click #none-btn': function() {
        jQuery('#bucket-tagging-btn-container .tag-choosable').removeClass('active');
      },

      'click #submit-tagged-note-btn': function() {
        if (jQuery('.tag-btn').hasClass('active')) {
          Sail.app.saveBucketedContribution();
        } else {
          jQuery().toastmessage('showErrorToast', "Please choose one or more tags for this contribution (or select None)");
        }
      }
    },

    initialize: function () {
      console.log("Initializing TagListView...");
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("rendering BucketTaggingView...");

      Sail.app.tagList.each(function(tag) {
        var tagButton = jQuery('button#bucket'+tag.id);
        if (tagButton.length === 0) {
          tagButton = jQuery('<button id="bucket'+tag.id+'" type="button" class="btn tag-btn tag-choosable"></button>');
          tagButton.data('tag',tag);
          tagButton = jQuery(tagButton);
          
          jQuery('#bucket-tagging-btn-container').append(tagButton);
        }

        tagButton.text(tag.get('name'));

        // add tagger and store the tag object in the button for later
        //tag.set('tagger',Sail.app.userData.account.login);
        //tagButton.data('tag',tag);      

        // turn button on if previously tagged with this tag
        if (Sail.app.bucketedContribution && Sail.app.bucketedContribution.hasTag(tag)) {
          tagButton.addClass('active');
        }
      });
      var noneButton = jQuery('button#none-btn');
      if (noneButton.length === 0) {
        noneButton = jQuery('<button id="none-btn" type="button" class="btn tag-btn">None</button>');
        jQuery('#bucket-tagging-btn-container').append(noneButton);
      }
    }
  });


  /**
    InterestGroupListView
  **/
  self.InterestGroupListView = Backbone.View.extend({
    events: {
      'click #interest-group-list-btn-container .tag-btn': function(ev) {
        var chosenTagId = ev.currentTarget.id;
        var chosenTagName = jQuery('#'+chosenTagId).text();
        var ok = confirm("Do you want to choose <"+ chosenTagName + "> as your specialization?");
        if (ok) {
          Sail.app.chooseInterestGroup(chosenTagName);
        } else {
          jQuery('#interest-group-list-btn-container .tag-btn').removeClass('active');
        }
      }
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      var view = this;
      console.log("Rendering InterestGroupListView!");

      view.collection.each(function(tag) {
        // don't show the N/A tag
        if (tag.get('name') !== "N/A") {
          var tagButton = jQuery('button#tagGroup'+tag.id);
          // length avoids duplicating (probably a better way to do this in backbone?)
          if (tagButton.length === 0) {
            tagButton = jQuery('<button id="tagGroup'+tag.id+'" type="button" class="btn tag-btn"></button>');
            tagButton.addClass(tag.get('colorClass'));

            jQuery('#interest-group-list .tag-btn-group').append(tagButton);
          }

          tagButton.text(tag.get('name'));
        }
      });
    }
  });


  /**
    ProposalListView
  **/
  self.ProposalListView = Backbone.View.extend({
    events: {
      'click .list-item': function(ev) {
        // remove background colors, then adding the correct one
        jQuery('#proposal-list .note').removeClass('selected');
        var $target = jQuery(ev.target);
        if (!$target.is('.list-item')) {
           $target = $target.parents('.list-item').first();
        }
        $target.children().first().addClass('selected');
        var contribId = $target.attr('data');

        // pass the contrib from the appropriate collection
        if ($target.hasClass('brainstorm-item')) {
          Sail.app.showProposalDetails(Sail.app.contributionList.get(contribId));
        } else {
          Sail.app.showProposalDetails(Sail.app.proposalList.get(contribId));
        }
      },

      'click #new-proposal-btn': function(ev) {
        jQuery('#proposal-justification-input').removeClass('disabled');
        Sail.app.createNewProposal('proposal');
      }
    },

    initialize: function () {
      console.log("Initializing ProposalListView...");
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("Rendering ProposalListView...");
      var createdAt;
      var myTag = Sail.app.tagList.findWhere( {'name':Sail.app.userState.get('tag_group')} );

      Sail.app.contributionList.each(function(contrib) {
        if (contrib.get('published') === true && contrib.hasTag(myTag)) {
          var buildOnArray;
          var myBuildOn;
          if (jQuery('li#contribution'+contrib.id).length === 0) {
            // contrib doesn't exist in the list
            var note = "<li id='contribution" + contrib.id + "' class='list-item brainstorm-item' data='" + contrib.id + "'><a class='note'><span class='headline'></span>";
            note += "<br /><i class='icon-chevron-right'></i>";
            note += "<span class='author'></span><span class='date'></span></a></li>";
            note = jQuery(note);
            jQuery('#proposal-list .nav-list').append(note);

            note.find('.headline').text('Brainstorm - '+contrib.get('headline'));
            createdAt = contrib.get('created_at');
            if (createdAt) {
              note.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            note.find('.author').text(contrib.get('author'));
            buildOnArray = contrib.get('build_ons');
            myBuildOn = _.find(buildOnArray, function(b) {
              return b.author === Sail.app.userData.account.login && b.published === true;
            });
            if (myBuildOn || contrib.get('author') === Sail.app.userData.account.login) {
              note.children().first().addClass('own-color');
            }

          } else if (contrib.hasChanged()) {
            // contrib has changed, remove content from list item, repopulate
            var liEl = jQuery('#contribution'+contrib.id);
            liEl.find('.headline').text('Brainstorm - '+contrib.get('headline'));
            createdAt = contrib.get('created_at');
            if (createdAt) {
              liEl.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            liEl.find('.author').text(contrib.get('author'));
            buildOnArray = contrib.get('build_ons');
            myBuildOn = _.find(buildOnArray, function(b) {
              return b.author === Sail.app.userData.account.login && b.published === true;
            });
            if (myBuildOn || contrib.get('author') === Sail.app.userData.account.login) {
              liEl.children().first().addClass('own-color');
            }

          } else {
            // break
            return;
          }
        }
      });

      // add the proposals to the list
      Sail.app.proposalList.each(function(prop) {
        if (prop.get('published') === true) {
          var propTag;

          if (jQuery('li#proposal'+prop.id).length === 0) {
            // if this prop doesn't exist, add it
            var note = "<li id='proposal" + prop.id + "' class='list-item proposal-item' data='" + prop.id + "'><a class='note'><span class='headline'></span>";
            note += "<br /><i class='icon-chevron-right'></i>";
            note += "<span class='author'></span><span class='date'></span></a></li>";
            note = jQuery(note);
            jQuery('#proposal-list .nav-list').append(note);
            note.find('.headline').text('Proposal - '+prop.get('headline'));
            createdAt = prop.get('created_at');
            if (createdAt) {
              note.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            note.find('.author').text(prop.get('author'));
            // add the correct colors based on tag_name
            propTag = Sail.app.tagList.findWhere( {'name':prop.get('tag').name} );
            note.children().first().addClass(propTag.get('colorClass'));            

          } else if (prop.hasChanged()) {
            // if this prop has changed, clear the li and add new info
            var liEl = jQuery('#proposal'+prop.id);
            //liEl.html('');
            liEl.find('.headline').text('Proposal - '+prop.get('headline'));
            createdAt = prop.get('created_at');
            if (createdAt) {
              liEl.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            liEl.find('.author').text(prop.get('author'));
            // add the correct colors based on tag_name
            propTag = Sail.app.tagList.findWhere( {'name':prop.get('tag').name} );
            liEl.children().first().addClass(propTag.get('colorClass')); 

          } else {
            // else break out
            return;
          }
        }
      });

    }
  });


  /**
    ProposalDetailsView
  **/
  self.ProposalDetailsView = Backbone.View.extend({
    events: {
      'click #like-btn-off': function(ev) {
        // vote
        this.model.addVote(Sail.app.userData.account.login);
        this.model.save(null,{patch:true}).done(function() {
          jQuery('#like-btn-off').addClass('hide');
          jQuery('#like-btn-on').removeClass('hide');
        });
      },
      'click #like-btn-on': function(ev) {
        // unvote
        this.model.removeVote(Sail.app.userData.account.login);
        this.model.save(null,{patch:true}).done(function() {
          jQuery('#like-btn-on').addClass('hide');
          jQuery('#like-btn-off').removeClass('hide');
        });
      }
    },

    initialize: function () {
      console.log("Initializing ProposalDetailsView...");

      this.model.on('invalid', function (model, err) {
        alert(JSON.stringify(err));
      });
    },

    render: function () {
      console.log("Rendering ProposalDetailsView...");
      var view = this;

      // clear everything
      jQuery('#proposal-details .field').text('');  

      // created_at will return undefined, so need to check it exists...
      if (view.model && view.model.get('created_at')) {
        // set up the tags element
        var tagsEl = '<div><i>';
        if (view.model instanceof CK.Model.Proposal) {
          jQuery('#proposal-details .note-proposal').html('<b>Proposal: </b>'+view.model.get('proposal'));
          jQuery('#proposal-details .note-justification').html('<b>Justification: </b>'+view.model.get('justification'));
          // tags
          tagsEl += view.model.get('tag').name;
          jQuery('#like-btn-container').removeClass('hide');

        } else if (view.model instanceof CK.Model.Contribution) {
          jQuery('#proposal-details .note-content').text(view.model.get('content'));
          // buildOns
          var buildOnEl = '<div>';
          _.each(view.model.get('build_ons'), function(b) {
            if (b.published === true) {
              buildOnEl += '<hr />';
              buildOnEl += b.content;
              buildOnEl += '<br /><span class="build-on-metadata">~' + b.author;
              buildOnEl += ' (' + b.created_at.toLocaleDateString() + ' ' + b.created_at.toLocaleTimeString() + ')' +  '</span>';            
            }
          });
          buildOnEl += '</div>';
          buildOnEl = jQuery(buildOnEl);
          jQuery('#proposal-details .note-build-ons').append(buildOnEl);
          // tags
          _.each(view.model.get('tags'), function(t) {
            tagsEl += ' ';
            tagsEl += t.name;
          });
          jQuery('#like-btn-container').addClass('hide');
        } else {
          console.error('Unknown type of view.model in ProposalDetailsView');
        }

        // for both Contribution model and Proposal model
        jQuery('#proposal-details .note-headline').text(view.model.get('headline'));
        jQuery('#proposal-details .note-author').text('~'+view.model.get('author'));
        var createdAt = view.model.get('created_at');
        if (createdAt) {
          jQuery('#proposal-details .note-created-at').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
        }
        tagsEl += '</i></div>';
        tagsEl = jQuery(tagsEl);
        jQuery('#proposal-details .note-tags').append(tagsEl);

      } else {
        console.warn("ProposalDetailsView render skipped this contrib because created_at doesn't exist");
      }

      // voting buttons
      var votesArray = this.model.get('votes');
      if (_.contains(votesArray, Sail.app.userData.account.login)) {
        jQuery('#like-btn-off').addClass('hide');
        jQuery('#like-btn-on').removeClass('hide');
      } else {
        jQuery('#like-btn-on').addClass('hide');
        jQuery('#like-btn-off').removeClass('hide');
      }

    }
  });


  /**
    ProposalInputView
  **/
  self.ProposalInputView = Backbone.View.extend({
    events: {
      'keyup :input': function(ev) {
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

      'click #proposal-type-btn-container .btn': function(ev) {
        jQuery('#proposal-type-btn-container .btn').removeClass('active');
        jQuery(ev.target).addClass('active');
        Sail.app.proposal.set('type',jQuery(ev.target).html());
      },

      'click #investigation-proposal-type-btn-container': function(ev) {
        jQuery('#investigation-proposal-type-btn-container .btn').removeClass('active');
        jQuery(ev.target).addClass('active');
        Sail.app.proposal.set('type',jQuery(ev.target).html());        
      },

      'click #share-proposal-justification-btn': 'share',

      'click #share-investigation-proposal-btn': 'shareInvProp'
    },

    initialize: function() {
      console.log("Initializing ProposalInputView...");

      this.model.on('invalid', function (model, err) {
        alert(JSON.stringify(err));
      });
    },

    share: function() {
      var view = this;
      // avoid weird entries showing up in the model
      window.clearTimeout(Sail.app.autoSaveTimer);

      if (!Sail.app.proposal.get('type') || jQuery('#proposal-headline-entry').val() === '' || jQuery('#proposal-entry').val() === '' || jQuery('#justification-entry').val() === '') {
        jQuery().toastmessage('showErrorToast', "Please fill all fields and choose whether this is a proposal for research or experiment");
      } else {
        Sail.app.proposal.set('headline',jQuery('#proposal-headline-entry').val());
        Sail.app.proposal.set('proposal',jQuery('#proposal-entry').val());
        Sail.app.proposal.set('justification',jQuery('#justification-entry').val());
        Sail.app.proposal.set('published',true);
        Sail.app.saveProposal(view);
      }
    },

    shareInvProp: function() {
      var view = this;
      // avoid weird entries showing up in the model
      window.clearTimeout(Sail.app.autoSaveTimer);

      if (!Sail.app.proposal.get('type') || jQuery('#investigation-proposal-headline-entry').val() === '' || jQuery('#investigation-proposal-entry').val() === '' || jQuery('#investigation-justification-entry').val() === '') {
        jQuery().toastmessage('showErrorToast', "Please fill all fields and choose whether this is a proposal for research or experiment");
      } else {
        Sail.app.proposal.set('headline',jQuery('#investigation-proposal-headline-entry').val());
        Sail.app.proposal.set('proposal',jQuery('#investigation-proposal-entry').val());
        Sail.app.proposal.set('justification',jQuery('#investigation-justification-entry').val());
        Sail.app.proposal.set('published',true);
        Sail.app.saveProposal(view);
      }
    },

    /**
      Triggers full update of all dynamic elements in the input view
    **/
    render: function () {
      var view = this;
      console.log("rendering ProposalInputView...");

      // for proposal
      jQuery('#proposal-headline-entry').val(Sail.app.proposal.get('headline'));
      jQuery('#proposal-entry').val(Sail.app.proposal.get('proposal'));
      jQuery('#justification-entry').val(Sail.app.proposal.get('justification'));
      // for investigation
      jQuery('#investigation-proposal-headline-entry').val(Sail.app.proposal.get('headline'));
      jQuery('#investigation-proposal-entry').val(Sail.app.proposal.get('proposal'));
      jQuery('#investigation-justification-entry').val(Sail.app.proposal.get('justification'));
    }
  });


  /**
    InvestigationListView
  **/
  self.InvestigationListView = Backbone.View.extend({
    events: {
      'click .list-item': function(ev) {
        // hide the buttons and voting stuff, to be reshown later
        jQuery('#investigation-details .btn').addClass('hide');
        jQuery('#connect-btn-container').addClass('hide');
        // remove background colors, then adding the correct one
        jQuery('#investigation-list .note').removeClass('selected');
        var $target = jQuery(ev.target);
        if (!$target.is('.list-item')) {
           $target = $target.parents('.list-item').first();
        }
        $target.children().first().addClass('selected');
        var contribId = $target.attr('data');

        var propObj = Sail.app.proposalList.get(contribId);
        var invObj = Sail.app.investigationList.get(contribId);

        // if proposal
        if ($target.hasClass('proposal-item')) {
          jQuery('#new-inquiry-btn').removeClass('hide');
          jQuery('#new-experiment-btn').removeClass('hide');
          Sail.app.showInvestigationDetails(propObj);
        // if investigation
        } else {
          // if investigation->inquiry
          // if (invObj.get('type') === 'inquiry') {
          //   jQuery('#inv-build-on-btn').removeClass('hide');
          // }
          jQuery('#connect-btn-container').removeClass('hide');
          Sail.app.showInvestigationDetails(invObj);
        }
      },

      'click #inv-new-proposal-btn': function(ev) {
        // if other field is already there, hide it
        jQuery('#inquiry-input').hide();
        jQuery('#experiment-input').hide();

        //jQuery('#inquiry-input').removeClass('disabled');
        Sail.app.createNewProposal('investigation');
      }
    },

    initialize: function () {
      console.log("Initializing InvestigationListView...");
    },

    /**
      Triggers full update of all dynamic elements in the list view
    **/
    render: function () {
      console.log("Rendering InvestigationListView...");
      var view = this;
      var createdAt;
      var myTag = Sail.app.tagList.findWhere( {'name':Sail.app.userState.get('tag_group')} );

      // add the proposals to the list
      Sail.app.proposalList.each(function(prop) {
        if (prop.get('published') === true && prop.get('tag').id === myTag.get('_id')) {
          var propTag;

          if (jQuery('li#investigation-proposal'+prop.id).length === 0) {
            // if this prop doesn't exist, add it
            var note = "<li id='investigation-proposal" + prop.id + "' class='list-item proposal-item' data='" + prop.id + "'><a class='note'><span class='headline'></span>";
            note += "<br /><i class='icon-chevron-right'></i>";
            note += "<span class='author'></span><span class='date'></span></a></li>";
            note = jQuery(note);
            jQuery('#investigation-list .nav-list').append(note);
            note.find('.headline').text('Proposal - '+prop.get('headline'));
            createdAt = prop.get('created_at');
            if (createdAt) {
              note.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            note.find('.author').text(prop.get('author'));
            // add the correct colors based on tag_name
            propTag = Sail.app.tagList.findWhere( {'name':prop.get('tag').name} );
            note.children().first().addClass(propTag.get('colorClass'));            

          } else if (prop.hasChanged()) {
            // if this prop has changed, clear the li and add new info
            var liEl = jQuery('#investigation-proposal'+prop.id);
            //liEl.html('');
            liEl.find('.headline').text('Proposal - '+prop.get('headline'));
            createdAt = prop.get('created_at');
            if (createdAt) {
              liEl.find('.date').text(' (' + createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString() + ')');
            }
            liEl.find('.author').text(prop.get('author'));
            // add the correct colors based on tag_name
            // propTag = Sail.app.tagList.findWhere( {'name':prop.get('tag').name} );
            // liEl.children().first().addClass(propTag.get('colorClass')); 

          } else {
            // else break out
            return;
          }
        }
      });
    
      // add the investigations to the list
      view.options.investigations.each(function(inv){
        // if (inv.get('published') === true && inv.get('tag').id === myTag.get('_id')) {
        if (inv.get('published') === true && inv.get('interest_group') === myTag.get('name')) {
          if (jQuery('li#investigation'+inv.id).length === 0) {
            // if this inv doesn't exist, add it
            var note = "<li id='investigation" + inv.id + "' class='list-item investigation-item' data='" + inv.id + "'><a class='note'><span class='headline'></span>";
            note += "<br /><i class='icon-chevron-right'></i>";
            note += "<span class='author'></span><span class='date'></span></a></li>";
            note = jQuery(note);
            jQuery('#investigation-list .nav-list').append(note);
            note.find('.headline').text(Sail.app.capitaliseFirstLetter(inv.get('type'))+' - '+inv.get('headline'));
            
            if (inv.has('created_at') && inv.get('created_at').getMonth) {
              note.find('.date').text(' (' + inv.get('created_at').toLocaleDateString() + ' ' + inv.get('created_at').toLocaleTimeString() + ')');
            }
            note.find('.author').text(inv.get('author'));
          } else if (inv.hasChanged()) {
            // if this inv has changed, clear the li and add new info
            var liEl = jQuery('#proposal'+inv.id);
            //liEl.html('');
            liEl.find('.headline').text('Proposal - '+inv.get('headline'));
          
            if (inv.has('created_at') && inv.get('created_at').getMonth) {
              liEl.find('.date').text(' (' + inv.get('created_at').toLocaleDateString() + ' ' + inv.get('created_at').toLocaleTimeString() + ')');
            } else {
              liEl.find('.date').text('(no date found)');
            }
            liEl.find('.author').text(inv.get('author'));
          } else {
            // else break out
            return;
          }
        }
      });

    } // end of render
  });


  /**
    InvestigationDetailsView
  **/
  self.InvestigationDetailsView = Backbone.View.extend({
    events: {
      'click #new-inquiry-btn': function() {
        jQuery('#investigation-proposal-input').hide();
        jQuery('#experiment-input').hide();
        Sail.app.createNewInvestigation('inquiry', this.model.id);
      },
      'click #new-experiment-btn': function() {
        jQuery('#investigation-proposal-input').hide();
        jQuery('#inquiry-input').hide();
        Sail.app.createNewInvestigation('experiment', this.model.id);
      },

      'click #connect-btn-off': function(ev) {
        // vote
        this.model.addVote(Sail.app.userData.account.login);
        this.model.save(null,{patch:true}).done(function() {
          jQuery('#connect-btn-off').addClass('hide');
          jQuery('#connect-btn-on').removeClass('hide');
        });
      },
      'click #connect-btn-on': function(ev) {
        // unvote
        this.model.removeVote(Sail.app.userData.account.login);
        this.model.save(null,{patch:true}).done(function() {
          jQuery('#connect-btn-on').addClass('hide');
          jQuery('#connect-btn-off').removeClass('hide');
        });
      },
      'click #inv-build-on-btn': function() {
        alert('Under construction');
      }
    },

    initialize: function () {
      console.log("Initializing InvestigationDetailsView...");

    },

    render: function () {
      console.log("Rendering InvestigationDetailsView...");
      var view = this;
      // clear everything
      jQuery('#investigation-details .field').text('');
      jQuery('#investigation-details .field').removeClass('populated');

      if (view.model instanceof CK.Model.Proposal) {
        console.log("InvestigationDetailsView is rendering a Proposal Model");

        jQuery('#investigation-details .proposal').each(function(){
          var attr_name = jQuery(this).attr('name');
          var attr_data = view.model.get(attr_name);
          
          if (attr_data && attr_data !== '') {
            if (jQuery(this).attr('name') !== 'headline') {
              attr_name = Sail.app.capitaliseFirstLetter(attr_name);
              jQuery(this).append(jQuery("<b>"+attr_name+": </b>"));
              jQuery(this).addClass('populated');
            }
            
            jQuery(this).append(jQuery("<span>"+attr_data+"</span>"));
          }
        });
      } else if (view.model instanceof CK.Model.Investigation) {
        console.log("InvestigationDetailsView is rendering a Investigation Model");
     
        jQuery('#investigation-details .investigation').each(function(){
          var attr_name = jQuery(this).attr('name');
          var attr_data = view.model.get(attr_name);
          
          if (attr_data && attr_data !== '') {
            if (jQuery(this).attr('name') !== 'headline') {
              attr_name = Sail.app.removeUnderscore(Sail.app.capitaliseFirstLetter(attr_name));
              jQuery(this).append(jQuery("<b>"+attr_name+": </b>"));
              jQuery(this).addClass('populated');
            }
            
            jQuery(this).append(jQuery("<span>"+attr_data+"</span>"));
          }
        });
      } else {
        console.error("InvestigationDetailsView is expecting a Proposal or Investigation Model");
        console.error(view.model);
      }

      // add author
      if (view.model.has('author')) {
        jQuery('#investigation-details .note-author').text('~'+view.model.get('author'));
      } else if (view.model.has('authors')) {
        var authors = '';
        _.each(view.model.get('authors'), function(a){
          authors += a + ', ';
        });
        jQuery('#investigation-details .note-author').text('~'+authors);
      }
      
      // add creation date
      if (view.model.has('created_at') && view.model.get('created_at').getMonth) {
        jQuery('#investigation-details .note-created-at').text(' (' + view.model.get('created_at').toLocaleDateString() + ' ' + view.model.get('created_at').toLocaleTimeString() + ')');
      }

      // set the voting buttons
      var votesArray = this.model.get('votes');
      if (_.contains(votesArray, Sail.app.userData.account.login)) {
        jQuery('#connect-btn-off').addClass('hide');
        jQuery('#connect-btn-on').removeClass('hide');
      } else {
        jQuery('#connect-btn-on').addClass('hide');
        jQuery('#connect-btn-off').removeClass('hide');
      }      

    }
  });


  /**
    InquiryInputView
  **/
  self.InquiryInputView = Backbone.View.extend({
    events: {
      'keyup :input': function(ev) {
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

      'click #share-inquiry-btn': 'share'
    },

    initialize: function() {
      console.log("Initializing InquiryInputView...");
      var attachedProp = Sail.app.proposalList.findWhere( {'_id':Sail.app.investigation.get('proposal_id')} );
      jQuery('#inquiry-header').text('New Inquiry Note about '+attachedProp.get('headline'));
      jQuery('#inquiry-header').effect("highlight", {}, 1500);      
    },

    share: function() {
      var view = this;
      // avoid weird entries showing up in the model
      window.clearTimeout(Sail.app.autoSaveTimer);

      if (jQuery('#inquiry-headline-entry').val() === '' || jQuery('#new-information-entry').val() === '') {
        jQuery().toastmessage('showErrorToast', "Please enter both new information and a headline");
      } else {
        Sail.app.investigation.set('headline',jQuery('#inquiry-headline-entry').val());
        Sail.app.investigation.set('new_information',jQuery('#new-information-entry').val());
        Sail.app.investigation.set('references',jQuery('#references-entry').val());
        Sail.app.investigation.set('published',true);
        Sail.app.saveInvestigation(view, this.model);
      }
    },

    render: function () {
      var view = this;
      console.log("Rendering InquiryInputView...");

      jQuery('#inquiry-headline-entry').val(Sail.app.investigation.get('headline'));
      jQuery('#new-information-entry').val(Sail.app.investigation.get('new_information'));
      jQuery('#references-entry').val(Sail.app.investigation.get('references'));
    }
  });


  /**
    ExperimentInputView
  **/
  self.ExperimentInputView = Backbone.View.extend({
    events: {
      'keyup :input': function(ev) {
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

      'click #share-experiment-btn': 'share'
    },

    initialize: function() {
      console.log("Initializing ExperimentInputView...");
      var attachedProp = Sail.app.proposalList.findWhere( {'_id':Sail.app.investigation.get('proposal_id')} );
      jQuery('#experiment-header').text('New Experiment about '+attachedProp.get('headline'));
      jQuery('#experiment-header').effect("highlight", {}, 1500);      
    },

    share: function() {
      var view = this;
      window.clearTimeout(Sail.app.autoSaveTimer);

      if (jQuery('#experiment-headline-entry').val() === '') {
        jQuery().toastmessage('showErrorToast', "Please enter a headline");
      } else {
        Sail.app.investigation.set('headline',jQuery('#experiment-headline-entry').val());
        Sail.app.investigation.set('question',jQuery('#experiment-question-entry').val());
        Sail.app.investigation.set('hypothesis',jQuery('#experiment-hypothesis-entry').val());
        Sail.app.investigation.set('method',jQuery('#experiment-method-entry').val());
        Sail.app.investigation.set('results',jQuery('#experiment-results-entry').val());
        Sail.app.investigation.set('conclusions',jQuery('#experiment-conclusions-entry').val());
        Sail.app.investigation.set('published',true);
        Sail.app.saveInvestigation(view, this.model);
      }
    },

    render: function () {
      var view = this;
      console.log("Rendering ExperimentInputView...");

      _.each(jQuery('#experiment-input .field'), function(f) {
        jQuery(f).val(Sail.app.investigation.get(f.name));
      });
    }
  });


  CK.Mobile.View = self;
})(window.CK);