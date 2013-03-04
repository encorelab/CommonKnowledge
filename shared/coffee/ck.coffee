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
        # if typeof state == 'undefined' || state == null
        #     state = new CK.Model.State()
        callback(state)

    states.fetch()

CK.setState = (type, state, screen_lock) ->
    if (typeof screen_lock == "undefined" || screen_lock == null )
        screen_lock = false

    CK.getState type, (s)->
        if (typeof s == "undefined" || s == null )
            # //create new state
            s = new CK.Model.State()
            s.set('type', type)

        s.set('state', state)
        s.set('screen_lock', screen_lock)
        s.save()

CK.setStateForUser = (type, username, state, data_obj) ->
    CK.getStateForUser type, username, state, (s)->
        if (typeof s == "undefined" || s == null )
            # //create new state
            s = new CK.Model.State()
            s.set('type', type)
            s.set('username', username)
            s.set('state', state)
        
        s.set('data', data_obj)
        s.save()


# This is stuff needed by UI instead of states collection in setStateForUser we use user_states collection
CK.getUserState = (username, callback) ->
    user_states = new CK.Model.UserStates()
    # TODO: filter using Drowsy query
    user_states.on 'reset', (uss) ->
        user_state = uss.find (us) -> us.get('username') is username
        # unless user_state?
        if typeof user_state == 'undefined' || user_state == null
            user_state = new CK.Model.UserState()
            user_state.set('username', username)
            user_state.set('created_at', Date())

        callback(user_state)

    user_states.fetch()

CK.setUserState = (username, state, data_obj) ->
    CK.getUserState username, (s)->
        if (typeof s == "undefined" || s == null )
            # //create new state
            s = new CK.Model.UserState()
            
        s.set('username', username)
        data_obj.modified_at = Date()
        s.set(state, data_obj)
        s.save()

