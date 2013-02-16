class CK.Smartboard.View
    @findOrCreate: (parent, selector, html) ->
        el = jQuery(parent).find(selector)
        return el if el.length > 0
        el = jQuery(html)
        parent.append(el)
        return el


class CK.Smartboard.View.Base extends Backbone.View
    findOrCreate: (selector, html) => 
        CK.Smartboard.View.findOrCreate @$el, selector, html

    constructor: (options) ->
        super(options)

        @$el.hide() # hide until positioned

        # check if element is in DOM; if not, insert it
        unless @$el.parent().length > 0
            if @model.justAdded
                @$el.addClass('new')
                delete @model.justAdded
            # @$el.draggable
            #     stop: (ev, ui) =>
            #         @model.save
            #             pos: ui.position
            #         return true # must return true, otherwise draggable is disabled
            @$el.css('position', 'absolute') # draggable() makes them 'relative' on webkit for some reason, which breaks shit
            jQuery('#wall').append(@$el)

        if @model? 
            if @model.has('pos')
                @$el.css
                    left: @model.get('pos').left + 'px'
                    top: @model.get('pos').top + 'px'
            else
                @autoPosition()

        @$el.show()

    autoPosition: ->
        wallWidth = jQuery('#wall').width()
        wallHeight = jQuery('#wall').height()

        left = Math.random() * (wallWidth - @$el.width())
        top = Math.random() * (wallHeight - @$el.height())

        @$el.css
            left: left + 'px'
            top: top + 'px'

        @model.save {pos: {left: left, top: top}}

    domID: => @model.id

class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'
    showCloud: true

    events:
        'click #add-tag-opener': (ev) ->
            addTagContainer = @$el.find('#add-tag-container')
            addTagContainer.toggleClass('opened')
            if addTagContainer.hasClass('opened')
                setTimeout(=> 
                    @$el.find('#new-tag').focus()
                , 1000)

        'click #submit-new-tag': (ev) -> @submitNewTag()

        'click #show-word-cloud': (ev) ->
            if (@showCloud)
                @showWordCloud()
                @showCloud = false
            else
                @hideWordCloud()
                @showCloud = true

        'click #close-word-cloud': (ev) -> @hideWordCloud()
            

        'keydown #new-tag': (ev) -> @submitNewTag() if ev.keyCode is 13

        'click #toggle-pause': (ev) ->
            $p = jQuery(ev.target)
            if $p.hasClass('paused')
                Sail.app.unpause()
                $p.removeClass('paused').text('Pause')
            else
                $p.addClass('paused').text('Resume')
                Sail.app.pause()
            # note that we don't call the view's pause/unpause methods here;
            # those are triggered by sail events in CK.Smartboard

        'click #go-analyze': (ev) ->
            if !@mode? || @mode is 'brainstorm'
                Sail.app.startAnalysis()

        'click #go-synthesize': (ev) ->
            if @mode is 'analysis'
                Sail.app.startSynthesis()

    constructor: (options) ->
        super(options)
        @cloud = new CK.Smartboard.View.BalloonCloud(this)

    submitNewTag: =>
        newTag = @$el.find('#new-tag').val()
        Sail.app.createNewTag(newTag)
        @$el.find('#add-tag-container')
            .removeClass('opened')
            .blur()
        @$el.find('#new-tag').val('')


    showWordCloud: =>
        words = []
        # make sure old word cloud is removed to avoid accumulating clouds
        jQuery('#word-cloud svg').remove()
        # call function that returns an array with all words to consider for the cloud
        @gatherWordsForCloud words, (gatheredWords) ->
            words = gatheredWords
            #filteredWords = w for w in words when not (stopWords.test(w) or punctuation.test(w))
            filteredWords = Wall.prototype.filterWords (words)
            console.log filteredWords

            # count the occurance of each word and create a has with word and count {word1: 3}
            wordCount = {}
            for w in filteredWords
                wordCount[w] ?= 0
                wordCount[w]++

            # Now some math to calculate the size of a word depending on it's occurance (count)
            maxSize = 70
            maxCount = _.max wordCount, (count,word) -> count
            console.log maxCount, wordCount
            wordHash = for word,count of wordCount
                h = {text: word, size: Math.pow(count / maxCount, 0.5) * maxSize}
                console.log word,count,h
                h
                
            # call the function that actually generates the word cloud
            Wall.prototype.generateWordCloud(wordHash)
            # make the object holding the word-cloud and the overlay visible
            wordCloud = jQuery('#word-cloud')
            wordCloud.addClass('visible')
            fade = jQuery('#fade')
            fade.addClass('visible')

    gatherWordsForCloud: (wordsToReturn, callback) =>
        punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g
        wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g
        text = ''
        
        @contributions = new CK.Model.Contributions()
        @contributions.fetch success: (collection, response) ->
            _.each collection.models, (c) ->
                console.log c.get('headline'), c.get('content')
                text += c.get('headline') + ' '
                text += c.get('content') + ' '
            _.each text.split(wordSeparators), (word) ->
                word = word.replace(punctuation, "")
                wordsToReturn.push(word)
            callback (wordsToReturn)


    filterWords: (wordsToFilter) ->
        stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole)$/i
        # punctuation = /[!"&()*+,-\.\/:;<=>?\[\\\]^`\{|\}~]+/g
        # wordSeparators = /[\s\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g
        discard = /^(@|https?:)/
        htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g
        filteredWords = _.filter wordsToFilter, (w) -> not (stopWords.test(w))
        return filteredWords


    hideWordCloud: =>
        wordCloud = jQuery('#word-cloud')
        wordCloud.removeClass('visible')
        fade = jQuery('#fade')
        fade.removeClass('visible')
        jQuery('#word-cloud svg').remove()

    generateWordCloud: (wordHash) ->
        width = 650
        height = 400
        draw = (words) ->
            d3.select("#word-cloud")
            .append("svg")
            .attr("width", "99%")
            .attr("height", "99%")
            .append("g")
            .attr("transform", "translate(#{width/2},#{height/2})")
            .selectAll("text")
            .data(words)
            .enter()
            .append("text")
            .style("font-size", (d) ->
                d.size + "px"
            ).style("font-family", "Ubuntu")
            .style("fill", (d, i) ->
                fill i
            ).attr("text-anchor", "middle")
            .attr("transform", (d) ->
                "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"
            ).text (d) ->
                d.text

        fill = d3.scale.category20()
        d3.layout.cloud().size([width, height]).words(wordHash).rotate(->
            ~~(Math.random() * 5) * 30 - 60
            # ~~(Math.random() * 2) * 90
        ).font("Ubuntu").fontSize((d) ->
            d.size
        ).on("end", draw).start()

    pause: =>
        @cloud.force.stop()
        jQuery('body').addClass('paused')
        @$el.find('#toggle-pause')
            .addClass('paused')
            .text('Resume')

        @changeWatermark("Paused")

    unpause: =>
        @cloud.force.resume()
        jQuery('body').removeClass('paused')
        @$el.find('#toggle-pause')
            .removeClass('paused')
            .text('Pause')

        @changeWatermark(@mode || "brainstorm")

    changeWatermark: (text) =>
        jQuery('#watermark').fadeOut 800, ->
                jQuery(@).text(text)
                    .fadeIn 800

    setMode: (mode) =>
        mode = "brainstorm" unless mode
        @mode = mode

        if mode is 'analysis'
            jQuery('body')
                .removeClass('mode-synthesis')
                .addClass('mode-analysis')
            @changeWatermark("analysis")

        else if mode is 'synthesis'
            jQuery('body')
                .removeClass('mode-analysis')
                .addClass('mode-synthesis')
            @changeWatermark("synthesis")

        else
            jQuery('body')
                .removeClass('mode-analysis')
                .removeClass('mode-synthesis')
            @changeWatermark("brainstorm")
    

    # init and render a new ContributionBalloon view and add it to the Bubble cloud
    # `contrib` should be a CK.Model.Contribution object
    bubbleContrib: (contrib) =>
        # TODO: move this to @wall.cloud.addContribution
        

    # init and render a new TagBalloon view and add it to the Bubble cloud
    # `contrib` should be a CK.Model.Tag object
    bubbleTag: (tag) =>
        # TODO: move this to @wall.cloud.addTag
        bubble = new CK.Smartboard.View.TagBalloon {model: tag}
        tag.on 'change', bubble.render
        bubble.render()
        @cloud.addTag(bubble.$el)

    render: =>
        #@cloud.render()
        

class CK.Smartboard.View.Balloon extends CK.Smartboard.View.Base
    moveToTop: =>
        maxZ = _.max jQuery('.balloon').map -> 
            parseInt(jQuery(this).zIndex()) + 1
        @$el.zIndex maxZ


class CK.Smartboard.View.ContributionBalloon extends CK.Smartboard.View.Balloon
    tagName: 'article'
    className: 'contribution balloon'
    id: => @domID()

    events:
        'mousedown': (ev) -> @moveToTop()

        'click': (ev) ->
            @$el.toggleClass('opened')
            if @$el.hasClass('opened')
                if Sail.app.wall.cloud? && Sail.app.wall.cloud.force?
                    Sail.app.wall.cloud.force.stop()
                    


    # initialize: =>
    #     # make this View accessible from the element
    #     @$el.data('view', @)

    render: =>
        @$el.addClass('contribution')

        if @model.get('kind') is 'synthesis'
            @$el.addClass('synthesis')

        headline = @findOrCreate '.headline', 
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        body = @findOrCreate '.body', 
            "<div class='body'></div>"

        if @model.get('content_type') is 'text'
            body.text @model.get('content')
        else
            body.text @model.get('content')
            # console.warn "Contribution #{@model.id} has an unrecognized content type: ", @model.get('content_type'), " ... assuming 'text'."

        meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")

        # @renderTags()

        # @renderBuildons()

        return this # return this for chaining

    # FIXME: tags are automatically rendered as they are added (via the tag collection event bindings)
    # ... so this method is mostly vestigial... need to get rid of this
    renderTags: =>
        # tagsContainer = @findOrCreate '.tags',
        #     "<div class='tags'></div>"

        return unless @model.has('tags')

        # validTagClasses = []
        # for tagText in @model.get('tags')
        #     # hacky way to convert the tag into something that can be used as a CSS clas
        #     md5tag = MD5.hexdigest(tagText)
        #     tagClass = "tag-#{md5tag}"
        #     validTagClasses.push tagClass 
        #     tagSpan = CK.Smartboard.View.findOrCreate tagsContainer, ".#{tagClass}",
        #         "<span class='tag #{tagClass}></span>"
        #     tagSpan.text tagText

        # # now remove tags that are no longer present in the model
        # tagsContainer.find('.tag').not(validTagClasses.join(",")).remove()

        tagIds = (tag.id for tag in @model.get('tags'))

        @$el.attr('data-tags', tagIds.join(" "))


        return @ # return this for chaining

    renderBuildons: =>
        return unless @model.has('build_ons')

        buildons = @model.get('build_ons')

        container = @findOrCreate '.buildons',
            "<div class='buildons'></div>"

        changed = false
        if buildons.length isnt container.find('div.buildon').length
            changed = true

        container.remove('div.buildon')

        counter = CK.Smartboard.View.findOrCreate @$el.find('.meta'), '.buildon-counter',
            "<div class='buildon-counter'></div>"
        counter.html('')

        for b in buildons
            counter.append("•")

            $b = jQuery("
                <div class='buildon'>
                    <div class='author'></div>
                    <div class='content'></div>
                </div>
            ")
            $b.find('.author').text(b.author)
            $b.find('.content').text(b.content)
            container.append $b

        if changed
            @$el.effect('highlight', 2000)



class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Balloon
    tagName: 'div'
    className: 'tag balloon'
    id: => @domID()

    events:
        'mousedown': (ev) -> @moveToTop()

        # can't do on mouseup because d3's drag prevents bubbling of that event
        'mouseout': (ev) ->
            if @model.get('pinned')
                console.log("Saving pinned tag's position")
                pos = @$el.position()
                tid = @$el.attr('id')
                tag = Sail.app.tags.get(tid)
                if tag
                    tag.set({pos: {left: pos.left, top: pos.top, pinned: true}}, {silent: true})
                    tag.save({}, {silent: true})
                else
                    console.log("Couldn't save pinned tag's position -- couldn't find a tag with id: ", tid)

        'click': (ev) ->
            @model.set('pinned', !@model.get('pinned'), {silent:true})

            if @model.get('pinned')
                @$el.addClass('pinned')
            else
                @$el.removeClass('pinned')

            # FIXME: seems to always be evaluating to false

            if @$el.get('pinned')
                # NOTE: this gets set again based on the 'pinned' class in cloud.tick()
                @$el[0].fixed = true
            else
                @$el[0].fixed = false
                return

            # console.log("Saving pinned tag's position")

            # tid = @$el.attr('id')
            # tag = Sail.app.tags.get(tid)
            # if tag
            #     tag.save({}, {silent: true})
            # else
            #     console.log("Couldn't save pinned tag's position -- couldn't find a tag with id: ", tid)

    render: => 
        @$el.addClass('tag')

        name = @findOrCreate '.name', 
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        if @model.get('pinned')
            @$el.addClass('pinned')
        else
            @$el.removeClass('pinned')

        @$el.show()

        return this # return this for chaining

