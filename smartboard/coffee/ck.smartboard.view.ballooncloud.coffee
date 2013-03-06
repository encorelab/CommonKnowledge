class CK.Smartboard.View.BalloonCloud

    constructor: (wallView) ->
        console.log("Cloudifying the wall...")

        @wall = wallView

        @nodes = []
        @links = []
        @tagList = {}
        @uniqueTagCount = 0
        @d3QuadTree  = null

        # for n,i in @nodes
        #     $n = jQuery(n)
        #     n.index = i
            
        #jQuery('.balloon').not('#509424717e59cb16c1000003, #509426227e59cb16c1000006').remove()
        
        # cloud = this
        # jQuery('.balloon.contribution').each ->
        #     contribBalloon = jQuery(this)
        #     return unless contribBalloon.data('tags')
        #     c = contribBalloon[0]
        #     for tid in contribBalloon.data('tags').split(' ')
        #         if cloud.tags[tid] # FIXME: why would t not be in @tags?
        #             tag = cloud.tags[tid]
        #             tag.contribs? || tag.contribs = []
        #             tag.contribs.push(c.id)
        #             cloud.links.push
        #                 source: tag
        #                 target: c

        @vis = d3.select("#"+@wall.id)

        #Sail.app.force = @force

        #@update()

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
            #.alpha(0.03)
            .on('tick', @tick)



    # calculate the length in pixels of a link connector
    linkDistance: (link, i) =>
        return 0 unless link.source.view? and link.target.view?

        (  link.source.view.$el.outerWidth()/2 +
            link.target.view.$el.outerWidth()/2 ) + 10

    # generates a CSS transformation for the connector (link) -- this is what rotates the line so that it connects two balloons
    connectorTransform: (d) =>
        "rotate(" + ((Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI) ) + "deg)"

    # a tick of the d3 animation
    tick: =>

        @balloons
            .style 'left', (d) =>
                balloonWidth = d.view.$el.outerWidth()
                if d.x + balloonWidth/2 > @wallWidth
                    d.x = @wallWidth - balloonWidth/2
                else if d.x - balloonWidth/2 < 0
                    d.x = 0 + balloonWidth/2
                
                (d.x - balloonWidth/2) + 'px'
            .style 'top', (d) =>
                balloonHeight = d.view.$el.outerHeight()
                if d.y + balloonHeight/2 > @wallHeight
                    d.y = @wallHeight - balloonHeight/2
                else if d.y - balloonHeight/2 < 0
                    d.y = 0 + balloonHeight/2
                
                (d.y - balloonHeight/2) + 'px'
            .each (d) =>
                if d.view.$el.hasClass('pinned')
                    d.fixed = true

        for i in [0...@nodes.length]
            @d3QuadTree.visit(@detectCollision(@nodes[i]))

        @connectors
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
    ###
    corporealizeContribution: (contrib) =>
        unless contrib.id
            console.error("Contribution given to @corporealizeContribution must have an id!")
            throw "Invalid Contribution"

        $c = @wall.find('#'+c.id)
        if $c.length is 0
            bubble = new CK.Smartboard.View.ContributionBalloon {model: contrib}
            contrib.on 'change', bubble.render
            $c.view = bubble
        else
            bubble = $c.view
        
        bubble.render()

        contrib.index = @nodes.length
        @nodes.push($c)
        @update()
    ###

    # adds a tag to the cloud
    ###
    corporealizeTag: (tag) =>
        unless tag.id
            console.error("Tag given to @corporealizeTag must have an id!")
            throw "Invalid Tag"



        t = $t[0]

        t.index = @nodes.length
        @tags[t.id] = t
        @nodes.push(t)
        @update()
    ###

    ###
    # adds links (connectors) to the cloud if they don't already exist
    corporealizeLinks: (c, ts) =>
        if c.jquery
            id = c.attr('id')
            $c = c
        else if c.id
            id = c.id
            $c = @wall.$el.find('#'+id)
        else
            console.error("Contribution given to @addLinks must have an id!")
            throw "Invalid Contribution"

        c = $c[0]

        unless c
            console.warn "Contibution Balloon for contribution #{id} has not been rendered yet. This shouldn't have happened!"
            return

        for t in ts
            if t.jquery
                id = t.attr('id')
                $t = t
            else if t.id
                id = t.id
                $t = @wall.$el.find('#'+id)
            else
                console.error("Tag given to @corporealizeTag must have an id!")
                throw "Invalid Tag"

            t = $t[0]
            
            unless t
                console.warn "Tag Balloon for tag #{id} has not been rendered yet. This shouldn't have happened!"
                continue

            t.contribs? || t.contribs = []
            t.contribs.push(c.id)
            @links.push
                source: t
                target: c

        @update()
    ###


    # collision detection - takes a single balloon, checks if its colliding with anything else,
    # and takes appopriate action (moves things out of the way, if necessary)
    detectCollision: (b) =>
        # based on collision detection example 
        #   from https://gist.github.com/3116713

        return unless b.x? and b.y?

        $b = b.view.$el
        bWidth = $b.outerWidth()
        bHeight = $b.outerHeight()

        nx1 = b.x - bWidth/2
        nx2 = b.x + bWidth/2
        ny1 = b.y - bHeight/2
        ny2 = b.y + bHeight/2

        bIsTag = $b.hasClass('tag')

        return (quad, x1, y1, x2, y2) =>
            return unless quad.point? and quad.point.x? and quad.point.y?

            if quad.point && quad.point isnt b # don't try to collide with self

                qWidth = quad.point.view.$el.outerWidth()
                qHeight = quad.point.view.$el.outerHeight()

                w = bWidth/2 + qWidth/2
                h = bHeight/2 + qHeight/2

                xDist = Math.abs(b.x - quad.point.x)
                yDist = Math.abs(b.y - quad.point.y)

                if xDist < w && yDist < h
                    $q = quad.point.view.$el
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

    startForce: =>
        unless @force?
            console.log("Instantiating force...")
            @force = @generateForceFunction()
            # make the <div.balloons> draggable via the force-directed layout
            
        # quad tree used for collision detection
        @d3QuadTree = d3.geom.quadtree(@nodes)

        console.log("Starting force...")
        @force.start()#.alpha(0.02)

        @balloons.call(@force.drag)

    # adds a node (balloon) to the cloud if it doesn't already exists
    ensureNode: (n) =>
        isNodePublished = n.get('published')
        screenState = @wall.mode
    
        if n instanceof CK.Model.Contribution and (isNodePublished isnt true or screenState is 'propose' or screenState is 'interpret')
            return

        if n instanceof CK.Model.Proposal and (isNodePublished is false or (screenState isnt 'propose' and screenState isnt 'interpret'))
            return

        # make sure node n doesn't already exist
        unless _.any(@nodes, 
                (node) -> node.id is n.id)
            @nodes.push n

            if n instanceof CK.Model.Tag
                tagAttributes = n.attributes
                tagClass = ''

                #if tagAttributes.name.toLowerCase() isnt 'n/a'
                #    tagClass = 'group' + (++@uniqueTagCount) + '-color'
                
                if n.has('colourClass')
                    @tagList[n.id] = {'className' :  n.get('colourClass')}

                    

        if n instanceof CK.Model.Contribution and n.has('tags')
            for t in n.get('tags')
                tag = _.find @nodes, (n) -> n.id is t.id

                # TODO: create the tag if it doesn't exist?
                if tag?
                    @ensureLink(n, tag)

        if n instanceof CK.Model.Proposal and n.has('tag_group_id')
            tagID = n.get('tag_group_id')
            tag = _.find @nodes, (n) -> n.id is tagID

            # TODO: create the tag if it doesn't exist?
            if tag?
                @ensureLink(n, tag)

        else if n instanceof CK.Model.Tag
            for b in @nodes
                if b.has('tags') and b.get('tags').some( (t) -> t.id is n.id )
                    @ensureLink(b, n)


    # adds a link (connector) to the cloud if it doesn't already exists
    ensureLink: (fromContribution, toTag) =>
        link =
            source: fromContribution
            target: toTag

        # make sure link doesn't already exist
        unless _.any(@links, 
                (l) -> l.source.id is fromContribution.id and l.target.id is toTag.id)
            @links.push link

    inflateBalloons: (balloons) =>
        screenState = @wall.mode
        tagListing = @tagList

        balloons.each (d,i) ->
            view = d.view

            unless d.view
                $el = $('#'+d.id)
                $el.unbind()
                
                if d.collectionName is "tags"
                    view = new CK.Smartboard.View.TagBalloon
                        model: d
                        el: $el[0]
                    
                    if tagListing[d.id]? and tagListing[d.id].className
                        view.setColorClass(tagListing[d.id].className)
                            

                else if d.collectionName is "contributions"
                    
                    view = new CK.Smartboard.View.ContributionBalloon
                        model: d
                        el: $el[0]
                       
                    console.log 'Contribution View Instantiated - state is ' + screenState
                    
                    if screenState is 'analysis'
                        view.ballonContributionType = view.balloonContributionTypes.analysis
                    else 
                        view.balloonContributionType = view.balloonContributionTypes.default

                else if d.collectionName is "proposals"

                    tagID = d.get('tag_group_id')

                    view = new CK.Smartboard.View.ContributionProposalBalloon
                        model: d
                        el: $el[0]

                    console.log 'Proposal View Instantiated - state is ' + screenState + ' tag ID is ' + tagID


                    # if the proposal has a tag color associated to it then set the color
                    if tagListing[tagID]? and tagListing[tagID].className
                        console.log 'Proposal tag color is ' + tagListing[tagID].className
                        view.setColorClass tagListing[tagID].className

                    view.setTagColorList tagListing

                    if screenState is 'interpret'
                        view.ballonContributionType = view.balloonContributionTypes.interpret
                    else
                        view.ballonContributionType = view.balloonContributionTypes.propose

                else
                    console.error("Unrecognized Balloon type:", d.collectionName)

                d.view = view

            if view?
                view.render()

                if d.collectionName is "contributions" or d.collectionName is "proposals" 
                    view.resetView() 

                if d.newlyAdded
                    jQuery('#'+d.id).addClass('new')
                    setTimeout ->
                        jQuery('#'+d.id).removeClass('new')
                    , 2000

                pos = view.$el.position()
                d.x = view.leftToX(pos.left) unless d.x?
                d.y = view.topToY(pos.top) unless d.y?

    reRenderForState: (state) =>
        console.log 'Rerender nodes for state: ' + state

        for b in @nodes
            view = b.view
            if b.collectionName is "contributions"
                if (state is 'analysis')
                    view.ballonContributionType = view.balloonContributionTypes.analysis
                else if (state is 'propose')
                    #remove previous backbone views and all the events that are tied to it
                    view.remove()
                    view = null
                else 
                    view.ballonContributionType = view.balloonContributionTypes.default

            else if b.collectionName is 'proposals'
                if (state is 'interpret')
                    view.ballonContributionType = view.balloonContributionTypes.interpret
                else
                    view.ballonContributionType = view.balloonContributionTypes.propose

            if view?
                view.render()

                if b.collectionName is "contributions" or b.collectionName is "proposals" 
                    view.resetView() 

                

                
                    



        # on state change to proposal remove all contributions from the board
        # and remove the links associating contributions to tags
        if state is 'propose'
            # remove the node from d3's internal store
            @nodes.filter (n) -> not (n instanceof CK.Model.Contribution)

            # blow away all the links from d3
            @links = []

            # remove the connector elements
            jQuery('div.connector').unbind().remove()

            #re-render the cloud
            @render()



    render: (ev) =>

        @wallWidth = @wall.$el.innerWidth()
        @wallHeight = @wall.$el.innerHeight()

        # force2 = d3.layout.force()
        #     .charge(-300)
        #     .gravity(0)
        #     .friction(0.9)
        #     .size([@wallWidth, @wallHeight])


        #@wall.$el.find('.balloon').each -> # nothing yet

        # TODO: do this using .call() instead?
        ###
        for n,i in @nodes
            $n = jQuery(n)
            pos = $n.position()
            n.x = pos.left + $n.outerWidth()/2 unless n.x?
            n.y = pos.top + $n.outerHeight()/2 unless n.y?
        ###

        # link <div.balloon>s to the Tag and Contribution objects in @nodes
        
        @vis.selectAll('div.balloon')
            # create emtpy <div.balloon> nodes for the @nodes that don't yet exist
            .data(@nodes).enter()
            .append('div')
                .attr('id', (d,i) -> d.id)
                .attr('class', "balloon")
        # fill in the <div.balloon>s html
            .call(@inflateBalloons)
        
        @balloons = @vis.selectAll('div.balloon')

        # .exit()
        # .call(@renderNode)
        # .call(@force.drag)

        # tagBalloons = @wall.$el.find('.tag').toArray()
        # jQuery(@nodes).on('mousedown', force2.resume)
        # force2.nodes(tagBalloons)
        #     .links([])
        #     .start()
        
        @vis.selectAll('div.connector')
            .data(@links).enter()
            .append('div')
                .attr('id', (d,i) -> "#{d.source.id}-#{d.target.id}")
                .attr('class','connector')
        
        @connectors = @vis.selectAll('div.connector')

        @startForce()

        # restart the force direction algorithm if
        # we've previously explicitly started it
        #@force.start()

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
