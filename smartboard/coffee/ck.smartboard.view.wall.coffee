class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'
    wordCloudShowable: true

    # determines how deep collision detection will be checked (from balloons hitting other balloons hitting other balloons...)
    maxCollisionRecursion: 1

    events:
        'click #add-tag-opener': (ev) ->
            return # temporarily disabled for April 8 run
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

        'click #go-tagging': (ev) ->
            return # temporarily disabled for April 8 run
            @runState.save(phase: 'tagging')

        'click #go-propose': (ev) ->
            return # temporarily disabled for April 8 run
            @runState.save(phase: 'propose')

        'click #go-interpret': (ev) ->
            return # temporarily disabled for April 8 run
            @runState.save(phase: 'interpret')

    constructor: (options) ->
        @runState = options.runState
        @tags = options.tags
        @contributions = options.contributions
        super(options)

    initialize: ->
        super()

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

        doc.wake Sail.app.config.wakeful.url
        
        # highlight only on changes coming in from wakeful, not self changes
        #doc.on 'wakeful:broadcast:received', -> bv.$el.effect('highlight')

        bv.wall = this
        bv.render()
        @$el.append bv.$el

        # kind of an awkward place to call this, but this needs to happen after the view has been
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
                o.collided = false

        for id,o of @balloonViews
            continue if o is b # don't collide with self
            continue if o in ignoreBalloons # don't ignore with balloons we've already collided with

            rightOverlap  = b.right - o.left
            leftOverlap   = o.right - b.left
            topOverlap    = b.bottom - o.top
            bottomOverlap = o.bottom - b.top

            # if recursionLevel > 0
            #     overlapTolerance = 1 - (recursionLevel / (@maxCollisionRecursion+1))
            # else
            #     overlapTolerance = 1
            

            if rightOverlap > 0 and leftOverlap > 0 and topOverlap > 0 and bottomOverlap > 0
                yOverlap = Math.min(topOverlap, bottomOverlap)
                xOverlap = Math.min(leftOverlap, rightOverlap)
                #console.log b.model.get('name'), o.model.get('name'), topOverlap, bottomOverlap, leftOverlap, rightOverlap

                if yOverlap < xOverlap
                    yNudge = yOverlap #(yOverlap/2)
                    if b.top < o.top
                        o.top += yNudge
                        o.bottom += yNudge
                    else
                        o.top -= yNudge
                        o.bottom -= yNudge
                else
                    xNudge = xOverlap #(xOverlap/2)
                    if b.left < o.left
                        o.left += xNudge
                        o.right += xNudge
                    else
                        o.left -= xNudge
                        o.right -= xNudge

                o.collided = true

                if recursionLevel < @maxCollisionRecursion
                    ignoreBalloons.push(b)
                    @collideBalloon(o, recursionLevel + 1, ignoreBalloons)

        if recursionLevel is 0
            # this runs after we're done the entire collision chain

            for id,o of @balloonViews

                if o.collided
                
                    if o.bottom > @_boundsHeight
                        o.top = @_boundsHeight - o.height
                    else if o.top < 0
                        o.top = 0

                    o.bottom = o.top + o.height

                    if o.right > @_boundsWidth
                        o.left = @_boundsWidth - o.width
                    else if o.left < 0
                        o.left = 0

                    o.right = o.left + o.width

                    pos = {left: o.left, top: o.top}
                    #console.log "updating pos on model for #{o.model.id}"
                    o.model.set('pos', pos)
                    o.model.moved = true

                if o.renderConnectors? and
                        (o.collided or o.model instanceof CK.Model.Tag)
                    o.renderConnectors()

    render: =>
        phase = @runState.get('phase')
        if phase isnt @$el.data('phase')
            switch phase
                when 'tagging'
                    jQuery('body')
                        .removeClass('mode-synthesis')
                        .addClass('mode-tagging')
                    @changeWatermark("tagging")
                when 'propose'
                    jQuery('body')
                        .removeClass('mode-tagging')
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
                        .removeClass('mode-tagging')
                        .removeClass('mode-synthesis')
                    @changeWatermark("brainstorm")

            @$el.data('phase', phase)

        # temporarily disabled for April 8 run
        jQuery("#go-tagging, #go-propose, #go-interpret, #add-tag-container").css
            opacity: 0.4

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

    