var animBG;

function isMobile() {
  const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return regex.test(navigator.userAgent);
}

function createLandingVideo(){
    var video = document.createElement('video');
    video.id = 'videoBG'
    video.type = "video/mp4"
    video.src = "GalaxyBG_2.mp4"
    //video.pause()
    animBG = video;
    video.style.zIndex = -1
    document.getElementById("landingPNG").remove();
    document.body.append(video);
}

if (isMobile()) {
    console.log("Mobile device detected");
} else {
    createLandingVideo();
    console.log("Desktop device detected");
}


window.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX
    animBG.currentTime = mouseX/window.innerWidth * animBG.duration
})