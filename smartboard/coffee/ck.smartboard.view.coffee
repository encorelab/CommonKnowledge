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
            # @$el.draggable
            #     stop: (ev, ui) =>
            #         @model.save
            #             pos: ui.position
            #         return true # must return true, otherwise draggable is disabled
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
        console.log("Cloudifying the wall...")

        # need to disable jQuery UI's draggable first, otherwise it
        # conflicts with d3's stuff
        @$el.find('.balloon.tag.ui-draggable, .balloon.contribution.ui-draggable')
        #@$el.find('.balloon.contribution.ui-draggable')
            .draggable('disable')


        tick = ->
            contributionBalloon
                .style 'left', (d) ->
                    balloonWidth = jQuery(d).outerWidth()
                    if d.x + balloonWidth/2 > wallWidth
                        d.x = wallWidth - balloonWidth/2
                    else if d.x - balloonWidth/2 < 0
                        d.x = 0 + balloonWidth/2
                    return (d.x - balloonWidth/2) + 'px'
                .style 'top', (d) ->
                    balloonHeight = jQuery(d).outerHeight()
                    if d.y + balloonHeight/2 > wallHeight
                        d.y = wallHeight - balloonHeight/2
                    else if d.y - balloonHeight/2 < 0
                        d.y = 0 + balloonHeight/2
                    return (d.y - balloonHeight/2) + 'px'

            # collision detection
            q = d3.geom.quadtree(nodes)
            i = 0
            n = nodes.length

            #if Sail.app.detectCollisions
            for i in [0...n]
                q.visit(detectCollision(nodes[i]))
            

            # locator
            #     .style("left", (d) -> d.x + 'px')
            #     .style("top", (d) -> d.y + 'px') 

            connector
                .style("z-index", -1)
                .style("left", (d) -> 
                    d.source.x + "px")
                .style("top", (d) -> 
                    d.source.y + "px")
                .style("width", (d) ->
                    dx = d.target.x - d.source.x
                    dy = d.target.y - d.source.y
                    Math.sqrt(dx * dx + dy * dy) + "px")
                .style("-webkit-transform", connectorTransform)
                .style("-moz-transform", connectorTransform)
                .style("transform", connectorTransform)

            # source
            #     .style("left", (d) -> d.source.x + 'px')
            #     .style("top", (d) -> d.source.y + 'px')

            # target
            #     .style("left", (d) -> d.target.x + 'px')
            #     .style("top", (d) -> d.target.y + 'px')                

        detectCollision = (b) ->
            # based on collision detection example 
            #   from https://gist.github.com/3116713

            $b = jQuery(b)
            bWidth = b.width
            bHeight = b.height

            nx1 = b.x - bWidth/2
            nx2 = b.x + bWidth/2
            ny1 = b.y - bHeight/2
            ny2 = b.y + bHeight/2


            bIsTag = $b.hasClass('tag')

            return (quad, x1, y1, x2, y2) ->
                if quad.point && quad.point isnt b # don't try to collide with self
                    
                    qWidth = quad.point.width
                    qHeight = quad.point.height

                    w = bWidth/2 + qWidth/2
                    h = bHeight/2 + qHeight/2

                    xDist = Math.abs(b.x - quad.point.x)
                    yDist = Math.abs(b.y - quad.point.y)

                    if xDist < w && yDist < h
                        $q = jQuery(quad.point)
                        qIsTag = $q.hasClass('tag')

                        # bRepulsion = 2
                        # qRepulsion = 2
                        # if bIsTag
                        #     bRepulsion = 3
                        #     if b.contribs && not (quad.point.id in b.contribs)
                        #         bRepulsion = 7
                        # if qIsTag
                        #     qRepulsion = 3
                        #     if quad.point.contribs && not (b.id in quad.point.contribs)
                        #         qRepulsion = 7

                        # if qIsTag && bIsTag
                        #     qRepulsion = 6
                        #     bRepulsion = 6

                        # bRepulsion *= 2
                        # qRepulsion *= 2


                        # if bIsTag
                        #     force.alpha(0.01)

                        yOverlap = h - yDist
                        xOverlap = w - xDist

                        if xDist/w < yDist/h

                            # yNudge = (yOverlap/yDist) * yOverlap/h * force.alpha()
                            # b.y = b.y + yNudge*qRepulsion
                            # quad.point.y = quad.point.y - yNudge*bRepulsion
                            
                            yNudge = (yOverlap/2)
                            if b.y < quad.point.y
                                b.y -= yNudge
                                quad.point.y += yNudge
                            else
                                b.y += yNudge
                                quad.point.y -= yNudge
                        else
                            # xNudge = (xOverlap/xDist) * xOverlap/w * force.alpha()
                            # b.x = b.x + xNudge*qRepulsion
                            # quad.point.x = quad.point.x - xNudge*bRepulsion
                            
                            xNudge = (xOverlap/2)
                            if b.x < quad.point.x
                                b.x -= xNudge * (qIsTag ? 1.1 : force.alpha())
                                quad.point.x += xNudge * (bIsTag ? 1.1 : force.alpha())
                            else
                                b.x += xNudge * (qIsTag ? 1.1 : force.alpha())
                                quad.point.x -= xNudge * (bIsTag ? 1.1 : force.alpha())

                return x1 > nx2 || 
                    x2 < nx1 || 
                    y1 > ny2 || 
                    y2 < ny1

        linkDistance = (link, i) ->
            ( jQuery(link.source).outerHeight()/2 +
                jQuery(link.target).outerHeight()/2 ) + 40

        wallWidth = @$el.innerWidth()
        wallHeight = @$el.innerHeight()

        fill = d3.scale.category20()

        force = d3.layout.force()
            .charge((d) -> if jQuery(d).hasClass('tag') then -4500 else -2000)
            .linkDistance(linkDistance)
            .linkStrength(0.2)
            .gravity(0)
            #.theta(0.1)
            .friction(0.2)
            .size([wallWidth, wallHeight])

        # force2 = d3.layout.force()
        #     .charge(-300)
        #     .gravity(0)
        #     .friction(0.9)
        #     .size([wallWidth, wallHeight])


        vis = d3.select("#"+@id)

        i = 0
        tags = {}
        Sail.app.tags.each (tag) ->
            t = jQuery('#'+tag.id)[0]
            t.index = i
            tags[tag.id] = t
            i++

        #jQuery('.balloon').not('#509424717e59cb16c1000003, #509426227e59cb16c1000006').remove()
        nodes = @$el.find('.balloon').toArray()
        links = []
        jQuery('.balloon.contribution').each ->
            contribBalloon = jQuery(@)
            return unless contribBalloon.data('tags')
            c = contribBalloon[0]
            c.index = i
            i++
            for t in contribBalloon.data('tags').split(' ')
                if tags[t] # FIXME: why would t not be in tags?
                    tags[t].contribs? || tags[t].contribs = []
                    tags[t].contribs.push(c.id)
                    links.push
                        source: tags[t]
                        target: c

        #@$el.find('.balloon').each -> # nothing yet

        contributionBalloon = vis.selectAll('.balloon')
            .data(nodes)
            .call(force.drag)


        # tagBalloons = @$el.find('.tag').toArray()
        # jQuery(nodes).on('mousedown', force2.resume)
        # force2.nodes(tagBalloons)
        #     .links([])
        #     .start()

        force.nodes(nodes)
            .links(links)
            .on('tick', tick)
            .start()

        # Sail.app.force2 = force2

        for n in nodes
            $n = jQuery(n)
            n.width = $n.outerWidth()
            n.height = $n.outerHeight()


        connector = vis.selectAll(".connector")
            .data(links)
            .enter()
            .append("div")
                .attr("class", "connector")
        
        # source = vis.selectAll('.source')
        #     .data(links)
        #     .enter()
        #     .append("div")
        #         .attr("class", "source")

        # target = vis.selectAll('.target')
        #     .data(links)
        #     .enter()
        #     .append("div")
        #         .attr("class", "target")

        # locator = vis.selectAll('.locator')
        #     .data(nodes)
        #     .enter()
        #     .append("div")
        #         .attr("class", "locator")

        #force.on('drag.force', -> force2.resume(); console.log('drag!'))

        connectorTransform = (d) ->
            "rotate(" + ((Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) ) + "deg)"

        Sail.app.force = force

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


class CK.Smartboard.View.TagBalloon extends CK.Smartboard.View.Balloon
    tagName: 'div'
    className: 'tag balloon'
    id: => @domID()

    events:
        'mousedown': (ev) -> @moveToTop()

    render: => 
        name = @findOrCreate '.name', 
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        @corporealize()

        @$el.show()

        return @ # return this for chaining

