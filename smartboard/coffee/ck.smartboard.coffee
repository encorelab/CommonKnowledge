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

        @tagCount = 0;
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
            
            if pos?
                b.set({pos: {left: pos.left, top: pos.top}}, {silent: true})
                b.save({}, {silent: true})

        # if (@wall.mode is 'interpret')
        #         @switchToEvaluation()

        

    unpause: =>
        sev = new Sail.Event 'screen_unlock'
        @groupchat.sendEvent sev
        CK.getState('phase', (s) ->
            CK.setState('phase', s.get('state'), false)
            #CK.setState('phase', 'brainstorm', false)
        )

        if @wall.mode is 'evaluate'
            @switchToInterpretation()
        
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

    switchToEvaluation: =>
        mode = 'evaluate'
        @wall.setMode(mode)

    # used for unit testing proposals
    createNewProposal: (headline, description, justification, voteNumber, tagID, tagName, buildOnArray) =>
        proposal = new CK.Model.Proposal()
        proposal.wake @config.wakeful.url
        proposal.set({'headline': headline, 'title': headline, 'description': description, 'justification': justification, 'published': true, 'author': 'ck1-ck2', 
        'votes': voteNumber, 'tag_group_id': tagID, 'tag_group_name': tagName, 'build_ons': buildOnArray})
        proposal.save()

    # set up all the Collections used by the board
    initModels: =>
        Wakeful.loadFayeClient(@config.wakeful.url).done =>
            @contributions = new CK.Model.Contributions()
            @contributions.wake @config.wakeful.url

            @proposals = new CK.Model.Proposals()
            @proposals.wake @config.wakeful.url

            #console.log (@proposals)

            # FIXME: for the 'reset' event, we should wait until
            #        BOTH the tags and contributions are fetched
            #        before calling cloud.render()

            @contributions.on 'all', (ev, data) => 
                console.log(@contributions.url, ev, data)

            @contributions.on 'add', (contrib) =>
                @wall.cloud.ensureNode contrib
                @wall.cloud.render()


            @contributions.on 'reset', => 
                @contributions.each @wall.cloud.ensureNode
                @wall.cloud.render()


            @proposals.on 'all', (ev, data) => 
                console.log(@proposals.url, ev, data)

            @proposals.on 'add', (proposal) =>
                @wall.cloud.ensureNode proposal
                @wall.cloud.render()

            @proposals.on 'change', (proposal) =>
                if @wall.cloud.ensureNode proposal
                    @wall.cloud.render()

            @proposals.on 'reset', => 
                @proposals.each @wall.cloud.ensureNode
                @wall.cloud.render()

            @tags = new CK.Model.Tags()
            @tags.wake @config.wakeful.url

            @tags.on 'add', (tag) =>
                @wall.cloud.ensureNode tag

                tag.newlyAdded = true

                @wall.cloud.render()

            @tags.on 'reset', (collection) =>
                @tagCount = collection.length
                console.log "Number of Tags: " + @tagCount
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
                    else if s.get('state') is 'evaluation'
                        @switchToEvaluation()
                    else
                        @wall.setMode('brainstorm')

            # test state change
        
            #setTimeout (=> @switchToInterpretation()), 5000

            #
            # @createNewProposal 'tag 3 headlines are great!', 'cookie descriptions are not as cool but whatever...', 
            # 'justification justification justification justification justification justification justification justification', 3, 
            # '51366fd242901f5cf4000002', 'Cookies', 
            # [{"content": "Blah comment on", "author": "ck2", "created_at": "Mon Oct 29 2012 13:42:00 GMT-0400 (EDT)", "tag_group_id": '51366fd242901f5cf4000002'}, { "content": "Blah comment on and on and on", "author": "ck2", "created_at": "Mon Oct 29 2012 13:40:00 GMT-0400 (EDT)", "tag_group_id": '51366dd942901f51c6000000'}]

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
            
            @tags.fetch().done => @contributions.fetch().done => @proposals.fetch()

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
