window.CK = {}

CK = window.CK

CK.getState = (type, callback) ->
    states = new CK.Model.States()
    # TODO: filter using Drowsy query
    states.on 'reset', (ss) ->
        state = ss.find (s) -> s.get('type') is type
        callback(state)

    states.fetch()

CK.getStateForUser = (type, username, state_name, callback) ->
    states = new CK.Model.States()
    # TODO: filter using Drowsy query
    states.on 'reset', (ss) ->
        state = ss.find (s) -> s.get('type') is type && s.get('username') is username && s.get('state') is state_name
        # unless state?
        #     state = new CK.Model.State()

        callback(state)

    states.fetch()

CK.setState = (type, state, screen_lock = false) ->
    CK.getState type, (s)->
        `if (typeof s === "undefined" || s === null ) {
            //create new state
            s = new CK.Model.State();
            s.set('type', type);
        }
        `
        s.set('state', state)
        s.set('screen_lock', screen_lock)
        s.save()

CK.setStateForUser = (type, username, state, data_obj) ->
    CK.getStateForUser type, username, state, (s)->
        `if (typeof s === "undefined" || s === null ) {
            //create new state
            s = new CK.Model.State();
            s.set('type', type);
            s.set('username', username);
            s.set('state', state);
        }
        `
        s.set('data', data_obj)
        s.save()