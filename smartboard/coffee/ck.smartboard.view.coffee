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

        'click #add-tag-opener': (ev) ->
            addTagContainer = @$el.find('#add-tag-container')
            addTagContainer.toggleClass('opened')
            if addTagContainer.hasClass('opened')
                setTimeout(=> 
                    @$el.find('#new-tag').focus()
                , 1000)

        'click #submit-new-tag': (ev) -> @submitNewTag()

        'click #show-word-cloud': (ev) -> @showWordCloud()

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

    submitNewTag: =>
        newTag = @$el.find('#new-tag').val()
        Sail.app.createNewTag(newTag)
        @$el.find('#add-tag-container')
            .removeClass('opened')
            .blur()
        @$el.find('#new-tag').val('')


    showWordCloud: =>
        jQuery('#word-cloud svg').remove()
        @generateWordCloud2([
                "Hello", "world", "normally", "normally","normally","normally","normally","you", "want", "more", "words",
                "than", "this"])
        wordCloud = jQuery('#word-cloud')
        wordCloud.addClass('visible')
        fade = jQuery('#fade')
        fade.addClass('visible')

    hideWordCloud: =>
        wordCloud = jQuery('#word-cloud')
        wordCloud.removeClass('visible')
        fade = jQuery('#fade')
        fade.removeClass('visible')
        jQuery('#word-cloud svg').remove()

    `
    Wall.prototype.generateWordCloud = function (wordArray) {
          var fill = d3.scale.category20();

          d3.layout.cloud().size([300, 300])
              .words(wordArray.map(function(d) {
                return {text: d, size: 10 + Math.random() * 90};
              }))
              .rotate(function() { return ~~(Math.random() * 2) * 90; })
              .font("Impact")
              .fontSize(function(d) { return d.size; })
              .on("end", draw)
              .start();

          function draw(words) {
            d3.select("#word-cloud").append("svg")
                .attr("width", 300)
                .attr("height", 300)
              .append("g")
                .attr("transform", "translate(150,150)")
              .selectAll("text")
                .data(words)
              .enter().append("text")
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Impact")
                .style("fill", function(d, i) { return fill(i); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                  return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; });
          }
    }
    `

    `
    Wall.prototype.generateWordCloud2 = function (wordArray) {
        var fontSize = d3.scale.log().range([10, 100]);

        var layout = d3.layout.cloud()
              .size([960, 600])
              .timeInterval(10)
              .text(function(d) { return d.key; })
              .font("Impact")
              .fontSize(function(d) { return fontSize(+d.value); })
              .rotate(function(d) { return ~~(Math.random() * 5) * 30 - 60; })
              .padding(1)
              .on("word", progress)
              .on("end", draw)
              .words(wordArray)
              .start();

        function draw(words) {
            d3.select("#word-cloud").append("svg")
                .attr("width", 300)
                .attr("height", 300)
              .append("g")
                .attr("transform", "translate(150,150)")
              .selectAll("text")
                .data(words)
              .enter().append("text")
                .style("font-size", function(d) { return d.size + "px"; })
                .style("font-family", "Impact")
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                  return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; });
          }
    }
    `

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


    cloudify: =>
        console.log("Cloudifying the wall...")

        cloud = {}
        @cloud = cloud

        cloud.wallWidth = @$el.innerWidth()
        cloud.wallHeight = @$el.innerHeight()

        cloud.linkDistance = (link, i) ->
            ( jQuery(link.source).outerWidth()/2 +
                jQuery(link.target).outerWidth()/2 ) + 10

        cloud.tick = ->
            cloud.balloon
                .style 'left', (d) ->
                    balloonWidth = jQuery(d).outerWidth()
                    if d.x + balloonWidth/2 > cloud.wallWidth
                        d.x = cloud.wallWidth - balloonWidth/2
                    else if d.x - balloonWidth/2 < 0
                        d.x = 0 + balloonWidth/2
                    return (d.x - balloonWidth/2) + 'px'
                .style 'top', (d) ->
                    balloonHeight = jQuery(d).outerHeight()
                    if d.y + balloonHeight/2 > cloud.wallHeight
                        d.y = cloud.wallHeight - balloonHeight/2
                    else if d.y - balloonHeight/2 < 0
                        d.y = 0 + balloonHeight/2
                    return (d.y - balloonHeight/2) + 'px'
                .each (d) ->
                    if jQuery(d).hasClass('pinned')
                        d.fixed = true

            # collision detection
            q = d3.geom.quadtree(cloud.nodes)

            #if Sail.app.cloud.detectCollisions
            for i in [0...cloud.nodes.length]
                q.visit(cloud.detectCollision(cloud.nodes[i]))
            

            # locator
            #     .style("left", (d) -> d.x + 'px')
            #     .style("top", (d) -> d.y + 'px') 

            cloud.connector
                .style("z-index", -1)
                .style("left", (d) -> 
                    d.source.x + "px")
                .style("top", (d) -> 
                    d.source.y + "px")
                .style("width", (d) ->
                    dx = d.target.x - d.source.x
                    dy = d.target.y - d.source.y
                    Math.sqrt(dx * dx + dy * dy) + "px")
                .style("-webkit-transform", cloud.connectorTransform)
                .style("-moz-transform", cloud.connectorTransform)
                .style("transform", cloud.connectorTransform)

            # source
            #     .style("left", (d) -> d.source.x + 'px')
            #     .style("top", (d) -> d.source.y + 'px')

            # target
            #     .style("left", (d) -> d.target.x + 'px')
            #     .style("top", (d) -> d.target.y + 'px')

        cloud.nodes = @$el.find('.balloon').toArray()
        cloud.links = []

        for n,i in cloud.nodes
            $n = jQuery(n)
            n.index = i

        cloud.force = d3.layout.force()
            #.charge((d) -> if jQuery(d).hasClass('tag') then -4500 else -1000)
            .charge(0)
            .linkDistance(cloud.linkDistance)
            .linkStrength(0.2)
            .gravity(0)
            #.theta(0.1)
            .friction(0.2)
            .size([cloud.wallWidth, cloud.wallHeight])
            .nodes(cloud.nodes)
            .links(cloud.links)
            .on('tick', cloud.tick)

        cloud.tags = {}
        Sail.app.tags.each (tag) ->
            t = jQuery('#'+tag.id)[0]
            cloud.tags[tag.id] = t
            
        #jQuery('.balloon').not('#509424717e59cb16c1000003, #509426227e59cb16c1000006').remove()
        
        jQuery('.balloon.contribution').each ->
            contribBalloon = jQuery(@)
            return unless contribBalloon.data('tags')
            c = contribBalloon[0]
            for tid in contribBalloon.data('tags').split(' ')
                if cloud.tags[tid] # FIXME: why would t not be in cloud.tags?
                    tag = cloud.tags[tid]
                    tag.contribs? || tag.contribs = []
                    tag.contribs.push(c.id)
                    cloud.links.push
                        source: tag
                        target: c

        cloud.vis = d3.select("#"+@id)

        cloud.addContribution = (c) =>
            if c.jquery
                id = c.attr('id')
                $c = c
            else if c.id
                id = c.id
                $c = @$el.find('#'+id)
            else
                console.error("Contribution given to cloud.addContribution must have an id!")
                throw "Invalid Contributiona"

            c = $c[0]

            c.index = cloud.nodes.length
            cloud.nodes.push(c)
            cloud.update()

        cloud.addTag = (t) =>
            if t.jquery
                id = t.attr('id')
                $t = t
            else if t.id
                id = t.id
                $t = @$el.find('#'+id)
            else
                console.error("Tag given to cloud.addTag must have an id!")
                throw "Invalid Tag"

            t = $t[0]

            t.index = cloud.nodes.length
            cloud.tags[t.id] = t
            cloud.nodes.push(t)
            cloud.update()

        cloud.addLinks = (c, ts) =>
            if c.jquery
                    id = c.attr('id')
                    $c = c
                else if c.id
                    id = c.id
                    $c = @$el.find('#'+id)
                else
                    console.error("Contribution given to cloud.addContribution must have an id!")
                    throw "Invalid Contributiona"

                c = $c[0]

            for t in ts
                if t.jquery
                    id = t.attr('id')
                    $t = t
                else if t.id
                    id = t.id
                    $t = @$el.find('#'+id)
                else
                    console.error("Tag given to cloud.addTag must have an id!")
                    throw "Invalid Tag"

                t = $t[0]
                

                t.contribs? || t.contribs = []
                t.contribs.push(c.id)
                cloud.links.push
                    source: t
                    target: c

            cloud.update()


        cloud.detectCollision = (b) ->
            # based on collision detection example 
            #   from https://gist.github.com/3116713

            $b = jQuery(b)
            bWidth = $b.outerWidth()
            bHeight = $b.outerHeight()

            nx1 = b.x - bWidth/2
            nx2 = b.x + bWidth/2
            ny1 = b.y - bHeight/2
            ny2 = b.y + bHeight/2


            bIsTag = $b.hasClass('tag')

            return (quad, x1, y1, x2, y2) ->
                if quad.point && quad.point isnt b # don't try to collide with self
                    
                    qWidth = jQuery(quad.point).outerWidth()
                    qHeight = jQuery(quad.point).outerHeight()

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
                                b.x -= xNudge
                                quad.point.x += xNudge 
                            else
                                b.x += xNudge 
                                quad.point.x -= xNudge 

                return x1 > nx2 || 
                    x2 < nx1 || 
                    y1 > ny2 || 
                    y2 < ny1

        cloud.connectorTransform = (d) ->
            "rotate(" + ((Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) ) + "deg)"

        #Sail.app.force = cloud.force

        cloud.update = (ev) ->

            # force2 = d3.layout.force()
            #     .charge(-300)
            #     .gravity(0)
            #     .friction(0.9)
            #     .size([cloud.wallWidth, cloud.wallHeight])


            #@$el.find('.balloon').each -> # nothing yet

            for n,i in cloud.nodes
                $n = jQuery(n)
                pos = $n.position()
                n.x = pos.left + $n.outerWidth()/2 unless n.x?
                n.y = pos.top + $n.outerHeight()/2 unless n.y?

            cloud.balloon = cloud.vis.selectAll('.balloon')
                .data(cloud.nodes)
                .call(cloud.force.drag)

            # tagBalloons = @$el.find('.tag').toArray()
            # jQuery(cloud.nodes).on('mousedown', force2.resume)
            # force2.nodes(tagBalloons)
            #     .links([])
            #     .start()

            cloud.connector = cloud.vis.selectAll(".connector")
                .data(cloud.links)

            cloud.connector
                .enter()
                .append("div")
                    .attr("class", "connector")
            

            cloud.force
                .start()

            # Sail.app.force2 = force2


            
            
            # source = cloud.vis.selectAll('.source')
            #     .data(links)
            #     .enter()
            #     .append("div")
            #         .attr("class", "source")

            # target = cloud.vis.selectAll('.target')
            #     .data(links)
            #     .enter()
            #     .append("div")
            #         .attr("class", "target")

            # locator = cloud.vis.selectAll('.locator')
            #     .data(cloud.nodes)
            #     .enter()
            #     .append("div")
            #         .attr("class", "locator")

            #force.on('drag.force', -> force2.resume(); console.log('drag!'))

        cloud.update()

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


        @renderTags()

        @renderBuildons()
        
        @corporealize()

        return @ # return this for chaining

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
        name = @findOrCreate '.name', 
            "<h3 class='name'></h3>"
        name.text @model.get('name')

        if @model.get('pinned')
            @$el.addClass('pinned')
        else
            @$el.removeClass('pinned')

        @corporealize()

        @$el.show()

        return @ # return this for chaining

