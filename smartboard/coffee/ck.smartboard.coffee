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

        # test state change
    
        #setTimeout (=> @switchToInterpretation()), 5000

        #
        # a = => @createNewProposal 'tag 3 headlines are great!', 'cookie descriptions are not as cool but whatever...',
        #  'justification justification justification justification justification justification justification justification', 3,
        #  '5137fbab65fd712a3a000002', 'Cookies',
        #  [{"content": "Blah comment on!!", "author": "ck2", "created_at": "Mon Oct 29 2012 13:42:00 GMT-0400 (EDT)", "tag_group_id": '51366fd242901f5cf4000002'}, { "content": "Blah comment on and on and on", "author": "ck2", "created_at": "Mon Oct 29 2012 13:40:00 GMT-0400 (EDT)", "tag_group_id": '51366dd942901f51c6000000'}]

        # setTimeout a, 5000
        @trigger 'ready'

    events:
        initialized: (ev) ->
            @authenticate()
            console.log "Initialized..."
            
        authenticated: (ev) ->
            console.log "Authenticated..."

            @nickname = @session.account.login

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

        sail:
            contribution: (sev) ->
                @contributions.add(sev.payload)
                #@contributions.fetch()#.done =>
                #     @contributions.get(sev.payload).newlyAdded = true

            build_on: (sev) ->
                contrib = @contributions.get(sev.payload._id)

                contrib.set(sev.payload).done ->
                    # TODO: move to view, plus do more (pop?)
                    jQuery('#'+sev.payload._id).effect('highlight', 2000)

            # new_tag: (sev) ->
            #     @tags.fetch().done ->
            #         jQuery('#'+sev.payload._id).addClass('new')
            #         setTimeout ->
            #             jQuery('#'+sev.payload._id).removeClass('new')
            #         , 2000

            contribution_tagged: (sev) ->
                # @contributions.get(sev.payload._id).fetch()
                contrib = @contributions.get(sev.payload._id)

                contrib.set(sev.payload)

                if @wall.cloud.ensureNode contrib
                    console.log 'Calling Wall Render with contribution....'
                    console.log contrib
                    @wall.cloud.render()
                    

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
