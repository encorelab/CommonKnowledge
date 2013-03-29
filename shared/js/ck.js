(function() {
  var CK;

  window.CK = {};

  CK = window.CK;

  CK.getState = function(forEntity) {
    var state;
    state = CK.Model.awake.states.findWhere({
      entity: forEntity
    });
    if (state == null) {
      console.warn("There is no state data for entity '" + forEntity + "'!");
    }
    return state;
  };

  CK.setState = function(forEntity, values) {
    var state;
    state = CK.getState(forEntity);
    if (state == null) {
      state = new CK.Model.State();
      state.set('entity', values);
      CK.Model.awake.states.add(state);
    }
    state.set(values);
    state.set('modified_at', new Date());
    return state.save();
  };

}).call(this);
