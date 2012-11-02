class CK.Smartboard extends Sail.App
    curnit: 'CommonKnowledge'
    name: 'CK.Smartboard'

    requiredConfig: {
        xmpp: 
            domain: 'string'
            port: 'number'
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

        bubbleContrib = (contrib) ->
            bubble = new CK.Smartboard.View.ContributionBalloon {model: contrib}
            contrib.on 'change', bubble.render
            bubble.render()

        bubbleTag = (tag) ->
            bubble = new CK.Smartboard.View.TagBalloon {model: tag}
            tag.on 'change', bubble.render
            bubble.render()

        @contributions = new CK.Model.Contributions()
        @contributions.on 'add', (contrib) -> 
            contrib.justAdded = true
            bubbleContrib(contrib)
        @contributions.on 'reset', (collection) -> 
            collection.each bubbleContrib

        @tags = new CK.Model.Tags()
        @tags.on 'add', (tag) ->
            tag.justAdded = true
            bubbleTag(tag)
        @tags.on 'reset', (collection) ->
            collection.each bubbleTag

        @wall = new CK.Smartboard.View.Wall {el: jQuery('#wall'), collection: @contributions}

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

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."
            CK.Model.configure(@config.mongo.url, @run.name)

        'ui.initialized': (ev) ->
            console.log "UI initialized..."

        connected: (ev) ->
            console.log "Connected..."
            @contributions.fetch()
            @tags.fetch()

        sail:
            contribution: (sev) ->
                c = @contributions.get(sev.payload._id)
                if c?
                    c.set(sev.payload)
                else
                    c = new CK.Model.Contribution(sev.payload)
                    @contributions.add(c)

            new_tag: (sev) ->
                t = @tags.get(sev.payload._id)
                if t?
                    t.set(sev.payload)
                else
                    t = new CK.Model.Tag(sev.payload)
                    @tags.add(t)
