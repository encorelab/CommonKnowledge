(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  CK.Smartboard.View.BalloonCloud = (function() {

    function BalloonCloud(wallView) {
      this.render = __bind(this.render, this);

      this.reRenderForState = __bind(this.reRenderForState, this);

      this.inflateBalloons = __bind(this.inflateBalloons, this);

      this.ensureLink = __bind(this.ensureLink, this);

      this.ensureNode = __bind(this.ensureNode, this);

      this.startForce = __bind(this.startForce, this);

      this.detectCollision = __bind(this.detectCollision, this);

      this.tick = __bind(this.tick, this);

      this.connectorTransform = __bind(this.connectorTransform, this);

      this.linkDistance = __bind(this.linkDistance, this);

      this.generateForceFunction = __bind(this.generateForceFunction, this);
      console.log("Cloudifying the wall...");
      this.wall = wallView;
      this.nodes = [];
      this.links = [];
      this.tagList = {};
      this.uniqueTagCount = 0;
      this.d3QuadTree = null;
      this.vis = d3.select("#" + this.wall.id);
    }

    BalloonCloud.prototype.generateForceFunction = function() {
      return d3.layout.force().charge(0).linkDistance(this.linkDistance).linkStrength(0.2).gravity(0).friction(0.2).size([this.wallWidth, this.wallHeight]).nodes(this.nodes).links(this.links).on('tick', this.tick);
    };

    BalloonCloud.prototype.linkDistance = function(link, i) {
      if (!((link.source.view != null) && (link.target.view != null))) {
        return 20;
      }
      return (link.source.view.$el.outerWidth() / 2 + link.target.view.$el.outerWidth() / 2) + 10;
    };

    BalloonCloud.prototype.connectorTransform = function(d) {
      return "rotate(" + (Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) + "deg)";
    };

    BalloonCloud.prototype.tick = function() {
      var i, _i, _ref,
        _this = this;
      this.balloons.style('left', function(d) {
        var balloonWidth;
        balloonWidth = d.view.$el.outerWidth();
        if (d.x + balloonWidth / 2 > _this.wallWidth) {
          d.x = _this.wallWidth - balloonWidth / 2;
        } else if (d.x - balloonWidth / 2 < 0) {
          d.x = 0 + balloonWidth / 2;
        }
        return (d.x - balloonWidth / 2) + 'px';
      }).style('top', function(d) {
        var balloonHeight;
        balloonHeight = d.view.$el.outerHeight();
        if (d.y + balloonHeight / 2 > _this.wallHeight) {
          d.y = _this.wallHeight - balloonHeight / 2;
        } else if (d.y - balloonHeight / 2 < 0) {
          d.y = 0 + balloonHeight / 2;
        }
        return (d.y - balloonHeight / 2) + 'px';
      }).each(function(d) {
        if (d.view.$el.hasClass('pinned')) {
          return d.fixed = true;
        }
      });
      for (i = _i = 0, _ref = this.nodes.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.d3QuadTree.visit(this.detectCollision(this.nodes[i]));
      }
      return this.connectors.style("z-index", -1).style("left", function(d) {
        return d.source.x + "px";
      }).style("top", function(d) {
        return d.source.y + "px";
      }).style("width", function(d) {
        var dx, dy;
        dx = d.target.x - d.source.x;
        dy = d.target.y - d.source.y;
        return Math.sqrt(dx * dx + dy * dy) + "px";
      }).style("-webkit-transform", this.connectorTransform).style("-moz-transform", this.connectorTransform).style("transform", this.connectorTransform);
    };

    /*
        corporealizeContribution: (contrib) =>
            unless contrib.id
                console.error("Contribution given to @corporealizeContribution must have an id!")
                throw "Invalid Contribution"
    
            $c = @wall.find('#'+c.id)
            if $c.length is 0
                bubble = new CK.Smartboard.View.ContributionBalloon {model: contrib}
                contrib.on 'change', bubble.render
                $c.view = bubble
            else
                bubble = $c.view
            
            bubble.render()
    
            contrib.index = @nodes.length
            @nodes.push($c)
            @update()
    */


    /*
        corporealizeTag: (tag) =>
            unless tag.id
                console.error("Tag given to @corporealizeTag must have an id!")
                throw "Invalid Tag"
    
    
    
            t = $t[0]
    
            t.index = @nodes.length
            @tags[t.id] = t
            @nodes.push(t)
            @update()
    */


    /*
        # adds links (connectors) to the cloud if they don't already exist
        corporealizeLinks: (c, ts) =>
            if c.jquery
                id = c.attr('id')
                $c = c
            else if c.id
                id = c.id
                $c = @wall.$el.find('#'+id)
            else
                console.error("Contribution given to @addLinks must have an id!")
                throw "Invalid Contribution"
    
            c = $c[0]
    
            unless c
                console.warn "Contibution Balloon for contribution #{id} has not been rendered yet. This shouldn't have happened!"
                return
    
            for t in ts
                if t.jquery
                    id = t.attr('id')
                    $t = t
                else if t.id
                    id = t.id
                    $t = @wall.$el.find('#'+id)
                else
                    console.error("Tag given to @corporealizeTag must have an id!")
                    throw "Invalid Tag"
    
                t = $t[0]
                
                unless t
                    console.warn "Tag Balloon for tag #{id} has not been rendered yet. This shouldn't have happened!"
                    continue
    
                t.contribs? || t.contribs = []
                t.contribs.push(c.id)
                @links.push
                    source: t
                    target: c
    
            @update()
    */


    BalloonCloud.prototype.detectCollision = function(b) {
      var $b, bHeight, bIsTag, bWidth, nx1, nx2, ny1, ny2,
        _this = this;
      if (!((b.x != null) && (b.y != null))) {
        return;
      }
      $b = b.view.$el;
      bWidth = $b.outerWidth();
      bHeight = $b.outerHeight();
      nx1 = b.x - bWidth / 2;
      nx2 = b.x + bWidth / 2;
      ny1 = b.y - bHeight / 2;
      ny2 = b.y + bHeight / 2;
      bIsTag = $b.hasClass('tag');
      return function(quad, x1, y1, x2, y2) {
        var $q, h, qHeight, qIsTag, qWidth, w, xDist, xNudge, xOverlap, yDist, yNudge, yOverlap;
        if (!((quad.point != null) && (quad.point.x != null) && (quad.point.y != null))) {
          return;
        }
        if (quad.point && quad.point !== b) {
          qWidth = quad.point.view.$el.outerWidth();
          qHeight = quad.point.view.$el.outerHeight();
          w = bWidth / 2 + qWidth / 2;
          h = bHeight / 2 + qHeight / 2;
          xDist = Math.abs(b.x - quad.point.x);
          yDist = Math.abs(b.y - quad.point.y);
          if (xDist < w && yDist < h) {
            $q = quad.point.view.$el;
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

    BalloonCloud.prototype.startForce = function() {
      if (this.force == null) {
        console.log("Instantiating force...");
        this.force = this.generateForceFunction();
      }
      this.d3QuadTree = d3.geom.quadtree(this.nodes);
      console.log("Starting force...");
      this.force.start();
      return this.balloons.call(this.force.drag);
    };

    BalloonCloud.prototype.ensureNode = function(n) {
      var b, isNodePublished, screenState, shouldRender, shouldRerender, t, tag, tagAttributes, tagClass, tagID, _i, _j, _len, _len1, _ref, _ref1;
      isNodePublished = n.get('published');
      screenState = this.wall.mode;
      shouldRender = false;
      if (n instanceof CK.Model.Contribution && (isNodePublished !== true || screenState === 'propose' || screenState === 'interpret')) {
        return shouldRender;
      }
      if (n instanceof CK.Model.Proposal && (isNodePublished === false || (screenState !== 'propose' && screenState !== 'interpret'))) {
        return shouldRender;
      }
      if (!_.any(this.nodes, function(node) {
        return node.id === n.id;
      })) {
        this.nodes.push(n);
        shouldRender = true;
        if (n instanceof CK.Model.Tag) {
          tagAttributes = n.attributes;
          tagClass = '';
          if (n.has('colourClass')) {
            this.tagList[n.id] = {
              'className': n.get('colourClass')
            };
          }
        }
      }
      if (n instanceof CK.Model.Contribution && n.has('tags')) {
        _ref = n.get('tags');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          t = _ref[_i];
          tag = _.find(this.nodes, function(n) {
            return n.id === t.id;
          });
          if (tag != null) {
            shouldRerender = this.ensureLink(n, tag);
            shouldRender = shouldRender || shouldRerender;
          }
        }
      }
      if (n instanceof CK.Model.Proposal && n.has('tag_group_id')) {
        tagID = n.get('tag_group_id');
        tag = _.find(this.nodes, function(n) {
          return n.id === tagID;
        });
        if (tag != null) {
          shouldRerender = this.ensureLink(n, tag);
          shouldRender = shouldRender || shouldRerender;
        }
        if (isNodePublished === true) {
          shouldRender = true;
        }
      } else if (n instanceof CK.Model.Tag) {
        _ref1 = this.nodes;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          b = _ref1[_j];
          if (b.has('tags') && b.get('tags').some(function(t) {
            return t.id === n.id;
          })) {
            shouldRerender = this.ensureLink(n, tag);
            shouldRender = shouldRender || shouldRerender;
          }
        }
      }
      if (shouldRender) {
        console.log('View Change Detected: Should Rerender Board!');
      }
      return shouldRender;
    };

    BalloonCloud.prototype.ensureLink = function(fromContribution, toTag) {
      var link, shouldRender;
      shouldRender = false;
      link = {
        source: fromContribution,
        target: toTag
      };
      if (!_.any(this.links, function(l) {
        return l.source.id === fromContribution.id && l.target.id === toTag.id;
      })) {
        this.links.push(link);
        shouldRender = true;
      }
      return shouldRender;
    };

    BalloonCloud.prototype.inflateBalloons = function(balloons) {
      var screenState, tagListing;
      screenState = this.wall.mode;
      tagListing = this.tagList;
      return balloons.each(function(d, i) {
        var $el, pos, tagID, view;
        view = d.view;
        if (!d.view) {
          $el = $('#' + d.id);
          $el.unbind();
          if (d.collectionName === "tags") {
            view = new CK.Smartboard.View.TagBalloon({
              model: d,
              el: $el[0]
            });
            if ((tagListing[d.id] != null) && tagListing[d.id].className) {
              view.setColorClass(tagListing[d.id].className);
            }
          } else if (d.collectionName === "contributions") {
            view = new CK.Smartboard.View.ContributionBalloon({
              model: d,
              el: $el[0]
            });
            console.log('Contribution View Instantiated - state is ' + screenState);
            if (screenState === 'analysis') {
              view.ballonContributionType = view.balloonContributionTypes.analysis;
            } else {
              view.balloonContributionType = view.balloonContributionTypes["default"];
            }
          } else if (d.collectionName === "proposals") {
            tagID = d.get('tag_group_id');
            view = new CK.Smartboard.View.ContributionProposalBalloon({
              model: d,
              el: $el[0]
            });
            console.log('Proposal View Instantiated - state is ' + screenState + ' tag ID is ' + tagID);
            if ((tagListing[tagID] != null) && tagListing[tagID].className) {
              console.log('Proposal tag color is ' + tagListing[tagID].className);
              view.setColorClass(tagListing[tagID].className);
            }
            view.setTagColorList(tagListing);
            if (screenState === 'interpret') {
              view.ballonContributionType = view.balloonContributionTypes.interpret;
            } else {
              view.ballonContributionType = view.balloonContributionTypes.propose;
            }
          } else {
            console.error("Unrecognized Balloon type:", d.collectionName);
          }
          d.view = view;
          if (d.collectionName === "contributions" || d.collectionName === "proposals") {
            view.render();
            view.resetView();
          }
        }
        if (!(view != null)) {
          console.error('Could not create or set view for ' + d.collectionName + '!');
          return;
        }
        view.render();
        if (d.newlyAdded) {
          jQuery('#' + d.id).addClass('new');
          setTimeout(function() {
            return jQuery('#' + d.id).removeClass('new');
          }, 2000);
        }
        pos = view.$el.position();
        if (d.x == null) {
          d.x = view.leftToX(pos.left);
        }
        if (d.y == null) {
          return d.y = view.topToY(pos.top);
        }
      });
    };

    BalloonCloud.prototype.reRenderForState = function(state) {
      var b, view, _i, _len, _ref;
      console.log('Rerender nodes for state: ' + state);
      _ref = this.nodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        b = _ref[_i];
        view = b.view;
        if (b.collectionName === "contributions") {
          if (state === 'analysis') {
            view.ballonContributionType = view.balloonContributionTypes.analysis;
          } else if (state === 'propose') {
            view.remove();
            view = null;
          } else {
            view.ballonContributionType = view.balloonContributionTypes["default"];
          }
        } else if (b.collectionName === 'proposals') {
          if (state === 'interpret') {
            view.ballonContributionType = view.balloonContributionTypes.interpret;
          } else {
            view.ballonContributionType = view.balloonContributionTypes.propose;
          }
        }
        if (view != null) {
          view.render();
          if (b.collectionName === "contributions" || b.collectionName === "proposals") {
            view.resetView();
          }
        }
      }
      if (state === 'propose') {
        this.nodes.filter(function(n) {
          return !(n instanceof CK.Model.Contribution);
        });
        this.links = [];
        jQuery('div.connector').unbind().remove();
        return this.render();
      }
    };

    BalloonCloud.prototype.render = function(ev) {
      this.wallWidth = this.wall.$el.innerWidth();
      this.wallHeight = this.wall.$el.innerHeight();
      /*
              for n,i in @nodes
                  $n = jQuery(n)
                  pos = $n.position()
                  n.x = pos.left + $n.outerWidth()/2 unless n.x?
                  n.y = pos.top + $n.outerHeight()/2 unless n.y?
      */

      this.vis.selectAll('div.balloon').data(this.nodes).enter().append('div').attr('id', function(d, i) {
        return d.id;
      }).attr('class', "balloon");
      this.balloons = this.vis.selectAll('div.balloon');
      this.vis.selectAll('div.balloon').call(this.inflateBalloons);
      this.vis.selectAll('div.connector').data(this.links).enter().append('div').attr('id', function(d, i) {
        return "" + d.source.id + "-" + d.target.id;
      }).attr('class', 'connector');
      this.connectors = this.vis.selectAll('div.connector');
      return this.startForce();
    };

    return BalloonCloud;

  })();

}).call(this);
