class CK.Smartboard.View
    @findOrCreate: (parent, selector, html) ->
        el = parent.find(selector)
        return el if el.length > 0
        el = jQuery(html)
        parent.append(el)
        return el


class CK.Smartboard.View.Base extends Backbone.View
    findOrCreate: (selector, html) => 
        CK.Smartboard.View.findOrCreate @$el, selector, html

    corporealize: ->
        @$el.hide() # hide until positioned

        # check if element is in DOM; if not, insert it
        unless @$el.parent().length > 0
            if @model.justAdded
                @$el.addClass('new')
                delete @model.justAdded
            @$el.draggable
                stop: (ev, ui) =>
                    @model.save
                        pos: ui.position
                    return true # must return true, otherwise draggable is disabled
            @$el.css('position', 'absolute') # draggable() makes them 'relative' on webkit for some reason, which breaks shit
            jQuery('#wall').append(@$el)

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

    events:
        # 'click #tags-tab': (ev) ->
        #     jQuery('#tags-panel').css('left', '0px')

        'click #add-tag-opener': (ev) ->
            addTagContainer = @$el.find('#add-tag-container')
            addTagContainer.toggleClass('opened')
            if addTagContainer.hasClass('opened')
                setTimeout(=> 
                    @$el.find('#new-tag').focus()
                , 1000)

        'click #submit-new-tag': (ev) -> @submitNewTag()
            

        'keydown #new-tag': (ev) -> @submitNewTag() if ev.keyCode is 13

    submitNewTag: ->
        newTag = @$el.find('#new-tag').val()
        Sail.app.createNewTag(newTag)
        @$el.find('#add-tag-container')
            .removeClass('opened')
            .blur()
        @$el.find('#new-tag').val('')

    cloudify: ->
        # need to disable jQuery UI's draggable first, otherwise it
        # conflicts with d3's stuff

        @$el.find('.balloon.tag.ui-draggable, .balloon.contribution.ui-draggable')
        #@$el.find('.balloon.contribution.ui-draggable')
            .draggable('disable')

        tick = ->
            contributionBalloon
                .style('left', (d) ->
                    if d.classList.contains('ui-draggable-dragging')
                        return d
                    else
                        return (d.x = Math.max(radius, Math.min(width - radius, d.x))) + "px")
                .style('top', (d) ->
                    if d.classList.contains('ui-draggable-dragging')
                        return d
                    else
                        return (d.y = Math.max(radius, Math.min(height - radius, d.y))) + "px")

        transform = (d) ->
            return "rotate(" + Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI + "deg)"

        length = (d) ->
            dx = d.target.x - d.source.x
            dy = d.target.y - d.source.y
            return Math.sqrt(dx * dx + dy * dy) + "px"

        width = @$el.innerWidth()
        height = @$el.innerHeight()

        radius = 50
        fill = d3.scale.category20()

        force = d3.layout.force()
            .charge(-500)
            .linkDistance(30)
            .size([width, height])

        vis = d3.select("#"+@id)

        i = 0
        tags = {}
        Sail.app.tags.each (tag) ->
            t = jQuery('#'+tag.id)[0]
            t.index = i
            tags[tag.id] = t
            i++

        nodes = @$el.find('.balloon').toArray()
        
        links = []
        jQuery('.balloon.contribution').each ->
            contribBalloon = jQuery(@)
            return unless contribBalloon.data('tags')
            c = contribBalloon[0]
            c.index = i
            i++
            for t in contribBalloon.data('tags').split(' ')
                links.push
                    source: tags[t]
                    target: c

        @$el.find('.balloon').each -> # nothing yet

        contributionBalloon = vis.selectAll('.balloon')
            .data(nodes)
            .call(force.drag)

        force.nodes(nodes)
            .links(links)
            .on('tick', tick)
            .start()


    

class CK.Smartboard.View.ContributionBalloon extends CK.Smartboard.View.Base
    tagName: 'article'
    className: 'contribution balloon'
    id: => @domID()

    # initialize: =>
    #     # make this View accessible from the element
    #     @$el.data('view', @)

    render: =>
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


        @renderTags()
        
        @corporealize()

        return @ # return this for chaining

    renderTags: =>
        # tagsContainer = @findOrCreate '.tags',
        #     "<div class='tags'></div>"

        return unless @model.get('tags')?

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


class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Base
    tagName: 'div'
    className: 'tag balloon'
    id: => @domID()

    render: => 
        name = @findOrCreate '.name', 
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        @corporealize()

        @$el.show()

        return @ # return this for chaining

