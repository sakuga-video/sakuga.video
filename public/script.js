const video = document.querySelector('video');
const videoContainer = document.querySelector('#videocontainer');
const fullscreenButton = document.querySelector('#fullscreen');
const playpauseButton = document.querySelector('#playpause');
const nextButton = document.querySelector('#next');
const controls = document.querySelector('#controls');
const playPauseIcon = document.querySelector('#playpause i');
const fullscreenIcon = document.querySelector('#fullscreen i');
const input = document.querySelector('input');
const tagsDatalist = document.querySelector('#tags');

var tagText = [];
var tagCounts = new Map();
var playlist = [];
var index = 0;
var currentTag = null;

function play(tag) {
    currentTag = tag;
    var count;
    if (!tag) {
        count = 80000;
    } else {
        count = tagCounts.get(tag);
        if (currentTag !== parseTagFromUrl()) {
            saveTagToUrl(currentTag);
        }
    }
    playlist = shuffle(Array.from(Array(count).keys())
        .map(n => ++n));
    index = 0;
    playNextVideo();
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

async function loadNextVideo() {
    const nextId = playlist[index];
    index = (index + 1) % playlist.length;

    var url = '/api/post.json?limit=1&page=' + nextId;
    if (currentTag) {
        url = url + '&tags=' + useUnderscores(currentTag);
    }

    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0] && data[0].file_url && data[0].file_ext === "mp4") {
        return data[0].file_url;
    } else {
        return loadNextVideo();
    }
}

function playNextVideo() {
    loadNextVideo().then(src => {
        video.src = src;
        video.play();
    });
}

video.addEventListener('ended', playNextVideo);
var fullScreenEnabled = !!(document.fullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled || document.webkitSupportsFullscreen || document.webkitFullscreenEnabled || document.createElement('video').webkitRequestFullScreen);
if (!fullScreenEnabled) {
    fullscreenButton.style.display = 'none';
}
var isFullScreen = function() {
    return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
}
var setFullscreenData = function(state) {
    videoContainer.setAttribute('data-fullscreen', !!state);
    fullscreenIcon.innerHTML = state ? 'fullscreen_exit' : 'fullscreen';
}
var handleFullscreen = function() {
    if (isFullScreen()) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        setFullscreenData(false);
    }
    else {
        if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
        else if (videoContainer.mozRequestFullScreen) videoContainer.mozRequestFullScreen();
        else if (videoContainer.webkitRequestFullScreen) videoContainer.webkitRequestFullScreen();
        else if (videoContainer.msRequestFullscreen) videoContainer.msRequestFullscreen();
        setFullscreenData(true);
    }
}
document.addEventListener('fullscreenchange', (e) =>
    setFullscreenData(!!(document.fullScreen || document.fullscreenElement))
);
document.addEventListener('webkitfullscreenchange', () =>
    setFullscreenData(!!document.webkitIsFullScreen)
);
document.addEventListener('mozfullscreenchange', () =>
    setFullscreenData(!!document.mozFullScreen)
);
document.addEventListener('msfullscreenchange', () =>
    setFullscreenData(!!document.msFullscreenElement)
);
fullscreenButton.addEventListener('click', handleFullscreen);
playpauseButton.addEventListener('click', e => {
    if (video.paused || video.ended) {
        video.play();
        playPauseIcon.innerHTML = "pause";
    } else {
        video.pause()
        playPauseIcon.innerHTML = "play_arrow";
    };
});
nextButton.addEventListener('click', playNextVideo);

var userActivity, activityCheck, inactivityTimeout;

videoContainer.addEventListener('mousemove', function(){
    userActivity = true;
});

function textFocus() {
    return document.activeElement === input;
}

activityCheck = setInterval(function() {

  // Check to see if the mouse has been moved
  if (userActivity) {

    // Reset the activity tracker
    userActivity = false;

    // If the user state was inactive, set the state to active
    if (videoContainer.classList.contains('fade-out')) {
      videoContainer.classList.remove('fade-out');
    }

    // Clear any existing inactivity timeout to start the timer over
    clearTimeout(inactivityTimeout);

    // In X seconds, if no more activity has occurred 
    // the user will be considered inactive
    inactivityTimeout = setTimeout(function() {
      // Protect against the case where the inactivity timeout can trigger
      // before the next user activity is picked up  by the 
      // activityCheck loop.
      if (!userActivity
        && !videoContainer.classList.contains('fade-out')
        && !textFocus()) {
        videoContainer.classList.add('fade-out');
      }
    }, 500);
  }
}, 250);

async function getTags() {
    const response = await fetch('/api/tag.json?limit=0');
    return await response.json();
}
function putTagsInForm(tags) {
    var innerString = '';
    for (tag of tags) {
        innerString = innerString + "<option>" + tag + "</option>";
    }
    tagsDatalist.innerHTML = innerString;
}
input.addEventListener('input', () => {
    if (!input.value || tagText.includes(input.value)) {
        play(input.value);
    }
});
input.addEventListener("keyup", event => {
    if (event.key === "Enter") {
        input.blur();
    }
});
input.addEventListener("blur", event => {
    if (!videoContainer.classList.contains('fade-out')) {
        videoContainer.classList.add('fade-out');
    }
});

function useUnderscores(tag) {
    return tag.split(" ").join("_");
}

function makeReadable(tag) {
    return tag.split("_").join(" ");
}

function saveTagToUrl(tag) {
    history.pushState(null, tag + " videos", "?tag="+encodeURIComponent(useUnderscores(tag)))
}

function parseTagFromUrl() {
    const encodedTag = new URLSearchParams(window.location.search).get("tag");
    if (encodedTag) {
        return makeReadable(decodeURIComponent(encodedTag));
    } else {
        return null;
    }
}

function saveTagState(tags) {
    const filteredTags = tags.filter(tag => tag.count > 50)
    tagText = filteredTags.map(tag => makeReadable(tag.name));
    tagCounts = new Map(filteredTags.map(tag => [makeReadable(tag.name), tag.count]));
    putTagsInForm(tagText);
}

currentTag = parseTagFromUrl();
if (currentTag) {
    getTags().then(saveTagState).then(() => play(currentTag));
} else {
    getTags().then(saveTagState)
    play();
}