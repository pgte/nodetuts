$(function() {

  var videoMeta = window.nodeTutsVideo;
  var frames = videoMeta.frames;
  var currentIndex;
  var $video = $('#video');
  var $script = $('#script');
  
  var scriptWindow;
  var scrollElement;
  var elems;
  var seeking = false;

  var childWindow = (window.location.hash == '#-1');

  function seek(time) {
    var accTime = 0;
    var notDone = true;
    for(var i = 0; notDone && i < frames.length; i ++) {
      accTime = frames[i];
      if (accTime > time) {
        if (i < 1) i = 1;
        script.to(i - 1);
        notDone = false;
      }
    }
  }

  // Init Header

  (function initHeader() {
    $('header h2').text(videoMeta.title);
  }());

  // Popover

  var popover = (function popover() {
    var showingPopover = false;

    function show() {
      if (! showingPopover) {
        showingPopover = true;
        $('#popover')
          .popover('show');

        setTimeout(function() {
          hide();
        }, 4000);
      }

    }

    function hide() {
      if (showingPopover) {
        showingPopover = false;
        $('#popover').popover('hide');
      }
    }

    return {
      show: show,
      hide: hide
    };

  }());

  // Layout

  function initLayout() {
    var $window = $(window);
    var iframe = $video.find('iframe');
    
    var ratio = (function() {
      var iframe = $('iframe');
      var iframeHeight = 480;//iframe.height() || 480;
      var iframeWidth = 640;//iframe.width() || 640;

      var ratio = iframeWidth / iframeHeight;
      return ratio;
    }());
    
    function resize() {
      var headerHeight = $('header').height();
      var height = $window.height();
      var width = $window.width();
      var videoHeight = Math.floor(width / ratio);
      while((height - videoHeight - headerHeight) < 0) {
        videoHeight -= 10;
      } 

      width = Math.floor(ratio * videoHeight);
      
      $video.width(width);
      iframe.width(width);

      remainingHeight = height - videoHeight - headerHeight;
      if (remainingHeight < 100 && ! scriptWindow) {
        popover.show();
      } else {
        popover.hide();
      }
      videoHeight = Math.max(videoHeight, 200);
      $video.height(videoHeight);
      iframe.height(videoHeight);
      $script.height(height - headerHeight - videoHeight);
    }

    $window.resize(resize);

    resize();
  }


  // Scan elements

  (function scanElements() {
    scrollElement = $('#script');
    elems = $('#script > *').map(function(idx, elem) {
      return $(elem);
    });
  }());

  // Init Script

  var script = (function initScript() {

    function from(index) {
      var elem = elems[index];
      if (elem) elem.removeClass('selected');
    }

    function toFirst() {
      to(0);
    }

    function to(index) {

      try {
        if (scriptWindow && scriptWindow.nodetutsTo) scriptWindow.nodetutsTo(index);
      } catch(err) {
        // console.log('Error:', err);
      }

      if (index == currentIndex) return;

      var elem = elems[index];
      if (! elem) return;
      if (! frames[index] && video && video.pos) {
        frames[index] = video.pos();
      }
      if (currentIndex) from(currentIndex);
      currentIndex = index;
      $.smoothScroll({
        scrollElement: scrollElement,
        scrollTarget: elem,
        afterScroll: function() {
          elem.addClass('selected');
        }
      });
    }

    function move(down) {
      return function() {
        var target = down ? currentIndex + 1 : currentIndex - 1;
        script.to(target);
        if (target < frames.length) {
          video.to(target);
        }
      };
    }

    key('right', move(true));
    key('left', move(false));
    key('d', function() {console.log(JSON.stringify(frames))});

    toFirst();

    return {
      to: to
    };
  }());

  window.nodetutsTo = function(index) {
    script.to(index);
  };


  // Init Video

  var video = (function initVideo() {
    if (window.parent && window.parent.nodeTutsVideoControl) {
      return window.parent.nodeTutsVideoControl;
    }
    var video_ = Popcorn[videoMeta.video.provider](
      '#video',
      videoMeta.video.url
    );

    video_.on('timeupdate', function() {
      var time = video_.currentTime();
      seek(time);
      // time = Math.round(time).toString();
      // if (time != window.location.hash)
      // window.location.hash = time;
      $('#permalink').attr('href', '#' + Math.round(time));
    });

    function pos() {
      return Math.round(video_.currentTime());
    }

    function to(index) {
      var frame = frames[index + 1];
      if (frame) {
        video_.play(frame);
      }
    }

    video_.on('loadstart', initLayout);

    var time = 0;

    if (window.location.hash) {
      time = parseInt(window.location.hash.substring(1), 10) || 0;
    }

    video_.on('canplay', function() {
      if (time > 0) {
        video_.currentTime(time);
        video_.on('canplay', function() {
          video_.play();
        }, 2000);
      } else {
        video_.play();
      }
    });


    function delegate(__video) {
      video = __video;
    }

    return {
      to: to,
      pos: pos,
      delegate: delegate
    };
  }());

  window.nodeTutsVideoControl = video;
  
  (function initInstructions() {
    var cookie = $.cookie('nt:instructions');
    if (cookie != 'dismiss') {
      var alert = $('#instructions').alert();
      alert.fadeIn();
      alert.on('close', function() {
        $.cookie('nt:instructions', 'dismiss', {expires: 30});
        initLayout();
      });
    }
    
  }());


  // Open script in new window

  (function() {

    $('a#openscript').click(function(ev) {
      $(this).hide();
      popover.hide();
      ev.preventDefault();

      var $window = $(window);
      var windowArgs = [];
      windowArgs.push('width=' + Math.round($window.width() - $window.width() / 4));
      windowArgs.push('height=' + $window.height());
      windowArgs.push('screenX=' + (window.screenX + $window.width()));
      windowArgs.push('screenY=' + window.screenY);
      scriptWindow = window.open(window.location.pathname + '#-1', 'pop out', windowArgs.join(','));
      $('#script').hide();

      scriptWindow.onpageshow = function() {
        scriptWindow.nodeTutsVideoControl.delegate(video);
      };

      setTimeout(function() {
        scriptWindow.onunload = function() {
          $('a#openscript').show();
          $('#script').show();
        };
      }, 2000);

    });
  }());


  (function initChildWindow() {

    if (! childWindow) return;

    var $document = $(document);
    
    function detach(el) {
      el.parentNode.removeChild(el);
    }
    
    detach(document.querySelector('header'));
    detach(document.getElementById('video'));

    function resizeHandler() {
      $document.find('#script').height($document.height());
    }

    $(window).resize(resizeHandler);
    resizeHandler();

  }());

});