"bundle";
System.registerDynamic("npm:most@0.2.4/async", ["github:jspm/nodelibs-process@0.1.2"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    module.exports = enqueue;
    var nextTick,
        handlerQueue = [];
    function enqueue(task) {
      if (handlerQueue.push(task) === 1) {
        nextTick(drainQueue);
      }
    }
    function drainQueue() {
      var i,
          len,
          queue = handlerQueue;
      handlerQueue = [];
      for (i = 0, len = queue.length; i < len; i++) {
        queue[i]();
      }
    }
    if (typeof process === 'object' && process.nextTick) {
      nextTick = typeof setImmediate === 'function' ? setImmediate : process.nextTick;
    } else if (typeof window !== 'undefined' && (MutationObserver = window.MutationObserver || window.WebKitMutationObserver)) {
      nextTick = (function(document, MutationObserver, drainQueue) {
        var el = document.createElement('div');
        new MutationObserver(drainQueue).observe(el, {attributes: true});
        return function() {
          el.setAttribute('x', 'x');
        };
      }(document, MutationObserver, drainQueue));
    } else {
      nextTick = function(t) {
        setTimeout(t, 0);
      };
    }
  })($__require('github:jspm/nodelibs-process@0.1.2'));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:most@0.2.4/Stream", ["npm:most@0.2.4/async"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var async = $__require('npm:most@0.2.4/async');
  module.exports = Stream;
  Stream.of = of;
  Stream.empty = empty;
  function Stream(emitter) {
    this._emitter = emitter;
  }
  function of(x) {
    return new Stream(function(next, end) {
      try {
        next(x);
        end();
      } catch (e) {
        end(e);
      }
      return noop;
    });
  }
  function empty() {
    return new Stream(emptyEmitter);
  }
  var proto = Stream.prototype = {};
  proto.constructor = Stream;
  proto.each = function(next, end) {
    var done,
        unsubscribe,
        self = this;
    if (typeof end !== 'function') {
      end = fatal;
    }
    async(function() {
      unsubscribe = self._emitter(safeNext, safeEnd);
    });
    function safeUnsubscribe() {
      if (done) {
        return;
      }
      done = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        async(function() {
          unsubscribe();
        });
      }
    }
    function safeNext(x) {
      if (done) {
        return;
      }
      next(x);
    }
    function safeEnd(e) {
      if (done) {
        return;
      }
      done = true;
      end.apply(void 0, arguments);
    }
    return safeUnsubscribe;
  };
  proto.map = function(f) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        next(f(x));
      }, end);
    });
  };
  proto.ap = function(stream2) {
    return this.flatMap(function(f) {
      return stream2.map(f);
    });
  };
  proto.flatMap = function(f) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        f(x)._emitter(next, end);
      }, end);
    });
  };
  proto.flatten = function() {
    return this.flatMap(identity);
  };
  proto.filter = function(predicate) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        predicate(x) && next(x);
      }, end);
    });
  };
  proto.merge = function(other) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(next, end);
      other._emitter(next, end);
    });
  };
  proto.concat = function(other) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(next, function(e) {
        e ? end(e) : other._emitter(next, end);
      });
    });
  };
  proto.tap = function(f) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        f(x);
        next(x);
      }, end);
    });
  };
  proto.buffer = function(windower) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      var buffer;
      stream(function(x) {
        buffer = windower(next, x, buffer || []);
      }, end);
    });
  };
  proto.bufferCount = function(n) {
    return this.buffer(createCountBuffer(n));
  };
  proto.bufferTime = function(interval) {
    return this.buffer(createTimeBuffer(interval));
  };
  proto.delay = function(ms) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        setTimeout(function() {
          next(x);
        }, ms || 0);
      }, end);
    });
  };
  proto.debounce = function(interval) {
    var nextEventTime = interval;
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        var now = Date.now();
        if (now >= nextEventTime) {
          nextEventTime = now + interval;
          next(x);
        }
      }, end);
    });
  };
  proto.throttle = function(interval) {
    var cachedEvent,
        throttled;
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(function(x) {
        cachedEvent = x;
        if (!throttled) {
          throttled = setTimeout(function() {
            throttled = void 0;
            next(x);
          }, interval);
        }
      }, end);
    });
  };
  proto['catch'] = function(f) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      stream(next, function(e1) {
        var error;
        if (e1 != null) {
          try {
            next(f(e1));
          } catch (e2) {
            error = e2;
          }
        }
        if (error != null) {
          end(error);
        }
      });
    });
  };
  proto.reduce = function(f, initial) {
    var stream = this._emitter;
    return new Stream(function(next, end) {
      var value = initial;
      stream(function(x) {
        value = f(value, x);
      }, function(e) {
        if (e == null) {
          next(value);
        }
        end(e);
      });
    });
  };
  proto.scan = function(f, initial) {
    return this.map(function(x) {
      return initial = f(initial, x);
    });
  };
  function emptyEmitter(_, end) {
    async(end);
  }
  function createTimeBuffer(interval) {
    var buffered;
    return function(next, x, buffer) {
      if (!buffered) {
        buffered = true;
        buffer = [x];
        setTimeout(function() {
          next(buffer.slice());
          buffered = false;
        }, interval);
      } else {
        buffer.push(x);
      }
      return buffer;
    };
  }
  function createCountBuffer(n) {
    return function(next, x, buffer) {
      buffer && buffer.push(x) || (buffer = [x]);
      if (buffer.length >= n) {
        next(buffer);
        buffer = void 0;
      }
      return buffer;
    };
  }
  function fatal(e) {
    if (e != null) {
      throw e;
    }
  }
  function identity(x) {
    return x;
  }
  function noop() {}
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:most@0.2.4/most", ["npm:most@0.2.4/Stream", "npm:most@0.2.4/async"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Stream = $__require('npm:most@0.2.4/Stream');
  var async = $__require('npm:most@0.2.4/async');
  module.exports = create;
  create.of = Stream.of;
  create.empty = Stream.empty;
  create.fromArray = fromArray;
  create.fromItem = fromItems;
  create.fromEventTarget = fromEventTarget;
  create.fromPromise = fromPromise;
  function create(emitter) {
    return new Stream(emitter);
  }
  function fromArray(array) {
    return new Stream(function(next, end) {
      try {
        array.forEach(function(x) {
          next(x);
        });
        end();
      } catch (e) {
        end(e);
      }
      return noop;
    });
  }
  function fromItems() {
    return fromArray(Array.prototype.slice.call(arguments));
  }
  function fromEventTarget(eventTarget, eventType) {
    return new Stream(function(next) {
      eventTarget.addEventListener(eventType, next, false);
      return function() {
        eventTarget.removeEventListener(eventType, next, false);
      };
    });
  }
  function fromPromise(promise) {
    return new Stream(function(next, end) {
      promise.then(next).then(function() {
        end();
      }, end);
      return noop;
    });
  }
  Object.keys(Stream.prototype).reduce(function(exports, key) {
    var method = Stream.prototype[key];
    if (typeof method === 'function') {
      exports[key] = curry([], method.length + 1, function(args) {
        return method.apply(args.pop(), args);
      });
    }
    return exports;
  }, create);
  var slice = [].slice;
  function curry(args, arity, f) {
    return function() {
      var accumulated = args.concat(slice.call(arguments));
      return accumulated.length < arity ? curry(accumulated, arity, f) : f(accumulated);
    };
  }
  function noop() {}
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:most@0.2.4", ["npm:most@0.2.4/most"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:most@0.2.4/most');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/heroBanner/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var bannersSelector = ".homepage--body .hero--banner > section";
  var previousSelector = ".homepage--body .hero--banner .blockarrows .previous";
  var nextSelector = ".homepage--body .hero--banner .blockarrows .next";
  var intervalDelay = 7000;
  var intervalId;
  module.exports = function initHeroBanner() {
    $(ready);
    return {destroy: destroy};
    function ready() {
      $(previousSelector).on('click', previousBanner);
      $(nextSelector).on('click', nextBanner);
      intervalId = window.setInterval(nextBanner, intervalDelay);
    }
    function destroy() {
      $(previousSelector).off('click', previousBanner);
      $(nextSelector).off('click', nextBanner);
      window.clearInterval(intervalId);
    }
  };
  function nextBanner() {
    if ($(bannersSelector + ":visible").next("section").length == 0) {
      $(bannersSelector + ":last").hide();
      $(bannersSelector + ":first").fadeIn(250);
    } else {
      $(bannersSelector + ":visible").hide().next("section").fadeIn(250);
    }
  }
  ;
  function previousBanner() {
    if ($(bannersSelector + ":visible").prev("section").length == 0) {
      $(bannersSelector + ":first").hide();
      $(bannersSelector + ":last").fadeIn(250);
    } else {
      $(bannersSelector + ":visible").hide().prev("section").fadeIn(250);
    }
  }
  ;
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/hide-show-guide/storage.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(storage) {
    if (storage == null) {
      storage = window.localStorage;
    }
    return {
      getItem: function(sKey) {
        return storage.getItem(sKey);
      },
      setItem: function(sKey, sValue) {
        storage.setItem(sKey, sValue);
      },
      removeItem: function(sKey) {
        storage.removeItem(sKey);
      },
      hasItem: function(sKey) {
        return storage.getItem(sKey) != null;
      },
      key: function(idx) {
        return storage.key(idx);
      },
      clear: function() {
        storage.clear();
      }
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/hide-show-guide/main.js", ["npm:jquery@1.11.3", "src/feature/hide-show-guide/storage.js"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var storageProvider = $__require('src/feature/hide-show-guide/storage.js');
  var storage = storageProvider();
  var body = $('body');
  var container = $('.content--container');
  var guidesBuildPref = '/guides/gs/build';
  var buildOpts = ['gradle', 'maven', 'sts'];
  var relatedElementMap = {
    "reveal-gradle": '#scratch',
    "reveal-maven": '#use-maven',
    "reveal-sts": '#use-sts',
    "use-gradle": '#reveal-gradle',
    "use-maven": '#reveal-maven',
    "use-sts": '#reveal-sts'
  };
  module.exports = initHideShowGuide;
  function initHideShowGuide() {
    var plan = {
      ready: ready,
      destroy: function() {
        container.off('click', '.use-gradle, .use-maven, .use-sts', hideBuildSteps);
        container.off('click', '.reveal-gradle', revealGradle);
        container.off('click', '.reveal-maven', revealMaven);
        container.off('click', '.reveal-sts', revealSTS);
      }
    };
    function ready() {
      registerBuildSwitches();
    }
    $(ready);
    return plan;
  }
  function revealGradle(e) {
    reveal('gradle', e);
  }
  function revealMaven(e) {
    reveal('maven', e);
  }
  function revealSTS(e) {
    reveal('sts', e);
  }
  function reveal(cls, e) {
    hideBuildSteps();
    body.addClass('show-' + cls);
    storage.setItem(guidesBuildPref, cls);
    if (e !== undefined) {
      for (var k in relatedElementMap) {
        if ($(e.currentTarget).hasClass(k)) {
          $(relatedElementMap[k]).each(function(i, el) {
            el.scrollIntoView(true);
          });
          break;
        }
      }
    }
  }
  function hideBuildSteps() {
    body.removeClass('show-gradle show-maven show-sts');
    storage.setItem(guidesBuildPref, 'none');
  }
  function registerBuildSwitches() {
    container.on('click', '.use-gradle, .use-maven, .use-sts', hideBuildSteps);
    container.on('click', '.reveal-gradle', revealGradle);
    container.on('click', '.reveal-maven', revealMaven);
    container.on('click', '.reveal-sts', revealSTS);
    if (storage.hasItem(guidesBuildPref)) {
      var preference = storage.getItem(guidesBuildPref);
      if (buildOpts.indexOf(preference) >= 0) {
        reveal(preference, undefined);
      } else {
        hideBuildSteps();
      }
    }
  }
  global.define = __define;
  return module.exports;
});

(function() {
var _removeDefine = System.get("@@amd-helpers").createDefine();
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define("github:rmm5t/jquery-timeago@1.4.3/jquery.timeago", ["npm:jquery@1.11.3"], factory);
  } else if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'));
  } else {
    factory(jQuery);
  }
}(function($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago;
  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowPast: true,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        inPast: 'any moment now',
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },
    inWords: function(distanceMillis) {
      if (!this.settings.allowPast && !this.settings.allowFuture) {
        throw 'timeago allowPast and allowFuture settings can not both be set to false.';
      }
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }
      if (!this.settings.allowPast && distanceMillis >= 0) {
        return this.settings.strings.inPast;
      }
      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;
      function substitute(stringOrFunction, number) {
        var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = ($l.numbers && $l.numbers[number]) || number;
        return string.replace(/%d/i, value);
      }
      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) || seconds < 90 && substitute($l.minute, 1) || minutes < 45 && substitute($l.minutes, Math.round(minutes)) || minutes < 90 && substitute($l.hour, 1) || hours < 24 && substitute($l.hours, Math.round(hours)) || hours < 42 && substitute($l.day, 1) || days < 30 && substitute($l.days, Math.round(days)) || days < 45 && substitute($l.month, 1) || days < 365 && substitute($l.months, Math.round(days / 30)) || years < 1.5 && substitute($l.year, 1) || substitute($l.years, Math.round(years));
      var separator = $l.wordSeparator || "";
      if ($l.wordSeparator === undefined) {
        separator = " ";
      }
      return $.trim([prefix, words, suffix].join(separator));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      s = s.replace(/\.\d+/, "");
      s = s.replace(/-/, "/").replace(/-/, "/");
      s = s.replace(/T/, " ").replace(/Z/, " UTC");
      s = s.replace(/([\+\-]\d\d)\:?(\d\d)/, " $1$2");
      s = s.replace(/([\+\-]\d\d)$/, " $100");
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      return $(elem).get(0).tagName.toLowerCase() === "time";
    }
  });
  var functions = {
    init: function() {
      var refresh_el = $.proxy(refresh, this);
      refresh_el();
      var $s = $t.settings;
      if ($s.refreshMillis > 0) {
        this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
      }
    },
    update: function(time) {
      var parsedTime = $t.parse(time);
      $(this).data('timeago', {datetime: parsedTime});
      if ($t.settings.localeTitle)
        $(this).attr("title", parsedTime.toLocaleString());
      refresh.apply(this);
    },
    updateFromDOM: function() {
      $(this).data('timeago', {datetime: $t.parse($t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title"))});
      refresh.apply(this);
    },
    dispose: function() {
      if (this._timeagoInterval) {
        window.clearInterval(this._timeagoInterval);
        this._timeagoInterval = null;
      }
    }
  };
  $.fn.timeago = function(action, options) {
    var fn = action ? functions[action] : functions.init;
    if (!fn) {
      throw new Error("Unknown function name '" + action + "' for timeago");
    }
    this.each(function() {
      fn.call(this, options);
    });
    return this;
  };
  function refresh() {
    if (!$.contains(document.documentElement, this)) {
      $(this).timeago("dispose");
      return this;
    }
    var data = prepareData(this);
    var $s = $t.settings;
    if (!isNaN(data.datetime)) {
      if ($s.cutoff == 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
        $(this).text(inWords(data.datetime));
      }
    }
    return this;
  }
  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", {datetime: $t.datetime(element)});
      var text = $.trim(element.text());
      if ($t.settings.localeTitle) {
        element.attr("title", element.data('timeago').datetime.toLocaleString());
      } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }
  function inWords(date) {
    return $t.inWords(distance(date));
  }
  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }
  document.createElement("abbr");
  document.createElement("time");
}));

_removeDefine();
})();
(function() {
var _removeDefine = System.get("@@amd-helpers").createDefine();
define("github:rmm5t/jquery-timeago@1.4.3", ["github:rmm5t/jquery-timeago@1.4.3/jquery.timeago"], function(main) {
  return main;
});

_removeDefine();
})();
System.registerDynamic("src/feature/timeAgo/main.js", ["npm:jquery@1.11.3", "github:rmm5t/jquery-timeago@1.4.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var timeAgoSelector = 'time.timeago';
  $__require('github:rmm5t/jquery-timeago@1.4.3');
  module.exports = function initTimeAgo() {
    $(ready);
    return {destroy: destroy};
    function ready() {
      $(timeAgoSelector).timeago();
    }
    function destroy() {}
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/map/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var reduce = Array.prototype.reduce;
  var teamMapWrapper = '.js-team-map--wrapper';
  var teamMapContainer = '.js-team-map--container';
  var fadeDuration = 100;
  module.exports = initMap;
  function initMap() {
    var map,
        _destroy;
    _destroy = function() {};
    $__require(['gmaps'], function(GMaps) {
      $(function() {
        ready(GMaps);
      });
    });
    return {destroy: destroy};
    function ready(GMaps) {
      map = createMap(GMaps);
      var teamMemberIds = getTeamMemberIdMap($('.team-members--wrapper'));
      teamLocations.forEach(function(teamLocation) {
        var element = teamMemberIds[teamLocation.memberId];
        if (element) {
          createMarker(map, teamLocation, element);
        }
      });
      setMapView(map, teamLocations);
      $(teamMapWrapper).on('click', enableMapMouseWheelSupport);
      _destroy = function() {
        map.remove();
        $(teamMapWrapper).off('click', enableMapMouseWheelSupport);
      };
    }
    function destroy() {
      _destroy();
    }
    function enableMapMouseWheelSupport() {
      $(teamMapContainer).fadeOut(fadeDuration);
      $(teamMapWrapper).mouseleave(function() {
        $(teamMapContainer).fadeIn(fadeDuration);
      });
    }
  }
  function createMap(GMaps) {
    var map = new GMaps({
      div: '#map',
      lat: 51.505,
      lng: -0.09,
      disableDefaultUI: true
    });
    return map;
  }
  function getTeamMemberIdMap(container) {
    return reduce.call($('[data-member-id]', container), function(ids, el) {
      var id = el.getAttribute('data-member-id');
      if (id != null) {
        ids[id] = el;
      }
      return ids;
    }, {});
  }
  function createMarker(map, teamLocation, element) {
    map.addMarker({
      lat: teamLocation.latitude,
      lng: teamLocation.longitude,
      title: teamLocation.name,
      infoWindow: {content: $(element).html()}
    });
  }
  function setMapView(map, teamLocations) {
    var length = teamLocations.length;
    if (length > 1) {
      map.fitZoom();
    } else if (length == 1) {
      map.setCenter(teamLocations[0].latitude, teamLocations[0].longitude);
      map.setZoom(5);
    }
  }
  global.define = __define;
  return module.exports;
});

(function() {
var _removeDefine = System.get("@@amd-helpers").createDefine();
var IN_GLOBAL_SCOPE = false;
(function() {
  "use strict";
  var win = window;
  var setTimeout = win.setTimeout;
  var doc = document;
  var root = doc.documentElement;
  var head = doc['head'] || doc.getElementsByTagName("head")[0] || root;
  function contentLoaded(callback) {
    var addEventListener = doc['addEventListener'];
    var done = false,
        top = true,
        add = addEventListener ? 'addEventListener' : 'attachEvent',
        rem = addEventListener ? 'removeEventListener' : 'detachEvent',
        pre = addEventListener ? '' : 'on',
        init = function(e) {
          if (e.type == 'readystatechange' && doc.readyState != 'complete') {
            return;
          }
          (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
          if (!done && (done = true)) {
            callback.call(win, e.type || e);
          }
        },
        poll = function() {
          try {
            root.doScroll('left');
          } catch (e) {
            setTimeout(poll, 50);
            return;
          }
          init('poll');
        };
    if (doc.readyState == 'complete') {
      callback.call(win, 'lazy');
    } else {
      if (doc.createEventObject && root.doScroll) {
        try {
          top = !win.frameElement;
        } catch (e) {}
        if (top) {
          poll();
        }
      }
      doc[add](pre + 'DOMContentLoaded', init, false);
      doc[add](pre + 'readystatechange', init, false);
      win[add](pre + 'load', init, false);
    }
  }
  function loadStylesheetsFallingBack(stylesheets) {
    var n = stylesheets.length;
    function load(i) {
      if (i === n) {
        return;
      }
      var link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      if (i + 1 < n) {
        link.error = link.onerror = function() {
          load(i + 1);
        };
      }
      link.href = stylesheets[i];
      head.appendChild(link);
    }
    load(0);
  }
  var scriptQuery = '';
  for (var scripts = doc.scripts,
      i = scripts.length; --i >= 0; ) {
    var script = scripts[i];
    var match = script.src.match(/^[^?#]*\/run_prettify\.js(\?[^#]*)?(?:#.*)?$/);
    if (match) {
      scriptQuery = match[1] || '';
      script.parentNode.removeChild(script);
      break;
    }
  }
  var autorun = true;
  var langs = [];
  var skins = [];
  var callbacks = [];
  scriptQuery.replace(/[?&]([^&=]+)=([^&]+)/g, function(_, name, value) {
    value = decodeURIComponent(value);
    name = decodeURIComponent(name);
    if (name == 'autorun') {
      autorun = !/^[0fn]/i.test(value);
    } else if (name == 'lang') {
      langs.push(value);
    } else if (name == 'skin') {
      skins.push(value);
    } else if (name == 'callback') {
      callbacks.push(value);
    }
  });
  var LOADER_BASE_URL = 'https://google-code-prettify.googlecode.com/svn/loader';
  for (var i = 0,
      n = langs.length; i < n; ++i)
    (function(lang) {
      var script = doc.createElement("script");
      script.onload = script.onerror = script.onreadystatechange = function() {
        if (script && (!script.readyState || /loaded|complete/.test(script.readyState))) {
          script.onerror = script.onload = script.onreadystatechange = null;
          --pendingLanguages;
          checkPendingLanguages();
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          script = null;
        }
      };
      script.type = 'text/javascript';
      script.src = LOADER_BASE_URL + '/lang-' + encodeURIComponent(langs[i]) + '.js';
      head.insertBefore(script, head.firstChild);
    })(langs[i]);
  var pendingLanguages = langs.length;
  function checkPendingLanguages() {
    if (!pendingLanguages) {
      setTimeout(onLangsLoaded, 0);
    }
  }
  var skinUrls = [];
  for (var i = 0,
      n = skins.length; i < n; ++i) {
    skinUrls.push(LOADER_BASE_URL + '/skins/' + encodeURIComponent(skins[i]) + '.css');
  }
  skinUrls.push(LOADER_BASE_URL + '/prettify.css');
  loadStylesheetsFallingBack(skinUrls);
  var prettyPrint = (function() {
    window['PR_SHOULD_USE_CONTINUATION'] = true;
    var prettyPrintOne;
    var prettyPrint;
    (function() {
      var win = window;
      var FLOW_CONTROL_KEYWORDS = ["break,continue,do,else,for,if,return,while"];
      var C_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "auto,case,char,const,default," + "double,enum,extern,float,goto,inline,int,long,register,short,signed," + "sizeof,static,struct,switch,typedef,union,unsigned,void,volatile"];
      var COMMON_KEYWORDS = [C_KEYWORDS, "catch,class,delete,false,import," + "new,operator,private,protected,public,this,throw,true,try,typeof"];
      var CPP_KEYWORDS = [COMMON_KEYWORDS, "alignof,align_union,asm,axiom,bool," + "concept,concept_map,const_cast,constexpr,decltype,delegate," + "dynamic_cast,explicit,export,friend,generic,late_check," + "mutable,namespace,nullptr,property,reinterpret_cast,static_assert," + "static_cast,template,typeid,typename,using,virtual,where"];
      var JAVA_KEYWORDS = [COMMON_KEYWORDS, "abstract,assert,boolean,byte,extends,final,finally,implements,import," + "instanceof,interface,null,native,package,strictfp,super,synchronized," + "throws,transient"];
      var CSHARP_KEYWORDS = [JAVA_KEYWORDS, "as,base,by,checked,decimal,delegate,descending,dynamic,event," + "fixed,foreach,from,group,implicit,in,internal,into,is,let," + "lock,object,out,override,orderby,params,partial,readonly,ref,sbyte," + "sealed,stackalloc,string,select,uint,ulong,unchecked,unsafe,ushort," + "var,virtual,where"];
      var COFFEE_KEYWORDS = "all,and,by,catch,class,else,extends,false,finally," + "for,if,in,is,isnt,loop,new,no,not,null,of,off,on,or,return,super,then," + "throw,true,try,unless,until,when,while,yes";
      var JSCRIPT_KEYWORDS = [COMMON_KEYWORDS, "debugger,eval,export,function,get,null,set,undefined,var,with," + "Infinity,NaN"];
      var PERL_KEYWORDS = "caller,delete,die,do,dump,elsif,eval,exit,foreach,for," + "goto,if,import,last,local,my,next,no,our,print,package,redo,require," + "sub,undef,unless,until,use,wantarray,while,BEGIN,END";
      var PYTHON_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "and,as,assert,class,def,del," + "elif,except,exec,finally,from,global,import,in,is,lambda," + "nonlocal,not,or,pass,print,raise,try,with,yield," + "False,True,None"];
      var RUBY_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "alias,and,begin,case,class," + "def,defined,elsif,end,ensure,false,in,module,next,nil,not,or,redo," + "rescue,retry,self,super,then,true,undef,unless,until,when,yield," + "BEGIN,END"];
      var RUST_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "as,assert,const,copy,drop," + "enum,extern,fail,false,fn,impl,let,log,loop,match,mod,move,mut,priv," + "pub,pure,ref,self,static,struct,true,trait,type,unsafe,use"];
      var SH_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "case,done,elif,esac,eval,fi," + "function,in,local,set,then,until"];
      var ALL_KEYWORDS = [CPP_KEYWORDS, CSHARP_KEYWORDS, JSCRIPT_KEYWORDS, PERL_KEYWORDS, PYTHON_KEYWORDS, RUBY_KEYWORDS, SH_KEYWORDS];
      var C_TYPES = /^(DIR|FILE|vector|(de|priority_)?queue|list|stack|(const_)?iterator|(multi)?(set|map)|bitset|u?(int|float)\d*)\b/;
      var PR_STRING = 'str';
      var PR_KEYWORD = 'kwd';
      var PR_COMMENT = 'com';
      var PR_TYPE = 'typ';
      var PR_LITERAL = 'lit';
      var PR_PUNCTUATION = 'pun';
      var PR_PLAIN = 'pln';
      var PR_TAG = 'tag';
      var PR_DECLARATION = 'dec';
      var PR_SOURCE = 'src';
      var PR_ATTRIB_NAME = 'atn';
      var PR_ATTRIB_VALUE = 'atv';
      var PR_NOCODE = 'nocode';
      var REGEXP_PRECEDER_PATTERN = '(?:^^\\.?|[+-]|[!=]=?=?|\\#|%=?|&&?=?|\\(|\\*=?|[+\\-]=|->|\\/=?|::?|<<?=?|>>?>?=?|,|;|\\?|@|\\[|~|{|\\^\\^?=?|\\|\\|?=?|break|case|continue|delete|do|else|finally|instanceof|return|throw|try|typeof)\\s*';
      function combinePrefixPatterns(regexs) {
        var capturedGroupIndex = 0;
        var needToFoldCase = false;
        var ignoreCase = false;
        for (var i = 0,
            n = regexs.length; i < n; ++i) {
          var regex = regexs[i];
          if (regex.ignoreCase) {
            ignoreCase = true;
          } else if (/[a-z]/i.test(regex.source.replace(/\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|\\[^ux]/gi, ''))) {
            needToFoldCase = true;
            ignoreCase = false;
            break;
          }
        }
        var escapeCharToCodeUnit = {
          'b': 8,
          't': 9,
          'n': 0xa,
          'v': 0xb,
          'f': 0xc,
          'r': 0xd
        };
        function decodeEscape(charsetPart) {
          var cc0 = charsetPart.charCodeAt(0);
          if (cc0 !== 92) {
            return cc0;
          }
          var c1 = charsetPart.charAt(1);
          cc0 = escapeCharToCodeUnit[c1];
          if (cc0) {
            return cc0;
          } else if ('0' <= c1 && c1 <= '7') {
            return parseInt(charsetPart.substring(1), 8);
          } else if (c1 === 'u' || c1 === 'x') {
            return parseInt(charsetPart.substring(2), 16);
          } else {
            return charsetPart.charCodeAt(1);
          }
        }
        function encodeEscape(charCode) {
          if (charCode < 0x20) {
            return (charCode < 0x10 ? '\\x0' : '\\x') + charCode.toString(16);
          }
          var ch = String.fromCharCode(charCode);
          return (ch === '\\' || ch === '-' || ch === ']' || ch === '^') ? "\\" + ch : ch;
        }
        function caseFoldCharset(charSet) {
          var charsetParts = charSet.substring(1, charSet.length - 1).match(new RegExp('\\\\u[0-9A-Fa-f]{4}' + '|\\\\x[0-9A-Fa-f]{2}' + '|\\\\[0-3][0-7]{0,2}' + '|\\\\[0-7]{1,2}' + '|\\\\[\\s\\S]' + '|-' + '|[^-\\\\]', 'g'));
          var ranges = [];
          var inverse = charsetParts[0] === '^';
          var out = ['['];
          if (inverse) {
            out.push('^');
          }
          for (var i = inverse ? 1 : 0,
              n = charsetParts.length; i < n; ++i) {
            var p = charsetParts[i];
            if (/\\[bdsw]/i.test(p)) {
              out.push(p);
            } else {
              var start = decodeEscape(p);
              var end;
              if (i + 2 < n && '-' === charsetParts[i + 1]) {
                end = decodeEscape(charsetParts[i + 2]);
                i += 2;
              } else {
                end = start;
              }
              ranges.push([start, end]);
              if (!(end < 65 || start > 122)) {
                if (!(end < 65 || start > 90)) {
                  ranges.push([Math.max(65, start) | 32, Math.min(end, 90) | 32]);
                }
                if (!(end < 97 || start > 122)) {
                  ranges.push([Math.max(97, start) & ~32, Math.min(end, 122) & ~32]);
                }
              }
            }
          }
          ranges.sort(function(a, b) {
            return (a[0] - b[0]) || (b[1] - a[1]);
          });
          var consolidatedRanges = [];
          var lastRange = [];
          for (var i = 0; i < ranges.length; ++i) {
            var range = ranges[i];
            if (range[0] <= lastRange[1] + 1) {
              lastRange[1] = Math.max(lastRange[1], range[1]);
            } else {
              consolidatedRanges.push(lastRange = range);
            }
          }
          for (var i = 0; i < consolidatedRanges.length; ++i) {
            var range = consolidatedRanges[i];
            out.push(encodeEscape(range[0]));
            if (range[1] > range[0]) {
              if (range[1] + 1 > range[0]) {
                out.push('-');
              }
              out.push(encodeEscape(range[1]));
            }
          }
          out.push(']');
          return out.join('');
        }
        function allowAnywhereFoldCaseAndRenumberGroups(regex) {
          var parts = regex.source.match(new RegExp('(?:' + '\\[(?:[^\\x5C\\x5D]|\\\\[\\s\\S])*\\]' + '|\\\\u[A-Fa-f0-9]{4}' + '|\\\\x[A-Fa-f0-9]{2}' + '|\\\\[0-9]+' + '|\\\\[^ux0-9]' + '|\\(\\?[:!=]' + '|[\\(\\)\\^]' + '|[^\\x5B\\x5C\\(\\)\\^]+' + ')', 'g'));
          var n = parts.length;
          var capturedGroups = [];
          for (var i = 0,
              groupIndex = 0; i < n; ++i) {
            var p = parts[i];
            if (p === '(') {
              ++groupIndex;
            } else if ('\\' === p.charAt(0)) {
              var decimalValue = +p.substring(1);
              if (decimalValue) {
                if (decimalValue <= groupIndex) {
                  capturedGroups[decimalValue] = -1;
                } else {
                  parts[i] = encodeEscape(decimalValue);
                }
              }
            }
          }
          for (var i = 1; i < capturedGroups.length; ++i) {
            if (-1 === capturedGroups[i]) {
              capturedGroups[i] = ++capturedGroupIndex;
            }
          }
          for (var i = 0,
              groupIndex = 0; i < n; ++i) {
            var p = parts[i];
            if (p === '(') {
              ++groupIndex;
              if (!capturedGroups[groupIndex]) {
                parts[i] = '(?:';
              }
            } else if ('\\' === p.charAt(0)) {
              var decimalValue = +p.substring(1);
              if (decimalValue && decimalValue <= groupIndex) {
                parts[i] = '\\' + capturedGroups[decimalValue];
              }
            }
          }
          for (var i = 0; i < n; ++i) {
            if ('^' === parts[i] && '^' !== parts[i + 1]) {
              parts[i] = '';
            }
          }
          if (regex.ignoreCase && needToFoldCase) {
            for (var i = 0; i < n; ++i) {
              var p = parts[i];
              var ch0 = p.charAt(0);
              if (p.length >= 2 && ch0 === '[') {
                parts[i] = caseFoldCharset(p);
              } else if (ch0 !== '\\') {
                parts[i] = p.replace(/[a-zA-Z]/g, function(ch) {
                  var cc = ch.charCodeAt(0);
                  return '[' + String.fromCharCode(cc & ~32, cc | 32) + ']';
                });
              }
            }
          }
          return parts.join('');
        }
        var rewritten = [];
        for (var i = 0,
            n = regexs.length; i < n; ++i) {
          var regex = regexs[i];
          if (regex.global || regex.multiline) {
            throw new Error('' + regex);
          }
          rewritten.push('(?:' + allowAnywhereFoldCaseAndRenumberGroups(regex) + ')');
        }
        return new RegExp(rewritten.join('|'), ignoreCase ? 'gi' : 'g');
      }
      function extractSourceSpans(node, isPreformatted) {
        var nocode = /(?:^|\s)nocode(?:\s|$)/;
        var chunks = [];
        var length = 0;
        var spans = [];
        var k = 0;
        function walk(node) {
          var type = node.nodeType;
          if (type == 1) {
            if (nocode.test(node.className)) {
              return;
            }
            for (var child = node.firstChild; child; child = child.nextSibling) {
              walk(child);
            }
            var nodeName = node.nodeName.toLowerCase();
            if ('br' === nodeName || 'li' === nodeName) {
              chunks[k] = '\n';
              spans[k << 1] = length++;
              spans[(k++ << 1) | 1] = node;
            }
          } else if (type == 3 || type == 4) {
            var text = node.nodeValue;
            if (text.length) {
              if (!isPreformatted) {
                text = text.replace(/[ \t\r\n]+/g, ' ');
              } else {
                text = text.replace(/\r\n?/g, '\n');
              }
              chunks[k] = text;
              spans[k << 1] = length;
              length += text.length;
              spans[(k++ << 1) | 1] = node;
            }
          }
        }
        walk(node);
        return {
          sourceCode: chunks.join('').replace(/\n$/, ''),
          spans: spans
        };
      }
      function appendDecorations(basePos, sourceCode, langHandler, out) {
        if (!sourceCode) {
          return;
        }
        var job = {
          sourceCode: sourceCode,
          basePos: basePos
        };
        langHandler(job);
        out.push.apply(out, job.decorations);
      }
      var notWs = /\S/;
      function childContentWrapper(element) {
        var wrapper = undefined;
        for (var c = element.firstChild; c; c = c.nextSibling) {
          var type = c.nodeType;
          wrapper = (type === 1) ? (wrapper ? element : c) : (type === 3) ? (notWs.test(c.nodeValue) ? element : wrapper) : wrapper;
        }
        return wrapper === element ? undefined : wrapper;
      }
      function createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns) {
        var shortcuts = {};
        var tokenizer;
        (function() {
          var allPatterns = shortcutStylePatterns.concat(fallthroughStylePatterns);
          var allRegexs = [];
          var regexKeys = {};
          for (var i = 0,
              n = allPatterns.length; i < n; ++i) {
            var patternParts = allPatterns[i];
            var shortcutChars = patternParts[3];
            if (shortcutChars) {
              for (var c = shortcutChars.length; --c >= 0; ) {
                shortcuts[shortcutChars.charAt(c)] = patternParts;
              }
            }
            var regex = patternParts[1];
            var k = '' + regex;
            if (!regexKeys.hasOwnProperty(k)) {
              allRegexs.push(regex);
              regexKeys[k] = null;
            }
          }
          allRegexs.push(/[\0-\uffff]/);
          tokenizer = combinePrefixPatterns(allRegexs);
        })();
        var nPatterns = fallthroughStylePatterns.length;
        var decorate = function(job) {
          var sourceCode = job.sourceCode,
              basePos = job.basePos;
          var decorations = [basePos, PR_PLAIN];
          var pos = 0;
          var tokens = sourceCode.match(tokenizer) || [];
          var styleCache = {};
          for (var ti = 0,
              nTokens = tokens.length; ti < nTokens; ++ti) {
            var token = tokens[ti];
            var style = styleCache[token];
            var match = void 0;
            var isEmbedded;
            if (typeof style === 'string') {
              isEmbedded = false;
            } else {
              var patternParts = shortcuts[token.charAt(0)];
              if (patternParts) {
                match = token.match(patternParts[1]);
                style = patternParts[0];
              } else {
                for (var i = 0; i < nPatterns; ++i) {
                  patternParts = fallthroughStylePatterns[i];
                  match = token.match(patternParts[1]);
                  if (match) {
                    style = patternParts[0];
                    break;
                  }
                }
                if (!match) {
                  style = PR_PLAIN;
                }
              }
              isEmbedded = style.length >= 5 && 'lang-' === style.substring(0, 5);
              if (isEmbedded && !(match && typeof match[1] === 'string')) {
                isEmbedded = false;
                style = PR_SOURCE;
              }
              if (!isEmbedded) {
                styleCache[token] = style;
              }
            }
            var tokenStart = pos;
            pos += token.length;
            if (!isEmbedded) {
              decorations.push(basePos + tokenStart, style);
            } else {
              var embeddedSource = match[1];
              var embeddedSourceStart = token.indexOf(embeddedSource);
              var embeddedSourceEnd = embeddedSourceStart + embeddedSource.length;
              if (match[2]) {
                embeddedSourceEnd = token.length - match[2].length;
                embeddedSourceStart = embeddedSourceEnd - embeddedSource.length;
              }
              var lang = style.substring(5);
              appendDecorations(basePos + tokenStart, token.substring(0, embeddedSourceStart), decorate, decorations);
              appendDecorations(basePos + tokenStart + embeddedSourceStart, embeddedSource, langHandlerForExtension(lang, embeddedSource), decorations);
              appendDecorations(basePos + tokenStart + embeddedSourceEnd, token.substring(embeddedSourceEnd), decorate, decorations);
            }
          }
          job.decorations = decorations;
        };
        return decorate;
      }
      function sourceDecorator(options) {
        var shortcutStylePatterns = [],
            fallthroughStylePatterns = [];
        if (options['tripleQuotedStrings']) {
          shortcutStylePatterns.push([PR_STRING, /^(?:\'\'\'(?:[^\'\\]|\\[\s\S]|\'{1,2}(?=[^\']))*(?:\'\'\'|$)|\"\"\"(?:[^\"\\]|\\[\s\S]|\"{1,2}(?=[^\"]))*(?:\"\"\"|$)|\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$))/, null, '\'"']);
        } else if (options['multiLineStrings']) {
          shortcutStylePatterns.push([PR_STRING, /^(?:\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$)|\`(?:[^\\\`]|\\[\s\S])*(?:\`|$))/, null, '\'"`']);
        } else {
          shortcutStylePatterns.push([PR_STRING, /^(?:\'(?:[^\\\'\r\n]|\\.)*(?:\'|$)|\"(?:[^\\\"\r\n]|\\.)*(?:\"|$))/, null, '"\'']);
        }
        if (options['verbatimStrings']) {
          fallthroughStylePatterns.push([PR_STRING, /^@\"(?:[^\"]|\"\")*(?:\"|$)/, null]);
        }
        var hc = options['hashComments'];
        if (hc) {
          if (options['cStyleComments']) {
            if (hc > 1) {
              shortcutStylePatterns.push([PR_COMMENT, /^#(?:##(?:[^#]|#(?!##))*(?:###|$)|.*)/, null, '#']);
            } else {
              shortcutStylePatterns.push([PR_COMMENT, /^#(?:(?:define|e(?:l|nd)if|else|error|ifn?def|include|line|pragma|undef|warning)\b|[^\r\n]*)/, null, '#']);
            }
            fallthroughStylePatterns.push([PR_STRING, /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h(?:h|pp|\+\+)?|[a-z]\w*)>/, null]);
          } else {
            shortcutStylePatterns.push([PR_COMMENT, /^#[^\r\n]*/, null, '#']);
          }
        }
        if (options['cStyleComments']) {
          fallthroughStylePatterns.push([PR_COMMENT, /^\/\/[^\r\n]*/, null]);
          fallthroughStylePatterns.push([PR_COMMENT, /^\/\*[\s\S]*?(?:\*\/|$)/, null]);
        }
        var regexLiterals = options['regexLiterals'];
        if (regexLiterals) {
          var regexExcls = regexLiterals > 1 ? '' : '\n\r';
          var regexAny = regexExcls ? '.' : '[\\S\\s]';
          var REGEX_LITERAL = ('/(?=[^/*' + regexExcls + '])' + '(?:[^/\\x5B\\x5C' + regexExcls + ']' + '|\\x5C' + regexAny + '|\\x5B(?:[^\\x5C\\x5D' + regexExcls + ']' + '|\\x5C' + regexAny + ')*(?:\\x5D|$))+' + '/');
          fallthroughStylePatterns.push(['lang-regex', RegExp('^' + REGEXP_PRECEDER_PATTERN + '(' + REGEX_LITERAL + ')')]);
        }
        var types = options['types'];
        if (types) {
          fallthroughStylePatterns.push([PR_TYPE, types]);
        }
        var keywords = ("" + options['keywords']).replace(/^ | $/g, '');
        if (keywords.length) {
          fallthroughStylePatterns.push([PR_KEYWORD, new RegExp('^(?:' + keywords.replace(/[\s,]+/g, '|') + ')\\b'), null]);
        }
        shortcutStylePatterns.push([PR_PLAIN, /^\s+/, null, ' \r\n\t\xA0']);
        var punctuation = '^.[^\\s\\w.$@\'"`/\\\\]*';
        if (options['regexLiterals']) {
          punctuation += '(?!\s*\/)';
        }
        fallthroughStylePatterns.push([PR_LITERAL, /^@[a-z_$][a-z_$@0-9]*/i, null], [PR_TYPE, /^(?:[@_]?[A-Z]+[a-z][A-Za-z_$@0-9]*|\w+_t\b)/, null], [PR_PLAIN, /^[a-z_$][a-z_$@0-9]*/i, null], [PR_LITERAL, new RegExp('^(?:' + '0x[a-f0-9]+' + '|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)' + '(?:e[+\\-]?\\d+)?' + ')' + '[a-z]*', 'i'), null, '0123456789'], [PR_PLAIN, /^\\[\s\S]?/, null], [PR_PUNCTUATION, new RegExp(punctuation), null]);
        return createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns);
      }
      var decorateSource = sourceDecorator({
        'keywords': ALL_KEYWORDS,
        'hashComments': true,
        'cStyleComments': true,
        'multiLineStrings': true,
        'regexLiterals': true
      });
      function numberLines(node, opt_startLineNum, isPreformatted) {
        var nocode = /(?:^|\s)nocode(?:\s|$)/;
        var lineBreak = /\r\n?|\n/;
        var document = node.ownerDocument;
        var li = document.createElement('li');
        while (node.firstChild) {
          li.appendChild(node.firstChild);
        }
        var listItems = [li];
        function walk(node) {
          var type = node.nodeType;
          if (type == 1 && !nocode.test(node.className)) {
            if ('br' === node.nodeName) {
              breakAfter(node);
              if (node.parentNode) {
                node.parentNode.removeChild(node);
              }
            } else {
              for (var child = node.firstChild; child; child = child.nextSibling) {
                walk(child);
              }
            }
          } else if ((type == 3 || type == 4) && isPreformatted) {
            var text = node.nodeValue;
            var match = text.match(lineBreak);
            if (match) {
              var firstLine = text.substring(0, match.index);
              node.nodeValue = firstLine;
              var tail = text.substring(match.index + match[0].length);
              if (tail) {
                var parent = node.parentNode;
                parent.insertBefore(document.createTextNode(tail), node.nextSibling);
              }
              breakAfter(node);
              if (!firstLine) {
                node.parentNode.removeChild(node);
              }
            }
          }
        }
        function breakAfter(lineEndNode) {
          while (!lineEndNode.nextSibling) {
            lineEndNode = lineEndNode.parentNode;
            if (!lineEndNode) {
              return;
            }
          }
          function breakLeftOf(limit, copy) {
            var rightSide = copy ? limit.cloneNode(false) : limit;
            var parent = limit.parentNode;
            if (parent) {
              var parentClone = breakLeftOf(parent, 1);
              var next = limit.nextSibling;
              parentClone.appendChild(rightSide);
              for (var sibling = next; sibling; sibling = next) {
                next = sibling.nextSibling;
                parentClone.appendChild(sibling);
              }
            }
            return rightSide;
          }
          var copiedListItem = breakLeftOf(lineEndNode.nextSibling, 0);
          for (var parent; (parent = copiedListItem.parentNode) && parent.nodeType === 1; ) {
            copiedListItem = parent;
          }
          listItems.push(copiedListItem);
        }
        for (var i = 0; i < listItems.length; ++i) {
          walk(listItems[i]);
        }
        if (opt_startLineNum === (opt_startLineNum | 0)) {
          listItems[0].setAttribute('value', opt_startLineNum);
        }
        var ol = document.createElement('ol');
        ol.className = 'linenums';
        var offset = Math.max(0, ((opt_startLineNum - 1)) | 0) || 0;
        for (var i = 0,
            n = listItems.length; i < n; ++i) {
          li = listItems[i];
          li.className = 'L' + ((i + offset) % 10);
          if (!li.firstChild) {
            li.appendChild(document.createTextNode('\xA0'));
          }
          ol.appendChild(li);
        }
        node.appendChild(ol);
      }
      function recombineTagsAndDecorations(job) {
        var isIE8OrEarlier = /\bMSIE\s(\d+)/.exec(navigator.userAgent);
        isIE8OrEarlier = isIE8OrEarlier && +isIE8OrEarlier[1] <= 8;
        var newlineRe = /\n/g;
        var source = job.sourceCode;
        var sourceLength = source.length;
        var sourceIndex = 0;
        var spans = job.spans;
        var nSpans = spans.length;
        var spanIndex = 0;
        var decorations = job.decorations;
        var nDecorations = decorations.length;
        var decorationIndex = 0;
        decorations[nDecorations] = sourceLength;
        var decPos,
            i;
        for (i = decPos = 0; i < nDecorations; ) {
          if (decorations[i] !== decorations[i + 2]) {
            decorations[decPos++] = decorations[i++];
            decorations[decPos++] = decorations[i++];
          } else {
            i += 2;
          }
        }
        nDecorations = decPos;
        for (i = decPos = 0; i < nDecorations; ) {
          var startPos = decorations[i];
          var startDec = decorations[i + 1];
          var end = i + 2;
          while (end + 2 <= nDecorations && decorations[end + 1] === startDec) {
            end += 2;
          }
          decorations[decPos++] = startPos;
          decorations[decPos++] = startDec;
          i = end;
        }
        nDecorations = decorations.length = decPos;
        var sourceNode = job.sourceNode;
        var oldDisplay;
        if (sourceNode) {
          oldDisplay = sourceNode.style.display;
          sourceNode.style.display = 'none';
        }
        try {
          var decoration = null;
          while (spanIndex < nSpans) {
            var spanStart = spans[spanIndex];
            var spanEnd = spans[spanIndex + 2] || sourceLength;
            var decEnd = decorations[decorationIndex + 2] || sourceLength;
            var end = Math.min(spanEnd, decEnd);
            var textNode = spans[spanIndex + 1];
            var styledText;
            if (textNode.nodeType !== 1 && (styledText = source.substring(sourceIndex, end))) {
              if (isIE8OrEarlier) {
                styledText = styledText.replace(newlineRe, '\r');
              }
              textNode.nodeValue = styledText;
              var document = textNode.ownerDocument;
              var span = document.createElement('span');
              span.className = decorations[decorationIndex + 1];
              var parentNode = textNode.parentNode;
              parentNode.replaceChild(span, textNode);
              span.appendChild(textNode);
              if (sourceIndex < spanEnd) {
                spans[spanIndex + 1] = textNode = document.createTextNode(source.substring(end, spanEnd));
                parentNode.insertBefore(textNode, span.nextSibling);
              }
            }
            sourceIndex = end;
            if (sourceIndex >= spanEnd) {
              spanIndex += 2;
            }
            if (sourceIndex >= decEnd) {
              decorationIndex += 2;
            }
          }
        } finally {
          if (sourceNode) {
            sourceNode.style.display = oldDisplay;
          }
        }
      }
      var langHandlerRegistry = {};
      function registerLangHandler(handler, fileExtensions) {
        for (var i = fileExtensions.length; --i >= 0; ) {
          var ext = fileExtensions[i];
          if (!langHandlerRegistry.hasOwnProperty(ext)) {
            langHandlerRegistry[ext] = handler;
          } else if (win['console']) {
            console['warn']('cannot override language handler %s', ext);
          }
        }
      }
      function langHandlerForExtension(extension, source) {
        if (!(extension && langHandlerRegistry.hasOwnProperty(extension))) {
          extension = /^\s*</.test(source) ? 'default-markup' : 'default-code';
        }
        return langHandlerRegistry[extension];
      }
      registerLangHandler(decorateSource, ['default-code']);
      registerLangHandler(createSimpleLexer([], [[PR_PLAIN, /^[^<?]+/], [PR_DECLARATION, /^<!\w[^>]*(?:>|$)/], [PR_COMMENT, /^<\!--[\s\S]*?(?:-\->|$)/], ['lang-', /^<\?([\s\S]+?)(?:\?>|$)/], ['lang-', /^<%([\s\S]+?)(?:%>|$)/], [PR_PUNCTUATION, /^(?:<[%?]|[%?]>)/], ['lang-', /^<xmp\b[^>]*>([\s\S]+?)<\/xmp\b[^>]*>/i], ['lang-js', /^<script\b[^>]*>([\s\S]*?)(<\/script\b[^>]*>)/i], ['lang-css', /^<style\b[^>]*>([\s\S]*?)(<\/style\b[^>]*>)/i], ['lang-in.tag', /^(<\/?[a-z][^<>]*>)/i]]), ['default-markup', 'htm', 'html', 'mxml', 'xhtml', 'xml', 'xsl']);
      registerLangHandler(createSimpleLexer([[PR_PLAIN, /^[\s]+/, null, ' \t\r\n'], [PR_ATTRIB_VALUE, /^(?:\"[^\"]*\"?|\'[^\']*\'?)/, null, '\"\'']], [[PR_TAG, /^^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i], [PR_ATTRIB_NAME, /^(?!style[\s=]|on)[a-z](?:[\w:-]*\w)?/i], ['lang-uq.val', /^=\s*([^>\'\"\s]*(?:[^>\'\"\s\/]|\/(?=\s)))/], [PR_PUNCTUATION, /^[=<>\/]+/], ['lang-js', /^on\w+\s*=\s*\"([^\"]+)\"/i], ['lang-js', /^on\w+\s*=\s*\'([^\']+)\'/i], ['lang-js', /^on\w+\s*=\s*([^\"\'>\s]+)/i], ['lang-css', /^style\s*=\s*\"([^\"]+)\"/i], ['lang-css', /^style\s*=\s*\'([^\']+)\'/i], ['lang-css', /^style\s*=\s*([^\"\'>\s]+)/i]]), ['in.tag']);
      registerLangHandler(createSimpleLexer([], [[PR_ATTRIB_VALUE, /^[\s\S]+/]]), ['uq.val']);
      registerLangHandler(sourceDecorator({
        'keywords': CPP_KEYWORDS,
        'hashComments': true,
        'cStyleComments': true,
        'types': C_TYPES
      }), ['c', 'cc', 'cpp', 'cxx', 'cyc', 'm']);
      registerLangHandler(sourceDecorator({'keywords': 'null,true,false'}), ['json']);
      registerLangHandler(sourceDecorator({
        'keywords': CSHARP_KEYWORDS,
        'hashComments': true,
        'cStyleComments': true,
        'verbatimStrings': true,
        'types': C_TYPES
      }), ['cs']);
      registerLangHandler(sourceDecorator({
        'keywords': JAVA_KEYWORDS,
        'cStyleComments': true
      }), ['java']);
      registerLangHandler(sourceDecorator({
        'keywords': SH_KEYWORDS,
        'hashComments': true,
        'multiLineStrings': true
      }), ['bash', 'bsh', 'csh', 'sh']);
      registerLangHandler(sourceDecorator({
        'keywords': PYTHON_KEYWORDS,
        'hashComments': true,
        'multiLineStrings': true,
        'tripleQuotedStrings': true
      }), ['cv', 'py', 'python']);
      registerLangHandler(sourceDecorator({
        'keywords': PERL_KEYWORDS,
        'hashComments': true,
        'multiLineStrings': true,
        'regexLiterals': 2
      }), ['perl', 'pl', 'pm']);
      registerLangHandler(sourceDecorator({
        'keywords': RUBY_KEYWORDS,
        'hashComments': true,
        'multiLineStrings': true,
        'regexLiterals': true
      }), ['rb', 'ruby']);
      registerLangHandler(sourceDecorator({
        'keywords': JSCRIPT_KEYWORDS,
        'cStyleComments': true,
        'regexLiterals': true
      }), ['javascript', 'js']);
      registerLangHandler(sourceDecorator({
        'keywords': COFFEE_KEYWORDS,
        'hashComments': 3,
        'cStyleComments': true,
        'multilineStrings': true,
        'tripleQuotedStrings': true,
        'regexLiterals': true
      }), ['coffee']);
      registerLangHandler(sourceDecorator({
        'keywords': RUST_KEYWORDS,
        'cStyleComments': true,
        'multilineStrings': true
      }), ['rc', 'rs', 'rust']);
      registerLangHandler(createSimpleLexer([], [[PR_STRING, /^[\s\S]+/]]), ['regex']);
      function applyDecorator(job) {
        var opt_langExtension = job.langExtension;
        try {
          var sourceAndSpans = extractSourceSpans(job.sourceNode, job.pre);
          var source = sourceAndSpans.sourceCode;
          job.sourceCode = source;
          job.spans = sourceAndSpans.spans;
          job.basePos = 0;
          langHandlerForExtension(opt_langExtension, source)(job);
          recombineTagsAndDecorations(job);
        } catch (e) {
          if (win['console']) {
            console['log'](e && e['stack'] || e);
          }
        }
      }
      function $prettyPrintOne(sourceCodeHtml, opt_langExtension, opt_numberLines) {
        var container = document.createElement('div');
        container.innerHTML = '<pre>' + sourceCodeHtml + '</pre>';
        container = container.firstChild;
        if (opt_numberLines) {
          numberLines(container, opt_numberLines, true);
        }
        var job = {
          langExtension: opt_langExtension,
          numberLines: opt_numberLines,
          sourceNode: container,
          pre: 1
        };
        applyDecorator(job);
        return container.innerHTML;
      }
      function $prettyPrint(opt_whenDone, opt_root) {
        var root = opt_root || document.body;
        var doc = root.ownerDocument || document;
        function byTagName(tn) {
          return root.getElementsByTagName(tn);
        }
        var codeSegments = [byTagName('pre'), byTagName('code'), byTagName('xmp')];
        var elements = [];
        for (var i = 0; i < codeSegments.length; ++i) {
          for (var j = 0,
              n = codeSegments[i].length; j < n; ++j) {
            elements.push(codeSegments[i][j]);
          }
        }
        codeSegments = null;
        var clock = Date;
        if (!clock['now']) {
          clock = {'now': function() {
              return +(new Date);
            }};
        }
        var k = 0;
        var prettyPrintingJob;
        var langExtensionRe = /\blang(?:uage)?-([\w.]+)(?!\S)/;
        var prettyPrintRe = /\bprettyprint\b/;
        var prettyPrintedRe = /\bprettyprinted\b/;
        var preformattedTagNameRe = /pre|xmp/i;
        var codeRe = /^code$/i;
        var preCodeXmpRe = /^(?:pre|code|xmp)$/i;
        var EMPTY = {};
        function doWork() {
          var endTime = (win['PR_SHOULD_USE_CONTINUATION'] ? clock['now']() + 250 : Infinity);
          for (; k < elements.length && clock['now']() < endTime; k++) {
            var cs = elements[k];
            var attrs = EMPTY;
            {
              for (var preceder = cs; (preceder = preceder.previousSibling); ) {
                var nt = preceder.nodeType;
                var value = (nt === 7 || nt === 8) && preceder.nodeValue;
                if (value ? !/^\??prettify\b/.test(value) : (nt !== 3 || /\S/.test(preceder.nodeValue))) {
                  break;
                }
                if (value) {
                  attrs = {};
                  value.replace(/\b(\w+)=([\w:.%+-]+)/g, function(_, name, value) {
                    attrs[name] = value;
                  });
                  break;
                }
              }
            }
            var className = cs.className;
            if ((attrs !== EMPTY || prettyPrintRe.test(className)) && !prettyPrintedRe.test(className)) {
              var nested = false;
              for (var p = cs.parentNode; p; p = p.parentNode) {
                var tn = p.tagName;
                if (preCodeXmpRe.test(tn) && p.className && prettyPrintRe.test(p.className)) {
                  nested = true;
                  break;
                }
              }
              if (!nested) {
                cs.className += ' prettyprinted';
                var langExtension = attrs['lang'];
                if (!langExtension) {
                  langExtension = className.match(langExtensionRe);
                  var wrapper;
                  if (!langExtension && (wrapper = childContentWrapper(cs)) && codeRe.test(wrapper.tagName)) {
                    langExtension = wrapper.className.match(langExtensionRe);
                  }
                  if (langExtension) {
                    langExtension = langExtension[1];
                  }
                }
                var preformatted;
                if (preformattedTagNameRe.test(cs.tagName)) {
                  preformatted = 1;
                } else {
                  var currentStyle = cs['currentStyle'];
                  var defaultView = doc.defaultView;
                  var whitespace = (currentStyle ? currentStyle['whiteSpace'] : (defaultView && defaultView.getComputedStyle) ? defaultView.getComputedStyle(cs, null).getPropertyValue('white-space') : 0);
                  preformatted = whitespace && 'pre' === whitespace.substring(0, 3);
                }
                var lineNums = attrs['linenums'];
                if (!(lineNums = lineNums === 'true' || +lineNums)) {
                  lineNums = className.match(/\blinenums\b(?::(\d+))?/);
                  lineNums = lineNums ? lineNums[1] && lineNums[1].length ? +lineNums[1] : true : false;
                }
                if (lineNums) {
                  numberLines(cs, lineNums, preformatted);
                }
                prettyPrintingJob = {
                  langExtension: langExtension,
                  sourceNode: cs,
                  numberLines: lineNums,
                  pre: preformatted
                };
                applyDecorator(prettyPrintingJob);
              }
            }
          }
          if (k < elements.length) {
            setTimeout(doWork, 250);
          } else if ('function' === typeof opt_whenDone) {
            opt_whenDone();
          }
        }
        doWork();
      }
      var PR = win['PR'] = {
        'createSimpleLexer': createSimpleLexer,
        'registerLangHandler': registerLangHandler,
        'sourceDecorator': sourceDecorator,
        'PR_ATTRIB_NAME': PR_ATTRIB_NAME,
        'PR_ATTRIB_VALUE': PR_ATTRIB_VALUE,
        'PR_COMMENT': PR_COMMENT,
        'PR_DECLARATION': PR_DECLARATION,
        'PR_KEYWORD': PR_KEYWORD,
        'PR_LITERAL': PR_LITERAL,
        'PR_NOCODE': PR_NOCODE,
        'PR_PLAIN': PR_PLAIN,
        'PR_PUNCTUATION': PR_PUNCTUATION,
        'PR_SOURCE': PR_SOURCE,
        'PR_STRING': PR_STRING,
        'PR_TAG': PR_TAG,
        'PR_TYPE': PR_TYPE,
        'prettyPrintOne': IN_GLOBAL_SCOPE ? (win['prettyPrintOne'] = $prettyPrintOne) : (prettyPrintOne = $prettyPrintOne),
        'prettyPrint': prettyPrint = IN_GLOBAL_SCOPE ? (win['prettyPrint'] = $prettyPrint) : (prettyPrint = $prettyPrint)
      };
      if (typeof define === "function" && define['amd']) {
        define("google-code-prettify", [], function() {
          return PR;
        });
      }
    })();
    return prettyPrint;
  })();
  function onLangsLoaded() {
    if (autorun) {
      contentLoaded(function() {
        var n = callbacks.length;
        var callback = n ? function() {
          for (var i = 0; i < n; ++i) {
            (function(i) {
              setTimeout(function() {
                win['exports'][callbacks[i]].apply(win, arguments);
              }, 0);
            })(i);
          }
        } : void 0;
        prettyPrint(callback);
      });
    }
  }
  checkPendingLanguages();
}());

_removeDefine();
})();
System.registerDynamic("src/feature/prettify/main.js", ["npm:jquery@1.11.3", "github:tcollard/google-code-prettify@1.0.4/src/run_prettify"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var prettify = $__require('github:tcollard/google-code-prettify@1.0.4/src/run_prettify');
  module.exports = initPrettify;
  function initPrettify() {
    var plan = {
      ready: prettify.prettyPrint,
      destroy: function() {}
    };
    $(function() {
      plan.ready();
    }.bind(plan));
    return plan;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:moment@2.8.4/moment", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(undefined) {
    var moment,
        VERSION = '2.8.4',
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,
        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,
        locales = {},
        momentProperties = [],
        hasModule = (typeof module !== 'undefined' && module && module.exports),
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
        parseTokenOneOrTwoDigits = /\d\d?/,
        parseTokenOneToThreeDigits = /\d{1,3}/,
        parseTokenOneToFourDigits = /\d{1,4}/,
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/,
        parseTokenDigits = /\d+/,
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi,
        parseTokenT = /T/i,
        parseTokenOffsetMs = /[\+\-]?\d+/,
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/,
        parseTokenOneDigit = /\d/,
        parseTokenTwoDigits = /\d\d/,
        parseTokenThreeDigits = /\d{3}/,
        parseTokenFourDigits = /\d{4}/,
        parseTokenSixDigits = /[+-]?\d{6}/,
        parseTokenSignedNumber = /[+-]?\d+/,
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',
        isoDates = [['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/], ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/], ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/], ['GGGG-[W]WW', /\d{4}-W\d{2}/], ['YYYY-DDD', /\d{4}-\d{3}/]],
        isoTimes = [['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/], ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/], ['HH:mm', /(T| )\d\d:\d\d/], ['HH', /(T| )\d\d/]],
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
          'Milliseconds': 1,
          'Seconds': 1e3,
          'Minutes': 6e4,
          'Hours': 36e5,
          'Days': 864e5,
          'Months': 2592e6,
          'Years': 31536e6
        },
        unitAliases = {
          ms: 'millisecond',
          s: 'second',
          m: 'minute',
          h: 'hour',
          d: 'day',
          D: 'date',
          w: 'week',
          W: 'isoWeek',
          M: 'month',
          Q: 'quarter',
          y: 'year',
          DDD: 'dayOfYear',
          e: 'weekday',
          E: 'isoWeekday',
          gg: 'weekYear',
          GG: 'isoWeekYear'
        },
        camelFunctions = {
          dayofyear: 'dayOfYear',
          isoweekday: 'isoWeekday',
          isoweek: 'isoWeek',
          weekyear: 'weekYear',
          isoweekyear: 'isoWeekYear'
        },
        formatFunctions = {},
        relativeTimeThresholds = {
          s: 45,
          m: 45,
          h: 22,
          d: 26,
          M: 11
        },
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),
        formatTokenFunctions = {
          M: function() {
            return this.month() + 1;
          },
          MMM: function(format) {
            return this.localeData().monthsShort(this, format);
          },
          MMMM: function(format) {
            return this.localeData().months(this, format);
          },
          D: function() {
            return this.date();
          },
          DDD: function() {
            return this.dayOfYear();
          },
          d: function() {
            return this.day();
          },
          dd: function(format) {
            return this.localeData().weekdaysMin(this, format);
          },
          ddd: function(format) {
            return this.localeData().weekdaysShort(this, format);
          },
          dddd: function(format) {
            return this.localeData().weekdays(this, format);
          },
          w: function() {
            return this.week();
          },
          W: function() {
            return this.isoWeek();
          },
          YY: function() {
            return leftZeroFill(this.year() % 100, 2);
          },
          YYYY: function() {
            return leftZeroFill(this.year(), 4);
          },
          YYYYY: function() {
            return leftZeroFill(this.year(), 5);
          },
          YYYYYY: function() {
            var y = this.year(),
                sign = y >= 0 ? '+' : '-';
            return sign + leftZeroFill(Math.abs(y), 6);
          },
          gg: function() {
            return leftZeroFill(this.weekYear() % 100, 2);
          },
          gggg: function() {
            return leftZeroFill(this.weekYear(), 4);
          },
          ggggg: function() {
            return leftZeroFill(this.weekYear(), 5);
          },
          GG: function() {
            return leftZeroFill(this.isoWeekYear() % 100, 2);
          },
          GGGG: function() {
            return leftZeroFill(this.isoWeekYear(), 4);
          },
          GGGGG: function() {
            return leftZeroFill(this.isoWeekYear(), 5);
          },
          e: function() {
            return this.weekday();
          },
          E: function() {
            return this.isoWeekday();
          },
          a: function() {
            return this.localeData().meridiem(this.hours(), this.minutes(), true);
          },
          A: function() {
            return this.localeData().meridiem(this.hours(), this.minutes(), false);
          },
          H: function() {
            return this.hours();
          },
          h: function() {
            return this.hours() % 12 || 12;
          },
          m: function() {
            return this.minutes();
          },
          s: function() {
            return this.seconds();
          },
          S: function() {
            return toInt(this.milliseconds() / 100);
          },
          SS: function() {
            return leftZeroFill(toInt(this.milliseconds() / 10), 2);
          },
          SSS: function() {
            return leftZeroFill(this.milliseconds(), 3);
          },
          SSSS: function() {
            return leftZeroFill(this.milliseconds(), 3);
          },
          Z: function() {
            var a = -this.zone(),
                b = '+';
            if (a < 0) {
              a = -a;
              b = '-';
            }
            return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
          },
          ZZ: function() {
            var a = -this.zone(),
                b = '+';
            if (a < 0) {
              a = -a;
              b = '-';
            }
            return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
          },
          z: function() {
            return this.zoneAbbr();
          },
          zz: function() {
            return this.zoneName();
          },
          x: function() {
            return this.valueOf();
          },
          X: function() {
            return this.unix();
          },
          Q: function() {
            return this.quarter();
          }
        },
        deprecations = {},
        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];
    function dfl(a, b, c) {
      switch (arguments.length) {
        case 2:
          return a != null ? a : b;
        case 3:
          return a != null ? a : b != null ? b : c;
        default:
          throw new Error('Implement me');
      }
    }
    function hasOwnProp(a, b) {
      return hasOwnProperty.call(a, b);
    }
    function defaultParsingFlags() {
      return {
        empty: false,
        unusedTokens: [],
        unusedInput: [],
        overflow: -2,
        charsLeftOver: 0,
        nullInput: false,
        invalidMonth: null,
        invalidFormat: false,
        userInvalidated: false,
        iso: false
      };
    }
    function printMsg(msg) {
      if (moment.suppressDeprecationWarnings === false && typeof console !== 'undefined' && console.warn) {
        console.warn('Deprecation warning: ' + msg);
      }
    }
    function deprecate(msg, fn) {
      var firstTime = true;
      return extend(function() {
        if (firstTime) {
          printMsg(msg);
          firstTime = false;
        }
        return fn.apply(this, arguments);
      }, fn);
    }
    function deprecateSimple(name, msg) {
      if (!deprecations[name]) {
        printMsg(msg);
        deprecations[name] = true;
      }
    }
    function padToken(func, count) {
      return function(a) {
        return leftZeroFill(func.call(this, a), count);
      };
    }
    function ordinalizeToken(func, period) {
      return function(a) {
        return this.localeData().ordinal(func.call(this, a), period);
      };
    }
    while (ordinalizeTokens.length) {
      i = ordinalizeTokens.pop();
      formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
      i = paddedTokens.pop();
      formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);
    function Locale() {}
    function Moment(config, skipOverflow) {
      if (skipOverflow !== false) {
        checkOverflow(config);
      }
      copyConfig(this, config);
      this._d = new Date(+config._d);
    }
    function Duration(duration) {
      var normalizedInput = normalizeObjectUnits(duration),
          years = normalizedInput.year || 0,
          quarters = normalizedInput.quarter || 0,
          months = normalizedInput.month || 0,
          weeks = normalizedInput.week || 0,
          days = normalizedInput.day || 0,
          hours = normalizedInput.hour || 0,
          minutes = normalizedInput.minute || 0,
          seconds = normalizedInput.second || 0,
          milliseconds = normalizedInput.millisecond || 0;
      this._milliseconds = +milliseconds + seconds * 1e3 + minutes * 6e4 + hours * 36e5;
      this._days = +days + weeks * 7;
      this._months = +months + quarters * 3 + years * 12;
      this._data = {};
      this._locale = moment.localeData();
      this._bubble();
    }
    function extend(a, b) {
      for (var i in b) {
        if (hasOwnProp(b, i)) {
          a[i] = b[i];
        }
      }
      if (hasOwnProp(b, 'toString')) {
        a.toString = b.toString;
      }
      if (hasOwnProp(b, 'valueOf')) {
        a.valueOf = b.valueOf;
      }
      return a;
    }
    function copyConfig(to, from) {
      var i,
          prop,
          val;
      if (typeof from._isAMomentObject !== 'undefined') {
        to._isAMomentObject = from._isAMomentObject;
      }
      if (typeof from._i !== 'undefined') {
        to._i = from._i;
      }
      if (typeof from._f !== 'undefined') {
        to._f = from._f;
      }
      if (typeof from._l !== 'undefined') {
        to._l = from._l;
      }
      if (typeof from._strict !== 'undefined') {
        to._strict = from._strict;
      }
      if (typeof from._tzm !== 'undefined') {
        to._tzm = from._tzm;
      }
      if (typeof from._isUTC !== 'undefined') {
        to._isUTC = from._isUTC;
      }
      if (typeof from._offset !== 'undefined') {
        to._offset = from._offset;
      }
      if (typeof from._pf !== 'undefined') {
        to._pf = from._pf;
      }
      if (typeof from._locale !== 'undefined') {
        to._locale = from._locale;
      }
      if (momentProperties.length > 0) {
        for (i in momentProperties) {
          prop = momentProperties[i];
          val = from[prop];
          if (typeof val !== 'undefined') {
            to[prop] = val;
          }
        }
      }
      return to;
    }
    function absRound(number) {
      if (number < 0) {
        return Math.ceil(number);
      } else {
        return Math.floor(number);
      }
    }
    function leftZeroFill(number, targetLength, forceSign) {
      var output = '' + Math.abs(number),
          sign = number >= 0;
      while (output.length < targetLength) {
        output = '0' + output;
      }
      return (sign ? (forceSign ? '+' : '') : '-') + output;
    }
    function positiveMomentsDifference(base, other) {
      var res = {
        milliseconds: 0,
        months: 0
      };
      res.months = other.month() - base.month() + (other.year() - base.year()) * 12;
      if (base.clone().add(res.months, 'M').isAfter(other)) {
        --res.months;
      }
      res.milliseconds = +other - +(base.clone().add(res.months, 'M'));
      return res;
    }
    function momentsDifference(base, other) {
      var res;
      other = makeAs(other, base);
      if (base.isBefore(other)) {
        res = positiveMomentsDifference(base, other);
      } else {
        res = positiveMomentsDifference(other, base);
        res.milliseconds = -res.milliseconds;
        res.months = -res.months;
      }
      return res;
    }
    function createAdder(direction, name) {
      return function(val, period) {
        var dur,
            tmp;
        if (period !== null && !isNaN(+period)) {
          deprecateSimple(name, 'moment().' + name + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
          tmp = val;
          val = period;
          period = tmp;
        }
        val = typeof val === 'string' ? +val : val;
        dur = moment.duration(val, period);
        addOrSubtractDurationFromMoment(this, dur, direction);
        return this;
      };
    }
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
      var milliseconds = duration._milliseconds,
          days = duration._days,
          months = duration._months;
      updateOffset = updateOffset == null ? true : updateOffset;
      if (milliseconds) {
        mom._d.setTime(+mom._d + milliseconds * isAdding);
      }
      if (days) {
        rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
      }
      if (months) {
        rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
      }
      if (updateOffset) {
        moment.updateOffset(mom, days || months);
      }
    }
    function isArray(input) {
      return Object.prototype.toString.call(input) === '[object Array]';
    }
    function isDate(input) {
      return Object.prototype.toString.call(input) === '[object Date]' || input instanceof Date;
    }
    function compareArrays(array1, array2, dontConvert) {
      var len = Math.min(array1.length, array2.length),
          lengthDiff = Math.abs(array1.length - array2.length),
          diffs = 0,
          i;
      for (i = 0; i < len; i++) {
        if ((dontConvert && array1[i] !== array2[i]) || (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
          diffs++;
        }
      }
      return diffs + lengthDiff;
    }
    function normalizeUnits(units) {
      if (units) {
        var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
        units = unitAliases[units] || camelFunctions[lowered] || lowered;
      }
      return units;
    }
    function normalizeObjectUnits(inputObject) {
      var normalizedInput = {},
          normalizedProp,
          prop;
      for (prop in inputObject) {
        if (hasOwnProp(inputObject, prop)) {
          normalizedProp = normalizeUnits(prop);
          if (normalizedProp) {
            normalizedInput[normalizedProp] = inputObject[prop];
          }
        }
      }
      return normalizedInput;
    }
    function makeList(field) {
      var count,
          setter;
      if (field.indexOf('week') === 0) {
        count = 7;
        setter = 'day';
      } else if (field.indexOf('month') === 0) {
        count = 12;
        setter = 'month';
      } else {
        return;
      }
      moment[field] = function(format, index) {
        var i,
            getter,
            method = moment._locale[field],
            results = [];
        if (typeof format === 'number') {
          index = format;
          format = undefined;
        }
        getter = function(i) {
          var m = moment().utc().set(setter, i);
          return method.call(moment._locale, m, format || '');
        };
        if (index != null) {
          return getter(index);
        } else {
          for (i = 0; i < count; i++) {
            results.push(getter(i));
          }
          return results;
        }
      };
    }
    function toInt(argumentForCoercion) {
      var coercedNumber = +argumentForCoercion,
          value = 0;
      if (coercedNumber !== 0 && isFinite(coercedNumber)) {
        if (coercedNumber >= 0) {
          value = Math.floor(coercedNumber);
        } else {
          value = Math.ceil(coercedNumber);
        }
      }
      return value;
    }
    function daysInMonth(year, month) {
      return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }
    function weeksInYear(year, dow, doy) {
      return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }
    function daysInYear(year) {
      return isLeapYear(year) ? 366 : 365;
    }
    function isLeapYear(year) {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }
    function checkOverflow(m) {
      var overflow;
      if (m._a && m._pf.overflow === -2) {
        overflow = m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH : m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE : m._a[HOUR] < 0 || m._a[HOUR] > 24 || (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 || m._a[SECOND] !== 0 || m._a[MILLISECOND] !== 0)) ? HOUR : m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE : m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND : m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND : -1;
        if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
          overflow = DATE;
        }
        m._pf.overflow = overflow;
      }
    }
    function isValid(m) {
      if (m._isValid == null) {
        m._isValid = !isNaN(m._d.getTime()) && m._pf.overflow < 0 && !m._pf.empty && !m._pf.invalidMonth && !m._pf.nullInput && !m._pf.invalidFormat && !m._pf.userInvalidated;
        if (m._strict) {
          m._isValid = m._isValid && m._pf.charsLeftOver === 0 && m._pf.unusedTokens.length === 0 && m._pf.bigHour === undefined;
        }
      }
      return m._isValid;
    }
    function normalizeLocale(key) {
      return key ? key.toLowerCase().replace('_', '-') : key;
    }
    function chooseLocale(names) {
      var i = 0,
          j,
          next,
          locale,
          split;
      while (i < names.length) {
        split = normalizeLocale(names[i]).split('-');
        j = split.length;
        next = normalizeLocale(names[i + 1]);
        next = next ? next.split('-') : null;
        while (j > 0) {
          locale = loadLocale(split.slice(0, j).join('-'));
          if (locale) {
            return locale;
          }
          if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
            break;
          }
          j--;
        }
        i++;
      }
      return null;
    }
    function loadLocale(name) {
      var oldLocale = null;
      if (!locales[name] && hasModule) {
        try {
          oldLocale = moment.locale();
          $__require('./locale/' + name);
          moment.locale(oldLocale);
        } catch (e) {}
      }
      return locales[name];
    }
    function makeAs(input, model) {
      var res,
          diff;
      if (model._isUTC) {
        res = model.clone();
        diff = (moment.isMoment(input) || isDate(input) ? +input : +moment(input)) - (+res);
        res._d.setTime(+res._d + diff);
        moment.updateOffset(res, false);
        return res;
      } else {
        return moment(input).local();
      }
    }
    extend(Locale.prototype, {
      set: function(config) {
        var prop,
            i;
        for (i in config) {
          prop = config[i];
          if (typeof prop === 'function') {
            this[i] = prop;
          } else {
            this['_' + i] = prop;
          }
        }
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
      },
      _months: 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
      months: function(m) {
        return this._months[m.month()];
      },
      _monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
      monthsShort: function(m) {
        return this._monthsShort[m.month()];
      },
      monthsParse: function(monthName, format, strict) {
        var i,
            mom,
            regex;
        if (!this._monthsParse) {
          this._monthsParse = [];
          this._longMonthsParse = [];
          this._shortMonthsParse = [];
        }
        for (i = 0; i < 12; i++) {
          mom = moment.utc([2000, i]);
          if (strict && !this._longMonthsParse[i]) {
            this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
            this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
          }
          if (!strict && !this._monthsParse[i]) {
            regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
            this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
          }
          if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
            return i;
          } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
            return i;
          } else if (!strict && this._monthsParse[i].test(monthName)) {
            return i;
          }
        }
      },
      _weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
      weekdays: function(m) {
        return this._weekdays[m.day()];
      },
      _weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
      weekdaysShort: function(m) {
        return this._weekdaysShort[m.day()];
      },
      _weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
      weekdaysMin: function(m) {
        return this._weekdaysMin[m.day()];
      },
      weekdaysParse: function(weekdayName) {
        var i,
            mom,
            regex;
        if (!this._weekdaysParse) {
          this._weekdaysParse = [];
        }
        for (i = 0; i < 7; i++) {
          if (!this._weekdaysParse[i]) {
            mom = moment([2000, 1]).day(i);
            regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
            this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
          }
          if (this._weekdaysParse[i].test(weekdayName)) {
            return i;
          }
        }
      },
      _longDateFormat: {
        LTS: 'h:mm:ss A',
        LT: 'h:mm A',
        L: 'MM/DD/YYYY',
        LL: 'MMMM D, YYYY',
        LLL: 'MMMM D, YYYY LT',
        LLLL: 'dddd, MMMM D, YYYY LT'
      },
      longDateFormat: function(key) {
        var output = this._longDateFormat[key];
        if (!output && this._longDateFormat[key.toUpperCase()]) {
          output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function(val) {
            return val.slice(1);
          });
          this._longDateFormat[key] = output;
        }
        return output;
      },
      isPM: function(input) {
        return ((input + '').toLowerCase().charAt(0) === 'p');
      },
      _meridiemParse: /[ap]\.?m?\.?/i,
      meridiem: function(hours, minutes, isLower) {
        if (hours > 11) {
          return isLower ? 'pm' : 'PM';
        } else {
          return isLower ? 'am' : 'AM';
        }
      },
      _calendar: {
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'dddd [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: '[Last] dddd [at] LT',
        sameElse: 'L'
      },
      calendar: function(key, mom, now) {
        var output = this._calendar[key];
        return typeof output === 'function' ? output.apply(mom, [now]) : output;
      },
      _relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s: 'a few seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: 'an hour',
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        M: 'a month',
        MM: '%d months',
        y: 'a year',
        yy: '%d years'
      },
      relativeTime: function(number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (typeof output === 'function') ? output(number, withoutSuffix, string, isFuture) : output.replace(/%d/i, number);
      },
      pastFuture: function(diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
      },
      ordinal: function(number) {
        return this._ordinal.replace('%d', number);
      },
      _ordinal: '%d',
      _ordinalParse: /\d{1,2}/,
      preparse: function(string) {
        return string;
      },
      postformat: function(string) {
        return string;
      },
      week: function(mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
      },
      _week: {
        dow: 0,
        doy: 6
      },
      _invalidDate: 'Invalid date',
      invalidDate: function() {
        return this._invalidDate;
      }
    });
    function removeFormattingTokens(input) {
      if (input.match(/\[[\s\S]/)) {
        return input.replace(/^\[|\]$/g, '');
      }
      return input.replace(/\\/g, '');
    }
    function makeFormatFunction(format) {
      var array = format.match(formattingTokens),
          i,
          length;
      for (i = 0, length = array.length; i < length; i++) {
        if (formatTokenFunctions[array[i]]) {
          array[i] = formatTokenFunctions[array[i]];
        } else {
          array[i] = removeFormattingTokens(array[i]);
        }
      }
      return function(mom) {
        var output = '';
        for (i = 0; i < length; i++) {
          output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
        }
        return output;
      };
    }
    function formatMoment(m, format) {
      if (!m.isValid()) {
        return m.localeData().invalidDate();
      }
      format = expandFormat(format, m.localeData());
      if (!formatFunctions[format]) {
        formatFunctions[format] = makeFormatFunction(format);
      }
      return formatFunctions[format](m);
    }
    function expandFormat(format, locale) {
      var i = 5;
      function replaceLongDateFormatTokens(input) {
        return locale.longDateFormat(input) || input;
      }
      localFormattingTokens.lastIndex = 0;
      while (i >= 0 && localFormattingTokens.test(format)) {
        format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        localFormattingTokens.lastIndex = 0;
        i -= 1;
      }
      return format;
    }
    function getParseRegexForToken(token, config) {
      var a,
          strict = config._strict;
      switch (token) {
        case 'Q':
          return parseTokenOneDigit;
        case 'DDDD':
          return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
          return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
          return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
          return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
          if (strict) {
            return parseTokenOneDigit;
          }
        case 'SS':
          if (strict) {
            return parseTokenTwoDigits;
          }
        case 'SSS':
          if (strict) {
            return parseTokenThreeDigits;
          }
        case 'DDD':
          return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
          return parseTokenWord;
        case 'a':
        case 'A':
          return config._locale._meridiemParse;
        case 'x':
          return parseTokenOffsetMs;
        case 'X':
          return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
          return parseTokenTimezone;
        case 'T':
          return parseTokenT;
        case 'SSSS':
          return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
          return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
          return parseTokenOneOrTwoDigits;
        case 'Do':
          return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default:
          a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
          return a;
      }
    }
    function timezoneMinutesFromString(string) {
      string = string || '';
      var possibleTzMatches = (string.match(parseTokenTimezone) || []),
          tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
          parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
          minutes = +(parts[1] * 60) + toInt(parts[2]);
      return parts[0] === '+' ? -minutes : minutes;
    }
    function addTimeToArrayFromToken(token, input, config) {
      var a,
          datePartArray = config._a;
      switch (token) {
        case 'Q':
          if (input != null) {
            datePartArray[MONTH] = (toInt(input) - 1) * 3;
          }
          break;
        case 'M':
        case 'MM':
          if (input != null) {
            datePartArray[MONTH] = toInt(input) - 1;
          }
          break;
        case 'MMM':
        case 'MMMM':
          a = config._locale.monthsParse(input, token, config._strict);
          if (a != null) {
            datePartArray[MONTH] = a;
          } else {
            config._pf.invalidMonth = input;
          }
          break;
        case 'D':
        case 'DD':
          if (input != null) {
            datePartArray[DATE] = toInt(input);
          }
          break;
        case 'Do':
          if (input != null) {
            datePartArray[DATE] = toInt(parseInt(input.match(/\d{1,2}/)[0], 10));
          }
          break;
        case 'DDD':
        case 'DDDD':
          if (input != null) {
            config._dayOfYear = toInt(input);
          }
          break;
        case 'YY':
          datePartArray[YEAR] = moment.parseTwoDigitYear(input);
          break;
        case 'YYYY':
        case 'YYYYY':
        case 'YYYYYY':
          datePartArray[YEAR] = toInt(input);
          break;
        case 'a':
        case 'A':
          config._isPm = config._locale.isPM(input);
          break;
        case 'h':
        case 'hh':
          config._pf.bigHour = true;
        case 'H':
        case 'HH':
          datePartArray[HOUR] = toInt(input);
          break;
        case 'm':
        case 'mm':
          datePartArray[MINUTE] = toInt(input);
          break;
        case 's':
        case 'ss':
          datePartArray[SECOND] = toInt(input);
          break;
        case 'S':
        case 'SS':
        case 'SSS':
        case 'SSSS':
          datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
          break;
        case 'x':
          config._d = new Date(toInt(input));
          break;
        case 'X':
          config._d = new Date(parseFloat(input) * 1000);
          break;
        case 'Z':
        case 'ZZ':
          config._useUTC = true;
          config._tzm = timezoneMinutesFromString(input);
          break;
        case 'dd':
        case 'ddd':
        case 'dddd':
          a = config._locale.weekdaysParse(input);
          if (a != null) {
            config._w = config._w || {};
            config._w['d'] = a;
          } else {
            config._pf.invalidWeekday = input;
          }
          break;
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
          token = token.substr(0, 1);
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
          token = token.substr(0, 2);
          if (input) {
            config._w = config._w || {};
            config._w[token] = toInt(input);
          }
          break;
        case 'gg':
        case 'GG':
          config._w = config._w || {};
          config._w[token] = moment.parseTwoDigitYear(input);
      }
    }
    function dayOfYearFromWeekInfo(config) {
      var w,
          weekYear,
          week,
          weekday,
          dow,
          doy,
          temp;
      w = config._w;
      if (w.GG != null || w.W != null || w.E != null) {
        dow = 1;
        doy = 4;
        weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
        week = dfl(w.W, 1);
        weekday = dfl(w.E, 1);
      } else {
        dow = config._locale._week.dow;
        doy = config._locale._week.doy;
        weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
        week = dfl(w.w, 1);
        if (w.d != null) {
          weekday = w.d;
          if (weekday < dow) {
            ++week;
          }
        } else if (w.e != null) {
          weekday = w.e + dow;
        } else {
          weekday = dow;
        }
      }
      temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);
      config._a[YEAR] = temp.year;
      config._dayOfYear = temp.dayOfYear;
    }
    function dateFromConfig(config) {
      var i,
          date,
          input = [],
          currentDate,
          yearToUse;
      if (config._d) {
        return;
      }
      currentDate = currentDateArray(config);
      if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
        dayOfYearFromWeekInfo(config);
      }
      if (config._dayOfYear) {
        yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);
        if (config._dayOfYear > daysInYear(yearToUse)) {
          config._pf._overflowDayOfYear = true;
        }
        date = makeUTCDate(yearToUse, 0, config._dayOfYear);
        config._a[MONTH] = date.getUTCMonth();
        config._a[DATE] = date.getUTCDate();
      }
      for (i = 0; i < 3 && config._a[i] == null; ++i) {
        config._a[i] = input[i] = currentDate[i];
      }
      for (; i < 7; i++) {
        config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
      }
      if (config._a[HOUR] === 24 && config._a[MINUTE] === 0 && config._a[SECOND] === 0 && config._a[MILLISECOND] === 0) {
        config._nextDay = true;
        config._a[HOUR] = 0;
      }
      config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
      if (config._tzm != null) {
        config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
      }
      if (config._nextDay) {
        config._a[HOUR] = 24;
      }
    }
    function dateFromObject(config) {
      var normalizedInput;
      if (config._d) {
        return;
      }
      normalizedInput = normalizeObjectUnits(config._i);
      config._a = [normalizedInput.year, normalizedInput.month, normalizedInput.day || normalizedInput.date, normalizedInput.hour, normalizedInput.minute, normalizedInput.second, normalizedInput.millisecond];
      dateFromConfig(config);
    }
    function currentDateArray(config) {
      var now = new Date();
      if (config._useUTC) {
        return [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
      } else {
        return [now.getFullYear(), now.getMonth(), now.getDate()];
      }
    }
    function makeDateFromStringAndFormat(config) {
      if (config._f === moment.ISO_8601) {
        parseISO(config);
        return;
      }
      config._a = [];
      config._pf.empty = true;
      var string = '' + config._i,
          i,
          parsedInput,
          tokens,
          token,
          skipped,
          stringLength = string.length,
          totalParsedInputLength = 0;
      tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];
      for (i = 0; i < tokens.length; i++) {
        token = tokens[i];
        parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
        if (parsedInput) {
          skipped = string.substr(0, string.indexOf(parsedInput));
          if (skipped.length > 0) {
            config._pf.unusedInput.push(skipped);
          }
          string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
          totalParsedInputLength += parsedInput.length;
        }
        if (formatTokenFunctions[token]) {
          if (parsedInput) {
            config._pf.empty = false;
          } else {
            config._pf.unusedTokens.push(token);
          }
          addTimeToArrayFromToken(token, parsedInput, config);
        } else if (config._strict && !parsedInput) {
          config._pf.unusedTokens.push(token);
        }
      }
      config._pf.charsLeftOver = stringLength - totalParsedInputLength;
      if (string.length > 0) {
        config._pf.unusedInput.push(string);
      }
      if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
        config._pf.bigHour = undefined;
      }
      if (config._isPm && config._a[HOUR] < 12) {
        config._a[HOUR] += 12;
      }
      if (config._isPm === false && config._a[HOUR] === 12) {
        config._a[HOUR] = 0;
      }
      dateFromConfig(config);
      checkOverflow(config);
    }
    function unescapeFormat(s) {
      return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function(matched, p1, p2, p3, p4) {
        return p1 || p2 || p3 || p4;
      });
    }
    function regexpEscape(s) {
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
    function makeDateFromStringAndArray(config) {
      var tempConfig,
          bestMoment,
          scoreToBeat,
          i,
          currentScore;
      if (config._f.length === 0) {
        config._pf.invalidFormat = true;
        config._d = new Date(NaN);
        return;
      }
      for (i = 0; i < config._f.length; i++) {
        currentScore = 0;
        tempConfig = copyConfig({}, config);
        if (config._useUTC != null) {
          tempConfig._useUTC = config._useUTC;
        }
        tempConfig._pf = defaultParsingFlags();
        tempConfig._f = config._f[i];
        makeDateFromStringAndFormat(tempConfig);
        if (!isValid(tempConfig)) {
          continue;
        }
        currentScore += tempConfig._pf.charsLeftOver;
        currentScore += tempConfig._pf.unusedTokens.length * 10;
        tempConfig._pf.score = currentScore;
        if (scoreToBeat == null || currentScore < scoreToBeat) {
          scoreToBeat = currentScore;
          bestMoment = tempConfig;
        }
      }
      extend(config, bestMoment || tempConfig);
    }
    function parseISO(config) {
      var i,
          l,
          string = config._i,
          match = isoRegex.exec(string);
      if (match) {
        config._pf.iso = true;
        for (i = 0, l = isoDates.length; i < l; i++) {
          if (isoDates[i][1].exec(string)) {
            config._f = isoDates[i][0] + (match[6] || ' ');
            break;
          }
        }
        for (i = 0, l = isoTimes.length; i < l; i++) {
          if (isoTimes[i][1].exec(string)) {
            config._f += isoTimes[i][0];
            break;
          }
        }
        if (string.match(parseTokenTimezone)) {
          config._f += 'Z';
        }
        makeDateFromStringAndFormat(config);
      } else {
        config._isValid = false;
      }
    }
    function makeDateFromString(config) {
      parseISO(config);
      if (config._isValid === false) {
        delete config._isValid;
        moment.createFromInputFallback(config);
      }
    }
    function map(arr, fn) {
      var res = [],
          i;
      for (i = 0; i < arr.length; ++i) {
        res.push(fn(arr[i], i));
      }
      return res;
    }
    function makeDateFromInput(config) {
      var input = config._i,
          matched;
      if (input === undefined) {
        config._d = new Date();
      } else if (isDate(input)) {
        config._d = new Date(+input);
      } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
        config._d = new Date(+matched[1]);
      } else if (typeof input === 'string') {
        makeDateFromString(config);
      } else if (isArray(input)) {
        config._a = map(input.slice(0), function(obj) {
          return parseInt(obj, 10);
        });
        dateFromConfig(config);
      } else if (typeof(input) === 'object') {
        dateFromObject(config);
      } else if (typeof(input) === 'number') {
        config._d = new Date(input);
      } else {
        moment.createFromInputFallback(config);
      }
    }
    function makeDate(y, m, d, h, M, s, ms) {
      var date = new Date(y, m, d, h, M, s, ms);
      if (y < 1970) {
        date.setFullYear(y);
      }
      return date;
    }
    function makeUTCDate(y) {
      var date = new Date(Date.UTC.apply(null, arguments));
      if (y < 1970) {
        date.setUTCFullYear(y);
      }
      return date;
    }
    function parseWeekday(input, locale) {
      if (typeof input === 'string') {
        if (!isNaN(input)) {
          input = parseInt(input, 10);
        } else {
          input = locale.weekdaysParse(input);
          if (typeof input !== 'number') {
            return null;
          }
        }
      }
      return input;
    }
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
      return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }
    function relativeTime(posNegDuration, withoutSuffix, locale) {
      var duration = moment.duration(posNegDuration).abs(),
          seconds = round(duration.as('s')),
          minutes = round(duration.as('m')),
          hours = round(duration.as('h')),
          days = round(duration.as('d')),
          months = round(duration.as('M')),
          years = round(duration.as('y')),
          args = seconds < relativeTimeThresholds.s && ['s', seconds] || minutes === 1 && ['m'] || minutes < relativeTimeThresholds.m && ['mm', minutes] || hours === 1 && ['h'] || hours < relativeTimeThresholds.h && ['hh', hours] || days === 1 && ['d'] || days < relativeTimeThresholds.d && ['dd', days] || months === 1 && ['M'] || months < relativeTimeThresholds.M && ['MM', months] || years === 1 && ['y'] || ['yy', years];
      args[2] = withoutSuffix;
      args[3] = +posNegDuration > 0;
      args[4] = locale;
      return substituteTimeAgo.apply({}, args);
    }
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
      var end = firstDayOfWeekOfYear - firstDayOfWeek,
          daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
          adjustedMoment;
      if (daysToDayOfWeek > end) {
        daysToDayOfWeek -= 7;
      }
      if (daysToDayOfWeek < end - 7) {
        daysToDayOfWeek += 7;
      }
      adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
      return {
        week: Math.ceil(adjustedMoment.dayOfYear() / 7),
        year: adjustedMoment.year()
      };
    }
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
      var d = makeUTCDate(year, 0, 1).getUTCDay(),
          daysToAdd,
          dayOfYear;
      d = d === 0 ? 7 : d;
      weekday = weekday != null ? weekday : firstDayOfWeek;
      daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
      dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;
      return {
        year: dayOfYear > 0 ? year : year - 1,
        dayOfYear: dayOfYear > 0 ? dayOfYear : daysInYear(year - 1) + dayOfYear
      };
    }
    function makeMoment(config) {
      var input = config._i,
          format = config._f,
          res;
      config._locale = config._locale || moment.localeData(config._l);
      if (input === null || (format === undefined && input === '')) {
        return moment.invalid({nullInput: true});
      }
      if (typeof input === 'string') {
        config._i = input = config._locale.preparse(input);
      }
      if (moment.isMoment(input)) {
        return new Moment(input, true);
      } else if (format) {
        if (isArray(format)) {
          makeDateFromStringAndArray(config);
        } else {
          makeDateFromStringAndFormat(config);
        }
      } else {
        makeDateFromInput(config);
      }
      res = new Moment(config);
      if (res._nextDay) {
        res.add(1, 'd');
        res._nextDay = undefined;
      }
      return res;
    }
    moment = function(input, format, locale, strict) {
      var c;
      if (typeof(locale) === 'boolean') {
        strict = locale;
        locale = undefined;
      }
      c = {};
      c._isAMomentObject = true;
      c._i = input;
      c._f = format;
      c._l = locale;
      c._strict = strict;
      c._isUTC = false;
      c._pf = defaultParsingFlags();
      return makeMoment(c);
    };
    moment.suppressDeprecationWarnings = false;
    moment.createFromInputFallback = deprecate('moment construction falls back to js Date. This is ' + 'discouraged and will be removed in upcoming major ' + 'release. Please refer to ' + 'https://github.com/moment/moment/issues/1407 for more info.', function(config) {
      config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
    });
    function pickBy(fn, moments) {
      var res,
          i;
      if (moments.length === 1 && isArray(moments[0])) {
        moments = moments[0];
      }
      if (!moments.length) {
        return moment();
      }
      res = moments[0];
      for (i = 1; i < moments.length; ++i) {
        if (moments[i][fn](res)) {
          res = moments[i];
        }
      }
      return res;
    }
    moment.min = function() {
      var args = [].slice.call(arguments, 0);
      return pickBy('isBefore', args);
    };
    moment.max = function() {
      var args = [].slice.call(arguments, 0);
      return pickBy('isAfter', args);
    };
    moment.utc = function(input, format, locale, strict) {
      var c;
      if (typeof(locale) === 'boolean') {
        strict = locale;
        locale = undefined;
      }
      c = {};
      c._isAMomentObject = true;
      c._useUTC = true;
      c._isUTC = true;
      c._l = locale;
      c._i = input;
      c._f = format;
      c._strict = strict;
      c._pf = defaultParsingFlags();
      return makeMoment(c).utc();
    };
    moment.unix = function(input) {
      return moment(input * 1000);
    };
    moment.duration = function(input, key) {
      var duration = input,
          match = null,
          sign,
          ret,
          parseIso,
          diffRes;
      if (moment.isDuration(input)) {
        duration = {
          ms: input._milliseconds,
          d: input._days,
          M: input._months
        };
      } else if (typeof input === 'number') {
        duration = {};
        if (key) {
          duration[key] = input;
        } else {
          duration.milliseconds = input;
        }
      } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : 1;
        duration = {
          y: 0,
          d: toInt(match[DATE]) * sign,
          h: toInt(match[HOUR]) * sign,
          m: toInt(match[MINUTE]) * sign,
          s: toInt(match[SECOND]) * sign,
          ms: toInt(match[MILLISECOND]) * sign
        };
      } else if (!!(match = isoDurationRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : 1;
        parseIso = function(inp) {
          var res = inp && parseFloat(inp.replace(',', '.'));
          return (isNaN(res) ? 0 : res) * sign;
        };
        duration = {
          y: parseIso(match[2]),
          M: parseIso(match[3]),
          d: parseIso(match[4]),
          h: parseIso(match[5]),
          m: parseIso(match[6]),
          s: parseIso(match[7]),
          w: parseIso(match[8])
        };
      } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
        diffRes = momentsDifference(moment(duration.from), moment(duration.to));
        duration = {};
        duration.ms = diffRes.milliseconds;
        duration.M = diffRes.months;
      }
      ret = new Duration(duration);
      if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
        ret._locale = input._locale;
      }
      return ret;
    };
    moment.version = VERSION;
    moment.defaultFormat = isoFormat;
    moment.ISO_8601 = function() {};
    moment.momentProperties = momentProperties;
    moment.updateOffset = function() {};
    moment.relativeTimeThreshold = function(threshold, limit) {
      if (relativeTimeThresholds[threshold] === undefined) {
        return false;
      }
      if (limit === undefined) {
        return relativeTimeThresholds[threshold];
      }
      relativeTimeThresholds[threshold] = limit;
      return true;
    };
    moment.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', function(key, value) {
      return moment.locale(key, value);
    });
    moment.locale = function(key, values) {
      var data;
      if (key) {
        if (typeof(values) !== 'undefined') {
          data = moment.defineLocale(key, values);
        } else {
          data = moment.localeData(key);
        }
        if (data) {
          moment.duration._locale = moment._locale = data;
        }
      }
      return moment._locale._abbr;
    };
    moment.defineLocale = function(name, values) {
      if (values !== null) {
        values.abbr = name;
        if (!locales[name]) {
          locales[name] = new Locale();
        }
        locales[name].set(values);
        moment.locale(name);
        return locales[name];
      } else {
        delete locales[name];
        return null;
      }
    };
    moment.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', function(key) {
      return moment.localeData(key);
    });
    moment.localeData = function(key) {
      var locale;
      if (key && key._locale && key._locale._abbr) {
        key = key._locale._abbr;
      }
      if (!key) {
        return moment._locale;
      }
      if (!isArray(key)) {
        locale = loadLocale(key);
        if (locale) {
          return locale;
        }
        key = [key];
      }
      return chooseLocale(key);
    };
    moment.isMoment = function(obj) {
      return obj instanceof Moment || (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };
    moment.isDuration = function(obj) {
      return obj instanceof Duration;
    };
    for (i = lists.length - 1; i >= 0; --i) {
      makeList(lists[i]);
    }
    moment.normalizeUnits = function(units) {
      return normalizeUnits(units);
    };
    moment.invalid = function(flags) {
      var m = moment.utc(NaN);
      if (flags != null) {
        extend(m._pf, flags);
      } else {
        m._pf.userInvalidated = true;
      }
      return m;
    };
    moment.parseZone = function() {
      return moment.apply(null, arguments).parseZone();
    };
    moment.parseTwoDigitYear = function(input) {
      return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };
    extend(moment.fn = Moment.prototype, {
      clone: function() {
        return moment(this);
      },
      valueOf: function() {
        return +this._d + ((this._offset || 0) * 60000);
      },
      unix: function() {
        return Math.floor(+this / 1000);
      },
      toString: function() {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      },
      toDate: function() {
        return this._offset ? new Date(+this) : this._d;
      },
      toISOString: function() {
        var m = moment(this).utc();
        if (0 < m.year() && m.year() <= 9999) {
          if ('function' === typeof Date.prototype.toISOString) {
            return this.toDate().toISOString();
          } else {
            return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
          }
        } else {
          return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        }
      },
      toArray: function() {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hours(), m.minutes(), m.seconds(), m.milliseconds()];
      },
      isValid: function() {
        return isValid(this);
      },
      isDSTShifted: function() {
        if (this._a) {
          return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
        }
        return false;
      },
      parsingFlags: function() {
        return extend({}, this._pf);
      },
      invalidAt: function() {
        return this._pf.overflow;
      },
      utc: function(keepLocalTime) {
        return this.zone(0, keepLocalTime);
      },
      local: function(keepLocalTime) {
        if (this._isUTC) {
          this.zone(0, keepLocalTime);
          this._isUTC = false;
          if (keepLocalTime) {
            this.add(this._dateTzOffset(), 'm');
          }
        }
        return this;
      },
      format: function(inputString) {
        var output = formatMoment(this, inputString || moment.defaultFormat);
        return this.localeData().postformat(output);
      },
      add: createAdder(1, 'add'),
      subtract: createAdder(-1, 'subtract'),
      diff: function(input, units, asFloat) {
        var that = makeAs(input, this),
            zoneDiff = (this.zone() - that.zone()) * 6e4,
            diff,
            output,
            daysAdjust;
        units = normalizeUnits(units);
        if (units === 'year' || units === 'month') {
          diff = (this.daysInMonth() + that.daysInMonth()) * 432e5;
          output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
          daysAdjust = (this - moment(this).startOf('month')) - (that - moment(that).startOf('month'));
          daysAdjust -= ((this.zone() - moment(this).startOf('month').zone()) - (that.zone() - moment(that).startOf('month').zone())) * 6e4;
          output += daysAdjust / diff;
          if (units === 'year') {
            output = output / 12;
          }
        } else {
          diff = (this - that);
          output = units === 'second' ? diff / 1e3 : units === 'minute' ? diff / 6e4 : units === 'hour' ? diff / 36e5 : units === 'day' ? (diff - zoneDiff) / 864e5 : units === 'week' ? (diff - zoneDiff) / 6048e5 : diff;
        }
        return asFloat ? output : absRound(output);
      },
      from: function(time, withoutSuffix) {
        return moment.duration({
          to: this,
          from: time
        }).locale(this.locale()).humanize(!withoutSuffix);
      },
      fromNow: function(withoutSuffix) {
        return this.from(moment(), withoutSuffix);
      },
      calendar: function(time) {
        var now = time || moment(),
            sod = makeAs(now, this).startOf('day'),
            diff = this.diff(sod, 'days', true),
            format = diff < -6 ? 'sameElse' : diff < -1 ? 'lastWeek' : diff < 0 ? 'lastDay' : diff < 1 ? 'sameDay' : diff < 2 ? 'nextDay' : diff < 7 ? 'nextWeek' : 'sameElse';
        return this.format(this.localeData().calendar(format, this, moment(now)));
      },
      isLeapYear: function() {
        return isLeapYear(this.year());
      },
      isDST: function() {
        return (this.zone() < this.clone().month(0).zone() || this.zone() < this.clone().month(5).zone());
      },
      day: function(input) {
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
          input = parseWeekday(input, this.localeData());
          return this.add(input - day, 'd');
        } else {
          return day;
        }
      },
      month: makeAccessor('Month', true),
      startOf: function(units) {
        units = normalizeUnits(units);
        switch (units) {
          case 'year':
            this.month(0);
          case 'quarter':
          case 'month':
            this.date(1);
          case 'week':
          case 'isoWeek':
          case 'day':
            this.hours(0);
          case 'hour':
            this.minutes(0);
          case 'minute':
            this.seconds(0);
          case 'second':
            this.milliseconds(0);
        }
        if (units === 'week') {
          this.weekday(0);
        } else if (units === 'isoWeek') {
          this.isoWeekday(1);
        }
        if (units === 'quarter') {
          this.month(Math.floor(this.month() / 3) * 3);
        }
        return this;
      },
      endOf: function(units) {
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond') {
          return this;
        }
        return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
      },
      isAfter: function(input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
          input = moment.isMoment(input) ? input : moment(input);
          return +this > +input;
        } else {
          inputMs = moment.isMoment(input) ? +input : +moment(input);
          return inputMs < +this.clone().startOf(units);
        }
      },
      isBefore: function(input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
          input = moment.isMoment(input) ? input : moment(input);
          return +this < +input;
        } else {
          inputMs = moment.isMoment(input) ? +input : +moment(input);
          return +this.clone().endOf(units) < inputMs;
        }
      },
      isSame: function(input, units) {
        var inputMs;
        units = normalizeUnits(units || 'millisecond');
        if (units === 'millisecond') {
          input = moment.isMoment(input) ? input : moment(input);
          return +this === +input;
        } else {
          inputMs = +moment(input);
          return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
        }
      },
      min: deprecate('moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548', function(other) {
        other = moment.apply(null, arguments);
        return other < this ? this : other;
      }),
      max: deprecate('moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548', function(other) {
        other = moment.apply(null, arguments);
        return other > this ? this : other;
      }),
      zone: function(input, keepLocalTime) {
        var offset = this._offset || 0,
            localAdjust;
        if (input != null) {
          if (typeof input === 'string') {
            input = timezoneMinutesFromString(input);
          }
          if (Math.abs(input) < 16) {
            input = input * 60;
          }
          if (!this._isUTC && keepLocalTime) {
            localAdjust = this._dateTzOffset();
          }
          this._offset = input;
          this._isUTC = true;
          if (localAdjust != null) {
            this.subtract(localAdjust, 'm');
          }
          if (offset !== input) {
            if (!keepLocalTime || this._changeInProgress) {
              addOrSubtractDurationFromMoment(this, moment.duration(offset - input, 'm'), 1, false);
            } else if (!this._changeInProgress) {
              this._changeInProgress = true;
              moment.updateOffset(this, true);
              this._changeInProgress = null;
            }
          }
        } else {
          return this._isUTC ? offset : this._dateTzOffset();
        }
        return this;
      },
      zoneAbbr: function() {
        return this._isUTC ? 'UTC' : '';
      },
      zoneName: function() {
        return this._isUTC ? 'Coordinated Universal Time' : '';
      },
      parseZone: function() {
        if (this._tzm) {
          this.zone(this._tzm);
        } else if (typeof this._i === 'string') {
          this.zone(this._i);
        }
        return this;
      },
      hasAlignedHourOffset: function(input) {
        if (!input) {
          input = 0;
        } else {
          input = moment(input).zone();
        }
        return (this.zone() - input) % 60 === 0;
      },
      daysInMonth: function() {
        return daysInMonth(this.year(), this.month());
      },
      dayOfYear: function(input) {
        var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
      },
      quarter: function(input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
      },
      weekYear: function(input) {
        var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
        return input == null ? year : this.add((input - year), 'y');
      },
      isoWeekYear: function(input) {
        var year = weekOfYear(this, 1, 4).year;
        return input == null ? year : this.add((input - year), 'y');
      },
      week: function(input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
      },
      isoWeek: function(input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
      },
      weekday: function(input) {
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
      },
      isoWeekday: function(input) {
        return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
      },
      isoWeeksInYear: function() {
        return weeksInYear(this.year(), 1, 4);
      },
      weeksInYear: function() {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
      },
      get: function(units) {
        units = normalizeUnits(units);
        return this[units]();
      },
      set: function(units, value) {
        units = normalizeUnits(units);
        if (typeof this[units] === 'function') {
          this[units](value);
        }
        return this;
      },
      locale: function(key) {
        var newLocaleData;
        if (key === undefined) {
          return this._locale._abbr;
        } else {
          newLocaleData = moment.localeData(key);
          if (newLocaleData != null) {
            this._locale = newLocaleData;
          }
          return this;
        }
      },
      lang: deprecate('moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.', function(key) {
        if (key === undefined) {
          return this.localeData();
        } else {
          return this.locale(key);
        }
      }),
      localeData: function() {
        return this._locale;
      },
      _dateTzOffset: function() {
        return Math.round(this._d.getTimezoneOffset() / 15) * 15;
      }
    });
    function rawMonthSetter(mom, value) {
      var dayOfMonth;
      if (typeof value === 'string') {
        value = mom.localeData().monthsParse(value);
        if (typeof value !== 'number') {
          return mom;
        }
      }
      dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
      mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
      return mom;
    }
    function rawGetter(mom, unit) {
      return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }
    function rawSetter(mom, unit, value) {
      if (unit === 'Month') {
        return rawMonthSetter(mom, value);
      } else {
        return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
      }
    }
    function makeAccessor(unit, keepTime) {
      return function(value) {
        if (value != null) {
          rawSetter(this, unit, value);
          moment.updateOffset(this, keepTime);
          return this;
        } else {
          return rawGetter(this, unit);
        }
      };
    }
    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;
    moment.fn.toJSON = moment.fn.toISOString;
    function daysToYears(days) {
      return days * 400 / 146097;
    }
    function yearsToDays(years) {
      return years * 146097 / 400;
    }
    extend(moment.duration.fn = Duration.prototype, {
      _bubble: function() {
        var milliseconds = this._milliseconds,
            days = this._days,
            months = this._months,
            data = this._data,
            seconds,
            minutes,
            hours,
            years = 0;
        data.milliseconds = milliseconds % 1000;
        seconds = absRound(milliseconds / 1000);
        data.seconds = seconds % 60;
        minutes = absRound(seconds / 60);
        data.minutes = minutes % 60;
        hours = absRound(minutes / 60);
        data.hours = hours % 24;
        days += absRound(hours / 24);
        years = absRound(daysToYears(days));
        days -= absRound(yearsToDays(years));
        months += absRound(days / 30);
        days %= 30;
        years += absRound(months / 12);
        months %= 12;
        data.days = days;
        data.months = months;
        data.years = years;
      },
      abs: function() {
        this._milliseconds = Math.abs(this._milliseconds);
        this._days = Math.abs(this._days);
        this._months = Math.abs(this._months);
        this._data.milliseconds = Math.abs(this._data.milliseconds);
        this._data.seconds = Math.abs(this._data.seconds);
        this._data.minutes = Math.abs(this._data.minutes);
        this._data.hours = Math.abs(this._data.hours);
        this._data.months = Math.abs(this._data.months);
        this._data.years = Math.abs(this._data.years);
        return this;
      },
      weeks: function() {
        return absRound(this.days() / 7);
      },
      valueOf: function() {
        return this._milliseconds + this._days * 864e5 + (this._months % 12) * 2592e6 + toInt(this._months / 12) * 31536e6;
      },
      humanize: function(withSuffix) {
        var output = relativeTime(this, !withSuffix, this.localeData());
        if (withSuffix) {
          output = this.localeData().pastFuture(+this, output);
        }
        return this.localeData().postformat(output);
      },
      add: function(input, val) {
        var dur = moment.duration(input, val);
        this._milliseconds += dur._milliseconds;
        this._days += dur._days;
        this._months += dur._months;
        this._bubble();
        return this;
      },
      subtract: function(input, val) {
        var dur = moment.duration(input, val);
        this._milliseconds -= dur._milliseconds;
        this._days -= dur._days;
        this._months -= dur._months;
        this._bubble();
        return this;
      },
      get: function(units) {
        units = normalizeUnits(units);
        return this[units.toLowerCase() + 's']();
      },
      as: function(units) {
        var days,
            months;
        units = normalizeUnits(units);
        if (units === 'month' || units === 'year') {
          days = this._days + this._milliseconds / 864e5;
          months = this._months + daysToYears(days) * 12;
          return units === 'month' ? months : months / 12;
        } else {
          days = this._days + Math.round(yearsToDays(this._months / 12));
          switch (units) {
            case 'week':
              return days / 7 + this._milliseconds / 6048e5;
            case 'day':
              return days + this._milliseconds / 864e5;
            case 'hour':
              return days * 24 + this._milliseconds / 36e5;
            case 'minute':
              return days * 24 * 60 + this._milliseconds / 6e4;
            case 'second':
              return days * 24 * 60 * 60 + this._milliseconds / 1000;
            case 'millisecond':
              return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
            default:
              throw new Error('Unknown unit ' + units);
          }
        }
      },
      lang: moment.fn.lang,
      locale: moment.fn.locale,
      toIsoString: deprecate('toIsoString() is deprecated. Please use toISOString() instead ' + '(notice the capitals)', function() {
        return this.toISOString();
      }),
      toISOString: function() {
        var years = Math.abs(this.years()),
            months = Math.abs(this.months()),
            days = Math.abs(this.days()),
            hours = Math.abs(this.hours()),
            minutes = Math.abs(this.minutes()),
            seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);
        if (!this.asSeconds()) {
          return 'P0D';
        }
        return (this.asSeconds() < 0 ? '-' : '') + 'P' + (years ? years + 'Y' : '') + (months ? months + 'M' : '') + (days ? days + 'D' : '') + ((hours || minutes || seconds) ? 'T' : '') + (hours ? hours + 'H' : '') + (minutes ? minutes + 'M' : '') + (seconds ? seconds + 'S' : '');
      },
      localeData: function() {
        return this._locale;
      }
    });
    moment.duration.fn.toString = moment.duration.fn.toISOString;
    function makeDurationGetter(name) {
      moment.duration.fn[name] = function() {
        return this._data[name];
      };
    }
    for (i in unitMillisecondFactors) {
      if (hasOwnProp(unitMillisecondFactors, i)) {
        makeDurationGetter(i.toLowerCase());
      }
    }
    moment.duration.fn.asMilliseconds = function() {
      return this.as('ms');
    };
    moment.duration.fn.asSeconds = function() {
      return this.as('s');
    };
    moment.duration.fn.asMinutes = function() {
      return this.as('m');
    };
    moment.duration.fn.asHours = function() {
      return this.as('h');
    };
    moment.duration.fn.asDays = function() {
      return this.as('d');
    };
    moment.duration.fn.asWeeks = function() {
      return this.as('weeks');
    };
    moment.duration.fn.asMonths = function() {
      return this.as('M');
    };
    moment.duration.fn.asYears = function() {
      return this.as('y');
    };
    moment.locale('en', {
      ordinalParse: /\d{1,2}(th|st|nd|rd)/,
      ordinal: function(number) {
        var b = number % 10,
            output = (toInt(number % 100 / 10) === 1) ? 'th' : (b === 1) ? 'st' : (b === 2) ? 'nd' : (b === 3) ? 'rd' : 'th';
        return number + output;
      }
    });
    function makeGlobal(shouldDeprecate) {
      if (typeof ender !== 'undefined') {
        return;
      }
      oldGlobalMoment = globalScope.moment;
      if (shouldDeprecate) {
        globalScope.moment = deprecate('Accessing Moment through the global scope is ' + 'deprecated, and will be removed in an upcoming ' + 'release.', moment);
      } else {
        globalScope.moment = moment;
      }
    }
    if (hasModule) {
      module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
      define('moment', function($__require, exports, module) {
        if (module.config && module.config() && module.config().noGlobal === true) {
          globalScope.moment = oldGlobalMoment;
        }
        return moment;
      });
      makeGlobal(true);
    } else {
      makeGlobal();
    }
  }).call(this);
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:moment@2.8.4", ["npm:moment@2.8.4/moment"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:moment@2.8.4/moment');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:eonasdan-bootstrap-datetimepicker@3.1.3/src/js/bootstrap-datetimepicker", ["npm:jquery@1.11.3", "npm:moment@2.8.4"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  ;
  (function(root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
      define(['jquery', 'moment'], factory);
    } else if (typeof exports === 'object') {
      factory($__require('npm:jquery@1.11.3'), $__require('npm:moment@2.8.4'));
    } else {
      if (!jQuery) {
        throw new Error('bootstrap-datetimepicker requires jQuery to be loaded first');
      }
      if (!moment) {
        throw new Error('bootstrap-datetimepicker requires moment.js to be loaded first');
      }
      factory(root.jQuery, moment);
    }
  }(this, function($, moment) {
    'use strict';
    if (typeof moment === 'undefined') {
      throw new Error('momentjs is required');
    }
    var dpgId = 0,
        DateTimePicker = function(element, options) {
          var defaults = $.fn.datetimepicker.defaults,
              icons = {
                time: 'glyphicon glyphicon-time',
                date: 'glyphicon glyphicon-calendar',
                up: 'glyphicon glyphicon-chevron-up',
                down: 'glyphicon glyphicon-chevron-down'
              },
              picker = this,
              errored = false,
              dDate,
              init = function() {
                var icon = false,
                    localeData,
                    rInterval;
                picker.options = $.extend({}, defaults, options);
                picker.options.icons = $.extend({}, icons, picker.options.icons);
                picker.element = $(element);
                dataToOptions();
                if (!(picker.options.pickTime || picker.options.pickDate)) {
                  throw new Error('Must choose at least one picker');
                }
                picker.id = dpgId++;
                moment.locale(picker.options.language);
                picker.date = moment();
                picker.unset = false;
                picker.isInput = picker.element.is('input');
                picker.component = false;
                if (picker.element.hasClass('input-group')) {
                  if (picker.element.find('.datepickerbutton').size() === 0) {
                    picker.component = picker.element.find('[class^="input-group-"]');
                  } else {
                    picker.component = picker.element.find('.datepickerbutton');
                  }
                }
                picker.format = picker.options.format;
                localeData = moment().localeData();
                if (!picker.format) {
                  picker.format = (picker.options.pickDate ? localeData.longDateFormat('L') : '');
                  if (picker.options.pickDate && picker.options.pickTime) {
                    picker.format += ' ';
                  }
                  picker.format += (picker.options.pickTime ? localeData.longDateFormat('LT') : '');
                  if (picker.options.useSeconds) {
                    if (localeData.longDateFormat('LT').indexOf(' A') !== -1) {
                      picker.format = picker.format.split(' A')[0] + ':ss A';
                    } else {
                      picker.format += ':ss';
                    }
                  }
                }
                picker.use24hours = (picker.format.toLowerCase().indexOf('a') < 0 && picker.format.indexOf('h') < 0);
                if (picker.component) {
                  icon = picker.component.find('span');
                }
                if (picker.options.pickTime) {
                  if (icon) {
                    icon.addClass(picker.options.icons.time);
                  }
                }
                if (picker.options.pickDate) {
                  if (icon) {
                    icon.removeClass(picker.options.icons.time);
                    icon.addClass(picker.options.icons.date);
                  }
                }
                picker.options.widgetParent = typeof picker.options.widgetParent === 'string' && picker.options.widgetParent || picker.element.parents().filter(function() {
                  return 'scroll' === $(this).css('overflow-y');
                }).get(0) || 'body';
                picker.widget = $(getTemplate()).appendTo(picker.options.widgetParent);
                picker.minViewMode = picker.options.minViewMode || 0;
                if (typeof picker.minViewMode === 'string') {
                  switch (picker.minViewMode) {
                    case 'months':
                      picker.minViewMode = 1;
                      break;
                    case 'years':
                      picker.minViewMode = 2;
                      break;
                    default:
                      picker.minViewMode = 0;
                      break;
                  }
                }
                picker.viewMode = picker.options.viewMode || 0;
                if (typeof picker.viewMode === 'string') {
                  switch (picker.viewMode) {
                    case 'months':
                      picker.viewMode = 1;
                      break;
                    case 'years':
                      picker.viewMode = 2;
                      break;
                    default:
                      picker.viewMode = 0;
                      break;
                  }
                }
                picker.viewMode = Math.max(picker.viewMode, picker.minViewMode);
                picker.options.disabledDates = indexGivenDates(picker.options.disabledDates);
                picker.options.enabledDates = indexGivenDates(picker.options.enabledDates);
                picker.startViewMode = picker.viewMode;
                picker.setMinDate(picker.options.minDate);
                picker.setMaxDate(picker.options.maxDate);
                fillDow();
                fillMonths();
                fillHours();
                fillMinutes();
                fillSeconds();
                update();
                showMode();
                if (!getPickerInput().prop('disabled')) {
                  attachDatePickerEvents();
                }
                if (picker.options.defaultDate !== '' && getPickerInput().val() === '') {
                  picker.setValue(picker.options.defaultDate);
                }
                if (picker.options.minuteStepping !== 1) {
                  rInterval = picker.options.minuteStepping;
                  picker.date.minutes((Math.round(picker.date.minutes() / rInterval) * rInterval) % 60).seconds(0);
                }
              },
              getPickerInput = function() {
                var input;
                if (picker.isInput) {
                  return picker.element;
                }
                input = picker.element.find('.datepickerinput');
                if (input.size() === 0) {
                  input = picker.element.find('input');
                } else if (!input.is('input')) {
                  throw new Error('CSS class "datepickerinput" cannot be applied to non input element');
                }
                return input;
              },
              dataToOptions = function() {
                var eData;
                if (picker.element.is('input')) {
                  eData = picker.element.data();
                } else {
                  eData = picker.element.find('input').data();
                }
                if (eData.dateFormat !== undefined) {
                  picker.options.format = eData.dateFormat;
                }
                if (eData.datePickdate !== undefined) {
                  picker.options.pickDate = eData.datePickdate;
                }
                if (eData.datePicktime !== undefined) {
                  picker.options.pickTime = eData.datePicktime;
                }
                if (eData.dateUseminutes !== undefined) {
                  picker.options.useMinutes = eData.dateUseminutes;
                }
                if (eData.dateUseseconds !== undefined) {
                  picker.options.useSeconds = eData.dateUseseconds;
                }
                if (eData.dateUsecurrent !== undefined) {
                  picker.options.useCurrent = eData.dateUsecurrent;
                }
                if (eData.calendarWeeks !== undefined) {
                  picker.options.calendarWeeks = eData.calendarWeeks;
                }
                if (eData.dateMinutestepping !== undefined) {
                  picker.options.minuteStepping = eData.dateMinutestepping;
                }
                if (eData.dateMindate !== undefined) {
                  picker.options.minDate = eData.dateMindate;
                }
                if (eData.dateMaxdate !== undefined) {
                  picker.options.maxDate = eData.dateMaxdate;
                }
                if (eData.dateShowtoday !== undefined) {
                  picker.options.showToday = eData.dateShowtoday;
                }
                if (eData.dateCollapse !== undefined) {
                  picker.options.collapse = eData.dateCollapse;
                }
                if (eData.dateLanguage !== undefined) {
                  picker.options.language = eData.dateLanguage;
                }
                if (eData.dateDefaultdate !== undefined) {
                  picker.options.defaultDate = eData.dateDefaultdate;
                }
                if (eData.dateDisableddates !== undefined) {
                  picker.options.disabledDates = eData.dateDisableddates;
                }
                if (eData.dateEnableddates !== undefined) {
                  picker.options.enabledDates = eData.dateEnableddates;
                }
                if (eData.dateIcons !== undefined) {
                  picker.options.icons = eData.dateIcons;
                }
                if (eData.dateUsestrict !== undefined) {
                  picker.options.useStrict = eData.dateUsestrict;
                }
                if (eData.dateDirection !== undefined) {
                  picker.options.direction = eData.dateDirection;
                }
                if (eData.dateSidebyside !== undefined) {
                  picker.options.sideBySide = eData.dateSidebyside;
                }
                if (eData.dateDaysofweekdisabled !== undefined) {
                  picker.options.daysOfWeekDisabled = eData.dateDaysofweekdisabled;
                }
              },
              place = function() {
                var position = 'absolute',
                    offset = picker.component ? picker.component.offset() : picker.element.offset(),
                    $window = $(window),
                    placePosition;
                picker.width = picker.component ? picker.component.outerWidth() : picker.element.outerWidth();
                offset.top = offset.top + picker.element.outerHeight();
                if (picker.options.direction === 'up') {
                  placePosition = 'top';
                } else if (picker.options.direction === 'bottom') {
                  placePosition = 'bottom';
                } else if (picker.options.direction === 'auto') {
                  if (offset.top + picker.widget.height() > $window.height() + $window.scrollTop() && picker.widget.height() + picker.element.outerHeight() < offset.top) {
                    placePosition = 'top';
                  } else {
                    placePosition = 'bottom';
                  }
                }
                if (placePosition === 'top') {
                  offset.bottom = $window.height() - offset.top + picker.element.outerHeight() + 3;
                  picker.widget.addClass('top').removeClass('bottom');
                } else {
                  offset.top += 1;
                  picker.widget.addClass('bottom').removeClass('top');
                }
                if (picker.options.width !== undefined) {
                  picker.widget.width(picker.options.width);
                }
                if (picker.options.orientation === 'left') {
                  picker.widget.addClass('left-oriented');
                  offset.left = offset.left - picker.widget.width() + 20;
                }
                if (isInFixed()) {
                  position = 'fixed';
                  offset.top -= $window.scrollTop();
                  offset.left -= $window.scrollLeft();
                }
                if ($window.width() < offset.left + picker.widget.outerWidth()) {
                  offset.right = $window.width() - offset.left - picker.width;
                  offset.left = 'auto';
                  picker.widget.addClass('pull-right');
                } else {
                  offset.right = 'auto';
                  picker.widget.removeClass('pull-right');
                }
                if (placePosition === 'top') {
                  picker.widget.css({
                    position: position,
                    bottom: offset.bottom,
                    top: 'auto',
                    left: offset.left,
                    right: offset.right
                  });
                } else {
                  picker.widget.css({
                    position: position,
                    top: offset.top,
                    bottom: 'auto',
                    left: offset.left,
                    right: offset.right
                  });
                }
              },
              notifyChange = function(oldDate, eventType) {
                if (moment(picker.date).isSame(moment(oldDate)) && !errored) {
                  return;
                }
                errored = false;
                picker.element.trigger({
                  type: 'dp.change',
                  date: moment(picker.date),
                  oldDate: moment(oldDate)
                });
                if (eventType !== 'change') {
                  picker.element.change();
                }
              },
              notifyError = function(date) {
                errored = true;
                picker.element.trigger({
                  type: 'dp.error',
                  date: moment(date, picker.format, picker.options.useStrict)
                });
              },
              update = function(newDate) {
                moment.locale(picker.options.language);
                var dateStr = newDate;
                if (!dateStr) {
                  dateStr = getPickerInput().val();
                  if (dateStr) {
                    picker.date = moment(dateStr, picker.format, picker.options.useStrict);
                  }
                  if (!picker.date) {
                    picker.date = moment();
                  }
                }
                picker.viewDate = moment(picker.date).startOf('month');
                fillDate();
                fillTime();
              },
              fillDow = function() {
                moment.locale(picker.options.language);
                var html = $('<tr>'),
                    weekdaysMin = moment.weekdaysMin(),
                    i;
                if (picker.options.calendarWeeks === true) {
                  html.append('<th class="cw">#</th>');
                }
                if (moment().localeData()._week.dow === 0) {
                  for (i = 0; i < 7; i++) {
                    html.append('<th class="dow">' + weekdaysMin[i] + '</th>');
                  }
                } else {
                  for (i = 1; i < 8; i++) {
                    if (i === 7) {
                      html.append('<th class="dow">' + weekdaysMin[0] + '</th>');
                    } else {
                      html.append('<th class="dow">' + weekdaysMin[i] + '</th>');
                    }
                  }
                }
                picker.widget.find('.datepicker-days thead').append(html);
              },
              fillMonths = function() {
                moment.locale(picker.options.language);
                var html = '',
                    i,
                    monthsShort = moment.monthsShort();
                for (i = 0; i < 12; i++) {
                  html += '<span class="month">' + monthsShort[i] + '</span>';
                }
                picker.widget.find('.datepicker-months td').append(html);
              },
              fillDate = function() {
                if (!picker.options.pickDate) {
                  return;
                }
                moment.locale(picker.options.language);
                var year = picker.viewDate.year(),
                    month = picker.viewDate.month(),
                    startYear = picker.options.minDate.year(),
                    startMonth = picker.options.minDate.month(),
                    endYear = picker.options.maxDate.year(),
                    endMonth = picker.options.maxDate.month(),
                    currentDate,
                    prevMonth,
                    nextMonth,
                    html = [],
                    row,
                    clsName,
                    i,
                    days,
                    yearCont,
                    currentYear,
                    months = moment.months();
                picker.widget.find('.datepicker-days').find('.disabled').removeClass('disabled');
                picker.widget.find('.datepicker-months').find('.disabled').removeClass('disabled');
                picker.widget.find('.datepicker-years').find('.disabled').removeClass('disabled');
                picker.widget.find('.datepicker-days th:eq(1)').text(months[month] + ' ' + year);
                prevMonth = moment(picker.viewDate, picker.format, picker.options.useStrict).subtract(1, 'months');
                days = prevMonth.daysInMonth();
                prevMonth.date(days).startOf('week');
                if ((year === startYear && month <= startMonth) || year < startYear) {
                  picker.widget.find('.datepicker-days th:eq(0)').addClass('disabled');
                }
                if ((year === endYear && month >= endMonth) || year > endYear) {
                  picker.widget.find('.datepicker-days th:eq(2)').addClass('disabled');
                }
                nextMonth = moment(prevMonth).add(42, 'd');
                while (prevMonth.isBefore(nextMonth)) {
                  if (prevMonth.weekday() === moment().startOf('week').weekday()) {
                    row = $('<tr>');
                    html.push(row);
                    if (picker.options.calendarWeeks === true) {
                      row.append('<td class="cw">' + prevMonth.week() + '</td>');
                    }
                  }
                  clsName = '';
                  if (prevMonth.year() < year || (prevMonth.year() === year && prevMonth.month() < month)) {
                    clsName += ' old';
                  } else if (prevMonth.year() > year || (prevMonth.year() === year && prevMonth.month() > month)) {
                    clsName += ' new';
                  }
                  if (prevMonth.isSame(moment({
                    y: picker.date.year(),
                    M: picker.date.month(),
                    d: picker.date.date()
                  }))) {
                    clsName += ' active';
                  }
                  if (isInDisableDates(prevMonth, 'day') || !isInEnableDates(prevMonth)) {
                    clsName += ' disabled';
                  }
                  if (picker.options.showToday === true) {
                    if (prevMonth.isSame(moment(), 'day')) {
                      clsName += ' today';
                    }
                  }
                  if (picker.options.daysOfWeekDisabled) {
                    for (i = 0; i < picker.options.daysOfWeekDisabled.length; i++) {
                      if (prevMonth.day() === picker.options.daysOfWeekDisabled[i]) {
                        clsName += ' disabled';
                        break;
                      }
                    }
                  }
                  row.append('<td class="day' + clsName + '">' + prevMonth.date() + '</td>');
                  currentDate = prevMonth.date();
                  prevMonth.add(1, 'd');
                  if (currentDate === prevMonth.date()) {
                    prevMonth.add(1, 'd');
                  }
                }
                picker.widget.find('.datepicker-days tbody').empty().append(html);
                currentYear = picker.date.year();
                months = picker.widget.find('.datepicker-months').find('th:eq(1)').text(year).end().find('span').removeClass('active');
                if (currentYear === year) {
                  months.eq(picker.date.month()).addClass('active');
                }
                if (year - 1 < startYear) {
                  picker.widget.find('.datepicker-months th:eq(0)').addClass('disabled');
                }
                if (year + 1 > endYear) {
                  picker.widget.find('.datepicker-months th:eq(2)').addClass('disabled');
                }
                for (i = 0; i < 12; i++) {
                  if ((year === startYear && startMonth > i) || (year < startYear)) {
                    $(months[i]).addClass('disabled');
                  } else if ((year === endYear && endMonth < i) || (year > endYear)) {
                    $(months[i]).addClass('disabled');
                  }
                }
                html = '';
                year = parseInt(year / 10, 10) * 10;
                yearCont = picker.widget.find('.datepicker-years').find('th:eq(1)').text(year + '-' + (year + 9)).parents('table').find('td');
                picker.widget.find('.datepicker-years').find('th').removeClass('disabled');
                if (startYear > year) {
                  picker.widget.find('.datepicker-years').find('th:eq(0)').addClass('disabled');
                }
                if (endYear < year + 9) {
                  picker.widget.find('.datepicker-years').find('th:eq(2)').addClass('disabled');
                }
                year -= 1;
                for (i = -1; i < 11; i++) {
                  html += '<span class="year' + (i === -1 || i === 10 ? ' old' : '') + (currentYear === year ? ' active' : '') + ((year < startYear || year > endYear) ? ' disabled' : '') + '">' + year + '</span>';
                  year += 1;
                }
                yearCont.html(html);
              },
              fillHours = function() {
                moment.locale(picker.options.language);
                var table = picker.widget.find('.timepicker .timepicker-hours table'),
                    html = '',
                    current,
                    i,
                    j;
                table.parent().hide();
                if (picker.use24hours) {
                  current = 0;
                  for (i = 0; i < 6; i += 1) {
                    html += '<tr>';
                    for (j = 0; j < 4; j += 1) {
                      html += '<td class="hour">' + padLeft(current.toString()) + '</td>';
                      current++;
                    }
                    html += '</tr>';
                  }
                } else {
                  current = 1;
                  for (i = 0; i < 3; i += 1) {
                    html += '<tr>';
                    for (j = 0; j < 4; j += 1) {
                      html += '<td class="hour">' + padLeft(current.toString()) + '</td>';
                      current++;
                    }
                    html += '</tr>';
                  }
                }
                table.html(html);
              },
              fillMinutes = function() {
                var table = picker.widget.find('.timepicker .timepicker-minutes table'),
                    html = '',
                    current = 0,
                    i,
                    j,
                    step = picker.options.minuteStepping;
                table.parent().hide();
                if (step === 1) {
                  step = 5;
                }
                for (i = 0; i < Math.ceil(60 / step / 4); i++) {
                  html += '<tr>';
                  for (j = 0; j < 4; j += 1) {
                    if (current < 60) {
                      html += '<td class="minute">' + padLeft(current.toString()) + '</td>';
                      current += step;
                    } else {
                      html += '<td></td>';
                    }
                  }
                  html += '</tr>';
                }
                table.html(html);
              },
              fillSeconds = function() {
                var table = picker.widget.find('.timepicker .timepicker-seconds table'),
                    html = '',
                    current = 0,
                    i,
                    j;
                table.parent().hide();
                for (i = 0; i < 3; i++) {
                  html += '<tr>';
                  for (j = 0; j < 4; j += 1) {
                    html += '<td class="second">' + padLeft(current.toString()) + '</td>';
                    current += 5;
                  }
                  html += '</tr>';
                }
                table.html(html);
              },
              fillTime = function() {
                if (!picker.date) {
                  return;
                }
                var timeComponents = picker.widget.find('.timepicker span[data-time-component]'),
                    hour = picker.date.hours(),
                    period = picker.date.format('A');
                if (!picker.use24hours) {
                  if (hour === 0) {
                    hour = 12;
                  } else if (hour !== 12) {
                    hour = hour % 12;
                  }
                  picker.widget.find('.timepicker [data-action=togglePeriod]').text(period);
                }
                timeComponents.filter('[data-time-component=hours]').text(padLeft(hour));
                timeComponents.filter('[data-time-component=minutes]').text(padLeft(picker.date.minutes()));
                timeComponents.filter('[data-time-component=seconds]').text(padLeft(picker.date.second()));
              },
              click = function(e) {
                e.stopPropagation();
                e.preventDefault();
                picker.unset = false;
                var target = $(e.target).closest('span, td, th'),
                    month,
                    year,
                    step,
                    day,
                    oldDate = moment(picker.date);
                if (target.length === 1) {
                  if (!target.is('.disabled')) {
                    switch (target[0].nodeName.toLowerCase()) {
                      case 'th':
                        switch (target[0].className) {
                          case 'picker-switch':
                            showMode(1);
                            break;
                          case 'prev':
                          case 'next':
                            step = dpGlobal.modes[picker.viewMode].navStep;
                            if (target[0].className === 'prev') {
                              step = step * -1;
                            }
                            picker.viewDate.add(step, dpGlobal.modes[picker.viewMode].navFnc);
                            fillDate();
                            break;
                        }
                        break;
                      case 'span':
                        if (target.is('.month')) {
                          month = target.parent().find('span').index(target);
                          picker.viewDate.month(month);
                        } else {
                          year = parseInt(target.text(), 10) || 0;
                          picker.viewDate.year(year);
                        }
                        if (picker.viewMode === picker.minViewMode) {
                          picker.date = moment({
                            y: picker.viewDate.year(),
                            M: picker.viewDate.month(),
                            d: picker.viewDate.date(),
                            h: picker.date.hours(),
                            m: picker.date.minutes(),
                            s: picker.date.seconds()
                          });
                          set();
                          notifyChange(oldDate, e.type);
                        }
                        showMode(-1);
                        fillDate();
                        break;
                      case 'td':
                        if (target.is('.day')) {
                          day = parseInt(target.text(), 10) || 1;
                          month = picker.viewDate.month();
                          year = picker.viewDate.year();
                          if (target.is('.old')) {
                            if (month === 0) {
                              month = 11;
                              year -= 1;
                            } else {
                              month -= 1;
                            }
                          } else if (target.is('.new')) {
                            if (month === 11) {
                              month = 0;
                              year += 1;
                            } else {
                              month += 1;
                            }
                          }
                          picker.date = moment({
                            y: year,
                            M: month,
                            d: day,
                            h: picker.date.hours(),
                            m: picker.date.minutes(),
                            s: picker.date.seconds()
                          });
                          picker.viewDate = moment({
                            y: year,
                            M: month,
                            d: Math.min(28, day)
                          });
                          fillDate();
                          set();
                          notifyChange(oldDate, e.type);
                        }
                        break;
                    }
                  }
                }
              },
              actions = {
                incrementHours: function() {
                  checkDate('add', 'hours', 1);
                },
                incrementMinutes: function() {
                  checkDate('add', 'minutes', picker.options.minuteStepping);
                },
                incrementSeconds: function() {
                  checkDate('add', 'seconds', 1);
                },
                decrementHours: function() {
                  checkDate('subtract', 'hours', 1);
                },
                decrementMinutes: function() {
                  checkDate('subtract', 'minutes', picker.options.minuteStepping);
                },
                decrementSeconds: function() {
                  checkDate('subtract', 'seconds', 1);
                },
                togglePeriod: function() {
                  var hour = picker.date.hours();
                  if (hour >= 12) {
                    hour -= 12;
                  } else {
                    hour += 12;
                  }
                  picker.date.hours(hour);
                },
                showPicker: function() {
                  picker.widget.find('.timepicker > div:not(.timepicker-picker)').hide();
                  picker.widget.find('.timepicker .timepicker-picker').show();
                },
                showHours: function() {
                  picker.widget.find('.timepicker .timepicker-picker').hide();
                  picker.widget.find('.timepicker .timepicker-hours').show();
                },
                showMinutes: function() {
                  picker.widget.find('.timepicker .timepicker-picker').hide();
                  picker.widget.find('.timepicker .timepicker-minutes').show();
                },
                showSeconds: function() {
                  picker.widget.find('.timepicker .timepicker-picker').hide();
                  picker.widget.find('.timepicker .timepicker-seconds').show();
                },
                selectHour: function(e) {
                  var hour = parseInt($(e.target).text(), 10);
                  if (!picker.use24hours) {
                    if (picker.date.hours() >= 12) {
                      if (hour !== 12) {
                        hour += 12;
                      }
                    } else {
                      if (hour === 12) {
                        hour = 0;
                      }
                    }
                  }
                  picker.date.hours(hour);
                  actions.showPicker.call(picker);
                },
                selectMinute: function(e) {
                  picker.date.minutes(parseInt($(e.target).text(), 10));
                  actions.showPicker.call(picker);
                },
                selectSecond: function(e) {
                  picker.date.seconds(parseInt($(e.target).text(), 10));
                  actions.showPicker.call(picker);
                }
              },
              doAction = function(e) {
                var oldDate = moment(picker.date),
                    action = $(e.currentTarget).data('action'),
                    rv = actions[action].apply(picker, arguments);
                stopEvent(e);
                if (!picker.date) {
                  picker.date = moment({y: 1970});
                }
                set();
                fillTime();
                notifyChange(oldDate, e.type);
                return rv;
              },
              stopEvent = function(e) {
                e.stopPropagation();
                e.preventDefault();
              },
              keydown = function(e) {
                if (e.keyCode === 27) {
                  picker.hide();
                }
              },
              change = function(e) {
                moment.locale(picker.options.language);
                var input = $(e.target),
                    oldDate = moment(picker.date),
                    newDate = moment(input.val(), picker.format, picker.options.useStrict);
                if (newDate.isValid() && !isInDisableDates(newDate) && isInEnableDates(newDate)) {
                  update();
                  picker.setValue(newDate);
                  notifyChange(oldDate, e.type);
                  set();
                } else {
                  picker.viewDate = oldDate;
                  picker.unset = true;
                  notifyChange(oldDate, e.type);
                  notifyError(newDate);
                }
              },
              showMode = function(dir) {
                if (dir) {
                  picker.viewMode = Math.max(picker.minViewMode, Math.min(2, picker.viewMode + dir));
                }
                picker.widget.find('.datepicker > div').hide().filter('.datepicker-' + dpGlobal.modes[picker.viewMode].clsName).show();
              },
              attachDatePickerEvents = function() {
                var $this,
                    $parent,
                    expanded,
                    closed,
                    collapseData;
                picker.widget.on('click', '.datepicker *', $.proxy(click, this));
                picker.widget.on('click', '[data-action]', $.proxy(doAction, this));
                picker.widget.on('mousedown', $.proxy(stopEvent, this));
                picker.element.on('keydown', $.proxy(keydown, this));
                if (picker.options.pickDate && picker.options.pickTime) {
                  picker.widget.on('click.togglePicker', '.accordion-toggle', function(e) {
                    e.stopPropagation();
                    $this = $(this);
                    $parent = $this.closest('ul');
                    expanded = $parent.find('.in');
                    closed = $parent.find('.collapse:not(.in)');
                    if (expanded && expanded.length) {
                      collapseData = expanded.data('collapse');
                      if (collapseData && collapseData.transitioning) {
                        return;
                      }
                      expanded.collapse('hide');
                      closed.collapse('show');
                      $this.find('span').toggleClass(picker.options.icons.time + ' ' + picker.options.icons.date);
                      if (picker.component) {
                        picker.component.find('span').toggleClass(picker.options.icons.time + ' ' + picker.options.icons.date);
                      }
                    }
                  });
                }
                if (picker.isInput) {
                  picker.element.on({
                    'click': $.proxy(picker.show, this),
                    'focus': $.proxy(picker.show, this),
                    'change': $.proxy(change, this),
                    'blur': $.proxy(picker.hide, this)
                  });
                } else {
                  picker.element.on({'change': $.proxy(change, this)}, 'input');
                  if (picker.component) {
                    picker.component.on('click', $.proxy(picker.show, this));
                    picker.component.on('mousedown', $.proxy(stopEvent, this));
                  } else {
                    picker.element.on('click', $.proxy(picker.show, this));
                  }
                }
              },
              attachDatePickerGlobalEvents = function() {
                $(window).on('resize.datetimepicker' + picker.id, $.proxy(place, this));
                if (!picker.isInput) {
                  $(document).on('mousedown.datetimepicker' + picker.id, $.proxy(picker.hide, this));
                }
              },
              detachDatePickerEvents = function() {
                picker.widget.off('click', '.datepicker *', picker.click);
                picker.widget.off('click', '[data-action]');
                picker.widget.off('mousedown', picker.stopEvent);
                if (picker.options.pickDate && picker.options.pickTime) {
                  picker.widget.off('click.togglePicker');
                }
                if (picker.isInput) {
                  picker.element.off({
                    'focus': picker.show,
                    'change': change,
                    'click': picker.show,
                    'blur': picker.hide
                  });
                } else {
                  picker.element.off({'change': change}, 'input');
                  if (picker.component) {
                    picker.component.off('click', picker.show);
                    picker.component.off('mousedown', picker.stopEvent);
                  } else {
                    picker.element.off('click', picker.show);
                  }
                }
              },
              detachDatePickerGlobalEvents = function() {
                $(window).off('resize.datetimepicker' + picker.id);
                if (!picker.isInput) {
                  $(document).off('mousedown.datetimepicker' + picker.id);
                }
              },
              isInFixed = function() {
                if (picker.element) {
                  var parents = picker.element.parents(),
                      inFixed = false,
                      i;
                  for (i = 0; i < parents.length; i++) {
                    if ($(parents[i]).css('position') === 'fixed') {
                      inFixed = true;
                      break;
                    }
                  }
                  return inFixed;
                } else {
                  return false;
                }
              },
              set = function() {
                moment.locale(picker.options.language);
                var formatted = '';
                if (!picker.unset) {
                  formatted = moment(picker.date).format(picker.format);
                }
                getPickerInput().val(formatted);
                picker.element.data('date', formatted);
                if (!picker.options.pickTime) {
                  picker.hide();
                }
              },
              checkDate = function(direction, unit, amount) {
                moment.locale(picker.options.language);
                var newDate;
                if (direction === 'add') {
                  newDate = moment(picker.date);
                  if (newDate.hours() === 23) {
                    newDate.add(amount, unit);
                  }
                  newDate.add(amount, unit);
                } else {
                  newDate = moment(picker.date).subtract(amount, unit);
                }
                if (isInDisableDates(moment(newDate.subtract(amount, unit))) || isInDisableDates(newDate)) {
                  notifyError(newDate.format(picker.format));
                  return;
                }
                if (direction === 'add') {
                  picker.date.add(amount, unit);
                } else {
                  picker.date.subtract(amount, unit);
                }
                picker.unset = false;
              },
              isInDisableDates = function(date, timeUnit) {
                moment.locale(picker.options.language);
                var maxDate = moment(picker.options.maxDate, picker.format, picker.options.useStrict),
                    minDate = moment(picker.options.minDate, picker.format, picker.options.useStrict);
                if (timeUnit) {
                  maxDate = maxDate.endOf(timeUnit);
                  minDate = minDate.startOf(timeUnit);
                }
                if (date.isAfter(maxDate) || date.isBefore(minDate)) {
                  return true;
                }
                if (picker.options.disabledDates === false) {
                  return false;
                }
                return picker.options.disabledDates[date.format('YYYY-MM-DD')] === true;
              },
              isInEnableDates = function(date) {
                moment.locale(picker.options.language);
                if (picker.options.enabledDates === false) {
                  return true;
                }
                return picker.options.enabledDates[date.format('YYYY-MM-DD')] === true;
              },
              indexGivenDates = function(givenDatesArray) {
                var givenDatesIndexed = {},
                    givenDatesCount = 0,
                    i;
                for (i = 0; i < givenDatesArray.length; i++) {
                  if (moment.isMoment(givenDatesArray[i]) || givenDatesArray[i] instanceof Date) {
                    dDate = moment(givenDatesArray[i]);
                  } else {
                    dDate = moment(givenDatesArray[i], picker.format, picker.options.useStrict);
                  }
                  if (dDate.isValid()) {
                    givenDatesIndexed[dDate.format('YYYY-MM-DD')] = true;
                    givenDatesCount++;
                  }
                }
                if (givenDatesCount > 0) {
                  return givenDatesIndexed;
                }
                return false;
              },
              padLeft = function(string) {
                string = string.toString();
                if (string.length >= 2) {
                  return string;
                }
                return '0' + string;
              },
              getTemplate = function() {
                var headTemplate = '<thead>' + '<tr>' + '<th class="prev">&lsaquo;</th><th colspan="' + (picker.options.calendarWeeks ? '6' : '5') + '" class="picker-switch"></th><th class="next">&rsaquo;</th>' + '</tr>' + '</thead>',
                    contTemplate = '<tbody><tr><td colspan="' + (picker.options.calendarWeeks ? '8' : '7') + '"></td></tr></tbody>',
                    template = '<div class="datepicker-days">' + '<table class="table-condensed">' + headTemplate + '<tbody></tbody></table>' + '</div>' + '<div class="datepicker-months">' + '<table class="table-condensed">' + headTemplate + contTemplate + '</table>' + '</div>' + '<div class="datepicker-years">' + '<table class="table-condensed">' + headTemplate + contTemplate + '</table>' + '</div>',
                    ret = '';
                if (picker.options.pickDate && picker.options.pickTime) {
                  ret = '<div class="bootstrap-datetimepicker-widget' + (picker.options.sideBySide ? ' timepicker-sbs' : '') + (picker.use24hours ? ' usetwentyfour' : '') + ' dropdown-menu" style="z-index:9999 !important;">';
                  if (picker.options.sideBySide) {
                    ret += '<div class="row">' + '<div class="col-sm-6 datepicker">' + template + '</div>' + '<div class="col-sm-6 timepicker">' + tpGlobal.getTemplate() + '</div>' + '</div>';
                  } else {
                    ret += '<ul class="list-unstyled">' + '<li' + (picker.options.collapse ? ' class="collapse in"' : '') + '>' + '<div class="datepicker">' + template + '</div>' + '</li>' + '<li class="picker-switch accordion-toggle"><a class="btn" style="width:100%"><span class="' + picker.options.icons.time + '"></span></a></li>' + '<li' + (picker.options.collapse ? ' class="collapse"' : '') + '>' + '<div class="timepicker">' + tpGlobal.getTemplate() + '</div>' + '</li>' + '</ul>';
                  }
                  ret += '</div>';
                  return ret;
                }
                if (picker.options.pickTime) {
                  return ('<div class="bootstrap-datetimepicker-widget dropdown-menu">' + '<div class="timepicker">' + tpGlobal.getTemplate() + '</div>' + '</div>');
                }
                return ('<div class="bootstrap-datetimepicker-widget dropdown-menu">' + '<div class="datepicker">' + template + '</div>' + '</div>');
              },
              dpGlobal = {modes: [{
                  clsName: 'days',
                  navFnc: 'month',
                  navStep: 1
                }, {
                  clsName: 'months',
                  navFnc: 'year',
                  navStep: 1
                }, {
                  clsName: 'years',
                  navFnc: 'year',
                  navStep: 10
                }]},
              tpGlobal = {
                hourTemplate: '<span data-action="showHours"   data-time-component="hours"   class="timepicker-hour"></span>',
                minuteTemplate: '<span data-action="showMinutes" data-time-component="minutes" class="timepicker-minute"></span>',
                secondTemplate: '<span data-action="showSeconds"  data-time-component="seconds" class="timepicker-second"></span>'
              };
          tpGlobal.getTemplate = function() {
            return ('<div class="timepicker-picker">' + '<table class="table-condensed">' + '<tr>' + '<td><a href="#" class="btn" data-action="incrementHours"><span class="' + picker.options.icons.up + '"></span></a></td>' + '<td class="separator"></td>' + '<td>' + (picker.options.useMinutes ? '<a href="#" class="btn" data-action="incrementMinutes"><span class="' + picker.options.icons.up + '"></span></a>' : '') + '</td>' + (picker.options.useSeconds ? '<td class="separator"></td><td><a href="#" class="btn" data-action="incrementSeconds"><span class="' + picker.options.icons.up + '"></span></a></td>' : '') + (picker.use24hours ? '' : '<td class="separator"></td>') + '</tr>' + '<tr>' + '<td>' + tpGlobal.hourTemplate + '</td> ' + '<td class="separator">:</td>' + '<td>' + (picker.options.useMinutes ? tpGlobal.minuteTemplate : '<span class="timepicker-minute">00</span>') + '</td> ' + (picker.options.useSeconds ? '<td class="separator">:</td><td>' + tpGlobal.secondTemplate + '</td>' : '') + (picker.use24hours ? '' : '<td class="separator"></td>' + '<td><button type="button" class="btn btn-primary" data-action="togglePeriod"></button></td>') + '</tr>' + '<tr>' + '<td><a href="#" class="btn" data-action="decrementHours"><span class="' + picker.options.icons.down + '"></span></a></td>' + '<td class="separator"></td>' + '<td>' + (picker.options.useMinutes ? '<a href="#" class="btn" data-action="decrementMinutes"><span class="' + picker.options.icons.down + '"></span></a>' : '') + '</td>' + (picker.options.useSeconds ? '<td class="separator"></td><td><a href="#" class="btn" data-action="decrementSeconds"><span class="' + picker.options.icons.down + '"></span></a></td>' : '') + (picker.use24hours ? '' : '<td class="separator"></td>') + '</tr>' + '</table>' + '</div>' + '<div class="timepicker-hours" data-action="selectHour">' + '<table class="table-condensed"></table>' + '</div>' + '<div class="timepicker-minutes" data-action="selectMinute">' + '<table class="table-condensed"></table>' + '</div>' + (picker.options.useSeconds ? '<div class="timepicker-seconds" data-action="selectSecond"><table class="table-condensed"></table></div>' : ''));
          };
          picker.destroy = function() {
            detachDatePickerEvents();
            detachDatePickerGlobalEvents();
            picker.widget.remove();
            picker.element.removeData('DateTimePicker');
            if (picker.component) {
              picker.component.removeData('DateTimePicker');
            }
          };
          picker.show = function(e) {
            if (getPickerInput().prop('disabled')) {
              return;
            }
            if (picker.options.useCurrent) {
              if (getPickerInput().val() === '') {
                if (picker.options.minuteStepping !== 1) {
                  var mDate = moment(),
                      rInterval = picker.options.minuteStepping;
                  mDate.minutes((Math.round(mDate.minutes() / rInterval) * rInterval) % 60).seconds(0);
                  picker.setValue(mDate.format(picker.format));
                } else {
                  picker.setValue(moment().format(picker.format));
                }
                notifyChange('', e.type);
              }
            }
            if (e && e.type === 'click' && picker.isInput && picker.widget.hasClass('picker-open')) {
              return;
            }
            if (picker.widget.hasClass('picker-open')) {
              picker.widget.hide();
              picker.widget.removeClass('picker-open');
            } else {
              picker.widget.show();
              picker.widget.addClass('picker-open');
            }
            picker.height = picker.component ? picker.component.outerHeight() : picker.element.outerHeight();
            place();
            picker.element.trigger({
              type: 'dp.show',
              date: moment(picker.date)
            });
            attachDatePickerGlobalEvents();
            if (e) {
              stopEvent(e);
            }
          };
          picker.disable = function() {
            var input = getPickerInput();
            if (input.prop('disabled')) {
              return;
            }
            input.prop('disabled', true);
            detachDatePickerEvents();
          };
          picker.enable = function() {
            var input = getPickerInput();
            if (!input.prop('disabled')) {
              return;
            }
            input.prop('disabled', false);
            attachDatePickerEvents();
          };
          picker.hide = function() {
            var collapse = picker.widget.find('.collapse'),
                i,
                collapseData;
            for (i = 0; i < collapse.length; i++) {
              collapseData = collapse.eq(i).data('collapse');
              if (collapseData && collapseData.transitioning) {
                return;
              }
            }
            picker.widget.hide();
            picker.widget.removeClass('picker-open');
            picker.viewMode = picker.startViewMode;
            showMode();
            picker.element.trigger({
              type: 'dp.hide',
              date: moment(picker.date)
            });
            detachDatePickerGlobalEvents();
          };
          picker.setValue = function(newDate) {
            moment.locale(picker.options.language);
            if (!newDate) {
              picker.unset = true;
              set();
            } else {
              picker.unset = false;
            }
            if (!moment.isMoment(newDate)) {
              newDate = (newDate instanceof Date) ? moment(newDate) : moment(newDate, picker.format, picker.options.useStrict);
            } else {
              newDate = newDate.locale(picker.options.language);
            }
            if (newDate.isValid()) {
              picker.date = newDate;
              set();
              picker.viewDate = moment({
                y: picker.date.year(),
                M: picker.date.month()
              });
              fillDate();
              fillTime();
            } else {
              notifyError(newDate);
            }
          };
          picker.getDate = function() {
            if (picker.unset) {
              return null;
            }
            return moment(picker.date);
          };
          picker.setDate = function(date) {
            var oldDate = moment(picker.date);
            if (!date) {
              picker.setValue(null);
            } else {
              picker.setValue(date);
            }
            notifyChange(oldDate, 'function');
          };
          picker.setDisabledDates = function(dates) {
            picker.options.disabledDates = indexGivenDates(dates);
            if (picker.viewDate) {
              update();
            }
          };
          picker.setEnabledDates = function(dates) {
            picker.options.enabledDates = indexGivenDates(dates);
            if (picker.viewDate) {
              update();
            }
          };
          picker.setMaxDate = function(date) {
            if (date === undefined) {
              return;
            }
            if (moment.isMoment(date) || date instanceof Date) {
              picker.options.maxDate = moment(date);
            } else {
              picker.options.maxDate = moment(date, picker.format, picker.options.useStrict);
            }
            if (picker.viewDate) {
              update();
            }
          };
          picker.setMinDate = function(date) {
            if (date === undefined) {
              return;
            }
            if (moment.isMoment(date) || date instanceof Date) {
              picker.options.minDate = moment(date);
            } else {
              picker.options.minDate = moment(date, picker.format, picker.options.useStrict);
            }
            if (picker.viewDate) {
              update();
            }
          };
          init();
        };
    $.fn.datetimepicker = function(options) {
      return this.each(function() {
        var $this = $(this),
            data = $this.data('DateTimePicker');
        if (!data) {
          $this.data('DateTimePicker', new DateTimePicker(this, options));
        }
      });
    };
    $.fn.datetimepicker.defaults = {
      format: false,
      pickDate: true,
      pickTime: true,
      useMinutes: true,
      useSeconds: false,
      useCurrent: true,
      calendarWeeks: false,
      minuteStepping: 1,
      minDate: moment({y: 1900}),
      maxDate: moment().add(100, 'y'),
      showToday: true,
      collapse: true,
      language: moment.locale(),
      defaultDate: '',
      disabledDates: false,
      enabledDates: false,
      icons: {},
      useStrict: false,
      direction: 'auto',
      sideBySide: false,
      daysOfWeekDisabled: [],
      widgetParent: false
    };
  }));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:eonasdan-bootstrap-datetimepicker@3.1.3", ["npm:eonasdan-bootstrap-datetimepicker@3.1.3/src/js/bootstrap-datetimepicker"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:eonasdan-bootstrap-datetimepicker@3.1.3/src/js/bootstrap-datetimepicker');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/formWidgets/main.js", ["npm:jquery@1.11.3", "npm:eonasdan-bootstrap-datetimepicker@3.1.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  $__require('npm:eonasdan-bootstrap-datetimepicker@3.1.3');
  module.exports = initFormWidgets;
  function initFormWidgets() {
    var plan = {
      ready: ready,
      destroy: destroy
    };
    function ready() {
      $('form .date').datetimepicker({pickSeconds: false});
    }
    function destroy() {}
    $(function() {
      plan.ready();
    }.bind(plan));
    return plan;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/platform/os.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  exports.type = type;
  exports.arch = arch;
  var defaultOs = 'Unknown';
  var defaultArch = '32';
  function type(environment) {
    if (arguments.length === 0) {
      environment = navigator;
    }
    if (environment.appVersion.indexOf('Win') !== -1) {
      return 'Windows';
    }
    if (environment.appVersion.indexOf('Mac') !== -1) {
      return 'Mac';
    }
    if (environment.appVersion.indexOf('Linux') !== -1) {
      return 'Linux';
    }
    return defaultOs;
  }
  function arch(environment) {
    if (arguments.length === 0) {
      environment = navigator;
    }
    if (/Mac OS X 10\.[0-5]([\.\s]|$)/.test(environment.userAgent)) {
      return '32';
    }
    if (environment.userAgent.indexOf('Mac OS X') !== -1 || environment.userAgent.indexOf('WOW64') !== -1 || environment.platform.indexOf('Win64') !== -1 || environment.platform.indexOf('Linux x86_64') !== -1) {
      return '64';
    }
    return defaultArch;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/platformDownloads/main.js", ["npm:jquery@1.11.3", "src/platform/os.js"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var platform = $__require('src/platform/os.js');
  module.exports = function initPlatformDownloads() {
    var collapsibleEvents = {
      shown: showCollapsible,
      hide: hideCollapsible
    };
    $(function() {
      $('.download-links li.' + os.type() + os.arch()).show();
      $('#platform--' + os.type()).addClass('in').css('overflow', 'visible').css('height', 'auto').parent().find('.platform-dropdown--icon').removeClass('icon-chevron-down').addClass('icon-chevron-up');
      $('.collapse').removeClass('in').on(collapsibleEvents);
    });
    return {destroy: function() {
        $('collapse').off(collapsibleEvents);
      }};
  };
  function showCollapsible() {
    $(this).css({
      overflow: 'visible',
      height: 'auto'
    }).parent().find('.platform-dropdown--icon').removeClass('icon-chevron-down').addClass('icon-chevron-up');
  }
  function hideCollapsible() {
    $(this).css({
      overflow: 'hidden',
      height: 0
    }).parent().find('.platform-dropdown--icon').removeClass('icon-chevron-up').addClass('icon-chevron-down');
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/infoPopups/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var openItemPopupsTrigger = '.js-item--open-dropdown';
  var itemPopupWrapper = '.js-item-dropdown--wrapper';
  var itemPopupOpen = 'js-open';
  var itemPopupWrapperOpen = itemPopupWrapper + '.' + itemPopupOpen;
  module.exports = function initInfoPopups() {
    $(ready);
    return {destroy: destroy};
    function ready() {
      $(openItemPopupsTrigger).on('click', handleItemPopup);
    }
    function destroy() {
      $(openItemPopupsTrigger).off('click', handleItemPopup);
    }
  };
  function handleItemPopup(e) {
    e.stopImmediatePropagation();
    var target = $(this).parents(itemPopupWrapper);
    if (target.hasClass(itemPopupOpen)) {
      target.removeClass(itemPopupOpen);
    } else {
      hideAll();
      enableClickTrap();
      target.addClass(itemPopupOpen);
    }
  }
  function enableClickTrap() {
    $(document).on('click', disableClickTrap);
  }
  function disableClickTrap() {
    $(document).off('click', disableClickTrap);
    hideAll();
  }
  function hideAll() {
    $(itemPopupWrapperOpen).removeClass(itemPopupOpen);
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/mobileSupport/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  var openNavDrawerTrigger = '.js-open-nav-drawer';
  module.exports = function initMobileSupport() {
    $(ready);
    return {destroy: destroy};
    function ready() {
      window.addEventListener('orientationchange', handleOrientationChange, false);
      $(openNavDrawerTrigger).on('click', handleOpenNavDrawer);
    }
    function destroy() {
      $(openNavDrawerTrigger).off('click', handleOpenNavDrawer);
      window.removeEventListener('orientationchange', handleOrientationChange, false);
    }
  };
  function handleOrientationChange() {
    var openDrawer = $('.js-open-nav-drawer.js-slide-right');
    if (!openDrawer.length) {
      return;
    }
    $('.viewport').height($(window).height()).addClass('constrained');
  }
  function handleOpenNavDrawer() {
    $('.navigation-drawer--container').addClass('js-open');
    $('.mobile-nav, .body--container, .homepage--body').addClass('js-slide-right');
    var deviceHeight = $(window).height();
    $('.viewport').height(deviceHeight).addClass('constrained');
    $('#scrim').addClass('js-show js-open-mobile-nav').on('click', hideMobileNavDrawer);
  }
  function hideMobileNavDrawer() {
    $('#scrim').removeClass('js-show js-open-mobile-nav').off('click', hideMobileNavDrawer);
    $('.navigation-drawer--container').removeClass('js-open');
    $('.mobile-nav, .body--container, .homepage--body').removeClass('js-slide-right');
    $('.viewport').removeClass('constrained');
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/stsImport/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  module.exports = initStsImport;
  function initStsImport() {
    var plan = {
      ready: ready,
      destroy: function() {}
    };
    function ready() {
      if (typeof sts_import === 'function') {
        $('.gs-guide-import').show().click(function(e) {
          e.preventDefault();
          sts_import('guide', e.target.href);
        });
      }
    }
    $(function() {
      plan.ready();
    }.bind(plan));
    return plan;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/codeSidebar/main.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  module.exports = initSidebar;
  function initSidebar() {
    var plan = {
      ready: function() {
        var switchProtocol,
            $repoSwitchButtons,
            $actionsSection;
        $actionsSection = $('.github-actions');
        $repoSwitchButtons = $actionsSection.find('[data-protocol]');
        switchProtocol = (function(switcher) {
          var prevProtocol = 'https';
          return function(e) {
            var protocol = $(e.target).data('protocol');
            switcher(prevProtocol, protocol);
            prevProtocol = protocol;
          };
        }(this.switchProtocol.bind(this, $actionsSection)));
        $repoSwitchButtons.on('click', switchProtocol);
        this._destroy = function() {
          $repoSwitchButtons.off('click', switchProtocol);
        };
      },
      switchProtocol: function($root, prevProtocol, protocol) {
        $root.removeClass(prevProtocol);
        $root.addClass(protocol);
        return protocol;
      },
      destroy: function() {
        return this._destroy();
      },
      _destroy: function() {}
    };
    $(function() {
      plan.ready();
    }.bind(plan));
    return plan;
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:twbs/bootstrap@2.3.2/docs/assets/js/bootstrap", [], false, function(__require, __exports, __module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal(__module.id, null, null);
  (function() {
    !function($) {
      "use strict";
      $(function() {
        $.support.transition = (function() {
          var transitionEnd = (function() {
            var el = document.createElement('bootstrap'),
                transEndEventNames = {
                  'WebkitTransition': 'webkitTransitionEnd',
                  'MozTransition': 'transitionend',
                  'OTransition': 'oTransitionEnd otransitionend',
                  'transition': 'transitionend'
                },
                name;
            for (name in transEndEventNames) {
              if (el.style[name] !== undefined) {
                return transEndEventNames[name];
              }
            }
          }());
          return transitionEnd && {end: transitionEnd};
        })();
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var dismiss = '[data-dismiss="alert"]',
          Alert = function(el) {
            $(el).on('click', dismiss, this.close);
          };
      Alert.prototype.close = function(e) {
        var $this = $(this),
            selector = $this.attr('data-target'),
            $parent;
        if (!selector) {
          selector = $this.attr('href');
          selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
        }
        $parent = $(selector);
        e && e.preventDefault();
        $parent.length || ($parent = $this.hasClass('alert') ? $this : $this.parent());
        $parent.trigger(e = $.Event('close'));
        if (e.isDefaultPrevented())
          return;
        $parent.removeClass('in');
        function removeElement() {
          $parent.trigger('closed').remove();
        }
        $.support.transition && $parent.hasClass('fade') ? $parent.on($.support.transition.end, removeElement) : removeElement();
      };
      var old = $.fn.alert;
      $.fn.alert = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('alert');
          if (!data)
            $this.data('alert', (data = new Alert(this)));
          if (typeof option == 'string')
            data[option].call($this);
        });
      };
      $.fn.alert.Constructor = Alert;
      $.fn.alert.noConflict = function() {
        $.fn.alert = old;
        return this;
      };
      $(document).on('click.alert.data-api', dismiss, Alert.prototype.close);
    }(window.jQuery);
    !function($) {
      "use strict";
      var Button = function(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.button.defaults, options);
      };
      Button.prototype.setState = function(state) {
        var d = 'disabled',
            $el = this.$element,
            data = $el.data(),
            val = $el.is('input') ? 'val' : 'html';
        state = state + 'Text';
        data.resetText || $el.data('resetText', $el[val]());
        $el[val](data[state] || this.options[state]);
        setTimeout(function() {
          state == 'loadingText' ? $el.addClass(d).attr(d, d) : $el.removeClass(d).removeAttr(d);
        }, 0);
      };
      Button.prototype.toggle = function() {
        var $parent = this.$element.closest('[data-toggle="buttons-radio"]');
        $parent && $parent.find('.active').removeClass('active');
        this.$element.toggleClass('active');
      };
      var old = $.fn.button;
      $.fn.button = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('button'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('button', (data = new Button(this, options)));
          if (option == 'toggle')
            data.toggle();
          else if (option)
            data.setState(option);
        });
      };
      $.fn.button.defaults = {loadingText: 'loading...'};
      $.fn.button.Constructor = Button;
      $.fn.button.noConflict = function() {
        $.fn.button = old;
        return this;
      };
      $(document).on('click.button.data-api', '[data-toggle^=button]', function(e) {
        var $btn = $(e.target);
        if (!$btn.hasClass('btn'))
          $btn = $btn.closest('.btn');
        $btn.button('toggle');
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Carousel = function(element, options) {
        this.$element = $(element);
        this.$indicators = this.$element.find('.carousel-indicators');
        this.options = options;
        this.options.pause == 'hover' && this.$element.on('mouseenter', $.proxy(this.pause, this)).on('mouseleave', $.proxy(this.cycle, this));
      };
      Carousel.prototype = {
        cycle: function(e) {
          if (!e)
            this.paused = false;
          if (this.interval)
            clearInterval(this.interval);
          this.options.interval && !this.paused && (this.interval = setInterval($.proxy(this.next, this), this.options.interval));
          return this;
        },
        getActiveIndex: function() {
          this.$active = this.$element.find('.item.active');
          this.$items = this.$active.parent().children();
          return this.$items.index(this.$active);
        },
        to: function(pos) {
          var activeIndex = this.getActiveIndex(),
              that = this;
          if (pos > (this.$items.length - 1) || pos < 0)
            return;
          if (this.sliding) {
            return this.$element.one('slid', function() {
              that.to(pos);
            });
          }
          if (activeIndex == pos) {
            return this.pause().cycle();
          }
          return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]));
        },
        pause: function(e) {
          if (!e)
            this.paused = true;
          if (this.$element.find('.next, .prev').length && $.support.transition.end) {
            this.$element.trigger($.support.transition.end);
            this.cycle(true);
          }
          clearInterval(this.interval);
          this.interval = null;
          return this;
        },
        next: function() {
          if (this.sliding)
            return;
          return this.slide('next');
        },
        prev: function() {
          if (this.sliding)
            return;
          return this.slide('prev');
        },
        slide: function(type, next) {
          var $active = this.$element.find('.item.active'),
              $next = next || $active[type](),
              isCycling = this.interval,
              direction = type == 'next' ? 'left' : 'right',
              fallback = type == 'next' ? 'first' : 'last',
              that = this,
              e;
          this.sliding = true;
          isCycling && this.pause();
          $next = $next.length ? $next : this.$element.find('.item')[fallback]();
          e = $.Event('slide', {
            relatedTarget: $next[0],
            direction: direction
          });
          if ($next.hasClass('active'))
            return;
          if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active');
            this.$element.one('slid', function() {
              var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()]);
              $nextIndicator && $nextIndicator.addClass('active');
            });
          }
          if ($.support.transition && this.$element.hasClass('slide')) {
            this.$element.trigger(e);
            if (e.isDefaultPrevented())
              return;
            $next.addClass(type);
            $next[0].offsetWidth;
            $active.addClass(direction);
            $next.addClass(direction);
            this.$element.one($.support.transition.end, function() {
              $next.removeClass([type, direction].join(' ')).addClass('active');
              $active.removeClass(['active', direction].join(' '));
              that.sliding = false;
              setTimeout(function() {
                that.$element.trigger('slid');
              }, 0);
            });
          } else {
            this.$element.trigger(e);
            if (e.isDefaultPrevented())
              return;
            $active.removeClass('active');
            $next.addClass('active');
            this.sliding = false;
            this.$element.trigger('slid');
          }
          isCycling && this.cycle();
          return this;
        }
      };
      var old = $.fn.carousel;
      $.fn.carousel = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('carousel'),
              options = $.extend({}, $.fn.carousel.defaults, typeof option == 'object' && option),
              action = typeof option == 'string' ? option : options.slide;
          if (!data)
            $this.data('carousel', (data = new Carousel(this, options)));
          if (typeof option == 'number')
            data.to(option);
          else if (action)
            data[action]();
          else if (options.interval)
            data.pause().cycle();
        });
      };
      $.fn.carousel.defaults = {
        interval: 5000,
        pause: 'hover'
      };
      $.fn.carousel.Constructor = Carousel;
      $.fn.carousel.noConflict = function() {
        $.fn.carousel = old;
        return this;
      };
      $(document).on('click.carousel.data-api', '[data-slide], [data-slide-to]', function(e) {
        var $this = $(this),
            href,
            $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')),
            options = $.extend({}, $target.data(), $this.data()),
            slideIndex;
        $target.carousel(options);
        if (slideIndex = $this.attr('data-slide-to')) {
          $target.data('carousel').pause().to(slideIndex).cycle();
        }
        e.preventDefault();
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Collapse = function(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.collapse.defaults, options);
        if (this.options.parent) {
          this.$parent = $(this.options.parent);
        }
        this.options.toggle && this.toggle();
      };
      Collapse.prototype = {
        constructor: Collapse,
        dimension: function() {
          var hasWidth = this.$element.hasClass('width');
          return hasWidth ? 'width' : 'height';
        },
        show: function() {
          var dimension,
              scroll,
              actives,
              hasData;
          if (this.transitioning || this.$element.hasClass('in'))
            return;
          dimension = this.dimension();
          scroll = $.camelCase(['scroll', dimension].join('-'));
          actives = this.$parent && this.$parent.find('> .accordion-group > .in');
          if (actives && actives.length) {
            hasData = actives.data('collapse');
            if (hasData && hasData.transitioning)
              return;
            actives.collapse('hide');
            hasData || actives.data('collapse', null);
          }
          this.$element[dimension](0);
          this.transition('addClass', $.Event('show'), 'shown');
          $.support.transition && this.$element[dimension](this.$element[0][scroll]);
        },
        hide: function() {
          var dimension;
          if (this.transitioning || !this.$element.hasClass('in'))
            return;
          dimension = this.dimension();
          this.reset(this.$element[dimension]());
          this.transition('removeClass', $.Event('hide'), 'hidden');
          this.$element[dimension](0);
        },
        reset: function(size) {
          var dimension = this.dimension();
          this.$element.removeClass('collapse')[dimension](size || 'auto')[0].offsetWidth;
          this.$element[size !== null ? 'addClass' : 'removeClass']('collapse');
          return this;
        },
        transition: function(method, startEvent, completeEvent) {
          var that = this,
              complete = function() {
                if (startEvent.type == 'show')
                  that.reset();
                that.transitioning = 0;
                that.$element.trigger(completeEvent);
              };
          this.$element.trigger(startEvent);
          if (startEvent.isDefaultPrevented())
            return;
          this.transitioning = 1;
          this.$element[method]('in');
          $.support.transition && this.$element.hasClass('collapse') ? this.$element.one($.support.transition.end, complete) : complete();
        },
        toggle: function() {
          this[this.$element.hasClass('in') ? 'hide' : 'show']();
        }
      };
      var old = $.fn.collapse;
      $.fn.collapse = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('collapse'),
              options = $.extend({}, $.fn.collapse.defaults, $this.data(), typeof option == 'object' && option);
          if (!data)
            $this.data('collapse', (data = new Collapse(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.collapse.defaults = {toggle: true};
      $.fn.collapse.Constructor = Collapse;
      $.fn.collapse.noConflict = function() {
        $.fn.collapse = old;
        return this;
      };
      $(document).on('click.collapse.data-api', '[data-toggle=collapse]', function(e) {
        var $this = $(this),
            href,
            target = $this.attr('data-target') || e.preventDefault() || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''),
            option = $(target).data('collapse') ? 'toggle' : $this.data();
        $this[$(target).hasClass('in') ? 'addClass' : 'removeClass']('collapsed');
        $(target).collapse(option);
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var toggle = '[data-toggle=dropdown]',
          Dropdown = function(element) {
            var $el = $(element).on('click.dropdown.data-api', this.toggle);
            $('html').on('click.dropdown.data-api', function() {
              $el.parent().removeClass('open');
            });
          };
      Dropdown.prototype = {
        constructor: Dropdown,
        toggle: function(e) {
          var $this = $(this),
              $parent,
              isActive;
          if ($this.is('.disabled, :disabled'))
            return;
          $parent = getParent($this);
          isActive = $parent.hasClass('open');
          clearMenus();
          if (!isActive) {
            if ('ontouchstart' in document.documentElement) {
              $('<div class="dropdown-backdrop"/>').insertBefore($(this)).on('click', clearMenus);
            }
            $parent.toggleClass('open');
          }
          $this.focus();
          return false;
        },
        keydown: function(e) {
          var $this,
              $items,
              $active,
              $parent,
              isActive,
              index;
          if (!/(38|40|27)/.test(e.keyCode))
            return;
          $this = $(this);
          e.preventDefault();
          e.stopPropagation();
          if ($this.is('.disabled, :disabled'))
            return;
          $parent = getParent($this);
          isActive = $parent.hasClass('open');
          if (!isActive || (isActive && e.keyCode == 27)) {
            if (e.which == 27)
              $parent.find(toggle).focus();
            return $this.click();
          }
          $items = $('[role=menu] li:not(.divider):visible a', $parent);
          if (!$items.length)
            return;
          index = $items.index($items.filter(':focus'));
          if (e.keyCode == 38 && index > 0)
            index--;
          if (e.keyCode == 40 && index < $items.length - 1)
            index++;
          if (!~index)
            index = 0;
          $items.eq(index).focus();
        }
      };
      function clearMenus() {
        $('.dropdown-backdrop').remove();
        $(toggle).each(function() {
          getParent($(this)).removeClass('open');
        });
      }
      function getParent($this) {
        var selector = $this.attr('data-target'),
            $parent;
        if (!selector) {
          selector = $this.attr('href');
          selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '');
        }
        $parent = selector && $(selector);
        if (!$parent || !$parent.length)
          $parent = $this.parent();
        return $parent;
      }
      var old = $.fn.dropdown;
      $.fn.dropdown = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('dropdown');
          if (!data)
            $this.data('dropdown', (data = new Dropdown(this)));
          if (typeof option == 'string')
            data[option].call($this);
        });
      };
      $.fn.dropdown.Constructor = Dropdown;
      $.fn.dropdown.noConflict = function() {
        $.fn.dropdown = old;
        return this;
      };
      $(document).on('click.dropdown.data-api', clearMenus).on('click.dropdown.data-api', '.dropdown form', function(e) {
        e.stopPropagation();
      }).on('click.dropdown.data-api', toggle, Dropdown.prototype.toggle).on('keydown.dropdown.data-api', toggle + ', [role=menu]', Dropdown.prototype.keydown);
    }(window.jQuery);
    !function($) {
      "use strict";
      var Modal = function(element, options) {
        this.options = options;
        this.$element = $(element).delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this));
        this.options.remote && this.$element.find('.modal-body').load(this.options.remote);
      };
      Modal.prototype = {
        constructor: Modal,
        toggle: function() {
          return this[!this.isShown ? 'show' : 'hide']();
        },
        show: function() {
          var that = this,
              e = $.Event('show');
          this.$element.trigger(e);
          if (this.isShown || e.isDefaultPrevented())
            return;
          this.isShown = true;
          this.escape();
          this.backdrop(function() {
            var transition = $.support.transition && that.$element.hasClass('fade');
            if (!that.$element.parent().length) {
              that.$element.appendTo(document.body);
            }
            that.$element.show();
            if (transition) {
              that.$element[0].offsetWidth;
            }
            that.$element.addClass('in').attr('aria-hidden', false);
            that.enforceFocus();
            transition ? that.$element.one($.support.transition.end, function() {
              that.$element.focus().trigger('shown');
            }) : that.$element.focus().trigger('shown');
          });
        },
        hide: function(e) {
          e && e.preventDefault();
          var that = this;
          e = $.Event('hide');
          this.$element.trigger(e);
          if (!this.isShown || e.isDefaultPrevented())
            return;
          this.isShown = false;
          this.escape();
          $(document).off('focusin.modal');
          this.$element.removeClass('in').attr('aria-hidden', true);
          $.support.transition && this.$element.hasClass('fade') ? this.hideWithTransition() : this.hideModal();
        },
        enforceFocus: function() {
          var that = this;
          $(document).on('focusin.modal', function(e) {
            if (that.$element[0] !== e.target && !that.$element.has(e.target).length) {
              that.$element.focus();
            }
          });
        },
        escape: function() {
          var that = this;
          if (this.isShown && this.options.keyboard) {
            this.$element.on('keyup.dismiss.modal', function(e) {
              e.which == 27 && that.hide();
            });
          } else if (!this.isShown) {
            this.$element.off('keyup.dismiss.modal');
          }
        },
        hideWithTransition: function() {
          var that = this,
              timeout = setTimeout(function() {
                that.$element.off($.support.transition.end);
                that.hideModal();
              }, 500);
          this.$element.one($.support.transition.end, function() {
            clearTimeout(timeout);
            that.hideModal();
          });
        },
        hideModal: function() {
          var that = this;
          this.$element.hide();
          this.backdrop(function() {
            that.removeBackdrop();
            that.$element.trigger('hidden');
          });
        },
        removeBackdrop: function() {
          this.$backdrop && this.$backdrop.remove();
          this.$backdrop = null;
        },
        backdrop: function(callback) {
          var that = this,
              animate = this.$element.hasClass('fade') ? 'fade' : '';
          if (this.isShown && this.options.backdrop) {
            var doAnimate = $.support.transition && animate;
            this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />').appendTo(document.body);
            this.$backdrop.click(this.options.backdrop == 'static' ? $.proxy(this.$element[0].focus, this.$element[0]) : $.proxy(this.hide, this));
            if (doAnimate)
              this.$backdrop[0].offsetWidth;
            this.$backdrop.addClass('in');
            if (!callback)
              return;
            doAnimate ? this.$backdrop.one($.support.transition.end, callback) : callback();
          } else if (!this.isShown && this.$backdrop) {
            this.$backdrop.removeClass('in');
            $.support.transition && this.$element.hasClass('fade') ? this.$backdrop.one($.support.transition.end, callback) : callback();
          } else if (callback) {
            callback();
          }
        }
      };
      var old = $.fn.modal;
      $.fn.modal = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('modal'),
              options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option);
          if (!data)
            $this.data('modal', (data = new Modal(this, options)));
          if (typeof option == 'string')
            data[option]();
          else if (options.show)
            data.show();
        });
      };
      $.fn.modal.defaults = {
        backdrop: true,
        keyboard: true,
        show: true
      };
      $.fn.modal.Constructor = Modal;
      $.fn.modal.noConflict = function() {
        $.fn.modal = old;
        return this;
      };
      $(document).on('click.modal.data-api', '[data-toggle="modal"]', function(e) {
        var $this = $(this),
            href = $this.attr('href'),
            $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))),
            option = $target.data('modal') ? 'toggle' : $.extend({remote: !/#/.test(href) && href}, $target.data(), $this.data());
        e.preventDefault();
        $target.modal(option).one('hide', function() {
          $this.focus();
        });
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Tooltip = function(element, options) {
        this.init('tooltip', element, options);
      };
      Tooltip.prototype = {
        constructor: Tooltip,
        init: function(type, element, options) {
          var eventIn,
              eventOut,
              triggers,
              trigger,
              i;
          this.type = type;
          this.$element = $(element);
          this.options = this.getOptions(options);
          this.enabled = true;
          triggers = this.options.trigger.split(' ');
          for (i = triggers.length; i--; ) {
            trigger = triggers[i];
            if (trigger == 'click') {
              this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this));
            } else if (trigger != 'manual') {
              eventIn = trigger == 'hover' ? 'mouseenter' : 'focus';
              eventOut = trigger == 'hover' ? 'mouseleave' : 'blur';
              this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
              this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
            }
          }
          this.options.selector ? (this._options = $.extend({}, this.options, {
            trigger: 'manual',
            selector: ''
          })) : this.fixTitle();
        },
        getOptions: function(options) {
          options = $.extend({}, $.fn[this.type].defaults, this.$element.data(), options);
          if (options.delay && typeof options.delay == 'number') {
            options.delay = {
              show: options.delay,
              hide: options.delay
            };
          }
          return options;
        },
        enter: function(e) {
          var defaults = $.fn[this.type].defaults,
              options = {},
              self;
          this._options && $.each(this._options, function(key, value) {
            if (defaults[key] != value)
              options[key] = value;
          }, this);
          self = $(e.currentTarget)[this.type](options).data(this.type);
          if (!self.options.delay || !self.options.delay.show)
            return self.show();
          clearTimeout(this.timeout);
          self.hoverState = 'in';
          this.timeout = setTimeout(function() {
            if (self.hoverState == 'in')
              self.show();
          }, self.options.delay.show);
        },
        leave: function(e) {
          var self = $(e.currentTarget)[this.type](this._options).data(this.type);
          if (this.timeout)
            clearTimeout(this.timeout);
          if (!self.options.delay || !self.options.delay.hide)
            return self.hide();
          self.hoverState = 'out';
          this.timeout = setTimeout(function() {
            if (self.hoverState == 'out')
              self.hide();
          }, self.options.delay.hide);
        },
        show: function() {
          var $tip,
              pos,
              actualWidth,
              actualHeight,
              placement,
              tp,
              e = $.Event('show');
          if (this.hasContent() && this.enabled) {
            this.$element.trigger(e);
            if (e.isDefaultPrevented())
              return;
            $tip = this.tip();
            this.setContent();
            if (this.options.animation) {
              $tip.addClass('fade');
            }
            placement = typeof this.options.placement == 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;
            $tip.detach().css({
              top: 0,
              left: 0,
              display: 'block'
            });
            this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);
            pos = this.getPosition();
            actualWidth = $tip[0].offsetWidth;
            actualHeight = $tip[0].offsetHeight;
            switch (placement) {
              case 'bottom':
                tp = {
                  top: pos.top + pos.height,
                  left: pos.left + pos.width / 2 - actualWidth / 2
                };
                break;
              case 'top':
                tp = {
                  top: pos.top - actualHeight,
                  left: pos.left + pos.width / 2 - actualWidth / 2
                };
                break;
              case 'left':
                tp = {
                  top: pos.top + pos.height / 2 - actualHeight / 2,
                  left: pos.left - actualWidth
                };
                break;
              case 'right':
                tp = {
                  top: pos.top + pos.height / 2 - actualHeight / 2,
                  left: pos.left + pos.width
                };
                break;
            }
            this.applyPlacement(tp, placement);
            this.$element.trigger('shown');
          }
        },
        applyPlacement: function(offset, placement) {
          var $tip = this.tip(),
              width = $tip[0].offsetWidth,
              height = $tip[0].offsetHeight,
              actualWidth,
              actualHeight,
              delta,
              replace;
          $tip.offset(offset).addClass(placement).addClass('in');
          actualWidth = $tip[0].offsetWidth;
          actualHeight = $tip[0].offsetHeight;
          if (placement == 'top' && actualHeight != height) {
            offset.top = offset.top + height - actualHeight;
            replace = true;
          }
          if (placement == 'bottom' || placement == 'top') {
            delta = 0;
            if (offset.left < 0) {
              delta = offset.left * -2;
              offset.left = 0;
              $tip.offset(offset);
              actualWidth = $tip[0].offsetWidth;
              actualHeight = $tip[0].offsetHeight;
            }
            this.replaceArrow(delta - width + actualWidth, actualWidth, 'left');
          } else {
            this.replaceArrow(actualHeight - height, actualHeight, 'top');
          }
          if (replace)
            $tip.offset(offset);
        },
        replaceArrow: function(delta, dimension, position) {
          this.arrow().css(position, delta ? (50 * (1 - delta / dimension) + "%") : '');
        },
        setContent: function() {
          var $tip = this.tip(),
              title = this.getTitle();
          $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title);
          $tip.removeClass('fade in top bottom left right');
        },
        hide: function() {
          var that = this,
              $tip = this.tip(),
              e = $.Event('hide');
          this.$element.trigger(e);
          if (e.isDefaultPrevented())
            return;
          $tip.removeClass('in');
          function removeWithAnimation() {
            var timeout = setTimeout(function() {
              $tip.off($.support.transition.end).detach();
            }, 500);
            $tip.one($.support.transition.end, function() {
              clearTimeout(timeout);
              $tip.detach();
            });
          }
          $.support.transition && this.$tip.hasClass('fade') ? removeWithAnimation() : $tip.detach();
          this.$element.trigger('hidden');
          return this;
        },
        fixTitle: function() {
          var $e = this.$element;
          if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
            $e.attr('data-original-title', $e.attr('title') || '').attr('title', '');
          }
        },
        hasContent: function() {
          return this.getTitle();
        },
        getPosition: function() {
          var el = this.$element[0];
          return $.extend({}, (typeof el.getBoundingClientRect == 'function') ? el.getBoundingClientRect() : {
            width: el.offsetWidth,
            height: el.offsetHeight
          }, this.$element.offset());
        },
        getTitle: function() {
          var title,
              $e = this.$element,
              o = this.options;
          title = $e.attr('data-original-title') || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title);
          return title;
        },
        tip: function() {
          return this.$tip = this.$tip || $(this.options.template);
        },
        arrow: function() {
          return this.$arrow = this.$arrow || this.tip().find(".tooltip-arrow");
        },
        validate: function() {
          if (!this.$element[0].parentNode) {
            this.hide();
            this.$element = null;
            this.options = null;
          }
        },
        enable: function() {
          this.enabled = true;
        },
        disable: function() {
          this.enabled = false;
        },
        toggleEnabled: function() {
          this.enabled = !this.enabled;
        },
        toggle: function(e) {
          var self = e ? $(e.currentTarget)[this.type](this._options).data(this.type) : this;
          self.tip().hasClass('in') ? self.hide() : self.show();
        },
        destroy: function() {
          this.hide().$element.off('.' + this.type).removeData(this.type);
        }
      };
      var old = $.fn.tooltip;
      $.fn.tooltip = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('tooltip'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('tooltip', (data = new Tooltip(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.tooltip.Constructor = Tooltip;
      $.fn.tooltip.defaults = {
        animation: true,
        placement: 'top',
        selector: false,
        template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        container: false
      };
      $.fn.tooltip.noConflict = function() {
        $.fn.tooltip = old;
        return this;
      };
    }(window.jQuery);
    !function($) {
      "use strict";
      var Popover = function(element, options) {
        this.init('popover', element, options);
      };
      Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype, {
        constructor: Popover,
        setContent: function() {
          var $tip = this.tip(),
              title = this.getTitle(),
              content = this.getContent();
          $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title);
          $tip.find('.popover-content')[this.options.html ? 'html' : 'text'](content);
          $tip.removeClass('fade top bottom left right in');
        },
        hasContent: function() {
          return this.getTitle() || this.getContent();
        },
        getContent: function() {
          var content,
              $e = this.$element,
              o = this.options;
          content = (typeof o.content == 'function' ? o.content.call($e[0]) : o.content) || $e.attr('data-content');
          return content;
        },
        tip: function() {
          if (!this.$tip) {
            this.$tip = $(this.options.template);
          }
          return this.$tip;
        },
        destroy: function() {
          this.hide().$element.off('.' + this.type).removeData(this.type);
        }
      });
      var old = $.fn.popover;
      $.fn.popover = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('popover'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('popover', (data = new Popover(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.popover.Constructor = Popover;
      $.fn.popover.defaults = $.extend({}, $.fn.tooltip.defaults, {
        placement: 'right',
        trigger: 'click',
        content: '',
        template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
      });
      $.fn.popover.noConflict = function() {
        $.fn.popover = old;
        return this;
      };
    }(window.jQuery);
    !function($) {
      "use strict";
      function ScrollSpy(element, options) {
        var process = $.proxy(this.process, this),
            $element = $(element).is('body') ? $(window) : $(element),
            href;
        this.options = $.extend({}, $.fn.scrollspy.defaults, options);
        this.$scrollElement = $element.on('scroll.scroll-spy.data-api', process);
        this.selector = (this.options.target || ((href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) || '') + ' .nav li > a';
        this.$body = $('body');
        this.refresh();
        this.process();
      }
      ScrollSpy.prototype = {
        constructor: ScrollSpy,
        refresh: function() {
          var self = this,
              $targets;
          this.offsets = $([]);
          this.targets = $([]);
          $targets = this.$body.find(this.selector).map(function() {
            var $el = $(this),
                href = $el.data('target') || $el.attr('href'),
                $href = /^#\w/.test(href) && $(href);
            return ($href && $href.length && [[$href.position().top + (!$.isWindow(self.$scrollElement.get(0)) && self.$scrollElement.scrollTop()), href]]) || null;
          }).sort(function(a, b) {
            return a[0] - b[0];
          }).each(function() {
            self.offsets.push(this[0]);
            self.targets.push(this[1]);
          });
        },
        process: function() {
          var scrollTop = this.$scrollElement.scrollTop() + this.options.offset,
              scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight,
              maxScroll = scrollHeight - this.$scrollElement.height(),
              offsets = this.offsets,
              targets = this.targets,
              activeTarget = this.activeTarget,
              i;
          if (scrollTop >= maxScroll) {
            return activeTarget != (i = targets.last()[0]) && this.activate(i);
          }
          for (i = offsets.length; i--; ) {
            activeTarget != targets[i] && scrollTop >= offsets[i] && (!offsets[i + 1] || scrollTop <= offsets[i + 1]) && this.activate(targets[i]);
          }
        },
        activate: function(target) {
          var active,
              selector;
          this.activeTarget = target;
          $(this.selector).parent('.active').removeClass('active');
          selector = this.selector + '[data-target="' + target + '"],' + this.selector + '[href="' + target + '"]';
          active = $(selector).parent('li').addClass('active');
          if (active.parent('.dropdown-menu').length) {
            active = active.closest('li.dropdown').addClass('active');
          }
          active.trigger('activate');
        }
      };
      var old = $.fn.scrollspy;
      $.fn.scrollspy = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('scrollspy'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('scrollspy', (data = new ScrollSpy(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.scrollspy.Constructor = ScrollSpy;
      $.fn.scrollspy.defaults = {offset: 10};
      $.fn.scrollspy.noConflict = function() {
        $.fn.scrollspy = old;
        return this;
      };
      $(window).on('load', function() {
        $('[data-spy="scroll"]').each(function() {
          var $spy = $(this);
          $spy.scrollspy($spy.data());
        });
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Tab = function(element) {
        this.element = $(element);
      };
      Tab.prototype = {
        constructor: Tab,
        show: function() {
          var $this = this.element,
              $ul = $this.closest('ul:not(.dropdown-menu)'),
              selector = $this.attr('data-target'),
              previous,
              $target,
              e;
          if (!selector) {
            selector = $this.attr('href');
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
          }
          if ($this.parent('li').hasClass('active'))
            return;
          previous = $ul.find('.active:last a')[0];
          e = $.Event('show', {relatedTarget: previous});
          $this.trigger(e);
          if (e.isDefaultPrevented())
            return;
          $target = $(selector);
          this.activate($this.parent('li'), $ul);
          this.activate($target, $target.parent(), function() {
            $this.trigger({
              type: 'shown',
              relatedTarget: previous
            });
          });
        },
        activate: function(element, container, callback) {
          var $active = container.find('> .active'),
              transition = callback && $.support.transition && $active.hasClass('fade');
          function next() {
            $active.removeClass('active').find('> .dropdown-menu > .active').removeClass('active');
            element.addClass('active');
            if (transition) {
              element[0].offsetWidth;
              element.addClass('in');
            } else {
              element.removeClass('fade');
            }
            if (element.parent('.dropdown-menu')) {
              element.closest('li.dropdown').addClass('active');
            }
            callback && callback();
          }
          transition ? $active.one($.support.transition.end, next) : next();
          $active.removeClass('in');
        }
      };
      var old = $.fn.tab;
      $.fn.tab = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('tab');
          if (!data)
            $this.data('tab', (data = new Tab(this)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.tab.Constructor = Tab;
      $.fn.tab.noConflict = function() {
        $.fn.tab = old;
        return this;
      };
      $(document).on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function(e) {
        e.preventDefault();
        $(this).tab('show');
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Typeahead = function(element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.typeahead.defaults, options);
        this.matcher = this.options.matcher || this.matcher;
        this.sorter = this.options.sorter || this.sorter;
        this.highlighter = this.options.highlighter || this.highlighter;
        this.updater = this.options.updater || this.updater;
        this.source = this.options.source;
        this.$menu = $(this.options.menu);
        this.shown = false;
        this.listen();
      };
      Typeahead.prototype = {
        constructor: Typeahead,
        select: function() {
          var val = this.$menu.find('.active').attr('data-value');
          this.$element.val(this.updater(val)).change();
          return this.hide();
        },
        updater: function(item) {
          return item;
        },
        show: function() {
          var pos = $.extend({}, this.$element.position(), {height: this.$element[0].offsetHeight});
          this.$menu.insertAfter(this.$element).css({
            top: pos.top + pos.height,
            left: pos.left
          }).show();
          this.shown = true;
          return this;
        },
        hide: function() {
          this.$menu.hide();
          this.shown = false;
          return this;
        },
        lookup: function(event) {
          var items;
          this.query = this.$element.val();
          if (!this.query || this.query.length < this.options.minLength) {
            return this.shown ? this.hide() : this;
          }
          items = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source;
          return items ? this.process(items) : this;
        },
        process: function(items) {
          var that = this;
          items = $.grep(items, function(item) {
            return that.matcher(item);
          });
          items = this.sorter(items);
          if (!items.length) {
            return this.shown ? this.hide() : this;
          }
          return this.render(items.slice(0, this.options.items)).show();
        },
        matcher: function(item) {
          return ~item.toLowerCase().indexOf(this.query.toLowerCase());
        },
        sorter: function(items) {
          var beginswith = [],
              caseSensitive = [],
              caseInsensitive = [],
              item;
          while (item = items.shift()) {
            if (!item.toLowerCase().indexOf(this.query.toLowerCase()))
              beginswith.push(item);
            else if (~item.indexOf(this.query))
              caseSensitive.push(item);
            else
              caseInsensitive.push(item);
          }
          return beginswith.concat(caseSensitive, caseInsensitive);
        },
        highlighter: function(item) {
          var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
          return item.replace(new RegExp('(' + query + ')', 'ig'), function($1, match) {
            return '<strong>' + match + '</strong>';
          });
        },
        render: function(items) {
          var that = this;
          items = $(items).map(function(i, item) {
            i = $(that.options.item).attr('data-value', item);
            i.find('a').html(that.highlighter(item));
            return i[0];
          });
          items.first().addClass('active');
          this.$menu.html(items);
          return this;
        },
        next: function(event) {
          var active = this.$menu.find('.active').removeClass('active'),
              next = active.next();
          if (!next.length) {
            next = $(this.$menu.find('li')[0]);
          }
          next.addClass('active');
        },
        prev: function(event) {
          var active = this.$menu.find('.active').removeClass('active'),
              prev = active.prev();
          if (!prev.length) {
            prev = this.$menu.find('li').last();
          }
          prev.addClass('active');
        },
        listen: function() {
          this.$element.on('focus', $.proxy(this.focus, this)).on('blur', $.proxy(this.blur, this)).on('keypress', $.proxy(this.keypress, this)).on('keyup', $.proxy(this.keyup, this));
          if (this.eventSupported('keydown')) {
            this.$element.on('keydown', $.proxy(this.keydown, this));
          }
          this.$menu.on('click', $.proxy(this.click, this)).on('mouseenter', 'li', $.proxy(this.mouseenter, this)).on('mouseleave', 'li', $.proxy(this.mouseleave, this));
        },
        eventSupported: function(eventName) {
          var isSupported = eventName in this.$element;
          if (!isSupported) {
            this.$element.setAttribute(eventName, 'return;');
            isSupported = typeof this.$element[eventName] === 'function';
          }
          return isSupported;
        },
        move: function(e) {
          if (!this.shown)
            return;
          switch (e.keyCode) {
            case 9:
            case 13:
            case 27:
              e.preventDefault();
              break;
            case 38:
              e.preventDefault();
              this.prev();
              break;
            case 40:
              e.preventDefault();
              this.next();
              break;
          }
          e.stopPropagation();
        },
        keydown: function(e) {
          this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40, 38, 9, 13, 27]);
          this.move(e);
        },
        keypress: function(e) {
          if (this.suppressKeyPressRepeat)
            return;
          this.move(e);
        },
        keyup: function(e) {
          switch (e.keyCode) {
            case 40:
            case 38:
            case 16:
            case 17:
            case 18:
              break;
            case 9:
            case 13:
              if (!this.shown)
                return;
              this.select();
              break;
            case 27:
              if (!this.shown)
                return;
              this.hide();
              break;
            default:
              this.lookup();
          }
          e.stopPropagation();
          e.preventDefault();
        },
        focus: function(e) {
          this.focused = true;
        },
        blur: function(e) {
          this.focused = false;
          if (!this.mousedover && this.shown)
            this.hide();
        },
        click: function(e) {
          e.stopPropagation();
          e.preventDefault();
          this.select();
          this.$element.focus();
        },
        mouseenter: function(e) {
          this.mousedover = true;
          this.$menu.find('.active').removeClass('active');
          $(e.currentTarget).addClass('active');
        },
        mouseleave: function(e) {
          this.mousedover = false;
          if (!this.focused && this.shown)
            this.hide();
        }
      };
      var old = $.fn.typeahead;
      $.fn.typeahead = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('typeahead'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('typeahead', (data = new Typeahead(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.typeahead.defaults = {
        source: [],
        items: 8,
        menu: '<ul class="typeahead dropdown-menu"></ul>',
        item: '<li><a href="#"></a></li>',
        minLength: 1
      };
      $.fn.typeahead.Constructor = Typeahead;
      $.fn.typeahead.noConflict = function() {
        $.fn.typeahead = old;
        return this;
      };
      $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function(e) {
        var $this = $(this);
        if ($this.data('typeahead'))
          return;
        $this.typeahead($this.data());
      });
    }(window.jQuery);
    !function($) {
      "use strict";
      var Affix = function(element, options) {
        this.options = $.extend({}, $.fn.affix.defaults, options);
        this.$window = $(window).on('scroll.affix.data-api', $.proxy(this.checkPosition, this)).on('click.affix.data-api', $.proxy(function() {
          setTimeout($.proxy(this.checkPosition, this), 1);
        }, this));
        this.$element = $(element);
        this.checkPosition();
      };
      Affix.prototype.checkPosition = function() {
        if (!this.$element.is(':visible'))
          return;
        var scrollHeight = $(document).height(),
            scrollTop = this.$window.scrollTop(),
            position = this.$element.offset(),
            offset = this.options.offset,
            offsetBottom = offset.bottom,
            offsetTop = offset.top,
            reset = 'affix affix-top affix-bottom',
            affix;
        if (typeof offset != 'object')
          offsetBottom = offsetTop = offset;
        if (typeof offsetTop == 'function')
          offsetTop = offset.top();
        if (typeof offsetBottom == 'function')
          offsetBottom = offset.bottom();
        affix = this.unpin != null && (scrollTop + this.unpin <= position.top) ? false : offsetBottom != null && (position.top + this.$element.height() >= scrollHeight - offsetBottom) ? 'bottom' : offsetTop != null && scrollTop <= offsetTop ? 'top' : false;
        if (this.affixed === affix)
          return;
        this.affixed = affix;
        this.unpin = affix == 'bottom' ? position.top - scrollTop : null;
        this.$element.removeClass(reset).addClass('affix' + (affix ? '-' + affix : ''));
      };
      var old = $.fn.affix;
      $.fn.affix = function(option) {
        return this.each(function() {
          var $this = $(this),
              data = $this.data('affix'),
              options = typeof option == 'object' && option;
          if (!data)
            $this.data('affix', (data = new Affix(this, options)));
          if (typeof option == 'string')
            data[option]();
        });
      };
      $.fn.affix.Constructor = Affix;
      $.fn.affix.defaults = {offset: 0};
      $.fn.affix.noConflict = function() {
        $.fn.affix = old;
        return this;
      };
      $(window).on('load', function() {
        $('[data-spy="affix"]').each(function() {
          var $spy = $(this),
              data = $spy.data();
          data.offset = data.offset || {};
          data.offsetBottom && (data.offset.bottom = data.offsetBottom);
          data.offsetTop && (data.offset.top = data.offsetTop);
          $spy.affix(data);
        });
      });
    }(window.jQuery);
  })();
  return _retrieveGlobal();
});

System.registerDynamic("github:twbs/bootstrap@2.3.2", ["github:twbs/bootstrap@2.3.2/docs/assets/js/bootstrap"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('github:twbs/bootstrap@2.3.2/docs/assets/js/bootstrap');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/clipboardButtons/copyButtonProvider.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = copyButtonProvider;
  function copyButtonProvider(prototype) {
    return function appendCopyButton(host) {
      var button = prototype.cloneNode(true);
      host.parentNode.insertBefore(button, host);
      return button;
    };
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/clipboardButtons/buttonConnector.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(provideButton) {
    return function createClipboardElements(elements) {
      var el,
          button,
          text,
          buttons = [];
      for (var i = 0,
          len = elements.length; i < len; i++) {
        el = elements[i];
        button = provideButton(el);
        if (el.id) {
          button.setAttribute('data-clipboard-target', el.id);
        } else {
          text = el.value || el.textContent || el.innerText;
          button.setAttribute('data-clipboard-text', text);
        }
        buttons.push(button);
      }
      return buttons;
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:zeroclipboard@1.3.5/ZeroClipboard", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(window) {
    "use strict";
    var currentElement;
    var flashState = {
      bridge: null,
      version: "0.0.0",
      disabled: null,
      outdated: null,
      ready: null
    };
    var _clipData = {};
    var clientIdCounter = 0;
    var _clientMeta = {};
    var elementIdCounter = 0;
    var _elementMeta = {};
    var _amdModuleId = null;
    var _cjsModuleId = null;
    var _swfPath = function() {
      var i,
          jsDir,
          tmpJsPath,
          jsPath,
          swfPath = "ZeroClipboard.swf";
      if (document.currentScript && (jsPath = document.currentScript.src)) {} else {
        var scripts = document.getElementsByTagName("script");
        if ("readyState" in scripts[0]) {
          for (i = scripts.length; i--; ) {
            if (scripts[i].readyState === "interactive" && (jsPath = scripts[i].src)) {
              break;
            }
          }
        } else if (document.readyState === "loading") {
          jsPath = scripts[scripts.length - 1].src;
        } else {
          for (i = scripts.length; i--; ) {
            tmpJsPath = scripts[i].src;
            if (!tmpJsPath) {
              jsDir = null;
              break;
            }
            tmpJsPath = tmpJsPath.split("#")[0].split("?")[0];
            tmpJsPath = tmpJsPath.slice(0, tmpJsPath.lastIndexOf("/") + 1);
            if (jsDir == null) {
              jsDir = tmpJsPath;
            } else if (jsDir !== tmpJsPath) {
              jsDir = null;
              break;
            }
          }
          if (jsDir !== null) {
            jsPath = jsDir;
          }
        }
      }
      if (jsPath) {
        jsPath = jsPath.split("#")[0].split("?")[0];
        swfPath = jsPath.slice(0, jsPath.lastIndexOf("/") + 1) + swfPath;
      }
      return swfPath;
    }();
    var _camelizeCssPropName = function() {
      var matcherRegex = /\-([a-z])/g,
          replacerFn = function(match, group) {
            return group.toUpperCase();
          };
      return function(prop) {
        return prop.replace(matcherRegex, replacerFn);
      };
    }();
    var _getStyle = function(el, prop) {
      var value,
          camelProp,
          tagName,
          possiblePointers,
          i,
          len;
      if (window.getComputedStyle) {
        value = window.getComputedStyle(el, null).getPropertyValue(prop);
      } else {
        camelProp = _camelizeCssPropName(prop);
        if (el.currentStyle) {
          value = el.currentStyle[camelProp];
        } else {
          value = el.style[camelProp];
        }
      }
      if (prop === "cursor") {
        if (!value || value === "auto") {
          tagName = el.tagName.toLowerCase();
          if (tagName === "a") {
            return "pointer";
          }
        }
      }
      return value;
    };
    var _elementMouseOver = function(event) {
      if (!event) {
        event = window.event;
      }
      var target;
      if (this !== window) {
        target = this;
      } else if (event.target) {
        target = event.target;
      } else if (event.srcElement) {
        target = event.srcElement;
      }
      ZeroClipboard.activate(target);
    };
    var _addEventHandler = function(element, method, func) {
      if (!element || element.nodeType !== 1) {
        return;
      }
      if (element.addEventListener) {
        element.addEventListener(method, func, false);
      } else if (element.attachEvent) {
        element.attachEvent("on" + method, func);
      }
    };
    var _removeEventHandler = function(element, method, func) {
      if (!element || element.nodeType !== 1) {
        return;
      }
      if (element.removeEventListener) {
        element.removeEventListener(method, func, false);
      } else if (element.detachEvent) {
        element.detachEvent("on" + method, func);
      }
    };
    var _addClass = function(element, value) {
      if (!element || element.nodeType !== 1) {
        return element;
      }
      if (element.classList) {
        if (!element.classList.contains(value)) {
          element.classList.add(value);
        }
        return element;
      }
      if (value && typeof value === "string") {
        var classNames = (value || "").split(/\s+/);
        if (element.nodeType === 1) {
          if (!element.className) {
            element.className = value;
          } else {
            var className = " " + element.className + " ",
                setClass = element.className;
            for (var c = 0,
                cl = classNames.length; c < cl; c++) {
              if (className.indexOf(" " + classNames[c] + " ") < 0) {
                setClass += " " + classNames[c];
              }
            }
            element.className = setClass.replace(/^\s+|\s+$/g, "");
          }
        }
      }
      return element;
    };
    var _removeClass = function(element, value) {
      if (!element || element.nodeType !== 1) {
        return element;
      }
      if (element.classList) {
        if (element.classList.contains(value)) {
          element.classList.remove(value);
        }
        return element;
      }
      if (value && typeof value === "string" || value === undefined) {
        var classNames = (value || "").split(/\s+/);
        if (element.nodeType === 1 && element.className) {
          if (value) {
            var className = (" " + element.className + " ").replace(/[\n\t]/g, " ");
            for (var c = 0,
                cl = classNames.length; c < cl; c++) {
              className = className.replace(" " + classNames[c] + " ", " ");
            }
            element.className = className.replace(/^\s+|\s+$/g, "");
          } else {
            element.className = "";
          }
        }
      }
      return element;
    };
    var _getZoomFactor = function() {
      var rect,
          physicalWidth,
          logicalWidth,
          zoomFactor = 1;
      if (typeof document.body.getBoundingClientRect === "function") {
        rect = document.body.getBoundingClientRect();
        physicalWidth = rect.right - rect.left;
        logicalWidth = document.body.offsetWidth;
        zoomFactor = Math.round(physicalWidth / logicalWidth * 100) / 100;
      }
      return zoomFactor;
    };
    var _getDOMObjectPosition = function(obj, defaultZIndex) {
      var info = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: _getSafeZIndex(defaultZIndex) - 1
      };
      if (obj.getBoundingClientRect) {
        var rect = obj.getBoundingClientRect();
        var pageXOffset,
            pageYOffset,
            zoomFactor;
        if ("pageXOffset" in window && "pageYOffset" in window) {
          pageXOffset = window.pageXOffset;
          pageYOffset = window.pageYOffset;
        } else {
          zoomFactor = _getZoomFactor();
          pageXOffset = Math.round(document.documentElement.scrollLeft / zoomFactor);
          pageYOffset = Math.round(document.documentElement.scrollTop / zoomFactor);
        }
        var leftBorderWidth = document.documentElement.clientLeft || 0;
        var topBorderWidth = document.documentElement.clientTop || 0;
        info.left = rect.left + pageXOffset - leftBorderWidth;
        info.top = rect.top + pageYOffset - topBorderWidth;
        info.width = "width" in rect ? rect.width : rect.right - rect.left;
        info.height = "height" in rect ? rect.height : rect.bottom - rect.top;
      }
      return info;
    };
    var _cacheBust = function(path, options) {
      var cacheBust = options == null || options && options.cacheBust === true && options.useNoCache === true;
      if (cacheBust) {
        return (path.indexOf("?") === -1 ? "?" : "&") + "noCache=" + new Date().getTime();
      } else {
        return "";
      }
    };
    var _vars = function(options) {
      var i,
          len,
          domain,
          str = [],
          domains = [],
          trustedOriginsExpanded = [];
      if (options.trustedOrigins) {
        if (typeof options.trustedOrigins === "string") {
          domains.push(options.trustedOrigins);
        } else if (typeof options.trustedOrigins === "object" && "length" in options.trustedOrigins) {
          domains = domains.concat(options.trustedOrigins);
        }
      }
      if (options.trustedDomains) {
        if (typeof options.trustedDomains === "string") {
          domains.push(options.trustedDomains);
        } else if (typeof options.trustedDomains === "object" && "length" in options.trustedDomains) {
          domains = domains.concat(options.trustedDomains);
        }
      }
      if (domains.length) {
        for (i = 0, len = domains.length; i < len; i++) {
          if (domains.hasOwnProperty(i) && domains[i] && typeof domains[i] === "string") {
            domain = _extractDomain(domains[i]);
            if (!domain) {
              continue;
            }
            if (domain === "*") {
              trustedOriginsExpanded = [domain];
              break;
            }
            trustedOriginsExpanded.push.apply(trustedOriginsExpanded, [domain, "//" + domain, window.location.protocol + "//" + domain]);
          }
        }
      }
      if (trustedOriginsExpanded.length) {
        str.push("trustedOrigins=" + encodeURIComponent(trustedOriginsExpanded.join(",")));
      }
      if (typeof options.jsModuleId === "string" && options.jsModuleId) {
        str.push("jsModuleId=" + encodeURIComponent(options.jsModuleId));
      }
      return str.join("&");
    };
    var _inArray = function(elem, array, fromIndex) {
      if (typeof array.indexOf === "function") {
        return array.indexOf(elem, fromIndex);
      }
      var i,
          len = array.length;
      if (typeof fromIndex === "undefined") {
        fromIndex = 0;
      } else if (fromIndex < 0) {
        fromIndex = len + fromIndex;
      }
      for (i = fromIndex; i < len; i++) {
        if (array.hasOwnProperty(i) && array[i] === elem) {
          return i;
        }
      }
      return -1;
    };
    var _prepClip = function(elements) {
      if (typeof elements === "string")
        throw new TypeError("ZeroClipboard doesn't accept query strings.");
      if (!elements.length)
        return [elements];
      return elements;
    };
    var _dispatchCallback = function(func, context, args, async) {
      if (async) {
        window.setTimeout(function() {
          func.apply(context, args);
        }, 0);
      } else {
        func.apply(context, args);
      }
    };
    var _getSafeZIndex = function(val) {
      var zIndex,
          tmp;
      if (val) {
        if (typeof val === "number" && val > 0) {
          zIndex = val;
        } else if (typeof val === "string" && (tmp = parseInt(val, 10)) && !isNaN(tmp) && tmp > 0) {
          zIndex = tmp;
        }
      }
      if (!zIndex) {
        if (typeof _globalConfig.zIndex === "number" && _globalConfig.zIndex > 0) {
          zIndex = _globalConfig.zIndex;
        } else if (typeof _globalConfig.zIndex === "string" && (tmp = parseInt(_globalConfig.zIndex, 10)) && !isNaN(tmp) && tmp > 0) {
          zIndex = tmp;
        }
      }
      return zIndex || 0;
    };
    var _deprecationWarning = function(deprecatedApiName, debugEnabled) {
      if (deprecatedApiName && debugEnabled !== false && typeof console !== "undefined" && console && (console.warn || console.log)) {
        var deprecationWarning = "`" + deprecatedApiName + "` is deprecated. See docs for more info:\n" + "    https://github.com/zeroclipboard/zeroclipboard/blob/master/docs/instructions.md#deprecations";
        if (console.warn) {
          console.warn(deprecationWarning);
        } else {
          console.log(deprecationWarning);
        }
      }
    };
    var _extend = function() {
      var i,
          len,
          arg,
          prop,
          src,
          copy,
          target = arguments[0] || {};
      for (i = 1, len = arguments.length; i < len; i++) {
        if ((arg = arguments[i]) != null) {
          for (prop in arg) {
            if (arg.hasOwnProperty(prop)) {
              src = target[prop];
              copy = arg[prop];
              if (target === copy) {
                continue;
              }
              if (copy !== undefined) {
                target[prop] = copy;
              }
            }
          }
        }
      }
      return target;
    };
    var _extractDomain = function(originOrUrl) {
      if (originOrUrl == null || originOrUrl === "") {
        return null;
      }
      originOrUrl = originOrUrl.replace(/^\s+|\s+$/g, "");
      if (originOrUrl === "") {
        return null;
      }
      var protocolIndex = originOrUrl.indexOf("//");
      originOrUrl = protocolIndex === -1 ? originOrUrl : originOrUrl.slice(protocolIndex + 2);
      var pathIndex = originOrUrl.indexOf("/");
      originOrUrl = pathIndex === -1 ? originOrUrl : protocolIndex === -1 || pathIndex === 0 ? null : originOrUrl.slice(0, pathIndex);
      if (originOrUrl && originOrUrl.slice(-4).toLowerCase() === ".swf") {
        return null;
      }
      return originOrUrl || null;
    };
    var _determineScriptAccess = function() {
      var _extractAllDomains = function(origins, resultsArray) {
        var i,
            len,
            tmp;
        if (origins != null && resultsArray[0] !== "*") {
          if (typeof origins === "string") {
            origins = [origins];
          }
          if (typeof origins === "object" && "length" in origins) {
            for (i = 0, len = origins.length; i < len; i++) {
              if (origins.hasOwnProperty(i)) {
                tmp = _extractDomain(origins[i]);
                if (tmp) {
                  if (tmp === "*") {
                    resultsArray.length = 0;
                    resultsArray.push("*");
                    break;
                  }
                  if (_inArray(tmp, resultsArray) === -1) {
                    resultsArray.push(tmp);
                  }
                }
              }
            }
          }
        }
      };
      var _accessLevelLookup = {
        always: "always",
        samedomain: "sameDomain",
        never: "never"
      };
      return function(currentDomain, configOptions) {
        var asaLower,
            allowScriptAccess = configOptions.allowScriptAccess;
        if (typeof allowScriptAccess === "string" && (asaLower = allowScriptAccess.toLowerCase()) && /^always|samedomain|never$/.test(asaLower)) {
          return _accessLevelLookup[asaLower];
        }
        var swfDomain = _extractDomain(configOptions.moviePath);
        if (swfDomain === null) {
          swfDomain = currentDomain;
        }
        var trustedDomains = [];
        _extractAllDomains(configOptions.trustedOrigins, trustedDomains);
        _extractAllDomains(configOptions.trustedDomains, trustedDomains);
        var len = trustedDomains.length;
        if (len > 0) {
          if (len === 1 && trustedDomains[0] === "*") {
            return "always";
          }
          if (_inArray(currentDomain, trustedDomains) !== -1) {
            if (len === 1 && currentDomain === swfDomain) {
              return "sameDomain";
            }
            return "always";
          }
        }
        return "never";
      };
    }();
    var _objectKeys = function(obj) {
      if (obj == null) {
        return [];
      }
      if (Object.keys) {
        return Object.keys(obj);
      }
      var keys = [];
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          keys.push(prop);
        }
      }
      return keys;
    };
    var _deleteOwnProperties = function(obj) {
      if (obj) {
        for (var prop in obj) {
          if (obj.hasOwnProperty(prop)) {
            delete obj[prop];
          }
        }
      }
      return obj;
    };
    var _safeActiveElement = function() {
      try {
        return document.activeElement;
      } catch (err) {}
      return null;
    };
    var _detectFlashSupport = function() {
      var hasFlash = false;
      if (typeof flashState.disabled === "boolean") {
        hasFlash = flashState.disabled === false;
      } else {
        if (typeof ActiveXObject === "function") {
          try {
            if (new ActiveXObject("ShockwaveFlash.ShockwaveFlash")) {
              hasFlash = true;
            }
          } catch (error) {}
        }
        if (!hasFlash && navigator.mimeTypes["application/x-shockwave-flash"]) {
          hasFlash = true;
        }
      }
      return hasFlash;
    };
    function _parseFlashVersion(flashVersion) {
      return flashVersion.replace(/,/g, ".").replace(/[^0-9\.]/g, "");
    }
    function _isFlashVersionSupported(flashVersion) {
      return parseFloat(_parseFlashVersion(flashVersion)) >= 10;
    }
    var ZeroClipboard = function(elements, options) {
      if (!(this instanceof ZeroClipboard)) {
        return new ZeroClipboard(elements, options);
      }
      this.id = "" + clientIdCounter++;
      _clientMeta[this.id] = {
        instance: this,
        elements: [],
        handlers: {}
      };
      if (elements) {
        this.clip(elements);
      }
      if (typeof options !== "undefined") {
        _deprecationWarning("new ZeroClipboard(elements, options)", _globalConfig.debug);
        ZeroClipboard.config(options);
      }
      this.options = ZeroClipboard.config();
      if (typeof flashState.disabled !== "boolean") {
        flashState.disabled = !_detectFlashSupport();
      }
      if (flashState.disabled === false && flashState.outdated !== true) {
        if (flashState.bridge === null) {
          flashState.outdated = false;
          flashState.ready = false;
          _bridge();
        }
      }
    };
    ZeroClipboard.prototype.setText = function(newText) {
      if (newText && newText !== "") {
        _clipData["text/plain"] = newText;
        if (flashState.ready === true && flashState.bridge && typeof flashState.bridge.setText === "function") {
          flashState.bridge.setText(newText);
        } else {
          flashState.ready = false;
        }
      }
      return this;
    };
    ZeroClipboard.prototype.setSize = function(width, height) {
      if (flashState.ready === true && flashState.bridge && typeof flashState.bridge.setSize === "function") {
        flashState.bridge.setSize(width, height);
      } else {
        flashState.ready = false;
      }
      return this;
    };
    var _setHandCursor = function(enabled) {
      if (flashState.ready === true && flashState.bridge && typeof flashState.bridge.setHandCursor === "function") {
        flashState.bridge.setHandCursor(enabled);
      } else {
        flashState.ready = false;
      }
    };
    ZeroClipboard.prototype.destroy = function() {
      this.unclip();
      this.off();
      delete _clientMeta[this.id];
    };
    var _getAllClients = function() {
      var i,
          len,
          client,
          clients = [],
          clientIds = _objectKeys(_clientMeta);
      for (i = 0, len = clientIds.length; i < len; i++) {
        client = _clientMeta[clientIds[i]].instance;
        if (client && client instanceof ZeroClipboard) {
          clients.push(client);
        }
      }
      return clients;
    };
    ZeroClipboard.version = "1.3.5";
    var _globalConfig = {
      swfPath: _swfPath,
      trustedDomains: window.location.host ? [window.location.host] : [],
      cacheBust: true,
      forceHandCursor: false,
      zIndex: 999999999,
      debug: true,
      title: null,
      autoActivate: true
    };
    ZeroClipboard.config = function(options) {
      if (typeof options === "object" && options !== null) {
        _extend(_globalConfig, options);
      }
      if (typeof options === "string" && options) {
        if (_globalConfig.hasOwnProperty(options)) {
          return _globalConfig[options];
        }
        return;
      }
      var copy = {};
      for (var prop in _globalConfig) {
        if (_globalConfig.hasOwnProperty(prop)) {
          if (typeof _globalConfig[prop] === "object" && _globalConfig[prop] !== null) {
            if ("length" in _globalConfig[prop]) {
              copy[prop] = _globalConfig[prop].slice(0);
            } else {
              copy[prop] = _extend({}, _globalConfig[prop]);
            }
          } else {
            copy[prop] = _globalConfig[prop];
          }
        }
      }
      return copy;
    };
    ZeroClipboard.destroy = function() {
      ZeroClipboard.deactivate();
      for (var clientId in _clientMeta) {
        if (_clientMeta.hasOwnProperty(clientId) && _clientMeta[clientId]) {
          var client = _clientMeta[clientId].instance;
          if (client && typeof client.destroy === "function") {
            client.destroy();
          }
        }
      }
      var htmlBridge = _getHtmlBridge(flashState.bridge);
      if (htmlBridge && htmlBridge.parentNode) {
        htmlBridge.parentNode.removeChild(htmlBridge);
        flashState.ready = null;
        flashState.bridge = null;
      }
    };
    ZeroClipboard.activate = function(element) {
      if (currentElement) {
        _removeClass(currentElement, _globalConfig.hoverClass);
        _removeClass(currentElement, _globalConfig.activeClass);
      }
      currentElement = element;
      _addClass(element, _globalConfig.hoverClass);
      _reposition();
      var newTitle = _globalConfig.title || element.getAttribute("title");
      if (newTitle) {
        var htmlBridge = _getHtmlBridge(flashState.bridge);
        if (htmlBridge) {
          htmlBridge.setAttribute("title", newTitle);
        }
      }
      var useHandCursor = _globalConfig.forceHandCursor === true || _getStyle(element, "cursor") === "pointer";
      _setHandCursor(useHandCursor);
    };
    ZeroClipboard.deactivate = function() {
      var htmlBridge = _getHtmlBridge(flashState.bridge);
      if (htmlBridge) {
        htmlBridge.style.left = "0px";
        htmlBridge.style.top = "-9999px";
        htmlBridge.removeAttribute("title");
      }
      if (currentElement) {
        _removeClass(currentElement, _globalConfig.hoverClass);
        _removeClass(currentElement, _globalConfig.activeClass);
        currentElement = null;
      }
    };
    var _bridge = function() {
      var flashBridge,
          len;
      var container = document.getElementById("global-zeroclipboard-html-bridge");
      if (!container) {
        var opts = ZeroClipboard.config();
        opts.jsModuleId = typeof _amdModuleId === "string" && _amdModuleId || typeof _cjsModuleId === "string" && _cjsModuleId || null;
        var allowScriptAccess = _determineScriptAccess(window.location.host, _globalConfig);
        var flashvars = _vars(opts);
        var swfUrl = _globalConfig.moviePath + _cacheBust(_globalConfig.moviePath, _globalConfig);
        var html = '      <object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" id="global-zeroclipboard-flash-bridge" width="100%" height="100%">         <param name="movie" value="' + swfUrl + '"/>         <param name="allowScriptAccess" value="' + allowScriptAccess + '"/>         <param name="scale" value="exactfit"/>         <param name="loop" value="false"/>         <param name="menu" value="false"/>         <param name="quality" value="best" />         <param name="bgcolor" value="#ffffff"/>         <param name="wmode" value="transparent"/>         <param name="flashvars" value="' + flashvars + '"/>         <embed src="' + swfUrl + '"           loop="false" menu="false"           quality="best" bgcolor="#ffffff"           width="100%" height="100%"           name="global-zeroclipboard-flash-bridge"           allowScriptAccess="' + allowScriptAccess + '"           allowFullScreen="false"           type="application/x-shockwave-flash"           wmode="transparent"           pluginspage="http://www.macromedia.com/go/getflashplayer"           flashvars="' + flashvars + '"           scale="exactfit">         </embed>       </object>';
        container = document.createElement("div");
        container.id = "global-zeroclipboard-html-bridge";
        container.setAttribute("class", "global-zeroclipboard-container");
        container.style.position = "absolute";
        container.style.left = "0px";
        container.style.top = "-9999px";
        container.style.width = "15px";
        container.style.height = "15px";
        container.style.zIndex = "" + _getSafeZIndex(_globalConfig.zIndex);
        document.body.appendChild(container);
        container.innerHTML = html;
      }
      flashBridge = document["global-zeroclipboard-flash-bridge"];
      if (flashBridge && (len = flashBridge.length)) {
        flashBridge = flashBridge[len - 1];
      }
      flashState.bridge = flashBridge || container.children[0].lastElementChild;
    };
    var _getHtmlBridge = function(flashBridge) {
      var isFlashElement = /^OBJECT|EMBED$/;
      var htmlBridge = flashBridge && flashBridge.parentNode;
      while (htmlBridge && isFlashElement.test(htmlBridge.nodeName) && htmlBridge.parentNode) {
        htmlBridge = htmlBridge.parentNode;
      }
      return htmlBridge || null;
    };
    var _reposition = function() {
      if (currentElement) {
        var pos = _getDOMObjectPosition(currentElement, _globalConfig.zIndex);
        var htmlBridge = _getHtmlBridge(flashState.bridge);
        if (htmlBridge) {
          htmlBridge.style.top = pos.top + "px";
          htmlBridge.style.left = pos.left + "px";
          htmlBridge.style.width = pos.width + "px";
          htmlBridge.style.height = pos.height + "px";
          htmlBridge.style.zIndex = pos.zIndex + 1;
        }
        if (flashState.ready === true && flashState.bridge && typeof flashState.bridge.setSize === "function") {
          flashState.bridge.setSize(pos.width, pos.height);
        } else {
          flashState.ready = false;
        }
      }
      return this;
    };
    ZeroClipboard.prototype.on = function(eventName, func) {
      var i,
          len,
          events,
          added = {},
          handlers = _clientMeta[this.id] && _clientMeta[this.id].handlers;
      if (typeof eventName === "string" && eventName) {
        events = eventName.toLowerCase().split(/\s+/);
      } else if (typeof eventName === "object" && eventName && typeof func === "undefined") {
        for (i in eventName) {
          if (eventName.hasOwnProperty(i) && typeof i === "string" && i && typeof eventName[i] === "function") {
            this.on(i, eventName[i]);
          }
        }
      }
      if (events && events.length) {
        for (i = 0, len = events.length; i < len; i++) {
          eventName = events[i].replace(/^on/, "");
          added[eventName] = true;
          if (!handlers[eventName]) {
            handlers[eventName] = [];
          }
          handlers[eventName].push(func);
        }
        if (added.noflash && flashState.disabled) {
          _receiveEvent.call(this, "noflash", {});
        }
        if (added.wrongflash && flashState.outdated) {
          _receiveEvent.call(this, "wrongflash", {flashVersion: flashState.version});
        }
        if (added.load && flashState.ready) {
          _receiveEvent.call(this, "load", {flashVersion: flashState.version});
        }
      }
      return this;
    };
    ZeroClipboard.prototype.off = function(eventName, func) {
      var i,
          len,
          foundIndex,
          events,
          perEventHandlers,
          handlers = _clientMeta[this.id] && _clientMeta[this.id].handlers;
      if (arguments.length === 0) {
        events = _objectKeys(handlers);
      } else if (typeof eventName === "string" && eventName) {
        events = eventName.split(/\s+/);
      } else if (typeof eventName === "object" && eventName && typeof func === "undefined") {
        for (i in eventName) {
          if (eventName.hasOwnProperty(i) && typeof i === "string" && i && typeof eventName[i] === "function") {
            this.off(i, eventName[i]);
          }
        }
      }
      if (events && events.length) {
        for (i = 0, len = events.length; i < len; i++) {
          eventName = events[i].toLowerCase().replace(/^on/, "");
          perEventHandlers = handlers[eventName];
          if (perEventHandlers && perEventHandlers.length) {
            if (func) {
              foundIndex = _inArray(func, perEventHandlers);
              while (foundIndex !== -1) {
                perEventHandlers.splice(foundIndex, 1);
                foundIndex = _inArray(func, perEventHandlers, foundIndex);
              }
            } else {
              handlers[eventName].length = 0;
            }
          }
        }
      }
      return this;
    };
    ZeroClipboard.prototype.handlers = function(eventName) {
      var prop,
          copy = null,
          handlers = _clientMeta[this.id] && _clientMeta[this.id].handlers;
      if (handlers) {
        if (typeof eventName === "string" && eventName) {
          return handlers[eventName] ? handlers[eventName].slice(0) : null;
        }
        copy = {};
        for (prop in handlers) {
          if (handlers.hasOwnProperty(prop) && handlers[prop]) {
            copy[prop] = handlers[prop].slice(0);
          }
        }
      }
      return copy;
    };
    var _dispatchClientCallbacks = function(eventName, context, args, async) {
      var handlers = _clientMeta[this.id] && _clientMeta[this.id].handlers[eventName];
      if (handlers && handlers.length) {
        var i,
            len,
            func,
            originalContext = context || this;
        for (i = 0, len = handlers.length; i < len; i++) {
          func = handlers[i];
          context = originalContext;
          if (typeof func === "string" && typeof window[func] === "function") {
            func = window[func];
          }
          if (typeof func === "object" && func && typeof func.handleEvent === "function") {
            context = func;
            func = func.handleEvent;
          }
          if (typeof func === "function") {
            _dispatchCallback(func, context, args, async);
          }
        }
      }
      return this;
    };
    ZeroClipboard.prototype.clip = function(elements) {
      elements = _prepClip(elements);
      for (var i = 0; i < elements.length; i++) {
        if (elements.hasOwnProperty(i) && elements[i] && elements[i].nodeType === 1) {
          if (!elements[i].zcClippingId) {
            elements[i].zcClippingId = "zcClippingId_" + elementIdCounter++;
            _elementMeta[elements[i].zcClippingId] = [this.id];
            if (_globalConfig.autoActivate === true) {
              _addEventHandler(elements[i], "mouseover", _elementMouseOver);
            }
          } else if (_inArray(this.id, _elementMeta[elements[i].zcClippingId]) === -1) {
            _elementMeta[elements[i].zcClippingId].push(this.id);
          }
          var clippedElements = _clientMeta[this.id].elements;
          if (_inArray(elements[i], clippedElements) === -1) {
            clippedElements.push(elements[i]);
          }
        }
      }
      return this;
    };
    ZeroClipboard.prototype.unclip = function(elements) {
      var meta = _clientMeta[this.id];
      if (meta) {
        var clippedElements = meta.elements;
        var arrayIndex;
        if (typeof elements === "undefined") {
          elements = clippedElements.slice(0);
        } else {
          elements = _prepClip(elements);
        }
        for (var i = elements.length; i--; ) {
          if (elements.hasOwnProperty(i) && elements[i] && elements[i].nodeType === 1) {
            arrayIndex = 0;
            while ((arrayIndex = _inArray(elements[i], clippedElements, arrayIndex)) !== -1) {
              clippedElements.splice(arrayIndex, 1);
            }
            var clientIds = _elementMeta[elements[i].zcClippingId];
            if (clientIds) {
              arrayIndex = 0;
              while ((arrayIndex = _inArray(this.id, clientIds, arrayIndex)) !== -1) {
                clientIds.splice(arrayIndex, 1);
              }
              if (clientIds.length === 0) {
                if (_globalConfig.autoActivate === true) {
                  _removeEventHandler(elements[i], "mouseover", _elementMouseOver);
                }
                delete elements[i].zcClippingId;
              }
            }
          }
        }
      }
      return this;
    };
    ZeroClipboard.prototype.elements = function() {
      var meta = _clientMeta[this.id];
      return meta && meta.elements ? meta.elements.slice(0) : [];
    };
    var _getAllClientsClippedToElement = function(element) {
      var elementMetaId,
          clientIds,
          i,
          len,
          client,
          clients = [];
      if (element && element.nodeType === 1 && (elementMetaId = element.zcClippingId) && _elementMeta.hasOwnProperty(elementMetaId)) {
        clientIds = _elementMeta[elementMetaId];
        if (clientIds && clientIds.length) {
          for (i = 0, len = clientIds.length; i < len; i++) {
            client = _clientMeta[clientIds[i]].instance;
            if (client && client instanceof ZeroClipboard) {
              clients.push(client);
            }
          }
        }
      }
      return clients;
    };
    _globalConfig.hoverClass = "zeroclipboard-is-hover";
    _globalConfig.activeClass = "zeroclipboard-is-active";
    _globalConfig.trustedOrigins = null;
    _globalConfig.allowScriptAccess = null;
    _globalConfig.useNoCache = true;
    _globalConfig.moviePath = "ZeroClipboard.swf";
    ZeroClipboard.detectFlashSupport = function() {
      _deprecationWarning("ZeroClipboard.detectFlashSupport", _globalConfig.debug);
      return _detectFlashSupport();
    };
    ZeroClipboard.dispatch = function(eventName, args) {
      if (typeof eventName === "string" && eventName) {
        var cleanEventName = eventName.toLowerCase().replace(/^on/, "");
        if (cleanEventName) {
          var clients = currentElement && _globalConfig.autoActivate === true ? _getAllClientsClippedToElement(currentElement) : _getAllClients();
          for (var i = 0,
              len = clients.length; i < len; i++) {
            _receiveEvent.call(clients[i], cleanEventName, args);
          }
        }
      }
    };
    ZeroClipboard.prototype.setHandCursor = function(enabled) {
      _deprecationWarning("ZeroClipboard.prototype.setHandCursor", _globalConfig.debug);
      enabled = typeof enabled === "boolean" ? enabled : !!enabled;
      _setHandCursor(enabled);
      _globalConfig.forceHandCursor = enabled;
      return this;
    };
    ZeroClipboard.prototype.reposition = function() {
      _deprecationWarning("ZeroClipboard.prototype.reposition", _globalConfig.debug);
      return _reposition();
    };
    ZeroClipboard.prototype.receiveEvent = function(eventName, args) {
      _deprecationWarning("ZeroClipboard.prototype.receiveEvent", _globalConfig.debug);
      if (typeof eventName === "string" && eventName) {
        var cleanEventName = eventName.toLowerCase().replace(/^on/, "");
        if (cleanEventName) {
          _receiveEvent.call(this, cleanEventName, args);
        }
      }
    };
    ZeroClipboard.prototype.setCurrent = function(element) {
      _deprecationWarning("ZeroClipboard.prototype.setCurrent", _globalConfig.debug);
      ZeroClipboard.activate(element);
      return this;
    };
    ZeroClipboard.prototype.resetBridge = function() {
      _deprecationWarning("ZeroClipboard.prototype.resetBridge", _globalConfig.debug);
      ZeroClipboard.deactivate();
      return this;
    };
    ZeroClipboard.prototype.setTitle = function(newTitle) {
      _deprecationWarning("ZeroClipboard.prototype.setTitle", _globalConfig.debug);
      newTitle = newTitle || _globalConfig.title || currentElement && currentElement.getAttribute("title");
      if (newTitle) {
        var htmlBridge = _getHtmlBridge(flashState.bridge);
        if (htmlBridge) {
          htmlBridge.setAttribute("title", newTitle);
        }
      }
      return this;
    };
    ZeroClipboard.setDefaults = function(options) {
      _deprecationWarning("ZeroClipboard.setDefaults", _globalConfig.debug);
      ZeroClipboard.config(options);
    };
    ZeroClipboard.prototype.addEventListener = function(eventName, func) {
      _deprecationWarning("ZeroClipboard.prototype.addEventListener", _globalConfig.debug);
      return this.on(eventName, func);
    };
    ZeroClipboard.prototype.removeEventListener = function(eventName, func) {
      _deprecationWarning("ZeroClipboard.prototype.removeEventListener", _globalConfig.debug);
      return this.off(eventName, func);
    };
    ZeroClipboard.prototype.ready = function() {
      _deprecationWarning("ZeroClipboard.prototype.ready", _globalConfig.debug);
      return flashState.ready === true;
    };
    var _receiveEvent = function(eventName, args) {
      eventName = eventName.toLowerCase().replace(/^on/, "");
      var cleanVersion = args && args.flashVersion && _parseFlashVersion(args.flashVersion) || null;
      var element = currentElement;
      var performCallbackAsync = true;
      switch (eventName) {
        case "load":
          if (cleanVersion) {
            if (!_isFlashVersionSupported(cleanVersion)) {
              _receiveEvent.call(this, "onWrongFlash", {flashVersion: cleanVersion});
              return;
            }
            flashState.outdated = false;
            flashState.ready = true;
            flashState.version = cleanVersion;
          }
          break;
        case "wrongflash":
          if (cleanVersion && !_isFlashVersionSupported(cleanVersion)) {
            flashState.outdated = true;
            flashState.ready = false;
            flashState.version = cleanVersion;
          }
          break;
        case "mouseover":
          _addClass(element, _globalConfig.hoverClass);
          break;
        case "mouseout":
          if (_globalConfig.autoActivate === true) {
            ZeroClipboard.deactivate();
          }
          break;
        case "mousedown":
          _addClass(element, _globalConfig.activeClass);
          break;
        case "mouseup":
          _removeClass(element, _globalConfig.activeClass);
          break;
        case "datarequested":
          if (element) {
            var targetId = element.getAttribute("data-clipboard-target"),
                targetEl = !targetId ? null : document.getElementById(targetId);
            if (targetEl) {
              var textContent = targetEl.value || targetEl.textContent || targetEl.innerText;
              if (textContent) {
                this.setText(textContent);
              }
            } else {
              var defaultText = element.getAttribute("data-clipboard-text");
              if (defaultText) {
                this.setText(defaultText);
              }
            }
          }
          performCallbackAsync = false;
          break;
        case "complete":
          _deleteOwnProperties(_clipData);
          if (element && element !== _safeActiveElement() && element.focus) {
            element.focus();
          }
          break;
      }
      var context = element;
      var eventArgs = [this, args];
      return _dispatchClientCallbacks.call(this, eventName, context, eventArgs, performCallbackAsync);
    };
    if (typeof define === "function" && define.amd) {
      define(["require", "exports", "module"], function($__require, exports, module) {
        _amdModuleId = module && module.id || null;
        return ZeroClipboard;
      });
    } else if (typeof module === "object" && module && typeof module.exports === "object" && module.exports && typeof window.require === "function") {
      _cjsModuleId = module.id || null;
      module.exports = ZeroClipboard;
    } else {
      window.ZeroClipboard = ZeroClipboard;
    }
  })(function() {
    return this;
  }());
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:zeroclipboard@1.3.5", ["npm:zeroclipboard@1.3.5/ZeroClipboard"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:zeroclipboard@1.3.5/ZeroClipboard');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/clipboardButtons/main.js", ["npm:zeroclipboard@1.3.5", "src/feature/clipboardButtons/buttonConnector.js", "src/feature/clipboardButtons/copyButtonProvider.js", "npm:jquery@1.11.3", "github:twbs/bootstrap@2.3.2"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {
    return new Clipboard();
  };
  var ZeroClipboard = $__require('npm:zeroclipboard@1.3.5');
  var clipboardProvider = $__require('src/feature/clipboardButtons/buttonConnector.js');
  var copyButtonProvider = $__require('src/feature/clipboardButtons/copyButtonProvider.js');
  var buttonTemplate = '<button class="copy-button snippet"></button>';
  var $ = $__require('npm:jquery@1.11.3');
  $__require('github:twbs/bootstrap@2.3.2');
  if (!window.ZeroClipboard) {
    window.ZeroClipboard = ZeroClipboard;
  }
  var ZeroClipboardSwf = '/lib/zeroclipboard/ZeroClipboard.swf';
  function Clipboard() {
    var createButton;
    ZeroClipboard.setDefaults({moviePath: ZeroClipboardSwf});
    createButton = copyButtonProvider($(buttonTemplate)[0]);
    this.createClipboardButtons = clipboardProvider(createButton);
    $(function() {
      this.ready();
    }.bind(this));
  }
  Clipboard.prototype = {
    attachClipboardElements: function(elements) {
      return this.connectToClipboard(this.createClipboardButtons(elements));
    },
    connectToClipboard: function(elements) {
      var zero = this.zero;
      zero.glue(elements);
      return elements;
    },
    ready: function() {
      var $copyButtons,
          $actionsSection,
          $codeSnippets;
      $codeSnippets = $('.listingblock pre, .has-copy-button pre, article .highlight pre');
      $actionsSection = $('.github-actions');
      $copyButtons = $actionsSection.find('button.copy-button');
      var zero = this.zero = new ZeroClipboard();
      $(zero.htmlBridge).tooltip({
        title: 'copy to clipboard',
        placement: 'bottom'
      });
      this.connectToClipboard($copyButtons);
      this.attachClipboardElements($codeSnippets);
    },
    destroy: function() {}
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/filterableList/getUrlFilter.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = getUrlFilter;
  function getUrlFilter() {
    var query = document.location.search;
    var matches = query.match(/[&?]filter=([^&]+)/);
    return matches ? decodeURIComponent(matches[1]) : '';
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/filterableList/attributeMatcher.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function createAttributeMatcher(attribute) {
    return function(wordsString) {
      if (typeof wordsString !== 'string') {
        wordsString = '';
      }
      var rxString,
          rx;
      rxString = wordsString.split(/\s+/).reduce(function(rxString, word) {
        return rxString + '(?=.*' + word + ')';
      }, '^') + '.+';
      rx = new RegExp(rxString, 'i');
      return function(node) {
        return rx.test(node.getAttribute(attribute));
      };
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/filterableList/filter.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    create: createFilter,
    partitionMatches: partitionMatches
  };
  function createFilter(handleMatch, containers) {
    return function(matcher) {
      containers.forEach(function(container) {
        var shown = 0;
        partitionMatches(matcher, function(matched, node) {
          handleMatch(matched, node);
          if (matched) {
            shown += 1;
          }
        }, container.children);
        handleMatch(shown > 0, container.node);
      });
    };
  }
  function partitionMatches(matcher, handleMatch, nodes) {
    nodes.forEach(function(node) {
      handleMatch(matcher(node), node);
    });
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/filterableList/filterableList.js", ["src/feature/filterableList/filter.js", "src/feature/filterableList/attributeMatcher.js", "npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var filter = $__require('src/feature/filterableList/filter.js');
  var createAttributeMatcher = $__require('src/feature/filterableList/attributeMatcher.js');
  var $ = $__require('npm:jquery@1.11.3');
  module.exports = function filterableList(onMatch, filterAttribute, containers) {
    var filterMatches = filter.create(onMatch, containers.map(function(node) {
      return {
        node: node,
        children: $('[' + filterAttribute + ']', node).get()
      };
    }));
    var attributeMatcher = createAttributeMatcher(filterAttribute);
    return function filterByValue(value) {
      return filterMatches(attributeMatcher(value));
    };
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/filterableList/main.js", ["src/feature/filterableList/filterableList.js", "src/feature/filterableList/getUrlFilter.js", "npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var filterableList = $__require('src/feature/filterableList/filterableList.js');
  var getUrlFilter = $__require('src/feature/filterableList/getUrlFilter.js');
  var $ = $__require('npm:jquery@1.11.3');
  module.exports = createFilterableList;
  function createFilterableList() {
    var filterList,
        filterInput;
    $(ready);
    return {destroy: destroy};
    function ready() {
      var containers = $('[data-filterable-container]').get();
      var initialFilter = getUrlFilter();
      filterInput = document.getElementById('doc_filter');
      filterList = filterableList(onFilterMatch, 'data-filterable', containers);
      if (initialFilter) {
        $(filterInput).val(initialFilter);
        filterList(initialFilter);
      }
      $(filterInput).on('keyup input', onInputChange);
      function onFilterMatch(matched, node) {
        $(node).toggleClass('filterable-non-matching', !matched);
      }
    }
    function onInputChange(e) {
      filterList(e.target.value);
    }
    function destroy() {
      if (filterList) {
        $(filterInput).off('keyup input', filterList);
      }
    }
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/searchFacets/filterForm.js", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var forEach = Function.prototype.call.bind(Array.prototype.forEach);
  module.exports = function(e) {
    forEach(e.target.elements, function(input) {
      if (input.type == 'hidden' && input.name == '_filters') {
        input.disabled = true;
      }
    });
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/searchFacets/main.js", ["npm:jquery@1.11.3", "src/feature/searchFacets/filterForm.js"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {
    var searchResults = new SearchResults($('.search-facets'));
    $(searchResults.ready.bind(searchResults));
    return searchResults;
  };
  var $ = $__require('npm:jquery@1.11.3');
  var filterForm = $__require('src/feature/searchFacets/filterForm.js');
  function SearchResults(searchFacets) {
    this.searchFacets = searchFacets;
  }
  SearchResults.prototype = {
    ready: function() {
      this.searchFacets.on('submit', filterForm);
      this.facetSectionToggle = $('.projects-facet .js-toggle-sub-facet-list:first');
      this.facetCheckboxes = $('.js-checkbox-pill');
      this.subFacetToggle = $('.js-toggle-sub-facet-list');
      $('.sub-facet--list, .facet-section--header').addClass('js-close');
      this.subFacetToggle.on('click', toggleSubFacets);
      this.facetSectionToggle.on('click', toggleFacetSectionHeaders);
      this.facetCheckboxes.on('click', syncFacetStatus);
      this._destroy = function() {
        this.searchFacets.off('submit', filterForm);
        this.facetCheckboxes.off('click', syncFacetStatus);
        this.facetSectionToggle.off('click', toggleFacetSectionHeaders);
        this.subFacetToggle.off('click', toggleSubFacets);
      };
      $('.sub-facet--list').each(function() {
        var checkedCheckBoxes = $('input[type="checkbox"]:checked', this);
        var uncheckedBoxes = $('input[type="checkbox"]:not(:checked)', this);
        if (checkedCheckBoxes.length !== 0 && uncheckedBoxes.length !== 0) {
          $(this).removeClass('js-close');
        }
      });
      if ($('.projects-facet input[type="checkbox"]:checked').length) {
        $('.facet-section--header').removeClass('js-close');
        $('.projects-facet .sub-facet--list').first().removeClass('js-close');
      }
      $('.facets--clear-filters').click(function() {
        $('.facet--wrapper input[type="checkbox"]:checked').prop('checked', false);
        $('.sub-facet--list, .facet-section--header').addClass('js-close');
      });
    },
    destroy: function() {
      this._destroy();
    },
    _destroy: function() {}
  };
  function toggleFacetSectionHeaders() {
    $('.facet-section--header').toggleClass('js-close');
  }
  function toggleSubFacets() {
    $(this).closest('.facet').find('.sub-facet--list:first').toggleClass('js-close');
  }
  function syncFacetStatus() {
    var $this = $(this);
    var facet = $this.closest('.facet');
    var group = facet.parents('.facet').first();
    var checkBoxes = facet.find('input[type="checkbox"]');
    var checkBox = checkBoxes.first();
    var uncheckedCheckBoxes = group.find('.sub-facet--list input[type="checkbox"]:not(:checked)');
    if (checkBox.prop('checked') === false) {
      $this.prop('checked', false);
      uncheckFirstCheckbox($this.parents('.sub-facet--list'));
      uncheckFirstCheckbox($this.closest('.sub-facet--list'));
      $this.parents('.facet--wrapper').siblings('.sub-facet--list, .facet-section--header').find('input[type="checkbox"]').prop('checked', false);
    } else {
      checkBoxes.prop('checked', true);
    }
    if (uncheckedCheckBoxes.length === 0) {
      group.find('input[type="checkbox"]').first().prop('checked', true);
    }
  }
  function uncheckFirstCheckbox(context) {
    context.siblings('.facet--wrapper').find('input[type="checkbox"]').first().prop('checked', false);
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.11.2/browser", [], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;
  function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length) {
      drainQueue();
    }
  }
  function drainQueue() {
    if (draining) {
      return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
  }
  process.nextTick = function(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
      setTimeout(drainQueue, 0);
    }
  };
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  Item.prototype.run = function() {
    this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:process@0.11.2", ["npm:process@0.11.2/browser"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:process@0.11.2/browser');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2/index", ["npm:process@0.11.2"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? process : $__require('npm:process@0.11.2');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2", ["github:jspm/nodelibs-process@0.1.2/index"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('github:jspm/nodelibs-process@0.1.2/index');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:jquery@1.11.3/dist/jquery", ["github:jspm/nodelibs-process@0.1.2"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  (function(process) {
    (function(global, factory) {
      if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = global.document ? factory(global, true) : function(w) {
          if (!w.document) {
            throw new Error("jQuery requires a window with a document");
          }
          return factory(w);
        };
      } else {
        factory(global);
      }
    }(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
      var deletedIds = [];
      var slice = deletedIds.slice;
      var concat = deletedIds.concat;
      var push = deletedIds.push;
      var indexOf = deletedIds.indexOf;
      var class2type = {};
      var toString = class2type.toString;
      var hasOwn = class2type.hasOwnProperty;
      var support = {};
      var version = "1.11.3",
          jQuery = function(selector, context) {
            return new jQuery.fn.init(selector, context);
          },
          rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
          rmsPrefix = /^-ms-/,
          rdashAlpha = /-([\da-z])/gi,
          fcamelCase = function(all, letter) {
            return letter.toUpperCase();
          };
      jQuery.fn = jQuery.prototype = {
        jquery: version,
        constructor: jQuery,
        selector: "",
        length: 0,
        toArray: function() {
          return slice.call(this);
        },
        get: function(num) {
          return num != null ? (num < 0 ? this[num + this.length] : this[num]) : slice.call(this);
        },
        pushStack: function(elems) {
          var ret = jQuery.merge(this.constructor(), elems);
          ret.prevObject = this;
          ret.context = this.context;
          return ret;
        },
        each: function(callback, args) {
          return jQuery.each(this, callback, args);
        },
        map: function(callback) {
          return this.pushStack(jQuery.map(this, function(elem, i) {
            return callback.call(elem, i, elem);
          }));
        },
        slice: function() {
          return this.pushStack(slice.apply(this, arguments));
        },
        first: function() {
          return this.eq(0);
        },
        last: function() {
          return this.eq(-1);
        },
        eq: function(i) {
          var len = this.length,
              j = +i + (i < 0 ? len : 0);
          return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
        },
        end: function() {
          return this.prevObject || this.constructor(null);
        },
        push: push,
        sort: deletedIds.sort,
        splice: deletedIds.splice
      };
      jQuery.extend = jQuery.fn.extend = function() {
        var src,
            copyIsArray,
            copy,
            name,
            options,
            clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;
        if (typeof target === "boolean") {
          deep = target;
          target = arguments[i] || {};
          i++;
        }
        if (typeof target !== "object" && !jQuery.isFunction(target)) {
          target = {};
        }
        if (i === length) {
          target = this;
          i--;
        }
        for (; i < length; i++) {
          if ((options = arguments[i]) != null) {
            for (name in options) {
              src = target[name];
              copy = options[name];
              if (target === copy) {
                continue;
              }
              if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                if (copyIsArray) {
                  copyIsArray = false;
                  clone = src && jQuery.isArray(src) ? src : [];
                } else {
                  clone = src && jQuery.isPlainObject(src) ? src : {};
                }
                target[name] = jQuery.extend(deep, clone, copy);
              } else if (copy !== undefined) {
                target[name] = copy;
              }
            }
          }
        }
        return target;
      };
      jQuery.extend({
        expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
        isReady: true,
        error: function(msg) {
          throw new Error(msg);
        },
        noop: function() {},
        isFunction: function(obj) {
          return jQuery.type(obj) === "function";
        },
        isArray: Array.isArray || function(obj) {
          return jQuery.type(obj) === "array";
        },
        isWindow: function(obj) {
          return obj != null && obj == obj.window;
        },
        isNumeric: function(obj) {
          return !jQuery.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
        },
        isEmptyObject: function(obj) {
          var name;
          for (name in obj) {
            return false;
          }
          return true;
        },
        isPlainObject: function(obj) {
          var key;
          if (!obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
            return false;
          }
          try {
            if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
              return false;
            }
          } catch (e) {
            return false;
          }
          if (support.ownLast) {
            for (key in obj) {
              return hasOwn.call(obj, key);
            }
          }
          for (key in obj) {}
          return key === undefined || hasOwn.call(obj, key);
        },
        type: function(obj) {
          if (obj == null) {
            return obj + "";
          }
          return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
        },
        globalEval: function(data) {
          if (data && jQuery.trim(data)) {
            (window.execScript || function(data) {
              window["eval"].call(window, data);
            })(data);
          }
        },
        camelCase: function(string) {
          return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
        },
        nodeName: function(elem, name) {
          return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
        },
        each: function(obj, callback, args) {
          var value,
              i = 0,
              length = obj.length,
              isArray = isArraylike(obj);
          if (args) {
            if (isArray) {
              for (; i < length; i++) {
                value = callback.apply(obj[i], args);
                if (value === false) {
                  break;
                }
              }
            } else {
              for (i in obj) {
                value = callback.apply(obj[i], args);
                if (value === false) {
                  break;
                }
              }
            }
          } else {
            if (isArray) {
              for (; i < length; i++) {
                value = callback.call(obj[i], i, obj[i]);
                if (value === false) {
                  break;
                }
              }
            } else {
              for (i in obj) {
                value = callback.call(obj[i], i, obj[i]);
                if (value === false) {
                  break;
                }
              }
            }
          }
          return obj;
        },
        trim: function(text) {
          return text == null ? "" : (text + "").replace(rtrim, "");
        },
        makeArray: function(arr, results) {
          var ret = results || [];
          if (arr != null) {
            if (isArraylike(Object(arr))) {
              jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
            } else {
              push.call(ret, arr);
            }
          }
          return ret;
        },
        inArray: function(elem, arr, i) {
          var len;
          if (arr) {
            if (indexOf) {
              return indexOf.call(arr, elem, i);
            }
            len = arr.length;
            i = i ? i < 0 ? Math.max(0, len + i) : i : 0;
            for (; i < len; i++) {
              if (i in arr && arr[i] === elem) {
                return i;
              }
            }
          }
          return -1;
        },
        merge: function(first, second) {
          var len = +second.length,
              j = 0,
              i = first.length;
          while (j < len) {
            first[i++] = second[j++];
          }
          if (len !== len) {
            while (second[j] !== undefined) {
              first[i++] = second[j++];
            }
          }
          first.length = i;
          return first;
        },
        grep: function(elems, callback, invert) {
          var callbackInverse,
              matches = [],
              i = 0,
              length = elems.length,
              callbackExpect = !invert;
          for (; i < length; i++) {
            callbackInverse = !callback(elems[i], i);
            if (callbackInverse !== callbackExpect) {
              matches.push(elems[i]);
            }
          }
          return matches;
        },
        map: function(elems, callback, arg) {
          var value,
              i = 0,
              length = elems.length,
              isArray = isArraylike(elems),
              ret = [];
          if (isArray) {
            for (; i < length; i++) {
              value = callback(elems[i], i, arg);
              if (value != null) {
                ret.push(value);
              }
            }
          } else {
            for (i in elems) {
              value = callback(elems[i], i, arg);
              if (value != null) {
                ret.push(value);
              }
            }
          }
          return concat.apply([], ret);
        },
        guid: 1,
        proxy: function(fn, context) {
          var args,
              proxy,
              tmp;
          if (typeof context === "string") {
            tmp = fn[context];
            context = fn;
            fn = tmp;
          }
          if (!jQuery.isFunction(fn)) {
            return undefined;
          }
          args = slice.call(arguments, 2);
          proxy = function() {
            return fn.apply(context || this, args.concat(slice.call(arguments)));
          };
          proxy.guid = fn.guid = fn.guid || jQuery.guid++;
          return proxy;
        },
        now: function() {
          return +(new Date());
        },
        support: support
      });
      jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
        class2type["[object " + name + "]"] = name.toLowerCase();
      });
      function isArraylike(obj) {
        var length = "length" in obj && obj.length,
            type = jQuery.type(obj);
        if (type === "function" || jQuery.isWindow(obj)) {
          return false;
        }
        if (obj.nodeType === 1 && length) {
          return true;
        }
        return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj;
      }
      var Sizzle = (function(window) {
        var i,
            support,
            Expr,
            getText,
            isXML,
            tokenize,
            compile,
            select,
            outermostContext,
            sortInput,
            hasDuplicate,
            setDocument,
            document,
            docElem,
            documentIsHTML,
            rbuggyQSA,
            rbuggyMatches,
            matches,
            contains,
            expando = "sizzle" + 1 * new Date(),
            preferredDoc = window.document,
            dirruns = 0,
            done = 0,
            classCache = createCache(),
            tokenCache = createCache(),
            compilerCache = createCache(),
            sortOrder = function(a, b) {
              if (a === b) {
                hasDuplicate = true;
              }
              return 0;
            },
            MAX_NEGATIVE = 1 << 31,
            hasOwn = ({}).hasOwnProperty,
            arr = [],
            pop = arr.pop,
            push_native = arr.push,
            push = arr.push,
            slice = arr.slice,
            indexOf = function(list, elem) {
              var i = 0,
                  len = list.length;
              for (; i < len; i++) {
                if (list[i] === elem) {
                  return i;
                }
              }
              return -1;
            },
            booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
            whitespace = "[\\x20\\t\\r\\n\\f]",
            characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
            identifier = characterEncoding.replace("w", "w#"),
            attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
            pseudos = ":(" + characterEncoding + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)",
            rwhitespace = new RegExp(whitespace + "+", "g"),
            rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
            rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
            rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
            rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
            rpseudo = new RegExp(pseudos),
            ridentifier = new RegExp("^" + identifier + "$"),
            matchExpr = {
              "ID": new RegExp("^#(" + characterEncoding + ")"),
              "CLASS": new RegExp("^\\.(" + characterEncoding + ")"),
              "TAG": new RegExp("^(" + characterEncoding.replace("w", "w*") + ")"),
              "ATTR": new RegExp("^" + attributes),
              "PSEUDO": new RegExp("^" + pseudos),
              "CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
              "bool": new RegExp("^(?:" + booleans + ")$", "i"),
              "needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
            },
            rinputs = /^(?:input|select|textarea|button)$/i,
            rheader = /^h\d$/i,
            rnative = /^[^{]+\{\s*\[native \w/,
            rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
            rsibling = /[+~]/,
            rescape = /'|\\/g,
            runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
            funescape = function(_, escaped, escapedWhitespace) {
              var high = "0x" + escaped - 0x10000;
              return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 0x10000) : String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
            },
            unloadHandler = function() {
              setDocument();
            };
        try {
          push.apply((arr = slice.call(preferredDoc.childNodes)), preferredDoc.childNodes);
          arr[preferredDoc.childNodes.length].nodeType;
        } catch (e) {
          push = {apply: arr.length ? function(target, els) {
              push_native.apply(target, slice.call(els));
            } : function(target, els) {
              var j = target.length,
                  i = 0;
              while ((target[j++] = els[i++])) {}
              target.length = j - 1;
            }};
        }
        function Sizzle(selector, context, results, seed) {
          var match,
              elem,
              m,
              nodeType,
              i,
              groups,
              old,
              nid,
              newContext,
              newSelector;
          if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
            setDocument(context);
          }
          context = context || document;
          results = results || [];
          nodeType = context.nodeType;
          if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
            return results;
          }
          if (!seed && documentIsHTML) {
            if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
              if ((m = match[1])) {
                if (nodeType === 9) {
                  elem = context.getElementById(m);
                  if (elem && elem.parentNode) {
                    if (elem.id === m) {
                      results.push(elem);
                      return results;
                    }
                  } else {
                    return results;
                  }
                } else {
                  if (context.ownerDocument && (elem = context.ownerDocument.getElementById(m)) && contains(context, elem) && elem.id === m) {
                    results.push(elem);
                    return results;
                  }
                }
              } else if (match[2]) {
                push.apply(results, context.getElementsByTagName(selector));
                return results;
              } else if ((m = match[3]) && support.getElementsByClassName) {
                push.apply(results, context.getElementsByClassName(m));
                return results;
              }
            }
            if (support.qsa && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
              nid = old = expando;
              newContext = context;
              newSelector = nodeType !== 1 && selector;
              if (nodeType === 1 && context.nodeName.toLowerCase() !== "object") {
                groups = tokenize(selector);
                if ((old = context.getAttribute("id"))) {
                  nid = old.replace(rescape, "\\$&");
                } else {
                  context.setAttribute("id", nid);
                }
                nid = "[id='" + nid + "'] ";
                i = groups.length;
                while (i--) {
                  groups[i] = nid + toSelector(groups[i]);
                }
                newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
                newSelector = groups.join(",");
              }
              if (newSelector) {
                try {
                  push.apply(results, newContext.querySelectorAll(newSelector));
                  return results;
                } catch (qsaError) {} finally {
                  if (!old) {
                    context.removeAttribute("id");
                  }
                }
              }
            }
          }
          return select(selector.replace(rtrim, "$1"), context, results, seed);
        }
        function createCache() {
          var keys = [];
          function cache(key, value) {
            if (keys.push(key + " ") > Expr.cacheLength) {
              delete cache[keys.shift()];
            }
            return (cache[key + " "] = value);
          }
          return cache;
        }
        function markFunction(fn) {
          fn[expando] = true;
          return fn;
        }
        function assert(fn) {
          var div = document.createElement("div");
          try {
            return !!fn(div);
          } catch (e) {
            return false;
          } finally {
            if (div.parentNode) {
              div.parentNode.removeChild(div);
            }
            div = null;
          }
        }
        function addHandle(attrs, handler) {
          var arr = attrs.split("|"),
              i = attrs.length;
          while (i--) {
            Expr.attrHandle[arr[i]] = handler;
          }
        }
        function siblingCheck(a, b) {
          var cur = b && a,
              diff = cur && a.nodeType === 1 && b.nodeType === 1 && (~b.sourceIndex || MAX_NEGATIVE) - (~a.sourceIndex || MAX_NEGATIVE);
          if (diff) {
            return diff;
          }
          if (cur) {
            while ((cur = cur.nextSibling)) {
              if (cur === b) {
                return -1;
              }
            }
          }
          return a ? 1 : -1;
        }
        function createInputPseudo(type) {
          return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === type;
          };
        }
        function createButtonPseudo(type) {
          return function(elem) {
            var name = elem.nodeName.toLowerCase();
            return (name === "input" || name === "button") && elem.type === type;
          };
        }
        function createPositionalPseudo(fn) {
          return markFunction(function(argument) {
            argument = +argument;
            return markFunction(function(seed, matches) {
              var j,
                  matchIndexes = fn([], seed.length, argument),
                  i = matchIndexes.length;
              while (i--) {
                if (seed[(j = matchIndexes[i])]) {
                  seed[j] = !(matches[j] = seed[j]);
                }
              }
            });
          });
        }
        function testContext(context) {
          return context && typeof context.getElementsByTagName !== "undefined" && context;
        }
        support = Sizzle.support = {};
        isXML = Sizzle.isXML = function(elem) {
          var documentElement = elem && (elem.ownerDocument || elem).documentElement;
          return documentElement ? documentElement.nodeName !== "HTML" : false;
        };
        setDocument = Sizzle.setDocument = function(node) {
          var hasCompare,
              parent,
              doc = node ? node.ownerDocument || node : preferredDoc;
          if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
            return document;
          }
          document = doc;
          docElem = doc.documentElement;
          parent = doc.defaultView;
          if (parent && parent !== parent.top) {
            if (parent.addEventListener) {
              parent.addEventListener("unload", unloadHandler, false);
            } else if (parent.attachEvent) {
              parent.attachEvent("onunload", unloadHandler);
            }
          }
          documentIsHTML = !isXML(doc);
          support.attributes = assert(function(div) {
            div.className = "i";
            return !div.getAttribute("className");
          });
          support.getElementsByTagName = assert(function(div) {
            div.appendChild(doc.createComment(""));
            return !div.getElementsByTagName("*").length;
          });
          support.getElementsByClassName = rnative.test(doc.getElementsByClassName);
          support.getById = assert(function(div) {
            docElem.appendChild(div).id = expando;
            return !doc.getElementsByName || !doc.getElementsByName(expando).length;
          });
          if (support.getById) {
            Expr.find["ID"] = function(id, context) {
              if (typeof context.getElementById !== "undefined" && documentIsHTML) {
                var m = context.getElementById(id);
                return m && m.parentNode ? [m] : [];
              }
            };
            Expr.filter["ID"] = function(id) {
              var attrId = id.replace(runescape, funescape);
              return function(elem) {
                return elem.getAttribute("id") === attrId;
              };
            };
          } else {
            delete Expr.find["ID"];
            Expr.filter["ID"] = function(id) {
              var attrId = id.replace(runescape, funescape);
              return function(elem) {
                var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
                return node && node.value === attrId;
              };
            };
          }
          Expr.find["TAG"] = support.getElementsByTagName ? function(tag, context) {
            if (typeof context.getElementsByTagName !== "undefined") {
              return context.getElementsByTagName(tag);
            } else if (support.qsa) {
              return context.querySelectorAll(tag);
            }
          } : function(tag, context) {
            var elem,
                tmp = [],
                i = 0,
                results = context.getElementsByTagName(tag);
            if (tag === "*") {
              while ((elem = results[i++])) {
                if (elem.nodeType === 1) {
                  tmp.push(elem);
                }
              }
              return tmp;
            }
            return results;
          };
          Expr.find["CLASS"] = support.getElementsByClassName && function(className, context) {
            if (documentIsHTML) {
              return context.getElementsByClassName(className);
            }
          };
          rbuggyMatches = [];
          rbuggyQSA = [];
          if ((support.qsa = rnative.test(doc.querySelectorAll))) {
            assert(function(div) {
              docElem.appendChild(div).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\f]' msallowcapture=''>" + "<option selected=''></option></select>";
              if (div.querySelectorAll("[msallowcapture^='']").length) {
                rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
              }
              if (!div.querySelectorAll("[selected]").length) {
                rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
              }
              if (!div.querySelectorAll("[id~=" + expando + "-]").length) {
                rbuggyQSA.push("~=");
              }
              if (!div.querySelectorAll(":checked").length) {
                rbuggyQSA.push(":checked");
              }
              if (!div.querySelectorAll("a#" + expando + "+*").length) {
                rbuggyQSA.push(".#.+[+~]");
              }
            });
            assert(function(div) {
              var input = doc.createElement("input");
              input.setAttribute("type", "hidden");
              div.appendChild(input).setAttribute("name", "D");
              if (div.querySelectorAll("[name=d]").length) {
                rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
              }
              if (!div.querySelectorAll(":enabled").length) {
                rbuggyQSA.push(":enabled", ":disabled");
              }
              div.querySelectorAll("*,:x");
              rbuggyQSA.push(",.*:");
            });
          }
          if ((support.matchesSelector = rnative.test((matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)))) {
            assert(function(div) {
              support.disconnectedMatch = matches.call(div, "div");
              matches.call(div, "[s!='']:x");
              rbuggyMatches.push("!=", pseudos);
            });
          }
          rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
          rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
          hasCompare = rnative.test(docElem.compareDocumentPosition);
          contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
            var adown = a.nodeType === 9 ? a.documentElement : a,
                bup = b && b.parentNode;
            return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
          } : function(a, b) {
            if (b) {
              while ((b = b.parentNode)) {
                if (b === a) {
                  return true;
                }
              }
            }
            return false;
          };
          sortOrder = hasCompare ? function(a, b) {
            if (a === b) {
              hasDuplicate = true;
              return 0;
            }
            var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
            if (compare) {
              return compare;
            }
            compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
            if (compare & 1 || (!support.sortDetached && b.compareDocumentPosition(a) === compare)) {
              if (a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
                return -1;
              }
              if (b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
                return 1;
              }
              return sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
            }
            return compare & 4 ? -1 : 1;
          } : function(a, b) {
            if (a === b) {
              hasDuplicate = true;
              return 0;
            }
            var cur,
                i = 0,
                aup = a.parentNode,
                bup = b.parentNode,
                ap = [a],
                bp = [b];
            if (!aup || !bup) {
              return a === doc ? -1 : b === doc ? 1 : aup ? -1 : bup ? 1 : sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
            } else if (aup === bup) {
              return siblingCheck(a, b);
            }
            cur = a;
            while ((cur = cur.parentNode)) {
              ap.unshift(cur);
            }
            cur = b;
            while ((cur = cur.parentNode)) {
              bp.unshift(cur);
            }
            while (ap[i] === bp[i]) {
              i++;
            }
            return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
          };
          return doc;
        };
        Sizzle.matches = function(expr, elements) {
          return Sizzle(expr, null, null, elements);
        };
        Sizzle.matchesSelector = function(elem, expr) {
          if ((elem.ownerDocument || elem) !== document) {
            setDocument(elem);
          }
          expr = expr.replace(rattributeQuotes, "='$1']");
          if (support.matchesSelector && documentIsHTML && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
            try {
              var ret = matches.call(elem, expr);
              if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
                return ret;
              }
            } catch (e) {}
          }
          return Sizzle(expr, document, null, [elem]).length > 0;
        };
        Sizzle.contains = function(context, elem) {
          if ((context.ownerDocument || context) !== document) {
            setDocument(context);
          }
          return contains(context, elem);
        };
        Sizzle.attr = function(elem, name) {
          if ((elem.ownerDocument || elem) !== document) {
            setDocument(elem);
          }
          var fn = Expr.attrHandle[name.toLowerCase()],
              val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
          return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        };
        Sizzle.error = function(msg) {
          throw new Error("Syntax error, unrecognized expression: " + msg);
        };
        Sizzle.uniqueSort = function(results) {
          var elem,
              duplicates = [],
              j = 0,
              i = 0;
          hasDuplicate = !support.detectDuplicates;
          sortInput = !support.sortStable && results.slice(0);
          results.sort(sortOrder);
          if (hasDuplicate) {
            while ((elem = results[i++])) {
              if (elem === results[i]) {
                j = duplicates.push(i);
              }
            }
            while (j--) {
              results.splice(duplicates[j], 1);
            }
          }
          sortInput = null;
          return results;
        };
        getText = Sizzle.getText = function(elem) {
          var node,
              ret = "",
              i = 0,
              nodeType = elem.nodeType;
          if (!nodeType) {
            while ((node = elem[i++])) {
              ret += getText(node);
            }
          } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
            if (typeof elem.textContent === "string") {
              return elem.textContent;
            } else {
              for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                ret += getText(elem);
              }
            }
          } else if (nodeType === 3 || nodeType === 4) {
            return elem.nodeValue;
          }
          return ret;
        };
        Expr = Sizzle.selectors = {
          cacheLength: 50,
          createPseudo: markFunction,
          match: matchExpr,
          attrHandle: {},
          find: {},
          relative: {
            ">": {
              dir: "parentNode",
              first: true
            },
            " ": {dir: "parentNode"},
            "+": {
              dir: "previousSibling",
              first: true
            },
            "~": {dir: "previousSibling"}
          },
          preFilter: {
            "ATTR": function(match) {
              match[1] = match[1].replace(runescape, funescape);
              match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);
              if (match[2] === "~=") {
                match[3] = " " + match[3] + " ";
              }
              return match.slice(0, 4);
            },
            "CHILD": function(match) {
              match[1] = match[1].toLowerCase();
              if (match[1].slice(0, 3) === "nth") {
                if (!match[3]) {
                  Sizzle.error(match[0]);
                }
                match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
                match[5] = +((match[7] + match[8]) || match[3] === "odd");
              } else if (match[3]) {
                Sizzle.error(match[0]);
              }
              return match;
            },
            "PSEUDO": function(match) {
              var excess,
                  unquoted = !match[6] && match[2];
              if (matchExpr["CHILD"].test(match[0])) {
                return null;
              }
              if (match[3]) {
                match[2] = match[4] || match[5] || "";
              } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
                match[0] = match[0].slice(0, excess);
                match[2] = unquoted.slice(0, excess);
              }
              return match.slice(0, 3);
            }
          },
          filter: {
            "TAG": function(nodeNameSelector) {
              var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
              return nodeNameSelector === "*" ? function() {
                return true;
              } : function(elem) {
                return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
              };
            },
            "CLASS": function(className) {
              var pattern = classCache[className + " "];
              return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
                return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
              });
            },
            "ATTR": function(name, operator, check) {
              return function(elem) {
                var result = Sizzle.attr(elem, name);
                if (result == null) {
                  return operator === "!=";
                }
                if (!operator) {
                  return true;
                }
                result += "";
                return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
              };
            },
            "CHILD": function(type, what, argument, first, last) {
              var simple = type.slice(0, 3) !== "nth",
                  forward = type.slice(-4) !== "last",
                  ofType = what === "of-type";
              return first === 1 && last === 0 ? function(elem) {
                return !!elem.parentNode;
              } : function(elem, context, xml) {
                var cache,
                    outerCache,
                    node,
                    diff,
                    nodeIndex,
                    start,
                    dir = simple !== forward ? "nextSibling" : "previousSibling",
                    parent = elem.parentNode,
                    name = ofType && elem.nodeName.toLowerCase(),
                    useCache = !xml && !ofType;
                if (parent) {
                  if (simple) {
                    while (dir) {
                      node = elem;
                      while ((node = node[dir])) {
                        if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                          return false;
                        }
                      }
                      start = dir = type === "only" && !start && "nextSibling";
                    }
                    return true;
                  }
                  start = [forward ? parent.firstChild : parent.lastChild];
                  if (forward && useCache) {
                    outerCache = parent[expando] || (parent[expando] = {});
                    cache = outerCache[type] || [];
                    nodeIndex = cache[0] === dirruns && cache[1];
                    diff = cache[0] === dirruns && cache[2];
                    node = nodeIndex && parent.childNodes[nodeIndex];
                    while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                      if (node.nodeType === 1 && ++diff && node === elem) {
                        outerCache[type] = [dirruns, nodeIndex, diff];
                        break;
                      }
                    }
                  } else if (useCache && (cache = (elem[expando] || (elem[expando] = {}))[type]) && cache[0] === dirruns) {
                    diff = cache[1];
                  } else {
                    while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                      if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                        if (useCache) {
                          (node[expando] || (node[expando] = {}))[type] = [dirruns, diff];
                        }
                        if (node === elem) {
                          break;
                        }
                      }
                    }
                  }
                  diff -= last;
                  return diff === first || (diff % first === 0 && diff / first >= 0);
                }
              };
            },
            "PSEUDO": function(pseudo, argument) {
              var args,
                  fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
              if (fn[expando]) {
                return fn(argument);
              }
              if (fn.length > 1) {
                args = [pseudo, pseudo, "", argument];
                return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
                  var idx,
                      matched = fn(seed, argument),
                      i = matched.length;
                  while (i--) {
                    idx = indexOf(seed, matched[i]);
                    seed[idx] = !(matches[idx] = matched[i]);
                  }
                }) : function(elem) {
                  return fn(elem, 0, args);
                };
              }
              return fn;
            }
          },
          pseudos: {
            "not": markFunction(function(selector) {
              var input = [],
                  results = [],
                  matcher = compile(selector.replace(rtrim, "$1"));
              return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
                var elem,
                    unmatched = matcher(seed, null, xml, []),
                    i = seed.length;
                while (i--) {
                  if ((elem = unmatched[i])) {
                    seed[i] = !(matches[i] = elem);
                  }
                }
              }) : function(elem, context, xml) {
                input[0] = elem;
                matcher(input, null, xml, results);
                input[0] = null;
                return !results.pop();
              };
            }),
            "has": markFunction(function(selector) {
              return function(elem) {
                return Sizzle(selector, elem).length > 0;
              };
            }),
            "contains": markFunction(function(text) {
              text = text.replace(runescape, funescape);
              return function(elem) {
                return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
              };
            }),
            "lang": markFunction(function(lang) {
              if (!ridentifier.test(lang || "")) {
                Sizzle.error("unsupported lang: " + lang);
              }
              lang = lang.replace(runescape, funescape).toLowerCase();
              return function(elem) {
                var elemLang;
                do {
                  if ((elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang"))) {
                    elemLang = elemLang.toLowerCase();
                    return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
                  }
                } while ((elem = elem.parentNode) && elem.nodeType === 1);
                return false;
              };
            }),
            "target": function(elem) {
              var hash = window.location && window.location.hash;
              return hash && hash.slice(1) === elem.id;
            },
            "root": function(elem) {
              return elem === docElem;
            },
            "focus": function(elem) {
              return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
            },
            "enabled": function(elem) {
              return elem.disabled === false;
            },
            "disabled": function(elem) {
              return elem.disabled === true;
            },
            "checked": function(elem) {
              var nodeName = elem.nodeName.toLowerCase();
              return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
            },
            "selected": function(elem) {
              if (elem.parentNode) {
                elem.parentNode.selectedIndex;
              }
              return elem.selected === true;
            },
            "empty": function(elem) {
              for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                if (elem.nodeType < 6) {
                  return false;
                }
              }
              return true;
            },
            "parent": function(elem) {
              return !Expr.pseudos["empty"](elem);
            },
            "header": function(elem) {
              return rheader.test(elem.nodeName);
            },
            "input": function(elem) {
              return rinputs.test(elem.nodeName);
            },
            "button": function(elem) {
              var name = elem.nodeName.toLowerCase();
              return name === "input" && elem.type === "button" || name === "button";
            },
            "text": function(elem) {
              var attr;
              return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ((attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
            },
            "first": createPositionalPseudo(function() {
              return [0];
            }),
            "last": createPositionalPseudo(function(matchIndexes, length) {
              return [length - 1];
            }),
            "eq": createPositionalPseudo(function(matchIndexes, length, argument) {
              return [argument < 0 ? argument + length : argument];
            }),
            "even": createPositionalPseudo(function(matchIndexes, length) {
              var i = 0;
              for (; i < length; i += 2) {
                matchIndexes.push(i);
              }
              return matchIndexes;
            }),
            "odd": createPositionalPseudo(function(matchIndexes, length) {
              var i = 1;
              for (; i < length; i += 2) {
                matchIndexes.push(i);
              }
              return matchIndexes;
            }),
            "lt": createPositionalPseudo(function(matchIndexes, length, argument) {
              var i = argument < 0 ? argument + length : argument;
              for (; --i >= 0; ) {
                matchIndexes.push(i);
              }
              return matchIndexes;
            }),
            "gt": createPositionalPseudo(function(matchIndexes, length, argument) {
              var i = argument < 0 ? argument + length : argument;
              for (; ++i < length; ) {
                matchIndexes.push(i);
              }
              return matchIndexes;
            })
          }
        };
        Expr.pseudos["nth"] = Expr.pseudos["eq"];
        for (i in {
          radio: true,
          checkbox: true,
          file: true,
          password: true,
          image: true
        }) {
          Expr.pseudos[i] = createInputPseudo(i);
        }
        for (i in {
          submit: true,
          reset: true
        }) {
          Expr.pseudos[i] = createButtonPseudo(i);
        }
        function setFilters() {}
        setFilters.prototype = Expr.filters = Expr.pseudos;
        Expr.setFilters = new setFilters();
        tokenize = Sizzle.tokenize = function(selector, parseOnly) {
          var matched,
              match,
              tokens,
              type,
              soFar,
              groups,
              preFilters,
              cached = tokenCache[selector + " "];
          if (cached) {
            return parseOnly ? 0 : cached.slice(0);
          }
          soFar = selector;
          groups = [];
          preFilters = Expr.preFilter;
          while (soFar) {
            if (!matched || (match = rcomma.exec(soFar))) {
              if (match) {
                soFar = soFar.slice(match[0].length) || soFar;
              }
              groups.push((tokens = []));
            }
            matched = false;
            if ((match = rcombinators.exec(soFar))) {
              matched = match.shift();
              tokens.push({
                value: matched,
                type: match[0].replace(rtrim, " ")
              });
              soFar = soFar.slice(matched.length);
            }
            for (type in Expr.filter) {
              if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
                matched = match.shift();
                tokens.push({
                  value: matched,
                  type: type,
                  matches: match
                });
                soFar = soFar.slice(matched.length);
              }
            }
            if (!matched) {
              break;
            }
          }
          return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
        };
        function toSelector(tokens) {
          var i = 0,
              len = tokens.length,
              selector = "";
          for (; i < len; i++) {
            selector += tokens[i].value;
          }
          return selector;
        }
        function addCombinator(matcher, combinator, base) {
          var dir = combinator.dir,
              checkNonElements = base && dir === "parentNode",
              doneName = done++;
          return combinator.first ? function(elem, context, xml) {
            while ((elem = elem[dir])) {
              if (elem.nodeType === 1 || checkNonElements) {
                return matcher(elem, context, xml);
              }
            }
          } : function(elem, context, xml) {
            var oldCache,
                outerCache,
                newCache = [dirruns, doneName];
            if (xml) {
              while ((elem = elem[dir])) {
                if (elem.nodeType === 1 || checkNonElements) {
                  if (matcher(elem, context, xml)) {
                    return true;
                  }
                }
              }
            } else {
              while ((elem = elem[dir])) {
                if (elem.nodeType === 1 || checkNonElements) {
                  outerCache = elem[expando] || (elem[expando] = {});
                  if ((oldCache = outerCache[dir]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                    return (newCache[2] = oldCache[2]);
                  } else {
                    outerCache[dir] = newCache;
                    if ((newCache[2] = matcher(elem, context, xml))) {
                      return true;
                    }
                  }
                }
              }
            }
          };
        }
        function elementMatcher(matchers) {
          return matchers.length > 1 ? function(elem, context, xml) {
            var i = matchers.length;
            while (i--) {
              if (!matchers[i](elem, context, xml)) {
                return false;
              }
            }
            return true;
          } : matchers[0];
        }
        function multipleContexts(selector, contexts, results) {
          var i = 0,
              len = contexts.length;
          for (; i < len; i++) {
            Sizzle(selector, contexts[i], results);
          }
          return results;
        }
        function condense(unmatched, map, filter, context, xml) {
          var elem,
              newUnmatched = [],
              i = 0,
              len = unmatched.length,
              mapped = map != null;
          for (; i < len; i++) {
            if ((elem = unmatched[i])) {
              if (!filter || filter(elem, context, xml)) {
                newUnmatched.push(elem);
                if (mapped) {
                  map.push(i);
                }
              }
            }
          }
          return newUnmatched;
        }
        function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
          if (postFilter && !postFilter[expando]) {
            postFilter = setMatcher(postFilter);
          }
          if (postFinder && !postFinder[expando]) {
            postFinder = setMatcher(postFinder, postSelector);
          }
          return markFunction(function(seed, results, context, xml) {
            var temp,
                i,
                elem,
                preMap = [],
                postMap = [],
                preexisting = results.length,
                elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
                matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
                matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
            if (matcher) {
              matcher(matcherIn, matcherOut, context, xml);
            }
            if (postFilter) {
              temp = condense(matcherOut, postMap);
              postFilter(temp, [], context, xml);
              i = temp.length;
              while (i--) {
                if ((elem = temp[i])) {
                  matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
                }
              }
            }
            if (seed) {
              if (postFinder || preFilter) {
                if (postFinder) {
                  temp = [];
                  i = matcherOut.length;
                  while (i--) {
                    if ((elem = matcherOut[i])) {
                      temp.push((matcherIn[i] = elem));
                    }
                  }
                  postFinder(null, (matcherOut = []), temp, xml);
                }
                i = matcherOut.length;
                while (i--) {
                  if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                    seed[temp] = !(results[temp] = elem);
                  }
                }
              }
            } else {
              matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
              if (postFinder) {
                postFinder(null, results, matcherOut, xml);
              } else {
                push.apply(results, matcherOut);
              }
            }
          });
        }
        function matcherFromTokens(tokens) {
          var checkContext,
              matcher,
              j,
              len = tokens.length,
              leadingRelative = Expr.relative[tokens[0].type],
              implicitRelative = leadingRelative || Expr.relative[" "],
              i = leadingRelative ? 1 : 0,
              matchContext = addCombinator(function(elem) {
                return elem === checkContext;
              }, implicitRelative, true),
              matchAnyContext = addCombinator(function(elem) {
                return indexOf(checkContext, elem) > -1;
              }, implicitRelative, true),
              matchers = [function(elem, context, xml) {
                var ret = (!leadingRelative && (xml || context !== outermostContext)) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
                checkContext = null;
                return ret;
              }];
          for (; i < len; i++) {
            if ((matcher = Expr.relative[tokens[i].type])) {
              matchers = [addCombinator(elementMatcher(matchers), matcher)];
            } else {
              matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
              if (matcher[expando]) {
                j = ++i;
                for (; j < len; j++) {
                  if (Expr.relative[tokens[j].type]) {
                    break;
                  }
                }
                return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({value: tokens[i - 2].type === " " ? "*" : ""})).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens((tokens = tokens.slice(j))), j < len && toSelector(tokens));
              }
              matchers.push(matcher);
            }
          }
          return elementMatcher(matchers);
        }
        function matcherFromGroupMatchers(elementMatchers, setMatchers) {
          var bySet = setMatchers.length > 0,
              byElement = elementMatchers.length > 0,
              superMatcher = function(seed, context, xml, results, outermost) {
                var elem,
                    j,
                    matcher,
                    matchedCount = 0,
                    i = "0",
                    unmatched = seed && [],
                    setMatched = [],
                    contextBackup = outermostContext,
                    elems = seed || byElement && Expr.find["TAG"]("*", outermost),
                    dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
                    len = elems.length;
                if (outermost) {
                  outermostContext = context !== document && context;
                }
                for (; i !== len && (elem = elems[i]) != null; i++) {
                  if (byElement && elem) {
                    j = 0;
                    while ((matcher = elementMatchers[j++])) {
                      if (matcher(elem, context, xml)) {
                        results.push(elem);
                        break;
                      }
                    }
                    if (outermost) {
                      dirruns = dirrunsUnique;
                    }
                  }
                  if (bySet) {
                    if ((elem = !matcher && elem)) {
                      matchedCount--;
                    }
                    if (seed) {
                      unmatched.push(elem);
                    }
                  }
                }
                matchedCount += i;
                if (bySet && i !== matchedCount) {
                  j = 0;
                  while ((matcher = setMatchers[j++])) {
                    matcher(unmatched, setMatched, context, xml);
                  }
                  if (seed) {
                    if (matchedCount > 0) {
                      while (i--) {
                        if (!(unmatched[i] || setMatched[i])) {
                          setMatched[i] = pop.call(results);
                        }
                      }
                    }
                    setMatched = condense(setMatched);
                  }
                  push.apply(results, setMatched);
                  if (outermost && !seed && setMatched.length > 0 && (matchedCount + setMatchers.length) > 1) {
                    Sizzle.uniqueSort(results);
                  }
                }
                if (outermost) {
                  dirruns = dirrunsUnique;
                  outermostContext = contextBackup;
                }
                return unmatched;
              };
          return bySet ? markFunction(superMatcher) : superMatcher;
        }
        compile = Sizzle.compile = function(selector, match) {
          var i,
              setMatchers = [],
              elementMatchers = [],
              cached = compilerCache[selector + " "];
          if (!cached) {
            if (!match) {
              match = tokenize(selector);
            }
            i = match.length;
            while (i--) {
              cached = matcherFromTokens(match[i]);
              if (cached[expando]) {
                setMatchers.push(cached);
              } else {
                elementMatchers.push(cached);
              }
            }
            cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
            cached.selector = selector;
          }
          return cached;
        };
        select = Sizzle.select = function(selector, context, results, seed) {
          var i,
              tokens,
              token,
              type,
              find,
              compiled = typeof selector === "function" && selector,
              match = !seed && tokenize((selector = compiled.selector || selector));
          results = results || [];
          if (match.length === 1) {
            tokens = match[0] = match[0].slice(0);
            if (tokens.length > 2 && (token = tokens[0]).type === "ID" && support.getById && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
              context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
              if (!context) {
                return results;
              } else if (compiled) {
                context = context.parentNode;
              }
              selector = selector.slice(tokens.shift().value.length);
            }
            i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
            while (i--) {
              token = tokens[i];
              if (Expr.relative[(type = token.type)]) {
                break;
              }
              if ((find = Expr.find[type])) {
                if ((seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context))) {
                  tokens.splice(i, 1);
                  selector = seed.length && toSelector(tokens);
                  if (!selector) {
                    push.apply(results, seed);
                    return results;
                  }
                  break;
                }
              }
            }
          }
          (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, rsibling.test(selector) && testContext(context.parentNode) || context);
          return results;
        };
        support.sortStable = expando.split("").sort(sortOrder).join("") === expando;
        support.detectDuplicates = !!hasDuplicate;
        setDocument();
        support.sortDetached = assert(function(div1) {
          return div1.compareDocumentPosition(document.createElement("div")) & 1;
        });
        if (!assert(function(div) {
          div.innerHTML = "<a href='#'></a>";
          return div.firstChild.getAttribute("href") === "#";
        })) {
          addHandle("type|href|height|width", function(elem, name, isXML) {
            if (!isXML) {
              return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
            }
          });
        }
        if (!support.attributes || !assert(function(div) {
          div.innerHTML = "<input/>";
          div.firstChild.setAttribute("value", "");
          return div.firstChild.getAttribute("value") === "";
        })) {
          addHandle("value", function(elem, name, isXML) {
            if (!isXML && elem.nodeName.toLowerCase() === "input") {
              return elem.defaultValue;
            }
          });
        }
        if (!assert(function(div) {
          return div.getAttribute("disabled") == null;
        })) {
          addHandle(booleans, function(elem, name, isXML) {
            var val;
            if (!isXML) {
              return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
            }
          });
        }
        return Sizzle;
      })(window);
      jQuery.find = Sizzle;
      jQuery.expr = Sizzle.selectors;
      jQuery.expr[":"] = jQuery.expr.pseudos;
      jQuery.unique = Sizzle.uniqueSort;
      jQuery.text = Sizzle.getText;
      jQuery.isXMLDoc = Sizzle.isXML;
      jQuery.contains = Sizzle.contains;
      var rneedsContext = jQuery.expr.match.needsContext;
      var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);
      var risSimple = /^.[^:#\[\.,]*$/;
      function winnow(elements, qualifier, not) {
        if (jQuery.isFunction(qualifier)) {
          return jQuery.grep(elements, function(elem, i) {
            return !!qualifier.call(elem, i, elem) !== not;
          });
        }
        if (qualifier.nodeType) {
          return jQuery.grep(elements, function(elem) {
            return (elem === qualifier) !== not;
          });
        }
        if (typeof qualifier === "string") {
          if (risSimple.test(qualifier)) {
            return jQuery.filter(qualifier, elements, not);
          }
          qualifier = jQuery.filter(qualifier, elements);
        }
        return jQuery.grep(elements, function(elem) {
          return (jQuery.inArray(elem, qualifier) >= 0) !== not;
        });
      }
      jQuery.filter = function(expr, elems, not) {
        var elem = elems[0];
        if (not) {
          expr = ":not(" + expr + ")";
        }
        return elems.length === 1 && elem.nodeType === 1 ? jQuery.find.matchesSelector(elem, expr) ? [elem] : [] : jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
          return elem.nodeType === 1;
        }));
      };
      jQuery.fn.extend({
        find: function(selector) {
          var i,
              ret = [],
              self = this,
              len = self.length;
          if (typeof selector !== "string") {
            return this.pushStack(jQuery(selector).filter(function() {
              for (i = 0; i < len; i++) {
                if (jQuery.contains(self[i], this)) {
                  return true;
                }
              }
            }));
          }
          for (i = 0; i < len; i++) {
            jQuery.find(selector, self[i], ret);
          }
          ret = this.pushStack(len > 1 ? jQuery.unique(ret) : ret);
          ret.selector = this.selector ? this.selector + " " + selector : selector;
          return ret;
        },
        filter: function(selector) {
          return this.pushStack(winnow(this, selector || [], false));
        },
        not: function(selector) {
          return this.pushStack(winnow(this, selector || [], true));
        },
        is: function(selector) {
          return !!winnow(this, typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
        }
      });
      var rootjQuery,
          document = window.document,
          rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
          init = jQuery.fn.init = function(selector, context) {
            var match,
                elem;
            if (!selector) {
              return this;
            }
            if (typeof selector === "string") {
              if (selector.charAt(0) === "<" && selector.charAt(selector.length - 1) === ">" && selector.length >= 3) {
                match = [null, selector, null];
              } else {
                match = rquickExpr.exec(selector);
              }
              if (match && (match[1] || !context)) {
                if (match[1]) {
                  context = context instanceof jQuery ? context[0] : context;
                  jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
                  if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                    for (match in context) {
                      if (jQuery.isFunction(this[match])) {
                        this[match](context[match]);
                      } else {
                        this.attr(match, context[match]);
                      }
                    }
                  }
                  return this;
                } else {
                  elem = document.getElementById(match[2]);
                  if (elem && elem.parentNode) {
                    if (elem.id !== match[2]) {
                      return rootjQuery.find(selector);
                    }
                    this.length = 1;
                    this[0] = elem;
                  }
                  this.context = document;
                  this.selector = selector;
                  return this;
                }
              } else if (!context || context.jquery) {
                return (context || rootjQuery).find(selector);
              } else {
                return this.constructor(context).find(selector);
              }
            } else if (selector.nodeType) {
              this.context = this[0] = selector;
              this.length = 1;
              return this;
            } else if (jQuery.isFunction(selector)) {
              return typeof rootjQuery.ready !== "undefined" ? rootjQuery.ready(selector) : selector(jQuery);
            }
            if (selector.selector !== undefined) {
              this.selector = selector.selector;
              this.context = selector.context;
            }
            return jQuery.makeArray(selector, this);
          };
      init.prototype = jQuery.fn;
      rootjQuery = jQuery(document);
      var rparentsprev = /^(?:parents|prev(?:Until|All))/,
          guaranteedUnique = {
            children: true,
            contents: true,
            next: true,
            prev: true
          };
      jQuery.extend({
        dir: function(elem, dir, until) {
          var matched = [],
              cur = elem[dir];
          while (cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery(cur).is(until))) {
            if (cur.nodeType === 1) {
              matched.push(cur);
            }
            cur = cur[dir];
          }
          return matched;
        },
        sibling: function(n, elem) {
          var r = [];
          for (; n; n = n.nextSibling) {
            if (n.nodeType === 1 && n !== elem) {
              r.push(n);
            }
          }
          return r;
        }
      });
      jQuery.fn.extend({
        has: function(target) {
          var i,
              targets = jQuery(target, this),
              len = targets.length;
          return this.filter(function() {
            for (i = 0; i < len; i++) {
              if (jQuery.contains(this, targets[i])) {
                return true;
              }
            }
          });
        },
        closest: function(selectors, context) {
          var cur,
              i = 0,
              l = this.length,
              matched = [],
              pos = rneedsContext.test(selectors) || typeof selectors !== "string" ? jQuery(selectors, context || this.context) : 0;
          for (; i < l; i++) {
            for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
              if (cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
                matched.push(cur);
                break;
              }
            }
          }
          return this.pushStack(matched.length > 1 ? jQuery.unique(matched) : matched);
        },
        index: function(elem) {
          if (!elem) {
            return (this[0] && this[0].parentNode) ? this.first().prevAll().length : -1;
          }
          if (typeof elem === "string") {
            return jQuery.inArray(this[0], jQuery(elem));
          }
          return jQuery.inArray(elem.jquery ? elem[0] : elem, this);
        },
        add: function(selector, context) {
          return this.pushStack(jQuery.unique(jQuery.merge(this.get(), jQuery(selector, context))));
        },
        addBack: function(selector) {
          return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
        }
      });
      function sibling(cur, dir) {
        do {
          cur = cur[dir];
        } while (cur && cur.nodeType !== 1);
        return cur;
      }
      jQuery.each({
        parent: function(elem) {
          var parent = elem.parentNode;
          return parent && parent.nodeType !== 11 ? parent : null;
        },
        parents: function(elem) {
          return jQuery.dir(elem, "parentNode");
        },
        parentsUntil: function(elem, i, until) {
          return jQuery.dir(elem, "parentNode", until);
        },
        next: function(elem) {
          return sibling(elem, "nextSibling");
        },
        prev: function(elem) {
          return sibling(elem, "previousSibling");
        },
        nextAll: function(elem) {
          return jQuery.dir(elem, "nextSibling");
        },
        prevAll: function(elem) {
          return jQuery.dir(elem, "previousSibling");
        },
        nextUntil: function(elem, i, until) {
          return jQuery.dir(elem, "nextSibling", until);
        },
        prevUntil: function(elem, i, until) {
          return jQuery.dir(elem, "previousSibling", until);
        },
        siblings: function(elem) {
          return jQuery.sibling((elem.parentNode || {}).firstChild, elem);
        },
        children: function(elem) {
          return jQuery.sibling(elem.firstChild);
        },
        contents: function(elem) {
          return jQuery.nodeName(elem, "iframe") ? elem.contentDocument || elem.contentWindow.document : jQuery.merge([], elem.childNodes);
        }
      }, function(name, fn) {
        jQuery.fn[name] = function(until, selector) {
          var ret = jQuery.map(this, fn, until);
          if (name.slice(-5) !== "Until") {
            selector = until;
          }
          if (selector && typeof selector === "string") {
            ret = jQuery.filter(selector, ret);
          }
          if (this.length > 1) {
            if (!guaranteedUnique[name]) {
              ret = jQuery.unique(ret);
            }
            if (rparentsprev.test(name)) {
              ret = ret.reverse();
            }
          }
          return this.pushStack(ret);
        };
      });
      var rnotwhite = (/\S+/g);
      var optionsCache = {};
      function createOptions(options) {
        var object = optionsCache[options] = {};
        jQuery.each(options.match(rnotwhite) || [], function(_, flag) {
          object[flag] = true;
        });
        return object;
      }
      jQuery.Callbacks = function(options) {
        options = typeof options === "string" ? (optionsCache[options] || createOptions(options)) : jQuery.extend({}, options);
        var firing,
            memory,
            fired,
            firingLength,
            firingIndex,
            firingStart,
            list = [],
            stack = !options.once && [],
            fire = function(data) {
              memory = options.memory && data;
              fired = true;
              firingIndex = firingStart || 0;
              firingStart = 0;
              firingLength = list.length;
              firing = true;
              for (; list && firingIndex < firingLength; firingIndex++) {
                if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
                  memory = false;
                  break;
                }
              }
              firing = false;
              if (list) {
                if (stack) {
                  if (stack.length) {
                    fire(stack.shift());
                  }
                } else if (memory) {
                  list = [];
                } else {
                  self.disable();
                }
              }
            },
            self = {
              add: function() {
                if (list) {
                  var start = list.length;
                  (function add(args) {
                    jQuery.each(args, function(_, arg) {
                      var type = jQuery.type(arg);
                      if (type === "function") {
                        if (!options.unique || !self.has(arg)) {
                          list.push(arg);
                        }
                      } else if (arg && arg.length && type !== "string") {
                        add(arg);
                      }
                    });
                  })(arguments);
                  if (firing) {
                    firingLength = list.length;
                  } else if (memory) {
                    firingStart = start;
                    fire(memory);
                  }
                }
                return this;
              },
              remove: function() {
                if (list) {
                  jQuery.each(arguments, function(_, arg) {
                    var index;
                    while ((index = jQuery.inArray(arg, list, index)) > -1) {
                      list.splice(index, 1);
                      if (firing) {
                        if (index <= firingLength) {
                          firingLength--;
                        }
                        if (index <= firingIndex) {
                          firingIndex--;
                        }
                      }
                    }
                  });
                }
                return this;
              },
              has: function(fn) {
                return fn ? jQuery.inArray(fn, list) > -1 : !!(list && list.length);
              },
              empty: function() {
                list = [];
                firingLength = 0;
                return this;
              },
              disable: function() {
                list = stack = memory = undefined;
                return this;
              },
              disabled: function() {
                return !list;
              },
              lock: function() {
                stack = undefined;
                if (!memory) {
                  self.disable();
                }
                return this;
              },
              locked: function() {
                return !stack;
              },
              fireWith: function(context, args) {
                if (list && (!fired || stack)) {
                  args = args || [];
                  args = [context, args.slice ? args.slice() : args];
                  if (firing) {
                    stack.push(args);
                  } else {
                    fire(args);
                  }
                }
                return this;
              },
              fire: function() {
                self.fireWith(this, arguments);
                return this;
              },
              fired: function() {
                return !!fired;
              }
            };
        return self;
      };
      jQuery.extend({
        Deferred: function(func) {
          var tuples = [["resolve", "done", jQuery.Callbacks("once memory"), "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), "rejected"], ["notify", "progress", jQuery.Callbacks("memory")]],
              state = "pending",
              promise = {
                state: function() {
                  return state;
                },
                always: function() {
                  deferred.done(arguments).fail(arguments);
                  return this;
                },
                then: function() {
                  var fns = arguments;
                  return jQuery.Deferred(function(newDefer) {
                    jQuery.each(tuples, function(i, tuple) {
                      var fn = jQuery.isFunction(fns[i]) && fns[i];
                      deferred[tuple[1]](function() {
                        var returned = fn && fn.apply(this, arguments);
                        if (returned && jQuery.isFunction(returned.promise)) {
                          returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify);
                        } else {
                          newDefer[tuple[0] + "With"](this === promise ? newDefer.promise() : this, fn ? [returned] : arguments);
                        }
                      });
                    });
                    fns = null;
                  }).promise();
                },
                promise: function(obj) {
                  return obj != null ? jQuery.extend(obj, promise) : promise;
                }
              },
              deferred = {};
          promise.pipe = promise.then;
          jQuery.each(tuples, function(i, tuple) {
            var list = tuple[2],
                stateString = tuple[3];
            promise[tuple[1]] = list.add;
            if (stateString) {
              list.add(function() {
                state = stateString;
              }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
            }
            deferred[tuple[0]] = function() {
              deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
              return this;
            };
            deferred[tuple[0] + "With"] = list.fireWith;
          });
          promise.promise(deferred);
          if (func) {
            func.call(deferred, deferred);
          }
          return deferred;
        },
        when: function(subordinate) {
          var i = 0,
              resolveValues = slice.call(arguments),
              length = resolveValues.length,
              remaining = length !== 1 || (subordinate && jQuery.isFunction(subordinate.promise)) ? length : 0,
              deferred = remaining === 1 ? subordinate : jQuery.Deferred(),
              updateFunc = function(i, contexts, values) {
                return function(value) {
                  contexts[i] = this;
                  values[i] = arguments.length > 1 ? slice.call(arguments) : value;
                  if (values === progressValues) {
                    deferred.notifyWith(contexts, values);
                  } else if (!(--remaining)) {
                    deferred.resolveWith(contexts, values);
                  }
                };
              },
              progressValues,
              progressContexts,
              resolveContexts;
          if (length > 1) {
            progressValues = new Array(length);
            progressContexts = new Array(length);
            resolveContexts = new Array(length);
            for (; i < length; i++) {
              if (resolveValues[i] && jQuery.isFunction(resolveValues[i].promise)) {
                resolveValues[i].promise().done(updateFunc(i, resolveContexts, resolveValues)).fail(deferred.reject).progress(updateFunc(i, progressContexts, progressValues));
              } else {
                --remaining;
              }
            }
          }
          if (!remaining) {
            deferred.resolveWith(resolveContexts, resolveValues);
          }
          return deferred.promise();
        }
      });
      var readyList;
      jQuery.fn.ready = function(fn) {
        jQuery.ready.promise().done(fn);
        return this;
      };
      jQuery.extend({
        isReady: false,
        readyWait: 1,
        holdReady: function(hold) {
          if (hold) {
            jQuery.readyWait++;
          } else {
            jQuery.ready(true);
          }
        },
        ready: function(wait) {
          if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
            return;
          }
          if (!document.body) {
            return setTimeout(jQuery.ready);
          }
          jQuery.isReady = true;
          if (wait !== true && --jQuery.readyWait > 0) {
            return;
          }
          readyList.resolveWith(document, [jQuery]);
          if (jQuery.fn.triggerHandler) {
            jQuery(document).triggerHandler("ready");
            jQuery(document).off("ready");
          }
        }
      });
      function detach() {
        if (document.addEventListener) {
          document.removeEventListener("DOMContentLoaded", completed, false);
          window.removeEventListener("load", completed, false);
        } else {
          document.detachEvent("onreadystatechange", completed);
          window.detachEvent("onload", completed);
        }
      }
      function completed() {
        if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
          detach();
          jQuery.ready();
        }
      }
      jQuery.ready.promise = function(obj) {
        if (!readyList) {
          readyList = jQuery.Deferred();
          if (document.readyState === "complete") {
            setTimeout(jQuery.ready);
          } else if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", completed, false);
            window.addEventListener("load", completed, false);
          } else {
            document.attachEvent("onreadystatechange", completed);
            window.attachEvent("onload", completed);
            var top = false;
            try {
              top = window.frameElement == null && document.documentElement;
            } catch (e) {}
            if (top && top.doScroll) {
              (function doScrollCheck() {
                if (!jQuery.isReady) {
                  try {
                    top.doScroll("left");
                  } catch (e) {
                    return setTimeout(doScrollCheck, 50);
                  }
                  detach();
                  jQuery.ready();
                }
              })();
            }
          }
        }
        return readyList.promise(obj);
      };
      var strundefined = typeof undefined;
      var i;
      for (i in jQuery(support)) {
        break;
      }
      support.ownLast = i !== "0";
      support.inlineBlockNeedsLayout = false;
      jQuery(function() {
        var val,
            div,
            body,
            container;
        body = document.getElementsByTagName("body")[0];
        if (!body || !body.style) {
          return;
        }
        div = document.createElement("div");
        container = document.createElement("div");
        container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
        body.appendChild(container).appendChild(div);
        if (typeof div.style.zoom !== strundefined) {
          div.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1";
          support.inlineBlockNeedsLayout = val = div.offsetWidth === 3;
          if (val) {
            body.style.zoom = 1;
          }
        }
        body.removeChild(container);
      });
      (function() {
        var div = document.createElement("div");
        if (support.deleteExpando == null) {
          support.deleteExpando = true;
          try {
            delete div.test;
          } catch (e) {
            support.deleteExpando = false;
          }
        }
        div = null;
      })();
      jQuery.acceptData = function(elem) {
        var noData = jQuery.noData[(elem.nodeName + " ").toLowerCase()],
            nodeType = +elem.nodeType || 1;
        return nodeType !== 1 && nodeType !== 9 ? false : !noData || noData !== true && elem.getAttribute("classid") === noData;
      };
      var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
          rmultiDash = /([A-Z])/g;
      function dataAttr(elem, key, data) {
        if (data === undefined && elem.nodeType === 1) {
          var name = "data-" + key.replace(rmultiDash, "-$1").toLowerCase();
          data = elem.getAttribute(name);
          if (typeof data === "string") {
            try {
              data = data === "true" ? true : data === "false" ? false : data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? jQuery.parseJSON(data) : data;
            } catch (e) {}
            jQuery.data(elem, key, data);
          } else {
            data = undefined;
          }
        }
        return data;
      }
      function isEmptyDataObject(obj) {
        var name;
        for (name in obj) {
          if (name === "data" && jQuery.isEmptyObject(obj[name])) {
            continue;
          }
          if (name !== "toJSON") {
            return false;
          }
        }
        return true;
      }
      function internalData(elem, name, data, pvt) {
        if (!jQuery.acceptData(elem)) {
          return;
        }
        var ret,
            thisCache,
            internalKey = jQuery.expando,
            isNode = elem.nodeType,
            cache = isNode ? jQuery.cache : elem,
            id = isNode ? elem[internalKey] : elem[internalKey] && internalKey;
        if ((!id || !cache[id] || (!pvt && !cache[id].data)) && data === undefined && typeof name === "string") {
          return;
        }
        if (!id) {
          if (isNode) {
            id = elem[internalKey] = deletedIds.pop() || jQuery.guid++;
          } else {
            id = internalKey;
          }
        }
        if (!cache[id]) {
          cache[id] = isNode ? {} : {toJSON: jQuery.noop};
        }
        if (typeof name === "object" || typeof name === "function") {
          if (pvt) {
            cache[id] = jQuery.extend(cache[id], name);
          } else {
            cache[id].data = jQuery.extend(cache[id].data, name);
          }
        }
        thisCache = cache[id];
        if (!pvt) {
          if (!thisCache.data) {
            thisCache.data = {};
          }
          thisCache = thisCache.data;
        }
        if (data !== undefined) {
          thisCache[jQuery.camelCase(name)] = data;
        }
        if (typeof name === "string") {
          ret = thisCache[name];
          if (ret == null) {
            ret = thisCache[jQuery.camelCase(name)];
          }
        } else {
          ret = thisCache;
        }
        return ret;
      }
      function internalRemoveData(elem, name, pvt) {
        if (!jQuery.acceptData(elem)) {
          return;
        }
        var thisCache,
            i,
            isNode = elem.nodeType,
            cache = isNode ? jQuery.cache : elem,
            id = isNode ? elem[jQuery.expando] : jQuery.expando;
        if (!cache[id]) {
          return;
        }
        if (name) {
          thisCache = pvt ? cache[id] : cache[id].data;
          if (thisCache) {
            if (!jQuery.isArray(name)) {
              if (name in thisCache) {
                name = [name];
              } else {
                name = jQuery.camelCase(name);
                if (name in thisCache) {
                  name = [name];
                } else {
                  name = name.split(" ");
                }
              }
            } else {
              name = name.concat(jQuery.map(name, jQuery.camelCase));
            }
            i = name.length;
            while (i--) {
              delete thisCache[name[i]];
            }
            if (pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache)) {
              return;
            }
          }
        }
        if (!pvt) {
          delete cache[id].data;
          if (!isEmptyDataObject(cache[id])) {
            return;
          }
        }
        if (isNode) {
          jQuery.cleanData([elem], true);
        } else if (support.deleteExpando || cache != cache.window) {
          delete cache[id];
        } else {
          cache[id] = null;
        }
      }
      jQuery.extend({
        cache: {},
        noData: {
          "applet ": true,
          "embed ": true,
          "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
        },
        hasData: function(elem) {
          elem = elem.nodeType ? jQuery.cache[elem[jQuery.expando]] : elem[jQuery.expando];
          return !!elem && !isEmptyDataObject(elem);
        },
        data: function(elem, name, data) {
          return internalData(elem, name, data);
        },
        removeData: function(elem, name) {
          return internalRemoveData(elem, name);
        },
        _data: function(elem, name, data) {
          return internalData(elem, name, data, true);
        },
        _removeData: function(elem, name) {
          return internalRemoveData(elem, name, true);
        }
      });
      jQuery.fn.extend({
        data: function(key, value) {
          var i,
              name,
              data,
              elem = this[0],
              attrs = elem && elem.attributes;
          if (key === undefined) {
            if (this.length) {
              data = jQuery.data(elem);
              if (elem.nodeType === 1 && !jQuery._data(elem, "parsedAttrs")) {
                i = attrs.length;
                while (i--) {
                  if (attrs[i]) {
                    name = attrs[i].name;
                    if (name.indexOf("data-") === 0) {
                      name = jQuery.camelCase(name.slice(5));
                      dataAttr(elem, name, data[name]);
                    }
                  }
                }
                jQuery._data(elem, "parsedAttrs", true);
              }
            }
            return data;
          }
          if (typeof key === "object") {
            return this.each(function() {
              jQuery.data(this, key);
            });
          }
          return arguments.length > 1 ? this.each(function() {
            jQuery.data(this, key, value);
          }) : elem ? dataAttr(elem, key, jQuery.data(elem, key)) : undefined;
        },
        removeData: function(key) {
          return this.each(function() {
            jQuery.removeData(this, key);
          });
        }
      });
      jQuery.extend({
        queue: function(elem, type, data) {
          var queue;
          if (elem) {
            type = (type || "fx") + "queue";
            queue = jQuery._data(elem, type);
            if (data) {
              if (!queue || jQuery.isArray(data)) {
                queue = jQuery._data(elem, type, jQuery.makeArray(data));
              } else {
                queue.push(data);
              }
            }
            return queue || [];
          }
        },
        dequeue: function(elem, type) {
          type = type || "fx";
          var queue = jQuery.queue(elem, type),
              startLength = queue.length,
              fn = queue.shift(),
              hooks = jQuery._queueHooks(elem, type),
              next = function() {
                jQuery.dequeue(elem, type);
              };
          if (fn === "inprogress") {
            fn = queue.shift();
            startLength--;
          }
          if (fn) {
            if (type === "fx") {
              queue.unshift("inprogress");
            }
            delete hooks.stop;
            fn.call(elem, next, hooks);
          }
          if (!startLength && hooks) {
            hooks.empty.fire();
          }
        },
        _queueHooks: function(elem, type) {
          var key = type + "queueHooks";
          return jQuery._data(elem, key) || jQuery._data(elem, key, {empty: jQuery.Callbacks("once memory").add(function() {
              jQuery._removeData(elem, type + "queue");
              jQuery._removeData(elem, key);
            })});
        }
      });
      jQuery.fn.extend({
        queue: function(type, data) {
          var setter = 2;
          if (typeof type !== "string") {
            data = type;
            type = "fx";
            setter--;
          }
          if (arguments.length < setter) {
            return jQuery.queue(this[0], type);
          }
          return data === undefined ? this : this.each(function() {
            var queue = jQuery.queue(this, type, data);
            jQuery._queueHooks(this, type);
            if (type === "fx" && queue[0] !== "inprogress") {
              jQuery.dequeue(this, type);
            }
          });
        },
        dequeue: function(type) {
          return this.each(function() {
            jQuery.dequeue(this, type);
          });
        },
        clearQueue: function(type) {
          return this.queue(type || "fx", []);
        },
        promise: function(type, obj) {
          var tmp,
              count = 1,
              defer = jQuery.Deferred(),
              elements = this,
              i = this.length,
              resolve = function() {
                if (!(--count)) {
                  defer.resolveWith(elements, [elements]);
                }
              };
          if (typeof type !== "string") {
            obj = type;
            type = undefined;
          }
          type = type || "fx";
          while (i--) {
            tmp = jQuery._data(elements[i], type + "queueHooks");
            if (tmp && tmp.empty) {
              count++;
              tmp.empty.add(resolve);
            }
          }
          resolve();
          return defer.promise(obj);
        }
      });
      var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;
      var cssExpand = ["Top", "Right", "Bottom", "Left"];
      var isHidden = function(elem, el) {
        elem = el || elem;
        return jQuery.css(elem, "display") === "none" || !jQuery.contains(elem.ownerDocument, elem);
      };
      var access = jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
        var i = 0,
            length = elems.length,
            bulk = key == null;
        if (jQuery.type(key) === "object") {
          chainable = true;
          for (i in key) {
            jQuery.access(elems, fn, i, key[i], true, emptyGet, raw);
          }
        } else if (value !== undefined) {
          chainable = true;
          if (!jQuery.isFunction(value)) {
            raw = true;
          }
          if (bulk) {
            if (raw) {
              fn.call(elems, value);
              fn = null;
            } else {
              bulk = fn;
              fn = function(elem, key, value) {
                return bulk.call(jQuery(elem), value);
              };
            }
          }
          if (fn) {
            for (; i < length; i++) {
              fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
            }
          }
        }
        return chainable ? elems : bulk ? fn.call(elems) : length ? fn(elems[0], key) : emptyGet;
      };
      var rcheckableType = (/^(?:checkbox|radio)$/i);
      (function() {
        var input = document.createElement("input"),
            div = document.createElement("div"),
            fragment = document.createDocumentFragment();
        div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
        support.leadingWhitespace = div.firstChild.nodeType === 3;
        support.tbody = !div.getElementsByTagName("tbody").length;
        support.htmlSerialize = !!div.getElementsByTagName("link").length;
        support.html5Clone = document.createElement("nav").cloneNode(true).outerHTML !== "<:nav></:nav>";
        input.type = "checkbox";
        input.checked = true;
        fragment.appendChild(input);
        support.appendChecked = input.checked;
        div.innerHTML = "<textarea>x</textarea>";
        support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
        fragment.appendChild(div);
        div.innerHTML = "<input type='radio' checked='checked' name='t'/>";
        support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
        support.noCloneEvent = true;
        if (div.attachEvent) {
          div.attachEvent("onclick", function() {
            support.noCloneEvent = false;
          });
          div.cloneNode(true).click();
        }
        if (support.deleteExpando == null) {
          support.deleteExpando = true;
          try {
            delete div.test;
          } catch (e) {
            support.deleteExpando = false;
          }
        }
      })();
      (function() {
        var i,
            eventName,
            div = document.createElement("div");
        for (i in {
          submit: true,
          change: true,
          focusin: true
        }) {
          eventName = "on" + i;
          if (!(support[i + "Bubbles"] = eventName in window)) {
            div.setAttribute(eventName, "t");
            support[i + "Bubbles"] = div.attributes[eventName].expando === false;
          }
        }
        div = null;
      })();
      var rformElems = /^(?:input|select|textarea)$/i,
          rkeyEvent = /^key/,
          rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
          rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
          rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
      function returnTrue() {
        return true;
      }
      function returnFalse() {
        return false;
      }
      function safeActiveElement() {
        try {
          return document.activeElement;
        } catch (err) {}
      }
      jQuery.event = {
        global: {},
        add: function(elem, types, handler, data, selector) {
          var tmp,
              events,
              t,
              handleObjIn,
              special,
              eventHandle,
              handleObj,
              handlers,
              type,
              namespaces,
              origType,
              elemData = jQuery._data(elem);
          if (!elemData) {
            return;
          }
          if (handler.handler) {
            handleObjIn = handler;
            handler = handleObjIn.handler;
            selector = handleObjIn.selector;
          }
          if (!handler.guid) {
            handler.guid = jQuery.guid++;
          }
          if (!(events = elemData.events)) {
            events = elemData.events = {};
          }
          if (!(eventHandle = elemData.handle)) {
            eventHandle = elemData.handle = function(e) {
              return typeof jQuery !== strundefined && (!e || jQuery.event.triggered !== e.type) ? jQuery.event.dispatch.apply(eventHandle.elem, arguments) : undefined;
            };
            eventHandle.elem = elem;
          }
          types = (types || "").match(rnotwhite) || [""];
          t = types.length;
          while (t--) {
            tmp = rtypenamespace.exec(types[t]) || [];
            type = origType = tmp[1];
            namespaces = (tmp[2] || "").split(".").sort();
            if (!type) {
              continue;
            }
            special = jQuery.event.special[type] || {};
            type = (selector ? special.delegateType : special.bindType) || type;
            special = jQuery.event.special[type] || {};
            handleObj = jQuery.extend({
              type: type,
              origType: origType,
              data: data,
              handler: handler,
              guid: handler.guid,
              selector: selector,
              needsContext: selector && jQuery.expr.match.needsContext.test(selector),
              namespace: namespaces.join(".")
            }, handleObjIn);
            if (!(handlers = events[type])) {
              handlers = events[type] = [];
              handlers.delegateCount = 0;
              if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
                if (elem.addEventListener) {
                  elem.addEventListener(type, eventHandle, false);
                } else if (elem.attachEvent) {
                  elem.attachEvent("on" + type, eventHandle);
                }
              }
            }
            if (special.add) {
              special.add.call(elem, handleObj);
              if (!handleObj.handler.guid) {
                handleObj.handler.guid = handler.guid;
              }
            }
            if (selector) {
              handlers.splice(handlers.delegateCount++, 0, handleObj);
            } else {
              handlers.push(handleObj);
            }
            jQuery.event.global[type] = true;
          }
          elem = null;
        },
        remove: function(elem, types, handler, selector, mappedTypes) {
          var j,
              handleObj,
              tmp,
              origCount,
              t,
              events,
              special,
              handlers,
              type,
              namespaces,
              origType,
              elemData = jQuery.hasData(elem) && jQuery._data(elem);
          if (!elemData || !(events = elemData.events)) {
            return;
          }
          types = (types || "").match(rnotwhite) || [""];
          t = types.length;
          while (t--) {
            tmp = rtypenamespace.exec(types[t]) || [];
            type = origType = tmp[1];
            namespaces = (tmp[2] || "").split(".").sort();
            if (!type) {
              for (type in events) {
                jQuery.event.remove(elem, type + types[t], handler, selector, true);
              }
              continue;
            }
            special = jQuery.event.special[type] || {};
            type = (selector ? special.delegateType : special.bindType) || type;
            handlers = events[type] || [];
            tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
            origCount = j = handlers.length;
            while (j--) {
              handleObj = handlers[j];
              if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
                handlers.splice(j, 1);
                if (handleObj.selector) {
                  handlers.delegateCount--;
                }
                if (special.remove) {
                  special.remove.call(elem, handleObj);
                }
              }
            }
            if (origCount && !handlers.length) {
              if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
                jQuery.removeEvent(elem, type, elemData.handle);
              }
              delete events[type];
            }
          }
          if (jQuery.isEmptyObject(events)) {
            delete elemData.handle;
            jQuery._removeData(elem, "events");
          }
        },
        trigger: function(event, data, elem, onlyHandlers) {
          var handle,
              ontype,
              cur,
              bubbleType,
              special,
              tmp,
              i,
              eventPath = [elem || document],
              type = hasOwn.call(event, "type") ? event.type : event,
              namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
          cur = tmp = elem = elem || document;
          if (elem.nodeType === 3 || elem.nodeType === 8) {
            return;
          }
          if (rfocusMorph.test(type + jQuery.event.triggered)) {
            return;
          }
          if (type.indexOf(".") >= 0) {
            namespaces = type.split(".");
            type = namespaces.shift();
            namespaces.sort();
          }
          ontype = type.indexOf(":") < 0 && "on" + type;
          event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);
          event.isTrigger = onlyHandlers ? 2 : 3;
          event.namespace = namespaces.join(".");
          event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
          event.result = undefined;
          if (!event.target) {
            event.target = elem;
          }
          data = data == null ? [event] : jQuery.makeArray(data, [event]);
          special = jQuery.event.special[type] || {};
          if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
            return;
          }
          if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
            bubbleType = special.delegateType || type;
            if (!rfocusMorph.test(bubbleType + type)) {
              cur = cur.parentNode;
            }
            for (; cur; cur = cur.parentNode) {
              eventPath.push(cur);
              tmp = cur;
            }
            if (tmp === (elem.ownerDocument || document)) {
              eventPath.push(tmp.defaultView || tmp.parentWindow || window);
            }
          }
          i = 0;
          while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
            event.type = i > 1 ? bubbleType : special.bindType || type;
            handle = (jQuery._data(cur, "events") || {})[event.type] && jQuery._data(cur, "handle");
            if (handle) {
              handle.apply(cur, data);
            }
            handle = ontype && cur[ontype];
            if (handle && handle.apply && jQuery.acceptData(cur)) {
              event.result = handle.apply(cur, data);
              if (event.result === false) {
                event.preventDefault();
              }
            }
          }
          event.type = type;
          if (!onlyHandlers && !event.isDefaultPrevented()) {
            if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && jQuery.acceptData(elem)) {
              if (ontype && elem[type] && !jQuery.isWindow(elem)) {
                tmp = elem[ontype];
                if (tmp) {
                  elem[ontype] = null;
                }
                jQuery.event.triggered = type;
                try {
                  elem[type]();
                } catch (e) {}
                jQuery.event.triggered = undefined;
                if (tmp) {
                  elem[ontype] = tmp;
                }
              }
            }
          }
          return event.result;
        },
        dispatch: function(event) {
          event = jQuery.event.fix(event);
          var i,
              ret,
              handleObj,
              matched,
              j,
              handlerQueue = [],
              args = slice.call(arguments),
              handlers = (jQuery._data(this, "events") || {})[event.type] || [],
              special = jQuery.event.special[event.type] || {};
          args[0] = event;
          event.delegateTarget = this;
          if (special.preDispatch && special.preDispatch.call(this, event) === false) {
            return;
          }
          handlerQueue = jQuery.event.handlers.call(this, event, handlers);
          i = 0;
          while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
            event.currentTarget = matched.elem;
            j = 0;
            while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
              if (!event.namespace_re || event.namespace_re.test(handleObj.namespace)) {
                event.handleObj = handleObj;
                event.data = handleObj.data;
                ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
                if (ret !== undefined) {
                  if ((event.result = ret) === false) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }
              }
            }
          }
          if (special.postDispatch) {
            special.postDispatch.call(this, event);
          }
          return event.result;
        },
        handlers: function(event, handlers) {
          var sel,
              handleObj,
              matches,
              i,
              handlerQueue = [],
              delegateCount = handlers.delegateCount,
              cur = event.target;
          if (delegateCount && cur.nodeType && (!event.button || event.type !== "click")) {
            for (; cur != this; cur = cur.parentNode || this) {
              if (cur.nodeType === 1 && (cur.disabled !== true || event.type !== "click")) {
                matches = [];
                for (i = 0; i < delegateCount; i++) {
                  handleObj = handlers[i];
                  sel = handleObj.selector + " ";
                  if (matches[sel] === undefined) {
                    matches[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) >= 0 : jQuery.find(sel, this, null, [cur]).length;
                  }
                  if (matches[sel]) {
                    matches.push(handleObj);
                  }
                }
                if (matches.length) {
                  handlerQueue.push({
                    elem: cur,
                    handlers: matches
                  });
                }
              }
            }
          }
          if (delegateCount < handlers.length) {
            handlerQueue.push({
              elem: this,
              handlers: handlers.slice(delegateCount)
            });
          }
          return handlerQueue;
        },
        fix: function(event) {
          if (event[jQuery.expando]) {
            return event;
          }
          var i,
              prop,
              copy,
              type = event.type,
              originalEvent = event,
              fixHook = this.fixHooks[type];
          if (!fixHook) {
            this.fixHooks[type] = fixHook = rmouseEvent.test(type) ? this.mouseHooks : rkeyEvent.test(type) ? this.keyHooks : {};
          }
          copy = fixHook.props ? this.props.concat(fixHook.props) : this.props;
          event = new jQuery.Event(originalEvent);
          i = copy.length;
          while (i--) {
            prop = copy[i];
            event[prop] = originalEvent[prop];
          }
          if (!event.target) {
            event.target = originalEvent.srcElement || document;
          }
          if (event.target.nodeType === 3) {
            event.target = event.target.parentNode;
          }
          event.metaKey = !!event.metaKey;
          return fixHook.filter ? fixHook.filter(event, originalEvent) : event;
        },
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
        fixHooks: {},
        keyHooks: {
          props: "char charCode key keyCode".split(" "),
          filter: function(event, original) {
            if (event.which == null) {
              event.which = original.charCode != null ? original.charCode : original.keyCode;
            }
            return event;
          }
        },
        mouseHooks: {
          props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
          filter: function(event, original) {
            var body,
                eventDoc,
                doc,
                button = original.button,
                fromElement = original.fromElement;
            if (event.pageX == null && original.clientX != null) {
              eventDoc = event.target.ownerDocument || document;
              doc = eventDoc.documentElement;
              body = eventDoc.body;
              event.pageX = original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
              event.pageY = original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
            }
            if (!event.relatedTarget && fromElement) {
              event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
            }
            if (!event.which && button !== undefined) {
              event.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
            }
            return event;
          }
        },
        special: {
          load: {noBubble: true},
          focus: {
            trigger: function() {
              if (this !== safeActiveElement() && this.focus) {
                try {
                  this.focus();
                  return false;
                } catch (e) {}
              }
            },
            delegateType: "focusin"
          },
          blur: {
            trigger: function() {
              if (this === safeActiveElement() && this.blur) {
                this.blur();
                return false;
              }
            },
            delegateType: "focusout"
          },
          click: {
            trigger: function() {
              if (jQuery.nodeName(this, "input") && this.type === "checkbox" && this.click) {
                this.click();
                return false;
              }
            },
            _default: function(event) {
              return jQuery.nodeName(event.target, "a");
            }
          },
          beforeunload: {postDispatch: function(event) {
              if (event.result !== undefined && event.originalEvent) {
                event.originalEvent.returnValue = event.result;
              }
            }}
        },
        simulate: function(type, elem, event, bubble) {
          var e = jQuery.extend(new jQuery.Event(), event, {
            type: type,
            isSimulated: true,
            originalEvent: {}
          });
          if (bubble) {
            jQuery.event.trigger(e, null, elem);
          } else {
            jQuery.event.dispatch.call(elem, e);
          }
          if (e.isDefaultPrevented()) {
            event.preventDefault();
          }
        }
      };
      jQuery.removeEvent = document.removeEventListener ? function(elem, type, handle) {
        if (elem.removeEventListener) {
          elem.removeEventListener(type, handle, false);
        }
      } : function(elem, type, handle) {
        var name = "on" + type;
        if (elem.detachEvent) {
          if (typeof elem[name] === strundefined) {
            elem[name] = null;
          }
          elem.detachEvent(name, handle);
        }
      };
      jQuery.Event = function(src, props) {
        if (!(this instanceof jQuery.Event)) {
          return new jQuery.Event(src, props);
        }
        if (src && src.type) {
          this.originalEvent = src;
          this.type = src.type;
          this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
        } else {
          this.type = src;
        }
        if (props) {
          jQuery.extend(this, props);
        }
        this.timeStamp = src && src.timeStamp || jQuery.now();
        this[jQuery.expando] = true;
      };
      jQuery.Event.prototype = {
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse,
        preventDefault: function() {
          var e = this.originalEvent;
          this.isDefaultPrevented = returnTrue;
          if (!e) {
            return;
          }
          if (e.preventDefault) {
            e.preventDefault();
          } else {
            e.returnValue = false;
          }
        },
        stopPropagation: function() {
          var e = this.originalEvent;
          this.isPropagationStopped = returnTrue;
          if (!e) {
            return;
          }
          if (e.stopPropagation) {
            e.stopPropagation();
          }
          e.cancelBubble = true;
        },
        stopImmediatePropagation: function() {
          var e = this.originalEvent;
          this.isImmediatePropagationStopped = returnTrue;
          if (e && e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
          }
          this.stopPropagation();
        }
      };
      jQuery.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout",
        pointerenter: "pointerover",
        pointerleave: "pointerout"
      }, function(orig, fix) {
        jQuery.event.special[orig] = {
          delegateType: fix,
          bindType: fix,
          handle: function(event) {
            var ret,
                target = this,
                related = event.relatedTarget,
                handleObj = event.handleObj;
            if (!related || (related !== target && !jQuery.contains(target, related))) {
              event.type = handleObj.origType;
              ret = handleObj.handler.apply(this, arguments);
              event.type = fix;
            }
            return ret;
          }
        };
      });
      if (!support.submitBubbles) {
        jQuery.event.special.submit = {
          setup: function() {
            if (jQuery.nodeName(this, "form")) {
              return false;
            }
            jQuery.event.add(this, "click._submit keypress._submit", function(e) {
              var elem = e.target,
                  form = jQuery.nodeName(elem, "input") || jQuery.nodeName(elem, "button") ? elem.form : undefined;
              if (form && !jQuery._data(form, "submitBubbles")) {
                jQuery.event.add(form, "submit._submit", function(event) {
                  event._submit_bubble = true;
                });
                jQuery._data(form, "submitBubbles", true);
              }
            });
          },
          postDispatch: function(event) {
            if (event._submit_bubble) {
              delete event._submit_bubble;
              if (this.parentNode && !event.isTrigger) {
                jQuery.event.simulate("submit", this.parentNode, event, true);
              }
            }
          },
          teardown: function() {
            if (jQuery.nodeName(this, "form")) {
              return false;
            }
            jQuery.event.remove(this, "._submit");
          }
        };
      }
      if (!support.changeBubbles) {
        jQuery.event.special.change = {
          setup: function() {
            if (rformElems.test(this.nodeName)) {
              if (this.type === "checkbox" || this.type === "radio") {
                jQuery.event.add(this, "propertychange._change", function(event) {
                  if (event.originalEvent.propertyName === "checked") {
                    this._just_changed = true;
                  }
                });
                jQuery.event.add(this, "click._change", function(event) {
                  if (this._just_changed && !event.isTrigger) {
                    this._just_changed = false;
                  }
                  jQuery.event.simulate("change", this, event, true);
                });
              }
              return false;
            }
            jQuery.event.add(this, "beforeactivate._change", function(e) {
              var elem = e.target;
              if (rformElems.test(elem.nodeName) && !jQuery._data(elem, "changeBubbles")) {
                jQuery.event.add(elem, "change._change", function(event) {
                  if (this.parentNode && !event.isSimulated && !event.isTrigger) {
                    jQuery.event.simulate("change", this.parentNode, event, true);
                  }
                });
                jQuery._data(elem, "changeBubbles", true);
              }
            });
          },
          handle: function(event) {
            var elem = event.target;
            if (this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox")) {
              return event.handleObj.handler.apply(this, arguments);
            }
          },
          teardown: function() {
            jQuery.event.remove(this, "._change");
            return !rformElems.test(this.nodeName);
          }
        };
      }
      if (!support.focusinBubbles) {
        jQuery.each({
          focus: "focusin",
          blur: "focusout"
        }, function(orig, fix) {
          var handler = function(event) {
            jQuery.event.simulate(fix, event.target, jQuery.event.fix(event), true);
          };
          jQuery.event.special[fix] = {
            setup: function() {
              var doc = this.ownerDocument || this,
                  attaches = jQuery._data(doc, fix);
              if (!attaches) {
                doc.addEventListener(orig, handler, true);
              }
              jQuery._data(doc, fix, (attaches || 0) + 1);
            },
            teardown: function() {
              var doc = this.ownerDocument || this,
                  attaches = jQuery._data(doc, fix) - 1;
              if (!attaches) {
                doc.removeEventListener(orig, handler, true);
                jQuery._removeData(doc, fix);
              } else {
                jQuery._data(doc, fix, attaches);
              }
            }
          };
        });
      }
      jQuery.fn.extend({
        on: function(types, selector, data, fn, one) {
          var type,
              origFn;
          if (typeof types === "object") {
            if (typeof selector !== "string") {
              data = data || selector;
              selector = undefined;
            }
            for (type in types) {
              this.on(type, selector, data, types[type], one);
            }
            return this;
          }
          if (data == null && fn == null) {
            fn = selector;
            data = selector = undefined;
          } else if (fn == null) {
            if (typeof selector === "string") {
              fn = data;
              data = undefined;
            } else {
              fn = data;
              data = selector;
              selector = undefined;
            }
          }
          if (fn === false) {
            fn = returnFalse;
          } else if (!fn) {
            return this;
          }
          if (one === 1) {
            origFn = fn;
            fn = function(event) {
              jQuery().off(event);
              return origFn.apply(this, arguments);
            };
            fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
          }
          return this.each(function() {
            jQuery.event.add(this, types, fn, data, selector);
          });
        },
        one: function(types, selector, data, fn) {
          return this.on(types, selector, data, fn, 1);
        },
        off: function(types, selector, fn) {
          var handleObj,
              type;
          if (types && types.preventDefault && types.handleObj) {
            handleObj = types.handleObj;
            jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
            return this;
          }
          if (typeof types === "object") {
            for (type in types) {
              this.off(type, selector, types[type]);
            }
            return this;
          }
          if (selector === false || typeof selector === "function") {
            fn = selector;
            selector = undefined;
          }
          if (fn === false) {
            fn = returnFalse;
          }
          return this.each(function() {
            jQuery.event.remove(this, types, fn, selector);
          });
        },
        trigger: function(type, data) {
          return this.each(function() {
            jQuery.event.trigger(type, data, this);
          });
        },
        triggerHandler: function(type, data) {
          var elem = this[0];
          if (elem) {
            return jQuery.event.trigger(type, data, elem, true);
          }
        }
      });
      function createSafeFragment(document) {
        var list = nodeNames.split("|"),
            safeFrag = document.createDocumentFragment();
        if (safeFrag.createElement) {
          while (list.length) {
            safeFrag.createElement(list.pop());
          }
        }
        return safeFrag;
      }
      var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" + "header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
          rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
          rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
          rleadingWhitespace = /^\s+/,
          rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
          rtagName = /<([\w:]+)/,
          rtbody = /<tbody/i,
          rhtml = /<|&#?\w+;/,
          rnoInnerhtml = /<(?:script|style|link)/i,
          rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
          rscriptType = /^$|\/(?:java|ecma)script/i,
          rscriptTypeMasked = /^true\/(.*)/,
          rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
          wrapMap = {
            option: [1, "<select multiple='multiple'>", "</select>"],
            legend: [1, "<fieldset>", "</fieldset>"],
            area: [1, "<map>", "</map>"],
            param: [1, "<object>", "</object>"],
            thead: [1, "<table>", "</table>"],
            tr: [2, "<table><tbody>", "</tbody></table>"],
            col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
            _default: support.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
          },
          safeFragment = createSafeFragment(document),
          fragmentDiv = safeFragment.appendChild(document.createElement("div"));
      wrapMap.optgroup = wrapMap.option;
      wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
      wrapMap.th = wrapMap.td;
      function getAll(context, tag) {
        var elems,
            elem,
            i = 0,
            found = typeof context.getElementsByTagName !== strundefined ? context.getElementsByTagName(tag || "*") : typeof context.querySelectorAll !== strundefined ? context.querySelectorAll(tag || "*") : undefined;
        if (!found) {
          for (found = [], elems = context.childNodes || context; (elem = elems[i]) != null; i++) {
            if (!tag || jQuery.nodeName(elem, tag)) {
              found.push(elem);
            } else {
              jQuery.merge(found, getAll(elem, tag));
            }
          }
        }
        return tag === undefined || tag && jQuery.nodeName(context, tag) ? jQuery.merge([context], found) : found;
      }
      function fixDefaultChecked(elem) {
        if (rcheckableType.test(elem.type)) {
          elem.defaultChecked = elem.checked;
        }
      }
      function manipulationTarget(elem, content) {
        return jQuery.nodeName(elem, "table") && jQuery.nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr") ? elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody")) : elem;
      }
      function disableScript(elem) {
        elem.type = (jQuery.find.attr(elem, "type") !== null) + "/" + elem.type;
        return elem;
      }
      function restoreScript(elem) {
        var match = rscriptTypeMasked.exec(elem.type);
        if (match) {
          elem.type = match[1];
        } else {
          elem.removeAttribute("type");
        }
        return elem;
      }
      function setGlobalEval(elems, refElements) {
        var elem,
            i = 0;
        for (; (elem = elems[i]) != null; i++) {
          jQuery._data(elem, "globalEval", !refElements || jQuery._data(refElements[i], "globalEval"));
        }
      }
      function cloneCopyEvent(src, dest) {
        if (dest.nodeType !== 1 || !jQuery.hasData(src)) {
          return;
        }
        var type,
            i,
            l,
            oldData = jQuery._data(src),
            curData = jQuery._data(dest, oldData),
            events = oldData.events;
        if (events) {
          delete curData.handle;
          curData.events = {};
          for (type in events) {
            for (i = 0, l = events[type].length; i < l; i++) {
              jQuery.event.add(dest, type, events[type][i]);
            }
          }
        }
        if (curData.data) {
          curData.data = jQuery.extend({}, curData.data);
        }
      }
      function fixCloneNodeIssues(src, dest) {
        var nodeName,
            e,
            data;
        if (dest.nodeType !== 1) {
          return;
        }
        nodeName = dest.nodeName.toLowerCase();
        if (!support.noCloneEvent && dest[jQuery.expando]) {
          data = jQuery._data(dest);
          for (e in data.events) {
            jQuery.removeEvent(dest, e, data.handle);
          }
          dest.removeAttribute(jQuery.expando);
        }
        if (nodeName === "script" && dest.text !== src.text) {
          disableScript(dest).text = src.text;
          restoreScript(dest);
        } else if (nodeName === "object") {
          if (dest.parentNode) {
            dest.outerHTML = src.outerHTML;
          }
          if (support.html5Clone && (src.innerHTML && !jQuery.trim(dest.innerHTML))) {
            dest.innerHTML = src.innerHTML;
          }
        } else if (nodeName === "input" && rcheckableType.test(src.type)) {
          dest.defaultChecked = dest.checked = src.checked;
          if (dest.value !== src.value) {
            dest.value = src.value;
          }
        } else if (nodeName === "option") {
          dest.defaultSelected = dest.selected = src.defaultSelected;
        } else if (nodeName === "input" || nodeName === "textarea") {
          dest.defaultValue = src.defaultValue;
        }
      }
      jQuery.extend({
        clone: function(elem, dataAndEvents, deepDataAndEvents) {
          var destElements,
              node,
              clone,
              i,
              srcElements,
              inPage = jQuery.contains(elem.ownerDocument, elem);
          if (support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test("<" + elem.nodeName + ">")) {
            clone = elem.cloneNode(true);
          } else {
            fragmentDiv.innerHTML = elem.outerHTML;
            fragmentDiv.removeChild(clone = fragmentDiv.firstChild);
          }
          if ((!support.noCloneEvent || !support.noCloneChecked) && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
            destElements = getAll(clone);
            srcElements = getAll(elem);
            for (i = 0; (node = srcElements[i]) != null; ++i) {
              if (destElements[i]) {
                fixCloneNodeIssues(node, destElements[i]);
              }
            }
          }
          if (dataAndEvents) {
            if (deepDataAndEvents) {
              srcElements = srcElements || getAll(elem);
              destElements = destElements || getAll(clone);
              for (i = 0; (node = srcElements[i]) != null; i++) {
                cloneCopyEvent(node, destElements[i]);
              }
            } else {
              cloneCopyEvent(elem, clone);
            }
          }
          destElements = getAll(clone, "script");
          if (destElements.length > 0) {
            setGlobalEval(destElements, !inPage && getAll(elem, "script"));
          }
          destElements = srcElements = node = null;
          return clone;
        },
        buildFragment: function(elems, context, scripts, selection) {
          var j,
              elem,
              contains,
              tmp,
              tag,
              tbody,
              wrap,
              l = elems.length,
              safe = createSafeFragment(context),
              nodes = [],
              i = 0;
          for (; i < l; i++) {
            elem = elems[i];
            if (elem || elem === 0) {
              if (jQuery.type(elem) === "object") {
                jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
              } else if (!rhtml.test(elem)) {
                nodes.push(context.createTextNode(elem));
              } else {
                tmp = tmp || safe.appendChild(context.createElement("div"));
                tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
                wrap = wrapMap[tag] || wrapMap._default;
                tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, "<$1></$2>") + wrap[2];
                j = wrap[0];
                while (j--) {
                  tmp = tmp.lastChild;
                }
                if (!support.leadingWhitespace && rleadingWhitespace.test(elem)) {
                  nodes.push(context.createTextNode(rleadingWhitespace.exec(elem)[0]));
                }
                if (!support.tbody) {
                  elem = tag === "table" && !rtbody.test(elem) ? tmp.firstChild : wrap[1] === "<table>" && !rtbody.test(elem) ? tmp : 0;
                  j = elem && elem.childNodes.length;
                  while (j--) {
                    if (jQuery.nodeName((tbody = elem.childNodes[j]), "tbody") && !tbody.childNodes.length) {
                      elem.removeChild(tbody);
                    }
                  }
                }
                jQuery.merge(nodes, tmp.childNodes);
                tmp.textContent = "";
                while (tmp.firstChild) {
                  tmp.removeChild(tmp.firstChild);
                }
                tmp = safe.lastChild;
              }
            }
          }
          if (tmp) {
            safe.removeChild(tmp);
          }
          if (!support.appendChecked) {
            jQuery.grep(getAll(nodes, "input"), fixDefaultChecked);
          }
          i = 0;
          while ((elem = nodes[i++])) {
            if (selection && jQuery.inArray(elem, selection) !== -1) {
              continue;
            }
            contains = jQuery.contains(elem.ownerDocument, elem);
            tmp = getAll(safe.appendChild(elem), "script");
            if (contains) {
              setGlobalEval(tmp);
            }
            if (scripts) {
              j = 0;
              while ((elem = tmp[j++])) {
                if (rscriptType.test(elem.type || "")) {
                  scripts.push(elem);
                }
              }
            }
          }
          tmp = null;
          return safe;
        },
        cleanData: function(elems, acceptData) {
          var elem,
              type,
              id,
              data,
              i = 0,
              internalKey = jQuery.expando,
              cache = jQuery.cache,
              deleteExpando = support.deleteExpando,
              special = jQuery.event.special;
          for (; (elem = elems[i]) != null; i++) {
            if (acceptData || jQuery.acceptData(elem)) {
              id = elem[internalKey];
              data = id && cache[id];
              if (data) {
                if (data.events) {
                  for (type in data.events) {
                    if (special[type]) {
                      jQuery.event.remove(elem, type);
                    } else {
                      jQuery.removeEvent(elem, type, data.handle);
                    }
                  }
                }
                if (cache[id]) {
                  delete cache[id];
                  if (deleteExpando) {
                    delete elem[internalKey];
                  } else if (typeof elem.removeAttribute !== strundefined) {
                    elem.removeAttribute(internalKey);
                  } else {
                    elem[internalKey] = null;
                  }
                  deletedIds.push(id);
                }
              }
            }
          }
        }
      });
      jQuery.fn.extend({
        text: function(value) {
          return access(this, function(value) {
            return value === undefined ? jQuery.text(this) : this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(value));
          }, null, value, arguments.length);
        },
        append: function() {
          return this.domManip(arguments, function(elem) {
            if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
              var target = manipulationTarget(this, elem);
              target.appendChild(elem);
            }
          });
        },
        prepend: function() {
          return this.domManip(arguments, function(elem) {
            if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
              var target = manipulationTarget(this, elem);
              target.insertBefore(elem, target.firstChild);
            }
          });
        },
        before: function() {
          return this.domManip(arguments, function(elem) {
            if (this.parentNode) {
              this.parentNode.insertBefore(elem, this);
            }
          });
        },
        after: function() {
          return this.domManip(arguments, function(elem) {
            if (this.parentNode) {
              this.parentNode.insertBefore(elem, this.nextSibling);
            }
          });
        },
        remove: function(selector, keepData) {
          var elem,
              elems = selector ? jQuery.filter(selector, this) : this,
              i = 0;
          for (; (elem = elems[i]) != null; i++) {
            if (!keepData && elem.nodeType === 1) {
              jQuery.cleanData(getAll(elem));
            }
            if (elem.parentNode) {
              if (keepData && jQuery.contains(elem.ownerDocument, elem)) {
                setGlobalEval(getAll(elem, "script"));
              }
              elem.parentNode.removeChild(elem);
            }
          }
          return this;
        },
        empty: function() {
          var elem,
              i = 0;
          for (; (elem = this[i]) != null; i++) {
            if (elem.nodeType === 1) {
              jQuery.cleanData(getAll(elem, false));
            }
            while (elem.firstChild) {
              elem.removeChild(elem.firstChild);
            }
            if (elem.options && jQuery.nodeName(elem, "select")) {
              elem.options.length = 0;
            }
          }
          return this;
        },
        clone: function(dataAndEvents, deepDataAndEvents) {
          dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
          deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
          return this.map(function() {
            return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
          });
        },
        html: function(value) {
          return access(this, function(value) {
            var elem = this[0] || {},
                i = 0,
                l = this.length;
            if (value === undefined) {
              return elem.nodeType === 1 ? elem.innerHTML.replace(rinlinejQuery, "") : undefined;
            }
            if (typeof value === "string" && !rnoInnerhtml.test(value) && (support.htmlSerialize || !rnoshimcache.test(value)) && (support.leadingWhitespace || !rleadingWhitespace.test(value)) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
              value = value.replace(rxhtmlTag, "<$1></$2>");
              try {
                for (; i < l; i++) {
                  elem = this[i] || {};
                  if (elem.nodeType === 1) {
                    jQuery.cleanData(getAll(elem, false));
                    elem.innerHTML = value;
                  }
                }
                elem = 0;
              } catch (e) {}
            }
            if (elem) {
              this.empty().append(value);
            }
          }, null, value, arguments.length);
        },
        replaceWith: function() {
          var arg = arguments[0];
          this.domManip(arguments, function(elem) {
            arg = this.parentNode;
            jQuery.cleanData(getAll(this));
            if (arg) {
              arg.replaceChild(elem, this);
            }
          });
          return arg && (arg.length || arg.nodeType) ? this : this.remove();
        },
        detach: function(selector) {
          return this.remove(selector, true);
        },
        domManip: function(args, callback) {
          args = concat.apply([], args);
          var first,
              node,
              hasScripts,
              scripts,
              doc,
              fragment,
              i = 0,
              l = this.length,
              set = this,
              iNoClone = l - 1,
              value = args[0],
              isFunction = jQuery.isFunction(value);
          if (isFunction || (l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value))) {
            return this.each(function(index) {
              var self = set.eq(index);
              if (isFunction) {
                args[0] = value.call(this, index, self.html());
              }
              self.domManip(args, callback);
            });
          }
          if (l) {
            fragment = jQuery.buildFragment(args, this[0].ownerDocument, false, this);
            first = fragment.firstChild;
            if (fragment.childNodes.length === 1) {
              fragment = first;
            }
            if (first) {
              scripts = jQuery.map(getAll(fragment, "script"), disableScript);
              hasScripts = scripts.length;
              for (; i < l; i++) {
                node = fragment;
                if (i !== iNoClone) {
                  node = jQuery.clone(node, true, true);
                  if (hasScripts) {
                    jQuery.merge(scripts, getAll(node, "script"));
                  }
                }
                callback.call(this[i], node, i);
              }
              if (hasScripts) {
                doc = scripts[scripts.length - 1].ownerDocument;
                jQuery.map(scripts, restoreScript);
                for (i = 0; i < hasScripts; i++) {
                  node = scripts[i];
                  if (rscriptType.test(node.type || "") && !jQuery._data(node, "globalEval") && jQuery.contains(doc, node)) {
                    if (node.src) {
                      if (jQuery._evalUrl) {
                        jQuery._evalUrl(node.src);
                      }
                    } else {
                      jQuery.globalEval((node.text || node.textContent || node.innerHTML || "").replace(rcleanScript, ""));
                    }
                  }
                }
              }
              fragment = first = null;
            }
          }
          return this;
        }
      });
      jQuery.each({
        appendTo: "append",
        prependTo: "prepend",
        insertBefore: "before",
        insertAfter: "after",
        replaceAll: "replaceWith"
      }, function(name, original) {
        jQuery.fn[name] = function(selector) {
          var elems,
              i = 0,
              ret = [],
              insert = jQuery(selector),
              last = insert.length - 1;
          for (; i <= last; i++) {
            elems = i === last ? this : this.clone(true);
            jQuery(insert[i])[original](elems);
            push.apply(ret, elems.get());
          }
          return this.pushStack(ret);
        };
      });
      var iframe,
          elemdisplay = {};
      function actualDisplay(name, doc) {
        var style,
            elem = jQuery(doc.createElement(name)).appendTo(doc.body),
            display = window.getDefaultComputedStyle && (style = window.getDefaultComputedStyle(elem[0])) ? style.display : jQuery.css(elem[0], "display");
        elem.detach();
        return display;
      }
      function defaultDisplay(nodeName) {
        var doc = document,
            display = elemdisplay[nodeName];
        if (!display) {
          display = actualDisplay(nodeName, doc);
          if (display === "none" || !display) {
            iframe = (iframe || jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement);
            doc = (iframe[0].contentWindow || iframe[0].contentDocument).document;
            doc.write();
            doc.close();
            display = actualDisplay(nodeName, doc);
            iframe.detach();
          }
          elemdisplay[nodeName] = display;
        }
        return display;
      }
      (function() {
        var shrinkWrapBlocksVal;
        support.shrinkWrapBlocks = function() {
          if (shrinkWrapBlocksVal != null) {
            return shrinkWrapBlocksVal;
          }
          shrinkWrapBlocksVal = false;
          var div,
              body,
              container;
          body = document.getElementsByTagName("body")[0];
          if (!body || !body.style) {
            return;
          }
          div = document.createElement("div");
          container = document.createElement("div");
          container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
          body.appendChild(container).appendChild(div);
          if (typeof div.style.zoom !== strundefined) {
            div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;" + "padding:1px;width:1px;zoom:1";
            div.appendChild(document.createElement("div")).style.width = "5px";
            shrinkWrapBlocksVal = div.offsetWidth !== 3;
          }
          body.removeChild(container);
          return shrinkWrapBlocksVal;
        };
      })();
      var rmargin = (/^margin/);
      var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
      var getStyles,
          curCSS,
          rposition = /^(top|right|bottom|left)$/;
      if (window.getComputedStyle) {
        getStyles = function(elem) {
          if (elem.ownerDocument.defaultView.opener) {
            return elem.ownerDocument.defaultView.getComputedStyle(elem, null);
          }
          return window.getComputedStyle(elem, null);
        };
        curCSS = function(elem, name, computed) {
          var width,
              minWidth,
              maxWidth,
              ret,
              style = elem.style;
          computed = computed || getStyles(elem);
          ret = computed ? computed.getPropertyValue(name) || computed[name] : undefined;
          if (computed) {
            if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
              ret = jQuery.style(elem, name);
            }
            if (rnumnonpx.test(ret) && rmargin.test(name)) {
              width = style.width;
              minWidth = style.minWidth;
              maxWidth = style.maxWidth;
              style.minWidth = style.maxWidth = style.width = ret;
              ret = computed.width;
              style.width = width;
              style.minWidth = minWidth;
              style.maxWidth = maxWidth;
            }
          }
          return ret === undefined ? ret : ret + "";
        };
      } else if (document.documentElement.currentStyle) {
        getStyles = function(elem) {
          return elem.currentStyle;
        };
        curCSS = function(elem, name, computed) {
          var left,
              rs,
              rsLeft,
              ret,
              style = elem.style;
          computed = computed || getStyles(elem);
          ret = computed ? computed[name] : undefined;
          if (ret == null && style && style[name]) {
            ret = style[name];
          }
          if (rnumnonpx.test(ret) && !rposition.test(name)) {
            left = style.left;
            rs = elem.runtimeStyle;
            rsLeft = rs && rs.left;
            if (rsLeft) {
              rs.left = elem.currentStyle.left;
            }
            style.left = name === "fontSize" ? "1em" : ret;
            ret = style.pixelLeft + "px";
            style.left = left;
            if (rsLeft) {
              rs.left = rsLeft;
            }
          }
          return ret === undefined ? ret : ret + "" || "auto";
        };
      }
      function addGetHookIf(conditionFn, hookFn) {
        return {get: function() {
            var condition = conditionFn();
            if (condition == null) {
              return;
            }
            if (condition) {
              delete this.get;
              return;
            }
            return (this.get = hookFn).apply(this, arguments);
          }};
      }
      (function() {
        var div,
            style,
            a,
            pixelPositionVal,
            boxSizingReliableVal,
            reliableHiddenOffsetsVal,
            reliableMarginRightVal;
        div = document.createElement("div");
        div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
        a = div.getElementsByTagName("a")[0];
        style = a && a.style;
        if (!style) {
          return;
        }
        style.cssText = "float:left;opacity:.5";
        support.opacity = style.opacity === "0.5";
        support.cssFloat = !!style.cssFloat;
        div.style.backgroundClip = "content-box";
        div.cloneNode(true).style.backgroundClip = "";
        support.clearCloneStyle = div.style.backgroundClip === "content-box";
        support.boxSizing = style.boxSizing === "" || style.MozBoxSizing === "" || style.WebkitBoxSizing === "";
        jQuery.extend(support, {
          reliableHiddenOffsets: function() {
            if (reliableHiddenOffsetsVal == null) {
              computeStyleTests();
            }
            return reliableHiddenOffsetsVal;
          },
          boxSizingReliable: function() {
            if (boxSizingReliableVal == null) {
              computeStyleTests();
            }
            return boxSizingReliableVal;
          },
          pixelPosition: function() {
            if (pixelPositionVal == null) {
              computeStyleTests();
            }
            return pixelPositionVal;
          },
          reliableMarginRight: function() {
            if (reliableMarginRightVal == null) {
              computeStyleTests();
            }
            return reliableMarginRightVal;
          }
        });
        function computeStyleTests() {
          var div,
              body,
              container,
              contents;
          body = document.getElementsByTagName("body")[0];
          if (!body || !body.style) {
            return;
          }
          div = document.createElement("div");
          container = document.createElement("div");
          container.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px";
          body.appendChild(container).appendChild(div);
          div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" + "box-sizing:border-box;display:block;margin-top:1%;top:1%;" + "border:1px;padding:1px;width:4px;position:absolute";
          pixelPositionVal = boxSizingReliableVal = false;
          reliableMarginRightVal = true;
          if (window.getComputedStyle) {
            pixelPositionVal = (window.getComputedStyle(div, null) || {}).top !== "1%";
            boxSizingReliableVal = (window.getComputedStyle(div, null) || {width: "4px"}).width === "4px";
            contents = div.appendChild(document.createElement("div"));
            contents.style.cssText = div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;padding:0";
            contents.style.marginRight = contents.style.width = "0";
            div.style.width = "1px";
            reliableMarginRightVal = !parseFloat((window.getComputedStyle(contents, null) || {}).marginRight);
            div.removeChild(contents);
          }
          div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
          contents = div.getElementsByTagName("td");
          contents[0].style.cssText = "margin:0;border:0;padding:0;display:none";
          reliableHiddenOffsetsVal = contents[0].offsetHeight === 0;
          if (reliableHiddenOffsetsVal) {
            contents[0].style.display = "";
            contents[1].style.display = "none";
            reliableHiddenOffsetsVal = contents[0].offsetHeight === 0;
          }
          body.removeChild(container);
        }
      })();
      jQuery.swap = function(elem, options, callback, args) {
        var ret,
            name,
            old = {};
        for (name in options) {
          old[name] = elem.style[name];
          elem.style[name] = options[name];
        }
        ret = callback.apply(elem, args || []);
        for (name in options) {
          elem.style[name] = old[name];
        }
        return ret;
      };
      var ralpha = /alpha\([^)]*\)/i,
          ropacity = /opacity\s*=\s*([^)]*)/,
          rdisplayswap = /^(none|table(?!-c[ea]).+)/,
          rnumsplit = new RegExp("^(" + pnum + ")(.*)$", "i"),
          rrelNum = new RegExp("^([+-])=(" + pnum + ")", "i"),
          cssShow = {
            position: "absolute",
            visibility: "hidden",
            display: "block"
          },
          cssNormalTransform = {
            letterSpacing: "0",
            fontWeight: "400"
          },
          cssPrefixes = ["Webkit", "O", "Moz", "ms"];
      function vendorPropName(style, name) {
        if (name in style) {
          return name;
        }
        var capName = name.charAt(0).toUpperCase() + name.slice(1),
            origName = name,
            i = cssPrefixes.length;
        while (i--) {
          name = cssPrefixes[i] + capName;
          if (name in style) {
            return name;
          }
        }
        return origName;
      }
      function showHide(elements, show) {
        var display,
            elem,
            hidden,
            values = [],
            index = 0,
            length = elements.length;
        for (; index < length; index++) {
          elem = elements[index];
          if (!elem.style) {
            continue;
          }
          values[index] = jQuery._data(elem, "olddisplay");
          display = elem.style.display;
          if (show) {
            if (!values[index] && display === "none") {
              elem.style.display = "";
            }
            if (elem.style.display === "" && isHidden(elem)) {
              values[index] = jQuery._data(elem, "olddisplay", defaultDisplay(elem.nodeName));
            }
          } else {
            hidden = isHidden(elem);
            if (display && display !== "none" || !hidden) {
              jQuery._data(elem, "olddisplay", hidden ? display : jQuery.css(elem, "display"));
            }
          }
        }
        for (index = 0; index < length; index++) {
          elem = elements[index];
          if (!elem.style) {
            continue;
          }
          if (!show || elem.style.display === "none" || elem.style.display === "") {
            elem.style.display = show ? values[index] || "" : "none";
          }
        }
        return elements;
      }
      function setPositiveNumber(elem, value, subtract) {
        var matches = rnumsplit.exec(value);
        return matches ? Math.max(0, matches[1] - (subtract || 0)) + (matches[2] || "px") : value;
      }
      function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
        var i = extra === (isBorderBox ? "border" : "content") ? 4 : name === "width" ? 1 : 0,
            val = 0;
        for (; i < 4; i += 2) {
          if (extra === "margin") {
            val += jQuery.css(elem, extra + cssExpand[i], true, styles);
          }
          if (isBorderBox) {
            if (extra === "content") {
              val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
            }
            if (extra !== "margin") {
              val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
            }
          } else {
            val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);
            if (extra !== "padding") {
              val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
            }
          }
        }
        return val;
      }
      function getWidthOrHeight(elem, name, extra) {
        var valueIsBorderBox = true,
            val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
            styles = getStyles(elem),
            isBorderBox = support.boxSizing && jQuery.css(elem, "boxSizing", false, styles) === "border-box";
        if (val <= 0 || val == null) {
          val = curCSS(elem, name, styles);
          if (val < 0 || val == null) {
            val = elem.style[name];
          }
          if (rnumnonpx.test(val)) {
            return val;
          }
          valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);
          val = parseFloat(val) || 0;
        }
        return (val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles)) + "px";
      }
      jQuery.extend({
        cssHooks: {opacity: {get: function(elem, computed) {
              if (computed) {
                var ret = curCSS(elem, "opacity");
                return ret === "" ? "1" : ret;
              }
            }}},
        cssNumber: {
          "columnCount": true,
          "fillOpacity": true,
          "flexGrow": true,
          "flexShrink": true,
          "fontWeight": true,
          "lineHeight": true,
          "opacity": true,
          "order": true,
          "orphans": true,
          "widows": true,
          "zIndex": true,
          "zoom": true
        },
        cssProps: {"float": support.cssFloat ? "cssFloat" : "styleFloat"},
        style: function(elem, name, value, extra) {
          if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
            return;
          }
          var ret,
              type,
              hooks,
              origName = jQuery.camelCase(name),
              style = elem.style;
          name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(style, origName));
          hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
          if (value !== undefined) {
            type = typeof value;
            if (type === "string" && (ret = rrelNum.exec(value))) {
              value = (ret[1] + 1) * ret[2] + parseFloat(jQuery.css(elem, name));
              type = "number";
            }
            if (value == null || value !== value) {
              return;
            }
            if (type === "number" && !jQuery.cssNumber[origName]) {
              value += "px";
            }
            if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
              style[name] = "inherit";
            }
            if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
              try {
                style[name] = value;
              } catch (e) {}
            }
          } else {
            if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
              return ret;
            }
            return style[name];
          }
        },
        css: function(elem, name, extra, styles) {
          var num,
              val,
              hooks,
              origName = jQuery.camelCase(name);
          name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(elem.style, origName));
          hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
          if (hooks && "get" in hooks) {
            val = hooks.get(elem, true, extra);
          }
          if (val === undefined) {
            val = curCSS(elem, name, styles);
          }
          if (val === "normal" && name in cssNormalTransform) {
            val = cssNormalTransform[name];
          }
          if (extra === "" || extra) {
            num = parseFloat(val);
            return extra === true || jQuery.isNumeric(num) ? num || 0 : val;
          }
          return val;
        }
      });
      jQuery.each(["height", "width"], function(i, name) {
        jQuery.cssHooks[name] = {
          get: function(elem, computed, extra) {
            if (computed) {
              return rdisplayswap.test(jQuery.css(elem, "display")) && elem.offsetWidth === 0 ? jQuery.swap(elem, cssShow, function() {
                return getWidthOrHeight(elem, name, extra);
              }) : getWidthOrHeight(elem, name, extra);
            }
          },
          set: function(elem, value, extra) {
            var styles = extra && getStyles(elem);
            return setPositiveNumber(elem, value, extra ? augmentWidthOrHeight(elem, name, extra, support.boxSizing && jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles) : 0);
          }
        };
      });
      if (!support.opacity) {
        jQuery.cssHooks.opacity = {
          get: function(elem, computed) {
            return ropacity.test((computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "") ? (0.01 * parseFloat(RegExp.$1)) + "" : computed ? "1" : "";
          },
          set: function(elem, value) {
            var style = elem.style,
                currentStyle = elem.currentStyle,
                opacity = jQuery.isNumeric(value) ? "alpha(opacity=" + value * 100 + ")" : "",
                filter = currentStyle && currentStyle.filter || style.filter || "";
            style.zoom = 1;
            if ((value >= 1 || value === "") && jQuery.trim(filter.replace(ralpha, "")) === "" && style.removeAttribute) {
              style.removeAttribute("filter");
              if (value === "" || currentStyle && !currentStyle.filter) {
                return;
              }
            }
            style.filter = ralpha.test(filter) ? filter.replace(ralpha, opacity) : filter + " " + opacity;
          }
        };
      }
      jQuery.cssHooks.marginRight = addGetHookIf(support.reliableMarginRight, function(elem, computed) {
        if (computed) {
          return jQuery.swap(elem, {"display": "inline-block"}, curCSS, [elem, "marginRight"]);
        }
      });
      jQuery.each({
        margin: "",
        padding: "",
        border: "Width"
      }, function(prefix, suffix) {
        jQuery.cssHooks[prefix + suffix] = {expand: function(value) {
            var i = 0,
                expanded = {},
                parts = typeof value === "string" ? value.split(" ") : [value];
            for (; i < 4; i++) {
              expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
            }
            return expanded;
          }};
        if (!rmargin.test(prefix)) {
          jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
        }
      });
      jQuery.fn.extend({
        css: function(name, value) {
          return access(this, function(elem, name, value) {
            var styles,
                len,
                map = {},
                i = 0;
            if (jQuery.isArray(name)) {
              styles = getStyles(elem);
              len = name.length;
              for (; i < len; i++) {
                map[name[i]] = jQuery.css(elem, name[i], false, styles);
              }
              return map;
            }
            return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
          }, name, value, arguments.length > 1);
        },
        show: function() {
          return showHide(this, true);
        },
        hide: function() {
          return showHide(this);
        },
        toggle: function(state) {
          if (typeof state === "boolean") {
            return state ? this.show() : this.hide();
          }
          return this.each(function() {
            if (isHidden(this)) {
              jQuery(this).show();
            } else {
              jQuery(this).hide();
            }
          });
        }
      });
      function Tween(elem, options, prop, end, easing) {
        return new Tween.prototype.init(elem, options, prop, end, easing);
      }
      jQuery.Tween = Tween;
      Tween.prototype = {
        constructor: Tween,
        init: function(elem, options, prop, end, easing, unit) {
          this.elem = elem;
          this.prop = prop;
          this.easing = easing || "swing";
          this.options = options;
          this.start = this.now = this.cur();
          this.end = end;
          this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
        },
        cur: function() {
          var hooks = Tween.propHooks[this.prop];
          return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
        },
        run: function(percent) {
          var eased,
              hooks = Tween.propHooks[this.prop];
          if (this.options.duration) {
            this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
          } else {
            this.pos = eased = percent;
          }
          this.now = (this.end - this.start) * eased + this.start;
          if (this.options.step) {
            this.options.step.call(this.elem, this.now, this);
          }
          if (hooks && hooks.set) {
            hooks.set(this);
          } else {
            Tween.propHooks._default.set(this);
          }
          return this;
        }
      };
      Tween.prototype.init.prototype = Tween.prototype;
      Tween.propHooks = {_default: {
          get: function(tween) {
            var result;
            if (tween.elem[tween.prop] != null && (!tween.elem.style || tween.elem.style[tween.prop] == null)) {
              return tween.elem[tween.prop];
            }
            result = jQuery.css(tween.elem, tween.prop, "");
            return !result || result === "auto" ? 0 : result;
          },
          set: function(tween) {
            if (jQuery.fx.step[tween.prop]) {
              jQuery.fx.step[tween.prop](tween);
            } else if (tween.elem.style && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
              jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
            } else {
              tween.elem[tween.prop] = tween.now;
            }
          }
        }};
      Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {set: function(tween) {
          if (tween.elem.nodeType && tween.elem.parentNode) {
            tween.elem[tween.prop] = tween.now;
          }
        }};
      jQuery.easing = {
        linear: function(p) {
          return p;
        },
        swing: function(p) {
          return 0.5 - Math.cos(p * Math.PI) / 2;
        }
      };
      jQuery.fx = Tween.prototype.init;
      jQuery.fx.step = {};
      var fxNow,
          timerId,
          rfxtypes = /^(?:toggle|show|hide)$/,
          rfxnum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i"),
          rrun = /queueHooks$/,
          animationPrefilters = [defaultPrefilter],
          tweeners = {"*": [function(prop, value) {
              var tween = this.createTween(prop, value),
                  target = tween.cur(),
                  parts = rfxnum.exec(value),
                  unit = parts && parts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
                  start = (jQuery.cssNumber[prop] || unit !== "px" && +target) && rfxnum.exec(jQuery.css(tween.elem, prop)),
                  scale = 1,
                  maxIterations = 20;
              if (start && start[3] !== unit) {
                unit = unit || start[3];
                parts = parts || [];
                start = +target || 1;
                do {
                  scale = scale || ".5";
                  start = start / scale;
                  jQuery.style(tween.elem, prop, start + unit);
                } while (scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations);
              }
              if (parts) {
                start = tween.start = +start || +target || 0;
                tween.unit = unit;
                tween.end = parts[1] ? start + (parts[1] + 1) * parts[2] : +parts[2];
              }
              return tween;
            }]};
      function createFxNow() {
        setTimeout(function() {
          fxNow = undefined;
        });
        return (fxNow = jQuery.now());
      }
      function genFx(type, includeWidth) {
        var which,
            attrs = {height: type},
            i = 0;
        includeWidth = includeWidth ? 1 : 0;
        for (; i < 4; i += 2 - includeWidth) {
          which = cssExpand[i];
          attrs["margin" + which] = attrs["padding" + which] = type;
        }
        if (includeWidth) {
          attrs.opacity = attrs.width = type;
        }
        return attrs;
      }
      function createTween(value, prop, animation) {
        var tween,
            collection = (tweeners[prop] || []).concat(tweeners["*"]),
            index = 0,
            length = collection.length;
        for (; index < length; index++) {
          if ((tween = collection[index].call(animation, prop, value))) {
            return tween;
          }
        }
      }
      function defaultPrefilter(elem, props, opts) {
        var prop,
            value,
            toggle,
            tween,
            hooks,
            oldfire,
            display,
            checkDisplay,
            anim = this,
            orig = {},
            style = elem.style,
            hidden = elem.nodeType && isHidden(elem),
            dataShow = jQuery._data(elem, "fxshow");
        if (!opts.queue) {
          hooks = jQuery._queueHooks(elem, "fx");
          if (hooks.unqueued == null) {
            hooks.unqueued = 0;
            oldfire = hooks.empty.fire;
            hooks.empty.fire = function() {
              if (!hooks.unqueued) {
                oldfire();
              }
            };
          }
          hooks.unqueued++;
          anim.always(function() {
            anim.always(function() {
              hooks.unqueued--;
              if (!jQuery.queue(elem, "fx").length) {
                hooks.empty.fire();
              }
            });
          });
        }
        if (elem.nodeType === 1 && ("height" in props || "width" in props)) {
          opts.overflow = [style.overflow, style.overflowX, style.overflowY];
          display = jQuery.css(elem, "display");
          checkDisplay = display === "none" ? jQuery._data(elem, "olddisplay") || defaultDisplay(elem.nodeName) : display;
          if (checkDisplay === "inline" && jQuery.css(elem, "float") === "none") {
            if (!support.inlineBlockNeedsLayout || defaultDisplay(elem.nodeName) === "inline") {
              style.display = "inline-block";
            } else {
              style.zoom = 1;
            }
          }
        }
        if (opts.overflow) {
          style.overflow = "hidden";
          if (!support.shrinkWrapBlocks()) {
            anim.always(function() {
              style.overflow = opts.overflow[0];
              style.overflowX = opts.overflow[1];
              style.overflowY = opts.overflow[2];
            });
          }
        }
        for (prop in props) {
          value = props[prop];
          if (rfxtypes.exec(value)) {
            delete props[prop];
            toggle = toggle || value === "toggle";
            if (value === (hidden ? "hide" : "show")) {
              if (value === "show" && dataShow && dataShow[prop] !== undefined) {
                hidden = true;
              } else {
                continue;
              }
            }
            orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
          } else {
            display = undefined;
          }
        }
        if (!jQuery.isEmptyObject(orig)) {
          if (dataShow) {
            if ("hidden" in dataShow) {
              hidden = dataShow.hidden;
            }
          } else {
            dataShow = jQuery._data(elem, "fxshow", {});
          }
          if (toggle) {
            dataShow.hidden = !hidden;
          }
          if (hidden) {
            jQuery(elem).show();
          } else {
            anim.done(function() {
              jQuery(elem).hide();
            });
          }
          anim.done(function() {
            var prop;
            jQuery._removeData(elem, "fxshow");
            for (prop in orig) {
              jQuery.style(elem, prop, orig[prop]);
            }
          });
          for (prop in orig) {
            tween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
            if (!(prop in dataShow)) {
              dataShow[prop] = tween.start;
              if (hidden) {
                tween.end = tween.start;
                tween.start = prop === "width" || prop === "height" ? 1 : 0;
              }
            }
          }
        } else if ((display === "none" ? defaultDisplay(elem.nodeName) : display) === "inline") {
          style.display = display;
        }
      }
      function propFilter(props, specialEasing) {
        var index,
            name,
            easing,
            value,
            hooks;
        for (index in props) {
          name = jQuery.camelCase(index);
          easing = specialEasing[name];
          value = props[index];
          if (jQuery.isArray(value)) {
            easing = value[1];
            value = props[index] = value[0];
          }
          if (index !== name) {
            props[name] = value;
            delete props[index];
          }
          hooks = jQuery.cssHooks[name];
          if (hooks && "expand" in hooks) {
            value = hooks.expand(value);
            delete props[name];
            for (index in value) {
              if (!(index in props)) {
                props[index] = value[index];
                specialEasing[index] = easing;
              }
            }
          } else {
            specialEasing[name] = easing;
          }
        }
      }
      function Animation(elem, properties, options) {
        var result,
            stopped,
            index = 0,
            length = animationPrefilters.length,
            deferred = jQuery.Deferred().always(function() {
              delete tick.elem;
            }),
            tick = function() {
              if (stopped) {
                return false;
              }
              var currentTime = fxNow || createFxNow(),
                  remaining = Math.max(0, animation.startTime + animation.duration - currentTime),
                  temp = remaining / animation.duration || 0,
                  percent = 1 - temp,
                  index = 0,
                  length = animation.tweens.length;
              for (; index < length; index++) {
                animation.tweens[index].run(percent);
              }
              deferred.notifyWith(elem, [animation, percent, remaining]);
              if (percent < 1 && length) {
                return remaining;
              } else {
                deferred.resolveWith(elem, [animation]);
                return false;
              }
            },
            animation = deferred.promise({
              elem: elem,
              props: jQuery.extend({}, properties),
              opts: jQuery.extend(true, {specialEasing: {}}, options),
              originalProperties: properties,
              originalOptions: options,
              startTime: fxNow || createFxNow(),
              duration: options.duration,
              tweens: [],
              createTween: function(prop, end) {
                var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
                animation.tweens.push(tween);
                return tween;
              },
              stop: function(gotoEnd) {
                var index = 0,
                    length = gotoEnd ? animation.tweens.length : 0;
                if (stopped) {
                  return this;
                }
                stopped = true;
                for (; index < length; index++) {
                  animation.tweens[index].run(1);
                }
                if (gotoEnd) {
                  deferred.resolveWith(elem, [animation, gotoEnd]);
                } else {
                  deferred.rejectWith(elem, [animation, gotoEnd]);
                }
                return this;
              }
            }),
            props = animation.props;
        propFilter(props, animation.opts.specialEasing);
        for (; index < length; index++) {
          result = animationPrefilters[index].call(animation, elem, props, animation.opts);
          if (result) {
            return result;
          }
        }
        jQuery.map(props, createTween, animation);
        if (jQuery.isFunction(animation.opts.start)) {
          animation.opts.start.call(elem, animation);
        }
        jQuery.fx.timer(jQuery.extend(tick, {
          elem: elem,
          anim: animation,
          queue: animation.opts.queue
        }));
        return animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
      }
      jQuery.Animation = jQuery.extend(Animation, {
        tweener: function(props, callback) {
          if (jQuery.isFunction(props)) {
            callback = props;
            props = ["*"];
          } else {
            props = props.split(" ");
          }
          var prop,
              index = 0,
              length = props.length;
          for (; index < length; index++) {
            prop = props[index];
            tweeners[prop] = tweeners[prop] || [];
            tweeners[prop].unshift(callback);
          }
        },
        prefilter: function(callback, prepend) {
          if (prepend) {
            animationPrefilters.unshift(callback);
          } else {
            animationPrefilters.push(callback);
          }
        }
      });
      jQuery.speed = function(speed, easing, fn) {
        var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
          complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
          duration: speed,
          easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
        };
        opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration : opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default;
        if (opt.queue == null || opt.queue === true) {
          opt.queue = "fx";
        }
        opt.old = opt.complete;
        opt.complete = function() {
          if (jQuery.isFunction(opt.old)) {
            opt.old.call(this);
          }
          if (opt.queue) {
            jQuery.dequeue(this, opt.queue);
          }
        };
        return opt;
      };
      jQuery.fn.extend({
        fadeTo: function(speed, to, easing, callback) {
          return this.filter(isHidden).css("opacity", 0).show().end().animate({opacity: to}, speed, easing, callback);
        },
        animate: function(prop, speed, easing, callback) {
          var empty = jQuery.isEmptyObject(prop),
              optall = jQuery.speed(speed, easing, callback),
              doAnimation = function() {
                var anim = Animation(this, jQuery.extend({}, prop), optall);
                if (empty || jQuery._data(this, "finish")) {
                  anim.stop(true);
                }
              };
          doAnimation.finish = doAnimation;
          return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
        },
        stop: function(type, clearQueue, gotoEnd) {
          var stopQueue = function(hooks) {
            var stop = hooks.stop;
            delete hooks.stop;
            stop(gotoEnd);
          };
          if (typeof type !== "string") {
            gotoEnd = clearQueue;
            clearQueue = type;
            type = undefined;
          }
          if (clearQueue && type !== false) {
            this.queue(type || "fx", []);
          }
          return this.each(function() {
            var dequeue = true,
                index = type != null && type + "queueHooks",
                timers = jQuery.timers,
                data = jQuery._data(this);
            if (index) {
              if (data[index] && data[index].stop) {
                stopQueue(data[index]);
              }
            } else {
              for (index in data) {
                if (data[index] && data[index].stop && rrun.test(index)) {
                  stopQueue(data[index]);
                }
              }
            }
            for (index = timers.length; index--; ) {
              if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
                timers[index].anim.stop(gotoEnd);
                dequeue = false;
                timers.splice(index, 1);
              }
            }
            if (dequeue || !gotoEnd) {
              jQuery.dequeue(this, type);
            }
          });
        },
        finish: function(type) {
          if (type !== false) {
            type = type || "fx";
          }
          return this.each(function() {
            var index,
                data = jQuery._data(this),
                queue = data[type + "queue"],
                hooks = data[type + "queueHooks"],
                timers = jQuery.timers,
                length = queue ? queue.length : 0;
            data.finish = true;
            jQuery.queue(this, type, []);
            if (hooks && hooks.stop) {
              hooks.stop.call(this, true);
            }
            for (index = timers.length; index--; ) {
              if (timers[index].elem === this && timers[index].queue === type) {
                timers[index].anim.stop(true);
                timers.splice(index, 1);
              }
            }
            for (index = 0; index < length; index++) {
              if (queue[index] && queue[index].finish) {
                queue[index].finish.call(this);
              }
            }
            delete data.finish;
          });
        }
      });
      jQuery.each(["toggle", "show", "hide"], function(i, name) {
        var cssFn = jQuery.fn[name];
        jQuery.fn[name] = function(speed, easing, callback) {
          return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
        };
      });
      jQuery.each({
        slideDown: genFx("show"),
        slideUp: genFx("hide"),
        slideToggle: genFx("toggle"),
        fadeIn: {opacity: "show"},
        fadeOut: {opacity: "hide"},
        fadeToggle: {opacity: "toggle"}
      }, function(name, props) {
        jQuery.fn[name] = function(speed, easing, callback) {
          return this.animate(props, speed, easing, callback);
        };
      });
      jQuery.timers = [];
      jQuery.fx.tick = function() {
        var timer,
            timers = jQuery.timers,
            i = 0;
        fxNow = jQuery.now();
        for (; i < timers.length; i++) {
          timer = timers[i];
          if (!timer() && timers[i] === timer) {
            timers.splice(i--, 1);
          }
        }
        if (!timers.length) {
          jQuery.fx.stop();
        }
        fxNow = undefined;
      };
      jQuery.fx.timer = function(timer) {
        jQuery.timers.push(timer);
        if (timer()) {
          jQuery.fx.start();
        } else {
          jQuery.timers.pop();
        }
      };
      jQuery.fx.interval = 13;
      jQuery.fx.start = function() {
        if (!timerId) {
          timerId = setInterval(jQuery.fx.tick, jQuery.fx.interval);
        }
      };
      jQuery.fx.stop = function() {
        clearInterval(timerId);
        timerId = null;
      };
      jQuery.fx.speeds = {
        slow: 600,
        fast: 200,
        _default: 400
      };
      jQuery.fn.delay = function(time, type) {
        time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
        type = type || "fx";
        return this.queue(type, function(next, hooks) {
          var timeout = setTimeout(next, time);
          hooks.stop = function() {
            clearTimeout(timeout);
          };
        });
      };
      (function() {
        var input,
            div,
            select,
            a,
            opt;
        div = document.createElement("div");
        div.setAttribute("className", "t");
        div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";
        a = div.getElementsByTagName("a")[0];
        select = document.createElement("select");
        opt = select.appendChild(document.createElement("option"));
        input = div.getElementsByTagName("input")[0];
        a.style.cssText = "top:1px";
        support.getSetAttribute = div.className !== "t";
        support.style = /top/.test(a.getAttribute("style"));
        support.hrefNormalized = a.getAttribute("href") === "/a";
        support.checkOn = !!input.value;
        support.optSelected = opt.selected;
        support.enctype = !!document.createElement("form").enctype;
        select.disabled = true;
        support.optDisabled = !opt.disabled;
        input = document.createElement("input");
        input.setAttribute("value", "");
        support.input = input.getAttribute("value") === "";
        input.value = "t";
        input.setAttribute("type", "radio");
        support.radioValue = input.value === "t";
      })();
      var rreturn = /\r/g;
      jQuery.fn.extend({val: function(value) {
          var hooks,
              ret,
              isFunction,
              elem = this[0];
          if (!arguments.length) {
            if (elem) {
              hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
              if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
                return ret;
              }
              ret = elem.value;
              return typeof ret === "string" ? ret.replace(rreturn, "") : ret == null ? "" : ret;
            }
            return;
          }
          isFunction = jQuery.isFunction(value);
          return this.each(function(i) {
            var val;
            if (this.nodeType !== 1) {
              return;
            }
            if (isFunction) {
              val = value.call(this, i, jQuery(this).val());
            } else {
              val = value;
            }
            if (val == null) {
              val = "";
            } else if (typeof val === "number") {
              val += "";
            } else if (jQuery.isArray(val)) {
              val = jQuery.map(val, function(value) {
                return value == null ? "" : value + "";
              });
            }
            hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
            if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
              this.value = val;
            }
          });
        }});
      jQuery.extend({valHooks: {
          option: {get: function(elem) {
              var val = jQuery.find.attr(elem, "value");
              return val != null ? val : jQuery.trim(jQuery.text(elem));
            }},
          select: {
            get: function(elem) {
              var value,
                  option,
                  options = elem.options,
                  index = elem.selectedIndex,
                  one = elem.type === "select-one" || index < 0,
                  values = one ? null : [],
                  max = one ? index + 1 : options.length,
                  i = index < 0 ? max : one ? index : 0;
              for (; i < max; i++) {
                option = options[i];
                if ((option.selected || i === index) && (support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) && (!option.parentNode.disabled || !jQuery.nodeName(option.parentNode, "optgroup"))) {
                  value = jQuery(option).val();
                  if (one) {
                    return value;
                  }
                  values.push(value);
                }
              }
              return values;
            },
            set: function(elem, value) {
              var optionSet,
                  option,
                  options = elem.options,
                  values = jQuery.makeArray(value),
                  i = options.length;
              while (i--) {
                option = options[i];
                if (jQuery.inArray(jQuery.valHooks.option.get(option), values) >= 0) {
                  try {
                    option.selected = optionSet = true;
                  } catch (_) {
                    option.scrollHeight;
                  }
                } else {
                  option.selected = false;
                }
              }
              if (!optionSet) {
                elem.selectedIndex = -1;
              }
              return options;
            }
          }
        }});
      jQuery.each(["radio", "checkbox"], function() {
        jQuery.valHooks[this] = {set: function(elem, value) {
            if (jQuery.isArray(value)) {
              return (elem.checked = jQuery.inArray(jQuery(elem).val(), value) >= 0);
            }
          }};
        if (!support.checkOn) {
          jQuery.valHooks[this].get = function(elem) {
            return elem.getAttribute("value") === null ? "on" : elem.value;
          };
        }
      });
      var nodeHook,
          boolHook,
          attrHandle = jQuery.expr.attrHandle,
          ruseDefault = /^(?:checked|selected)$/i,
          getSetAttribute = support.getSetAttribute,
          getSetInput = support.input;
      jQuery.fn.extend({
        attr: function(name, value) {
          return access(this, jQuery.attr, name, value, arguments.length > 1);
        },
        removeAttr: function(name) {
          return this.each(function() {
            jQuery.removeAttr(this, name);
          });
        }
      });
      jQuery.extend({
        attr: function(elem, name, value) {
          var hooks,
              ret,
              nType = elem.nodeType;
          if (!elem || nType === 3 || nType === 8 || nType === 2) {
            return;
          }
          if (typeof elem.getAttribute === strundefined) {
            return jQuery.prop(elem, name, value);
          }
          if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
            name = name.toLowerCase();
            hooks = jQuery.attrHooks[name] || (jQuery.expr.match.bool.test(name) ? boolHook : nodeHook);
          }
          if (value !== undefined) {
            if (value === null) {
              jQuery.removeAttr(elem, name);
            } else if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
              return ret;
            } else {
              elem.setAttribute(name, value + "");
              return value;
            }
          } else if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
            return ret;
          } else {
            ret = jQuery.find.attr(elem, name);
            return ret == null ? undefined : ret;
          }
        },
        removeAttr: function(elem, value) {
          var name,
              propName,
              i = 0,
              attrNames = value && value.match(rnotwhite);
          if (attrNames && elem.nodeType === 1) {
            while ((name = attrNames[i++])) {
              propName = jQuery.propFix[name] || name;
              if (jQuery.expr.match.bool.test(name)) {
                if (getSetInput && getSetAttribute || !ruseDefault.test(name)) {
                  elem[propName] = false;
                } else {
                  elem[jQuery.camelCase("default-" + name)] = elem[propName] = false;
                }
              } else {
                jQuery.attr(elem, name, "");
              }
              elem.removeAttribute(getSetAttribute ? name : propName);
            }
          }
        },
        attrHooks: {type: {set: function(elem, value) {
              if (!support.radioValue && value === "radio" && jQuery.nodeName(elem, "input")) {
                var val = elem.value;
                elem.setAttribute("type", value);
                if (val) {
                  elem.value = val;
                }
                return value;
              }
            }}}
      });
      boolHook = {set: function(elem, value, name) {
          if (value === false) {
            jQuery.removeAttr(elem, name);
          } else if (getSetInput && getSetAttribute || !ruseDefault.test(name)) {
            elem.setAttribute(!getSetAttribute && jQuery.propFix[name] || name, name);
          } else {
            elem[jQuery.camelCase("default-" + name)] = elem[name] = true;
          }
          return name;
        }};
      jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
        var getter = attrHandle[name] || jQuery.find.attr;
        attrHandle[name] = getSetInput && getSetAttribute || !ruseDefault.test(name) ? function(elem, name, isXML) {
          var ret,
              handle;
          if (!isXML) {
            handle = attrHandle[name];
            attrHandle[name] = ret;
            ret = getter(elem, name, isXML) != null ? name.toLowerCase() : null;
            attrHandle[name] = handle;
          }
          return ret;
        } : function(elem, name, isXML) {
          if (!isXML) {
            return elem[jQuery.camelCase("default-" + name)] ? name.toLowerCase() : null;
          }
        };
      });
      if (!getSetInput || !getSetAttribute) {
        jQuery.attrHooks.value = {set: function(elem, value, name) {
            if (jQuery.nodeName(elem, "input")) {
              elem.defaultValue = value;
            } else {
              return nodeHook && nodeHook.set(elem, value, name);
            }
          }};
      }
      if (!getSetAttribute) {
        nodeHook = {set: function(elem, value, name) {
            var ret = elem.getAttributeNode(name);
            if (!ret) {
              elem.setAttributeNode((ret = elem.ownerDocument.createAttribute(name)));
            }
            ret.value = value += "";
            if (name === "value" || value === elem.getAttribute(name)) {
              return value;
            }
          }};
        attrHandle.id = attrHandle.name = attrHandle.coords = function(elem, name, isXML) {
          var ret;
          if (!isXML) {
            return (ret = elem.getAttributeNode(name)) && ret.value !== "" ? ret.value : null;
          }
        };
        jQuery.valHooks.button = {
          get: function(elem, name) {
            var ret = elem.getAttributeNode(name);
            if (ret && ret.specified) {
              return ret.value;
            }
          },
          set: nodeHook.set
        };
        jQuery.attrHooks.contenteditable = {set: function(elem, value, name) {
            nodeHook.set(elem, value === "" ? false : value, name);
          }};
        jQuery.each(["width", "height"], function(i, name) {
          jQuery.attrHooks[name] = {set: function(elem, value) {
              if (value === "") {
                elem.setAttribute(name, "auto");
                return value;
              }
            }};
        });
      }
      if (!support.style) {
        jQuery.attrHooks.style = {
          get: function(elem) {
            return elem.style.cssText || undefined;
          },
          set: function(elem, value) {
            return (elem.style.cssText = value + "");
          }
        };
      }
      var rfocusable = /^(?:input|select|textarea|button|object)$/i,
          rclickable = /^(?:a|area)$/i;
      jQuery.fn.extend({
        prop: function(name, value) {
          return access(this, jQuery.prop, name, value, arguments.length > 1);
        },
        removeProp: function(name) {
          name = jQuery.propFix[name] || name;
          return this.each(function() {
            try {
              this[name] = undefined;
              delete this[name];
            } catch (e) {}
          });
        }
      });
      jQuery.extend({
        propFix: {
          "for": "htmlFor",
          "class": "className"
        },
        prop: function(elem, name, value) {
          var ret,
              hooks,
              notxml,
              nType = elem.nodeType;
          if (!elem || nType === 3 || nType === 8 || nType === 2) {
            return;
          }
          notxml = nType !== 1 || !jQuery.isXMLDoc(elem);
          if (notxml) {
            name = jQuery.propFix[name] || name;
            hooks = jQuery.propHooks[name];
          }
          if (value !== undefined) {
            return hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined ? ret : (elem[name] = value);
          } else {
            return hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null ? ret : elem[name];
          }
        },
        propHooks: {tabIndex: {get: function(elem) {
              var tabindex = jQuery.find.attr(elem, "tabindex");
              return tabindex ? parseInt(tabindex, 10) : rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href ? 0 : -1;
            }}}
      });
      if (!support.hrefNormalized) {
        jQuery.each(["href", "src"], function(i, name) {
          jQuery.propHooks[name] = {get: function(elem) {
              return elem.getAttribute(name, 4);
            }};
        });
      }
      if (!support.optSelected) {
        jQuery.propHooks.selected = {get: function(elem) {
            var parent = elem.parentNode;
            if (parent) {
              parent.selectedIndex;
              if (parent.parentNode) {
                parent.parentNode.selectedIndex;
              }
            }
            return null;
          }};
      }
      jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
        jQuery.propFix[this.toLowerCase()] = this;
      });
      if (!support.enctype) {
        jQuery.propFix.enctype = "encoding";
      }
      var rclass = /[\t\r\n\f]/g;
      jQuery.fn.extend({
        addClass: function(value) {
          var classes,
              elem,
              cur,
              clazz,
              j,
              finalValue,
              i = 0,
              len = this.length,
              proceed = typeof value === "string" && value;
          if (jQuery.isFunction(value)) {
            return this.each(function(j) {
              jQuery(this).addClass(value.call(this, j, this.className));
            });
          }
          if (proceed) {
            classes = (value || "").match(rnotwhite) || [];
            for (; i < len; i++) {
              elem = this[i];
              cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : " ");
              if (cur) {
                j = 0;
                while ((clazz = classes[j++])) {
                  if (cur.indexOf(" " + clazz + " ") < 0) {
                    cur += clazz + " ";
                  }
                }
                finalValue = jQuery.trim(cur);
                if (elem.className !== finalValue) {
                  elem.className = finalValue;
                }
              }
            }
          }
          return this;
        },
        removeClass: function(value) {
          var classes,
              elem,
              cur,
              clazz,
              j,
              finalValue,
              i = 0,
              len = this.length,
              proceed = arguments.length === 0 || typeof value === "string" && value;
          if (jQuery.isFunction(value)) {
            return this.each(function(j) {
              jQuery(this).removeClass(value.call(this, j, this.className));
            });
          }
          if (proceed) {
            classes = (value || "").match(rnotwhite) || [];
            for (; i < len; i++) {
              elem = this[i];
              cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : "");
              if (cur) {
                j = 0;
                while ((clazz = classes[j++])) {
                  while (cur.indexOf(" " + clazz + " ") >= 0) {
                    cur = cur.replace(" " + clazz + " ", " ");
                  }
                }
                finalValue = value ? jQuery.trim(cur) : "";
                if (elem.className !== finalValue) {
                  elem.className = finalValue;
                }
              }
            }
          }
          return this;
        },
        toggleClass: function(value, stateVal) {
          var type = typeof value;
          if (typeof stateVal === "boolean" && type === "string") {
            return stateVal ? this.addClass(value) : this.removeClass(value);
          }
          if (jQuery.isFunction(value)) {
            return this.each(function(i) {
              jQuery(this).toggleClass(value.call(this, i, this.className, stateVal), stateVal);
            });
          }
          return this.each(function() {
            if (type === "string") {
              var className,
                  i = 0,
                  self = jQuery(this),
                  classNames = value.match(rnotwhite) || [];
              while ((className = classNames[i++])) {
                if (self.hasClass(className)) {
                  self.removeClass(className);
                } else {
                  self.addClass(className);
                }
              }
            } else if (type === strundefined || type === "boolean") {
              if (this.className) {
                jQuery._data(this, "__className__", this.className);
              }
              this.className = this.className || value === false ? "" : jQuery._data(this, "__className__") || "";
            }
          });
        },
        hasClass: function(selector) {
          var className = " " + selector + " ",
              i = 0,
              l = this.length;
          for (; i < l; i++) {
            if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
              return true;
            }
          }
          return false;
        }
      });
      jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup error contextmenu").split(" "), function(i, name) {
        jQuery.fn[name] = function(data, fn) {
          return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
        };
      });
      jQuery.fn.extend({
        hover: function(fnOver, fnOut) {
          return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
        },
        bind: function(types, data, fn) {
          return this.on(types, null, data, fn);
        },
        unbind: function(types, fn) {
          return this.off(types, null, fn);
        },
        delegate: function(selector, types, data, fn) {
          return this.on(types, selector, data, fn);
        },
        undelegate: function(selector, types, fn) {
          return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
        }
      });
      var nonce = jQuery.now();
      var rquery = (/\?/);
      var rvalidtokens = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
      jQuery.parseJSON = function(data) {
        if (window.JSON && window.JSON.parse) {
          return window.JSON.parse(data + "");
        }
        var requireNonComma,
            depth = null,
            str = jQuery.trim(data + "");
        return str && !jQuery.trim(str.replace(rvalidtokens, function(token, comma, open, close) {
          if (requireNonComma && comma) {
            depth = 0;
          }
          if (depth === 0) {
            return token;
          }
          requireNonComma = open || comma;
          depth += !close - !open;
          return "";
        })) ? (Function("return " + str))() : jQuery.error("Invalid JSON: " + data);
      };
      jQuery.parseXML = function(data) {
        var xml,
            tmp;
        if (!data || typeof data !== "string") {
          return null;
        }
        try {
          if (window.DOMParser) {
            tmp = new DOMParser();
            xml = tmp.parseFromString(data, "text/xml");
          } else {
            xml = new ActiveXObject("Microsoft.XMLDOM");
            xml.async = "false";
            xml.loadXML(data);
          }
        } catch (e) {
          xml = undefined;
        }
        if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length) {
          jQuery.error("Invalid XML: " + data);
        }
        return xml;
      };
      var ajaxLocParts,
          ajaxLocation,
          rhash = /#.*$/,
          rts = /([?&])_=[^&]*/,
          rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg,
          rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
          rnoContent = /^(?:GET|HEAD)$/,
          rprotocol = /^\/\//,
          rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
          prefilters = {},
          transports = {},
          allTypes = "*/".concat("*");
      try {
        ajaxLocation = location.href;
      } catch (e) {
        ajaxLocation = document.createElement("a");
        ajaxLocation.href = "";
        ajaxLocation = ajaxLocation.href;
      }
      ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [];
      function addToPrefiltersOrTransports(structure) {
        return function(dataTypeExpression, func) {
          if (typeof dataTypeExpression !== "string") {
            func = dataTypeExpression;
            dataTypeExpression = "*";
          }
          var dataType,
              i = 0,
              dataTypes = dataTypeExpression.toLowerCase().match(rnotwhite) || [];
          if (jQuery.isFunction(func)) {
            while ((dataType = dataTypes[i++])) {
              if (dataType.charAt(0) === "+") {
                dataType = dataType.slice(1) || "*";
                (structure[dataType] = structure[dataType] || []).unshift(func);
              } else {
                (structure[dataType] = structure[dataType] || []).push(func);
              }
            }
          }
        };
      }
      function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
        var inspected = {},
            seekingTransport = (structure === transports);
        function inspect(dataType) {
          var selected;
          inspected[dataType] = true;
          jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
            var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
            if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
              options.dataTypes.unshift(dataTypeOrTransport);
              inspect(dataTypeOrTransport);
              return false;
            } else if (seekingTransport) {
              return !(selected = dataTypeOrTransport);
            }
          });
          return selected;
        }
        return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
      }
      function ajaxExtend(target, src) {
        var deep,
            key,
            flatOptions = jQuery.ajaxSettings.flatOptions || {};
        for (key in src) {
          if (src[key] !== undefined) {
            (flatOptions[key] ? target : (deep || (deep = {})))[key] = src[key];
          }
        }
        if (deep) {
          jQuery.extend(true, target, deep);
        }
        return target;
      }
      function ajaxHandleResponses(s, jqXHR, responses) {
        var firstDataType,
            ct,
            finalDataType,
            type,
            contents = s.contents,
            dataTypes = s.dataTypes;
        while (dataTypes[0] === "*") {
          dataTypes.shift();
          if (ct === undefined) {
            ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
          }
        }
        if (ct) {
          for (type in contents) {
            if (contents[type] && contents[type].test(ct)) {
              dataTypes.unshift(type);
              break;
            }
          }
        }
        if (dataTypes[0] in responses) {
          finalDataType = dataTypes[0];
        } else {
          for (type in responses) {
            if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
              finalDataType = type;
              break;
            }
            if (!firstDataType) {
              firstDataType = type;
            }
          }
          finalDataType = finalDataType || firstDataType;
        }
        if (finalDataType) {
          if (finalDataType !== dataTypes[0]) {
            dataTypes.unshift(finalDataType);
          }
          return responses[finalDataType];
        }
      }
      function ajaxConvert(s, response, jqXHR, isSuccess) {
        var conv2,
            current,
            conv,
            tmp,
            prev,
            converters = {},
            dataTypes = s.dataTypes.slice();
        if (dataTypes[1]) {
          for (conv in s.converters) {
            converters[conv.toLowerCase()] = s.converters[conv];
          }
        }
        current = dataTypes.shift();
        while (current) {
          if (s.responseFields[current]) {
            jqXHR[s.responseFields[current]] = response;
          }
          if (!prev && isSuccess && s.dataFilter) {
            response = s.dataFilter(response, s.dataType);
          }
          prev = current;
          current = dataTypes.shift();
          if (current) {
            if (current === "*") {
              current = prev;
            } else if (prev !== "*" && prev !== current) {
              conv = converters[prev + " " + current] || converters["* " + current];
              if (!conv) {
                for (conv2 in converters) {
                  tmp = conv2.split(" ");
                  if (tmp[1] === current) {
                    conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
                    if (conv) {
                      if (conv === true) {
                        conv = converters[conv2];
                      } else if (converters[conv2] !== true) {
                        current = tmp[0];
                        dataTypes.unshift(tmp[1]);
                      }
                      break;
                    }
                  }
                }
              }
              if (conv !== true) {
                if (conv && s["throws"]) {
                  response = conv(response);
                } else {
                  try {
                    response = conv(response);
                  } catch (e) {
                    return {
                      state: "parsererror",
                      error: conv ? e : "No conversion from " + prev + " to " + current
                    };
                  }
                }
              }
            }
          }
        }
        return {
          state: "success",
          data: response
        };
      }
      jQuery.extend({
        active: 0,
        lastModified: {},
        etag: {},
        ajaxSettings: {
          url: ajaxLocation,
          type: "GET",
          isLocal: rlocalProtocol.test(ajaxLocParts[1]),
          global: true,
          processData: true,
          async: true,
          contentType: "application/x-www-form-urlencoded; charset=UTF-8",
          accepts: {
            "*": allTypes,
            text: "text/plain",
            html: "text/html",
            xml: "application/xml, text/xml",
            json: "application/json, text/javascript"
          },
          contents: {
            xml: /xml/,
            html: /html/,
            json: /json/
          },
          responseFields: {
            xml: "responseXML",
            text: "responseText",
            json: "responseJSON"
          },
          converters: {
            "* text": String,
            "text html": true,
            "text json": jQuery.parseJSON,
            "text xml": jQuery.parseXML
          },
          flatOptions: {
            url: true,
            context: true
          }
        },
        ajaxSetup: function(target, settings) {
          return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
        },
        ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
        ajaxTransport: addToPrefiltersOrTransports(transports),
        ajax: function(url, options) {
          if (typeof url === "object") {
            options = url;
            url = undefined;
          }
          options = options || {};
          var parts,
              i,
              cacheURL,
              responseHeadersString,
              timeoutTimer,
              fireGlobals,
              transport,
              responseHeaders,
              s = jQuery.ajaxSetup({}, options),
              callbackContext = s.context || s,
              globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
              deferred = jQuery.Deferred(),
              completeDeferred = jQuery.Callbacks("once memory"),
              statusCode = s.statusCode || {},
              requestHeaders = {},
              requestHeadersNames = {},
              state = 0,
              strAbort = "canceled",
              jqXHR = {
                readyState: 0,
                getResponseHeader: function(key) {
                  var match;
                  if (state === 2) {
                    if (!responseHeaders) {
                      responseHeaders = {};
                      while ((match = rheaders.exec(responseHeadersString))) {
                        responseHeaders[match[1].toLowerCase()] = match[2];
                      }
                    }
                    match = responseHeaders[key.toLowerCase()];
                  }
                  return match == null ? null : match;
                },
                getAllResponseHeaders: function() {
                  return state === 2 ? responseHeadersString : null;
                },
                setRequestHeader: function(name, value) {
                  var lname = name.toLowerCase();
                  if (!state) {
                    name = requestHeadersNames[lname] = requestHeadersNames[lname] || name;
                    requestHeaders[name] = value;
                  }
                  return this;
                },
                overrideMimeType: function(type) {
                  if (!state) {
                    s.mimeType = type;
                  }
                  return this;
                },
                statusCode: function(map) {
                  var code;
                  if (map) {
                    if (state < 2) {
                      for (code in map) {
                        statusCode[code] = [statusCode[code], map[code]];
                      }
                    } else {
                      jqXHR.always(map[jqXHR.status]);
                    }
                  }
                  return this;
                },
                abort: function(statusText) {
                  var finalText = statusText || strAbort;
                  if (transport) {
                    transport.abort(finalText);
                  }
                  done(0, finalText);
                  return this;
                }
              };
          deferred.promise(jqXHR).complete = completeDeferred.add;
          jqXHR.success = jqXHR.done;
          jqXHR.error = jqXHR.fail;
          s.url = ((url || s.url || ajaxLocation) + "").replace(rhash, "").replace(rprotocol, ajaxLocParts[1] + "//");
          s.type = options.method || options.type || s.method || s.type;
          s.dataTypes = jQuery.trim(s.dataType || "*").toLowerCase().match(rnotwhite) || [""];
          if (s.crossDomain == null) {
            parts = rurl.exec(s.url.toLowerCase());
            s.crossDomain = !!(parts && (parts[1] !== ajaxLocParts[1] || parts[2] !== ajaxLocParts[2] || (parts[3] || (parts[1] === "http:" ? "80" : "443")) !== (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? "80" : "443"))));
          }
          if (s.data && s.processData && typeof s.data !== "string") {
            s.data = jQuery.param(s.data, s.traditional);
          }
          inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
          if (state === 2) {
            return jqXHR;
          }
          fireGlobals = jQuery.event && s.global;
          if (fireGlobals && jQuery.active++ === 0) {
            jQuery.event.trigger("ajaxStart");
          }
          s.type = s.type.toUpperCase();
          s.hasContent = !rnoContent.test(s.type);
          cacheURL = s.url;
          if (!s.hasContent) {
            if (s.data) {
              cacheURL = (s.url += (rquery.test(cacheURL) ? "&" : "?") + s.data);
              delete s.data;
            }
            if (s.cache === false) {
              s.url = rts.test(cacheURL) ? cacheURL.replace(rts, "$1_=" + nonce++) : cacheURL + (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++;
            }
          }
          if (s.ifModified) {
            if (jQuery.lastModified[cacheURL]) {
              jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
            }
            if (jQuery.etag[cacheURL]) {
              jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
            }
          }
          if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
            jqXHR.setRequestHeader("Content-Type", s.contentType);
          }
          jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
          for (i in s.headers) {
            jqXHR.setRequestHeader(i, s.headers[i]);
          }
          if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || state === 2)) {
            return jqXHR.abort();
          }
          strAbort = "abort";
          for (i in {
            success: 1,
            error: 1,
            complete: 1
          }) {
            jqXHR[i](s[i]);
          }
          transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
          if (!transport) {
            done(-1, "No Transport");
          } else {
            jqXHR.readyState = 1;
            if (fireGlobals) {
              globalEventContext.trigger("ajaxSend", [jqXHR, s]);
            }
            if (s.async && s.timeout > 0) {
              timeoutTimer = setTimeout(function() {
                jqXHR.abort("timeout");
              }, s.timeout);
            }
            try {
              state = 1;
              transport.send(requestHeaders, done);
            } catch (e) {
              if (state < 2) {
                done(-1, e);
              } else {
                throw e;
              }
            }
          }
          function done(status, nativeStatusText, responses, headers) {
            var isSuccess,
                success,
                error,
                response,
                modified,
                statusText = nativeStatusText;
            if (state === 2) {
              return;
            }
            state = 2;
            if (timeoutTimer) {
              clearTimeout(timeoutTimer);
            }
            transport = undefined;
            responseHeadersString = headers || "";
            jqXHR.readyState = status > 0 ? 4 : 0;
            isSuccess = status >= 200 && status < 300 || status === 304;
            if (responses) {
              response = ajaxHandleResponses(s, jqXHR, responses);
            }
            response = ajaxConvert(s, response, jqXHR, isSuccess);
            if (isSuccess) {
              if (s.ifModified) {
                modified = jqXHR.getResponseHeader("Last-Modified");
                if (modified) {
                  jQuery.lastModified[cacheURL] = modified;
                }
                modified = jqXHR.getResponseHeader("etag");
                if (modified) {
                  jQuery.etag[cacheURL] = modified;
                }
              }
              if (status === 204 || s.type === "HEAD") {
                statusText = "nocontent";
              } else if (status === 304) {
                statusText = "notmodified";
              } else {
                statusText = response.state;
                success = response.data;
                error = response.error;
                isSuccess = !error;
              }
            } else {
              error = statusText;
              if (status || !statusText) {
                statusText = "error";
                if (status < 0) {
                  status = 0;
                }
              }
            }
            jqXHR.status = status;
            jqXHR.statusText = (nativeStatusText || statusText) + "";
            if (isSuccess) {
              deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
            } else {
              deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
            }
            jqXHR.statusCode(statusCode);
            statusCode = undefined;
            if (fireGlobals) {
              globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
            }
            completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);
            if (fireGlobals) {
              globalEventContext.trigger("ajaxComplete", [jqXHR, s]);
              if (!(--jQuery.active)) {
                jQuery.event.trigger("ajaxStop");
              }
            }
          }
          return jqXHR;
        },
        getJSON: function(url, data, callback) {
          return jQuery.get(url, data, callback, "json");
        },
        getScript: function(url, callback) {
          return jQuery.get(url, undefined, callback, "script");
        }
      });
      jQuery.each(["get", "post"], function(i, method) {
        jQuery[method] = function(url, data, callback, type) {
          if (jQuery.isFunction(data)) {
            type = type || callback;
            callback = data;
            data = undefined;
          }
          return jQuery.ajax({
            url: url,
            type: method,
            dataType: type,
            data: data,
            success: callback
          });
        };
      });
      jQuery._evalUrl = function(url) {
        return jQuery.ajax({
          url: url,
          type: "GET",
          dataType: "script",
          async: false,
          global: false,
          "throws": true
        });
      };
      jQuery.fn.extend({
        wrapAll: function(html) {
          if (jQuery.isFunction(html)) {
            return this.each(function(i) {
              jQuery(this).wrapAll(html.call(this, i));
            });
          }
          if (this[0]) {
            var wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
            if (this[0].parentNode) {
              wrap.insertBefore(this[0]);
            }
            wrap.map(function() {
              var elem = this;
              while (elem.firstChild && elem.firstChild.nodeType === 1) {
                elem = elem.firstChild;
              }
              return elem;
            }).append(this);
          }
          return this;
        },
        wrapInner: function(html) {
          if (jQuery.isFunction(html)) {
            return this.each(function(i) {
              jQuery(this).wrapInner(html.call(this, i));
            });
          }
          return this.each(function() {
            var self = jQuery(this),
                contents = self.contents();
            if (contents.length) {
              contents.wrapAll(html);
            } else {
              self.append(html);
            }
          });
        },
        wrap: function(html) {
          var isFunction = jQuery.isFunction(html);
          return this.each(function(i) {
            jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
          });
        },
        unwrap: function() {
          return this.parent().each(function() {
            if (!jQuery.nodeName(this, "body")) {
              jQuery(this).replaceWith(this.childNodes);
            }
          }).end();
        }
      });
      jQuery.expr.filters.hidden = function(elem) {
        return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 || (!support.reliableHiddenOffsets() && ((elem.style && elem.style.display) || jQuery.css(elem, "display")) === "none");
      };
      jQuery.expr.filters.visible = function(elem) {
        return !jQuery.expr.filters.hidden(elem);
      };
      var r20 = /%20/g,
          rbracket = /\[\]$/,
          rCRLF = /\r?\n/g,
          rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
          rsubmittable = /^(?:input|select|textarea|keygen)/i;
      function buildParams(prefix, obj, traditional, add) {
        var name;
        if (jQuery.isArray(obj)) {
          jQuery.each(obj, function(i, v) {
            if (traditional || rbracket.test(prefix)) {
              add(prefix, v);
            } else {
              buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v, traditional, add);
            }
          });
        } else if (!traditional && jQuery.type(obj) === "object") {
          for (name in obj) {
            buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
          }
        } else {
          add(prefix, obj);
        }
      }
      jQuery.param = function(a, traditional) {
        var prefix,
            s = [],
            add = function(key, value) {
              value = jQuery.isFunction(value) ? value() : (value == null ? "" : value);
              s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            };
        if (traditional === undefined) {
          traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
        }
        if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
          jQuery.each(a, function() {
            add(this.name, this.value);
          });
        } else {
          for (prefix in a) {
            buildParams(prefix, a[prefix], traditional, add);
          }
        }
        return s.join("&").replace(r20, "+");
      };
      jQuery.fn.extend({
        serialize: function() {
          return jQuery.param(this.serializeArray());
        },
        serializeArray: function() {
          return this.map(function() {
            var elements = jQuery.prop(this, "elements");
            return elements ? jQuery.makeArray(elements) : this;
          }).filter(function() {
            var type = this.type;
            return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
          }).map(function(i, elem) {
            var val = jQuery(this).val();
            return val == null ? null : jQuery.isArray(val) ? jQuery.map(val, function(val) {
              return {
                name: elem.name,
                value: val.replace(rCRLF, "\r\n")
              };
            }) : {
              name: elem.name,
              value: val.replace(rCRLF, "\r\n")
            };
          }).get();
        }
      });
      jQuery.ajaxSettings.xhr = window.ActiveXObject !== undefined ? function() {
        return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && createStandardXHR() || createActiveXHR();
      } : createStandardXHR;
      var xhrId = 0,
          xhrCallbacks = {},
          xhrSupported = jQuery.ajaxSettings.xhr();
      if (window.attachEvent) {
        window.attachEvent("onunload", function() {
          for (var key in xhrCallbacks) {
            xhrCallbacks[key](undefined, true);
          }
        });
      }
      support.cors = !!xhrSupported && ("withCredentials" in xhrSupported);
      xhrSupported = support.ajax = !!xhrSupported;
      if (xhrSupported) {
        jQuery.ajaxTransport(function(options) {
          if (!options.crossDomain || support.cors) {
            var callback;
            return {
              send: function(headers, complete) {
                var i,
                    xhr = options.xhr(),
                    id = ++xhrId;
                xhr.open(options.type, options.url, options.async, options.username, options.password);
                if (options.xhrFields) {
                  for (i in options.xhrFields) {
                    xhr[i] = options.xhrFields[i];
                  }
                }
                if (options.mimeType && xhr.overrideMimeType) {
                  xhr.overrideMimeType(options.mimeType);
                }
                if (!options.crossDomain && !headers["X-Requested-With"]) {
                  headers["X-Requested-With"] = "XMLHttpRequest";
                }
                for (i in headers) {
                  if (headers[i] !== undefined) {
                    xhr.setRequestHeader(i, headers[i] + "");
                  }
                }
                xhr.send((options.hasContent && options.data) || null);
                callback = function(_, isAbort) {
                  var status,
                      statusText,
                      responses;
                  if (callback && (isAbort || xhr.readyState === 4)) {
                    delete xhrCallbacks[id];
                    callback = undefined;
                    xhr.onreadystatechange = jQuery.noop;
                    if (isAbort) {
                      if (xhr.readyState !== 4) {
                        xhr.abort();
                      }
                    } else {
                      responses = {};
                      status = xhr.status;
                      if (typeof xhr.responseText === "string") {
                        responses.text = xhr.responseText;
                      }
                      try {
                        statusText = xhr.statusText;
                      } catch (e) {
                        statusText = "";
                      }
                      if (!status && options.isLocal && !options.crossDomain) {
                        status = responses.text ? 200 : 404;
                      } else if (status === 1223) {
                        status = 204;
                      }
                    }
                  }
                  if (responses) {
                    complete(status, statusText, responses, xhr.getAllResponseHeaders());
                  }
                };
                if (!options.async) {
                  callback();
                } else if (xhr.readyState === 4) {
                  setTimeout(callback);
                } else {
                  xhr.onreadystatechange = xhrCallbacks[id] = callback;
                }
              },
              abort: function() {
                if (callback) {
                  callback(undefined, true);
                }
              }
            };
          }
        });
      }
      function createStandardXHR() {
        try {
          return new window.XMLHttpRequest();
        } catch (e) {}
      }
      function createActiveXHR() {
        try {
          return new window.ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {}
      }
      jQuery.ajaxSetup({
        accepts: {script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},
        contents: {script: /(?:java|ecma)script/},
        converters: {"text script": function(text) {
            jQuery.globalEval(text);
            return text;
          }}
      });
      jQuery.ajaxPrefilter("script", function(s) {
        if (s.cache === undefined) {
          s.cache = false;
        }
        if (s.crossDomain) {
          s.type = "GET";
          s.global = false;
        }
      });
      jQuery.ajaxTransport("script", function(s) {
        if (s.crossDomain) {
          var script,
              head = document.head || jQuery("head")[0] || document.documentElement;
          return {
            send: function(_, callback) {
              script = document.createElement("script");
              script.async = true;
              if (s.scriptCharset) {
                script.charset = s.scriptCharset;
              }
              script.src = s.url;
              script.onload = script.onreadystatechange = function(_, isAbort) {
                if (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) {
                  script.onload = script.onreadystatechange = null;
                  if (script.parentNode) {
                    script.parentNode.removeChild(script);
                  }
                  script = null;
                  if (!isAbort) {
                    callback(200, "success");
                  }
                }
              };
              head.insertBefore(script, head.firstChild);
            },
            abort: function() {
              if (script) {
                script.onload(undefined, true);
              }
            }
          };
        }
      });
      var oldCallbacks = [],
          rjsonp = /(=)\?(?=&|$)|\?\?/;
      jQuery.ajaxSetup({
        jsonp: "callback",
        jsonpCallback: function() {
          var callback = oldCallbacks.pop() || (jQuery.expando + "_" + (nonce++));
          this[callback] = true;
          return callback;
        }
      });
      jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
        var callbackName,
            overwritten,
            responseContainer,
            jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && !(s.contentType || "").indexOf("application/x-www-form-urlencoded") && rjsonp.test(s.data) && "data");
        if (jsonProp || s.dataTypes[0] === "jsonp") {
          callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
          if (jsonProp) {
            s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
          } else if (s.jsonp !== false) {
            s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
          }
          s.converters["script json"] = function() {
            if (!responseContainer) {
              jQuery.error(callbackName + " was not called");
            }
            return responseContainer[0];
          };
          s.dataTypes[0] = "json";
          overwritten = window[callbackName];
          window[callbackName] = function() {
            responseContainer = arguments;
          };
          jqXHR.always(function() {
            window[callbackName] = overwritten;
            if (s[callbackName]) {
              s.jsonpCallback = originalSettings.jsonpCallback;
              oldCallbacks.push(callbackName);
            }
            if (responseContainer && jQuery.isFunction(overwritten)) {
              overwritten(responseContainer[0]);
            }
            responseContainer = overwritten = undefined;
          });
          return "script";
        }
      });
      jQuery.parseHTML = function(data, context, keepScripts) {
        if (!data || typeof data !== "string") {
          return null;
        }
        if (typeof context === "boolean") {
          keepScripts = context;
          context = false;
        }
        context = context || document;
        var parsed = rsingleTag.exec(data),
            scripts = !keepScripts && [];
        if (parsed) {
          return [context.createElement(parsed[1])];
        }
        parsed = jQuery.buildFragment([data], context, scripts);
        if (scripts && scripts.length) {
          jQuery(scripts).remove();
        }
        return jQuery.merge([], parsed.childNodes);
      };
      var _load = jQuery.fn.load;
      jQuery.fn.load = function(url, params, callback) {
        if (typeof url !== "string" && _load) {
          return _load.apply(this, arguments);
        }
        var selector,
            response,
            type,
            self = this,
            off = url.indexOf(" ");
        if (off >= 0) {
          selector = jQuery.trim(url.slice(off, url.length));
          url = url.slice(0, off);
        }
        if (jQuery.isFunction(params)) {
          callback = params;
          params = undefined;
        } else if (params && typeof params === "object") {
          type = "POST";
        }
        if (self.length > 0) {
          jQuery.ajax({
            url: url,
            type: type,
            dataType: "html",
            data: params
          }).done(function(responseText) {
            response = arguments;
            self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText);
          }).complete(callback && function(jqXHR, status) {
            self.each(callback, response || [jqXHR.responseText, status, jqXHR]);
          });
        }
        return this;
      };
      jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(i, type) {
        jQuery.fn[type] = function(fn) {
          return this.on(type, fn);
        };
      });
      jQuery.expr.filters.animated = function(elem) {
        return jQuery.grep(jQuery.timers, function(fn) {
          return elem === fn.elem;
        }).length;
      };
      var docElem = window.document.documentElement;
      function getWindow(elem) {
        return jQuery.isWindow(elem) ? elem : elem.nodeType === 9 ? elem.defaultView || elem.parentWindow : false;
      }
      jQuery.offset = {setOffset: function(elem, options, i) {
          var curPosition,
              curLeft,
              curCSSTop,
              curTop,
              curOffset,
              curCSSLeft,
              calculatePosition,
              position = jQuery.css(elem, "position"),
              curElem = jQuery(elem),
              props = {};
          if (position === "static") {
            elem.style.position = "relative";
          }
          curOffset = curElem.offset();
          curCSSTop = jQuery.css(elem, "top");
          curCSSLeft = jQuery.css(elem, "left");
          calculatePosition = (position === "absolute" || position === "fixed") && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1;
          if (calculatePosition) {
            curPosition = curElem.position();
            curTop = curPosition.top;
            curLeft = curPosition.left;
          } else {
            curTop = parseFloat(curCSSTop) || 0;
            curLeft = parseFloat(curCSSLeft) || 0;
          }
          if (jQuery.isFunction(options)) {
            options = options.call(elem, i, curOffset);
          }
          if (options.top != null) {
            props.top = (options.top - curOffset.top) + curTop;
          }
          if (options.left != null) {
            props.left = (options.left - curOffset.left) + curLeft;
          }
          if ("using" in options) {
            options.using.call(elem, props);
          } else {
            curElem.css(props);
          }
        }};
      jQuery.fn.extend({
        offset: function(options) {
          if (arguments.length) {
            return options === undefined ? this : this.each(function(i) {
              jQuery.offset.setOffset(this, options, i);
            });
          }
          var docElem,
              win,
              box = {
                top: 0,
                left: 0
              },
              elem = this[0],
              doc = elem && elem.ownerDocument;
          if (!doc) {
            return;
          }
          docElem = doc.documentElement;
          if (!jQuery.contains(docElem, elem)) {
            return box;
          }
          if (typeof elem.getBoundingClientRect !== strundefined) {
            box = elem.getBoundingClientRect();
          }
          win = getWindow(doc);
          return {
            top: box.top + (win.pageYOffset || docElem.scrollTop) - (docElem.clientTop || 0),
            left: box.left + (win.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
          };
        },
        position: function() {
          if (!this[0]) {
            return;
          }
          var offsetParent,
              offset,
              parentOffset = {
                top: 0,
                left: 0
              },
              elem = this[0];
          if (jQuery.css(elem, "position") === "fixed") {
            offset = elem.getBoundingClientRect();
          } else {
            offsetParent = this.offsetParent();
            offset = this.offset();
            if (!jQuery.nodeName(offsetParent[0], "html")) {
              parentOffset = offsetParent.offset();
            }
            parentOffset.top += jQuery.css(offsetParent[0], "borderTopWidth", true);
            parentOffset.left += jQuery.css(offsetParent[0], "borderLeftWidth", true);
          }
          return {
            top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
            left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
          };
        },
        offsetParent: function() {
          return this.map(function() {
            var offsetParent = this.offsetParent || docElem;
            while (offsetParent && (!jQuery.nodeName(offsetParent, "html") && jQuery.css(offsetParent, "position") === "static")) {
              offsetParent = offsetParent.offsetParent;
            }
            return offsetParent || docElem;
          });
        }
      });
      jQuery.each({
        scrollLeft: "pageXOffset",
        scrollTop: "pageYOffset"
      }, function(method, prop) {
        var top = /Y/.test(prop);
        jQuery.fn[method] = function(val) {
          return access(this, function(elem, method, val) {
            var win = getWindow(elem);
            if (val === undefined) {
              return win ? (prop in win) ? win[prop] : win.document.documentElement[method] : elem[method];
            }
            if (win) {
              win.scrollTo(!top ? val : jQuery(win).scrollLeft(), top ? val : jQuery(win).scrollTop());
            } else {
              elem[method] = val;
            }
          }, method, val, arguments.length, null);
        };
      });
      jQuery.each(["top", "left"], function(i, prop) {
        jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
          if (computed) {
            computed = curCSS(elem, prop);
            return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
          }
        });
      });
      jQuery.each({
        Height: "height",
        Width: "width"
      }, function(name, type) {
        jQuery.each({
          padding: "inner" + name,
          content: type,
          "": "outer" + name
        }, function(defaultExtra, funcName) {
          jQuery.fn[funcName] = function(margin, value) {
            var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
                extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
            return access(this, function(elem, type, value) {
              var doc;
              if (jQuery.isWindow(elem)) {
                return elem.document.documentElement["client" + name];
              }
              if (elem.nodeType === 9) {
                doc = elem.documentElement;
                return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
              }
              return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
            }, type, chainable ? margin : undefined, chainable, null);
          };
        });
      });
      jQuery.fn.size = function() {
        return this.length;
      };
      jQuery.fn.andSelf = jQuery.fn.addBack;
      if (typeof define === "function" && define.amd) {
        define("jquery", [], function() {
          return jQuery;
        });
      }
      var _jQuery = window.jQuery,
          _$ = window.$;
      jQuery.noConflict = function(deep) {
        if (window.$ === jQuery) {
          window.$ = _$;
        }
        if (deep && window.jQuery === jQuery) {
          window.jQuery = _jQuery;
        }
        return jQuery;
      };
      if (typeof noGlobal === strundefined) {
        window.jQuery = window.$ = jQuery;
      }
      return jQuery;
    }));
  })($__require('github:jspm/nodelibs-process@0.1.2'));
  global.define = __define;
  return module.exports;
});

System.registerDynamic("npm:jquery@1.11.3", ["npm:jquery@1.11.3/dist/jquery"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = $__require('npm:jquery@1.11.3/dist/jquery');
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/search/SearchController.js", ["npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = $__require('npm:jquery@1.11.3');
  module.exports = Controller;
  function Controller(root, showHideClass) {
    this.root = root;
    this._input = $('input', root).get(0);
    this._showHideClass = showHideClass;
  }
  Controller.prototype.hide = function() {
    this._hide();
  };
  Controller.prototype.show = function(additionalClass) {
    this._hide();
    var cls = this._showHideClass;
    if (additionalClass) {
      cls += ' ' + additionalClass;
    }
    this._hide = function() {
      $(this.root).removeClass(cls);
      this._input.blur();
      this._hide = noop;
    };
    $(this.root).addClass(cls);
    this._input.focus();
  };
  Controller.prototype._hide = noop;
  function noop() {}
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/feature/search/main.js", ["src/feature/search/SearchController.js", "npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var SearchController = $__require('src/feature/search/SearchController.js');
  var $ = $__require('npm:jquery@1.11.3');
  var searchDropdown = '.js-search-dropdown';
  var navItem = '.nav-search';
  var searchOpenTrigger = '.js-search-input-open';
  var searchCloseTrigger = '.body--container, .js-search-input-close, .homepage--body';
  var noAnimationClass = 'no-animation';
  var enabledClass = 'js-highlight';
  var showHideClass = 'js-show';
  module.exports = function initSearch() {
    return initSearchController(window.location.pathname === '/search', $(searchDropdown)[0]);
  };
  function initSearchController(initiallyVisible, searchContainer) {
    var searchController;
    $(function() {
      searchController = new SearchController(searchContainer, showHideClass);
      $(searchOpenTrigger).on('click', function() {
        showSearchDropdown();
      });
      $(searchCloseTrigger).on('click', hideSearchDropdown);
      if (initiallyVisible) {
        showSearchDropdown(noAnimationClass);
      }
      return searchController;
      function showSearchDropdown(additionalClass) {
        searchController.show(additionalClass);
        $(navItem).addClass(enabledClass);
      }
      function hideSearchDropdown() {
        searchController.hide();
        $(navItem).removeClass(enabledClass);
      }
    });
    return {destroy: function() {}};
  }
  global.define = __define;
  return module.exports;
});

System.registerDynamic("src/app/main.js", ["src/feature/search/main.js", "src/feature/searchFacets/main.js", "src/feature/filterableList/main.js", "src/feature/clipboardButtons/main.js", "src/feature/codeSidebar/main.js", "src/feature/stsImport/main.js", "src/feature/mobileSupport/main.js", "src/feature/infoPopups/main.js", "src/feature/platformDownloads/main.js", "src/feature/formWidgets/main.js", "src/feature/prettify/main.js", "src/feature/map/main.js", "src/feature/timeAgo/main.js", "src/feature/hide-show-guide/main.js", "src/feature/heroBanner/main.js", "npm:most@0.2.4", "npm:jquery@1.11.3"], true, function($__require, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var initSearch = $__require('src/feature/search/main.js');
  var initSearchFacets = $__require('src/feature/searchFacets/main.js');
  var initFilterableList = $__require('src/feature/filterableList/main.js');
  var initClipboardButtons = $__require('src/feature/clipboardButtons/main.js');
  var initCodeSidebar = $__require('src/feature/codeSidebar/main.js');
  var initStsImport = $__require('src/feature/stsImport/main.js');
  var initMobileSupport = $__require('src/feature/mobileSupport/main.js');
  var initInfoPopups = $__require('src/feature/infoPopups/main.js');
  var initPlatformDownloads = $__require('src/feature/platformDownloads/main.js');
  var initFormWidgets = $__require('src/feature/formWidgets/main.js');
  var initPrettify = $__require('src/feature/prettify/main.js');
  var initMap = $__require('src/feature/map/main.js');
  var initTimeAgo = $__require('src/feature/timeAgo/main.js');
  var initHideShowGuide = $__require('src/feature/hide-show-guide/main.js');
  var initHeroBanner = $__require('src/feature/heroBanner/main.js');
  var most = $__require('npm:most@0.2.4');
  var $ = $__require('npm:jquery@1.11.3');
  var slice = Array.prototype.slice;
  var dataAttrRx = /^data-/i;
  var features = {
    search: initSearch,
    'search-facets': initSearchFacets,
    'filterable-list': initFilterableList,
    'clipboard-buttons': initClipboardButtons,
    'code-sidebar': initCodeSidebar,
    'sts-import': initStsImport,
    'mobile-support': initMobileSupport,
    'info-popups': initInfoPopups,
    'platform-downloads': initPlatformDownloads,
    'form-widgets': initFormWidgets,
    'code-prettify': initPrettify,
    'map': initMap,
    'timeago': initTimeAgo,
    'hide-show-guide': initHideShowGuide,
    'hero-banner': initHeroBanner
  };
  initFeatures(features, document).each(function(features) {
    $(window).unload(function() {
      destroyFeatures(features);
    });
  });
  function initFeatures(features, document) {
    return scanFeatures(features, document).map(function(key) {
      return features[key]();
    }).reduce(function(initialized, feature) {
      initialized.push(feature);
      return initialized;
    }, []);
  }
  function scanFeatures(features, document) {
    return most.fromArray(slice.call(document.documentElement.attributes)).map(function(attr) {
      var name = attr.name;
      return dataAttrRx.test(name) && name.slice(5);
    }).filter(function(name) {
      return name && name in features;
    });
  }
  function destroyFeatures(features) {
    features.forEach(function(feature) {
      feature.destroy();
    });
  }
  global.define = __define;
  return module.exports;
});

//# sourceMappingURL=build.js.map