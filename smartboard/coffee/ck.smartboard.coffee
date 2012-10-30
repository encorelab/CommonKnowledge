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
            bubble = new CK.Smartboard.View.ContributionBubble {model: contrib}
            contrib.on 'change', bubble.render
            bubble.render()

        @contributions = new CK.Model.Contributions()
        @contributions.on 'add', (contrib) -> 
            contrib.justAdded = true
            bubbleContrib(contrib)
        @contributions.on 'reset', (collection) -> 
            collection.each bubbleContrib

        @wall = new CK.Smartboard.View.Wall {collection: @contributions}

    authenticate: =>
        if @run
            Rollcall.Authenticator.requestLogin()
        else
            Rollcall.Authenticator.requestRun()

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

        sail:
            contribution: (sev) ->
                c = @contributions.get(sev.payload._id)
                if c?
                    c.set(sev.payload)
                else
                    c = new CK.Model.Contribution(sev.payload)
                    @contributions.add(c)

    
