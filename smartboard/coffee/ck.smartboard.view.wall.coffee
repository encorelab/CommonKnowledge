class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'
    wordCloudShowable: true

    # determines how deep collision detection will be checked (from balloons hitting other balloons hitting other balloons...)
    maxCollisionRecursion: 1

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
            wordCloudButton = jQuery('#show-word-cloud')
            
            if (@wordCloudShowable)
                wordCloudButton.addClass('disabled')
                wordCloudButton.text('Drawing Cloud... Please wait...')
                @wordCloud ?= new CK.Smartboard.View.WordCloud()
                @wordCloud.render()
                @wordCloudShowable = false
            else
                @wordCloud.hide()
                wordCloudButton.text('Show Word Cloud')
                @wordCloudShowable = true

        #'click #close-word-cloud': (ev) -> @hideWordCloud()
            

        'keydown #new-tag': (ev) -> @submitNewTag() if ev.keyCode is 13

        'click #toggle-pause': (ev) ->
            paused = @runState.get('paused')
            @runState.save(paused: !paused)

        'click #go-analyze': (ev) ->
            @runState.save(mode: 'analysis')

        'click #go-propose': (ev) ->
            @runState.save(mode: 'propose')

        'click #go-interpret': (ev) ->
            @runState.save(mode: 'interpret')

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
        bv = new view
            model: doc
        doc.on 'change', bv.render
        bv.wall = this
        bv.render()
        @$el.append bv.$el

        # kind of an awkward place to call this, but this needs to happen after teh view has been
        # rendered and after it's been added to the DOM
        bv.cachePositionAndBounds()
        bv.renderConnectors() if bv.renderConnectors?

        balloonList[doc.id] = bv

    # check collisions for the given balloon (given ballon exerts force and gets no pushback)..
    # any other balloon that the given balloon collides with will also be checked for collision
    collideBalloon: (balloon, recursionLevel = 0, ignoreBalloons = []) => # `balloon` should be a BallonView, `recursionLevel` is used internally for recursive collisions
        b = balloon

        if recursionLevel is 0
            @_boundsWidth = @$el.innerWidth()
            @_boundsHeight = @$el.innerHeight()

            for id,o of @balloonViews
                o.cachePositionAndBounds()

        for id,o of @balloonViews
            continue if o is b # don't collide with self
            continue if o in ignoreBalloons # don't ignore with balloons we've already collided with

            rightOverlap  = b.right - o.left
            leftOverlap   = o.right - b.left
            topOverlap    = b.bottom - o.top
            bottomOverlap = o.bottom - b.top

            if rightOverlap > 0 and leftOverlap > 0 and topOverlap > 0 and bottomOverlap > 0
                yOverlap = Math.min(topOverlap, bottomOverlap)
                xOverlap = Math.min(leftOverlap, rightOverlap)
                #console.log b.model.get('name'), o.model.get('name'), topOverlap, bottomOverlap, leftOverlap, rightOverlap

                # TODO: this isn't quite behaving the way I intended... wanted bubbles to stack up a bit
                #       when there are a lot piled up together
                # if recursionLevel > 0
                #     nudgeScale = 1 - (recursionLevel / @maxCollisionRecursion)
                # else
                #     nudgeScale = 1
                nudgeScale = 1

                if yOverlap < xOverlap
                    yNudge = yOverlap #(yOverlap/2)
                    if b.top < o.top
                        o.top += yNudge * nudgeScale
                    else
                        o.top -= yNudge * nudgeScale
                else
                    xNudge = xOverlap #(xOverlap/2)
                    if b.left < o.left
                        o.left += xNudge * nudgeScale
                    else
                        o.left -= xNudge * nudgeScale

                if o.bottom > @_boundsHeight
                    o.top -= o.bottom - @_boundsHeight
                else if o.top < 0
                    o.top = 0
                if o.right > @_boundsWidth
                    o.left -= o.right - @_boundsWidth
                else if o.left < 0
                    o.left = 0

                o.renderConnectors() if o.renderConnectors?

                if recursionLevel < @maxCollisionRecursion
                    ignoreBalloons.push(b)
                    @collideBalloon(o, recursionLevel + 1, ignoreBalloons)

        if recursionLevel is 0
            for id,o of @balloonViews
                o.$el.css
                    left: o.left + 'px'
                    top: o.top + 'px'

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

    