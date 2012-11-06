// Generated by CoffeeScript 1.4.0
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard.View = (function() {

    function View() {}

    View.findOrCreate = function(parent, selector, html) {
      var el;
      el = jQuery(parent).find(selector);
      if (el.length > 0) {
        return el;
      }
      el = jQuery(html);
      parent.append(el);
      return el;
    };

    return View;

  })();

  CK.Smartboard.View.Base = (function(_super) {

    __extends(Base, _super);

    function Base() {
      this.domID = __bind(this.domID, this);

      this.findOrCreate = __bind(this.findOrCreate, this);
      return Base.__super__.constructor.apply(this, arguments);
    }

    Base.prototype.findOrCreate = function(selector, html) {
      return CK.Smartboard.View.findOrCreate(this.$el, selector, html);
    };

    Base.prototype.corporealize = function() {
      this.$el.hide();
      if (!(this.$el.parent().length > 0)) {
        if (this.model.justAdded) {
          this.$el.addClass('new');
          delete this.model.justAdded;
        }
        this.$el.css('position', 'absolute');
        jQuery('#wall').append(this.$el);
      }
      if (this.model.has('pos')) {
        this.$el.css({
          left: this.model.get('pos').left + 'px',
          top: this.model.get('pos').top + 'px'
        });
      } else {
        this.autoPosition();
      }
      return this.$el.show();
    };

    Base.prototype.autoPosition = function() {
      var left, top, wallHeight, wallWidth;
      wallWidth = jQuery('#wall').width();
      wallHeight = jQuery('#wall').height();
      left = Math.random() * (wallWidth - this.$el.width());
      top = Math.random() * (wallHeight - this.$el.height());
      this.$el.css({
        left: left + 'px',
        top: top + 'px'
      });
      return this.model.save({
        pos: {
          left: left,
          top: top
        }
      });
    };

    Base.prototype.domID = function() {
      return this.model.id;
    };

    return Base;

  })(Backbone.View);

  CK.Smartboard.View.Wall = (function(_super) {

    __extends(Wall, _super);

    function Wall() {
      this.cloudify = __bind(this.cloudify, this);

      this.setMode = __bind(this.setMode, this);

      this.changeWatermark = __bind(this.changeWatermark, this);

      this.unpause = __bind(this.unpause, this);

      this.pause = __bind(this.pause, this);

      this.submitNewTag = __bind(this.submitNewTag, this);
      return Wall.__super__.constructor.apply(this, arguments);
    }

    Wall.prototype.tagName = 'div';

    Wall.prototype.id = 'wall';

    Wall.prototype.events = {
      'click #add-tag-opener': function(ev) {
        var addTagContainer,
          _this = this;
        addTagContainer = this.$el.find('#add-tag-container');
        addTagContainer.toggleClass('opened');
        if (addTagContainer.hasClass('opened')) {
          return setTimeout(function() {
            return _this.$el.find('#new-tag').focus();
          }, 1000);
        }
      },
      'click #submit-new-tag': function(ev) {
        return this.submitNewTag();
      },
      'keydown #new-tag': function(ev) {
        if (ev.keyCode === 13) {
          return this.submitNewTag();
        }
      },
      'click #toggle-pause': function(ev) {
        var $p;
        $p = jQuery(ev.target);
        if ($p.hasClass('paused')) {
          Sail.app.unpause();
          return $p.removeClass('paused').text('Pause');
        } else {
          $p.addClass('paused').text('Resume');
          return Sail.app.pause();
        }
      },
      'click #go-analyze': function(ev) {
        if (this.mode === 'brainstorm') {
          return Sail.app.startAnalysis();
        }
      },
      'click #go-synthesize': function(ev) {
        if (this.mode === 'analysis') {
          return Sail.app.startSynthesis();
        }
      }
    };

    Wall.prototype.submitNewTag = function() {
      var newTag;
      newTag = this.$el.find('#new-tag').val();
      Sail.app.createNewTag(newTag);
      this.$el.find('#add-tag-container').removeClass('opened').blur();
      return this.$el.find('#new-tag').val('');
    };

    Wall.prototype.pause = function() {
      this.cloud.force.stop();
      jQuery('body').addClass('paused');
      this.$el.find('#toggle-pause').addClass('paused').text('Resume');
      return this.changeWatermark("Paused");
    };

    Wall.prototype.unpause = function() {
      this.cloud.force.resume();
      jQuery('body').removeClass('paused');
      this.$el.find('#toggle-pause').removeClass('paused').text('Pause');
      return this.changeWatermark(this.mode || "brainstorm");
    };

    Wall.prototype.changeWatermark = function(text) {
      return jQuery('#watermark').fadeOut(800, function() {
        return jQuery(this).text(text).fadeIn(800);
      });
    };

    Wall.prototype.setMode = function(mode) {
      if (!mode) {
        mode = "brainstorm";
      }
      this.mode = mode;
      if (mode === 'analysis') {
        jQuery('body').removeClass('mode-synthesis').addClass('mode-analysis');
        return this.changeWatermark("analysis");
      } else if (mode === 'synthesis') {
        jQuery('body').removeClass('mode-analysis').addClass('mode-synthesis');
        return this.changeWatermark("synthesis");
      } else {
        jQuery('body').removeClass('mode-analysis').removeClass('mode-synthesis');
        return this.changeWatermark("brainstorm");
      }
    };

    Wall.prototype.cloudify = function() {
      var $n, cloud, i, n, _i, _len, _ref,
        _this = this;
      console.log("Cloudifying the wall...");
      cloud = {};
      this.cloud = cloud;
      cloud.wallWidth = this.$el.innerWidth();
      cloud.wallHeight = this.$el.innerHeight();
      cloud.linkDistance = function(link, i) {
        return (jQuery(link.source).outerWidth() / 2 + jQuery(link.target).outerWidth() / 2) + 10;
      };
      cloud.tick = function() {
        var i, q, _i, _ref;
        cloud.balloon.style('left', function(d) {
          var balloonWidth;
          balloonWidth = jQuery(d).outerWidth();
          if (d.x + balloonWidth / 2 > cloud.wallWidth) {
            d.x = cloud.wallWidth - balloonWidth / 2;
          } else if (d.x - balloonWidth / 2 < 0) {
            d.x = 0 + balloonWidth / 2;
          }
          return (d.x - balloonWidth / 2) + 'px';
        }).style('top', function(d) {
          var balloonHeight;
          balloonHeight = jQuery(d).outerHeight();
          if (d.y + balloonHeight / 2 > cloud.wallHeight) {
            d.y = cloud.wallHeight - balloonHeight / 2;
          } else if (d.y - balloonHeight / 2 < 0) {
            d.y = 0 + balloonHeight / 2;
          }
          return (d.y - balloonHeight / 2) + 'px';
        }).each(function(d) {
          if (jQuery(d).hasClass('pinned')) {
            return d.fixed = true;
          }
        });
        q = d3.geom.quadtree(cloud.nodes);
        for (i = _i = 0, _ref = cloud.nodes.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          q.visit(cloud.detectCollision(cloud.nodes[i]));
        }
        return cloud.connector.style("z-index", -1).style("left", function(d) {
          return d.source.x + "px";
        }).style("top", function(d) {
          return d.source.y + "px";
        }).style("width", function(d) {
          var dx, dy;
          dx = d.target.x - d.source.x;
          dy = d.target.y - d.source.y;
          return Math.sqrt(dx * dx + dy * dy) + "px";
        }).style("-webkit-transform", cloud.connectorTransform).style("-moz-transform", cloud.connectorTransform).style("transform", cloud.connectorTransform);
      };
      cloud.nodes = this.$el.find('.balloon').toArray();
      cloud.links = [];
      _ref = cloud.nodes;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        n = _ref[i];
        $n = jQuery(n);
        n.index = i;
      }
      cloud.force = d3.layout.force().charge(0).linkDistance(cloud.linkDistance).linkStrength(0.2).gravity(0).friction(0.2).size([cloud.wallWidth, cloud.wallHeight]).nodes(cloud.nodes).links(cloud.links).on('tick', cloud.tick);
      cloud.tags = {};
      Sail.app.tags.each(function(tag) {
        var t;
        t = jQuery('#' + tag.id)[0];
        return cloud.tags[tag.id] = t;
      });
      jQuery('.balloon.contribution').each(function() {
        var c, contribBalloon, tag, tid, _j, _len1, _ref1, _results;
        contribBalloon = jQuery(this);
        if (!contribBalloon.data('tags')) {
          return;
        }
        c = contribBalloon[0];
        _ref1 = contribBalloon.data('tags').split(' ');
        _results = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          tid = _ref1[_j];
          if (cloud.tags[tid]) {
            tag = cloud.tags[tid];
            (tag.contribs != null) || (tag.contribs = []);
            tag.contribs.push(c.id);
            _results.push(cloud.links.push({
              source: tag,
              target: c
            }));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
      cloud.vis = d3.select("#" + this.id);
      cloud.addContribution = function(c) {
        var $c, id;
        if (c.jquery) {
          id = c.attr('id');
          $c = c;
        } else if (c.id) {
          id = c.id;
          $c = _this.$el.find('#' + id);
        } else {
          console.error("Contribution given to cloud.addContribution must have an id!");
          throw "Invalid Contributiona";
        }
        c = $c[0];
        c.index = cloud.nodes.length;
        cloud.nodes.push(c);
        return cloud.update();
      };
      cloud.addTag = function(t) {
        var $t, id;
        if (t.jquery) {
          id = t.attr('id');
          $t = t;
        } else if (t.id) {
          id = t.id;
          $t = _this.$el.find('#' + id);
        } else {
          console.error("Tag given to cloud.addTag must have an id!");
          throw "Invalid Tag";
        }
        t = $t[0];
        t.index = cloud.nodes.length;
        cloud.tags[t.id] = t;
        cloud.nodes.push(t);
        return cloud.update();
      };
      cloud.addLinks = function(c, ts) {
        var $c, $t, id, t, _j, _len1;
        if (c.jquery) {
          id = c.attr('id');
          $c = c;
        } else if (c.id) {
          id = c.id;
          $c = _this.$el.find('#' + id);
        } else {
          console.error("Contribution given to cloud.addContribution must have an id!");
          throw "Invalid Contributiona";
        }
        c = $c[0];
        for (_j = 0, _len1 = ts.length; _j < _len1; _j++) {
          t = ts[_j];
          if (t.jquery) {
            id = t.attr('id');
            $t = t;
          } else if (t.id) {
            id = t.id;
            $t = _this.$el.find('#' + id);
          } else {
            console.error("Tag given to cloud.addTag must have an id!");
            throw "Invalid Tag";
          }
          t = $t[0];
          (t.contribs != null) || (t.contribs = []);
          t.contribs.push(c.id);
          cloud.links.push({
            source: t,
            target: c
          });
        }
        return cloud.update();
      };
      cloud.detectCollision = function(b) {
        var $b, bHeight, bIsTag, bWidth, nx1, nx2, ny1, ny2;
        $b = jQuery(b);
        bWidth = b.width;
        bHeight = b.height;
        nx1 = b.x - bWidth / 2;
        nx2 = b.x + bWidth / 2;
        ny1 = b.y - bHeight / 2;
        ny2 = b.y + bHeight / 2;
        bIsTag = $b.hasClass('tag');
        return function(quad, x1, y1, x2, y2) {
          var $q, h, qHeight, qIsTag, qWidth, w, xDist, xNudge, xOverlap, yDist, yNudge, yOverlap;
          if (quad.point && quad.point !== b) {
            qWidth = quad.point.width;
            qHeight = quad.point.height;
            w = bWidth / 2 + qWidth / 2;
            h = bHeight / 2 + qHeight / 2;
            xDist = Math.abs(b.x - quad.point.x);
            yDist = Math.abs(b.y - quad.point.y);
            if (xDist < w && yDist < h) {
              $q = jQuery(quad.point);
              qIsTag = $q.hasClass('tag');
              yOverlap = h - yDist;
              xOverlap = w - xDist;
              if (xDist / w < yDist / h) {
                yNudge = yOverlap / 2;
                if (b.y < quad.point.y) {
                  b.y -= yNudge;
                  quad.point.y += yNudge;
                } else {
                  b.y += yNudge;
                  quad.point.y -= yNudge;
                }
              } else {
                xNudge = xOverlap / 2;
                if (b.x < quad.point.x) {
                  b.x -= xNudge;
                  quad.point.x += xNudge;
                } else {
                  b.x += xNudge;
                  quad.point.x -= xNudge;
                }
              }
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
      };
      cloud.connectorTransform = function(d) {
        return "rotate(" + (Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) + "deg)";
      };
      cloud.update = function(ev) {
        var pos, _j, _len1, _ref1;
        _ref1 = cloud.nodes;
        for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
          n = _ref1[i];
          $n = jQuery(n);
          pos = $n.position();
          if (n.x == null) {
            n.x = pos.left + $n.outerWidth() / 2;
          }
          if (n.y == null) {
            n.y = pos.top + $n.outerHeight() / 2;
          }
          n.width = $n.outerWidth();
          n.height = $n.outerHeight();
        }
        cloud.balloon = cloud.vis.selectAll('.balloon').data(cloud.nodes).call(cloud.force.drag);
        cloud.connector = cloud.vis.selectAll(".connector").data(cloud.links);
        cloud.connector.enter().append("div").attr("class", "connector");
        return cloud.force.start();
      };
      return cloud.update();
    };

    return Wall;

  })(CK.Smartboard.View.Base);

  CK.Smartboard.View.Balloon = (function(_super) {

    __extends(Balloon, _super);

    function Balloon() {
      this.moveToTop = __bind(this.moveToTop, this);
      return Balloon.__super__.constructor.apply(this, arguments);
    }

    Balloon.prototype.moveToTop = function() {
      var maxZ;
      maxZ = _.max(jQuery('.balloon').map(function() {
        return parseInt(jQuery(this).zIndex()) + 1;
      }));
      return this.$el.zIndex(maxZ);
    };

    return Balloon;

  })(CK.Smartboard.View.Base);

  CK.Smartboard.View.ContributionBalloon = (function(_super) {

    __extends(ContributionBalloon, _super);

    function ContributionBalloon() {
      this.renderBuildons = __bind(this.renderBuildons, this);

      this.renderTags = __bind(this.renderTags, this);

      this.render = __bind(this.render, this);

      this.id = __bind(this.id, this);
      return ContributionBalloon.__super__.constructor.apply(this, arguments);
    }

    ContributionBalloon.prototype.tagName = 'article';

    ContributionBalloon.prototype.className = 'contribution balloon';

    ContributionBalloon.prototype.id = function() {
      return this.domID();
    };

    ContributionBalloon.prototype.events = {
      'mousedown': function(ev) {
        return this.moveToTop();
      },
      'click': function(ev) {
        this.$el.toggleClass('opened');
        if (this.$el.hasClass('opened')) {
          if ((Sail.app.wall.cloud != null) && (Sail.app.wall.cloud.force != null)) {
            return Sail.app.wall.cloud.force.stop();
          }
        }
      }
    };

    ContributionBalloon.prototype.render = function() {
      var body, headline, meta;
      if (this.model.get('kind') === 'synthesis') {
        this.$el.addClass('synthesis');
      }
      headline = this.findOrCreate('.headline', "<h3 class='headline'></h3>");
      headline.text(this.model.get('headline'));
      body = this.findOrCreate('.body', "<div class='body'></div>");
      if (this.model.get('content_type') === 'text') {
        body.text(this.model.get('content'));
      } else {
        body.text(this.model.get('content'));
      }
      meta = this.findOrCreate('.meta', "<div class='meta'><span class='author'></span></div>");
      meta.find('.author').text(this.model.get('author')).addClass("author-" + (this.model.get('author')));
      this.renderTags();
      this.renderBuildons();
      this.corporealize();
      return this;
    };

    ContributionBalloon.prototype.renderTags = function() {
      var tag, tagIds;
      if (!this.model.has('tags')) {
        return;
      }
      tagIds = (function() {
        var _i, _len, _ref, _results;
        _ref = this.model.get('tags');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tag = _ref[_i];
          _results.push(tag.id);
        }
        return _results;
      }).call(this);
      this.$el.attr('data-tags', tagIds.join(" "));
      return this;
    };

    ContributionBalloon.prototype.renderBuildons = function() {
      var $b, b, buildons, container, counter, _i, _len, _results;
      if (!this.model.has('build_ons')) {
        return;
      }
      buildons = this.model.get('build_ons');
      container = this.findOrCreate('.buildons', "<div class='buildons'></div>");
      container.remove('div.buildon');
      counter = CK.Smartboard.View.findOrCreate(this.$el.find('.meta'), '.buildon-counter', "<div class='buildon-counter'></div>");
      counter.html('');
      _results = [];
      for (_i = 0, _len = buildons.length; _i < _len; _i++) {
        b = buildons[_i];
        counter.append("•");
        $b = jQuery("                <div class='buildon'>                    <div class='author'></div>                    <div class='content'></div>                </div>            ");
        $b.find('.author').text(b.author);
        $b.find('.content').text(b.content);
        _results.push(container.append($b));
      }
      return _results;
    };

    return ContributionBalloon;

  })(CK.Smartboard.View.Balloon);

  CK.Smartboard.View.TagBalloon = (function(_super) {

    __extends(TagBalloon, _super);

    function TagBalloon() {
      this.render = __bind(this.render, this);

      this.id = __bind(this.id, this);
      return TagBalloon.__super__.constructor.apply(this, arguments);
    }

    TagBalloon.prototype.tagName = 'div';

    TagBalloon.prototype.className = 'tag balloon';

    TagBalloon.prototype.id = function() {
      return this.domID();
    };

    TagBalloon.prototype.events = {
      'mousedown': function(ev) {
        return this.moveToTop();
      },
      'mouseout': function(ev) {
        var pos, tag, tid;
        if (this.model.get('pinned')) {
          console.log("Saving pinned tag's position");
          pos = this.$el.position();
          tid = this.$el.attr('id');
          tag = Sail.app.tags.get(tid);
          if (tag) {
            tag.set({
              pos: {
                left: pos.left,
                top: pos.top,
                pinned: true
              }
            }, {
              silent: true
            });
            return tag.save({}, {
              silent: true
            });
          } else {
            return console.log("Couldn't save pinned tag's position -- couldn't find a tag with id: ", tid);
          }
        }
      },
      'click': function(ev) {
        this.model.set('pinned', !this.model.get('pinned'), {
          silent: true
        });
        if (this.model.get('pinned')) {
          return this.$el.addClass('pinned');
        } else {
          return this.$el.removeClass('pinned');
        }
      }
    };

    TagBalloon.prototype.render = function() {
      var name;
      name = this.findOrCreate('.name', "<h3 class='name'></h3>");
      name.text(this.model.get('name'));
      if (this.model.get('pinned')) {
        this.$el.addClass('pinned');
      } else {
        this.$el.removeClass('pinned');
      }
      this.corporealize();
      this.$el.show();
      return this;
    };

    return TagBalloon;

  })(CK.Smartboard.View.Balloon);

}).call(this);
