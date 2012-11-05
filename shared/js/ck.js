// Generated by CoffeeScript 1.3.3
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

  CK.getStateForUser = function(type, username, callback) {
    var states;
    states = new CK.Model.States();
    states.on('reset', function(ss) {
      var state;
      state = ss.find(function(s) {
        return s.get('type') === type && s.get('username') === username;
      });
      return callback(state);
    });
    return states.fetch();
  };

  CK.setState = function(type, state) {
    return CK.getState(type, function(s) {
      if (s != null) {
        s = new CK.Model.State();
        s.set('type', type);
      }
      s.set('state', state);
      return s.save();
    });
  };

}).call(this);
