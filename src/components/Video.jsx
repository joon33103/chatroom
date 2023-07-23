import React, { useEffect } from 'react'
import "../css/video.css"

const Video = () => {
  console.log("video rendered");
  let elementref = null;
  let streamsrc = null;
  const handleExit = () => {
    elementref.removeEventListener('loadedmetadata', handleExit);
    const tracks = streamsrc.getTracks();
    for (var i = 0; i < tracks.length; ++i) {
        tracks[i].stop();
    }
  }
 

  useEffect(() => {
    console.log("useeffect triggered")
    const playStream = (element, stream) => {
      const handleLoaded = () => {
          element.removeEventListener('loadedmetadata', handleLoaded);
          element.play();
      };
      element.addEventListener('loadedmetadata', handleLoaded);
      element.srcObject = stream;
      }

    const playCamera = (element, preferedWidth, preferedHeight) => {
      const devices = navigator.mediaDevices;
      if (devices && 'getUserMedia' in devices) {
          const constraints = {
              video: {
                  width: preferedWidth,
                  height: preferedHeight
              },
              audio: true
              // you can use microphone adding `audio: true` property here
          };
          const promise = devices.getUserMedia(constraints);
          promise
              .then(function(stream) {
                  playStream(element, stream);
                  streamsrc = stream;

              })
              .catch(function(error) {
                  console.error(error.name + ': ' + error.message);
              });
      } else {
          console.error('Camera API is not supported.');
      }
      }
    const element = document.querySelector("#webcam");
    elementref = element;
    playCamera(element,300,150);
  },[])
  

  return (
    <div>
      <video id = "webcam"></video>
      <button id = "exitVideoButton" onClick={handleExit}>STOP</button>
    </div>
  )
}

export default Video