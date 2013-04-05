(function() {
  var $, Backbone, CK, Drowsy, _,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  if (typeof exports !== "undefined" && exports !== null) {
    $ = require("jquery");
    _ = require("underscore");
    Backbone = require("backbone");
    Backbone.$ = $;
    Drowsy = require("backbone.drowsy").Drowsy;
    CK = {};
    exports.CK = CK;
  } else {
    window.CK = window.CK || {};
    CK = window.CK;
    $ = window.$;
    _ = window._;
    Drowsy = window.Drowsy;
  }

  CK.Model = (function() {

    function Model() {}

    Model.requiredCollections = ['contributions', 'tags', 'states', 'proposals'];

    Model.init = function(url, db) {
      var deferredConfigure,
        _this = this;
      deferredConfigure = $.Deferred();
      if (url == null) {
        throw new Error("Cannot configure model because no DrowsyDromedary URL was given!");
      }
      if (db == null) {
        throw new Error("Cannot configure model because no database name was given!");
      }
      this.baseURL = url;
      this.dbURL = "" + url + "/" + db;
      this.server = new Drowsy.Server(url);
      this.db = this.server.database(db);
      this.createNecessaryCollections(this.requiredCollections).then(function() {
        _this.defineModelClasses();
        return deferredConfigure.resolve();
      });
      return deferredConfigure;
    };

    Model.createNecessaryCollections = function(requiredCollections) {
      var df, dfs,
        _this = this;
      dfs = [];
      df = $.Deferred();
      this.db.collections(function(colls) {
        var col, existingCollections, _i, _len, _results;
        existingCollections = _.pluck(colls, 'name');
        _results = [];
        for (_i = 0, _len = requiredCollections.length; _i < _len; _i++) {
          col = requiredCollections[_i];
          if (__indexOf.call(existingCollections, col) < 0) {
            console.log("Creating collection '" + col + "' under " + CK.Model.dbURL);
            _results.push(dfs.push(_this.db.createCollection(col)));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
      $.when.apply($, dfs).done(function() {
        return df.resolve();
      });
      return df;
    };

    Model.defineModelClasses = function() {
      Drowsy.Document.prototype.defaults = function() {
        return {
          created_at: new Date()
        };
      };
      this.Contribution = (function(_super) {

        __extends(Contribution, _super);

        function Contribution() {
          this.hasTag = __bind(this.hasTag, this);

          this.removeTag = __bind(this.removeTag, this);

          this.addTag = __bind(this.addTag, this);

          this.get = __bind(this.get, this);
          return Contribution.__super__.constructor.apply(this, arguments);
        }

        Contribution.prototype.get = function(attr) {
          var date, val;
          val = Contribution.__super__.get.call(this, attr);
          if (attr === 'created_at') {
            if (!(val instanceof Date)) {
              date = new Date(val);
              if (!isNaN(date.getTime())) {
                val = date;
              }
            }
          }
          return val;
        };

        Contribution.prototype.addTag = function(tag, tagger) {
          var existingTagRelationships, tagRel,
            _this = this;
          if (!(tag instanceof CK.Model.Tag)) {
            console.error("Cannot addTag ", tag, " because it is not a CK.Model.Tag instance!");
            throw "Invalid tag (doesn't exist)";
          }
          if (!tag.id) {
            console.error("Cannot addTag ", tag, " to contribution ", this, " because it doesn't have an id!");
            throw "Invalid tag (no id)";
          }
          existingTagRelationships = this.get('tags') || [];
          if (_.any(existingTagRelationships, function(tr) {
            return tr.id === tag.id;
          })) {
            console.warn("Cannot addTag ", tag, " to contribution ", this, " because it already has this tag.");
            return this;
          }
          tagRel = {
            id: tag.id,
            name: tag.get('name'),
            tagger: tagger,
            tagged_at: new Date()
          };
          existingTagRelationships.push(tagRel);
          this.set('tags', existingTagRelationships);
          return this;
        };

        Contribution.prototype.removeTag = function(tag, tagger) {
          var reducedTags,
            _this = this;
          reducedTags = _.reject(this.get('tags'), function(t) {
            return (t.id === tag.id || t.name === tag.get('name')) && (!(tagger != null) || t.tagger === tagger);
          });
          return this.set('tags', reducedTags);
        };

        Contribution.prototype.hasTag = function(tag, tagger) {
          var _this = this;
          return _.any(this.get('tags'), function(t) {
            return t.id === tag.id && (!(tagger != null) || t.tagger === tagger);
          });
        };

        return Contribution;

      })(this.db.Document('contributions'));
      this.Proposal = (function(_super) {

        __extends(Proposal, _super);

        function Proposal() {
          this.hasTag = __bind(this.hasTag, this);

          this.removeTag = __bind(this.removeTag, this);

          this.addTag = __bind(this.addTag, this);

          this.get = __bind(this.get, this);
          return Proposal.__super__.constructor.apply(this, arguments);
        }

        Proposal.prototype.get = function(attr) {
          var date, val;
          val = Proposal.__super__.get.call(this, attr);
          if (attr === 'created_at') {
            if (!(val instanceof Date)) {
              date = new Date(val);
              if (!isNaN(date.getTime())) {
                val = date;
              }
            }
          }
          return val;
        };

        Proposal.prototype.addTag = function(tag) {
          var existingTagID;
          if (!(tag instanceof CK.Model.Tag)) {
            console.error("Cannot addTag ", tag, " because it is not a CK.Model.Tag instance!");
            throw "Invalid tag (doesn't exist)";
          }
          if (!tag.id) {
            console.error("Cannot addTag ", tag, " to contribution ", this, " because it doesn't have an id!");
            throw "Invalid tag (no id)";
          }
          existingTagID = this.get('tag_group_id') || null;
          if (existingTagID === tag.id) {
            console.warn("Cannot addTag ", tag, " to contribution ", this, " because it already has this tag.");
            return this;
          }
          this.set('tag_group_name', tag.name);
          this.set('tag_group_id', tag.id);
          return this;
        };

        Proposal.prototype.removeTag = function(tag) {
          var tagID, tagName;
          tagID = this.get('tag_group_id');
          tagName = this.get('tag_group_name');
          if (tagID === tag.id || tagName === tag.name) {
            this.set('tag_group_id', null);
            return this.set('tag_group_name', null);
          }
        };

        Proposal.prototype.hasTag = function(tag) {
          var tagID;
          tagID = this.get('tag_group_id');
          if (tag.id === tagID) {
            return true;
          } else {
            return false;
          }
        };

        return Proposal;

      })(this.db.Document('proposals'));
      this.Contributions = (function(_super) {

        __extends(Contributions, _super);

        function Contributions() {
          return Contributions.__super__.constructor.apply(this, arguments);
        }

        Contributions.prototype.model = CK.Model.Contribution;

        return Contributions;

      })(this.db.Collection('contributions'));
      this.Proposals = (function(_super) {

        __extends(Proposals, _super);

        function Proposals() {
          return Proposals.__super__.constructor.apply(this, arguments);
        }

        Proposals.prototype.model = CK.Model.Proposal;

        return Proposals;

      })(this.db.Collection('proposals'));
      this.Tag = (function(_super) {

        __extends(Tag, _super);

        function Tag() {
          return Tag.__super__.constructor.apply(this, arguments);
        }

        return Tag;

      })(this.db.Document('tags'));
      this.Tags = (function(_super) {

        __extends(Tags, _super);

        function Tags() {
          return Tags.__super__.constructor.apply(this, arguments);
        }

        Tags.prototype.model = CK.Model.Tag;

        return Tags;

      })(this.db.Collection('tags'));
      this.State = (function(_super) {

        __extends(State, _super);

        function State() {
          return State.__super__.constructor.apply(this, arguments);
        }

        return State;

      })(this.db.Document('states'));
      return this.States = (function(_super) {

        __extends(States, _super);

        function States() {
          return States.__super__.constructor.apply(this, arguments);
        }

        States.prototype.model = CK.Model.State;

        return States;

      })(this.db.Collection('states'));
    };

    Model.initWakefulCollections = function(wakefulUrl) {
      var camelCase, coll, collName, deferreds, _i, _len, _ref;
      deferreds = [];
      camelCase = function(str) {
        return str.replace(/([\-_][a-z]|^[a-z])/g, function($1) {
          return $1.toUpperCase().replace(/[\-_]/, '');
        });
      };
      this.awake = {};
      _ref = this.requiredCollections;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        collName = _ref[_i];
        coll = new this[camelCase(collName)]();
        coll.wake(wakefulUrl);
        this.awake[collName] = coll;
        deferreds.push(coll.fetch());
      }
      return jQuery.when.apply(jQuery, deferreds);
    };

    return Model;

  })();

}).call(this);
