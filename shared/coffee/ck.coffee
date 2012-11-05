window.CK = {}

CK = window.CK

CK.getState = (type, callback) ->
    states = new CK.Model.States()
    # TODO: filter using Drowsy query
    states.on 'reset', (ss) ->
        state = ss.find (s) -> s.get('type') is type
        callback(state)

    states.fetch()

CK.getStateForUser = (type, username, callback) ->
    states = new CK.Model.States()
    # TODO: filter using Drowsy query
    states.on 'reset', (ss) ->
        state = ss.find (s) -> s.get('type') is type && s.get('username') is username
        callback(state)

    states.fetch()