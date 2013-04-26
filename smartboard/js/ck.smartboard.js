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

      this.getColorTagClassName = __bind(this.getColorTagClassName, this);

      this.authenticate = __bind(this.authenticate, this);

      this.init = __bind(this.init, this);
      return Smartboard.__super__.constructor.apply(this, arguments);
    }

    Smartboard.prototype.name = 'CK.Smartboard';

    Smartboard.prototype.requiredConfig = {
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

    Smartboard.prototype.getColorTagClassName = function() {
      this.tagCount = this.tags.length + 1;
      if (this.tagCount > 4) {
        console.warn('Adding more tags then you have tag classes');
      }
      return 'group' + this.tagCount + '-color';
    };

    Smartboard.prototype.createNewTag = function(name) {
      var tag;
      if (this.tags.length < 4) {
        tag = new CK.Model.Tag({
          name: name,
          colorClassName: this.getColorTagClassName(),
          created_at: new Date()
        });
        tag.wake(this.config.wakeful.url);
        return this.tags.add(tag);
      } else {
        return console.warn('Adding more than 4 tags is leading to problems. Button should be disabled ...');
      }
    };

    Smartboard.prototype.pause = function() {
      return CK.setState('RUN', {
        paused: true
      });
    };

    Smartboard.prototype.unpause = function() {
      CK.setState('RUN', {
        paused: false
      });
      if (this.wall.mode === 'evaluate') {
        return this.switchToInterpretation();
      }
    };

    Smartboard.prototype.setupModel = function() {
      this.contributions = CK.Model.awake.contributions;
      this.proposals = CK.Model.awake.proposals;
      this.tags = CK.Model.awake.tags;
      this.runState = CK.getState('RUN');
      if (this.runState == null) {
        this.runState = CK.setState('RUN', {
          phase: 'brainstorm'
        });
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
      }
    };

    return Smartboard;

  })(Sail.App);

}).call(this);
