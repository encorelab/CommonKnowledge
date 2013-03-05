(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard = (function(_super) {

    __extends(Smartboard, _super);

    function Smartboard() {
      this.initModels = __bind(this.initModels, this);

      this.createNewProposal = __bind(this.createNewProposal, this);

      this.switchToInterpretation = __bind(this.switchToInterpretation, this);

      this.switchToProposal = __bind(this.switchToProposal, this);

      this.switchToAnalysis = __bind(this.switchToAnalysis, this);

      this.startInterpretation = __bind(this.startInterpretation, this);

      this.startProposal = __bind(this.startProposal, this);

      this.startAnalysis = __bind(this.startAnalysis, this);

      this.unpause = __bind(this.unpause, this);

      this.pause = __bind(this.pause, this);

      this.createNewTag = __bind(this.createNewTag, this);

      this.getColourTagClassName = __bind(this.getColourTagClassName, this);

      this.authenticate = __bind(this.authenticate, this);

      this.init = __bind(this.init, this);
      return Smartboard.__super__.constructor.apply(this, arguments);
    }

    Smartboard.prototype.curnit = 'CommonKnowledge';

    Smartboard.prototype.name = 'CK.Smartboard';

    Smartboard.prototype.requiredConfig = {
      xmpp: {
        domain: 'string',
        port: 'number',
        url: 'string'
      },
      rollcall: {
        url: 'string'
      },
      assets: {
        url: 'string'
      },
      drowsy: {
        url: 'string'
      },
      wakeful: {
        url: 'string'
      }
    };

    Smartboard.prototype.init = function() {
      var userFilter,
        _this = this;
      Sail.verifyConfig(this.config, this.requiredConfig);
      console.log("Configuration is valid.");
      this.run = this.run || JSON.parse(jQuery.cookie('run'));
      if (this.run) {
        this.groupchatRoom = this.run.name + '@conference.' + this.xmppDomain;
      }
      userFilter = function(user) {
        return user.kind === 'Instructor';
      };
      Sail.modules.load('Rollcall.Authenticator', {
        mode: 'picker',
        askForRun: true,
        curnit: this.curnit,
        userFilter: userFilter
      }).load('Strophe.AutoConnector').load('AuthStatusWidget', {
        indicatorContainer: 'body',
        clickNameToLogout: true
      }).thenRun(function() {
        Sail.autobindEvents(_this);
        return _this.trigger('initialized');
      });
      this.rollcall = new Rollcall.Client(this.config.rollcall.url);
      this.wall = new CK.Smartboard.View.Wall({
        el: jQuery('#wall')
      });
      return this.tagCount = 0;
    };

    Smartboard.prototype.authenticate = function() {
      if (this.run) {
        return Rollcall.Authenticator.requestLogin();
      } else {
        return Rollcall.Authenticator.requestRun();
      }
    };

    Smartboard.prototype.getColourTagClassName = function() {
      if (this.tagCount > 4) {
        console.warn('Adding more tags then you have tag classes');
      }
      return 'group' + (++this.tagCount) + '-color';
    };

    Smartboard.prototype.createNewTag = function(name) {
      var colourClassName, tag,
        _this = this;
      colourClassName = this.getColourTagClassName();
      tag = new CK.Model.Tag({
        'name': name,
        'colourClass': colourClassName
      });
      tag.wake(this.config.wakeful.url);
      return tag.save({}, {
        success: function() {
          var sev;
          sev = new Sail.Event('new_tag', tag.toJSON());
          return _this.groupchat.sendEvent(sev);
        }
      });
    };

    Smartboard.prototype.pause = function() {
      var b, pos, sev, _i, _len, _ref, _results;
      sev = new Sail.Event('screen_lock');
      this.groupchat.sendEvent(sev);
      CK.getState('phase', function(s) {
        return CK.setState('phase', s.get('state'), true);
      });
      _ref = _.union(this.contributions.models, this.tags.models);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        b = _ref[_i];
        pos = this.wall.$el.find('#' + b.id).position();
        if (pos != null) {
          b.set({
            pos: {
              left: pos.left,
              top: pos.top
            }
          }, {
            silent: true
          });
          _results.push(b.save({}, {
            silent: true
          }));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Smartboard.prototype.unpause = function() {
      var sev;
      sev = new Sail.Event('screen_unlock');
      this.groupchat.sendEvent(sev);
      return CK.getState('phase', function(s) {
        return CK.setState('phase', s.get('state'), false);
      });
    };

    Smartboard.prototype.startAnalysis = function() {
      var sev;
      sev = new Sail.Event('start_analysis');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.startProposal = function() {
      var sev;
      sev = new Sail.Event('start_proposal');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.startInterpretation = function() {
      var sev;
      sev = new Sail.Event('start_interpretation');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.switchToAnalysis = function() {
      var mode;
      mode = 'analysis';
      this.wall.setMode(mode);
      return this.wall.cloud.reRenderForState(mode);
    };

    Smartboard.prototype.switchToProposal = function() {
      var mode;
      mode = 'propose';
      this.wall.setMode(mode);
      return this.wall.cloud.reRenderForState(mode);
    };

    Smartboard.prototype.switchToInterpretation = function() {
      var mode;
      mode = 'interpret';
      this.wall.setMode(mode);
      return this.wall.cloud.reRenderForState(mode);
    };

    Smartboard.prototype.createNewProposal = function(headline, description, justification, voteNumber, tagID, tagName) {
      var proposal;
      proposal = new CK.Model.Proposal();
      proposal.wake(this.config.wakeful.url);
      proposal.set({
        'headline': headline,
        'title': headline,
        'description': description,
        'justification': justification,
        'published': true,
        'author': 'ck1-ck2',
        'votes': voteNumber,
        'tag_group_id': tagID,
        'tag_group_name': tagName
      });
      return proposal.save();
    };

    Smartboard.prototype.initModels = function() {
      var _this = this;
      return Wakeful.loadFayeClient(this.config.wakeful.url).done(function() {
        _this.contributions = new CK.Model.Contributions();
        _this.contributions.wake(_this.config.wakeful.url);
        _this.proposals = new CK.Model.Proposals();
        _this.proposals.wake(_this.config.wakeful.url);
        _this.contributions.on('all', function(ev, data) {
          return console.log(_this.contributions.url, ev, data);
        });
        _this.contributions.on('add', function(contrib) {
          _this.wall.cloud.ensureNode(contrib);
          return _this.wall.cloud.render();
        });
        _this.contributions.on('reset', function(collection) {
          collection.each(_this.wall.cloud.ensureNode);
          return _this.wall.cloud.render();
        });
        _this.proposals.on('all', function(ev, data) {
          return console.log(_this.proposals.url, ev, data);
        });
        _this.proposals.on('add', function(proposal) {
          _this.wall.cloud.ensureNode(proposal);
          return _this.wall.cloud.render();
        });
        _this.proposals.on('reset', function(collection) {
          collection.each(_this.wall.cloud.ensureNode);
          return _this.wall.cloud.render();
        });
        _this.tags = new CK.Model.Tags();
        _this.tags.wake(_this.config.wakeful.url);
        _this.contributions.on('all', function(ev, data) {
          return console.log(_this.contributions.url, ev, data);
        });
        _this.tags.on('add', function(tag) {
          _this.wall.cloud.ensureNode(tag);
          tag.newlyAdded = true;
          return _this.wall.cloud.render();
        });
        _this.tags.on('reset', function(collection) {
          _this.tagCount = collection.length;
          console.log("Number of Tags: " + _this.tagCount);
          collection.each(_this.wall.cloud.ensureNode);
          return _this.wall.cloud.render();
        });
        CK.getState('phase', function(s) {
          if (s) {
            if (s.get('screen_lock') === true) {
              _this.wall.pause();
            }
            if (s.get('state') === 'analysis') {
              return _this.switchToAnalysis();
            } else if (s.get('state') === 'proposal') {
              return _this.switchToProposal();
            } else if (s.get('state') === 'interpretation') {
              return _this.switchToInterpretation();
            } else {
              return _this.wall.setMode('brainstorm');
            }
          }
        });
        return _this.trigger('ready');
      });
    };

    Smartboard.prototype.events = {
      initialized: function(ev) {
        this.authenticate();
        return console.log("Initialized...");
      },
      authenticated: function(ev) {
        console.log("Authenticated...");
        return CK.Model.init(this.config.drowsy.url, this.run.name).done(this.initModels);
      },
      'ui.initialized': function(ev) {
        return console.log("UI initialized...");
      },
      connected: function(ev) {
        return console.log("Connected...");
      },
      ready: function(ev) {
        var _this = this;
        console.log("Ready...");
        this.wall.render();
        return this.tags.fetch().done(function() {
          return _this.contributions.fetch().done(function() {
            return _this.proposals.fetch();
          });
        });
      },
      sail: {
        contribution: function(sev) {
          var _this = this;
          return this.contributions.fetch().done(function() {
            return _this.contributions.get(sev.payload).newlyAdded = true;
          });
        },
        build_on: function(sev) {
          return this.contributions.fetch().done(function() {
            return jQuery('#' + sev.payload._id).effect('highlight', 2000);
          });
        },
        contribution_tagged: function(sev) {
          return this.contributions.fetch();
        },
        screen_lock: function(sev) {
          return this.wall.pause();
        },
        screen_unlock: function(sev) {
          return this.wall.unpause();
        },
        start_analysis: function(sev) {
          return this.switchToAnalysis();
        },
        start_proposal: function(sev) {
          return this.switchToProposal();
        },
        start_interpretation: function(sev) {
          return this.switchToInterpretation();
        }
      }
    };

    return Smartboard;

  })(Sail.App);

}).call(this);
