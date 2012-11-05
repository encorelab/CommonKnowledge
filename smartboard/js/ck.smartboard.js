// Generated by CoffeeScript 1.4.0
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard = (function(_super) {

    __extends(Smartboard, _super);

    function Smartboard() {
      this.switchToSynthesis = __bind(this.switchToSynthesis, this);

      this.switchToAnalysis = __bind(this.switchToAnalysis, this);

      this.startSynthesis = __bind(this.startSynthesis, this);

      this.startAnalysis = __bind(this.startAnalysis, this);

      this.unpause = __bind(this.unpause, this);

      this.pause = __bind(this.pause, this);

      this.createNewTag = __bind(this.createNewTag, this);

      this.authenticate = __bind(this.authenticate, this);

      this.init = __bind(this.init, this);
      return Smartboard.__super__.constructor.apply(this, arguments);
    }

    Smartboard.prototype.curnit = 'CommonKnowledge';

    Smartboard.prototype.name = 'CK.Smartboard';

    Smartboard.prototype.requiredConfig = {
      xmpp: {
        domain: 'string',
        port: 'number'
      },
      rollcall: {
        url: 'string'
      },
      assets: {
        url: 'string'
      },
      mongo: {
        url: 'string'
      }
    };

    Smartboard.prototype.init = function() {
      var bubbleContrib, bubbleTag, userFilter,
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
      bubbleContrib = function(contrib) {
        var bubble;
        bubble = new CK.Smartboard.View.ContributionBalloon({
          model: contrib
        });
        contrib.on('change', bubble.render);
        bubble.render();
        if (_this.wall.cloud != null) {
          return _this.wall.cloud.addContribution(bubble.$el);
        }
      };
      bubbleTag = function(tag) {
        var bubble;
        bubble = new CK.Smartboard.View.TagBalloon({
          model: tag
        });
        tag.on('change', bubble.render);
        bubble.render();
        if (_this.wall.cloud != null) {
          return _this.wall.cloud.addTag(bubble.$el);
        }
      };
      this.contributions = new CK.Model.Contributions();
      this.contributions.on('add', function(contrib) {
        contrib.justAdded = true;
        return bubbleContrib(contrib);
      });
      this.contributions.on('reset', function(collection) {
        return collection.each(bubbleContrib);
      });
      this.tags = new CK.Model.Tags();
      this.tags.on('add', function(tag) {
        var view;
        tag.justAdded = true;
        return view = bubbleTag(tag);
      });
      return this.tags.on('reset', function(collection) {
        return collection.each(bubbleTag);
      });
    };

    Smartboard.prototype.authenticate = function() {
      if (this.run) {
        return Rollcall.Authenticator.requestLogin();
      } else {
        return Rollcall.Authenticator.requestRun();
      }
    };

    Smartboard.prototype.createNewTag = function(name) {
      var tag,
        _this = this;
      tag = new CK.Model.Tag({
        name: name
      });
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
      _ref = _.union(this.contributions.models, this.tags.models);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        b = _ref[_i];
        pos = this.wall.$el.find('#' + b.id).position();
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
      }
      return _results;
    };

    Smartboard.prototype.unpause = function() {
      var sev;
      sev = new Sail.Event('screen_unlock');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.startAnalysis = function() {
      var sev;
      sev = new Sail.Event('start_student_tagging');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.startSynthesis = function() {
      var sev;
      sev = new Sail.Event('start_synthesis');
      return this.groupchat.sendEvent(sev);
    };

    Smartboard.prototype.switchToAnalysis = function() {
      return this.wall.setMode('analysis');
    };

    Smartboard.prototype.switchToSynthesis = function() {
      return this.wall.setMode('synthesis');
    };

    Smartboard.prototype.events = {
      initialized: function(ev) {
        this.authenticate();
        return console.log("Initialized...");
      },
      authenticated: function(ev) {
        var _this = this;
        console.log("Authenticated...");
        CK.Model.configure(this.config.mongo.url, this.run.name);
        return CK.getState('phase', function(s) {
          if (s) {
            if (s.get('state') === 'start_student_tagging') {
              return _this.switchToAnalysis();
            } else if (s.get('state') === 'start_synthesis') {
              return _this.switchToSynthesis();
            }
          }
        });
      },
      'ui.initialized': function(ev) {
        return console.log("UI initialized...");
      },
      connected: function(ev) {
        var deferC, deferT;
        console.log("Connected...");
        deferC = Q.defer();
        deferT = Q.defer();
        this.contributions.fetch({
          success: function() {
            return deferC.resolve();
          }
        });
        this.tags.fetch({
          success: function() {
            return deferT.resolve();
          }
        });
        return Q.all([deferC, deferT]).then(function() {
          return setTimeout((function() {
            return Sail.app.wall.cloudify();
          }), 1000);
        });
      },
      sail: {
        contribution: function(sev) {
          var c;
          c = this.contributions.get(sev.payload._id);
          if (c != null) {
            return c.set(sev.payload);
          } else {
            c = new CK.Model.Contribution(sev.payload);
            return this.contributions.add(c);
          }
        },
        build_on: function(sev) {
          var c;
          c = this.contributions.get(sev.payload._id);
          if (c != null) {
            c.set(sev.payload);
          } else {
            console.warn("New contribution added by build_on... something ain't right here...");
            c = new CK.Model.Contribution(sev.payload);
            this.contributions.add(c);
          }
          return jQuery('#' + c.id).effect('highlight', 2000);
        },
        new_tag: function(sev) {
          var t;
          t = this.tags.get(sev.payload._id);
          if (t != null) {
            return t.set(sev.payload);
          } else {
            t = new CK.Model.Tag(sev.payload);
            return this.tags.add(t);
          }
        },
        contribution_tagged: function(sev) {
          var addLink, c,
            _this = this;
          c = this.contributions.get(sev.payload._id);
          console.log("contribution_tagged, c is: ", c);
          addLink = function() {
            var tr, ts;
            c.set(sev.payload);
            ts = (function() {
              var _i, _len, _ref, _results;
              _ref = c.get('tags');
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                tr = _ref[_i];
                _results.push(this.tags.get(tr.id));
              }
              return _results;
            }).call(_this);
            console.log("adding links from ", c, " to ", ts);
            return _this.wall.cloud.addLinks(c, ts);
          };
          if (c) {
            return addLink();
          } else {
            console.warn("Contribution ", sev.payload._id, " not found locally... fetching updated contributions collection...");
            return this.contributions.fetch({
              success: function() {
                c = this.contributions.get(sev.payload._id);
                return addLink();
              }
            });
          }
        },
        screen_lock: function(sev) {
          return this.wall.pause();
        },
        screen_unlock: function(sev) {
          return this.wall.unpause();
        },
        start_student_tagging: function(sev) {
          return this.switchToAnalysis();
        },
        start_synthesis: function(sev) {
          return this.switchToSynthesis();
        }
      }
    };

    return Smartboard;

  })(Sail.App);

}).call(this);
