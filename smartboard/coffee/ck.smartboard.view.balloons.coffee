class CK.Smartboard.View.Balloon extends CK.Smartboard.View.Base
    initialize: ->
        # Object.defineProperty @el, 'x',
        #     get: => @$el.position().left
        #     set: (x) => @$el.css('left', x + 'px')
        # Object.defineProperty @el, 'y',
        #     get: => @$el.position().top
        #     set: (y) => @$el.css('top', y + 'px')
        # Object.defineProperty @el, 'width',
        #     get: => @$el.outerWidth()
        #     set: (w) => @$el.css('width', w + 'px')
        # Object.defineProperty @el, 'height',
        #     get: => @$el.outerHeight()
        #     set: (h) => @$el.css('height', h + 'px')

    # moveToTop: =>
    #     maxZ = _.max jQuery('.balloon').map ->
    #         parseInt(jQuery(this).zIndex()) + 1
    #     @$el.zIndex maxZ

    render: =>
        @makeDraggable() if not @draggable


    makeDraggable: =>
        @$el
            .draggable
                distance: 5
                containment: '#wall'
                stack: '.balloon'
                obstacle: ".balloon:not(##{@$el.attr('id')})" # don't collide with self
            .css 'position', 'absolute' # draggable makes position relative, but we need absolute

        @$el
            .on 'drag', (ev, ui) =>
                Sail.app.wall.collideBalloon(this)
            .on 'stop', (ev, ui) =>
                @model.save('pos': ui.position)
                console.log("Saving pinned tag's position")
                pos = @$el.position()
                tid = @$el.attr('id')
                tag = Sail.app.tags.get(tid)
                if tag
                    tag.set({pos: {left: pos.left, top: pos.top, pinned: true}}, {silent: true})
                    tag.save({}, {silent: true})
                else
                    console.log("Couldn't save pinned tag's position -- couldn't find a tag with id: ", tid)

        @draggable = true

    # Sets .x, .y, .width, and .height on this object, based on data from the DOM.
    # The DOM lookup is expensive, so we try not to do it unless necessary — especially in collision detection.
    # Call this whenever the view's dimensions or position changes!
    cachePositionAndBounds: ->
        this.width = this.$el.outerWidth()
        this.height = this.$el.outerHeight()
        pos = this.$el.position()
        this.x = pos.left
        this.y = pos.top

class CK.Smartboard.View.ContributionBalloon extends CK.Smartboard.View.Balloon
    tagName: 'article'
    className: 'contribution balloon'
   
    id: => @domID()
    
    setColorClass: (colorClass) =>
        @colorClass = colorClass

    constructor: (options) ->
        super(options)

        @balloonContributionTypes = {
            default:  'default',
            analysis: 'analysis',
            propose: 'propose',
            interpret: 'interpret'
        }

        @ballonContributionType = @balloonContributionTypes.default
        @colorClass = "whiteGradient"

    events:
        # 'mousedown': (ev) -> @moveToTop()

        'click': (ev) ->
            @$el.toggleClass('opened')
            # if @$el.hasClass('opened')
            #     if Sail.app.wall.cloud? && Sail.app.wall.cloud.force?
            #         Sail.app.wall.cloud.force.stop()
            
            @processContributionByType()

    # initialize: =>
    #     # make this View accessible from the element
    #     @$el.data('view', @)

    processContributionByType: =>
        if (@ballonContributionType is @balloonContributionTypes.analysis)
            @toggleAnalysis()

    resetView: =>
        balloonObj = jQuery(@$el)
        balloonID = balloonObj.attr('id')

        if @ballonContributionType is @balloonContributionTypes.default
            balloonObj.addClass(@colorClass)
            return

        console.log 'Reset Proposal Views'
        
        balloonObj.removeClass('opened').removeClass(@colorClass)

        jQuery('#' + balloonID + ' .headline').hide()
        jQuery('#' + balloonID + ' .body').hide()
        jQuery('#' + balloonID + ' .meta').hide()
        jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')
       
    toggleAnalysis: =>
        console.log 'Toggle Analysis'
        balloonObj = jQuery(@$el)

        balloonObj.toggleClass('balloon-note').toggleClass(@colorClass)
        balloonID = balloonObj.attr('id')
       
        
        if @$el.hasClass('opened')
            jQuery('#' + balloonID + ' img.balloon-note').hide()
            jQuery('#' + balloonID + ' .headline').fadeIn('fast')
            jQuery('#' + balloonID + ' .body').fadeIn('fast')
            jQuery('#' + balloonID + ' .meta').fadeIn('fast')
        else
            jQuery('#' + balloonID + ' .headline').hide()
            jQuery('#' + balloonID + ' .body').hide()
            jQuery('#' + balloonID + ' .meta').hide()
            jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')


    render: =>
        super()

        @$el.addClass('contribution').addClass(@colorClass)

        if @model.get('kind') is 'propose'
            @$el.addClass('synthesis')

        #if (@ballonContributionType is @balloonContributionTypes.analysis)
        nodeHeader = @findOrCreate '.balloon-note', '<img style="display: none;" class="balloon-note" src="/smartboard/img/notes_large.png" alt="Note">'
        
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

        @renderBuildons()
        @processContributionByType()

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




class CK.Smartboard.View.ContributionProposalBalloon extends CK.Smartboard.View.Balloon
    tagName: 'article'
    className: 'contribution balloon'
   
    id: => @domID()
    
    setColorClass: (colorClass) =>
        @colorClass = colorClass

    setTagColorList: (colorList) =>
        @tagList = colorList

    constructor: (options) ->
        super(options)

        @balloonContributionTypes =
            default:  'default',
            analysis: 'analysis',
            propose: 'propose',
            interpret: 'interpret'
        

        console.log @balloonContributionTypes

        @ballonContributionType = @balloonContributionTypes.propose
        @colorClass = "whiteGradient"
        @tagList = {}

    events:
        #'mousedown': (ev) -> @moveToTop()

        'click': (ev) ->
            @$el.toggleClass('opened')
            @$el.toggleClass(@colorClass)
            
            if @$el.hasClass('opened')
                @$el.removeClass('balloon-note')
            else
                @$el.addClass('balloon-note')
            #     if Sail.app.wall.cloud? && Sail.app.wall.cloud.force?
            #         Sail.app.wall.cloud.force.stop()
            
            @processContributionByType()

    # initialize: =>
    #     # make this View accessible from the element
    #     @$el.data('view', @)

    processContributionByType: =>
        if (@ballonContributionType is @balloonContributionTypes.propose)
            @toggleProposal()
        else if (@ballonContributionType is @balloonContributionTypes.interpret)
            @toggleInterpret()

    resetView: =>
        console.log 'Reset Proposal Views'
        balloonObj = jQuery(@$el)
        balloonID = balloonObj.attr('id')
        balloonObj.removeClass(@colorClass).removeClass('opened').addClass('balloon-note')

        jQuery('#' + balloonID + ' .headline').hide()
        jQuery('#' + balloonID + ' .proposal').hide()
        jQuery('#' + balloonID + ' .proposal-body').hide()
        jQuery('#' + balloonID + ' .justification').hide()
        jQuery('#' + balloonID + ' .justification-body').hide()
        jQuery('#' + balloonID + ' .meta').hide()
        jQuery('#' + balloonID + ' .idea-counter').hide()
        jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')


    toggleInterpret: =>
        console.log 'Toggle Interpret'
        balloonObj = jQuery(@$el)
        #balloonObj
        balloonID = balloonObj.attr('id')

        if @$el.hasClass('opened')
            jQuery('#' + balloonID + ' img.balloon-note').hide()
            jQuery('#' + balloonID + ' .headline').fadeIn('fast')
            jQuery('#' + balloonID + ' .proposal').fadeIn('fast')
            jQuery('#' + balloonID + ' .justification').fadeIn('fast')
            jQuery('#' + balloonID + ' .meta').fadeIn('fast')
            jQuery('#' + balloonID + ' .idea-counter').fadeIn('fast')
        else
            jQuery('#' + balloonID + ' .headline').hide()
            jQuery('#' + balloonID + ' .proposal').hide()
            jQuery('#' + balloonID + ' .proposal-body').hide()
            jQuery('#' + balloonID + ' .justification').hide()
            jQuery('#' + balloonID + ' .justification-body').hide()
            jQuery('#' + balloonID + ' .meta').hide()
            jQuery('#' + balloonID + ' .idea-counter').hide()
            jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')

    toggleProposal: =>
        console.log 'Toggle Proposal'
        balloonObj = jQuery(@$el)
        balloonID = balloonObj.attr('id')
    
        #balloonObj.toggleClass('balloon-note').toggleClass(@colorClass)
        balloonID = balloonObj.attr('id')
       
        
        if @$el.hasClass('opened')
            jQuery('#' + balloonID + ' img.balloon-note').hide()
            jQuery('#' + balloonID + ' .headline').fadeIn('fast')
            jQuery('#' + balloonID + ' .proposal').fadeIn('fast')
            jQuery('#' + balloonID + ' .justification').fadeIn('fast')
            jQuery('#' + balloonID + ' .meta').fadeIn('fast')
        else
            jQuery('#' + balloonID + ' .headline').hide()
            jQuery('#' + balloonID + ' .proposal').hide()
            jQuery('#' + balloonID + ' .proposal-body').hide()
            jQuery('#' + balloonID + ' .justification').hide()
            jQuery('#' + balloonID + ' .justification-body').hide()
            jQuery('#' + balloonID + ' .meta').hide()
            jQuery('#' + balloonID + ' img.balloon-note').fadeIn('fast')


    setIdeaCount: (count) =>
        balloonObj = jQuery(@$el)
        balloonID = balloonObj.attr('id')
        ideaCounterObj = jQuery('#' + balloonID + ' div.idea-counter span.idea-count')
        ideaCounterContainer = jQuery('#' + balloonID + ' div.idea-counter')
        
        countNumber = parseInt(count, 10)
        
        if countNumber < 1
            ideaCounterContainer.removeClass('idea-counter-on').addClass('idea-counter-off')
            ideaCounterObj.html('&nbsp;')
        else if countNumber < 10
            ideaCounterContainer.removeClass('idea-counter-off').addClass('idea-counter-on')
            ideaCounterObj.html('&nbsp;' + countNumber)
        else
            ideaCounterContainer.removeClass('idea-counter-off').addClass('idea-counter-on')
            ideaCounterObj.html(countNumber)


    render: =>
        super()

        @$el.addClass('contribution').toggleClass('balloon-note')# .addClass(@colorClass)
        console.log 'Rendering propose balloon.'

        #if (@ballonContributionType is @balloonContributionTypes.analysis)
        nodeHeader = @findOrCreate '.balloon-note', '<img style="display: none;" class="balloon-note" src="/smartboard/img/notes_large.png" alt="Note">'

        #else if (@ballonContributionType is @balloonContributionTypes.propose)
        ideaCounter = @findOrCreate '.idea-counter', '<div class="idea-counter idea-counter-off" style="display: none"><span class="idea-count">&nbsp;</span></div>'

        headline = @findOrCreate '.headline',
            "<h3 class='headline'></h3>"
        headline.text @model.get('headline')

        proposal = @findOrCreate '.proposal',
            "<div class='proposal'>&#8227; Proposal<div class='proposal-body' tyle='display: none'></div></div>"

        proposal.find('.proposal-body').text @model.get('proposal')

        proposal.unbind 'click'
        proposal.click (e) ->
                e.stopPropagation()
                jQuery(this).find('.proposal-body').slideToggle('fast')
                


        justification = @findOrCreate '.justification',
            "<div class='justification'>&#8227; Justification<div class='justification-body' style='display: none'></div></div>"

        justification.find('.justification-body').text @model.get('justification')

        justification.unbind 'click'
        justification.click (e) ->
            e.stopPropagation()
            jQuery(this).find('.justification-body').slideToggle('fast')
        
            # console.warn "Contribution #{@model.id} has an unrecognized content type: ", @model.get('content_type'), " ... assuming 'text'."

        meta = @findOrCreate '.meta',
            "<div class='meta'><span class='author'></span></div>"
        meta.find('.author')
            .text(@model.get('author'))
            .addClass("author-#{@model.get('author')}")

        numberOfVotes = @model.get('votes')

        if numberOfVotes?
            @setIdeaCount numberOfVotes

        # @renderTags()

        @renderBuildons()
        #@processContributionByType()

        return this # return this for chaining

    # FIXME: tags are automatically rendered as they are added (via the tag collection event bindings)
    # ... so this method is mostly vestigial... need to get rid of this
    renderTags: =>
        # tagsContainer = @findOrCreate '.tags',
        #     "<div class='tags'></div>"

        return unless @model.has('tag_group_id')

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

        tagId = @model.get('tag_group_id')

        @$el.attr('data-tags', tagId)


        return @ # return this for chaining

    renderBuildons: =>
        return unless @model.has('build_ons') and @ballonContributionType is @balloonContributionTypes.interpret

        buildons = @model.get('build_ons')

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
            counter.append("•")


            $b = jQuery("
                <div class='buildon'>
                    <div class='author'></div>
                    <div class='content'></div>
                </div>
            ")
            $b.find('.author').text(b.author)
            $b.find('.content').text(b.content)

            tagGroupID = b.tag_group_id

            if tagGroupID? and @tagList[tagGroupID]?
                
                tagClass = @tagList[tagGroupID].className
                
                if tagClass?
                    $b.addClass(tagClass + '-buildon')

            container.append $b

        # if changed
        #     @$el.effect('highlight', 2000)



class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Balloon
    tagName: 'div'
    className: 'tag balloon'
    id: => @domID()
    
    setColorClass: (className) =>
        @$el.addClass(className)

    events:
        # 'mousedown': (ev) -> @moveToTop()

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
        super()

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