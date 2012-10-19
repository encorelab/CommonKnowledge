class CK.Smartboard extends Sail.App
    curnit: 'CK'
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

        userFilter = null

        Sail.modules
            .load('Rollcall.Authenticator', {mode: 'picker', askForRun: true, curnit: @curnit, userFilter: userFilter})
            .load('Strophe.AutoConnector')
            .load('AuthStatusWidget', {indicatorContainer: 'body', clickNameToLogout: true})
            .thenRun =>
                Sail.autobindEvents(@)
                @trigger('initialized')