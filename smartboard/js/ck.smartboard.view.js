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

      this.hideWordCloud = __bind(this.hideWordCloud, this);

      this.gatherWordsForCloud = __bind(this.gatherWordsForCloud, this);

      this.showWordCloud = __bind(this.showWordCloud, this);

      this.submitNewTag = __bind(this.submitNewTag, this);
      return Wall.__super__.constructor.apply(this, arguments);
    }

    Wall.prototype.tagName = 'div';

    Wall.prototype.id = 'wall';

    Wall.prototype.showCloud = true;

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
        if (this.showCloud) {
          this.showWordCloud();
          return this.showCloud = false;
        } else {
          this.hideWordCloud();
          return this.showCloud = true;
        }
      },
      'click #close-word-cloud': function(ev) {
        return this.hideWordCloud();
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
        if (!(this.mode != null) || this.mode === 'brainstorm') {
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

    Wall.prototype.showWordCloud = function() {
      var words;
      words = [];
      jQuery('#word-cloud svg').remove();
      return this.gatherWordsForCloud(words, function(gatheredWords) {
        var count, fade, filteredWords, h, maxCount, maxSize, w, word, wordCloud, wordCount, wordHash, _i, _len, _ref;
        words = gatheredWords;
        filteredWords = Wall.prototype.filterWords(words);
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
        Wall.prototype.generateWordCloud(wordHash);
        wordCloud = jQuery('#word-cloud');
        wordCloud.addClass('visible');
        fade = jQuery('#fade');
        return fade.addClass('visible');
      });
    };

    Wall.prototype.gatherWordsForCloud = function(wordsToReturn, callback) {
      var punctuation, text, wordSeparators;
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

    Wall.prototype.filterWords = function(wordsToFilter) {
      var discard, filteredWords, htmlTags, stopWords;
      stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole)$/i;
      discard = /^(@|https?:)/;
      htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g;
      filteredWords = _.filter(wordsToFilter, function(w) {
        return !(stopWords.test(w));
      });
      return filteredWords;
    };

    Wall.prototype.hideWordCloud = function() {
      var fade, wordCloud;
      wordCloud = jQuery('#word-cloud');
      wordCloud.removeClass('visible');
      fade = jQuery('#fade');
      fade.removeClass('visible');
      return jQuery('#word-cloud svg').remove();
    };

    Wall.prototype.generateWordCloud = function(wordHash) {
      var draw, fill, height, width;
      width = 650;
      height = 400;
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
      return d3.layout.cloud().size([width, height]).words(wordHash).rotate(function() {
        return ~~(Math.random() * 5) * 30 - 60;
      }).font("Ubuntu").fontSize(function(d) {
        return d.size;
      }).on("end", draw).start();
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
      var cloud;
      return cloud = new CK.Smartboard.View.Cloud(this);
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
          this.$el.addClass('pinned');
        } else {
          this.$el.removeClass('pinned');
        }
        if (this.$el.get('pinned')) {
          return this.$el[0].fixed = true;
        } else {
          this.$el[0].fixed = false;
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
