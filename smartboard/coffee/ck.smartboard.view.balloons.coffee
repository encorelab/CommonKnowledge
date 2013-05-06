class CK.Smartboard.View.Balloon extends CK.Smartboard.View.Base

    initialize: ->
        super()

        # These make it possible to get and set the balloon's CSS properties by doing stuff like:
        #
        #   console.log(ballonView.right)
        #   ballonView.left = 500
        #   ballonView.top += 10
        #
        # For more info on how this works, see:
        # https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty
        #
        # TODO: this is too slow/inefficient to use in something like collision detection, due to the underlying DOM lookups
        Object.defineProperty this, 'pos',
            get: => @$el.position()
            set: (pos) => @$el.css(left: pos.left + 'px', top: pos.top + 'px')

        Object.defineProperty this, 'left',
            get: => @pos.left
            set: (x) => @$el.css('left', x + 'px')
        Object.defineProperty this, 'top',
            get: => @pos.top
            set: (y) => @$el.css('top', y + 'px')

        Object.defineProperty this, 'width',
            get: => @$el.outerWidth()
            set: (w) => @$el.css('width', w + 'px')
        Object.defineProperty this, 'height',
            get: => @$el.outerHeight()
            set: (h) => @$el.css('height', h + 'px')

        Object.defineProperty this, 'right',
            get: => @left + @width
            set: (x) => @$el.css('left', (x - @width) + 'px')
        Object.defineProperty this, 'bottom',
            get: => @top + @height
            set: (y) => @$el.css('top', (y - @height) + 'px')


        @model.on 'change:published', =>
            if @model.get('published')
                @$el.addClass('new')
                setTimeout(=>
                        @$el.removeClass('new')
                    , 1001
                )

                # only bind this after published...
                # highlight only on changes coming in from wakeful, not self changes
                @model.on 'wakeful:broadcast:received', =>
                    unless @$el.hasClass('glow') # don't glow if we're already glowing
                        @$el.addClass('glow')
                        setTimeout(=>
                                @$el.removeClass('glow')
                            , 4001
                        )

        @model.on 'change', =>
            @render() if @wall? # don't try to render until we've been properly added (wtf indeed)


    # true if this balloon has been added to the DOM, false otherwise
    isInDOM: ->
        jQuery.contains(document.documentElement, @el)

    # true if this balloon has a position in the wall
    isPositioned: ->
        pos = @pos
        pos.left? && pos.left > 0

    renderConnector: (toTag) ->
        tagId = toTag.id.toLowerCase()
        tagView = @wall.balloonViews[tagId]
        

        connectorId = @model.id + "-" + tagId

        connector = CK.Smartboard.View.findOrCreate @wall.$el, "##{connectorId}",
            "<div class='connector #{@BALLOON_TYPE}-connector' id='#{connectorId}'></div>"

        unless tagView? && @$el.is(':visible')
            # tag hasn't been rendered yet... we'll skip it for now
            connector.remove() # this may be expensive (since it'll have to be re-added)
            return

        x1 = @left + (@width/2)
        y1 = @top + (@height/2)
        x2 = tagView.left + (tagView.width/2)
        y2 = tagView.top + (tagView.height/2)

        connectorLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

        connectorTransform =
            "rotate(" + ((Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) ) + "deg)"

        connector.css
            'top': "#{y1}px"
            'left': "#{x1}px"
            'width': "#{connectorLength}px"
            '-webkit-transform': connectorTransform
            '-moz-transform': connectorTransform
            'transform': connectorTransform

        connector.addClass "connects-#{@model.id}"
        connector.addClass "connects-#{tagId}"
        connector.addClass "tag-#{tagId}" # used for Wall's @tagFilters

        return connector # for additional manipulation in subclasses


    render: =>
        @pos = @model.get('pos') if @model.has('pos')
        @$el.zIndex( @model.get('z-index') ) if @model.has('z-index')

class CK.Smartboard.View.ContentBalloon extends CK.Smartboard.View.Balloon
    tagName: 'article content'

    id: => @domID()

    # setColorClass: (colorClass) =>
    #     @colorClass = colorClass


    constructor: (options) ->
        super(options)

    initialize: ->
        super()

    events:
        # 'mousedown': (ev) -> @moveToTop()

        'dblclick': 'handleClick'


    handleClick: =>
        #jQuery('.contribution').not("##{@model.id}")

        if @$el.hasClass('.ui-draggable-dragging')
            return # prevent unwanted click action while dragging

        @$el.toggleClass('opened')
        
    # processContributionByType: =>
    #     if (@ballonContributionType is @balloonContributionTypes.analysis)
    #         @toggleAnalysis()

    # resetView: =>
    #     balloonObj = jQuery(@$el)
    #     balloonID = balloonObj.attr('id')

    #     if @ballonContributionType is @balloonContributionTypes.default
    #         balloonObj.addClass(@colorClass)
    #         return

    #     console.log 'Reset Proposal Views'
        
    #     balloonObj.removeClass('opened').removeClass(@colorClass)

    #     jQuery('#' + balloonID + ' .headline').hide()
    #     jQuery('#' + balloonID + ' .body').hide()
    #     jQuery('#' + balloonID + ' .meta').hide()
    #     jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')

    # toggleAnalysis: =>
    #     console.log 'Toggle Analysis'
    #     balloonObj = jQuery(@$el)

    #     balloonObj.toggleClass('balloon-note').toggleClass(@colorClass)
    #     balloonID = balloonObj.attr('id')
       
        
    #     if @$el.hasClass('opened')
    #         jQuery('#' + balloonID + ' img.balloon-note').hide()
    #         jQuery('#' + balloonID + ' .headline').fadeIn('fast')
    #         jQuery('#' + balloonID + ' .body').fadeIn('fast')
    #         jQuery('#' + balloonID + ' .meta').fadeIn('fast')
    #     else
    #         jQuery('#' + balloonID + ' .headline').hide()
    #         jQuery('#' + balloonID + ' .body').hide()
    #         jQuery('#' + balloonID + ' .meta').hide()
    #         jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')

    render: =>
        super()

        if @model.get 'published'
            @$el.removeClass 'unpublished'
        else
            @$el.addClass 'unpublished'

        @$el.addClass('content')

        headline = @findOrCreate '.headline',
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        @body = @findOrCreate '.body',
            "<div class='body'></div>"

        meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")

        @renderBuildons()
        #@processContributionByType()

        return this # return this for chaining
            

    renderBuildons: =>
        return unless @model.has('build_ons')

        buildons = @model.get('build_ons')

        return unless buildons.length

        container = @findOrCreate '.buildons',
            "<div class='buildons'></div>"

        changed = false
        if buildons.length isnt container.find('div.buildon').length
            changed = true

        container.children('div.buildon').remove()

        counter = CK.Smartboard.View.findOrCreate @$el.find('.meta'), '.buildon-counter',
            "<div class='buildon-counter'></div>"
        counter.html('')

        for b in buildons
            continue unless b.published

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

        # if changed
        #     @$el.effect('highlight', 2000)



class CK.Smartboard.View.ContributionBalloon extends CK.Smartboard.View.ContentBalloon
    BALLOON_TYPE: 'contribution'
    className: 'contribution balloon'

    initiaialize: ->
        @model.on 'change:tags', =>
            @renderConnectors()

    render: ->
        super()

        @renderConnectors()
        @renderTags()

        @$el.addClass('contribution')
        
        @body.text @model.get('content')
    
    renderConnectors: =>
        return if not @model.has('tags') or
            _.isEmpty(@model.get('tags')) or
            not @$el.is(':visible')

        for tag in @model.get('tags')
            @renderConnector(tag)

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

        for tid in tagIds
            @$el.addClass("tag-#{tid}")
        #TODO: remove removed tags

        return this # return this for chaining
    

class CK.Smartboard.View.ProposalBalloon extends CK.Smartboard.View.ContentBalloon
    className: 'proposal balloon'
    BALLOON_TYPE: 'proposal'

    initialize: ->
        super()
        @model.on 'change:votes', =>
            @$el.find('.votes').addClass('changed')
            setTimeout (=> @$el.find('.votes').removeClass 'changed'),
                1001

    render: ->
        super()

        @renderConnectors()
        @renderVotes()

        @$el.addClass('proposal')

        if @model.has 'tag'
            tag = @model.get('tag')
            @$el.addClass(tag.colorClass)
            @$el.addClass("tag-#{tag.id}")

        @body.html('')
        @body.append(jQuery('<p>').text(@model.get('proposal')))
        @body.append(jQuery('<p>').text(@model.get('justification')))

    renderConnectors: ->
        @renderConnector(@model.get 'tag') if @model.has 'tag'

    renderVotes: ->
        container = @findOrCreate '.votes',
            "<div class='votes'></div>"

        voteCount = @model.get('votes').length
        

        if voteCount is 0
            container.addClass('off')
            container.text('')
        else
            container.removeClass('off')
            container.text(voteCount)



# mz: I've commented this out because it probably needs to be re-written... also try to do more code reuse via inheritance or mixins

# class CK.Smartboard.View.ContributionProposalBalloon extends CK.Smartboard.View.Balloon
#     tagName: 'article'
#     className: 'contribution balloon'
   
#     id: => @domID()
    
#     setColorClass: (colorClass) =>
#         @colorClass = colorClass

#     setTagColorList: (colorList) =>
#         @tagList = colorList

#     constructor: (options) ->
#         super(options)

#         @balloonContributionTypes =
#             default:  'default',
#             analysis: 'analysis',
#             propose: 'propose',
#             interpret: 'interpret'
        

#         console.log @balloonContributionTypes

#         @ballonContributionType = @balloonContributionTypes.propose
#         @colorClass = "whiteGradient"
#         @tagList = {}

#     events:
#         #'mousedown': (ev) -> @moveToTop()

#         'click': (ev) =>
#             if @$el.hasClass('just-dragged')
#                 @$el.removeClass('just-dragged')
#             else
#                 @$el.toggleClass('opened')
#                 @$el.toggleClass(@colorClass)
                
#                 if @$el.hasClass('opened')
#                     @$el.removeClass('balloon-note')
#                 else
#                     @$el.addClass('balloon-note')
                
#                 @processContributionByType()

#     # initialize: =>
#     #     # make this View accessible from the element
#     #     @$el.data('view', @)

#     processContributionByType: =>
#         if (@ballonContributionType is @balloonContributionTypes.propose)
#             @toggleProposal()
#         else if (@ballonContributionType is @balloonContributionTypes.interpret)
#             @toggleInterpret()

#     resetView: =>
#         console.log 'Reset Proposal Views'
#         balloonObj = jQuery(@$el)
#         balloonID = balloonObj.attr('id')
#         balloonObj.removeClass(@colorClass).removeClass('opened').addClass('balloon-note')

#         jQuery('#' + balloonID + ' .headline').hide()
#         jQuery('#' + balloonID + ' .proposal').hide()
#         jQuery('#' + balloonID + ' .proposal-body').hide()
#         jQuery('#' + balloonID + ' .justification').hide()
#         jQuery('#' + balloonID + ' .justification-body').hide()
#         jQuery('#' + balloonID + ' .meta').hide()
#         jQuery('#' + balloonID + ' .idea-counter').hide()
#         jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')


#     toggleInterpret: =>
#         console.log 'Toggle Interpret'
#         balloonObj = jQuery(@$el)
#         #balloonObj
#         balloonID = balloonObj.attr('id')

#         if @$el.hasClass('opened')
#             jQuery('#' + balloonID + ' img.balloon-note').hide()
#             jQuery('#' + balloonID + ' .headline').fadeIn('fast')
#             jQuery('#' + balloonID + ' .proposal').fadeIn('fast')
#             jQuery('#' + balloonID + ' .justification').fadeIn('fast')
#             jQuery('#' + balloonID + ' .meta').fadeIn('fast')
#             jQuery('#' + balloonID + ' .idea-counter').fadeIn('fast')
#         else
#             jQuery('#' + balloonID + ' .headline').hide()
#             jQuery('#' + balloonID + ' .proposal').hide()
#             jQuery('#' + balloonID + ' .proposal-body').hide()
#             jQuery('#' + balloonID + ' .justification').hide()
#             jQuery('#' + balloonID + ' .justification-body').hide()
#             jQuery('#' + balloonID + ' .meta').hide()
#             jQuery('#' + balloonID + ' .idea-counter').hide()
#             jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')

#     toggleProposal: =>
#         console.log 'Toggle Proposal'
#         balloonObj = jQuery(@$el)
#         balloonID = balloonObj.attr('id')
    
#         #balloonObj.toggleClass('balloon-note').toggleClass(@colorClass)
#         balloonID = balloonObj.attr('id')
       
        
#         if @$el.hasClass('opened')
#             jQuery('#' + balloonID + ' img.balloon-note').hide()
#             jQuery('#' + balloonID + ' .headline').fadeIn('fast')
#             jQuery('#' + balloonID + ' .proposal').fadeIn('fast')
#             jQuery('#' + balloonID + ' .justification').fadeIn('fast')
#             jQuery('#' + balloonID + ' .meta').fadeIn('fast')
#         else
#             jQuery('#' + balloonID + ' .headline').hide()
#             jQuery('#' + balloonID + ' .proposal').hide()
#             jQuery('#' + balloonID + ' .proposal-body').hide()
#             jQuery('#' + balloonID + ' .justification').hide()
#             jQuery('#' + balloonID + ' .justification-body').hide()
#             jQuery('#' + balloonID + ' .meta').hide()
#             jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')


#     setIdeaCount: (count) =>
#         balloonObj = jQuery(@$el)
#         balloonID = balloonObj.attr('id')
#         ideaCounterObj = jQuery('#' + balloonID + ' div.idea-counter span.idea-count')
#         ideaCounterContainer = jQuery('#' + balloonID + ' div.idea-counter')
        
#         countNumber = parseInt(count, 10)
        
#         if countNumber < 1
#             ideaCounterContainer.removeClass('idea-counter-on').addClass('idea-counter-off')
#             ideaCounterObj.html('&nbsp;')
#         else if countNumber < 10
#             ideaCounterContainer.removeClass('idea-counter-off').addClass('idea-counter-on')
#             ideaCounterObj.html('&nbsp;' + countNumber)
#         else
#             ideaCounterContainer.removeClass('idea-counter-off').addClass('idea-counter-on')
#             ideaCounterObj.html(countNumber)


#     render: =>
#         super()

#         @$el.addClass('contribution').toggleClass('balloon-note')# .addClass(@colorClass)
#         console.log 'Rendering propose balloon.'

#         #if (@ballonContributionType is @balloonContributionTypes.analysis)
#         nodeHeader = @findOrCreate '.balloon-note', '<img style="display: none;" class="balloon-note" src="/smartboard/img/notes_large.png" alt="Note">'

#         #else if (@ballonContributionType is @balloonContributionTypes.propose)
#         ideaCounter = @findOrCreate '.idea-counter', '<div class="idea-counter idea-counter-off" style="display: none"><span class="idea-count">&nbsp;</span></div>'

#         headline = @findOrCreate '.headline',
#             "<h3 class='headline'></h3>"
#         headline.text @model.get('headline')

#         proposal = @findOrCreate '.proposal',
#             "<div class='proposal'>&#8227; Proposal<div class='proposal-body' tyle='display: none'></div></div>"

#         proposal.find('.proposal-body').text @model.get('proposal')

#         proposal.unbind 'click'
#         proposal.click (e) ->
#                 e.stopPropagation()
#                 jQuery(this).find('.proposal-body').slideToggle('fast')
                


#         justification = @findOrCreate '.justification',
#             "<div class='justification'>&#8227; Justification<div class='justification-body' style='display: none'></div></div>"

#         justification.find('.justification-body').text @model.get('justification')

#         justification.unbind 'click'
#         justification.click (e) ->
#             e.stopPropagation()
#             jQuery(this).find('.justification-body').slideToggle('fast')
        
#             # console.warn "Contribution #{@model.id} has an unrecognized content type: ", @model.get('content_type'), " ... assuming 'text'."

#         meta = @findOrCreate '.meta',
#             "<div class='meta'><span class='author'></span></div>"
#         meta.find('.author')
#             .text(@model.get('author'))
#             .addClass("author-#{@model.get('author')}")

#         numberOfVotes = @model.get('votes')

#         if numberOfVotes?
#             @setIdeaCount numberOfVotes

#         # @renderTags()

#         @renderBuildons()
#         @renderConnectors()
#         #@processContributionByType()

#         return this # return this for chaining

#     # FIXME: tags are automatically rendered as they are added (via the tag collection event bindings)
#     # ... so this method is mostly vestigial... need to get rid of this
#     renderTags: =>
#         # tagsContainer = @findOrCreate '.tags',
#         #     "<div class='tags'></div>"

#         return unless @model.has('tag_group_id')

#         # validTagClasses = []
#         # for tagText in @model.get('tags')
#         #     # hacky way to convert the tag into something that can be used as a CSS clas
#         #     md5tag = MD5.hexdigest(tagText)
#         #     tagClass = "tag-#{md5tag}"
#         #     validTagClasses.push tagClass
#         #     tagSpan = CK.Smartboard.View.findOrCreate tagsContainer, ".#{tagClass}",
#         #         "<span class='tag #{tagClass}></span>"
#         #     tagSpan.text tagText

#         # # now remove tags that are no longer present in the model
#         # tagsContainer.find('.tag').not(validTagClasses.join(",")).remove()

#         tagId = @model.get('tag_group_id')

#         @$el.attr('data-tags', tagId)


#         return @ # return this for chaining

#     renderBuildons: =>
#         return unless @model.has('build_ons') and @ballonContributionType is @balloonContributionTypes.interpret

#         buildons = @model.get('build_ons')

#         container = @findOrCreate '.buildons',
#             "<div class='buildons'></div>"

#         changed = false
#         if buildons.length isnt container.find('div.buildon').length
#             changed = true

#         container.children('div.buildon').remove()

#         counter = CK.Smartboard.View.findOrCreate @$el.find('.meta'), '.buildon-counter',
#             "<div class='buildon-counter'></div>"
#         counter.html('')

#         for b in buildons
#             counter.append("•")


#             $b = jQuery("
#                 <div class='buildon'>
#                     <div class='author'></div>
#                     <div class='content'></div>
#                 </div>
#             ")
#             $b.find('.author').text(b.author)
#             $b.find('.content').text(b.content)

#             tagGroupID = b.tag_group_id

#             if tagGroupID? and @tagList[tagGroupID]?
                
#                 tagClass = @tagList[tagGroupID].className
                
#                 if tagClass?
#                     $b.addClass(tagClass + '-buildon')

#             container.append $b

#         # if changed
#         #     @$el.effect('highlight', 2000)



class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Balloon
    tagName: 'div'
    className: 'tag balloon'
    BALLOON_TYPE: 'contribution'

    id: => @domID()

    initialize: ->
        super()
    
    setColorClass: (className) =>
        @$el.addClass(className)

    events:

        'click': 'handleClick'

    # makeDraggable: =>
    #     super()
    #     @$el.on 'drag', (ev, ui) =>
    #         @renderConnectors()

    handleClick: (ev) ->
        #$el = jQuery(ev.target)
        $el = @$el

        if @$el.hasClass('.ui-draggable-dragging')
            return # prevent unwanted click action while dragging

        console.log('clicked tag..')
        if $el.hasClass('active')
            Sail.app.wall.removeTagFilter(@model)
            $el.removeClass('active')
        else
            Sail.app.wall.addTagFilter(@model)
            $el.addClass('active')


    renderConnectors: =>
        taggedContributionViews = _.filter @wall.balloonViews, (bv) =>
            switch
                when bv.model instanceof CK.Model.Contribution
                    bv.$el.is(':visible') and
                        bv.model.hasTag(@model)
                when bv.model instanceof CK.Model.Proposal
                    bv.$el.is(':visible') and
                        bv.model.has('tag') and
                        bv.model.get('tag').id is @model.id
        
        for cv in taggedContributionViews
            cv.renderConnectors()

    render: =>
        super()

        @$el.addClass('tag')

        # if @model.has('colorClass')
        #     @$el.addClass @model.get('colorClass')

        name = @findOrCreate '.name',
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        if @model.has('colorClass')
            @setColorClass(@model.get('colorClass'))

        if @model.get('pinned')
            @$el.addClass('pinned')
        else
            @$el.removeClass('pinned')

        @renderConnectors()

        return this # return this for chaining