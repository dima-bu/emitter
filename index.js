import _ from 'lodash';

var Emitter = {
  /**
   * @description // Bind an event to a `callback` function. Passing `"all"` will bind the callback to all events fired.
   * @param {string} name Name of event or multiple events separate by space like jQuery Style
   * @param {Function} callback Callback function
   * @param {?*} context Context to execute callback function
   * @returns {Object}
   */
  on: function (name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
    this._events || (this._events = {});
    var events = this._events[name] || (this._events[name] = []);
    var hashKey = '#' + maxHashId++;
    events.push({callback: callback, context: context, ctx: context || this, id: hashKey});
    var self = this;
    return {
      id: hashKey,
      name: name,
      off: function () {
        self.off(name, hashKey);
      }
    };
  },

  /**
   * @description Bind an event to only be triggered a single time. After the first time the callback is invoked, it will be removed.
   * @param {string} name Name of event
   * @param {Function} callback Callback function
   * @param {?*} context Context to execute callback function
   * @returns {Object}
   */
  once: function (name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
    var self = this;
    var once = _.once(function () {
      self.off(name, once);
      callback.apply(this, arguments);
    });
    once._callback = callback;
    return this.on(name, once, context);
  },

  /**
   * @description Remove one or many callbacks. If `context` is null, removes all callbacks with that function. If `callback` is null, removes all callbacks for the event. If `name` is null, removes all bound callbacks for all events.
   * @param {?string} name Name of event or multiple events separate by space like jQuery Style
   * @param {?Function|String} callback Callback function
   * @param {?*} context Context to execute callback function
   * @returns {Sandy.EventEmitter}
   */
  off: function (name, callback, context) {
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;

    // Remove all callbacks for all events.
    if (!name && !callback && !context) {
      this._events = void 0;
      return this;
    }

    var names = name ? [name] : _.keys(this._events);
    for (var i = 0, length = names.length; i < length; i++) {
      name = names[i];

      // Bail out if there are no events stored.
      var events = this._events[name];
      if (!events) continue;

      // Remove all callbacks for this event.
      if (!callback && !context) {
        delete this._events[name];
        continue;
      }

      // Find any remaining events.
      var remaining = [];
      for (var j = 0, k = events.length; j < k; j++) {
        var event = events[j];
        if (_.isString(callback)) {
          if (callback !== event.id)
            remaining.push(event);
        } else if (
          callback && callback !== event.callback &&
          callback !== event.callback._callback ||
          context && context !== event.context
        ) {
          remaining.push(event);
        }
      }

      // Replace events if there are any remaining.  Otherwise, clean up.
      if (remaining.length) {
        this._events[name] = remaining;
      } else {
        delete this._events[name];
      }
    }

    return this;
  },

  /**
   * @description Trigger one or many events, firing all bound callbacks. Callbacks are passed the same arguments as `trigger` is, apart from the event name (unless you're listening on `"all"`, which will cause your callback to receive the true name of the event as the first argument).
   * @param {string} name
   * @returns {Sandy.EventEmitter}
   */
  trigger: function (name) {
    if (!this._events) return this;
    var args = Array.prototype.slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) return this;
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, arguments);
    return this;
  },

  /**
   * Tell this object to stop listening to either specific events ... or to every object it's currently listening to
   * @param obj
   * @param name
   * @param callback
   * @returns {Sandy.EventEmitter}
   */
  stopListening: function (obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;
    var remove = !name && !callback;
    if (!callback && typeof name === 'object') callback = this;
    if (obj) (listeningTo = {})[obj._listenId] = obj;
    for (var id in listeningTo) {
      obj = listeningTo[id];
      obj.off(name, callback, this);
      if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
    }
    return this;
  }

}

/**
 * @description Regular expression used to split event strings.
 * @type {RegExp}
 */
var eventSplitter = /\s+/;

/**
 * @description Implement fancy features of the Events API such as multiple event names `"change blur"` and jQuery-style event maps `{change: action}` in terms of the existing API.
 * @param obj
 * @param action
 * @param name
 * @param rest
 * @returns {boolean}
 */
var eventsApi = function (obj, action, name, rest) {
  if (!name) return true;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, length = names.length; i < length; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
};

/**
 * @description A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual cases speedy
 * @param events
 * @param args
 */
var triggerEvents = function (events, args) {
  var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2], a4 = args[3];
  switch (args.length) {
    case 0:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx);
      return;
    case 1:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1);
      return;
    case 2:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2);
      return;
    case 3:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
      return;
    case 4:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3, a4);
      return;
    default:
      while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
      return;
  }
};

var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
_.each(listenMethods, function (implementation, method) {
  Emitter[method] = function (obj, name, callback) {
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    listeningTo[id] = obj;
    if (!callback && typeof name === 'object') callback = this;
    obj[implementation](name, callback, this);
    return this;
  };
});

var maxHashId = 1000;


export default {
  ChannelSplitter: /:/,
  DefaultChannel: 'global',
  channels: {},
  /**
   * @description Add channel to EventBus. You don't need to do it directly. As its done by default on listening or emitting event
   * @param name
   */
  addChannel: function (name) {
    if (name == '' || name == void 0 || name == null) {
      throw "Cant add undefined channel";
    } else {
      if (this.channels[name] == void 0)
        this.channels[name] = _.extend({}, Emitter);
    }
    return this;
  },
  /**
   * @description Remove channel from EventBus. You don't need to do it directly.
   * @param {string} name
   */
  removeChannel: function (name) {
    if (name == '' || name == void 0 || name == null) {
      throw "Cant remove undefined or main channel";
    } else {
      if (this.channels[name] !== void 0) {
        this.channels[name].off();
        delete this.channels[name];
      } else {
        return false;
      }
    }
    return this;
  },
  /**
   * @description Listen to `channel`@`event`. Channel by default is `global` if none is provided, e.g. `event`. You can pass multiple events to channel separated by space in jQuery style, e.g. `load:state success fail`
   * @param {string} name
   * @param {Function} callback
   * @param {?*=} context
   * @returns {Object}
   */
  on: function (name, callback, context) {
    var channel = this.DefaultChannel;
    context = context || this;
    if (this.ChannelSplitter.test(name)) {
      channel = name.split(this.ChannelSplitter)[0];
      name = name.split(this.ChannelSplitter)[1];
    }
    this.addChannel(channel);
    return this.channels[channel].on(name, callback, context);
  },
  /**
   * @description Same as `on` but callback is removed after event invoking
   * @param {string} name
   * @param {Function} callback
   * @param {?*} context
   */
  once: function (name, callback, context) {
    var channel = this.DefaultChannel;
    context = context || this;
    if (this.ChannelSplitter.test(name)) {
      channel = name.split(this.ChannelSplitter)[0];
      name = name.split(this.ChannelSplitter)[1];
    }
    this.addChannel(channel);
    return this.channels[channel].once(name, callback, context);
  },
  /**
   * @description Calling with no options causes to remove ALL attached events and channels. Calling with @`channel` unbinds and removes all events from this channel. Otherwise call `channel`:`event` or `event`
   * @param {string} name
   * @param {?Function} cb
   */
  off: function (name, cb) {
    var self = this;
    var channel = this.DefaultChannel;
    if (name == void 0) {
      _.each(this.channels, function (channel, id) {
        self.removeChannel(id);
      });
    } else {
      if (name[0] == '@') {
        channel = name.split('@')[1];
        if (this.channels[channel]) {
          this.removeChannel(channel);
        }
      } else {
        if (this.ChannelSplitter.test(name)) {
          channel = name.split(this.ChannelSplitter)[0];
          name = name.split(this.ChannelSplitter)[1];
        }
        if (this.channels[channel])
          if (cb)
            this.channels[channel].off(name, cb);
          else
            this.channels[channel].off(name);
      }
    }
    return this;
  },
  /**
   * @description Trigger event. First parameter is always name. Others are proxied to callback functions
   * @param {string} name
   * @param {...*}
   */
  emit: function (name) {
    var channel = this.DefaultChannel;
    if (this.ChannelSplitter.test(name)) {
      channel = name.split(this.ChannelSplitter)[0];
      name = name.split(this.ChannelSplitter)[1];
    }
    if (this.channels[channel] !== void 0) {
      var args = Array.prototype.slice.call(arguments, 1);
      args.unshift(name);
      this.channels[channel].trigger.apply(this.channels[channel], args);
    }
    return this;
  }
}
