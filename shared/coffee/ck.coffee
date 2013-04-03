window.CK = {}

CK = window.CK

CK.getState = (forEntity) ->
    state = CK.Model.awake.states.findWhere  entity: forEntity
    unless state?
        console.warn "There is no state data for entity '#{forEntity}'!"
    return state
        
CK.setState = (forEntity, values) ->
    state = CK.getState forEntity
    
    unless state?
        state = new CK.Model.State()
        state.set 'entity', forEntity
        CK.Model.awake.states.add state

    state.set values
    state.set 'modified_at', new Date()
    state.save()
    return state
