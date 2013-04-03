(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard = (function(_super) {

    __extends(Smartboard, _super);

    function Smartboard() {
      this.setupModel = __bind(this.setupModel, this);

      this.unpause = __bind(this.unpause, this);

      this.pause = __bind(this.pause, this);

      this.createNewTag = __bind(this.createNewTag, this);

      this.getColourTagClassName = __bind(this.getColourTagClassName, this);

      this.authenticate = __bind(this.authenticate, this);

      this.init = __bind(this.init, this);
      return Smartboard.__super__.constructor.apply(this, arguments);
    }

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
      drowsy: {
        url: 'string'
      },
      wakeful: {
        url: 'string'
      },
      curnit: 'string'
    };

    Smartboard.prototype.init = function() {
      var userFilter,
        _this = this;
      Sail.verifyConfig(this.config, this.requiredConfig);
      console.log("Configuration is valid.");
      this.curnit = this.config.curnit;
      this.run = this.run || JSON.parse(jQuery.cookie('run'));
      userFilter = function(user) {
        return user.kind === 'Instructor';
      };
      Sail.modules.load('Rollcall.Authenticator', {
        mode: 'picker',
        askForRun: true,
        curnit: this.curnit,
        userFilter: userFilter
      }).load('Wakeful.ConnStatusIndicator').load('AuthStatusWidget', {
        indicatorContainer: 'body',
        clickNameToLogout: true
      }).thenRun(function() {
        Sail.autobindEvents(_this);
        return _this.trigger('initialized');
      });
      return this.rollcall = new Rollcall.Client(this.config.rollcall.url);
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
      var colourClassName, tag;
      colourClassName = this.getColourTagClassName();
      tag = new CK.Model.Tag({
        'name': name,
        'colourClass': colourClassName
      });
      tag.wake(this.config.wakeful.url);
      return tag.save({});
    };

    Smartboard.prototype.pause = function() {
      return CK.setState('run', {
        paused: true
      });
    };

    Smartboard.prototype.unpause = function() {
      CK.setState('run', {
        paused: false
      });
      if (this.wall.mode === 'evaluate') {
        return this.switchToInterpretation();
      }
    };

    Smartboard.prototype.setupModel = function() {
      var _this = this;
      this.contributions = CK.Model.awake.contributions;
      this.proposals = CK.Model.awake.proposals;
      this.tags = CK.Model.awake.tags;
      this.contributions.on('add', function(contrib) {
        _this.wall.cloud.ensureNode(contrib);
        return _this.wall.cloud.render();
      });
      this.proposals.on('add', function(proposal) {
        _this.wall.cloud.ensureNode(proposal);
        return _this.wall.cloud.render();
      });
      this.proposals.on('change', function(proposal) {
        if (_this.wall.cloud.ensureNode(proposal)) {
          return _this.wall.cloud.render();
        }
      });
      this.tags.on('add', function(tag) {
        _this.wall.cloud.ensureNode(tag);
        tag.newlyAdded = true;
        return _this.wall.cloud.render();
      });
      this.tags.on('reset', function(collection) {
        _this.tagCount = collection.length;
        console.log("Number of Tags: " + _this.tagCount);
        collection.each(_this.wall.cloud.ensureNode);
        return _this.wall.cloud.render();
      });
      this.runState = CK.getState('run');
      if (this.runState == null) {
        this.runState = CK.setState('run', {});
      }
      this.runState.wake(this.config.wakeful.url);
      return this.trigger('ready');
    };

    Smartboard.prototype.events = {
      initialized: function(ev) {
        this.authenticate();
        return console.log("Initialized...");
      },
      authenticated: function(ev) {
        var _this = this;
        console.log("Authenticated...");
        this.nickname = this.session.account.login;
        return CK.Model.init(this.config.drowsy.url, this.run.name).done(function() {
          return Wakeful.loadFayeClient(_this.config.wakeful.url).done(function() {
            return CK.Model.initWakefulCollections(_this.config.wakeful.url).done(function() {
              return _this.setupModel();
            });
          });
        });
      },
      'ui.initialized': function(ev) {
        return console.log("UI initialized...");
      },
      connected: function(ev) {
        return console.log("Connected...");
      },
      ready: function(ev) {
        console.log("Ready...");
        this.wall = new CK.Smartboard.View.Wall({
          el: jQuery('#wall'),
          runState: this.runState,
          tags: this.tags,
          contributions: this.contributions
        });
        return this.wall.render();
      },
      sail: {
        contribution: function(sev) {
          return this.contributions.add(sev.payload);
        },
        build_on: function(sev) {
          var contrib;
          contrib = this.contributions.get(sev.payload._id);
          return contrib.set(sev.payload).done(function() {
            return jQuery('#' + sev.payload._id).effect('highlight', 2000);
          });
        },
        contribution_tagged: function(sev) {
          var contrib;
          contrib = this.contributions.get(sev.payload._id);
          contrib.set(sev.payload);
          if (this.wall.cloud.ensureNode(contrib)) {
            console.log('Calling Wall Render with contribution....');
            console.log(contrib);
            return this.wall.cloud.render();
          }
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
