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
        drowsy:
            url: 'string'
        wakeful:
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

        #@states = new CK.Model.States()
        #@states.on 'change', (collection) ->
        #    console.log  'States Collection Changed!'

    authenticate: =>
        if @run
            Rollcall.Authenticator.requestLogin()
        else
            Rollcall.Authenticator.requestRun()

    # initializes and persists a new CK.Model.Tag with the given name
    createNewTag: (name) =>
        tag = new CK.Model.Tag({name: name})
        tag.wake @config.wakeful.url
        tag.save {},
            success: =>
                sev = new Sail.Event 'new_tag', tag.toJSON()
                @groupchat.sendEvent sev

    pause: =>
        sev = new Sail.Event 'screen_lock'
        @groupchat.sendEvent sev
        
        CK.getState('phase', (s) ->
            CK.setState('phase', s.get('state'), true)
        )
        

        # take this opportunity to save positions
        for b in _.union(@contributions.models, @tags.models)
            pos = @wall.$el.find('#'+b.id).position()
            b.set({pos: {left: pos.left, top: pos.top}}, {silent: true})
            b.save({}, {silent: true})

        

    unpause: =>
        sev = new Sail.Event 'screen_unlock'
        @groupchat.sendEvent sev
        CK.getState('phase', (s) ->
            CK.setState('phase', s.get('state'), false)
            #CK.setState('phase', 'brainstorm', false)
        )
        
    startAnalysis: =>
        sev = new Sail.Event 'start_analysis'
        @groupchat.sendEvent sev

    startProposal: =>
        sev = new Sail.Event 'start_proposal'
        @groupchat.sendEvent sev

    startInterpretation: =>
        sev = new Sail.Event 'start_interpretation'
        @groupchat.sendEvent sev

    switchToAnalysis: =>
        mode = 'analysis'
        @wall.setMode(mode)
        @wall.cloud.reRenderForState(mode)

    switchToProposal: =>
        mode = 'propose'
        @wall.setMode(mode)
        @wall.cloud.reRenderForState(mode)

    switchToInterpretation: =>
        mode = 'interpret'
        @wall.setMode(mode)
        @wall.cloud.reRenderForState(mode)

    # set up all the Collections used by the board
    initModels: =>
        Wakeful.loadFayeClient(@config.wakeful.url).done =>
            @contributions = new CK.Model.Contributions()
            @contributions.wake @config.wakeful.url

            # FIXME: for the 'reset' event, we should wait until
            #        BOTH the tags and contributions are fetched
            #        before calling cloud.render()

            @contributions.on 'all', (ev, data) => 
                console.log(@contributions.url, ev, data)

            @contributions.on 'add', (contrib) =>
                @wall.cloud.ensureNode contrib
                @wall.cloud.render()

            @contributions.on 'reset', (collection) => 
                collection.each @wall.cloud.ensureNode
                @wall.cloud.render()

            @tags = new CK.Model.Tags()
            @tags.wake @config.wakeful.url

            @contributions.on 'all', (ev, data) => 
                console.log(@contributions.url, ev, data)

            @tags.on 'add', (tag) =>
                @wall.cloud.ensureNode tag

                tag.newlyAdded = true

                @wall.cloud.render()

            @tags.on 'reset', (collection) =>
                collection.each @wall.cloud.ensureNode
                @wall.cloud.render()

            CK.getState 'phase', (s) =>
                if s
                    # restore pause state if there is one set
                    if s.get('screen_lock') is true
                        @wall.pause()

                    if s.get('state') is 'analysis'
                        @switchToAnalysis()
                    else if s.get('state') is 'proposal'
                        @switchToProposal()
                    else if s.get('state') is 'interpretation'
                        @switchToInterpretation()

            @trigger('ready')

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."

            CK.Model.init(@config.drowsy.url, @run.name).done @initModels


        'ui.initialized': (ev) ->
            console.log "UI initialized..."

        connected: (ev) ->
            console.log "Connected..."

        ready: (ev) ->
            # triggered when CK.Model has been configured (via CK.Model.init)
            # TODO: maybe also wait until we're connected?
            console.log "Ready..."
            
            @wall.render()

            @contributions.fetch()
            @tags.fetch()

        sail:
            contribution: (sev) ->
                @contributions.fetch().done =>
                    @contributions.get(sev.payload).newlyAdded = true

            build_on: (sev) ->
                @contributions.fetch().done ->
                    # TODO: move to view, plus do more (pop?)
                    jQuery('#'+sev.payload._id).effect('highlight', 2000)

            # new_tag: (sev) ->
            #     @tags.fetch().done ->
            #         jQuery('#'+sev.payload._id).addClass('new')
            #         setTimeout ->
            #             jQuery('#'+sev.payload._id).removeClass('new')
            #         , 2000

            contribution_tagged: (sev) ->
                #@contributions.get(sev.payload._id).fetch()
                @contributions.fetch()
                    

            screen_lock: (sev) ->
                @wall.pause()

            screen_unlock: (sev) ->
                @wall.unpause()

            start_analysis: (sev) ->
                @switchToAnalysis()

            start_proposal: (sev) ->
                @switchToProposal()

            start_interpretation: (sev) ->
                @switchToInterpretation()
