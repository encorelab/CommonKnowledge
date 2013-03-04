(function() {
  var CK;

  window.CK = {};

  CK = window.CK;

  CK.getState = function(type, callback) {
    var states;
    states = new CK.Model.States();
    states.on('reset', function(ss) {
      var state;
      state = ss.find(function(s) {
        return s.get('type') === type;
      });
      return callback(state);
    });
    return states.fetch();
  };

  CK.getStateForUser = function(type, username, state_name, callback) {
    var states;
    states = new CK.Model.States();
    states.on('reset', function(ss) {
      var state;
      state = ss.find(function(s) {
        return s.get('type') === type && s.get('username') === username && s.get('state') === state_name;
      });
      return callback(state);
    });
    return states.fetch();
  };

  CK.setState = function(type, state, screen_lock) {
    if (typeof screen_lock === "undefined" || screen_lock === null) {
      screen_lock = false;
    }
    return CK.getState(type, function(s) {
      if (typeof s === "undefined" || s === null) {
        s = new CK.Model.State();
        s.set('type', type);
      }
      s.set('state', state);
      s.set('screen_lock', screen_lock);
      return s.save();
    });
  };

  CK.setStateForUser = function(type, username, state, data_obj) {
    return CK.getStateForUser(type, username, state, function(s) {
      if (typeof s === "undefined" || s === null) {
        s = new CK.Model.State();
        s.set('type', type);
        s.set('username', username);
        s.set('state', state);
      }
      s.set('data', data_obj);
      return s.save();
    });
  };

  CK.getUserState = function(username, callback) {
    var user_states;
    user_states = new CK.Model.UserStates();
    user_states.on('reset', function(uss) {
      var user_state;
      user_state = uss.find(function(us) {
        return us.get('username') === username;
      });
      if (typeof user_state === 'undefined' || user_state === null) {
        user_state = new CK.Model.UserState();
        user_state.set('username', username);
        user_state.set('created_at', Date());
      }
      return callback(user_state);
    });
    return user_states.fetch();
  };

  CK.setUserState = function(username, state, data_obj) {
    return CK.getUserState(username, function(s) {
      if (typeof s === "undefined" || s === null) {
        s = new CK.Model.UserState();
      }
      s.set('username', username);
      data_obj.modified_at = Date();
      s.set(state, data_obj);
      return s.save();
    });
  };

}).call(this);
