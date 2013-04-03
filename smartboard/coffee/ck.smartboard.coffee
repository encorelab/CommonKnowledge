class CK.Smartboard extends Sail.App
    name: 'CK.Smartboard'

    requiredConfig: {
        xmpp:
            domain: 'string'
            port: 'number'
            url: 'string'
        rollcall:
            url: 'string'
        drowsy:
            url: 'string'
        wakeful:
            url: 'string'
        curnit: 'string'
    }

    init: =>
        Sail.verifyConfig @config, @requiredConfig
        console.log "Configuration is valid."

        @curnit = @config.curnit

        @run = @run || JSON.parse jQuery.cookie('run')

        userFilter = (user) -> user.kind is 'Instructor'

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: @curnit, userFilter: userFilter})
            .load('Wakeful.ConnStatusIndicator')
            .load('AuthStatusWidget', {indicatorContainer: 'body', clickNameToLogout: true})
            .thenRun =>
                Sail.autobindEvents(this)
                @trigger('initialized')

        @rollcall = new Rollcall.Client(@config.rollcall.url)

        #@states = new CK.Model.States()
        #@states.on 'change', (collection) ->
        #    console.log  'States Collection Changed!'

    authenticate: =>
        if @run
            Rollcall.Authenticator.requestLogin()
        else
            Rollcall.Authenticator.requestRun()

    getColourTagClassName: =>
        if @tagCount > 4
            console.warn 'Adding more tags then you have tag classes'

        'group' + (++@tagCount) + '-color'

    # initializes and persists a new CK.Model.Tag with the given name
    createNewTag: (name) =>
        colourClassName = @getColourTagClassName()

        tag = new CK.Model.Tag({'name': name, 'colourClass': colourClassName})
        tag.wake @config.wakeful.url
        tag.save {}

    pause: =>
        CK.setState('run', {paused: true})

    unpause: =>
        CK.setState('run', {paused: false})

        if @wall.mode is 'evaluate'
            @switchToInterpretation()

    # set up all the Collections used by the board
    setupModel: =>
        @contributions = CK.Model.awake.contributions
        @proposals = CK.Model.awake.proposals
        @tags = CK.Model.awake.tags

        @contributions.on 'add', (contrib) =>
            @wall.cloud.ensureNode contrib
            @wall.cloud.render()

        # @contributions.on 'reset', =>
        #     @contributions.each @wall.cloud.ensureNode
        #     @wall.cloud.render()

        @proposals.on 'add', (proposal) =>
            @wall.cloud.ensureNode proposal
            @wall.cloud.render()

        @proposals.on 'change', (proposal) =>
            if @wall.cloud.ensureNode proposal
                #do the render!
                @wall.cloud.render()

        # @proposals.on 'reset', =>
        #     @proposals.each @wall.cloud.ensureNode
        #     @wall.cloud.render()

        @tags.on 'add', (tag) =>
            @wall.cloud.ensureNode tag
            tag.newlyAdded = true
            @wall.cloud.render()

        @tags.on 'reset', (collection) =>
            @tagCount = collection.length
            console.log "Number of Tags: " + @tagCount
            collection.each @wall.cloud.ensureNode
            @wall.cloud.render()

        @runState = CK.getState 'run'

        unless @runState?
            @runState = CK.setState 'run', {}

        @runState.wake @config.wakeful.url

        @trigger 'ready'

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."

            CK.Model.init(@config.drowsy.url, @run.name).done =>
                Wakeful.loadFayeClient(@config.wakeful.url).done =>
                    CK.Model.initWakefulCollections(@config.wakeful.url).done =>
                        @setupModel()


        'ui.initialized': (ev) ->
            console.log "UI initialized..."

        connected: (ev) ->
            console.log "Connected..."

        ready: (ev) ->
            # triggered when CK.Model has been configured (via CK.Model.init)
            # TODO: maybe also wait until we're connected?
            console.log "Ready..."

            @wall = new CK.Smartboard.View.Wall
                el: jQuery('#wall')
                runState: @runState
                tags: @tags
                contributions: @contributions

            @wall.render()
