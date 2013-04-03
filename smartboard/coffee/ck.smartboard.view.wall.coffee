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
            wordCloudObject = jQuery('#show-word-cloud')
            
            if (@showCloud)
                wordCloudObject.addClass('disabled')
                wordCloudObject.text('Drawing Cloud... Please wait...')
                @showWordCloud()
                @showCloud = false
            else
                @hideWordCloud()
                wordCloudObject.text('Show Word Cloud')
                @showCloud = true

        #'click #close-word-cloud': (ev) -> @hideWordCloud()
            

        'keydown #new-tag': (ev) -> @submitNewTag() if ev.keyCode is 13

        'click #toggle-pause': (ev) ->
            paused = @runState.get('paused')
            @runState.save(paused: !paused)

        'click #go-analyze': (ev) ->
            if !@mode? || @mode is 'brainstorm'
                Sail.app.startAnalysis()

        'click #go-propose': (ev) ->
            if @mode is 'analysis'
                Sail.app.startProposal()

        'click #go-interpret': (ev) ->
            if @mode is 'propose'
                Sail.app.startInterpretation()

    constructor: (options) ->
        @runState = options.runState
        @tags = options.tags
        @contributions = options.contributions
        super(options)

    initialize: ->
        @runState.on 'change', @render

        @balloonViews = {}

        @tags.on 'add', (t) =>
            @addBalloon t, CK.Smartboard.View.TagBalloon, @balloonViews
        @tags.each (t) => @addBalloon t, CK.Smartboard.View.TagBalloon, @balloonViews

        @contributions.on 'add', (c) =>
            @addBalloon c, CK.Smartboard.View.ContributionBalloon, @balloonViews
        @contributions.each (c) => @addBalloon c, CK.Smartboard.View.ContributionBalloon, @balloonViews

        # updating = false
        # updateAllPositions = =>
        #     unless updating
        #         updating = true
        #         for id,b of @balloonViews
        #             unless b.$el.hasClass('.ui-draggable-dragging')
        #                 b.updatePosition()
        #         updating = false
        #         window.webkitRequestAnimationFrame updateAllPositions
        # updateAllPositions()

    addBalloon: (doc, view, balloonList) =>
        b = new view
            model: doc
        doc.on 'change', b.render
        b.render()
        @$el.append b.$el

        # b.$el.on 'drag', (ev, ui) =>
        #     console.log ev, ui
        #     for id,bv of @balloonViews
        #         @balloonQuadtree.visit @detectCollisions(bv.$el)

        balloonList[doc.id] = b

    # check collisions for the given balloon (given ballon exerts force and gets no pushback)..
    # any other balloon that the given balloon collides with will also be checked for collision
    collideBalloon: (balloon) => # balloon should be a BallonView
        b = balloon

        for id,o of @balloonViews
            o.width = o.$el.outerWidth()
            o.height = o.$el.outerHeight()
            pos = o.$el.position()
            o.x = pos.left
            o.y = pos.top

        for id,o of @balloonViews
            continue if o is b # don't collide with self

            w = b.width/2 + o.width/2
            h = b.height/2 + o.height/2

            xDist = Math.abs(b.x - o.x)
            yDist = Math.abs(b.y - o.y)
            if xDist < w && yDist < h
                yOverlap = h - yDist
                xOverlap = w - xDist

                if xDist/w < yDist/h

                    # yNudge = (yOverlap/yDist) * yOverlap/h * force.alpha()
                    # b.y = b.y + yNudge*qRepulsion
                    # o.y = o.y - yNudge*bRepulsion
                    
                    yNudge = yOverlap #(yOverlap/2)
                    if b.y < o.y
                        o.y += yNudge
                    else
                        o.y -= yNudge
                else
                    # xNudge = (xOverlap/xDist) * xOverlap/w * force.alpha()
                    # b.x = b.x + xNudge*qRepulsion
                    # o.x = o.x - xNudge*bRepulsion
                    
                    xNudge = xOverlap #(xOverlap/2)
                    if b.x < o.x
                        o.x += xNudge
                    else
                        o.x -= xNudge

        for id,o of @balloonViews
            o.$el.css
                left: o.x + 'px'
                top: o.y + 'px'

    render: =>
        mode = @runState.get('mode')
        if mode isnt @$el.data('mode')
            switch mode
                when 'analysis'
                    jQuery('body')
                        .removeClass('mode-synthesis')
                        .addClass('mode-analysis')
                    @changeWatermark("analysis")
                when 'propose'
                    jQuery('body')
                        .removeClass('mode-analysis')
                        .addClass('mode-propose')
                    @changeWatermark("propose")
                when 'interpret'
                    jQuery('body')
                        .removeClass('mode-propose')
                        .removeClass('mode-evaluate')
                        .addClass('mode-interpret')
                    @changeWatermark("interpret")
                when 'evaluate'
                    jQuery('body')
                        .removeClass('mode-interpret')
                        .addClass('mode-evaluate')
                    @changeWatermark("evaluate")
                else
                    jQuery('body')
                        .removeClass('mode-analysis')
                        .removeClass('mode-synthesis')
                    @changeWatermark("brainstorm")

            @$el.data('mode', mode)

        paused = @runState.get('paused')
        if paused isnt @$el.data('paused')
            if paused then @pause() else @unpause()
            @$el.data('paused', paused)

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
        stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|shall|sd|sdf|fuck|shit|poo|pooped|boop|boops|asshole|undefined)$/i
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
        fadeDiv = jQuery('#fade')
        width = fadeDiv.width() #650
        height = fadeDiv.height() #400
        wordCloud = jQuery('#word-cloud')
        wordCloud.height(height + 'px')
        wordCloud.width(width + 'px')

        #alert height
        #alert width
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

        # enable the clicking of the button once the word cloud is rendered
        wordCloudObject = jQuery('#show-word-cloud')
        wordCloudObject.text('Hide Word Cloud')
        wordCloudObject.removeClass('disabled')

    pause: =>
        @$el.find('#toggle-pause')
                .addClass('paused')
                .text('Resume')

        if @mode isnt 'evaluate'
            jQuery('body').addClass('paused')
            @changeWatermark("Paused")
        

    unpause: =>
        jQuery('body').removeClass('paused')
        @$el.find('#toggle-pause')
            .removeClass('paused')
            .text('Pause')

        @changeWatermark(@mode || "brainstorm")

    changeWatermark: (text) =>
        jQuery('#watermark').fadeOut 800, ->
            jQuery(this).text(text)
                .fadeIn 800

    