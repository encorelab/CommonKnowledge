class CK.Smartboard extends Sail.App
    name: 'CK.Smartboard'

    requiredConfig: {
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

    getColorTagClassName: =>
        @tagCount = @tags.length + 1
        if @tagCount > 4
            console.warn 'Adding more tags then you have tag classes'

        'group' + (@tagCount) + '-color'

    # initializes and persists a new CK.Model.Tag with the given name
    createNewTag: (name) =>
        if @tags.length < 4
            tag = new CK.Model.Tag
                name: name
                colorClass: @getColorTagClassName()
                created_at: new Date()

            tag.wake @config.wakeful.url

            @tags.add(tag)
        else
            console.warn 'Adding more than 4 tags is leading to problems. Button should be disabled ...'

    pause: =>
        CK.setState('RUN', {paused: true})

    unpause: =>
        CK.setState('RUN', {paused: false})

        if @wall.mode is 'evaluate'
            @switchToInterpretation()

    # set up all the Collections used by the board
    setupModel: =>
        @contributions = CK.Model.awake.contributions
        @proposals = CK.Model.awake.proposals
        @tags = CK.Model.awake.tags

        @runState = CK.getState 'RUN'

        unless @runState?
            @runState = CK.setState 'RUN', {phase: 'brainstorm'}

        @runState.wake @config.wakeful.url

        @trigger 'ready'

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."

            jQuery('#auth-indicator .nickname').text(@run.name)

            CK.Model.init(@config.drowsy.url, @run.name).done =>
                Wakeful.loadFayeClient(@config.wakeful.url).done =>
                    CK.Model.initWakefulCollections(@config.wakeful.url).done =>
                        @setupModel()

        unauthenticated: (ev) ->
            document.location.reload()


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
