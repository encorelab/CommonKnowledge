class CK.Smartboard.View.Wall extends CK.Smartboard.View.Base
    tagName: 'div'
    id: 'wall'
    wordCloudShowable: true

    events:
        'click #add-tag-opener': (ev) ->
            # We only allow a maximum of 4 tags
            if (@tags.length < 4)
                addTagContainer = @$el.find('#add-tag-container')
                addTagContainer.toggleClass('opened')
                if addTagContainer.hasClass('opened')
                    setTimeout(=>
                        @$el.find('#new-tag').focus()
                    , 1000)
            else
                # 4 tags exists, so we change opacity of button and do nothing more
                jQuery("#add-tag-opener").css
                    opacity: 0.4

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
            #return # temporarily disabled for April 8 run
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

        @contributions.on 'add', (c) =>
            @addBalloon c, CK.Smartboard.View.ContributionBalloon, @balloonViews
        @contributions.each (c) =>
            @addBalloon c, CK.Smartboard.View.ContributionBalloon, @balloonViews

        @tags.on 'add', (t) =>
            @addBalloon t, CK.Smartboard.View.TagBalloon, @balloonViews
        @tags.each (t) =>
            @addBalloon t, CK.Smartboard.View.TagBalloon, @balloonViews

        # need to force-render all connectors after we're done adding all balloons
        @tags.each (t) =>
            @balloonViews[t.id].renderConnectors()

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

        # hide until positioned (use visibility rather than display: 'none' to ensure we have dimensions for positioning)
        bv.$el.css('visibility', 'hidden') 

        bv.wall = this

        bv.render()
        @$el.append bv.$el

        doc.on 'change:pos', =>
            bv.pos = doc.get('pos')
        doc.on 'change:z-index', =>
            bv.$el.zIndex doc.get('z-index')

        if doc.has('pos')
            bv.pos = doc.get('pos')
        else
            @assignRandomPositionToBalloon(doc, bv)

        if doc.has('z-index')
            bv.$el.zIndex(doc.get('z-index'))

        @makeBallonDraggable(doc, bv)
        bv.$el.click => @moveBallonToTop(doc, bv)

        # balloon must be rendered and appended to DOM before it can be positioned
        bv.render()

        doc.save().done ->
            bv.$el.css('visibility', 'visible')

        balloonList[doc.id] = bv

            

    assignRandomPositionToBalloon: (doc, view) ->
        wallWidth = @$el.width()
        wallHeight = @$el.height()

        left = Math.random() * (wallWidth - view.$el.outerWidth())
        top = Math.random() * (wallHeight - view.$el.outerHeight())

        doc.set('pos', {left: left, top: top})

        @moveBallonToTop doc, view
        # 'z-index' is set on the model in @moveToTop()

    moveBallonToTop: (doc, view) ->
        maxZ = _.max @$el.find('.balloon').map (el) ->
            parseInt(jQuery(this).zIndex())
        maxZ++

        doc.set 'z-index', maxZ

        # this would move all connectors up too, but currently disabled
        #jQuery(".connects-#{@model.id}").zIndex maxZ - 1

    makeBallonDraggable: (doc, view) ->
        view.$el
            .draggable
                distance: 25 # how far it needs to be moved before it's considered a drag
                containment: '#wall'
                #stack: '.balloon'
            .css 'position', 'absolute' # draggable makes position relative, but we need absolute

        view.$el.on 'dragstop', (ev, ui) =>
            view.$el.addClass 'just-dragged' # prevent 'click' handlers from doing their thing

            doc.save {pos: ui.position}, {patch: true}

        view.$el.on 'drag', (ev, ui) =>
            view.renderConnectors() if view.renderConnectors?

        view.$el.on 'dragstart', (ev, ui) =>
            @moveBallonToTop(doc, view)


    render: =>
        phase = @runState.get('phase')
        if phase isnt @$el.data('phase')
            switch phase
                when 'tagging'
                    jQuery('body')
                        .removeClass('mode-brainstorm')
                        .addClass('mode-tagging')
                        .removeClass('mode-exploration')
                        .removeClass('mode-proposal')
                        .removeClass('mode-research_and_experiment')
                    @changeWatermark("tagging")
                when 'exploration'
                    jQuery('body')
                        .removeClass('mode-brainstorm')
                        .removeClass('mode-tagging')
                        .addClass('mode-exploration')
                        .removeClass('mode-proposal')
                        .removeClass('mode-research_and_experiment')
                    @changeWatermark("exploration")
                when 'proposal'
                    jQuery('body')
                        .removeClass('mode-brainstorm')
                        .removeClass('mode-tagging')
                        .removeClass('mode-exploration')
                        .addClass('mode-proposal')
                        .removeClass('mode-research_and_experiment')
                    @changeWatermark("proposal")
                when 'research_and_experiment'
                    jQuery('body')
                        .removeClass('mode-brainstorm')
                        .removeClass('mode-tagging')
                        .removeClass('mode-exploration')
                        .removeClass('mode-proposal')
                        .addClass('mode-research_and_experiment')
                    @changeWatermark("experiment")
                else
                    jQuery('body')
                        .addClass('mode-brainstorm')
                        .removeClass('mode-tagging')
                        .removeClass('mode-exploration')
                        .removeClass('mode-proposal')
                        .removeClass('mode-research_and_experiment')
                    @changeWatermark("brainstorm")

            @$el.data('phase', phase)

        # temporarily disabled for April 8 run
        jQuery("#go-propose, #go-interpret").css
            opacity: 0.4

        if (@tags.length >= 4)
            jQuery("#add-tag-opener").css
                opacity: 0.4

        paused = @runState.get('paused')
        if paused isnt @$el.data('paused')
            if paused then @pause() else @unpause()
            @$el.data('paused', paused)

    submitNewTag: =>
        newTag = @$el.find('#new-tag').val()
        
        # abort if the value is less then 2 chars
        if jQuery.trim(newTag).length < 2
            return

        Sail.app.createNewTag(newTag)
        @$el.find('#add-tag-container')
            .removeClass('opened')
            .blur()
        @$el.find('#new-tag').val('')

    pause: =>
        @$el.find('#toggle-pause')
                .addClass('paused')
                .text('Resume')

        if @$el.data('phase') isnt 'evaluate'
            jQuery('body').addClass('paused')
            @changeWatermark("Paused")
        

    unpause: =>
        jQuery('body').removeClass('paused')
        @$el.find('#toggle-pause')
            .removeClass('paused')
            .text('Pause')

        @changeWatermark(@$el.data('phase') || "brainstorm")

    changeWatermark: (text) =>
        jQuery('#watermark').fadeOut 800, ->
            jQuery(this).text(text)
                .fadeIn 800

    