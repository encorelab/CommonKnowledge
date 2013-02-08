class CK.Smartboard.View.Cloud

    constructor: (wallView) ->
        console.log("Cloudifying the wall...")

        @wall = wallView
        @wallWidth = @wall.$el.innerWidth()
        @wallHeight = @wall.$el.innerHeight()

        @nodes = @wall.$el.find('.balloon').toArray()
        @links = []

        for n,i in @nodes
            $n = jQuery(n)
            n.index = i

        @force = @generateForceFunction()

        @tags = {}

        # FIXME: this is a reference to the CK.Model.Tags Drowsy.Collection in the wall... why do we need this?
        Sail.app.tags.each (tag) =>
            t = jQuery('#'+tag.id)[0]
            @tags[tag.id] = t
            
        #jQuery('.balloon').not('#509424717e59cb16c1000003, #509426227e59cb16c1000006').remove()
        
        cloud = this
        jQuery('.balloon.contribution').each ->
            contribBalloon = jQuery(this)
            return unless contribBalloon.data('tags')
            c = contribBalloon[0]
            for tid in contribBalloon.data('tags').split(' ')
                if cloud.tags[tid] # FIXME: why would t not be in @tags?
                    tag = cloud.tags[tid]
                    tag.contribs? || tag.contribs = []
                    tag.contribs.push(c.id)
                    cloud.links.push
                        source: tag
                        target: c

        @vis = d3.select("#"+@wall.id)

        #Sail.app.force = @force

        @update()

    # generate a force calculation for the force-directed graph
    # see https://github.com/mbostock/d3/wiki/Force-Layout#wiki-force
    generateForceFunction: =>
        d3.layout.force()
            #.charge((d) -> if jQuery(d).hasClass('tag') then -4500 else -1000)
            .charge(0)
            .linkDistance(@linkDistance)
            .linkStrength(0.2)
            .gravity(0)
            #.theta(0.1)
            .friction(0.2)
            .size([@wallWidth, @wallHeight])
            .nodes(@nodes)
            .links(@links)
            .on('tick', @tick)

    # calculate the length in pixels of a link connector
    linkDistance: (link, i) =>
        ( jQuery(link.source).outerWidth()/2 +
            jQuery(link.target).outerWidth()/2 ) + 10

    # generates a CSS transformation for the connector (link) -- this is what rotates the line so that it connects two balloons
    connectorTransform: (d) =>
        "rotate(" + ((Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) ) + "deg)"

    # a tick of the d3 animation
    tick: =>
        # note that @balloon is a d3 selector referring to ALL balloons, not a single balloon
        @balloon
            .style 'left', (d) =>
                balloonWidth = jQuery(d).outerWidth()
                if d.x + balloonWidth/2 > @wallWidth
                    d.x = @wallWidth - balloonWidth/2
                else if d.x - balloonWidth/2 < 0
                    d.x = 0 + balloonWidth/2
                return (d.x - balloonWidth/2) + 'px'
            .style 'top', (d) =>
                balloonHeight = jQuery(d).outerHeight()
                if d.y + balloonHeight/2 > @wallHeight
                    d.y = @wallHeight - balloonHeight/2
                else if d.y - balloonHeight/2 < 0
                    d.y = 0 + balloonHeight/2
                return (d.y - balloonHeight/2) + 'px'
            .each (d) =>
                if jQuery(d).hasClass('pinned')
                    d.fixed = true

        # quad tree used for collision detection
        q = d3.geom.quadtree(@nodes)
        for i in [0...@nodes.length]
            q.visit(@detectCollision(@nodes[i]))

        # note that @connector is a d3 selector referring to ALL connectors, not a single connector
        @connector
            .style("z-index", -1)
            .style("left", (d) => 
                d.source.x + "px")
            .style("top", (d) => 
                d.source.y + "px")
            .style("width", (d) =>
                dx = d.target.x - d.source.x
                dy = d.target.y - d.source.y
                Math.sqrt(dx * dx + dy * dy) + "px")
            .style("-webkit-transform", @connectorTransform)
            .style("-moz-transform", @connectorTransform)
            .style("transform", @connectorTransform)

        # source
        #     .style("left", (d) -> d.source.x + 'px')
        #     .style("top", (d) -> d.source.y + 'px')

        # target
        #     .style("left", (d) -> d.target.x + 'px')
        #     .style("top", (d) -> d.target.y + 'px')


    # adds a contribution to the cloud
    addContribution: (c) =>
        if c.jquery
            id = c.attr('id')
            $c = c
        else if c.id
            id = c.id
            $c = @wall.$el.find('#'+id)
        else
            console.error("Contribution given to @addContribution must have an id!")
            throw "Invalid Contribution"

        c = $c[0]

        c.index = @nodes.length
        @nodes.push(c)
        @update()

    # adds a tag to the cloud
    addTag: (t) =>
        if t.jquery
            id = t.attr('id')
            $t = t
        else if t.id
            id = t.id
            $t = @wall.$el.find('#'+id)
        else
            console.error("Tag given to @addTag must have an id!")
            throw "Invalid Tag"

        t = $t[0]

        t.index = @nodes.length
        @tags[t.id] = t
        @nodes.push(t)
        @update()

    # adds links (connectors) to the cloud
    addLinks: (c, ts) =>
        if c.jquery
            id = c.attr('id')
            $c = c
        else if c.id
            id = c.id
            $c = @wall.$el.find('#'+id)
        else
            console.error("Contribution given to @addContribution must have an id!")
            throw "Invalid Contributiona"

        c = $c[0]

        for t in ts
            if t.jquery
                id = t.attr('id')
                $t = t
            else if t.id
                id = t.id
                $t = @wall.$el.find('#'+id)
            else
                console.error("Tag given to @addTag must have an id!")
                throw "Invalid Tag"

            t = $t[0]
            

            t.contribs? || t.contribs = []
            t.contribs.push(c.id)
            @links.push
                source: t
                target: c

        @update()


    # collision detection - takes a single balloon, checks if its colliding with anything else,
    # and takes appopriate action (moves things out of the way, if necessary)
    detectCollision: (b) =>
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

        return (quad, x1, y1, x2, y2) =>
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

    update: (ev) =>

        # force2 = d3.layout.force()
        #     .charge(-300)
        #     .gravity(0)
        #     .friction(0.9)
        #     .size([@wallWidth, @wallHeight])


        #@wall.$el.find('.balloon').each -> # nothing yet

        for n,i in @nodes
            $n = jQuery(n)
            pos = $n.position()
            n.x = pos.left + $n.outerWidth()/2 unless n.x?
            n.y = pos.top + $n.outerHeight()/2 unless n.y?

        @balloon = @vis.selectAll('.balloon')
            .data(@nodes)
            .call(@force.drag)

        # tagBalloons = @wall.$el.find('.tag').toArray()
        # jQuery(@nodes).on('mousedown', force2.resume)
        # force2.nodes(tagBalloons)
        #     .links([])
        #     .start()

        @connector = @vis.selectAll(".connector")
            .data(@links)

        @connector
            .enter()
            .append("div")
                .attr("class", "connector")
        

        @force
            .start()

        # Sail.app.force2 = force2


        
        
        # source = @vis.selectAll('.source')
        #     .data(links)
        #     .enter()
        #     .append("div")
        #         .attr("class", "source")

        # target = @vis.selectAll('.target')
        #     .data(links)
        #     .enter()
        #     .append("div")
        #         .attr("class", "target")

        # locator = @vis.selectAll('.locator')
        #     .data(@nodes)
        #     .enter()
        #     .append("div")
        #         .attr("class", "locator")

        #force.on('drag.force', -> force2.resume(); console.log('drag!'))
