class CK.Smartboard extends Sail.App
    curnit: 'CommonKnowledge'
    name: 'CK.Smartboard'

    requiredConfig: {
        xmpp: 
            domain: 'string'
            port: 'number'
            url: 'string'
        rollcall:
            url: 'string'
        assets:
            url: 'string'
        mongo:
            url: 'string'
    }

    init: =>
        Sail.verifyConfig @config, @requiredConfig
        console.log "Configuration is valid."

        @run = @run || JSON.parse jQuery.cookie('run')
        if @run
            @groupchatRoom = @run.name + '@conference.' + @xmppDomain

        userFilter = (user) -> user.kind is 'Instructor'

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: @curnit, userFilter: userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget', {indicatorContainer: 'body', clickNameToLogout: true})
            .thenRun =>
                Sail.autobindEvents(@)
                @trigger('initialized')

        @rollcall = new Rollcall.Client(@config.rollcall.url)

        @wall = new CK.Smartboard.View.Wall {el: jQuery('#wall')}

        bubbleContrib = (contrib) =>
            # TODO: move this to @wall.cloud.addContribution
            bubble = new CK.Smartboard.View.ContributionBalloon {model: contrib}
            contrib.on 'change', bubble.render
            bubble.render()
            @wall.cloud.addContribution(bubble.$el) if @wall.cloud?

        bubbleTag = (tag) =>
            # TODO: move this to @wall.cloud.addTag
            bubble = new CK.Smartboard.View.TagBalloon {model: tag}
            tag.on 'change', bubble.render
            bubble.render()
            @wall.cloud.addTag(bubble.$el) if @wall.cloud?
        
        @contributions = new CK.Model.Contributions()
        @contributions.on 'add', (contrib) -> 
            contrib.justAdded = true
            bubbleContrib(contrib)

        @contributions.on 'reset', (collection) -> 
            collection.each bubbleContrib

        @tags = new CK.Model.Tags()
        @tags.on 'add', (tag) ->
            tag.justAdded = true
            view = bubbleTag(tag)

        @tags.on 'reset', (collection) ->
            collection.each bubbleTag

    authenticate: =>
        if @run
            Rollcall.Authenticator.requestLogin()
        else
            Rollcall.Authenticator.requestRun()

    createNewTag: (name) =>
        tag = new CK.Model.Tag({name: name})
        tag.save {},
            success: =>
                sev = new Sail.Event 'new_tag', tag.toJSON()
                @groupchat.sendEvent sev

    pause: =>
        sev = new Sail.Event 'screen_lock'
        @groupchat.sendEvent sev
        # take this opportunity to save positions
        for b in _.union(@contributions.models, @tags.models)
            pos = @wall.$el.find('#'+b.id).position()
            b.set({pos: {left: pos.left, top: pos.top}}, {silent: true})
            b.save({}, {silent: true})

    unpause: =>
        sev = new Sail.Event 'screen_unlock'
        @groupchat.sendEvent sev


    startAnalysis: =>
        sev = new Sail.Event 'start_student_tagging'
        @groupchat.sendEvent sev

    startSynthesis: =>
        sev = new Sail.Event 'start_synthesis'
        @groupchat.sendEvent sev

    switchToAnalysis: =>
        @wall.setMode('analysis')

    switchToSynthesis: =>
        @wall.setMode('synthesis')

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."
            CK.Model.configure(@config.mongo.url, @run.name)

            CK.getState 'phase', (s) =>
                if s
                    if s.get('state') is 'start_student_tagging'
                        @switchToAnalysis()
                    else if s.get('state') is 'start_synthesis'
                        @switchToSynthesis()


        'ui.initialized': (ev) ->
            console.log "UI initialized..."

        connected: (ev) ->
            console.log "Connected..."

            deferC = Q.defer()
            deferT = Q.defer()

            @contributions.fetch(success: -> deferC.resolve())
            @tags.fetch(success: -> deferT.resolve())

            Q.all([deferC, deferT])
                .then ->
                    # give some time for rendering to finish.. 
                    setTimeout((-> Sail.app.wall.cloudify())
                        , 1000)

        sail:
            contribution: (sev) ->
                c = @contributions.get(sev.payload._id)
                if c?
                    c.set(sev.payload)
                else
                    c = new CK.Model.Contribution(sev.payload)
                    @contributions.add(c)

            build_on: (sev) ->
                c = @contributions.get(sev.payload._id)
                if c?
                    c.set(sev.payload)
                else
                    console.warn("New contribution added by build_on... something ain't right here...")
                    c = new CK.Model.Contribution(sev.payload)
                    @contributions.add(c)

                # TODO: move to view, plus do more (pop?)
                jQuery('#'+c.id).effect('highlight', 2000)

            new_tag: (sev) ->
                t = @tags.get(sev.payload._id)
                if t?
                    t.set(sev.payload)
                else
                    t = new CK.Model.Tag(sev.payload)
                    @tags.add(t)

            contribution_tagged: (sev) ->
                c = @contributions.get(sev.payload._id)
                console.log("contribution_tagged, c is: ", c)

                addLink = =>
                    c.set(sev.payload)
                    ts = ( @tags.get(tr.id) for tr in c.get('tags') )
                    console.log("adding links from ", c, " to ", ts)
                    @wall.cloud.addLinks(c, ts)

                if c
                    addLink()
                else
                    # TODO: do the same thing if tag is not found
                    console.warn("Contribution ",sev.payload._id," not found locally... fetching updated contributions collection...")
                    @contributions.fetch
                        success: ->
                            c = @contributions.get(sev.payload._id)
                            addLink()
                    

            screen_lock: (sev) ->
                @wall.pause()

            screen_unlock: (sev) ->
                @wall.unpause()

            start_student_tagging: (sev) ->
                @switchToAnalysis()

            start_synthesis: (sev) ->
                @switchToSynthesis()

