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
      this.yToTop = __bind(this.yToTop, this);

      this.xToLeft = __bind(this.xToLeft, this);

      this.topToY = __bind(this.topToY, this);

      this.leftToX = __bind(this.leftToX, this);

      this.domID = __bind(this.domID, this);

      this.findOrCreate = __bind(this.findOrCreate, this);
      return Base.__super__.constructor.apply(this, arguments);
    }

    Base.prototype.findOrCreate = function(selector, html) {
      return CK.Smartboard.View.findOrCreate(this.$el, selector, html);
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

    Wall.prototype.tagFilters = [];

    Wall.prototype.wordCloudShowable = true;

    Wall.prototype.events = {
      'click #add-tag-opener': function(ev) {
        var addTagContainer,
          _this = this;
        if (this.tags.length < 4) {
          addTagContainer = this.$el.find('#add-tag-container');
          addTagContainer.toggleClass('opened');
          if (addTagContainer.hasClass('opened')) {
            return setTimeout(function() {
              return _this.$el.find('#new-tag').focus();
            }, 1000);
          }
        } else {
          return jQuery("#add-tag-opener").css({
            opacity: 0.4
          });
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
        return;
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

      this.addBalloon = __bind(this.addBalloon, this);
      this.runState = options.runState;
      this.tags = options.tags;
      this.contributions = options.contributions;
      this.proposals = options.proposals;
      Wall.__super__.constructor.call(this, options);
    }

    Wall.prototype.initialize = function() {
      var _this = this;
      Wall.__super__.initialize.call(this);
      this.runState.on('change', this.render);
      this.balloonViews = {};
      this.contributions.on('add', function(c) {
        return _this.addBalloon(c, CK.Smartboard.View.ContributionBalloon, _this.balloonViews);
      });
      this.contributions.each(function(c) {
        return _this.addBalloon(c, CK.Smartboard.View.ContributionBalloon, _this.balloonViews);
      });
      this.proposals.on('add', function(p) {
        return _this.addBalloon(p, CK.Smartboard.View.ProposalBalloon, _this.balloonViews);
      });
      this.proposals.each(function(p) {
        return _this.addBalloon(p, CK.Smartboard.View.ProposalBalloon, _this.balloonViews);
      });
      this.tags.on('add', function(t) {
        return _this.addBalloon(t, CK.Smartboard.View.TagBalloon, _this.balloonViews);
      });
      this.tags.each(function(t) {
        return _this.addBalloon(t, CK.Smartboard.View.TagBalloon, _this.balloonViews);
      });
      return this.tags.each(function(t) {
        return _this.balloonViews[t.id].renderConnectors();
      });
    };

    Wall.prototype.addBalloon = function(doc, view, balloonList) {
      var bv,
        _this = this;
      bv = new view({
        model: doc
      });
      doc.wake(Sail.app.config.wakeful.url);
      bv.$el.css('visibility', 'hidden');
      bv.wall = this;
      bv.render();
      this.$el.append(bv.$el);
      doc.on('change:pos', function() {
        return bv.pos = doc.get('pos');
      });
      doc.on('change:z-index', function() {
        return bv.$el.zIndex(doc.get('z-index'));
      });
      if (doc.has('pos')) {
        bv.pos = doc.get('pos');
      } else {
        this.assignRandomPositionToBalloon(doc, bv);
      }
      if (doc.has('z-index')) {
        bv.$el.zIndex(doc.get('z-index'));
      }
      this.makeBallonDraggable(doc, bv);
      bv.$el.click(function() {
        return _this.moveBallonToTop(doc, bv);
      });
      bv.render();
      doc.save().done(function() {
        return bv.$el.css('visibility', 'visible');
      });
      return balloonList[doc.id] = bv;
    };

    Wall.prototype.assignRandomPositionToBalloon = function(doc, view) {
      var left, top, wallHeight, wallWidth;
      wallWidth = this.$el.width();
      wallHeight = this.$el.height();
      left = Math.random() * (wallWidth - view.$el.outerWidth());
      top = Math.random() * (wallHeight - view.$el.outerHeight());
      doc.set('pos', {
        left: left,
        top: top
      });
      return this.moveBallonToTop(doc, view);
    };

    Wall.prototype.moveBallonToTop = function(doc, view) {
      var maxZ;
      maxZ = this.maxBallonZ();
      maxZ++;
      return doc.set('z-index', maxZ);
    };

    Wall.prototype.maxBallonZ = function() {
      return _.max(this.$el.find('.balloon').map(function(el) {
        return parseInt(jQuery(this).zIndex());
      }));
    };

    Wall.prototype.makeBallonDraggable = function(doc, view) {
      var _this = this;
      view.$el.draggable({
        distance: 30,
        containment: '#wall'
      }).css('position', 'absolute');
      view.$el.on('dragstop', function(ev, ui) {
        return doc.save({
          pos: ui.position
        }, {
          patch: true
        });
      });
      view.$el.on('drag', function(ev, ui) {
        if (view.renderConnectors != null) {
          return view.renderConnectors();
        }
      });
      return view.$el.on('dragstart', function(ev, ui) {
        return _this.moveBallonToTop(doc, view);
      });
    };

    Wall.prototype.addTagFilter = function(tag) {
      if (__indexOf.call(this.tagFilters, tag) < 0) {
        this.tagFilters.push(tag);
        return this.renderFiltered();
      }
    };

    Wall.prototype.removeTagFilter = function(tag) {
      this.tagFilters.splice(this.tagFilters.indexOf(tag), 1);
      return this.renderFiltered();
    };

    Wall.prototype.renderFiltered = function(tag) {
      var activeIds, maxZ, selector;
      if (this.tagFilters.length === 0) {
        return this.$el.find(".content, .connector").removeClass('blurred');
      } else {
        activeIds = (function() {
          var _i, _len, _ref, _results;
          _ref = this.tagFilters;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            tag = _ref[_i];
            _results.push(tag.id);
          }
          return _results;
        }).call(this);
        selector = ".tag-" + activeIds.join(", .tag-");
        this.$el.find(".content:not(" + selector + ")").addClass('blurred');
        this.$el.find(".connector:not(" + selector + ")").addClass('blurred');
        maxZ = this.maxBallonZ();
        this.$el.find(".content").filter("" + selector).removeClass('blurred').css('z-index', maxZ + 1);
        return this.$el.find(".connector").filter("" + selector).removeClass('blurred');
      }
    };

    Wall.prototype.render = function() {
      var paused, phase,
        _this = this;
      phase = this.runState.get('phase');
      if (phase !== this.$el.data('phase')) {
        switch (phase) {
          case 'tagging':
            jQuery('body').removeClass('mode-brainstorm').addClass('mode-tagging').removeClass('mode-exploration').removeClass('mode-propose').removeClass('mode-research_and_experiment');
            this.changeWatermark("tagging");
            break;
          case 'exploration':
            jQuery('body').removeClass('mode-brainstorm').removeClass('mode-tagging').addClass('mode-exploration').removeClass('mode-propose').removeClass('mode-research_and_experiment');
            this.changeWatermark("exploration");
            break;
          case 'propose':
            jQuery('body').removeClass('mode-brainstorm').removeClass('mode-tagging').removeClass('mode-exploration').addClass('mode-propose').removeClass('mode-research_and_experiment');
            this.changeWatermark("propose");
            setTimeout((function() {
              return _this.$el.find('.contribution, .contribution-connector').remove();
            }), 1100);
            break;
          case 'research_and_experiment':
            jQuery('body').removeClass('mode-brainstorm').removeClass('mode-tagging').removeClass('mode-exploration').removeClass('mode-propose').addClass('mode-research_and_experiment');
            this.changeWatermark("experiment");
            setTimeout((function() {
              return _this.$el.find('.contribution, .contribution-connector').remove();
            }), 1100);
            break;
          default:
            jQuery('body').addClass('mode-brainstorm').removeClass('mode-tagging').removeClass('mode-exploration').removeClass('mode-propose').removeClass('mode-research_and_experiment');
            this.changeWatermark("brainstorm");
        }
        this.$el.data('phase', phase);
      }
      if (this.tags.length >= 4) {
        jQuery("#add-tag-opener").css({
          opacity: 0.4
        });
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
      if (jQuery.trim(newTag).length < 2) {
        return;
      }
      Sail.app.createNewTag(newTag);
      this.$el.find('#add-tag-container').removeClass('opened').blur();
      return this.$el.find('#new-tag').val('');
    };

    Wall.prototype.pause = function() {
      this.$el.find('#toggle-pause').addClass('paused').text('Resume');
      if (this.$el.data('phase') !== 'evaluate') {
        jQuery('body').addClass('paused');
        return this.changeWatermark("Paused");
      }
    };

    Wall.prototype.unpause = function() {
      jQuery('body').removeClass('paused');
      this.$el.find('#toggle-pause').removeClass('paused').text('Pause');
      return this.changeWatermark(this.$el.data('phase') || "brainstorm");
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
        var count, fade, filteredWords, h, maxCount, maxSize, w, word, wordCloud, wordCount, wordHash, zIndex, _i, _len, _ref;
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
        maxCount = _.max(_.pairs(wordCount), function(wc) {
          return wc[1];
        });
        console.log(maxCount, wordCount);
        wordHash = (function() {
          var _results;
          _results = [];
          for (word in wordCount) {
            count = wordCount[word];
            h = {
              text: word,
              size: Math.pow(count / maxCount[1], 0.5) * maxSize
            };
            console.log(word, count, h);
            _results.push(h);
          }
          return _results;
        })();
        _this.generate(wordHash);
        wordCloud = jQuery('#word-cloud');
        zIndex = _this.maxBallonZ() + 1;
        wordCloud.addClass('visible');
        wordCloud.css('z-index', zIndex);
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
            if (c.get('published')) {
              console.log(c.get('headline'), c.get('content'));
              text += c.get('headline') + ' ';
              return text += c.get('content') + ' ';
            }
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
      var discard, filteredWords, filteredWords2, htmlTags, stopWords;
      stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole|undefined)$/i;
      discard = /^(@|https?:)/;
      htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
      filteredWords = _.filter(wordsToFilter, function(w) {
        return !(stopWords.test(w));
      });
      filteredWords2 = _.filter(filteredWords, function(w) {
        return w !== "";
      });
      return filteredWords2;
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

    WordCloud.prototype.maxBallonZ = function() {
      return _.max(jQuery("*").map(function(el) {
        return parseInt(jQuery(this).zIndex());
      }));
    };

    return WordCloud;

  })(CK.Smartboard.View.Base);

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  CK.Smartboard.View.Balloon = (function(_super) {

    __extends(Balloon, _super);

    function Balloon() {
      this.render = __bind(this.render, this);
      return Balloon.__super__.constructor.apply(this, arguments);
    }

    Balloon.prototype.initialize = function() {
      var _this = this;
      Balloon.__super__.initialize.call(this);
      Object.defineProperty(this, 'pos', {
        get: function() {
          return _this.$el.position();
        },
        set: function(pos) {
          return _this.$el.css({
            left: pos.left + 'px',
            top: pos.top + 'px'
          });
        }
      });
      Object.defineProperty(this, 'left', {
        get: function() {
          return _this.pos.left;
        },
        set: function(x) {
          return _this.$el.css('left', x + 'px');
        }
      });
      Object.defineProperty(this, 'top', {
        get: function() {
          return _this.pos.top;
        },
        set: function(y) {
          return _this.$el.css('top', y + 'px');
        }
      });
      Object.defineProperty(this, 'width', {
        get: function() {
          return _this.$el.outerWidth();
        },
        set: function(w) {
          return _this.$el.css('width', w + 'px');
        }
      });
      Object.defineProperty(this, 'height', {
        get: function() {
          return _this.$el.outerHeight();
        },
        set: function(h) {
          return _this.$el.css('height', h + 'px');
        }
      });
      Object.defineProperty(this, 'right', {
        get: function() {
          return _this.left + _this.width;
        },
        set: function(x) {
          return _this.$el.css('left', (x - _this.width) + 'px');
        }
      });
      Object.defineProperty(this, 'bottom', {
        get: function() {
          return _this.top + _this.height;
        },
        set: function(y) {
          return _this.$el.css('top', (y - _this.height) + 'px');
        }
      });
      this.model.on('change:published', function() {
        if (_this.model.get('published')) {
          _this.$el.addClass('new');
          setTimeout(function() {
            return _this.$el.removeClass('new');
          }, 1001);
          return _this.model.on('wakeful:broadcast:received', function() {
            if (!_this.$el.hasClass('glow')) {
              _this.$el.addClass('glow');
              return setTimeout(function() {
                return _this.$el.removeClass('glow');
              }, 4001);
            }
          });
        }
      });
      return this.model.on('change', function() {
        if (_this.wall != null) {
          return _this.render();
        }
      });
    };

    Balloon.prototype.isInDOM = function() {
      return jQuery.contains(document.documentElement, this.el);
    };

    Balloon.prototype.isPositioned = function() {
      var pos;
      pos = this.pos;
      return (pos.left != null) && pos.left > 0;
    };

    Balloon.prototype.renderConnector = function(toTag) {
      var connector, connectorId, connectorLength, connectorTransform, tagId, tagView, x1, x2, y1, y2;
      tagId = toTag.id.toLowerCase();
      tagView = this.wall.balloonViews[tagId];
      if (tagView == null) {
        return;
      }
      connectorId = this.model.id + "-" + tagId;
      connector = CK.Smartboard.View.findOrCreate(this.wall.$el, "#" + connectorId, "<div class='connector " + this.BALLOON_TYPE + "-connector' id='" + connectorId + "'></div>");
      x1 = this.left + (this.width / 2);
      y1 = this.top + (this.height / 2);
      x2 = tagView.left + (tagView.width / 2);
      y2 = tagView.top + (tagView.height / 2);
      connectorLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      connectorTransform = "rotate(" + (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) + "deg)";
      connector.css({
        'top': "" + y1 + "px",
        'left': "" + x1 + "px",
        'width': "" + connectorLength + "px",
        '-webkit-transform': connectorTransform,
        '-moz-transform': connectorTransform,
        'transform': connectorTransform
      });
      connector.addClass("connects-" + this.model.id);
      connector.addClass("connects-" + tagId);
      connector.addClass("tag-" + tagId);
      return connector;
    };

    Balloon.prototype.render = function() {
      if (this.model.has('pos')) {
        this.pos = this.model.get('pos');
      }
      if (this.model.has('z-index')) {
        return this.$el.zIndex(this.model.get('z-index'));
      }
    };

    return Balloon;

  })(CK.Smartboard.View.Base);

  CK.Smartboard.View.ContentBalloon = (function(_super) {

    __extends(ContentBalloon, _super);

    ContentBalloon.prototype.tagName = 'article content';

    ContentBalloon.prototype.id = function() {
      return this.domID();
    };

    function ContentBalloon(options) {
      this.renderBuildons = __bind(this.renderBuildons, this);

      this.render = __bind(this.render, this);

      this.handleClick = __bind(this.handleClick, this);

      this.id = __bind(this.id, this);
      ContentBalloon.__super__.constructor.call(this, options);
    }

    ContentBalloon.prototype.initialize = function() {
      return ContentBalloon.__super__.initialize.call(this);
    };

    ContentBalloon.prototype.events = {
      'dblclick': 'handleClick'
    };

    ContentBalloon.prototype.handleClick = function() {
      if (this.$el.hasClass('.ui-draggable-dragging')) {
        return;
      }
      return this.$el.toggleClass('opened');
    };

    ContentBalloon.prototype.render = function() {
      var headline, meta;
      ContentBalloon.__super__.render.call(this);
      if (this.model.get('published')) {
        this.$el.removeClass('unpublished');
      } else {
        this.$el.addClass('unpublished');
      }
      this.$el.addClass('content');
      headline = this.findOrCreate('.headline', "<h3 class='headline'></h3>");
      headline.text(this.model.get('headline'));
      this.body = this.findOrCreate('.body', "<div class='body'></div>");
      meta = this.findOrCreate('.meta', "<div class='meta'><span class='author'></span></div>");
      meta.find('.author').text(this.model.get('author')).addClass("author-" + (this.model.get('author')));
      this.renderBuildons();
      return this;
    };

    ContentBalloon.prototype.renderBuildons = function() {
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
        if (!b.published) {
          continue;
        }
        counter.append("•");
        $b = jQuery("                <div class='buildon'>                    <div class='author'></div>                    <div class='content'></div>                </div>            ");
        $b.find('.author').text(b.author);
        $b.find('.content').text(b.content);
        _results.push(container.append($b));
      }
      return _results;
    };

    return ContentBalloon;

  })(CK.Smartboard.View.Balloon);

  CK.Smartboard.View.ContributionBalloon = (function(_super) {

    __extends(ContributionBalloon, _super);

    function ContributionBalloon() {
      this.renderTags = __bind(this.renderTags, this);

      this.renderConnectors = __bind(this.renderConnectors, this);
      return ContributionBalloon.__super__.constructor.apply(this, arguments);
    }

    ContributionBalloon.prototype.BALLOON_TYPE = 'contribution';

    ContributionBalloon.prototype.className = 'contribution balloon';

    ContributionBalloon.prototype.initiaialize = function() {
      var _this = this;
      return this.model.on('change:tags', function() {
        return _this.renderConnectors();
      });
    };

    ContributionBalloon.prototype.render = function() {
      ContributionBalloon.__super__.render.call(this);
      this.renderConnectors();
      this.renderTags();
      this.$el.addClass('contribution');
      return this.body.text(this.model.get('content'));
    };

    ContributionBalloon.prototype.renderConnectors = function() {
      var tag, _i, _len, _ref, _results;
      if (!this.model.has('tags') || _.isEmpty(this.model.get('tags')) || !this.$el.is(':visible')) {
        return;
      }
      _ref = this.model.get('tags');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        tag = _ref[_i];
        _results.push(this.renderConnector(tag));
      }
      return _results;
    };

    ContributionBalloon.prototype.renderTags = function() {
      var tag, tagIds, tid, _i, _len;
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
      for (_i = 0, _len = tagIds.length; _i < _len; _i++) {
        tid = tagIds[_i];
        this.$el.addClass("tag-" + tid);
      }
      return this;
    };

    return ContributionBalloon;

  })(CK.Smartboard.View.ContentBalloon);

  CK.Smartboard.View.ProposalBalloon = (function(_super) {

    __extends(ProposalBalloon, _super);

    function ProposalBalloon() {
      return ProposalBalloon.__super__.constructor.apply(this, arguments);
    }

    ProposalBalloon.prototype.className = 'proposal balloon';

    ProposalBalloon.prototype.BALLOON_TYPE = 'proposal';

    ProposalBalloon.prototype.render = function() {
      var tag;
      ProposalBalloon.__super__.render.call(this);
      this.renderConnectors();
      this.renderVotes();
      this.$el.addClass('proposal');
      if (this.model.has('tag')) {
        tag = this.model.get('tag');
        this.$el.addClass(tag.colorClass);
        this.$el.addClass("tag-" + tag.id);
      }
      return this.body.text(this.model.get('justification'));
    };

    ProposalBalloon.prototype.renderConnectors = function() {
      if (this.model.has('tag')) {
        return this.renderConnector(this.model.get('tag'));
      }
    };

    ProposalBalloon.prototype.renderVotes = function() {
      var container, voteCount;
      container = this.findOrCreate('.votes', "<div class='votes'></div>");
      voteCount = this.model.get('votes').length;
      if (voteCount === 0) {
        container.addClass('off');
        return container.text('');
      } else {
        container.removeClass('off');
        return container.text(voteCount);
      }
    };

    return ProposalBalloon;

  })(CK.Smartboard.View.ContentBalloon);

  CK.Smartboard.View.TagBalloon = (function(_super) {

    __extends(TagBalloon, _super);

    function TagBalloon() {
      this.render = __bind(this.render, this);

      this.renderConnectors = __bind(this.renderConnectors, this);

      this.setColorClass = __bind(this.setColorClass, this);

      this.id = __bind(this.id, this);
      return TagBalloon.__super__.constructor.apply(this, arguments);
    }

    TagBalloon.prototype.tagName = 'div';

    TagBalloon.prototype.className = 'tag balloon';

    TagBalloon.prototype.BALLOON_TYPE = 'contribution';

    TagBalloon.prototype.id = function() {
      return this.domID();
    };

    TagBalloon.prototype.initialize = function() {
      return TagBalloon.__super__.initialize.call(this);
    };

    TagBalloon.prototype.setColorClass = function(className) {
      return this.$el.addClass(className);
    };

    TagBalloon.prototype.events = {
      'click': 'handleClick'
    };

    TagBalloon.prototype.handleClick = function(ev) {
      var $el;
      $el = this.$el;
      if (this.$el.hasClass('.ui-draggable-dragging')) {
        return;
      }
      console.log('clicked tag..');
      if ($el.hasClass('active')) {
        Sail.app.wall.removeTagFilter(this.model);
        return $el.removeClass('active');
      } else {
        Sail.app.wall.addTagFilter(this.model);
        return $el.addClass('active');
      }
    };

    TagBalloon.prototype.renderConnectors = function() {
      var cv, taggedContributionViews, _i, _len, _results,
        _this = this;
      taggedContributionViews = _.filter(this.wall.balloonViews, function(bv) {
        switch (false) {
          case !(bv.model instanceof CK.Model.Contribution):
            return bv.$el.is(':visible') && bv.model.hasTag(_this.model);
          case !(bv.model instanceof CK.Model.Proposal):
            return bv.$el.is(':visible') && bv.model.has('tag') && bv.model.get('tag').id === _this.model.id;
        }
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
      if (this.model.has('colorClass')) {
        this.setColorClass(this.model.get('colorClass'));
      }
      if (this.model.get('pinned')) {
        this.$el.addClass('pinned');
      } else {
        this.$el.removeClass('pinned');
      }
      this.renderConnectors();
      return this;
    };

    return TagBalloon;

  })(CK.Smartboard.View.Balloon);

}).call(this);
