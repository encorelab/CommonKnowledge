class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'
    wordCloudShowable: true

    # determines how deep collision detection will be checked (from balloons hitting other balloons hitting other balloons...)
    maxCollisionRecursion: 2

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
    collideBalloon: (balloon, recursionLevel = 0) => # `balloon` should be a BallonView, `recursionLevel` is used internally for recursive collisions
        b = balloon

        if recursionLevel is 0
            @_boundsWidth = @$el.innerWidth()
            @_boundsHeight = @$el.innerHeight()

            for id,o of @balloonViews
                o.cachePositionAndBounds()

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

                if o.y + o.height > @_boundsHeight
                    o.y -= o.y + o.height - @_boundsHeight
                else if o.y < 0
                    o.y = 0
                if o.x + o.width > @_boundsWidth
                    o.x -= o.x + o.width - @_boundsWidth
                else if o.x < 0
                    o.x = 0

                if recursionLevel <= @maxCollisionRecursion
                    @collideBalloon(o, recursionLevel + 1)

        if recursionLevel is 0
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

    