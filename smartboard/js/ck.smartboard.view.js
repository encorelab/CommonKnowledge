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

    Base.prototype.findOrCreate = function(selector, html) {
      return CK.Smartboard.View.findOrCreate(this.$el, selector, html);
    };

    function Base(options) {
      this.yToTop = __bind(this.yToTop, this);

      this.xToLeft = __bind(this.xToLeft, this);

      this.topToY = __bind(this.topToY, this);

      this.leftToX = __bind(this.leftToX, this);

      this.domID = __bind(this.domID, this);

      this.findOrCreate = __bind(this.findOrCreate, this);

      var alreadyPositioned;
      Base.__super__.constructor.call(this, options);
      alreadyPositioned = (this.$el.position().left != null) && this.$el.position().left > 0;
      if ((this.model != null) && !alreadyPositioned) {
        this.$el.hide();
        if (this.model.has('pos')) {
          this.$el.css({
            left: this.model.get('pos').left + 'px',
            top: this.model.get('pos').top + 'px'
          });
        } else {
          console.log("autopositioning", this);
          this.autoPosition();
        }
      }
      this.$el.show();
    }

    Base.prototype.autoPosition = function() {
      var left, top, wallHeight, wallWidth;
      wallWidth = jQuery('#wall').width();
      wallHeight = jQuery('#wall').height();
      left = Math.random() * (wallWidth - this.$el.outerWidth());
      top = Math.random() * (wallHeight - this.$el.outerHeight());
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

    Base.prototype.leftToX = function(left) {
      return left + this.$el.outerWidth() / 2;
    };

    Base.prototype.topToY = function(top) {
      return top + this.$el.outerHeight() / 2;
    };

    Base.prototype.xToLeft = function(x) {
      return x - this.$el.outerWidth() / 2;
    };

    Base.prototype.yToTop = function(y) {
      return y - this.$el.outerHeight() / 2;
    };

    return Base;

  })(Backbone.View);

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CK.Smartboard.View.Wall = (function(_super) {

    __extends(Wall, _super);

    Wall.prototype.tagName = 'div';

    Wall.prototype.id = 'wall';

    Wall.prototype.wordCloudShowable = true;

    Wall.prototype.maxCollisionRecursion = 1;

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
      'click #show-word-cloud': function(ev) {
        var wordCloudButton, _ref;
        wordCloudButton = jQuery('#show-word-cloud');
        if (this.wordCloudShowable) {
          wordCloudButton.addClass('disabled');
          wordCloudButton.text('Drawing Cloud... Please wait...');
          if ((_ref = this.wordCloud) == null) {
            this.wordCloud = new CK.Smartboard.View.WordCloud();
          }
          this.wordCloud.render();
          return this.wordCloudShowable = false;
        } else {
          this.wordCloud.hide();
          wordCloudButton.text('Show Word Cloud');
          return this.wordCloudShowable = true;
        }
      },
      'keydown #new-tag': function(ev) {
        if (ev.keyCode === 13) {
          return this.submitNewTag();
        }
      },
      'click #toggle-pause': function(ev) {
        var paused;
        paused = this.runState.get('paused');
        return this.runState.save({
          paused: !paused
        });
      },
      'click #go-tagging': function(ev) {
        return this.runState.save({
          phase: 'tagging'
        });
      },
      'click #go-propose': function(ev) {
        return this.runState.save({
          phase: 'propose'
        });
      },
      'click #go-interpret': function(ev) {
        return this.runState.save({
          phase: 'interpret'
        });
      }
    };

    function Wall(options) {
      this.changeWatermark = __bind(this.changeWatermark, this);

      this.unpause = __bind(this.unpause, this);

      this.pause = __bind(this.pause, this);

      this.submitNewTag = __bind(this.submitNewTag, this);

      this.render = __bind(this.render, this);

      this.collideBalloon = __bind(this.collideBalloon, this);

      this.addBalloon = __bind(this.addBalloon, this);
      this.runState = options.runState;
      this.tags = options.tags;
      this.contributions = options.contributions;
      Wall.__super__.constructor.call(this, options);
    }

    Wall.prototype.initialize = function() {
      var _this = this;
      this.runState.on('change', this.render);
      this.balloonViews = {};
      this.tags.on('add', function(t) {
        return _this.addBalloon(t, CK.Smartboard.View.TagBalloon, _this.balloonViews);
      });
      this.tags.each(function(t) {
        return _this.addBalloon(t, CK.Smartboard.View.TagBalloon, _this.balloonViews);
      });
      this.contributions.on('add', function(c) {
        return _this.addBalloon(c, CK.Smartboard.View.ContributionBalloon, _this.balloonViews);
      });
      return this.contributions.each(function(c) {
        return _this.addBalloon(c, CK.Smartboard.View.ContributionBalloon, _this.balloonViews);
      });
    };

    Wall.prototype.addBalloon = function(doc, view, balloonList) {
      var bv;
      bv = new view({
        model: doc
      });
      doc.on('change', bv.render);
      bv.wall = this;
      bv.render();
      this.$el.append(bv.$el);
      bv.cachePositionAndBounds();
      if (bv.renderConnectors != null) {
        bv.renderConnectors();
      }
      return balloonList[doc.id] = bv;
    };

    Wall.prototype.collideBalloon = function(balloon, recursionLevel, ignoreBalloons) {
      var b, bottomOverlap, id, leftOverlap, nudgeScale, o, rightOverlap, topOverlap, xNudge, xOverlap, yNudge, yOverlap, _ref, _ref1, _ref2, _results;
      if (recursionLevel == null) {
        recursionLevel = 0;
      }
      if (ignoreBalloons == null) {
        ignoreBalloons = [];
      }
      b = balloon;
      if (recursionLevel === 0) {
        this._boundsWidth = this.$el.innerWidth();
        this._boundsHeight = this.$el.innerHeight();
        _ref = this.balloonViews;
        for (id in _ref) {
          o = _ref[id];
          o.cachePositionAndBounds();
        }
      }
      _ref1 = this.balloonViews;
      for (id in _ref1) {
        o = _ref1[id];
        if (o === b) {
          continue;
        }
        if (__indexOf.call(ignoreBalloons, o) >= 0) {
          continue;
        }
        rightOverlap = b.right - o.left;
        leftOverlap = o.right - b.left;
        topOverlap = b.bottom - o.top;
        bottomOverlap = o.bottom - b.top;
        if (rightOverlap > 0 && leftOverlap > 0 && topOverlap > 0 && bottomOverlap > 0) {
          yOverlap = Math.min(topOverlap, bottomOverlap);
          xOverlap = Math.min(leftOverlap, rightOverlap);
          nudgeScale = 1;
          if (yOverlap < xOverlap) {
            yNudge = yOverlap;
            if (b.top < o.top) {
              o.top += yNudge * nudgeScale;
            } else {
              o.top -= yNudge * nudgeScale;
            }
          } else {
            xNudge = xOverlap;
            if (b.left < o.left) {
              o.left += xNudge * nudgeScale;
            } else {
              o.left -= xNudge * nudgeScale;
            }
          }
          if (o.bottom > this._boundsHeight) {
            o.top -= o.bottom - this._boundsHeight;
          } else if (o.top < 0) {
            o.top = 0;
          }
          if (o.right > this._boundsWidth) {
            o.left -= o.right - this._boundsWidth;
          } else if (o.left < 0) {
            o.left = 0;
          }
          if (o.renderConnectors != null) {
            o.renderConnectors();
          }
          if (recursionLevel < this.maxCollisionRecursion) {
            ignoreBalloons.push(b);
            this.collideBalloon(o, recursionLevel + 1, ignoreBalloons);
          }
        }
      }
      if (recursionLevel === 0) {
        _ref2 = this.balloonViews;
        _results = [];
        for (id in _ref2) {
          o = _ref2[id];
          _results.push(o.$el.css({
            left: o.left + 'px',
            top: o.top + 'px'
          }));
        }
        return _results;
      }
    };

    Wall.prototype.render = function() {
      var paused, phase;
      phase = this.runState.get('phase');
      if (phase !== this.$el.data('phase')) {
        switch (phase) {
          case 'tagging':
            jQuery('body').removeClass('mode-synthesis').addClass('mode-tagging');
            this.changeWatermark("tagging");
            break;
          case 'propose':
            jQuery('body').removeClass('mode-tagging').addClass('mode-propose');
            this.changeWatermark("propose");
            break;
          case 'interpret':
            jQuery('body').removeClass('mode-propose').removeClass('mode-evaluate').addClass('mode-interpret');
            this.changeWatermark("interpret");
            break;
          case 'evaluate':
            jQuery('body').removeClass('mode-interpret').addClass('mode-evaluate');
            this.changeWatermark("evaluate");
            break;
          default:
            jQuery('body').removeClass('mode-tagging').removeClass('mode-synthesis');
            this.changeWatermark("brainstorm");
        }
        this.$el.data('phase', phase);
      }
      paused = this.runState.get('paused');
      if (paused !== this.$el.data('paused')) {
        if (paused) {
          this.pause();
        } else {
          this.unpause();
        }
        return this.$el.data('paused', paused);
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
      this.$el.find('#toggle-pause').addClass('paused').text('Resume');
      if (this.mode !== 'evaluate') {
        jQuery('body').addClass('paused');
        return this.changeWatermark("Paused");
      }
    };

    Wall.prototype.unpause = function() {
      jQuery('body').removeClass('paused');
      this.$el.find('#toggle-pause').removeClass('paused').text('Pause');
      return this.changeWatermark(this.mode || "brainstorm");
    };

    Wall.prototype.changeWatermark = function(text) {
      return jQuery('#watermark').fadeOut(800, function() {
        return jQuery(this).text(text).fadeIn(800);
      });
    };

    return Wall;

  })(CK.Smartboard.View.Base);

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard.View.WordCloud = (function(_super) {

    __extends(WordCloud, _super);

    function WordCloud() {
      this.hide = __bind(this.hide, this);

      this.gatherWordsForCloud = __bind(this.gatherWordsForCloud, this);

      this.render = __bind(this.render, this);
      return WordCloud.__super__.constructor.apply(this, arguments);
    }

    WordCloud.prototype.render = function() {
      var words,
        _this = this;
      words = [];
      return this.gatherWordsForCloud(words, function(gatheredWords) {
        var count, fade, filteredWords, h, maxCount, maxSize, w, word, wordCloud, wordCount, wordHash, _i, _len, _ref;
        words = gatheredWords;
        filteredWords = _this.filterWords(words);
        console.log(filteredWords);
        wordCount = {};
        for (_i = 0, _len = filteredWords.length; _i < _len; _i++) {
          w = filteredWords[_i];
          if ((_ref = wordCount[w]) == null) {
            wordCount[w] = 0;
          }
          wordCount[w]++;
        }
        maxSize = 70;
        maxCount = _.max(wordCount, function(count, word) {
          return count;
        });
        console.log(maxCount, wordCount);
        wordHash = (function() {
          var _results;
          _results = [];
          for (word in wordCount) {
            count = wordCount[word];
            h = {
              text: word,
              size: Math.pow(count / maxCount, 0.5) * maxSize
            };
            console.log(word, count, h);
            _results.push(h);
          }
          return _results;
        })();
        _this.generate(wordHash);
        wordCloud = jQuery('#word-cloud');
        wordCloud.addClass('visible');
        fade = jQuery('#fade');
        return fade.addClass('visible');
      });
    };

    WordCloud.prototype.gatherWordsForCloud = function(wordsToReturn, callback) {
      var punctuation, text, wordSeparators,
        _this = this;
      punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g;
      wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g;
      text = '';
      this.contributions = new CK.Model.Contributions();
      return this.contributions.fetch({
        success: function(collection, response) {
          _.each(collection.models, function(c) {
            console.log(c.get('headline'), c.get('content'));
            text += c.get('headline') + ' ';
            return text += c.get('content') + ' ';
          });
          _.each(text.split(wordSeparators), function(word) {
            word = word.replace(punctuation, "");
            return wordsToReturn.push(word);
          });
          return callback(wordsToReturn);
        }
      });
    };

    WordCloud.prototype.filterWords = function(wordsToFilter) {
      var discard, filteredWords, htmlTags, stopWords;
      stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole|undefined)$/i;
      discard = /^(@|https?:)/;
      htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
      filteredWords = _.filter(wordsToFilter, function(w) {
        return !(stopWords.test(w));
      });
      return filteredWords;
    };

    WordCloud.prototype.hide = function() {
      var fade, wordCloud;
      wordCloud = jQuery('#word-cloud');
      wordCloud.removeClass('visible');
      fade = jQuery('#fade');
      fade.removeClass('visible');
      return jQuery('#word-cloud svg').remove();
    };

    WordCloud.prototype.generate = function(wordHash) {
      var draw, fadeDiv, fill, height, width, wordCloud, wordCloudObject;
      fadeDiv = jQuery('#fade');
      width = fadeDiv.width();
      height = fadeDiv.height();
      wordCloud = jQuery('#word-cloud');
      wordCloud.height(height + 'px');
      wordCloud.width(width + 'px');
      draw = function(words) {
        return d3.select("#word-cloud").append("svg").attr("width", "99%").attr("height", "99%").append("g").attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")").selectAll("text").data(words).enter().append("text").style("font-size", function(d) {
          return d.size + "px";
        }).style("font-family", "Ubuntu").style("fill", function(d, i) {
          return fill(i);
        }).attr("text-anchor", "middle").attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        }).text(function(d) {
          return d.text;
        });
      };
      fill = d3.scale.category20();
      d3.layout.cloud().size([width, height]).words(wordHash).rotate(function() {
        return ~~(Math.random() * 5) * 30 - 60;
      }).font("Ubuntu").fontSize(function(d) {
        return d.size;
      }).on("end", draw).start();
      wordCloudObject = jQuery('#show-word-cloud');
      wordCloudObject.text('Hide Word Cloud');
      return wordCloudObject.removeClass('disabled');
    };

    return WordCloud;

  })(CK.Smartboard.View.Base);

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CK.Smartboard.View.Balloon = (function(_super) {

    __extends(Balloon, _super);

    function Balloon() {
      this.render = __bind(this.render, this);
      return Balloon.__super__.constructor.apply(this, arguments);
    }

    Balloon.prototype.initialize = function() {
      var _this = this;
      return this.model.on('change', function() {
        return _this.render();
      });
    };

    Balloon.prototype.render = function() {
      if (!this.draggable) {
        this.makeDraggable();
      }
      if (this.model.has('published')) {
        if (this.model.get('published')) {
          return this.$el.removeClass('unpublished');
        } else {
          return this.$el.addClass('unpublished');
        }
      }
    };

    Balloon.prototype.makeDraggable = function() {
      var _this = this;
      this.$el.draggable({
        distance: 25,
        containment: '#wall',
        stack: '.balloon',
        obstacle: ".balloon:not(#" + (this.$el.attr('id')) + ")"
      }).css('position', 'absolute');
      this.$el.on('drag', function(ev, ui) {
        return _this.wall.collideBalloon(_this);
      }).on('dragstop', function(ev, ui) {
        var bv, id, _ref, _results;
        _this.$el.addClass('just-dragged');
        _this.model.save({
          'pos': ui.position
        });
        _ref = _this.wall.balloonViews;
        _results = [];
        for (id in _ref) {
          bv = _ref[id];
          if (bv === _this) {
            continue;
          }
          bv.model.set({
            pos: {
              left: bv.left,
              top: bv.top
            }
          });
          if (bv.model.hasChanged()) {
            _results.push(bv.model.save({}, {
              silent: true
            }));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
      return this.draggable = true;
    };

    Balloon.prototype.cachePositionAndBounds = function() {
      var pos;
      this.width = this.$el.outerWidth();
      this.height = this.$el.outerHeight();
      pos = this.$el.position();
      this.left = pos.left;
      this.top = pos.top;
      this.right = pos.left + this.width;
      return this.bottom = pos.top + this.height;
    };

    return Balloon;

  })(CK.Smartboard.View.Base);

  CK.Smartboard.View.ContributionBalloon = (function(_super) {

    __extends(ContributionBalloon, _super);

    ContributionBalloon.prototype.tagName = 'article';

    ContributionBalloon.prototype.className = 'contribution balloon';

    ContributionBalloon.prototype.id = function() {
      return this.domID();
    };

    ContributionBalloon.prototype.setColorClass = function(colorClass) {
      return this.colorClass = colorClass;
    };

    function ContributionBalloon(options) {
      this.renderBuildons = __bind(this.renderBuildons, this);

      this.renderTags = __bind(this.renderTags, this);

      this.renderConnectors = __bind(this.renderConnectors, this);

      this.render = __bind(this.render, this);

      this.toggleAnalysis = __bind(this.toggleAnalysis, this);

      this.resetView = __bind(this.resetView, this);

      this.processContributionByType = __bind(this.processContributionByType, this);

      this.makeDraggable = __bind(this.makeDraggable, this);

      this.setColorClass = __bind(this.setColorClass, this);

      this.id = __bind(this.id, this);
      ContributionBalloon.__super__.constructor.call(this, options);
      this.balloonContributionTypes = {
        "default": 'default',
        analysis: 'analysis',
        propose: 'propose',
        interpret: 'interpret'
      };
      this.ballonContributionType = this.balloonContributionTypes["default"];
      this.colorClass = "whiteGradient";
    }

    ContributionBalloon.prototype.events = {
      'click': function(ev) {
        if (this.$el.hasClass('just-dragged')) {
          return this.$el.removeClass('just-dragged');
        } else {
          return this.$el.toggleClass('opened');
        }
      }
    };

    ContributionBalloon.prototype.makeDraggable = function() {
      var _this = this;
      ContributionBalloon.__super__.makeDraggable.call(this);
      return this.$el.on('drag', function(ev, ui) {
        return _this.renderConnectors();
      });
    };

    ContributionBalloon.prototype.processContributionByType = function() {
      if (this.ballonContributionType === this.balloonContributionTypes.analysis) {
        return this.toggleAnalysis();
      }
    };

    ContributionBalloon.prototype.resetView = function() {
      var balloonID, balloonObj;
      balloonObj = jQuery(this.$el);
      balloonID = balloonObj.attr('id');
      if (this.ballonContributionType === this.balloonContributionTypes["default"]) {
        balloonObj.addClass(this.colorClass);
        return;
      }
      console.log('Reset Proposal Views');
      balloonObj.removeClass('opened').removeClass(this.colorClass);
      jQuery('#' + balloonID + ' .headline').hide();
      jQuery('#' + balloonID + ' .body').hide();
      jQuery('#' + balloonID + ' .meta').hide();
      return jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast');
    };

    ContributionBalloon.prototype.toggleAnalysis = function() {
      var balloonID, balloonObj;
      console.log('Toggle Analysis');
      balloonObj = jQuery(this.$el);
      balloonObj.toggleClass('balloon-note').toggleClass(this.colorClass);
      balloonID = balloonObj.attr('id');
      if (this.$el.hasClass('opened')) {
        jQuery('#' + balloonID + ' img.balloon-note').hide();
        jQuery('#' + balloonID + ' .headline').fadeIn('fast');
        jQuery('#' + balloonID + ' .body').fadeIn('fast');
        return jQuery('#' + balloonID + ' .meta').fadeIn('fast');
      } else {
        jQuery('#' + balloonID + ' .headline').hide();
        jQuery('#' + balloonID + ' .body').hide();
        jQuery('#' + balloonID + ' .meta').hide();
        return jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast');
      }
    };

    ContributionBalloon.prototype.render = function() {
      var body, headline, meta, nodeHeader;
      ContributionBalloon.__super__.render.call(this);
      this.$el.addClass('contribution').addClass(this.colorClass);
      if (this.model.get('kind') === 'propose') {
        this.$el.addClass('synthesis');
      }
      nodeHeader = this.findOrCreate('.balloon-note', '<img style="display: none;" class="balloon-note" src="/smartboard/img/notes_large.png" alt="Note">');
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
      this.renderBuildons();
      this.renderConnectors();
      return this;
    };

    ContributionBalloon.prototype.renderConnectors = function() {
      var connector, connectorId, connectorLength, connectorTransform, tag, tagId, tagView, x1, x2, y1, y2, _i, _len, _ref, _ref1, _results;
      _ref1 = (_ref = this.model.get('tags')) != null ? _ref : [];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        tag = _ref1[_i];
        tagId = tag.id.toLowerCase();
        tagView = this.wall.balloonViews[tagId];
        if (tagView == null) {
          continue;
        }
        connectorId = this.model.id + "-" + tagId;
        connector = CK.Smartboard.View.findOrCreate(this.wall.$el, "#" + connectorId, "<div class='connector' id='" + connectorId + "'></div>");
        x1 = this.left + this.width / 2;
        y1 = this.top + this.height / 2;
        x2 = tagView.left + tagView.width / 2;
        y2 = tagView.top + tagView.height / 2;
        connectorLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        connectorTransform = "rotate(" + (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) + "deg)";
        _results.push(connector.css({
          'top': "" + y1 + "px",
          'left': "" + x1 + "px",
          'width': "" + connectorLength + "px",
          '-webkit-transform': connectorTransform,
          '-moz-transform': connectorTransform,
          'transform': connectorTransform
        }));
      }
      return _results;
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
      var $b, b, buildons, changed, container, counter, _i, _len, _results;
      if (!this.model.has('build_ons')) {
        return;
      }
      buildons = this.model.get('build_ons');
      if (!buildons.length) {
        return;
      }
      container = this.findOrCreate('.buildons', "<div class='buildons'></div>");
      changed = false;
      if (buildons.length !== container.find('div.buildon').length) {
        changed = true;
      }
      container.children('div.buildon').remove();
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
    var _this = this;

    __extends(TagBalloon, _super);

    function TagBalloon() {
      this.render = __bind(this.render, this);

      this.renderConnectors = __bind(this.renderConnectors, this);

      this.makeDraggable = __bind(this.makeDraggable, this);

      this.setColorClass = __bind(this.setColorClass, this);

      this.id = __bind(this.id, this);
      return TagBalloon.__super__.constructor.apply(this, arguments);
    }

    TagBalloon.prototype.tagName = 'div';

    TagBalloon.prototype.className = 'tag balloon';

    TagBalloon.prototype.id = function() {
      return this.domID();
    };

    TagBalloon.prototype.setColorClass = function(className) {
      return this.$el.addClass(className);
    };

    TagBalloon.prototype.events = {
      'click': function(ev) {
        var $el;
        $el = jQuery(ev.target);
        if ($el.hasClass('just-dragged')) {
          return $el.removeClass('just-dragged');
        } else {
          return console.log('clicked tag..');
        }
      }
    };

    TagBalloon.prototype.makeDraggable = function() {
      var _this = this;
      TagBalloon.__super__.makeDraggable.call(this);
      return this.$el.on('drag', function(ev, ui) {
        return _this.renderConnectors();
      });
    };

    TagBalloon.prototype.renderConnectors = function() {
      var cv, taggedContributionViews, _i, _len, _results,
        _this = this;
      taggedContributionViews = _.filter(this.wall.balloonViews, function(bv) {
        var _ref;
        return bv.model instanceof CK.Model.Contribution && (_ref = _this.model.id, __indexOf.call(_.map(_.pluck(bv.model.get('tags'), 'id'), function(id) {
          return id.toLowerCase();
        }), _ref) >= 0);
      });
      _results = [];
      for (_i = 0, _len = taggedContributionViews.length; _i < _len; _i++) {
        cv = taggedContributionViews[_i];
        _results.push(cv.renderConnectors());
      }
      return _results;
    };

    TagBalloon.prototype.render = function() {
      var name;
      TagBalloon.__super__.render.call(this);
      this.$el.addClass('tag');
      name = this.findOrCreate('.name', "<h3 class='name'></h3>");
      name.text(this.model.get('name'));
      if (this.model.get('pinned')) {
        this.$el.addClass('pinned');
      } else {
        this.$el.removeClass('pinned');
      }
      this.$el.show();
      return this;
    };

    return TagBalloon;

  }).call(this, CK.Smartboard.View.Balloon);

}).call(this);
